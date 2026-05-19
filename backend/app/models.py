# backend/app/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class User(Base):
    """مستخدم SaaS مالك لبياناته واشتراكه."""
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String, unique=True, nullable=False, index=True)
    full_name       = Column(String, nullable=True)
    password_hash   = Column(String, nullable=False)
    role            = Column(String, default="user", index=True)  # user | admin
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    groups = relationship("Group", back_populates="user")
    posts = relationship("Post", back_populates="user")
    publish_posts = relationship("PublishPost", back_populates="user")
    campaigns = relationship("Campaign", back_populates="user")
    bot_configs = relationship("BotConfig", back_populates="user")
    logs = relationship("BotLog", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")
    payments = relationship("Payment", back_populates="user")


class Subscription(Base):
    """حالة الاشتراك هي مصدر الصلاحيات، بغض النظر عن طريقة الدفع."""
    __tablename__ = "subscriptions"

    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan                = Column(String, nullable=False, index=True)  # monthly | yearly
    service_key         = Column(String, default="new_post", index=True)  # new_post | share_page
    service_name        = Column(String, nullable=True)
    status              = Column(String, default="pending", index=True)  # pending | active | expired | cancelled
    start_date          = Column(DateTime(timezone=True), nullable=True)
    end_date            = Column(DateTime(timezone=True), nullable=True)
    payment_method      = Column(String, nullable=True)  # manual | stripe | paymob | paddle
    payment_reference   = Column(String, nullable=True)
    amount_cents        = Column(Integer, nullable=True)
    currency            = Column(String, default="USD")
    provider            = Column(String, default="manual", index=True)
    provider_customer_id = Column(String, nullable=True)
    provider_subscription_id = Column(String, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")


class Payment(Base):
    """طلبات الدفع اليدوي حالياً، ومخزن موحد لأي بوابة لاحقاً."""
    __tablename__ = "payments"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    subscription_id   = Column(Integer, ForeignKey("subscriptions.id"), nullable=True, index=True)
    plan              = Column(String, nullable=False, index=True)
    service_key       = Column(String, default="new_post", index=True)
    service_name      = Column(String, nullable=True)
    status            = Column(String, default="pending", index=True)  # pending | approved | rejected | failed
    payment_method    = Column(String, default="manual", index=True)
    payment_reference = Column(String, nullable=True)
    proof_url         = Column(String, nullable=True)
    amount_cents      = Column(Integer, nullable=True)
    currency          = Column(String, default="USD")
    provider          = Column(String, default="manual", index=True)
    provider_payment_id = Column(String, nullable=True)
    raw_payload       = Column(Text, nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="payments")
    subscription = relationship("Subscription", back_populates="payments")


class Group(Base):
    """نموذج المجموعة الموحد"""
    __tablename__ = "groups"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name       = Column(String, nullable=False, index=True)
    # الحقل الجديد للتصنيف لضمان ظهور القوائم
    category   = Column(String, default="عام", index=True)
    url        = Column(String, nullable=True)
    is_active  = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # العلاقات
    user = relationship("User", back_populates="groups")
    posts = relationship("Post", back_populates="group")

    def __repr__(self):
        return f"<Group(name='{self.name}', category='{self.category}', is_active={self.is_active})>"


class Post(Base):
    """نموذج المنشور (سجل النشر التلقائي)"""
    __tablename__ = "posts"

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    group_id       = Column(Integer, ForeignKey("groups.id"), nullable=False)
    content        = Column(Text, nullable=False)
    image_path     = Column(String, nullable=True)
    status         = Column(String, default="pending")  # pending, success, failed, skipped
    post_url       = Column(String, nullable=True)
    # الحقل المستخدم بواسطة Gemini لتحليل أنماط الفشل
    error_message  = Column(Text, nullable=True)
    cycle_number   = Column(Integer, nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    posted_at      = Column(DateTime(timezone=True), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    group = relationship("Group", back_populates="posts")
    user = relationship("User", back_populates="posts")

    def __repr__(self):
        return f"<Post(id={self.id}, status='{self.status}')>"


class PublishPost(Base):
    """نموذج النشر اليدوي (نص + صور + فيديو -> جميع المجموعات)"""
    __tablename__ = "publish_posts"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    text              = Column(Text, nullable=False)
    image_paths       = Column(Text, nullable=True)   # مسارات الصور مفصولة بفاصلة
    video_path        = Column(String, nullable=True)
    publish_method    = Column(String, default="new_post")
    status            = Column(String, default="pending")  # pending | publishing | done | failed
    total_groups      = Column(Integer, default=0)
    success_count     = Column(Integer, default=0)
    failed_count      = Column(Integer, default=0)
    target_group_ids  = Column(Text, nullable=True)
    is_scheduled      = Column(Boolean, default=False)
    scheduled_start_time = Column(DateTime, nullable=True)
    delay_minutes     = Column(Integer, default=5)
    delay_max_minutes = Column(Integer, default=5)
    created_at        = Column(DateTime, default=datetime.utcnow)
    published_at      = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="publish_posts")

    def __repr__(self):
        return f"<PublishPost(id={self.id}, status='{self.status}')>"


class Schedule(Base):
    """نموذج الجدولة"""
    __tablename__ = "schedules"

    id                    = Column(Integer, primary_key=True, index=True)
    user_id               = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name                  = Column(String, nullable=False)
    schedule_type         = Column(String, nullable=False)  # daily, weekly, custom
    time_slots            = Column(Text, nullable=True)     # JSON: ["09:00", "15:00"]
    days_of_week          = Column(Text, nullable=True)     # JSON: [0,1,2,3,4,5,6]
    rest_days             = Column(Text, nullable=True)     # JSON: [5,6]
    week_start_day        = Column(Integer, default=5)      # 5 = السبت
    delay_between_posts   = Column(Integer, default=300)    # بالثواني
    random_delay          = Column(Boolean, default=True)
    is_active             = Column(Boolean, default=True)
    created_at            = Column(DateTime(timezone=True), server_default=func.now())
    updated_at            = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Schedule(name='{self.name}', type='{self.schedule_type}')>"


class BotLog(Base):
    """سجل أحداث البوت"""
    __tablename__ = "bot_logs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    level      = Column(String, nullable=False)   # info, warning, error
    message    = Column(Text, nullable=False)
    details    = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<BotLog(level='{self.level}', message='{self.message[:50]}')>"

    user = relationship("User", back_populates="logs")


class BotConfig(Base):
    """إعدادات البوت المحفوظة في قاعدة البيانات"""
    __tablename__ = "bot_configs"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    key        = Column(String, nullable=False, index=True)
    value      = Column(Text, nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (UniqueConstraint("user_id", "key", name="uq_bot_configs_user_key"),)

    user = relationship("User", back_populates="bot_configs")

    def __repr__(self):
        return f"<BotConfig(key='{self.key}', value='{self.value}')>"


class AIInsight(Base):
    """تحليلات الذكاء الاصطناعي (Gemini)"""
    __tablename__ = "ai_insights"

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    # الحقل المخصص لنص التحليل المولد من Gemini
    insight    = Column(Text, nullable=False) 
    # الحقل المخصص للتصنيف (performance, suggestion, warning)
    category   = Column(String, nullable=True) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<AIInsight(id={self.id}, category='{self.category}')>"


class Campaign(Base):
    """نموذج الحملات المتقدمة"""
    __tablename__ = "campaigns"

    id                  = Column(Integer, primary_key=True, index=True)
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name                = Column(String, nullable=False)
    status              = Column(String, default="draft")  # draft, active, paused, completed
    post_ids            = Column(Text, nullable=True)      # JSON: [1, 2]
    publish_method      = Column(String, default="new_post")
    rotation_strategy   = Column(String, default="sequential")  # sequential, random
    schedule_plan       = Column(Text, nullable=True)
    delay_between_posts = Column(Integer, default=5)       # بالدقائق
    total_groups        = Column(Integer, default=0)
    sent_count          = Column(Integer, default=0)
    created_by          = Column(String, nullable=False)
    started_at          = Column(DateTime, nullable=True)
    completed_at        = Column(DateTime, nullable=True)
    created_at          = Column(DateTime, server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="campaigns")

    def __repr__(self):
        return f"<Campaign(name='{self.name}', status='{self.status}')>"
