"""
جدولة البوت للعمل التلقائي
"""

import threading
import time
from datetime import datetime
from app.bot.selenium_bot import FacebookBot
import os
class BotScheduler:
    """مجدول البوت"""
    
    def __init__(self):
        self.is_running = False
        self.thread = None
        self._stop_event = threading.Event()
        
        self.config = {
            'page_url': os.getenv('PAGE_URL', 'https://web.facebook.com'),
            'max_groups_per_session': int(os.getenv('MAX_GROUPS_PER_SESSION', 7)),
            'delay_between_cycles': int(os.getenv('DELAY_BETWEEN_CYCLES', 3600)),
            'min_delay_between_groups': int(os.getenv('MIN_DELAY_BETWEEN_GROUPS', 60)),
            'max_delay_between_groups': int(os.getenv('MAX_DELAY_BETWEEN_GROUPS', 120)),
        }
        
        self.bot = FacebookBot(self.config)

    def _run_loop(self):
        """حلقة العمل الرئيسية"""
        print("🚀 بدء حلقة البوت...")
        
        if not self.bot.start():
            print("❌ فشل بدء البوت")
            self.is_running = False
            return
        
        while self.is_running:
            try:
                self.bot.run_cycle()
                
                # الانتظار حتى الدورة التالية - مع إمكانية الإيقاف الفوري
                if self.is_running:
                    delay = self.config['delay_between_cycles']
                    print(f"⏳ انتظار {delay // 60} دقيقة حتى الدورة التالية...")
                    # ✅ بدل time.sleep(delay) نستخدم wait مع فحص كل ثانية
                    self._stop_event.wait(timeout=delay)
                    if self._stop_event.is_set():
                        break
                    
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"❌ خطأ في الدورة: {e}")
                self._stop_event.wait(timeout=60)
                if self._stop_event.is_set():
                    break
        
        # إيقاف البوت
        if self.bot:
            self.bot.stop()
        
        self.is_running = False
        print("🛑 توقف البوت بنجاح")
    
    def start(self):
        """بدء الجدولة"""
        if self.is_running:
            print("⚠️ البوت يعمل بالفعل")
            return False
        
        self._stop_event.clear()  # ✅ إعادة تعيين الـ event
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        print("✅ تم بدء البوت")
        return True
    
    def stop(self):
        """إيقاف الجدولة"""
        if not self.is_running:
            print("⚠️ البوت متوقف بالفعل")
            return False
        
        self.is_running = False
        self._stop_event.set()  # ✅ إشارة الإيقاف الفوري
        if self.thread:
            self.thread.join(timeout=10)
        print("✅ تم إيقاف البوت")
        return True

# متغير عام للـ scheduler
bot_scheduler = BotScheduler()