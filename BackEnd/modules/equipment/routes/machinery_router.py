# -*- coding: utf-8 -*-
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from config.database import get_db
from config.settings import STATIC_DIR, get_upload_dir
from modules.equipment.models.machinery import Machine, MachineMaintenance, MachineDocument
from typing import List, Optional
from pydantic import BaseModel
import datetime
import json
import io
import os
import openpyxl
import re
import uuid

router = APIRouter()

# Schema declarations
class MachineBase(BaseModel):
    name: str
    code: str
    status: Optional[str] = "Hoạt động bình thường"
    factory: Optional[str] = None
    workshop: Optional[str] = None
    department: Optional[str] = None
    receive_date: Optional[datetime.date] = None
    origin: Optional[str] = None
    supplier: Optional[str] = None
    maintenance_cycle: Optional[int] = 30
    next_maintenance_date: Optional[datetime.date] = None
    last_maintenance_date: Optional[datetime.date] = None
    notes: Optional[str] = None
    images: Optional[str] = None
    qr_code: Optional[str] = None
    daily_run_time: Optional[float] = None
    productivity: Optional[str] = None
    production_year: Optional[str] = None
    owner_name: Optional[str] = None

class MachineCreate(MachineBase):
    pass

class MachineUpdate(MachineBase):
    pass

class MachineMaintenanceCreate(BaseModel):
    performed_by: Optional[str] = None
    verified_by: Optional[str] = None
    check_date: Optional[datetime.date] = None
    maintenance_date: Optional[datetime.date] = None
    status: Optional[str] = None
    notes: Optional[str] = None

def parse_excel_date(val):
    if val is None or val == '':
        return None
    if isinstance(val, (datetime.date, datetime.datetime)):
        if isinstance(val, datetime.datetime):
            return val.date()
        return val
    val_str = str(val).strip()
    if not val_str or val_str.lower() in ('none', 'null', '—', '-'):
        return None
    
    # Danh sách các định dạng ngày phổ biến (bao gồm có giờ phút giây và dấu gạch chéo)
    fmts = (
        '%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%Y/%m/%d',
        '%d/%m/%Y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%d-%m-%Y %H:%M:%S', '%Y/%m/%d %H:%M:%S',
        '%d/%m/%Y %H:%M', '%Y-%m-%d %H:%M', '%d-%m-%Y %H:%M', '%Y/%m/%d %H:%M'
    )
    for fmt in fmts:
        try:
            return datetime.datetime.strptime(val_str, fmt).date()
        except ValueError:
            continue
            
    # Xử lý dạng mm/yyyy (ví dụ 06/2025)
    m = re.match(r'^(\d{1,2})/(\d{4})$', val_str)
    if m:
        return datetime.date(int(m.group(2)), int(m.group(1)), 1)
    if re.match(r'^\d{4}$', val_str):
        return datetime.date(int(val_str), 1, 1)
    return None

def parse_cycle(val):
    if val is None or val == '':
        return 30
    if isinstance(val, (int, float)):
        return int(val)
    val_str = str(val).strip().lower()
    if 'hàng tháng' in val_str or 'mỗi tháng' in val_str or 'tháng' in val_str:
        return 30
    if 'hàng quý' in val_str or 'quý' in val_str:
        return 90
    if 'nửa năm' in val_str:
        return 180
    if 'hàng năm' in val_str or 'năm' in val_str:
        return 365
    if 'tuần' in val_str:
        return 7
    # Tìm số trong chuỗi
    nums = re.findall(r'\d+', val_str)
    if nums:
        return int(nums[0])
    return 30

@router.get("/", response_model=List[dict])
def get_machines(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách toàn bộ máy móc từ database.
    """
    machines = db.query(Machine).order_by(Machine.id.desc()).all()
        
    return [
        {
            "id": m.id,
            "name": m.name,
            "code": m.code,
            "status": m.status,
            "factory": m.factory,
            "workshop": m.workshop,
            "department": m.department,
            "receive_date": m.receive_date,
            "origin": m.origin,
            "supplier": m.supplier,
            "maintenance_cycle": m.maintenance_cycle,
            "next_maintenance_date": m.next_maintenance_date,
            "last_maintenance_date": m.last_maintenance_date,
            "notes": m.notes,
            "images": m.images,
            "qr_code": m.qr_code,
            "daily_run_time": m.daily_run_time,
            "productivity": m.productivity,
            "production_year": m.production_year,
            "owner_name": m.owner_name
        }
        for m in machines
    ]

@router.get("/{machine_id}", response_model=dict)
def get_machine_by_id(machine_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy chi tiết 1 máy.
    """
    m = db.query(Machine).filter(Machine.id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin máy")
    return {
        "id": m.id,
        "name": m.name,
        "code": m.code,
        "status": m.status,
        "factory": m.factory,
        "workshop": m.workshop,
        "department": m.department,
        "receive_date": m.receive_date,
        "origin": m.origin,
        "supplier": m.supplier,
        "maintenance_cycle": m.maintenance_cycle,
        "next_maintenance_date": m.next_maintenance_date,
        "last_maintenance_date": m.last_maintenance_date,
        "notes": m.notes,
        "images": m.images,
        "qr_code": m.qr_code,
        "daily_run_time": m.daily_run_time,
        "productivity": m.productivity,
        "production_year": m.production_year,
        "owner_name": m.owner_name
    }

@router.post("/", response_model=dict)
def create_machine(mac: MachineCreate, db: Session = Depends(get_db)):
    """
    [POST] Khai báo máy mới.
    """
    exists = db.query(Machine).filter(Machine.code == mac.code).first()
    if exists:
        raise HTTPException(status_code=400, detail="Mã máy đã tồn tại trong hệ thống")
        
    new_mac = Machine(
        name=mac.name,
        code=mac.code,
        status=mac.status,
        factory=mac.factory,
        workshop=mac.workshop,
        department=mac.department,
        receive_date=mac.receive_date,
        origin=mac.origin,
        supplier=mac.supplier,
        maintenance_cycle=mac.maintenance_cycle or 30,
        next_maintenance_date=mac.next_maintenance_date,
        last_maintenance_date=mac.last_maintenance_date,
        notes=mac.notes,
        images=mac.images,
        qr_code=mac.qr_code,
        daily_run_time=mac.daily_run_time,
        productivity=mac.productivity,
        production_year=mac.production_year,
        owner_name=mac.owner_name
    )
    db.add(new_mac)
    db.commit()
    db.refresh(new_mac)
    return {"status": "success", "id": new_mac.id, "message": "Đã tạo máy móc mới thành công"}

@router.put("/{machine_id}", response_model=dict)
def update_machine(machine_id: int, mac: MachineUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin máy.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy")
        
    machine.name = mac.name
    machine.code = mac.code
    machine.status = mac.status
    machine.factory = mac.factory
    machine.workshop = mac.workshop
    machine.department = mac.department
    machine.receive_date = mac.receive_date
    machine.origin = mac.origin
    machine.supplier = mac.supplier
    machine.maintenance_cycle = mac.maintenance_cycle
    machine.next_maintenance_date = mac.next_maintenance_date
    machine.last_maintenance_date = mac.last_maintenance_date
    machine.notes = mac.notes
    machine.images = mac.images
    machine.qr_code = mac.qr_code
    machine.daily_run_time = mac.daily_run_time
    machine.productivity = mac.productivity
    machine.production_year = mac.production_year
    machine.owner_name = mac.owner_name
    
    db.commit()
    return {"status": "success", "message": f"Đã cập nhật máy {mac.name} thành công"}

@router.delete("/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa máy khỏi hệ thống.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy")
    
    db.delete(machine)
    db.commit()
    return {"status": "success", "message": f"Đã xóa máy {machine.name} thành công"}


# --- ENDPOINTS CHO NHẬT KÝ BẢO TRÌ ---

@router.get("/maintenances/all", response_model=List[dict])
def get_all_maintenances(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách toàn bộ lịch sử bảo trì.
    """
    maints = db.query(MachineMaintenance).order_by(MachineMaintenance.id.desc()).all()
    results = []
    for m in maints:
        mac = db.query(Machine).filter(Machine.id == m.machine_id).first()
        results.append({
            "id": m.id,
            "machine_id": m.machine_id,
            "machine_code": mac.code if mac else "—",
            "machine_name": mac.name if mac else "—",
            "performed_by": m.performed_by,
            "verified_by": m.verified_by,
            "check_date": m.check_date,
            "maintenance_date": m.maintenance_date,
            "status": m.status,
            "notes": m.notes
        })
    return results

@router.get("/{machine_id}/maintenances", response_model=List[dict])
def get_machine_maintenances(machine_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy lịch sử bảo trì của 1 máy cụ thể.
    """
    maints = db.query(MachineMaintenance).filter(MachineMaintenance.machine_id == machine_id).order_by(MachineMaintenance.maintenance_date.desc()).all()
    return [
        {
            "id": m.id,
            "performed_by": m.performed_by,
            "verified_by": m.verified_by,
            "check_date": m.check_date,
            "maintenance_date": m.maintenance_date,
            "status": m.status,
            "notes": m.notes
        }
        for m in maints
    ]

@router.post("/{machine_id}/maintenances", response_model=dict)
def create_machine_maintenance(machine_id: int, maint: MachineMaintenanceCreate, db: Session = Depends(get_db)):
    """
    [POST] Thêm lịch sử bảo trì mới cho máy.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy")
        
    new_maint = MachineMaintenance(
        machine_id=machine_id,
        performed_by=maint.performed_by,
        verified_by=maint.verified_by,
        check_date=maint.check_date or datetime.date.today(),
        maintenance_date=maint.maintenance_date or datetime.date.today(),
        status=maint.status or machine.status,
        notes=maint.notes
    )
    db.add(new_maint)
    
    # Cập nhật ngày bảo trì cuối và trạng thái của máy
    machine.last_maintenance_date = new_maint.maintenance_date
    if maint.status:
        machine.status = maint.status
    if machine.maintenance_cycle and new_maint.maintenance_date:
        machine.next_maintenance_date = new_maint.maintenance_date + datetime.timedelta(days=machine.maintenance_cycle)
        
    db.commit()
    return {"status": "success", "message": "Đã thêm nhật ký bảo trì thành công"}


# --- ENDPOINTS CHO TÀI LIỆU ĐÍNH KÈM ---

@router.get("/{machine_id}/documents", response_model=List[dict])
def get_machine_documents(machine_id: int, category: Optional[str] = None, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tài liệu đính kèm của máy.
    """
    query = db.query(MachineDocument).filter(MachineDocument.machine_id == machine_id)
    if category:
        query = query.filter(MachineDocument.category == category)
    docs = query.order_by(MachineDocument.upload_date.desc()).all()
    return [
        {
            "id": d.id,
            "machine_id": d.machine_id,
            "file_name": d.file_name,
            "file_path": d.file_path,
            "category": d.category,
            "upload_date": d.upload_date.strftime("%Y-%m-%d %H:%M:%S") if d.upload_date else None,
            "uploader": d.uploader
        }
        for d in docs
    ]

@router.post("/{machine_id}/documents", response_model=dict)
async def upload_machine_document(
    machine_id: int,
    category: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    [POST] Tải lên tài liệu đính kèm cho máy.
    """
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        raise HTTPException(status_code=404, detail="Không tìm thấy máy")
        
    upload_dir = get_upload_dir("machinery")
    
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    with open(file_path, "wb") as f:
        f.write(await file.read())
        
    # URL tương đối để client truy cập
    relative_url = f"/static/uploads/machinery/{unique_filename}"
    
    new_doc = MachineDocument(
        machine_id=machine_id,
        file_name=file.filename,
        file_path=relative_url,
        category=category,
        uploader="admin"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    
    return {
        "status": "success",
        "id": new_doc.id,
        "file_name": new_doc.file_name,
        "file_path": new_doc.file_path,
        "message": "Đã tải lên tài liệu thành công"
    }

@router.delete("/documents/{document_id}", response_model=dict)
def delete_machine_document(document_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa tài liệu đính kèm.
    """
    doc = db.query(MachineDocument).filter(MachineDocument.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
        
    # Xóa file vật lý nếu tồn tại
    try:
        # Đường dẫn tuyệt đối
        relative_path = doc.file_path.replace("/static/", "")
        absolute_path = os.path.abspath(os.path.join(STATIC_DIR, relative_path))
        if os.path.exists(absolute_path):
            os.remove(absolute_path)
    except Exception as e:
        print(f"Error removing file from disk: {e}")
        
    db.delete(doc)
    db.commit()
    return {"status": "success", "message": "Đã xóa tài liệu đính kèm thành công"}


# --- IMPORT EXCEL ---

@router.post("/import-excel", response_model=dict)
async def import_machines_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    [POST] Nhập dữ liệu máy móc từ file Excel.
    """
    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = wb.active
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không thể đọc file Excel: {str(e)}")
        
    # Tìm dòng chứa tiêu đề (quét tối đa 10 dòng đầu tiên)
    header_row_idx = 1
    headers = []
    code_idx = -1
    name_idx = -1
    
    # Danh sách từ khóa chấp nhận cho mã máy và tên máy
    code_keywords = ['mã máy', 'mã thiết bị', 'ma may', 'mã số máy', 'mã số', 'mã', 'code', 'ma']
    name_keywords = ['tên máy', 'tên thiết bị', 'ten may', 'tên', 'name', 'ten']
    
    for r in range(1, min(11, sheet.max_row + 1)):
        row_cells = sheet[r]
        row_headers = [str(cell.value).strip().lower() if cell.value is not None else '' for cell in row_cells]
        
        def find_idx_in_row(keywords, row_hdrs):
            for idx, h in enumerate(row_hdrs):
                if any(k in h for k in keywords):
                    return idx
            return -1
            
        c_idx = find_idx_in_row(code_keywords, row_headers)
        n_idx = find_idx_in_row(name_keywords, row_headers)
        
        if c_idx != -1 and n_idx != -1:
            header_row_idx = r
            headers = row_headers
            code_idx = c_idx
            name_idx = n_idx
            break

    if code_idx == -1 or name_idx == -1:
        raise HTTPException(
            status_code=400,
            detail="File Excel không hợp lệ. Cần tối thiểu cột chứa từ khóa 'Mã máy' và 'Tên máy'."
        )
        
    # Tìm chỉ số cột khác dựa trên từ khóa tiêu đề
    def find_idx(keywords):
        for idx, h in enumerate(headers):
            if any(k in h for k in keywords):
                return idx
        return -1
        
    status_idx = find_idx(['tình trạng máy', 'tình trạng', 'trạng thái', 'tinh trang'])
    factory_idx = find_idx(['nhà máy', 'nha may'])
    workshop_idx = find_idx(['xưởng', 'xuong'])
    dept_idx = find_idx(['tổ', 'bộ phận', 'to', 'bo phan'])
    receive_date_idx = find_idx(['thời gian máy về xưởng', 'ngày nhận máy', 'ngày nhận', 'ngay ve xuong'])
    origin_idx = find_idx(['xuất xứ', 'xuat xu'])
    supplier_idx = find_idx(['nhà cung cấp', 'nha cung cap'])
    cycle_idx = find_idx(['chu kỳ bảo trì', 'tần suất', 'chu ky'])
    next_maint_idx = find_idx(['ngày bảo trì dự kiến', 'bảo trì dự kiến', 'ngay bao tri du kien'])
    last_maint_idx = find_idx(['ngày bảo trì thực tế', 'bảo trì gần nhất', 'ngày bảo trì gần nhất', 'ngày đã bảo trì'])
    notes_idx = find_idx(['mô tả', 'ghi chú', 'mo ta', 'ghi chu'])
    images_idx = find_idx(['hình ảnh', 'ảnh', 'hinh anh'])
    qr_idx = find_idx(['qr code', 'qr_code', 'qr'])
    runtime_idx = find_idx(['thời gian hoạt động', 'trung bình một ngày'])
    prod_idx = find_idx(['năng suất', 'nang suat'])
    year_idx = find_idx(['năm sản xuất', 'nam san xuat', 'năm sx'])
    owner_idx = find_idx(['người phụ trách', 'người sở hữu', 'phu trach'])
    
    inserted_count = 0
    updated_count = 0
    
    def get_val(vals, idx, default=None):
        if idx == -1 or idx >= len(vals):
            return default
        return vals[idx]

    try:
        # Duyệt từ dòng kế tiếp dòng tiêu đề
        for r in range(header_row_idx + 1, sheet.max_row + 1):
            row_vals = [cell.value for cell in sheet[r]]
            if not row_vals or len(row_vals) <= max(code_idx, name_idx):
                continue
                
            code_raw = get_val(row_vals, code_idx)
            name_raw = get_val(row_vals, name_idx)
            
            code = str(code_raw).strip() if code_raw is not None else ''
            name = str(name_raw).strip() if name_raw is not None else ''
            
            # Bỏ qua dòng trống
            if not code or not name:
                continue
                
            # Lấy các trường thông tin
            status_raw = get_val(row_vals, status_idx)
            status_val = str(status_raw).strip() if status_raw is not None else "Hoạt động bình thường"
            
            factory_raw = get_val(row_vals, factory_idx)
            factory_val = str(factory_raw).strip() if factory_raw is not None else None
            
            workshop_raw = get_val(row_vals, workshop_idx)
            workshop_val = str(workshop_raw).strip() if workshop_raw is not None else None
            
            dept_raw = get_val(row_vals, dept_idx)
            dept_val = str(dept_raw).strip() if dept_raw is not None else None
            
            receive_raw = get_val(row_vals, receive_date_idx)
            receive_date = parse_excel_date(receive_raw)
            
            origin_raw = get_val(row_vals, origin_idx)
            origin_val = str(origin_raw).strip() if origin_raw is not None else None
            
            supplier_raw = get_val(row_vals, supplier_idx)
            supplier_val = str(supplier_raw).strip() if supplier_raw is not None else None
            
            cycle_raw = get_val(row_vals, cycle_idx)
            cycle_val = parse_cycle(cycle_raw)
            
            next_maint_raw = get_val(row_vals, next_maint_idx)
            next_maint = parse_excel_date(next_maint_raw)
            
            last_maint_raw = get_val(row_vals, last_maint_idx)
            last_maint = parse_excel_date(last_maint_raw)
            
            notes_raw = get_val(row_vals, notes_idx)
            notes_val = str(notes_raw).strip() if notes_raw is not None else None
            
            images_raw = get_val(row_vals, images_idx)
            images_val = str(images_raw).strip() if images_raw is not None else None
            
            qr_raw = get_val(row_vals, qr_idx)
            qr_val = str(qr_raw).strip() if qr_raw is not None else None
            
            runtime_raw = get_val(row_vals, runtime_idx)
            try:
                runtime_val = float(runtime_raw) if runtime_raw is not None else None
            except:
                runtime_val = None
                
            prod_raw = get_val(row_vals, prod_idx)
            prod_val = str(prod_raw).strip() if prod_raw is not None else None
            
            year_raw = get_val(row_vals, year_idx)
            year_val = str(year_raw).strip() if year_raw is not None else None
            
            owner_raw = get_val(row_vals, owner_idx)
            owner_val = str(owner_raw).strip() if owner_raw is not None else None
            
            # Kiểm tra máy đã tồn tại chưa (UPSERT)
            existing = db.query(Machine).filter(Machine.code == code).first()
            if existing:
                existing.name = name
                existing.status = status_val
                existing.factory = factory_val
                existing.workshop = workshop_val
                existing.department = dept_val
                existing.receive_date = receive_date or existing.receive_date
                existing.origin = origin_val
                existing.supplier = supplier_val
                existing.maintenance_cycle = cycle_val
                existing.next_maintenance_date = next_maint or existing.next_maintenance_date
                existing.last_maintenance_date = last_maint or existing.last_maintenance_date
                existing.notes = notes_val
                existing.images = images_val or existing.images
                existing.qr_code = qr_val or existing.qr_code
                existing.daily_run_time = runtime_val or existing.daily_run_time
                existing.productivity = prod_val or existing.productivity
                existing.production_year = year_val or existing.production_year
                existing.owner_name = owner_val or existing.owner_name
                updated_count += 1
            else:
                new_mac = Machine(
                    code=code, name=name, status=status_val, factory=factory_val,
                    workshop=workshop_val,
                    department=dept_val, receive_date=receive_date, origin=origin_val,
                    supplier=supplier_val, maintenance_cycle=cycle_val,
                    next_maintenance_date=next_maint, last_maintenance_date=last_maint,
                    notes=notes_val, images=images_val, qr_code=qr_val,
                    daily_run_time=runtime_val, productivity=prod_val,
                    production_year=year_val, owner_name=owner_val
                )
                db.add(new_mac)
                inserted_count += 1
                
        db.commit()
    except Exception as e:
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=400,
            detail=f"Lỗi nhập dữ liệu ở dòng {r if 'r' in locals() else 'chưa xác định'}: {str(e)}"
        )
        
    return {
        "status": "success",
        "message": f"Nhập dữ liệu thành công. Đã thêm mới {inserted_count} máy, cập nhật {updated_count} máy."
    }
