# app/bot/scheduler.py

import threading
import time
import json
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app import models
from app.bot.selenium_bot import FacebookBot
from app.database import DATABASE_URL

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

        self.bot = FacebookBot(self.config)
        self.engine = create_engine(DATABASE_URL)
        self.SessionLocal = sessionmaker(bind=self.engine)

    def _check_and_execute_tasks(self):
        """فحص المهام من قاعدة البيانات وتنفيذها كل دورة"""
        db = self.SessionLocal()
        try:
            # 1. معالجة الحملات المجدولة النشطة
            campaigns = db.query(models.Campaign).filter(models.Campaign.status == "active").all()
            for campaign in campaigns:
                self._process_campaign(db, campaign)

            # 2. معالجة النشر اليدوي الفوري
            pending_manual = db.query(models.PublishPost).filter(models.PublishPost.status == "pending").all()
            for post in pending_manual:
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
        now = datetime.now()

        for item in plan:
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

                # جلب محتوى المنشور المخصص لهذا البند
                post_meta = db.query(models.Post).filter(models.Post.id == item.get('assigned_post_id')).first()

                if post_meta:
                    # تمرير وقت الجدولة للبوت لضمان دقة التقارير
                    self.bot.config['scheduled_time'] = sched_time
                    
                    # ✅ تنفيذ النشر الفعلي مع دعم النصوص والوسائط
                    success_post = self.bot.post_new_content_to_group(
                        group_name=item.get('group_name'),
                        text=post_meta.content,
                        image_path=post_meta.image_path,
                        publish_post_id=campaign.id  # ربط السجل بمعرف الحملة
                    )
                    
                    # تحديث حالة البند بناءً على النتيجة
                    if success_post and success_post.status == "success":
                        item['status'] = "sent"
                        item['post_url'] = success_post.post_url
                        campaign.sent_count += 1
                        db.add(models.BotLog(
                            level="info",
                            message=f"تم نشر بند من الحملة في: {item.get('group_name')}",
                            details=f"campaign_id={campaign.id} | post_id={success_post.id}"
                        ))
                    else:
                        item['status'] = "failed"
                        db.add(models.BotLog(
                            level="error",
                            message=f"فشل بند من الحملة في: {item.get('group_name')}",
                            details=f"campaign_id={campaign.id}"
                        ))
                else:
                    item['status'] = "failed"
                    db.add(models.BotLog(
                        level="error",
                        message=f"محتوى الحملة غير موجود للمجموعة: {item.get('group_name')}",
                        details=f"campaign_id={campaign.id}"
                    ))

                changed = True

        if changed:
            campaign.schedule_plan = json.dumps(plan)
            # ✅ شرط الإنهاء: اكتملت الحملة إذا لم يتبق أي بند معلق
            if all(i.get('status') != "pending" for i in plan):
                campaign.status = "completed"
                campaign.completed_at = datetime.now()
            db.commit()

    def _process_manual_post(self, db, post):
        """تنفيذ النشر اليدوي الفوري للمجموعات المحددة"""
        if not post.target_group_ids:
            return

        target_ids = [int(i) for i in post.target_group_ids.split(",") if i]
        groups = db.query(models.Group).filter(models.Group.id.in_(target_ids)).all()

        post.status = "publishing"
        db.commit()

        success_count = 0
        failed_count = 0

        for group in groups:
            # التحقق من حالة الإيقاف لضمان استجابة سريعة لطلب المستخدم
            if not self.is_running:
                break

            # استخدام أول صورة مرفقة في حالة النشر اليدوي
            image_path = post.image_paths.split(",")[0] if post.image_paths else None

            # محاولة النشر الفعلي
            success_post = self.bot.post_new_content_to_group(
                group_name=group.name,
                text=post.text,
                publish_post_id=post.id,  # لربط السجلات بالمنشور اليدوي
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

        post.status = "done"
        post.published_at = datetime.now()
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
        self._stop_event.clear()
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        return True

    def stop(self):
        """إيقاف المجدول بسلام"""
        self.is_running = False
        self._stop_event.set()
        if self.thread:
            self.thread.join()
        return True

bot_scheduler = BotScheduler()