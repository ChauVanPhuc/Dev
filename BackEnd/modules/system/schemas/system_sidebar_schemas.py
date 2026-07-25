from typing import List, Optional
from pydantic import BaseModel, ConfigDict

class SidebarBase(BaseModel):
    platform: str
    parent_id: Optional[int] = None
    title: str
    route_path: Optional[str] = None
    icon: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True
    permission_key: Optional[str] = None
    screen_id: Optional[int] = None

class SidebarCreate(SidebarBase):
    pass

class SidebarUpdate(BaseModel):
    platform: Optional[str] = None
    parent_id: Optional[int] = None
    title: Optional[str] = None
    route_path: Optional[str] = None
    icon: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None
    permission_key: Optional[str] = None
    screen_id: Optional[int] = None

class SidebarResponse(SidebarBase):
    id: int
    children: List['SidebarResponse'] = []

    model_config = ConfigDict(from_attributes=True)

class SidebarReorderItem(BaseModel):
    id: int
    parent_id: Optional[int] = None
    sort_order: int

class SidebarReorderRequest(BaseModel):
    items: List[SidebarReorderItem]
