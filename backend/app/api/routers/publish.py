from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import os
import time
import uuid
import shutil

from app.database import get_db
from app import models, schemas

router = APIRouter(tags=["publish"])

MEDIA_UPLOAD_DIR = os.path.join(os.getcwd(), "uploaded_media")
os.makedirs(MEDIA_UPLOAD_DIR, exist_ok=True)
CAIRO_TZ = timezone(timedelta(hours=3))


def _now_cairo() -> datetime:
    return datetime.now(CAIRO_TZ).replace(tzinfo=None)


def _parse_optional_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value or value == "null":
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "").replace("+00:00", ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="صيغة وقت البدء غير صحيحة")


def _save_uploaded_file(upload_file: UploadFile) -> str:
    """حفظ ملف مرفوع وإرجاع مساره"""
    ext = os.path.splitext(upload_file.filename)[-1].lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(MEDIA_UPLOAD_DIR, unique_name)
    with open(dest_path, "wb") as f:
        shutil.copyfileobj(upload_file.file, f)
    return dest_path


def _safe_min_delay_minutes(db: Session, default: int = 1) -> int:
    saved = db.query(models.BotConfig).filter(models.BotConfig.key == "SAFETY_MIN_DELAY_MINUTES").first()
    try:
        return max(1, int(saved.value)) if saved and saved.value else default
    except ValueError:
        return default


def _wait_until_publish_time(db: Session, post: models.PublishPost, publish_time: datetime) -> bool:
    while _now_cairo() < publish_time:
        db.refresh(post)
        if post.status == "cancelled":
            return False
        time.sleep(min(5, max(1, (publish_time - _now_cairo()).total_seconds())))
    return True


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

        bot = None
        if bot_scheduler:
            bot_scheduler._load_saved_config()
            bot = bot_scheduler.bot
            if bot:
                bot.config.update(bot_scheduler.config)

        success_count = 0
        failed_count = 0

        next_publish_time = post.scheduled_start_time or _now_cairo()
        delay_minutes = max(_safe_min_delay_minutes(db), int(getattr(post, "delay_minutes", 5) or 0))

        if getattr(post, "is_scheduled", False) and _now_cairo() < next_publish_time:
            if not _wait_until_publish_time(db, post, next_publish_time):
                return

        for index, group in enumerate(groups):
            try:
                db.refresh(post)
                if post.status == "cancelled":
                    break

                if not bot:
                    raise Exception("البوت غير جاهز")

                try:
                    browser_ready = bool(bot.driver and bot.driver.current_window_handle)
                except Exception:
                    browser_ready = False

                if not browser_ready and not bot.start():
                    raise Exception("تعذر تشغيل متصفح البوت")

                if bot.should_stop_for_safety():
                    post.status = "failed"
                    log = models.BotLog(
                        level="warning",
                        message="تم إيقاف النشر لحماية الحساب",
                        details=f"post_id={post_id}"
                    )
                    db.add(log)
                    db.commit()
                    break

                method = getattr(post, "publish_method", None) or "new_post"
                if index > 0 and delay_minutes:
                    next_publish_time = next_publish_time + timedelta(minutes=delay_minutes)
                    if not _wait_until_publish_time(db, post, next_publish_time):
                        break

                db.refresh(post)
                if post.status == "cancelled":
                    break

                bot.config['scheduled_time'] = next_publish_time
                image_path = None
                if method == "new_post" and post.image_paths:
                    file_name = post.image_paths.split(",")[0]
                    full_path = os.path.join(MEDIA_UPLOAD_DIR, os.path.basename(file_name))

                    if os.path.exists(full_path):
                        image_path = os.path.abspath(full_path)
                        print(f"✅ تم تأكيد وجود الصورة في: {image_path}")
                    else:
                        print(f"⚠️ الصورة غير موجودة في المسار: {full_path}")

                if method == "share_page":
                    result = bot.post_to_group(group.name, post_id)
                else:
                    result = bot.post_new_content_to_group(group.name, post.text, post_id, image_path)

                if result and result.status == "success":
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

            if bot and bot.should_stop_for_safety():
                post.status = "failed"
                db.add(models.BotLog(
                    level="warning",
                    message="توقف النشر بعد تحذير حماية الحساب",
                    details=f"post_id={post_id}"
                ))
                db.commit()
                break

        db.refresh(post)
        if post.status not in ("cancelled", "failed"):
            post.status = "done"
            post.published_at = _now_cairo()
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
    publish_method: str = Form("new_post"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Group).filter(models.Group.is_active == True)
    if group_ids:
        query = query.filter(models.Group.id.in_(group_ids))
    active_groups_count = query.count()

    if active_groups_count == 0:
        raise HTTPException(status_code=400, detail="لا توجد مجموعات نشطة للنشر فيها")

    method = publish_method if publish_method in ("new_post", "share_page") else "new_post"
    parsed_start_time = _parse_optional_datetime(start_time)
    should_schedule = bool(is_scheduled and parsed_start_time)
    safe_delay_minutes = max(_safe_min_delay_minutes(db), int(delay_minutes or 0))

    video_path = None
    if video and method == "new_post":
        allowed_video_types = {"video/mp4", "video/avi", "video/mov", "video/mkv", "video/webm"}
        if video.content_type not in allowed_video_types:
            raise HTTPException(status_code=400, detail=f"نوع الفيديو غير مدعوم: {video.content_type}")
        video_path = _save_uploaded_file(video)

    image_paths = []
    if images and method == "new_post":
        allowed_image_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        for img in images:
            if img.content_type not in allowed_image_types:
                raise HTTPException(status_code=400, detail=f"نوع الصورة غير مدعوم: {img.content_type}")
            image_paths.append(_save_uploaded_file(img))

    new_post = models.PublishPost(
        text=text if method == "new_post" else "",
        image_paths=",".join(image_paths) if image_paths else None,
        video_path=video_path,
        publish_method=method,
        status="pending" if should_schedule else "publishing",
        total_groups=active_groups_count,
        success_count=0,
        failed_count=0,
        created_at=datetime.utcnow(),
        target_group_ids=",".join(map(str, group_ids)) if group_ids else None,
        is_scheduled=should_schedule,
        scheduled_start_time=parsed_start_time if should_schedule else None,
        delay_minutes=safe_delay_minutes,
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    log = models.BotLog(
        level="info",
        message=f"📢 بدء النشر في {active_groups_count} مجموعة",
        details=(
            f"post_id={new_post.id} | method={method} | صور={len(image_paths)} | فيديو={'نعم' if video_path else 'لا'}"
            f" | جدولة={is_scheduled} | بدء={start_time or '-'} | تأخير={safe_delay_minutes}"
            f" | تدوير={is_rotation} | نص_ثاني={'نعم' if second_text else 'لا'}"
        )
    )
    db.add(log)
    db.commit()

    from app.database import DATABASE_URL
    if should_schedule:
        try:
            from app.bot.scheduler import bot_scheduler
            if bot_scheduler and not bot_scheduler.is_running:
                bot_scheduler.start()
        except Exception as e:
            db.add(models.BotLog(
                level="error",
                message="تعذر تشغيل البوت تلقائياً للنشر المجدول",
                details=f"post_id={new_post.id} | {str(e)}"
            ))
            db.commit()
    else:
        background_tasks.add_task(_publish_to_groups_task, new_post.id, DATABASE_URL)

    return {
        "status": "accepted",
        "message": (
            f"✅ تمت جدولة النشر في {active_groups_count} مجموعة"
            if should_schedule
            else f"✅ بدأ النشر في {active_groups_count} مجموعة في الخلفية"
        ),
        "post_id": new_post.id,
        "total_groups": active_groups_count,
        "publish_method": method,
        "scheduled_start_time": parsed_start_time if should_schedule else None,
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


@router.post("/publish/{post_id}/stop")
def stop_publish_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.PublishPost).filter(models.PublishPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")

    if post.status in ("done", "failed", "cancelled"):
        return {"status": "already_stopped", "post_id": post_id}

    post.status = "cancelled"
    db.commit()

    log = models.BotLog(
        level="info",
        message=f"⏹ تم إيقاف المنشور #{post_id} يدوياً",
        details=f"post_id={post_id}"
    )
    db.add(log)
    db.commit()

    from app.bot.scheduler import bot_scheduler
    active_campaigns = db.query(models.Campaign).filter(models.Campaign.status == "active").count()
    active_posts = db.query(models.PublishPost).filter(
        models.PublishPost.id != post_id,
        models.PublishPost.status.in_(["pending", "publishing"])
    ).count()
    scheduler_stopped = False
    if active_campaigns == 0 and active_posts == 0 and bot_scheduler and bot_scheduler.is_running:
        bot_scheduler.stop()
        scheduler_stopped = True

    return {
        "status": "cancelled",
        "post_id": post_id,
        "scheduler_running": bool(bot_scheduler and bot_scheduler.is_running),
        "scheduler_stopped": scheduler_stopped,
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
            "publish_method": p.publish_method or "new_post",
            "created_at": p.created_at,
            "published_at": p.published_at,
        }
        for p in posts
    ]
