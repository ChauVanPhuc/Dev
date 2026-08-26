import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.append('.')
from config.database import engine
from sqlalchemy import text

print("=" * 80)
print("TIẾN HÀNH XÓA CÁC PHIẾU KIỂM TRA & BÀN GIAO THÁNG 8/2026")
print("=" * 80)

with engine.connect() as conn:
    # 1. Xóa các phiếu bàn giao deliveries tháng 8 (IDs: 20043, 20044, 20045 và các bản ghi tháng 8)
    # Kiểm tra các bảng con liên kết với deliveries
    try:
        # Xóa delivery_details liên quan
        d_details = conn.execute(text("DELETE FROM delivery_details WHERE delivery_id IN (SELECT id FROM deliveries WHERE MONTH(created_at) = 8 AND YEAR(created_at) = 2026)")).rowcount
        print(f"-> Đã xóa {d_details} dòng trong delivery_details")
    except Exception as e:
        print(f"delivery_details: {e}")

    try:
        # Xóa delivery_images liên quan
        d_images = conn.execute(text("DELETE FROM delivery_images WHERE delivery_id IN (SELECT id FROM deliveries WHERE MONTH(created_at) = 8 AND YEAR(created_at) = 2026)")).rowcount
        print(f"-> Đã xóa {d_images} dòng trong delivery_images")
    except Exception as e:
        print(f"delivery_images: {e}")

    try:
        # Xóa deliveries chính
        d_main = conn.execute(text("DELETE FROM deliveries WHERE MONTH(created_at) = 8 AND YEAR(created_at) = 2026")).rowcount
        print(f"✅ ĐÃ XÓA THÀNH CÔNG {d_main} PHIẾU BÀN GIAO CÔNG ĐOẠN (deliveries) trong Tháng 8/2026.")
    except Exception as e:
        print(f"❌ Lỗi xóa deliveries: {e}")

    # 2. Xóa các phiếu kiểm tra input_inspections tháng 8 (IDs: 507 -> 518)
    try:
        # Xóa input_inspections
        insp_main = conn.execute(text("DELETE FROM input_inspections WHERE (inspected_at IS NOT NULL AND MONTH(inspected_at) = 8 AND YEAR(inspected_at) = 2026) OR (created_at IS NOT NULL AND MONTH(created_at) = 8 AND YEAR(created_at) = 2026)")).rowcount
        print(f"✅ ĐÃ XÓA THÀNH CÔNG {insp_main} PHIẾU KIỂM TRA ĐẦU VÀO/CÔNG ĐOẠN (input_inspections) trong Tháng 8/2026.")
    except Exception as e:
        print(f"❌ Lỗi xóa input_inspections: {e}")

    conn.commit()

print("\n" + "=" * 80)
print("XÁC NHẬN LẠI DỮ LIỆU SAU KHI XÓA:")
print("=" * 80)

with engine.connect() as conn:
    remain_insp = conn.execute(text("SELECT COUNT(*) FROM input_inspections WHERE MONTH(inspected_at) = 8 AND YEAR(inspected_at) = 2026")).scalar()
    remain_deliv = conn.execute(text("SELECT COUNT(*) FROM deliveries WHERE MONTH(created_at) = 8 AND YEAR(created_at) = 2026")).scalar()
    print(f"Số phiếu kiểm tra tháng 8 còn lại: {remain_insp}")
    print(f"Số phiếu bàn giao tháng 8 còn lại: {remain_deliv}")

print("=" * 80)
