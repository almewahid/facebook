from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import uuid
import shutil

from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["publish"])

MEDIA_UPLOAD_DIR = os.path.join(os.getcwd(), "uploaded_media")
os.makedirs(MEDIA_UPLOAD_DIR, exist_ok=True)


def _save_uploaded_file(upload_file: UploadFile) -> str:
    """حفظ ملف مرفوع وإرجاع مساره"""
    ext = os.path.splitext(upload_file.filename)[-1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(MEDIA_UPLOAD_DIR, unique_name)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return dest_path


def _publish_to_groups_task(post_id: int, db_url: str):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app import models
    from app.bot.scheduler import bot_scheduler

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        post = db.query(models.PublishPost).filter(models.PublishPost.id == post_id).first()
        if not post:
            return

        query = db.query(models.Group).filter(models.Group.is_active == True)
        if post.target_group_ids:
            ids = [int(i) for i in post.target_group_ids.split(",") if i]
            query = query.filter(models.Group.id.in_(ids))
        groups = query.all()

        post.total_groups = len(groups)
        post.status = "publishing"
        db.commit()

        bot = bot_scheduler.bot if bot_scheduler and bot_scheduler.bot else None

        success_count = 0
        failed_count = 0

        for group in groups:
            try:
                if not bot or not bot.driver:
                    raise Exception("البوت مش شغال — شغّل البوت أولاً")

                image_path = None
                if post.image_paths:
                    file_name = post.image_paths.split(",")[0]
                    full_path = os.path.join(MEDIA_UPLOAD_DIR, os.path.basename(file_name))

                    if os.path.exists(full_path):
                        image_path = os.path.abspath(full_path)
                        print(f"✅ تم تأكيد وجود الصورة في: {image_path}")
                    else:
                        print(f"⚠️ الصورة غير موجودة في المسار: {full_path}")

                result = bot.post_new_content_to_group(group.name, post.text, post_id, image_path)

                if result:
                    success_count += 1
                    last_post = db.query(models.Post).filter(
                        models.Post.group_id == group.id,
                        models.Post.cycle_number == post_id
                    ).order_by(models.Post.id.desc()).first()
                    post_url = last_post.post_url if last_post else None

                    log = models.BotLog(
                        level="info",
                        message=f"✅ تم النشر في: {group.name}",
                        details=f"post_id={post_id} | url={post_url}"
                    )
                else:
                    failed_count += 1
                    post_url = None
                    log = models.BotLog(
                        level="error",
                        message=f"❌ فشل النشر في: {group.name}",
                        details=f"post_id={post_id}"
                    )

            except Exception as e:
                failed_count += 1
                post_url = None
                log = models.BotLog(
                    level="error",
                    message=f"❌ فشل النشر في: {group.name}",
                    details=str(e)
                )

            db.add(log)

            post.success_count = success_count
            post.failed_count = failed_count
            db.commit()

        post.status = "done"
        post.published_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        post = db.query(models.PublishPost).filter(models.PublishPost.id == post_id).first()
        if post:
            post.status = "failed"
            db.commit()
    finally:
        db.close()


@router.get("/posts", response_model=List[schemas.PostResponse])
def get_posts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    posts = db.query(models.Post).filter(
        ~(
            models.Post.cycle_number.is_(None)
            & models.Post.status.in_(["pending", "draft"])
        )
    ).order_by(models.Post.created_at.desc()).offset(skip).limit(limit).all()
    return posts


@router.get("/posts/{post_id}", response_model=schemas.PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    return post


@router.post("/publish", status_code=status.HTTP_202_ACCEPTED)
async def publish_post(
    background_tasks: BackgroundTasks,
    text: str = Form(...),
    images: Optional[List[UploadFile]] = File(None),
    video: Optional[UploadFile] = File(None),
    group_ids: Optional[List[int]] = Form(None),
    is_scheduled: bool = Form(False),
    start_time: Optional[str] = Form(None),
    delay_minutes: int = Form(5),
    is_rotation: bool = Form(False),
    second_text: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Group).filter(models.Group.is_active == True)
    if group_ids:
        query = query.filter(models.Group.id.in_(group_ids))
    active_groups_count = query.count()

    if active_groups_count == 0:
        raise HTTPException(status_code=400, detail="لا توجد مجموعات نشطة للنشر فيها")

    video_path = None
    if video:
        allowed_video_types = {"video/mp4", "video/avi", "video/mov", "video/mkv", "video/webm"}
        if video.content_type not in allowed_video_types:
            raise HTTPException(status_code=400, detail=f"نوع الفيديو غير مدعوم: {video.content_type}")
        video_path = _save_uploaded_file(video)

    image_paths = []
    if images:
        allowed_image_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        for img in images:
            if img.content_type not in allowed_image_types:
                raise HTTPException(status_code=400, detail=f"نوع الصورة غير مدعوم: {img.content_type}")
            image_paths.append(_save_uploaded_file(img))

    new_post = models.PublishPost(
        text=text,
        image_paths=",".join(image_paths) if image_paths else None,
        video_path=video_path,
        status="pending",
        total_groups=active_groups_count,
        success_count=0,
        failed_count=0,
        created_at=datetime.utcnow(),
        target_group_ids=",".join(map(str, group_ids)) if group_ids else None,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    log = models.BotLog(
        level="info",
        message=f"📢 بدء نشر منشور جديد في {active_groups_count} مجموعة",
        details=(
            f"post_id={new_post.id} | صور={len(image_paths)} | فيديو={'نعم' if video_path else 'لا'}"
            f" | جدولة={is_scheduled} | بدء={start_time or '-'} | تأخير={delay_minutes}"
            f" | تدوير={is_rotation} | نص_ثاني={'نعم' if second_text else 'لا'}"
        )
    )
    db.add(log)
    db.commit()

    from app.database import DATABASE_URL
    background_tasks.add_task(_publish_to_groups_task, new_post.id, DATABASE_URL)

    return {
        "status": "accepted",
        "message": f"✅ بدأ النشر في {active_groups_count} مجموعة في الخلفية",
        "post_id": new_post.id,
        "total_groups": active_groups_count,
        "media": {
            "images_count": len(image_paths),
            "has_video": video_path is not None,
        },
    }


@router.get("/publish/{post_id}/status")
def get_publish_status(post_id: int, db: Session = Depends(get_db)):
    """متابعة حالة النشر الفوري مع عرض التنبيهات التقنية اللحظية"""
    post = db.query(models.PublishPost).filter(models.PublishPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")

    progress = 0
    if post.total_groups and post.total_groups > 0:
        done = (post.success_count or 0) + (post.failed_count or 0)
        progress = round((done / post.total_groups) * 100, 1)

    recent_logs = db.query(models.BotLog).filter(
        models.BotLog.details.contains(f"post_id={post_id}")
    ).order_by(models.BotLog.created_at.desc()).limit(3).all()

    target_ids = []
    if post.target_group_ids:
        target_ids = [int(i) for i in post.target_group_ids.split(",") if i]

    results = []
    if target_ids:
        groups = db.query(models.Group).filter(models.Group.id.in_(target_ids)).all()
        for group in groups:
            last_post = db.query(models.Post).filter(
                models.Post.group_id == group.id,
                models.Post.cycle_number == post_id
            ).order_by(models.Post.id.desc()).first()

            results.append({
                "group_id": group.id,
                "group_name": group.name,
                "status": last_post.status if last_post else "pending",
                "post_url": last_post.post_url if last_post else None,
            })

    return {
        "post_id": post.id,
        "status": post.status,
        "progress": {
            "percent": progress,
            "total": post.total_groups or 0,
            "sent": post.success_count or 0,
            "failed": post.failed_count or 0,
            "processed": (post.success_count or 0) + (post.failed_count or 0),
            "pending_approval": sum(1 for r in results if r.get('status') == 'pending_approval')
        },
        "created_at": post.created_at,
        "published_at": post.published_at,
        "results": results,
        "alerts": [
            {
                "level": l.level,
                "msg": l.message,
                "details": l.details,
                "time": l.created_at.isoformat() if l.created_at else None
            }
            for l in recent_logs
        ],
    }


@router.get("/publish", response_model=List[dict])
def list_publish_posts(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """قائمة بجميع المنشورات المرسلة"""
    posts = db.query(models.PublishPost).order_by(
        models.PublishPost.created_at.desc()
    ).offset(skip).limit(limit).all()

    return [
        {
            "post_id": p.id,
            "text_preview": p.text[:80] + "..." if len(p.text) > 80 else p.text,
            "status": p.status,
            "total_groups": p.total_groups,
            "success_count": p.success_count,
            "failed_count": p.failed_count,
            "has_images": bool(p.image_paths),
            "has_video": bool(p.video_path),
            "created_at": p.created_at,
            "published_at": p.published_at,
        }
        for p in posts
    ]
