import pytest
from sqlalchemy import text

def test_check_sql_server_compatibility(db_session):
    """KIỂM TRA: Độ tương thích của SQL Server với các hàm mới (COALESCE)"""
    # Thử chạy một câu lệnh SQL Server thực tế để xem COALESCE hoạt động đúng không
    result = db_session.execute(text("SELECT COALESCE(NULL, 'OK')")).scalar()
    assert result == 'OK'

def test_scan_for_invalid_quantities(db_session):
    """KIỂM TRA: Quét toàn bộ bảng Deliveries xem có số lượng âm không"""
    # Tìm bất kỳ phiếu giao hàng nào có số lượng <= 0 (Dữ liệu rác)
    invalid_deliveries = db_session.execute(text("SELECT id FROM deliveries WHERE quantity_total <= 0")).fetchall()
    
    if invalid_deliveries:
        pytest.fail(f"PHÁT HIỆN DỮ LIỆU LỖI: Có {len(invalid_deliveries)} phiếu giao hàng có số lượng <= 0!")

def test_unicode_support_check(db_session):
    """KIỂM TRA: Khả năng hiển thị Tiếng Việt có dấu trong Database"""
    is_sqlite = db_session.bind.dialect.name == 'sqlite'
    
    if is_sqlite:
        sql = "SELECT part_name FROM deliveries WHERE part_name LIKE '%án%' LIMIT 1"
    else:
        sql = "SELECT TOP 1 part_name FROM deliveries WHERE part_name LIKE N'%án%'"
        
    result = db_session.execute(text(sql)).scalar()
    if result:
        print(f"Kiểm tra Unicode thành công: {result}")
    else:
        print("Cảnh báo: Không tìm thấy dữ liệu Tiếng Việt trong bảng Deliveries.")

def test_check_orphan_records(db_session):
    """KIỂM TRA: Các bản ghi mồ côi (không có Plan_id hợp lệ)"""
    orphans = db_session.execute(text("SELECT id FROM deliveries WHERE plan_id NOT IN (SELECT id FROM product_plans)")).fetchall()
    if orphans:
        print(f"Cảnh báo: Phát hiện {len(orphans)} phiếu giao hàng không thuộc bất kỳ Kế hoạch nào!")
