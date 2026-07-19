import io
import json
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from config.database import get_db
from modules.system.models.system_screen import SystemScreen as SystemScreenModel
from modules.system.models.system_component import SystemComponent as SystemComponentModel
from modules.system.services.export_template_engine import fill_template


COMPONENT_SAMPLES_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", "component_samples")
)


def _resolve_physical_path(file_url: str) -> str:
    """
    Chuyen URL dang /static/uploads/component_samples/<name> thanh duong dan vat ly,
    hoac tim file trong cac vi tri co the chay (root, BackEnd).
    """
    if not file_url:
        raise ValueError("Duong dan file mau rong")

    # Tach ten file an toan
    name = os.path.basename(file_url.replace("/", os.sep).replace("\\", os.sep))
    if not name:
        raise ValueError("Ten file mau khong hop le")

    candidates = [
        os.path.join(COMPONENT_SAMPLES_DIR, name),
        os.path.join("BackEnd", "static", "uploads", "component_samples", name),
        os.path.join("..", "..", "BackEnd", "static", "uploads", "component_samples", name),
    ]

    # Nhan dien khi file_url bat dau bang /static/uploads/...
    if file_url.startswith("/static/uploads/component_samples/"):
        candidates.insert(0, os.path.join(COMPONENT_SAMPLES_DIR, name))

    for path in candidates:
        if os.path.exists(path):
            return path

    # Sanity check: phai nam trong thu muc upload component_samples
    full_path = os.path.abspath(os.path.join(COMPONENT_SAMPLES_DIR, name))
    if not full_path.startswith(os.path.abspath(COMPONENT_SAMPLES_DIR)):
        raise ValueError("Duong dan file mau khong hop le (path traversal)")

    # Neu chua tim thay thi tra ve duong dan hop le de loi FileNotFound ro rang hon
    return full_path


def _parse_technical_details(technical_details):
    if not technical_details:
        return {}
    try:
        return json.loads(technical_details) if isinstance(technical_details, str) else technical_details
    except Exception:
        return {}


def export_screen_component_file(
    db: Session,
    screen_id: int,
    button_id: str,
    mode: Optional[str],
    data: Any,
    context: Optional[Dict[str, Any]],
    user_name: Optional[str] = None,
) -> StreamingResponse:
    """
    Xuat file cho mot component export (co button_id) cua man hinh,
    su dung file mau duoc upload va du lieu tu trang dang dung.
    """

    # 1. Tim man hinh va component
    screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not screen:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay man hinh")

    component = None
    for comp in screen.components or []:
        tech = _parse_technical_details(comp.technical_details)
        if tech.get("button_id") == button_id:
            component = comp
            break

    if not component:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Khong tim thay component voi button_id={button_id}"
        )

    tech = _parse_technical_details(component.technical_details)

    # 2. Lay file mau
    sample_url = component.file_path or tech.get("sample_file_url") or tech.get("file_path")
    if not sample_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Component chua co file mau de xuat"
        )

    try:
        physical_path = _resolve_physical_path(sample_url)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not os.path.exists(physical_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay file mau tren he thong")

    # 3. Xac dinh che do xuat
    export_mode = (mode or tech.get("export_mode") or "list").lower()
    if export_mode not in ("single", "list"):
        export_mode = "list"

    # 4. Chuan bi context
    now = datetime.now()
    merged_context = {
        "screen_title": screen.title or "",
        "screen_code": screen.current_code or screen.default_code or "",
        "screen_subtitle": screen.subtitle or "",
        "date": now.strftime("%d/%m/%Y"),
        "time": now.strftime("%H:%M:%S"),
        "user_name": user_name or "",
    }
    if context:
        merged_context.update(context)

    # 5. Normalize data
    if data is None:
        data = []
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Du lieu xuat phai la mot object hoac mang object"
        )

    # 6. Fill template
    try:
        file_bytes = fill_template(physical_path, export_mode, data, merged_context)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Loi xu ly file mau: {str(e)}")

    # 7. Dinh dang response
    ext = os.path.splitext(physical_path)[1].lower()
    content_type_map = {
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".pdf": "application/pdf",
    }
    media_type = content_type_map.get(ext, "application/octet-stream")

    safe_button = re.sub(r'[^\w\-]', "_", button_id or component.name or "export")
    filename = f"{safe_button}_{now.strftime('%Y%m%d_%H%M%S')}{ext}"

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
