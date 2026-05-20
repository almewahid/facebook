from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
from sqlalchemy import text
from pathlib import Path
from urllib.parse import urlparse

from app.database import engine, Base, DATABASE_URL
from app import models

Base.metadata.create_all(bind=engine)


def ensure_runtime_columns():
    """إضافة أعمدة صغيرة مطلوبة عند تشغيل قاعدة قديمة بدون Alembic."""
    auto_migrate_postgres = os.getenv("AUTO_MIGRATE_ON_STARTUP", "").lower() in ("1", "true", "yes")

    required_columns = {
        "groups": {
            "user_id": "INTEGER",
        },
        "posts": {
            "user_id": "INTEGER",
        },
        "campaigns": {
            "user_id": "INTEGER",
            "publish_method": "VARCHAR DEFAULT 'new_post'",
        },
        "publish_posts": {
            "user_id": "INTEGER",
            "publish_method": "VARCHAR DEFAULT 'new_post'",
            "is_scheduled": "BOOLEAN DEFAULT 0",
            "scheduled_start_time": "DATETIME",
            "delay_minutes": "INTEGER DEFAULT 5",
            "delay_max_minutes": "INTEGER DEFAULT 5",
        },
        "subscriptions": {
            "service_key": "VARCHAR DEFAULT 'new_post'",
            "service_name": "VARCHAR",
            "amount_cents": "INTEGER",
            "currency": "VARCHAR DEFAULT 'USD'",
        },
        "payments": {
            "service_key": "VARCHAR DEFAULT 'new_post'",
            "service_name": "VARCHAR",
        },
        "schedules": {
            "user_id": "INTEGER",
        },
        "bot_logs": {
            "user_id": "INTEGER",
        },
        "bot_configs": {
            "user_id": "INTEGER",
        },
        "ai_insights": {
            "user_id": "INTEGER",
        },
    }

    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            for table_name, columns in required_columns.items():
                existing = {
                    row[1]
                    for row in conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
                }
                for column_name, ddl in columns.items():
                    if column_name not in existing:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {ddl}"))
        elif auto_migrate_postgres:
            for table_name, columns in required_columns.items():
                for column_name, ddl in columns.items():
                    try:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} {ddl}"))
                    except Exception as exc:
                        print(f"Skipping runtime column migration {table_name}.{column_name}: {exc}")
        else:
            print("Skipping PostgreSQL runtime column migration. Use docs/supabase-schema.sql or Alembic for schema changes.")


ensure_runtime_columns()

from app.api.routers import admin, agent, auth, billing, groups, publish, campaigns, bot, stats_logs_config

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", Path(__file__).resolve().parents[1] / "uploaded_media"))
MEDIA_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="Facebook Auto Poster API",
    description="تطبيق ذكي للنشر التلقائي في مجموعات فيسبوك",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://facebook-ten-lac.vercel.app",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ] + [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ],
    allow_origin_regex=r"(https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1):\d+)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(publish.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(bot.router, prefix="/api/v1")
app.include_router(stats_logs_config.router, prefix="/api/v1")
app.mount("/uploaded_media", StaticFiles(directory=str(MEDIA_DIR)), name="uploaded_media")

@app.on_event("startup")
async def startup_event():
    print("✅ تم تشغيل التطبيق بنجاح")

@app.on_event("shutdown")
async def shutdown_event():
    print("👋 تم إيقاف التطبيق")

@app.get("/")
async def root():
    return {
        "message": "مرحباً في Facebook Auto Poster API",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    parsed_database_url = urlparse(DATABASE_URL)
    database_host = parsed_database_url.hostname or "local"
    if "supabase" in database_host or "pooler.supabase" in database_host:
        database_provider = "supabase"
    elif "neon" in database_host:
        database_provider = "neon"
    elif DATABASE_URL.startswith("sqlite"):
        database_provider = "sqlite"
    else:
        database_provider = "postgres"

    return {
        "status": "healthy",
        "database": "connected",
        "database_provider": database_provider,
        "database_host": database_host,
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
