# الناشر | AlNasher

هذا هو مشغل النشر المحلي للمستخدم.

الفكرة:

1. المستخدم يسجل دخول في المنصة.
2. يحصل الـ Agent على توكن الدخول.
3. الـ Agent يعمل على جهاز المستخدم.
4. الموقع يحفظ مهام النشر في السيرفر.
5. الـ Agent يسحب المهام من السيرفر وينفذها عبر Chrome المحلي.
6. الـ Agent يرسل نتائج النشر للمنصة.

## التشغيل الأولي

1. ثبت المتطلبات:

```powershell
pip install -r agent\requirements.txt
```

2. شغل الفحص:

```powershell
agent\run-agent.bat
```

وللتجربة المحلية قبل الرفع:

```powershell
agent\run-agent-local.bat
```

## تشغيل واجهة ويندوز التجريبية

لتجهيز بيئة الـ Agent مرة واحدة:

```powershell
agent\setup-agent-env.bat
```

لتشغيل نسخة بدون Terminal:

```powershell
agent\run-agent-gui.bat
```

الواجهة تحتوي على:

- حفظ Agent Token / Pairing Code.
- فحص الاتصال.
- تسجيل دخول Facebook أول مرة.
- Start / Stop لتشغيل سحب المهام.
- Logs لعرض النتائج.

لا يتم إرسال بيانات Facebook إلى السيرفر. الجلسة تحفظ محليا داخل:

```text
agent/chrome_profile
```

ولبناء ملف exe تجريبي:

```powershell
agent\build-agent-exe.bat
```

بعد البناء ستجد الملف هنا:

```text
agent/release/AlNasher.exe
```

ومعه ملف:

```text
agent/release/دليل الاستخدام.txt
```

وللمستخدم النهائي راجع:

```text
agent/USER_GUIDE.ar.md
```

سيطلب منك:

- رابط API، الافتراضي:
  `https://facebook-auto-poster-api.onrender.com/api/v1`
- توكن المستخدم من تسجيل الدخول.

## طريقة الاستخدام

عند التشغيل ستظهر اختيارات:

- `1` تسجيل دخول فيسبوك: يفتح Chrome، سجل دخولك، ثم اضغط Enter في نافذة البرنامج.
- `2` تشغيل مهمة نشر واحدة.
- `3` تشغيل مستمر، يفحص المهام كل 30 ثانية.
- `4` فحص الاتصال فقط بدون فتح Chrome وبدون تغيير المهام.

يحفظ الـ Agent جلسة Chrome داخل:

```text
agent/chrome_profile
```

ولا يرسل كلمة مرور فيسبوك إلى السيرفر.

في نسخة الواجهة، تحفظ بيانات الربط وجلسة Chrome داخل:

```text
%APPDATA%\AlNasher
```

## ملاحظات

- يجب أن يكون جهاز المستخدم مفتوحًا أثناء النشر.
- يجب أن تكون مجموعات المستخدم فيها روابط صحيحة.
- لو غيّر فيسبوك شكل الأزرار قد نحتاج تحديث محددات Chrome.
