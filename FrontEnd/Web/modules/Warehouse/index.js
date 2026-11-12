/**
 * Module: Quản lý kho (Warehouse Module)
 * SmartFlow ERP
 */

// Pages
export { default as GoodsReceiptPage } from './pages/GoodsReceipt/GoodsReceiptPage';
export { default as GoodsIssuePage } from './pages/GoodsIssue/GoodsIssuePage';
export { default as WarehouseManagementPage } from './pages/WarehouseManagement/WarehouseManagementPage';

// Views
export * from './Views';

// Components
export * from './components';

// Services
export { default as warehouseService } from './services/warehouse.service';
export * from './services';

// Hooks
export { default as useWarehouse } from './hooks/useWarehouse';
export * from './hooks';

// Types & Constants
export * from './types';
