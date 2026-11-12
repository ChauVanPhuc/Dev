// useGoodsReceipt.js - Hook quản lý toàn bộ state, filter, pagination, selection cho Nhập kho
import { useState, useEffect, useCallback, useMemo } from 'react';
import { goodsReceiptService } from '../services/goodsReceipt.service';
import { DEFAULT_VISIBLE_COLUMNS } from '../types/goodsReceipt.types';

const VISIBLE_COLUMNS_KEY = 'smartflow_warehouse_goods_receipt_visible_columns';

export const useGoodsReceipt = ({ toast }) => {
  const [loading, setLoading] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [stats, setStats] = useState({
    total_vouchers: 0,
    total_lines: 0,
    total_quantity: 0,
    total_value: 0
  });

  // Tìm kiếm
  const [search, setSearch] = useState('');

  // Sắp xếp
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Bộ lọc
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [receiptTypeFilter, setReceiptTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [dateRange, setDateRange] = useState({ fromDate: '', toDate: '' });

  // Chọn dòng
  const [selectedIds, setSelectedIds] = useState([]);

  // Dropdown đang mở trên Toolbar hoặc Filter Bar
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Cột hiển thị
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(VISIBLE_COLUMNS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...DEFAULT_VISIBLE_COLUMNS };
  });
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);

  // Tải dữ liệu
  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await goodsReceiptService.filterReceipts({
        search,
        warehouse: warehouseFilter,
        receiptType: receiptTypeFilter,
        status: statusFilter,
        department: departmentFilter,
        createdBy: createdByFilter,
        customer: customerFilter,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        sortBy,
        sortDir,
        page,
        pageSize
      });
      const list = Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : []);
      setReceipts(list);
      setTotalCount(typeof res?.totalCount === 'number' ? res.totalCount : list.length);
      setTotalPages(typeof res?.totalPages === 'number' ? res.totalPages : 1);
      setStats(res?.stats || { total_vouchers: 0, total_lines: 0, total_quantity: 0, total_value: 0 });
    } catch (err) {
      console.error('Lỗi tải danh sách phiếu nhập kho:', err);
      if (toast?.error) toast.error('Không thể tải danh sách phiếu nhập kho');
    } finally {
      setLoading(false);
    }
  }, [
    search,
    warehouseFilter,
    receiptTypeFilter,
    statusFilter,
    departmentFilter,
    createdByFilter,
    customerFilter,
    dateRange,
    sortBy,
    sortDir,
    page,
    pageSize,
    toast
  ]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Tự động làm mới khi có thay đổi dữ liệu từ các phân hệ khác hoặc khi Reset Demo
  useEffect(() => {
    const handleSync = () => {
      fetchReceipts();
    };
    window.addEventListener('smartflow_warehouse_data_changed', handleSync);
    return () => window.removeEventListener('smartflow_warehouse_data_changed', handleSync);
  }, [fetchReceipts]);

  // Đếm số lượng bộ lọc đang kích hoạt
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (warehouseFilter) count++;
    if (receiptTypeFilter) count++;
    if (statusFilter) count++;
    if (departmentFilter) count++;
    if (createdByFilter) count++;
    if (customerFilter) count++;
    if (dateRange.fromDate || dateRange.toDate) count++;
    return count;
  }, [
    warehouseFilter,
    receiptTypeFilter,
    statusFilter,
    departmentFilter,
    createdByFilter,
    customerFilter,
    dateRange
  ]);

  // Xóa toàn bộ bộ lọc
  const resetAllFilters = useCallback(() => {
    setSearch('');
    setWarehouseFilter('');
    setReceiptTypeFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setCreatedByFilter('');
    setCustomerFilter('');
    setDateRange({ fromDate: '', toDate: '' });
    setPage(1);
    if (toast?.info) toast.info('Đã đặt lại tất cả bộ lọc');
  }, [toast]);

  // Thao tác cột hiển thị
  const handleToggleColumn = useCallback((colKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [colKey]: !prev[colKey] };
      try {
        localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const handleShowAllColumns = useCallback(() => {
    const next = Object.keys(DEFAULT_VISIBLE_COLUMNS).reduce((acc, k) => {
      acc[k] = true;
      return acc;
    }, {});
    setVisibleColumns(next);
    try {
      localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const handleResetDefaultColumns = useCallback(() => {
    setVisibleColumns({ ...DEFAULT_VISIBLE_COLUMNS });
    try {
      localStorage.setItem(VISIBLE_COLUMNS_KEY, JSON.stringify(DEFAULT_VISIBLE_COLUMNS));
    } catch {}
  }, []);

  // Xóa một hoặc nhiều bản ghi
  const handleDeleteReceipts = useCallback(
    async (ids) => {
      try {
        await goodsReceiptService.deleteReceipts(ids);
        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
        fetchReceipts();
        if (toast?.success) {
          const count = Array.isArray(ids) ? ids.length : 1;
          toast.success(`Đã xóa thành công ${count} phiếu nhập kho!`);
        }
      } catch (err) {
        if (toast?.error) toast.error('Lỗi khi xóa phiếu nhập kho: ' + err.message);
      }
    },
    [fetchReceipts, toast]
  );

  // Xuất Excel theo phạm vi bộ lọc hiện tại
  const handleExportExcel = useCallback(async () => {
    try {
      const filteredRes = await goodsReceiptService.filterReceipts({
        search,
        warehouse: warehouseFilter,
        receiptType: receiptTypeFilter,
        status: statusFilter,
        department: departmentFilter,
        createdBy: createdByFilter,
        customer: customerFilter,
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
        sortBy,
        sortDir,
        page: 1,
        pageSize: 999999
      });
      await goodsReceiptService.exportToExcel(filteredRes.items);
      if (toast?.success) toast.success(`Đã xuất ${filteredRes.items.length} phiếu nhập kho ra Excel!`);
    } catch (err) {
      if (toast?.error) toast.error('Lỗi khi xuất file Excel: ' + err.message);
    }
  }, [
    search,
    warehouseFilter,
    receiptTypeFilter,
    statusFilter,
    departmentFilter,
    createdByFilter,
    customerFilter,
    dateRange,
    sortBy,
    sortDir,
    toast
  ]);

  return {
    loading,
    receipts,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    stats,
    // Search & Sort
    search,
    setSearch,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    // Filters
    warehouseFilter,
    setWarehouseFilter,
    receiptTypeFilter,
    setReceiptTypeFilter,
    statusFilter,
    setStatusFilter,
    departmentFilter,
    setDepartmentFilter,
    createdByFilter,
    setCreatedByFilter,
    customerFilter,
    setCustomerFilter,
    dateRange,
    setDateRange,
    activeFiltersCount,
    resetAllFilters,
    // Selection
    selectedIds,
    setSelectedIds,
    // Dropdown
    activeDropdown,
    setActiveDropdown,
    // Columns
    visibleColumns,
    setVisibleColumns,
    handleToggleColumn,
    handleShowAllColumns,
    handleResetDefaultColumns,
    isColumnsMenuOpen,
    setIsColumnsMenuOpen,
    // Actions
    fetchReceipts,
    handleDeleteReceipts,
    handleExportExcel
  };
};
