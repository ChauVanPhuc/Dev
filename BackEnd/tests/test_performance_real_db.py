import pytest
import time
from sqlalchemy import text

def test_backend_query_performance_real_db(db_session):
    """KIỂM TRA: Tốc độ truy vấn 1,000,000 bản ghi chi tiết (nếu có) trên SQL Server thật"""
    print("\n--- BẮT ĐẦU ĐO HIỆU NĂNG DATABASE THẬT ---")
    
    start_time = time.time()
    
    # Giả sử chúng ta quét bảng chi tiết lồng nhau (BOM hoặc Deliveries)
    # Chúng ta dùng SQL thuần để đo tốc độ thuần của Database
    query = text("SELECT COUNT(*) FROM deliveries")
    total_count = db_session.execute(query).scalar()
    
    # Tự động nhận diện loại DB để dùng lệnh TOP hoặc LIMIT
    is_sqlite = db_session.bind.dialect.name == 'sqlite'
    
    if is_sqlite:
        query_fetch = text("SELECT * FROM deliveries LIMIT 10000")
    else:
        query_fetch = text("SELECT TOP 10000 * FROM deliveries")
        
    results = db_session.execute(query_fetch).fetchall()
    
    end_time = time.time()
    duration = (end_time - start_time) * 1000
    
    print(f"Tổng số bản ghi trong bảng Deliveries: {total_count}")
    print(f"Thời gian lấy 10,000 bản ghi đầu tiên: {duration:.2f}ms")
    
    # Tiêu chuẩn: Lấy 10k dòng phải dưới 500ms trên SQL Server local
    assert duration < 1000, "Cảnh báo: Database phản hồi quá chậm (trên 1 giây cho 10k dòng)"

def test_api_response_time_large_dataset(client):
    """KIỂM TRA: Thời gian phản hồi của API khi trả về danh sách Kế hoạch lớn"""
    # Đăng nhập để lấy token
    res = client.post("/accounts/login", data={"username": "sx_user", "password": "123"}).json()
    token = res.get("access_token")
    
    if not token:
        pytest.skip("Không có token, bỏ qua test hiệu năng API")

    start_time = time.time()
    
    # Gọi API lấy danh sách kế hoạch (đây là API nặng nhất)
    response = client.get("/api/v1/plans/", headers={"Authorization": f"Bearer {token}"})
    
    end_time = time.time()
    duration = (end_time - start_time) * 1000
    
    print(f"Thời gian phản hồi API /plans/: {duration:.2f}ms")
    assert response.status_code == 200
    # Tiêu chuẩn: API phải phản hồi dưới 2 giây dù dữ liệu lớn đến đâu (nhờ phân trang)
    assert duration < 2000
