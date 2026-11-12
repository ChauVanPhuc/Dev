/**
 * useWarehouseInventory.js
 * Custom hook quản lý trạng thái, bộ lọc, phân trang, chọn cột và tương tác dữ liệu cho trang Quản lý kho (XNT)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { warehouseInventoryService } from '../services/warehouseInventory.service';
import {
  DEFAULT_INVENTORY_VISIBLE_COLUMNS,
  INVENTORY_COLUMN_GROUPS,
  WAREHOUSE_TABS
} from '../types/warehouseInventory.types';

const COLUMN_STORAGE_KEY = 'smartflow_wh_mgmt_columns_v1';

/**
 * Phân giải thời gian từ timeFilter ({ year, month, fromDate, toDate })
 * sang khoảng ngày cụ thể (fromDate - toDate)
 */
export function resolveTimeFilterDates(timeFilter = {}) {
  if (!timeFilter || typeof timeFilter !== 'object') {
    return { fromDate: '', toDate: '' };
  }
  const { year = '', month = '', fromDate = '', toDate = '' } = timeFilter;

  // 1. Nếu có khoảng ngày cụ thể (Từ ngày / Đến ngày): ưu tiên áp dụng chính xác
  if (fromDate || toDate) {
    return {
      fromDate: fromDate ? String(fromDate).trim() : '',
      toDate: toDate ? String(toDate).trim() : ''
    };
  }

  // 2. Nếu có Tháng (có hoặc không có Năm)
  if (month) {
    const y = year && String(year).trim() ? String(year).trim() : '2026';
    const mNum = parseInt(month, 10);
    if (!isNaN(mNum) && mNum >= 1 && mNum <= 12) {
      const mStr = String(mNum).padStart(2, '0');
      const lastDay = new Date(parseInt(y, 10), mNum, 0).getDate();
      return {
        fromDate: `${y}-${mStr}-01`,
        toDate: `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`
      };
    }
  }

  // 3. Nếu chỉ có Năm: từ 01/01 đến 31/12
  if (year && String(year).trim()) {
    const y = String(year).trim();
    return {
      fromDate: `${y}-01-01`,
      toDate: `${y}-12-31`
    };
  }

  // 4. Mặc định "Tất cả": không giới hạn khoảng ngày
  return {
    fromDate: '',
    toDate: ''
  };
}

export const useWarehouseInventory = ({ toast } = {}) => {
  // 1. Tab kho đang chọn (Mặc định: 'ALL')
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');

  // 2. Bộ lọc tìm kiếm và tiêu chí
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [unitMainFilter, setUnitMainFilter] = useState('ALL'); // ĐVC
  const [unitConvFilter, setUnitConvFilter] = useState('ALL'); // ĐVCĐ

  // Bộ lọc thời gian chuẩn hóa ERP G7 (Năm, Tháng, Từ ngày, Đến ngày) - Mặc định "Tất cả"
  const [timeFilter, setTimeFilter] = useState({
    year: '',
    month: '',
    fromDate: '',
    toDate: ''
  });

  // Trạng thái mở thanh bộ lọc ngang (Hàng 2)
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Tính toán khoảng ngày thực tế từ timeFilter
  const { fromDate: effectiveFromDate, toDate: effectiveToDate } = useMemo(() => {
    return resolveTimeFilterDates(timeFilter);
  }, [timeFilter]);

  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [inventoryDaysFilter, setInventoryDaysFilter] = useState('ALL');

  // Helper alias đồng bộ tương thích ngược với unitFilter
  const unitFilter = unitMainFilter;
  const setUnitFilter = useCallback((val) => {
    setUnitMainFilter(val);
    setPage(1);
  }, []);

  // Sắp xếp danh sách (Đồng bộ Đơn hàng xuất khẩu)
  const [sortBy, setSortBy] = useState('item_code');
  const [sortDir, setSortDir] = useState('asc');

  // 3. Phân trang
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // 4. Trạng thái dữ liệu
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [kpis, setKpis] = useState({
    totalItems: 0,
    isSingleUnit: false,
    singleUnitName: null,
    itemsWithOpening: 0,
    sumOpeningSingle: null,
    itemsWithIn: 0,
    sumInSingle: null,
    itemsWithOut: 0,
    sumOutSingle: null,
    unitBreakdown: {}
  });
  const [totals, setTotals] = useState({});
  const [warehouseCounts, setWarehouseCounts] = useState({});

  // 5. Cấu hình cột hiển thị (lưu riêng cho trang Quản lý kho)
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_INVENTORY_VISIBLE_COLUMNS, ...JSON.parse(saved) };
      }
    } catch (e) {}
    return { ...DEFAULT_INVENTORY_VISIBLE_COLUMNS };
  });

  const saveColumnsToStorage = (newCols) => {
    try {
      localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(newCols));
    } catch (e) {}
  };

  const handleToggleColumn = useCallback((key) => {
    setVisibleColumns((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveColumnsToStorage(updated);
      return updated;
    });
  }, []);

  const handleToggleGroup = useCallback((groupKey, enableAll) => {
    const group = INVENTORY_COLUMN_GROUPS.find((g) => g.key === groupKey);
    if (!group || !group.columns) return;

    setVisibleColumns((prev) => {
      const updated = { ...prev };
      group.columns.forEach((col) => {
        if (!col.isCore) {
          updated[col.key] = enableAll !== undefined ? enableAll : !prev[col.key];
        }
      });
      saveColumnsToStorage(updated);
      return updated;
    });
  }, []);

  const handleShowAllColumns = useCallback(() => {
    const all = {};
    Object.keys(DEFAULT_INVENTORY_VISIBLE_COLUMNS).forEach((k) => {
      all[k] = true;
    });
    setVisibleColumns(all);
    saveColumnsToStorage(all);
  }, []);

  const handleResetDefaultColumns = useCallback(() => {
    setVisibleColumns({ ...DEFAULT_INVENTORY_VISIBLE_COLUMNS });
    saveColumnsToStorage(DEFAULT_INVENTORY_VISIBLE_COLUMNS);
  }, []);

  // Bật/tắt tất cả các cột tùy chọn (giữ nguyên các cột cốt lõi)
  const handleToggleAllColumns = useCallback(() => {
    const optionalKeys = Object.keys(DEFAULT_INVENTORY_VISIBLE_COLUMNS).filter(
      (k) => k !== 'item_code' && k !== 'item_name'
    );
    const isAllChecked = optionalKeys.every((k) => visibleColumns[k]);
    const nextVal = !isAllChecked;
    const updated = { ...visibleColumns };
    optionalKeys.forEach((k) => {
      updated[k] = nextVal;
    });
    updated.item_code = true;
    updated.item_name = true;
    setVisibleColumns(updated);
    saveColumnsToStorage(updated);
  }, [visibleColumns]);

  // Đếm số lượng bộ lọc đang active
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedWarehouse !== 'ALL') count++;
    if (search.trim() !== '') count++;
    if (categoryFilter !== 'ALL') count++;
    if (unitMainFilter !== 'ALL') count++;
    if (unitConvFilter !== 'ALL') count++;
    if (stockStatusFilter !== 'ALL') count++;
    if (inventoryDaysFilter !== 'ALL') count++;
    if (timeFilter.year || timeFilter.month || timeFilter.fromDate || timeFilter.toDate) count++;
    return count;
  }, [
    selectedWarehouse,
    search,
    categoryFilter,
    unitMainFilter,
    unitConvFilter,
    stockStatusFilter,
    inventoryDaysFilter,
    timeFilter
  ]);

  // Xóa toàn bộ bộ lọc
  const resetAllFilters = useCallback(() => {
    setSelectedWarehouse('ALL');
    setSearch('');
    setCategoryFilter('ALL');
    setUnitMainFilter('ALL');
    setUnitConvFilter('ALL');
    setTimeFilter({ year: '', month: '', fromDate: '', toDate: '' });
    setStockStatusFilter('ALL');
    setInventoryDaysFilter('ALL');
    setPage(1);
  }, []);

  // Tải danh sách vật tư theo bộ lọc
  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await warehouseInventoryService.getInventoryReport({
        warehouseCode: selectedWarehouse,
        search,
        category: categoryFilter,
        unit: unitMainFilter,
        unitMain: unitMainFilter,
        unitConv: unitConvFilter,
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
        stockStatus: stockStatusFilter,
        inventoryDays: inventoryDaysFilter,
        sortBy,
        sortDir,
        page,
        pageSize
      });

      setItems(Array.isArray(res?.items) ? res.items : []);
      setAllItems(Array.isArray(res?.allItems) ? res.allItems : (Array.isArray(res?.items) ? res.items : []));
      setTotalCount(typeof res?.totalCount === 'number' ? res.totalCount : 0);
      setTotalPages(typeof res?.totalPages === 'number' ? res.totalPages : 1);
      setKpis(res?.kpis || {});
      setTotals(res?.totals || {});
    } catch (err) {
      console.error('Lỗi tải báo cáo XNT:', err);
      setItems([]);
      setAllItems([]);
      setTotalCount(0);
      setTotalPages(1);
      setTotals({});
      if (toast?.error) toast.error('Không thể tải dữ liệu báo cáo tồn kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedWarehouse,
    search,
    categoryFilter,
    unitMainFilter,
    unitConvFilter,
    effectiveFromDate,
    effectiveToDate,
    stockStatusFilter,
    inventoryDaysFilter,
    sortBy,
    sortDir,
    page,
    pageSize,
    toast
  ]);

  // Tải số lượng vật tư trên từng tab kho
  const fetchWarehouseCounts = useCallback(async () => {
    try {
      const counts = await warehouseInventoryService.getWarehouseCounts();
      setWarehouseCounts(counts);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    fetchWarehouseCounts();
  }, [fetchWarehouseCounts]);

  // Lắng nghe sự kiện đồng bộ từ phân hệ Nhập kho, Xuất kho hoặc Reset Demo
  useEffect(() => {
    const handleSync = () => {
      fetchReport();
      fetchWarehouseCounts();
    };
    window.addEventListener('smartflow_warehouse_data_changed', handleSync);
    return () => window.removeEventListener('smartflow_warehouse_data_changed', handleSync);
  }, [fetchReport, fetchWarehouseCounts]);

  // Đổi tab kho -> reset trang về 1
  const handleSelectWarehouse = (code) => {
    setSelectedWarehouse(code);
    setPage(1);
  };

  // Xuất Excel
  const handleExportExcel = async () => {
    try {
      // Lấy toàn bộ items thỏa mãn bộ lọc hiện tại để xuất file đầy đủ
      const allFilteredReport = await warehouseInventoryService.getInventoryReport({
        warehouseCode: selectedWarehouse,
        search,
        category: categoryFilter,
        unit: unitMainFilter,
        unitMain: unitMainFilter,
        unitConv: unitConvFilter,
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
        stockStatus: stockStatusFilter,
        inventoryDays: inventoryDaysFilter,
        sortBy,
        sortDir,
        page: 1,
        pageSize: 99999
      });

      const whObj = WAREHOUSE_TABS.find((w) => w.code === selectedWarehouse);
      const whName = whObj ? whObj.name : 'Tất cả các kho';

      await warehouseInventoryService.exportToExcel({
        items: allFilteredReport.items,
        warehouseName: whName,
        fromDate: effectiveFromDate,
        toDate: effectiveToDate,
        totals: allFilteredReport.totals
      });

      if (toast?.success) toast.success(`Đã xuất thành công báo cáo XNT (${allFilteredReport.items.length} mã)!`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      if (toast?.error) toast.error('Lỗi khi xuất tệp Excel: ' + err.message);
    }
  };

  return {
    // Kho
    selectedWarehouse,
    handleSelectWarehouse,
    warehouseCounts,

    // Bộ lọc
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    unitMainFilter,
    setUnitMainFilter: (val) => {
      setUnitMainFilter(val);
      setPage(1);
    },
    unitConvFilter,
    setUnitConvFilter: (val) => {
      setUnitConvFilter(val);
      setPage(1);
    },
    unitFilter,
    setUnitFilter,
    timeFilter,
    setTimeFilter: (val) => {
      setTimeFilter(val);
      setPage(1);
    },
    fromDate: effectiveFromDate,
    toDate: effectiveToDate,
    effectiveFromDate,
    effectiveToDate,
    isFilterOpen,
    setIsFilterOpen,
    stockStatusFilter,
    setStockStatusFilter,
    inventoryDaysFilter,
    setInventoryDaysFilter,
    resetAllFilters,
    activeFiltersCount,

    // Sắp xếp
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,

    // Phân trang
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,

    // Dữ liệu
    loading,
    items,
    allItems,
    totalCount,
    kpis,
    totals,
    fetchReport,

    // Cột
    visibleColumns,
    handleToggleColumn,
    handleToggleGroup,
    handleShowAllColumns,
    handleResetDefaultColumns,
    handleToggleAllColumns,

    // Thao tác
    handleExportExcel
  };
};

export default useWarehouseInventory;
