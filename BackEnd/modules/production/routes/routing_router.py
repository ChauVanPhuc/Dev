from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from modules.production.schemas.production_routing_schema import (
    ProductionTeamCreate, ProductionRoutingCreate, ProductionRoutingComponentCreate
)
from modules.production.controllers import routing_controller

router = APIRouter(prefix="/production", tags=["Production Routing & Teams"])

# --- TEAMS ENDPOINTS ---
@router.get("/teams")
def get_teams(db: Session = Depends(get_db)):
    """Lấy danh sách Master Data tất cả các Tổ sản xuất"""
    return routing_controller.get_all_teams(db)

@router.post("/teams")
def create_team(data: ProductionTeamCreate, db: Session = Depends(get_db)):
    """Tạo mới một Tổ sản xuất"""
    return routing_controller.create_team(db, data)

@router.delete("/teams/{team_id}")
def delete_team(team_id: int, db: Session = Depends(get_db)):
    """Xóa một Tổ sản xuất khỏi CSDL"""
    return routing_controller.delete_team(db, team_id)


# --- ROUTINGS ENDPOINTS ---
@router.get("/routings")
def get_routings(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả Quy trình sản xuất kèm danh sách Tổ và Linh kiện"""
    return routing_controller.get_all_routings(db)

@router.post("/routings")
def create_routing(data: ProductionRoutingCreate, db: Session = Depends(get_db)):
    """Tạo mới một Quy trình sản xuất"""
    return routing_controller.create_routing(db, data)

@router.post("/routings/{routing_id}/duplicate")
def duplicate_routing(routing_id: int, db: Session = Depends(get_db)):
    """Sao chép Quy trình sản xuất"""
    return routing_controller.duplicate_routing(db, routing_id)

@router.post("/routings/{routing_id}/nodes")
def add_team_to_routing(routing_id: str, body: dict, db: Session = Depends(get_db)):
    """Thêm một Tổ sản xuất vào Quy trình"""
    team_id = body.get("team_id")
    if not team_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Thiếu team_id!")
    return routing_controller.add_team_to_routing(db, routing_id, int(team_id))

@router.post("/routings/components")
def create_routing_component(data: ProductionRoutingComponentCreate, db: Session = Depends(get_db)):
    """Gán linh kiện cho Tổ trong Quy trình"""
    return routing_controller.create_component_item(db, data)

@router.delete("/routings/{routing_id}")
def delete_routing(routing_id: str, db: Session = Depends(get_db)):
    """Xóa một Quy trình sản xuất khỏi CSDL"""
    return routing_controller.delete_routing(db, routing_id)

@router.delete("/routings/{routing_id}/nodes/{team_ref}")
def delete_routing_node(routing_id: str, team_ref: str, db: Session = Depends(get_db)):
    """Xóa một Tổ khỏi Quy trình sản xuất"""
    return routing_controller.delete_routing_node(db, routing_id, team_ref)


# --- ROUTING PRODUCTS ENDPOINTS ---
@router.get("/routings/{routing_id}/products")
def get_routing_products(routing_id: str, db: Session = Depends(get_db)):
    """Lấy danh sách các sản phẩm đang được gán cho Quy trình"""
    return routing_controller.get_routing_products(db, routing_id)

@router.post("/routings/{routing_id}/products/assign")
def assign_products_to_routing(routing_id: str, body: dict, db: Session = Depends(get_db)):
    """Gán 1 hoặc nhiều sản phẩm (danh sách skus) vào Quy trình"""
    skus = body.get("skus", [])
    if isinstance(skus, str):
        skus = [skus]
    return routing_controller.assign_products_to_routing(db, routing_id, skus)

@router.delete("/routings/{routing_id}/products/{sku}")
def unassign_product_from_routing(routing_id: str, sku: str, db: Session = Depends(get_db)):
    """Gỡ 1 sản phẩm khỏi Quy trình sản xuất"""
    return routing_controller.unassign_product_from_routing(db, routing_id, sku)

