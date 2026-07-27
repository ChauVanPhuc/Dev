from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.master.schemas.master_product import MasterProduct, MasterProductCreate, MasterProductUpdate, MasterProductListItem, MasterProductListResponse
from modules.production.schemas.product import Product as ProductSchema
from modules.master.controllers import master_product_controller

router = APIRouter()

from fastapi.responses import StreamingResponse

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
