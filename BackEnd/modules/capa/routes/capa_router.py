from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from datetime import datetime

from config.database import get_db
from modules.capa.models.capa import CAPA
from modules.capa.schemas.capa import CAPACreate, CAPAUpdate, CAPAResponse

router = APIRouter()

def seed_capas_if_empty(db: Session):
    count = db.query(CAPA).count()
    if count > 0:
        return

    sample_capas = [
        CAPA(
            code="CAPA-01",
            created_at_time="16:40 | 22/1/2026",
            creator_name="Trần Thị B",
            handler_name="Ngô Diễm My",
            urgency="Nghiêm trọng",
            scope="Sản phẩm lỗi",
            issue_description="Vi phạm quy trình sản xuất, làm cong vênh sản phẩm đơn hàng T48s",
            images=json.dumps([
                "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=300",
                "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=300"
            ]),
            evaluator_name="Nguyễn Văn A",
            evaluation_time="10:00 | 23/1/2026",
            ticket_status="Đang theo dõi",
            tab_status="tracking",
            causes_json=json.dumps([
                {
                    "direct_cause": "Do con người: Công nhân thao tác sai quy trình",
                    "whys": ["Chưa được đào tạo kỹ bước lắp phôi", "Tài liệu SOP thiếu hình ảnh minh họa"]
                }
            ]),
            corrective_actions_json=json.dumps([
                {
                    "stt": 1,
                    "action": "Tái đào tạo quy trình ghép phôi cho công nhân",
                    "time": "23/01/2026",
                    "handler": "Ngô Diễm My"
                }
            ]),
            preventive_plans_json=json.dumps([
                {
                    "stt": 1,
                    "action": "Cập nhật tài liệu SOP kèm hình ảnh trực quan tại chuyền",
                    "performer": "Ngô Diễm My",
                    "deadline": "30/01/2026",
                    "expected_result": "100% công nhân nắm rõ quy trình"
                }
            ]),
            evaluations_json=json.dumps([
                {
                    "id": 1,
                    "content": "Kiểm tra thao tác lụa phôi tại chuyền",
                    "execution_date": "24/01/2026",
                    "executor": "Nguyễn Văn A",
                    "result": "Pass",
                    "notes": "Công nhân tuân thủ đúng SOP mới"
                }
            ])
        ),
        CAPA(
            code="CAPA-02",
            created_at_time="16:45 | 22/1/2026",
            creator_name="Đặng Văn Nam",
            handler_name="Nguyễn Văn A",
            urgency="Bình thường",
            scope="Quy trình",
            issue_description="Sơn lót không đồng màu giữa các lô phôi gỗ sồi",
            images=json.dumps([]),
            evaluator_name="Hà Minh Xuân",
            evaluation_time="14:20 | 23/1/2026",
            ticket_status="Vừa tạo",
            tab_status="tracking",
            causes_json=json.dumps([
                {
                    "direct_cause": "Do nguyên vật liệu: Tỉ lệ pha dung môi chưa chính xác",
                    "whys": ["Cốc đo dung tích bị mờ vạch chia"]
                }
            ]),
            corrective_actions_json=json.dumps([]),
            preventive_plans_json=json.dumps([]),
            evaluations_json=json.dumps([])
        ),
        CAPA(
            code="CAPA-03",
            created_at_time="09:15 | 15/1/2026",
            creator_name="Phạm Minh C",
            handler_name="Trần Thị B",
            urgency="Nhẹ",
            scope="Khiếu nại từ KH",
            issue_description="Tem mã vạch bị dán nhầm vị trí góc thùng hàng",
            images=json.dumps([]),
            evaluator_name="Ngô Diễm My",
            evaluation_time="11:00 | 18/1/2026",
            ticket_status="Đạt (đóng CAPA)",
            tab_status="history",
            causes_json=json.dumps([]),
            corrective_actions_json=json.dumps([]),
            preventive_plans_json=json.dumps([]),
            evaluations_json=json.dumps([])
        )
    ]
    db.add_all(sample_capas)
    db.commit()

@router.get("/", response_model=dict)
def get_capas(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    tab_status: Optional[str] = Query(None, description="tracking hoặc history"),
    month: Optional[str] = Query(None, description="Lọc theo tháng e.g. 07 hoặc Tháng 7"),
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách CAPA (CL10.1) phân trang, tìm kiếm & bộ lọc Tab
    """
    seed_capas_if_empty(db)
    
    query = db.query(CAPA)
    
    if tab_status:
        query = query.filter(CAPA.tab_status == tab_status)
        
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (CAPA.code.like(search_fmt)) |
            (CAPA.issue_description.like(search_fmt)) |
            (CAPA.creator_name.like(search_fmt)) |
            (CAPA.handler_name.like(search_fmt))
        )

    total = query.count()
    items = query.order_by(CAPA.id.desc()).offset(skip).limit(limit).all()
    
    # Đếm số lượng CAPA đang theo dõi cho Badge Tab
    tracking_count = db.query(CAPA).filter(CAPA.tab_status == "tracking").count()
    history_count = db.query(CAPA).filter(CAPA.tab_status == "history").count()

    items_data = []
    for item in items:
        items_data.append({
            "id": item.id,
            "code": item.code,
            "created_at_time": item.created_at_time,
            "creator_name": item.creator_name,
            "handler_name": item.handler_name,
            "urgency": item.urgency,
            "scope": item.scope,
            "issue_description": item.issue_description,
            "ticket_status": item.ticket_status,
            "tab_status": item.tab_status,
            "images": item.images,
            "evaluator_name": item.evaluator_name,
            "evaluation_time": item.evaluation_time
        })

    return {
        "items": items_data,
        "total": total,
        "skip": skip,
        "limit": limit,
        "tracking_count": tracking_count,
        "history_count": history_count
    }

@router.get("/{capa_id}", response_model=dict)
def get_capa_detail(capa_id: int, db: Session = Depends(get_db)):
    """
    [GET] Chi tiết CAPA (CL10.2) bao gồm 3 Tab thông tin
    """
    c = db.query(CAPA).filter(CAPA.id == capa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo CAPA")
        
    return {
        "id": c.id,
        "code": c.code,
        "created_at_time": c.created_at_time,
        "creator_name": c.creator_name,
        "handler_name": c.handler_name,
        "urgency": c.urgency,
        "scope": c.scope,
        "issue_description": c.issue_description,
        "images": c.images or "[]",
        "evaluator_name": c.evaluator_name,
        "evaluation_time": c.evaluation_time,
        "ticket_status": c.ticket_status,
        "tab_status": c.tab_status,
        "causes_json": c.causes_json or "[]",
        "corrective_actions_json": c.corrective_actions_json or "[]",
        "preventive_plans_json": c.preventive_plans_json or "[]",
        "evaluations_json": c.evaluations_json or "[]"
    }

from modules.notification.models.notifications import Notification
from modules.auth.models.accounts import Account as AccountModel

def trigger_capa_notification(db: Session, capa_code: str, creator: str, handler: str, status: str, capa_id: int = None):
    try:
        admin = db.query(AccountModel).first()
        announcer_id = admin.id if admin else 1
        notif_text = f"Báo cáo CAPA [{capa_code}] từ {creator} đã được chuyển cho {handler} (Trạng thái: {status})"
        notif = Notification(
            content=notif_text,
            announcer_id=announcer_id,
            target_group="Toàn công ty",
            priority_status="Quan trọng"
        )
        db.add(notif)
        db.commit()

        # Gửi Push Notification kèm Deep-link
        from shared.services.notification_service import send_push_to_group
        route_link = f"/capa-detail/{capa_id}" if capa_id else "/capa-list"
        send_push_to_group(
            db=db,
            target_group="QC",
            title=f"🛠️ [CAPA Update] {capa_code}",
            body=f"Người phụ trách: {handler} | Trạng thái: {status}",
            route_path=route_link
        )
    except Exception as e:
        print("Capa Notification Error:", e)

@router.post("/", response_model=dict)
def create_capa(payload: CAPACreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới phiếu CAPA
    """
    # Tự động sinh mã nếu chưa có hoặc có định dạng cũ CAPA-xx
    if not payload.code or payload.code.startswith("CAPA-"):
        count = db.query(CAPA).count() + 1
        payload.code = f"G7.CAPA.{count:03d}"
        
    if not payload.created_at_time:
        now_str = datetime.now().strftime("%H:%M | %d/%m/%Y")
        payload.created_at_time = now_str
        
    # Mặc định ticket_status là "Mở" nếu không truyền
    status_val = payload.ticket_status or "Mở"
    tab_val = "history" if status_val == "Đóng" else "tracking"

    new_capa = CAPA(
        code=payload.code,
        created_at_time=payload.created_at_time,
        creator_name=payload.creator_name,
        handler_name=payload.handler_name,
        urgency=payload.urgency or "Bình thường",
        scope=payload.scope or "Sản phẩm lỗi",
        issue_description=payload.issue_description,
        images=payload.images or "[]",
        evaluator_name=payload.evaluator_name,
        evaluation_time=payload.evaluation_time,
        ticket_status=status_val,
        tab_status=tab_val,
        causes_json=payload.causes_json or "[]",
        corrective_actions_json=payload.corrective_actions_json or "[]",
        preventive_plans_json=payload.preventive_plans_json or "[]",
        evaluations_json=payload.evaluations_json or "[]"
    )
    db.add(new_capa)
    db.commit()
    db.refresh(new_capa)

    trigger_capa_notification(db, new_capa.code, new_capa.creator_name, new_capa.handler_name, new_capa.ticket_status, new_capa.id)

    return {"status": "success", "id": new_capa.id, "code": new_capa.code, "message": "Tạo báo cáo CAPA thành công"}

@router.put("/{capa_id}", response_model=dict)
def update_capa(capa_id: int, payload: CAPAUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin CAPA (Thông tin chung, 5-Why, Hành động, Kế hoạch)
    """
    c = db.query(CAPA).filter(CAPA.id == capa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo CAPA")
        
    for field, val in payload.dict(exclude_unset=True).items():
        if val is not None:
            setattr(c, field, val)

    # Cập nhật tab_status tự động nếu ticket_status chuyển thành "Đóng" hoặc "Đạt (đóng CAPA)"
    if c.ticket_status in ["Đóng", "Đạt (đóng CAPA)"]:
        c.tab_status = "history"
    else:
        c.tab_status = "tracking"

    db.commit()

    trigger_capa_notification(db, c.code, c.creator_name, c.handler_name, c.ticket_status, c.id)

    return {"status": "success", "id": c.id, "message": "Cập nhật báo cáo CAPA thành công"}

@router.delete("/{capa_id}", response_model=dict)
def delete_capa(capa_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa báo cáo CAPA
    """
    c = db.query(CAPA).filter(CAPA.id == capa_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo CAPA")
        
    db.delete(c)
    db.commit()
    return {"status": "success", "message": "Đã xóa báo cáo CAPA"}
