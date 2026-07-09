from pydantic import BaseModel
from typing import Optional

class CheckListBase(BaseModel):
    content: str
    status:  Optional[str] = None

class CheckListCreate(CheckListBase):
    pass

class CheckListUpdate(CheckListBase):
    content: Optional[str] = None

class CheckList(CheckListBase):
    id: int

    class Config:
        from_attributes = True
