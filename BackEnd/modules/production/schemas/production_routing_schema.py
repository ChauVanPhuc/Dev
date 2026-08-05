from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# --- TEAMS SCHEMAS ---
class ProductionTeamBase(BaseModel):
    team_code: str
    team_name: str
    factory: str
    members_count: Optional[int] = 10
    description: Optional[str] = None
    color: Optional[str] = '#2D1A12'

class ProductionTeamCreate(ProductionTeamBase):
    pass

class ProductionTeamResponse(ProductionTeamBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- ROUTING NODES SCHEMAS ---
class ProductionRoutingNodeBase(BaseModel):
    team_id: int
    step_order: int
    color: Optional[str] = None

class ProductionRoutingNodeResponse(BaseModel):
    id: int
    routing_id: int
    team_id: int
    step_order: int
    color: Optional[str] = None
    team_code: Optional[str] = None
    team_name: Optional[str] = None
    factory: Optional[str] = None

    class Config:
        from_attributes = True


# --- ROUTING COMPONENTS SCHEMAS ---
class ProductionRoutingComponentBase(BaseModel):
    team_code: str
    comp_code: str
    comp_name: str
    next_team_name: Optional[str] = None
    qc_required: Optional[bool] = True
    note: Optional[str] = None

class ProductionRoutingComponentCreate(ProductionRoutingComponentBase):
    routing_id: int

class ProductionRoutingComponentResponse(ProductionRoutingComponentBase):
    id: int
    routing_id: int

    class Config:
        from_attributes = True


# --- ROUTING SCHEMAS ---
class ProductionRoutingBase(BaseModel):
    routing_code: str
    routing_name: str
    category: Optional[str] = None
    category_id: Optional[int] = None
    is_default: Optional[bool] = False
    applied_count: Optional[int] = 0
    description: Optional[str] = None

class ProductionRoutingCreate(ProductionRoutingBase):
    node_team_ids: Optional[List[int]] = []
    auto_assign_products: Optional[bool] = False

class ProductionRoutingResponse(ProductionRoutingBase):
    id: int
    category_name: Optional[str] = None
    created_at: Optional[datetime] = None
    nodes: List[ProductionRoutingNodeResponse] = []
    components: List[ProductionRoutingComponentResponse] = []

    class Config:
        from_attributes = True
