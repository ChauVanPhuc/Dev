from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SystemComponentBase(BaseModel):
    """
    Schema co ban cho Component cua man hinh.
    """
    name: str
    type: str # 'UI Component', 'Business Logic', 'Native API', 'API Endpoint'
    description: Optional[str] = None
    technical_details: Optional[str] = None
    file_path: Optional[str] = None
    is_active: bool = True

class SystemComponentCreate(SystemComponentBase):
    """
    Schema yeu cau khi tao moi component.
    """
    pass

class SystemComponentUpdate(BaseModel):
    """
    Schema yeu cau khi cap nhat component.
    """
    name: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    technical_details: Optional[str] = None
    file_path: Optional[str] = None
    is_active: Optional[bool] = None

class SystemComponent(SystemComponentBase):
    """
    Schema phan hoi day du thong tin component.
    """
    id: int
    screen_id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
