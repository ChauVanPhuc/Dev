from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException
from modules.production.models.production_team import ProductionTeam
from modules.production.models.production_routing import ProductionRouting, ProductionRoutingNode, ProductionRoutingComponent
from modules.production.schemas.production_routing_schema import (
    ProductionTeamCreate, ProductionRoutingCreate, ProductionRoutingComponentCreate
)

def delete_team(db: Session, team_id: int):
    team = db.query(ProductionTeam).filter(ProductionTeam.id == team_id).first()
    if team:
        db.query(ProductionRoutingNode).filter(ProductionRoutingNode.team_id == team_id).delete()
        db.delete(team)
        db.commit()
    return {"message": "Deleted successfully"}

# --- TEAMS CONTROLLERS ---
def get_all_teams(db: Session):
    return db.query(ProductionTeam).order_by(ProductionTeam.factory, ProductionTeam.id).all()

def create_team(db: Session, team_data: ProductionTeamCreate):
    existing = db.query(ProductionTeam).filter(ProductionTeam.team_code == team_data.team_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã tổ '{team_data.team_code}' đã tồn tại trong hệ thống!")
    
    new_team = ProductionTeam(
        team_code=team_data.team_code,
        team_name=team_data.team_name,
        factory=team_data.factory,
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
            "routing_code": r.routing_code,
            "routing_name": r.routing_name,
            "category": r.category,
            "is_default": r.is_default,
            "applied_count": r.applied_count,
            "description": r.description,
            "created_at": r.created_at,
            "nodes": nodes_res,
            "components": comps_res
        })
    return results

def add_team_to_routing(db: Session, routing_id: str, team_id: int):
    """Thêm một Tổ vào Quy trình (tạo routing node)"""
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

    # Tính step_order tiếp theo
    max_order = db.query(ProductionRoutingNode).filter(
        ProductionRoutingNode.routing_id == routing.id
    ).count()

    node = ProductionRoutingNode(
        routing_id=routing.id,
        team_id=team_id,
        step_order=max_order + 1,
        color=team.color or '#2D1A12'
    )
    db.add(node)
    db.commit()
    db.refresh(node)

    return {
        "id": node.id,
        "routing_id": node.routing_id,
        "team_id": node.team_id,
        "step_order": node.step_order,
        "team_code": team.team_code,
        "team_name": team.team_name,
        "factory": team.factory
    }

def create_routing(db: Session, data: ProductionRoutingCreate):
    existing = db.query(ProductionRouting).filter(ProductionRouting.routing_code == data.routing_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Mã quy trình '{data.routing_code}' đã tồn tại!")

    new_routing = ProductionRouting(
        routing_code=data.routing_code,
        routing_name=data.routing_name,
        category=data.category,
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
                step_order=idx + 1,
                color=team.color if team else '#2D1A12'
            )
            db.add(node)
        db.commit()

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
        category=source.category,
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
