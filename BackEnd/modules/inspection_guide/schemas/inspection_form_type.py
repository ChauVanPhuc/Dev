# -*- coding: utf-8 -*-
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class InspectionFormTypeBase(BaseModel):
    code: str
    name: str
    short_name: Optional[str] = None
    description: Optional[str] = None
    route_path: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = '#0284C7'
    bg_color: Optional[str] = '#F0F9FF'
    display_order: Optional[int] = 0
    is_active: Optional[bool] = True


class InspectionFormTypeCreate(InspectionFormTypeBase):
    pass


class InspectionFormTypeUpdate(BaseModel):
    name: Optional[str] = None
    short_name: Optional[str] = None
    description: Optional[str] = None
    route_path: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    bg_color: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class InspectionFormTypeOut(InspectionFormTypeBase):
    id: int
    is_system: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
