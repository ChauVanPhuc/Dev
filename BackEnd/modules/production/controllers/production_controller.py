import pandas as pd
import json
import re
import io
from datetime import datetime
from sqlalchemy.orm import Session
from modules.production.models.product_plan import ProductPlan
from modules.delivery.models.order import Order
from modules.production.models.product import Product
from modules.production.models.bom_detail import BOMDetail
from modules.master.models.master_product import MasterProduct
from modules.master.models.master_bom_detail import MasterBOMDetail

def parse_date(date_val):
    if pd.isna(date_val): return None
    if isinstance(date_val, datetime): return date_val
    try: return pd.to_datetime(date_val)
    except: return None

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

def clean_val(val):
    if pd.isna(val): return None
    if isinstance(val, str):
        val = val.strip()
        return val if val else None
    return str(val).strip()

def import_production_plan_from_excel(file_path: str, db: Session):
    try:
        df_raw = pd.read_excel(file_path, header=None)
        
        # 1. Tìm tiêu đề KHSX
        plan_title = "KẾ HOẠCH SẢN XUẤT"
        for i in range(10):
            val = clean_val(df_raw.iloc[i, 0])
            if val and "KẾ HOẠCH SẢN XUẤT" in val.upper():
                plan_title = val
                break
            
        month, year = None, None
        est_date, fin_date = None, None
        date_matches = re.findall(r"(\d{2}/\d{2}/\d{4})", plan_title)
        if date_matches:
            est_date = datetime.strptime(date_matches[0], "%d/%m/%Y")
            if len(date_matches) > 1:
                fin_date = datetime.strptime(date_matches[1], "%d/%m/%Y")
            month = est_date.month
            year = est_date.year
            
        plan_display_name = f"KHSX T{month} - {year}" if month and year else (f"KHSX T{month}" if month else plan_title)
        plan_code = f"KHSX_{month:02d}_{year}" if month and year else f"KHSX_{datetime.now().strftime('%m%Y_%H%M%S')}"
        
        db_plan = db.query(ProductPlan).filter(ProductPlan.code == plan_code).first()
        if not db_plan:
            db_plan = ProductPlan(
                code=plan_code, name=plan_display_name, month=month, year=year,
                estimated_date=est_date, finished_date=fin_date, status=1
            )
            db.add(db_plan)
            db.flush()
        else:
            db_plan.name = plan_display_name
            db_plan.estimated_date = est_date
            db_plan.finished_date = fin_date
            db.flush()
            
        header_row_idx = -1
        for i, row in df_raw.iterrows():
            row_str = " ".join([str(x).lower() for x in row if not pd.isna(x)])
            if "lệnh sx" in row_str and "mã đơn hàng" in row_str:
                header_row_idx = i
                break
                
        if header_row_idx == -1:
            yield json.dumps({"status": "error", "message": "Không tìm thấy dòng tiêu đề bảng."}) + "\n"
            return
            
        df = pd.read_excel(file_path, header=header_row_idx)
        headers = [str(h).strip().lower() for h in df.columns]
        col_names = df.columns.tolist()

        def get_col(names):
            for name in names:
                for i, h in enumerate(headers):
                    if name == h: return i
            for name in names:
                for i, h in enumerate(headers):
                    if name in h: return i
            return -1

        idxs = {
            'prod_order': get_col(['lệnh sx']),
            'sales_order': get_col(['mã đơn hàng']),
            'po': get_col(['số po đối tác']),
            'cus_code': get_col(['mã kh']),
            'cus_name': get_col(['tên kh']),
            'sku': get_col(['mã sp']),
            'name': get_col(['tên sp']),
            'unit': get_col(['đvt']),
            'order_qty': get_col(['s.lg đ.hàng']),
            'prod_qty': get_col(['vào lệnh']),
            'loss_qty': get_col(['bù hao']),
            'total_qty': get_col(['tổng s.lg']),
            'net_weight': get_col(['tổng kl tinh']),
            'price': get_col(['đơn giá']),
            'foreign': get_col(['t.tiền n.tệ']),
            'vnd': get_col(['t.tiền vnđ']),
            'voucher_date': get_col(['ngày chứng từ']),
            'start_date': get_col(['bắt đầu']),
            'end_white': get_col(['k.thúc h.trắng']),
            'end': get_col(['k.thúc', 'ngày giao'])
        }

        df_records = df.to_dict('records')
        total_rows = len(df_records)
        processed = 0

        # Thu thập các mã đơn hàng từ file Excel mới
        excel_order_codes = set()
        for row in df_records:
            sales_order_code = clean_val(row[col_names[idxs['sales_order']]]) if idxs['sales_order'] != -1 else None
            if sales_order_code:
                excel_order_codes.add(sales_order_code)

        # Xóa các đơn hàng cũ của KHSX này không có trong file Excel mới
        if db_plan.id:
            if excel_order_codes:
                orders_to_delete = db.query(Order).filter(
                    Order.plan_id == db_plan.id,
                    ~Order.order_code.in_(excel_order_codes)
                ).all()
            else:
                orders_to_delete = db.query(Order).filter(
                    Order.plan_id == db_plan.id
                ).all()
            if orders_to_delete:
                from modules.delivery.models.deliveries import Delivery
                from modules.delivery.models.delivery_details import DeliveryDetails
                for order in orders_to_delete:
                    # Gỡ liên kết với Delivery và DeliveryDetails để tránh lỗi khóa ngoại
                    db.query(Delivery).filter(Delivery.order_id == order.id).update({Delivery.order_id: None})
                    db.query(DeliveryDetails).filter(DeliveryDetails.order_id == order.id).update({DeliveryDetails.order_id: None})
                    db.delete(order)
            db.flush()
        
        # Cache for Master Data to avoid repeated queries
        master_product_cache = {}
        master_bom_cache = {}

        for row in df_records:
            sales_order_code = clean_val(row[col_names[idxs['sales_order']]]) if idxs['sales_order'] != -1 else None
            prod_order_code = clean_val(row[col_names[idxs['prod_order']]]) if idxs['prod_order'] != -1 else None
            sku = clean_val(row[col_names[idxs['sku']]]) if idxs['sku'] != -1 else None
            
            if not sales_order_code or not sku:
                processed += 1
                continue
                
            db_order = db.query(Order).filter(Order.order_code == sales_order_code, Order.plan_id == db_plan.id).first()
            if not db_order:
                db_order = Order(
                    plan_id=db_plan.id, order_code=sales_order_code, production_code=prod_order_code,
                    partner_po=clean_val(row[col_names[idxs['po']]]) if idxs['po'] != -1 else None,
                    customer_code=clean_val(row[col_names[idxs['cus_code']]]) if idxs['cus_code'] != -1 else None,
                    customer=clean_val(row[col_names[idxs['cus_name']]]) if idxs['cus_name'] != -1 else None,
                    voucher_date=parse_date(row[col_names[idxs['voucher_date']]]) if idxs['voucher_date'] != -1 else None,
                    start_date=parse_date(row[col_names[idxs['start_date']]]) if idxs['start_date'] != -1 else None,
                    end_white_date=parse_date(row[col_names[idxs['end_white']]]) if idxs['end_white'] != -1 else None,
                    estimated_date=parse_date(row[col_names[idxs['end']]]) if idxs['end'] != -1 else None,
                )
                db.add(db_order)
                db.flush()
            else:
                db_order.production_code = prod_order_code
                db.flush()

            db_product = db.query(Product).filter(Product.order_id == db_order.id, Product.sku == sku).first()
            if not db_product:
                def get_num(key):
                    idx = idxs[key]
                    if idx == -1: return 0.0
                    val = row[col_names[idx]]
                    try: return float(val) if not pd.isna(val) else 0.0
                    except: return 0.0

                # Fetch master product to clone details
                if sku not in master_product_cache:
                    master_product_cache[sku] = db.query(MasterProduct).filter(MasterProduct.sku == sku).first()
                
                m_prod = master_product_cache[sku]

                prod_name_val = clean_val(row[col_names[idxs['name']]]) if idxs['name'] != -1 else sku
                prod_spec_val = resolve_clean_spec(
                    m_prod.specification if m_prod else None,
                    name=prod_name_val,
                    sku=sku,
                    length=m_prod.length if m_prod else 0.0,
                    width=m_prod.width if m_prod else 0.0,
                    height=m_prod.height if m_prod else 0.0
                )

                db_product = Product(
                    order_id=db_order.id, sku=sku,
                    name=prod_name_val,
                    unit=clean_val(row[col_names[idxs['unit']]]) if idxs['unit'] != -1 else "Bộ",
                    order_qty=get_num('order_qty'), production_qty=get_num('prod_qty'),
                    loss_qty=get_num('loss_qty'), total_qty=get_num('total_qty'),
                    quantity=get_num('total_qty'), net_weight=get_num('net_weight'),
                    price=get_num('price'), total_foreign_currency=get_num('foreign'),
                    total_vnd=get_num('vnd'),
                    color=m_prod.color if m_prod else None,
                    material=m_prod.material if m_prod else None,
                    length=m_prod.length if m_prod else 0.0,
                    width=m_prod.width if m_prod else 0.0,
                    height=m_prod.height if m_prod else 0.0,
                    specification=prod_spec_val
                )
                db.add(db_product)
                db.flush()
                if m_prod:
                    if m_prod.id not in master_bom_cache:
                        m_details = db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == m_prod.id).all()
                        
                        roots = []
                        children_map = {}
                        valid_specs_by_name = {}
                        valid_specs_by_sku = {}
                        for item in m_details:
                            it_spec = (item.specification or "").strip()
                            if it_spec and not is_invalid_spec(it_spec):
                                if item.name:
                                    c_it_name = " ".join(item.name.strip().lower().split())
                                    if c_it_name and c_it_name not in valid_specs_by_name:
                                        valid_specs_by_name[c_it_name] = it_spec
                                if item.sku:
                                    c_it_sku = item.sku.strip().lower()
                                    if c_it_sku and c_it_sku not in valid_specs_by_sku:
                                        valid_specs_by_sku[c_it_sku] = it_spec

                            if item.parent_id is None: roots.append(item)
                            else:
                                if item.parent_id not in children_map: children_map[item.parent_id] = []
                                children_map[item.parent_id].append(item)
                        master_bom_cache[m_prod.id] = (roots, children_map, valid_specs_by_name, valid_specs_by_sku)
                    
                    roots, children_map, valid_specs_by_name, valid_specs_by_sku = master_bom_cache[m_prod.id]
                            
                    def clone_node(m_item, new_p_id=None):
                        resolved_spec = resolve_clean_spec(
                            m_item.specification,
                            name=m_item.name,
                            sku=m_item.sku,
                            length=m_item.length,
                            width=m_item.width,
                            height=m_item.height,
                            valid_specs_by_name=valid_specs_by_name,
                            valid_specs_by_sku=valid_specs_by_sku,
                            fallback_spec=db_product.specification
                        )
                        new_bom = BOMDetail(
                            product_id=db_product.id, parent_id=new_p_id,
                            sku=m_item.sku, name=m_item.name, unit=m_item.unit,
                            specification=resolved_spec, length=m_item.length,
                            width=m_item.width, height=m_item.height,
                            quantity=m_item.quantity, waste_ratio=m_item.waste_ratio,
                            description=m_item.description, is_raw_material=m_item.is_raw_material,
                            exclude_production=m_item.exclude_production,
                            input_stage=m_item.input_stage, output_stage=m_item.output_stage,
                            status=m_item.status
                        )
                        db.add(new_bom)
                        db.flush()
                        for child in children_map.get(m_item.id, []):
                            clone_node(child, new_p_id=new_bom.id)

                    for root in roots: clone_node(root)
                        
            processed += 1
            if processed % 10 == 0:
                yield json.dumps({"status": "processing", "processed": processed, "total": total_rows}) + "\n"

        db.commit()
        yield json.dumps({"status": "completed", "processed": processed, "total": total_rows, "plan_code": db_plan.code}) + "\n"
        
    except Exception as e:
        db.rollback()
        print(f"ERROR: {str(e)}")
        yield json.dumps({"status": "error", "message": str(e)}) + "\n"

def get_all_production_plans(db: Session):
    return db.query(ProductPlan).order_by(ProductPlan.id.desc()).all()

def get_production_plan_detail(plan_id: int, db: Session):
    return db.query(ProductPlan).filter(ProductPlan.id == plan_id).first()
