# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

EQUIPMENT_ISO_SYSTEM_DOMAIN = DomainSpec(
    key="equipment_iso_system",
    title="Thiết bị Máy móc, Hồ sơ ISO & Hệ thống (Equipment / ISO / System)",
    description="Quản lý máy móc & lịch bảo trì, thiết bị đo kiểm & hiệu chuẩn, hồ sơ tài liệu ISO, quy trình ISO, luồng phê duyệt/ký duyệt ISO, báo cáo nhanh, lỗi phần mềm & hướng dẫn sử dụng màn hình.",
    keywords=[
        "máy móc", "may moc", "thiết bị", "thiet bi", "bảo trì", "bao tri", "hiệu chuẩn", "hieu chuan",
        "equipment", "machine", "iso", "tài liệu", "tai lieu", "quy trình", "quy trinh", "biểu mẫu",
        "ký duyệt", "ky duyet", "phê duyệt", "phe duyet", "chờ ký", "cho ky", "chữ ký", "chu ky",
        "bug", "lỗi màn hình", "loi man hinh", "báo lỗi", "bao loi", "màn hình", "man hinh",
        "hướng dẫn sử dụng", "huong dan su dung", "báo cáo nhanh", "bao cao nhanh", "quick report",
        "thông báo", "thong bao",
    ],
    route_prefixes=[
        "/admin/equipments", "/admin/machines", "/admin/iso", "/admin/iso-approvals",
        "/admin/iso-signatures", "/admin/screen-bugs", "/admin/screens", "/admin/system",
        "/admin/quick-reports",
    ],
    tables={
        "equipments", "equipment_inspections", "equipment_trainings",
        "machines", "machine_maintenances", "machine_documents",
        "iso_documents", "iso_document_types", "iso_processes", "iso_master_records",
        "iso_approval_logs", "iso_revision_logs", "iso_signatures",
        "screen_bugs", "screen_bug_updates", "system_screens", "system_components",
        "system_guides", "system_sidebars", "quick_reports", "notifications",
    },
    required_permissions=["equipment", "machines", "iso", "screen-bugs", "system", "quick-reports"],
    public_read=True,  # Cho phép tra cứu hướng dẫn sử dụng hệ thống & hồ sơ ISO công khai
    schema_text="""
--- DOMAIN: EQUIPMENT, ISO & SYSTEM (Máy móc, Thiết bị, Hồ sơ ISO, Lỗi & Hướng dẫn Hệ thống) ---
Table: machines (Máy móc nhà xưởng) & machine_maintenances (Lịch sử bảo trì)
- machines: id, code, name, status, factory, workshop, department, supplier, maintenance_cycle (ngày), last_maintenance_date, next_maintenance_date, owner_name
- machine_maintenances: id, machine_id (-> machines.id), performed_by, verified_by, check_date, maintenance_date, status, notes

Table: equipments (Thiết bị đo kiểm) & equipment_inspections (Lịch sử kiểm tra / hiệu chuẩn)
- equipments: id, code, name, type, status, department, owner_name, purchase_date, maintenance_cycle, calibration_date, check_date
- equipment_inspections: id, equipment_id (-> equipments.id), performed_by, verified_by, check_date, calibration_date, status, notes

Table: iso_documents (Hồ sơ / Tài liệu ISO) & iso_processes (Quy trình ISO)
- iso_documents: id, code, name, version, issue_date, issuer, approver, approver_bgd, status, folder, doc_type, document_level, notes, updated_at
- iso_processes: id, code, name, department_name, owner, editor, approver, approver_bgd, issue_date, status, notes, updated_at

Table: iso_master_records (Danh mục hồ sơ ISO tổng hợp) & iso_approval_logs (Nhật ký ký duyệt ISO)
- iso_master_records: id, source_code, management_group, suggested_doc_code, document_name, department_in_charge, source_status, review_issue, action_chosen
- iso_approval_logs: id, item_type, item_id, item_code, item_name, action, action_by_name, role, previous_status, new_status, comment, created_at

Table: screen_bugs (Báo lỗi phần mềm) & system_screens (Danh mục màn hình) & system_guides (Hướng dẫn sử dụng)
- screen_bugs: id, screen_id (-> system_screens.id), description, severity ('Low'/'Medium'/'High'), status ('Mới'/'Đang xử lý'/'Đã sửa'/'Đã đóng'), assignee, reporter, created_at
- system_screens: id, platform, route_path, default_code, current_code, title, subtitle, is_active
- system_guides: id, screen_id (-> system_screens.id), step_number, title, description

Table: quick_reports (Báo cáo nhanh sự cố/họp)
- id, code, report_type, creator_name, issue_type, area, main_content, status, handler_name, created_at
""",
    business_rules="""
- Khi hỏi máy móc sắp đến hạn bảo trì: lọc `next_maintenance_date <= DATEADD(day, 14, GETDATE())` và `status != N'Ngừng sử dụng'`.
- Khi hỏi hồ sơ ISO chờ ký duyệt: lọc `status LIKE N'%Chờ%'` hoặc `status IN ('pending', 'waiting_approval', 'draft')`.
- TUYỆT ĐỐI không truy vấn cột `signature_data`, `digital_hash` trong `iso_signatures`.
""",
    examples="""
- "Máy móc nào sắp đến hạn bảo trì trong 14 ngày tới?" -> SELECT TOP 30 code, name, factory, workshop, next_maintenance_date, status FROM machines WHERE next_maintenance_date IS NOT NULL AND next_maintenance_date <= DATEADD(day, 14, GETDATE()) ORDER BY next_maintenance_date ASC
- "Có bao nhiêu lỗi phần mềm mức High chưa sửa?" -> SELECT sb.id, ss.current_code, ss.title, sb.description, sb.status, sb.assignee, sb.created_at FROM screen_bugs sb LEFT JOIN system_screens ss ON sb.screen_id = ss.id WHERE sb.severity = 'High' AND sb.status NOT IN (N'Đã sửa', N'Đã đóng') ORDER BY sb.created_at DESC
""",
)

