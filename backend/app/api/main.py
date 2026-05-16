from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.api.routers import groups, publish, campaigns, bot, stats_logs_config

app = FastAPI(title="Facebook Bot API")
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", Path(__file__).resolve().parents[2] / "uploaded_media"))
MEDIA_DIR.mkdir(exist_ok=True)

# ضبط CORS — عدّل الـ origins حسب مشروعك
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تسجيل جميع الـ routers
app.include_router(groups.router)
app.include_router(publish.router)
app.include_router(campaigns.router)
app.include_router(bot.router)
app.include_router(stats_logs_config.router)
app.mount("/uploaded_media", StaticFiles(directory=str(MEDIA_DIR)), name="uploaded_media")


@app.get("/")
def root():
    return {"message": "Facebook Bot API is running ✅"}
