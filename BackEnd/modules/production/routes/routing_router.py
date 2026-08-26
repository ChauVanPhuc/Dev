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

@router.put("/teams/{team_id}")
def update_team(team_id: str, data: ProductionTeamCreate, db: Session = Depends(get_db)):
    """Cập nhật thông tin một Tổ sản xuất"""
    return routing_controller.update_team(db, team_id, data)

@router.post("/teams/sync-from-system")
def sync_teams(db: Session = Depends(get_db)):
    """Đồng bộ / Khởi tạo Master Data các Tổ sản xuất chuẩn theo từng Nhà máy từ Hệ thống"""
    return routing_controller.sync_teams_from_system(db)

@router.delete("/teams/{team_id}")
def delete_team(team_id: str, db: Session = Depends(get_db)):
    """Xóa một Tổ sản xuất khỏi CSDL"""
    return routing_controller.delete_team(db, team_id)


# --- ROUTINGS ENDPOINTS ---
@router.get("/routings/next-code")
def get_next_routing_code(db: Session = Depends(get_db)):
    """Trả về mã Quy trình tự tăng tiếp theo dạng QTSX-xx"""
    from modules.production.models.production_routing import ProductionRouting
    from sqlalchemy import func
    max_id = db.query(func.max(ProductionRouting.id)).scalar() or 0
    next_num = max_id + 1
    return {"next_code": f"QTSX-{str(next_num).zfill(2)}", "next_num": next_num}

@router.get("/routings/resolve")
def resolve_routing(
    sku: str = None,
    line: str = None,
    category_id: int = None,
    factory: str = None,
    db: Session = Depends(get_db)
):
    """Tra cứu Quy trình phù hợp nhất cho 1 sản phẩm / dòng hàng / nhà máy"""
    return routing_controller.resolve_routing_for_product(db, sku, line, category_id, factory)

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

@router.put("/routings/{routing_id}/save-full")
def save_full_routing(routing_id: str, body: dict, db: Session = Depends(get_db)):
    """Lưu toàn bộ thông tin Quy trình và đồng bộ toàn bộ danh sách Tổ sản xuất (Nodes) theo đúng thứ tự"""
    return routing_controller.save_full_routing(db, routing_id, body)

@router.put("/routings/{routing_id}")
def update_routing(routing_id: str, body: dict, db: Session = Depends(get_db)):
    """Cập nhật thông tin Quy trình"""
    return routing_controller.save_full_routing(db, routing_id, body)

@router.put("/routings/{routing_id}/nodes/reorder")
def reorder_routing_nodes(routing_id: str, body: dict, db: Session = Depends(get_db)):
    """Cập nhật thứ tự các Tổ trong một Nhà máy thuộc Quy trình"""
    factory = body.get("factory", "")
    team_ids = body.get("team_ids") or body.get("ordered_node_ids") or body.get("node_ids") or []
    return routing_controller.reorder_routing_nodes(db, routing_id, factory, team_ids)

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

@router.post("/routings/{routing_id}/products/assign-by-line")
def assign_products_by_line(routing_id: str, body: dict, db: Session = Depends(get_db)):
    """Gán nhanh toàn bộ sản phẩm thuộc 1 Dòng hàng (BOM Master: APT, ATL, FOL...) vào Quy trình"""
    line = body.get("line")
    if not line:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Thiếu tên dòng hàng (line)!")
    return routing_controller.assign_products_by_line(db, routing_id, str(line))

@router.post("/routings/{routing_id}/products/assign-by-category")
def assign_products_by_category(routing_id: str, body: dict, db: Session = Depends(get_db)):
    """Gán nhanh toàn bộ sản phẩm thuộc 1 Danh mục (category_id) vào Quy trình"""
    category_id = body.get("category_id")
    if not category_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Thiếu category_id!")
    return routing_controller.assign_products_by_category(db, routing_id, int(category_id))

@router.delete("/routings/{routing_id}/products/{sku}")
def unassign_product_from_routing(routing_id: str, sku: str, db: Session = Depends(get_db)):
    """Gỡ 1 sản phẩm khỏi Quy trình sản xuất"""
    return routing_controller.unassign_product_from_routing(db, routing_id, sku)

