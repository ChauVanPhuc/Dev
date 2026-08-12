from typing import Optional
import pandas as pd
import io
import json
import re
from sqlalchemy.orm import Session
import app.models  # Register all SQLAlchemy ORM models to prevent InvalidRequestError
from modules.master.models.master_product import MasterProduct
from modules.production.models.product import Product
from modules.production.models.bom_detail import BOMDetail
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.master.schemas.master_product import MasterProductCreate, MasterProductUpdate
from shared.utils.string_cleaner import clean_and_standardize_name, clean_and_standardize_sku

from modules.master.models.technical_drawing import TechnicalDrawing
from modules.master.models.paint_color_sample import PaintColorSample
from modules.master.models.master_product_material import MasterProductMaterial
from modules.master.models.technical_pending_task import TechnicalPendingTask
from modules.master.models.master_product_detail import MasterProductDetail


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
        "name": getattr(item, 'name', ''),
        "material_code": getattr(item, 'material_code', ''),
        "unit": getattr(item, 'unit', ''),
        "quantity": getattr(item, 'quantity', 0.0),
        "note": getattr(item, 'note', '')
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
    master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    return to_master_product_dict(master)

def create_master_product(db: Session, master_product: MasterProductCreate):
    data = master_product.model_dump(exclude={'master_bom_details', 'product_details', 'paint_color_samples', 'technical_drawings', 'materials'})
    valid_cols = {c.name for c in MasterProduct.__table__.columns}
    product_data = {k: v for k, v in data.items() if k in valid_cols and v is not None}

    if 'sku' in product_data:
        product_data['sku'] = clean_and_standardize_sku(product_data['sku'])
    if 'name' in product_data:
        product_data['name'] = clean_and_standardize_name(product_data['name'])
        
    bom_data_list = getattr(master_product, 'master_bom_details', []) or []
    product_details_list = getattr(master_product, 'product_details', []) or []
    paint_color_list = getattr(master_product, 'paint_color_samples', []) or []

    # Check if SKU already exists
    existing = db.query(MasterProduct).filter(MasterProduct.sku == product_data.get('sku')).first()
    if existing:
        db_master = existing
        for k, v in product_data.items():
            setattr(db_master, k, v)
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
            
            # Determine parent_id
            parent_id = node_dict.get('parent_id')
            if parent_id is None and stt:
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
                image_url=pc.get('image_url', ''),
                note=pc.get('note', '')
            ))

    db.commit()
    db.refresh(db_master)
    return to_master_product_dict(db_master)

def update_master_product(db: Session, master_product_id: int, master_product: MasterProductUpdate):
    db_master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    if db_master:
        update_data = master_product.model_dump(exclude_unset=True, exclude={'master_bom_details', 'product_details', 'paint_color_samples'})
        if 'sku' in update_data:
            update_data['sku'] = clean_and_standardize_sku(update_data['sku'])
        if 'name' in update_data:
            update_data['name'] = clean_and_standardize_name(update_data['name'])
        for key, value in update_data.items():
            setattr(db_master, key, value)
            
        bom_data_list = getattr(master_product, 'master_bom_details', None)
        if bom_data_list is not None and isinstance(bom_data_list, list):
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
                
                parent_id = node_dict.get('parent_id')
                if parent_id is None and stt:
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
                        image_url=pc.get('image_url', ''),
                        note=pc.get('note', '')
                    ))

        db.commit()
        db.refresh(db_master)
    return to_master_product_dict(db_master)

def delete_master_product(db: Session, master_product_id: int):
    db_master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    if db_master:
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

def import_master_products_from_excel(db: Session, file_content: bytes):

    def clean_val(val):
        if pd.isna(val) or str(val).lower() == 'nan': return None
        return str(val).strip()

    def to_bool(val):
        if not val: return False
        return str(val).lower() in ['có', 'yes', '1', 'true', 'x']

    def to_float(val, default=0.0):
        if pd.isna(val) or val is None: return default
        try:
            return float(str(val).strip().replace(',', '.'))
        except Exception:
            return default

    try:
        # Read without header first to auto-detect header row
        df_raw = pd.read_excel(io.BytesIO(file_content), header=None)

        # Tự động dò tìm dòng Tiêu đề (Header row) trong 25 dòng đầu
        header_row_idx = 0
        for idx in range(min(25, len(df_raw))):
            row_vals = [str(v).lower() for v in df_raw.iloc[idx].dropna().values]
            row_str = ' '.join(row_vals)
            if any(kw in row_str for kw in ['mã chi tiết', 'tên chi tiết', 'mã mặt hàng', 'mã sản phẩm']):
                header_row_idx = idx
                break

        df = df_raw.iloc[header_row_idx + 1:].copy()
        raw_headers = [str(val).strip().lower().replace('\n', ' ') for val in df_raw.iloc[header_row_idx].values]
        df.columns = raw_headers
        total_rows_excel = len(df)
        print(f"=== [START IMPORT] Đang đọc file Excel: {total_rows_excel} dòng (Header ở dòng {header_row_idx})")
        yield json.dumps({"status": "reading", "total": total_rows_excel}) + "\n"

        headers = [str(h).strip().lower() for h in df.columns]
        def get_col_idx(names, default=None):
            for name in names:
                for i, h in enumerate(headers):
                    if name == h: return i
            for name in names:
                for i, h in enumerate(headers):
                    if name in h: return i
            return default

        idx_root_code = get_col_idx(['mã mặt hàng gốc', 'mã gốc'], None)
        idx_root_name = get_col_idx(['tên mặt hàng gốc', 'tên gốc'], None)
        idx_parent_code = get_col_idx(['mã mặt hàng', 'mã sản phẩm', 'mã sp'], 0)
        idx_parent_name = get_col_idx(['tên mặt hàng', 'tên sản phẩm', 'tên sp'], 1)
        idx_unit = get_col_idx(['đvt', 'đơn vị tính'], 5)
        idx_spec = get_col_idx(['quy cách chi tiết', 'quy cách'], 32)
        idx_child_code = get_col_idx(['mã chi tiết'], 4)
        idx_child_name = get_col_idx(['tên chi tiết'], 5)
        idx_child_unit = get_col_idx(['đvt chi tiết', 'đvt'], 6)
        idx_child_spec = get_col_idx(['quy cách chi tiết', 'quy cách'], 32)
        idx_qty = get_col_idx(['sl/ part', 'sl/ set', 'số lượng/ po', 'số lượng', 'sl'], 14)
        idx_waste = get_col_idx(['tỷ lệ hao hụt', 'hao hụt'], 21)
        idx_desc = get_col_idx(['ghi chú', 'mô tả'], 20)
        idx_is_raw = get_col_idx(['vật tư thô', 'là nvl (có, không)', 'là nvl'], 25)
        idx_exclude = get_col_idx(['loại trừ sản xuất', 'không sản xuất', 'loại trừ', 'không đưa vào qtsx'], 26)
        idx_in_stage = get_col_idx(['cộng đoạn vào', 'công đoạn vào'], 29)
        idx_out_stage = get_col_idx(['công đoạn ra', 'cộng đoạn ra'], 28)

        # 1. Làm sạch ban đầu
        df = df[df.iloc[:, idx_child_code].notna()]
        df = df[df.iloc[:, idx_child_code].astype(str).str.strip().str.lower() != 'mã chi tiết']
        
        # 2. Chuyển sang Dictionary để tối ưu tốc độ
        df_records = df.to_dict('records')
        col_names = df.columns.tolist()
        
        adj_list = {}
        info_map = {} 
        all_child_codes = set()
        
        for row in df_records:
            p_code = clean_val(row[col_names[idx_parent_code]])
            c_code = clean_val(row[col_names[idx_child_code]])
            if not c_code or not p_code: continue
            
            p_code_std = clean_and_standardize_sku(p_code)
            c_code_std = clean_and_standardize_sku(c_code)
            
            if c_code_std != p_code_std:
                all_child_codes.add(c_code_std)
            if p_code_std not in adj_list: adj_list[p_code_std] = []
            if c_code_std != p_code_std:
                adj_list[p_code_std].append(row)
            
            if p_code_std not in info_map:
                p_name = clean_val(row[col_names[idx_parent_name]])
                info_map[p_code_std] = {
                    'name': clean_and_standardize_name(p_name),
                    'unit': clean_val(row[col_names[idx_unit]]),
                    'spec': clean_val(row[col_names[idx_spec]])
                }

        # 3. Xác định Root
        all_parent_codes = set(adj_list.keys())
        root_codes = list(all_parent_codes - all_child_codes)
        
        if idx_root_code is not None:
            explicit_roots = df.iloc[:, idx_root_code].dropna().unique()
            if len(explicit_roots) > 0:
                root_codes = list(set(root_codes) | set([clean_and_standardize_sku(r) for r in explicit_roots]))

        print(f"--- [DEBUG] Tìm thấy {len(root_codes)} sản phẩm gốc.")
        processed_count = 0
        total_rows = len(df) + len(root_codes)
        yield json.dumps({"status": "processing", "processed": processed_count, "total": total_rows}) + "\n"

        # 4. Xóa dữ liệu cũ (Batch)
        if root_codes:
            print(f"--- [IMPORT] Đang dọn dẹp dữ liệu cũ...")
            chunk_size = 2000
            for i in range(0, len(root_codes), chunk_size):
                chunk = root_codes[i:i + chunk_size]
                target_ids = db.query(MasterProduct.id).filter(MasterProduct.sku.in_(chunk)).all()
                target_ids = [r[0] for r in target_ids]
                
                if target_ids:
                    db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id.in_(target_ids)).delete(synchronize_session=False)
                    db.query(MasterProduct).filter(MasterProduct.id.in_(target_ids)).delete(synchronize_session=False)
            db.commit()

        # 5. Khởi tạo tất cả Root Products
        db_roots = []
        root_obj_map = {}
        for r_code in root_codes:
            r_info = info_map.get(r_code, {})
            r_name = r_info.get('name') or r_code
            r_name_std = clean_and_standardize_name(r_name)
            r_spec = r_info.get('spec')
            if not r_spec:
                match = re.search(r"(\d+(?:\.\d+)?\s*[*xX]\s*\d+(?:\.\d+)?(?:\s*[*xX]\s*\d+(?:\.\d+)?)?)", r_name_std)
                if match: r_spec = match.group(1)
                
            l, w, h = parse_dimensions(r_spec)
            root_color = parse_color(r_code, r_name_std)
            
            db_root = MasterProduct(
                sku=r_code, name=r_name_std, unit=r_info.get('unit') or "Bộ",
                specification=r_spec, length=l, width=w, height=h,
                color=root_color,
                status="Active"
            )
            db_roots.append(db_root)
            root_obj_map[r_code] = db_root

        if db_roots:
            chunk_size = 2000
            for i in range(0, len(db_roots), chunk_size):
                chunk = db_roots[i:i + chunk_size]
                db.add_all(chunk)
                db.flush()
                processed_count += len(chunk)
                yield json.dumps({"status": "processing", "processed": processed_count, "total": total_rows}) + "\n"

        # 6. Global level-by-level BFS
        current_level = []
        for r_code in root_codes:
            db_root = root_obj_map[r_code]
            current_level.append((r_code, db_root, {r_code}, db_root.id, db_root.color))

        level_index = 0
        while current_level:
            print(f"--- [IMPORT] Đang xử lý Level {level_index} với {len(current_level)} nút cha...")
            next_level = []
            objects_to_add = []
            
            for p_sku, p_db_obj, visited_skus, db_root_id, root_color in current_level:
                p_db_id = p_db_obj.id if isinstance(p_db_obj, MasterBOMDetail) else None
                children = adj_list.get(p_sku, [])
                
                unique_children = {}
                for row in children:
                    c_sku = clean_val(row[col_names[idx_child_code]])
                    if not c_sku: continue
                    c_sku_std = clean_and_standardize_sku(c_sku)
                    if c_sku_std == p_sku: continue
                    if c_sku_std not in unique_children: unique_children[c_sku_std] = row
                
                stage_bridge_parents = {}
                if isinstance(p_db_obj, MasterBOMDetail) and p_db_obj.input_stage:
                    parent_in_stage = p_db_obj.input_stage
                    child_stages = set()
                    for c_sku, row in unique_children.items():
                        if c_sku in visited_skus: continue
                        in_stage = clean_val(row[col_names[idx_in_stage]])
                        if in_stage:
                            child_stages.add(in_stage)
                    
                    for child_in_stage in child_stages:
                        if child_in_stage != parent_in_stage:
                            rank_child = get_stage_rank(child_in_stage)
                            rank_parent = get_stage_rank(parent_in_stage)
                            if rank_child > 0 and rank_parent > 0 and rank_child < rank_parent:
                                factory = None
                                suffix = ""
                                for stage_text in [child_in_stage, parent_in_stage]:
                                    if not factory:
                                        match = re.search(r'(NM\d+)', stage_text)
                                        if match:
                                            factory = match.group(1)
                                    if not suffix:
                                        parts = stage_text.split('-', 1)
                                        if len(parts) > 1:
                                            stage_part = parts[1].strip()
                                            for kw in ["Định hình", "Lắp ráp", "Sơn", "Đóng gói"]:
                                                if kw in stage_part:
                                                    suff = stage_part.replace(kw, "").strip()
                                                    if suff:
                                                        suffix = suff
                                                        break

                                def get_stage_name_by_rank(r):
                                    base_stages = {
                                        1: "Định hình",
                                        2: "Lắp ráp",
                                        3: "Sơn",
                                        4: "Đóng gói"
                                    }
                                    return base_stages.get(r, "")

                                last_parent_id = p_db_obj.id
                                for r in range(rank_parent - 1, rank_child - 1, -1):
                                    in_stg = child_in_stage if r == rank_child else get_stage_name_by_rank(r)
                                    out_stg = parent_in_stage if r + 1 == rank_parent else get_stage_name_by_rank(r + 1)
                                    
                                    trans_obj = MasterBOMDetail(
                                        master_product_id=p_db_obj.master_product_id,
                                        parent_id=last_parent_id,
                                        sku=p_db_obj.sku,
                                        name=p_db_obj.name,
                                        unit=p_db_obj.unit,
                                        specification=p_db_obj.specification,
                                        length=p_db_obj.length,
                                        width=p_db_obj.width,
                                        height=p_db_obj.height,
                                        color=p_db_obj.color,
                                        quantity=p_db_obj.quantity,
                                        waste_ratio=p_db_obj.waste_ratio,
                                        is_raw_material=False,
                                        exclude_production=p_db_obj.exclude_production,
                                        input_stage=clean_stage_name(in_stg),
                                        output_stage=clean_stage_name(out_stg),
                                        status="Active"
                                    )
                                    db.add(trans_obj)
                                    db.flush()
                                    last_parent_id = trans_obj.id
                                stage_bridge_parents[child_in_stage] = last_parent_id

                for c_sku, row in unique_children.items():
                    if c_sku in visited_skus: continue
                    c_name = clean_val(row[col_names[idx_child_name]]) or c_sku
                    c_name_std = clean_and_standardize_name(c_name)
                    c_spec = clean_val(row[col_names[idx_child_spec]])
                    if not c_spec:
                        match = re.search(r"(\d+(?:\.\d+)?\s*[*xX]\s*\d+(?:\.\d+)?(?:\s*[*xX]\s*\d+(?:\.\d+)?)?)", c_name_std)
                        if match: c_spec = match.group(1)
                    dl, dw, dh = parse_dimensions(c_spec)
                    
                    c_desc = clean_val(row[col_names[idx_desc]])
                    c_color = parse_color(c_sku, c_name_std, c_desc) or root_color
                    
                    c_in_stage = clean_stage_name(clean_val(row[col_names[idx_in_stage]]))
                    c_out_stage = clean_stage_name(clean_val(row[col_names[idx_out_stage]]))
                    grandchild_parent_id = stage_bridge_parents.get(row[col_names[idx_in_stage]], p_db_id) if idx_in_stage < len(col_names) else p_db_id

                    obj = MasterBOMDetail(
                        master_product_id=db_root_id, parent_id=grandchild_parent_id,
                        sku=c_sku, name=c_name_std, unit=clean_val(row[col_names[idx_child_unit]]),
                        specification=c_spec, length=dl, width=dw, height=dh,
                        color=c_color,
                        quantity=to_float(row[col_names[idx_qty]], 1.0),
                        waste_ratio=to_float(row[col_names[idx_waste]], 0.0),
                        description=c_desc,
                        is_raw_material=to_bool(clean_val(row[col_names[idx_is_raw]])),
                        exclude_production=to_bool(clean_val(row[col_names[idx_exclude]])),
                        output_stage=c_in_stage,
                        input_stage=c_out_stage,
                        status="Active"
                    )
                    objects_to_add.append(obj)
                    next_level.append((c_sku, obj, visited_skus | {c_sku}, db_root_id, root_color))

            if objects_to_add:
                chunk_size = 2000
                for i in range(0, len(objects_to_add), chunk_size):
                    chunk = objects_to_add[i:i + chunk_size]
                    db.add_all(chunk)
                    db.flush()
                    processed_count += len(chunk)
                    yield json.dumps({"status": "processing", "processed": processed_count, "total": total_rows}) + "\n"

            current_level = next_level
            level_index += 1

        db.commit()
        try:
            sync_bom_data_to_auxiliary_tables(db)
        except Exception as sync_err:
            print(f"=== [SYNC AUX ERROR] {sync_err}")

        yield json.dumps({"status": "completed", "processed": processed_count, "total": total_rows}) + "\n"
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
        image_url=data.get('image_url', ''),
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
        sample.image_url = data['image_url']
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
    return False

def get_detail_suggestions(db: Session, detail_name: Optional[str] = None, parent_name: Optional[str] = None):
    """
    Lấy danh sách tất cả các tên chi tiết và tên thành phẩm duy nhất để hỗ trợ gợi ý autocomplete.
    Nếu có `detail_name`, chỉ lọc và trả về danh sách các Thành phẩm thực sự chứa chi tiết đó.
    Nếu có `parent_name`, chỉ trả về các tên chi tiết con của thành phẩm đó.
    """
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

    return {"detail_names": all_names, "parent_names": parent_suggestions, "parent_product_map": parent_product_map, "detail_stage_map": detail_stage_map, "detail_meta_map": detail_meta_map}

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


