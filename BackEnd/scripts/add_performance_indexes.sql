-- ============================================================
-- PERFORMANCE INDEXES cho ERP SmartFlow
-- Chạy trên SQL Server Management Studio (SSMS)
-- Database: ERP_G7_v4
-- 
-- Lưu ý: Chạy trong giờ ít traffic.
-- Index tạo trên bảng lớn có thể lock bảng vài giây.
-- ============================================================

USE ERP_G7_v4;
GO

PRINT N'🚀 Bắt đầu tạo Performance Indexes...'
GO

-- ============ 1. BẢNG deliveries (BẢNG NÓNG NHẤT) ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_deliveries_plan_status')
CREATE NONCLUSTERED INDEX IX_deliveries_plan_status 
ON deliveries (plan_id, status) 
INCLUDE (part_name, specification, quantity_total, quantity_received, quantity_returned, residual, created_at, order_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_deliveries_plan_part_spec')
CREATE NONCLUSTERED INDEX IX_deliveries_plan_part_spec
ON deliveries (plan_id, part_name) 
INCLUDE (specification, status, quantity_total, quantity_received, quantity_returned);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_deliveries_created_at')
CREATE NONCLUSTERED INDEX IX_deliveries_created_at 
ON deliveries (created_at DESC)
INCLUDE (plan_id, delivery_stage, receiving_stage, status, part_name);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_deliveries_order_id')
CREATE NONCLUSTERED INDEX IX_deliveries_order_id
ON deliveries (order_id)
WHERE order_id IS NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_deliveries_sx_delivery')
CREATE NONCLUSTERED INDEX IX_deliveries_sx_delivery ON deliveries (sx_delivery);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_deliveries_sx_receipt')
CREATE NONCLUSTERED INDEX IX_deliveries_sx_receipt ON deliveries (sx_receipt);
GO

PRINT N'✅ Xong: deliveries (6 indexes)'
GO

-- ============ 2. BẢNG delivery_details ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_dd_delivery_order')
CREATE NONCLUSTERED INDEX IX_dd_delivery_order
ON delivery_details (delivery_id, order_id)
INCLUDE (part_name, quantity);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_dd_order_id')
CREATE NONCLUSTERED INDEX IX_dd_order_id
ON delivery_details (order_id)
INCLUDE (delivery_id, part_name, quantity);
GO

PRINT N'✅ Xong: delivery_details (2 indexes)'
GO

-- ============ 3. BẢNG orders ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_orders_plan_priority')
CREATE NONCLUSTERED INDEX IX_orders_plan_priority
ON orders (plan_id, is_priority DESC, priority_score DESC)
INCLUDE (order_code, customer, order_status, product_id);
GO

PRINT N'✅ Xong: orders (1 index)'
GO

-- ============ 4. BẢNG products ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_products_order_id')
CREATE NONCLUSTERED INDEX IX_products_order_id
ON products (order_id)
INCLUDE (sku, name, quantity, total_qty);
GO

PRINT N'✅ Xong: products (1 index)'
GO

-- ============ 5. BẢNG bom_details ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_bom_product_name')
CREATE NONCLUSTERED INDEX IX_bom_product_name
ON bom_details (product_id, name)
INCLUDE (quantity, specification, input_stage, output_stage, parent_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_bom_input_stage')
CREATE NONCLUSTERED INDEX IX_bom_input_stage ON bom_details (input_stage);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_bom_output_stage')
CREATE NONCLUSTERED INDEX IX_bom_output_stage ON bom_details (output_stage);
GO

PRINT N'✅ Xong: bom_details (3 indexes)'
GO

-- ============ 6. BẢNG delivery_returns ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_returns_plan_status')
CREATE NONCLUSTERED INDEX IX_returns_plan_status
ON delivery_returns (plan_id, status)
INCLUDE (from_stage, to_stage, part_name, quantity, created_at);
GO

PRINT N'✅ Xong: delivery_returns (1 index)'
GO

-- ============ 7. BẢNG daily_inspection_records ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_daily_insp_date')
CREATE NONCLUSTERED INDEX IX_daily_insp_date
ON daily_inspection_records (inspection_date DESC)
INCLUDE (stage_name, inspector_id);
GO

PRINT N'✅ Xong: daily_inspection_records (1 index)'
GO

-- ============ 8. BẢNG input_inspections ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_input_insp_plan_cont')
CREATE NONCLUSTERED INDEX IX_input_insp_plan_cont
ON input_inspections (plan_id, cont_name);
GO

PRINT N'✅ Xong: input_inspections (1 index)'
GO

-- ============ 9. BẢNG notifications ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_notif_group_stage')
CREATE NONCLUSTERED INDEX IX_notif_group_stage
ON notifications (target_group, target_stage, created_at DESC);
GO

PRINT N'✅ Xong: notifications (1 index)'
GO

-- ============ 10. BẢNG mobile_daily_plans ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_mdp_date_stage_factory')
CREATE NONCLUSTERED INDEX IX_mdp_date_stage_factory
ON mobile_daily_plans (plan_date, stage, factory)
INCLUDE (order_code, part_name, planned_qty, remaining_qty);
GO

PRINT N'✅ Xong: mobile_daily_plans (1 index)'
GO

-- ============ 11. BẢNG chatbot_histories ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_chat_account_session')
CREATE NONCLUSTERED INDEX IX_chat_account_session
ON chatbot_histories (account_id, session_id, created_at DESC);
GO

PRINT N'✅ Xong: chatbot_histories (1 index)'
GO

-- ============ 12. BẢNG machine_maintenances ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_maint_machine_date')
CREATE NONCLUSTERED INDEX IX_maint_machine_date
ON machine_maintenances (machine_id, maintenance_date DESC);
GO

PRINT N'✅ Xong: machine_maintenances (1 index)'
GO

-- ============ 13-15. BẢNG kpi_* ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_kpi_cl_employee')
CREATE NONCLUSTERED INDEX IX_kpi_cl_employee ON kpi_checklists (employee_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_kpi_ei_employee')
CREATE NONCLUSTERED INDEX IX_kpi_ei_employee ON kpi_employee_items (employee_id);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_kpi_viol_employee')
CREATE NONCLUSTERED INDEX IX_kpi_viol_employee ON kpi_violations (employee_id);
GO

PRINT N'✅ Xong: kpi tables (3 indexes)'
GO

-- ============ 16. BẢNG capa_occurrences ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_capa_occ_capa_id')
CREATE NONCLUSTERED INDEX IX_capa_occ_capa_id
ON capa_occurrences (capa_id)
INCLUDE (occurrence_number, status);
GO

PRINT N'✅ Xong: capa_occurrences (1 index)'
GO

-- ============ 17. BẢNG pallet_cards ============
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_pallet_khsx_po')
CREATE NONCLUSTERED INDEX IX_pallet_khsx_po ON pallet_cards (khsx_code, po_code);
GO

PRINT N'✅ Xong: pallet_cards (1 index)'
GO


PRINT N''
PRINT N'============================================================'
PRINT N'✅✅✅ HOÀN THÀNH: Đã tạo ~25 Performance Indexes!'
PRINT N'============================================================'
GO
