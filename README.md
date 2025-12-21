# 🤖 Facebook Auto Poster Bot

> Intelligent automation tool for posting in Facebook groups with advanced scheduling and AI-powered content generation.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![License](https://img.shields.io/badge/License-MIT-yellow)

**English** | [العربية](README.ar.md)

---

## ✨ Features

### 🎯 Core Features
- ✅ **Automated Group Posting** - Post to multiple Facebook groups automatically
- ✅ **Smart Scheduling** - 4 scheduling presets (Conservative, Moderate, Intensive, Risky)
- ✅ **Bulk Operations** - Add multiple groups at once
- ✅ **Custom Content** - Use your own post content or AI-generated
- ✅ **Real-time Dashboard** - Monitor posting activity live
- ✅ **Advanced Analytics** - Track success rates, timing, and performance

### 📊 Dashboard Features
- Real-time posting statistics
- Group management interface
- Post history with clickable links
- Success/failure tracking
- Customizable scheduling
- Rest days configuration

### 🛡️ Safety Features
- Anti-detection measures
- Randomized delays
- Smart scheduling to avoid blocks
- Session persistence
- Error handling and recovery

---

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - Database ORM
- **Alembic** - Database migrations
- **Selenium** - Browser automation
- **SQLite** - Lightweight database

### Frontend
- **Next.js 14** - React framework
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Lucide Icons** - UI icons

---

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Chrome browser

### Backend Setup

```bash
# Clone repository
git clone https://github.com/almewahid/facebook.git
cd facebook

# Setup Python virtual environment
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload
```

Backend will run on: `http://localhost:8000`

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on: `http://localhost:3000`

---

## 🚀 Usage

### 1. Add Facebook Groups
- Click "إضافة مجموعة" to add single group
- Or use "إضافة متعددة" for bulk adding

### 2. Configure Settings
- Set delays between posts
- Add custom post content (optional)
- Configure smart scheduling

### 3. Start Bot
- Click "تشغيل البوت"
- Monitor real-time progress
- View analytics and reports

---

## 📸 Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### Group Management
![Groups](docs/screenshots/groups.png)

### Analytics
![Analytics](docs/screenshots/analytics.png)

---

## ⚙️ Configuration

### Schedule Presets

| Preset | Groups/Session | Delay | Rest Days | Risk Level |
|--------|---------------|-------|-----------|------------|
| **Conservative** | 3-5 | 120-180s | Weekend | Low |
| **Moderate** | 5-7 | 90-150s | Friday | Medium |
| **Intensive** | 7-10 | 60-120s | None | High |
| **Risky** | 10-15 | 30-90s | None | Very High |

---

## 🛠️ API Documentation

Backend API documentation available at: `http://localhost:8000/docs`

### Main Endpoints

- `GET /api/v1/stats` - Get posting statistics
- `GET /api/v1/groups` - List all groups
- `POST /api/v1/groups` - Add new group
- `GET /api/v1/posts` - Get post history
- `POST /api/v1/bot/start` - Start bot
- `POST /api/v1/bot/stop` - Stop bot
- `GET /api/v1/schedule` - Get schedule config
- `PUT /api/v1/schedule` - Update schedule

---

## 📁 Project Structure

```
facebook-auto-poster/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py
│   │   ├── bot/
│   │   │   └── selenium_bot.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   └── main.py
│   ├── alembic/
│   ├── requirements.txt
│   └── facebook_bot.db
├── frontend/
│   ├── app/
│   │   ├── page.jsx
│   │   └── layout.jsx
│   ├── package.json
│   └── tailwind.config.js
├── .gitignore
└── README.md
```

---

## 🔐 Security Notes

### Important: Before Using
1. **Never share** your Facebook credentials
2. **Use at your own risk** - Automated posting may violate Facebook TOS
3. **Keep chrome_profile/** private (contains session data)
4. **Don't commit** `.db` files or `.env` files

### Recommended Usage
- Use conservative scheduling
- Don't post too frequently
- Monitor for blocks/warnings
- Keep session data secure

---

## 🐛 Troubleshooting

### ChromeDriver Issues
```bash
# Update ChromeDriver
pip install --upgrade webdriver-manager
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
rm facebook_bot.db
alembic upgrade head
```

### Port Already in Use
```bash
# Backend (8000)
lsof -ti:8000 | xargs kill -9

# Frontend (3000)
lsof -ti:3000 | xargs kill -9
```

---

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## ⚠️ Disclaimer

This tool is for educational purposes only. Automated posting may violate Facebook's Terms of Service. Use responsibly and at your own risk. The developers are not responsible for any account bans or restrictions.

---

## 📧 Contact

- GitHub: [@almewahid](https://github.com/almewahid)
- Project Link: [https://github.com/almewahid/facebook](https://github.com/almewahid/facebook)

---

## 🙏 Acknowledgments

- FastAPI documentation
- Next.js team
- Selenium contributors
- Open source community

---

**Made with ❤️ by Osama**
