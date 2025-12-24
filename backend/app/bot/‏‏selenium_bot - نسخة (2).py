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
import logging

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
        
    def create_driver(self):
        """إنشاء driver متوافق مع Chrome"""
        print("إعداد خيارات المتصفح...")
        
        options = Options()
        
        # إنشاء بروفايل
        profile_path = os.path.join(os.getcwd(), "chrome_profile")
        if not os.path.exists(profile_path):
            os.makedirs(profile_path)
        
        options.add_argument(f'user-data-dir={profile_path}')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        # إضافة خيارات إضافية لحل مشكلة Windows
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
            # محاولة 1: استخدام webdriver-manager مع cache
            print("محاولة تثبيت ChromeDriver...")
            # استخدام cache لتجنب التحديث المتكرر
            driver_path = ChromeDriverManager(cache_valid_range=30).install()
            service = Service(driver_path)
            driver = webdriver.Chrome(service=service, options=options)
            driver.maximize_window()
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            print("✓ تم تشغيل المتصفح بنجاح")
            return driver
        except Exception as e1:
            print(f"✗ الطريقة الأولى فشلت: {e1}")
            
            # محاولة 2: استخدام Chrome مباشرة بدون service
            try:
                print("محاولة استخدام Chrome مباشرة...")
                driver = webdriver.Chrome(options=options)
                driver.maximize_window()
                driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
                print("✓ تم تشغيل المتصفح بنجاح (الطريقة البديلة)")
                return driver
            except Exception as e2:
                print(f"✗ الطريقة الثانية فشلت: {e2}")
                print("\n💡 الحلول المقترحة:")
                print("1. تأكد من تثبيت Google Chrome")
                print("2. شغل: pip install --upgrade selenium webdriver-manager")
                print("3. احذف مجلد chrome_profile وحاول مرة أخرى")
                raise Exception(f"فشل تشغيل Chrome. الخطأ الأصلي: {e1}")
    
    def get_post_content(self):
        """الحصول على محتوى المنشور"""
        try:
            # التحقق من وجود محتوى مخصص
            custom_content = self.db.query(models.BotConfig).filter(
                models.BotConfig.key == "CUSTOM_POST_CONTENT"
            ).first()
            
            if custom_content and custom_content.value and custom_content.value.strip():
                print("📝 استخدام المحتوى المخصص")
                return custom_content.value
            
            # محتوى افتراضي
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
        except Exception as e:
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
        print("🔍 البحث عن زر المشاركة...")
        
        # ✅ طرق أفضل للبحث عن زر المشاركة الصحيح
        search_xpaths = [
            # زر المشاركة في المنشور (الأكثر تحديداً)
            "//div[contains(@aria-label,'إرسال هذا إلى الأصدقاء') or contains(@aria-label,'مشاركة')]//div[@role='button']",
            "//div[@role='button' and @aria-label='إرسال هذا إلى الأصدقاء أو نشره في ملفك الشخصي']",
            # زر المشاركة العادي
            "//div[@role='button' and .//span[text()='مشاركة' or text()='Share']]",
            "//span[text()='مشاركة' or text()='Share']/parent::div[@role='button']",
            # آخر احتياطي
            "//div[@role='button' and contains(., 'مشاركة')]",
        ]
        
        share_button = None
        for xpath in search_xpaths:
            try:
                buttons = self.driver.find_elements(By.XPATH, xpath)
                if buttons:
                    # تأكد من أن الزر مرئي وقابل للنقر
                    for btn in buttons:
                        try:
                            if btn.is_displayed() and btn.is_enabled():
                                share_button = btn
                                print(f"✅ تم العثور على زر المشاركة: {xpath}")
                                break
                        except:
                            continue
                    if share_button:
                        break
            except:
                continue
        
        if not share_button:
            print("❌ لم يتم العثور على زر المشاركة!")
            return False
        
        # اضغط على الزر
        try:
            time.sleep(random.uniform(1, 2))
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", share_button)
            time.sleep(0.5)
            self.driver.execute_script("arguments[0].click();", share_button)
            print("✅ تم الضغط على زر المشاركة")
            time.sleep(random.uniform(2, 4))
            return True
        except Exception as e:
            print(f"❌ فشل الضغط على زر المشاركة: {e}")
            return False
    
    def select_share_to_group(self):
        """اختيار 'مشاركة في مجموعة'"""
        print("🔍 البحث عن خيار 'مشاركة في مجموعة'...")
        wait = WebDriverWait(self.driver, 15)
        
        # ✅ طرق أفضل للبحث
        group_xpaths = [
            "//div[@role='menuitem']//span[contains(text(), 'مشاركة في مجموعة')]",
            "//div[@role='menuitem']//span[text()='مشاركة في مجموعة']",
            "//span[contains(text(), 'مشاركة في مجموعة')]/ancestor::div[@role='menuitem']",
            "//div[@role='button']//span[contains(text(), 'مجموعة')]",
            "//span[text()='Share to a group']/ancestor::div[@role='menuitem']",
        ]
        
        group_option = None
        for xpath in group_xpaths:
            try:
                group_option = wait.until(
                    EC.element_to_be_clickable((By.XPATH, xpath))
                )
                if group_option:
                    print(f"✅ تم العثور على خيار المجموعة: {xpath}")
                    break
            except TimeoutException:
                continue
        
        if not group_option:
            print("❌ لم يتم العثور على خيار 'مشاركة في مجموعة'!")
            return False
        
        try:
            time.sleep(random.uniform(0.5, 1.5))
            group_option.click()
            print("✅ تم اختيار 'مشاركة في مجموعة'")
            time.sleep(random.uniform(2, 4))
            return True
        except Exception as e:
            print(f"❌ فشل الضغط: {e}")
            try:
                self.driver.execute_script("arguments[0].click();", group_option)
                print("✅ نجح بـ JavaScript")
                time.sleep(random.uniform(2, 4))
                return True
            except:
                return False
    
    def search_group_by_name(self, group_name: str) -> str:
        """
        البحث عن مجموعة بالاسم والحصول على رابطها
        
        Args:
            group_name: اسم المجموعة
            
        Returns:
            str: رابط المجموعة أو None
        """
        try:
            logger.info(f"🔍 البحث عن مجموعة: {group_name}")
            
            # اذهب لصفحة المجموعات
            self.driver.get("https://www.facebook.com/groups/feed/")
            time.sleep(3)
            
            # ابحث عن صندوق البحث
            search_box = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((
                    By.CSS_SELECTOR,
                    "input[type='search'], input[placeholder*='بحث']"
                ))
            )
            
            # اكتب اسم المجموعة
            search_box.clear()
            search_box.send_keys(group_name)
            time.sleep(2)
            
            # ابحث عن النتائج
            try:
                # ابحث عن أول نتيجة مطابقة
                group_link = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((
                        By.XPATH,
                        f"//a[contains(@href, '/groups/') and .//span[contains(text(), '{group_name}')]]"
                    ))
                )
                
                group_url = group_link.get_attribute('href')
                logger.info(f"✅ تم العثور على المجموعة: {group_url}")
                
                return group_url
                
            except TimeoutException:
                logger.warning(f"⚠️ لم يتم العثور على المجموعة: {group_name}")
                
                # حاول بطريقة أخرى - من قائمة مجموعاتك
                return self._search_in_my_groups(group_name)
                
        except Exception as e:
            logger.error(f"❌ خطأ في البحث عن المجموعة: {e}")
            return None
    
    def _search_in_my_groups(self, group_name: str) -> str:
        """البحث في قائمة مجموعاتك الشخصية"""
        try:
            logger.info("🔍 البحث في مجموعاتي...")
            
            # اذهب لصفحة مجموعاتي
            self.driver.get("https://www.facebook.com/groups/")
            time.sleep(3)
            
            # ابحث عن المجموعة في القائمة
            groups = self.driver.find_elements(
                By.XPATH,
                "//a[contains(@href, '/groups/')]"
            )
            
            for group in groups:
                try:
                    group_text = group.text
                    if group_name.lower() in group_text.lower():
                        group_url = group.get_attribute('href')
                        logger.info(f"✅ تم العثور في مجموعاتي: {group_url}")
                        return group_url
                except:
                    continue
            
            logger.warning(f"⚠️ المجموعة غير موجودة في قائمتي: {group_name}")
            return None
            
        except Exception as e:
            logger.error(f"❌ خطأ في البحث في مجموعاتي: {e}")
            return None
    def search_and_open_group(self, group_name: str):
        """البحث عن مجموعة وفتحها في نافذة المشاركة"""
        wait = WebDriverWait(self.driver, 20)
        
        try:
            print(f"🔍 البحث عن المجموعة: {group_name}")
            
            # ✅ انتظار نافذة المشاركة
            dialog = wait.until(
                EC.presence_of_element_located((
                    By.XPATH,
                    "//div[@role='dialog']"
                ))
            )
            print("✅ تم العثور على نافذة المشاركة")
            
            time.sleep(1)
            
            # ✅ البحث عن حقل البحث بطرق متعددة
            search_input = None
            search_xpaths = [
                ".//input[@type='search']",
                ".//input[@placeholder='بحث عن مجموعات']",
                ".//input[contains(@placeholder, 'بحث')]",
                ".//input[@aria-label='بحث عن مجموعات']",
                ".//input[contains(@aria-label, 'بحث')]",
                "//input[@type='search']",
                "//label[contains(., 'بحث')]/following-sibling::input",
                "//div[@role='dialog']//input"
            ]
            
            for xpath in search_xpaths:
                try:
                    search_input = dialog.find_element(By.XPATH, xpath)
                    if search_input:
                        print(f"✅ تم العثور على حقل البحث: {xpath}")
                        break
                except:
                    continue
            
            if not search_input:
                print("❌ لم يتم العثور على حقل البحث!")
                # طباعة HTML للتشخيص
                print("HTML of dialog:")
                print(dialog.get_attribute('innerHTML')[:500])
                return False
            
            # ✅ تنظيف وتفعيل الحقل بقوة
            print("🎯 التركيز على حقل البحث...")
            
            # طريقة 1: Scroll إلى الحقل
            try:
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", search_input)
                time.sleep(0.5)
            except:
                pass
            
            # طريقة 2: اضغط عدة مرات للتأكد
            for _ in range(3):
                try:
                    search_input.click()
                    time.sleep(0.3)
                except:
                    pass
            
            # طريقة 3: استخدم JavaScript للتركيز
            try:
                self.driver.execute_script("arguments[0].focus();", search_input)
                time.sleep(0.5)
            except:
                pass
            
            # طريقة 4: امسح أي محتوى
            try:
                search_input.clear()
                time.sleep(0.3)
            except:
                pass
            
            # طريقة 5: اضغط مرة أخرى
            try:
                search_input.click()
                time.sleep(0.5)
            except:
                pass
            
            # ✅ كتابة اسم المجموعة بطريقة مضمونة
            print(f"✍️ كتابة: {group_name}")
            
            # استخدم JavaScript للكتابة (أضمن طريقة)
            try:
                # امسح الحقل بـ JavaScript
                self.driver.execute_script("arguments[0].value = '';", search_input)
                time.sleep(0.3)
                
                # اكتب بـ JavaScript
                self.driver.execute_script(f"arguments[0].value = '{group_name}';", search_input)
                
                # أطلق حدث input لتفعيل البحث
                self.driver.execute_script("""
                    var event = new Event('input', { bubbles: true });
                    arguments[0].dispatchEvent(event);
                """, search_input)
                
                print("✅ تم الكتابة بـ JavaScript")
                
                # تأكد بـ send_keys أيضاً
                time.sleep(0.5)
                search_input.send_keys(Keys.END)  # اذهب لآخر الحقل
                
            except Exception as e:
                print(f"⚠️ JavaScript فشل، أحاول send_keys: {e}")
                # طريقة احتياطية
                try:
                    search_input.clear()
                    search_input.send_keys(group_name)
                    print("✅ تم الكتابة بـ send_keys")
                except:
                    # كتابة تدريجية كآخر حل
                    print("⚠️ أحاول الكتابة التدريجية...")
                    for char in group_name:
                        try:
                            search_input.send_keys(char)
                            time.sleep(random.uniform(0.05, 0.15))
                        except:
                            pass
            
            # ✅ انتظار ظهور النتائج
            print("⏳ انتظار النتائج...")
            time.sleep(random.uniform(2, 4))
            
            # ✅ البحث عن المجموعة في النتائج
            group_result = None
            
            # الطريقة 1: محاولة التطابق الدقيق (للأسماء)
            if not group_name.isdigit():  # إذا كان اسم وليس رقم
                result_xpaths = [
                    f".//span[normalize-space()='{group_name}']/ancestor::div[@role='button']",
                    f".//span[contains(text(), '{group_name}')]/ancestor::div[@role='button']",
                ]
                
                for xpath in result_xpaths:
                    try:
                        group_result = wait.until(
                            EC.element_to_be_clickable((By.XPATH, xpath))
                        )
                        if group_result:
                            print(f"✅ تم العثور على المجموعة بالاسم: {group_name}")
                            break
                    except TimeoutException:
                        continue
            
            # الطريقة 2: اختيار أول نتيجة (للأرقام أو إذا فشل التطابق)
            if not group_result:
                print("🔍 اختيار أول نتيجة متاحة...")
                first_result_xpaths = [
                    ".//div[@role='button' and contains(@class, 'x1i10hfl')]",
                    ".//div[@role='button']",
                    "//div[@role='dialog']//div[@role='button'][1]"
                ]
                
                for xpath in first_result_xpaths:
                    try:
                        # احصل على كل النتائج
                        results = dialog.find_elements(By.XPATH, xpath)
                        # اختر أول واحدة قابلة للضغط
                        for result in results[:3]:  # جرب أول 3
                            try:
                                if result.is_displayed() and result.is_enabled():
                                    result_text = result.text[:50] if result.text else "بدون نص"
                                    print(f"✅ سأختار: {result_text}")
                                    group_result = result
                                    break
                            except:
                                continue
                        if group_result:
                            break
                    except:
                        continue
            
            if not group_result:
                print(f"❌ لم يتم العثور على أي نتائج!")
                # طباعة النتائج المتاحة للتشخيص
                try:
                    results = dialog.find_elements(By.XPATH, ".//div[@role='button']")
                    print(f"📋 عدد النتائج المتاحة: {len(results)}")
                    for i, result in enumerate(results[:5], 1):
                        print(f"  {i}. {result.text[:50]}")
                except:
                    pass
                return False
            
            # ✅ اضغط على المجموعة بطريقة أفضل
            time.sleep(random.uniform(0.5, 1))
            
            # جرب الضغط بـ JavaScript إذا فشل الضغط العادي
            try:
                group_result.click()
                print(f"✅ تم اختيار المجموعة: {group_name}")
            except Exception as e:
                print(f"⚠️ الضغط العادي فشل، أحاول JavaScript...")
                try:
                    self.driver.execute_script("arguments[0].click();", group_result)
                    print(f"✅ تم اختيار المجموعة بـ JavaScript: {group_name}")
                except Exception as e2:
                    print(f"❌ فشل الضغط نهائياً: {e2}")
                    return False
            
            time.sleep(random.uniform(2, 4))
            return True
            
        except TimeoutException as e:
            print(f"❌ timeout في search_and_open_group: {e}")
            return False
        except Exception as e:
            print(f"❌ خطأ في search_and_open_group: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def post_to_group(self, group_identifier: str, cycle_number: int):
        """
        النشر في مجموعة واحدة
        
        Args:
            group_identifier: رابط المجموعة أو اسمها
            cycle_number: رقم الدورة
            
        Returns:
            bool: نجاح العملية
        """
        start_time = time.time()
        
        try:
            # ✅ تحقق: هل هو رابط أم اسم؟
            if group_identifier.startswith('http'):
                # رابط مباشر
                group_url = group_identifier
                # ✅ استخرج الاسم/ID من URL بشكل صحيح
                if '/groups/' in group_identifier:
                    # مثال: https://web.facebook.com/groups/848010554766731/
                    parts = group_identifier.rstrip('/').split('/')
                    group_name = parts[-1]  # آخر جزء هو ID المجموعة
                else:
                    group_name = group_identifier.split('/')[-1]
                
                print(f"📍 استخدام رابط مباشر: {group_url}")
                print(f"📝 اسم/ID المجموعة: {group_name}")
            else:
                # اسم المجموعة - ابحث عنها
                group_name = group_identifier
                print(f"📝 استخدام اسم المجموعة: {group_name}")
                group_url = self.search_group_by_name(group_name)
                
                if not group_url:
                    return self.save_post_result(
                        group_name, 
                        cycle_number, 
                        "failed", 
                        f"لم يتم العثور على المجموعة: {group_name}", 
                        None, 
                        time.time() - start_time
                    )
            
            # فتح الصفحة
            self.driver.get(self.config['page_url'])
            time.sleep(random.uniform(6, 10))
            
            if self.check_if_blocked():
                return self.save_post_result(
                    group_name, 
                    cycle_number, 
                    "failed", 
                    "تم اكتشاف حظر", 
                    None, 
                    time.time() - start_time
                )
            
            self.scroll_to_posts()
            
            if not self.open_share_box_for_first_post():
                return self.save_post_result(
                    group_name, 
                    cycle_number, 
                    "failed", 
                    "لم أستطع فتح زر المشاركة", 
                    None, 
                    time.time() - start_time
                )
            
            if not self.select_share_to_group():
                return self.save_post_result(
                    group_name, 
                    cycle_number, 
                    "failed", 
                    "لم أستطع اختيار خيار المجموعة", 
                    None, 
                    time.time() - start_time
                )
            
            if not self.search_and_open_group(group_name):
                return self.save_post_result(
                    group_name, 
                    cycle_number, 
                    "skipped", 
                    "المجموعة غير موجودة", 
                    None, 
                    time.time() - start_time
                )
            
            # ✅ البحث عن زر النشر بطرق متعددة
            print("🔍 البحث عن زر النشر...")
            
            post_button = None
            publish_xpaths = [
                "//div[@role='button' and .//span[contains(text(),'نشر')]]",
                "//div[@role='button' and contains(@aria-label,'نشر')]",
                "//span[text()='نشر']/ancestor::div[@role='button']",
                "//div[@aria-label='نشر']",
                "//div[contains(@class, 'x1i10hfl') and .//span[text()='نشر']]"
            ]
            
            for xpath in publish_xpaths:
                try:
                    post_button = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.XPATH, xpath))
                    )
                    if post_button:
                        print(f"✅ تم العثور على زر النشر: {xpath}")
                        break
                except TimeoutException:
                    continue
            
            if not post_button:
                print("❌ لم يتم العثور على زر النشر!")
                return self.save_post_result(
                    group_name, 
                    cycle_number, 
                    "failed", 
                    "لم يتم العثور على زر النشر", 
                    None, 
                    time.time() - start_time
                )
            
            # اضغط على زر النشر
            time.sleep(random.uniform(1, 2))
            try:
                post_button.click()
                print("✅ تم الضغط على زر النشر")
            except:
                print("⚠️ الضغط العادي فشل، أحاول JavaScript...")
                self.driver.execute_script("arguments[0].click();", post_button)
                print("✅ تم الضغط بـ JavaScript")
            
            # انتظار اكتمال النشر
            time.sleep(random.uniform(3, 5))
            
            # محاولة الحصول على رابط المنشور
            post_url = None
            try:
                time.sleep(2)
                post_url = self.driver.current_url
                print(f"✅ تم الحصول على رابط المنشور: {post_url}")
            except Exception as e:
                print(f"⚠️ لم نستطع الحصول على رابط المنشور: {e}")
                post_url = group_url  # استخدام رابط المجموعة كبديل
            
            duration = time.time() - start_time
            return self.save_post_result(group_name, cycle_number, "success", None, post_url, duration)
            
        except Exception as e:
            duration = time.time() - start_time
            # استخدم group_name إذا كان متاحاً
            name = group_name if 'group_name' in locals() else group_identifier
            return self.save_post_result(name, cycle_number, "failed", str(e), None, duration)
    
    def save_post_result(self, group_name: str, cycle_number: int, status: str, error: str, url: str, duration: float):
        """حفظ نتيجة المنشور في قاعدة البيانات"""
        try:
            group = self.db.query(models.Group).filter(models.Group.name == group_name).first()
            
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
                
                # تحديث إحصائيات المجموعة
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
        
        # جلب المجموعات النشطة
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
            
            # ✅ استخدم URL إذا كان موجوداً، وإلا استخدم الاسم
            group_identifier = group.url if group.url else group.name
            result = self.post_to_group(group_identifier, self.cycle_counter)
            
            if result:
                # جلب آخر منشور لمعرفة الحالة
                last_post = self.db.query(models.Post).order_by(models.Post.id.desc()).first()
                if last_post:
                    if last_post.status == "success":
                        successful += 1
                        print(f"✅ نجح")
                    elif last_post.status == "skipped":
                        skipped += 1
                        print(f"⭕ تم التخطي")
                    else:
                        failed += 1
                        print(f"❌ فشل")
            
            # انتظار بين المجموعات
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
        
        self.log_event("info", f"انتهت الدورة {self.cycle_counter}", f"نجح: {successful}, فشل: {failed}, تخطي: {skipped}")
    
    def start(self):
        """بدء البوت"""
        try:
            self.driver = self.create_driver()
            self.driver.get("https://web.facebook.com")
            time.sleep(5)
            
            print("✅ البوت جاهز للعمل!")
            return True
        except Exception as e:
            print(f"❌ خطأ في بدء البوت: {e}")
            return False
    
    def stop(self):
        """إيقاف البوت"""
        try:
            if self.driver:
                self.driver.quit()
            if self.db:
                self.db.close()
            print("✓ تم إيقاف البوت")
            return True
        except:
            return False