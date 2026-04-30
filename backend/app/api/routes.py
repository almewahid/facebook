from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import csv
import io
import os
import re
import uuid
import shutil
import pandas as pd

from app.database import get_db
from app import models, schemas

router = APIRouter()

# ==================== Groups Endpoints ====================

@router.post("/groups", response_model=schemas.GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(group: schemas.GroupCreate, db: Session = Depends(get_db)):
    """إنشاء مجموعة جديدة مع دعم التصنيفات"""
    # 1. التحقق من وجود المجموعة مسبقاً
    existing = db.query(models.Group).filter(models.Group.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="المجموعة موجودة بالفعل")
    
    # 2. تحويل البيانات (استخدام model_dump هو الخيار الصحيح حالياً)
    group_data = group.model_dump()
    
    # 3. إنشاء الكائن ورفعه لقاعدة البيانات
    # تأكد أن schemas.GroupCreate تستخدم حقل 'category' وليس 'category_id'
    db_group = models.Group(**group_data)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    
    return db_group
@router.get("/groups", response_model=List[schemas.GroupResponse])
def get_groups(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """الحصول على كل المجموعات"""
    # جلب المجموعات مرتبة بالأحدث لضمان رؤية المجموعات الجديدة فور إضافتها
    groups = db.query(models.Group).order_by(models.Group.id.desc()).offset(skip).limit(limit).all()
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
    """تحديث بيانات المجموعة (الاسم، الرابط، أو القائمة)"""
    db_group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not db_group:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    
    # ✅ التعديل الجوهري: استخدام model_dump لضمان قراءة حقل category الجديد
    update_data = group_update.model_dump(exclude_unset=True)
    
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
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة CSV")
    
    try:
        contents = await file.read()
        decoded = contents.decode('utf-8-sig')
        csv_reader = csv.DictReader(io.StringIO(decoded))
        
        added_count = 0
        skipped_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                name = row.get('name', '').strip()
                url = row.get('url', '').strip() or None
                is_active = row.get('is_active', 'true').lower() == 'true'
                
                if not name:
                    errors.append(f"السطر {row_num}: اسم المجموعة فارغ")
                    continue
                
                existing = db.query(models.Group).filter(models.Group.name == name).first()
                if existing:
                    skipped_count += 1
                    continue
                
                new_group = models.Group(name=name, url=url, is_active=is_active)
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
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        raise HTTPException(400, "يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)")
    
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        if 'name' not in df.columns:
            raise HTTPException(400, "العمود 'name' مطلوب في ملف Excel")
        
        added_count = 0
        skipped_count = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                name = str(row.get('name', '')).strip()
                url = str(row.get('url', '')).strip() if pd.notna(row.get('url')) else None
                is_active = bool(row.get('is_active', True))
                
                if not name or name == 'nan':
                    errors.append(f"السطر {index + 2}: اسم المجموعة فارغ")
                    continue
                
                existing = db.query(models.Group).filter(models.Group.name == name).first()
                if existing:
                    skipped_count += 1
                    continue
                
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
    added_count = 0
    skipped_count = 0
    errors = []
    
    for idx, group_data in enumerate(data.groups):
        try:
            existing = db.query(models.Group).filter(models.Group.name == group_data.name).first()
            if existing:
                skipped_count += 1
                continue
            
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
    posts = db.query(models.Post).order_by(models.Post.created_at.desc()).offset(skip).limit(limit).all()
    return posts

@router.get("/posts/{post_id}", response_model=schemas.PostResponse)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
    return post

# ==================== Publish Post Endpoints ====================

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


async def _publish_to_groups_task(post_id: int, db_url: str):
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
 
                
                # جلب مسار أول صورة إن وجدت
                image_path = None
                if post.image_paths:
                    image_path = post.image_paths.split(",")[0]

                print(f"🔄 جاري محاولة النشر في مجموعة: {group.name}")
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
 
            # ✅ تحديث العدادات بعد كل مجموعة
            post.success_count = success_count
            post.failed_count = failed_count
            db.commit()
 
        # ✅ تحديث الحالة إلى done عند الانتهاء (هذا كان مفقوداً)
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

@router.post("/publish", status_code=status.HTTP_202_ACCEPTED)
async def publish_post(
    background_tasks: BackgroundTasks,
    text: str = Form(...),
    images: Optional[List[UploadFile]] = File(None),
    video: Optional[UploadFile] = File(None),
    group_ids: Optional[List[int]] = Form(None),
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
        details=f"post_id={new_post.id} | صور={len(image_paths)} | فيديو={'نعم' if video_path else 'لا'}"
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
    """متابعة حالة نشر منشور مع تفاصيل كل مجموعة"""
    post = db.query(models.PublishPost).filter(models.PublishPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="المنشور غير موجود")
 
    progress = 0
    if post.total_groups and post.total_groups > 0:
        done = (post.success_count or 0) + (post.failed_count or 0)
        progress = round((done / post.total_groups) * 100, 1)
 
    # ✅ جلب تفاصيل المجموعات من جدول Posts
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
        "progress_percent": progress,
        "total_groups": post.total_groups,
        "success_count": post.success_count,
        "failed_count": post.failed_count,
        "created_at": post.created_at,
        "published_at": post.published_at,
        "results": results,  # ✅ تفاصيل كل مجموعة مع الرابط
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


# ==================== Statistics Endpoints ====================

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
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
    if bot_scheduler and bot_scheduler.is_running and not request.force:
        raise HTTPException(status_code=400, detail="البوت يعمل بالفعل")
    
    if bot_scheduler:
        bot_scheduler.start()
    
    log = models.BotLog(level="info", message="تم بدء البوت", details=f"Force: {request.force}")
    db.add(log)
    db.commit()
    
    return schemas.BotStartResponse(
        status="started",
        message="تم بدء البوت بنجاح",
        started_at=datetime.utcnow()
    )

@router.post("/bot/stop", response_model=schemas.BotStopResponse)
def stop_bot(request: schemas.BotStopRequest, db: Session = Depends(get_db)):
    if bot_scheduler:
        bot_scheduler.stop()
    
    log = models.BotLog(level="info", message="تم إيقاف البوت", details=f"Force: {request.force}")
    db.add(log)
    db.commit()
    
    return schemas.BotStopResponse(
        status="stopped",
        message="تم إيقاف البوت بنجاح",
        stopped_at=datetime.utcnow()
    )

@router.get("/bot/status", response_model=schemas.BotStatusResponse)
def get_bot_status(db: Session = Depends(get_db)):
    is_running = bot_scheduler.is_running if bot_scheduler else False
    last_post = db.query(models.Post).order_by(models.Post.created_at.desc()).first()
    
    return schemas.BotStatusResponse(
        is_running=is_running,
        current_cycle=last_post.cycle_number if last_post else None,
        current_group=None,
        started_at=None,
        last_activity=last_post.created_at if last_post else None
    )

@router.post("/bot/logout")
def logout_facebook(db: Session = Depends(get_db)):
    import shutil
    
    if bot_scheduler and bot_scheduler.is_running:
        raise HTTPException(status_code=400, detail="يجب إيقاف البوت أولاً قبل تسجيل الخروج")
    
    # ✅ تعديل للمسار الجديد في القرص C
    profile_path = r"C:\bot_chrome_data"
    
    try:
        if os.path.exists(profile_path):
            shutil.rmtree(profile_path)
            log = models.BotLog(level="info", message="تم تسجيل الخروج من فيسبوك", details="تم حذف Chrome Profile من C:")
            db.add(log)
            db.commit()
            return {"status": "success", "message": "تم تسجيل الخروج بنجاح ومسح بيانات الجلسة من القرص C."}
        else:
            return {"status": "info", "message": "لا يوجد حساب مسجل الدخول في المسار المخصص"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل الخروج: {str(e)}")

@router.get("/bot/profile-status")
def get_profile_status():
    """التحقق من وجود Chrome Profile في المسار الجديد في C:"""
    profile_path = r"C:\bot_chrome_data"
    
    # التحقق من وجود المجلد الأساسي
    exists = os.path.exists(profile_path)
    
    # التحقق من وجود ملفات الجلسة (Cookies) لضمان تسجيل الدخول الفعلي
    cookies_default = os.path.join(profile_path, "Default", "Network", "Cookies")
    cookies_p5 = os.path.join(profile_path, "Profile 5", "Network", "Cookies")
    
    # نعتبره مسجل دخول إذا وجد المجلد وأحد ملفات الكوكيز المحتملة
    is_logged_in = exists and (os.path.exists(cookies_default) or os.path.exists(cookies_p5))

    return {
        "exists": is_logged_in, 
        "message": "مسجل الدخول" if is_logged_in else "غير مسجل الدخول"
    }

@router.post("/bot/open-login-browser")
def open_login_browser(db: Session = Depends(get_db)):
    """يفتح Chrome لتسجيل الدخول يدوياً بدون تشغيل البوت"""
    if bot_scheduler and bot_scheduler.is_running:
        raise HTTPException(status_code=400, detail="أوقف البوت أولاً قبل فتح المتصفح")

    from app.bot.selenium_bot import FacebookBot

    try:
        config = bot_scheduler.config if bot_scheduler else {}
        temp_bot = FacebookBot(config)
        result = temp_bot.open_browser_for_login()

        if bot_scheduler:
            bot_scheduler.bot = temp_bot

        log = models.BotLog(
            level="info",
            message="فتح المتصفح لتسجيل الدخول",
            details=result.get("message")
        )
        db.add(log)
        db.commit()

        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result["message"])

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في فتح المتصفح: {str(e)}")

@router.post("/bot/close-login-browser")
def close_login_browser(db: Session = Depends(get_db)):
    """يغلق المتصفح ويحفظ الجلسة"""
    try:
        bot = (bot_scheduler.bot if bot_scheduler and bot_scheduler.bot else None)
        
        if not bot:
            return {"status": "error", "message": "لا يوجد متصفح مفتوح للإغلاق"}

        result = bot.close_login_browser()
        
        if bot_scheduler:
            bot_scheduler.bot = None

        # التحقق من الحالة بعد الإغلاق للتحديث في الواجهة
        profile_path = r"C:\bot_chrome_data"
        profile_exists = os.path.exists(profile_path)

        log = models.BotLog(
            level="info",
            message="إغلاق متصفح تسجيل الدخول وحفظ الجلسة",
            details=result.get("message")
        )
        db.add(log)
        db.commit()

        return {**result, "profile_exists": profile_exists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ أثناء إغلاق المتصفح: {str(e)}")

@router.get("/bot/chrome-profiles")
def get_chrome_profiles():
    """جلب كل بروفايلات Chrome الموجودة على الجهاز"""
    import json

    chrome_user_data = os.path.expanduser(
        r"~\AppData\Local\Google\Chrome\User Data"
    )

    profiles = []
    candidate_folders = ["Default", "FB_Profile"] + [f"Profile {i}" for i in range(1, 20)]

    for folder in candidate_folders:
        folder_path = os.path.join(chrome_user_data, folder)
        if not os.path.exists(folder_path):
            continue

        prefs_path = os.path.join(folder_path, "Preferences")
        profile_name = folder

        try:
            with open(prefs_path, "r", encoding="utf-8") as f:
                prefs = json.load(f)
                name = prefs.get("profile", {}).get("name", "")
                if name:
                    profile_name = name
        except:
            pass

        profiles.append({
            "folder": folder,
            "name": profile_name,
            "path": folder_path
        })

    return {"profiles": profiles, "chrome_user_data": chrome_user_data}


@router.post("/bot/set-chrome-profile")
def set_chrome_profile(data: dict, db: Session = Depends(get_db)):
    """تعيين بروفايل Chrome المستخدم في البوت"""
    import json

    profile_folder = data.get("profile_folder")
    if not profile_folder:
        raise HTTPException(status_code=400, detail="profile_folder مطلوب")

    chrome_user_data = os.path.expanduser(
        r"~\AppData\Local\Google\Chrome\User Data"
    )
    folder_path = os.path.join(chrome_user_data, profile_folder)

    if not os.path.exists(folder_path):
        raise HTTPException(status_code=404, detail="البروفايل غير موجود")

    profile_name = profile_folder
    try:
        with open(os.path.join(folder_path, "Preferences"), "r", encoding="utf-8") as f:
            prefs = json.load(f)
            name = prefs.get("profile", {}).get("name", "")
            if name:
                profile_name = name
    except:
        pass

    env_path = os.path.join(os.getcwd(), ".env")
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()

        for key, value in [("CHROME_PROFILE_FOLDER", profile_folder), ("CHROME_USER_DATA", chrome_user_data)]:
            if re.search(rf"^{key}=.*", content, re.MULTILINE):
                content = re.sub(rf"^{key}=.*", f"{key}={value}", content, flags=re.MULTILINE)
            else:
                content += f"\n{key}={value}"

        with open(env_path, "w", encoding="utf-8") as f:
            f.write(content)

        os.environ["CHROME_PROFILE_FOLDER"] = profile_folder
        os.environ["CHROME_USER_DATA"] = chrome_user_data

        if bot_scheduler:
            bot_scheduler.config['chrome_profile_folder'] = profile_folder
            bot_scheduler.config['chrome_user_data'] = chrome_user_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في الحفظ: {str(e)}")

    for key, value in [("CHROME_PROFILE", profile_folder)]:
        db_config = db.query(models.BotConfig).filter(models.BotConfig.key == key).first()
        if not db_config:
            db_config = models.BotConfig(key=key, value=value)
            db.add(db_config)
        else:
            db_config.value = value
    db.commit()

    return {"status": "success", "profile_name": profile_name, "profile_folder": profile_folder}

# ==================== Logs Endpoints ====================

@router.get("/logs", response_model=List[schemas.BotLogResponse])
def get_logs(skip: int = 0, limit: int = 100, level: str = None, db: Session = Depends(get_db)):
    query = db.query(models.BotLog)
    if level:
        query = query.filter(models.BotLog.level == level)
    logs = query.order_by(models.BotLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs

# ==================== AI Insights Endpoints ====================

@router.get("/ai/insights", response_model=List[schemas.AIInsightResponse])
def get_ai_insights(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    insights = db.query(models.AIInsight).order_by(models.AIInsight.created_at.desc()).offset(skip).limit(limit).all()
    return insights

# ==================== Config Endpoints ====================

@router.get("/config", response_model=List[schemas.BotConfigResponse])
def get_configs(db: Session = Depends(get_db)):
    configs = db.query(models.BotConfig).all()
    return configs

@router.put("/config/{key}", response_model=schemas.BotConfigResponse)
def update_config(key: str, config_update: schemas.BotConfigUpdate, db: Session = Depends(get_db)):
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

    db_config = db.query(models.BotConfig).filter(models.BotConfig.key == key).first()
    if not db_config:
        db_config = models.BotConfig(key=key, value=config_update.value)
        db.add(db_config)
    else:
        db_config.value = config_update.value
        db_config.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(db_config)
    return db_config