/**
 * Domain Types và Constants cho Phân hệ Quản lý Kho (Warehouse Module)
 */

export const WAREHOUSE_ROUTES = {
  GOODS_RECEIPT: '/admin/warehouse/goods-receipt',
  GOODS_ISSUE: '/admin/warehouse/goods-issue',
  WAREHOUSE_MANAGEMENT: '/admin/warehouse/management',
  REJECTED_GOODS: '/admin/warehouse/rejected-goods'
};

export const WAREHOUSE_SCREENS = {
  GOODS_RECEIPT: {
    code: 'WH_RECEIPT',
    title: 'Nhập kho',
    subtitle: 'Khu vực hiển thị và quản lý dữ liệu nhập kho',
    route: WAREHOUSE_ROUTES.GOODS_RECEIPT
  },
  GOODS_ISSUE: {
    code: 'WH_ISSUE',
    title: 'Xuất kho',
    subtitle: 'Khu vực hiển thị và quản lý dữ liệu xuất kho',
    route: WAREHOUSE_ROUTES.GOODS_ISSUE
  },
  WAREHOUSE_MANAGEMENT: {
    code: 'WH_MGMT',
    title: 'Quản lý kho',
    subtitle: 'Khu vực hiển thị thông tin và quản lý kho',
    route: WAREHOUSE_ROUTES.WAREHOUSE_MANAGEMENT
  },
  REJECTED_GOODS: {
    code: 'WH_REJECTED',
    title: 'Quản lý hàng loại',
    subtitle: 'Theo dõi hàng loại từ QC đầu vào và hàng trả về từ sản xuất',
    route: WAREHOUSE_ROUTES.REJECTED_GOODS
  }
};

export const WAREHOUSE_VOUCHER_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};
