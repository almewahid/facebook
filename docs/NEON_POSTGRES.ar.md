# ربط Neon Postgres مع Render

Neon هو موقع خارجي يوفر قاعدة PostgreSQL على الإنترنت. سيصبح الترتيب:

```text
Vercel = الواجهة
Render = Backend/API
Neon = قاعدة البيانات
GitHub = الكود
```

## 1. إنشاء قاعدة Neon

1. افتح [Neon](https://neon.tech).
2. سجّل الدخول باستخدام GitHub أو البريد.
3. اختر `New Project`.
4. اترك PostgreSQL الافتراضي.
5. اختر منطقة قريبة إن أمكن.
6. بعد إنشاء المشروع، افتح صفحة `Connection Details`.

## 2. نسخ رابط الاتصال

انسخ رابط الاتصال بصيغة SQLAlchemy أو Postgres، وسيكون قريبًا من هذا:

```env
postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
```

لا تنشر هذا الرابط في GitHub ولا ترسله في المحادثة؛ ضعه فقط في Render.

## 3. وضعه في Render

في خدمة Render:

1. افتح `Environment`.
2. عدّل المتغير `DATABASE_URL`.
3. ضع رابط Neon.
4. احفظ.
5. اعمل `Manual Deploy`.

عند تشغيل الـ Backend سيقوم بإنشاء الجداول تلقائيًا.

## 4. اختبار الاتصال

افتح:

```text
https://facebook-auto-poster-api.onrender.com/health
```

إذا ظهر:

```json
{"status":"healthy","database":"connected"}
```

فالاتصال الأساسي يعمل. بعد إضافة مجموعة من الواجهة، ستظهر الجداول والبيانات في Neon.
