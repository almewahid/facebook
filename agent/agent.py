import getpass
import os
import random
import socket
import tempfile
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver import ChromeOptions
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

try:
    import pyperclip
except Exception:
    pyperclip = None


DEFAULT_API_URL = "https://facebook-auto-poster-api.onrender.com/api/v1"
AGENT_VERSION = "0.2.0"
ROOT_DIR = Path(__file__).resolve().parent


def default_data_dir() -> Path:
    base = os.getenv("FAP_DATA_DIR")
    if base:
        return Path(base)
    appdata = os.getenv("APPDATA")
    if appdata:
        preferred = Path(appdata) / "AlNasher"
        try:
            preferred.mkdir(parents=True, exist_ok=True)
            return preferred
        except Exception:
            pass
    fallback = ROOT_DIR / "user_data"
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


DATA_DIR = default_data_dir()
PROFILE_DIR = Path(os.getenv("FAP_PROFILE_DIR", str(DATA_DIR / "chrome_profile")))
DOWNLOAD_DIR = Path(os.getenv("FAP_DOWNLOAD_DIR", str(DATA_DIR / "downloads")))


def env_or_prompt(name: str, prompt: str, default: str = "") -> str:
    value = os.getenv(name)
    if value:
        return value.strip()
    suffix = f" [{default}]" if default else ""
    typed = input(f"{prompt}{suffix}: ").strip()
    return typed or default


def auth_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def request_json(method: str, url: str, token: str, **kwargs):
    response = requests.request(method, url, headers=auth_headers(token), timeout=60, **kwargs)
    try:
        payload = response.json()
    except Exception:
        payload = {"raw": response.text}
    if not response.ok:
        raise RuntimeError(payload.get("detail") or payload.get("message") or response.text)
    return payload


def normalize_url(value: str | None) -> str:
    value = (value or "").strip()
    if not value:
        return ""
    if not value.startswith(("http://", "https://")):
        value = f"https://{value}"
    return value


class LocalFacebookAgent:
    def __init__(self, api_url: str, token: str):
        self.api_url = api_url.rstrip("/")
        self.token = token
        self.driver = None
        DOWNLOAD_DIR.mkdir(exist_ok=True)
        PROFILE_DIR.mkdir(exist_ok=True)

    def connect(self):
        heartbeat = request_json(
            "POST",
            f"{self.api_url}/agent/heartbeat",
            self.token,
            json={"device_name": socket.gethostname(), "version": AGENT_VERSION},
        )
        status = request_json("GET", f"{self.api_url}/agent/status", self.token)
        return heartbeat, status

    def create_driver(self):
        options = ChromeOptions()
        options.add_argument(f"--user-data-dir={PROFILE_DIR}")
        options.add_argument("--profile-directory=Default")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-notifications")
        options.add_argument("--start-maximized")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)
        options.add_experimental_option("prefs", {
            "profile.default_content_setting_values.notifications": 2,
            "credentials_enable_service": False,
            "profile.password_manager_enabled": False,
        })
        self.driver = webdriver.Chrome(options=options)
        return self.driver

    def close(self):
        if self.driver:
            self.driver.quit()
            self.driver = None

    def setup_login(self):
        driver = self.create_driver()
        driver.get("https://www.facebook.com/login")
        print("\nChrome opened.")
        print("Log in to Facebook in the opened Chrome window.")
        input("After login is complete, press Enter here to save the session...")
        self.close()
        print(f"Session saved in: {PROFILE_DIR}")

    def ensure_driver(self):
        if not self.driver:
            self.create_driver()
        return self.driver

    def text_into_active_element(self, text: str):
        active = self.driver.switch_to.active_element
        if pyperclip:
            pyperclip.copy(text)
            active.send_keys(Keys.CONTROL, "v")
        else:
            active.send_keys(text)

    def click_first_available(self, xpaths: list[str], timeout: int = 12):
        wait = WebDriverWait(self.driver, timeout)
        last_error = None
        for xpath in xpaths:
            try:
                element = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
                time.sleep(0.4)
                element.click()
                return element
            except Exception as exc:
                last_error = exc
        raise TimeoutException(str(last_error) if last_error else "No matching element")

    def click_post_button(self) -> bool:
        xpaths = [
            "//div[@role='dialog']//div[@role='button' and (@aria-label='نشر' or @aria-label='Post') and not(@aria-disabled='true')]",
            "//div[@role='dialog']//span[normalize-space()='نشر']/ancestor::div[@role='button' and not(@aria-disabled='true')][1]",
            "//div[@role='dialog']//span[normalize-space()='Post']/ancestor::div[@role='button' and not(@aria-disabled='true')][1]",
            "//div[@aria-label='نشر' and @role='button' and not(@aria-disabled='true')]",
            "//div[@aria-label='Post' and @role='button' and not(@aria-disabled='true')]",
        ]
        last_error = None
        for xpath in xpaths:
            try:
                button = WebDriverWait(self.driver, 18).until(
                    EC.presence_of_element_located((By.XPATH, xpath))
                )
                self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", button)
                time.sleep(0.5)
                try:
                    button.click()
                except Exception:
                    self.driver.execute_script("arguments[0].click();", button)

                try:
                    WebDriverWait(self.driver, 20).until_not(
                        EC.presence_of_element_located((By.XPATH, "//div[@role='dialog']//div[@contenteditable='true']"))
                    )
                except TimeoutException:
                    pass
                return True
            except Exception as exc:
                last_error = exc
        print(f"Could not click Post button: {last_error}")
        return False

    def download_media(self, url: str) -> str:
        parsed = urlparse(url)
        suffix = Path(parsed.path).suffix or ".bin"
        with requests.get(url, timeout=120, stream=True) as response:
            response.raise_for_status()
            fd, path = tempfile.mkstemp(prefix="fap_", suffix=suffix, dir=DOWNLOAD_DIR)
            with os.fdopen(fd, "wb") as handle:
                for chunk in response.iter_content(chunk_size=1024 * 512):
                    if chunk:
                        handle.write(chunk)
        return path

    def upload_images_if_any(self, image_urls: list[str]):
        if not image_urls:
            return
        paths = [self.download_media(url) for url in image_urls]
        file_inputs = self.driver.find_elements(By.XPATH, "//input[@type='file']")
        if not file_inputs:
            return
        file_inputs[-1].send_keys("\n".join(paths))
        time.sleep(4)

    def publish_new_post(self, group: dict, task: dict) -> dict:
        group_url = normalize_url(group.get("url"))
        if not group_url:
            return {"status": "failed", "error_message": "لا يوجد رابط للمجموعة"}

        self.driver.get(group_url)
        time.sleep(random.uniform(5, 8))

        self.click_first_available([
            "//span[contains(text(), 'اكتب شيئًا')]/ancestor::div[@role='button']",
            "//span[contains(text(), \"What's on your mind\")]/ancestor::div[@role='button']",
            "//div[@role='button'][.//span[contains(text(), 'منشور')]]",
            "//div[@role='button'][.//span[contains(text(), 'Write something')]]",
        ], timeout=15)
        time.sleep(2)

        editor = None
        for xpath in [
            "//div[@role='dialog']//div[@contenteditable='true']",
            "//div[@contenteditable='true'][@role='textbox']",
        ]:
            try:
                editor = WebDriverWait(self.driver, 12).until(EC.element_to_be_clickable((By.XPATH, xpath)))
                break
            except TimeoutException:
                continue
        if not editor:
            return {"status": "failed", "error_message": "خانة كتابة المنشور غير موجودة"}

        editor.click()
        self.text_into_active_element(task.get("text") or "")
        time.sleep(1)
        self.upload_images_if_any(task.get("image_urls") or [])

        if not self.click_post_button():
            return {"status": "failed", "error_message": "لم أستطع الضغط على زر نشر"}
        time.sleep(random.uniform(5, 8))
        return {"status": "success", "post_url": self.driver.current_url}

    def publish_share_page(self, group: dict, task: dict) -> dict:
        page_url = normalize_url(task.get("page_url"))
        if not page_url:
            return {"status": "failed", "error_message": "رابط الصفحة غير محفوظ"}

        self.driver.get(page_url)
        time.sleep(random.uniform(5, 8))

        self.click_first_available([
            "(//span[text()='مشاركة']/ancestor::div[@role='button'])[1]",
            "(//span[text()='Share']/ancestor::div[@role='button'])[1]",
        ], timeout=15)
        time.sleep(2)

        self.click_first_available([
            "//span[contains(text(), 'مشاركة في مجموعة')]/ancestor::div[@role='button']",
            "//span[contains(text(), 'Share to a group')]/ancestor::div[@role='button']",
        ], timeout=15)
        time.sleep(2)

        search = None
        for xpath in [
            "//div[@role='dialog']//input[@type='search']",
            "//div[@role='dialog']//input",
            "//div[@role='dialog']//div[@contenteditable='true']",
        ]:
            try:
                search = WebDriverWait(self.driver, 12).until(EC.element_to_be_clickable((By.XPATH, xpath)))
                break
            except TimeoutException:
                continue
        if not search:
            return {"status": "failed", "error_message": "حقل البحث عن المجموعة غير موجود"}

        search.click()
        if pyperclip:
            pyperclip.copy(group.get("name") or "")
            search.send_keys(Keys.CONTROL, "v")
        else:
            search.send_keys(group.get("name") or "")
        time.sleep(3)

        self.click_first_available([
            f"//div[@role='dialog']//span[contains(text(), \"{group.get('name')}\")]/ancestor::div[@role='button']",
            "//div[@role='dialog']//div[@role='button'][.//span]",
        ], timeout=15)
        time.sleep(2)

        self.click_first_available([
            "//div[@role='dialog']//span[text()='نشر']/ancestor::div[@role='button']",
            "//div[@role='dialog']//span[text()='Post']/ancestor::div[@role='button']",
        ], timeout=15)
        time.sleep(random.uniform(5, 8))
        return {"status": "success", "post_url": self.driver.current_url}

    def publish_group(self, group: dict, task: dict) -> dict:
        method = task.get("publish_method") or "new_post"
        if method == "share_page":
            return self.publish_share_page(group, task)
        return self.publish_new_post(group, task)

    def run_once(self):
        self.ensure_driver()
        data = request_json("GET", f"{self.api_url}/agent/tasks/next", self.token)
        task = data.get("task")
        if not task:
            print("No task is ready now.")
            return

        post_id = task["post_id"]
        groups = task.get("groups") or []
        print(f"Task #{post_id}: {len(groups)} groups")

        for index, group in enumerate(groups, 1):
            print(f"[{index}/{len(groups)}] {group.get('name')}")
            try:
                result = self.publish_group(group, task)
            except Exception as exc:
                result = {"status": "failed", "error_message": str(exc)}

            request_json(
                "POST",
                f"{self.api_url}/agent/tasks/{post_id}/result",
                self.token,
                json={
                    "group_id": group["id"],
                    "status": result.get("status") or "failed",
                    "post_url": result.get("post_url"),
                    "error_message": result.get("error_message"),
                },
            )

            delay_min = int(task.get("delay_minutes") or 1)
            delay_max = int(task.get("delay_max_minutes") or delay_min)
            if index < len(groups):
                wait_seconds = random.randint(delay_min, max(delay_min, delay_max)) * 60
                print(f"Waiting {wait_seconds // 60} minutes...")
                time.sleep(wait_seconds)

        request_json(
            "POST",
            f"{self.api_url}/agent/tasks/{post_id}/finish",
            self.token,
            json={"status": "done", "message": "Agent completed the task."},
        )
        print("Task finished.")


def main():
    print("Facebook Auto Poster Agent")
    print("==========================")

    api_url = env_or_prompt("FAP_API_URL", "API URL", DEFAULT_API_URL).rstrip("/")
    token = os.getenv("FAP_TOKEN") or getpass.getpass("User token: ").strip()
    if not token:
        print("Token is required.")
        return

    agent = LocalFacebookAgent(api_url, token)
    heartbeat, status = agent.connect()
    print(f"Connected: user_id={heartbeat.get('user_id')}")
    print(f"Pending tasks: {status.get('pending_tasks', 0)}")

    print("\nChoose:")
    print("1 - Setup Facebook login")
    print("2 - Run one publishing task")
    print("3 - Keep running")
    print("4 - Check connection only")
    choice = input("Choice [2]: ").strip() or "2"

    try:
        if choice == "1":
            agent.setup_login()
        elif choice == "4":
            print("Connection check completed. No tasks were changed.")
        elif choice == "3":
            while True:
                agent.run_once()
                time.sleep(30)
        else:
            agent.run_once()
    finally:
        agent.close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nStopped.")
    except Exception as exc:
        print(f"\nError: {exc}")
        time.sleep(1)
