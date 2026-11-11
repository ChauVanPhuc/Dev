from app.routes import api_router
from modules.auth.models.role import Role
from modules.auth.models.departments import Department
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
from config.database import SessionLocal, engine
from modules.auth.models.employees import Employee
from modules.auth.models.accounts import Account
from modules.kpi.models.kpi_management import KPIItemPool, KPIEmployeeItem, KPIEmployeeCustomResult
from modules.kpi.routes.kpi_management_router import calculate_employee_kpi_score
from modules.kpi.models.quality_employee import QualityEmployee
from sqlalchemy import text


# BẢNG ÁNH XẠ 5 CHỈ SỐ KPI CHUẨN THEO TỪNG VAI TRÒ
ROLE_KPI_ASSIGNMENT = {
    'TP_QLCL':       ['KPI-TP-01', 'KPI-TP-02', 'KPI-TP-03', 'KPI-TP-04', 'KPI-TP-05'],
    'QA_LEAD':       ['KPI-CAPA-01', 'KPI-QAL-02', 'KPI-QAL-03', 'KPI-QAL-04', 'KPI-LEAD-05'],
    'QC_LEAD':       ['KPI-QCL-01', 'KPI-QCL-02', 'KPI-QCL-03', 'KPI-QCL-04', 'KPI-LEAD-05'],
    'QA_ADMIN':      ['KPI-QAA-01', 'KPI-QAA-02', 'KPI-QAA-03', 'KPI-QAA-04', 'KPI-LEAD-05'],
    'QA_PROCESS':    ['KPI-CAPA-01', 'KPI-QAP-02', 'KPI-QAP-03', 'KPI-QAP-04', 'KPI-LEAD-05'],
    'IQC':           ['KPI-IQC-01', 'KPI-IQC-02', 'KPI-IQC-03', 'KPI-IQC-04', 'KPI-QC-02'],
    'QC_SUPERVISOR': ['KPI-SUP-01', 'KPI-SUP-02', 'KPI-SUP-03', 'KPI-SUP-04', 'KPI-LEAD-05'],
    # Toàn bộ nhóm QC Công đoạn & NVSX dùng chung bộ 5 chỉ số KPI-QC-01..05
    'QC_GIACONG':    ['KPI-QC-01', 'KPI-QC-02', 'KPI-QC-03', 'KPI-QC-04', 'KPI-QC-05'],
    'QC_DINHHINH':   ['KPI-QC-01', 'KPI-QC-02', 'KPI-QC-03', 'KPI-QC-04', 'KPI-QC-05'],
    'QC_LAPRAP':     ['KPI-QC-01', 'KPI-QC-02', 'KPI-QC-03', 'KPI-QC-04', 'KPI-QC-05'],
    'QC_SON':        ['KPI-QC-01', 'KPI-QC-02', 'KPI-QC-03', 'KPI-QC-04', 'KPI-QC-05'],
    'QC_DONGGOI':    ['KPI-QC-01', 'KPI-QC-02', 'KPI-QC-03', 'KPI-QC-04', 'KPI-QC-05'],
    'QC_CONGDOAN':   ['KPI-QC-01', 'KPI-QC-02', 'KPI-QC-03', 'KPI-QC-04', 'KPI-QC-05'],
}


def seed_data():
    db = SessionLocal()
    try:
        print("--- BẮT ĐẦU CHUẨN HÓA MASTER DATA PHÒNG QLCL THEO SƠ ĐỒ DRAW.IO ---")

        # 1. Đảm bảo Hồ Sỹ Lịch tồn tại trong bảng employees
        lich_emp = db.query(Employee).filter((Employee.employee_id == '6289') | (Employee.full_name.ilike('%Hồ Sỹ Lịch%'))).first()
        if not lich_emp:
            lich_emp = Employee(
                employee_id='6289',
                full_name='Hồ Sỹ Lịch',
                department='QLCL',
                position='QA Process',
                status='Đang làm việc'
            )
            db.add(lich_emp)
            db.commit()
            print("Đã thêm mới hồ sơ nhân sự: Hồ Sỹ Lịch (Mã 6289 - QA Process)")
        else:
            lich_emp.department = 'QLCL'
            lich_emp.position = 'QA Process'
            db.commit()
            print("Đã cập nhật hồ sơ nhân sự: Hồ Sỹ Lịch (QA Process)")

        # 2. Ánh xạ chính xác Chức danh & Mã Role cho toàn bộ nhân sự QC
        POSITION_MAPPING = {
            '3973': ('Trưởng Phòng QLCL', 'TP_QLCL'),
            '5981': ('QA Lead', 'QA_LEAD'),
            '6086': ('QC Lead', 'QC_LEAD'),
            '5100': ('QA Admin', 'QA_ADMIN'),
            '6289': ('QA Process', 'QA_PROCESS'),
            '0027': ('IQC', 'IQC'),
            '139':  ('QC Supervisor', 'QC_SUPERVISOR'),
            '0556': ('QC Supervisor', 'QC_SUPERVISOR'),
            '3396': ('QC Supervisor', 'QC_SUPERVISOR'),
            # 15 Nhân sự QC Công đoạn (STT 11 -> 25 trên sơ đồ Draw.io)
            '0165': ('QC Gia Công', 'QC_CONGDOAN'),       # STT 11: Hà Minh Xuân
            '0418': ('QC Định Hình', 'QC_CONGDOAN'),     # STT 12: Huỳnh Hoàng Sơn
            '0428': ('QC Định Hình', 'QC_CONGDOAN'),     # STT 13: Hồ Sỹ Khẩn
            '5014': ('QC Định Hình', 'QC_CONGDOAN'),     # STT 14: Nguyễn Văn Tiển
            '0288': ('QC Định Hình', 'QC_CONGDOAN'),     # STT 15: Đậu Thị Tâm
            '6327': ('QC Định Hình', 'QC_CONGDOAN'),     # STT 16: Dương Văn Toàn
            '6137': ('QC Lắp Ráp', 'QC_CONGDOAN'),       # STT 17: Bùi Công Sự
            '5267': ('QC Lắp Ráp', 'QC_CONGDOAN'),       # STT 18: Trần Trung Đức
            '5977': ('QC Sơn', 'QC_CONGDOAN'),            # STT 19: Lê Thị Hồng Nhung
            '5024': ('QC Sơn', 'QC_CONGDOAN'),            # STT 20: Nguyễn Thị Hồng
            '6102': ('QC Đóng Gói', 'QC_CONGDOAN'),       # STT 21: Trần Thị Ánh
            '6231': ('QC Đóng Gói', 'QC_CONGDOAN'),       # STT 22: Đào Thị Huỳnh Như
            '0899': ('QC Đóng Gói', 'QC_CONGDOAN'),       # STT 23: Phạm Thị Mai
            '3670': ('QC Đóng Gói', 'QC_CONGDOAN'),       # STT 24: Thị Cẩm
            '3904': ('QC Đóng Gói', 'QC_CONGDOAN'),       # STT 25: Nguyễn Thị Mỷ Kim
            '3455': ('QC Đóng Gói', 'QC_CONGDOAN'),       # Nhân viên QC công đoạn: Nguyễn Thị Phương
            # Nhóm QCSX / NVSX
            '0090': ('NVSX', 'QC_CONGDOAN'),
            '5557': ('NVSX', 'QC_CONGDOAN'),
            '6082': ('NVSX', 'QC_CONGDOAN'),
            '0029': ('NVSX', 'QC_CONGDOAN'),
        }

        for emp_id, (pos_title, role_code) in POSITION_MAPPING.items():
            emp = db.query(Employee).filter(Employee.employee_id == emp_id).first()
            if emp:
                emp.position = pos_title
                if pos_title != 'NVSX':
                    emp.department = 'QLCL'
            acc = db.query(Account).filter(Account.employee_id == emp_id).first()
            if acc:
                acc.position = pos_title
        db.commit()
        print("Đã chuẩn hóa thông tin chức danh cho toàn bộ nhân sự phòng QLCL.")

        # 3. DANH MỤC 35 CHỈ SỐ KPI CHUẨN DUY NHẤT (ĐÃ GỘP TRÙNG LẶP HOÀN TOÀN)
        MASTER_KPI_POOL = [
            # --- 1. TRƯỞNG PHÒNG QLCL (TP_QLCL) ---
            {
                "kpi_code": "KPI-TP-01",
                "content": "Tỷ lệ khiếu nại khách hàng (Claim)",
                "calc_method": "claim_penalty_rate",
                "target": "< 0.5%",
                "target_val": "0.5",
                "operator": "<",
                "unit": "%",
                "target_role": "TP_QLCL",
                "data_source": "claim",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-TP-02",
                "content": "Tốc độ ra quyết định & Xử lý sự cố",
                "calc_method": "overdue_capa_ratio",
                "target": "< 10%",
                "target_val": "10",
                "operator": "<",
                "unit": "%",
                "target_role": "TP_QLCL",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-TP-03",
                "content": "Quản trị hiệu suất đội ngũ",
                "calc_method": "team_average_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "TP_QLCL",
                "data_source": "kpi",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-TP-04",
                "content": "Tỷ lệ đào tạo nhân sự",
                "calc_method": "training_attendance_rate",
                "target": "= 100%",
                "target_val": "100",
                "operator": ">=",
                "unit": "%",
                "target_role": "TP_QLCL",
                "data_source": "training",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-TP-05",
                "content": "Tỷ lệ hàng đạt khi final",
                "calc_method": "final_cont_pass_rate",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "TP_QLCL",
                "data_source": "inspection",
                "stage_filter": "final",
                "department": "QLCL",
                "score": 20
            },

            # --- 2. CHỈ SỐ DÙNG CHUNG CAPA (QA Lead & QA Process) ---
            {
                "kpi_code": "KPI-CAPA-01",
                "content": "Hiệu quả Đánh giá & Đóng CAPA",
                "calc_method": "capa_completion_rate",
                "target": "= 100%",
                "target_val": "100",
                "operator": ">=",
                "unit": "%",
                "target_role": "QA_LEAD,QA_PROCESS",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },

            # --- 3. QA LEAD (QA_LEAD) ---
            {
                "kpi_code": "KPI-QAL-02",
                "content": "Quản lý Hồ sơ & Báo cáo đối ứng",
                "calc_method": "report_on_time_ratio",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_LEAD",
                "data_source": "kpi_checklist",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QAL-03",
                "content": "Hiệu quả Đề xuất Cải tiến liên tục",
                "calc_method": "continuous_improvement_rate",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_LEAD",
                "data_source": "feedback",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QAL-04",
                "content": "Tính tuân thủ & Giám sát hệ thống",
                "calc_method": "audit_average_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_LEAD",
                "data_source": "inspection",
                "type_filter": "patrol",
                "department": "QLCL",
                "score": 20
            },

            # --- 4. QC LEAD (QC_LEAD) ---
            {
                "kpi_code": "KPI-QCL-01",
                "content": "Hiệu quả Hỗ trợ CAPA & Cung cấp thông tin",
                "calc_method": "capa_support_rate",
                "target": "= 100%",
                "target_val": "100",
                "operator": ">=",
                "unit": "%",
                "target_role": "QC_LEAD",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QCL-02",
                "content": "Năng lực Đánh giá & Cảnh báo rủi ro",
                "calc_method": "risk_detection_ratio",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_LEAD",
                "data_source": "alert",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QCL-03",
                "content": "Kiểm soát lọt lỗi tại IQC & FQC",
                "calc_method": "iqc_fqc_defect_escape",
                "target": "< 10%",
                "target_val": "10",
                "operator": "<",
                "unit": "%",
                "target_role": "QC_LEAD",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QCL-04",
                "content": "Thời gian đánh giá sự cố",
                "calc_method": "incident_response_time",
                "target": "< 24h",
                "target_val": "24",
                "operator": "<",
                "unit": "h",
                "target_role": "QC_LEAD",
                "data_source": "incident",
                "department": "QLCL",
                "score": 20
            },

            # --- 5. QA ADMIN (QA_ADMIN) ---
            {
                "kpi_code": "KPI-QAA-01",
                "content": "Tính chính xác & Kịp thời của Báo cáo",
                "calc_method": "report_on_time_ratio",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_ADMIN",
                "data_source": "kpi_checklist",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QAA-02",
                "content": "Quản lý Bản vẽ kỹ thuật",
                "calc_method": "drawing_management_rate",
                "target": "= 100%",
                "target_val": "100",
                "operator": ">=",
                "unit": "%",
                "target_role": "QA_ADMIN",
                "data_source": "drawing",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QAA-03",
                "content": "Quản lý Công tác Hành chính & Lưu trữ",
                "calc_method": "admin_delay_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "QA_ADMIN",
                "data_source": "violation",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QAA-04",
                "content": "Hiệu suất hỗ trợ số hóa hệ thống",
                "calc_method": "software_digitization_rate",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_ADMIN",
                "data_source": "log",
                "department": "QLCL",
                "score": 20
            },

            # --- 6. QA PROCESS (QA_PROCESS) ---
            {
                "kpi_code": "KPI-QAP-02",
                "content": "Hiệu quả Theo dõi & Cảnh báo lỗi",
                "calc_method": "risk_detection_ratio",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_PROCESS",
                "data_source": "alert",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QAP-03",
                "content": "Tính hiệu lực của CAPA (Lỗi lặp lại)",
                "calc_method": "repeat_capa_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 3.0,
                "unit": "%",
                "target_role": "QA_PROCESS",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QAP-04",
                "content": "Tính toàn vẹn hồ sơ chất lượng",
                "calc_method": "missing_doc_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 1.0,
                "unit": "%",
                "target_role": "QA_PROCESS",
                "data_source": "inspection",
                "department": "QLCL",
                "score": 20
            },

            # --- 7. IQC (IQC) ---
            {
                "kpi_code": "KPI-IQC-01",
                "content": "Tỷ lệ nguyên liệu đạt chất lượng",
                "calc_method": "material_quality_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "IQC",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-IQC-02",
                "content": "Tiến độ kiểm tra nguyên liệu nhập kho",
                "calc_method": "inspection_delay_24h_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "IQC",
                "data_source": "inspection",
                "stage_filter": "Đầu Vào",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-IQC-03",
                "content": "Tính kịp thời & chính xác của dữ liệu",
                "calc_method": "po_missing_ticket_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "IQC",
                "data_source": "inspection",
                "stage_filter": "Đầu Vào",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-IQC-04",
                "content": "Tiến độ xử lý sự cố nhà cung cấp",
                "calc_method": "vendor_issue_delay_penalty",
                "target": "> 98%",
                "target_val": "98",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "IQC",
                "data_source": "vendor",
                "department": "QLCL",
                "score": 20
            },

            # --- 8. QC SUPERVISOR (QC_SUPERVISOR) ---
            {
                "kpi_code": "KPI-SUP-01",
                "content": "Tỷ lệ lọt lỗi sang công đoạn sau / Khách hàng",
                "calc_method": "stage_return_rate",
                "target": "< 0.5%",
                "target_val": "0.5",
                "operator": "<",
                "unit": "%",
                "target_role": "QC_SUPERVISOR",
                "data_source": "inspection",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-SUP-02",
                "content": "Tính tuân thủ quy trình & Số hóa",
                "calc_method": "po_missing_ticket_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "QC_SUPERVISOR",
                "data_source": "inspection",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-SUP-03",
                "content": "Tiến độ xử lý hàng lỗi & Hàng bàn giao",
                "calc_method": "repair_delay_24h_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "QC_SUPERVISOR",
                "data_source": "repair",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-SUP-04",
                "content": "Quản trị hiệu suất nhân sự trong tổ",
                "calc_method": "team_average_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_SUPERVISOR",
                "data_source": "kpi",
                "department": "QLCL",
                "score": 20
            },

            # --- 9. CHỈ SỐ GỘP CHUNG: ĐÁNH GIÁ TỪ TRƯỞNG PHÒNG (ÁP DỤNG CÁC CẤP QUẢN LÝ / GIÁM SÁT) ---
            {
                "kpi_code": "KPI-LEAD-05",
                "content": "Đánh giá từ Trưởng phòng",
                "calc_method": "manager_score",
                "target": "> 90%",
                "target_val": "90",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_LEAD,QC_LEAD,QA_ADMIN,QA_PROCESS,QC_SUPERVISOR",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },

            # --- 10. BỘ 5 CHỈ SỐ KPI CHUẨN GỘP CHUNG CHO TOÀN BỘ NHÓM QC CÔNG ĐOẠN ---
            {
                "kpi_code": "KPI-QC-01",
                "content": "Tỷ lệ hàng được kiểm tra",
                "calc_method": "po_missing_ticket_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 1.0,
                "unit": "%",
                "target_role": "QC_CONGDOAN",
                "data_source": "inspection",
                "stage_filter": "",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QC-02",
                "content": "Đánh giá từ quản lý trực tiếp",
                "calc_method": "manager_score",
                "target": "> 90%",
                "target_val": "90",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_CONGDOAN,IQC",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QC-03",
                "content": "Tỷ lệ lỗi lọt lưới",
                "calc_method": "claim_defect_escape_rate",
                "target": "< 10%",
                "target_val": "10",
                "operator": "<",
                "unit": "%",
                "target_role": "QC_CONGDOAN",
                "data_source": "claim",
                "stage_filter": "",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QC-04",
                "content": "Tỷ lệ chính sách của kết quả kiểm tra",
                "calc_method": "stage_rejection_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 1.0,
                "unit": "%",
                "target_role": "QC_CONGDOAN",
                "data_source": "inspection",
                "stage_filter": "",
                "department": "QLCL",
                "score": 20
            },
            {
                "kpi_code": "KPI-QC-05",
                "content": "Tốc độ khắc phục sự cố",
                "calc_method": "capa_delay_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "QC_CONGDOAN",
                "data_source": "capa",
                "stage_filter": "",
                "department": "QLCL",
                "score": 20
            }
        ]

        # 4. Ghi đè / Cập nhật vào kpi_item_pool
        db.query(KPIItemPool).delete()
        db.commit()

        pool_by_code = {}
        for item_data in MASTER_KPI_POOL:
            item = KPIItemPool(
                kpi_code=item_data['kpi_code'],
                content=item_data['content'],
                calc_method=item_data['calc_method'],
                target=item_data['target'],
                target_val=item_data['target_val'],
                operator=item_data['operator'],
                unit=item_data['unit'],
                target_role=item_data['target_role'],
                data_source=item_data['data_source'],
                department=item_data['department'],
                stage_filter=item_data.get('stage_filter'),
                type_filter=item_data.get('type_filter'),
                penalty_factor=item_data.get('penalty_factor', 2.0),
                no_data_behavior="full_score"
            )
            db.add(item)
            pool_by_code[item_data['kpi_code']] = item_data
        db.commit()
        print(f"Đã lưu thành công {len(MASTER_KPI_POOL)} chỉ số KPI chuẩn (duy nhất) vào kpi_item_pool.")

        # 5. Phân bổ chính xác 5 chỉ số KPI cho từng nhân viên theo ROLE_KPI_ASSIGNMENT
        db.query(KPIEmployeeItem).delete()
        db.commit()

        total_assigned = 0
        for emp_id, (pos_title, role_code) in POSITION_MAPPING.items():
            kpi_codes = ROLE_KPI_ASSIGNMENT.get(role_code, ROLE_KPI_ASSIGNMENT['QC_CONGDOAN'])
            for code in kpi_codes:
                k = pool_by_code.get(code)
                if not k:
                    continue
                emp_item = KPIEmployeeItem(
                    employee_id=emp_id,
                    kpi_code=k['kpi_code'],
                    content=k['content'],
                    score=k['score'],
                    calc_method=k['calc_method'],
                    target=k['target'],
                    target_val=k['target_val'],
                    operator=k['operator'],
                    unit=k['unit'],
                    target_role=k['target_role'],
                    data_source=k['data_source'],
                    department=k['department'],
                    stage_filter=k.get('stage_filter'),
                    type_filter=k.get('type_filter'),
                    penalty_factor=k.get('penalty_factor', 2.0),
                    no_data_behavior="full_score",
                    actual="Chưa có dữ liệu",
                    status="Đang theo dõi",
                    icon="clock"
                )
                db.add(emp_item)
                total_assigned += 1

        db.commit()
        print(f"Đã phân bổ chính xác {total_assigned} chỉ số KPI cho tất cả nhân sự phòng QLCL.")

        # 6. Đồng bộ lại bảng kết quả tùy chỉnh kpi_employee_custom_results (nếu có mã cũ)
        code_migration = {
            'KPI-GC-01': 'KPI-QC-01', 'KPI-DH-01': 'KPI-QC-01', 'KPI-LR-01': 'KPI-QC-01', 'KPI-SON-01': 'KPI-QC-01', 'KPI-DG-01': 'KPI-QC-01',
            'KPI-GC-02': 'KPI-QC-02', 'KPI-DH-02': 'KPI-QC-02', 'KPI-LR-02': 'KPI-QC-02', 'KPI-SON-02': 'KPI-QC-02', 'KPI-DG-02': 'KPI-QC-02', 'KPI-IQC-05': 'KPI-QC-02',
            'KPI-GC-03': 'KPI-QC-03', 'KPI-DH-03': 'KPI-QC-03', 'KPI-LR-03': 'KPI-QC-03', 'KPI-SON-03': 'KPI-QC-03', 'KPI-DG-03': 'KPI-QC-03',
            'KPI-GC-04': 'KPI-QC-04', 'KPI-DH-04': 'KPI-QC-04', 'KPI-LR-04': 'KPI-QC-04', 'KPI-SON-04': 'KPI-QC-04', 'KPI-DG-04': 'KPI-QC-04',
            'KPI-GC-05': 'KPI-QC-05', 'KPI-DH-05': 'KPI-QC-05', 'KPI-LR-05': 'KPI-QC-05', 'KPI-SON-05': 'KPI-QC-05', 'KPI-DG-05': 'KPI-QC-05',
            'KPI-QAL-01': 'KPI-CAPA-01', 'KPI-QAP-01': 'KPI-CAPA-01',
            'KPI-QAL-05': 'KPI-LEAD-05', 'KPI-QCL-05': 'KPI-LEAD-05', 'KPI-QAA-05': 'KPI-LEAD-05', 'KPI-QAP-05': 'KPI-LEAD-05', 'KPI-SUP-05': 'KPI-LEAD-05'
        }
        for old_c, new_c in code_migration.items():
            db.query(KPIEmployeeCustomResult).filter(KPIEmployeeCustomResult.kpi_code == old_c).update({"kpi_code": new_c})
        db.commit()

        # 7. Tính toán lại điểm tháng cho toàn bộ nhân sự
        qes = db.query(QualityEmployee).filter(QualityEmployee.status != 'Đã nghỉ việc').all()
        for m in [9, 10, 11]:
            for q in qes:
                calculate_employee_kpi_score(db, q.employee_id, m, 2026, commit=False)
            db.commit()
        print(f"Đã cập nhật tính điểm KPI tháng 9, 10, 11 cho {len(qes)} nhân sự.")
        print("--- HOÀN THÀNH SEED DỮ LIỆU THÀNH CÔNG 100% ---")

    except Exception as e:
        db.rollback()
        print("LỖI KHI SEED DỮ LIỆU:", e)
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    seed_data()
