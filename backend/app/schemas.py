from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List

# ==================== Group Schemas ====================

class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    is_active: bool = True

class GroupCreate(GroupBase):
    """Schema لإنشاء مجموعة جديدة"""
    url: Optional[str] = None
    category: Optional[str] = "عام"

    @field_validator('name')
    def validate_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('اسم المجموعة يجب أن يكون حرفين على الأقل')
        return v.strip()

    @field_validator('url')
    def validate_url(cls, v):
        if v is None:
            return None
        v = v.strip()
        if not v:
            return None
        if 'facebook.com/groups/' not in v and 'fb.com/groups/' not in v:
            raise ValueError('الرابط يجب أن يكون لمجموعة Facebook')
        return v

class GroupUpdate(BaseModel):
    """Schema لتحديث مجموعة"""
    name: Optional[str] = None
    url: Optional[str] = None
    is_active: Optional[bool] = None
    category: Optional[str] = None

    @field_validator('name')
    def validate_name(cls, v):
        if v is not None and len(v.strip()) < 2:
            raise ValueError('اسم المجموعة يجب أن يكون حرفين على الأقل')
        return v.strip() if v else None

    @field_validator('url')
    def validate_url(cls, v):
        if v is None or not v.strip():
            return None
        if 'facebook.com/groups/' not in v and 'fb.com/groups/' not in v:
            raise ValueError('الرابط يجب أن يكون لمجموعة Facebook')
        return v.strip()

class GroupBulkImport(BaseModel):
    """Schema لاستيراد مجموعات متعددة"""
    groups: list[GroupCreate]

    @field_validator('groups')
    def validate_groups(cls, v):
        if not v or len(v) == 0:
            raise ValueError('يجب إضافة مجموعة واحدة على الأقل')
        if len(v) > 100:
            raise ValueError('الحد الأقصى 100 مجموعة في المرة الواحدة')
        return v

class GroupResponse(GroupBase):
    """Schema لعرض بيانات المجموعة"""
    id: int
    url: Optional[str] = None
    category: Optional[str] = "عام"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# ==================== Post Schemas ====================

class PostBase(BaseModel):
    group_id: int
    content: str
    status: str
    image_path: Optional[str] = None
    post_url: Optional[str] = None
    # إضافة حقل رسالة الخطأ لتمكين Gemini من تحليل الأنماط
    error_message: Optional[str] = None
    cycle_number: Optional[int] = None
    scheduled_time: Optional[datetime] = None
    posted_at: Optional[datetime] = None

class PostCreate(PostBase):
    pass

class PostResponse(PostBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== Bot Config Schemas ====================

class BotConfigBase(BaseModel):
    key: str
    value: str

class BotConfigCreate(BotConfigBase):
    pass

class BotConfigUpdate(BaseModel):
    value: str

class ScheduleConfig(BaseModel):
    """إعدادات الجدولة الذكية"""
    enabled: bool = True
    start_hour: int = 8
    end_hour: int = 18
    max_groups_per_session: int = 5
    min_delay: int = 90
    max_delay: int = 150
    rest_days: List[int] = [5]
    random_delay: bool = True

class BotConfigResponse(BotConfigBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

# ==================== Bot Log Schemas ====================

class BotLogBase(BaseModel):
    level: str
    message: str
    details: Optional[str] = None

class BotLogCreate(BotLogBase):
    pass

class BotLogResponse(BotLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== AI Insight Schemas ====================

class AIInsightBase(BaseModel):
    # مطابقة اسم الحقل مع models.py و ai_engine.py
    insight: str
    category: Optional[str] = None

class AIInsightCreate(AIInsightBase):
    pass

class AIInsightResponse(AIInsightBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== Statistics Schemas ====================

class StatsResponse(BaseModel):
    total_posts: int
    successful_posts: int
    failed_posts: int
    skipped_posts: int
    success_rate: float
    total_groups: int
    active_groups: int
    last_cycle_at: Optional[datetime] = None

# ==================== Campaign Schemas ====================

class CampaignCreate(BaseModel):
    name: str
    post_ids: Optional[List[int]] = None
    texts: Optional[List[str]] = None
    group_ids: List[int]
    publish_method: str = "new_post"
    rotation_strategy: str = "sequential"
    start_time: Optional[datetime] = None
    schedule_times: Optional[List[str]] = None
    rest_days: Optional[List[str]] = None
    delay_between_posts: int = 5
    created_by: Optional[str] = "admin@example.com"

class CampaignResponse(BaseModel):
    id: int
    name: str
    status: str
    publish_method: str = "new_post"
    sent_count: int
    total_groups: int
    created_at: datetime

    class Config:
        from_attributes = True

    # ==================== Bot Control Schemas ====================

class BotStartRequest(BaseModel):
    force: bool = False

class BotStartResponse(BaseModel):
    status: str
    message: str
    started_at: datetime

class BotStopRequest(BaseModel):
    force: bool = False

class BotStopResponse(BaseModel):
    status: str
    message: str
    stopped_at: datetime

class BotStatusResponse(BaseModel):
    is_running: bool
    current_cycle: Optional[int] = None
    current_group: Optional[str] = None
    started_at: Optional[datetime] = None
    last_activity: Optional[datetime] = None
