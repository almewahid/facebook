# backend/app/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from .database import Base


class Group(Base):
    """نموذج المجموعة الموحد"""
    __tablename__ = "groups"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False, index=True)
    # ✅ الحقل الجديد للتصنيف لضمان ظهور القوائم
    category   = Column(String, default="عام", index=True)
    url        = Column(String, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # العلاقات
    posts = relationship("Post", back_populates="group")

    def __repr__(self):
        return f"<Group(name='{self.name}', category='{self.category}', is_active={self.is_active})>"


class Post(Base):
    """نموذج المنشور (سجل النشر التلقائي)"""
    __tablename__ = "posts"

    id             = Column(Integer, primary_key=True, index=True)
    group_id       = Column(Integer, ForeignKey("groups.id"), nullable=False)
    content        = Column(Text, nullable=False)
    image_path     = Column(String, nullable=True)
    status         = Column(String, default="pending")  # pending, success, failed, skipped
    post_url       = Column(String, nullable=True)
    cycle_number   = Column(Integer, nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    posted_at      = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    group = relationship("Group", back_populates="posts")

    def __repr__(self):
        return f"<Post(id={self.id}, status='{self.status}')>"


class PublishPost(Base):
    """نموذج النشر اليدوي (نص + صور + فيديو → جميع المجموعات)"""
    __tablename__ = "publish_posts"

    id            = Column(Integer, primary_key=True, index=True)
    text          = Column(Text, nullable=False)
    image_paths   = Column(Text, nullable=True)   # مسارات الصور مفصولة بفاصلة
    video_path    = Column(String, nullable=True)
    status        = Column(String, default="pending")  # pending | publishing | done | failed
    total_groups  = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failed_count  = Column(Integer, default=0)
    target_group_ids = Column(Text, nullable=True)   # 👈 أضف هذا السطر
    created_at    = Column(DateTime, default=datetime.utcnow)
    published_at  = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<PublishPost(id={self.id}, status='{self.status}')>"


class Schedule(Base):
    """نموذج الجدولة"""
    __tablename__ = "schedules"

    id                   = Column(Integer, primary_key=True, index=True)
    name                 = Column(String, nullable=False)
    schedule_type        = Column(String, nullable=False)  # daily, weekly, custom
    time_slots           = Column(Text, nullable=True)     # JSON: ["09:00", "15:00"]
    days_of_week         = Column(Text, nullable=True)     # JSON: [0,1,2,3,4,5,6]
    rest_days            = Column(Text, nullable=True)     # JSON: [5,6]
    week_start_day       = Column(Integer, default=5)      # 5 = السبت
    delay_between_posts  = Column(Integer, default=300)    # بالثواني
    random_delay         = Column(Boolean, default=True)
    is_active            = Column(Boolean, default=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())
    updated_at           = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Schedule(name='{self.name}', type='{self.schedule_type}')>"


class BotLog(Base):
    """سجل أحداث البوت"""
    __tablename__ = "bot_logs"

    id         = Column(Integer, primary_key=True, index=True)
    level      = Column(String, nullable=False)   # info, warning, error
    message    = Column(Text, nullable=False)
    details    = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<BotLog(level='{self.level}', message='{self.message[:50]}')>"


class BotConfig(Base):
    """إعدادات البوت المحفوظة في قاعدة البيانات"""
    __tablename__ = "bot_configs"

    id         = Column(Integer, primary_key=True, index=True)
    key        = Column(String, unique=True, nullable=False, index=True)
    value      = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<BotConfig(key='{self.key}', value='{self.value}')>"


class AIInsight(Base):
    """تحليلات الذكاء الاصطناعي"""
    __tablename__ = "ai_insights"

    id         = Column(Integer, primary_key=True, index=True)
    insight    = Column(Text, nullable=False)
    category   = Column(String, nullable=True)   # performance, suggestion, warning
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<AIInsight(id={self.id}, category='{self.category}')>"