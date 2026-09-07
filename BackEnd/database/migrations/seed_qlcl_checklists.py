# -*- coding: utf-8 -*-
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')

# Thêm đường dẫn BackEnd vào sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import text
from config.database import engine, SessionLocal
import app.models
from modules.kpi.models.kpi_management import KPIChecklist, KPIChecklistPool

def seed_qlcl_checklists():
    print("[MIGRATION] Bắt đầu đồng bộ danh mục CheckList công việc QLCL...")
    
    # 1. Thêm cột department_code vào bảng kpi_checklists & kpi_checklist_pool nếu chưa có
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE kpi_checklists ADD department_code NVARCHAR(50) NULL"))
            print("[MIGRATION] Đã thêm cột 'department_code' vào bảng kpi_checklists.")
        except Exception:
            pass
        
        try:
            conn.execute(text("ALTER TABLE kpi_checklist_pool ADD department_code NVARCHAR(50) NULL"))
            print("[MIGRATION] Đã thêm cột 'department_code' vào bảng kpi_checklist_pool.")
        except Exception:
            pass

    db = SessionLocal()
    try:
        # Danh mục Checklist chuẩn của 11 Bộ phận QLCL từ Cẩm nang 2026
        checklists_data = [
            # MANAGER (Trưởng phòng QLCL)
            {"department_code": "MANAGER", "task_code": "CL-MGR-01", "content": "Phê duyệt tiêu chuẩn, quy trình & mục tiêu chất lượng toàn nhà máy", "frequency": "Hàng tháng", "status_today": "Đã hoàn thành", "result": "Đạt yêu cầu"},
            {"department_code": "MANAGER", "task_code": "CL-MGR-02", "content": "Chủ trì xử lý các sự cố chất lượng nghiêm trọng cấp toàn nhà máy", "frequency": "Khi phát sinh", "status_today": "Đang thực hiện", "result": "Theo dõi tiến độ"},
            {"department_code": "MANAGER", "task_code": "CL-MGR-03", "content": "Đánh giá hiệu quả công việc & xem xét chỉ số KPI hàng tháng nhân sự QLCL", "frequency": "Hàng tháng", "status_today": "Chưa làm", "result": "Đang cập nhật"},

            # QA (Quality Assurance - Control QA)
            {"department_code": "QA", "task_code": "CL-QA-01", "content": "Soạn thảo, cập nhật và ban hành các tài liệu quy trình chuẩn (CTQ/SOS)", "frequency": "Hàng tuần", "status_today": "Đã hoàn thành", "result": "Đầy đủ biên bản"},
            {"department_code": "QA", "task_code": "CL-QA-02", "content": "Đi tuần tra, đánh giá (Audit) việc tuân thủ quy trình tại các xưởng sản xuất", "frequency": "Hàng ngày", "status_today": "Đang thực hiện", "result": "Đạt 95% tuân thủ"},
            {"department_code": "QA", "task_code": "CL-QA-03", "content": "Phân tích nguyên nhân gốc (RCA) & theo dõi hành động khắc phục CAPA", "frequency": "Hàng tuần", "status_today": "Chưa làm", "result": "Chờ báo cáo xưởng"},

            # CQA (Customer QA)
            {"department_code": "CQA", "task_code": "CL-CQA-01", "content": "Tiếp nhận, phân tích & phản hồi khiếu nại chất lượng từ phía khách hàng", "frequency": "Khi phát sinh", "status_today": "Đã hoàn thành", "result": "Phản hồi trong 24h"},
            {"department_code": "CQA", "task_code": "CL-CQA-02", "content": "Lập báo cáo khắc phục 8D/CAPA và điều phối tiếp các đoàn Audit khách hàng", "frequency": "Theo lịch", "status_today": "Chưa làm", "result": "Đã chuẩn bị hồ sơ"},

            # QSE (Quality System Engineer)
            {"department_code": "QSE", "task_code": "CL-QSE-01", "content": "Thiết lập, duy trì & kiểm tra tuân thủ hệ thống ISO 9001, 5S, FSC toàn nhà máy", "frequency": "Hàng tuần", "status_today": "Đã hoàn thành", "result": "Đạt điểm 5S >90%"},
            {"department_code": "QSE", "task_code": "CL-QSE-02", "content": "Lập kế hoạch & thực hiện đánh giá (Audit) nội bộ định kỳ các bộ phận", "frequency": "Hàng tháng", "status_today": "Chưa làm", "result": "Đã phát hành lịch"},
            {"department_code": "QSE", "task_code": "CL-QSE-03", "content": "Tổ chức đào tạo nhận thức chất lượng & quy trình 5S cho công nhân mới", "frequency": "Hàng tháng", "status_today": "Đang thực hiện", "result": "25 công nhân tham gia"},

            # QA_ADMIN (Quản lý Tài liệu & Thiết bị)
            {"department_code": "QA_ADMIN", "task_code": "CL-ADM-01", "content": "Quản lý lưu trữ, đóng dấu, cấp phát bản vẽ/tài liệu mới & thu hồi tài liệu cũ", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Cấp phát đúng quy trình"},
            {"department_code": "QA_ADMIN", "task_code": "CL-ADM-02", "content": "Kiểm kê danh mục, quản lý & lập lịch hiệu chuẩn thiết bị/dụng cụ đo lường", "frequency": "Hàng tháng", "status_today": "Chưa làm", "result": "Đã kiểm định 100%"},
            {"department_code": "QA_ADMIN", "task_code": "CL-ADM-03", "content": "Tổng hợp số liệu nhật ký kiểm tra, lập báo cáo chất lượng gửi Trưởng phòng", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Gửi báo cáo lúc 17h"},

            # PQA (Process QA)
            {"department_code": "PQA", "task_code": "CL-PQA-01", "content": "Đánh giá tuần tra hiện trường việc tuân thủ thao tác của công nhân & QC", "frequency": "Hàng ngày", "status_today": "Đang thực hiện", "result": "Ghi nhận 2 điểm nóng"},
            {"department_code": "PQA", "task_code": "CL-PQA-02", "content": "Kiểm soát rủi ro chất lượng phát sinh tại các công đoạn sản xuất", "frequency": "Hàng ngày", "status_today": "Chưa làm", "result": "Đang khoanh vùng"},

            # QC_LEAD (Tổ trưởng QC)
            {"department_code": "QC_LEAD", "task_code": "CL-LED-01", "content": "Phân công vị trí, sắp xếp ca làm việc hàng ngày cho các nhân viên PQC", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Đủ quân số 3 ca"},
            {"department_code": "QC_LEAD", "task_code": "CL-LED-02", "content": "Trực tiếp ra mặt phân xử tranh chấp Đạt/NG giữa QC và Tổ trưởng sản xuất", "frequency": "Khi phát sinh", "status_today": "Đang thực hiện", "result": "Đã thống nhất phương án"},
            {"department_code": "QC_LEAD", "task_code": "CL-LED-03", "content": "Khoanh vùng sự cố, yêu cầu dừng chuyền & xử lý lỗi nghiêm trọng trong ca", "frequency": "Khi phát sinh", "status_today": "Chưa làm", "result": "Chưa phát sinh sự cố"},
            {"department_code": "QC_LEAD", "task_code": "CL-LED-04", "content": "Thu thập phiếu kiểm tra, biên bản lỗi và lập báo cáo tổng kết cuối ca", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Đã bàn giao ca sau"},

            # IQC (QC Kiểm Tra Nhập Kho)
            {"department_code": "IQC", "task_code": "CL-IQC-01", "content": "Kiểm tra ngoại quan, kích thước phôi gỗ, linh kiện & phụ kiện khi nhập kho", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Kiểm tra 5 lô gỗ phôi"},
            {"department_code": "IQC", "task_code": "CL-IQC-02", "content": "Đo độ ẩm phôi gỗ cầm tay/kim, kiểm tra chỉ tiêu hóa lý của sơn & hóa chất", "frequency": "Hàng ngày", "status_today": "Đang thực hiện", "result": "Độ ẩm đạt 8-12%"},
            {"department_code": "IQC", "task_code": "CL-IQC-03", "content": "Dán nhãn nhận diện trạng thái (Đạt/NG) & lập biên bản kiểm tra nhập kho", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Dán tem Đạt 100%"},

            # PQC1 (QC Định Hình - Lắp Ráp)
            {"department_code": "PQC1", "task_code": "CL-PQC1-01", "content": "Kiểm tra & duyệt mẫu đầu tiên (First Sample 5-10 chi tiết) trước khi chạy loạt", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Duyệt mẫu LSX-901"},
            {"department_code": "PQC1", "task_code": "CL-PQC1-02", "content": "Tuần tra đo đạc kích thước phôi gỗ, đường rãnh router, bo R góc cạnh", "frequency": "Hàng ngày", "status_today": "Đang thực hiện", "result": "Dung sai ±0.5mm"},
            {"department_code": "PQC1", "task_code": "CL-PQC1-03", "content": "Kiểm tra chất lượng chà nhám mịn, độ láng bề mặt & kết cấu khung lắp ráp", "frequency": "Hàng ngày", "status_today": "Chưa làm", "result": "Chờ chuyển ca"},

            # PQC2 (QC Sơn - Đóng Gói)
            {"department_code": "PQC2", "task_code": "CL-PQC2-01", "content": "Kiểm tra công đoạn bít lỗ ghim, màng bã bột & độ bám dính màng sơn", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Không dính lỗ ghim"},
            {"department_code": "PQC2", "task_code": "CL-PQC2-02", "content": "Kiểm tra so màu sơn UV, độ bóng bề mặt với mẫu màu chuẩn được duyệt", "frequency": "Hàng ngày", "status_today": "Đang thực hiện", "result": "Trùng mẫu màu 98%"},
            {"department_code": "PQC2", "task_code": "CL-PQC2-03", "content": "Kiểm tra độ lệch mí hộc kéo (≤1mm), khe hở mối nối & hoàn thiện mạc logo", "frequency": "Hàng ngày", "status_today": "Chưa làm", "result": "Đang kiểm tra lố 20"},

            # FQC (Final QC)
            {"department_code": "FQC", "task_code": "CL-FQC-01", "content": "Kiểm tra lấy mẫu xác suất thành phẩm đóng thùng theo chuẩn AQL/khách hàng", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Rút mẫu 32 thùng"},
            {"department_code": "FQC", "task_code": "CL-FQC-02", "content": "Kiểm tra ngoại quan thùng carton, tem nhãn Barcode, Shipping mark & đai nhựa", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Tem nhãn khớp PO"},
            {"department_code": "FQC", "task_code": "CL-FQC-03", "content": "Kiểm tra chèn lót PE/xốp, sách HDSD & túi phụ kiện Hardware bên trong thùng", "frequency": "Hàng ngày", "status_today": "Đang thực hiện", "result": "Đủ túi hardware"},
            {"department_code": "FQC", "task_code": "CL-FQC-04", "content": "Lập biên bản kiểm tra FQC & đóng dấu xác nhận đủ điều kiện xuất hàng", "frequency": "Hàng ngày", "status_today": "Đã hoàn thành", "result": "Đạt xuất kho PO-450"},
        ]

        added_pool = 0
        added_checklist = 0

        for item in checklists_data:
            # 1. Sync KPIChecklistPool
            pool_exist = db.query(KPIChecklistPool).filter(
                KPIChecklistPool.task_code == item["task_code"]
            ).first()
            if not pool_exist:
                new_pool = KPIChecklistPool(
                    task_code=item["task_code"],
                    content=item["content"],
                    frequency=item["frequency"],
                    department_code=item["department_code"]
                )
                db.add(new_pool)
                added_pool += 1
            else:
                pool_exist.content = item["content"]
                pool_exist.frequency = item["frequency"]
                pool_exist.department_code = item["department_code"]

            # 2. Sync KPIChecklist
            chk_exist = db.query(KPIChecklist).filter(
                KPIChecklist.task_code == item["task_code"]
            ).first()
            if not chk_exist:
                new_chk = KPIChecklist(
                    employee_id=f"NV_{item['department_code']}_001",
                    task_code=item["task_code"],
                    content=item["content"],
                    frequency=item["frequency"],
                    status_today=item["status_today"],
                    perform_count=1,
                    last_performed="Hôm nay",
                    result=item["result"],
                    department_code=item["department_code"]
                )
                db.add(new_chk)
                added_checklist += 1
            else:
                chk_exist.content = item["content"]
                chk_exist.frequency = item["frequency"]
                chk_exist.department_code = item["department_code"]

        db.commit()
        print(f"[MIGRATION] Hoàn thành đồng bộ QLCL Checklists! Thêm mới Pool: {added_pool}, Thêm mới Checklist: {added_checklist}.")
    except Exception as e:
        db.rollback()
        print(f"[MIGRATION] Lỗi khi đồng bộ QLCL Checklists: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_qlcl_checklists()
