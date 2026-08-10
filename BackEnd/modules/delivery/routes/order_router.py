from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import text
from config.database import get_db
from modules.delivery.schemas.order import OrderCreate, OrderUpdate, OrderResponse, OrderSimpleResponse
from modules.delivery.controllers import order_controller
from modules.delivery.models.order import Order
from modules.production.routes.product_plan_router import clear_plans_cache

router = APIRouter()

@router.get("/")
def read_orders(
    page: Optional[int] = None,
    pageSize: Optional[int] = 15,
    search: Optional[str] = None,
    status: Optional[str] = None,
    customer: Optional[str] = None,
    deadline: Optional[str] = None,
    sortDirection: Optional[str] = 'desc',
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    [GET] Lấy danh sách đơn hàng kèm cấu trúc cây sản phẩm chi tiết. Có hỗ trợ phân trang Server-side.
    """
    from sqlalchemy.orm import selectinload
    import datetime

    query = db.query(Order).with_hint(Order, 'WITH (NOLOCK)')

    # Lọc tìm kiếm
    if search:
        search_like = f"%{search}%"
        from modules.delivery.models.order_item import OrderItem
        from modules.master.models.master_product import MasterProduct
        from modules.production.models.product import Product

        query = query.outerjoin(Order.items).outerjoin(OrderItem.master_product).outerjoin(Order.products).filter(
            (Order.order_code.like(search_like)) |
            (Order.customer.like(search_like)) |
            (MasterProduct.name.like(search_like)) |
            (Product.name.like(search_like))
        ).distinct()

    # Lọc theo khách hàng
    if customer and customer != 'all':
        query = query.filter(Order.customer == customer)

    # Nếu KHÔNG phân trang (tương thích ngược cho Mobile)
    if page is None:
        orders = query.order_by(Order.is_priority.desc(), Order.id.desc()).offset(skip).limit(limit).all()
        result = []
        for order in orders:
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
            for prod in order.products:
                elements = []
                for bom in prod.bom_details:
                    if bom.parent_id is None:
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
                "delivery_date": order.delivery_date,
                "deadline": order.delivery_date,
                "items": item_list,
                "products": product_list
            })
        return result

    # Nếu CÓ phân trang (dùng cho Web Dashboard mới)
    # 1. Tính toán thống kê (stats) trên toàn bộ danh mục khớp tìm kiếm và lọc khách hàng (chưa phân trang)
    all_matching = query.all()
    now = datetime.datetime.now()
    stats = {"all": 0, "production": 0, "completed": 0, "overdue": 0}
    for o in all_matching:
        stats["all"] += 1
        statusNum = o.order_status
        isOverdue = o.delivery_date and o.delivery_date < now and statusNum != 3
        if isOverdue:
            stats["overdue"] += 1
        elif statusNum == 3:
            stats["completed"] += 1
        elif statusNum == 2:
            stats["production"] += 1

    # 2. Áp dụng bộ lọc hạn giao (deadline)
    if deadline and deadline != 'all':
        today = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        if deadline == 'overdue':
            query = query.filter(Order.order_status != 3, Order.delivery_date != None, Order.delivery_date < today)
        elif deadline == 'this_week':
            next_week = today + datetime.timedelta(days=7)
            query = query.filter(Order.delivery_date >= today, Order.delivery_date <= next_week)

    # 3. Áp dụng bộ lọc trạng thái (status/filterStatus)
    if status and status != 'all':
        if status == 'overdue':
            query = query.filter(Order.order_status != 3, Order.delivery_date != None, Order.delivery_date < now)
        elif status == 'completed':
            query = query.filter(Order.order_status == 3)
        elif status == 'production':
            query = query.filter(Order.order_status == 2)

    # 4. Sắp xếp
    if sortDirection == 'asc':
        query = query.order_by(Order.is_priority.desc(), Order.id.asc())
    else:
        query = query.order_by(Order.is_priority.desc(), Order.id.desc())

    # 5. Phân trang
    total_count = query.count()
    paginated_orders = query.offset((page - 1) * pageSize).limit(pageSize).all()

    result = []
    for order in paginated_orders:
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
        for prod in order.products:
            elements = []
            for bom in prod.bom_details:
                if bom.parent_id is None:
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
            "delivery_date": order.delivery_date,
            "deadline": order.delivery_date,
            "items": item_list,
            "products": product_list
        })

    # Thu thập danh sách khách hàng duy nhất để lọc trên giao diện (lấy từ all_matching để đầy đủ)
    unique_customers = list(set([o.customer for o in all_matching if o.customer]))

    return {
        "items": result,
        "total_count": total_count,
        "stats": stats,
        "unique_customers": unique_customers
    }

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
        # Lấy tất cả các chi tiết (BOM Elements) bao gồm cả các cấp con
        elements = []
        for bom in prod.bom_details:
            prod_qty = float(prod.total_qty or prod.quantity or 1.0)
            bom_qty = float(bom.quantity or 0.0)
            elements.append({
                "sku": bom.sku,
                "name": bom.name,
                "quantity": int(bom_qty * prod_qty),
                "is_raw_material": bom.is_raw_material,
                "exclude_production": bom.exclude_production,
                "specification": bom.specification
            })

        product_list.append({
            "sku": prod.sku,
            "name": prod.name,
            "quantity": int(prod.total_qty or prod.quantity or 0),
            "elements": elements
        })
    
    return {"items": item_list, "products": product_list}

@router.get("/code/{order_code}", response_model=OrderResponse)
def read_order_by_code(order_code: str, db: Session = Depends(get_db)):
    """
    [GET] Lấy thông tin chi tiết của một đơn hàng theo mã hiệu (order_code).
    """
    db_order = db.query(Order).filter(Order.order_code == order_code).first()
    if not db_order:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    return db_order

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
        result = order_controller.create_order(db=db, order=order)
        clear_plans_cache()
        return result
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
        clear_plans_cache()
        return db_order
    except Exception as e:
        # Ghi log lỗi phía server để hỗ trợ chẩn đoán
        print(f"Server Error during Order Update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{order_id}")
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """
    [DELETE] Xóa đơn hàng theo ID.
    """
    success = order_controller.delete_order(db=db, order_id=order_id)
    if not success:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng để xóa")
    return {"message": "Xóa đơn hàng thành công"}

