import io
import os
from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from modules.system.models.system_screen import SystemScreen as SystemScreenModel
from modules.system.schemas.system_screen import ScreenExportOptions
from modules.system.services.export_template_engine import fill_template


TEMPLATE_BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "templates", "screen_export")
)


def get_template_path(format: str, template_style: str) -> str:
    """
    Lay duong dan file template dua tren dinh dang va style.
    """
    style_dir = os.path.join(TEMPLATE_BASE_DIR, template_style)
    
    if format == "pdf":
        filename = "screen_detail_base.pdf"
    elif format == "docx":
        if template_style == "detailed":
            filename = "screen_detail_full.docx"
        else:
            filename = "screen_detail.docx"
    elif format == "excel":
        if template_style == "detailed":
            filename = "screen_detail_full.xlsx"
        elif template_style == "minimal":
            filename = "screen_detail_simple.xlsx"
        else:
            filename = "screen_detail.xlsx"
    else:
        raise ValueError(f"Dinh dang khong duoc ho tro: {format}")
    
    template_path = os.path.join(style_dir, filename)
    
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Khong tim thay template: {template_path}")
    
    return template_path


def collect_screen_data(screen: SystemScreenModel, options: ScreenExportOptions) -> dict:
    """
    Thu thap du lieu man hinh theo tuy chon.
    Tra ve dict voi key 'context' (static fields) va 'components'/'guides'/'bugs' (lists).
    """
    data = {
        "context": {},
        "components": [],
        "guides": [],
        "bugs": [],
    }
    
    if options.include_basic_info:
        data["context"].update({
            "screen_code": screen.current_code or screen.default_code,
            "default_code": screen.default_code,
            "screen_title": screen.title,
            "screen_subtitle": screen.subtitle or "",
            "platform": screen.platform,
            "route_path": screen.route_path,
            "status": screen.status or "Mới thiết kế",
            "target_date": screen.target_date or "Chưa thiết lập",
        })
    
    if options.include_components:
        for idx, comp in enumerate(screen.components or [], start=1):
            data["components"].append({
                "stt": idx,
                "name": comp.name,
                "type": comp.type or "",
                "description": comp.description or "",
            })
        data["context"]["components_count"] = len(data["components"])
    
    if options.include_guides:
        for idx, guide in enumerate(screen.guides or [], start=1):
            data["guides"].append({
                "stt": idx,
                "title": guide.title,
                "content": guide.content or "",
            })
        data["context"]["guides_count"] = len(data["guides"])
    
    if options.include_bugs:
        for idx, bug in enumerate(screen.bugs or [], start=1):
            data["bugs"].append({
                "stt": idx,
                "description": bug.description[:100] + "..." if len(bug.description) > 100 else bug.description,
                "severity": bug.severity or "Medium",
                "status": bug.status or "New",
                "reporter": bug.reporter or "",
                "assignee": bug.assignee or "",
                "requested_at": bug.requested_at.strftime("%d/%m/%Y") if bug.requested_at else "",
                "completed_at": bug.completed_at.strftime("%d/%m/%Y") if bug.completed_at else "",
            })
        data["context"]["bugs_count"] = len(data["bugs"])
    
    if options.include_mockup and screen.mockup_path:
        data["context"]["mockup_path"] = screen.mockup_path
    
    return data


def export_screen_detail_service(
    db: Session,
    screen_id: int,
    format: str,
    options: ScreenExportOptions,
    template_style: str,
    user_name: Optional[str] = None,
) -> StreamingResponse:
    """
    Xuat dac ta chi tiet cua 1 man hinh voi day du tuy chon.
    """
    
    # 1. Tim man hinh
    screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not screen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy màn hình")
    
    # 2. Thu thap du lieu
    screen_data = collect_screen_data(screen, options)
    
    # 3. Them context chung
    now = datetime.now()
    context = {
        "date": now.strftime("%d/%m/%Y"),
        "time": now.strftime("%H:%M:%S"),
        "user_name": user_name or "Admin",
        "system_name": "SmartFlow ERP System",
    }
    # Merge static context from screen_data
    context.update(screen_data.get("context", {}))
    
    # 4. Lay template
    try:
        template_path = get_template_path(format, template_style)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    
    # 5. Render template
    try:
        # Xuat components (list mode)
        # Truyen list components de fill table
        data_to_export = screen_data.get("components", [])
        if not data_to_export:
            # Neu khong co components, thu guides hoac bugs
            data_to_export = screen_data.get("guides", []) or screen_data.get("bugs", [])
        
        # Neu van khong co data nao, tao empty list
        if not data_to_export:
            data_to_export = []
        
        file_bytes = fill_template(template_path, "list", data_to_export, context)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi xử lý template: {str(e)}"
        )
    
    # 6. Xac dinh content type
    ext = os.path.splitext(template_path)[1].lower()
    content_type_map = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".pdf": "application/pdf",
    }
    media_type = content_type_map.get(ext, "application/octet-stream")
    
    # 7. Tao ten file
    screen_code = screen.current_code or screen.default_code or "screen"
    filename = f"{screen_code}_detail_{now.strftime('%Y%m%d_%H%M%S')}{ext}"
    
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
