# app/bot/scheduler.py

import threading
import time
import json
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models
from app.bot.selenium_bot import FacebookBot
from app.database import DATABASE_URL, SessionLocal, engine, Base

CAIRO_TZ = timezone(timedelta(hours=3))


def now_cairo():
    return datetime.now(CAIRO_TZ).replace(tzinfo=None)

class BotScheduler:
    def __init__(self):
        self.is_running = False
        self.thread = None
        self._stop_event = threading.Event()

        # ✅ الإبقاء على كامل الـ config للتحكم الكامل
        self.config = {
            'page_url': os.getenv('PAGE_URL', 'https://web.facebook.com'),
            'max_groups_per_session': int(os.getenv('MAX_GROUPS_PER_SESSION', 7)),
            'delay_between_cycles': int(os.getenv('DELAY_BETWEEN_CYCLES', 3600)),
        }
        self._load_saved_config()

        self.bot = FacebookBot(self.config)
        self.engine = create_engine(DATABASE_URL)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def _load_saved_config(self):
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            keys = {
                "PAGE_URL": "page_url",
                "CHROME_PROFILE": "chrome_profile_folder",
            }
            configs = db.query(models.BotConfig).filter(models.BotConfig.key.in_(keys.keys())).all()
            for item in configs:
                if item.value:
                    self.config[keys[item.key]] = item.value
        finally:
            db.close()

    def _check_and_execute_tasks(self):
        """فحص المهام من قاعدة البيانات وتنفيذها كل دورة"""
        db = self.SessionLocal()
        try:
            if self.bot.should_stop_for_safety():
                return

            # 1. معالجة الحملات المجدولة النشطة
            campaigns = db.query(models.Campaign).filter(models.Campaign.status == "active").all()
            for campaign in campaigns:
                if self.bot.should_stop_for_safety():
                    break
                self._process_campaign(db, campaign)

            # 2. معالجة النشر اليدوي الفوري
            pending_manual = db.query(models.PublishPost).filter(models.PublishPost.status == "pending").all()
            for post in pending_manual:
                if self.bot.should_stop_for_safety():
                    break
                self._process_manual_post(db, post)

        except Exception as e:
            # ✅ الإبقاء على except لمنع توقف الحلقة بسبب خطأ واحد
            print(f"❌ خطأ أثناء فحص المهام: {e}")
        finally:
            db.close()

    def _process_campaign(self, db, campaign):
        """تنفيذ بنود الحملة المجدولة مع دعم التبديل بين المنشورات"""
        if not campaign.schedule_plan:
            return

        plan = json.loads(campaign.schedule_plan)
        changed = False
        now = now_cairo()
        publish_method = getattr(campaign, "publish_method", None) or "new_post"

        for item in plan:
            if self.bot.should_stop_for_safety():
                campaign.status = "paused"
                db.add(models.BotLog(
                    level="warning",
                    message=f"تم إيقاف الحملة [{campaign.name}] مؤقتاً لحماية الحساب",
                    details=f"campaign_id={campaign.id}"
                ))
                changed = True
                break

            # ✅ فحص حالة الحملة من DB قبل كل منشور لضمان الإيقاف الفوري
            db.refresh(campaign)
            if campaign.status in ("cancelled", "paused"):
                print(f"⏹ الحملة '{campaign.name}' تم إيقافها — إنهاء التنفيذ")
                break

            # معالجة صيغة الوقت (ISO format)
            try:
                sched_time = datetime.fromisoformat(item['scheduled_time'])
            except (ValueError, KeyError):
                continue

            # فحص ما إذا حان وقت النشر ولم يتم تنفيذه بعد
            if item.get('status') == "pending" and now >= sched_time:
                # ✅ فحص إضافي: هل طُلب إيقاف البوت كلياً؟
                if not self.is_running:
                    break

                print(f"📅 تنفيذ منشور مجدول للحملة '{campaign.name}' ← مجموعة: {item.get('group_name')}")

                self.bot.config['scheduled_time'] = sched_time

                if publish_method == "share_page":
                    group_identifier = item.get('group_name') or item.get('group_url')
                    success_post = self.bot.post_to_group(group_identifier, campaign.id)
                else:
                    post_meta = db.query(models.Post).filter(models.Post.id == item.get('assigned_post_id')).first()
                    if post_meta:
                        success_post = self.bot.post_new_content_to_group(
                            group_name=item.get('group_name'),
                            text=post_meta.content,
                            image_path=post_meta.image_path,
                            publish_post_id=campaign.id
                        )
                    else:
                        success_post = None
                        db.add(models.BotLog(
                            level="error",
                            message=f"محتوى الحملة غير موجود للمجموعة: {item.get('group_name')}",
                            details=f"campaign_id={campaign.id}"
                        ))

                if success_post and success_post.status == "success":
                    item['status'] = "sent"
                    item['post_url'] = success_post.post_url
                    campaign.sent_count += 1
                    db.add(models.BotLog(
                        level="info",
                        message=f"تم نشر بند من الحملة في: {item.get('group_name')}",
                        details=f"campaign_id={campaign.id} | method={publish_method} | post_id={success_post.id}"
                    ))
                else:
                    item['status'] = "failed"
                    db.add(models.BotLog(
                        level="error",
                        message=f"فشل بند من الحملة في: {item.get('group_name')}",
                        details=f"campaign_id={campaign.id} | method={publish_method}"
                    ))

                if self.bot.should_stop_for_safety():
                    campaign.status = "paused"
                    db.add(models.BotLog(
                        level="warning",
                        message=f"توقف تنفيذ الحملة [{campaign.name}] لحماية الحساب",
                        details=f"campaign_id={campaign.id} | method={publish_method}"
                    ))
                    changed = True
                    break

                changed = True

        if changed:
            campaign.schedule_plan = json.dumps(plan)
            # ✅ شرط الإنهاء: اكتملت الحملة إذا لم يتبق أي بند معلق
            if campaign.status != "paused" and all(i.get('status') != "pending" for i in plan):
                campaign.status = "completed"
                campaign.completed_at = now_cairo()
            db.commit()

    def _process_manual_post(self, db, post):
        """تنفيذ النشر اليدوي الفوري للمجموعات المحددة"""
        if not post.target_group_ids:
            return

        start_time = getattr(post, "scheduled_start_time", None)
        if getattr(post, "is_scheduled", False) and start_time and now_cairo() < start_time:
            return

        target_ids = [int(i) for i in post.target_group_ids.split(",") if i]
        groups = db.query(models.Group).filter(models.Group.id.in_(target_ids)).all()

        post.status = "publishing"
        db.commit()

        success_count = 0
        failed_count = 0
        publish_method = getattr(post, "publish_method", None) or "new_post"
        min_safe_delay = self.bot._get_config_int("SAFETY_MIN_DELAY_MINUTES", 1)
        delay_minutes = max(min_safe_delay, int(getattr(post, "delay_minutes", 5) or 0))
        next_publish_time = start_time or now_cairo()

        for index, group in enumerate(groups):
            if self.bot.should_stop_for_safety():
                post.status = "failed"
                db.add(models.BotLog(
                    level="warning",
                    message="تم إيقاف النشر اليدوي لحماية الحساب",
                    details=f"publish_id={post.id}"
                ))
                db.commit()
                break

            # التحقق من حالة الإيقاف لضمان استجابة سريعة لطلب المستخدم
            if not self.is_running:
                break

            db.refresh(post)
            if post.status == "cancelled":
                break

            if index > 0 and delay_minutes:
                next_publish_time = next_publish_time + timedelta(minutes=delay_minutes)

            while self.is_running and now_cairo() < next_publish_time:
                if self._stop_event.wait(timeout=min(10, max(1, (next_publish_time - now_cairo()).total_seconds()))):
                    break

            if not self.is_running:
                break

            db.refresh(post)
            if post.status == "cancelled":
                break

            self.bot.config['scheduled_time'] = next_publish_time

            if publish_method == "share_page":
                group_identifier = group.name
                success_post = self.bot.post_to_group(group_identifier, post.id)
            else:
                image_path = post.image_paths.split(",")[0] if post.image_paths else None
                success_post = self.bot.post_new_content_to_group(
                    group_name=group.name,
                    text=post.text,
                    publish_post_id=post.id,
                    image_path=image_path
                )

            if success_post and success_post.status == "success":
                success_count += 1
            else:
                failed_count += 1

            # تحديث العدادات لحظياً ليراها المستخدم في الواجهة
            post.success_count = success_count
            post.failed_count = failed_count
            db.commit()

            if self.bot.should_stop_for_safety():
                post.status = "failed"
                db.add(models.BotLog(
                    level="warning",
                    message="توقف النشر اليدوي بعد تحذير حماية الحساب",
                    details=f"publish_id={post.id}"
                ))
                db.commit()
                break

        db.refresh(post)
        if post.status not in ("cancelled", "failed"):
            post.status = "done"
            post.published_at = now_cairo()
        db.commit()

    def _run_loop(self):
        """الحلقة الرئيسية التي تدير البوت وتفحص المهام دورياً"""
        print("🚀 بدء حلقة المجدول الذكي...")

        if not self.bot.start():
            print("❌ فشل تشغيل المتصفح الأساسي")
            db = self.SessionLocal()
            try:
                db.add(models.BotLog(
                    level="error",
                    message="فشل تشغيل المتصفح الأساسي للمجدول",
                    details="تعذر بدء تنفيذ الحملات. تحقق من إعدادات المتصفح."
                ))
                db.commit()
            finally:
                db.close()
            self.is_running = False
            return

        while self.is_running:
            self._check_and_execute_tasks()
            # انتظار ذكي يسمح بالإيقاف الفوري دون انتظار انتهاء المهلة كاملة
            if self._stop_event.wait(timeout=10):
                break

        self.bot.stop()
        print("🛑 توقف المجدول")

    def start(self):
        """تشغيل المجدول في thread منفصل"""
        if self.is_running:
            return False
        self._load_saved_config()
        if self.bot:
            self.bot.config.update(self.config)
        self._stop_event.clear()
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        return True

    def stop(self):
        """إيقاف المجدول بسلام"""
        self.is_running = False
        self._stop_event.set()
        if self.thread and self.thread.is_alive() and threading.current_thread() != self.thread:
            self.thread.join(timeout=15)
        return True

bot_scheduler = BotScheduler()
