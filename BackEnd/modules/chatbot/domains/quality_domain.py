# -*- coding: utf-8 -*-
from modules.chatbot.domains.base import DomainSpec

QUALITY_DOMAIN = DomainSpec(
    key="quality",
    title="Quản lý Chất lượng, QC, CAPA & HDKT (Quality)",
    description="Kiểm tra chất lượng hằng ngày, kiểm tra đầu vào/công đoạn, danh mục lỗi QC, CAPA khắc phục phòng ngừa, Hướng dẫn kiểm tra (HDKT/SOS/CTQ), Mục tiêu chất lượng.",
    keywords=[
        "chất lượng", "chat luong", "qc", "qa", "qlcl", "kiểm tra", "kiem tra", "phiếu kiểm", "phieu kiem",
        "tỷ lệ lỗi", "ty le loi", "lỗi gỗ", "loi go", "defect", "aql", "đầu vào", "dau vao", "iqc",
        "capa", "khắc phục", "khac phuc", "phòng ngừa", "phong ngua", "hdkt", "hướng dẫn kiểm tra",
        "sos", "ctq", "mục tiêu chất lượng", "muc tieu chat luong", "quality objective", "ng", "đạt",
    ],
    route_prefixes=[
        "/admin/quality", "/admin/reports", "/admin/defects", "/admin/capa",
        "/admin/inspection-guides", "/admin/sos-guides", "/admin/ctq-guides",
        "/admin/quality-records", "/admin/quality-objectives",
    ],
    tables={
        "daily_inspection_records", "daily_inspection_defects", "input_inspections",
        "defect_types", "defect_categories", "defect_glossaries", "client_defects",
        "user_defect_trackings", "checklists", "qc_sampling_rules",
        "capas", "capa_occurrences", "capa_evaluations",
        "inspection_guides", "inspection_guide_steps", "inspection_guide_sub_steps",
        "inspection_guide_assignments", "inspection_parameters", "inspection_guide_parameters",
        "inspection_form_types", "quality_objectives", "quality_objective_logs",
    },
    required_permissions=[
        "quality", "reports", "defects", "capa", "inspection-guides",
        "quality-records", "inspection-stage", "inspection-daily",
    ],
    schema_text="""
--- DOMAIN: QUALITY (QLCL, QC, CAPA, HDKT) ---
Table: daily_inspection_records (Phiếu kiểm tra QC hằng ngày)
- id, inspection_date, stage_name, inspector_id (-> accounts.id), batch_no, pallet_code, status, is_confirmed, is_deleted, total_products, total_defects, defect_rate (%), created_at

Table: daily_inspection_defects (Chi tiết lỗi trong phiếu kiểm hằng ngày)
- id, record_id (-> daily_inspection_records.id), defect_id (-> defect_types.id), quantity

Table: input_inspections (Phiếu kiểm tra đầu vào / công đoạn)
- id, plan_id (-> product_plans.id), ticket_code, pallet_code, inspection_type, batch_no, product_sku, part_name, cont_name, stage, required_qty, sample_qty, error_qty, conclusion, inspector_name, inspected_at, result ('Đạt'/'Không đạt'), note, is_confirmed, is_deleted

Table: defect_types (Danh mục lỗi nhà máy chuẩn G7)
- id, code, name, category, stage, description, aql_class ('Major'/'Minor'/'Critical'), needs_tracking, qc_tracking, is_active, root_cause, solution

Table: capas (Phiếu hành động khắc phục & phòng ngừa - CAPA)
- id, code, created_at_time, creator_name, handler_name, urgency, scope, issue_description, evaluator_name, ticket_status, tab_status, created_at, updated_at

Table: capa_occurrences (Các lần tái diễn / sự cố thuộc CAPA)
- id, capa_id (-> capas.id), occurrence_number, occurrence_date, container_code, product_name, quantity, issue_detail, inspector_name, status, main_cause, corrective_action

Table: inspection_guides (Tài liệu HDKT / SOS / CTQ)
- id, code, name, doc_type ('HDKT'/'SOS'/'CTQ'), description, is_active, created_by, created_at, deleted_at

Table: inspection_guide_steps (Các bước hướng dẫn kiểm tra)
- id, guide_id (-> inspection_guides.id), step_no, title, content

Table: quality_objectives (Mục tiêu chất lượng)
- id, code, title, category, factory_name, department_name, period_type, year, month, target_value, target_unit, operator, is_active

Table: quality_objective_logs (Kết quả thực hiện mục tiêu chất lượng)
- id, objective_id (-> quality_objectives.id), period_label, actual_value, achievement_rate, evaluation_status, analysis_note, recorded_at
""",
    business_rules="""
- LUÔN lọc `(is_deleted = 0 OR is_deleted IS NULL)` trên `daily_inspection_records` và `input_inspections`.
- Với `inspection_guides`, lọc `deleted_at IS NULL AND is_active = 1`.
- Nếu người dùng hỏi top lỗi hoặc Pareto tại xưởng, JOIN `daily_inspection_defects` với `defect_types`.
""",
    examples="""
- "Tỷ lệ lỗi QC tháng này theo công đoạn?" -> SELECT stage_name, COUNT(*) AS so_phieu, SUM(total_products) AS tong_sp, SUM(total_defects) AS tong_loi, ROUND(AVG(defect_rate), 2) AS ty_le_loi_tb FROM daily_inspection_records WHERE (is_deleted=0 OR is_deleted IS NULL) AND inspection_date >= DATEADD(month, DATEDIFF(month, 0, GETDATE()), 0) GROUP BY stage_name ORDER BY ty_le_loi_tb DESC
- "Có bao nhiêu CAPA đang mở?" -> SELECT ticket_status, urgency, COUNT(*) AS so_luong FROM capas GROUP BY ticket_status, urgency
""",
)

