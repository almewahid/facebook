from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta, timezone
import json
import random

from app.database import get_db
from app import models, schemas
from app.bot.scheduler import bot_scheduler
from app.api.routers.publish import _save_uploaded_file

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

# ✅ إصلاح 1: UTC+3 (توقيت مصر الصيفي)
CAIRO_TZ = timezone(timedelta(hours=3))

def now_cairo():
    """الوقت الحالي بتوقيت القاهرة"""
    return datetime.now(CAIRO_TZ).replace(tzinfo=None)

def to_cairo_iso(dt_str: Optional[str]) -> Optional[str]:
    """تحويل ISO string من UTC إلى UTC+3"""
    if not dt_str:
        return None
    try:
        # إزالة Z أو +00:00 إن وجدت
        dt_str = dt_str.replace("Z", "").replace("+00:00", "")
        dt = datetime.fromisoformat(dt_str)
        # نفترض أن كل ما في DB هو UTC
        dt_cairo = dt + timedelta(hours=3)
        return dt_cairo.isoformat()
    except Exception:
        return dt_str


def _create_campaign_record(
    db: Session,
    name: str,
    group_ids: List[int],
    texts: Optional[List[str]] = None,
    post_ids: Optional[List[int]] = None,
    start_time: Optional[datetime] = None,
    delay_between_posts: int = 5,
    rotation_strategy: str = "sequential",
    image_paths: Optional[List[str]] = None,
):
    groups = db.query(models.Group).filter(models.Group.id.in_(group_ids)).all()
    if not groups:
        raise HTTPException(status_code=400, detail="المجموعات المحددة غير موجودة")

    resolved_post_ids = list(post_ids or [])
    clean_texts = [t.strip() for t in (texts or []) if t and t.strip()]
    media_paths = image_paths or []

    if not resolved_post_ids and not clean_texts:
        raise HTTPException(status_code=400, detail="يجب إرسال نص منشور واحد على الأقل أو معرف منشور محفوظ")

    if clean_texts:
        first_group_id = groups[0].id
        for idx, content in enumerate(clean_texts):
            image_path = media_paths[idx % len(media_paths)] if media_paths else None
            draft_post = models.Post(
                group_id=first_group_id,
                content=content,
                image_path=image_path,
                status="draft",
                cycle_number=None,
                # ✅ إصلاح 1: استخدام now_cairo()
                created_at=now_cairo(),
            )
            db.add(draft_post)
            db.flush()
            resolved_post_ids.append(draft_post.id)

    plan = []
    # ✅ إصلاح 1: الوقت الافتراضي بتوقيت القاهرة
    current_time = start_time or now_cairo()
    strategy = rotation_strategy or "sequential"

    for idx, group in enumerate(groups):
        if strategy == "random":
            assigned_post_id = random.choice(resolved_post_ids)
        else:
            assigned_post_id = resolved_post_ids[idx % len(resolved_post_ids)]

        # ✅ إصلاح التأخير العشوائي: إضافة تأخير عشوائي ±30 ثانية لكل مجموعة
        random_extra_seconds = random.randint(-30, 30)
        plan.append({
            "group_id": group.id,
            "group_name": group.name,
            "platform": "Facebook",
            "scheduled_time": current_time.isoformat(),
            "delay_minutes": delay_between_posts,
            "random_extra_seconds": random_extra_seconds,
            "assigned_post_id": assigned_post_id,
            "status": "pending"
        })

        current_time += timedelta(minutes=delay_between_posts, seconds=random_extra_seconds)

    new_campaign = models.Campaign(
        name=name,
        status="active",
        post_ids=json.dumps(resolved_post_ids),
        rotation_strategy=strategy,
        schedule_plan=json.dumps(plan, ensure_ascii=False),
        delay_between_posts=delay_between_posts,
        total_groups=len(groups),
        sent_count=0,
        created_by="admin@example.com",
        # ✅ إصلاح 1
        created_at=now_cairo(),
    )

    db.add(new_campaign)
    db.commit()
    db.refresh(new_campaign)

    log = models.BotLog(
        level="info",
        message=f"📋 إنشاء حملة: {new_campaign.name} (استراتيجية: {strategy})",
        details=f"ID: {new_campaign.id} | campaign_id={new_campaign.id} | مجموعات: {len(groups)} | تأخير: {delay_between_posts} دقيقة"
    )
    db.add(log)
    db.commit()

    try:
        if bot_scheduler and not bot_scheduler.is_running:
            bot_scheduler.start()
            db.add(models.BotLog(
                level="info",
                message="تم تشغيل البوت تلقائياً لتنفيذ الحملة",
                details=f"campaign_id={new_campaign.id}"
            ))
            db.commit()
    except Exception as e:
        db.add(models.BotLog(
            level="error",
            message="تعذر تشغيل البوت تلقائياً لتنفيذ الحملة",
            details=f"campaign_id={new_campaign.id} | {str(e)}"
        ))
        db.commit()

    return new_campaign


@router.post("", response_model=schemas.CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(campaign_data: schemas.CampaignCreate, db: Session = Depends(get_db)):
    return _create_campaign_record(
        db=db,
        name=campaign_data.name,
        group_ids=campaign_data.group_ids,
        texts=campaign_data.texts,
        post_ids=campaign_data.post_ids,
        start_time=campaign_data.start_time,
        delay_between_posts=campaign_data.delay_between_posts,
        rotation_strategy=campaign_data.rotation_strategy,
    )


@router.post("/media", response_model=schemas.CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign_with_media(
    name: str = Form(...),
    texts: str = Form(...),
    group_ids: List[int] = Form(...),
    start_time: Optional[str] = Form(None),
    delay_between_posts: int = Form(5),
    rotation_strategy: str = Form("sequential"),
    images: Optional[List[UploadFile]] = File(None),
    video: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    if video:
        raise HTTPException(status_code=400, detail="الفيديو كملف غير مدعوم في الحملات حالياً.")

    try:
        parsed_texts = json.loads(texts)
        if not isinstance(parsed_texts, list):
            raise ValueError()
    except Exception:
        raise HTTPException(status_code=400, detail="صيغة texts غير صحيحة")

    image_paths = []
    if images:
        allowed_image_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
        for img in images:
            if img.content_type not in allowed_image_types:
                raise HTTPException(status_code=400, detail=f"نوع الصورة غير مدعوم: {img.content_type}")
            image_paths.append(_save_uploaded_file(img))

    parsed_start_time = None
    if start_time and start_time != "null":
        try:
            parsed_start_time = datetime.fromisoformat(start_time)
        except ValueError:
            raise HTTPException(status_code=400, detail="صيغة وقت البدء غير صحيحة")

    return _create_campaign_record(
        db=db,
        name=name,
        group_ids=group_ids,
        texts=parsed_texts,
        start_time=parsed_start_time,
        delay_between_posts=delay_between_posts,
        rotation_strategy=rotation_strategy,
        image_paths=image_paths,
    )


@router.get("", response_model=List[schemas.CampaignResponse])
def get_campaigns(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    campaigns = db.query(models.Campaign).order_by(
        models.Campaign.created_at.desc()
    ).offset(skip).limit(limit).all()
    return campaigns


@router.get("/{campaign_id}", response_model=schemas.CampaignResponse)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="الحملة غير موجودة")
    return campaign


@router.get("/{campaign_id}/plan")
def get_campaign_plan(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="الحملة غير موجودة")

    plan = json.loads(campaign.schedule_plan) if campaign.schedule_plan else []
    post_ids = json.loads(campaign.post_ids) if campaign.post_ids else []

    posts_data = db.query(models.Post).filter(models.Post.id.in_(post_ids)).all()
    posts_content_map = {p.id: p.content[:50] + "..." for p in posts_data}

    for item in plan:
        post_id = item.get("assigned_post_id")
        item["post_preview"] = posts_content_map.get(post_id, "محتوى غير موجود")

    return {
        "campaign_id": campaign.id,
        "campaign_name": campaign.name,
        "status": campaign.status,
        "strategy": campaign.rotation_strategy,
        "total_groups": campaign.total_groups,
        "sent_count": campaign.sent_count,
        "plan": plan,
        "created_at": campaign.created_at,
    }


@router.get("/{campaign_id}/live-status")
def get_campaign_live_status(campaign_id: int, db: Session = Depends(get_db)):
    """الربط الحي: جلب حالة الحملة والتقدم والمنشورات الأخيرة"""
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="الحملة غير موجودة")

    plan = json.loads(campaign.schedule_plan) if campaign.schedule_plan else []

    # ✅ إصلاح 2: حساب التقدم من الخطة مباشرة (لا يعتمد على sent_count المعطوب)
    sent_count   = sum(1 for item in plan if item.get("status") in ("sent", "success"))
    failed_count = sum(1 for item in plan if item.get("status") == "failed")
    pending_approval_count = sum(1 for item in plan if item.get("status") == "pending_approval")
    processed_count = sum(1 for item in plan if item.get("status") != "pending")

    total = campaign.total_groups or len(plan) or 1
    progress_percent = round((processed_count / total) * 100, 2) if total > 0 else 0

    # ✅ إصلاح 3: المجموعة التي تُنشر الآن (أول pending في الخطة)
    pending_items = [item for item in plan if item.get("status") == "pending"]

    current_group = None
    next_post_time_cairo = None

    if pending_items:
        first_pending = pending_items[0]
        scheduled_utc = first_pending.get("scheduled_time")
        scheduled_cairo = scheduled_utc # الوقت في الخطة محفوظ مسبقاً بتوقيت القاهرة

        now_str = now_cairo().isoformat()

        # إذا الوقت المجدول <= الآن → هذه المجموعة تُنشر الآن
        if scheduled_cairo and scheduled_cairo <= now_str:
            current_group = {
                "group_id": first_pending.get("group_id"),
                "group_name": first_pending.get("group_name"),
                "scheduled_time": scheduled_cairo,
            }
            # المنشور القادم = العنصر الثاني
            if len(pending_items) > 1:
                next_post_time_cairo = pending_items[1].get("scheduled_time")
        else:
            # لم يحن وقته بعد → هو نفسه المنشور القادم
            next_post_time_cairo = scheduled_cairo

    # ✅ إصلاح 4: تقدير إجمالي وقت النشر المتبقي
    remaining_groups = len(pending_items)
    delay_minutes = campaign.delay_between_posts or 5
    estimated_remaining_minutes = remaining_groups * delay_minutes
    estimated_finish_time = None
    if remaining_groups > 0:
        finish_dt = now_cairo() + timedelta(minutes=estimated_remaining_minutes)
        estimated_finish_time = finish_dt.isoformat()

    # آخر النشاطات من جدول posts
    recent_posts = db.query(models.Post).filter(
        models.Post.cycle_number == campaign.id
    ).order_by(models.Post.id.desc()).limit(5).all()

    group_ids_in_posts = [p.group_id for p in recent_posts]
    groups_map = {}
    if group_ids_in_posts:
        groups_in_db = db.query(models.Group).filter(models.Group.id.in_(group_ids_in_posts)).all()
        groups_map = {g.id: g.name for g in groups_in_db}

    # Alerts من السجلات
    recent_logs = db.query(models.BotLog).filter(
        models.BotLog.details.contains(f"campaign_id={campaign_id}")
    ).order_by(models.BotLog.created_at.desc()).limit(5).all()

    is_scheduler_running = bool(bot_scheduler and bot_scheduler.is_running)

    alerts = [
        {
            "level": l.level,
            "msg": l.message,
            "details": l.details,
            # ✅ إصلاح 1: تحويل توقيت السجلات أيضاً
            "time": to_cairo_iso(l.created_at.isoformat()) if l.created_at else None
        }
        for l in recent_logs
    ]

    if campaign.status == "active" and processed_count == 0 and not is_scheduler_running:
        alerts.insert(0, {
            "level": "warning",
            "msg": "الحملة بانتظار تشغيل البوت",
            "details": "اضغط زر تشغيل البوت من أعلى الصفحة حتى يبدأ تنفيذ البنود المجدولة.",
            "time": None
        })

    # ✅ تحديد الحالة الصحيحة
    effective_status = campaign.status
    if campaign.status == "active" and processed_count == 0 and not is_scheduler_running:
        effective_status = "waiting_bot"

    return {
        "id": campaign.id,
        "name": campaign.name,
        "status": effective_status,
        "scheduler_running": is_scheduler_running,
        "progress": {
            "percent": progress_percent,
            # ✅ إصلاح 2: sent_count من الخطة مباشرة
            "sent": sent_count,
            "failed": failed_count,
            "pending_approval": pending_approval_count,
            "processed": processed_count,
            "total": total
        },
        "plan": plan,
        "current_group": current_group,
        # ✅ إصلاح 1: next_post_time بتوقيت القاهرة
        "next_post_time": next_post_time_cairo,
        # ✅ إصلاح 4: تقدير وقت الانتهاء
        "estimated_finish_time": estimated_finish_time,
        "estimated_remaining_minutes": estimated_remaining_minutes,
        "recent_activity": [
            {
                "group_id": p.group_id,
                "group_name": groups_map.get(p.group_id, f"مجموعة {p.group_id}"),
                "status": p.status,
                "url": p.post_url,
                # ✅ إصلاح 1: تحويل التوقيت
                "time": to_cairo_iso(p.posted_at.isoformat()) if p.posted_at else None,
            }
            for p in recent_posts
        ],
        "results": [
            {
                "group_id": item.get("group_id"),
                "group_name": item.get("group_name"),
                "status": item.get("status", "pending"),
                "scheduled_time": item.get("scheduled_time"),
                "assigned_post_id": item.get("assigned_post_id"),
                "post_url": item.get("post_url"),
            }
            for item in plan
        ],
        "alerts": alerts,
    }


@router.patch("/{campaign_id}/status")
def update_campaign_status(
    campaign_id: int,
    data: dict,
    db: Session = Depends(get_db)
):
    allowed_statuses = {"active", "paused", "cancelled", "completed"}
    new_status = data.get("status")

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"الحالة غير صالحة. القيم المسموحة: {', '.join(allowed_statuses)}"
        )

    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="الحملة غير موجودة")

    campaign.status = new_status
    db.commit()
    db.refresh(campaign)

    log = models.BotLog(
        level="info",
        message=f"🔄 تم تغيير حالة الحملة [{campaign.name}] إلى: {new_status}",
        details=f"campaign_id={campaign_id}"
    )
    db.add(log)
    db.commit()

    return {"status": "success", "campaign_id": campaign_id, "new_status": new_status}


@router.post("/{campaign_id}/stop")
def stop_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="الحملة غير موجودة")

    if campaign.status in ("completed", "cancelled"):
        return {"status": "already_stopped", "campaign_id": campaign_id}

    campaign.status = "cancelled"
    db.commit()

    log = models.BotLog(
        level="info",
        message=f"⏹ تم إيقاف الحملة [{campaign.name}] يدوياً",
        details=f"campaign_id={campaign_id}"
    )
    db.add(log)
    db.commit()

    return {"status": "cancelled", "campaign_id": campaign_id}


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(models.Campaign).filter(models.Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="الحملة غير موجودة")

    db.delete(campaign)
    db.commit()
    return None