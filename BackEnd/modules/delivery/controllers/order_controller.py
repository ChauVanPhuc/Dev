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

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Order).order_by(Order.id).offset(skip).limit(limit).all()

def get_order(db: Session, order_id: int):
    return db.query(Order).filter(Order.id == order_id).first()

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
        db.refresh(db_order)
    return db_order

def delete_order(db: Session, order_id: int):
    db_order = db.query(Order).filter(Order.id == order_id).first()
    if db_order:
        db.delete(db_order)
        db.commit()
        return True
    return False

