from fastapi import APIRouter, Depends, File, HTTPException, Request, status, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional
import os
import uuid
from config.database import get_db
from config.settings import settings, get_upload_dir
from jose import jwt
from modules.auth.models.accounts import Account as AccountModel
from modules.system.models.system_screen import SystemScreen as SystemScreenModel
from modules.system.models.system_component import SystemComponent as SystemComponentModel
from modules.system.models.system_guide import SystemGuide as SystemGuideModel
from modules.system.models.screen_bug import ScreenBug as ScreenBugModel
from modules.system.schemas.system_screen import (
    SystemScreen as SystemScreenSchema, 
    SystemScreenCreate,
    SystemScreenUpdate,
    ScreenExportDetailRequest
)
from modules.system.services.export_service import export_screen_component_file
from modules.system.services.screen_export_detail_service import export_screen_detail_service
import re
import unicodedata


class ExportComponentRequest(BaseModel):
    button_id: str
    mode: Optional[str] = Field(None, description="single hoac list")
    data: Any = Field([], description="Du lieu tu trang dang dung (object hoac list object)")
    context: Optional[Dict[str, Any]] = Field(None, description="Thong tin bo sung: filters, params, v.v.")


def get_current_user(request: Request, db: Session = Depends(get_db)) -> AccountModel:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Yêu cầu cần Token xác thực Bearer.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ (không tìm thấy username).",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token đã hết hạn hoặc không hợp lệ. Chi tiết: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(AccountModel).filter(AccountModel.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

router = APIRouter()

def slugify(text: str) -> str:
    text = unicodedata.normalize('NFD', text)
    text = text.encode('ascii', 'ignore').decode('utf-8')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    text = re.sub(r'[-\s]+', '-', text)
    return text

@router.post("", response_model=SystemScreenSchema)
async def create_screen(
    screen_in: SystemScreenCreate,
    db: Session = Depends(get_db)
):
    """
    Tao moi mot dac ta man hinh, tu dong tinh toan ma man hinh aabb.
    """
    subsystem_abbreviation = {
        "Trang chủ": "TC",
        "Quản lý hệ thống": "HT",
        "Quản lý nhân sự": "HS",
        "Quản lý sản xuất": "SX",
        "Quản lý chất lượng": "CL",
        "Quản lý kinh doanh": "KD",
        "Quản lý kỹ thuật": "KT",
        "Bảo trì - cơ sở hạ tầng": "BT"
    }

    # 1. Tinh toan prefix
    prefix = subsystem_abbreviation.get(screen_in.subsystem, "HT")
    
    # 2. Tim index cao nhat cho prefix nay
    existing = db.query(SystemScreenModel.default_code).filter(
        SystemScreenModel.default_code.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for row in existing:
        code = row[0]
        match = re.match(rf"{prefix}(\d+)", code)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
                
    next_code = f"{prefix}{max_num + 1:02d}"

    # 3. Slugify route path neu trong
    route_path = screen_in.route_path
    if not route_path:
        slug = slugify(screen_in.title)
        route_path = f"/admin/{slug}" if screen_in.platform == "Web" else f"/mobile/{slug}"
        
    # Dam bao khong trung lap route path de tranh unique constraint
    base_path = route_path
    counter = 1
    while db.query(SystemScreenModel).filter(
        SystemScreenModel.platform == screen_in.platform,
        SystemScreenModel.route_path == route_path
    ).first():
        route_path = f"{base_path}-{counter}"
        counter += 1

    # 4. Khoi tao model
    db_screen = SystemScreenModel(
        platform=screen_in.platform,
        route_path=route_path,
        backend_path=screen_in.backend_path,
        default_code=next_code,
        current_code=screen_in.current_code if (screen_in.current_code and screen_in.current_code.strip()) else next_code,
        title=screen_in.title,
        subtitle=screen_in.subtitle,
        status=screen_in.status or "Mới thiết kế",
        target_date=screen_in.target_date,
        is_active=True
    )

    db.add(db_screen)
    db.commit()
    db.refresh(db_screen)

    # 5. Khoi tao components kem theo neu co
    if screen_in.components:
        for comp in screen_in.components:
            db_comp = SystemComponentModel(
                screen_id=db_screen.id,
                name=comp.name,
                type=comp.type,
                description=comp.description,
                technical_details=comp.technical_details,
                file_path=comp.file_path,
                is_active=comp.is_active
            )
            db.add(db_comp)
        db.commit()
        db.refresh(db_screen)

    # 5.1 Khoi tao guides kem theo neu co
    if screen_in.guides:
        for guide in screen_in.guides:
            db_guide = SystemGuideModel(
                screen_id=db_screen.id,
                step_number=guide.step_number,
                title=guide.title,
                related_components=guide.related_components,
                description=guide.description
            )
            db.add(db_guide)
        db.commit()
        db.refresh(db_screen)

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": db_screen.id,
            "platform": db_screen.platform,
            "route_path": db_screen.route_path,
            "current_code": db_screen.current_code,
            "title": db_screen.title,
            "subtitle": db_screen.subtitle
        })
    except Exception as e:
        print(f"Error broadcasting screen creation: {e}")

    return db_screen

@router.delete("/{screen_id}")
async def delete_screen(
    screen_id: int,
    db: Session = Depends(get_db)
):
    """
    Xoa mot man hinh khoi co so du lieu.
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin màn hình cần xóa"
        )
        
    db.delete(db_screen)
    db.commit()

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": screen_id,
            "action": "DELETED"
        })
    except Exception as e:
        print(f"Error broadcasting screen deletion: {e}")

    return {"message": "Xóa màn hình thành công"}

@router.get("", response_model=List[SystemScreenSchema])
def get_screens(platform: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Lay danh sach tat ca cac man hinh trong he thong.
    Co the loc theo 'platform' ('Web' hoac 'Mobile').
    """
    query = db.query(SystemScreenModel)
    if platform:
        query = query.filter(SystemScreenModel.platform == platform)
    return query.order_by(SystemScreenModel.id).all()

@router.get("/map")
def get_screens_map(platform: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Lay danh sach duoi dang map {route_path: screen_data} de client tra cuu O(1).
    """
    query = db.query(SystemScreenModel)
    if platform:
        query = query.filter(SystemScreenModel.platform == platform)
    screens = query.all()
    
    # Tao map voi key la route_path
    screens_map = {}
    for screen in screens:
        screens_map[screen.route_path] = {
            "id": screen.id,
            "platform": screen.platform,
            "route_path": screen.route_path,
            "backend_path": screen.backend_path,
            "default_code": screen.default_code,
            "current_code": screen.current_code,
            "title": screen.title,
            "subtitle": screen.subtitle,
            "is_active": screen.is_active
        }
    return screens_map

@router.get("/{screen_id}", response_model=SystemScreenSchema)
def get_screen_detail(screen_id: int, db: Session = Depends(get_db)):
    """
    Lay thong tin chi tiet mot man hinh kem danh sach components cua no.
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy thông tin màn hình"
        )
    return db_screen

@router.put("/{screen_id}", response_model=SystemScreenSchema)
async def update_screen(
    screen_id: int, 
    screen_in: SystemScreenUpdate, 
    db: Session = Depends(get_db)
):
    """
    Cap nhat thong tin hien thi, ma code, hoac trang thai cua man hinh (Danh cho Admin).
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy thông tin màn hình cần cập nhật"
        )
        
    update_data = screen_in.model_dump(exclude_unset=True)
    components_data = update_data.pop("components", None)
    guides_data = update_data.pop("guides", None)
    
    for field, value in update_data.items():
        setattr(db_screen, field, value)
        
    db.commit()

    if components_data is not None:
        # Xoa cac components cu va thay the bang danh sach moi
        db.query(SystemComponentModel).filter(SystemComponentModel.screen_id == screen_id).delete()
        for comp in components_data:
            db_comp = SystemComponentModel(
                screen_id=screen_id,
                name=comp.get("name"),
                type=comp.get("type"),
                description=comp.get("description"),
                technical_details=comp.get("technical_details"),
                file_path=comp.get("file_path"),
                is_active=comp.get("is_active", True) if comp.get("is_active") is not None else True
            )
            db.add(db_comp)
        db.commit()

    if guides_data is not None:
        # Xoa cac guides cu va thay the bang danh sach moi
        db.query(SystemGuideModel).filter(SystemGuideModel.screen_id == screen_id).delete()
        for guide in guides_data:
            db_guide = SystemGuideModel(
                screen_id=screen_id,
                step_number=guide.get("step_number"),
                title=guide.get("title"),
                related_components=guide.get("related_components"),
                description=guide.get("description")
            )
            db.add(db_guide)
        db.commit()
        
    db.refresh(db_screen)

    # Realtime WebSocket broadcast to all clients
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": screen_id,
            "platform": db_screen.platform,
            "route_path": db_screen.route_path,
            "current_code": db_screen.current_code,
            "title": db_screen.title,
            "subtitle": db_screen.subtitle
        })
    except Exception as e:
        print(f"Error broadcasting screen update: {e}")

    return db_screen

@router.post("/{screen_id}/reset", response_model=SystemScreenSchema)
async def reset_screen_code(screen_id: int, db: Session = Depends(get_db)):
    """
    Reset ma man hinh hien tai (current_code) ve ma mac dinh ban dau (default_code).
    """
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy thông tin màn hình"
        )
        
    db_screen.current_code = db_screen.default_code
    db.commit()
    db.refresh(db_screen)

    # Realtime WebSocket broadcast to all clients
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": screen_id,
            "platform": db_screen.platform,
            "route_path": db_screen.route_path,
            "current_code": db_screen.current_code,
            "title": db_screen.title,
            "subtitle": db_screen.subtitle
        })
    except Exception as e:
        print(f"Error broadcasting screen reset: {e}")

    return db_screen


@router.post("/{screen_id}/copy", response_model=SystemScreenSchema)
async def copy_screen(
    screen_id: int,
    db: Session = Depends(get_db)
):
    """
    Sao chép một đặc tả màn hình (toàn bộ trừ ảnh mockup và bugs).
    """
    # 1. Lấy thông tin màn hình gốc
    db_screen = db.query(SystemScreenModel).filter(SystemScreenModel.id == screen_id).first()
    if not db_screen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin màn hình cần sao chép"
        )

    # 2. Tính toán mã code mới dựa trên 2 chữ cái đầu của mã mặc định gốc
    prefix = "AD"
    if db_screen.default_code and len(db_screen.default_code) >= 2:
        prefix = db_screen.default_code[:2]
        
    existing = db.query(SystemScreenModel.default_code).filter(
        SystemScreenModel.default_code.like(f"{prefix}%")
    ).all()
    
    max_num = 0
    for row in existing:
        code = row[0]
        match = re.match(rf"{prefix}(\d+)", code)
        if match:
            num = int(match.group(1))
            if num > max_num:
                max_num = num
                
    next_code = f"{prefix}{max_num + 1:02d}"

    # 3. Tạo route_path mới (thêm hậu tố -copy)
    new_route_path = db_screen.route_path
    if new_route_path:
        if not (new_route_path.endswith("-copy") or new_route_path.endswith("-sao-chep")):
            new_route_path = f"{new_route_path}-copy"
    else:
        new_route_path = f"/admin/copy-{slugify(db_screen.title)}"

    # Đảm bảo không trùng lặp route path
    base_path = new_route_path
    counter = 1
    while db.query(SystemScreenModel).filter(
        SystemScreenModel.platform == db_screen.platform,
        SystemScreenModel.route_path == new_route_path
    ).first():
        new_route_path = f"{base_path}-{counter}"
        counter += 1

    # 4. Khởi tạo model màn hình mới (loại bỏ mockup_path và chuyển status về 'Mới thiết kế')
    new_screen = SystemScreenModel(
        platform=db_screen.platform,
        route_path=new_route_path,
        default_code=next_code,
        current_code=next_code,
        title=f"{db_screen.title} - Sao chép",
        subtitle=db_screen.subtitle,
        status="Mới thiết kế",
        target_date=db_screen.target_date,
        mockup_path=None,
        is_active=True
    )
    
    db.add(new_screen)
    db.commit()
    db.refresh(new_screen)

    # 5. Sao chép các components liên kết
    for comp in db_screen.components:
        db_comp = SystemComponentModel(
            screen_id=new_screen.id,
            name=comp.name,
            type=comp.type,
            description=comp.description,
            technical_details=comp.technical_details,
            file_path=comp.file_path,
            is_active=comp.is_active
        )
        db.add(db_comp)

    # 6. Sao chép các guides liên kết
    for guide in db_screen.guides:
        db_guide = SystemGuideModel(
            screen_id=new_screen.id,
            step_number=guide.step_number,
            title=guide.title,
            related_components=guide.related_components,
            description=guide.description
        )
        db.add(db_guide)
        
    db.commit()
    db.refresh(new_screen)

    # Realtime WebSocket broadcast
    try:
        from shared.services.websocket_service import socket_manager
        await socket_manager.broadcast_all({
            "type": "SCREEN_UPDATED",
            "screen_id": new_screen.id,
            "platform": new_screen.platform,
            "route_path": new_screen.route_path,
            "current_code": new_screen.current_code,
            "title": new_screen.title,
            "subtitle": new_screen.subtitle
        })
    except Exception as e:
        print(f"Error broadcasting copied screen: {e}")

    return new_screen


@router.post("/upload-component-sample")
async def upload_component_sample(file: UploadFile = File(...)):
    """
    Tải lên file mẫu cho thành phần màn hình.
    Chỉ chấp nhận file Word, Excel và PDF.
    Lưu vào BackEnd/static/uploads/component_samples/
    """
    allowed_extensions = {".doc", ".docx", ".xls", ".xlsx", ".pdf"}
    allowed_content_types = {
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/pdf",
        "application/octet-stream"
    }

    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ chấp nhận file Word (.doc, .docx), Excel (.xls, .xlsx) hoặc PDF (.pdf)"
        )

    content_type = file.content_type or ""
    if content_type and content_type not in allowed_content_types:
        # Vẫn cho phép nếu đuôi file hợp lệ nhưng content-type không khớp
        pass

    upload_dir = get_upload_dir("component_samples")

    new_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, new_filename)

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    return {"url": f"/static/uploads/component_samples/{new_filename}"}


@router.post("/{screen_id}/export")
async def export_component_file(
    screen_id: int,
    req: ExportComponentRequest,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user),
):
    """
    Xuat file theo form mau cua component export.
    Nhan button_id, du lieu cua trang dang dung va tra ve file da fill.
    """
    return export_screen_component_file(
        db=db,
        screen_id=screen_id,
        button_id=req.button_id,
        mode=req.mode,
        data=req.data,
        context=req.context,
        user_name=current_user.full_name or current_user.username,
    )


@router.post("/{screen_id}/export-detail")
async def export_screen_detail(
    screen_id: int,
    req: ScreenExportDetailRequest,
    db: Session = Depends(get_db),
    current_user: AccountModel = Depends(get_current_user)
):
    """
    Xuat dac ta chi tiet cua 1 man hinh voi day du tuy chon.
    Ho tro 3 dinh dang: PDF, DOCX, Excel.
    """
    return export_screen_detail_service(
        db=db,
        screen_id=screen_id,
        format=req.format,
        options=req.options,
        template_style=req.template_style,
        user_name=current_user.full_name or current_user.username
    )


