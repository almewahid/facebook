from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

# ==================== Group Schemas ====================

class GroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    is_active: bool = True

class GroupCreate(GroupBase):
    pass

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None

class GroupResponse(GroupBase):
    id: int
    success_count: int = 0
    failure_count: int = 0
    last_post_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ==================== Post Schemas ====================

class PostBase(BaseModel):
    group_id: int
    status: str
    error_message: Optional[str] = None
    post_url: Optional[str] = None
    cycle_number: int
    duration_seconds: Optional[float] = None

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
    insight_type: str
    content: str
    confidence: float
    applied: bool = False

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
    total_cycles: int
    last_cycle_at: Optional[datetime] = None

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
