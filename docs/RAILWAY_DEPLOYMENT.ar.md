# ربط Backend مع Railway

هذا المشروع Monorepo: الواجهة في `frontend` والـ API في `backend`. على Railway يجب نشر `backend` فقط.

## 1. إنشاء خدمة Railway

1. افتح Railway واختر `New Project`.
2. اختر `Deploy from GitHub repo`.
3. اختر نفس مستودع GitHub.
4. في إعدادات الخدمة اضبط:
   - Root Directory: `/backend`
   - Config file path إن ظهر لك: `/backend/railway.json`

Railway سيستخدم `backend/Dockerfile` ويشغل:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## 2. المتغيرات المطلوبة

من تبويب `Variables` في خدمة Railway أضف:

```env
DATABASE_URL=sqlite:///./facebook_bot.db
ALLOWED_ORIGINS=https://YOUR-VERCEL-DOMAIN.vercel.app
CHROME_HEADLESS=1
CHROME_USER_DATA=/app/chrome_profile
CHROME_PROFILE_FOLDER=Default
```

وإذا كنت تستخدم مفاتيح الذكاء الاصطناعي أو إعدادات البوت:

```env
ANTHROPIC_API_KEY=...
PAGE_URL=...
MAX_GROUPS_PER_SESSION=7
DELAY_BETWEEN_CYCLES=3600
MIN_DELAY_BETWEEN_GROUPS=60
MAX_DELAY_BETWEEN_GROUPS=120
MAX_AUTO_SHARE_TRIES=3
SECRET_KEY=...
```

لا تضف `PORT` يدويًا؛ Railway يضيفه تلقائيًا.

## 3. إنشاء رابط عام للـ API

بعد نجاح النشر:

1. افتح خدمة الـ Backend في Railway.
2. ادخل `Settings`.
3. من `Networking` أنشئ Railway Domain.
4. جرّب الرابط:

```text
https://YOUR-RAILWAY-DOMAIN.up.railway.app/health
```

يجب أن يرجع:

```json
{"status":"healthy","database":"connected"}
```

## 4. ربط Vercel بالـ Backend

في مشروع Vercel للواجهة أضف Environment Variable:

```env
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/v1
```

ثم أعد نشر Vercel.

## ملاحظات مهمة

- تسجيل دخول Facebook يدويًا من متصفح Railway لن يظهر لك مثل الجهاز المحلي، لأن Railway يعمل كسيرفر بدون شاشة. النشر الأساسي والـ API سيعملان، لكن جلسة Chrome للبوت تحتاج إعدادًا خاصًا إذا أردت تشغيل النشر الآلي الكامل من السيرفر.
- إذا أردت قاعدة بيانات دائمة بدل SQLite، أضف PostgreSQL في Railway واجعل `DATABASE_URL` هو رابط PostgreSQL.
