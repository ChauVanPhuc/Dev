from pydantic import BaseModel
from typing import Optional

class KPIBase(BaseModel):
    content: str
    target:  Optional[float] = None
    actual:  Optional[float] = None
    status:  Optional[str] = None
    period_type: Optional[str] = None
    period_name: Optional[str] = None

class KPICreate(KPIBase):
    pass

class KPIUpdate(KPIBase):
    content: Optional[str] = None

class KPI(KPIBase):
    id: int

    class Config:
        from_attributes = True
