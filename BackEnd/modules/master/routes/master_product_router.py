import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.master.schemas.master_product import MasterProduct, MasterProductCreate, MasterProductUpdate, MasterProductListItem, MasterProductListResponse
from modules.production.schemas.product import Product as ProductSchema
from modules.master.controllers import master_product_controller

router = APIRouter()

from fastapi.responses import StreamingResponse

@router.post("/upload-image")
async def upload_master_product_image(file: UploadFile = File(...)):
    """
    [POST] Tải lên hình ảnh sản phẩm mẫu.
    Lưu vào BackEnd/static/uploads/products/
    """
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", "products"))
    os.makedirs(upload_dir, exist_ok=True)
    
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ".png"
    if not file_ext:
        file_ext = ".png"
    new_filename = f"prod_{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(upload_dir, new_filename)
    
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
        
    return {"url": f"/static/uploads/products/{new_filename}"}

@router.post("/import-excel")
async def import_master_products(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    [POST] Nhập dữ liệu sản phẩm mẫu và BOM từ file Excel (Hỗ trợ Streaming Progress).
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Vui lòng tải lên file Excel (.xlsx hoặc .xls)")
    
    contents = await file.read()
    return StreamingResponse(
        master_product_controller.import_master_products_from_excel(db, contents),
        media_type="text/event-stream",
        headers={
            "X-Accel-Buffering": "no",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )


@router.get("/", response_model=MasterProductListResponse)
def get_master_products(
    skip: int = 0, 
    limit: int = 50, 
    q: str = None,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách các sản phẩm mẫu (Master Product/BOM Master) có phân trang và tìm kiếm.
    """
    return master_product_controller.get_master_products(db, skip=skip, limit=limit, q=q)

@router.post("/", response_model=MasterProduct)
def create_master_product(master_product: MasterProductCreate, db: Session = Depends(get_db)):
    """
    [POST] Khởi tạo một sản phẩm mẫu và cấu trúc BOM đi kèm.
    """
    return master_product_controller.create_master_product(db=db, master_product=master_product)

@router.post("/sync-bom-data")
def sync_bom_data(db: Session = Depends(get_db)):
    """
    [POST] Trích xuất & lọc KHÔNG TRÙNG LẶP toàn bộ dữ liệu BOM hiện có trong hệ thống
    nạp vào 2 bảng master_product_details và paint_color_samples.
    """
    return master_product_controller.sync_bom_data_to_auxiliary_tables(db)

@router.get("/detail-suggestions")
def get_detail_suggestions(detail_name: Optional[str] = None, parent_name: Optional[str] = None, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách tên chi tiết & thành phẩm duy nhất để gợi ý autocomplete.
    Nếu truyền `detail_name`, sẽ lọc chỉ trả về những Thành phẩm thực sự chứa chi tiết đó.
    Nếu truyền `parent_name`, sẽ lọc chỉ trả về các tên chi tiết con của thành phầm đó.
    """
    return master_product_controller.get_detail_suggestions(db, detail_name=detail_name, parent_name=parent_name)

@router.get("/paint-color-suggestions")
def get_paint_color_suggestions(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách mã màu, tên màu & nhà cung cấp duy nhất để gợi ý autocomplete.
    """
    return master_product_controller.get_paint_color_suggestions(db)

@router.get("/all-product-details")
def get_all_product_details(
    product_id: int = None,
    input_stage: str = None,
    output_stage: str = None,
    material: str = None,
    unit: str = None,
    q: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách tất cả chi tiết sản phẩm (KT03.1) cho trang quản lý.
    """
    return master_product_controller.get_all_product_details(
        db, product_id=product_id, input_stage=input_stage, output_stage=output_stage,
        material=material, unit=unit, q=q, skip=skip, limit=limit
    )

@router.put("/product-details-item/{detail_id}")
def update_product_detail(detail_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin chi tiết sản phẩm (KT03.1).
    """
    item = master_product_controller.update_product_detail(db, detail_id, payload)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi tiết sản phẩm để cập nhật")
    return item

@router.get("/all-paint-colors")
def get_all_paint_colors(
    product_id: int = None,
    supplier: str = None,
    has_image: str = None,
    q: str = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách tất cả mẫu màu sơn (KT03.3) cho trang quản lý.
    """
    return master_product_controller.get_all_paint_color_samples(
        db, product_id=product_id, supplier=supplier, has_image=has_image, q=q, skip=skip, limit=limit
    )

@router.put("/paint-colors-item/{sample_id}")
def update_paint_color_sample(sample_id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin mẫu màu sơn (KT03.3).
    """
    item = master_product_controller.update_paint_color_sample(db, sample_id, payload)
    if not item:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu màu sơn để cập nhật")
    return item

@router.get("/{id}", response_model=MasterProduct)
def read_master_product(id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy thông tin chi tiết của một sản phẩm mẫu theo ID.
    """
    db_master = master_product_controller.get_master_product(db, master_product_id=id)
    if db_master is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm mẫu")
    return db_master

@router.put("/{id}", response_model=MasterProduct)
def update_master_product(id: int, master_product: MasterProductUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin sản phẩm mẫu và BOM.
    """
    return master_product_controller.update_master_product(db=db, master_product_id=id, master_product=master_product)

@router.delete("/{id}")
def delete_master_product(id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa sản phẩm mẫu khỏi hệ thống.
    """
    success = master_product_controller.delete_master_product(db, master_product_id=id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm mẫu để xóa")
    return {"message": "Đã xóa sản phẩm mẫu thành công"}

@router.post("/{id}/produce", response_model=ProductSchema)
def produce_product(id: int, quantity: float, db: Session = Depends(get_db)):
    """
    [POST] Phân rã (Produce) từ BOM mẫu sang sản phẩm thực tế.
    """
    db_product = master_product_controller.produce_from_bom(db, master_product_id=id, quantity_to_produce=quantity)
    if not db_product:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm mẫu để phân rã")
    return db_product

@router.get("/technical-pending-tasks")
def get_technical_pending_tasks(db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách công việc kỹ thuật tồn đọng cho KT01 Dashboard.
    """
    return master_product_controller.get_technical_pending_tasks(db)

@router.post("/technical-pending-tasks")
def create_technical_pending_task(payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Tạo mới một công việc kỹ thuật tồn đọng.
    """
    title = payload.get("title", "Công việc mới")
    assigned_to = payload.get("assigned_to", "Kỹ thuật viên")
    return master_product_controller.create_technical_pending_task(db, title, assigned_to)

@router.post("/{id}/drawings")
def create_technical_drawing(id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Thêm bản vẽ kỹ thuật / revision mới cho sản phẩm.
    """
    return master_product_controller.create_technical_drawing(db, id, payload)

@router.post("/{id}/paint-colors")
def create_paint_color_sample(id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Thêm mẫu màu sơn (Modal KT03.3).
    """
    return master_product_controller.create_paint_color_sample(db, id, payload)

@router.post("/{id}/bom-details")
def add_bom_detail(id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Thêm chi tiết / thành phần BOM mới (Modal KT03.1, KT03.2).
    """
    return master_product_controller.add_bom_detail_to_product(db, id, payload)

@router.delete("/{id}/bom-details/{detail_id}")
def delete_bom_detail(id: int, detail_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa chi tiết / thành phần BOM.
    """
    success = master_product_controller.delete_bom_detail(db, detail_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi tiết BOM để xóa")
    return {"message": "Đã xóa chi tiết BOM thành công"}

@router.post("/{id}/product-details")
def create_product_detail(id: int, payload: dict, db: Session = Depends(get_db)):
    """
    [POST] Thêm chi tiết sản phẩm mới (KT03.1) vào bảng riêng master_product_details.
    """
    return master_product_controller.create_product_detail(db, id, payload)

@router.delete("/product-details/{detail_id}")
@router.delete("/{id}/product-details/{detail_id}")
def delete_product_detail(detail_id: int, id: int = None, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa chi tiết sản phẩm (KT03.1).
    """
    success = master_product_controller.delete_product_detail(db, detail_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy chi tiết sản phẩm để xóa")
    return {"message": "Đã xóa chi tiết sản phẩm thành công"}

@router.delete("/paint-colors/{sample_id}")
@router.delete("/{id}/paint-colors/{sample_id}")
def delete_paint_color_sample(sample_id: int, id: int = None, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa mẫu màu sơn (KT03.3).
    """
    success = master_product_controller.delete_paint_color_sample(db, sample_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy mẫu màu sơn để xóa")
    return {"message": "Đã xóa mẫu màu sơn thành công"}

