from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import os
import re

from app.database import get_db
from app.deps import require_active_subscription
from app import models, schemas
from app.bot.scheduler import bot_scheduler

router = APIRouter(tags=["stats-logs-config"])

DEFAULT_SAFETY_CONFIGS = {
    "SAFETY_MIN_DELAY_MINUTES": "1",
    "SAFETY_DAILY_POST_LIMIT": "10",
    "SAFETY_REST_AFTER_MIN_POSTS": "8",
    "SAFETY_REST_AFTER_MAX_POSTS": "12",
    "SAFETY_REST_MIN_MINUTES": "1",
    "SAFETY_REST_MAX_MINUTES": "3",
    "SAFETY_STOP_ON_FACEBOOK_WARNING": "true",
}


def ensure_default_safety_configs(db: Session, user_id: int):
    changed = False
    for key, value in DEFAULT_SAFETY_CONFIGS.items():
        exists = db.query(models.BotConfig).filter(
            models.BotConfig.key == key,
            models.BotConfig.user_id == user_id,
        ).first()
        if not exists:
            db.add(models.BotConfig(key=key, value=value, user_id=user_id))
            changed = True
    if changed:
        db.commit()


# ==================== Statistics ====================

@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    try:
        real_posts_query = db.query(models.Post).filter(
            models.Post.user_id == current_user.id,
            ~(
                models.Post.cycle_number.is_(None)
                & models.Post.status.in_(["pending", "draft"])
            )
        )

        total_posts = real_posts_query.count()
        successful = real_posts_query.filter(models.Post.status == "success").count()
        failed = real_posts_query.filter(models.Post.status == "failed").count()
        skipped = real_posts_query.filter(models.Post.status == "skipped").count()

        success_rate = (successful / total_posts * 100) if total_posts > 0 else 0

        total_groups = db.query(models.Group).filter(models.Group.user_id == current_user.id).count()
        active_groups = db.query(models.Group).filter(
            models.Group.user_id == current_user.id,
            models.Group.is_active == True,
        ).count()

        last_post = db.query(models.Post).filter(
            models.Post.user_id == current_user.id
        ).order_by(models.Post.created_at.desc()).first()

        return {
            "total_posts": total_posts,
            "successful_posts": successful,
            "failed_posts": failed,
            "skipped_posts": skipped,
            "success_rate": round(success_rate, 2),
            "total_groups": total_groups,
            "active_groups": active_groups,
            "last_cycle_at": last_post.created_at if last_post else None
        }
    except Exception as e:
        print(f"خطأ في get_stats: {e}")
        return {
            "total_posts": 0,
            "successful_posts": 0,
            "failed_posts": 0,
            "skipped_posts": 0,
            "success_rate": 0,
            "total_groups": 0,
            "active_groups": 0,
            "last_cycle_at": None
        }


# ==================== Logs ====================

@router.get("/logs", response_model=List[schemas.BotLogResponse])
def get_logs(
    skip: int = 0,
    limit: int = 100,
    level: str = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    query = db.query(models.BotLog).filter(models.BotLog.user_id == current_user.id)
    if level:
        query = query.filter(models.BotLog.level == level)
    logs = query.order_by(models.BotLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs


# ==================== AI Insights (Updated for Gemini) ====================

from app.bot.ai_engine import ai_engine

@router.get("/stats/ai/insights", response_model=List[schemas.AIInsightResponse])
def get_ai_insights(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """جلب الرؤى المولدة بواسطة الذكاء الاصطناعي"""
    insights = db.query(models.AIInsight).filter(
        models.AIInsight.user_id == current_user.id
    ).order_by(models.AIInsight.created_at.desc()).offset(skip).limit(limit).all()
    return insights

@router.post("/stats/ai/analyze")
def trigger_ai_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """تشغيل عملية تحليل البيانات باستخدام Gemini API"""
    if not ai_engine.enabled:
        raise HTTPException(status_code=400, detail="الذكاء الاصطناعي (Gemini) غير مفعل")
    
    try:
        print("🚀 [FastAPI] جاري تشغيل Gemini...")
        ai_engine.analyze_best_posting_times()
        ai_engine.analyze_error_patterns()
        ai_engine.suggest_group_strategy()
        
        return {
            "status": "success", 
            "message": "تم تحليل البيانات بنجاح", # تم إصلاح الفاصلة هنا
            "details": "تم تحديث كافة الرؤى"
        }
    except Exception as e:
        print(f"❌ خطأ: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stats/ai/generate")
def generate_ai_content(
    context: str = Form(""),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """توليد محتوى أو تعليقات باستخدام الذكاء الاصطناعي"""
    if not ai_engine.enabled:
        raise HTTPException(status_code=400, detail="الذكاء الاصطناعي غير مفعل")
    
    content = ai_engine.generate_comment(context)
    if not content:
        raise HTTPException(status_code=500, detail="فشل توليد المحتوى")
        
    return {"status": "success", "content": content}


# ==================== Config ====================

@router.get("/config", response_model=List[schemas.BotConfigResponse])
def get_configs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    ensure_default_safety_configs(db, current_user.id)
    configs = db.query(models.BotConfig).filter(models.BotConfig.user_id == current_user.id).all()
    return configs


@router.put("/config/{key}", response_model=schemas.BotConfigResponse)
def update_config(
    key: str,
    config_update: schemas.BotConfigUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """تحديث إعداد في قاعدة البيانات و .env"""

    env_path = os.path.join(os.getcwd(), ".env")
    try:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                content = f.read()

            if re.search(rf"^{key}=.*", content, re.MULTILINE):
                content = re.sub(rf"^{key}=.*", f"{key}={config_update.value}", content, flags=re.MULTILINE)
            else:
                content += f"\n{key}={config_update.value}"

            with open(env_path, "w", encoding="utf-8") as f:
                f.write(content)

            os.environ[key] = config_update.value

            if key == "PAGE_URL" and bot_scheduler:
                bot_scheduler.config['page_url'] = config_update.value

    except Exception as e:
        print(f"⚠️ خطأ في تحديث .env: {e}")

    db_config = db.query(models.BotConfig).filter(
        models.BotConfig.key == key,
        models.BotConfig.user_id == current_user.id,
    ).first()
    if not db_config:
        db_config = models.BotConfig(key=key, value=config_update.value, user_id=current_user.id)
        db.add(db_config)
    else:
        db_config.value = config_update.value
        db_config.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_config)
    return db_config
