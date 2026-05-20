from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.deps import require_active_subscription

router = APIRouter(prefix="/agent", tags=["agent"])


def _media_urls(request: Request, stored_paths: str | None) -> list[str]:
    if not stored_paths:
        return []
    base_url = str(request.base_url).rstrip("/")
    urls = []
    for item in str(stored_paths).split(","):
        item = item.strip()
        if not item:
            continue
        urls.append(f"{base_url}/uploaded_media/{Path(item).name}")
    return urls


def _target_groups(db: Session, task: models.PublishPost, user_id: int) -> list[models.Group]:
    query = db.query(models.Group).filter(
        models.Group.user_id == user_id,
        models.Group.is_active == True,
    )
    if task.target_group_ids:
        ids = [int(item) for item in task.target_group_ids.split(",") if item]
        query = query.filter(models.Group.id.in_(ids))
    return query.order_by(models.Group.id.asc()).all()


@router.post("/heartbeat")
def heartbeat(
    data: schemas.AgentHeartbeat,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    details = f"device={data.device_name or '-'} | version={data.version or '-'}"
    db.add(models.BotLog(
        user_id=current_user.id,
        level="info",
        message="Agent heartbeat",
        details=details,
    ))
    db.commit()
    return {"status": "ok", "user_id": current_user.id}


@router.get("/status")
def status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    pending = db.query(models.PublishPost).filter(
        models.PublishPost.user_id == current_user.id,
        models.PublishPost.status == "pending",
    ).count()
    running = db.query(models.PublishPost).filter(
        models.PublishPost.user_id == current_user.id,
        models.PublishPost.status == "publishing",
    ).count()
    return {
        "status": "ready",
        "user_id": current_user.id,
        "pending_tasks": pending,
        "running_tasks": running,
    }


@router.get("/tasks/next")
def next_task(
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    now = datetime.utcnow()
    task = db.query(models.PublishPost).filter(
        models.PublishPost.user_id == current_user.id,
        models.PublishPost.status == "pending",
    ).order_by(models.PublishPost.created_at.asc()).first()

    if not task:
        return {"task": None}

    if task.is_scheduled and task.scheduled_start_time and task.scheduled_start_time > now:
        return {
            "task": None,
            "next_scheduled_at": task.scheduled_start_time,
        }

    groups = _target_groups(db, task, current_user.id)
    if not groups:
        task.status = "failed"
        task.failed_count = task.total_groups or 0
        task.published_at = datetime.utcnow()
        db.add(models.BotLog(
            user_id=current_user.id,
            level="error",
            message="لا توجد مجموعات متاحة لمهمة Agent",
            details=f"post_id={task.id}",
        ))
        db.commit()
        return {"task": None}

    task.status = "publishing"
    task.total_groups = len(groups)
    db.commit()
    db.refresh(task)

    page_config = db.query(models.BotConfig).filter(
        models.BotConfig.user_id == current_user.id,
        models.BotConfig.key == "PAGE_URL",
    ).first()

    return {
        "task": {
            "post_id": task.id,
            "publish_method": task.publish_method or "new_post",
            "text": task.text or "",
            "page_url": page_config.value if page_config else None,
            "image_urls": _media_urls(request, task.image_paths),
            "video_url": _media_urls(request, task.video_path)[0] if task.video_path else None,
            "delay_minutes": task.delay_minutes or 5,
            "delay_max_minutes": task.delay_max_minutes or task.delay_minutes or 5,
            "groups": [
                {
                    "id": group.id,
                    "name": group.name,
                    "url": group.url,
                    "category": group.category,
                }
                for group in groups
            ],
        }
    }


@router.post("/tasks/{post_id}/result")
def submit_result(
    post_id: int,
    data: schemas.AgentTaskResult,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    task = db.query(models.PublishPost).filter(
        models.PublishPost.id == post_id,
        models.PublishPost.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="مهمة النشر غير موجودة")

    group = db.query(models.Group).filter(
        models.Group.id == data.group_id,
        models.Group.user_id == current_user.id,
    ).first()
    if not group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")

    existing = db.query(models.Post).filter(
        models.Post.user_id == current_user.id,
        models.Post.group_id == group.id,
        models.Post.cycle_number == task.id,
    ).first()

    if existing:
        result = existing
        result.status = data.status
        result.post_url = data.post_url
        result.error_message = data.error_message
        result.posted_at = datetime.utcnow() if data.status == "success" else None
    else:
        result = models.Post(
            user_id=current_user.id,
            group_id=group.id,
            content=task.text or "",
            image_path=task.image_paths,
            status=data.status,
            post_url=data.post_url,
            error_message=data.error_message,
            cycle_number=task.id,
            scheduled_time=task.scheduled_start_time,
            posted_at=datetime.utcnow() if data.status == "success" else None,
        )
        db.add(result)

    db.flush()

    results = db.query(models.Post).filter(
        models.Post.user_id == current_user.id,
        models.Post.cycle_number == task.id,
    ).all()
    task.success_count = sum(1 for item in results if item.status == "success")
    task.failed_count = sum(1 for item in results if item.status in ("failed", "skipped", "pending_approval"))

    processed = task.success_count + task.failed_count
    if task.total_groups and processed >= task.total_groups:
        task.status = "done" if task.success_count > 0 else "failed"
        task.published_at = datetime.utcnow()

    db.add(models.BotLog(
        user_id=current_user.id,
        level="info" if data.status == "success" else "warning",
        message=f"Agent result: {group.name} -> {data.status}",
        details=f"post_id={task.id} | group_id={group.id} | {data.error_message or ''}",
    ))
    db.commit()
    db.refresh(task)

    return {
        "status": "saved",
        "post_id": task.id,
        "task_status": task.status,
        "success_count": task.success_count,
        "failed_count": task.failed_count,
        "total_groups": task.total_groups,
    }


@router.post("/tasks/{post_id}/finish")
def finish_task(
    post_id: int,
    data: schemas.AgentTaskFinish,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    task = db.query(models.PublishPost).filter(
        models.PublishPost.id == post_id,
        models.PublishPost.user_id == current_user.id,
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="مهمة النشر غير موجودة")

    if task.status not in ("done", "failed", "cancelled"):
        task.status = data.status
        task.published_at = datetime.utcnow()
    db.add(models.BotLog(
        user_id=current_user.id,
        level="info" if data.status == "done" else "warning",
        message=f"Agent finished task #{post_id}",
        details=data.message or "",
    ))
    db.commit()
    return {"status": "saved", "post_id": post_id, "task_status": task.status}
