# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

HR_KPI_DOMAIN = DomainSpec(
    key="hr_kpi",
    title="Nhân sự, Chấm công, KPI & Đánh giá (HR & KPI)",
    description="Cơ cấu tổ chức, nhân sự, điểm danh/chấm công QC, chỉ số KPI, checklist công việc, chấm điểm KPI tháng, vi phạm, khen thưởng/kỷ luật, đánh giá năng lực HR.",
    keywords=[
        "kpi", "nhân sự", "nhan su", "nhân viên", "nhan vien", "hr", "chấm công", "cham cong", "điểm danh",
        "quân số", "quan so", "vắng mặt", "vang mat", "vi phạm", "vi pham", "khen thưởng", "khen thuong",
        "kỷ luật", "ky luat", "đánh giá", "danh gia", "xếp loại", "xep loai", "phòng ban", "phong ban",
        "tổ chức", "to chuc", "bài test", "assessment", "tài khoản", "tai khoan", "user", "tăng ca", "overtime",
    ],
    route_prefixes=[
        "/admin/kpi", "/admin/hr", "/admin/staff-evaluation", "/admin/quality-employees",
        "/admin/accounts", "/admin/org", "/admin/assessments",
    ],
    tables={
        "accounts", "roles", "permissions", "departments", "employees",
        "hr_employees", "hr_org_nodes", "hr_factory_structures", "hr_assessments", "hr_assessment_submissions",
        "kpis", "kpi_checklists", "kpi_employee_items", "kpi_monthly_scores", "kpi_violations",
        "kpi_feedbacks", "kpi_tasks", "kpi_training_plans",
        "award_disciplines", "staff_evaluations",
        "quality_employees", "quality_employee_attendances",
    },
    required_permissions=["kpi", "hr", "staff-evaluation", "quality-employees", "accounts", "kpi-management"],
    schema_text="""
--- DOMAIN: HR & KPI (Nhân sự, Chấm công, KPI, Đánh giá) ---
Table: accounts (Tài khoản — TUYỆT ĐỐI KHÔNG lấy cột mật khẩu/token)
- id, username, full_name, email, phone, employee_id, is_active, status, permission_level, factory_name, created_at

Table: roles (Phòng ban / Vai trò: BGD, QLCL, SX, IT...) & permissions (Chức vụ) & departments (Liên kết)
- roles: id, code, name, description, is_active
- permissions: id, name, description
- departments: id, account_id (-> accounts.id), role_id (-> roles.id), permission_id (-> permissions.id), stage_id, name

Table: hr_employees (Hồ sơ nhân sự HR)
- id, employee_id, full_name, phone, hire_date, department_id, position_id, section_id

Table: quality_employees (Nhân sự QLCL) & quality_employee_attendances (Chấm công hằng ngày)
- quality_employees: id, employee_id, full_name, department, stage, factory, status, latest_rating
- quality_employee_attendances: id, employee_id, full_name, department, stage, factory, work_date, status, status_label, overtime_hours, note

Table: kpis (Chỉ số KPI tổng hợp)
- id, content, target (%), actual (%), status ('success'/'danger'/'neutral'), period_type, period_name

Table: kpi_monthly_scores (Điểm KPI tổng hợp theo tháng của nhân viên)
- id, employee_id, month, year, kpi_score, checklist_score, violation_score, manager_score, total_score, rating

Table: kpi_violations (Vi phạm KPI) & award_disciplines (Khen thưởng & Kỷ luật)
- kpi_violations: id, employee_id, violation_code, content, violation_time, performer, note
- award_disciplines: id, staff_name, employee_id, department, position, issue, impact, points, date, severity, status

Table: kpi_tasks (Công việc giao KPI) & staff_evaluations (Đánh giá xếp loại nhân sự)
- kpi_tasks: id, task_code, task_name, assigner, assignee, deadline, priority, status, target_score, achieved_score
- staff_evaluations: id, employee_id, staff_name, department, stage, goal_score, actual_score, status, rating, eval_date

Table: hr_assessments (Bài đánh giá năng lực) & hr_assessment_submissions (Kết quả nộp bài)
- hr_assessments: id, assessment_code, title, category, duration_minutes, total_questions, pass_percentage, status
- hr_assessment_submissions: id, assessment_id, candidate_name, position_name, department_name, total_score, max_score, percentage, rank_title, status, submitted_at
""",
    business_rules="""
- TUYỆT ĐỐI KHÔNG bao giờ truy vấn các cột bảo mật (`hashed_password`, `fcm_token`, `screen_permissions`). Khi truy vấn `accounts`, luôn liệt kê tường minh các cột an toàn (`id, username, full_name, email, employee_id, status, permission_level, factory_name`).
- Nếu người dùng hỏi về KPI hoặc công việc của chính họ, dùng `employee_id` hoặc `full_name` trong Ngữ cảnh người dùng.
""",
    examples="""
- "Quân số QLCL đi làm hôm nay thế nào?" -> SELECT status_label, COUNT(*) AS so_nguoi FROM quality_employee_attendances WHERE CAST(work_date AS DATE) = CAST(GETDATE() AS DATE) GROUP BY status_label
- "Top 10 nhân viên có điểm KPI cao nhất tháng này?" -> SELECT TOP 10 employee_id, total_score, rating, kpi_score, violation_score FROM kpi_monthly_scores WHERE month = MONTH(GETDATE()) AND year = YEAR(GETDATE()) ORDER BY total_score DESC
""",
)

