from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_db
from modules.production.models.product_plan import ProductPlan
from modules.delivery.models.order import Order
from modules.delivery.models.deliveries import Delivery
from modules.delivery.models.delivery_details import DeliveryDetails
from modules.production.models.product import Product
from modules.production.models.bom_detail import BOMDetail
from modules.production.schemas.product_plan import ProductPlanCreate, ProductPlan as PlanResponse, MobileDailyPlanCreate, MobileDailyPlanResponse
from modules.production.models.mobile_daily_plan import MobileDailyPlan
from typing import List, Optional
from datetime import datetime
from sqlalchemy import text
import re
import traceback

def normalize_vn(s):
    if not s: return ""
    s = s.lower().strip()
    s = re.sub(r'[àáạảãâầấậẩẫăằắặẳẵ]', 'a', s)
    s = re.sub(r'[èéẹẻẽêềếệểễ]', 'e', s)
    s = re.sub(r'[ìíịỉĩ]', 'i', s)
    s = re.sub(r'[òóọỏõôồốồổỗơờớợởỡ]', 'o', s)
    s = re.sub(r'[ùúụủũưừứựửữ]', 'u', s)
    s = re.sub(r'[ỳýỵỷỹ]', 'y', s)
    s = re.sub(r'[đ]', 'd', s)
    # Thay thế các từ viết tắt phổ biến để tăng khả năng khớp
    s = s.replace('dh', 'dinh hinh')
    s = s.replace('lr', 'lap rap')
    s = s.replace('dg', 'dong goi')
    return s

router = APIRouter()

@router.get("/debug-bom")
def debug_bom(db: Session = Depends(get_db)):
    import unicodedata, re
    _ws_re = re.compile(r'\s+')
    def clean(name):
        if not name: return ""
        return _ws_re.sub('', unicodedata.normalize('NFC', str(name)).strip().lower())
    
    # 1. Lấy BOM names cho Wooden Headboard (sản phẩm 1)
    bom_rows = db.execute(text("""
        SELECT b.id, b.name, b.parent_id, b.quantity, b.is_raw_material
        FROM bom_details b
        JOIN products p ON b.product_id = p.id
        WHERE p.order_id = 1
        ORDER BY b.parent_id
    """)).fetchall()
    
    bom_names = [{"id": r.id, "name": r.name, "clean": clean(r.name), "parent": r.parent_id, "qty": float(r.quantity or 0), "is_raw": r.is_raw_material} for r in bom_rows]
    
    # 2. Lấy delivery_details cho order_id = 1
    dd_rows = db.execute(text("""
        SELECT dd.id, dd.part_name, dd.quantity, d.part_name as d_part, d.status, d.plan_id
        FROM delivery_details dd
        JOIN deliveries d ON dd.delivery_id = d.id
        WHERE dd.order_id = 1
    """)).fetchall()
    
    dd_names = [{"id": r.id, "dd_part": r.dd_part, "d_part": r.d_part, "clean_dd": clean(r.dd_part), "clean_d": clean(r.d_part), "qty": r.quantity, "status": r.status, "plan_id": r.plan_id} for r in dd_rows]
    
    # 3. Lấy plan_id của FOL-0410
    plan_row = db.execute(text("""
        SELECT p.id as plan_id, p.name as plan_name
        FROM product_plans p
        JOIN orders o ON o.plan_id = p.id
        WHERE o.code = 'FOL-0410'
    """)).fetchone()
    
    return {
        "plan": {"id": plan_row.plan_id, "name": plan_row.plan_name} if plan_row else None,
        "bom_names": bom_names,
        "delivery_details": dd_names
    }

import time
import threading
from functools import wraps

class SWRCache:
    def __init__(self, ttl=5.0):
        self.ttl = ttl
        self.cache = {}
        self.lock = threading.Lock()

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_args = []
            for arg in args:
                if not hasattr(arg, 'execute') and not hasattr(arg, 'commit'):
                    cache_args.append(arg)
            cache_kwargs = {}
            for k, v in kwargs.items():
                if k not in ('db', 'background_tasks') and not hasattr(v, 'execute') and not hasattr(v, 'commit'):
                    cache_kwargs[k] = v
            key = (func.__name__, tuple(cache_args), frozenset(cache_kwargs.items()))
            
            current_time = time.time()
            if key in self.cache:
                cached_time, cached_data, is_updating = self.cache[key]
                if current_time - cached_time < self.ttl:
                    return cached_data
                if is_updating:
                    return cached_data
                with self.lock:
                    cached_time, cached_data, is_updating = self.cache.get(key, (0, None, False))
                    if is_updating:
                        return cached_data
                    self.cache[key] = (cached_time, cached_data, True)
                try:
                    fresh_data = func(*args, **kwargs)
                    self.cache[key] = (time.time(), fresh_data, False)
                    return fresh_data
                except Exception as e:
                    self.cache[key] = (cached_time, cached_data, False)
                    return cached_data
            else:
                with self.lock:
                    if key in self.cache:
                        return self.cache[key][1]
                    fresh_data = func(*args, **kwargs)
                    self.cache[key] = (time.time(), fresh_data, False)
                    return fresh_data
        return wrapper

    def clear(self):
        with self.lock:
            self.cache.clear()

_plans_swr_cache = SWRCache(ttl=5.0)
_plan_detail_swr_cache = SWRCache(ttl=5.0)

def clear_plans_cache():
    _plans_swr_cache.clear()
    _plan_detail_swr_cache.clear()

@router.get("/daily")
def get_daily_plans(
    plan_date: Optional[str] = None,
    plan_date_from: Optional[str] = None,
    plan_date_to: Optional[str] = None,
    stage: Optional[str] = None,
    factory: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Lấy danh sách kế hoạch ngày theo bộ lọc — Đặt TRƯỚC /{id} để tránh route conflict"""
    try:
        query = db.query(MobileDailyPlan)
        if plan_date:
            query = query.filter(MobileDailyPlan.plan_date == plan_date)
        if plan_date_from:
            query = query.filter(MobileDailyPlan.plan_date >= plan_date_from)
        if plan_date_to:
            query = query.filter(MobileDailyPlan.plan_date <= plan_date_to)
        if stage:
            query = query.filter(MobileDailyPlan.stage == stage)
        if factory:
            query = query.filter(MobileDailyPlan.factory == factory)
        return query.order_by(MobileDailyPlan.plan_date.asc()).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
@_plans_swr_cache
def get_plans(
    page: Optional[int] = None,
    pageSize: Optional[int] = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    user_stage: Optional[str] = None,
    sortDirection: Optional[str] = 'desc',
    db: Session = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    import datetime

    # Lọc theo nhà máy (factory) từ user_stage
    factory = None
    if user_stage:
        import re
        match = re.search(r'(NM\d+)', user_stage)
        if match:
            factory = match.group(1)

    # Truy vấn tất cả ID đơn hàng được phép thuộc về nhà máy này bằng 1 câu SQL duy nhất
    allowed_order_ids = set()
    if factory:
        factory_sql = """
            SELECT DISTINCT p.order_id 
            FROM products p WITH (NOLOCK)
            JOIN bom_details b WITH (NOLOCK) ON b.product_id = p.id
            WHERE b.input_stage LIKE :factory_like OR b.output_stage LIKE :factory_like
        """
        rows = db.execute(text(factory_sql), {"factory_like": f"%{factory}%"}).fetchall()
        allowed_order_ids = {r[0] for r in rows if r[0] is not None}

    # Base query
    query = db.query(ProductPlan).with_hint(ProductPlan, 'WITH (NOLOCK)')
    
    # Filter by user_stage (factory) if applicable
    if factory:
        from modules.production.models.order import Order
        query = query.join(Order).filter(Order.id.in_(allowed_order_ids))

    # Nếu có tham số search (áp dụng khi phân trang)
    if search:
        search_like = f"%{search}%"
        query = query.filter((ProductPlan.name.like(search_like)) | (ProductPlan.code.like(search_like)))

    # Nếu KHÔNG phân trang (tương thích ngược cho Mobile)
    if page is None:
        plans = query.options(
            selectinload(ProductPlan.orders).selectinload(Order.products)
        ).order_by(ProductPlan.id.desc()).all()

        result = []
        for plan in plans:
            order_list = []
            sorted_orders = sorted(plan.orders, key=lambda x: (getattr(x, 'is_priority', 0) or 0, x.id), reverse=True)
            for order in sorted_orders:
                if factory and order.id not in allowed_order_ids:
                    continue
                products = []
                for product in order.products:
                    products.append({
                        "id": product.id,
                        "sku": product.sku,
                        "name": product.name,
                        "quantity": int(product.total_qty or product.quantity or 0)
                    })
                order_list.append({
                    "id": order.id,
                    "name": order.order_code,
                    "customer": order.customer,
                    "is_priority": getattr(order, 'is_priority', 0),
                    "products": products
                })
            result.append({
                "id": plan.id,
                "name": plan.name,
                "status": "Hoàn thành" if plan.status == 2 else ("Đang sản xuất" if plan.status == 1 else "Chờ sản xuất"),
                "estimated_date": plan.estimated_date,
                "finished_date": plan.finished_date,
                "month": plan.month,
                "year": plan.year,
                "orders": order_list
            })
        return result

    # Nếu CÓ phân trang (dùng cho Web Dashboard mới)
    # 1. Tính toán thống kê (stats) trên toàn bộ danh mục khớp tìm kiếm và bộ lọc nhà máy (chưa phân trang)
    all_matching = query.all()
    now = datetime.datetime.now()
    stats = {"all": 0, "production": 0, "completed": 0, "overdue": 0}
    for p in all_matching:
        stats["all"] += 1
        # Trạng thái chi tiết:
        if p.status != 2 and p.finished_date and p.finished_date < now:
            stats["overdue"] += 1
        elif p.status == 2:
            stats["completed"] += 1
        elif p.status == 1:
            stats["production"] += 1

    # 2. Áp dụng bộ lọc trạng thái (status)
    if status and status != 'all':
        if status == 'overdue':
            query = query.filter(ProductPlan.status != 2, ProductPlan.finished_date != None, ProductPlan.finished_date < now)
        elif status == 'completed':
            query = query.filter(ProductPlan.status == 2)
        elif status == 'production':
            query = query.filter(ProductPlan.status == 1)

    # 3. Sắp xếp
    if sortDirection == 'asc':
        query = query.order_by(ProductPlan.year.asc(), ProductPlan.month.asc(), ProductPlan.id.asc())
    else:
        query = query.order_by(ProductPlan.year.desc(), ProductPlan.month.desc(), ProductPlan.id.desc())

    # 4. Phân trang
    total_count = query.count()
    from modules.production.models.order import Order
    paginated_plans = query.options(
        selectinload(ProductPlan.orders).selectinload(Order.products)
    ).offset((page - 1) * pageSize).limit(pageSize).all()

    result = []
    for plan in paginated_plans:
        order_list = []
        sorted_orders = sorted(plan.orders, key=lambda x: (getattr(x, 'is_priority', 0) or 0, x.id), reverse=True)
        for order in sorted_orders:
            if factory and order.id not in allowed_order_ids:
                continue
            products = []
            for product in order.products:
                products.append({
                    "id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "quantity": int(product.total_qty or product.quantity or 0)
                })
            order_list.append({
                "id": order.id,
                "name": order.order_code,
                "customer": order.customer,
                "is_priority": getattr(order, 'is_priority', 0),
                "products": products
            })
        result.append({
            "id": plan.id,
            "name": plan.name,
            "status": "Hoàn thành" if plan.status == 2 else ("Đang sản xuất" if plan.status == 1 else "Chờ sản xuất"),
            "estimated_date": plan.estimated_date,
            "finished_date": plan.finished_date,
            "month": plan.month,
            "year": plan.year,
            "orders": order_list
        })

    return {
        "items": result,
        "total_count": total_count,
        "stats": stats
    }

@router.post("/swap-order-priority")
async def swap_order_priority(order_id_1: int, order_id_2: int, db: Session = Depends(get_db)):
    """
    Hoán đổi priority_score của 2 đơn hàng để thay đổi thứ tự ưu tiên
    """
    try:
        sql_get = text("SELECT id, priority_score FROM orders WHERE id IN (:id1, :id2)")
        rows = db.execute(sql_get, {"id1": order_id_1, "id2": order_id_2}).fetchall()
        
        if len(rows) < 2:
            return {"error": "Không tìm thấy đủ 2 đơn hàng để swap"}
            
        # Tìm row cụ thể dựa trên ID vì rows trả về không theo thứ tự tham số
        r1 = next(r for r in rows if r.id == order_id_1)
        r2 = next(r for r in rows if r.id == order_id_2)
        
        score1 = r1.priority_score or 0
        score2 = r2.priority_score or 0
        
        # Nếu cả 2 đều bằng 0, ta cần khởi tạo giá trị khác nhau để tráo
        if score1 == score2:
            # Gán score cho đơn 1 cao hơn đơn 2 (Ví dụ: 10 và 9)
            score1 = 10
            score2 = 0
            
        # Swap giá trị
        db.execute(text("UPDATE orders SET priority_score = :s WHERE id = :id"), {"s": score2, "id": order_id_1})
        db.execute(text("UPDATE orders SET priority_score = :s WHERE id = :id"), {"s": score1, "id": order_id_2})
        
        db.commit()
        clear_plans_cache()
        return {"success": True, "message": "Đã hoán đổi thứ tự ưu tiên thành công"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}

@router.post("/reorder-priorities")
async def reorder_priorities(order_ids: list[int], db: Session = Depends(get_db)):
    """
    Cập nhật lại toàn bộ thứ tự ưu tiên theo danh sách ID được truyền vào.
    Phần tử đầu tiên trong list sẽ có priority_score cao nhất.
    """
    try:
        total = len(order_ids)
        for idx, oid in enumerate(order_ids):
            score = total - idx  # Score giảm dần: phần tử đầu có score cao nhất
            db.execute(
                text("UPDATE orders SET priority_score = :s WHERE id = :id"),
                {"s": score, "id": oid}
            )
        db.commit()
        clear_plans_cache()
        return {"success": True, "message": f"Đã cập nhật thứ tự {total} đơn hàng ưu tiên"}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}


@router.get("/{plan_id}/part-products")
async def get_part_products(plan_id: int, part_name: str = "", spec: str = "", stage: str = "", db: Session = Depends(get_db)):
    """Trả về danh sách sản phẩm sử dụng 1 chi tiết cụ thể trong kế hoạch, kèm số lượng"""
    try:
        sql = text("""
            SELECT 
                o.id    AS order_id,
                p.name  AS prod_name,
                p.sku   AS prod_sku,
                COALESCE(p.total_qty, p.quantity, 0) AS prod_qty,
                b.quantity AS bom_qty_per_unit,
                COALESCE(p.total_qty, p.quantity, 0) * COALESCE(b.quantity, 0) AS part_qty_needed,
                b.specification,
                o.customer,
                o.order_code,
                b.input_stage,
                b.output_stage
            FROM bom_details b
            JOIN products p ON b.product_id = p.id
            JOIN orders o   ON p.order_id  = o.id
            WHERE o.plan_id = :pid
              AND (b.name = :pname OR b.name LIKE :pname + ' - %')
            ORDER BY o.is_priority DESC, o.priority_score DESC, o.id ASC
        """)
        rows = db.execute(sql, {"pid": plan_id, "pname": part_name}).fetchall()

        target_stages = [normalize_vn(s.strip()) for s in stage.split(",") if s.strip()] if stage else []

        # 1. Tính tổng đã giao (giống get_plan_detail)
        deliv_sql = text("""
            SELECT SUM(
                CAST(COALESCE(d.quantity_received, d.quantity_total, 0) AS INT) - 
                CAST(COALESCE(d.quantity_returned, 0) AS INT)
            )
            FROM deliveries d
            WHERE d.plan_id = :pid AND d.part_name = :pname 
              AND (:spec = '' OR :spec = N'Không có' OR COALESCE(d.specification, '') = :spec)
            -- Lọc thêm status hợp lệ
              AND d.status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
        """)
        total_delivered = db.execute(deliv_sql, {"pid": plan_id, "pname": part_name, "spec": spec or ""}).scalar() or 0
        remaining_delivered = float(total_delivered)

        results = []
        for r in rows:
            # 1. Lọc theo specification
            if spec and spec not in ['', 'Không có']:
                if (r.specification or '') != spec:
                    continue
            
            # 2. Lọc theo stage (Công đoạn giao)
            if target_stages:
                input_norm = normalize_vn(r.input_stage)
                if not any(ts in input_norm for ts in target_stages):
                    continue

            # Tính FIFO cho Delivered
            needed = float(r.part_qty_needed or 0)
            allocated_delivered = min(remaining_delivered, needed)
            if allocated_delivered > 0:
                remaining_delivered -= allocated_delivered

            results.append({
                "order_id": r.order_id,
                "prod_name": r.prod_name or "",
                "prod_sku":  r.prod_sku  or "",
                "prod_qty":  int(r.prod_qty or 0),
                "part_qty_needed": int(needed),
                "delivered": int(allocated_delivered), # [NEW] Trả về số lượng đã giao
                "specification": r.specification or "",
                "customer": r.customer or "",
                "order_code": r.order_code or ""
            })
        return results
    except Exception as e:
        import traceback; traceback.print_exc()
        return []

@router.get("/product-progress/{product_id}")

async def get_product_progress(product_id: int, db: Session = Depends(get_db)):
    try:
        # 1. Lấy thông tin cơ bản của sản phẩm, đơn hàng và kế hoạch
        sql_info = text("""
            SELECT 
                p.id as prod_id, p.name as prod_name, p.sku as prod_sku, COALESCE(p.total_qty, p.quantity) as qty,
                o.id as order_id, o.order_code, o.customer,
                pp.name as plan_name, pp.id as plan_id
            FROM products p
            JOIN orders o ON p.order_id = o.id
            JOIN product_plans pp ON o.plan_id = pp.id
            WHERE p.id = :pid
        """)
        info = db.execute(sql_info, {"pid": product_id}).fetchone()
        if not info:
            return {"error": "Không tìm thấy sản phẩm"}

        # 2. Lấy toàn bộ linh kiện đã gán cho đơn hàng này và hàng chung của Plan (Để tính tiêu thụ)
        assigned_sql = text("""
            SELECT part_name, SUM(COALESCE(quantity_total, 0)) as total
            FROM deliveries 
            WHERE plan_id = :pid AND order_id = :oid AND id NOT IN (SELECT delivery_id FROM delivery_details WHERE delivery_id IS NOT NULL)
            AND status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
            GROUP BY part_name
            
            UNION ALL
            
            SELECT dd.part_name, SUM(COALESCE(dd.quantity, 0)) as total
            FROM deliveries d
            JOIN delivery_details dd ON d.id = dd.delivery_id
            WHERE d.plan_id = :pid AND dd.order_id = :oid
            AND d.status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
            GROUP BY dd.part_name
        """)
        unassigned_sql = text("""
            SELECT d.part_name, SUM(COALESCE(d.quantity_total, 0)) as total
            FROM deliveries d
            WHERE d.plan_id = :pid 
            AND (d.order_id IS NULL OR d.order_id = 0)
            AND d.id NOT IN (SELECT delivery_id FROM delivery_details WHERE delivery_id IS NOT NULL AND order_id IS NOT NULL)
            AND d.status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
            GROUP BY d.part_name
        """)
        
        import re as _re2, unicodedata as _ud2
        _ws2 = _re2.compile(r'\s+')
        def _cn(n):
            if not n: return ""
            return _ws2.sub('', _ud2.normalize('NFC', str(n)).strip().lower())

        global_locked = {}
        for row in db.execute(assigned_sql, {"pid": info.plan_id, "oid": info.order_id}).fetchall():
            cn = _cn(row.part_name)
            global_locked[cn] = global_locked.get(cn, 0.0) + float(row.total or 0)
            
        global_map = {}
        for row in db.execute(unassigned_sql, {"pid": info.plan_id}).fetchall():
            cn = _cn(row.part_name)
            global_map[cn] = global_map.get(cn, 0.0) + float(row.total or 0)

        import re as _re, unicodedata as _ud
        _ws = _re.compile(r'\s+')
        def clean_name(n):
            if not n: return ""
            return _ws.sub('', _ud.normalize('NFC', str(n)).strip().lower())

        def consume(name, needed):
            cn = clean_name(name)
            locked = global_locked.get(cn, 0.0)
            taken_locked = min(locked, needed)
            if taken_locked > 0:
                global_locked[cn] -= taken_locked
            rem = max(0, needed - taken_locked)
            avail = global_map.get(cn, 0.0)
            taken_shared = min(avail, rem)
            if taken_shared > 0:
                global_map[cn] -= taken_shared
            return taken_locked + taken_shared

        # 3. Chạy consume cho TẤT CẢ sản phẩm trong cùng đơn hàng (FIFO)
        all_prods_sql = text("SELECT id, name, sku, COALESCE(total_qty, quantity) as qty FROM products WHERE order_id = :oid ORDER BY id ASC")
        all_prods = db.execute(all_prods_sql, {"oid": info.order_id}).fetchall()
        
        delivered_store = {}  # (prod_id, bom_id) -> quantity
        
        if all_prods:
            all_prod_ids = [p.id for p in all_prods]
            # Tải hàng loạt BOM chi tiết của tất cả các sản phẩm để tránh N+1 queries
            pids_placeholder = ", ".join(f":pid{i}" for i in range(len(all_prod_ids)))
            bind_params = {f"pid{i}": pid for i, pid in enumerate(all_prod_ids)}
            p_bom_sql = text(f"SELECT id, name, quantity, parent_id, product_id FROM bom_details WHERE product_id IN ({pids_placeholder}) AND name NOT LIKE 'Ván ghép%'")
            all_boms = db.execute(p_bom_sql, bind_params).fetchall()
            
            # Phân loại BOM theo product_id
            bom_by_prod = {}
            for b in all_boms:
                if b.product_id not in bom_by_prod:
                    bom_by_prod[b.product_id] = []
                bom_by_prod[b.product_id].append(b)
                
            for p_info in all_prods:
                p_bom = bom_by_prod.get(p_info.id, [])
                if not p_bom:
                    delivered_store[(p_info.id, 0)] = consume(p_info.name, float(p_info.qty or 0))
                else:
                    for b in p_bom:
                        needed = float(b.quantity or 0) * float(p_info.qty or 1)
                        delivered_store[(p_info.id, b.id)] = consume(b.name, needed)

        # 4. Dựng cây BOM cho sản phẩm hiện tại dựa trên delivered_store đã tính
        sql_bom = text("""
            SELECT id, name, quantity, unit, sku, parent_id
            FROM bom_details
            WHERE product_id = :pid 
            AND name NOT LIKE 'Ván ghép%'
        """)
        bom_raw = db.execute(sql_bom, {"pid": product_id}).fetchall()
        
        def build_tree(items, parent_id=None, level=0):
            tree = []
            for item in [i for i in items if i.parent_id == parent_id]:
                actual = delivered_store.get((product_id, item.id), 0)
                plan_qty = float(item.quantity or 0) * float(info.qty or 1)
                status = "Chờ xử lý"
                if actual >= plan_qty and plan_qty > 0:
                    status = "Hoàn thành"
                elif actual > 0:
                    status = "Đang thực hiện"
                node = {
                    "id": item.id, "name": item.name, "sku": item.sku,
                    "plan": int(plan_qty), "actual": int(actual),
                    "status": status, "unit": item.unit, "level": level,
                    "children": build_tree(items, item.id, level + 1)
                }
                tree.append(node)
            return tree

        parts_tree = build_tree(bom_raw)

        if not parts_tree:
            actual_prod = delivered_store.get((product_id, 0), 0)
            parts_tree.append({
                "name": info.prod_name, "sku": info.prod_sku, "plan": info.qty,
                "actual": int(actual_prod),
                "status": "Hoàn thành" if actual_prod >= info.qty else "Đang thực hiện" if actual_prod > 0 else "Chờ xử lý",
                "unit": "Cái", "level": 0, "children": []
            })
            
        # Tính toán tổng tiến độ (phẳng hóa cây để tính)
        def flatten_tree(nodes):
            flat = []
            for n in nodes:
                flat.append(n)
                flat.extend(flatten_tree(n.get("children", [])))
            return flat
        
        flat_parts = flatten_tree(parts_tree)

        # 3. Lấy Nhật ký bàn giao chi tiết (Logs) - ưu tiên delivery_details
        sql_logs = text("""
            SELECT 
                dd.part_name, dd.quantity, d.created_at, d.receiving_stage
            FROM delivery_details dd
            JOIN deliveries d ON dd.delivery_id = d.id
            WHERE d.plan_id = :plan_id AND dd.order_id = :oid
            AND d.status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Đã nhận hàng')
            ORDER BY d.created_at DESC
        """)
        logs_raw = db.execute(sql_logs, {"plan_id": info.plan_id, "oid": info.order_id}).fetchall()
        
        logs = []
        for log in logs_raw:
            logs.append({
                "name": log.part_name,
                "qty": log.quantity,
                "stage": log.receiving_stage,
                "time": log.created_at.strftime("%H:%M %d/%m")
            })

        return {
            "khsx": info.plan_name,
            "orderCode": info.order_code,
            "customer": info.customer,
            "totalQty": info.qty,
            "sku": info.prod_sku,
            "prodName": info.prod_name,
            "deadline": "30/06/2026",
            "currentProgress": sum(p["actual"] for p in flat_parts), 
            "targetProgress": sum(p["plan"] for p in flat_parts),
            "stages": parts_tree,
            "logs_summary": logs[:10]
        }
    except Exception as e:
        print(f"Lỗi: {str(e)}")
        return {"error": str(e)}

@router.get("/{id}")
@_plan_detail_swr_cache
def get_plan_detail(
    id: int, 
    stage: Optional[str] = None, 
    skip: int = 0, 
    limit: int = 15, 
    q: Optional[str] = None,
    prefix: Optional[str] = None,
    status: Optional[str] = 'ALL',
    sort_order: Optional[str] = 'ID_DESC',
    exact_order: Optional[str] = 'ALL',
    user_stage: Optional[str] = None,
    simple: Optional[bool] = None,
    order_ids: Optional[str] = None,
    page: Optional[int] = None,
    pageSize: Optional[int] = 15,
    statusFilter: Optional[str] = None,
    filterProduct: Optional[str] = None,
    sortBy: Optional[str] = None,
    db: Session = Depends(get_db)
):
    # Tự động kích hoạt simple=True nếu limit == 0 và stage is None (luồng xem nhanh từ di động)
    if simple is None:
        if limit == 0 and not stage:
            simple = True
        else:
            simple = False

    # 1. Lấy thông tin kế hoạch
    print(f"[DEBUG API] get_plan_detail called: id={id}, stage={stage}, order_ids={order_ids}")
    plan_info = db.query(ProductPlan).filter(ProductPlan.id == id).first()
    if not plan_info:
        plan_info = db.query(ProductPlan).filter(ProductPlan.code == str(id)).first()
    if not plan_info:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy kế hoạch: {id}")

    # Lọc theo nhà máy (factory) từ user_stage
    factory = None
    if user_stage:
        import re
        match = re.search(r'(NM\d+)', user_stage)
        if match:
            factory = match.group(1)

    # [QUAN TRỌNG] Lấy tất cả Prefixes cho toàn bộ kế hoạch ngay từ đầu
    if factory:
        all_orders_codes_sql = """
            SELECT o.order_code FROM orders o 
            WHERE o.plan_id = :pid AND o.order_code IS NOT NULL AND o.order_code <> ''
              AND EXISTS (
                  SELECT 1 FROM products p2
                  JOIN bom_details b2 ON b2.product_id = p2.id
                  WHERE p2.order_id = o.id
                    AND (b2.input_stage LIKE :factory_like OR b2.output_stage LIKE :factory_like)
              )
        """
        all_codes_rows = db.execute(text(all_orders_codes_sql), {"pid": plan_info.id, "factory_like": f"%{factory}%"}).fetchall()
    else:
        all_orders_codes_sql = "SELECT order_code FROM orders WHERE plan_id = :pid AND order_code IS NOT NULL AND order_code <> ''"
        all_codes_rows = db.execute(text(all_orders_codes_sql), {"pid": plan_info.id}).fetchall()
        
    prefix_set = set()
    for row in all_codes_rows:
        code = row[0].strip().upper()
        p = code.split('-')[0]
        if p and len(p) < 10: prefix_set.add(p)
    all_prefixes = sorted(list(prefix_set))

    if simple:
        try:
            allowed_order_ids = set()
            if factory:
                factory_sql = """
                    SELECT DISTINCT p.order_id 
                    FROM products p
                    JOIN bom_details b ON b.product_id = p.id
                    WHERE b.input_stage LIKE :factory_like OR b.output_stage LIKE :factory_like
                """
                rows = db.execute(text(factory_sql), {"factory_like": f"%{factory}%"}).fetchall()
                allowed_order_ids = {r[0] for r in rows if r[0] is not None}

            from sqlalchemy.orm import selectinload
            orders_query = db.query(Order).options(selectinload(Order.products)).filter(Order.plan_id == plan_info.id)
            if factory:
                orders_query = orders_query.filter(Order.id.in_(list(allowed_order_ids)))
            
            orders = orders_query.order_by(Order.is_priority.desc(), Order.priority_score.desc(), Order.id.desc()).all()
            
            from modules.inspection.models.input_inspection import InputInspection
            # [NEW] Lấy danh sách ID đơn hàng đã có dữ liệu bàn giao (không phụ thuộc plan_id của delivery)
            # Tối ưu hóa: Chỉ lọc theo danh sách ID đơn hàng thuộc kế hoạch này thay vị quét toàn bộ bảng
            order_ids_list = [o.id for o in orders]
            if order_ids_list:
                # [PERF] Sử dụng UNION SQL để lấy các order_id có dữ liệu từ cả deliveries và delivery_details trong 1 câu SQL
                union_sql = text("""
                    SELECT DISTINCT order_id FROM deliveries WITH (NOLOCK) WHERE order_id IN :ids AND order_id IS NOT NULL
                    UNION
                    SELECT DISTINCT order_id FROM delivery_details WITH (NOLOCK) WHERE order_id IN :ids AND order_id IS NOT NULL
                """)
                has_data_ids = {r[0] for r in db.execute(union_sql, {"ids": tuple(order_ids_list)}).fetchall() if r[0] is not None}
            else:
                has_data_ids = set()

            # 3. Từ InputInspection (Kiểm tra đầu vào) - Khớp theo mã PO trong cùng KHSX
            has_inspection_codes = {r[0] for r in db.query(InputInspection.cont_name).filter(
                InputInspection.plan_id == plan_info.id, 
                InputInspection.cont_name != None
            ).distinct().all()}

            result_orders = []
            total_plan_qty = 0
            for o in orders:
                products_list = []
                for p in o.products:
                    qty = int(p.total_qty or p.quantity or 0)
                    total_plan_qty += qty
                    products_list.append({
                        "id": p.id,
                        "sku": p.sku,
                        "name": p.name,
                        "quantity": qty,
                        "finished_quantity": 0,
                        "total_parts_qty": 0,
                        "finished_time": "---",
                        "progress": 0.0,
                        "bom_details": []
                    })
                
                # Check has_data: Có bàn giao (ID) hoặc Có kiểm tra đầu vào (Mã code)
                order_has_data = (o.id in has_data_ids) or (o.order_code in has_inspection_codes)
                
                result_orders.append({
                    "id": o.id,
                    "name": o.order_code,
                    "customer": o.customer,
                    "is_priority": getattr(o, 'is_priority', 0),
                    "priority_score": getattr(o, 'priority_score', 0),
                    "order_status": o.order_status or 0,
                    "has_data": order_has_data,
                    "order_progress": 0.0,
                    "products": products_list
                })
            
            # Nếu KHÔNG phân trang (tương thích ngược)
            if page is None:
                return {
                    "id": plan_info.id,
                    "name": plan_info.name,
                    "plan_code": plan_info.code,
                    "status": "Đang sản xuất" if plan_info.status == 1 else "Chờ sản xuất",
                    "estimated_date": plan_info.estimated_date,
                    "finished_date": plan_info.finished_date,
                    "month": getattr(plan_info, 'month', None),
                    "year": getattr(plan_info, 'year', None),
                    "total_main_quantity": total_plan_qty,
                    "total_orders": len(result_orders),
                    "prefixes": all_prefixes,
                    "orders": result_orders
                }

            # Nếu CÓ phân trang (Server-side cho Hồ sơ chất lượng)
            # Lọc theo Tìm kiếm (q)
            if q:
                q_lower = q.lower()
                result_orders = [o for o in result_orders if q_lower in (o["name"] or "").lower()]

            # Lọc theo Sản phẩm (filterProduct)
            if filterProduct and filterProduct != 'all':
                result_orders = [o for o in result_orders if any((p["name"] == filterProduct) for p in o["products"])]

            # Lọc theo Trạng thái dữ liệu (statusFilter)
            if statusFilter and statusFilter != 'all':
                if statusFilter == 'has_data':
                    result_orders = [o for o in result_orders if o["has_data"]]
                elif statusFilter == 'no_data':
                    result_orders = [o for o in result_orders if not o["has_data"]]

            # Sắp xếp
            if sortBy == 'po_asc':
                result_orders.sort(key=lambda x: (x["name"] or ""))
            elif sortBy == 'po_desc':
                result_orders.sort(key=lambda x: (x["name"] or ""), reverse=True)
            elif sortBy == 'qty_asc':
                result_orders.sort(key=lambda x: sum(p["quantity"] for p in x["products"]))
            elif sortBy == 'qty_desc':
                result_orders.sort(key=lambda x: sum(p["quantity"] for p in x["products"]), reverse=True)

            # Phân trang
            total_count = len(result_orders)
            start_idx = (page - 1) * pageSize
            end_idx = start_idx + pageSize
            paginated_orders = result_orders[start_idx:end_idx]

            # Thống kê stats của tập kết quả khớp lọc trước khi cắt trang
            stats = {"all": 0, "has_data": 0, "no_data": 0}
            for o in result_orders:
                stats["all"] += 1
                if o["has_data"]:
                    stats["has_data"] += 1
                else:
                    stats["no_data"] += 1

            # Thu thập danh sách sản phẩm duy nhất thuộc các orders hợp lệ (để hiển thị select filter)
            unique_products = list(set([p["name"] for o in result_orders for p in o["products"] if p["name"]]))

            return {
                "id": plan_info.id,
                "name": plan_info.name,
                "plan_code": plan_info.code,
                "status": "Đang sản xuất" if plan_info.status == 1 else "Chờ sản xuất",
                "estimated_date": plan_info.estimated_date,
                "finished_date": plan_info.finished_date,
                "month": getattr(plan_info, 'month', None),
                "year": getattr(plan_info, 'year', None),
                "total_main_quantity": total_plan_qty,
                "total_orders": total_count,
                "prefixes": all_prefixes,
                "items": paginated_orders,
                "total_count": total_count,
                "stats": stats,
                "unique_products": unique_products
            }
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=str(e))

    try:
        if stage:
            try:
                # Phân tích danh sách order_ids
                order_ids_filter_plan = ""
                order_ids_filter_deliv = ""
                if order_ids:
                    try:
                        valid_ids = [int(x.strip()) for x in order_ids.split(",") if x.strip()]
                        if valid_ids:
                            ids_str = ",".join(map(str, valid_ids))
                            order_ids_filter_plan = f"AND o.id IN ({ids_str})"
                            order_ids_filter_deliv = f"""AND (d.order_id IN ({ids_str}) OR EXISTS (
                                SELECT 1 FROM delivery_details dd 
                                WHERE dd.delivery_id = d.id AND dd.order_id IN ({ids_str})
                            ))"""
                    except ValueError:
                        pass

                # [SAFE VERSION] Sử dụng các cột cơ bản để tránh lỗi Invalid Column Name
                sql = text(f"""
                    WITH PlanDetails AS (
                        SELECT 
                            -- [CHỈNH SỬA] Nhóm theo tên sạch và quy cách để tránh nhân bản số lượng khi JOIN
                            CASE 
                                WHEN CHARINDEX(' - ', b.name) > 0 THEN SUBSTRING(b.name, 1, CHARINDEX(' - ', b.name) - 1)
                                ELSE b.name
                            END as name_clean,
                            b.input_stage, b.output_stage, b.specification,
                            SUM(COALESCE(b.quantity, 0) * COALESCE(p.total_qty, p.quantity, 0)) as total_plan_qty
                        FROM bom_details b WITH (NOLOCK)
                        JOIN products p WITH (NOLOCK) ON b.product_id = p.id
                        JOIN orders o WITH (NOLOCK) ON p.order_id = o.id
                        WHERE o.plan_id = :pid {order_ids_filter_plan}
                        GROUP BY 
                            CASE 
                                WHEN CHARINDEX(' - ', b.name) > 0 THEN SUBSTRING(b.name, 1, CHARINDEX(' - ', b.name) - 1)
                                ELSE b.name
                            END,
                            b.input_stage, b.output_stage, b.specification
                    ),
                    ActualDeliveries AS (
                        SELECT 
                            d.part_name,
                            d.specification,
                            SUM(
                                CAST(COALESCE(d.quantity_received, d.quantity_total, 0) AS INT) - 
                                CAST(COALESCE(d.quantity_returned, 0) AS INT)
                            ) as total_delivered_qty,
                            SUM(COALESCE(d.residual, 0)) as total_residual_qty
                        FROM deliveries d WITH (NOLOCK)
                        WHERE d.plan_id = :pid AND d.status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
                          {order_ids_filter_deliv}
                        GROUP BY d.part_name, d.specification
                    )
                    SELECT 
                        pd.name_clean, pd.input_stage, pd.output_stage, pd.total_plan_qty, pd.specification,
                        COALESCE(ad.total_delivered_qty, 0) as total_delivered_qty,
                        COALESCE(ad.total_residual_qty, 0) as total_residual_qty
                    FROM PlanDetails pd
                    LEFT JOIN ActualDeliveries ad 
                        ON pd.name_clean = ad.part_name 
                        AND COALESCE(pd.specification, '') = COALESCE(ad.specification, '')
                """)
                
                rows = db.execute(sql, {"pid": plan_info.id}).fetchall()

                # [NEW] Truy vấn phụ: Lấy danh sách order names cho mỗi (name_clean, specification)
                spec_order_sql = text(f"""
                    SELECT DISTINCT
                        CASE 
                            WHEN CHARINDEX(' - ', b.name) > 0 THEN SUBSTRING(b.name, 1, CHARINDEX(' - ', b.name) - 1)
                            ELSE b.name
                        END as name_clean,
                        COALESCE(b.specification, '') as specification,
                        o.order_code as order_name
                    FROM bom_details b WITH (NOLOCK)
                    JOIN products p WITH (NOLOCK) ON b.product_id = p.id
                    JOIN orders o WITH (NOLOCK) ON p.order_id = o.id
                    WHERE o.plan_id = :pid {order_ids_filter_plan}
                """)
                spec_order_rows = db.execute(spec_order_sql, {"pid": plan_info.id}).fetchall()
                
                # Gom: (name_clean, spec) → [order_name1, order_name2, ...]
                spec_order_map = {}
                for sor in spec_order_rows:
                    key = (sor.name_clean.strip().lower(), (sor.specification or '').strip().lower())
                    if key not in spec_order_map:
                        spec_order_map[key] = []
                    if sor.order_name and sor.order_name not in spec_order_map[key]:
                        spec_order_map[key].append(sor.order_name)

                # Hỗ trợ tham số stage chứa nhiều công đoạn cách nhau bởi dấu phẩy
                target_stages = [normalize_vn(s.strip()) for s in stage.split(",") if s.strip()] if stage else []
                
                handover_list = []
                receive_list = []
                
                for row in rows:
                    input_norm = normalize_vn(row.input_stage)
                    output_norm = normalize_vn(row.output_stage)
                    
                    # Tra cứu order_names cho item này
                    lookup_key = (row.name_clean.strip().lower(), (row.specification or '').strip().lower())
                    order_names = spec_order_map.get(lookup_key, [])

                    item = {
                        "sku": "", # SKU không còn ý nghĩa khi đã gộp nhiều sản phẩm
                        "name": row.name_clean, 
                        "displayName": row.name_clean, 
                        "quantity": int(row.total_plan_qty or 0),
                        "delivered": int(row.total_delivered_qty or 0),
                        "residual": int(row.total_residual_qty or 0),
                        "input_stage": row.input_stage,
                        "output_stage": row.output_stage,
                        "specification": row.specification or "",
                        "order_names": order_names
                    }
                    
                    is_handover = any(ts in input_norm for ts in target_stages) if target_stages else True
                    is_receive = any(ts in output_norm for ts in target_stages) if target_stages else True
                    
                    if is_handover:
                        handover_list.append(item)
                    if is_receive:
                        receive_list.append(item)
 
                return {
                    "id": plan_info.id,
                    "name": plan_info.name,
                    "finished_date": plan_info.finished_date,
                    "estimated_date": plan_info.estimated_date,
                    "month": plan_info.month,
                    "year": plan_info.year,
                    "prefixes": all_prefixes,
                    "bom_details": {"handover": handover_list, "receive": receive_list}
                }
            except Exception as e:
                print(f"[API ERROR]: {str(e)}")
                traceback.print_exc()
                return {
                    "id": plan_info.id, "name": plan_info.name, "prefixes": all_prefixes,
                    "bom_details": {"handover": [], "receive": []}, "error": str(e)
                }
        else:
            import re
            import unicodedata
            _ws_re = re.compile(r'\s+')
            def clean_name(name):
                if not name: return ""
                norm_str = unicodedata.normalize('NFC', str(name))
                return _ws_re.sub('', norm_str.strip().lower())
 
            # Bước 1: Lấy Orders + Products trong 1 JOIN SQL
            base_params = {"pid": plan_info.id}
            where_clauses = ["o.plan_id = :pid"]
            if q:
                where_clauses.append("(o.order_code LIKE :q OR o.customer LIKE :q)")
                base_params["q"] = f"%{q}%"
            if prefix and prefix != 'ALL':
                where_clauses.append("o.order_code LIKE :prefix")
                base_params["prefix"] = f"{prefix}%"
            if exact_order and exact_order != 'ALL':
                where_clauses.append("o.order_code = :exact_order")
                base_params["exact_order"] = exact_order
            if order_ids:
                try:
                    valid_ids = [int(x.strip()) for x in order_ids.split(",") if x.strip()]
                    if valid_ids:
                        ids_str = ",".join(map(str, valid_ids))
                        where_clauses.append(f"o.id IN ({ids_str})")
                except ValueError:
                    pass
            if factory:
                where_clauses.append("""
                    EXISTS (
                        SELECT 1 FROM products p2
                        JOIN bom_details b2 ON b2.product_id = p2.id
                        WHERE p2.order_id = o.id
                          AND (b2.input_stage LIKE :factory_like OR b2.output_stage LIKE :factory_like)
                    )
                """)
                base_params["factory_like"] = f"%{factory}%"
            where_str = " AND ".join(where_clauses)

            main_sql = f"""
                SELECT o.id as oid, o.order_code, o.customer, o.is_priority, o.priority_score,
                       p.id as pid, p.sku as prod_sku, p.name as prod_name,
                       COALESCE(p.total_qty, p.quantity) as qty
                FROM orders o
                JOIN products p ON p.order_id = o.id
                WHERE {where_str}
                ORDER BY o.is_priority DESC, o.priority_score DESC, o.id DESC
            """
            main_rows = db.execute(text(main_sql), base_params).fetchall()

            if not main_rows:
                return {
                    "id": plan_info.id, "name": plan_info.name, "plan_code": plan_info.code,
                    "status": "Đang sản xuất" if plan_info.status == 1 else "Chờ sản xuất",
                    "estimated_date": plan_info.estimated_date, "finished_date": plan_info.finished_date,
                    "total_main_quantity": 0, "total_orders": 0, "prefixes": all_prefixes, "orders": []
                }

            # Gom vào dict - O(n), đồng thời track representative pid cho mỗi SKU
            orders_map = {}      # oid -> order_data
            sku_to_repr_pid = {} # sku -> representative product_id (để load BOM 1 lần)
            repr_pid_to_sku = {} # representative pid -> sku (ngược lại)
            total_plan_qty = 0

            for r in main_rows:
                oid, pid, sku, qty = r.oid, r.pid, r.prod_sku or r.prod_name, int(r.qty or 0)
                total_plan_qty += qty
                if oid not in orders_map:
                    orders_map[oid] = {
                        "id": oid, "name": r.order_code, "customer": r.customer,
                        "is_priority": getattr(r, 'is_priority', 0),
                        "priority_score": getattr(r, 'priority_score', 0),
                        "_prods": {}, "total_planned": 0.0, "total_delivered": 0.0
                    }
                if pid not in orders_map[oid]["_prods"]:
                    orders_map[oid]["_prods"][pid] = {
                        "id": pid, "sku": r.prod_sku, "name": r.prod_name,
                        "quantity": qty, "_sku_key": sku
                    }
                    # Chỉ đăng ký 1 representative pid cho mỗi sku
                    if sku not in sku_to_repr_pid:
                        sku_to_repr_pid[sku] = pid
                        repr_pid_to_sku[pid] = sku

            # Bước 2: Load BOM chỉ cho representative pid của mỗi SKU (tránh load trùng)
            repr_pids = list(repr_pid_to_sku.keys())
            bom_by_sku = {}  # sku -> [bom_rows]
            if repr_pids:
                rp_str = ",".join(map(str, repr_pids))
                bom_sql = f"""
                    SELECT id, product_id, parent_id, name, quantity
                    FROM bom_details WHERE product_id IN ({rp_str})
                    AND name NOT LIKE 'Ván ghép%'
                    ORDER BY product_id, COALESCE(parent_id, 0)
                """
                for b in db.execute(text(bom_sql)).fetchall():
                    sku_key = repr_pid_to_sku.get(b.product_id)
                    if sku_key:
                        bom_by_sku.setdefault(sku_key, []).append(b)

            # Bước 3: Lấy Deliveries (1 câu SQL)
            # Tách linh kiện đã gán (order_id) và chưa gán (NULL) để hỗ trợ cơ chế mới và cũ
            assigned_sql = """
                -- Dữ liệu cũ (order_id nằm trên deliveries)
                SELECT order_id, part_name,
                       SUM(COALESCE(quantity_total, 0)) as total_delivered,
                       MAX(created_at) as last_time
                FROM deliveries
                WHERE plan_id = :pid AND order_id IS NOT NULL AND id NOT IN (SELECT delivery_id FROM delivery_details WHERE delivery_id IS NOT NULL)
                  AND status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
                GROUP BY order_id, part_name
                
                UNION ALL
                
                -- Dữ liệu mới (order_id nằm trên delivery_details)
                SELECT dd.order_id, dd.part_name,
                       SUM(COALESCE(dd.quantity, 0)) as total_delivered,
                       MAX(d.created_at) as last_time
                FROM deliveries d
                JOIN delivery_details dd ON d.id = dd.delivery_id
                WHERE d.plan_id = :pid AND dd.order_id IS NOT NULL
                  AND d.status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
                GROUP BY dd.order_id, dd.part_name
            """
            global_locked = {} # {order_id: {part_name: qty}}
            global_time = {}
            for dr in db.execute(text(assigned_sql), {"pid": plan_info.id}).fetchall():
                oid_locked = dr.order_id
                cn = clean_name(dr.part_name)
                if oid_locked not in global_locked:
                    global_locked[oid_locked] = {}
                # Ghi nhận số lượng đã khóa, cộng dồn nếu có trùng lặp part_name
                global_locked[oid_locked][cn] = global_locked[oid_locked].get(cn, 0.0) + float(dr.total_delivered or 0)
                if not global_time.get(cn) or dr.last_time > global_time[cn]:
                    global_time[cn] = dr.last_time

            unassigned_sql = """
                SELECT d.part_name,
                       SUM(COALESCE(d.quantity_total, 0)) as total_delivered,
                       MAX(d.created_at) as last_time
                FROM deliveries d
                WHERE d.plan_id = :pid 
                  AND (d.order_id IS NULL OR d.order_id = 0) 
                  AND d.id NOT IN (SELECT delivery_id FROM delivery_details WHERE delivery_id IS NOT NULL AND order_id IS NOT NULL)
                  AND d.status IN (N'Đã nhận', N'Hoàn thành', N'Đã Nhận', N'Hoàn Thành', N'Hoàn thảnh', N'Đã nhận hàng', N'Trả Hàng', N'Trả hàng', N'Đã trả hàng', N'Trả một phần')
                GROUP BY d.part_name
            """
            global_map = {}
            for dr in db.execute(text(unassigned_sql), {"pid": plan_info.id}).fetchall():
                cn = clean_name(dr.part_name)
                global_map[cn] = float(dr.total_delivered or 0)
                if not global_time.get(cn) or dr.last_time > global_time[cn]:
                    global_time[cn] = dr.last_time

            def consume(name, needed, order_id):
                cn = clean_name(name)
                # 1. Lấy từ số lượng đã gán (khóa) cho đơn hàng này
                locked_qty = global_locked.get(order_id, {}).get(cn, 0.0)
                taken_locked = min(locked_qty, needed)
                if taken_locked > 0:
                    global_locked[order_id][cn] -= taken_locked
                
                # 2. Nếu vẫn còn thiếu, lấy từ pool chung (linh kiện cũ chưa gán)
                remaining = needed - taken_locked
                avail = global_map.get(cn, 0.0)
                taken_from_pool = min(avail, remaining)
                if taken_from_pool > 0:
                    global_map[cn] = avail - taken_from_pool
                    
                return taken_locked + taken_from_pool

            # Bước 4: Pre-build children_by_parent dict cho mỗi SKU (O(n) thay vì O(n²))
            children_by_sku = {}
            roots_by_sku = {}
            for sku_key, bom_list in bom_by_sku.items():
                cbd = {}
                roots = []
                for b in bom_list:
                    pid_b = b.parent_id
                    if pid_b is None:
                        roots.append(b)
                    else:
                        if pid_b not in cbd:
                            cbd[pid_b] = []
                        cbd[pid_b].append(b)
                children_by_sku[sku_key] = cbd
                roots_by_sku[sku_key] = roots

            # PASS 1 - Chạy consume FIFO cho tất cả đơn hàng (O(n) per product)
            planned_store = {}   # (sku_key, pid, bom_id) -> float
            delivered_store = {} # (sku_key, pid, bom_id) -> float

            for oid, order_data in orders_map.items():
                for prod_pid, prod_data in order_data["_prods"].items():
                    qty = prod_data["quantity"]
                    sku_key = prod_data["_sku_key"]
                    cbd = children_by_sku.get(sku_key, {})
                    roots = roots_by_sku.get(sku_key, [])
                    prod_tP = 0.0
                    prod_tD = 0.0
                    prod_last = None

                    if not roots:
                        # Fallback nếu không có BOM, coi chính sản phẩm là 1 chi tiết
                        p_planned = float(qty or 0)
                        p_delivered = consume(prod_data["name"], p_planned, oid)
                        
                        # [CHỈNH SỬA] Lưu vào store để build_bom_tree có dữ liệu
                        planned_store[(sku_key, prod_pid, 0)] = p_planned
                        delivered_store[(sku_key, prod_pid, 0)] = p_delivered
                        
                        prod_tP = p_planned
                        prod_tD = p_delivered
                    else:
                        stack = list(roots)
                        while stack:
                            node = stack.pop()
                            planned = float(node.quantity or 0) * (qty if qty > 0 else 1)
                            delivered = consume(node.name, planned, oid)
                            
                            # [CHỈNH SỬA] Lưu kết quả tính toán vào store theo ID chi tiết
                            planned_store[(sku_key, prod_pid, node.id)] = planned
                            delivered_store[(sku_key, prod_pid, node.id)] = delivered
                            
                            # Tính tiến độ trên TẤT CẢ các cụm/chi tiết (Bỏ qua is_leaf)
                            prod_tP += planned
                            prod_tD += delivered
                                
                            if delivered > 0:
                                t = global_time.get(clean_name(node.name))
                                if t and (not prod_last or t > prod_last):
                                    prod_last = t
                            # Thêm children vào stack (O(1) lookup)
                            for child in cbd.get(node.id, []):
                                stack.append(child)

                    prod_data["_tP"] = prod_tP
                    prod_data["_tD"] = prod_tD
                    prod_data["progress"] = min(100.0, round(prod_tD / prod_tP * 100, 1)) if prod_tP > 0 else 0.0
                    prod_data["finished_quantity"] = round(qty * (prod_tD / prod_tP), 2) if prod_tP > 0 else 0
                    prod_data["total_parts_qty"] = prod_tP
                    prod_data["finished_time"] = prod_last.strftime("%d/%m/%Y %H:%M") if (prod_last and prod_tD >= prod_tP) else "---"
                    order_data["total_planned"] += prod_tP
                    order_data["total_delivered"] += prod_tD

            # Flatten + tính order_progress
            final_orders_list = []
            completed_priority_ids = []  # Các đơn ưu tiên đã hoàn thành 100%
            for oid, od in orders_map.items():
                tp, td = od["total_planned"], od["total_delivered"]
                od["order_progress"] = td / tp if tp > 0 else 0
                dbg_str = str(global_locked.get(oid, {}))
                if len(dbg_str) > 30: dbg_str = dbg_str[:30] + "..."
                od["name"] = f"{od['name']}"
                od["status"] = "Đang thực hiện" if 0 < od["order_progress"] < 1 else ("Hoàn thành" if od["order_progress"] >= 1 else "Chờ xử lý")
                final_orders_list.append(od)
                # Thu thập đơn ưu tiên đã đạt 100%
                if od.get("is_priority") == 1 and od["order_progress"] >= 1.0 and tp > 0:
                    completed_priority_ids.append(oid)

            # Tự động bỏ ưu tiên cho đơn đã hoàn thành 100%
            if completed_priority_ids:
                id_list = ",".join(map(str, completed_priority_ids))
                db.execute(text(
                    f"UPDATE orders SET is_priority = 0, priority_score = 0 WHERE id IN ({id_list})"
                ))
                db.commit()
                # Cập nhật lại trong bộ nhớ để response trả về chính xác
                for od in final_orders_list:
                    if od["id"] in completed_priority_ids:
                        od["is_priority"] = 0
                        od["priority_score"] = 0

            # Lọc
            if status == 'DONE':
                filtered = [o for o in final_orders_list if o["order_progress"] >= 1 and o["total_planned"] > 0]
            elif status == 'DOING':
                filtered = [o for o in final_orders_list if 0 < o["order_progress"] < 1]
            elif status == 'PENDING':
                filtered = [o for o in final_orders_list if o["order_progress"] == 0]
            else:
                filtered = final_orders_list
            total_orders_count = len(filtered)

            # Sắp xếp
            if sort_order == 'NAME_ASC':
                filtered.sort(key=lambda x: x["name"])
            elif sort_order == 'NAME_DESC':
                filtered.sort(key=lambda x: x["name"], reverse=True)
            elif sort_order == 'PROGRESS_ASC':
                filtered.sort(key=lambda x: x["order_progress"])
            elif sort_order == 'PROGRESS_DESC':
                filtered.sort(key=lambda x: x["order_progress"], reverse=True)

            # Phân trang
            paged = filtered[skip:skip+limit] if limit > 0 else filtered[skip:]

            # Bước 5: PASS 2 - Load BOM đầy đủ (sku, input/output_stage) chỉ cho trang hiện tại
            page_skus = list({pd["_sku_key"] for od in paged for pd in od["_prods"].values()})
            page_repr_pids = [sku_to_repr_pid[s] for s in page_skus if s in sku_to_repr_pid]
            bom_full_by_sku = {}
            if page_repr_pids:
                pp_str = ",".join(map(str, page_repr_pids))
                bom_full_sql = f"""
                    SELECT id, product_id, parent_id, name, sku, quantity, input_stage, output_stage
                    FROM bom_details WHERE product_id IN ({pp_str})
                    AND name NOT LIKE 'Ván ghép%'
                    ORDER BY product_id, COALESCE(parent_id, 0)
                """
                for b in db.execute(text(bom_full_sql)).fetchall():
                    sku_key = repr_pid_to_sku.get(b.product_id)
                    if sku_key:
                        bom_full_by_sku.setdefault(sku_key, []).append(b)

            def build_bom_tree(bom_list, sku_key, pid_key):
                children_by_parent = {}
                for b in bom_list:
                    children_by_parent.setdefault(b.parent_id, []).append(b)
                def build_node(nid):
                    result = []
                    for child in children_by_parent.get(nid, []):
                        result.append({
                            "id": child.id, "name": child.name, "sku": child.sku,
                            "quantity": child.quantity,
                            "planned": planned_store.get((sku_key, pid_key, child.id), 0),
                            "delivered": delivered_store.get((sku_key, pid_key, child.id), 0),
                            "input_stage": child.input_stage,
                            "output_stage": child.output_stage,
                            "parts": build_node(child.id)
                        })
                    return result
                return build_node(None)

            # Build kết quả cuối
            result_orders = []
            for od in paged:
                products_list = []
                for pid, pd in od["_prods"].items():
                    sku_key = pd["_sku_key"]
                    bom_tree = build_bom_tree(bom_full_by_sku.get(sku_key, []), sku_key, pid)
                    products_list.append({
                        "id": pd["id"], "sku": pd["sku"], "name": pd["name"],
                        "quantity": pd["quantity"],
                        "finished_quantity": pd["finished_quantity"],
                        "total_parts_qty": pd["total_parts_qty"],
                        "finished_time": pd["finished_time"],
                        "progress": pd["progress"],
                        "bom_details": bom_tree
                    })
                result_orders.append({
                    "id": od["id"], "name": od["name"], "customer": od["customer"],
                    "is_priority": od.get("is_priority", 0),
                    "priority_score": od.get("priority_score", 0),
                    "order_progress": round(od["order_progress"] * 100, 1),
                    "products": products_list
                })

            return {
                "id": plan_info.id,
                "name": plan_info.name,
                "plan_code": plan_info.code,
                "status": "Đang sản xuất" if plan_info.status == 1 else "Chờ sản xuất",
                "estimated_date": plan_info.estimated_date,
                "finished_date": plan_info.finished_date,
                "month": getattr(plan_info, 'month', None),
                "year": getattr(plan_info, 'year', None),
                "total_main_quantity": total_plan_qty,
                "total_orders": total_orders_count,
                "prefixes": all_prefixes,
                "orders": result_orders
            }
    except Exception as e:
        error_msg = traceback.format_exc()
        with open("api_debug.log", "a", encoding="utf-8") as f:
            f.write(f"\n--- ERROR AT ID {id} ---\n{error_msg}\n")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=PlanResponse)
def create_plan(plan_data: ProductPlanCreate, db: Session = Depends(get_db)):
    try:
        plan_code = plan_data.code or f"KHSX_{datetime.now().strftime('%m%Y_%H%M%S')}"
        new_plan = ProductPlan(
            code=plan_code,
            name=plan_data.name,
            estimated_date=plan_data.estimated_date,
            finished_date=plan_data.finished_date,
            status=plan_data.status
        )
        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)
        clear_plans_cache()
        return new_plan
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/daily", response_model=List[MobileDailyPlanResponse])
def create_daily_plans(plans: List[MobileDailyPlanCreate], db: Session = Depends(get_db)):
    """Lưu danh sách kế hoạch ngày di động vào database"""
    try:
        inserted = []
        for p in plans:
            existing = db.query(MobileDailyPlan).filter(
                MobileDailyPlan.plan_date == p.plan_date,
                MobileDailyPlan.stage == p.stage,
                MobileDailyPlan.factory == p.factory,
                MobileDailyPlan.order_code == p.order_code,
                MobileDailyPlan.part_name == p.part_name
            ).first()
            if existing:
                existing.planned_qty = p.planned_qty
                existing.remaining_qty = p.remaining_qty
                inserted.append(existing)
            else:
                db_plan = MobileDailyPlan(
                    plan_date=p.plan_date,
                    stage=p.stage,
                    factory=p.factory,
                    order_code=p.order_code,
                    part_name=p.part_name,
                    planned_qty=p.planned_qty,
                    remaining_qty=p.remaining_qty
                )
                db.add(db_plan)
                inserted.append(db_plan)
        db.commit()
        for i in inserted:
            db.refresh(i)
        return inserted
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

