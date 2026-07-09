from pydantic import BaseModel
from typing import Optional

class DepartmentBase(BaseModel):
    """
    Schema cơ bản cho Phòng ban.
    """
    name: str                   # Tên phòng ban
    description: Optional[str] = None # Mô tả phòng ban
    input_stage: Optional[str] = None # Công đoạn đầu vào
    output_stage: Optional[str] = None # Công đoạn đầu ra

class DepartmentCreate(DepartmentBase):
    """
    Schema dùng để tạo mới một phòng ban.
    """
    pass

class Department(DepartmentBase):
    """
    Schema hiển thị thông tin phòng ban hoàn chỉnh (bao gồm ID).
    """
    id: int

    class Config:
        from_attributes = True
