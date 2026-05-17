# نشر Backend على Render

Render أسهل من VPS ومناسب لتشغيل الـ API وربطه مع Vercel. إذا اخترت خطة مدفوعة مثل Starter فلن تنام الخدمة مثل الخطة المجانية.

## 1. قبل الرفع إلى GitHub

شغّل ملف:

```text
copy-fixed-files-to-original.bat
```

ثم ارفع التغييرات إلى GitHub من المجلد الأصلي.

## 2. إنشاء الخدمة في Render

الطريقة الأسهل:

1. افتح Render.
2. اختر `New`.
3. اختر `Blueprint`.
4. اربط مستودع GitHub.
5. اختر ملف `render.yaml`.
6. عند إنشاء الخدمة، أدخل القيم السرية التي عليها `sync: false`.

أو أنشئ Web Service يدويًا بهذه القيم:

- Runtime: Docker
- Root Directory: `backend`
- Dockerfile Path: `Dockerfile`
- Health Check Path: `/health`
- Plan: `Free` للتجربة المجانية، أو `Starter` لو تريدها دائمة بدون نوم

## 3. المتغيرات المطلوبة

أضف أو راجع هذه القيم في Render:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require
ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app
CHROME_HEADLESS=1
CHROME_USER_DATA=/app/chrome_profile
CHROME_PROFILE_FOLDER=Default
MEDIA_DIR=/app/uploaded_media
MAX_GROUPS_PER_SESSION=7
DELAY_BETWEEN_CYCLES=3600
MIN_DELAY_BETWEEN_GROUPS=60
MAX_DELAY_BETWEEN_GROUPS=120
MAX_AUTO_SHARE_TRIES=3
```

ولو تستخدم الذكاء الاصطناعي أو صفحة محددة:

```env
ANTHROPIC_API_KEY=...
PAGE_URL=...
```

## 4. ربط Vercel

بعد نجاح نشر Render، افتح رابط:

```text
https://YOUR-RENDER-SERVICE.onrender.com/health
```

إذا ظهر أن الخدمة سليمة، ضع في Vercel:

```env
NEXT_PUBLIC_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
```

ثم أعد نشر Vercel.

## ملاحظات مهمة

- الخطة المجانية في Render تنام بعد فترة بدون زيارات. الخطة المدفوعة مثل Starter تبقى دائمة.
- استخدم Neon/Postgres في `DATABASE_URL` حتى لا تضيع الجداول عند إعادة تشغيل Render.
- في الخطة المجانية لا يوجد قرص دائم هنا، لذلك جلسة Chrome والملفات المرفوعة قد تضيع عند إعادة التشغيل أو إعادة النشر.
- للاستقرار الأقوى مع عدة مستخدمين، الأفضل لاحقًا استخدام VPS أو قرص دائم للملفات، مع PostgreSQL للبيانات.
