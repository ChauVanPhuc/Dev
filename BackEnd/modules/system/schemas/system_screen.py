from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from modules.system.schemas.system_component import SystemComponent as SystemComponentSchema

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

class SystemScreenUpdate(BaseModel):
    """
    Schema cap nhat thong tin man hinh.
    Admin co the thay doi ma hien tai, tieu de va phu de.
    """
    current_code: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    is_active: Optional[bool] = None

class SystemScreen(SystemScreenBase):
    """
    Schema hien thi thong tin man hinh hoan chinh.
    """
    id: int
    updated_at: Optional[datetime] = None
    components: List[SystemComponentSchema] = []

    class Config:
        from_attributes = True

