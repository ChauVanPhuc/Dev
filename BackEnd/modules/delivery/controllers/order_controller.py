from sqlalchemy.orm import Session
from modules.delivery.models.order import Order
from modules.delivery.models.order_item import OrderItem
from modules.production.models.product import Product
from modules.production.models.bom_detail import BOMDetail
from modules.delivery.schemas.order import OrderCreate, OrderUpdate
from shared.utils.string_cleaner import clean_and_standardize_name, clean_and_standardize_sku

import datetime
import random
import string

def _generate_order_code():
    now = datetime.datetime.utcnow()
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"DH-{now.year}-{suffix}"

def sync_order_bom_from_master(db: Session, order: Order, force_refresh: bool = False):
    """
    Tự động đồng bộ Quy cách, kích thước và cấu trúc cây BOM chuẩn từ MasterProduct (master_bom_details)
    vào các sản phẩm thuộc đơn hàng (Order / PO).
    """
    if not order or not order.products:
        return order

    from modules.master.models.master_product import MasterProduct
    from modules.master.models.master_bom_detail import MasterBOMDetail
    from sqlalchemy.orm import selectinload

    modified = False
    for prod in order.products:
        has_bom = prod.bom_details and len(prod.bom_details) > 0
        if not has_bom or force_refresh:
            mp = None
            if prod.sku:
                mp = db.query(MasterProduct).options(
                    selectinload(MasterProduct.master_bom_details)
                ).filter(MasterProduct.sku == prod.sku).first()
                if not mp:
                    mp = db.query(MasterProduct).options(
                        selectinload(MasterProduct.master_bom_details)
                    ).filter(MasterProduct.sku.ilike(prod.sku)).first()
            if not mp and prod.name:
                mp = db.query(MasterProduct).options(
                    selectinload(MasterProduct.master_bom_details)
                ).filter(MasterProduct.name == prod.name).first()

            if mp:
                # Cập nhật thông số kỹ thuật và quy cách từ Master
                if mp.specification: prod.specification = mp.specification
                if mp.length: prod.length = mp.length
                if mp.width: prod.width = mp.width
                if mp.height: prod.height = mp.height
                if mp.material: prod.material = mp.material
                if mp.color: prod.color = mp.color
                if mp.unit: prod.unit = mp.unit
                if mp.weight: prod.weight = mp.weight
                if mp.price and (not prod.price or prod.price == 0):
                    prod.price = mp.price
                if mp.description and (force_refresh or not prod.description):
                    prod.description = mp.description
                modified = True

                if mp.master_bom_details and len(mp.master_bom_details) > 0:
                    # Nếu làm mới toàn bộ, xóa BOM cũ
                    if has_bom and force_refresh:
                        db.query(BOMDetail).filter(BOMDetail.product_id == prod.id).update({BOMDetail.parent_id: None}, synchronize_session=False)
                        db.flush()
                        db.query(BOMDetail).filter(BOMDetail.product_id == prod.id).delete(synchronize_session=False)
                        db.flush()

                    # Xây dựng children map
                    children_map = {}
                    for mb in mp.master_bom_details:
                        if mb.parent_id is not None:
                            children_map.setdefault(mb.parent_id, []).append(mb)

                    roots = [b for b in mp.master_bom_details if b.parent_id is None]
                    p_qty = prod.quantity or prod.order_qty or prod.production_qty or 1.0
                    if p_qty <= 0:
                        p_qty = 1.0

                    def clone_node(mb, parent_new_id=None):
                        nb_qty = round((mb.quantity if mb.quantity is not None else 1.0) * p_qty, 6)
                        nb = BOMDetail(
                            sku=mb.sku,
                            name=mb.name,
                            product_id=prod.id,
                            parent_id=parent_new_id,
                            length=mb.length,
                            width=mb.width,
                            height=mb.height,
                            unit=mb.unit,
                            specification=mb.specification,
                            material=mb.material,
                            color=mb.color,
                            weight=mb.weight,
                            waste_ratio=mb.waste_ratio,
                            is_raw_material=mb.is_raw_material,
                            exclude_production=mb.exclude_production,
                            input_stage=mb.input_stage,
                            output_stage=mb.output_stage,
                            status="Active",
                            quantity=nb_qty,
                            description=mb.description
                        )
                        db.add(nb)
                        db.flush()
                        for child in children_map.get(mb.id, []):
                            clone_node(child, nb.id)

                    for root_mb in roots:
                        clone_node(root_mb)
                    modified = True

    if modified:
        db.commit()
        db.refresh(order)
    return order


def sync_all_orders_boms_from_master(db: Session, force_refresh: bool = True):
    """
    Đồng bộ quy cách, kích thước và toàn bộ cây BOM chuẩn từ MasterProduct sang 100% các đơn hàng / PO.
    """
    from modules.master.models.master_product import MasterProduct
    from modules.master.models.master_bom_detail import MasterBOMDetail
    from sqlalchemy.orm import selectinload

    # 1. Tải sẵn toàn bộ MasterProducts có BOM vào bộ nhớ để tối ưu tốc độ (chạy trong vài giây)
    all_mps = db.query(MasterProduct).options(
        selectinload(MasterProduct.master_bom_details)
    ).all()

    mp_sku_map = {}
    for mp in all_mps:
        if mp.sku:
            s_clean = mp.sku.strip().lower()
            mp_sku_map[s_clean] = mp
            mp_sku_map[s_clean.replace('-', '').replace(' ', '')] = mp

    # 2. Tải toàn bộ đơn hàng kèm sản phẩm
    orders = db.query(Order).options(
        selectinload(Order.products)
    ).order_by(Order.id).all()

    total_orders = len(orders)
    updated_orders = 0
    updated_products = 0
    created_boms = 0
    unmatched_products = []

    for order in orders:
        order_modified = False
        for prod in (order.products or []):
            p_sku = (prod.sku or '').strip().lower()
            mp = mp_sku_map.get(p_sku) or mp_sku_map.get(p_sku.replace('-', '').replace(' ', ''))

            if not mp:
                unmatched_products.append({
                    'order_id': order.id,
                    'order_code': order.order_code,
                    'prod_id': prod.id,
                    'sku': prod.sku,
                    'name': prod.name
                })
                continue

            # Cập nhật thông số sản phẩm
            if mp.specification: prod.specification = mp.specification
            if mp.length: prod.length = mp.length
            if mp.width: prod.width = mp.width
            if mp.height: prod.height = mp.height
            if mp.material: prod.material = mp.material
            if mp.color: prod.color = mp.color
            if mp.unit: prod.unit = mp.unit
            if mp.weight: prod.weight = mp.weight
            if mp.price and (not prod.price or prod.price == 0):
                prod.price = mp.price
            if mp.description and (force_refresh or not prod.description):
                prod.description = mp.description

            # Đồng bộ cây BOM
            if mp.master_bom_details and len(mp.master_bom_details) > 0:
                if force_refresh:
                    db.query(BOMDetail).filter(BOMDetail.product_id == prod.id).update({BOMDetail.parent_id: None}, synchronize_session=False)
                    db.flush()
                    db.query(BOMDetail).filter(BOMDetail.product_id == prod.id).delete(synchronize_session=False)
                    db.flush()
                else:
                    existing_count = db.query(BOMDetail).filter(BOMDetail.product_id == prod.id).count()
                    if existing_count > 0:
                        continue

                children_map = {}
                for mb in mp.master_bom_details:
                    if mb.parent_id is not None:
                        children_map.setdefault(mb.parent_id, []).append(mb)

                roots = [mb for mb in mp.master_bom_details if mb.parent_id is None]
                p_qty = prod.quantity or prod.order_qty or prod.production_qty or 1.0
                if p_qty <= 0:
                    p_qty = 1.0

                def clone_node(mb, parent_new_id=None):
                    nonlocal created_boms
                    nb_qty = round((mb.quantity if mb.quantity is not None else 1.0) * p_qty, 6)
                    nb = BOMDetail(
                        sku=mb.sku,
                        name=mb.name,
                        product_id=prod.id,
                        parent_id=parent_new_id,
                        length=mb.length,
                        width=mb.width,
                        height=mb.height,
                        unit=mb.unit,
                        specification=mb.specification,
                        material=mb.material,
                        color=mb.color,
                        weight=mb.weight,
                        waste_ratio=mb.waste_ratio,
                        is_raw_material=mb.is_raw_material,
                        exclude_production=mb.exclude_production,
                        input_stage=mb.input_stage,
                        output_stage=mb.output_stage,
                        status="Active",
                        quantity=nb_qty,
                        description=mb.description
                    )
                    db.add(nb)
                    db.flush()
                    created_boms += 1
                    for child in children_map.get(mb.id, []):
                        clone_node(child, nb.id)

                for root_mb in roots:
                    clone_node(root_mb)

                updated_products += 1
                order_modified = True

        if order_modified:
            updated_orders += 1

        if updated_orders % 50 == 0:
            db.commit()

    db.commit()

    # Xóa cache kế hoạch sản xuất để frontend nhận dữ liệu mới ngay
    try:
        from modules.production.routes.product_plan_router import clear_plans_cache
        clear_plans_cache()
    except Exception:
        pass

    return {
        "status": "success",
        "total_orders": total_orders,
        "updated_orders": updated_orders,
        "updated_products": updated_products,
        "created_boms": created_boms,
        "unmatched_products_count": len(unmatched_products),
        "unmatched_products": unmatched_products[:10]
    }

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Order).order_by(Order.id).offset(skip).limit(limit).all()

def get_order(db: Session, order_id: int):
    order = db.query(Order).filter(Order.id == order_id).first()
    if order:
        sync_order_bom_from_master(db, order)
    return order

def create_order(db: Session, order: OrderCreate):
    order_code = order.order_code or _generate_order_code()
    existing = db.query(Order).filter(Order.order_code == order_code).first()
    if existing:
        order_code = _generate_order_code()

    db_order = Order(
        order_code=order_code,
        customer=order.customer,
        note=order.note,
        estimated_date=order.estimated_date,
        order_status=order.order_status if order.order_status is not None else 1,
        create_date=datetime.datetime.utcnow(),
        plan_id=order.plan_id,
        is_priority=order.is_priority or 0
    )
    db.add(db_order)
    db.flush() 

    # TRƯỜNG HỢP 1: Nhập BOM thủ công (Manual BOM)
    if order.products_details:
        from modules.master.models.master_bom_detail import MasterBOMDetail

        for p_data in order.products_details:
            p_name_std = clean_and_standardize_name(p_data.name)
            p_sku_std = clean_and_standardize_sku(p_data.sku)
            p_fac = p_data.factory
            if not p_fac:
                from modules.master.models.master_product import MasterProduct
                m_p = db.query(MasterProduct).filter(MasterProduct.sku == p_sku_std).first()
                if m_p and m_p.description:
                    p_fac = m_p.description

            db_product = Product(
                name=p_name_std,
                sku=p_sku_std,
                quantity=p_data.quantity,
                order_id=db_order.id,
                description=p_fac if p_fac else None,
                status="Active",
                created_at=datetime.datetime.utcnow()
            )
            db.add(db_product)
            db.flush()
            
            def create_bom_detail_recursive(bom_data, parent_id=None):
                from modules.master.controllers.master_product_controller import resolve_clean_spec
                b_name_std = clean_and_standardize_name(bom_data.name)
                b_sku_std = clean_and_standardize_sku(bom_data.sku)
                
                i_stage = bom_data.input_stage
                o_stage = bom_data.output_stage
                m_bom = None
                if not i_stage or not o_stage or not bom_data.specification:
                    m_bom = db.query(MasterBOMDetail).filter(
                        (MasterBOMDetail.name == b_name_std) | 
                        (MasterBOMDetail.name.ilike(b_name_std))
                    ).first()
                    if m_bom:
                        i_stage = i_stage or m_bom.input_stage
                        o_stage = o_stage or m_bom.output_stage

                resolved_spec = resolve_clean_spec(
                    bom_data.specification or (m_bom.specification if m_bom else None),
                    name=b_name_std,
                    sku=b_sku_std
                )

                db_bom = BOMDetail(
                    name=b_name_std,
                    sku=b_sku_std,
                    quantity=bom_data.quantity,
                    unit=bom_data.unit,
                    specification=resolved_spec,
                    input_stage=i_stage,
                    output_stage=o_stage,
                    product_id=db_product.id,
                    parent_id=parent_id,
                    status="Active"
                )
                db.add(db_bom)
                db.flush()
                
                for child_data in bom_data.children:
                    create_bom_detail_recursive(child_data, db_bom.id)

            for b_data in getattr(p_data, 'bom_details', []):
                create_bom_detail_recursive(b_data)

    # TRƯỜNG HỢP 2: Chọn từ sản phẩm mẫu (Master BOM Import)
    elif order.items:
        from modules.master.controllers import master_product_controller
        for item in order.items:
            db_item = OrderItem(
                order_id=db_order.id,
                master_product_id=item.master_product_id,
                quantity=item.quantity
            )
            db.add(db_item)
            master_product_controller.produce_from_bom(db, item.master_product_id, item.quantity, db_order.id)

    db.commit()
    db.refresh(db_order)
    return db_order

def update_order(db: Session, order_id: int, order: OrderUpdate):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if db_order:
        update_data = order.model_dump(exclude_unset=True, exclude={'products_details'})
        for key, value in update_data.items():
            setattr(db_order, key, value)
        
        if order.products_details is not None:
            for p in db_order.products:
                db.delete(p)
            db.flush()
            
            from modules.master.models.master_bom_detail import MasterBOMDetail

            for p_data in order.products_details:
                p_name_std = clean_and_standardize_name(p_data.name)
                p_sku_std = clean_and_standardize_sku(p_data.sku)
                p_fac = p_data.factory
                if not p_fac:
                    from modules.master.models.master_product import MasterProduct
                    m_p = db.query(MasterProduct).filter(MasterProduct.sku == p_sku_std).first()
                    if m_p and m_p.description:
                        p_fac = m_p.description

                db_product = Product(
                    name=p_name_std,
                    sku=p_sku_std,
                    quantity=p_data.quantity,
                    order_id=db_order.id,
                    description=p_fac if p_fac else None,
                    status="Active",
                    created_at=datetime.datetime.utcnow()
                )
                db.add(db_product)
                db.flush()
                
                def create_bom_detail_recursive(bom_data, parent_id=None):
                    b_name_std = clean_and_standardize_name(bom_data.name)
                    b_sku_std = clean_and_standardize_sku(bom_data.sku)
                    
                    i_stage = bom_data.input_stage
                    o_stage = bom_data.output_stage
                    if not i_stage or not o_stage:
                        m_bom = db.query(MasterBOMDetail).filter(
                            (MasterBOMDetail.name == b_name_std) | 
                            (MasterBOMDetail.name.ilike(b_name_std))
                        ).first()
                        if m_bom:
                            i_stage = i_stage or m_bom.input_stage
                            o_stage = o_stage or m_bom.output_stage

                    db_bom = BOMDetail(
                        name=b_name_std,
                        sku=b_sku_std,
                        quantity=bom_data.quantity,
                        unit=bom_data.unit,
                        specification=bom_data.specification,
                        input_stage=i_stage,
                        output_stage=o_stage,
                        product_id=db_product.id,
                        parent_id=parent_id,
                        status="Active"
                    )
                    db.add(db_bom)
                    db.flush()
                    
                    for child_data in bom_data.children:
                        create_bom_detail_recursive(child_data, db_bom.id)

                for b_data in getattr(p_data, 'bom_details', []):
                    create_bom_detail_recursive(b_data)

        db.commit()
def delete_order(db: Session, order_id: int):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if not db_order:
        return False
    
    try:
        # Nullify non-cascade delivery links if present
        from modules.delivery.models.deliveries import Delivery
        from modules.delivery.models.delivery_details import DeliveryDetail
        db.query(DeliveryDetail).filter(DeliveryDetail.order_id == order_id).update({"order_id": None}, synchronize_session=False)
        db.query(Delivery).filter(Delivery.order_id == order_id).update({"order_id": None}, synchronize_session=False)
    except Exception:
        pass

    db.delete(db_order)
    db.commit()
    return True


