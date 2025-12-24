from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import csv
import io
import pandas as pd

from app.database import get_db
from app import models, schemas

router = APIRouter()

# ==================== Groups Endpoints ====================

@router.post("/groups", response_model=schemas.GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    """إنشاء مجموعة جديدة"""
    # التحقق من عدم وجود مجموعة بنفس الاسم
    existing = db.query(models.Group).filter(models.Group.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="المجموعة موجودة بالفعل")
    
    db_group = models.Group(**group.dict())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

@router.get("/groups", response_model=List[schemas.GroupResponse])
def get_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """الحصول على كل المجموعات"""
    groups = db.query(models.Group).offset(skip).limit(limit).all()
    return groups

@router.get("/groups/{group_id}", response_model=schemas.GroupResponse)
def get_group(group_id: int, db: Session = Depends(get_db)):
    """الحصول على مجموعة محددة"""
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    return group

@router.put("/groups/{group_id}", response_model=schemas.GroupResponse)
def update_group(group_id: int, group_update: schemas.GroupUpdate, db: Session = Depends(get_db)):
    """تحديث مجموعة"""
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
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
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    
    db.delete(db_group)
    db.commit()
    return None

# ==================== Groups Import Endpoints ====================

@router.post("/groups/import/csv", response_model=dict)
async def import_groups_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    استيراد مجموعات من ملف CSV
    
    صيغة CSV:
    name,url,is_active
    سوق الكويت,https://facebook.com/groups/kuwait-market,true
    وظائف الكويت,,true
    """
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة CSV")
    
    try:
        # قراءة الملف
        contents = await file.read()
        decoded = contents.decode('utf-8-sig')  # دعم UTF-8 BOM
        
        # تحليل CSV
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        added_count = 0
        skipped_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # استخراج البيانات
                name = row.get('name', '').strip()
                url = row.get('url', '').strip() or None
                is_active = row.get('is_active', 'true').lower() == 'true'
                
                if not name:
                    errors.append(f"السطر {row_num}: اسم المجموعة فارغ")
                    continue
                
                # تحقق من التكرار
                existing = db.query(models.Group).filter(models.Group.name == name).first()
                if existing:
                    skipped_count += 1
                    continue
                
                # إضافة المجموعة
                new_group = models.Group(
                    name=name,
                    url=url,
                    is_active=is_active
                )
                db.add(new_group)
                added_count += 1
                
            except Exception as e:
                errors.append(f"السطر {row_num}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "added": added_count,
            "skipped": skipped_count,
            "errors": errors,
            "total": added_count + skipped_count
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في معالجة الملف: {str(e)}")

@router.post("/groups/import/excel", response_model=dict)
async def import_groups_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    استيراد مجموعات من ملف Excel
    
    الأعمدة المطلوبة:
    - name: اسم المجموعة (إجباري)
    - url: رابط المجموعة (اختياري)
    - is_active: نشط؟ (اختياري، افتراضي true)
    """
    
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)")
    
    try:
        # قراءة الملف
        contents = await file.read()
        
        # قراءة Excel
        df = pd.read_excel(io.BytesIO(contents))
        
        # تحقق من الأعمدة المطلوبة
        if 'name' not in df.columns:
            raise HTTPException(400, "العمود 'name' مطلوب في ملف Excel")
        
        added_count = 0
        skipped_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # استخراج البيانات
                name = str(row.get('name', '')).strip()
                url = str(row.get('url', '')).strip() if pd.notna(row.get('url')) else None
                is_active = bool(row.get('is_active', True))
                
                if not name or name == 'nan':
                    errors.append(f"السطر {index + 2}: اسم المجموعة فارغ")
                    continue
                
                # تحقق من التكرار
                existing = db.query(models.Group).filter(models.Group.name == name).first()
                if existing:
                    skipped_count += 1
                    continue
                
                # إضافة المجموعة
                new_group = models.Group(
                    name=name,
                    url=url if url and url != 'nan' else None,
                    is_active=is_active
                )
                db.add(new_group)
                added_count += 1
                
            except Exception as e:
                errors.append(f"السطر {index + 2}: {str(e)}")
        
        db.commit()
        
        return {
            "success": True,
            "added": added_count,
            "skipped": skipped_count,
            "errors": errors,
            "total": added_count + skipped_count
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في معالجة الملف: {str(e)}")

@router.post("/groups/import/bulk", response_model=dict)
async def import_groups_bulk(
    data: schemas.GroupBulkImport,
    db: Session = Depends(get_db)
):
    """استيراد مجموعات متعددة دفعة واحدة"""
    
    added_count = 0
    skipped_count = 0
    errors = []
    
    for idx, group_data in enumerate(data.groups):
        try:
            # تحقق من التكرار
            existing = db.query(models.Group).filter(models.Group.name == group_data.name).first()
            if existing:
                skipped_count += 1
                continue
            
            # إضافة المجموعة
            new_group = models.Group(
                name=group_data.name,
                url=group_data.url,
                is_active=group_data.is_active
            )
            db.add(new_group)
            added_count += 1
            
        except Exception as e:
            errors.append(f"المجموعة {idx + 1}: {str(e)}")
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"خطأ في حفظ البيانات: {str(e)}")
    
    return {
        "success": True,
        "added": added_count,
        "skipped": skipped_count,
        "errors": errors,
        "total": added_count + skipped_count
    }

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

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """الحصول على الإحصائيات"""
    try:
        total_posts = db.query(models.Post).count()
        successful = db.query(models.Post).filter(models.Post.status == "success").count()
        failed = db.query(models.Post).filter(models.Post.status == "failed").count()
        skipped = db.query(models.Post).filter(models.Post.status == "skipped").count()
        
        success_rate = (successful / total_posts * 100) if total_posts > 0 else 0
        
        total_groups = db.query(models.Group).count()
        active_groups = db.query(models.Group).filter(models.Group.is_active == True).count()
        
        last_post = db.query(models.Post).order_by(models.Post.created_at.desc()).first()
        
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

@router.post("/bot/logout")
def logout_facebook(db: Session = Depends(get_db)):
    """تسجيل الخروج من فيسبوك - حذف Chrome Profile"""
    import shutil
    import os
    
    # إيقاف البوت أولاً
    if bot_scheduler and bot_scheduler.is_running:
        raise HTTPException(
            status_code=400, 
            detail="يجب إيقاف البوت أولاً قبل تسجيل الخروج"
        )
    
    # مسار Chrome Profile
    profile_path = os.path.join(os.getcwd(), "chrome_profile")
    
    try:
        if os.path.exists(profile_path):
            shutil.rmtree(profile_path)
            
            # تسجيل في logs
            log = models.BotLog(
                level="info",
                message="تم تسجيل الخروج من فيسبوك",
                details="تم حذف Chrome Profile"
            )
            db.add(log)
            db.commit()
            
            return {
                "status": "success",
                "message": "تم تسجيل الخروج بنجاح. عند تشغيل البوت مرة أخرى، سيطلب تسجيل الدخول."
            }
        else:
            return {
                "status": "info",
                "message": "لا يوجد حساب مسجل الدخول"
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل الخروج: {str(e)}")


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