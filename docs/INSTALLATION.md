# 📖 دليل التثبيت

## المتطلبات

- Python 3.9+
- Google Chrome Browser
- Git

## خطوات التثبيت

### 1. استنساخ المشروع

```bash
git clone https://github.com/almewahid/facebook.git
cd facebook
```

### 2. إعداد Backend

```bash
cd backend

# إنشاء بيئة افتراضية
python -m venv venv

# تفعيل البيئة
# في Windows:
venv\Scripts\activate
# في Linux/Mac:
source venv/bin/activate

# تثبيت المكتبات
pip install -r requirements.txt
```

### 3. إعداد المتغيرات البيئية

```bash
# نسخ ملف المثال
cp .env.example .env

# تعديل الملف بمعلوماتك
nano .env  # أو استخدم أي محرر نصوص
```

ملف `.env` يجب أن يحتوي على:

```env
# Anthropic API (احصل عليه من https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-your-key-here

# رابط صفحتك على فيسبوك
PAGE_URL=https://web.facebook.com/profile.php?id=YOUR_ID

# عدد المجموعات في كل دورة
MAX_GROUPS_PER_SESSION=7

# الوقت بين الدورات (بالثواني) - 3600 = ساعة
DELAY_BETWEEN_CYCLES=3600
```

### 4. تشغيل Backend

```bash
# تأكد أنك في مجلد backend
cd backend

# تشغيل السيرفر
uvicorn app.main:app --reload --port 8000
```

الآن افتح: `http://localhost:8000/docs`

### 5. إضافة المجموعات

استخدم API لإضافة المجموعات:

```bash
curl -X POST http://localhost:8000/api/v1/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "مصريون بالكويت",
    "is_active": true
  }'
```

أو من Python:

```python
import requests

url = "http://localhost:8000/api/v1/groups"
data = {
    "name": "مصريون بالكويت",
    "is_active": True
}

response = requests.post(url, json=data)
print(response.json())
```

### 6. بدء البوت

```bash
curl -X POST http://localhost:8000/api/v1/bot/start \
  -H "Content-Type: application/json" \
  -d '{"force": false}'
```

---

## التثبيت بواسطة Docker 🐳

الطريقة الأسهل!

```bash
# 1. نسخ ملف البيئة
cp backend/.env.example .env

# 2. تعديل الملف
nano .env

# 3. تشغيل
docker-compose up -d

# 4. مشاهدة اللوجات
docker-compose logs -f backend

# 5. إيقاف
docker-compose down
```

---

## استكشاف الأخطاء

### الخطأ: "Chrome driver not found"

```bash
# قم بتثبيت Chrome يدوياً
# ثم شغّل البوت مرة أخرى
```

### الخطأ: "Database locked"

```bash
# أغلق جميع الاتصالات بقاعدة البيانات
# ثم أعد تشغيل السيرفر
```

### الخطأ: "ANTHROPIC_API_KEY not found"

```bash
# تأكد من وجود ملف .env
# تأكد من وجود المفتاح فيه
cat backend/.env | grep ANTHROPIC
```

---

## التحديث

```bash
# جلب آخر التحديثات
git pull origin main

# تحديث المكتبات
pip install -r requirements.txt --upgrade

# إعادة تشغيل
uvicorn app.main:app --reload
```

---

## إلغاء التثبيت

```bash
# إيقاف البوت
curl -X POST http://localhost:8000/api/v1/bot/stop

# حذف المشروع
cd ..
rm -rf facebook

# حذف البيئة الافتراضية
deactivate
```

---

## الدعم

إذا واجهت مشاكل:
1. تحقق من [Issues](https://github.com/almewahid/facebook/issues)
2. افتح issue جديد
3. تواصل مع المطور
