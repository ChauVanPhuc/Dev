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

def sync_order_bom_from_master(db: Session, order: Order):
    """Tự động đồng bộ cấu trúc BOM chuẩn từ MasterProduct (master_bom_details) vào order products nếu chưa có BOM"""
    if not order or not order.products:
        return order

    from modules.master.models.master_product import MasterProduct
    from modules.master.models.master_bom_detail import MasterBOMDetail

    modified = False
    for prod in order.products:
        if not prod.bom_details or len(prod.bom_details) == 0:
            mp = None
            if prod.sku:
                mp = db.query(MasterProduct).filter(MasterProduct.sku == prod.sku).first()
                if not mp:
                    mp = db.query(MasterProduct).filter(MasterProduct.sku.ilike(f"{prod.sku}%")).first()
                if not mp:
                    mp = db.query(MasterProduct).filter(MasterProduct.sku.ilike(f"%{prod.sku}%")).first()
            if not mp and prod.name:
                mp = db.query(MasterProduct).filter(MasterProduct.name == prod.name).first()

            if mp and mp.master_bom_details and len(mp.master_bom_details) > 0:
                id_map = {}
                def clone_node(mb, parent_new_id=None):
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
                        quantity=mb.quantity,
                        description=mb.description
                    )
                    db.add(nb)
                    db.flush()
                    id_map[mb.id] = nb.id
                    for child in mb.children:
                        clone_node(child, nb.id)

                for root_mb in [b for b in mp.master_bom_details if b.parent_id is None]:
                    clone_node(root_mb)
                modified = True

    if modified:
        db.commit()
        db.refresh(order)
    return order

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
            db_product = Product(
                name=p_name_std,
                sku=p_sku_std,
                quantity=p_data.quantity,
                order_id=db_order.id,
                description=p_data.factory if p_data.factory else None,
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
                db_product = Product(
                    name=p_name_std,
                    sku=p_sku_std,
                    quantity=p_data.quantity,
                    order_id=db_order.id,
                    description=p_data.factory if p_data.factory else None,
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


