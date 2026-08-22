from modules.inspection.models.input_inspection import InputInspection

def test_pending_inspections_and_confirmation(client, db_session):
    # 1. Tạo dữ liệu mẫu trong vòng 24 giờ qua (chưa xác nhận)
    now = datetime.now()
    
    # Phiếu đầu vào (IQC) chưa xác nhận trong 24h
    input_pending = InputInspection(
        plan_id=1,
        part_name="Nắp tủ",
        result="Đạt",
        is_confirmed=False,
        inspected_at=now - timedelta(hours=2)
    )
    # Phiếu công đoạn chưa xác nhận trong 24h
    stage_pending = InputInspection(
        inspection_type="dau-vao",
        batch_no="PO-12345",
        product_sku="SKU-ABC",
        conclusion="pass",
        is_confirmed=False,
        inspected_at=now - timedelta(hours=4)
    )
    
    # Phiếu đầu vào đã xác nhận (không được xuất hiện trong pending)
    input_confirmed = InputInspection(
        plan_id=1,
        part_name="Đế tủ",
        result="Đạt",
        is_confirmed=True,
        inspected_at=now - timedelta(hours=1)
    )
    
    # Phiếu công đoạn quá 24h (không được xuất hiện trong pending)
    stage_old = InputInspection(
        inspection_type="do-am",
        batch_no="PO-OLD",
        product_sku="SKU-OLD",
        conclusion="pass",
        is_confirmed=False,
        inspected_at=now - timedelta(hours=25)
    )

    db_session.add(input_pending)
    db_session.add(stage_pending)
    db_session.add(input_confirmed)
    db_session.add(stage_old)
    db_session.commit()

    db_session.refresh(input_pending)
    db_session.refresh(stage_pending)

    # 2. Gọi API lấy danh sách việc cần xử lý
    response = client.get("/api/v1/inspections/pending")
    assert response.status_code == 200
    pending_list = response.json()
    
    # Chỉ chứa 2 phiếu chưa xác nhận trong 24h
    assert len(pending_list) == 2
    
    # Kiểm tra thứ tự sắp xếp theo ngày ghi nhận giảm dần
    # Phiếu input_pending (created 2h ago) phải đứng trước stage_pending (created 4h ago)
    assert pending_list[0]["type"] == "input"
    assert pending_list[0]["id"] == input_pending.id
    assert pending_list[0]["stt"] == "01"
    
    assert pending_list[1]["type"] == "stage"
    assert pending_list[1]["id"] == stage_pending.id
    assert pending_list[1]["stt"] == "02"

    # 3. Gọi API xác nhận phiếu kiểm tra công đoạn
    confirm_res = client.post(
        f"/api/v1/inspections/confirm/stage/{stage_pending.id}",
        json={"confirmed_by": 99}
    )
    assert confirm_res.status_code == 200
    confirm_data = confirm_res.json()
    assert confirm_data["is_confirmed"] is True
    assert confirm_data["confirmed_by"] == 99

    # 4. Kiểm tra lại danh sách việc cần xử lý (chỉ còn lại 1 việc)
    response_after = client.get("/api/v1/inspections/pending")
    assert response_after.status_code == 200
    pending_list_after = response_after.json()
    assert len(pending_list_after) == 1
    assert pending_list_after[0]["id"] == input_pending.id
    assert pending_list_after[0]["stt"] == "01"
