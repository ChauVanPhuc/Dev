# -*- coding: utf-8 -*-
"""
Seeder: Khởi tạo 10.000 phiếu bàn giao luân chuyển sản xuất (deliveries) cho Tháng 6 và Tháng 7/2026.
Phân bổ chính xác:
- 5.000 phiếu cho Tháng 6/2026 (Plan ID 1)
- 5.000 phiếu cho Tháng 7/2026 (Plan ID 2)
- Tỷ lệ trả lại theo công đoạn: Định hình 5%, Lắp Ráp 30%, Sơn 30%, Đóng gói 20%, Final 5%, Khác 10%
- Tỷ lệ lỗi mắc phải: Nứt tét 25%, Không đồng màu 20%, Lệch màu 15%, Cong vênh 10%, Lỗi khác 30%
- Gán tài khoản QLCL thực tế theo từng Nhà máy (1, 2, 3)
"""

import sys
import os
import random
from datetime import datetime, timedelta

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

import app.models  # Ensures all ORM models are registered
from config.database import SessionLocal
from sqlalchemy import text
from modules.delivery.models.deliveries import Delivery
from modules.delivery.models.order import Order
from modules.production.models.bom_detail import BOMDetail
from modules.production.models.product import Product

def generate_random_time(start_date, end_date):
    """Tạo thời gian ngẫu nhiên trong giờ làm việc (07:30 - 17:30) của các ngày làm việc."""
    current = start_date + timedelta(days=random.randint(0, (end_date - start_date).days))
    # Nếu rơi vào Chủ nhật (weekday = 6), lùi sang thứ 2
    if current.weekday() == 6:
        current += timedelta(days=1)
    
    hour = random.randint(7, 17)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    return datetime(current.year, current.month, current.day, hour, minute, second)

def run_seeder():
    db = SessionLocal()
    try:
        print("=== BẮT ĐẦU NẠP 10.000 PHIẾU BÀN GIAO LUÂN CHUYỂN (DELIVERIES) ===")
        
        # 1. Danh sách tài khoản thực tế theo nhà máy
        factory_accounts = {
            1: [28, 36, 43],          # PX1: thanh.hd, tien.nv, toan.dv
            2: [29, 30, 31, 32, 34, 35, 39, 41], # PX2: tam.dt, son.hh, khan.hs, luong.pt, mai.pt, kim.ntm, tuan.dm, su.bc
            3: [33, 40, 42]           # PX3: phuc.dh, anh.tt, phuong.nt
        }
        fallback_accs = [28, 29, 33]

        # 2. Truy vấn danh sách Orders theo Plan
        plan1_orders = db.query(Order).filter(Order.plan_id == 1).all()
        plan2_orders = db.query(Order).filter(Order.plan_id == 2).all()

        if not plan1_orders or not plan2_orders:
            print("[LỖI] Không tìm thấy đơn hàng cho Plan 1 hoặc Plan 2.")
            return

        # Cache danh sách BOM / Products theo Order ID
        order_details_cache = {}
        all_orders = plan1_orders + plan2_orders
        for o in all_orders:
            product_ids = [p.id for p in o.products] if o.products else []
            boms = db.query(BOMDetail).filter(BOMDetail.product_id.in_(product_ids)).all() if product_ids else []
            
            parts = []
            if boms:
                for b in boms:
                    parts.append({
                        "part_name": b.name or b.sku or "Chi tiết",
                        "specification": b.specification or "Tiêu chuẩn"
                    })
            elif o.products:
                for p in o.products:
                    parts.append({
                        "part_name": p.name or p.sku or "Sản phẩm",
                        "specification": p.sku or "Tiêu chuẩn"
                    })
            else:
                parts.append({
                    "part_name": "Tấm khung chính",
                    "specification": "18 x 400 x 600 mm"
                })
            order_details_cache[o.id] = parts

        # 3. Định nghĩa mô hình Tỷ lệ trả lại theo Công đoạn
        # Tỷ lệ: Định hình 5%, Lắp Ráp 30%, Sơn 30%, Đóng gói 20%, Final 5%, Khác 10%
        stage_return_weights = [
            ("Lắp Ráp", "Định Hình 1", "Lắp Ráp 1", 30),
            ("Sơn", "Lắp Ráp 1", "Sơn 1", 30),
            ("Đóng Gói", "Sơn 1", "Đóng Gói 1", 20),
            ("Khác", "Nhập Kho 1", "Tạo Phôi 1", 10),
            ("Định Hình", "Tạo Phôi 1", "Định Hình 1", 5),
            ("Final", "Đóng Gói 1", "Lưu Kho 1", 5)
        ]
        
        stages_population = []
        for stage_key, del_st, rec_st, weight in stage_return_weights:
            stages_population.extend([(stage_key, del_st, rec_st)] * weight)

        # 4. Định nghĩa mô hình Tỷ lệ Loại Lỗi
        # Nứt tét 25%, Không đồng màu 20%, Lệch màu 15%, Cong vênh 10%, Lỗi khác 30%
        other_defects = [
            "Trầy xước bề mặt", "Chảy sơn màng", "Bong tróc sơn", "Bụi sơn bám", 
            "Cấn móp góc", "Sứt mẻ cạnh", "Lắp ráp lệch khung", "Lồi đinh mặt",
            "Phồng rộp ván", "Lỗ kim bề mặt"
        ]
        
        defect_weights = (
            ["Nứt tét"] * 25 +
            ["Không đồng màu"] * 20 +
            ["Lệch màu"] * 15 +
            ["Cong vênh"] * 10 +
            other_defects * 3  # 10 * 3 = 30%
        )

        # 5. Xóa dữ liệu cũ nếu có để nạp mới hoàn toàn
        deleted_cnt = db.query(Delivery).delete()
        db.commit()
        print(f"[THÔNG BÁO] Đã dọn dẹp {deleted_cnt} bản ghi cũ trong bảng deliveries.")

        # 6. Khởi tạo 10.000 phiếu bàn giao
        total_target = 10000
        per_month_target = 5000
        overall_return_rate = 0.15  # 15% tổng số phiếu sẽ bị Trả lại (1.500 phiếu)

        deliveries_to_insert = []
        
        # Tháng 6 (Plan ID 1)
        june_start = datetime(2026, 6, 1)
        june_end = datetime(2026, 6, 30)

        # Tháng 7 (Plan ID 2)
        july_start = datetime(2026, 7, 1)
        july_end = datetime(2026, 7, 31)

        months_config = [
            (1, plan1_orders, june_start, june_end, per_month_target),
            (2, plan2_orders, july_start, july_end, per_month_target)
        ]

        inserted_count = 0

        for plan_id, orders_list, start_d, end_d, count_target in months_config:
            print(f"--- Đang sinh dữ liệu cho Plan {plan_id} ({count_target} phiếu)... ---")
            
            for i in range(count_target):
                order = random.choice(orders_list)
                parts = order_details_cache.get(order.id, [{"part_name": "Chi tiết", "specification": "Tiêu chuẩn"}])
                part = random.choice(parts)

                # Chọn Nhà máy (PX1, PX2, PX3)
                factory_id = random.choices([1, 2, 3], weights=[40, 35, 25])[0]
                accs = factory_accounts.get(factory_id, fallback_accs)
                
                sx_del_user = random.choice(accs)
                sx_rec_user = random.choice(accs)
                qc_rec_user = random.choice(accs)

                # Quyết định phiếu có bị Trả lại hay Hoàn thành
                is_returned = (random.random() < overall_return_rate)

                if is_returned:
                    # Lấy luân chuyển công đoạn theo tỷ lệ trả lại
                    stage_key, del_stage, rec_stage = random.choice(stages_population)
                    # Lấy loại lỗi theo tỷ lệ
                    defect_name = random.choice(defect_weights)
                    
                    status = "Trả lại"
                    qty_total = random.randint(50, 500)
                    qty_returned = random.randint(5, int(qty_total * 0.4))  # Trả lại 5-40% số lượng
                    qty_error = qty_returned
                    qty_received = qty_total - qty_returned
                    note = f"Trả lại do phát sinh lỗi: {defect_name}. Yêu cầu khắc phục công đoạn {del_stage}."
                else:
                    # Phiếu hoàn thành bình thường
                    stages_normal = [
                        ("Tạo Phôi 1", "Định Hình 1"),
                        ("Định Hình 1", "Lắp Ráp 1"),
                        ("Lắp Ráp 1", "Sơn 1"),
                        ("Sơn 1", "Đóng Gói 1"),
                        ("Đóng Gói 1", "Lưu Kho 1")
                    ]
                    del_stage, rec_stage = random.choice(stages_normal)
                    status = "Hoàn thành"
                    qty_total = random.randint(50, 500)
                    qty_returned = 0
                    qty_error = 0
                    qty_received = qty_total
                    note = "Bàn giao sản xuất hoàn tất đạt chất lượng QC."

                created_time = generate_random_time(start_d, end_d)

                deliveries_to_insert.append({
                    "plan_id": plan_id,
                    "order_id": order.id,
                    "part_name": part["part_name"],
                    "specification": part["specification"],
                    "delivery_stage": del_stage,
                    "receiving_stage": rec_stage,
                    "quantity_total": qty_total,
                    "quantity_received": qty_received,
                    "quantity_error": qty_error,
                    "quantity_returned": qty_returned,
                    "quantity_inspection": qty_total,
                    "status": status,
                    "sx_delivery": sx_del_user,
                    "sx_receipt": sx_rec_user,
                    "qc_receipt": qc_rec_user,
                    "created_at": created_time,
                    "note": note,
                    "moisture_min": round(random.uniform(9.5, 10.5), 1),
                    "moisture_max": round(random.uniform(11.5, 12.5), 1)
                })

                if len(deliveries_to_insert) >= 1000:
                    db.bulk_insert_mappings(Delivery, deliveries_to_insert)
                    db.commit()
                    inserted_count += len(deliveries_to_insert)
                    print(f" -> Đã nạp thành công {inserted_count} / {total_target} bản ghi...")
                    deliveries_to_insert = []

        if deliveries_to_insert:
            db.bulk_insert_mappings(Delivery, deliveries_to_insert)
            db.commit()
            inserted_count += len(deliveries_to_insert)

        print(f"\n[THÀNH CÔNG RỰC RỠ] ĐÃ NẠP TỔNG CỘNG {inserted_count} PHIẾU BÀN GIAO VÀO CSDL!")

    except Exception as e:
        db.rollback()
        print(f"[LỖI SEEDER] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_seeder()
