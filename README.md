# 🤖 Facebook Auto Poster

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.9+-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)

**تطبيق ذكي متكامل للنشر التلقائي في مجموعات فيسبوك مع الذكاء الاصطناعي**

[المميزات](#-المميزات) • [التثبيت](#-التثبيت) • [الاستخدام](#-الاستخدام) • [التوثيق](#-التوثيق) • [المساهمة](#-المساهمة)

</div>

---

## 📋 المحتويات

- [نظرة عامة](#-نظرة-عامة)
- [المميزات](#-المميزات)
- [التقنيات المستخدمة](#-التقنيات-المستخدمة)
- [البنية المعمارية](#-البنية-المعمارية)
- [التثبيت](#-التثبيت)
- [الاستخدام](#-الاستخدام)
- [الإعدادات](#-الإعدادات)
- [API Documentation](#-api-documentation)
- [النشر](#-النشر)
- [المساهمة](#-المساهمة)
- [الترخيص](#-الترخيص)

---

## 🎯 نظرة عامة

**Facebook Auto Poster** هو تطبيق متكامل يجمع بين قوة الأتمتة والذكاء الاصطناعي لإدارة النشر في مجموعات فيسبوك بشكل تلقائي وذكي.

### ✨ لماذا هذا التطبيق؟

- 🚀 **توفير الوقت**: نشر تلقائي في عشرات المجموعات بضغطة زر واحدة
- 🤖 **ذكاء اصطناعي**: تحليل أفضل أوقات النشر وكتابة محتوى تلقائي
- 📊 **تحليلات متقدمة**: تتبع الأداء وإحصائيات مفصلة
- 🛡️ **حماية من الحظر**: سلوك بشري طبيعي وأوقات عشوائية
- 🎨 **واجهة احترافية**: Dashboard جميل وسهل الاستخدام

---

## 🌟 المميزات

### 🔄 النشر الذكي
- ✅ نشر تلقائي في مجموعات متعددة
- ✅ جدولة منشورات حسب أوقات محددة
- ✅ تنويع المحتوى تلقائياً
- ✅ إعادة محاولة عند الفشل
- ✅ تخطي المجموعات غير المتاحة

### 🤖 الذكاء الاصطناعي
- 🧠 تحليل أفضل أوقات النشر
- ✍️ كتابة تعليقات ذكية
- 📈 اقتراح استراتيجيات تحسين
- 🔍 كشف أنماط الأخطاء
- 🎯 اختيار ذكي للمجموعات

### 🛡️ الحماية والأمان
- 🕐 انتظار عشوائي بين المنشورات (60-120 ثانية)
- 🎭 تصرف بشري طبيعي (كتابة تدريجية، تمرير)
- 🚦 كشف تلقائي للحظر
- 🔐 تشفير بيانات الدخول
- 📸 حفظ screenshots عند الأخطاء

### 📊 التحليلات والإحصائيات
- 📈 رسوم بيانية حية
- 📋 تقارير يومية/أسبوعية/شهرية
- 🎯 معدلات النجاح لكل مجموعة
- ⏱️ متوسط الوقت للمنشور
- 📊 إحصائيات متقدمة

### 🎨 واجهة المستخدم
- 💻 Dashboard احترافي
- 🎛️ إدارة المجموعات
- 📅 جدولة المنشورات
- ⚙️ إعدادات متقدمة
- 🔔 إشعارات فورية

---

## 🛠️ التقنيات المستخدمة

### Backend
- **Python 3.9+** - اللغة الأساسية
- **FastAPI** - Framework للـ API
- **SQLAlchemy** - ORM لقاعدة البيانات
- **SQLite** - قاعدة البيانات
- **Selenium** - أتمتة المتصفح
- **Anthropic Claude API** - الذكاء الاصطناعي
- **Celery** - جدولة المهام
- **Redis** - Caching

### Frontend
- **Next.js 14** - React Framework
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **Shadcn/ui** - Component Library
- **Recharts** - Data Visualization
- **React Query** - Data Fetching

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container
- **GitHub Actions** - CI/CD
- **Nginx** - Reverse Proxy

---

## 🏗️ البنية المعمارية

```
facebook-auto-poster/
│
├── 📂 backend/                 # Backend API (Python/FastAPI)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI application
│   │   ├── database.py        # Database configuration
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic schemas
│   │   │
│   │   ├── api/               # API routes
│   │   │   ├── routes.py
│   │   │   └── auth.py
│   │   │
│   │   ├── bot/               # Selenium bot
│   │   │   ├── selenium_bot.py
│   │   │   ├── scheduler.py
│   │   │   └── ai_engine.py
│   │   │
│   │   └── utils/             # Utilities
│   │       ├── notifications.py
│   │       └── reports.py
│   │
│   ├── requirements.txt
│   └── Dockerfile
│
├── 📂 frontend/                # Frontend (Next.js)
│   ├── app/
│   │   ├── page.tsx           # Homepage
│   │   ├── dashboard/
│   │   ├── groups/
│   │   ├── schedule/
│   │   └── settings/
│   │
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   ├── package.json
│   └── Dockerfile
│
├── 📂 docs/                    # Documentation
│   ├── INSTALLATION.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── screenshots/
│
├── docker-compose.yml
├── .gitignore
├── LICENSE
└── README.md
```

---

## 💻 التثبيت

### المتطلبات

- Python 3.9+
- Node.js 18+
- Docker & Docker Compose (اختياري)
- Google Chrome Browser
- حساب Anthropic Claude API (للذكاء الاصطناعي)

### طريقة 1: التثبيت اليدوي

#### 1. استنساخ المشروع

```bash
git clone https://github.com/almewahid/facebook.git
cd facebook
```

#### 2. تثبيت Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # في Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 3. تثبيت Frontend

```bash
cd ../frontend
npm install
```

#### 4. إعداد المتغيرات البيئية

إنشاء ملف `.env` في مجلد `backend`:

```env
# Database
DATABASE_URL=sqlite:///./facebook_bot.db

# Anthropic API
ANTHROPIC_API_KEY=your_api_key_here

# Facebook Credentials (اختياري)
FACEBOOK_EMAIL=your_email@example.com
FACEBOOK_PASSWORD=your_password

# Bot Settings
PAGE_URL=https://web.facebook.com/profile.php?id=YOUR_PAGE_ID
DELAY_BETWEEN_CYCLES=3600
MIN_DELAY_BETWEEN_GROUPS=60
MAX_DELAY_BETWEEN_GROUPS=120

# Security
SECRET_KEY=your_secret_key_here
```

#### 5. تشغيل التطبيق

**Backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm run dev
```

الآن افتح: `http://localhost:3000`

---

### طريقة 2: Docker (الأسهل) 🐳

```bash
# استنساخ المشروع
git clone https://github.com/almewahid/facebook.git
cd facebook

# إنشاء ملف .env
cp .env.example .env
# عدّل الملف بمعلوماتك

# تشغيل كل شيء
docker-compose up -d

# الوصول للتطبيق
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

---

## 🚀 الاستخدام

### 1. الإعدادات الأولية

1. افتح `http://localhost:3000`
2. اذهب إلى **Settings**
3. أدخل معلومات فيسبوك
4. أضف المجموعات التي تريد النشر فيها

### 2. إضافة مجموعات

```bash
# عبر API
curl -X POST http://localhost:8000/api/v1/groups \
  -H "Content-Type: application/json" \
  -d '{
    "name": "مصريون بالكويت",
    "is_active": true
  }'
```

أو عبر Dashboard → Groups → Add Group

### 3. بدء النشر التلقائي

```bash
# عبر API
curl -X POST http://localhost:8000/api/v1/bot/start

# أو من Dashboard
Dashboard → Click "Start Bot"
```

### 4. جدولة منشورات

Dashboard → Schedule → New Schedule

---

## ⚙️ الإعدادات

### إعدادات البوت

```python
# في backend/.env

# عدد المجموعات في كل دورة
MAX_GROUPS_PER_SESSION=7

# الوقت بين كل دورة (بالثواني)
DELAY_BETWEEN_CYCLES=3600  # ساعة واحدة

# الوقت بين المجموعات (ثواني)
MIN_DELAY_BETWEEN_GROUPS=60
MAX_DELAY_BETWEEN_GROUPS=120

# عدد المحاولات
MAX_AUTO_SHARE_TRIES=3
```

### إعدادات الذكاء الاصطناعي

```python
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-3-sonnet-20240229

# تفعيل الميزات
AI_BEST_TIME_ANALYSIS=true
AI_CONTENT_GENERATION=true
AI_ERROR_DETECTION=true
```

---

## 📚 API Documentation

### الوصول للتوثيق

**Swagger UI:** `http://localhost:8000/docs`
**ReDoc:** `http://localhost:8000/redoc`

### أمثلة API

#### الحصول على إحصائيات

```bash
GET /api/v1/stats
```

```json
{
  "total_posts": 150,
  "successful_posts": 142,
  "failed_posts": 8,
  "success_rate": 94.67,
  "total_groups": 7,
  "active_groups": 7,
  "last_cycle": "2024-12-19T10:30:00Z"
}
```

#### بدء البوت

```bash
POST /api/v1/bot/start
```

#### إيقاف البوت

```bash
POST /api/v1/bot/stop
```

للمزيد: [API Documentation](docs/API.md)

---

## 🚢 النشر

### النشر على Base44

[دليل النشر الكامل](docs/DEPLOYMENT.md)

```bash
# تسجيل الدخول
base44 login

# إنشاء تطبيق جديد
base44 create facebook-auto-poster

# نشر
base44 deploy
```

### النشر على Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### النشر على Heroku

```bash
heroku create facebook-auto-poster
git push heroku main
```

---

## 🤝 المساهمة

نرحب بأي مساهمات! 🎉

### كيفية المساهمة

1. Fork المشروع
2. إنشاء branch جديد (`git checkout -b feature/amazing-feature`)
3. Commit التغييرات (`git commit -m 'Add amazing feature'`)
4. Push للـ branch (`git push origin feature/amazing-feature`)
5. فتح Pull Request

### Guidelines

- اتبع PEP 8 للكود Python
- اكتب tests للميزات الجديدة
- حدّث الـ documentation
- استخدم commit messages واضحة

---

## 📝 الترخيص

هذا المشروع مرخص تحت **MIT License** - انظر ملف [LICENSE](LICENSE) للتفاصيل.

---

## 👨‍💻 المطور

**almewahid**
- GitHub: [@almewahid](https://github.com/almewahid)
- Project Link: [https://github.com/almewahid/facebook](https://github.com/almewahid/facebook)

---

## 🙏 شكر وتقدير

- [Anthropic](https://www.anthropic.com/) - Claude API
- [Selenium](https://www.selenium.dev/) - Web Automation
- [FastAPI](https://fastapi.tiangolo.com/) - Web Framework
- [Next.js](https://nextjs.org/) - React Framework

---

## ⚠️ إخلاء المسؤولية

هذا التطبيق للأغراض التعليمية والاستخدام الشخصي فقط. يرجى الالتزام بشروط استخدام فيسبوك وعدم إساءة الاستخدام. المطور غير مسؤول عن أي حظر أو مشاكل قد تحدث نتيجة الاستخدام.

---

<div align="center">

**صنع بـ ❤️ في مصر**

⭐ إذا أعجبك المشروع، لا تنسى تعطيه Star!

</div>
