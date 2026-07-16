# -*- coding: utf-8 -*-
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ScreenBugImageResponse(BaseModel):
    id: int
    bug_id: Optional[int] = None
    update_id: Optional[int] = None
    image_path: str
    created_at: datetime

    class Config:
        from_attributes = True

class ScreenBugUpdateResponse(BaseModel):
    id: int
    bug_id: int
    status: Optional[str] = None
    assignee: Optional[str] = None
    notes: Optional[str] = None
    updater: Optional[str] = None
    created_at: datetime
    images: List[ScreenBugImageResponse] = []

    class Config:
        from_attributes = True

class ScreenBugBase(BaseModel):
    screen_id: int
    description: str
    severity: str = "Medium" # Critical, High, Medium, Low
    status: str = "Mới" # Mới, Sửa lại, Đã sửa, Hoàn thành
    assignee: Optional[str] = None
    reporter: Optional[str] = None
    requested_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

class ScreenBugCreate(BaseModel):
    screen_id: int
    description: str
    severity: str = "Medium"
    status: str = "Mới"
    assignee: Optional[str] = None
    reporter: Optional[str] = None
    requested_at: datetime
    notes: Optional[str] = None
    image_paths: Optional[List[str]] = None

class ScreenBugUpdate(BaseModel):
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assignee: Optional[str] = None
    requested_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    image_paths: Optional[List[str]] = None
    updater: Optional[str] = None

class ScreenBugResponse(ScreenBugBase):
    id: int
    created_at: datetime
    
    # Extra fields loaded from screen join
    screen_code: Optional[str] = None
    screen_title: Optional[str] = None
    platform: Optional[str] = None

    images: List[ScreenBugImageResponse] = []
    updates: List[ScreenBugUpdateResponse] = []

    class Config:
        from_attributes = True
