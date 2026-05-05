from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

from app.database import engine, Base
from app.api.routers import groups, publish, campaigns, bot, stats_logs_config

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Facebook Auto Poster API",
    description="تطبيق ذكي للنشر التلقائي في مجموعات فيسبوك",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "https://facebook-ten-lac.vercel.app",
    "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(groups.router, prefix="/api/v1")
app.include_router(publish.router, prefix="/api/v1")
app.include_router(campaigns.router, prefix="/api/v1")
app.include_router(bot.router, prefix="/api/v1")
app.include_router(stats_logs_config.router, prefix="/api/v1")

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
    return {
        "status": "healthy",
        "database": "connected"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True
    )
