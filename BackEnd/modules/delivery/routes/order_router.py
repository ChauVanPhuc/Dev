from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from config.database import get_db
from modules.delivery.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderSimpleResponse
from modules.delivery.controllers import order_controller
from modules.delivery.models.order import Order

router = APIRouter()

@router.get("/")
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách đơn hàng kèm cấu trúc cây sản phẩm chi tiết.
    """
    # Sắp xếp: Ưu tiên lên đầu, sau đó mới nhất lên đầu
    orders = db.query(Order).order_by(Order.is_priority.desc(), Order.id.desc()).offset(skip).limit(limit).all()
    result = []
    
    for order in orders:
        # Lấy Items để hiển thị tên/mã sản phẩm ngay cả khi chưa phân rã
        item_list = []
        for item in order.items:
            m_prod = item.master_product
            item_list.append({
                "id": item.id,
                "master_product_id": item.master_product_id,
                "name": m_prod.name if m_prod else "N/A",
                "sku": m_prod.sku if m_prod else "N/A",
                "quantity": item.quantity
            })

        product_list = []
        # Lấy danh sách các sản phẩm thực tế (Product) đã được tạo/phân rã
        for prod in order.products:
            # Ở đây chúng ta lấy các BOMDetail cấp 1 (con của Product)
            elements = []
            for bom in prod.bom_details:
                if bom.parent_id is None: # Chỉ lấy Element cấp 1
                    elements.append({
                        "id": bom.id,
                        "sku": bom.sku,
                        "name": bom.name,
                        "quantity": bom.quantity
                    })
                
            product_list.append({
                "id": prod.id,
                "sku": prod.sku,
                "name": prod.name,
                "quantity": prod.quantity,
                "elements": elements
            })
            
        result.append({
            "id": order.id,
            "order_code": order.order_code,
            "customer": order.customer,
            "order_status": order.order_status,
            "create_date": order.create_date,
            "estimated_date": order.estimated_date,
            "items": item_list,
            "products": product_list
        })
    return result

@router.get("/simple")
def read_orders_simple(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách PO rút gọn thuộc KHSX tháng hiện tại để tối ưu hiệu suất.
    Giới hạn 500 mã mới nhất của tháng.
    """
    from modules.production.models.product_plan import ProductPlan
    from shared.utils.timezone import get_vietnam_time
    
    now = get_vietnam_time()
    orders = db.query(Order.id, Order.order_code)\
        .join(ProductPlan)\
        .filter(
            ProductPlan.month == now.month,
            ProductPlan.year == now.year
        )\
        .order_by(Order.is_priority.desc(), Order.id.desc())\
        .offset(skip).limit(limit).all()
        
    return [{"id": o.id, "order_code": o.order_code} for o in orders]

@router.get("/by-code/{order_code}/products")
def read_order_products_by_code(order_code: str, db: Session = Depends(get_db)):
    """
    [GET] Lấy danh sách sản phẩm (items + products) của một PO theo mã.
    """
    order = db.query(Order).filter(Order.order_code == order_code).first()
    if not order:
        raise HTTPException(status_code=404, detail="Không tìm thấy PO")
    
    # Lấy items (sản phẩm mẫu)
    item_list = []
    for item in order.items:
        m_prod = item.master_product
        item_list.append({
            "sku": m_prod.sku if m_prod else "N/A",
            "name": m_prod.name if m_prod else "N/A"
        })
    
    # Lấy products (sản phẩm thực tế)
    product_list = []
    for prod in order.products:
        # Lấy các chi tiết (BOM Elements) cấp 1
        elements = []
        for bom in prod.bom_details:
            if bom.parent_id is None:
                elements.append({
                    "sku": bom.sku,
                    "name": bom.name
                })

        product_list.append({
            "sku": prod.sku,
            "name": prod.name,
            "elements": elements
        })
    
    return {"items": item_list, "products": product_list}

@router.get("/{order_id}", response_model=OrderResponse)
def read_order(order_id: int, db: Session = Depends(get_db)):
    """
    [GET] Lấy thông tin chi tiết của một đơn hàng theo ID.
    """
    db_order = order_controller.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return db_order

@router.post("/", response_model=OrderResponse)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):
    """
    [POST] Tạo đơn hàng mới. 
    """
    try:
        return order_controller.create_order(db=db, order=order)
    except Exception as e:
        print(f"CRITICAL ERROR IN CREATE_ORDER: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}", response_model=OrderSimpleResponse)
def update_order(order_id: int, order: OrderUpdate, db: Session = Depends(get_db)):
    """
    [PUT] Cập nhật thông tin đơn hàng.
    """
    try:
        db_order = order_controller.update_order(db=db, order_id=order_id, order=order)
        if not db_order:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng để cập nhật")
        return db_order
    except Exception as e:
        # Ghi log lỗi phía server để hỗ trợ chẩn đoán
        print(f"Server Error during Order Update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
