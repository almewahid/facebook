from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app import models, schemas

router = APIRouter()

# ==================== Groups Endpoints ====================

@router.post("/groups", response_model=schemas.GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    """إنشاء مجموعة جديدة"""
    # التحقق من عدم وجود مجموعة بنفس الاسم
    existing = db.query(models.FacebookGroup).filter(models.FacebookGroup.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="المجموعة موجودة بالفعل")
    
    db_group = models.FacebookGroup(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/groups", response_model=List[schemas.GroupResponse])
def get_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """الحصول على كل المجموعات"""
    groups = db.query(models.FacebookGroup).offset(skip).limit(limit).all()
    return groups

@router.get("/groups/{group_id}", response_model=schemas.GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    """الحصول على مجموعة محددة"""
    group = db.query(models.FacebookGroup).filter(models.FacebookGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    return group

@router.put("/groups/{group_id}", response_model=schemas.GroupResponse)
def update_group(group_id: int, group_update: schemas.GroupUpdate, db: Session = Depends(get_db)):
    """تحديث مجموعة"""
    db_group = db.query(models.FacebookGroup).filter(models.FacebookGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    
    update_data = group_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_group, key, value)
    
    db.commit()
    db.refresh(db_group)
    return db_group

@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: Session = Depends(get_db)):
    """حذف مجموعة"""
    db_group = db.query(models.FacebookGroup).filter(models.FacebookGroup.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    
    db.delete(db_group)
    db.commit()
    return None

# ==================== Posts Endpoints ====================

@router.get("/posts", response_model=List[schemas.PostResponse])
def get_posts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """الحصول على كل المنشورات"""
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).offset(skip).limit(limit).all()
    return posts

@router.get("/posts/{post_id}", response_model=schemas.PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    """الحصول على منشور محدد"""
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    return post

# ==================== Statistics Endpoints ====================

@router.get("/stats", response_model=schemas.StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    """الحصول على الإحصائيات"""
    total_posts = db.query(models.Post).count()
    successful = db.query(models.Post).filter(models.Post.status == "success").count()
    failed = db.query(models.Post).filter(models.Post.status == "failed").count()
    skipped = db.query(models.Post).filter(models.Post.status == "skipped").count()
    
    success_rate = (successful / total_posts * 100) if total_posts > 0 else 0
    
    total_groups = db.query(models.FacebookGroup).count()
    active_groups = db.query(models.FacebookGroup).filter(models.FacebookGroup.is_active == True).count()
    
    last_post = db.query(models.Post).order_by(models.Post.created_at.desc()).first()
    total_cycles = db.query(models.Post.cycle_number).distinct().count()
    
    return schemas.StatsResponse(
        total_posts=total_posts,
        successful_posts=successful,
        failed_posts=failed,
        skipped_posts=skipped,
        success_rate=round(success_rate, 2),
        total_groups=total_groups,
        active_groups=active_groups,
        total_cycles=total_cycles,
        last_cycle_at=last_post.created_at if last_post else None
    )

# ==================== Bot Control Endpoints ====================

from app.bot.scheduler import bot_scheduler

@router.post("/bot/start", response_model=schemas.BotStartResponse)
def start_bot(request: schemas.BotStartRequest, db: Session = Depends(get_db)):
    """بدء البوت"""
    if bot_scheduler and bot_scheduler.is_running and not request.force:
        raise HTTPException(status_code=400, detail="البوت يعمل بالفعل")
    
    if bot_scheduler:
        bot_scheduler.start()
    
    # تسجيل في logs
    log = models.BotLog(
        level="info",
        message="تم بدء البوت",
        details=f"Force: {request.force}"
    )
    db.add(log)
    db.commit()
    
    return schemas.BotStartResponse(
        status="started",
        message="تم بدء البوت بنجاح",
        started_at=datetime.utcnow()
    )

@router.post("/bot/stop", response_model=schemas.BotStopResponse)
def stop_bot(request: schemas.BotStopRequest, db: Session = Depends(get_db)):
    """إيقاف البوت"""
    if bot_scheduler:
        bot_scheduler.stop()
    
    # تسجيل في logs
    log = models.BotLog(
        level="info",
        message="تم إيقاف البوت",
        details=f"Force: {request.force}"
    )
    db.add(log)
    db.commit()
    
    return schemas.BotStopResponse(
        status="stopped",
        message="تم إيقاف البوت بنجاح",
        stopped_at=datetime.utcnow()
    )

@router.get("/bot/status", response_model=schemas.BotStatusResponse)
def get_bot_status(db: Session = Depends(get_db)):
    """الحصول على حالة البوت"""
    is_running = bot_scheduler.is_running if bot_scheduler else False
    
    # آخر منشور
    last_post = db.query(models.Post).order_by(models.Post.created_at.desc()).first()
    
    return schemas.BotStatusResponse(
        is_running=is_running,
        current_cycle=last_post.cycle_number if last_post else None,
        current_group=None,  # يمكن تحديثه من الـ scheduler
        started_at=None,  # يمكن تحديثه من الـ scheduler
        last_activity=last_post.created_at if last_post else None
    )

# ==================== Logs Endpoints ====================

@router.get("/logs", response_model=List[schemas.BotLogResponse])
def get_logs(skip: int = 0, limit: int = 100, level: str = None, db: Session = Depends(get_db)):
    """الحصول على السجلات"""
    query = db.query(models.BotLog)
    
    if level:
        query = query.filter(models.BotLog.level == level)
    
    logs = query.order_by(models.BotLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs

# ==================== AI Insights Endpoints ====================

@router.get("/ai/insights", response_model=List[schemas.AIInsightResponse])
def get_ai_insights(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    """الحصول على رؤى الذكاء الاصطناعي"""
    insights = db.query(models.AIInsight).order_by(models.AIInsight.created_at.desc()).offset(skip).limit(limit).all()
    return insights

# ==================== Config Endpoints ====================

@router.get("/config", response_model=List[schemas.BotConfigResponse])
def get_configs(db: Session = Depends(get_db)):
    """الحصول على جميع الإعدادات"""
    configs = db.query(models.BotConfig).all()
    return configs

@router.put("/config/{key}", response_model=schemas.BotConfigResponse)
def update_config(key: str, config_update: schemas.BotConfigUpdate, db: Session = Depends(get_db)):
    """تحديث إعداد"""
    db_config = db.query(models.BotConfig).filter(models.BotConfig.key == key).first()
    
    if not db_config:
        # إنشاء إعداد جديد
        db_config = models.BotConfig(key=key, value=config_update.value)
        db.add(db_config)
    else:
        db_config.value = config_update.value
        db_config.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_config)
    return db_config
