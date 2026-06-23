import pandas as pd
import io
import json
import re
from sqlalchemy.orm import Session
from modules.master.models.master_product import MasterProduct
from modules.production.models.product import Product
from modules.production.models.bom_detail import BOMDetail
from modules.master.models.master_bom_detail import MasterBOMDetail
from modules.master.schemas.master_product import MasterProductCreate, MasterProductUpdate
from shared.utils.string_cleaner import clean_and_standardize_name, clean_and_standardize_sku

def to_master_product_dict(master: MasterProduct):
    if not master:
        return None
    return {
        "id": master.id,
        "sku": master.sku,
        "name": master.name,
        "category_id": master.category_id,
        "price": master.price,
        "material": master.material,
        "color": master.color,
        "length": master.length,
        "width": master.width,
        "height": master.height,
        "weight": master.weight,
        "status": master.status,
        "quantity": master.quantity,
        "unit": master.unit,
        "specification": master.specification,
        "description": master.description,
        "created_at": master.created_at,
        "master_bom_details": [b for b in master.master_bom_details if b.parent_id is None]
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
    data = master_product.model_dump(exclude={'master_bom_details'})
    if 'sku' in data:
        data['sku'] = clean_and_standardize_sku(data['sku'])
    if 'name' in data:
        data['name'] = clean_and_standardize_name(data['name'])
        
    bom_data_list = getattr(master_product, 'master_bom_details', [])
    db_master = MasterProduct(**data)
    db.add(db_master)
    db.flush() 

    def insert_bom_detail(bom_node, parent_id=None):
        node_data = bom_node.model_dump(exclude={'children'})
        if 'sku' in node_data:
            node_data['sku'] = clean_and_standardize_sku(node_data['sku'])
        if 'name' in node_data:
            node_data['name'] = clean_and_standardize_name(node_data['name'])
            
        db_node = MasterBOMDetail(
            **node_data,
            master_product_id=db_master.id,
            parent_id=parent_id
        )
        db.add(db_node)
        db.flush()
        for child_node in getattr(bom_node, 'children', []):
            insert_bom_detail(child_node, parent_id=db_node.id)

    for root_node in bom_data_list:
        insert_bom_detail(root_node)
    db.commit()
    db.refresh(db_master)
    return to_master_product_dict(db_master)

def update_master_product(db: Session, master_product_id: int, master_product: MasterProductUpdate):
    db_master = db.query(MasterProduct).filter(MasterProduct.id == master_product_id).first()
    if db_master:
        update_data = master_product.model_dump(exclude_unset=True)
        if 'sku' in update_data:
            update_data['sku'] = clean_and_standardize_sku(update_data['sku'])
        if 'name' in update_data:
            update_data['name'] = clean_and_standardize_name(update_data['name'])
        for key, value in update_data.items():
            setattr(db_master, key, value)
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

def get_stage_rank(stage_name):
    if not stage_name:
        return 0
    if "Định hình" in stage_name:
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

    df = pd.read_excel(io.BytesIO(file_content), header=0)
    total_rows_excel = len(df)
    print(f"=== [START IMPORT] Đang đọc file Excel: {total_rows_excel} dòng")
    yield json.dumps({"status": "reading", "total": total_rows_excel}) + "\n"
    
    headers = [str(h).strip().lower() for h in df.columns]
    def get_col_idx(names, default):
        for name in names:
            for i, h in enumerate(headers):
                if name == h: return i
        for name in names:
            for i, h in enumerate(headers):
                if name in h: return i
        return default

    idx_root_code = get_col_idx(['mã mặt hàng gốc'], 1)
    idx_root_name = get_col_idx(['tên mặt hàng gốc'], 2)
    idx_parent_code = get_col_idx(['mã mặt hàng'], 3)
    idx_parent_name = get_col_idx(['tên mặt hàng'], 4)
    idx_unit = get_col_idx(['đvt'], 5)
    idx_spec = get_col_idx(['quy cách'], 6)
    idx_child_code = get_col_idx(['mã chi tiết'], 7)
    idx_child_name = get_col_idx(['tên chi tiết'], 8)
    idx_child_unit = get_col_idx(['đvt chi tiết'], 9)
    idx_child_spec = get_col_idx(['quy cách chi tiết'], 10)
    idx_qty = get_col_idx(['số lượng'], 11)
    idx_waste = get_col_idx(['hao hụt'], 12)
    idx_desc = get_col_idx(['ghi chú', 'mô tả'], 14)
    idx_is_raw = get_col_idx(['vật tư thô'], 15)
    idx_exclude = get_col_idx(['loại trừ sản xuất', 'không sản xuất', 'loại trừ'], 13)
    idx_in_stage = get_col_idx(['công đoạn vào', 'cộng đoạn vào'], 17)
    idx_out_stage = get_col_idx(['công đoạn ra', 'cộng đoạn ra'], 18)

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
        
        all_child_codes.add(c_code_std)
        if p_code_std not in adj_list: adj_list[p_code_std] = []
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
            # Lấy danh sách ID của các sản phẩm gốc để xóa bảng con trước
            target_ids = db.query(MasterProduct.id).filter(MasterProduct.sku.in_(chunk)).all()
            target_ids = [r[0] for r in target_ids]
            
            if target_ids:
                # Xóa bảng con MasterBOMDetail trước (để tránh lỗi Foreign Key)
                db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id.in_(target_ids)).delete(synchronize_session=False)
                # Sau đó mới xóa bảng chính MasterProduct
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

    # Batch add and flush roots in chunks to update progress smoothly
    if db_roots:
        chunk_size = 2000
        for i in range(0, len(db_roots), chunk_size):
            chunk = db_roots[i:i + chunk_size]
            db.add_all(chunk)
            db.flush()
            processed_count += len(chunk)
            yield json.dumps({"status": "processing", "processed": processed_count, "total": total_rows}) + "\n"

    # 6. Global level-by-level BFS để chèn dữ liệu theo nhóm
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
            
            # Tự động chèn bản ghi chuyển tiếp nếu có khoảng trống công đoạn (e.g. Lắp ráp -> Sơn)
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
                            # Tự động trích xuất mã nhà máy (NM1, NM2...) và hậu tố (e.g. tủ 2, mặt tiền 2) từ tên công đoạn
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

                            # Hàm helper để lấy tên công đoạn chuẩn kèm mã nhà máy và hậu tố
                            def get_stage_name_by_rank(r):
                                base_stages = {
                                    1: "Định hình",
                                    2: "Lắp ráp",
                                    3: "Sơn",
                                    4: "Đóng gói"
                                }
                                base_name = base_stages.get(r, "")
                                if factory and base_name:
                                    res = f"{factory} - {base_name}"
                                    if suffix:
                                        res = f"{res} {suffix}"
                                    return res
                                return base_name

                            # Tạo các bản ghi chuyển tiếp qua từng bước công đoạn trung gian bị thiếu
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
                                    input_stage=in_stg,
                                    output_stage=out_stg,
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
                
                c_in_stage = clean_val(row[col_names[idx_in_stage]])
                c_out_stage = clean_val(row[col_names[idx_out_stage]])
                grandchild_parent_id = stage_bridge_parents.get(c_in_stage, p_db_id)

                obj = MasterBOMDetail(
                    master_product_id=db_root_id, parent_id=grandchild_parent_id,
                    sku=c_sku, name=c_name_std, unit=clean_val(row[col_names[idx_child_unit]]),
                    specification=c_spec, length=dl, width=dw, height=dh,
                    color=c_color,
                    quantity=float(row[col_names[idx_qty]]) if not pd.isna(row[col_names[idx_qty]]) else 1.0,
                    waste_ratio=float(row[col_names[idx_waste]]) if not pd.isna(row[col_names[idx_waste]]) else 0.0,
                    description=c_desc,
                    is_raw_material=to_bool(clean_val(row[col_names[idx_is_raw]])),
                    exclude_production=to_bool(clean_val(row[col_names[idx_exclude]])),
                    output_stage=c_in_stage,
                    input_stage=c_out_stage,
                    status="Active"
                )
                objects_to_add.append(obj)
                next_level.append((c_sku, obj, visited_skus | {c_sku}, db_root_id, root_color))

        # Batch insert cho cấp độ hiện tại theo từng chunk để cập nhật tiến độ liên tục
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
    yield json.dumps({"status": "completed", "processed": processed_count, "total": total_rows}) + "\n"
