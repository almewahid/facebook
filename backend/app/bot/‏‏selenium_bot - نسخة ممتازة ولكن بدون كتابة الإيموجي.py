"""
البوت المحسّن للنشر في مجموعات فيسبوك - النسخة النهائية
- البحث داخل نافذة المشاركة المنبثقة بدقة
- مسار البيانات: C:\bot_chrome_data
- حماية من اكتشاف الأتمتة
"""

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
import time
import random
from datetime import datetime
import os
import logging
import pyautogui
import pyperclip

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

logger = logging.getLogger(__name__)


class FacebookBot:
    """بوت النشر في فيسبوك"""

    def __init__(self, config: dict):
        self.config = config
        self.driver = None
        self.cycle_counter = 0
        self.db = SessionLocal()

    def __del__(self):
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
        if self.db:
            try:
                self.db.close()
            except Exception:
                pass

    def start(self):
        """تشغيل متصفح البوت وتجهيز الجلسة."""
        try:
            if self.driver:
                return True

            self.driver = self.create_driver()
            self.driver.get(self.config.get('page_url', 'https://web.facebook.com'))
            time.sleep(random.uniform(3, 5))
            self.log_event("info", "تم تشغيل متصفح البوت")
            return True
        except Exception as e:
            self.driver = None
            self.log_event("error", "فشل تشغيل متصفح البوت", str(e))
            print(f"❌ فشل تشغيل متصفح البوت: {e}")
            return False

    def stop(self):
        """إيقاف متصفح البوت بأمان."""
        try:
            if self.driver:
                self.driver.quit()
                self.driver = None
            self.log_event("info", "تم إيقاف متصفح البوت")
            return True
        except Exception as e:
            self.log_event("error", "فشل إيقاف متصفح البوت", str(e))
            print(f"❌ فشل إيقاف متصفح البوت: {e}")
            return False

    # ──────────────────────────────────────────
    # 1. إنشاء المتصفح
    # ──────────────────────────────────────────
    def create_driver(self):
        """إنشاء driver متوافق مع Chrome"""
        print("إعداد خيارات المتصفح...")
        options = Options()

        chrome_profile_folder = (
            self.config.get('chrome_profile_folder')
            or os.getenv('CHROME_PROFILE_FOLDER')
            or "Default"
        )
        custom_user_data_path = r'C:\bot_chrome_data'

        if not os.path.exists(custom_user_data_path):
            os.makedirs(custom_user_data_path, exist_ok=True)

        print(f"✅ مسار البيانات: {custom_user_data_path}")
        print(f"✅ البروفايل: {chrome_profile_folder}")

        options.add_argument(f"--user-data-dir={custom_user_data_path}")
        options.add_argument(f"--profile-directory={chrome_profile_folder}")

        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-extensions")
        options.add_argument("--remote-debugging-port=9222")
        options.add_argument("--log-level=3")

        prefs = {
            "profile.default_content_setting_values.notifications": 2,
            "credentials_enable_service": False,
            "profile.password_manager_enabled": False
        }
        options.add_experimental_option("prefs", prefs)

        try:
            service = Service(ChromeDriverManager().install())
            driver = webdriver.Chrome(service=service, options=options)
            driver.maximize_window()
            driver.execute_script(
                "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
            )
            print("✓ تم تشغيل المتصفح بنجاح")
            return driver
        except Exception as e1:
            print(f"✗ الطريقة الأولى فشلت: {e1}")
            try:
                driver = webdriver.Chrome(options=options)
                driver.maximize_window()
                driver.execute_script(
                    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
                )
                print("✓ تم تشغيل المتصفح (الطريقة البديلة)")
                return driver
            except Exception as e2:
                print(f"✗ الطريقة الثانية فشلت: {e2}")
                raise Exception(f"فشل تشغيل Chrome. الخطأ: {e1}")

    # ──────────────────────────────────────────
    # 2. دوال مساعدة
    # ──────────────────────────────────────────
    def get_post_content(self):
        try:
            custom_content = self.db.query(models.BotConfig).filter(
                models.BotConfig.key == "CUSTOM_POST_CONTENT"
            ).first()
            if custom_content and custom_content.value and custom_content.value.strip():
                return custom_content.value
            return "مرحباً! هذا منشور من البوت الذكي 🤖"
        except Exception:
            return "مرحباً! منشور تجريبي 🤖"

    def check_if_blocked(self):
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
        for i in range(3):
            self.driver.execute_script(f"window.scrollTo(0, {300 * (i + 1)});")
            time.sleep(random.uniform(1.5, 3))
        self.driver.execute_script("window.scrollTo(0, 1200);")
        time.sleep(random.uniform(4, 6))

    def log_event(self, level: str, message: str, details: str = None):
        try:
            log = models.BotLog(level=level, message=message, details=details)
            self.db.add(log)
            self.db.commit()
        except Exception:
            self.db.rollback()

    def _find_group_in_db(self, group_name: str):
        """
        يبحث أولاً بالاسم، وإن لم يجد يبحث بالـ URL كـ fallback.
        """
        group = self.db.query(models.Group).filter(
            models.Group.name == group_name
        ).first()

        if not group:
            group = self.db.query(models.Group).filter(
                models.Group.url.contains(group_name)
            ).first()
            if group:
                print(f"⚠️ وُجدت المجموعة عبر URL بدلاً من الاسم: {group_name}")

        return group

    # ──────────────────────────────────────────
    # 3. خطوات المشاركة (الطريقة الأولى)
    # ──────────────────────────────────────────
    def open_share_box_for_first_post(self):
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
            except Exception:
                continue
        if not share_buttons:
            return False
        try:
            time.sleep(random.uniform(1, 2))
            self.driver.execute_script("arguments[0].click();", share_buttons[0])
            time.sleep(random.uniform(2, 4))
            return True
        except Exception:
            return False

    def select_share_to_group(self):
        wait = WebDriverWait(self.driver, 15)
        try:
            group_option = wait.until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//div[@role='menuitem' or @role='button']//span[contains(text(), 'مجموعة')]"
                    " | //span[contains(text(), 'Group')]/ancestor::div[@role='button' or @role='menuitem']"
                ))
            )
            time.sleep(random.uniform(0.5, 1.5))
            group_option.click()
            time.sleep(random.uniform(2, 4))
            return True
        except Exception:
            return False

    def search_and_open_group(self, group_name: str):
        wait = WebDriverWait(self.driver, 20)
        try:
            print(f"🔍 البحث عن المجموعة: {group_name}")
            wait.until(EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']")))
            print("✅ نافذة المشاركة موجودة")
            time.sleep(1)

            search_xpaths = [
                "//div[@role='dialog']//input[contains(@placeholder, 'بحث عن مجموعات')]",
                "//div[@role='dialog']//input[contains(@aria-label, 'بحث عن مجموعات')]",
                "//div[@role='dialog']//input[@type='search']",
                "//div[@role='dialog']//input[contains(@placeholder, 'بحث')]",
                "//div[@role='dialog']//input",
            ]

            search_input = None
            for xpath in search_xpaths:
                try:
                    search_input = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                    if search_input:
                        print(f"✅ حقل البحث: {xpath}")
                        break
                except TimeoutException:
                    continue

            if not search_input:
                print("❌ لم يتم العثور على حقل البحث!")
                return False

            search_input.click()
            time.sleep(0.5)
            search_input.send_keys(Keys.CONTROL + "a")
            search_input.send_keys(Keys.BACKSPACE)
            time.sleep(0.3)

            for char in group_name:
                search_input.send_keys(char)
                time.sleep(random.uniform(0.08, 0.18))

            time.sleep(random.uniform(2, 4))

            result_xpaths = [
                f"//div[@role='dialog']//span[normalize-space()='{group_name}']",
                f"//div[@role='dialog']//span[contains(text(), '{group_name}')]/ancestor::div[@role='button']",
                f"//div[@role='dialog']//div[@role='button'][.//span[contains(text(), '{group_name}')]]",
            ]

            group_result = None
            for xpath in result_xpaths:
                try:
                    group_result = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                    if group_result:
                        print(f"✅ تم العثور على المجموعة: {xpath}")
                        break
                except TimeoutException:
                    continue

            if not group_result:
                print(f"❌ المجموعة غير موجودة في النتائج: {group_name}")
                return False

            time.sleep(random.uniform(0.5, 1))
            try:
                group_result.click()
            except Exception:
                self.driver.execute_script("arguments[0].click();", group_result)

            print(f"✅ تم اختيار المجموعة: {group_name}")
            time.sleep(random.uniform(2, 4))
            return True

        except Exception as e:
            print(f"❌ خطأ في البحث عن المجموعة: {e}")
            return False

    # ──────────────────────────────────────────
    # 4. دالة النشر الرئيسية (الطريقة الأولى)
    # ──────────────────────────────────────────
    def post_to_group(self, group_identifier: str, cycle_number: int):
        start_time = time.time()
        if '/groups/' in group_identifier:
            group_name = group_identifier.rstrip('/').split('/')[-1]
        else:
            group_name = group_identifier

        try:
            self.driver.get(self.config['page_url'])
            time.sleep(random.uniform(5, 8))

            if self.check_if_blocked():
                return self.save_post_result(group_name, cycle_number, "failed", "تم اكتشاف حظر", None, time.time() - start_time)

            self.scroll_to_posts()

            if not self.open_share_box_for_first_post():
                return self.save_post_result(group_name, cycle_number, "failed", "زر المشاركة مفقود", None, time.time() - start_time)

            if not self.select_share_to_group():
                return self.save_post_result(group_name, cycle_number, "failed", "خيار المجموعة مفقود", None, time.time() - start_time)

            if not self.search_and_open_group(group_name):
                return self.save_post_result(group_name, cycle_number, "skipped", "المجموعة غير موجودة في البحث", None, time.time() - start_time)

            post_button = WebDriverWait(self.driver, 10).until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//div[@role='button']//span[text()='نشر' or text()='Post']"
                ))
            )
            time.sleep(random.uniform(1, 2))
            post_button.click()
            time.sleep(random.uniform(4, 6))

            post_url = self.driver.current_url
            print(f"✅ تم النشر بنجاح في: {group_name}")
            return self.save_post_result(group_name, cycle_number, "success", None, post_url, time.time() - start_time)

        except Exception as e:
            print(f"❌ خطأ في النشر: {e}")
            return self.save_post_result(group_name, cycle_number, "failed", str(e), None, time.time() - start_time)

    # ──────────────────────────────────────────
    # 5. دالة حفظ النتائج الموحدة
    # ──────────────────────────────────────────
    def save_post_result(self, group_name, cycle_number, status, error=None, url=None, duration=0, text=""):
        try:
            group = self._find_group_in_db(group_name)

            if group:
                scheduled_time = self.config.get('scheduled_time') or (datetime.now() if status == "success" else None)
                posted_at = datetime.now() if status == "success" else None

                new_post = models.Post(
                    group_id=group.id,
                    content=text,
                    status=status,
                    post_url=url,
                    cycle_number=cycle_number,
                    scheduled_time=scheduled_time,
                    posted_at=posted_at
                )
                self.db.add(new_post)

                if status != "success":
                    log = models.BotLog(
                        level="error" if status == "failed" else "warning",
                        message=f"النتيجة في {group_name}: {status}",
                        details=f"Error: {error} | Duration: {round(duration, 2)}s"
                    )
                    self.db.add(log)

                self.db.commit()
                self.db.refresh(new_post)

                print(f"💾 تم حفظ النتيجة في قاعدة البيانات: {status}")
                return new_post

            else:
                print(f"⚠️ لم يتم العثور على المجموعة '{group_name}' في قاعدة البيانات.")

        except Exception as e:
            print(f"❌ خطأ في دالة حفظ النتائج: {e}")
            self.db.rollback()

        return None

    # ──────────────────────────────────────────
    # 6. الدورة الكاملة
    # ──────────────────────────────────────────
    def run_cycle(self):
        self.cycle_counter += 1
        print(f"\n{'='*70}")
        print(f"🔄 بدء الدورة رقم {self.cycle_counter}")
        print(f"{'='*70}")
        self.log_event("info", f"بدء الدورة رقم {self.cycle_counter}")

        groups = self.db.query(models.Group).filter(models.Group.is_active == True).all()
        if not groups:
            print("⚠️ لا توجد مجموعات نشطة")
            return

        successful = 0
        failed = 0
        skipped = 0
        max_groups = self.config.get('max_groups_per_session', 7)

        for i, group in enumerate(groups[:max_groups], 1):
            print(f"\n[{i}/{min(len(groups), max_groups)}] النشر في: {group.name}")
            group_identifier = group.url if group.url else group.name

            saved_post = self.post_to_group(group_identifier, self.cycle_counter)

            if saved_post is not None:
                if saved_post.status == "success":
                    successful += 1
                    print("✅ نجح")
                elif saved_post.status == "skipped":
                    skipped += 1
                    print("⭕ تم التخطي")
                else:
                    failed += 1
                    print("❌ فشل")
            else:
                failed += 1
                print("❌ فشل (خطأ في الحفظ أو المجموعة غير موجودة في DB)")

            if i < min(len(groups), max_groups):
                wait_time = random.randint(
                    self.config.get('min_delay_between_groups', 60),
                    self.config.get('max_delay_between_groups', 120)
                )
                print(f"⏳ انتظار {wait_time} ثانية...")
                time.sleep(wait_time)

        print(f"\n{'='*70}")
        print(f"✅ انتهت الدورة رقم {self.cycle_counter}")
        print(f"📊 النتائج: ✅ {successful} | ❌ {failed} | ⭕ {skipped}")
        print(f"{'='*70}\n")
        self.log_event("info", f"انتهت الدورة {self.cycle_counter}",
                       f"نجح: {successful}, فشل: {failed}, تخطي: {skipped}")

    # ──────────────────────────────────────────
    # 7. إدارة الجلسة
    # ──────────────────────────────────────────
    def open_browser_for_login(self):
        try:
            if self.driver:
                try:
                    self.driver.quit()
                except Exception:
                    pass
                self.driver = None
            self.driver = self.create_driver()
            self.driver.get("https://www.facebook.com/login")
            print("✅ تم فتح المتصفح لتسجيل الدخول")
            return {"status": "success", "message": "تم فتح المتصفح - سجل دخولك الآن ثم اضغط حفظ الجلسة"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def close_login_browser(self):
        try:
            if self.driver:
                self.driver.quit()
                self.driver = None
            return {"status": "success", "message": "✅ تم حفظ الجلسة وإغلاق المتصفح"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # ──────────────────────────────────────────
    # 8. النشر المباشر بمحتوى جديد (الطريقة الثانية)
    # ──────────────────────────────────────────
    def post_new_content_to_group(self, group_name: str, text: str, publish_post_id: int = 0, image_path: str = None):
        """ينشر محتوى جديد مباشرة في صفحة المجموعة"""
        start_time = time.time()

        try:
            group = self._find_group_in_db(group_name)

            if not group:
                print(f"❌ المجموعة غير موجودة في DB: {group_name}")
                return None

            if group.url and group.url.startswith('http'):
                group_url = group.url
            else:
                group_url = f"https://www.facebook.com/groups/{group_name}"

            print(f"🌐 الذهاب لصفحة المجموعة: {group_url}")
            self.driver.get(group_url)
            time.sleep(random.uniform(4, 7))

            if self.check_if_blocked():
                return self.save_post_result(group_name, publish_post_id, "failed", "تم اكتشاف حظر", None, time.time() - start_time, text=text)

            # ── الضغط على خانة "اكتب شيئًا..." لفتح نافذة المنشور ──
            combined_xpath = (
                "//div[contains(@aria-label, 'اكتب شيئ')] | "
                "//div[@aria-label='اكتب شيئًا...'] | "
                "//div[contains(@aria-label, 'ما الذي تفكر')] | "
                "//div[@role='button'][contains(@aria-label, 'اكتب')] | "
                "//div[@role='button'][contains(., 'اكتب شيئ')]"
            )

            try:
                write_box = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.XPATH, combined_xpath))
                )
                print("✅ وجدت خانة الكتابة")
            except TimeoutException:
                print("❌ لم أجد خانة الكتابة")
                return self.save_post_result(group_name, publish_post_id, "failed", "خانة الكتابة غير موجودة", None, time.time() - start_time, text=text)

            self.driver.execute_script("arguments[0].click();", write_box)
            time.sleep(random.uniform(2, 3))

            # ── الكتابة في نافذة المنشور بعد فتحها ──
            text_area_xpaths = [
                "//div[@role='dialog']//div[@contenteditable='true']",
                "//div[contains(@aria-label, 'منشور')]//div[@contenteditable='true']",
                "//div[@aria-label='إنشاء منشور عام']//div[@contenteditable='true']",
            ]

            text_area = None
            for xpath in text_area_xpaths:
                try:
                    text_area = WebDriverWait(self.driver, 10).until(
                        EC.element_to_be_clickable((By.XPATH, xpath))
                    )
                    if text_area:
                        print(f"✅ وجدت خانة النص: {xpath}")
                        break
                except TimeoutException:
                    continue

            if not text_area:
                print("❌ لم أجد خانة النص")
                return self.save_post_result(group_name, publish_post_id, "failed", "خانة النص غير موجودة", None, time.time() - start_time, text=text)

            text_area.click()
            time.sleep(0.5)

            print(f"✍️ كتابة النص...")
            # استخدام الحافظة (clipboard) لدعم الإيموجي والأحرف خارج BMP
            try:
                import pyperclip
                pyperclip.copy(text)
                text_area.send_keys(Keys.CONTROL, 'v')
                time.sleep(random.uniform(0.5, 1))
                print("✅ تم لصق النص عبر الحافظة")
            except Exception as clipboard_err:
                print(f"⚠️ فشل اللصق عبر الحافظة ({clipboard_err}) - جرب JavaScript...")
                try:
                    # طريقة بديلة: JavaScript execCommand
                    self.driver.execute_script(
                        "arguments[0].focus(); document.execCommand('insertText', false, arguments[1]);",
                        text_area, text
                    )
                    print("✅ تم الإدخال عبر JavaScript")
                except Exception as js_err:
                    print(f"⚠️ فشل JavaScript ({js_err}) - كتابة حرف بحرف (بدون إيموجي)...")
                    safe_text = ''.join(c for c in text if ord(c) <= 0xFFFF)
                    for char in safe_text:
                        text_area.send_keys(char)
                        time.sleep(random.uniform(0.03, 0.08))

            time.sleep(random.uniform(1, 2))

            # ---------------------------
            # رفع الصورة - النسخة المصححة
            # ---------------------------
            if image_path and os.path.exists(image_path):
                try:
                    full_path = os.path.abspath(image_path)
                    print(f"⏳ بدء رفع الصورة: {full_path}")

                    # ── الخطوة 1: اضغط زر الصورة أولاً لإنشاء input حقيقي ──
                    photo_icon_xpaths = [
                        "//div[@role='dialog']//div[@aria-label='صورة/فيديو']",
                        "//div[@role='dialog']//div[@aria-label='Photo/video']",
                        "//div[@role='dialog']//div[contains(@aria-label,'صورة')][@role='button']",
                        "//div[@role='dialog']//div[contains(@aria-label,'photo')][@role='button']",
                    ]

                    clicked = False
                    for xpath in photo_icon_xpaths:
                        try:
                            btn = WebDriverWait(self.driver, 5).until(
                                EC.element_to_be_clickable((By.XPATH, xpath))
                            )
                            self.driver.execute_script("arguments[0].click();", btn)
                            clicked = True
                            print(f"✅ تم الضغط على زر الصورة: {xpath}")
                            time.sleep(random.uniform(2, 3))  # انتظر تهيئة الـ input
                            break
                        except Exception:
                            continue

                    if not clicked:
                        print("❌ لم يتم العثور على زر الصورة")
                        return self.save_post_result(
                            group_name, publish_post_id, "failed",
                            "زر الصورة غير موجود", None,
                            time.time() - start_time, text=text
                        )

                    # ── الخطوة 2: الآن ابحث عن input الحقيقي الذي أنشأه فيسبوك ──
                    try:
                        file_input = WebDriverWait(self.driver, 10).until(
                            EC.presence_of_element_located((
                                By.XPATH,
                                "//div[@role='dialog']//input[@type='file']"
                            ))
                        )
                        print("✅ تم العثور على input الملف")
                    except TimeoutException:
                        print("❌ لم يظهر input الملف بعد الضغط على زر الصورة")
                        return self.save_post_result(
                            group_name, publish_post_id, "failed",
                            "input الملف لم يظهر", None,
                            time.time() - start_time, text=text
                        )

                 
                    # ── الخطوة 3: أرسل المسار مع إغلاق أي نافذة ──
                    self.driver.execute_script("""
                        arguments[0].style.display = 'block';
                        arguments[0].style.visibility = 'visible';
                        arguments[0].style.opacity = '1';
                    """, file_input)

                    time.sleep(0.3)
                    file_input.send_keys(full_path)

                    # انتظر وتحقق من نافذة Open
                    time.sleep(1.5)
                    try:
                        import win32gui
                        import win32con
                        import pyautogui
                        hwnd = win32gui.FindWindow(None, "Open")
                        if hwnd:
                            print("🔄 نافذة Open مفتوحة - إرسال المسار إليها...")
                            pyautogui.hotkey('ctrl', 'a')
                            time.sleep(0.2)
                            pyperclip.copy(full_path)
                            pyautogui.hotkey('ctrl', 'v')
                            time.sleep(0.3)
                            pyautogui.press('enter')
                            time.sleep(0.5)
                            # تأكد من الإغلاق
                            hwnd2 = win32gui.FindWindow(None, "Open")
                            if hwnd2:
                                win32gui.PostMessage(hwnd2, win32con.WM_CLOSE, 0, 0)
                                print("✅ تم إغلاق نافذة Open")
                            print("✅ تم إرسال المسار لنافذة Open")
                    except Exception:
                        pass
                    # ── الخطوة 4: تأكيد ظهور المعاينة (الدليل الحقيقي على النجاح) ──
                    try:
                        print("⏳ انتظار ظهور معاينة الصورة...")
                        WebDriverWait(self.driver, 30).until(
                            EC.presence_of_element_located((
                                By.XPATH,
                                "//div[@role='dialog']//img[contains(@src,'blob:')] | "
                                "//div[@role='dialog']//div[contains(@aria-label,'إزالة')] | "
                                "//div[@role='dialog']//div[contains(@aria-label,'Remove')]"
                            ))
                        )
                        print("✅ ظهرت معاينة الصورة - الرفع نجح فعلاً")
                        time.sleep(random.uniform(2, 3))

                    except TimeoutException:
                        print("❌ لم تظهر معاينة الصورة - الصورة لم تُرفع فعلياً")
                        return self.save_post_result(
                            group_name, publish_post_id, "failed",
                            "الصورة لم تظهر في المعاينة", None,
                            time.time() - start_time, text=text
                        )

                except Exception as e:
                    print(f"❌ خطأ أثناء رفع الصورة: {e}")
                    return self.save_post_result(
                        group_name, publish_post_id, "failed",
                        str(e), None, time.time() - start_time, text=text
                    )

            # ---------------------------
            # النشر النهائي
            # ---------------------------
            try:
                print("⏳ البحث عن زر النشر...")

                post_btn_xpaths = [
                    "//div[@role='dialog']//div[@aria-label='نشر'][@role='button']",
                    "//div[@role='dialog']//div[@role='button']//span[text()='نشر']",
                    "//div[@aria-label='نشر'][@role='button']",
                    "//div[@role='button']//span[text()='Post']",
                ]

                post_button = None

                for xpath in post_btn_xpaths:
                    try:
                        post_button = WebDriverWait(self.driver, 20).until(
                            EC.element_to_be_clickable((By.XPATH, xpath))
                        )
                        if post_button:
                            print(f"✅ تم العثور على زر النشر: {xpath}")
                            break
                    except Exception:
                        continue

                if not post_button:
                    print("❌ زر النشر غير موجود")
                    return self.save_post_result(
                        group_name,
                        publish_post_id,
                        "failed",
                        "زر النشر غير موجود",
                        None,
                        time.time() - start_time,
                        text=text
                    )

                time.sleep(3)

                self.driver.execute_script("arguments[0].click();", post_button)

                print("🚀 تم النشر بنجاح")
                time.sleep(8)

                post_url = self.driver.current_url

                return self.save_post_result(
                    group_name,
                    publish_post_id,
                    "success",
                    None,
                    post_url,
                    time.time() - start_time,
                    text=text
                )

            except Exception as e:
                print(f"❌ خطأ أثناء النشر: {e}")
                return self.save_post_result(
                    group_name,
                    publish_post_id,
                    "failed",
                    str(e),
                    None,
                    time.time() - start_time,
                    text=text
                )

        except Exception as e:
            print(f"❌ خطأ عام في post_new_content_to_group: {e}")
            return self.save_post_result(
                group_name,
                publish_post_id,
                "failed",
                str(e),
                None,
                time.time() - start_time,
                text=text
            )