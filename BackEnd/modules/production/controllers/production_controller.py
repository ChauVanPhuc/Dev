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

                db_product = Product(
                    order_id=db_order.id, sku=sku,
                    name=clean_val(row[col_names[idxs['name']]]) if idxs['name'] != -1 else sku,
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
                    specification=m_prod.specification if m_prod else None
                )
                db.add(db_product)
                db.flush()
                if m_prod:
                    if m_prod.id not in master_bom_cache:
                        m_details = db.query(MasterBOMDetail).filter(MasterBOMDetail.master_product_id == m_prod.id).all()
                        
                        roots = []
                        children_map = {}
                        for item in m_details:
                            if item.parent_id is None: roots.append(item)
                            else:
                                if item.parent_id not in children_map: children_map[item.parent_id] = []
                                children_map[item.parent_id].append(item)
                        master_bom_cache[m_prod.id] = (roots, children_map)
                    
                    roots, children_map = master_bom_cache[m_prod.id]
                            
                    def clone_node(m_item, new_p_id=None):
                        new_bom = BOMDetail(
                            product_id=db_product.id, parent_id=new_p_id,
                            sku=m_item.sku, name=m_item.name, unit=m_item.unit,
                            specification=m_item.specification, length=m_item.length,
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
