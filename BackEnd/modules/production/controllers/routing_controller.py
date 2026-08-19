from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from modules.production.models.production_team import ProductionTeam
from modules.production.models.production_routing import (
    ProductionRouting, ProductionRoutingNode, ProductionRoutingComponent, ProductionRoutingProduct
)
from modules.master.models.master_product import MasterProduct
from modules.production.schemas.production_routing_schema import (
    ProductionTeamCreate, ProductionRoutingCreate, ProductionRoutingComponentCreate
)


def delete_team(db: Session, team_id: str):
    team = None
    if str(team_id).isdigit():
        team = db.query(ProductionTeam).filter(ProductionTeam.id == int(team_id)).first()
    if not team:
        team = db.query(ProductionTeam).filter(ProductionTeam.team_code == str(team_id)).first()
    if team:
        db.query(ProductionRoutingNode).filter(ProductionRoutingNode.team_id == team.id).delete()
        db.delete(team)
        db.commit()
        return {"message": f"Deleted team {team.team_name} successfully"}
    return {"message": "Team not found"}

# --- TEAMS CONTROLLERS ---
def get_all_teams(db: Session):
    return db.query(ProductionTeam).order_by(ProductionTeam.factory, ProductionTeam.stage_id, ProductionTeam.id).all()

def create_team(db: Session, team_data: ProductionTeamCreate):
    existing = db.query(ProductionTeam).filter(ProductionTeam.team_code == team_data.team_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã tổ '{team_data.team_code}' đã tồn tại trong hệ thống!")
    
    stage_name = team_data.stage_name
    if team_data.stage_id and not stage_name:
        from modules.production.models.stages import Stage
        stg = db.query(Stage).filter(Stage.id == team_data.stage_id).first()
        if stg:
            stage_name = stg.name

    new_team = ProductionTeam(
        team_code=team_data.team_code,
        team_name=team_data.team_name,
        factory=team_data.factory,
        stage_id=team_data.stage_id,
        stage_name=stage_name,
        members_count=team_data.members_count or 10,
        description=team_data.description,
        color=team_data.color or '#2D1A12'
    )
    db.add(new_team)
    db.commit()
    db.refresh(new_team)

    return new_team


# --- ROUTINGS CONTROLLERS ---
def get_all_routings(db: Session):
    routings = db.query(ProductionRouting).all()
    results = []
    for r in routings:
        nodes_res = []
        for n in r.nodes:
            team = db.query(ProductionTeam).filter(ProductionTeam.id == n.team_id).first()
            if team:
                nodes_res.append({
                    "id": n.id,
                    "routing_id": n.routing_id,
                    "team_id": n.team_id,
                    "stage_id": team.stage_id or n.stage_id,
                    "stage_name": team.stage_name or n.stage_name,
                    "step_order": n.step_order,
                    "color": n.color or team.color or '#2D1A12',
                    "team_code": team.team_code,
                    "team_name": team.team_name,
                    "factory": team.factory
                })
        
        comps_res = [
            {
                "id": c.id,
                "routing_id": c.routing_id,
                "team_code": c.team_code,
                "comp_code": c.comp_code,
                "comp_name": c.comp_name,
                "next_team_name": c.next_team_name,
                "qc_required": c.qc_required,
                "note": c.note
            }
            for c in r.components
        ]

        results.append({
            "id": r.id,
            "code": r.routing_code,
            "name": r.routing_name,
            "routing_code": r.routing_code,
            "routing_name": r.routing_name,
            "line": getattr(r, "line", None) or r.category or "APT",
            "category": r.category,
            "category_id": r.category_id,
            "category_name": r.master_category.name if r.master_category else None,
            "is_default": r.is_default,
            "applied_count": r.applied_count,
            "description": r.description,
            "created_at": r.created_at,
            "nodes": nodes_res,
            "components": comps_res
        })
    return results

def add_team_to_routing(db: Session, routing_id: str, team_id: int):
    """Thêm một Tổ vào Quy trình (tạo routing node theo Nhà máy & Công đoạn)"""
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình!")

    team = db.query(ProductionTeam).filter(ProductionTeam.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Không tìm thấy Tổ sản xuất!")

    # Kiểm tra xem tổ đã tồn tại trong routing chưa
    existing_node = db.query(ProductionRoutingNode).filter(
        ProductionRoutingNode.routing_id == routing.id,
        ProductionRoutingNode.team_id == team_id
    ).first()
    if existing_node:
        raise HTTPException(status_code=400, detail="Tổ này đã tồn tại trong Quy trình!")

    # Tính step_order tiếp theo trong nội bộ Nhà máy đó
    existing_nodes = db.query(ProductionRoutingNode).filter(
        ProductionRoutingNode.routing_id == routing.id
    ).all()
    
    # Lấy các node cùng nhà máy
    same_factory_nodes = []
    for n in existing_nodes:
        t = db.query(ProductionTeam).filter(ProductionTeam.id == n.team_id).first()
        if t and t.factory == team.factory:
            same_factory_nodes.append(n)

    next_step = len(same_factory_nodes) + 1

    node = ProductionRoutingNode(
        routing_id=routing.id,
        team_id=team_id,
        stage_id=team.stage_id,
        stage_name=team.stage_name,
        step_order=next_step,
        color=team.color or '#2D1A12'
    )
    db.add(node)
    db.commit()
    db.refresh(node)

    return {
        "id": node.id,
        "routing_id": node.routing_id,
        "team_id": node.team_id,
        "stage_id": node.stage_id,
        "stage_name": node.stage_name,
        "step_order": node.step_order,
        "team_code": team.team_code,
        "team_name": team.team_name,
        "factory": team.factory
    }

def reorder_routing_nodes(db: Session, routing_id: str, factory: str, team_ids: list):
    """Cập nhật thứ tự step_order của các Tổ trong 1 Nhà máy thuộc Quy trình"""
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình!")

    if not team_ids:
        return get_all_routings(db)

    for idx, t_id in enumerate(team_ids):
        try:
            val = int(t_id)
            node = db.query(ProductionRoutingNode).filter(
                ProductionRoutingNode.routing_id == routing.id,
                (ProductionRoutingNode.team_id == val) | (ProductionRoutingNode.id == val)
            ).first()
            if node:
                node.step_order = idx + 1
        except Exception:
            continue
    db.commit()
    return get_all_routings(db)

def save_full_routing(db: Session, routing_id: str, payload: dict):
    """Lưu toàn bộ thông tin Quy trình và đồng bộ toàn bộ danh sách Tổ sản xuất (Nodes) theo đúng thứ tự"""
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình cần lưu!")

    # Cập nhật thông tin cơ bản
    if "routing_name" in payload and payload["routing_name"]:
        routing.routing_name = payload["routing_name"]
    if "line" in payload and payload["line"]:
        routing.line = payload["line"]
    if "category" in payload:
        routing.category = payload["category"]
    if "category_id" in payload:
        routing.category_id = payload["category_id"]
    if "description" in payload:
        routing.description = payload["description"]
    if "is_default" in payload:
        routing.is_default = payload["is_default"]

    # Đồng bộ Nodes (Tổ sản xuất và thứ tự step_order)
    if "nodes" in payload and isinstance(payload["nodes"], list):
        # Xóa các node cũ của quy trình
        db.query(ProductionRoutingNode).filter(ProductionRoutingNode.routing_id == routing.id).delete()
        
        # Thêm lại các node mới theo đúng thứ tự
        for idx, item in enumerate(payload["nodes"]):
            team_id = item.get("team_id") or item.get("teamId") or item.get("id")
            team_code = item.get("team_code") or item.get("teamCode")
            
            team = None
            if team_id and str(team_id).isdigit():
                team = db.query(ProductionTeam).filter(ProductionTeam.id == int(team_id)).first()
            if not team and team_code:
                team = db.query(ProductionTeam).filter(ProductionTeam.team_code == str(team_code)).first()
            
            if team:
                stg_id = team.stage_id or item.get("stage_id") or item.get("stageId")
                stg_name = team.stage_name or item.get("stage_name") or item.get("stageName")
                step_order = item.get("step_order") or item.get("stepOrder") or (idx + 1)
                color = item.get("color") or team.color or '#2D1A12'
                
                node = ProductionRoutingNode(
                    routing_id=routing.id,
                    team_id=team.id,
                    stage_id=stg_id,
                    stage_name=stg_name,
                    step_order=step_order,
                    color=color
                )
                db.add(node)

    db.commit()
    db.refresh(routing)
    return get_all_routings(db)

def create_routing(db: Session, data: ProductionRoutingCreate):
    existing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == data.routing_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã quy trình '{data.routing_code}' đã tồn tại!")

    new_routing = ProductionRouting(
        routing_code=data.routing_code,
        routing_name=data.routing_name,
        line=data.line or data.category or "APT",
        category=data.category,
        category_id=data.category_id,
        is_default=data.is_default,
        applied_count=data.applied_count or 0,
        description=data.description
    )
    db.add(new_routing)
    db.commit()
    db.refresh(new_routing)

    if data.node_team_ids:
        for idx, t_id in enumerate(data.node_team_ids):
            team = db.query(ProductionTeam).filter(ProductionTeam.id == t_id).first()
            node = ProductionRoutingNode(
                routing_id=new_routing.id,
                team_id=t_id,
                stage_id=team.stage_id if team else None,
                stage_name=team.stage_name if team else None,
                step_order=idx + 1,
                color=team.color if team else '#2D1A12'
            )
            db.add(node)
        db.commit()

    if data.auto_assign_products:
        if data.line:
            assign_products_by_line(db, str(new_routing.id), data.line)
        elif data.category_id:
            assign_products_by_category(db, str(new_routing.id), data.category_id)

    return get_all_routings(db)

def duplicate_routing(db: Session, routing_id: int):
    source = db.query(ProductionRouting).filter(ProductionRouting.id == routing_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình cần sao chép!")

    import time
    new_code = f"QT-COPY-{int(time.time())}"
    dup = ProductionRouting(
        routing_code=new_code,
        routing_name=f"{source.routing_name} (Bản sao)",
        line=getattr(source, "line", None) or source.category,
        category=source.category,
        category_id=source.category_id,
        is_default=False,
        applied_count=0,
        description=source.description
    )
    db.add(dup)
    db.commit()
    db.refresh(dup)

    for n in source.nodes:
        db.add(ProductionRoutingNode(
            routing_id=dup.id,
            team_id=n.team_id,
            stage_id=n.stage_id,
            stage_name=n.stage_name,
            step_order=n.step_order,
            color=n.color
        ))

    for c in source.components:
        db.add(ProductionRoutingComponent(
            routing_id=dup.id,
            team_code=c.team_code,
            comp_code=c.comp_code,
            comp_name=c.comp_name,
            next_team_name=c.next_team_name,
            qc_required=c.qc_required,
            note=c.note
        ))

    db.commit()
    return get_all_routings(db)

def create_component_item(db: Session, data: ProductionRoutingComponentCreate):
    comp = ProductionRoutingComponent(
        routing_id=data.routing_id,
        team_code=data.team_code,
        comp_code=data.comp_code,
        comp_name=data.comp_name,
        next_team_name=data.next_team_name,
        qc_required=data.qc_required,
        note=data.note
    )
    db.add(comp)
    db.commit()
    db.refresh(comp)
    return comp

def delete_routing(db: Session, routing_id: str):
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()

    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình cần xóa!")

    db.query(ProductionRoutingNode).filter(ProductionRoutingNode.routing_id == routing.id).delete()
    db.query(ProductionRoutingComponent).filter(ProductionRoutingComponent.routing_id == routing.id).delete()
    db.delete(routing)
    db.commit()
    return {"message": "Đã xóa Quy trình thành công"}

def delete_routing_node(db: Session, routing_id: str, team_ref: str):
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()

    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình!")

    nodes = db.query(ProductionRoutingNode).filter(ProductionRoutingNode.routing_id == routing.id).all()
    for n in nodes:
        team = db.query(ProductionTeam).filter(ProductionTeam.id == n.team_id).first()
        t_code = team.team_code if team else ""
        if str(n.id) == str(team_ref) or str(n.team_id) == str(team_ref) or t_code == str(team_ref):
            db.delete(n)
    db.commit()
    return get_all_routings(db)


# --- ROUTING PRODUCTS CONTROLLERS ---
def get_routing_products(db: Session, routing_id: str):
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        return []

    items = db.query(ProductionRoutingProduct).filter(ProductionRoutingProduct.routing_id == routing.id).all()
    return [
        {
            "id": i.id,
            "routing_id": i.routing_id,
            "routing_code": routing.routing_code,
            "product_sku": i.product_sku,
            "created_at": i.created_at
        }
        for i in items
    ]

def assign_products_to_routing(db: Session, routing_id: str, skus: list):
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình!")

    for sku in skus:
        existing = db.query(ProductionRoutingProduct).filter(ProductionRoutingProduct.product_sku == sku).first()
        if existing:
            existing.routing_id = routing.id
        else:
            db.add(ProductionRoutingProduct(routing_id=routing.id, product_sku=sku))
    
    db.commit()
    return get_routing_products(db, routing_id)

def assign_products_by_line(db: Session, routing_id: str, line_name: str):
    """Gán nhanh toàn bộ sản phẩm thuộc 1 Dòng hàng (BOM Master: APT, ATL, FOL...) vào Quy trình"""
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình!")

    clean_line = line_name.strip()
    products = db.query(MasterProduct).filter(
        (MasterProduct.sku.ilike(f"{clean_line}%")) |
        (MasterProduct.brand_name == clean_line) |
        (MasterProduct.name.ilike(f"%{clean_line}%"))
    ).all()

    skus = [p.sku for p in products]
    if skus:
        assign_products_to_routing(db, routing_id, skus)
    return get_routing_products(db, routing_id)

def assign_products_by_category(db: Session, routing_id: str, category_id: int):
    """Gán nhanh TOÀN BỘ sản phẩm mẫu thuộc 1 Danh mục (category_id) vào Quy trình"""
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình!")

    skus = [p.sku for p in db.query(MasterProduct.sku).filter(MasterProduct.category_id == category_id).all()]
    if not skus:
        return get_routing_products(db, routing_id)

    return assign_products_to_routing(db, routing_id, skus)

def unassign_product_from_routing(db: Session, routing_id: str, sku: str):
    routing = None
    if str(routing_id).isdigit():
        routing = db.query(ProductionRouting).filter(ProductionRouting.id == int(routing_id)).first()
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == str(routing_id)).first()
    if not routing:
        raise HTTPException(status_code=404, detail="Không tìm thấy Quy trình!")

    db.query(ProductionRoutingProduct).filter(
        ProductionRoutingProduct.routing_id == routing.id,
        ProductionRoutingProduct.product_sku == sku
    ).delete()
    db.commit()
    return {"message": f"Đã gỡ sản phẩm {sku} khỏi quy trình"}

def sync_teams_from_system(db: Session):
    """Đồng bộ / Khởi tạo danh mục Tổ sản xuất chuẩn từ Cấu hình Hệ thống cho từng Nhà máy"""
    from modules.hr.models.hr_models import HRFactoryStructure
    db_facs = db.query(HRFactoryStructure).filter(HRFactoryStructure.structure_type == "Nhà máy").all()
    fac_map = {f.structure_code: f.structure_name for f in db_facs}

    default_teams = [
        # Phân Xưởng 1: Gỗ tự nhiên (5 Tổ)
        {"team_code": "TO-NM1-PHOI", "team_name": "Tổ Tạo phôi 1", "fac_code": "NM1", "default_fac": "Vaniti Phân Xưởng 1", "desc": "Tạo phôi thô & xẻ sấy gỗ tự nhiên", "color": "#2D1A12", "members": 15},
        {"team_code": "TO-NM1-DINHHINH", "team_name": "Tổ Định hình 1", "fac_code": "NM1", "default_fac": "Vaniti Phân Xưởng 1", "desc": "Bào, phay, định hình CNC & mộng mòi", "color": "#8B5E3C", "members": 20},
        {"team_code": "TO-NM1-LAPRAP", "team_name": "Tổ Lắp ráp 1", "fac_code": "NM1", "default_fac": "Vaniti Phân Xưởng 1", "desc": "Lắp ráp khung mộc & kết cấu chi tiết", "color": "#3B82F6", "members": 18},
        {"team_code": "TO-NM1-SON", "team_name": "Tổ Sơn PU 1", "fac_code": "NM1", "default_fac": "Vaniti Phân Xưởng 1", "desc": "Chà nhám lót, sơn lót, tạo màu & phủ bóng PU", "color": "#D97706", "members": 25},
        {"team_code": "TO-NM1-DONGGOI", "team_name": "Tổ Đóng gói 1", "fac_code": "NM1", "default_fac": "Vaniti Phân Xưởng 1", "desc": "Kiểm định QC, bọc xốp & đóng thùng carton", "color": "#059669", "members": 12},

        # Phân Xưởng 2: Ván công nghiệp MDF/MFC (4 Tổ)
        {"team_code": "TO-NM2-CATCNC", "team_name": "Tổ Cắt xẻ CNC 2", "fac_code": "NM2", "default_fac": "Vaniti Phân Xưởng 2", "desc": "Cắt tấm ván công nghiệp MDF tự động", "color": "#1E3A8A", "members": 14},
        {"team_code": "TO-NM2-DANNEP", "team_name": "Tổ Dán nẹp & Khoan 2", "fac_code": "NM2", "default_fac": "Vaniti Phân Xưởng 2", "desc": "Dán cạnh chỉ PVC & khoan chốt cam liên kết", "color": "#047857", "members": 16},
        {"team_code": "TO-NM2-LAPRAP", "team_name": "Tổ Lắp ráp Module 2", "fac_code": "NM2", "default_fac": "Vaniti Phân Xưởng 2", "desc": "Lắp ráp module, ray trượt & bản lề", "color": "#7C3AED", "members": 22},
        {"team_code": "TO-NM2-DONGGOI", "team_name": "Tổ Đóng gói Flat-pack 2", "fac_code": "NM2", "default_fac": "Vaniti Phân Xưởng 2", "desc": "Đóng gói phụ kiện & flat-pack xuất khẩu", "color": "#B45309", "members": 15},

        # Phân Xưởng 3: Cơ khí & Nệm Sofa (5 Tổ)
        {"team_code": "TO-NM3-CATUON", "team_name": "Tổ Cắt & Uốn sắt 3", "fac_code": "NM3", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Cắt, uốn ống kim loại & sắt hộp", "color": "#475569", "members": 10},
        {"team_code": "TO-NM3-HAN", "team_name": "Tổ Hàn khung 3", "fac_code": "NM3", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Hàn CO2, hàn TIG định hình khung kim loại", "color": "#DC2626", "members": 14},
        {"team_code": "TO-NM3-SONTD", "team_name": "Tổ Sơn tĩnh điện 3", "fac_code": "NM3", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Xử lý bề mặt hóa chất & phun sơn sấy tĩnh điện", "color": "#D97706", "members": 16},
        {"team_code": "TO-NM3-NEM", "team_name": "Tổ May & Bọc nệm 3", "fac_code": "NM3", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Cắt mút, may da/vải nỉ & bọc đệm sofa", "color": "#9333EA", "members": 18},
        {"team_code": "TO-NM3-DONGGOI", "team_name": "Tổ Đóng gói 3", "fac_code": "NM3", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Bọc màng PE chống trầy & đóng thùng", "color": "#059669", "members": 12},

        # Phân Xưởng Phụ trợ (3 Tổ)
        {"team_code": "TO-NM4-LAPRAP", "team_name": "Tổ Lắp ráp 4", "fac_code": "VP", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Gia công lắp ráp chi tiết phụ trợ", "color": "#3B82F6", "members": 10},
        {"team_code": "TO-NM4-SON", "team_name": "Tổ Sơn hoàn thiện 4", "fac_code": "VP", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Sơn dặm vá & đánh bóng", "color": "#EA580C", "members": 12},
        {"team_code": "TO-NM4-DONGGOI", "team_name": "Tổ Đóng gói 4", "fac_code": "VP", "default_fac": "Vaniti Phân Xưởng 3", "desc": "Đóng gói & lưu kho thành phẩm", "color": "#16A34A", "members": 8}
    ]

    added = 0
    for dt in default_teams:
        fac_name = fac_map.get(dt["fac_code"], dt["default_fac"])
        exist = db.query(ProductionTeam).filter(ProductionTeam.team_code == dt["team_code"]).first()
        if not exist:
            new_t = ProductionTeam(
                team_code=dt["team_code"],
                team_name=dt["team_name"],
                factory=fac_name,
                description=dt["desc"],
                color=dt["color"],
                members_count=dt["members"]
            )
            db.add(new_t)
            added += 1
        else:
            exist.factory = fac_name
    db.commit()
    return {"message": f"Đã đồng bộ {added} Tổ sản xuất mới vào hệ thống", "teams": get_all_teams(db)}


def resolve_routing_for_product(db: Session, sku: str = None, line: str = None, category_id: int = None, factory: str = None):
    """
    Tra cứu Quy trình sản xuất phù hợp nhất cho 1 sản phẩm:
    1. Tra theo SKU trong ProductionRoutingProduct
    2. Tra theo Dòng sản phẩm (line/brand_name)
    3. Tra theo Category (category_id)
    4. Lấy Quy trình mặc định (is_default) hoặc đầu tiên
    """
    from itertools import groupby
    routing = None
    matched_by = "default"

    # 1. Tra theo SKU
    if sku:
        clean_sku = sku.strip()
        assigned = db.query(ProductionRoutingProduct).filter(ProductionRoutingProduct.product_sku == clean_sku).first()
        if assigned:
            routing = db.query(ProductionRouting).filter(ProductionRouting.id == assigned.routing_id).first()
            if routing:
                matched_by = "product_sku"

    # 2. Tra theo Dòng sản phẩm (Line) hoặc tiền tố SKU
    if not routing:
        target_line = line
        if not target_line and sku:
            parts = sku.split("-")
            if len(parts) > 1 and len(parts[0]) >= 2:
                target_line = parts[0].strip()
        
        if target_line:
            clean_line = target_line.strip()
            routing = db.query(ProductionRouting).filter(
                (ProductionRouting.line.ilike(f"%{clean_line}%")) |
                (ProductionRouting.category.ilike(f"%{clean_line}%")) |
                (ProductionRouting.routing_name.ilike(f"%{clean_line}%"))
            ).first()
            if routing:
                matched_by = "line"

    # 3. Tra theo Category ID
    if not routing and category_id:
        routing = db.query(ProductionRouting).filter(ProductionRouting.category_id == category_id).first()
        if routing:
            matched_by = "category"

    # 4. Lấy Quy trình mặc định hoặc đầu tiên
    if not routing:
        routing = db.query(ProductionRouting).filter(ProductionRouting.is_default == True).first()
        if not routing:
            routing = db.query(ProductionRouting).first()

    if not routing:
        return {"matched_by": "none", "routing": None, "clusters": [], "stages": [], "clusters_by_factory": {}, "all_nodes": []}

    # Format nodes và gom nhóm thành clusters theo Stage
    nodes_res = []
    for n in routing.nodes:
        team = db.query(ProductionTeam).filter(ProductionTeam.id == n.team_id).first()
        if team:
            nodes_res.append({
                "id": n.id,
                "routing_id": n.routing_id,
                "team_id": n.team_id,
                "stage_id": n.stage_id or team.stage_id,
                "stage_name": n.stage_name or team.stage_name or "Gia công",
                "step_order": n.step_order,
                "color": n.color or team.color or '#2D1A12',
                "team_code": team.team_code,
                "team_name": team.team_name,
                "factory": team.factory or "NM1"
            })

    # Gom theo Factory và theo Stage
    nodes_res.sort(key=lambda x: (x.get("factory") or "NM1", x.get("step_order") or 0))

    clusters_by_factory = {}
    for fac, group in groupby(nodes_res, key=lambda x: x.get("factory") or "NM1"):
        fac_nodes = list(group)
        fac_clusters = []
        for stage_name, s_group in groupby(fac_nodes, key=lambda x: x.get("stage_name") or "Gia công"):
            s_nodes = list(s_group)
            fac_clusters.append({
                "stage_name": stage_name,
                "stage_id": s_nodes[0].get("stage_id") if s_nodes else None,
                "color": s_nodes[0].get("color") if s_nodes else '#5D3B32',
                "nodes": s_nodes
            })
        clusters_by_factory[fac] = fac_clusters

    # Tìm factory tương ứng
    target_fac = factory or "NM1"
    matched_clusters = clusters_by_factory.get(target_fac)
    if not matched_clusters and clusters_by_factory:
        # Match theo tiền tố (VD: "NM1" match "Vaniti Phân Xưởng 1" hoặc ngược lại)
        for f_key, f_val in clusters_by_factory.items():
            if target_fac in f_key or f_key in target_fac or ("1" in target_fac and "1" in f_key) or ("2" in target_fac and "2" in f_key) or ("3" in target_fac and "3" in f_key):
                matched_clusters = f_val
                break
        if not matched_clusters:
            matched_clusters = next(iter(clusters_by_factory.values()))

    stages_list = [c["stage_name"] for c in (matched_clusters or [])]

    return {
        "matched_by": matched_by,
        "routing": {
            "id": routing.id,
            "code": routing.routing_code,
            "name": routing.routing_name,
            "line": getattr(routing, "line", None) or routing.category or "APT",
            "category_id": routing.category_id,
            "is_default": routing.is_default,
        },
        "clusters": matched_clusters or [],
        "clusters_by_factory": clusters_by_factory,
        "stages": stages_list,
        "all_nodes": nodes_res
    }


