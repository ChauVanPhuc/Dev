# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class SystemGuideBase(BaseModel):
    step_number: int
    title: str
    related_components: Optional[str] = None
    description: Optional[str] = None

class SystemGuideCreate(SystemGuideBase):
    pass

class SystemGuideUpdate(BaseModel):
    step_number: Optional[int] = None
    title: Optional[str] = None
    related_components: Optional[str] = None
    description: Optional[str] = None

class SystemGuide(SystemGuideBase):
    id: int
    screen_id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
