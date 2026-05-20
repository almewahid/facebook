import contextlib
import json
import os
import queue
import threading
import time
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, scrolledtext

ROOT_DIR = Path(__file__).resolve().parent


def resolve_appdata_dir() -> Path:
    preferred = Path(os.getenv("APPDATA", str(ROOT_DIR))) / "AlNasher"
    try:
        preferred.mkdir(parents=True, exist_ok=True)
        return preferred
    except Exception:
        fallback = ROOT_DIR / "user_data"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback


APPDATA_DIR = resolve_appdata_dir()
os.environ.setdefault("FAP_DATA_DIR", str(APPDATA_DIR))
os.environ.setdefault("FAP_PROFILE_DIR", str(APPDATA_DIR / "chrome_profile"))
os.environ.setdefault("FAP_DOWNLOAD_DIR", str(APPDATA_DIR / "downloads"))

from agent import DEFAULT_API_URL, LocalFacebookAgent


CONFIG_PATH = APPDATA_DIR / "agent_config.json"
LOCAL_API_URL = "http://127.0.0.1:8001/api/v1"
APP_NAME_AR = "الناشر"
APP_NAME_EN = "AlNasher"
GUIDE_TEXT = """دليل استخدام الناشر

1. افتح موقع المنصة وأنشئ مهام النشر من هناك.
2. انسخ كود الربط من حسابك في الموقع.
3. افتح برنامج الناشر وضع كود الربط.
4. اضغط حفظ الربط ثم فحص الاتصال.
5. أول مرة فقط: اضغط تسجيل دخول Facebook.
6. سجل دخولك في نافذة Chrome التي تفتح.
7. ارجع للبرنامج واضغط حفظ جلسة Facebook.
8. عند وجود مهام نشر اضغط تشغيل.

مهم:
- جلسة Facebook تحفظ على جهازك فقط.
- لا يتم إرسال كلمة مرور Facebook أو الكوكيز إلى السيرفر.
- البرنامج يرسل فقط حالة المهمة وعدد النجاحات والفشل ورسائل خطأ عامة.
- زر إيقاف يوقف التشغيل بعد انتهاء الخطوة الحالية.

مكان حفظ بيانات البرنامج على جهازك:
%APPDATA%\\AlNasher
"""


class QueueWriter:
    def __init__(self, log_queue: queue.Queue):
        self.log_queue = log_queue

    def write(self, text):
        text = str(text)
        if text:
            self.log_queue.put(("log", text))

    def flush(self):
        pass


class AutoPublisherApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"{APP_NAME_AR} - {APP_NAME_EN}")
        self.root.geometry("900x620")
        self.root.minsize(820, 560)

        self.log_queue = queue.Queue()
        self.stop_event = threading.Event()
        self.worker_thread = None
        self.login_agent = None

        self.api_var = tk.StringVar(value=DEFAULT_API_URL)
        self.token_var = tk.StringVar()
        self.status_var = tk.StringVar(value="غير متصل")
        self.token_visible = tk.BooleanVar(value=False)

        self.load_config()
        self.build_ui()
        self.root.after(200, self.drain_logs)
        self.root.protocol("WM_DELETE_WINDOW", self.on_close)

    def build_ui(self):
        self.root.configure(bg="#f6f7fb")

        header = tk.Frame(self.root, bg="#f6f7fb")
        header.pack(fill="x", padx=18, pady=(16, 8))

        title = tk.Label(
            header,
            text=f"{APP_NAME_AR} | {APP_NAME_EN}",
            font=("Segoe UI", 18, "bold"),
            bg="#f6f7fb",
            fg="#111827",
        )
        title.pack(anchor="w")

        subtitle = tk.Label(
            header,
            text="مشغل النشر المحلي. جلسة Facebook تبقى على هذا الجهاز فقط ولا يتم إرسالها إلى السيرفر.",
            font=("Segoe UI", 10),
            bg="#f6f7fb",
            fg="#4b5563",
        )
        subtitle.pack(anchor="w", pady=(4, 0))

        form = tk.Frame(self.root, bg="#ffffff", bd=1, relief="solid")
        form.pack(fill="x", padx=18, pady=8)

        tk.Label(form, text="رابط المنصة", bg="#ffffff", fg="#374151", font=("Segoe UI", 10, "bold")).grid(
            row=0, column=0, sticky="w", padx=14, pady=(14, 4)
        )
        api_entry = tk.Entry(form, textvariable=self.api_var, font=("Segoe UI", 10))
        api_entry.grid(row=1, column=0, sticky="ew", padx=14, pady=(0, 12))
        self.bind_paste(api_entry)

        paste_api_btn = tk.Button(form, text="لصق", command=lambda: self.paste_into(self.api_var), bg="#e5e7eb", relief="flat")
        paste_api_btn.grid(row=1, column=1, sticky="ew", padx=(0, 8), pady=(0, 12))

        local_api_btn = tk.Button(form, text="محلي", command=self.use_local_api, bg="#dbeafe", relief="flat")
        local_api_btn.grid(row=1, column=2, sticky="ew", padx=(0, 8), pady=(0, 12))

        prod_api_btn = tk.Button(form, text="الإنتاج", command=self.use_production_api, bg="#dcfce7", relief="flat")
        prod_api_btn.grid(row=1, column=3, sticky="ew", padx=(0, 8), pady=(0, 12))

        tk.Label(form, text="كود الربط", bg="#ffffff", fg="#374151", font=("Segoe UI", 10, "bold")).grid(
            row=2, column=0, sticky="w", padx=14, pady=(2, 4)
        )
        self.token_entry = tk.Entry(form, textvariable=self.token_var, font=("Segoe UI", 10), show="*")
        self.token_entry.grid(row=3, column=0, sticky="ew", padx=14, pady=(0, 14))
        self.bind_paste(self.token_entry)

        paste_token_btn = tk.Button(form, text="لصق", command=lambda: self.paste_into(self.token_var), bg="#e5e7eb", relief="flat")
        paste_token_btn.grid(row=3, column=1, sticky="ew", padx=(0, 8), pady=(0, 14))

        show_token_btn = tk.Checkbutton(
            form,
            text="إظهار",
            variable=self.token_visible,
            command=self.toggle_token_visibility,
            bg="#ffffff",
            fg="#374151",
            relief="flat",
        )
        show_token_btn.grid(row=3, column=2, sticky="ew", padx=(0, 8), pady=(0, 14))

        save_btn = tk.Button(form, text="حفظ الربط", command=self.save_config, bg="#2563eb", fg="white", relief="flat")
        save_btn.grid(row=3, column=3, sticky="ew", padx=(0, 8), pady=(0, 14))

        check_btn = tk.Button(form, text="فحص الاتصال", command=self.check_connection, bg="#111827", fg="white", relief="flat")
        check_btn.grid(row=3, column=4, sticky="ew", padx=(0, 14), pady=(0, 14))

        form.grid_columnconfigure(0, weight=1)
        form.grid_columnconfigure(1, minsize=70)
        form.grid_columnconfigure(2, minsize=70)
        form.grid_columnconfigure(3, minsize=110)
        form.grid_columnconfigure(4, minsize=125)

        controls = tk.Frame(self.root, bg="#f6f7fb")
        controls.pack(fill="x", padx=18, pady=8)

        self.login_btn = tk.Button(
            controls,
            text="تسجيل دخول Facebook",
            command=self.login_facebook,
            bg="#0ea5e9",
            fg="white",
            relief="flat",
            height=2,
        )
        self.login_btn.pack(side="left", padx=(0, 8))

        self.save_session_btn = tk.Button(
            controls,
            text="حفظ جلسة Facebook",
            command=self.save_facebook_session,
            bg="#10b981",
            fg="white",
            relief="flat",
            height=2,
            state="disabled",
        )
        self.save_session_btn.pack(side="left", padx=(0, 8))

        self.start_btn = tk.Button(
            controls,
            text="تشغيل",
            command=self.start_publishing,
            bg="#16a34a",
            fg="white",
            relief="flat",
            height=2,
            width=12,
        )
        self.start_btn.pack(side="left", padx=(0, 8))

        self.stop_btn = tk.Button(
            controls,
            text="إيقاف",
            command=self.stop_publishing,
            bg="#dc2626",
            fg="white",
            relief="flat",
            height=2,
            width=12,
            state="disabled",
        )
        self.stop_btn.pack(side="left", padx=(0, 8))

        guide_btn = tk.Button(
            controls,
            text="الدليل",
            command=self.show_guide,
            bg="#f59e0b",
            fg="white",
            relief="flat",
            height=2,
            width=12,
        )
        guide_btn.pack(side="left", padx=(0, 8))

        status_box = tk.Label(
            controls,
            textvariable=self.status_var,
            bg="#eef2ff",
            fg="#1e40af",
            font=("Segoe UI", 10, "bold"),
            padx=14,
            pady=9,
        )
        status_box.pack(side="right")

        log_frame = tk.Frame(self.root, bg="#ffffff", bd=1, relief="solid")
        log_frame.pack(fill="both", expand=True, padx=18, pady=(8, 18))

        tk.Label(log_frame, text="السجل", bg="#ffffff", fg="#111827", font=("Segoe UI", 11, "bold")).pack(
            anchor="w", padx=14, pady=(12, 4)
        )
        self.logs = scrolledtext.ScrolledText(
            log_frame,
            font=("Consolas", 10),
            height=14,
            bg="#0f172a",
            fg="#e5e7eb",
            insertbackground="#e5e7eb",
        )
        self.logs.pack(fill="both", expand=True, padx=14, pady=(0, 14))

    def load_config(self):
        if not CONFIG_PATH.exists():
            return
        try:
            data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            self.api_var.set(data.get("api_url") or DEFAULT_API_URL)
            self.token_var.set(data.get("token") or "")
        except Exception:
            pass

    def save_config(self):
        data = {
            "api_url": self.api_var.get().strip() or DEFAULT_API_URL,
            "token": self.token_var.get().strip(),
        }
        CONFIG_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        self.log("تم حفظ بيانات الربط.")

    def use_local_api(self):
        self.api_var.set(LOCAL_API_URL)
        self.log("تم اختيار رابط التجربة المحلية.")

    def use_production_api(self):
        self.api_var.set(DEFAULT_API_URL)
        self.log("تم اختيار رابط الموقع المنشور.")

    def paste_into(self, variable: tk.StringVar):
        try:
            variable.set(self.root.clipboard_get().strip())
        except Exception:
            self.log("تعذر قراءة النص المنسوخ من الحافظة.")

    def bind_paste(self, entry: tk.Entry):
        def do_paste(_event=None):
            try:
                entry.delete(0, "end")
                entry.insert(0, self.root.clipboard_get().strip())
            except Exception:
                self.log("تعذر اللصق من الحافظة.")
            return "break"

        entry.bind("<Control-v>", do_paste)
        entry.bind("<Control-V>", do_paste)
        entry.bind("<Button-3>", lambda _event: do_paste())

    def toggle_token_visibility(self):
        self.token_entry.config(show="" if self.token_visible.get() else "*")

    def get_agent(self):
        api_url = self.api_var.get().strip().rstrip("/")
        token = self.token_var.get().strip()
        if not token:
            raise RuntimeError("ضع كود الربط أولا.")
        return LocalFacebookAgent(api_url, token)

    def log(self, text: str):
        self.log_queue.put(("log", f"{text}\n"))

    def set_status(self, text: str):
        self.log_queue.put(("status", text))

    def drain_logs(self):
        while True:
            try:
                kind, value = self.log_queue.get_nowait()
            except queue.Empty:
                break
            if kind == "status":
                self.status_var.set(value)
            else:
                self.logs.insert("end", value)
                self.logs.see("end")
        self.root.after(200, self.drain_logs)

    def run_background(self, target):
        if self.worker_thread and self.worker_thread.is_alive():
            messagebox.showinfo(APP_NAME_AR, "يوجد تشغيل قائم حاليا.")
            return
        self.worker_thread = threading.Thread(target=target, daemon=True)
        self.worker_thread.start()

    def check_connection(self):
        self.save_config()

        def worker():
            self.set_status("يفحص الاتصال...")
            try:
                agent = self.get_agent()
                heartbeat, status = agent.connect()
                self.log(f"تم الاتصال بالمستخدم رقم: {heartbeat.get('user_id')}")
                self.log(f"مهام النشر المنتظرة: {status.get('pending_tasks', 0)}")
                self.set_status("متصل")
            except Exception as exc:
                self.log(f"فشل الاتصال: {exc}")
                self.set_status("فشل الاتصال")

        self.run_background(worker)

    def login_facebook(self):
        if self.worker_thread and self.worker_thread.is_alive():
            messagebox.showinfo(APP_NAME_AR, "أوقف التشغيل أولا، ثم افتح تسجيل دخول Facebook.")
            self.log("أوقف التشغيل أولا قبل تسجيل دخول Facebook.")
            return

        self.save_config()
        self.login_btn.config(state="disabled")
        self.set_status("يفتح Facebook...")

        def worker():
            try:
                self.login_agent = self.get_agent()
                driver = self.login_agent.create_driver()
                driver.get("https://www.facebook.com/")
                time.sleep(2)
                if "facebook.com" not in (driver.current_url or ""):
                    driver.execute_script("window.location.href = 'https://www.facebook.com/'")
                    time.sleep(2)
                try:
                    driver.maximize_window()
                except Exception:
                    pass
                self.root.after(0, lambda: self.save_session_btn.config(state="normal"))
                self.root.after(0, lambda: self.login_btn.config(state="normal"))
                self.set_status("سجل دخول Facebook")
                self.log(f"تم فتح Chrome على: {driver.current_url}")
                self.log("سجل دخولك إلى Facebook في نافذة Chrome، ثم اضغط حفظ جلسة Facebook.")
            except Exception as exc:
                if self.login_agent:
                    self.login_agent.close()
                    self.login_agent = None
                self.root.after(0, lambda: self.login_btn.config(state="normal"))
                self.log(f"فشل فتح Facebook: {exc}")
                self.set_status("فشل فتح Facebook")

        threading.Thread(target=worker, daemon=True).start()

    def save_facebook_session(self):
        if self.login_agent:
            self.login_agent.close()
            self.login_agent = None
        self.save_session_btn.config(state="disabled")
        self.set_status("جلسة Facebook محفوظة")
        self.log("تم حفظ جلسة Facebook محليا على هذا الجهاز.")

    def start_publishing(self):
        self.save_config()
        self.stop_event.clear()
        self.start_btn.config(state="disabled")
        self.stop_btn.config(state="normal")

        def worker():
            self.set_status("يعمل")
            writer = QueueWriter(self.log_queue)
            agent = None
            try:
                agent = self.get_agent()
                with contextlib.redirect_stdout(writer), contextlib.redirect_stderr(writer):
                    while not self.stop_event.is_set():
                        agent.run_once()
                        for _ in range(30):
                            if self.stop_event.is_set():
                                break
                            time.sleep(1)
                self.log("تم إيقاف التشغيل.")
                self.set_status("متوقف")
            except Exception as exc:
                self.log(f"حدث خطأ في المشغل: {exc}")
                self.set_status("حدث خطأ")
            finally:
                if agent:
                    agent.close()
                self.root.after(0, lambda: self.start_btn.config(state="normal"))
                self.root.after(0, lambda: self.stop_btn.config(state="disabled"))

        self.run_background(worker)

    def stop_publishing(self):
        self.stop_event.set()
        self.set_status("جار الإيقاف...")
        self.log("طلب إيقاف التشغيل بعد انتهاء الخطوة الحالية.")

    def show_guide(self):
        guide = tk.Toplevel(self.root)
        guide.title(f"دليل {APP_NAME_AR}")
        guide.geometry("620x520")
        guide.configure(bg="#f6f7fb")

        title = tk.Label(
            guide,
            text=f"دليل استخدام {APP_NAME_AR}",
            font=("Segoe UI", 16, "bold"),
            bg="#f6f7fb",
            fg="#111827",
        )
        title.pack(anchor="w", padx=18, pady=(16, 8))

        text = scrolledtext.ScrolledText(
            guide,
            font=("Segoe UI", 11),
            wrap="word",
            bg="#ffffff",
            fg="#111827",
            height=18,
        )
        text.pack(fill="both", expand=True, padx=18, pady=(0, 14))
        text.insert("1.0", GUIDE_TEXT)
        text.config(state="disabled")

        close_btn = tk.Button(guide, text="إغلاق", command=guide.destroy, bg="#111827", fg="white", relief="flat")
        close_btn.pack(anchor="e", padx=18, pady=(0, 16))

    def on_close(self):
        self.stop_event.set()
        if self.login_agent:
            self.login_agent.close()
        self.root.destroy()


def main():
    root = tk.Tk()
    AutoPublisherApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
