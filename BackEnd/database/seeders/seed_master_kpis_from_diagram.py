from app.routes import api_router
from modules.auth.models.role import Role
from modules.auth.models.departments import Department
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
from config.database import SessionLocal, engine
from modules.auth.models.employees import Employee
from modules.auth.models.accounts import Account
from modules.kpi.models.kpi_management import KPIItemPool, KPIEmployeeItem
from sqlalchemy import text

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

        # 2. Ánh xạ chính xác Chức danh & Mã Role cho 27 nhân sự
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
            '0165': ('QC Gia Công', 'QC_GIACONG'),
            '0418': ('QC Định Hình', 'QC_DINHHINH'),
            '0428': ('QC Định Hình', 'QC_DINHHINH'),
            '5014': ('QC Định Hình', 'QC_DINHHINH'),
            '0288': ('QC Định Hình', 'QC_DINHHINH'),
            '6137': ('QC Lắp Ráp', 'QC_LAPRAP'),
            '5267': ('QC Lắp Ráp', 'QC_LAPRAP'),
            '6327': ('QC Lắp Ráp', 'QC_LAPRAP'),
            '5977': ('QC Sơn', 'QC_SON'),
            '5024': ('QC Sơn', 'QC_SON'),
            '6231': ('QC Sơn', 'QC_SON'),
            '6102': ('QC Đóng Gói', 'QC_DONGGOI'),
            '0899': ('QC Đóng Gói', 'QC_DONGGOI'),
            '3670': ('QC Đóng Gói', 'QC_DONGGOI'),
            '3904': ('QC Đóng Gói', 'QC_DONGGOI'),
            '3455': ('QC Đóng Gói', 'QC_DONGGOI'),
            '0090': ('NVSX', 'SX'),
            '5557': ('NVSX', 'SX'),
            '6082': ('NVSX', 'SX'),
        }

        for emp_id, (pos_title, role_code) in POSITION_MAPPING.items():
            emp = db.query(Employee).filter(Employee.employee_id == emp_id).first()
            if emp:
                emp.position = pos_title
                if role_code != 'SX':
                    emp.department = 'QLCL'
            acc = db.query(Account).filter(Account.employee_id == emp_id).first()
            if acc:
                acc.position = pos_title
        db.commit()
        print("Đã chuẩn hóa thông tin chức danh cho 27 nhân sự phòng QLCL.")

        # 3. Chuẩn bị 32 KPI Items mẫu chuẩn từ Draw.io
        MASTER_KPI_POOL = [
            # 1. Trưởng Phòng QLCL (TP_QLCL)
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

            # 2. QA Lead (QA_LEAD)
            {
                "kpi_code": "KPI-QAL-01",
                "content": "Hiệu quả Đánh giá & Đóng CAPA",
                "calc_method": "capa_completion_rate",
                "target": "= 100%",
                "target_val": "100",
                "operator": ">=",
                "unit": "%",
                "target_role": "QA_LEAD",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },
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
            {
                "kpi_code": "KPI-QAL-05",
                "content": "Đánh giá từ Trưởng phòng",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_LEAD",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },

            # 3. QC Lead (QC_LEAD)
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
            {
                "kpi_code": "KPI-QCL-05",
                "content": "Đánh giá từ Trưởng phòng",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_LEAD",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },

            # 4. QA Admin (QA_ADMIN)
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
            {
                "kpi_code": "KPI-QAA-05",
                "content": "Đánh giá từ Trưởng phòng",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_ADMIN",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },

            # 5. QA Process (QA_PROCESS)
            {
                "kpi_code": "KPI-QAP-01",
                "content": "Hiệu quả Đánh giá & Đóng CAPA",
                "calc_method": "capa_completion_rate",
                "target": "= 100%",
                "target_val": "100",
                "operator": ">=",
                "unit": "%",
                "target_role": "QA_PROCESS",
                "data_source": "capa",
                "department": "QLCL",
                "score": 20
            },
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
            {
                "kpi_code": "KPI-QAP-05",
                "content": "Đánh giá từ Trưởng phòng",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QA_PROCESS",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },

            # 6. IQC (IQC)
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
            {
                "kpi_code": "KPI-IQC-05",
                "content": "Đánh giá từ quản lý trực tiếp",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "IQC",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },

            # 7. QC Supervisor (QC_SUPERVISOR)
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
            {
                "kpi_code": "KPI-SUP-05",
                "content": "Đánh giá từ Trưởng phòng",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_SUPERVISOR",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 20
            },

            # 8. QC Gia Công (QC_GIACONG)
            {
                "kpi_code": "KPI-GC-01",
                "content": "Tỷ lệ hàng được kiểm tra",
                "calc_method": "po_missing_ticket_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 1.0,
                "unit": "%",
                "target_role": "QC_GIACONG",
                "data_source": "inspection",
                "stage_filter": "Gia Công",
                "department": "QLCL",
                "score": 50
            },
            {
                "kpi_code": "KPI-GC-02",
                "content": "Chuyên cần & Kỷ luật lao động",
                "calc_method": "attendance_days",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_GIACONG",
                "data_source": "attendance",
                "department": "QLCL",
                "score": 25
            },
            {
                "kpi_code": "KPI-GC-03",
                "content": "Đánh giá từ quản lý trực tiếp",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_GIACONG",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 25
            },

            # 9. QC Định Hình (QC_DINHHINH)
            {
                "kpi_code": "KPI-DH-01",
                "content": "Đánh giá từ quản lý trực tiếp (QC Lead)",
                "calc_method": "manager_score",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_DINHHINH",
                "data_source": "evaluation",
                "department": "QLCL",
                "score": 50
            },
            {
                "kpi_code": "KPI-DH-02",
                "content": "Chất lượng kiểm soát & Tuân thủ CTQ/SOS",
                "calc_method": "avg_ticket_rate",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_DINHHINH",
                "data_source": "inspection",
                "stage_filter": "Định hình",
                "department": "QLCL",
                "score": 30
            },
            {
                "kpi_code": "KPI-DH-03",
                "content": "Chuyên cần & Kỷ luật lao động",
                "calc_method": "attendance_days",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_DINHHINH",
                "data_source": "attendance",
                "department": "QLCL",
                "score": 20
            },

            # 10. QC Lắp Ráp (QC_LAPRAP)
            {
                "kpi_code": "KPI-LR-01",
                "content": "Tỷ lệ lỗi lọt lưới",
                "calc_method": "claim_defect_escape_rate",
                "target": "< 10%",
                "target_val": "10",
                "operator": "<",
                "unit": "%",
                "target_role": "QC_LAPRAP",
                "data_source": "claim",
                "stage_filter": "Lắp ráp",
                "department": "QLCL",
                "score": 50
            },
            {
                "kpi_code": "KPI-LR-02",
                "content": "Tỷ lệ đạt kết cấu & chất lượng lắp ráp",
                "calc_method": "avg_ticket_rate",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_LAPRAP",
                "data_source": "inspection",
                "stage_filter": "Lắp ráp",
                "department": "QLCL",
                "score": 30
            },
            {
                "kpi_code": "KPI-LR-03",
                "content": "Chuyên cần & Kỷ luật lao động",
                "calc_method": "attendance_days",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_LAPRAP",
                "data_source": "attendance",
                "department": "QLCL",
                "score": 20
            },

            # 11. QC Sơn (QC_SON)
            {
                "kpi_code": "KPI-SON-01",
                "content": "Tỷ lệ chính xác của kết quả kiểm tra",
                "calc_method": "stage_rejection_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 1.0,
                "unit": "%",
                "target_role": "QC_SON",
                "data_source": "inspection",
                "stage_filter": "Sơn",
                "department": "QLCL",
                "score": 50
            },
            {
                "kpi_code": "KPI-SON-02",
                "content": "Hiệu quả kiểm tra lại 100% hàng sửa",
                "calc_method": "avg_ticket_rate",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_SON",
                "data_source": "inspection",
                "stage_filter": "Sơn",
                "department": "QLCL",
                "score": 30
            },
            {
                "kpi_code": "KPI-SON-03",
                "content": "Chuyên cần & Kỷ luật lao động",
                "calc_method": "attendance_days",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_SON",
                "data_source": "attendance",
                "department": "QLCL",
                "score": 20
            },

            # 12. QC Đóng Gói (QC_DONGGOI)
            {
                "kpi_code": "KPI-DG-01",
                "content": "Tốc độ khắc phục sự cố",
                "calc_method": "capa_delay_penalty",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "penalty_factor": 2.0,
                "unit": "%",
                "target_role": "QC_DONGGOI",
                "data_source": "capa",
                "stage_filter": "Đóng gói",
                "department": "QLCL",
                "score": 50
            },
            {
                "kpi_code": "KPI-DG-02",
                "content": "Kiểm soát 100% ngoại quan & tem nhãn/phụ kiện",
                "calc_method": "avg_ticket_rate",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_DONGGOI",
                "data_source": "inspection",
                "stage_filter": "Đóng gói",
                "department": "QLCL",
                "score": 30
            },
            {
                "kpi_code": "KPI-DG-03",
                "content": "Chuyên cần & Kỷ luật lao động",
                "calc_method": "attendance_days",
                "target": "> 95%",
                "target_val": "95",
                "operator": ">",
                "unit": "%",
                "target_role": "QC_DONGGOI",
                "data_source": "attendance",
                "department": "QLCL",
                "score": 20
            }
        ]

        # 4. Ghi đè / Cập nhật vào kpi_item_pool
        # Xóa pool cũ nếu muốn thay thế hoàn toàn bằng 32 chỉ số chuẩn
        db.query(KPIItemPool).delete()
        db.commit()

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
        db.commit()
        print(f"Đã lưu thành công {len(MASTER_KPI_POOL)} chỉ số KPI chuẩn vào kpi_item_pool.")

        # 5. Phân bổ KPI tương ứng cho từng nhân viên theo vai trò (kpi_employee_items)
        db.query(KPIEmployeeItem).delete()
        db.commit()

        pool_by_role = {}
        for item in MASTER_KPI_POOL:
            r = item['target_role']
            if r not in pool_by_role:
                pool_by_role[r] = []
            pool_by_role[r].append(item)

        total_assigned = 0
        for emp_id, (pos_title, role_code) in POSITION_MAPPING.items():
            if role_code == 'SX':
                continue
            role_kpis = pool_by_role.get(role_code, [])
            for k in role_kpis:
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
        print("--- HOÀN THÀNH SEED DỮ LIỆU THÀNH CÔNG 100% ---")

    except Exception as e:
        db.rollback()
        print("LỖI KHI SEED DỮ LIỆU:", e)
        raise e
    finally:
        db.close()

if __name__ == '__main__':
    seed_data()
