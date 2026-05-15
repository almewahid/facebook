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
from datetime import datetime, timedelta
import os
import logging
import pyautogui
import pyperclip
from urllib.parse import quote, urlsplit, urlunsplit

from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
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
        self.safety_paused = False
        self.posts_since_rest = 0
        self.next_rest_after = None

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
                "محظور مؤقتاً", "أنت محظور", "تم حظرك", "تم تقييد", "قيدنا",
                "نشاط مريب", "تأكيد هويتك", "انتهاك معايير المجتمع",
                "temporarily blocked", "you're temporarily blocked",
                "blocked from", "you can't use this feature",
                "account restricted", "confirm your identity", "suspicious activity",
                "community standards", "we limit how often", "try again later"
            ]
            for keyword in block_keywords:
                if keyword in page_text:
                    self.log_event("error", f"تم اكتشاف رسالة حظر: {keyword}")
                    self._trigger_safety_pause(f"رسالة فيسبوك خطرة: {keyword}")
                    return True
            return False
        except Exception:
            return False

    def _get_config_value(self, key: str, default=None):
        try:
            saved = self.db.query(models.BotConfig).filter(models.BotConfig.key == key).first()
            if saved and saved.value not in (None, ""):
                return saved.value
        except Exception:
            self.db.rollback()
        return self.config.get(key.lower(), default)

    def _get_config_int(self, key: str, default: int):
        try:
            return int(self._get_config_value(key, default))
        except (TypeError, ValueError):
            return default

    def _get_config_bool(self, key: str, default: bool = True):
        value = self._get_config_value(key, str(default).lower())
        return str(value).strip().lower() in ("1", "true", "yes", "on", "نعم")

    def _set_config_value(self, key: str, value: str):
        try:
            saved = self.db.query(models.BotConfig).filter(models.BotConfig.key == key).first()
            if saved:
                saved.value = value
            else:
                self.db.add(models.BotConfig(key=key, value=value))
            self.db.commit()
        except Exception:
            self.db.rollback()

    def _count_successful_posts_today(self):
        start_of_day = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        try:
            return self.db.query(models.Post).filter(
                models.Post.status == "success",
                models.Post.posted_at >= start_of_day
            ).count()
        except Exception:
            self.db.rollback()
            return 0

    def _trigger_safety_pause(self, reason: str):
        self.safety_paused = True
        self._set_config_value("SAFETY_PAUSED", "true")
        self._set_config_value("SAFETY_PAUSE_REASON", reason)
        self.log_event(
            "error",
            "تم إيقاف النشر تلقائياً لحماية الحساب",
            reason
        )

    def should_stop_for_safety(self):
        if self.safety_paused:
            return True
        return self._get_config_bool("SAFETY_PAUSED", False)

    def safety_gate(self, group_name: str = None, ignore_daily_limit: bool = False):
        if self.should_stop_for_safety():
            return "النشر متوقف لحماية الحساب"

        daily_limit = self._get_config_int("SAFETY_DAILY_POST_LIMIT", 10)
        if not ignore_daily_limit and daily_limit > 0 and self._count_successful_posts_today() >= daily_limit:
            reason = f"تم الوصول للحد اليومي الآمن ({daily_limit} منشور)"
            self._trigger_safety_pause(reason)
            return reason

        if self.driver and self._get_config_bool("SAFETY_STOP_ON_FACEBOOK_WARNING", True):
            if self.check_if_blocked():
                return "تم اكتشاف تحذير أو تقييد من فيسبوك"

        return None

    def apply_safe_delay(self, requested_seconds: int = 0):
        min_safe_minutes = self._get_config_int("SAFETY_MIN_DELAY_MINUTES", 1)
        min_safe_seconds = self._get_config_int("SAFETY_MIN_DELAY_SECONDS", min_safe_minutes * 60)
        jitter = random.randint(30, 120)
        wait_time = max(int(requested_seconds or 0), min_safe_seconds) + jitter
        print(f"⏳ انتظار آمن {wait_time} ثانية...")
        time.sleep(wait_time)

    def _set_next_rest_threshold(self):
        min_posts = self._get_config_int("SAFETY_REST_AFTER_MIN_POSTS", 8)
        max_posts = self._get_config_int("SAFETY_REST_AFTER_MAX_POSTS", 12)
        if max_posts < min_posts:
            max_posts = min_posts
        self.next_rest_after = random.randint(max(1, min_posts), max(1, max_posts))

    def _rest_after_successful_post_if_needed(self):
        self.posts_since_rest += 1
        if self.next_rest_after is None:
            self._set_next_rest_threshold()

        if self.posts_since_rest < self.next_rest_after:
            return

        min_minutes = self._get_config_int("SAFETY_REST_MIN_MINUTES", 1)
        max_minutes = self._get_config_int("SAFETY_REST_MAX_MINUTES", 3)
        if max_minutes < min_minutes:
            max_minutes = min_minutes

        rest_seconds = random.randint(max(1, min_minutes), max(1, max_minutes)) * 60
        self.log_event(
            "info",
            "راحة تلقائية لتخفيف السلوك الآلي",
            f"posts_since_rest={self.posts_since_rest} | rest_seconds={rest_seconds}"
        )
        print(f"☕ راحة تلقائية {rest_seconds // 60} دقيقة لتخفيف السلوك الآلي...")
        time.sleep(rest_seconds)
        self.posts_since_rest = 0
        self._set_next_rest_threshold()

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

    def _normalize_facebook_group_url(self, url: str):
        if not url or not url.strip().startswith("http"):
            return None
        try:
            parts = urlsplit(url.strip())
            safe_path = quote(parts.path, safe="/")
            return urlunsplit((parts.scheme, parts.netloc, safe_path, parts.query, parts.fragment))
        except Exception:
            return url.strip()

    def _find_and_save_group_url(self, group):
        if not group or not group.name:
            return None

        search_url = f"https://www.facebook.com/search/groups/?q={quote(group.name)}"
        print(f"🔎 لا يوجد رابط محفوظ. البحث عن المجموعة في فيسبوك: {group.name}")

        try:
            self.driver.get(search_url)
            time.sleep(random.uniform(5, 8))

            if self.check_if_blocked():
                return None

            anchors = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/groups/')]")
            for anchor in anchors:
                try:
                    text = (anchor.text or "").strip()
                    href = anchor.get_attribute("href")
                    if not href or "/groups/" not in href:
                        continue
                    if group.name in text or text in group.name:
                        group_url = self._normalize_facebook_group_url(href.split("?")[0])
                        if group_url:
                            group.url = group_url
                            self.db.commit()
                            self.log_event(
                                "info",
                                f"تم العثور على رابط المجموعة وحفظه: {group.name}",
                                group_url
                            )
                            return group_url
                except Exception:
                    continue
        except Exception as e:
            self.db.rollback()
            self.log_event(
                "warning",
                f"تعذر البحث عن رابط المجموعة: {group.name}",
                str(e)
            )

        return None

    def _normalize_page_url(self):
        page_url = (
            self.config.get('page_url')
            or os.getenv('PAGE_URL')
            or 'https://web.facebook.com'
        ).strip()
        if not page_url.startswith(("http://", "https://")):
            page_url = f"https://{page_url}"
        return page_url

    def _resolve_group_name(self, group_identifier: str):
        if not group_identifier:
            return group_identifier

        value = group_identifier.strip()
        if '/groups/' not in value:
            return value

        normalized = value.rstrip('/')
        slug = normalized.split('/')[-1]
        group = self.db.query(models.Group).filter(
            (models.Group.url == value) |
            (models.Group.url == normalized) |
            (models.Group.url.contains(slug))
        ).first()

        return group.name if group else slug

    def _page_has_transient_error(self):
        try:
            body_text = self.driver.find_element(By.TAG_NAME, "body").text
            error_markers = [
                "شيء ما لا يعمل",
                "مشكلة فنية",
                "Something isn't working",
                "technical problem",
            ]
            return any(marker in body_text for marker in error_markers)
        except Exception:
            return False

    def _dismiss_transient_error(self):
        try:
            close_buttons = self.driver.find_elements(
                By.XPATH,
                "//div[contains(., 'شيء ما لا يعمل') or contains(., \"Something isn't working\")]"
                "/ancestor::div[@role='alert' or @aria-live][1]//div[@role='button']"
            )
            if close_buttons:
                self.driver.execute_script("arguments[0].click();", close_buttons[0])
                time.sleep(random.uniform(0.8, 1.5))
                return
        except Exception:
            pass

        try:
            self.driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
            time.sleep(random.uniform(0.8, 1.5))
        except Exception:
            pass

    def _share_surface_is_open(self):
        try:
            return bool(self.driver.find_elements(
                By.XPATH,
                "//div[@role='dialog']"
                " | //div[@role='menu']"
                " | //div[@role='menuitem']//span[contains(text(), 'مجموعة')]"
                " | //span[contains(text(), 'Group')]/ancestor::div[@role='button' or @role='menuitem']"
            ))
        except Exception:
            return False

    def _visible_element_key(self, element):
        try:
            rect = self.driver.execute_script(
                """
                const r = arguments[0].getBoundingClientRect();
                return {
                    x: Math.round(r.x),
                    y: Math.round(r.y),
                    width: Math.round(r.width),
                    height: Math.round(r.height),
                    visible: r.width > 0 && r.height > 0 &&
                             r.bottom > 120 && r.top < window.innerHeight - 20
                };
                """,
                element,
            )
            if not rect or not rect.get("visible"):
                return None
            return (rect["x"], rect["y"], rect["width"], rect["height"])
        except Exception:
            return None

    def _click_element(self, element):
        self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        time.sleep(random.uniform(0.5, 1))
        try:
            ActionChains(self.driver).move_to_element(element).pause(0.2).click().perform()
        except Exception:
            self.driver.execute_script("arguments[0].click();", element)

    # ──────────────────────────────────────────
    # 3. خطوات المشاركة (الطريقة الأولى)
    # ──────────────────────────────────────────
    def open_share_box_for_first_post(self):
        search_methods = [
            (By.XPATH, "//div[@role='article']//div[@role='button'][.//span[normalize-space()='مشاركة']]"),
            (By.XPATH, "//div[@role='article']//div[@role='button'][.//span[normalize-space()='Share']]"),
            (By.XPATH, "//div[@role='article']//div[@role='button'][contains(@aria-label, 'مشاركة')]"),
            (By.XPATH, "//div[@role='article']//div[@role='button'][contains(@aria-label, 'Share')]"),
            (By.XPATH, "//span[normalize-space()='مشاركة']/ancestor::div[@role='button'][1]"),
            (By.XPATH, "//span[normalize-space()='Share']/ancestor::div[@role='button'][1]"),
        ]
        tried_positions = set()

        for scroll_round in range(4):
            share_buttons = []
            for by, xpath in search_methods:
                try:
                    for btn in self.driver.find_elements(by, xpath):
                        if not (btn.is_displayed() and btn.is_enabled()):
                            continue
                        button_key = self._visible_element_key(btn)
                        if not button_key:
                            continue
                        if button_key not in tried_positions:
                            share_buttons.append((button_key, btn))
                except Exception:
                    continue

            if not share_buttons:
                self.driver.execute_script("window.scrollBy(0, 650);")
                time.sleep(random.uniform(2, 3))
                continue

            for button_key, share_button in share_buttons[:4]:
                tried_positions.add(button_key)
                try:
                    time.sleep(random.uniform(1, 2))
                    self._click_element(share_button)
                    time.sleep(random.uniform(2, 4))

                    if self._share_surface_is_open():
                        return True

                    if self._page_has_transient_error():
                        self._dismiss_transient_error()
                        continue

                    self._dismiss_transient_error()
                except Exception:
                    self._dismiss_transient_error()
                    continue

            self.driver.execute_script("window.scrollBy(0, 650);")
            time.sleep(random.uniform(2, 3))

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
        group_name = self._resolve_group_name(group_identifier)

        try:
            safety_reason = self.safety_gate(group_name)
            if safety_reason:
                return self.save_post_result(
                    group_name, cycle_number, "skipped",
                    safety_reason, None, time.time() - start_time
                )

            page_url = self._normalize_page_url()
            for attempt in range(2):
                self.driver.get(page_url)
                time.sleep(random.uniform(5, 8))

                if self._page_has_transient_error():
                    self.driver.refresh()
                    time.sleep(random.uniform(4, 6))

                if self.check_if_blocked():
                    return self.save_post_result(group_name, cycle_number, "failed", "تم اكتشاف حظر", None, time.time() - start_time)

                self.scroll_to_posts()

                if self.open_share_box_for_first_post():
                    break

                if attempt == 1:
                    self.log_event(
                        "error",
                        "فشل فتح نافذة مشاركة صالحة من صفحة فيسبوك",
                        f"page_url={page_url}"
                    )
                    return self.save_post_result(group_name, cycle_number, "failed", "زر المشاركة مفقود أو ظهرت مشكلة في فيسبوك", None, time.time() - start_time)

                self.driver.refresh()
                time.sleep(random.uniform(4, 6))

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

            safety_reason = self.safety_gate(group_name)
            if safety_reason:
                return self.save_post_result(
                    group_name, cycle_number, "skipped",
                    safety_reason, None, time.time() - start_time
                )

            post_button.click()
            time.sleep(random.uniform(4, 6))

            if self.check_if_blocked():
                return self.save_post_result(
                    group_name, cycle_number, "failed",
                    "تم اكتشاف تحذير من فيسبوك بعد محاولة النشر",
                    None, time.time() - start_time
                )

            post_url = self.driver.current_url
            print(f"✅ تم النشر بنجاح في: {group_name}")
            saved_post = self.save_post_result(group_name, cycle_number, "success", None, post_url, time.time() - start_time)
            if saved_post:
                self._rest_after_successful_post_if_needed()
            return saved_post

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
            if self.should_stop_for_safety():
                print("🛑 تم إيقاف الدورة لحماية الحساب")
                break

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
                self.apply_safe_delay(wait_time)

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
    def post_new_content_to_group(self, group_name: str, text: str, publish_post_id: int = 0, image_path: str = None, ignore_daily_limit: bool = False):
        """ينشر محتوى جديد مباشرة في صفحة المجموعة"""
        start_time = time.time()

        safety_reason = self.safety_gate(group_name, ignore_daily_limit=ignore_daily_limit)
        if safety_reason:
            return self.save_post_result(
                group_name,
                publish_post_id,
                "skipped",
                safety_reason,
                None,
                time.time() - start_time,
                text=text
            )
        
        # التأكد من أن المتصفح يعمل ولم يتم إغلاقه
        try:
            if not self.driver or not self.driver.current_window_handle:
                print("🔄 المتصفح مغلق أو غير موجود. جاري إعادة التشغيل...")
                self.driver = None
                self.start()
        except Exception:
            print("🔄 استثناء عند فحص المتصفح. جاري إعادة التشغيل...")
            self.driver = None
            self.start()

        try:
            group = self._find_group_in_db(group_name)

            if not group:
                print(f"❌ المجموعة غير موجودة في DB: {group_name}")
                return None

            group_url = self._normalize_facebook_group_url(group.url) or self._find_and_save_group_url(group)
            if not group_url:
                print(f"❌ لا يوجد رابط صحيح محفوظ للمجموعة: {group_name}")
                return self.save_post_result(
                    group_name,
                    publish_post_id,
                    "failed",
                    "رابط المجموعة غير محفوظ ولم يتم العثور عليه في بحث فيسبوك",
                    None,
                    time.time() - start_time,
                    text=text
                )

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
            # ── إدخال النص باحترافية (دعم العربية والإيموجي) ──
            print(f"✍️ جاري كتابة النص المحلل...")
            try:
                # المحاولة الأولى: استخدام الحافظة (الأكثر أماناً للعربية والإيموجي)
                import pyperclip
                pyperclip.copy(text)
                text_area.send_keys(Keys.CONTROL, 'v')
                time.sleep(random.uniform(0.8, 1.5))
                print("✅ تم لصق النص بنجاح عبر الحافظة")
            except Exception as clipboard_err:
                print(f"⚠️ فشل الحافظة، جاري المحاولة عبر JavaScript: {clipboard_err}")
                try:
                    # المحاولة الثانية: حقن النص مباشرة عبر المتصفح (JavaScript)
                    import urllib.parse
                    safe_encoded_text = urllib.parse.quote(text)
                    self.driver.execute_script(
                        "arguments[0].focus(); document.execCommand('insertText', false, decodeURIComponent(arguments[1]));",
                        text_area, safe_encoded_text
                    )
                    print("✅ تم إدخال النص عبر JavaScript")
                except Exception as js_err:
                    # المحاولة الأخيرة: الكتابة اليدوية (للنصوص البسيطة فقط)
                    print(f"⚠️ فشل JavaScript، جاري الكتابة اليدوية: {js_err}")
                    safe_text = ''.join(c for c in text if ord(c) <= 0xFFFF)
                    for char in safe_text:
                        text_area.send_keys(char)
                        time.sleep(random.uniform(0.05, 0.1))

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

                safety_reason = self.safety_gate(group_name, ignore_daily_limit=ignore_daily_limit)
                if safety_reason:
                    return self.save_post_result(
                        group_name,
                        publish_post_id,
                        "skipped",
                        safety_reason,
                        None,
                        time.time() - start_time,
                        text=text
                    )

                self.driver.execute_script("arguments[0].click();", post_button)

                print("🚀 تم الضغط على زر النشر...")
                time.sleep(8)

                if self.check_if_blocked():
                    return self.save_post_result(
                        group_name,
                        publish_post_id,
                        "failed",
                        "تم اكتشاف تحذير من فيسبوك بعد محاولة النشر",
                        None,
                        time.time() - start_time,
                        text=text
                    )
                
                # التحقق من حالة المنشور (نجاح أم قيد الانتظار)
                is_pending = False
                try:
                    page_text = self.driver.page_source.lower()
                    if "قيد الانتظار" in page_text or "موافقة" in page_text or "pending" in page_text or "انتظار" in page_text:
                        is_pending = True
                except Exception:
                    pass

                post_url = None
                try:
                    post_url = self.driver.current_url
                except Exception:
                    pass

                if is_pending:
                    print("✅ منشورك قيد الانتظار لموافقة المسؤول (يعد نجاحاً)")
                    saved_post = self.save_post_result(
                        group_name,
                        publish_post_id,
                        "success",
                        "منشورك في الانتظار",
                        post_url,
                        time.time() - start_time,
                        text=text
                    )
                    if saved_post:
                        self._rest_after_successful_post_if_needed()
                    return saved_post
                else:
                    print("🚀 تم النشر بنجاح")
                    saved_post = self.save_post_result(
                        group_name,
                        publish_post_id,
                        "success",
                        None,
                        post_url,
                        time.time() - start_time,
                        text=text
                    )
                    if saved_post:
                        self._rest_after_successful_post_if_needed()
                    return saved_post

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
