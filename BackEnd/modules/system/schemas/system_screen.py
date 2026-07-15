from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from modules.system.schemas.system_component import SystemComponent as SystemComponentSchema, SystemComponentCreate
from modules.system.schemas.screen_bug import ScreenBugResponse

class SystemScreenBase(BaseModel):
    """
    Schema co ban cho Man hinh He thong.
    """
    platform: str
    route_path: str
    default_code: str
    current_code: str
    title: str
    subtitle: Optional[str] = None
    is_active: bool = True
    status: Optional[str] = 'Mới thiết kế'
    target_date: Optional[str] = None
    mockup_path: Optional[str] = None

class SystemScreenCreate(BaseModel):
    """
    Schema khoi tao man hinh moi.
    """
    platform: str
    route_path: Optional[str] = None
    title: str
    subtitle: Optional[str] = None
    status: Optional[str] = 'Mới thiết kế'
    target_date: Optional[str] = None
    subsystem: Optional[str] = None
    components: Optional[List[SystemComponentCreate]] = None
    mockup_path: Optional[str] = None

class SystemScreenUpdate(BaseModel):
    """
    Schema cap nhat thong tin man hinh.
    Admin co the thay doi ma hien tai, tieu de va phu de.
    """
    current_code: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    target_date: Optional[str] = None
    components: Optional[List[SystemComponentCreate]] = None
    mockup_path: Optional[str] = None

class SystemScreen(SystemScreenBase):
    """
    Schema hien thi thong tin man hinh hoan chinh.
    """
    id: int
    updated_at: Optional[datetime] = None
    components: List[SystemComponentSchema] = []
    bugs: List[ScreenBugResponse] = []

    class Config:
        from_attributes = True

