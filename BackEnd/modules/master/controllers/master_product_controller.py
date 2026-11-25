from typing import Optional, List, Dict, Any, Tuple, Union
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
from config.settings import get_upload_dir

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
            
            upload_dir = get_upload_dir(subfolder)
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

def get_master_products(db: Session, skip: int = 0, limit: int = 50, q: str = None, tab: str = None, has_materials: bool = False):
    query = db.query(MasterProduct)
    if q and q.strip():
        search_filter = f"%{q.strip()}%"
        query = query.filter(
            (MasterProduct.sku.ilike(search_filter)) | 
            (MasterProduct.name.ilike(search_filter))
        )
    if tab == 'materials' or has_materials:
        # Chỉ lấy sản phẩm nào ĐÃ CÓ định mức vật tư trong bảng master_product_materials (Dùng subquery để không bị giới hạn 2100 parameters của SQL Server)
        mat_subquery = db.query(MasterProductMaterial.master_product_id).filter(
            MasterProductMaterial.master_product_id.isnot(None)
        ).distinct()
        query = query.filter(MasterProduct.id.in_(mat_subquery))

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
    if not master:
        return None
    # Tự động liên kết self-healing nếu vật tư có SKU trùng với Mã sản phẩm nhưng chưa gán master_product_id
    if not master.materials and master.sku:
        unlinked = db.query(MasterProductMaterial).filter(
            MasterProductMaterial.product_sku == master.sku.strip()
        ).all()
        if unlinked:
            for m in unlinked:
                m.master_product_id = master.id
            db.commit()
            db.refresh(master)
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

def is_invalid_spec(spec_str) -> bool:
    if not spec_str:
        return True
    s = str(spec_str).strip()
    if not s:
        return True
    if re.match(r'^[\s*_\-—–.,/\\#]+$', s):
        return True
    if re.match(r'^0(?:\s*[*xX×]\s*0)*$', s):
        return True
    if s.lower() in ["tiêu chuẩn", "quy cách tiêu chuẩn", "quy cách thành phẩm", "n/a", "na", "none", "null", "undefined", "—", "–"]:
        return True
    return False

def extract_spec_from_text(text: str) -> str:
    if not text:
        return ""
    text_str = str(text).strip()
    m3d = re.search(r'(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)', text_str)
    if m3d and not is_invalid_spec(m3d.group(1)):
        return m3d.group(1).replace(' ', '')
    m2d = re.search(r'(\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm|\s*cm)?)', text_str)
    if m2d and not is_invalid_spec(m2d.group(1)):
        return m2d.group(1).replace(' ', '')
    m_bolt = re.search(r'([MØOD]?\d+(?:[.,]\d+)?\s*[*xX×]\s*\d+(?:[.,]\d+)?(?:\s*mm)?)', text_str, re.IGNORECASE)
    if m_bolt and not is_invalid_spec(m_bolt.group(1)):
        return m_bolt.group(1).replace(' ', '')
    m_hw = re.search(r'(\b\d{4,5}\s*[-–—*xX×]\s*\d{3,4}(?:mm|cm)?\b)', text_str)
    if m_hw and not is_invalid_spec(m_hw.group(1)):
        return m_hw.group(1).replace(' ', '')
    return ""

def format_dim(num):
    if num is None:
        return ""
    try:
        val = float(num)
        if val <= 0:
            return ""
        return str(int(val)) if val.is_integer() else str(val)
    except Exception:
        return ""

def resolve_clean_spec(raw_spec, name="", sku="", length=0, width=0, height=0, valid_specs_by_name=None, valid_specs_by_sku=None, fallback_spec=""):
    if raw_spec and not is_invalid_spec(raw_spec):
        return str(raw_spec).strip()
    
    clean_n = " ".join(str(name or "").strip().lower().split())
    clean_s = str(sku or "").strip().lower()

    if valid_specs_by_name and clean_n in valid_specs_by_name and not is_invalid_spec(valid_specs_by_name[clean_n]):
        return valid_specs_by_name[clean_n]
    if valid_specs_by_sku and clean_s in valid_specs_by_sku and not is_invalid_spec(valid_specs_by_sku[clean_s]):
        return valid_specs_by_sku[clean_s]

    h_s = format_dim(height)
    w_s = format_dim(width)
    l_s = format_dim(length)
    if h_s and w_s and l_s:
        return f"{h_s}*{w_s}*{l_s}"
    if w_s and l_s:
        return f"{w_s}*{l_s}"

    spec_from_name = extract_spec_from_text(name)
    if spec_from_name and not is_invalid_spec(spec_from_name):
        return spec_from_name

    spec_from_sku = extract_spec_from_text(sku)
    if spec_from_sku and not is_invalid_spec(spec_from_sku):
        return spec_from_sku

    if fallback_spec and not is_invalid_spec(fallback_spec):
        return str(fallback_spec).strip()

    return "Tiêu chuẩn"

def produce_from_bom(db: Session, master_product_id: int, quantity_to_produce: float, order_id: int = None):
    master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    if not master: return None

    p_spec = resolve_clean_spec(
        master.specification,
        name=master.name,
        sku=master.sku,
        length=master.length,
        width=master.width,
        height=master.height
    )

    db_product = Product(
        sku=master.sku, name=master.name, order_id=order_id,
        category_id=master.category_id, price=master.price,
        material=master.material, color=master.color,
        length=master.length, width=master.width, height=master.height,
        weight=master.weight, status="Active",
        quantity=quantity_to_produce * (master.quantity or 1.0),
        specification=p_spec,
        description=master.description
    )
    db.add(db_product)
    db.flush() 

    # Build valid specs maps across all master BOM items
    valid_specs_by_name = {}
    valid_specs_by_sku = {}
    for mb in getattr(master, 'master_bom_details', []):
        mb_sp = (mb.specification or "").strip()
        if mb_sp and not is_invalid_spec(mb_sp):
            if mb.name:
                c_n = " ".join(mb.name.strip().lower().split())
                if c_n and c_n not in valid_specs_by_name:
                    valid_specs_by_name[c_n] = mb_sp
            if mb.sku:
                c_s = mb.sku.strip().lower()
                if c_s and c_s not in valid_specs_by_sku:
                    valid_specs_by_sku[c_s] = mb_sp

    def clone_bom_detail(master_bom, parent_id=None):
        resolved_spec = resolve_clean_spec(
            master_bom.specification,
            name=master_bom.name,
            sku=master_bom.sku,
            length=master_bom.length,
            width=master_bom.width,
            height=master_bom.height,
            valid_specs_by_name=valid_specs_by_name,
            valid_specs_by_sku=valid_specs_by_sku,
            fallback_spec=p_spec
        )
        db_bom = BOMDetail(
            sku=master_bom.sku, name=master_bom.name, product_id=db_product.id,
            parent_id=parent_id, length=master_bom.length, width=master_bom.width,
            height=master_bom.height, unit=master_bom.unit,
            specification=resolved_spec, material=master_bom.material,
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
    s = str(spec_str).replace(',', '.').replace('×', '*').replace('X', '*').replace('x', '*')
    match = re.search(r"(\d+(?:\.\d+)?)\s*[*]\s*(\d+(?:\.\d+)?)(?:\s*[*]\s*(\d+(?:\.\d+)?))?", s)
    if match:
        try:
            d1 = float(match.group(1))
            d2 = float(match.group(2))
            d3 = float(match.group(3)) if match.group(3) is not None else 0.0
            if d3 > 0:
                return d3, d2, d1
            elif d2 > 0:
                return d2, d1, 0.0
        except Exception:
            pass
            
    # Fallback to general numbers find
    dims = re.findall(r"[-+]?\d*\.\d+|\d+", s)
    try:
        if len(dims) >= 3:
            return float(dims[2]), float(dims[1]), float(dims[0])
        elif len(dims) == 2:
            return float(dims[1]), float(dims[0]), 0.0
        elif len(dims) == 1:
            return float(dims[0]), 0.0, 0.0
        return 0.0, 0.0, 0.0
    except:
        return 0.0, 0.0, 0.0

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

            c_root_sku = get_col_pos(['mã mặt hàng gốc', 'mã sp gốc', 'mã thành phẩm gốc'], None)
            c_parent_sku = get_col_pos(['mã mặt hàng', 'mã sp', 'mã sản phẩm', 'mã bán thành phẩm'], 0)
            c_child_sku = get_col_pos(['mã chi tiết', 'mã linh kiện', 'mã nvl'], 4)
            c_is_fin = get_col_pos(['là thành phẩm c/k', 'là thành phẩm'], 24)
            c_color = get_col_pos(['màu sắc', 'màu', 'mã màu'], 13)
            c_brand = get_col_pos(['năng suất mục tiêu', 'danh mục mặt hàng', 'thương hiệu'], 27)
            
            prods = []
            colors = set()
            brands = set()
            data_rows = rows[h_idx + 1:]
            
            for row in data_rows:
                if not row or len(row) <= max(c_parent_sku or 0, c_child_sku or 0):
                    continue
                r_sku = clean_val(row[c_root_sku]) if (c_root_sku is not None and c_root_sku < len(row)) else None
                p_sku = clean_val(row[c_parent_sku]) if (c_parent_sku is not None and c_parent_sku < len(row)) else None
                c_sku = clean_val(row[c_child_sku]) if (c_child_sku is not None and c_child_sku < len(row)) else None
                if not r_sku and not p_sku and not c_sku:
                    continue
                
                is_fin = to_bool(row[c_is_fin]) if (c_is_fin is not None and c_is_fin < len(row)) else False
                col_val = clean_val(row[c_color]) if (c_color is not None and c_color < len(row)) else None
                brand_val = clean_val(row[c_brand]) if (c_brand is not None and c_brand < len(row)) else None
                
                if col_val: colors.add(col_val)
                if brand_val: brands.add(brand_val)
                
                eff_root = r_sku or p_sku
                if eff_root:
                    eff_root_clean = clean_and_standardize_sku(eff_root)
                    if eff_root_clean and eff_root_clean not in prods:
                        prods.append(eff_root_clean)
                        
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


def _process_bom_workbook(db: Session, wb, filename: str = "BOM.xlsx", selected_sheets: Optional[Any] = None, file_index: int = 1, total_files: int = 1, category_cache: Optional[dict] = None):
    """
    Hàm nội bộ xử lý bóc tách 1 workbook Excel BOM với thuật toán Two-pass Tree Assembly:
    - Pass 1: Nhận diện tất cả các linh kiện con (Child Leaf & Components).
    - Pass 2: Khởi tạo/cập nhật cụm bán thành phẩm (Sub-assemblies) với đúng Quy cách và ĐVT của chính cụm đó.
    - Chuẩn hóa kích thước 3D length/width/height và đồng bộ auxiliary tables.
    """
    import json, re
    from modules.master.models.master_category import MasterCategory
    from modules.master.models.master_product_detail import MasterProductDetail
    from modules.master.models.paint_color_sample import PaintColorSample

    if category_cache is None:
        category_cache = {}

    def clean_val(val):
        if val is None or pd.isna(val): return None
        s = str(val).strip()
        if not s or s.lower() in ('nan', 'none', 'null', 'undefined'): return None
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
        yield json.dumps({
            "status": "warning", 
            "file_index": file_index,
            "total_files": total_files,
            "file_name": filename,
            "message": f"[{filename}] Không tìm thấy sheet nào có dữ liệu hợp lệ."
        }) + "\n"
        return

    total_sheets = len(valid_sheetnames)
    total_prods_imported = 0
    total_boms_imported = 0

    for sheet_idx, sheet_name in enumerate(valid_sheetnames):
        ws = wb[sheet_name]
        all_rows = list(ws.iter_rows(values_only=True))
        if not all_rows or len(all_rows) < 2:
            continue

        # 1. Tìm dòng tiêu đề (Header row)
        h_row_idx = 0
        for idx, r_vals in enumerate(all_rows[:15]):
            row_str = ' '.join([str(c or '').lower() for c in r_vals[:20]])
            if any(k in row_str for k in ['mã chi tiết', 'tên chi tiết', 'mã mặt hàng', 'mã sản phẩm']):
                h_row_idx = idx
                break

        headers = [str(c or '').replace('\n', ' ').strip().lower() for c in all_rows[h_row_idx]]

        def get_c_idx(names, default=None):
            for name in names:
                for i, h in enumerate(headers):
                    if name == h: return i
            for name in names:
                for i, h in enumerate(headers):
                    if name in h: return i
            return default

        c_root_sku = get_c_idx(['mã mặt hàng gốc', 'mã sp gốc', 'mã thành phẩm gốc'], None)
        c_root_name = get_c_idx(['tên mặt hàng gốc', 'tên sp gốc', 'tên thành phẩm gốc'], None)
        c_parent_sku = get_c_idx(['mã mặt hàng', 'mã sp', 'mã sản phẩm', 'mã bán thành phẩm'], 0)
        c_parent_name = get_c_idx(['tên mặt hàng', 'tên sp', 'tên sản phẩm'], 1)
        c_parent_unit = get_c_idx(['đvt'], None)
        c_parent_spec = get_c_idx(['quy cách'], None)
        
        c_stt = get_c_idx(['stt'], 2)
        c_material = get_c_idx(['nguyên liệu', 'vật liệu', 'chất liệu'], 3)
        c_child_sku = get_c_idx(['mã chi tiết', 'mã linh kiện', 'mã nvl'], 4)
        c_child_name = get_c_idx(['tên chi tiết', 'tên linh kiện', 'tên nvl'], 5)
        c_child_unit = get_c_idx(['đvt chi tiết', 'đơn vị'], 6)
        c_child_spec = get_c_idx(['quy cách chi tiết'], None)
        
        c_h = get_c_idx(['dày', 'chiều dày', 'dày (mm)'], None)
        c_w = get_c_idx(['rộng', 'chiều rộng', 'rộng (mm)'], None)
        c_l = get_c_idx(['dài', 'chiều dài', 'dài (mm)'], None)
        c_color = get_c_idx(['màu sắc', 'màu', 'mã màu'], None)
        c_qty = get_c_idx(['số lượng', 'sl/ part', 'sl/ set', 'định mức', 'tổng sl'], 11)
        c_qty_part = get_c_idx(['sl/ part'], None)
        c_qty_set = get_c_idx(['sl/ set'], None)
        c_desc = get_c_idx(['mô tả', 'ghi chú'], None)
        c_waste = get_c_idx(['tỷ lệ hao hụt', 'hao hụt', 'bù hao'], None)
        c_is_fin = get_c_idx(['là thành phẩm c/k', 'là thành phẩm'], None)
        c_is_raw = get_c_idx(['là nguyên liệu', 'là nvl c/k', 'là nvl'], None)
        c_exclude = get_c_idx(['không đưa vào qtsx', 'không đưa vào sx'], None)
        c_brand = get_c_idx(['năng suất mục tiêu', 'thương hiệu', 'dòng hàng'], None)
        c_in_stage = get_c_idx(['công đoạn vào', 'cộng đoạn vào', 'khâu vào', 'input stage'], None)
        c_out_stage = get_c_idx(['công đoạn ra', 'khâu ra', 'output stage'], None)
        c_cat = get_c_idx(['danh mục mặt hàng', 'danh mục', 'ngành hàng'], None)

        def col_val(row, c_idx):
            if c_idx is not None and 0 <= c_idx < len(row):
                return clean_val(row[c_idx])
            return None

        # 2. Đọc toàn bộ dòng trong Sheet và gom nhóm theo Thành phẩm gốc
        products_dict = {}

        for r_idx, row in enumerate(all_rows[h_row_idx + 1:], start=h_row_idx + 2):
            if not row: continue

            r_sku = col_val(row, c_root_sku)
            r_name = col_val(row, c_root_name)
            p_sku = col_val(row, c_parent_sku)
            p_name = col_val(row, c_parent_name)
            p_unit = col_val(row, c_parent_unit)
            p_spec = col_val(row, c_parent_spec)

            c_sku = col_val(row, c_child_sku)
            c_name = col_val(row, c_child_name)
            c_unit = col_val(row, c_child_unit)
            c_spec = col_val(row, c_child_spec)

            if not c_sku and not p_sku and not r_sku:
                continue

            eff_root_sku = clean_and_standardize_sku(r_sku if r_sku else p_sku)
            eff_root_name = clean_and_standardize_name(r_name if r_name else (p_name or eff_root_sku))
            p_sku_std = clean_and_standardize_sku(p_sku if p_sku else eff_root_sku)
            p_name_std = clean_and_standardize_name(p_name or p_sku_std)
            c_sku_std = clean_and_standardize_sku(c_sku if c_sku else p_sku_std)
            c_name_std = clean_and_standardize_name(c_name or c_sku_std)

            is_fin = to_bool(col_val(row, c_is_fin))
            
            # Dimensions
            h_val = to_float(col_val(row, c_h))
            w_val = to_float(col_val(row, c_w))
            l_val = to_float(col_val(row, c_l))
            if not (h_val or w_val or l_val) and c_spec:
                pl, pw, ph = parse_dimensions(c_spec)
                l_val, w_val, h_val = pl, pw, ph

            color = col_val(row, c_color)
            material = col_val(row, c_material)
            
            qty_val = to_float(col_val(row, c_qty), 1.0)
            if c_qty_part and col_val(row, c_qty_part) is not None:
                qty_val = to_float(col_val(row, c_qty_part), qty_val)
            qty_set = to_float(col_val(row, c_qty_set), qty_val) if c_qty_set else qty_val
            
            waste = to_float(col_val(row, c_waste), 1.0) if c_waste else 1.0
            is_raw = to_bool(col_val(row, c_is_raw))
            exclude = to_bool(col_val(row, c_exclude))
            raw_in_val = str(col_val(row, c_in_stage) or '')
            raw_out_val = str(col_val(row, c_out_stage) or '')
            detected_row_fac = None
            for f in ['NM1', 'NM2', 'NM3', 'Vanity 1', 'Vanity 2', 'Furniture']:
                if f in raw_in_val or f in raw_out_val:
                    if '1' in f or 'NM1' in f: detected_row_fac = 'NM1'
                    elif '2' in f or 'NM2' in f: detected_row_fac = 'NM2'
                    elif '3' in f or 'NM3' in f or 'Furniture' in f: detected_row_fac = 'NM3'
                    break

            in_stg = clean_stage_name(col_val(row, c_in_stage))
            out_stg = clean_stage_name(col_val(row, c_out_stage))
            note = col_val(row, c_desc)
            brand = col_val(row, c_brand) or ('FOL' if 'FOL' in eff_root_sku.upper() else 'ATLAS')
            cat = col_val(row, c_cat) or brand
            stt_val = col_val(row, c_stt)

            rec = {
                'row': r_idx,
                'root_sku': eff_root_sku,
                'root_name': eff_root_name,
                'parent_sku': p_sku_std,
                'parent_name': p_name_std,
                'parent_unit': p_unit,
                'parent_spec': p_spec,
                'child_sku': c_sku_std,
                'child_name': c_name_std,
                'child_unit': c_unit or 'Cái',
                'child_spec': c_spec,
                'stt': stt_val,
                'material': material,
                'length': l_val,
                'width': w_val,
                'height': h_val,
                'color': color,
                'qty': qty_val,
                'qty_set': qty_set,
                'waste': waste,
                'is_fin': is_fin,
                'is_raw': is_raw,
                'exclude': exclude,
                'in_stage': in_stg,
                'out_stage': out_stg,
                'brand': brand,
                'category': cat,
                'note': note
            }

            if eff_root_sku not in products_dict:
                # ĐVT và Quy cách của Root Product lấy từ dòng Root hoặc parent
                root_u = p_unit if (p_sku_std == eff_root_sku and p_unit) else 'Bộ'
                root_sp = p_spec if (p_sku_std == eff_root_sku and p_spec) else ''
                pl, pw, ph = parse_dimensions(root_sp) if root_sp else (0.0, 0.0, 0.0)
                products_dict[eff_root_sku] = {
                    'sku': eff_root_sku,
                    'name': eff_root_name,
                    'brand': brand,
                    'category': cat,
                    'color': color or parse_color(eff_root_sku, eff_root_name),
                    'factory': detected_row_fac,
                    'spec': root_sp,
                    'length': pl,
                    'width': pw,
                    'height': ph,
                    'unit': root_u,
                    'rows': []
                }
            elif detected_row_fac and not products_dict[eff_root_sku].get('factory'):
                products_dict[eff_root_sku]['factory'] = detected_row_fac

            products_dict[eff_root_sku]['rows'].append(rec)

            # Cập nhật root name/spec/unit từ các dòng tiếp theo nếu có data tốt hơn
            rd = products_dict[eff_root_sku]
            # Nếu dòng có parent == root và có thông tin tốt hơn (quy cách, tên dài hơn)
            if p_sku_std == eff_root_sku:
                if p_spec and not rd['spec']:
                    rd['spec'] = p_spec
                    pl2, pw2, ph2 = parse_dimensions(p_spec)
                    if pl2 or pw2 or ph2:
                        rd['length'], rd['width'], rd['height'] = pl2, pw2, ph2
                if p_unit and rd['unit'] == 'Bộ':
                    rd['unit'] = p_unit
            # Cập nhật tên nếu r_name (c2) dài hơn tên hiện tại
            if r_name and len(r_name) > len(rd.get('name', '')):
                rd['name'] = clean_and_standardize_name(r_name)

        sheet_prod_count = len(products_dict)
        base_percent = int(((file_index - 1) / max(1, total_files)) * 100)
        file_slice = int(100 / max(1, total_files))

        yield json.dumps({
            "status": "processing",
            "file_index": file_index,
            "total_files": total_files,
            "file_name": filename,
            "sheet": sheet_name,
            "sheet_index": sheet_idx + 1,
            "total_sheets": total_sheets,
            "processed": 0,
            "total": sheet_prod_count,
            "percent": min(99, base_percent + 2),
            "message": f"[{filename}] Đang lưu {sheet_prod_count} SP từ Sheet '{sheet_name}'..."
        }) + "\n"

        # 3. Lưu từng sản phẩm Root và Cây BOM phân cấp theo Two-pass Tree Assembly
        for root_idx, (root_sku, prod_info) in enumerate(products_dict.items()):
            cat_name = prod_info.get('category') or prod_info.get('brand') or 'ATLAS'
            if cat_name not in category_cache:
                cat_obj = db.query(MasterCategory).filter(MasterCategory.name == cat_name).first()
                if not cat_obj:
                    cat_obj = MasterCategory(name=cat_name, description=f"Dòng sản phẩm {cat_name} cao cấp", status=1)
                    db.add(cat_obj)
                    db.flush()
                category_cache[cat_name] = cat_obj.id

            cat_id = category_cache[cat_name]
            p_color = prod_info.get('color') or parse_color(root_sku, prod_info['name']) or 'BRO'

            p_factory = prod_info.get('factory')
            p_obj = db.query(MasterProduct).filter(MasterProduct.sku == root_sku).first()
            if not p_obj:
                p_obj = MasterProduct(
                    sku=root_sku,
                    name=prod_info['name'],
                    category_id=cat_id,
                    brand_name=prod_info['brand'],
                    color=p_color,
                    specification=prod_info.get('spec') or '',
                    length=prod_info.get('length') or 0.0,
                    width=prod_info.get('width') or 0.0,
                    height=prod_info.get('height') or 0.0,
                    unit=prod_info.get('unit') or 'Bộ',
                    description=p_factory or 'NM1',
                    status='Active'
                )
                db.add(p_obj)
                db.flush()
            else:
                p_obj.name = prod_info['name']
                p_obj.category_id = cat_id
                p_obj.brand_name = prod_info['brand']
                p_obj.color = p_color or p_obj.color
                p_obj.specification = prod_info.get('spec') or ''
                p_obj.length = prod_info.get('length') or 0.0
                p_obj.width = prod_info.get('width') or 0.0
                p_obj.height = prod_info.get('height') or 0.0
                p_obj.unit = prod_info.get('unit') or 'Bộ'
                if p_factory:
                    p_obj.description = p_factory
                db.flush()

            # Xóa sạch BOM cũ của sản phẩm này để nạp mới chuẩn xác
            db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == p_obj.id).update({MasterBOMDetail.parent_id: None}, synchronize_session=False)
            db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == p_obj.id).delete(synchronize_session=False)

            # 4. Xây dựng cây BOM phân cấp — Thuật toán Assembly/Leaf Separation
            #    - Assembly nodes (cụm bán thành phẩm .1, .1.1, ...): unique theo SKU
            #    - Leaf nodes (nguyên liệu CSU, ROA, HMR, ...): mỗi dòng Excel = 1 bản ghi riêng
            prod_rows = prod_info['rows']

            # Bước 4a: Xác định SKU nào là assembly (xuất hiện ở cột parent_sku của dòng khác)
            assembly_skus = set()
            for r in prod_rows:
                p_sku = r['parent_sku']
                if p_sku and p_sku != root_sku:
                    assembly_skus.add(p_sku)

            # Bước 4b: Thu thập nodes — assembly unique, leaf per-row
            assembly_nodes = {}   # sku -> node dict (unique cho assembly)
            leaf_nodes = []       # list of node dicts (mỗi dòng 1 entry)

            for row_idx, r in enumerate(prod_rows):
                c_sku = r['child_sku']
                p_sku = r['parent_sku']
                if not c_sku or c_sku == root_sku:
                    continue

                c_spec = r['child_spec'] or ''
                c_unit = r['child_unit'] or 'Cái'
                c_l, c_w, c_h = r['length'], r['width'], r['height']
                if not (c_l or c_w or c_h) and c_spec:
                    c_l, c_w, c_h = parse_dimensions(c_spec)

                node = {
                    'sku': c_sku,
                    'parent_sku': p_sku if p_sku != root_sku else None,
                    'name': r['child_name'] or c_sku,
                    'unit': c_unit,
                    'spec': c_spec,
                    'length': c_l,
                    'width': c_w,
                    'height': c_h,
                    'color': r['color'] or p_color,
                    'material': r['material'] or '',
                    'quantity': r['qty'],
                    'waste_ratio': r['waste'],
                    'is_raw_material': r['is_raw'],
                    'exclude_production': r['exclude'],
                    'input_stage': r['in_stage'],
                    'output_stage': r['out_stage'],
                    'description': r['note'] or '',
                    'is_assembly': c_sku in assembly_skus
                }

                if c_sku in assembly_skus:
                    # Assembly node: chỉ lưu 1 lần, bổ sung thông tin thiếu
                    if c_sku not in assembly_nodes:
                        assembly_nodes[c_sku] = node
                    else:
                        existing = assembly_nodes[c_sku]
                        if not existing['spec'] and c_spec: existing['spec'] = c_spec
                        if (not existing['length'] and not existing['width'] and not existing['height']) and (c_l or c_w or c_h):
                            existing['length'], existing['width'], existing['height'] = c_l, c_w, c_h
                        if not existing['material'] and r['material']: existing['material'] = r['material']
                        if not existing['input_stage'] and r['in_stage']: existing['input_stage'] = r['in_stage']
                        if not existing['output_stage'] and r['out_stage']: existing['output_stage'] = r['out_stage']
                else:
                    # Leaf node (nguyên liệu thô): mỗi dòng tạo 1 bản ghi riêng
                    leaf_nodes.append(node)

            # Bước 4c: Cập nhật assembly từ parent columns (ĐVT, Quy cách đúng của cụm cha)
            for r in prod_rows:
                p_sku = r['parent_sku']
                if p_sku and p_sku != root_sku:
                    p_sp = r['parent_spec']
                    p_un = r['parent_unit']
                    p_nm = r['parent_name']
                    pl, pw, ph = parse_dimensions(p_sp) if p_sp else (0.0, 0.0, 0.0)

                    if p_sku in assembly_nodes:
                        an = assembly_nodes[p_sku]
                        an['is_assembly'] = True
                        if p_nm and (not an['name'] or an['name'] == p_sku):
                            an['name'] = p_nm
                        if p_un:
                            an['unit'] = p_un
                        if p_sp:
                            an['spec'] = p_sp
                            if pl or pw or ph:
                                an['length'], an['width'], an['height'] = pl, pw, ph
                    else:
                        # Assembly chưa từng xuất hiện làm child — tạo mới
                        p_parts = p_sku.rsplit('.', 1)
                        direct_p = p_parts[0] if (len(p_parts) == 2 and p_parts[0] != root_sku) else None
                        new_node = {
                            'sku': p_sku,
                            'name': p_nm or p_sku,
                            'parent_sku': direct_p,
                            'unit': p_un or 'Bộ',
                            'spec': p_sp or '',
                            'length': pl,
                            'width': pw,
                            'height': ph,
                            'color': p_color,
                            'material': r.get('material') or 'Gỗ / MDF',
                            'quantity': 1.0,
                            'waste_ratio': 1.0,
                            'is_raw_material': False,
                            'exclude_production': False,
                            'input_stage': r['in_stage'],
                            'output_stage': r['out_stage'],
                            'description': r['note'] or '',
                            'is_assembly': True
                        }
                        assembly_nodes[p_sku] = new_node

            # Bước 4d: Sắp xếp assemblies theo depth (cha trước con), rồi lưu vào DB
            sorted_assembly_skus = sorted(assembly_nodes.keys(), key=lambda s: (len(s.split('.')), s))
            sku_to_db_id = {}

            # Lưu assemblies trước (cần parent_id resolved)
            for a_sku in sorted_assembly_skus:
                node = assembly_nodes[a_sku]
                parent_db_id = None
                p_sku = node['parent_sku']
                if p_sku and p_sku in sku_to_db_id:
                    parent_db_id = sku_to_db_id[p_sku]
                elif '.' in a_sku:
                    prefix_p = a_sku.rsplit('.', 1)[0]
                    if prefix_p in sku_to_db_id:
                        parent_db_id = sku_to_db_id[prefix_p]

                resolved_spec = node['spec']
                if not resolved_spec or is_invalid_spec(resolved_spec):
                    resolved_spec = resolve_clean_spec(
                        "",
                        name=node['name'],
                        sku=node['sku'],
                        length=node['length'],
                        width=node['width'],
                        height=node['height']
                    )

                bom_item = MasterBOMDetail(
                    master_product_id=p_obj.id,
                    parent_id=parent_db_id,
                    sku=node['sku'],
                    name=clean_and_standardize_name(node['name']),
                    unit=node['unit'],
                    length=node['length'],
                    width=node['width'],
                    height=node['height'],
                    color=node['color'],
                    material=node['material'],
                    quantity=node['quantity'],
                    specification=resolved_spec,
                    waste_ratio=node['waste_ratio'],
                    is_raw_material=node['is_raw_material'],
                    exclude_production=node['exclude_production'],
                    input_stage=node['input_stage'],
                    output_stage=node['output_stage'],
                    description=node['description'],
                    status='Active'
                )
                db.add(bom_item)
                db.flush()
                sku_to_db_id[a_sku] = bom_item.id
                total_boms_imported += 1

            # Lưu leaf nodes (raw materials) — mỗi dòng 1 bản ghi, parent resolved từ sku_to_db_id
            for node in leaf_nodes:
                parent_db_id = None
                p_sku = node['parent_sku']
                if p_sku and p_sku in sku_to_db_id:
                    parent_db_id = sku_to_db_id[p_sku]
                elif '.' in node['sku']:
                    prefix_p = node['sku'].rsplit('.', 1)[0]
                    if prefix_p in sku_to_db_id:
                        parent_db_id = sku_to_db_id[prefix_p]

                resolved_spec = node['spec']
                if not resolved_spec or is_invalid_spec(resolved_spec):
                    resolved_spec = resolve_clean_spec(
                        "",
                        name=node['name'],
                        sku=node['sku'],
                        length=node['length'],
                        width=node['width'],
                        height=node['height']
                    )

                bom_item = MasterBOMDetail(
                    master_product_id=p_obj.id,
                    parent_id=parent_db_id,
                    sku=node['sku'],
                    name=clean_and_standardize_name(node['name']),
                    unit=node['unit'],
                    length=node['length'],
                    width=node['width'],
                    height=node['height'],
                    color=node['color'],
                    material=node['material'],
                    quantity=node['quantity'],
                    specification=resolved_spec,
                    waste_ratio=node['waste_ratio'],
                    is_raw_material=node['is_raw_material'],
                    exclude_production=node['exclude_production'],
                    input_stage=node['input_stage'],
                    output_stage=node['output_stage'],
                    description=node['description'],
                    status='Active'
                )
                db.add(bom_item)
                db.flush()
                total_boms_imported += 1

            # Bước 4e: Suy kích thước root product từ child assembly level 1
            if not (p_obj.length or p_obj.width or p_obj.height):
                # Tìm assembly con trực tiếp (level 1) có kích thước lớn nhất
                for a_sku in sorted_assembly_skus:
                    an = assembly_nodes[a_sku]
                    # Assembly cấp 1: parent_sku is None (con trực tiếp của root)
                    if an.get('parent_sku') is None and (an['length'] or an['width'] or an['height']):
                        p_obj.length = an['length']
                        p_obj.width = an['width']
                        p_obj.height = an['height']
                        if an['spec']:
                            p_obj.specification = an['spec']
                        break
                db.flush()

            # 5. Đồng bộ Mẫu màu sơn (paint_color_samples)
            if p_color:
                pcs = db.query(PaintColorSample).filter(
                    PaintColorSample.master_product_id == p_obj.id,
                    PaintColorSample.color_code == p_color
                ).first()
                if not pcs:
                    db.add(PaintColorSample(
                        master_product_id=p_obj.id,
                        color_code=p_color,
                        color_name=f"Màu sơn {p_color}",
                        supplier="G7 Paint Standards"
                    ))

            # 6. Đồng bộ Chi tiết KT (master_product_details)
            db.query(MasterProductDetail).filter(MasterProductDetail.master_product_id == p_obj.id).delete(synchronize_session=False)
            for r in prod_rows:
                if r['child_sku'] != root_sku and (r['in_stage'] or r['out_stage']):
                    db.add(MasterProductDetail(
                        master_product_id=p_obj.id,
                        name=r['child_name'],
                        quantity=r['qty_set'] or r['qty'],
                        unit=r['child_unit'] or 'Cái',
                        input_stage=r['in_stage'],
                        output_stage=r['out_stage'],
                        parent_name=r['parent_name'],
                        material=r['material']
                    ))

            total_prods_imported += 1

            # Báo cáo tiến trình mỗi 15 sản phẩm hoặc sản phẩm cuối
            if (root_idx + 1) % 15 == 0 or (root_idx + 1) == sheet_prod_count:
                cur_prog = base_percent + int(((root_idx + 1) / max(1, sheet_prod_count)) * file_slice * 0.95)
                yield json.dumps({
                    "status": "processing",
                    "file_index": file_index,
                    "total_files": total_files,
                    "file_name": filename,
                    "sheet": sheet_name,
                    "sheet_index": sheet_idx + 1,
                    "total_sheets": total_sheets,
                    "processed": root_idx + 1,
                    "total": sheet_prod_count,
                    "percent": min(98, cur_prog),
                    "message": f"[{filename}] Đang lưu {root_idx + 1}/{sheet_prod_count} SP ({root_sku})..."
                }) + "\n"

            if (root_idx + 1) % 50 == 0:
                db.commit()

        db.commit()


def import_master_products_from_excel(db: Session, file_content: bytes, selected_sheets: Optional[Any] = None):
    """
    [STREAMING IMPORT] Nhập dữ liệu 1 file Excel BOM với thuật toán chuẩn hóa Two-pass Tree Assembly.
    """
    import io, openpyxl, json
    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_content), read_only=True, data_only=True)
        yield from _process_bom_workbook(db, wb, filename="Excel BOM", selected_sheets=selected_sheets, file_index=1, total_files=1)

        # Đồng bộ toàn bộ dữ liệu phụ trợ
        yield json.dumps({
            "status": "processing",
            "percent": 98,
            "message": "Đang đồng bộ định mức vật tư và hoàn tất..."
        }) + "\n"

        try:
            sync_bom_data_to_auxiliary_tables(db)
        except Exception as sync_err:
            print(f"=== [SYNC AUX ERROR] {sync_err}")

        yield json.dumps({
            "status": "completed",
            "percent": 100,
            "message": "Đã nhập thành công toàn bộ dữ liệu BOM vào hệ thống!"
        }) + "\n"

    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"=== [IMPORT ERROR] {exc}")
        yield json.dumps({"status": "error", "message": str(exc)}) + "\n"


def import_master_products_from_excel_batch(db: Session, files_list: List[tuple]):
    """
    [BATCH STREAMING IMPORT] Nhập dữ liệu danh sách nhiều file Excel BOM [(filename, bytes), ...]:
    - Lần lượt nạp từng file và streaming tiến trình theo thời gian thực.
    - Cuối cùng đồng bộ auxiliary tables 1 lần duy nhất để tối ưu tốc độ.
    """
    import io, openpyxl, json
    total_files = len(files_list)
    if total_files == 0:
        yield json.dumps({"status": "error", "message": "Không có file nào được cung cấp."}) + "\n"
        return

    category_cache = {}

    yield json.dumps({
        "status": "reading",
        "file_index": 0,
        "total_files": total_files,
        "percent": 0,
        "message": f"Bắt đầu nạp {total_files} file BOM vào hệ thống..."
    }) + "\n"

    try:
        for f_idx, (fname, fbytes) in enumerate(files_list, start=1):
            try:
                wb = openpyxl.load_workbook(io.BytesIO(fbytes), read_only=True, data_only=True)
                yield from _process_bom_workbook(
                    db, wb, 
                    filename=fname, 
                    file_index=f_idx, 
                    total_files=total_files, 
                    category_cache=category_cache
                )
            except Exception as f_err:
                print(f"=== [BATCH FILE ERROR {fname}] {f_err}")
                yield json.dumps({
                    "status": "warning",
                    "file_index": f_idx,
                    "total_files": total_files,
                    "file_name": fname,
                    "message": f"Lỗi xử lý file {fname}: {str(f_err)}"
                }) + "\n"

        # Đồng bộ toàn bộ dữ liệu phụ trợ
        yield json.dumps({
            "status": "processing",
            "percent": 98,
            "message": "Đang đồng bộ định mức vật tư và hoàn tất..."
        }) + "\n"

        try:
            sync_bom_data_to_auxiliary_tables(db)
        except Exception as sync_err:
            print(f"=== [SYNC AUX ERROR] {sync_err}")

        yield json.dumps({
            "status": "completed",
            "percent": 100,
            "message": f"Đã hoàn tất nạp thành công toàn bộ {total_files} file BOM!"
        }) + "\n"

    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"=== [BATCH IMPORT ERROR] {exc}")
        yield json.dumps({"status": "error", "message": str(exc)}) + "\n"


def sync_all_boms_from_directory(db: Session, directory_path: str = r"D:\SmartFlow\BOM"):
    """
    [DIRECTORY AUTO-SYNC] Quét trực tiếp toàn bộ các file .xlsx trong thư mục chỉ định và nạp vào DB.
    """
    import os, glob, openpyxl, json

    if not os.path.isdir(directory_path):
        yield json.dumps({"status": "error", "message": f"Thư mục không tồn tại: {directory_path}"}) + "\n"
        return

    raw_files = sorted(glob.glob(os.path.join(directory_path, "*.xlsx")) + glob.glob(os.path.join(directory_path, "*.xls")))
    files = [f for f in raw_files if not os.path.basename(f).startswith("~$")]

    if not files:
        yield json.dumps({"status": "error", "message": f"Không tìm thấy file Excel nào trong {directory_path}"}) + "\n"
        return

    total_files = len(files)
    yield json.dumps({
        "status": "reading",
        "total_files": total_files,
        "percent": 0,
        "message": f"Tìm thấy {total_files} file BOM trong {directory_path}. Bắt đầu nạp..."
    }) + "\n"

    category_cache = {}
    try:
        for f_idx, fpath in enumerate(files, start=1):
            fname = os.path.basename(fpath)
            try:
                wb = openpyxl.load_workbook(fpath, read_only=True, data_only=True)
                yield from _process_bom_workbook(
                    db, wb, 
                    filename=fname, 
                    file_index=f_idx, 
                    total_files=total_files, 
                    category_cache=category_cache
                )
            except Exception as f_err:
                print(f"=== [DIR SYNC FILE ERROR {fname}] {f_err}")
                yield json.dumps({
                    "status": "warning",
                    "file_index": f_idx,
                    "total_files": total_files,
                    "file_name": fname,
                    "message": f"Lỗi đọc file {fname}: {str(f_err)}"
                }) + "\n"

        # Đồng bộ toàn bộ dữ liệu phụ trợ
        yield json.dumps({
            "status": "processing",
            "percent": 98,
            "message": "Đang đồng bộ định mức vật tư và hoàn tất..."
        }) + "\n"

        try:
            sync_bom_data_to_auxiliary_tables(db)
        except Exception as sync_err:
            print(f"=== [SYNC AUX ERROR] {sync_err}")

        yield json.dumps({
            "status": "completed",
            "total_files": total_files,
            "percent": 100,
            "message": f"Đã đồng bộ thành công {total_files} file BOM từ thư mục {directory_path}!"
        }) + "\n"

    except Exception as exc:
        db.rollback()
        import traceback
        traceback.print_exc()
        print(f"=== [DIR SYNC ERROR] {exc}")
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

def import_material_boms_from_excel(
    db: Session,
    file_contents: bytes,
    filename: str = "BOM_VatTu.xlsx",
    file_index: int = 1,
    total_files: int = 1
):
    """
    [STREAMING GENERATOR] Nhập dữ liệu định mức BOM Vật tư (VTTH) từ 1 file Excel:
    - Báo cáo tiến trình streaming NDJSON (status, percent, processed, total, message)
    - Tự động hiển thị thẻ tiến trình ở chân Sidebar bên trái (non-blocking)
    - Khớp nối theo Mã chi tiết sử dụng (SKU) và Cột 17 (Nhóm Nvl tiêu hao)
    """
    import io
    import openpyxl
    import re
    from shared.utils.timezone import get_vietnam_time

    base_prog = int(((file_index - 1) / max(1, total_files)) * 100)
    file_slice = int(100 / max(1, total_files))

    yield json.dumps({
        "status": "processing",
        "file_index": file_index,
        "total_files": total_files,
        "file_name": filename,
        "percent": min(98, base_prog + 5),
        "processed": 0,
        "total": 0,
        "message": f"[{filename}] Đang đọc cấu trúc file Excel..."
    }) + "\n"

    try:
        wb = openpyxl.load_workbook(filename=io.BytesIO(file_contents), data_only=True, read_only=True)
    except Exception as e:
        yield json.dumps({
            "status": "error",
            "message": f"[{filename}] Không thể mở file Excel: {str(e)}"
        }) + "\n"
        return

    if not wb.sheetnames:
        wb.close()
        yield json.dumps({
            "status": "error",
            "message": f"[{filename}] File Excel không có sheet nào."
        }) + "\n"
        return

    first_sheet_name = wb.sheetnames[0]
    sheet = wb[first_sheet_name]
    rows_iter = sheet.iter_rows(values_only=True)
    first_row = next(rows_iter, None)

    if not first_row:
        wb.close()
        yield json.dumps({
            "status": "error",
            "message": f"[{filename}] File Excel trống không có dữ liệu."
        }) + "\n"
        return

    header_strings = [str(cell or '').strip().upper() for cell in first_row]

    # Kiểm tra xem có phải định dạng bảng phẳng chuẩn xưởng ERP VTTH (như Phuc1.xlsx) hay không
    is_flat_vtth_format = any("NVL TIÊU HAO" in h or "NVL TIEU HAO" in h for h in header_strings) or \
                          any("CHI TIẾT SỬ DỤNG" in h or "CHI TIET SU DUNG" in h for h in header_strings)

    if is_flat_vtth_format:
        # ── 1. ĐỊNH VỊ CỘT DỮ LIỆU ĐỘNG THEO TIÊU ĐỀ ──
        col_mat_code = 1    # Mã Nvl tiêu hao
        col_mat_name = 2    # Tên Nvl tiêu hao
        col_unit = 3        # ĐVT Nvl tiêu hao
        col_spec = 4        # Quy cách Nvl tiêu hao
        col_prod_sku = 5    # Mã chi tiết sử dụng (Chìa khóa SKU sản phẩm)
        col_prod_name = 6   # Tên chi tiết sử dụng
        col_quota = 11      # Tổng vật tư sử dụng (Định mức)
        col_stage = 12      # Công đoạn
        col_note = 15       # Ghi chú
        col_group = 16      # Nhóm Nvl tiêu hao

        for idx, h in enumerate(header_strings):
            if "MÃ NVL TIÊU HAO" in h or "MA NVL TIEU HAO" in h:
                col_mat_code = idx
            elif "TÊN NVL TIÊU HAO" in h or "TEN NVL TIEU HAO" in h:
                col_mat_name = idx
            elif "ĐVT NVL TIÊU HAO" in h or "DVT NVL TIEU HAO" in h:
                col_unit = idx
            elif "QUY CÁCH NVL TIÊU HAO" in h or "QUY CACH NVL TIEU HAO" in h:
                col_spec = idx
            elif "MÃ CHI TIẾT SỬ DỤNG" in h or "MA CHI TIET SU DUNG" in h:
                col_prod_sku = idx
            elif "TÊN CHI TIẾT SỬ DỤNG" in h or "TEN CHI TIET SU DUNG" in h:
                col_prod_name = idx
            elif "TỔNG VẬT TƯ SỬ DỤNG" in h or "TONG VAT TU SU DUNG" in h:
                col_quota = idx
            elif "CÔNG ĐOẠN" in h or "CONG DOAN" in h:
                col_stage = idx
            elif "GHI CHÚ" in h or "GHI CHU" in h:
                col_note = idx
            elif "NHÓM NVL TIÊU HAO" in h or "NHOM NVL TIEU HAO" in h:
                col_group = idx

        yield json.dumps({
            "status": "processing",
            "file_index": file_index,
            "total_files": total_files,
            "file_name": filename,
            "percent": min(98, base_prog + 8),
            "processed": 0,
            "total": 0,
            "message": f"[{filename}] Đang tra cứu danh mục MasterProduct..."
        }) + "\n"

        # Pre-load in-memory hash maps của toàn bộ MasterProduct để tra cứu O(1)
        all_prods = db.query(MasterProduct.id, MasterProduct.sku, MasterProduct.name).all()
        sku_lookup = {p.sku.strip().upper(): p for p in all_prods if p.sku}
        name_lookup = {p.name.strip().upper(): p for p in all_prods if p.name}

        def extract_color_spec(mat_name, spec):
            if spec and str(spec).strip():
                return str(spec).strip()
            match = re.search(r'\(([^)]+)\)', str(mat_name or ''))
            if match:
                return match.group(1).strip()
            return ''

        # Thu thập các mã SKU trong file để chỉ xóa và thay thế đúng các sản phẩm đó
        incoming_skus = set()
        for r in sheet.iter_rows(values_only=True):
            if r and len(r) > col_prod_sku and r[col_prod_sku]:
                val = str(r[col_prod_sku]).strip().upper()
                if val and val not in ['MÃ CHI TIẾT SỬ DỤNG', 'MA CHI TIET SU DUNG']:
                    incoming_skus.add(val)

        if incoming_skus:
            yield json.dumps({
                "status": "processing",
                "file_index": file_index,
                "total_files": total_files,
                "file_name": filename,
                "percent": min(98, base_prog + 12),
                "processed": 0,
                "total": len(incoming_skus),
                "message": f"[{filename}] Đồng bộ dữ liệu cũ của {len(incoming_skus)} mã sản phẩm..."
            }) + "\n"

            sku_list = list(incoming_skus)
            for i in range(0, len(sku_list), 1000):
                db.query(MasterProductMaterial).filter(
                    MasterProductMaterial.product_sku.in_(sku_list[i:i+1000])
                ).delete(synchronize_session=False)
            db.commit()

        # Reset iterator về đầu sau khi quét header
        sheet_iter = sheet.iter_rows(values_only=True)
        next(sheet_iter, None) # Bỏ qua header

        mappings = []
        batch_size = 2000
        total_imported = 0
        matched_prods_set = set()
        unique_sku_set = set()
        now_vn = get_vietnam_time()
        approx_total = sheet.max_row - 1 if sheet.max_row and sheet.max_row > 1 else 25000

        for row_idx, row in enumerate(sheet_iter, start=2):
            if not row or not any(row):
                continue

            mat_name = str(row[col_mat_name] if len(row) > col_mat_name and row[col_mat_name] is not None else '').strip()
            if not mat_name:
                continue

            mat_code = str(row[col_mat_code] if len(row) > col_mat_code and row[col_mat_code] is not None else '').strip()
            unit_val = str(row[col_unit] if len(row) > col_unit and row[col_unit] is not None else 'Cái').strip()
            spec_val = str(row[col_spec] if len(row) > col_spec and row[col_spec] is not None else '').strip()

            prod_sku = str(row[col_prod_sku] if len(row) > col_prod_sku and row[col_prod_sku] is not None else '').strip()
            prod_name = str(row[col_prod_name] if len(row) > col_prod_name and row[col_prod_name] is not None else '').strip()

            quota_val = 1.0
            if len(row) > col_quota and row[col_quota] is not None:
                try:
                    quota_val = float(str(row[col_quota]).replace(',', '.').strip())
                except:
                    quota_val = 1.0

            stage_val = str(row[col_stage] if len(row) > col_stage and row[col_stage] is not None else '').strip()
            note_val = str(row[col_note] if len(row) > col_note and row[col_note] is not None else '').strip()
            group_val = str(row[col_group] if len(row) > col_group and row[col_group] is not None else '').strip()

            group_type = group_val if group_val and str(group_val).strip() else (stage_val if stage_val and str(stage_val).strip() else "Vật tư dùng chung")
            group_type = group_type.strip()

            color_val = extract_color_spec(mat_name, spec_val)

            matched_prod = sku_lookup.get(prod_sku.upper()) or name_lookup.get(prod_name.upper())
            prod_id = matched_prod.id if matched_prod else None

            if prod_id:
                matched_prods_set.add(prod_id)
            if prod_sku:
                unique_sku_set.add(prod_sku.upper())

            full_note = note_val
            extra_info = []
            if stage_val: extra_info.append(f"CĐ: {stage_val}")
            if group_val: extra_info.append(f"Nhóm: {group_val}")
            if extra_info:
                full_note = (full_note + " | " + " - ".join(extra_info)).strip(" | ")

            mappings.append({
                "master_product_id": prod_id,
                "product_sku": prod_sku,
                "product_name": prod_name,
                "stt": row_idx,
                "group_type": group_type,
                "material_code": mat_code or f"VT-{mat_name[:6].upper().replace(' ', '')}",
                "material_name": mat_name,
                "color": color_val,
                "quota": quota_val,
                "unit": unit_val or 'Cái',
                "supplier": '',
                "note": full_note,
                "created_at": now_vn
            })

            if len(mappings) >= batch_size:
                db.bulk_insert_mappings(MasterProductMaterial, mappings)
                db.commit()
                total_imported += len(mappings)
                mappings = []

                ratio = min(0.98, total_imported / max(1, approx_total))
                cur_prog = base_prog + 15 + int(ratio * file_slice * 0.8)
                yield json.dumps({
                    "status": "processing",
                    "file_index": file_index,
                    "total_files": total_files,
                    "file_name": filename,
                    "processed": total_imported,
                    "total": approx_total,
                    "percent": min(98, cur_prog),
                    "message": f"[{filename}] Đang lưu {total_imported:,}/{approx_total:,} dòng ({prod_sku})..."
                }) + "\n"

        if mappings:
            db.bulk_insert_mappings(MasterProductMaterial, mappings)
            db.commit()
            total_imported += len(mappings)

        wb.close()
        final_file_pct = base_prog + file_slice if file_index < total_files else 100
        yield json.dumps({
            "status": "completed" if file_index == total_files else "processing",
            "file_index": file_index,
            "total_files": total_files,
            "file_name": filename,
            "processed": total_imported,
            "total": total_imported,
            "percent": final_file_pct,
            "imported_count": total_imported,
            "matched_products": len(matched_prods_set),
            "message": f"[{filename}] Hoàn tất! Đã nạp {total_imported:,} dòng định mức cho {len(matched_prods_set):,} sản phẩm."
        }) + "\n"

    else:
        # ── 2. BỘ XỬ LÝ ĐA SHEET / MẪU LEGACY ──
        total_imported = 0
        wb_full = openpyxl.load_workbook(filename=io.BytesIO(file_contents), data_only=True)
        total_sheets = len(wb_full.sheetnames)

        for s_idx, sheet_name in enumerate(wb_full.sheetnames, start=1):
            cur_sheet = wb_full[sheet_name]
            clean_sname = sheet_name.strip()

            matched_prod = db.query(MasterProduct).filter(
                (MasterProduct.sku.ilike(f"%{clean_sname}%")) | 
                (MasterProduct.name.ilike(f"%{clean_sname}%"))
            ).first()

            prod_id = matched_prod.id if matched_prod else None
            prod_sku = matched_prod.sku if matched_prod else clean_sname
            prod_name = matched_prod.name if matched_prod else clean_sname
            current_group = "VẬT TƯ HÀNG TRẮNG"

            for row_idx, row in enumerate(cur_sheet.iter_rows(values_only=True), start=1):
                if not row or not any(row):
                    continue

                first_cell = str(row[0] or '').strip().upper()
                second_cell = str(row[1] or '').strip().upper() if len(row) > 1 else ''

                if "HÀNG TRẮNG" in first_cell or "HANG TRANG" in first_cell or "HÀNG TRẮNG" in second_cell:
                    current_group = "VẬT TƯ HÀNG TRẮNG"
                    continue
                elif "SAU SƠN" in first_cell or "SAU SON" in first_cell or "SAU SƠN" in second_cell:
                    current_group = "VẬT TƯ SAU SƠN"
                    continue

                if any(k in first_cell or k in second_cell for k in ["STT", "TÊN VẬT TƯ", "MÃ VẬT TƯ", "TÊN CHI TIẾT", "MATERIAL"]):
                    continue

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

            if s_idx % 2 == 0 or s_idx == total_sheets:
                s_prog = base_prog + int((s_idx / total_sheets) * file_slice)
                yield json.dumps({
                    "status": "processing",
                    "file_index": file_index,
                    "total_files": total_files,
                    "file_name": filename,
                    "percent": min(98, s_prog),
                    "sheet_index": s_idx,
                    "total_sheets": total_sheets,
                    "processed": total_imported,
                    "message": f"[{filename}] Đang lưu sheet {s_idx}/{total_sheets} ({sheet_name})..."
                }) + "\n"

        db.commit()
        yield json.dumps({
            "status": "completed" if file_index == total_files else "processing",
            "file_index": file_index,
            "total_files": total_files,
            "file_name": filename,
            "percent": 100 if file_index == total_files else base_prog + file_slice,
            "imported_count": total_imported,
            "message": f"[{filename}] Hoàn tất! Đã nạp {total_imported:,} dòng định mức vật tư."
        }) + "\n"

def import_material_boms_from_excel_batch(db: Session, files_list: List[tuple]):
    """
    [STREAMING BATCH] Nạp danh sách nhiều file Excel BOM Vật tư liên tiếp:
    files_list: [(filename, file_bytes), ...]
    """
    total_files = len(files_list)
    if not total_files:
        yield json.dumps({"status": "error", "message": "Không có file nào được cung cấp."}) + "\n"
        return

    for idx, (filename, file_bytes) in enumerate(files_list, start=1):
        yield from import_material_boms_from_excel(
            db, file_bytes, filename=filename, file_index=idx, total_files=total_files
        )

    yield json.dumps({
        "status": "completed",
        "percent": 100,
        "message": f"Hoàn tất nạp toàn bộ {total_files} file Excel BOM Vật tư!"
    }) + "\n"

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
    Tự động truy vấn Định mức Vật tư theo product_id HOẶC ăn theo SKU sản phẩm (cột Mã chi tiết sử dụng).
    Tự động liên kết self-healing nếu vật tư chưa được gán master_product_id.
    """
    import re

    current_prod = None
    if product_id:
        current_prod = db.query(MasterProduct).filter(MasterProduct.id == product_id).first()

    target_sku = (sku or (current_prod.sku if current_prod else '') or '').strip()
    target_name = (name or (current_prod.name if current_prod else '') or '').strip()

    materials = []

    # 1. Ưu tiên 1: Lấy trực tiếp theo master_product_id nếu đã liên kết
    if product_id:
        materials = db.query(MasterProductMaterial).filter(
            MasterProductMaterial.master_product_id == product_id
        ).order_by(MasterProductMaterial.group_type.asc(), MasterProductMaterial.stt.asc()).all()

    # 2. Ưu tiên 2: Khớp nối trực tiếp theo SKU sản phẩm (Cột Mã chi tiết sử dụng)
    if not materials and target_sku:
        materials = db.query(MasterProductMaterial).filter(
            MasterProductMaterial.product_sku == target_sku
        ).order_by(MasterProductMaterial.group_type.asc(), MasterProductMaterial.stt.asc()).all()

        # Tự động gắn master_product_id (Self-healing link) để các lần sau truy vấn siêu tốc
        if materials and product_id:
            for m in materials:
                if not m.master_product_id:
                    m.master_product_id = product_id
            db.commit()

    # 3. Ưu tiên 3: Khớp nối theo Tên sản phẩm nếu SKU chưa khớp
    if not materials and target_name:
        materials = db.query(MasterProductMaterial).filter(
            MasterProductMaterial.product_name == target_name
        ).order_by(MasterProductMaterial.group_type.asc(), MasterProductMaterial.stt.asc()).all()

        if materials and product_id:
            for m in materials:
                if not m.master_product_id:
                    m.master_product_id = product_id
            db.commit()

    # 4. Fallback: Tìm kiếm liên kết thông minh theo token / model đối với dòng tủ vanity cũ
    if not materials:
        distinct_skus = [r[0] for r in db.query(MasterProductMaterial.product_sku).filter(
            MasterProductMaterial.product_sku != None,
            MasterProductMaterial.product_sku != '---'
        ).distinct().all() if r[0]]

        raw_tokens = set()
        synthesized_tokens = set()
        for text in [target_sku, target_name]:
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

        matched_sku = None
        for d_sku in distinct_skus:
            if d_sku.upper() in raw_tokens:
                matched_sku = d_sku
                break

        if matched_sku:
            materials = db.query(MasterProductMaterial).filter(
                MasterProductMaterial.product_sku == matched_sku
            ).order_by(MasterProductMaterial.group_type.asc(), MasterProductMaterial.stt.asc()).all()

    # 5. Nếu tìm thấy vật tư, phân chia theo nhóm động (Nhóm Nvl tiêu hao / Ảnh 2) và đánh lại STT chuẩn đẹp
    if materials:
        clean_mats = [m for m in materials if is_hardware_material(m)]
        if not clean_mats:
            clean_mats = materials

        # Gom nhóm theo group_type (Nhóm Nvl tiêu hao)
        groups_map = {}
        for m in clean_mats:
            grp = (m.group_type or 'Vật tư dùng chung').strip()
            if grp not in groups_map:
                groups_map[grp] = []
            groups_map[grp].append(m)

        serialized = []
        for grp_name, grp_items in groups_map.items():
            for idx, m in enumerate(grp_items, start=1):
                m_dict = serialize_material_item(m)
                m_dict['stt'] = idx
                m_dict['group_type'] = grp_name
                serialized.append(m_dict)

        return serialized

    return []


def export_master_product_bom_excel(db: Session, product_id: int) -> io.BytesIO:
    """
    [EXCEL EXPORT] Xuất toàn bộ cây cấu trúc BOM phân tầng của sản phẩm thành file Excel
    chuẩn 100% theo định dạng, 19 cột dữ liệu, kiểu dáng và công thức tính toán của D:\\SmartFlow\\BOM\\BOM1.xlsx.
    """
    product = db.query(MasterProduct).filter(MasterProduct.id == product_id).first()
    if not product:
        raise ValueError("Không tìm thấy sản phẩm mẫu để xuất BOM Excel")

    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter

    # 1. Lấy toàn bộ BOM details của sản phẩm
    bom_items = db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == product.id).all()

    # Nhận diện tiền tố nhà máy (NM1, NM2, NM3)
    factory = product.description or ''
    p_num = ''
    if 'NM1' in factory: factory_prefix = 'NM1'; p_num = '1'
    elif 'NM2' in factory: factory_prefix = 'NM2'; p_num = '2'
    elif 'NM3' in factory: factory_prefix = 'NM3'; p_num = '3'
    else:
        factory_prefix = ''
        for b in bom_items:
            combined = f"{b.input_stage or ''} {b.output_stage or ''}"
            m = re.search(r'NM([1-3])', combined)
            if m:
                factory_prefix = f"NM{m.group(1)}"
                p_num = m.group(1)
                break

    def format_stage(stage_name):
        if not stage_name or stage_name == 'None':
            return ''
        stage_str = str(stage_name).strip()
        if not stage_str or stage_str.lower() == 'none':
            return ''
        if factory_prefix and p_num and not stage_str.startswith(factory_prefix):
            return f"{factory_prefix} - {stage_str} {p_num}"
        return stage_str

    # 2. Xây dựng cây phân cấp BOM
    by_id = {b.id: b for b in bom_items}
    children_map = {}
    root_bom_nodes = []

    for b in bom_items:
        if b.parent_id and b.parent_id in by_id:
            children_map.setdefault(b.parent_id, []).append(b)
        else:
            root_bom_nodes.append(b)

    # 3. Duyệt cây (DFS / Pre-order) để sinh các dòng đúng thứ tự BOM1.xlsx
    export_rows = []
    stt_counter = 1

    def traverse(parent_obj, child_obj, depth, cumulative_parent_qty):
        nonlocal stt_counter
        qty = float(child_obj.quantity or 0.0)
        waste = float(child_obj.waste_ratio or 1.0)
        tot_qty = qty * waste * cumulative_parent_qty

        # Format số
        if abs(tot_qty - round(tot_qty)) < 1e-9:
            tot_qty_val = int(round(tot_qty))
        else:
            tot_qty_val = round(tot_qty, 12)

        if abs(qty - round(qty)) < 1e-9:
            qty_val = int(round(qty))
        else:
            qty_val = round(qty, 12)

        if abs(waste - round(waste)) < 1e-9:
            waste_val = int(round(waste))
        else:
            waste_val = round(waste, 6)

        is_raw = 'Có' if child_obj.is_raw_material else None
        exclude_prod = 'Có' if child_obj.exclude_production else None

        in_stage = format_stage(child_obj.input_stage)
        out_stage = format_stage(child_obj.output_stage)

        if depth == 1:
            r_sku = None
            r_name = None
            p_sku = product.sku
            p_name = product.name
            p_unit = product.unit or 'bộ'
            p_spec = None
        else:
            r_sku = product.sku
            r_name = product.name
            p_sku = parent_obj.sku
            p_name = parent_obj.name
            p_unit = parent_obj.unit or 'cái'
            p_spec = parent_obj.specification or None

        c_spec = child_obj.specification or None
        c_unit = child_obj.unit or 'cái'

        row_data = [
            stt_counter,
            r_sku,
            r_name,
            p_sku,
            p_name,
            p_unit,
            p_spec,
            child_obj.sku,
            child_obj.name,
            c_unit,
            c_spec,
            qty_val,
            waste_val,
            tot_qty_val,
            child_obj.description or None,
            is_raw,
            exclude_prod,
            in_stage,
            out_stage
        ]
        export_rows.append(row_data)
        stt_counter += 1

        current_cum_qty = cumulative_parent_qty * qty
        for next_child in children_map.get(child_obj.id, []):
            traverse(child_obj, next_child, depth + 1, current_cum_qty)

    for r_node in root_bom_nodes:
        traverse(product, r_node, depth=1, cumulative_parent_qty=1.0)

    # 4. Khởi tạo workbook Excel theo đúng cấu trúc BOM1.xlsx
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sheet0"

    # Style definitions
    header_fill = PatternFill(start_color="FFDDE5EF", end_color="FFDDE5EF", fill_type="solid")
    header_font = Font(name="Calibri", size=12, bold=True)
    header_alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    data_font = Font(name="Calibri", size=11)
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_right = Alignment(horizontal="right", vertical="center")

    thin_border = Border(
        left=Side(style="thin", color="D3D3D3"),
        right=Side(style="thin", color="D3D3D3"),
        top=Side(style="thin", color="D3D3D3"),
        bottom=Side(style="thin", color="D3D3D3")
    )
    header_border = Border(
        left=Side(style="thin", color="A0A0A0"),
        right=Side(style="thin", color="A0A0A0"),
        top=Side(style="thin", color="A0A0A0"),
        bottom=Side(style="thin", color="A0A0A0")
    )

    headers = [
        'STT', 'Mã mặt hàng gốc', 'Tên mặt hàng gốc', 'Mã mặt hàng', 'Tên mặt hàng',
        'ĐVT', 'Quy cách', 'Mã chi tiết', 'Tên chi tiết', 'ĐVT chi tiết',
        'Quy cách chi tiết', 'Số lượng', 'Tỷ lệ hao hụt', 'Tổng SL', 'Mô tả',
        'Là nguyên liệu', 'Không đưa vào QTSX', 'Cộng đoạn vào', 'Công đoạn ra'
    ]

    col_widths = {
        1: 13.0, 2: 19.5, 3: 72.0, 4: 23.5, 5: 85.0,
        6: 8.0, 7: 16.5, 8: 23.5, 9: 62.0, 10: 12.5,
        11: 17.5, 12: 13.5, 13: 14.0, 14: 13.0, 15: 92.0,
        16: 15.0, 17: 22.0, 18: 25.0, 19: 13.0
    }

    # Ghi row 2 (Dòng 1 để trống theo file BOM1.xlsx)
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = header_border

    # Ghi row 3 trở đi (Dữ liệu cây BOM)
    for row_idx, r_data in enumerate(export_rows, 3):
        for col_idx, val in enumerate(r_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = data_font
            cell.border = thin_border
            if col_idx in [1, 6, 10, 16, 17]:
                cell.alignment = align_center
            elif col_idx in [12, 13, 14]:
                cell.alignment = align_right
            else:
                cell.alignment = align_left

    # Gán độ rộng cột
    for col_idx, w in col_widths.items():
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = w

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output





