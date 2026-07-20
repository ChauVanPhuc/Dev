from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from modules.system.schemas.system_component import SystemComponent as SystemComponentSchema, SystemComponentCreate
from modules.system.schemas.system_guide import SystemGuide as SystemGuideSchema, SystemGuideCreate
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
    current_code: Optional[str] = None
    title: str
    subtitle: Optional[str] = None
    status: Optional[str] = 'Mới thiết kế'
    target_date: Optional[str] = None
    subsystem: Optional[str] = None
    components: Optional[List[SystemComponentCreate]] = None
    guides: Optional[List[SystemGuideCreate]] = None
    mockup_path: Optional[str] = None

class SystemScreenUpdate(BaseModel):
    """
    Schema cap nhat thong tin man hinh.
    Admin co the thay doi ma hien tai, tieu de va phu de.
    """
    current_code: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    route_path: Optional[str] = None
    platform: Optional[str] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    target_date: Optional[str] = None
    components: Optional[List[SystemComponentCreate]] = None
    guides: Optional[List[SystemGuideCreate]] = None
    mockup_path: Optional[str] = None

class SystemScreen(SystemScreenBase):
    """
    Schema hien thi thong tin man hinh hoan chinh.
    """
    id: int
    updated_at: Optional[datetime] = None
    components: List[SystemComponentSchema] = []
    guides: List[SystemGuideSchema] = []
    bugs: List[ScreenBugResponse] = []

    class Config:
        from_attributes = True


class ScreenExportOptions(BaseModel):
    """
    Tuy chon noi dung xuat trong dac ta chi tiet.
    """
    include_basic_info: bool = True
    include_mockup: bool = True
    include_components: bool = True
    include_guides: bool = True
    include_bugs: bool = True
    include_history: bool = False


class ScreenExportDetailRequest(BaseModel):
    """
    Request body cho API xuat dac ta chi tiet man hinh.
    """
    format: str = Field(..., pattern="^(pdf|docx|excel)$")
    options: ScreenExportOptions = ScreenExportOptions()
    template_style: str = Field("standard", pattern="^(standard|detailed|minimal)$")

