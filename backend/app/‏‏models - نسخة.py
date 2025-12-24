# backend/app/models.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Group(Base):
    """نموذج المجموعة"""
    __tablename__ = "groups"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    url = Column(String, nullable=True)  # ✅ أصبح اختياري
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # العلاقات
    posts = relationship("Post", back_populates="group")
    
    def __repr__(self):
        return f"<Group(name='{self.name}', url='{self.url}', is_active={self.is_active})>"


class Post(Base):
    """نموذج المنشور"""
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False)
    content = Column(Text, nullable=False)
    image_path = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, posted, failed
    post_url = Column(String, nullable=True)
    scheduled_time = Column(DateTime(timezone=True), nullable=True)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # العلاقات
    group = relationship("Group", back_populates="posts")
    
    def __repr__(self):
        return f"<Post(id={self.id}, status='{self.status}')>"


class Schedule(Base):
    """نموذج الجدولة"""
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    schedule_type = Column(String, nullable=False)  # daily, weekly, custom
    
    # إعدادات الجدولة
    time_slots = Column(Text, nullable=True)  # JSON: ["09:00", "15:00", "21:00"]
    days_of_week = Column(Text, nullable=True)  # JSON: [0,1,2,3,4,5,6]
    rest_days = Column(Text, nullable=True)  # JSON: [5,6] للجمعة والسبت
    week_start_day = Column(Integer, default=5)  # 5 = السبت
    
    # إعدادات التأخير
    delay_between_posts = Column(Integer, default=300)  # بالثواني (5 دقائق)
    random_delay = Column(Boolean, default=True)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<Schedule(name='{self.name}', type='{self.schedule_type}')>"
