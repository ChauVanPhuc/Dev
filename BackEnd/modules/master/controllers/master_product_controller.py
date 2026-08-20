from typing import Optional
import pandas as pd
import io
import json
import re
import os
import uuid
import base64
from sqlalchemy.orm import Session, joinedload, selectinload
import app.models  # Register all SQLAlchemy ORM models to prevent InvalidRequestError
from modules.master.models.master_product import MasterProduct
from modules.master.models.master_category import MasterCategory
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.master.models.master_product_detail import MasterProductDetail
from modules.master.models.technical_drawing import TechnicalDrawing
from modules.master.models.paint_color_sample import PaintColorSample
from modules.master.models.master_product_material import MasterProductMaterial
from modules.master.models.technical_pending_task import TechnicalPendingTask
from modules.production.models.product import Product
from modules.production.models.bom_detail import BOMDetail
from modules.master.schemas.master_product import MasterProductCreate, MasterProductUpdate
from shared.utils.string_cleaner import clean_and_standardize_name, clean_and_standardize_sku

def clean_stage_name(val):
    if not val or pd.isna(val) or str(val).lower() == 'nan':
        return None
    s = str(val).strip()
    # Loại bỏ tiền tố nhà máy như "NM1 - ", "NM2 - ", "NM3 - ", v.v.
    s = re.sub(r'^(NM\d+\s*[-_–—]\s*)', '', s, flags=re.IGNORECASE)
    # Loại bỏ số ở cuối tên công đoạn như "Sơn 3" -> "Sơn", "Tạo phôi 3" -> "Tạo phôi"
    s = re.sub(r'\s+\d+$', '', s)
    return s.strip() or None

def get_stage_rank(stage_name):
    if not stage_name:
        return 0
    if "Định hình" in stage_name or "Tạo phôi" in stage_name:
        return 1
    if "Lắp ráp" in stage_name:
        return 2
    if "Sơn" in stage_name:
        return 3
    if "Đóng gói" in stage_name:
        return 4
    return 0

def save_base64_image_if_needed(image_url: Optional[str], subfolder: str = "products") -> Optional[str]:
    """
    Nếu image_url là chuỗi base64 (data:image/...), tự động decode và lưu vào file tĩnh,
    trả về đường dẫn tĩnh ngắn gọn /static/uploads/{subfolder}/filename.ext để lưu an toàn vào DB.
    """
    if not image_url or not isinstance(image_url, str):
        return image_url
    if image_url.startswith("data:image/"):
        try:
            header, encoded = image_url.split(",", 1)
            ext = ".png"
            if "jpeg" in header.lower() or "jpg" in header.lower():
                ext = ".jpg"
            elif "webp" in header.lower():
                ext = ".webp"
            elif "gif" in header.lower():
                ext = ".gif"
            
            upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "static", "uploads", subfolder))
            os.makedirs(upload_dir, exist_ok=True)
            new_filename = f"{subfolder[:4]}_{uuid.uuid4()}{ext}"
            file_path = os.path.join(upload_dir, new_filename)
            with open(file_path, "wb") as f:
                f.write(base64.b64decode(encoded))
            return f"/static/uploads/{subfolder}/{new_filename}"
        except Exception as e:
            print(f"Error saving base64 image: {e}")
            return None
    return image_url

def serialize_bom_item(item):
    if not item: return None
    if isinstance(item, dict): return item
    return {
        "id": item.id,
        "sku": item.sku,
        "name": item.name,
        "master_product_id": item.master_product_id,
        "parent_id": item.parent_id,
        "length": item.length or 0.0,
        "width": item.width or 0.0,
        "height": item.height or 0.0,
        "unit": item.unit or "Cái",
        "specification": item.specification or "",
        "material": item.material or "",
        "color": item.color or "",
        "weight": item.weight or 0.0,
        "waste_ratio": item.waste_ratio or 0.0,
        "is_raw_material": item.is_raw_material or False,
        "exclude_production": item.exclude_production or False,
        "input_stage": item.input_stage,
        "output_stage": item.output_stage,
        "status": item.status or "Active",
        "quantity": item.quantity or 1.0,
        "description": item.description or "",
        "created_at": item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else None
    }

def serialize_drawing_item(item):
    if not item: return None
    if isinstance(item, dict): return item
    return {
        "id": item.id,
        "master_product_id": item.master_product_id,
        "lot_code": item.lot_code,
        "updated_by": item.updated_by,
        "status": item.status,
        "change_reason": item.change_reason,
        "approved_by": item.approved_by,
        "note": item.note,
        "file_url": item.file_url,
        "created_at": item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else None
    }

def serialize_paint_item(item):
    if not item: return None
    if isinstance(item, dict): return item
    return {
        "id": item.id,
        "master_product_id": item.master_product_id,
        "color_code": item.color_code,
        "color_name": item.color_name,
        "supplier": item.supplier,
        "image_url": item.image_url,
        "note": item.note,
        "created_at": item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else None
    }

def serialize_material_item(item):
    if not item: return None
    if isinstance(item, dict): return item
    return {
        "id": item.id,
        "master_product_id": item.master_product_id,
        "stt": getattr(item, 'stt', 1),
        "group_type": getattr(item, 'group_type', 'VẬT TƯ HÀNG TRẮNG') or 'VẬT TƯ HÀNG TRẮNG',
        "material_code": getattr(item, 'material_code', ''),
        "material_name": getattr(item, 'material_name', '') or getattr(item, 'name', ''),
        "color": getattr(item, 'color', '') or '',
        "quota": float(getattr(item, 'quota', getattr(item, 'quantity', 1.0)) or 1.0),
        "quantity": float(getattr(item, 'quota', getattr(item, 'quantity', 1.0)) or 1.0),
        "unit": getattr(item, 'unit', 'Cái') or 'Cái',
        "supplier": getattr(item, 'supplier', '') or '',
        "note": getattr(item, 'note', '') or ''
    }


def serialize_product_detail_item(item):
    if not item: return None
    if isinstance(item, dict): return item
    return {
        "id": item.id,
        "master_product_id": item.master_product_id,
        "name": item.name,
        "quantity": item.quantity,
        "unit": item.unit,
        "input_stage": item.input_stage,
        "output_stage": item.output_stage,
        "parent_name": item.parent_name,
        "material": item.material,
        "created_at": item.created_at.isoformat() if hasattr(item, 'created_at') and item.created_at else None
    }

def to_master_product_dict(master: MasterProduct):
    if not master:
        return None
    return {
        "id": master.id,
        "sku": master.sku,
        "name": master.name,
        "new_name": master.new_name or master.name,
        "brand_name": master.brand_name or "Thương hiệu G7",
        "category_id": master.category_id,
        "category_name": master.master_category.name.replace("Dòng hàng ", "").strip() if (master.master_category and master.master_category.name) else (master.sku[:3] if master.sku else "ADV"),
        "price": master.price or 0.0,
        "material": master.material or "Gỗ tự nhiên",
        "color": master.color or "Màu tự nhiên",
        "length": master.length or 0.0,
        "width": master.width or 0.0,
        "height": master.height or 0.0,
        "weight": master.weight or 0.0,
        "status": master.status or "Hoạt động",
        "quantity": master.quantity or 1.0,
        "unit": master.unit or "Bộ",
        "specification": master.specification or "Chuẩn",
        "description": master.description or "",
        "adjusted_date": master.adjusted_date.strftime("%d/%m/%Y") if master.adjusted_date else (master.created_at.strftime("%d/%m/%Y") if master.created_at else "22/1/2026"),
        "image_url": master.image_url,
        "total_category_count": len(master.master_bom_details) if master.master_bom_details else 0,
        "created_at": master.created_at,
        "master_bom_details": [serialize_bom_item(x) for x in (master.master_bom_details or [])],
        "technical_drawings": [serialize_drawing_item(x) for x in (master.technical_drawings or [])],
        "paint_color_samples": [serialize_paint_item(x) for x in (master.paint_color_samples or [])],
        "materials": [serialize_material_item(x) for x in (master.materials or [])],
        "product_details": [serialize_product_detail_item(x) for x in (master.product_details or [])]
    }

def get_master_products(db: Session, skip: int = 0, limit: int = 50, q: str = None):
    query = db.query(MasterProduct)
    if q and q.strip():
        search_filter = f"%{q.strip()}%"
        query = query.filter(
            (MasterProduct.sku.ilike(search_filter)) | 
            (MasterProduct.name.ilike(search_filter))
        )
    total = query.count()
    items = query.order_by(MasterProduct.sku).offset(skip).limit(limit).all()
    return {"items": items, "total": total}

def get_master_product(db: Session, master_product_id: int):
    master = db.query(MasterProduct).options(
        joinedload(MasterProduct.master_category),
        selectinload(MasterProduct.master_bom_details),
        selectinload(MasterProduct.technical_drawings),
        selectinload(MasterProduct.paint_color_samples),
        selectinload(MasterProduct.materials),
        selectinload(MasterProduct.product_details)
    ).filter(MasterProduct.id == master_product_id).first()
    return to_master_product_dict(master)

def create_master_product(db: Session, master_product: MasterProductCreate):
    data = master_product.model_dump(exclude={'master_bom_details', 'product_details', 'paint_color_samples', 'technical_drawings', 'materials'})
    valid_cols = {c.name for c in MasterProduct.__table__.columns}
    product_data = {k: v for k, v in data.items() if k in valid_cols and v is not None}

    if 'sku' in product_data:
        product_data['sku'] = clean_and_standardize_sku(product_data['sku'])
    if 'name' in product_data:
        product_data['name'] = clean_and_standardize_name(product_data['name'])
    if 'image_url' in product_data and product_data['image_url']:
        product_data['image_url'] = save_base64_image_if_needed(product_data['image_url'], 'products')
        
    bom_data_list = getattr(master_product, 'master_bom_details', []) or []
    product_details_list = getattr(master_product, 'product_details', []) or []
    paint_color_list = getattr(master_product, 'paint_color_samples', []) or []

    # Check if SKU already exists
    existing = db.query(MasterProduct).filter(MasterProduct.sku == product_data.get('sku')).first()
    if existing:
        db_master = existing
        for k, v in product_data.items():
            setattr(db_master, k, v)
        db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == db_master.id).update({MasterBOMDetail.parent_id: None}, synchronize_session=False)
        db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == db_master.id).delete(synchronize_session=False)
        db.query(MasterProductDetail).filter(MasterProductDetail.master_product_id == db_master.id).delete(synchronize_session=False)
        db.query(PaintColorSample).filter(PaintColorSample.master_product_id == db_master.id).delete(synchronize_session=False)
    else:
        db_master = MasterProduct(**product_data)
        db.add(db_master)
        db.flush()

    # Process BOM details (handles both flat list with tree_stt / stt and nested tree structures)
    if bom_data_list:
        stt_to_id = {}
        for item in bom_data_list:
            if hasattr(item, 'model_dump'):
                node_dict = item.model_dump(exclude={'children'})
            elif isinstance(item, dict):
                node_dict = dict(item)
            else:
                continue

            stt = node_dict.pop('tree_stt', None) or node_dict.get('stt')
            sku = node_dict.get('sku') or node_dict.pop('component_sku', None) or node_dict.get('compCode')
            name = node_dict.get('name') or node_dict.get('compName') or ''
            unit = node_dict.get('unit') or 'Cái'
            material = node_dict.get('material') or 'Gỗ / MDF'
            spec = node_dict.get('specification') or node_dict.get('spec') or ''
            in_stg = clean_stage_name(node_dict.get('input_stage') or node_dict.get('stageFrom'))
            out_stg = clean_stage_name(node_dict.get('output_stage') or node_dict.get('stageTo'))
            qty = float(node_dict.get('quantity') or 1.0)
            desc = node_dict.get('description') or node_dict.get('note') or ''
            
            len_val = float(node_dict.get('length') or 0.0)
            wid_val = float(node_dict.get('width') or 0.0)
            hgt_val = float(node_dict.get('height') or 0.0)
            if not len_val and not wid_val and not hgt_val and spec:
                try:
                    parts = [float(p.strip()) for p in str(spec).replace('*', 'x').replace('X', 'x').split('x') if p.strip()]
                    if len(parts) >= 1: len_val = parts[0]
                    if len(parts) >= 2: wid_val = parts[1]
                    if len(parts) >= 3: hgt_val = parts[2]
                except Exception:
                    pass

            # Determine parent_id strictly from hierarchy stt to avoid stale foreign keys
            parent_id = None
            if stt:
                stt_str = str(stt).strip()
                if '.' in stt_str:
                    p_stt = '.'.join(stt_str.split('.')[:-1])
                    parent_id = stt_to_id.get(p_stt)

            bom_obj = MasterBOMDetail(
                master_product_id=db_master.id,
                parent_id=parent_id,
                sku=clean_and_standardize_sku(sku) if sku else f"{db_master.sku}.{stt if stt else len(stt_to_id)+1}",
                name=clean_and_standardize_name(name) if name else 'Chi tiết mới',
                unit=unit,
                material=material,
                specification=spec,
                length=len_val,
                width=wid_val,
                height=hgt_val,
                input_stage=in_stg,
                output_stage=out_stg,
                quantity=qty,
                description=desc,
                status="Active"
            )
            db.add(bom_obj)
            db.flush()
            if stt:
                stt_to_id[str(stt).strip()] = bom_obj.id

    # Insert product_details if present
    for pd in product_details_list:
        if isinstance(pd, dict) and pd.get('name'):
            db.add(MasterProductDetail(
                master_product_id=db_master.id,
                name=pd.get('name'),
                quantity=float(pd.get('quantity', 1.0)),
                unit=pd.get('unit', 'Cái'),
                input_stage=clean_stage_name(pd.get('input_stage')),
                output_stage=clean_stage_name(pd.get('output_stage')),
                parent_name=pd.get('parent_name', ''),
                material=pd.get('material', '')
            ))

    # Insert paint_color_samples if present
    for pc in paint_color_list:
        if isinstance(pc, dict) and (pc.get('color_code') or pc.get('color_name')):
            db.add(PaintColorSample(
                master_product_id=db_master.id,
                color_code=pc.get('color_code', ''),
                color_name=pc.get('color_name', ''),
                supplier=pc.get('supplier', ''),
                image_url=save_base64_image_if_needed(pc.get('image_url', ''), 'paint_colors'),
                note=pc.get('note', '')
            ))

    # Insert materials if present
    materials_list = getattr(master_product, 'materials', []) or []
    for idx, mat in enumerate(materials_list):
        if isinstance(mat, dict) and (mat.get('material_name') or mat.get('name')):
            mat_name = mat.get('material_name') or mat.get('name')
            mat_code = mat.get('material_code') or f"VT-{mat_name[:6].upper()}"
            db.add(MasterProductMaterial(
                master_product_id=db_master.id,
                stt=mat.get('stt', idx + 1),
                group_type=mat.get('group_type', 'VẬT TƯ HÀNG TRẮNG'),
                material_code=mat_code,
                material_name=mat_name,
                color=mat.get('color', ''),
                quota=float(mat.get('quota', mat.get('quantity', 1.0)) or 1.0),
                unit=mat.get('unit', 'Cái'),
                supplier=mat.get('supplier', ''),
                note=mat.get('note', '')
            ))

    db.commit()


    db.commit()
    db.refresh(db_master)
    return to_master_product_dict(db_master)

def update_master_product(db: Session, master_product_id: int, master_product: MasterProductUpdate):
    db_master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    if db_master:
        update_data = master_product.model_dump(exclude_unset=True, exclude={'master_bom_details', 'product_details', 'paint_color_samples', 'materials', 'technical_drawings'})
        if 'sku' in update_data:
            update_data['sku'] = clean_and_standardize_sku(update_data['sku'])
        if 'name' in update_data:
            update_data['name'] = clean_and_standardize_name(update_data['name'])
        if 'image_url' in update_data and update_data['image_url']:
            update_data['image_url'] = save_base64_image_if_needed(update_data['image_url'], 'products')
        for key, value in update_data.items():
            setattr(db_master, key, value)
            
        bom_data_list = getattr(master_product, 'master_bom_details', None)
        if bom_data_list is not None and isinstance(bom_data_list, list):
            db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == db_master.id).update({MasterBOMDetail.parent_id: None}, synchronize_session=False)
            db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == db_master.id).delete(synchronize_session=False)
            stt_to_id = {}
            for item in bom_data_list:
                if hasattr(item, 'model_dump'):
                    node_dict = item.model_dump(exclude={'children'})
                elif isinstance(item, dict):
                    node_dict = dict(item)
                else:
                    continue

                stt = node_dict.pop('tree_stt', None) or node_dict.get('stt')
                sku = node_dict.get('sku') or node_dict.pop('component_sku', None) or node_dict.get('compCode')
                name = node_dict.get('name') or node_dict.get('compName') or ''
                unit = node_dict.get('unit') or 'Cái'
                material = node_dict.get('material') or 'Gỗ / MDF'
                spec = node_dict.get('specification') or node_dict.get('spec') or ''
                in_stg = clean_stage_name(node_dict.get('input_stage') or node_dict.get('stageFrom'))
                out_stg = clean_stage_name(node_dict.get('output_stage') or node_dict.get('stageTo'))
                qty = float(node_dict.get('quantity') or 1.0)
                desc = node_dict.get('description') or node_dict.get('note') or ''
                
                len_val = float(node_dict.get('length') or 0.0)
                wid_val = float(node_dict.get('width') or 0.0)
                hgt_val = float(node_dict.get('height') or 0.0)
                if not len_val and not wid_val and not hgt_val and spec:
                    try:
                        parts = [float(p.strip()) for p in str(spec).replace('*', 'x').replace('X', 'x').split('x') if p.strip()]
                        if len(parts) >= 1: len_val = parts[0]
                        if len(parts) >= 2: wid_val = parts[1]
                        if len(parts) >= 3: hgt_val = parts[2]
                    except Exception:
                        pass

                # Determine parent_id strictly from hierarchy stt to avoid stale foreign keys
                parent_id = None
                if stt:
                    stt_str = str(stt).strip()
                    if '.' in stt_str:
                        p_stt = '.'.join(stt_str.split('.')[:-1])
                        parent_id = stt_to_id.get(p_stt)

                bom_obj = MasterBOMDetail(
                    master_product_id=db_master.id,
                    parent_id=parent_id,
                    sku=clean_and_standardize_sku(sku) if sku else f"{db_master.sku}.{stt if stt else len(stt_to_id)+1}",
                    name=clean_and_standardize_name(name) if name else 'Chi tiết mới',
                    unit=unit,
                    material=material,
                    specification=spec,
                    length=len_val,
                    width=wid_val,
                    height=hgt_val,
                    input_stage=in_stg,
                    output_stage=out_stg,
                    quantity=qty,
                    description=desc,
                    status="Active"
                )
                db.add(bom_obj)
                db.flush()
                if stt:
                    stt_to_id[str(stt).strip()] = bom_obj.id

        product_details_list = getattr(master_product, 'product_details', None)
        if product_details_list is not None and isinstance(product_details_list, list):
            db.query(MasterProductDetail).filter(MasterProductDetail.master_product_id == db_master.id).delete(synchronize_session=False)
            for pd in product_details_list:
                if isinstance(pd, dict) and pd.get('name'):
                    db.add(MasterProductDetail(
                        master_product_id=db_master.id,
                        name=pd.get('name'),
                        quantity=float(pd.get('quantity', 1.0)),
                        unit=pd.get('unit', 'Cái'),
                        input_stage=clean_stage_name(pd.get('input_stage')),
                        output_stage=clean_stage_name(pd.get('output_stage')),
                        parent_name=pd.get('parent_name', ''),
                        material=pd.get('material', '')
                    ))

        paint_color_list = getattr(master_product, 'paint_color_samples', None)
        if paint_color_list is not None and isinstance(paint_color_list, list):
            db.query(PaintColorSample).filter(PaintColorSample.master_product_id == db_master.id).delete(synchronize_session=False)
            for pc in paint_color_list:
                if isinstance(pc, dict) and (pc.get('color_code') or pc.get('color_name')):
                    db.add(PaintColorSample(
                        master_product_id=db_master.id,
                        color_code=pc.get('color_code', ''),
                        color_name=pc.get('color_name', ''),
                        supplier=pc.get('supplier', ''),
                        image_url=save_base64_image_if_needed(pc.get('image_url', ''), 'paint_colors'),
                        note=pc.get('note', '')
                    ))

        materials_list = getattr(master_product, 'materials', None)
        if materials_list is not None and isinstance(materials_list, list):
            db.query(MasterProductMaterial).filter(MasterProductMaterial.master_product_id == db_master.id).delete(synchronize_session=False)
            for idx, mat in enumerate(materials_list):
                if isinstance(mat, dict) and (mat.get('material_name') or mat.get('name')):
                    mat_name = mat.get('material_name') or mat.get('name')
                    mat_code = mat.get('material_code') or f"VT-{mat_name[:6].upper()}"
                    db.add(MasterProductMaterial(
                        master_product_id=db_master.id,
                        stt=mat.get('stt', idx + 1),
                        group_type=mat.get('group_type', 'VẬT TƯ HÀNG TRẮNG'),
                        material_code=mat_code,
                        material_name=mat_name,
                        color=mat.get('color', ''),
                        quota=float(mat.get('quota', mat.get('quantity', 1.0)) or 1.0),
                        unit=mat.get('unit', 'Cái'),
                        supplier=mat.get('supplier', ''),
                        note=mat.get('note', '')
                    ))

        db.commit()
        db.refresh(db_master)
    return to_master_product_dict(db_master)


def delete_master_product(db: Session, master_product_id: int):
    db_master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    if db_master:
        db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == master_product_id).update({MasterBOMDetail.parent_id: None}, synchronize_session=False)
        db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == master_product_id).delete(synchronize_session=False)
        db.delete(db_master)
        db.commit()
        return True
    return False

def produce_from_bom(db: Session, master_product_id: int, quantity_to_produce: float, order_id: int = None):
    master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    if not master: return None
    db_product = Product(
        sku=master.sku, name=master.name, order_id=order_id,
        category_id=master.category_id, price=master.price,
        material=master.material, color=master.color,
        length=master.length, width=master.width, height=master.height,
        weight=master.weight, status="Active",
        quantity=quantity_to_produce * (master.quantity or 1.0),
        description=master.description
    )
    db.add(db_product)
    db.flush() 

    def clone_bom_detail(master_bom, parent_id=None):
        db_bom = BOMDetail(
            sku=master_bom.sku, name=master_bom.name, product_id=db_product.id,
            parent_id=parent_id, length=master_bom.length, width=master_bom.width,
            height=master_bom.height, unit=master_bom.unit,
            specification=master_bom.specification, material=master_bom.material,
            color=master_bom.color, weight=master_bom.weight,
            waste_ratio=master_bom.waste_ratio, is_raw_material=master_bom.is_raw_material,
            exclude_production=master_bom.exclude_production,
            input_stage=master_bom.input_stage, output_stage=master_bom.output_stage,
            status="Active", quantity=quantity_to_produce * (master_bom.quantity or 1.0),
            description=master_bom.description
        )
        db.add(db_bom)
        db.flush()
        for child_master in master_bom.children:
            clone_bom_detail(child_master, db_bom.id)

    for m_bom in master.master_bom_details:
        if m_bom.parent_id is None: clone_bom_detail(m_bom)
    db.flush()
    return db_product

def parse_dimensions(spec_str):
    if not spec_str: return 0.0, 0.0, 0.0
    # Match standard dimension pattern like 100x50x25 or 100*50 (with float support)
    match = re.search(r"(\d+(?:\.\d+)?\s*[*xX]\s*\d+(?:\.\d+)?(?:\s*[*xX]\s*\d+(?:\.\d+)?)?)", str(spec_str))
    if match:
        dims = re.findall(r"[-+]?\d*\.\d+|\d+", match.group(1).replace(',', '.'))
        if len(dims) >= 3:
            return float(dims[0]), float(dims[1]), float(dims[2])
        elif len(dims) == 2:
            return float(dims[0]), float(dims[1]), 0.0
            
    # Fallback to general numbers find
    dims = re.findall(r"[-+]?\d*\.\d+|\d+", str(spec_str).replace(',', '.'))
    try:
        l = float(dims[0]) if len(dims) > 0 else 0.0
        w = float(dims[1]) if len(dims) > 1 else 0.0
        h = float(dims[2]) if len(dims) > 2 else 0.0
        return l, w, h
    except: return 0.0, 0.0, 0.0

def parse_color(sku, name, desc=None):
    if not sku: return None
    sku_upper = sku.upper()
    
    # 1. Dòng hàng APT: lấy 3 ký tự cuối của base SKU (trước dấu chấm đầu tiên)
    if 'APT' in sku_upper:
        base_sku = sku.split('.')[0]
        return base_sku[-3:] if len(base_sku) >= 3 else None
        
    # 2. Dòng hàng FOL: lấy mã màu bắt đầu bằng F kèm số (ví dụ F22, F3, F260...)
    if 'FOL' in sku_upper:
        # Check SKU
        match = re.search(r'(F\d+)', sku_upper)
        if match: return match.group(1)
        # Check Name
        if name:
            match = re.search(r'(F\d+)', str(name).upper())
            if match: return match.group(1)
        # Check Desc
        if desc:
            match = re.search(r'(F\d+)', str(desc).upper())
            if match: return match.group(1)
            
    return None


def inspect_master_products_excel_sheets(file_content: bytes):
    """
    [FAST INSPECTION] Quét nhanh tất cả các sheet trong file Excel BOM để trả về danh sách Sheet metadata.
    Hỗ trợ người dùng chọn sheet cần upload khi file có nhiều sheet.
    """
    import io, openpyxl, json
    
    def clean_val(val):
        if val is None: return None
        s = str(val).strip()
        if not s or s.lower() == 'nan' or s.lower() == 'none': return None
        return s

    def to_bool(val):
        if not val: return False
        return str(val).strip().lower() in ['có', 'yes', '1', 'true', 'x']

    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True, read_only=True)
        results = []
        
        for sname in wb.sheetnames:
            ws = wb[sname]
            rows = list(ws.iter_rows(values_only=True))
            if not rows or len(rows) < 2:
                continue
            
            # Tìm dòng tiêu đề trong 15 dòng đầu
            h_idx = -1
            for r_idx in range(min(15, len(rows))):
                row_str = ' '.join([str(c or '').lower() for c in rows[r_idx]])
                if any(k in row_str for k in ['mã chi tiết', 'tên chi tiết', 'mã mặt hàng', 'mã sản phẩm']):
                    h_idx = r_idx
                    break
            
            if h_idx == -1:
                if len(rows) > 5:
                    results.append({
                        "name": sname,
                        "rows": len(rows),
                        "product_count": 0,
                        "products": [],
                        "color": "",
                        "brand": "ATLAS",
                        "description": f"Sheet dữ liệu {sname} ({len(rows)} dòng)",
                        "is_valid": True
                    })
                continue

            headers = [str(c or '').replace('\n', ' ').strip().lower() for c in rows[h_idx]]
            
            def get_col_pos(kw_list, default=None):
                for kw in kw_list:
                    for i, h in enumerate(headers):
                        if kw == h: return i
                for kw in kw_list:
                    for i, h in enumerate(headers):
                        if kw in h: return i
                return default

            c_parent_sku = get_col_pos(['mã mặt hàng', 'mã sp', 'mã sản phẩm'], 0)
            c_child_sku = get_col_pos(['mã chi tiết'], 4)
            c_is_fin = get_col_pos(['là thành phẩm c/k', 'là thành phẩm'], 24)
            c_color = get_col_pos(['màu sắc'], 13)
            c_brand = get_col_pos(['năng suất mục tiêu', 'danh mục mặt hàng'], 27)
            
            prods = []
            colors = set()
            brands = set()
            data_rows = rows[h_idx + 1:]
            
            for row in data_rows:
                if not row or len(row) <= max(c_parent_sku or 0, c_child_sku or 0):
                    continue
                p_sku = clean_val(row[c_parent_sku]) if (c_parent_sku is not None and c_parent_sku < len(row)) else None
                c_sku = clean_val(row[c_child_sku]) if (c_child_sku is not None and c_child_sku < len(row)) else None
                if not p_sku or not c_sku:
                    continue
                
                is_fin = to_bool(row[c_is_fin]) if (c_is_fin is not None and c_is_fin < len(row)) else False
                col_val = clean_val(row[c_color]) if (c_color is not None and c_color < len(row)) else None
                brand_val = clean_val(row[c_brand]) if (c_brand is not None and c_brand < len(row)) else None
                
                if col_val: colors.add(col_val)
                if brand_val: brands.add(brand_val)
                
                if is_fin or (p_sku == c_sku and '.' not in p_sku):
                    p_sku_clean = clean_and_standardize_sku(p_sku)
                    if p_sku_clean and p_sku_clean not in prods:
                        prods.append(p_sku_clean)
                        
            color_desc = ', '.join(sorted(colors)) if colors else ''
            brand_desc = ', '.join(sorted(brands)) if brands else 'ATLAS'
            
            desc_parts = []
            if brand_desc: desc_parts.append(f"Dòng {brand_desc}")
            if color_desc: desc_parts.append(f"Màu {color_desc}")
            desc = " - ".join(desc_parts) if desc_parts else f"Sheet {sname}"
            
            results.append({
                "name": sname,
                "rows": len(data_rows),
                "product_count": len(prods),
                "products": prods,
                "color": list(colors)[0] if colors else '',
                "brand": list(brands)[0] if brands else 'ATLAS',
                "description": desc,
                "is_valid": len(prods) > 0 or len(data_rows) > 5
            })
            
        return {
            "total_sheets": len(results),
            "sheets": results
        }
    except Exception as e:
        print(f"=== [INSPECT ERROR] {e}")
        return {
            "total_sheets": 0,
            "sheets": [],
            "error": str(e)
        }


def import_master_products_from_excel(db: Session, file_content: bytes, selected_sheets: Optional[Any] = None):
    """
    [MULTI-SHEET STREAMING IMPORT] Nhập dữ liệu Master BOM chuẩn từ file Excel:
    - Hỗ trợ chọn 1, nhiều hoặc toàn bộ sheet.
    - Ánh xạ đầy đủ 58 cột thuộc tính kỹ thuật.
    - Duyệt cây BOM phân cấp đệ quy chính xác (parent_id).
    - Tự động liên kết Dòng hàng (MasterCategory) và Mẫu màu sơn (paint_color_samples).
    - Cập nhật thời gian thực qua Server-Sent Events (SSE).
    """
    import io, openpyxl, json, re
    from modules.master.models.master_category import MasterCategory
    from modules.master.models.master_product_detail import MasterProductDetail
    from modules.master.models.paint_color_sample import PaintColorSample

    def clean_val(val):
        if val is None or pd.isna(val): return None
        s = str(val).strip()
        if not s or s.lower() == 'nan' or s.lower() == 'none': return None
        return s

    def to_bool(val):
        if not val: return False
        return str(val).strip().lower() in ['có', 'yes', '1', 'true', 'x']

    def to_float(val, default=0.0):
        if val is None or pd.isna(val): return default
        try:
            s = str(val).strip().replace(',', '.')
            return float(s)
        except Exception:
            return default

    # Parse selected sheets filter
    target_sheet_filter = None
    if selected_sheets:
        if isinstance(selected_sheets, str):
            try:
                target_sheet_filter = json.loads(selected_sheets)
            except Exception:
                target_sheet_filter = [s.strip() for s in selected_sheets.split(',') if s.strip()]
        elif isinstance(selected_sheets, (list, set)):
            target_sheet_filter = list(selected_sheets)

    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_content), data_only=True)
        all_sheetnames = wb.sheetnames

        valid_sheetnames = []
        for sname in all_sheetnames:
            if target_sheet_filter is not None:
                if sname in target_sheet_filter:
                    valid_sheetnames.append(sname)
            else:
                ws = wb[sname]
                if ws.max_row >= 2:
                    valid_sheetnames.append(sname)

        if not valid_sheetnames:
            yield json.dumps({"status": "error", "message": "Không tìm thấy sheet nào hợp lệ để nhập dữ liệu."}) + "\n"
            return

        total_sheets = len(valid_sheetnames)
        yield json.dumps({
            "status": "reading",
            "total_sheets": total_sheets,
            "sheets": valid_sheetnames,
            "message": f"Bắt đầu nạp {total_sheets} sheet được chọn..."
        }) + "\n"

        total_prods_imported = 0
        total_boms_imported = 0
        category_cache = {}

        for sheet_idx, sheet_name in enumerate(valid_sheetnames):
            ws = wb[sheet_name]
            if ws.max_row < 2:
                continue

            # 1. Tìm dòng tiêu đề (Header row)
            h_row = 1
            for r in range(1, min(15, ws.max_row + 1)):
                row_vals = [str(ws.cell(r, c).value or '').lower() for c in range(1, min(ws.max_column + 1, 20))]
                if any(k in ' '.join(row_vals) for k in ['mã chi tiết', 'tên chi tiết', 'mã mặt hàng', 'mã sản phẩm']):
                    h_row = r
                    break

            headers = [str(ws.cell(h_row, c).value or '').replace('\n', ' ').strip().lower() for c in range(1, ws.max_column + 1)]

            def get_c_idx(names, default=None):
                for name in names:
                    for i, h in enumerate(headers):
                        if name == h: return i + 1
                for name in names:
                    for i, h in enumerate(headers):
                        if name in h: return i + 1
                return default

            c_parent_sku = get_c_idx(['mã mặt hàng', 'mã sp', 'mã sản phẩm'], 1)
            c_parent_name = get_c_idx(['tên mặt hàng', 'tên sp', 'tên sản phẩm'], 2)
            c_stt = get_c_idx(['stt'], 3)
            c_material = get_c_idx(['nguyên liệu'], 4)
            c_child_sku = get_c_idx(['mã chi tiết'], 5)
            c_child_name = get_c_idx(['tên chi tiết'], 6)
            c_unit = get_c_idx(['đvt chi tiết', 'đvt'], 7)
            c_h = get_c_idx(['dày'], 8)
            c_w = get_c_idx(['rộng'], 9)
            c_l = get_c_idx(['dài'], 10)
            c_raw_h = get_c_idx(['phôi dày'], 11)
            c_raw_w = get_c_idx(['phôi rộng'], 12)
            c_raw_l = get_c_idx(['phôi dài'], 13)
            c_color = get_c_idx(['màu sắc'], 14)
            c_qty_part = get_c_idx(['sl/ part'], 15)
            c_qty_set = get_c_idx(['sl/ set'], 17)
            c_desc = get_c_idx(['ghi chú'], 21)
            c_waste = get_c_idx(['tỷ lệ hao hụt'], 22)
            c_is_fin = get_c_idx(['là thành phẩm c/k', 'là thành phẩm'], 25)
            c_is_raw = get_c_idx(['là nvl c/k', 'là nvl'], 26)
            c_exclude = get_c_idx(['không đưa vào qtsx'], 27)
            c_brand = get_c_idx(['năng suất mục tiêu'], 28)
            c_in_stage = get_c_idx(['công đoạn ra'], 29)
            c_out_stage = get_c_idx(['công đoạn vào'], 30)
            c_spec = get_c_idx(['quy cách chi tiết', 'quy cách'], 33)
            c_cat = get_c_idx(['danh mục mặt hàng'], 34)

            # 2. Đọc toàn bộ dòng trong Sheet
            records = []
            root_products_dict = {}

            for r in range(h_row + 1, ws.max_row + 1):
                c_sku = clean_val(ws.cell(r, c_child_sku).value) if c_child_sku else None
                p_sku = clean_val(ws.cell(r, c_parent_sku).value) if c_parent_sku else None
                if not c_sku or not p_sku:
                    continue

                c_sku_std = clean_and_standardize_sku(c_sku)
                p_sku_std = clean_and_standardize_sku(p_sku)
                c_name = clean_and_standardize_name(clean_val(ws.cell(r, c_child_name).value) or c_sku_std)
                p_name = clean_and_standardize_name(clean_val(ws.cell(r, c_parent_name).value) or p_sku_std)
                is_fin = to_bool(ws.cell(r, c_is_fin).value) if c_is_fin else False

                spec = clean_val(ws.cell(r, c_spec).value) if c_spec else None
                h_val = to_float(ws.cell(r, c_h).value) if c_h else 0.0
                w_val = to_float(ws.cell(r, c_w).value) if c_w else 0.0
                l_val = to_float(ws.cell(r, c_l).value) if c_l else 0.0
                if not (h_val and w_val and l_val) and spec:
                    p_h, p_w, p_l = parse_dimensions(spec)
                    if not h_val: h_val = p_h
                    if not w_val: w_val = p_w
                    if not l_val: l_val = p_l

                raw_h = to_float(ws.cell(r, c_raw_h).value) if c_raw_h else 0.0
                raw_w = to_float(ws.cell(r, c_raw_w).value) if c_raw_w else 0.0
                raw_l = to_float(ws.cell(r, c_raw_l).value) if c_raw_l else 0.0

                color = clean_val(ws.cell(r, c_color).value) if c_color else None
                material = clean_val(ws.cell(r, c_material).value) if c_material else None
                unit = clean_val(ws.cell(r, c_unit).value) if c_unit else 'Cái'
                qty_set = to_float(ws.cell(r, c_qty_set).value, 1.0) if c_qty_set else 1.0
                qty_part = to_float(ws.cell(r, c_qty_part).value, qty_set) if c_qty_part else qty_set
                waste = to_float(ws.cell(r, c_waste).value, 1.0) if c_waste else 1.0
                is_raw = to_bool(ws.cell(r, c_is_raw).value) if c_is_raw else False
                exclude = to_bool(ws.cell(r, c_exclude).value) if c_exclude else False
                in_stg = clean_stage_name(clean_val(ws.cell(r, c_in_stage).value)) if c_in_stage else None
                out_stg = clean_stage_name(clean_val(ws.cell(r, c_out_stage).value)) if c_out_stage else None
                note = clean_val(ws.cell(r, c_desc).value) if c_desc else None
                brand = clean_val(ws.cell(r, c_brand).value) or 'ATLAS'
                cat = clean_val(ws.cell(r, c_cat).value) or 'ATLAS'
                stt_val = clean_val(ws.cell(r, c_stt).value)

                rec = {
                    'row': r,
                    'parent_sku': p_sku_std,
                    'parent_name': p_name,
                    'child_sku': c_sku_std,
                    'child_name': c_name,
                    'stt': stt_val,
                    'material': material,
                    'unit': unit or 'Cái',
                    'length': l_val,
                    'width': w_val,
                    'height': h_val,
                    'raw_length': raw_l,
                    'raw_width': raw_w,
                    'raw_height': raw_h,
                    'color': color,
                    'qty_part': qty_part,
                    'qty_set': qty_set,
                    'waste': waste,
                    'is_fin': is_fin,
                    'is_raw': is_raw,
                    'exclude': exclude,
                    'in_stage': in_stg,
                    'out_stage': out_stg,
                    'spec': spec,
                    'brand': brand,
                    'category': cat,
                    'note': note
                }
                records.append(rec)

                if is_fin or (p_sku_std == c_sku_std and '.' not in p_sku_std):
                    if p_sku_std not in root_products_dict:
                        root_products_dict[p_sku_std] = rec

            if not root_products_dict:
                # Nếu không tìm thấy is_fin, lấy các root dựa trên hiệu tập hợp
                all_p = set(r['parent_sku'] for r in records)
                all_c = set(r['child_sku'] for r in records)
                r_skus = list(all_p - all_c)
                for r_sku in r_skus:
                    r_rec = next((r for r in records if r['parent_sku'] == r_sku), None)
                    if r_rec:
                        root_products_dict[r_sku] = r_rec

            sheet_prod_count = len(root_products_dict)
            yield json.dumps({
                "status": "processing",
                "sheet": sheet_name,
                "sheet_index": sheet_idx + 1,
                "total_sheets": total_sheets,
                "processed": total_prods_imported,
                "total": total_prods_imported + sheet_prod_count,
                "message": f"Đang nạp Sheet [{sheet_name}] ({sheet_idx + 1}/{total_sheets}) - {sheet_prod_count} sản phẩm..."
            }) + "\n"

            # 3. Nạp danh mục MasterCategory
            cat_name = 'ATLAS'
            if records:
                cat_name = records[0].get('category') or records[0].get('brand') or 'ATLAS'

            if cat_name not in category_cache:
                cat_obj = db.query(MasterCategory).filter(MasterCategory.name == cat_name).first()
                if not cat_obj:
                    cat_obj = MasterCategory(name=cat_name, description=f"Dòng sản phẩm {cat_name} cao cấp", status=1)
                    db.add(cat_obj)
                    db.flush()
                category_cache[cat_name] = cat_obj.id

            cat_id = category_cache[cat_name]

            # 4. Lưu từng sản phẩm Root và Cây BOM
            for root_sku, r_rec in root_products_dict.items():
                p_obj = db.query(MasterProduct).filter(MasterProduct.sku == root_sku).first()
                p_color = r_rec.get('color') or parse_color(root_sku, r_rec['parent_name']) or 'BRO'
                if not p_obj:
                    p_obj = MasterProduct(
                        sku=root_sku,
                        name=r_rec['parent_name'],
                        category_id=cat_id,
                        brand_name=r_rec['brand'],
                        color=p_color,
                        specification=r_rec['spec'],
                        length=r_rec['length'],
                        width=r_rec['width'],
                        height=r_rec['height'],
                        unit=r_rec['unit'] or 'Bộ',
                        status='Active'
                    )
                    db.add(p_obj)
                    db.flush()
                else:
                    p_obj.name = r_rec['parent_name']
                    p_obj.category_id = cat_id
                    p_obj.brand_name = r_rec['brand']
                    p_obj.color = p_color or p_obj.color
                    p_obj.specification = r_rec['spec']
                    p_obj.length = r_rec['length']
                    p_obj.width = r_rec['width']
                    p_obj.height = r_rec['height']
                    db.flush()

                # Xóa BOM cũ của sản phẩm này
                db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == p_obj.id).update({MasterBOMDetail.parent_id: None}, synchronize_session=False)
                db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == p_obj.id).delete(synchronize_session=False)

                # Lọc danh sách dòng thuộc về sản phẩm này
                prod_rows = [row for row in records if row['parent_sku'].startswith(root_sku) or row['child_sku'].startswith(root_sku)]
                prod_rows_sorted = sorted(prod_rows, key=lambda x: x['row'])

                sku_to_bom = {}
                for row in prod_rows_sorted:
                    if row['child_sku'] == root_sku:
                        continue

                    parent_bom_id = None
                    if row['parent_sku'] in sku_to_bom:
                        parent_bom_id = sku_to_bom[row['parent_sku']].id

                    bom_item = MasterBOMDetail(
                        master_product_id=p_obj.id,
                        parent_id=parent_bom_id,
                        sku=row['child_sku'],
                        name=row['child_name'],
                        unit=row['unit'],
                        length=row['length'],
                        width=row['width'],
                        height=row['height'],
                        color=row['color'] or p_color,
                        material=row['material'],
                        quantity=row['qty_part'],
                        specification=row['spec'],
                        waste_ratio=row['waste'],
                        is_raw_material=row['is_raw'],
                        exclude_production=row['exclude'],
                        input_stage=row['in_stage'],
                        output_stage=row['out_stage'],
                        description=row['note'],
                        status='Active'
                    )
                    db.add(bom_item)
                    db.flush()
                    sku_to_bom[row['child_sku']] = bom_item
                    total_boms_imported += 1

                # 5. Đồng bộ Mẫu màu sơn (paint_color_samples - KT03.3)
                pcs = db.query(PaintColorSample).filter(
                    PaintColorSample.master_product_id == p_obj.id,
                    PaintColorSample.color_code == p_color
                ).first()
                if not pcs and p_color:
                    db.add(PaintColorSample(
                        master_product_id=p_obj.id,
                        color_code=p_color,
                        color_name=f"Màu sơn {p_color}",
                        supplier="G7 Paint Standards"
                    ))

                # 6. Đồng bộ Chi tiết KT (master_product_details - KT03.1)
                db.query(MasterProductDetail).filter(MasterProductDetail.master_product_id == p_obj.id).delete(synchronize_session=False)
                for row in prod_rows_sorted:
                    if row['child_sku'] != root_sku and (row['in_stage'] or row['out_stage']):
                        db.add(MasterProductDetail(
                            master_product_id=p_obj.id,
                            name=row['child_name'],
                            quantity=row['qty_set'],
                            unit=row['unit'],
                            input_stage=row['in_stage'],
                            output_stage=row['out_stage'],
                            parent_name=row['parent_name'],
                            material=row['material']
                        ))

                total_prods_imported += 1

            db.commit()

        # Đồng bộ toàn bộ dữ liệu phụ trợ
        try:
            sync_bom_data_to_auxiliary_tables(db)
        except Exception as sync_err:
            print(f"=== [SYNC AUX ERROR] {sync_err}")

        yield json.dumps({
            "status": "completed",
            "total_products": total_prods_imported,
            "total_bom_items": total_boms_imported,
            "total_sheets": total_sheets,
            "message": f"Đã nhập thành công {total_prods_imported} sản phẩm mẫu ({total_boms_imported} chi tiết BOM) từ {total_sheets} sheet!"
        }) + "\n"

    except Exception as exc:
        db.rollback()
        print(f"=== [IMPORT ERROR] {exc}")
        yield json.dumps({"status": "error", "message": str(exc)}) + "\n"


def get_technical_pending_tasks(db: Session):
    tasks = db.query(TechnicalPendingTask).order_by(TechnicalPendingTask.id.desc()).all()
    if not tasks:
        defaults = [
            TechnicalPendingTask(title="Duyệt bản vẽ SP A009-L-010-LSP", assigned_to="Nguyễn Văn A", status="Chờ xử lý"),
            TechnicalPendingTask(title="Cập nhật định mức keo & sơn SP A009-L-010-BKO", assigned_to="Trần Văn B", status="Đang xử lý"),
            TechnicalPendingTask(title="Thẩm định màu sơn bóng gỗ sồi Lô 2", assigned_to="Lê Văn C", status="Chờ xử lý")
        ]
        db.add_all(defaults)
        db.commit()
        tasks = db.query(TechnicalPendingTask).order_by(TechnicalPendingTask.id.desc()).all()
    return tasks

def create_technical_pending_task(db: Session, title: str, assigned_to: str):
    task = TechnicalPendingTask(title=title, assigned_to=assigned_to)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

def create_technical_drawing(db: Session, product_id: int, data: dict):
    drawing = TechnicalDrawing(
        master_product_id=product_id,
        lot_code=data.get('lot_code', 'Lô 1'),
        updated_by=data.get('updated_by', 'Kỹ thuật viên'),
        status=data.get('status', 'Bản áp dụng'),
        change_reason=data.get('change_reason', 'Thay đổi kỹ thuật'),
        approved_by=data.get('approved_by', 'Trưởng phòng KT'),
        note=data.get('note', ''),
        file_url=data.get('file_url', '')
    )
    db.add(drawing)
    db.commit()
    db.refresh(drawing)
    return drawing

def create_paint_color_sample(db: Session, product_id: int, data: dict):
    if not product_id or product_id == 0:
        product_id = data.get('master_product_id')
    if not product_id:
        first_prod = db.query(MasterProduct).first()
        product_id = first_prod.id if first_prod else 1

    sample = PaintColorSample(
        master_product_id=int(product_id),
        color_code=data.get('color_code', 'MS-01'),
        color_name=data.get('color_name', 'Màu sơn gỗ tự nhiên'),
        supplier=data.get('supplier', 'NPP Sơn Nippon'),
        image_url=save_base64_image_if_needed(data.get('image_url', ''), 'paint_colors'),
        note=data.get('note', '')
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return sample

def add_bom_detail_to_product(db: Session, product_id: int, data: dict):
    bom = MasterBOMDetail(
        master_product_id=product_id,
        parent_id=data.get('parent_id'),
        sku=data.get('sku', 'PART-01'),
        name=data.get('name', 'Chi tiết mới'),
        quantity=float(data.get('quantity', 1.0)),
        unit=data.get('unit', 'Cái'),
        input_stage=clean_stage_name(data.get('input_stage')) or 'Định hình',
        output_stage=clean_stage_name(data.get('output_stage')) or 'Lắp ráp',
        material=data.get('material', 'Gỗ'),
        specification=data.get('specification', ''),
        description=data.get('description', '')
    )
    db.add(bom)
    db.commit()
    db.refresh(bom)
    return bom

def delete_bom_detail(db: Session, detail_id: int):
    detail = db.query(MasterBOMDetail).filter(MasterBOMDetail.id == detail_id).first()
    if detail:
        db.delete(detail)
        db.commit()
        return True
    return False

def create_product_detail(db: Session, product_id: int, data: dict):
    """
    Tạo chi tiết sản phẩm mới (KT03.1) vào bảng riêng master_product_details.
    """
    if not product_id or product_id == 0:
        product_id = data.get('master_product_id')
    if not product_id:
        first_prod = db.query(MasterProduct).first()
        product_id = first_prod.id if first_prod else 1

    detail = MasterProductDetail(
        master_product_id=int(product_id),
        name=data.get('name', 'Chi tiết mới'),
        quantity=float(data.get('quantity', 1.0)),
        unit=data.get('unit', 'Cái'),
        input_stage=clean_stage_name(data.get('input_stage')) or '',
        output_stage=clean_stage_name(data.get('output_stage')) or '',
        parent_name=data.get('parent_name', ''),
        material=data.get('material', '')
    )
    db.add(detail)
    db.commit()
    db.refresh(detail)
    return detail

def delete_product_detail(db: Session, detail_id: int):
    """
    Xóa chi tiết sản phẩm (KT03.1) theo ID.
    """
    detail = db.query(MasterProductDetail).filter(MasterProductDetail.id == detail_id).first()
    if detail:
        db.delete(detail)
        db.commit()
        return True
    return False

def delete_paint_color_sample(db: Session, sample_id: int):
    """
    Xóa mẫu màu sơn (KT03.3) theo ID.
    """
    sample = db.query(PaintColorSample).filter(PaintColorSample.id == sample_id).first()
    if sample:
        db.delete(sample)
        db.commit()
        return True
    return False

def get_all_product_details(
    db: Session,
    product_id: int = None,
    input_stage: str = None,
    output_stage: str = None,
    material: str = None,
    unit: str = None,
    q: str = None,
    skip: int = 0,
    limit: int = 50
):
    """
    Lấy danh sách tất cả chi tiết sản phẩm (KT03.1) có phân trang & lọc đa tiêu chí.
    """
    query = db.query(MasterProductDetail).outerjoin(MasterProduct, MasterProductDetail.master_product_id == MasterProduct.id)
    if product_id:
        query = query.filter(MasterProductDetail.master_product_id == product_id)
    if input_stage and input_stage.strip():
        query = query.filter(MasterProductDetail.input_stage == input_stage.strip())
    if output_stage and output_stage.strip():
        query = query.filter(MasterProductDetail.output_stage == output_stage.strip())
    if material and material.strip():
        query = query.filter(MasterProductDetail.material == material.strip())
    if unit and unit.strip():
        query = query.filter(MasterProductDetail.unit == unit.strip())
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            (MasterProductDetail.name.ilike(term)) |
            (MasterProductDetail.material.ilike(term)) |
            (MasterProductDetail.input_stage.ilike(term)) |
            (MasterProductDetail.output_stage.ilike(term)) |
            (MasterProduct.sku.ilike(term)) |
            (MasterProduct.name.ilike(term))
        )
    total = query.count()
    items = query.order_by(MasterProductDetail.id.desc()).offset(skip).limit(limit).all()
    
    # Enrich each item with product info
    result_items = []
    for item in items:
        prod = item.master_product
        result_items.append({
            "id": item.id,
            "master_product_id": item.master_product_id,
            "product_sku": prod.sku if prod else "N/A",
            "product_name": prod.name if prod else "N/A",
            "name": item.name,
            "quantity": item.quantity,
            "unit": item.unit,
            "input_stage": item.input_stage,
            "output_stage": item.output_stage,
            "parent_name": item.parent_name,
            "material": item.material,
            "created_at": item.created_at.strftime("%d/%m/%Y") if item.created_at else ""
        })
    return {"items": result_items, "total": total}

def update_product_detail(db: Session, detail_id: int, data: dict):
    """
    Cập nhật thông tin chi tiết sản phẩm (KT03.1).
    """
    detail = db.query(MasterProductDetail).filter(MasterProductDetail.id == detail_id).first()
    if not detail:
        return None
    if 'name' in data and data['name']:
        detail.name = data['name']
    if 'quantity' in data:
        detail.quantity = float(data['quantity'])
    if 'unit' in data:
        detail.unit = data['unit']
    if 'input_stage' in data:
        detail.input_stage = clean_stage_name(data['input_stage'])
    if 'output_stage' in data:
        detail.output_stage = clean_stage_name(data['output_stage'])
    if 'parent_name' in data:
        detail.parent_name = data['parent_name']
    if 'material' in data:
        detail.material = data['material']
    if 'master_product_id' in data and data['master_product_id']:
        detail.master_product_id = int(data['master_product_id'])
    
    db.commit()
    db.refresh(detail)
    return detail

def get_all_paint_color_samples(
    db: Session,
    product_id: int = None,
    supplier: str = None,
    has_image: str = None,
    q: str = None,
    skip: int = 0,
    limit: int = 50
):
    """
    Lấy danh sách tất cả mẫu màu sơn (KT03.3) có phân trang & lọc đa tiêu chí.
    """
    query = db.query(PaintColorSample).outerjoin(MasterProduct, PaintColorSample.master_product_id == MasterProduct.id)
    if product_id:
        query = query.filter(PaintColorSample.master_product_id == product_id)
    if supplier and supplier.strip():
        query = query.filter(PaintColorSample.supplier == supplier.strip())
    if has_image == 'yes':
        query = query.filter(PaintColorSample.image_url.isnot(None), PaintColorSample.image_url != '')
    elif has_image == 'no':
        query = query.filter((PaintColorSample.image_url.is_(None)) | (PaintColorSample.image_url == ''))
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            (PaintColorSample.color_code.ilike(term)) |
            (PaintColorSample.color_name.ilike(term)) |
            (PaintColorSample.supplier.ilike(term)) |
            (MasterProduct.sku.ilike(term)) |
            (MasterProduct.name.ilike(term))
        )
    total = query.count()
    items = query.order_by(PaintColorSample.id.desc()).offset(skip).limit(limit).all()
    
    result_items = []
    for item in items:
        prod = item.master_product
        result_items.append({
            "id": item.id,
            "master_product_id": item.master_product_id,
            "product_sku": prod.sku if prod else "N/A",
            "product_name": prod.name if prod else "N/A",
            "color_code": item.color_code,
            "color_name": item.color_name,
            "supplier": item.supplier,
            "expiry_date": item.expiry_date.strftime("%Y-%m-%d") if item.expiry_date else "",
            "image_url": item.image_url,
            "note": item.note,
            "created_at": item.created_at.strftime("%d/%m/%Y") if item.created_at else ""
        })
    return {"items": result_items, "total": total}

def update_paint_color_sample(db: Session, sample_id: int, data: dict):
    """
    Cập nhật thông tin mẫu màu sơn (KT03.3).
    """
    sample = db.query(PaintColorSample).filter(PaintColorSample.id == sample_id).first()
    if not sample:
        return None
    if 'color_code' in data and data['color_code']:
        sample.color_code = data['color_code']
    if 'color_name' in data and data['color_name']:
        sample.color_name = data['color_name']
    if 'supplier' in data:
        sample.supplier = data['supplier']
    if 'expiry_date' in data and data['expiry_date']:
        try:
            from datetime import datetime
            sample.expiry_date = datetime.strptime(data['expiry_date'], "%Y-%m-%d")
        except Exception:
            pass
    if 'image_url' in data:
        sample.image_url = save_base64_image_if_needed(data['image_url'], 'paint_colors')
    if 'note' in data:
        sample.note = data['note']
    if 'master_product_id' in data and data['master_product_id']:
        sample.master_product_id = int(data['master_product_id'])

    db.commit()
    db.refresh(sample)
    return sample

def resolve_detail_stages(in_stage: Optional[str], out_stage: Optional[str]):
    """
    Chuẩn hóa cặp công đoạn giao - nhận logic theo quy trình sản xuất thực tế:
    Tạo phôi -> Định hình -> Lắp ráp -> Sơn -> Đóng gói.
    Không bao giờ để 2 công đoạn giao nhận giống nhau (ví dụ: Định hình -> Định hình).
    """
    in_s = (in_stage or '').strip()
    out_s = (out_stage or '').strip()

    if in_s and out_s and in_s.lower() != out_s.lower():
        if in_s == 'Định hình' and out_s == 'Tạo phôi':
            return 'Tạo phôi', 'Định hình'
        return in_s, out_s

    stage_ref = out_s or in_s or 'Định hình'
    if stage_ref == 'Tạo phôi':
        return 'Tạo phôi', 'Định hình'
    elif stage_ref == 'Định hình':
        return 'Định hình', 'Lắp ráp'
    elif stage_ref == 'Lắp ráp':
        return 'Lắp ráp', 'Sơn'
    elif stage_ref == 'Sơn':
        return 'Sơn', 'Đóng gói'
    elif stage_ref == 'Đóng gói':
        return 'Sơn', 'Đóng gói'
    else:
        return 'Định hình', 'Lắp ráp'


def sync_bom_data_to_auxiliary_tables(db: Session):
    """
    Trích xuất & lọc KHÔNG TRÙNG LẶP toàn bộ dữ liệu BOM hiện có trong hệ thống
    để nạp chính xác vào 2 bảng: master_product_details (KT03.1) và paint_color_samples (KT03.3).
    """
    import re
    import datetime
    from datetime import timedelta

    boms = db.query(MasterBOMDetail).all()
    products = db.query(MasterProduct).all()

    unique_details = {}
    unique_colors = {}

    # Build lookups
    product_map = {p.id: p for p in products}
    bom_map = {b.id: b for b in boms}

    def infer_bom_material(bom_name, bom_desc, bom_spec, prod_name, prod_mat):
        text = f"{bom_name or ''} {bom_desc or ''} {bom_spec or ''} {prod_name or ''}".lower()
        if "veneer red oak" in text or "red oak" in text:
            return "Veneer Red Oak"
        elif "veneer oak" in text or "eck veneer oak" in text:
            return "Veneer Oak USA"
        elif "mdf" in text:
            return "Gỗ MDF"
        elif "gỗ sồi" in text or "oak usa" in text or "oak" in text:
            return "Gỗ Sồi tự nhiên"
        elif "gỗ thông" in text or "pine" in text:
            return "Gỗ Thông"
        elif "gỗ cao su" in text:
            return "Gỗ Cao Su"
        elif prod_mat:
            return prod_mat
        return "Gỗ tự nhiên"

    def get_real_direct_parent_name(bom_item):
        curr = bom_item
        visited = set()
        while curr.parent_id and curr.parent_id in bom_map:
            if curr.id in visited:
                break
            visited.add(curr.id)
            parent_bom = bom_map[curr.parent_id]
            if parent_bom.name and parent_bom.name.strip() and parent_bom.name.strip().lower() != bom_item.name.strip().lower():
                return parent_bom.name.strip()
            curr = parent_bom
        
        prod = product_map.get(bom_item.master_product_id)
        if prod:
            p_code = getattr(prod, 'sku', None) or getattr(prod, 'product_code', None)
            p_name = prod.name or ''
            return f"{p_code} - {p_name}".strip(' -') if p_code and p_name else (p_code or p_name or '')
        return ""

    # 1. Deduplicate & Extract Product Details with exact direct parent component from BOM
    for b in boms:
        if b.name and b.name.strip():
            name_clean = b.name.strip()
            parent_clean = get_real_direct_parent_name(b)

            in_stage, out_stage = resolve_detail_stages(b.input_stage, b.output_stage)

            unit_clean = (b.unit or 'Cái').strip()
            if unit_clean.lower() == 'cái':
                unit_clean = 'Cái'
            elif unit_clean.lower() == 'bộ':
                unit_clean = 'Bộ'
            elif unit_clean.lower() == 'tấm':
                unit_clean = 'Tấm'

            prod = product_map.get(b.master_product_id)
            mat_clean = b.material or infer_bom_material(b.name, b.description, b.specification, prod.name if prod else '', prod.material if prod else '')

            key = f"{b.master_product_id}|{name_clean.lower()}|{parent_clean.lower()}"
            if key not in unique_details:
                unique_details[key] = {
                    'master_product_id': b.master_product_id,
                    'name': name_clean,
                    'quantity': b.quantity or 1.0,
                    'unit': unit_clean,
                    'input_stage': in_stage,
                    'output_stage': out_stage,
                    'parent_name': parent_clean,
                    'material': mat_clean
                }

    # 2. Extract and Deduplicate Paint Colors from BOM details & descriptions
    color_index = 1
    today = datetime.datetime.now()

    def add_unique_color(prod_id, c_name, supplier="Công ty TNHH Sơn Nippon", note=None):
        nonlocal color_index
        if not c_name or not c_name.strip():
            return
        c_clean = c_name.strip()
        key = f"{prod_id}|{c_clean.lower()}"
        if key not in unique_colors:
            p_obj = product_map.get(prod_id)
            p_sku = p_obj.sku if p_obj else ""
            unique_colors[key] = {
                'master_product_id': prod_id or (products[0].id if products else 1),
                'color_code': f"MS-{str(color_index).zfill(3)}",
                'color_name': c_clean,
                'supplier': supplier,
                'expiry_date': today + timedelta(days=180),
                'note': note or f"Mẫu màu sơn tiêu chuẩn cho sản phẩm {p_sku}"
            }
            color_index += 1

    # 2.1 Check BOM descriptions & details for paint colors
    for b in boms:
        desc = b.description or ''
        if not desc:
            continue
        p_obj = product_map.get(b.master_product_id)
        p_sku = p_obj.sku if p_obj else ""
        
        if "walnut" in desc.lower():
            add_unique_color(b.master_product_id, "Sơn màu Walnut", supplier="Công ty TNHH Sơn Nippon", note=f"Màu hạt dẻ ấm Walnut tiêu chuẩn - áp dụng chi tiết {b.name} ({p_sku})")
        elif "na clear" in desc.lower():
            add_unique_color(b.master_product_id, "SƠN MÀU NA CLEAR", supplier="NPP Sơn Oseven", note=f"Sơn bóng trong suốt NA Clear giữ vân gỗ tự nhiên Oak USA - chi tiết {b.name} ({p_sku})")
        elif "veneer" in desc.lower():
            add_unique_color(b.master_product_id, "Sơn lót Polyurethane 2K", supplier="Nội bộ G7", note=f"Lớp lót chống ẩm mốc cho bề mặt Veneer Oak - chi tiết {b.name} ({p_sku})")

    # 2.2 Ensure every product has its designated paint color sample
    for p in products:
        p_name_lower = (p.name or '').lower()
        p_sku_lower = (p.sku or '').lower()
        if any(k in p_sku_lower or k in p_name_lower for k in ['688', '687', '689', '690', 'walnut']):
            add_unique_color(p.id, "Sơn màu Walnut", supplier="Công ty TNHH Sơn Nippon", note=f"Màu hạt dẻ ấm Walnut tiêu chuẩn - {p.sku}")
            add_unique_color(p.id, "Sơn PU mờ 70%", supplier="Công ty TNHH Sơn Nippon", note=f"Sơn PU mờ 70% mịn cao cấp xuất khẩu EU - {p.sku}")
        else:
            add_unique_color(p.id, "SƠN MÀU NA CLEAR", supplier="NPP Sơn Oseven", note=f"Sơn bóng trong suốt NA Clear giữ màu gỗ tự nhiên Oak USA - {p.sku}")
            add_unique_color(p.id, "Sơn bóng gỗ sồi (Oak USA)", supplier="Sơn Á Châu", note=f"Sơn bóng chuyên dụng cho dòng gỗ Sồi Bắc Mỹ - {p.sku}")

    # 2.3 Add standard universal paint palette across factory
    standard_paint_palette = [
        ("Sơn PU mờ 50%", "Công ty Sơn Dulux", "Sơn PU mờ 50% bảo vệ bề mặt chống trầy xước"),
        ("Sơn trắng 2K cao cấp", "Công ty TNHH Sơn Nippon", "Sơn màu trắng phủ mặt ngoài cánh tủ và vách hông"),
        ("Sơn NC cánh gián", "NPP Sơn Oseven", "Màu cánh gián cổ điển phủ bóng hoàn thiện"),
        ("Sơn lau Wood Stain Teak", "Sơn Á Châu", "Sơn lau thẩm thấu tôn vân gỗ tự nhiên"),
        ("Sơn UV chống ố vàng", "Công ty TNHH Sơn Nippon", "Lớp phủ UV bảo vệ mặt bàn chống tác động nhiệt và ánh sáng")
    ]

    for idx, (p_name, p_sup, p_note) in enumerate(standard_paint_palette):
        prod_id = products[idx % len(products)].id if products else 1
        add_unique_color(prod_id, p_name, supplier=p_sup, note=p_note)

    # Clear current data
    db.query(MasterProductDetail).delete()
    db.query(PaintColorSample).delete()
    db.commit()

    # Bulk insert details
    detail_objects = [MasterProductDetail(**val) for val in unique_details.values()]
    db.bulk_save_objects(detail_objects)

    # Bulk insert paint colors
    color_objects = [PaintColorSample(**val) for val in unique_colors.values()]
    db.bulk_save_objects(color_objects)

    db.commit()

    return {
        "status": "success",
        "message": "Đã trích xuất & đồng bộ dữ liệu từ BOM thành công!",
        "unique_product_details_inserted": len(detail_objects),
        "unique_paint_colors_inserted": len(color_objects)
    }

def is_raw_sku_code(text: str) -> bool:
    """
    Kiểm tra xem một chuỗi có phải là Mã sản phẩm thuần túy (SKU code) hay không.
    Ví dụ: '02-BD10-BLK', '1-36L-BRO', 'APT19-BD6-WOA' -> True (Là mã SKU).
    'Oslo Dining table', 'Bộ chân ghế', 'Khung trước' -> False (Là tên thành phẩm/sản phẩm).
    """
    if not text or not text.strip():
        return True
    s = text.strip()
    import re
    if re.match(r'^[A-Z0-9]{1,10}(-[A-Z0-9]{1,10})+$', s, re.IGNORECASE):
        return True
_detail_suggestions_cache = {}
_detail_suggestions_cache_time = 0

def get_detail_suggestions(db: Session, detail_name: Optional[str] = None, parent_name: Optional[str] = None):
    """
    Lấy danh sách tất cả các tên chi tiết và tên thành phẩm duy nhất để hỗ trợ gợi ý autocomplete.
    Nếu có `detail_name`, chỉ lọc và trả về danh sách các Thành phẩm thực sự chứa chi tiết đó.
    Nếu có `parent_name`, chỉ trả về các tên chi tiết con của thành phẩm đó.
    """
    global _detail_suggestions_cache, _detail_suggestions_cache_time
    import time
    is_default_query = not detail_name and not parent_name
    if is_default_query and _detail_suggestions_cache and (time.time() - _detail_suggestions_cache_time < 300):
        return _detail_suggestions_cache

    p_clean = parent_name.strip() if parent_name else None

    # Lấy tên chi tiết & meta từ master_product_details, có thể lọc theo parent_name
    detail_query = db.query(
        MasterProductDetail.name,
        MasterProductDetail.quantity,
        MasterProductDetail.unit,
        MasterProductDetail.input_stage,
        MasterProductDetail.output_stage,
        MasterProductDetail.material
    )
    if p_clean:
        detail_query = detail_query.filter(MasterProductDetail.parent_name.ilike(f'%{p_clean}%'))
    detail_rows = detail_query.all()
    detail_names = sorted(list(set([r[0] for r in detail_rows if r[0]])))

    # Nếu không lọc theo parent_name, thêm tên từ BOM (chỉ lấy chi tiết, loại bỏ m3, m2, kg)
    if p_clean:
        all_names = detail_names
    else:
        bom_names = [
            r[0] for r in db.query(MasterBOMDetail.name)
            .filter(~MasterBOMDetail.unit.in_(['m3', 'm2', 'kg', 'lít', 'lit', 'm']))
            .distinct().all() if r[0]
        ]
        all_names = sorted(list(set(detail_names + bom_names)))

    parent_product_map = {}

    # Map tên chi tiết -> công đoạn giao/nhận để FE tự động gán
    detail_stage_map = {}
    for r in db.query(MasterProductDetail.name, MasterProductDetail.input_stage, MasterProductDetail.output_stage).all():
        if r[0]:
            in_s, out_s = resolve_detail_stages(r[1], r[2])
            detail_stage_map.setdefault(r[0], {'input_stage': in_s, 'output_stage': out_s})
    for r in db.query(MasterBOMDetail.name, MasterBOMDetail.input_stage, MasterBOMDetail.output_stage).all():
        if r[0] and r[0] not in detail_stage_map:
            in_s, out_s = resolve_detail_stages(r[1], r[2])
            detail_stage_map.setdefault(r[0], {'input_stage': in_s, 'output_stage': out_s})

    # Map tên chi tiết -> đơn vị, vật liệu, số lượng để FE auto-fill trong modal thêm thành phần
    detail_meta_map = {}
    for r in detail_rows:
        if r[0] and r[0] not in detail_meta_map:
            in_s, out_s = resolve_detail_stages(r[3], r[4])
            detail_meta_map[r[0]] = {
                'quantity': r[1] if r[1] is not None else 1,
                'unit': r[2] or 'Cái',
                'input_stage': in_s,
                'output_stage': out_s,
                'material': r[5] or ''
            }

    # Bổ sung công đoạn, quy cách, kích thước, khối lượng từ MasterBOMDetail
    if detail_meta_map:
        detail_names_list = list(detail_meta_map.keys())
        chunk_size = 1000
        bom_rows = []
        for i in range(0, len(detail_names_list), chunk_size):
            chunk = detail_names_list[i:i + chunk_size]
            bom_rows.extend(db.query(
                MasterBOMDetail.name,
                MasterBOMDetail.input_stage,
                MasterBOMDetail.output_stage,
                MasterBOMDetail.specification,
                MasterBOMDetail.length,
                MasterBOMDetail.width,
                MasterBOMDetail.height,
                MasterBOMDetail.weight
            ).filter(MasterBOMDetail.name.in_(chunk)).all())
        for r in bom_rows:
            if not r[0] or r[0] not in detail_meta_map:
                continue
            meta = detail_meta_map[r[0]]
            if r[1]: meta['input_stage'] = r[1]
            if r[2]: meta['output_stage'] = r[2]
            spec = r[3] or ''
            length = r[4] if r[4] is not None else 0
            width = r[5] if r[5] is not None else 0
            height = r[6] if r[6] is not None else 0
            if length and width and height:
                meta['length'] = float(length)
                meta['width'] = float(width)
                meta['height'] = float(height)
                meta['spec'] = f"{int(length)}*{int(width)}*{int(height)}"
                meta['volume'] = round((float(length) * float(width) * float(height)) / 1_000_000_000, 6)
            elif spec:
                meta['spec'] = spec
                meta['volume'] = round(float(r[7] or 0), 4)
                if '*' in spec:
                    try:
                        parts = [p.strip() for p in spec.split('*')]
                        if len(parts) >= 3:
                            meta['length'] = float(parts[0])
                            meta['width'] = float(parts[1])
                            meta['height'] = float(parts[2])
                    except ValueError:
                        pass

    if detail_name and detail_name.strip():
        d_clean = detail_name.strip()
        # Lấy trực tiếp các thành phẩm / cụm cha từ master_product_details
        detail_parents_query = db.query(
            MasterProductDetail.parent_name,
            MasterProductDetail.master_product_id
        ).filter(MasterProductDetail.name.ilike(f"%{d_clean}%")).all()

        d_parents_set = set()
        for r in detail_parents_query:
            if r[0]:
                d_parents_set.add(r[0])
                if r[1]:
                    parent_product_map.setdefault(r[0], r[1])

        if d_parents_set:
            # Sắp xếp các cụm chi tiết cha trực tiếp lên đầu (ví dụ: Thanh chính, Tăng dày 1, Chân...)
            sub_parents = sorted([p for p in d_parents_set if not p.startswith('ADV')])
            root_parents = sorted([p for p in d_parents_set if p.startswith('ADV')])
            parent_suggestions = sub_parents + root_parents
        else:
            all_prods = db.query(MasterProduct).all()
            prod_combos = []
            for r in all_prods:
                p_code = getattr(r, 'sku', None) or getattr(r, 'product_code', None)
                if p_code and r.name:
                    combo = f"{p_code} - {r.name}"
                    prod_combos.append(combo)
                    parent_product_map.setdefault(combo, r.id)
                elif r.name:
                    prod_combos.append(r.name)
                    parent_product_map.setdefault(r.name, r.id)
            parent_suggestions = sorted(prod_combos)
    else:
        parent_names = [r[0] for r in db.query(MasterProductDetail.parent_name).distinct().all() if r[0]]
        all_prods = db.query(MasterProduct).all()
        prod_combos = []
        for r in all_prods:
            p_code = getattr(r, 'sku', None) or getattr(r, 'product_code', None)
            if p_code and r.name:
                combo = f"{p_code} - {r.name}"
                prod_combos.append(combo)
                parent_product_map.setdefault(combo, r.id)
            elif r.name:
                prod_combos.append(r.name)
                parent_product_map.setdefault(r.name, r.id)
            elif p_code:
                prod_combos.append(p_code)
                parent_product_map.setdefault(p_code, r.id)

        sub_assemblies = sorted([p for p in parent_names if not p.startswith('ADV')])
        root_prods = sorted(list(set(prod_combos + [p for p in parent_names if p.startswith('ADV')])))
        parent_suggestions = sub_assemblies + root_prods

    result = {"detail_names": all_names, "parent_names": parent_suggestions, "parent_product_map": parent_product_map, "detail_stage_map": detail_stage_map, "detail_meta_map": detail_meta_map}
    if is_default_query:
        _detail_suggestions_cache = result
        _detail_suggestions_cache_time = time.time()
    return result

def get_paint_color_suggestions(db: Session):
    """
    Lấy danh sách các mã màu, tên màu và nhà cung cấp duy nhất để hỗ trợ gợi ý autocomplete.
    """
    codes = [r[0] for r in db.query(PaintColorSample.color_code).distinct().all() if r[0]]
    names = [r[0] for r in db.query(PaintColorSample.color_name).distinct().all() if r[0]]
    suppliers = [r[0] for r in db.query(PaintColorSample.supplier).distinct().all() if r[0]]

    return {
        "color_codes": sorted(list(set(codes))),
        "color_names": sorted(list(set(names))),
        "suppliers": sorted(list(set(suppliers)))
    }

def serialize_material_item(mat: MasterProductMaterial) -> dict:
    return {
        "id": mat.id,
        "master_product_id": mat.master_product_id,
        "product_sku": getattr(mat, "product_sku", None) or "---",
        "product_name": getattr(mat, "product_name", None) or "---",
        "stt": mat.stt or 1,
        "group_type": mat.group_type or "VẬT TƯ HÀNG TRẮNG",
        "material_code": mat.material_code or "",
        "material_name": mat.material_name or "",
        "color": mat.color or "",
        "quota": float(mat.quota) if mat.quota is not None else 1.0,
        "unit": mat.unit or "Cái",
        "supplier": mat.supplier or "",
        "note": mat.note or "",
        "created_at": str(mat.created_at) if mat.created_at else None
    }

def create_product_material(db: Session, master_product_id: int, payload: dict):
    mat_name = payload.get("material_name") or payload.get("name", "Vật tư mới")
    mat_code = payload.get("material_code") or f"VT-{mat_name[:6].upper()}"
    group_type = payload.get("group_type") or "VẬT TƯ HÀNG TRẮNG"
    stt = payload.get("stt", 1)
    color = payload.get("color", "")
    quota = float(payload.get("quota", payload.get("quantity", 1.0)) or 1.0)
    unit = payload.get("unit", "Cái")
    supplier = payload.get("supplier", "")
    note = payload.get("note", "")
    
    prod = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first() if master_product_id else None

    mat_obj = MasterProductMaterial(
        master_product_id=master_product_id,
        product_sku=prod.sku if prod else payload.get("product_sku"),
        product_name=prod.name if prod else payload.get("product_name"),
        stt=stt,
        group_type=group_type,
        material_code=mat_code,
        material_name=mat_name,
        color=color,
        quota=quota,
        unit=unit,
        supplier=supplier,
        note=note
    )
    db.add(mat_obj)
    db.commit()
    db.refresh(mat_obj)
    return serialize_material_item(mat_obj)

def create_standalone_material(db: Session, payload: dict):
    prod_id = payload.get("master_product_id") or payload.get("product_id")
    prod_identifier = payload.get("product_identifier") or payload.get("product_name") or payload.get("product_sku")
    
    sku_val = payload.get("product_sku")
    name_val = payload.get("product_name")
    
    if prod_identifier:
        clean_text = str(prod_identifier).strip()
        parts = [p.strip() for p in clean_text.split('-', 1)] if '-' in clean_text else [clean_text]
        if len(parts) > 1:
            sku_val = parts[0]
            name_val = parts[1]
        else:
            sku_val = clean_text
            name_val = clean_text
            
        # Tìm xem sản phẩm có sẵn trong bảng master_products hay không (nếu có thì liên kết ID, KHÔNG TỰ ĐỘNG TẠO MỚI)
        matched_prod = db.query(MasterProduct).filter(
            (MasterProduct.sku.ilike(f"%{clean_text}%")) | 
            (MasterProduct.name.ilike(f"%{clean_text}%")) |
            (MasterProduct.sku.ilike(f"%{sku_val}%")) |
            (MasterProduct.name.ilike(f"%{name_val}%"))
        ).first()
        if matched_prod:
            prod_id = matched_prod.id
            if not sku_val or sku_val == clean_text:
                sku_val = matched_prod.sku
            if not name_val or name_val == clean_text:
                name_val = matched_prod.name

    mat_name = payload.get("material_name") or payload.get("name", "Vật tư mới")
    mat_code = payload.get("material_code") or f"VT-{mat_name[:6].upper()}"
    group_type = payload.get("group_type") or "VẬT TƯ HÀNG TRẮNG"
    stt = payload.get("stt", 1)
    color = payload.get("color", "")
    quota = float(payload.get("quota", payload.get("quantity", 1.0)) or 1.0)
    unit = payload.get("unit", "Cái")
    supplier = payload.get("supplier", "")
    note = payload.get("note", "")

    mat_obj = MasterProductMaterial(
        master_product_id=int(prod_id) if prod_id else None,
        product_sku=sku_val,
        product_name=name_val,
        stt=stt,
        group_type=group_type,
        material_code=mat_code,
        material_name=mat_name,
        color=color,
        quota=quota,
        unit=unit,
        supplier=supplier,
        note=note
    )
    db.add(mat_obj)
    db.commit()
    db.refresh(mat_obj)
    return serialize_material_item(mat_obj)

def update_product_material(db: Session, material_id: int, payload: dict):
    mat_obj = db.query(MasterProductMaterial).filter(MasterProductMaterial.id == material_id).first()
    if not mat_obj:
        return None
        
    prod_id = payload.get("master_product_id") or payload.get("product_id")
    prod_identifier = payload.get("product_identifier") or payload.get("product_name") or payload.get("product_sku")
    
    if prod_identifier:
        clean_text = str(prod_identifier).strip()
        parts = [p.strip() for p in clean_text.split('-', 1)] if '-' in clean_text else [clean_text]
        if len(parts) > 1:
            mat_obj.product_sku = parts[0]
            mat_obj.product_name = parts[1]
        else:
            mat_obj.product_sku = clean_text
            mat_obj.product_name = clean_text
            
        matched_prod = db.query(MasterProduct).filter(
            (MasterProduct.sku.ilike(f"%{clean_text}%")) | 
            (MasterProduct.name.ilike(f"%{clean_text}%"))
        ).first()
        if matched_prod:
            prod_id = matched_prod.id

    if prod_id:
        mat_obj.master_product_id = int(prod_id)
        
    if "material_name" in payload:
        mat_obj.material_name = payload.get("material_name")
    if "name" in payload and not payload.get("material_name"):
        mat_obj.material_name = payload.get("name")
    if "material_code" in payload:
        mat_obj.material_code = payload.get("material_code")
    if "group_type" in payload:
        mat_obj.group_type = payload.get("group_type")
    if "stt" in payload:
        mat_obj.stt = payload.get("stt")
    if "color" in payload:
        mat_obj.color = payload.get("color")
    if "quota" in payload:
        mat_obj.quota = float(payload.get("quota") or 1.0)
    if "quantity" in payload and "quota" not in payload:
        mat_obj.quota = float(payload.get("quantity") or 1.0)
    if "unit" in payload:
        mat_obj.unit = payload.get("unit")
    if "supplier" in payload:
        mat_obj.supplier = payload.get("supplier")
    if "note" in payload:
        mat_obj.note = payload.get("note")
        
    db.commit()
    db.refresh(mat_obj)
    return serialize_material_item(mat_obj)

def delete_product_material(db: Session, material_id: int):
    mat_obj = db.query(MasterProductMaterial).filter(MasterProductMaterial.id == material_id).first()
    if not mat_obj:
        return False
    db.delete(mat_obj)
    db.commit()
    return True

def import_material_boms_from_excel(db: Session, file_contents: bytes):
    import io
    import openpyxl
    
    wb = openpyxl.load_workbook(filename=io.BytesIO(file_contents), data_only=True)
    total_imported = 0
    
    for sheet_name in wb.sheetnames:
        sheet = wb[sheet_name]
        clean_sname = sheet_name.strip()
        
        # Tìm xem sản phẩm có sẵn trong bảng master_products hay không (nếu có thì liên kết ID, TUYỆT ĐỐI KHÔNG TẠO MỚI SẢN PHẨM VÀO master_products)
        matched_prod = db.query(MasterProduct).filter(
            (MasterProduct.sku.ilike(f"%{clean_sname}%")) | 
            (MasterProduct.name.ilike(f"%{clean_sname}%"))
        ).first()
        
        prod_id = matched_prod.id if matched_prod else None
        prod_sku = matched_prod.sku if matched_prod else clean_sname
        prod_name = matched_prod.name if matched_prod else clean_sname
            
        current_group = "VẬT TƯ HÀNG TRẮNG"
        
        for row_idx, row in enumerate(sheet.iter_rows(values_only=True), start=1):
            if not row or not any(row):
                continue
                
            first_cell = str(row[0] or '').strip().upper()
            second_cell = str(row[1] or '').strip().upper() if len(row) > 1 else ''
            
            # Check Group Header (HÀNG TRẮNG / SAU SƠN)
            if "HÀNG TRẮNG" in first_cell or "HANG TRANG" in first_cell or "HÀNG TRẮNG" in second_cell:
                current_group = "VẬT TƯ HÀNG TRẮNG"
                continue
            elif "SAU SƠN" in first_cell or "SAU SON" in first_cell or "SAU SƠN" in second_cell:
                current_group = "VẬT TƯ SAU SƠN"
                continue
                
            # Skip table headers
            if any(k in first_cell or k in second_cell for k in ["STT", "TÊN VẬT TƯ", "MÃ VẬT TƯ", "TÊN CHI TIẾT", "MATERIAL"]):
                continue
                
            # Parse material columns
            stt_val = row[0] if len(row) > 0 else None
            mat_name = str(row[1] if len(row) > 1 and row[1] is not None else '').strip()
            if not mat_name:
                continue
                
            mat_code = str(row[2] if len(row) > 2 and row[2] is not None else '').strip()
            color = str(row[3] if len(row) > 3 and row[3] is not None else '').strip()
            
            quota_val = 1.0
            if len(row) > 4 and row[4] is not None:
                try:
                    quota_val = float(str(row[4]).replace(',', '.').strip())
                except ValueError:
                    quota_val = 1.0
                    
            unit_val = str(row[5] if len(row) > 5 and row[5] is not None else 'Cái').strip()
            supplier_val = str(row[6] if len(row) > 6 and row[6] is not None else '').strip()
            note_val = str(row[7] if len(row) > 7 and row[7] is not None else '').strip()
            
            if not mat_code:
                mat_code = f"VT-{mat_name[:6].upper().replace(' ', '')}"
                
            db.add(MasterProductMaterial(
                master_product_id=prod_id,
                product_sku=prod_sku,
                product_name=prod_name,
                stt=int(stt_val) if isinstance(stt_val, (int, float)) else (row_idx),
                group_type=current_group,
                material_code=mat_code,
                material_name=mat_name,
                color=color,
                quota=quota_val,
                unit=unit_val or 'Cái',
                supplier=supplier_val,
                note=note_val
            ))
            total_imported += 1

    db.commit()
    return {"status": "success", "imported_count": total_imported}

def get_all_product_materials(
    db: Session,
    product_id: Optional[int] = None,
    group_type: Optional[str] = None,
    supplier: Optional[str] = None,
    q: Optional[str] = None,
    skip: int = 0,
    limit: int = 50
):
    query = db.query(MasterProductMaterial, MasterProduct).join(
        MasterProduct, MasterProductMaterial.master_product_id == MasterProduct.id, isouter=True
    )

    if product_id:
        query = query.filter(MasterProductMaterial.master_product_id == product_id)
    if group_type:
        query = query.filter(MasterProductMaterial.group_type.ilike(f"%{group_type}%"))
    if supplier:
        query = query.filter(MasterProductMaterial.supplier.ilike(f"%{supplier}%"))
    if q and q.strip():
        search_str = f"%{q.strip()}%"
        query = query.filter(
            (MasterProductMaterial.material_code.ilike(search_str)) |
            (MasterProductMaterial.material_name.ilike(search_str)) |
            (MasterProductMaterial.supplier.ilike(search_str)) |
            (MasterProductMaterial.color.ilike(search_str)) |
            (MasterProductMaterial.product_sku.ilike(search_str)) |
            (MasterProductMaterial.product_name.ilike(search_str)) |
            (MasterProduct.sku.ilike(search_str)) |
            (MasterProduct.name.ilike(search_str))
        )

    total = query.count()
    results = query.order_by(MasterProductMaterial.group_type.asc(), MasterProductMaterial.stt.asc()).offset(skip).limit(limit).all()

    # Thống kê tổng quan KPI
    count_ht = db.query(MasterProductMaterial).filter(MasterProductMaterial.group_type.ilike("%TRẮNG%")).count()
    count_ss = db.query(MasterProductMaterial).filter(MasterProductMaterial.group_type.ilike("%SƠN%")).count()
    from sqlalchemy import func
    unique_prods = db.query(func.coalesce(MasterProductMaterial.product_sku, MasterProductMaterial.product_name)).filter(
        func.coalesce(MasterProductMaterial.product_sku, MasterProductMaterial.product_name) != None,
        func.coalesce(MasterProductMaterial.product_sku, MasterProductMaterial.product_name) != "---"
    ).distinct().count()

    items = []
    for mat, prod in results:
        m_dict = serialize_material_item(mat)
        sku_val = mat.product_sku or (prod.sku if prod else "---")
        name_val = mat.product_name or (prod.name if prod else "---")
        m_dict["product_sku"] = sku_val
        m_dict["product_name"] = name_val
        items.append(m_dict)

    return {
        "items": items, 
        "total": total,
        "summary": {
            "count_hang_trang": count_ht,
            "count_sau_son": count_ss,
            "unique_products": unique_prods
        }
    }

def is_hardware_material(mat) -> bool:
    """
    Hàm kiểm tra và lọc chính xác các dòng Phụ kiện / Vật tư tiêu hao (Hardware & Consumables),
    loại bỏ các chi tiết phôi gỗ thô (đã được quản lý ở Tab 1 - BOM Sản phẩm).
    """
    name = (mat.material_name or '').strip().lower()
    spec = (mat.color or '').strip().lower()
    wood_keywords = [
        'tấm hông', 'tấm trước', 'tấm sau', 'tấm đáy', 'thành hộc', 'tiền & hậu', 
        'thanh đỡ', 'thanh dọc', 'thanh ngang', 'bọ bắt', 'bọ góc', 'bọ chặn', 
        'bọ liên kết', 'ke góc đáy', 'chân trước', 'chân sau', 'khung tủ', 'mặt hộc'
    ]
    if any(k in spec for k in wood_keywords) or any(k in name for k in wood_keywords):
        return False
    if name == 'cao su' or name == 'gỗ cao su' or name.startswith('gỗ '):
        return False
    return True

def get_materials_by_product(db: Session, product_id: Optional[int] = None, sku: Optional[str] = None, name: Optional[str] = None):
    """
    Tự động truy vấn Định mức Vật tư theo product_id HOẶC theo sự trùng khớp thông minh của Mã SP (SKU) / Tên SP.
    Hỗ trợ đối soát kích thước / model (24S, 30S, 36S, 42S, 48S, 54S, 60D, 66D, 72D, ...) từ cả SKU lẫn Tên SP.
    Đảm bảo chỉ nạp đúng các phụ kiện/vật tư tiêu hao phục vụ cho cấu trúc BOM chi tiết của sản phẩm.
    """
    import re

    # 1. Ưu tiên lấy theo master_product_id nếu đã được liên kết
    if product_id:
        materials = db.query(MasterProductMaterial).filter(
            MasterProductMaterial.master_product_id == product_id
        ).order_by(MasterProductMaterial.group_type.asc(), MasterProductMaterial.stt.asc()).all()
        clean_linked = [m for m in materials if is_hardware_material(m)]
        if clean_linked:
            return [serialize_material_item(m) for m in clean_linked]

    # 2. Tìm kiếm liên kết thông minh theo mã định danh (SKU / Model token)
    distinct_skus = [r[0] for r in db.query(MasterProductMaterial.product_sku).filter(
        MasterProductMaterial.product_sku != None,
        MasterProductMaterial.product_sku != '---'
    ).distinct().all() if r[0]]

    raw_tokens = set()
    synthesized_tokens = set()
    
    for text in [sku or '', name or '']:
        words = re.split(r'[^A-Za-z0-9]', text)
        for w in words:
            if w:
                raw_tokens.add(w.upper())
                digits = re.findall(r'\d+', w)
                for d in digits:
                    synthesized_tokens.add(d)
                    synthesized_tokens.add(f"{d}S")
                    synthesized_tokens.add(f"{d}D")
                    synthesized_tokens.add(f"{d}C")
                    if d.startswith('0') and len(d) > 1:
                        d_no0 = str(int(d))
                        synthesized_tokens.add(d_no0)
                        synthesized_tokens.add(f"{d_no0}S")
                        synthesized_tokens.add(f"{d_no0}D")
                        synthesized_tokens.add(f"{d_no0}C")

    matched_sku = None

    # Priority 1: Khớp chính xác với RAW tokens (ví dụ: 66D, 60D, 48S, 72D, 36C-1)
    for d_sku in distinct_skus:
        if d_sku.upper() in raw_tokens:
            matched_sku = d_sku
            break

    # Priority 2: Khớp theo kích thước model & cấu hình S (Single) / D (Double) / L-R (Left-Right)
    if not matched_sku:
        wants_left_right = any(k in (sku or '').upper() or k in (name or '').upper() for k in ['-L', '-R', '36L', '36R', '42L', '42R', 'S-L', 'S-R', 'L/R'])
        wants_double = ('D' in (sku or '').upper() or 'D' in (name or '').upper()) and not ('S' in (sku or '').upper())

        candidates = []
        for d_sku in distinct_skus:
            m_up = d_sku.upper()
            m_digits = re.findall(r'\d+', m_up)
            if m_up in synthesized_tokens or (m_digits and m_digits[0] in synthesized_tokens):
                candidates.append(d_sku)

        if candidates:
            if wants_left_right:
                lr_cands = [c for c in candidates if 'L-R' in c.upper() or 'L/R' in c.upper()]
                if lr_cands:
                    matched_sku = lr_cands[0]
            if not matched_sku:
                if wants_double:
                    d_cands = [c for c in candidates if 'D' in c.upper()]
                    if d_cands:
                        matched_sku = d_cands[0]
                else:
                    s_cands = [c for c in candidates if 'S' in c.upper() and 'L-R' not in c.upper()]
                    if s_cands:
                        matched_sku = s_cands[0]
            if not matched_sku:
                matched_sku = candidates[0]

    if matched_sku:
        raw_mats = db.query(MasterProductMaterial).filter(
            MasterProductMaterial.product_sku == matched_sku
        ).all()
        clean_mats = [m for m in raw_mats if is_hardware_material(m)]

        # Khử trùng lặp theo nhóm và tên vật tư, ưu tiên định mức đầy đủ nhất
        dedup = {}
        for m in clean_mats:
            key = (m.group_type or '', (m.material_name or '').strip().lower())
            if key not in dedup or (m.quota or 0) > (dedup[key].quota or 0):
                dedup[key] = m

        result = list(dedup.values())
        # Sắp xếp Hàng trắng trước, Sau sơn sau
        result.sort(key=lambda x: (0 if 'TRẮNG' in (x.group_type or '').upper() else 1, x.stt or 999))
        
        # Đánh lại số thứ tự STT chuẩn
        serialized = []
        ht_idx = 1
        ss_idx = 1
        for m in result:
            m_dict = serialize_material_item(m)
            if 'TRẮNG' in (m.group_type or '').upper():
                m_dict['stt'] = ht_idx
                ht_idx += 1
            else:
                m_dict['stt'] = ss_idx
                ss_idx += 1
            serialized.append(m_dict)
            
        return serialized

    # 3. Fallback tìm kiếm ilike
    conds = []
    if sku and sku.strip():
        conds.append(MasterProductMaterial.product_sku.ilike(f"%{sku.strip()}%"))
        conds.append(MasterProductMaterial.product_name.ilike(f"%{sku.strip()}%"))
    if name and name.strip():
        conds.append(MasterProductMaterial.product_name.ilike(f"%{name.strip()}%"))
        conds.append(MasterProductMaterial.product_sku.ilike(f"%{name.strip()}%"))
        
    if conds:
        from sqlalchemy import or_
        materials = db.query(MasterProductMaterial).filter(
            or_(*conds)
        ).order_by(MasterProductMaterial.group_type.asc(), MasterProductMaterial.stt.asc()).all()
        clean_fallback = [m for m in materials if is_hardware_material(m)]
        return [serialize_material_item(m) for m in clean_fallback]
    
    return []




