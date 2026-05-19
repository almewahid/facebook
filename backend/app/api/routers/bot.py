from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import re
import shutil

from app.database import get_db
from app.deps import require_active_subscription
from app import models, schemas
from app.bot.scheduler import bot_scheduler

router = APIRouter(prefix="/bot", tags=["bot"])


@router.post("/start", response_model=schemas.BotStartResponse)
def start_bot(
    request: schemas.BotStartRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    if bot_scheduler and bot_scheduler.is_running and not request.force:
        raise HTTPException(status_code=400, detail="البوت يعمل بالفعل")

    if bot_scheduler:
        bot_scheduler.start()

    log = models.BotLog(level="info", message="تم بدء البوت", details=f"Force: {request.force}", user_id=current_user.id)
    db.add(log)
    db.commit()

    return schemas.BotStartResponse(
        status="started",
        message="تم بدء البوت بنجاح",
        started_at=datetime.utcnow()
    )


@router.post("/stop", response_model=schemas.BotStopResponse)
def stop_bot(
    request: schemas.BotStopRequest = schemas.BotStopRequest(),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    if bot_scheduler:
        bot_scheduler.stop()

    stopped_posts = db.query(models.PublishPost).filter(
        models.PublishPost.user_id == current_user.id,
        models.PublishPost.status.in_(["pending", "publishing"])
    ).update({models.PublishPost.status: "cancelled"}, synchronize_session=False)

    stopped_campaigns = db.query(models.Campaign).filter(
        models.Campaign.user_id == current_user.id,
        models.Campaign.status == "active"
    ).update({models.Campaign.status: "cancelled"}, synchronize_session=False)

    log = models.BotLog(level="info", message="تم إيقاف البوت", details=f"Force: {request.force}", user_id=current_user.id)
    db.add(log)
    if stopped_posts or stopped_campaigns:
        db.add(models.BotLog(
            level="info",
            message="تم إيقاف كل عمليات النشر النشطة",
            details=f"publish_posts={stopped_posts} | campaigns={stopped_campaigns}",
            user_id=current_user.id,
        ))
    db.commit()

    return schemas.BotStopResponse(
        status="stopped",
        message="تم إيقاف البوت بنجاح",
        stopped_at=datetime.utcnow()
    )


@router.get("/status", response_model=schemas.BotStatusResponse)
def get_bot_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    stale_cutoff = datetime.utcnow() - timedelta(minutes=30)

    db.query(models.PublishPost).filter(
        models.PublishPost.user_id == current_user.id,
        models.PublishPost.status.in_(["pending", "publishing"]),
        ((models.PublishPost.success_count + models.PublishPost.failed_count) >= models.PublishPost.total_groups)
    ).update({models.PublishPost.status: "done"}, synchronize_session=False)

    db.query(models.PublishPost).filter(
        models.PublishPost.user_id == current_user.id,
        models.PublishPost.status.in_(["pending", "publishing"]),
        models.PublishPost.created_at < stale_cutoff,
        models.PublishPost.success_count == 0,
        models.PublishPost.failed_count == 0,
    ).update({models.PublishPost.status: "cancelled"}, synchronize_session=False)

    db.commit()

    active_publishes = db.query(models.PublishPost).filter(
        models.PublishPost.user_id == current_user.id,
        models.PublishPost.status.in_(["pending", "publishing"])
    ).count()
    active_campaigns = db.query(models.Campaign).filter(
        models.Campaign.user_id == current_user.id,
        models.Campaign.status == "active"
    ).count()
    is_running = bool((bot_scheduler.is_running if bot_scheduler else False) or active_publishes or active_campaigns)
    last_post = db.query(models.Post).filter(
        models.Post.user_id == current_user.id
    ).order_by(models.Post.created_at.desc()).first()

    return schemas.BotStatusResponse(
        is_running=is_running,
        active_publishes=active_publishes,
        active_campaigns=active_campaigns,
        current_cycle=last_post.cycle_number if last_post else None,
        current_group=None,
        started_at=None,
        last_activity=last_post.created_at if last_post else None
    )


@router.get("/safety-status")
def get_safety_status(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    paused = db.query(models.BotConfig).filter(models.BotConfig.key == "SAFETY_PAUSED", models.BotConfig.user_id == current_user.id).first()
    reason = db.query(models.BotConfig).filter(models.BotConfig.key == "SAFETY_PAUSE_REASON", models.BotConfig.user_id == current_user.id).first()
    daily_limit = db.query(models.BotConfig).filter(models.BotConfig.key == "SAFETY_DAILY_POST_LIMIT", models.BotConfig.user_id == current_user.id).first()

    return {
        "paused": bool(paused and str(paused.value).lower() == "true"),
        "reason": reason.value if reason else None,
        "daily_limit": int(daily_limit.value) if daily_limit and str(daily_limit.value).isdigit() else 10,
    }


@router.post("/safety-reset")
def reset_safety_pause(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    for key, value in {
        "SAFETY_PAUSED": "false",
        "SAFETY_PAUSE_REASON": "",
    }.items():
        db_config = db.query(models.BotConfig).filter(
            models.BotConfig.key == key,
            models.BotConfig.user_id == current_user.id,
        ).first()
        if db_config:
            db_config.value = value
        else:
            db.add(models.BotConfig(key=key, value=value, user_id=current_user.id))

    db.add(models.BotLog(
        level="info",
        message="تم إلغاء الإيقاف الآمن يدوياً",
        details="راجع الحساب على فيسبوك قبل إعادة التشغيل",
        user_id=current_user.id,
    ))
    db.commit()

    if bot_scheduler and bot_scheduler.bot:
        bot_scheduler.bot.safety_paused = False

    return {"status": "success", "message": "تم إلغاء الإيقاف الآمن"}


@router.post("/logout")
def logout_facebook(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    if bot_scheduler and bot_scheduler.is_running:
        raise HTTPException(status_code=400, detail="يجب إيقاف البوت أولاً قبل تسجيل الخروج")

    profile_path = r"C:\bot_chrome_data"

    try:
        if os.path.exists(profile_path):
            shutil.rmtree(profile_path)
            log = models.BotLog(level="info", message="تم تسجيل الخروج من فيسبوك", details="تم حذف Chrome Profile من C:", user_id=current_user.id)
            db.add(log)
            db.commit()
            return {"status": "success", "message": "تم تسجيل الخروج بنجاح ومسح بيانات الجلسة من القرص C."}
        else:
            return {"status": "info", "message": "لا يوجد حساب مسجل الدخول في المسار المخصص"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في تسجيل الخروج: {str(e)}")


@router.get("/profile-status")
def get_profile_status(current_user: models.User = Depends(require_active_subscription)):
    """التحقق من وجود Chrome Profile"""
    profile_path = r"C:\bot_chrome_data"

    exists = os.path.exists(profile_path)
    cookies_default = os.path.join(profile_path, "Default", "Network", "Cookies")
    cookies_p5 = os.path.join(profile_path, "Profile 5", "Network", "Cookies")

    is_logged_in = exists and (os.path.exists(cookies_default) or os.path.exists(cookies_p5))

    return {
        "exists": is_logged_in,
        "message": "مسجل الدخول" if is_logged_in else "غير مسجل الدخول"
    }


@router.post("/open-login-browser")
def open_login_browser(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """يفتح Chrome لتسجيل الدخول يدوياً بدون تشغيل البوت"""
    if os.name != "nt" and os.getenv("DISPLAY") is None:
        raise HTTPException(
            status_code=400,
            detail="فتح Chrome اليدوي متاح عند تشغيل الباكند محلياً فقط، وليس من سيرفر Render.",
        )

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
            details=result.get("message"),
            user_id=current_user.id,
        )
        db.add(log)
        db.commit()

        if result.get("status") == "error":
            raise HTTPException(status_code=500, detail=result["message"])

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ في فتح المتصفح: {str(e)}")


@router.post("/close-login-browser")
def close_login_browser(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
    """يغلق المتصفح ويحفظ الجلسة"""
    try:
        bot = (bot_scheduler.bot if bot_scheduler and bot_scheduler.bot else None)

        if not bot:
            return {"status": "error", "message": "لا يوجد متصفح مفتوح للإغلاق"}

        result = bot.close_login_browser()

        if bot_scheduler:
            bot_scheduler.bot = None

        profile_path = r"C:\bot_chrome_data"
        profile_exists = os.path.exists(profile_path)

        log = models.BotLog(
            level="info",
            message="إغلاق متصفح تسجيل الدخول وحفظ الجلسة",
            details=result.get("message"),
            user_id=current_user.id,
        )
        db.add(log)
        db.commit()

        return {**result, "profile_exists": profile_exists}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ أثناء إغلاق المتصفح: {str(e)}")


@router.get("/chrome-profiles")
def get_chrome_profiles(current_user: models.User = Depends(require_active_subscription)):
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


@router.post("/set-chrome-profile")
def set_chrome_profile(
    data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_active_subscription),
):
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
        db_config = db.query(models.BotConfig).filter(
            models.BotConfig.key == key,
            models.BotConfig.user_id == current_user.id,
        ).first()
        if not db_config:
            db_config = models.BotConfig(key=key, value=value, user_id=current_user.id)
            db.add(db_config)
        else:
            db_config.value = value
    db.commit()

    return {"status": "success", "profile_name": profile_name, "profile_folder": profile_folder}
