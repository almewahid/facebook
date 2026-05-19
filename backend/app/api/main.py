from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path

from app.database import Base, engine
from app import models
from app.api.routers import admin, auth, billing, groups, publish, campaigns, bot, stats_logs_config

app = FastAPI(title="Facebook Bot API")
MEDIA_DIR = Path(os.getenv("MEDIA_DIR", Path(__file__).resolve().parents[2] / "uploaded_media"))
MEDIA_DIR.mkdir(exist_ok=True)
Base.metadata.create_all(bind=engine)

# ضبط CORS — عدّل الـ origins حسب مشروعك
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# تسجيل جميع الـ routers بنفس prefix المستخدم في الواجهة
app.include_router(auth.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(publish.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(bot.router, prefix="/api/v1")
app.include_router(stats_logs_config.router, prefix="/api/v1")
app.mount("/uploaded_media", StaticFiles(directory=str(MEDIA_DIR)), name="uploaded_media")


@app.get("/")
def root():
    return {"message": "Facebook Bot API is running ✅"}


@app.get("/health")
def health():
    return {"status": "healthy"}
