أعتذر، الملف قطع بسبب حد الأحرف. دعني أرسل لك الملف **كاملاً 100%** بصيغة نصية يمكنك نسخها مباشرة:

```python
"""
البوت المحسّن للنشر في مجموعات فيسبوك
مع جميع التحسينات والحماية من الحظر
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import random
from datetime import datetime
import os
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    NoSuchElementException,
    TimeoutException,
    InvalidSessionIdException
)

from app.database import SessionLocal
from app import models


class FacebookBot:
    """بوت النشر في فيسبوك"""

    def __init__(self, config: dict):
        self.config = config
        self.driver = None
        self.cycle_counter = 0
        self.db = SessionLocal()

    def create_driver(self):
        """إنشاء driver متوافق مع Chrome"""
        print("إعداد خيارات المتصفح...")
        options = Options()
        profile_path = os.path.join(os.getcwd(), "chrome_profile")
        if not os.path.exists(profile_path):
            os.makedirs(profile_path)
        options.add_argument(f'user-data-dir={profile_path}')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--remote-debugging-port=9222')
        options.add_argument('--log-level=3')

        prefs = {
            "profile.default_content_setting_values.notifications": 2,
            "credentials_enable_service": False,
            "profile.password_manager_enabled": False
        }
        options.add_experimental_option("prefs", prefs)

        try:
            print("محاولة تثبيت ChromeDriver...")
            driver_path = ChromeDriverManager(cache_valid_range=30).install()
            service = Service(driver_path)
            driver = webdriver.Chrome(service=service, options=options)
            driver.maximize_window()
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            print("✓ تم تشغيل المتصفح بنجاح")
            return driver
        except Exception as e1:
            print(f"❌ الطريقة الأولى فشلت: {e1}")
            try:
                print("محاولة استخدام Chrome مباشرة...")
                driver = webdriver.Chrome(options=options)
                driver.maximize_window()
                driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                print("✓ تم تشغيل المتصفح بنجاح (الطريقة البديلة)")
                return driver
            except Exception as e2:
                print(f"❌ الطريقة الثانية فشلت: {e2}")
                print("\n💡 الحلول المقترحة:")
                print("1. تأكد من تثبيت Google Chrome")
                print("2. شغل: pip install --upgrade selenium webdriver-manager")
                print("3. احذف مجلد chrome_profile وحاول مرة أخرى")
                raise Exception(f"فشل تشغيل Chrome. الخطأ الأصلي: {e1}")

    def get_post_content(self):
        """الحصول على محتوى المنشور"""
        try:
            custom_content = self.db.query(models.BotConfig).filter(
                models.BotConfig.key == "CUSTOM_POST_CONTENT"
            ).first()
            if custom_content and custom_content.value and custom_content.value.strip():
                print("📝 استخدام المحتوى المخصص")
                return custom_content.value
            print("📝 استخدام المحتوى الافتراضي")
            return "مرحباً! هذا منشور من البوت الذكي 🤖"
        except Exception as e:
            print(f"⚠️ خطأ في الحصول على المحتوى: {e}")
            return "مرحباً! منشور تجريبي 🤖"

    def check_if_blocked(self):
        """التحقق من وجود رسالة حظر"""
        try:
            page_text = self.driver.find_element(By.TAG_NAME, "body").text.lower()
            block_keywords = [
                "محظور مؤقتاً", "أنت محظور", "تم حظرك",
                "temporarily blocked", "you're temporarily blocked",
                "blocked from", "you can't use this feature"
            ]
            for keyword in block_keywords:
                if keyword in page_text:
                    self.log_event("error", f"تم اكتشاف رسالة حظر: {keyword}")
                    return True
            return False
        except Exception:
            return False

    def scroll_to_posts(self):
        """التمرير للأسفل بشكل تدريجي"""
        for i in range(3):
            scroll_amount = 300 * (i + 1)
            self.driver.execute_script(f"window.scrollTo(0, {scroll_amount});")
            time.sleep(random.uniform(1.5, 3))
        self.driver.execute_script("window.scrollTo(0, 1200);")
        time.sleep(random.uniform(4, 6))

    def open_share_box_for_first_post(self):
        """ضغط زر (مشاركة) لأول منشور"""
        search_methods = [
            (By.XPATH, "//div[@role='button' and contains(., 'مشاركة')]"),
            (By.XPATH, "//span[contains(text(), 'مشاركة')]/ancestor::div[@role='button']"),
            (By.XPATH, "//div[@role='button' and contains(., 'Share')]"),
        ]
        share_buttons = []
        for by, xpath in search_methods:
            try:
                share_buttons = self.driver.find_elements(by, xpath)
                if share_buttons:
                    break
            except:
                continue
        if not share_buttons:
            return False
        try:
            time.sleep(random.uniform(1, 2))
            self.driver.execute_script("arguments[0].click();", share_buttons[0])
            time.sleep(random.uniform(2, 4))
            return True
        except:
            return False

    def select_share_to_group(self):
        """اختيار 'مشاركة في مجموعة'"""
        wait = WebDriverWait(self.driver, 15)
        try:
            group_option = wait.until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//div[@role='menuitem' or @role='button']//span[contains(text(), 'مجموعة')]"
                ))
            )
            time.sleep(random.uniform(0.5, 1.5))
            group_option.click()
            time.sleep(random.uniform(2, 4))
            return True
        except:
            return False

    def search_and_open_group(self, group_name: str):
        """البحث عن مجموعة وفتحها"""
        wait = WebDriverWait(self.driver, 20)
        try:
            dialog = wait.until(
                EC.presence_of_element_located((
                    By.XPATH,
                    "//div[@role='dialog' and .//span[contains(text(),'مشاركة في مجموعة')]]"
                ))
            )

            try:
                search_input = dialog.find_element(
                    By.XPATH,
                    ".//input[@type='search' and @placeholder='بحث عن مجموعات']"
                )
            except NoSuchElementException:
                search_input = dialog.find_element(
                    By.XPATH,
                    ".//input[@type='search']"
                )

            self.driver.execute_script("arguments[0].focus();", search_input)
            search_input.click()
            time.sleep(random.uniform(0.3, 0.7))

            search_input.clear()
            time.sleep(random.uniform(0.2, 0.4))

            search_input.send_keys(group_name)
            time.sleep(random.uniform(0.3, 0.7))
            search_input.send_keys(Keys.ENTER)

            time.sleep(random.uniform(2, 3))

            group_result = wait.until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    f".//span[normalize-space()='{group_name}']/ancestor::div[@role='button']"
                ))
            )
            time.sleep(random.uniform(0.5, 1))
            group_result.click()
            time.sleep(random.uniform(2, 4))
            return True
        except TimeoutException:
            return False
        except Exception:
            return False

    def post_to_group(self, group_name: str, cycle_number: int):
        """النشر في مجموعة واحدة"""
        start_time = time.time()

        try:
            page_url = self.config.get('page_url')
            
            if not page_url:
                print("❌ خطأ: لم يتم تعيين page_url في الإعدادات")
                return self.save_post_result(
                    group_name, cycle_number, "failed",
                    "لم يتم تعيين رابط الصفحة", None, time.time() - start_time
                )
            
            print(f"🔗 الانتقال للرابط: {page_url}")
            self.driver.get(page_url)
            time.sleep(random.uniform(6, 10))

            if self.check_if_blocked():
                return self.save_post_result(group_name, cycle_number, "failed", "تم اكتشاف حظر", None, time.time() - start_time)

            self.scroll_to_posts()

            if not self.open_share_box_for_first_post():
                return self.save_post_result(group_name, cycle_number, "failed", "لم أستطع فتح زر المشاركة", None, time.time() - start_time)

            if not self.select_share_to_group():
                return self.save_post_result(group_name, cycle_number, "failed", "لم أستطع اختيار خيار المجموعة", None, time.time() - start_time)

            if not self.search_and_open_group(group_name):
                return self.save_post_result(group_name, cycle_number, "skipped", "المجموعة غير موجودة", None, time.time() - start_time)

            post_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//div[@role='button' and .//span[contains(text(),'نشر')]]"
                ))
            )
            time.sleep(random.uniform(1, 2))
            post_button.click()

            time.sleep(random.uniform(3, 5))

            post_url = None
            try:
                time.sleep(2)
                post_url = self.driver.current_url
                print(f"✅ تم الحصول على رابط المنشور: {post_url}")
            except Exception as e:
                print(f"⚠️ لم نستطع الحصول على رابط المنشور: {e}")
                post_url = page_url

            duration = time.time() - start_time

            return self.save_post_result(group_name, cycle_number, "success", None, post_url, duration)

        except Exception as e:
            duration = time.time() - start_time
            return self.save_post_result(group_name, cycle_number, "failed", str(e), None, duration)

    def save_post_result(self, group_name: str, cycle_number: int, status: str, error: str, url: str, duration: float):
        """حفظ نتيجة المنشور في قاعدة البيانات"""
        try:
            group = self.db.query(models.FacebookGroup).filter(models.FacebookGroup.name == group_name).first()
            if group:
                post = models.Post(
                    group_id=group.id,
                    status=status,
                    error_message=error,
                    post_url=url,
                    cycle_number=cycle_number,
                    duration_seconds=duration
                )
                self.db.add(post)
                if status == "success":
                    group.success_count += 1
                    group.last_post_at = datetime.utcnow()
                elif status == "failed":
                    group.failure_count += 1
                self.db.commit()
            return True
        except Exception as e:
            print(f"خطأ في حفظ النتيجة: {e}")
            self.db.rollback()
            return False

    def log_event(self, level: str, message: str, details: str = None):
        """تسجيل حدث في قاعدة البيانات"""
        try:
            log = models.BotLog(
                level=level,
                message=message,
                details=details
            )
            self.db.add(log)
            self.db.commit()
        except:
            self.db.rollback()

    def run_cycle(self):
        """تشغيل دورة نشر واحدة"""
        self.cycle_counter += 1
        print(f"\n{'='*70}")
        print(f"🔄 بدء الدورة رقم {self.cycle_counter}")
        print(f"{'='*70}")
        self.log_event("info", f"بدء الدورة رقم {self.cycle_counter}")

        groups = self.db.query(models.FacebookGroup).filter(models.FacebookGroup.is_active == True).all()
        if not groups:
            print("⚠️ لا توجد مجموعات نشط