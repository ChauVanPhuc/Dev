import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '../../styles/warehouseInventory.css';

import { useWarehouseInventory } from '../../hooks/useWarehouseInventory';
import WarehouseToolbar from './components/WarehouseToolbar';
import WarehouseFilterBar from './components/WarehouseFilterBar';
import WarehouseTabs from './components/WarehouseTabs';
import WarehouseOverviewChart from './components/WarehouseOverviewChart';
import WarehouseTopAgingChart from './components/WarehouseTopAgingChart';
import WarehouseInventoryTable from './components/WarehouseInventoryTable';
import WarehousePagination from './components/WarehousePagination';
import WarehouseColumnModal from './components/WarehouseColumnModal';
import WarehouseImportModal from './components/WarehouseImportModal';
import WarehouseMaterialDetailModal from './components/WarehouseMaterialDetailModal';

/**
 * Trang Quản lý kho (Báo cáo Xuất - Nhập - Tồn)
 * 
 * Kiến trúc giao diện 3 khu vực chuẩn mực (Top-Down):
 * Khu vực 1 – Thanh công cụ và bộ lọc chung (Single Source of Truth)
 * Khu vực 2 – Hai biểu đồ đồng bộ dữ liệu (Xu hướng hàng loại/trả về & Top 10 tồn lâu)
 * Khu vực 3 – Bảng dữ liệu Xuất - Nhập - Tồn & Phân trang
 */
export const WarehouseManagementPage = () => {
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle } = useOutletContext() || {};

  useEffect(() => {
    document.title = 'Quản lý kho - SmartFlow ERP';
    if (setCustomTitle) setCustomTitle('Quản lý kho');
    if (setCustomSubtitle) {
      setCustomSubtitle('Theo dõi xuất, nhập và tồn kho vật tư, hàng hóa, thành phẩm');
    }
  }, [setCustomTitle, setCustomSubtitle]);

  // Hook quản lý trạng thái bộ lọc Single Source of Truth
  const wh = useWarehouseInventory({ toast });

  // Modals
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  return (
    <div className="exp-master-container wh-management-container">
      {/* ══════════════════════════════════════════════════════════════
          KHU VỰC 1: THANH CÔNG CỤ VÀ BỘ LỌC CHUNG
          Hàng 1: Toolbar
          Hàng 2: Bộ lọc mở rộng dạng ngang (khi mở phễu)
          Hàng 3: Danh sách 7 Tab kho
          ══════════════════════════════════════════════════════════════ */}
      {/* 1.1. Hàng 1: Thanh công cụ */}
      <WarehouseToolbar
        search={wh.search}
        setSearch={wh.setSearch}
        setPage={wh.setPage}
        sortBy={wh.sortBy}
        setSortBy={wh.setSortBy}
        sortDir={wh.sortDir}
        setSortDir={wh.setSortDir}
        isFilterOpen={wh.isFilterOpen}
        setIsFilterOpen={wh.setIsFilterOpen}
        activeFiltersCount={wh.activeFiltersCount}
        visibleColumns={wh.visibleColumns}
        onToggleColumn={wh.handleToggleColumn}
        onShowAllColumns={wh.handleShowAllColumns}
        onResetDefaultColumns={wh.handleResetDefaultColumns}
        onToggleAllColumns={wh.handleToggleAllColumns}
        onOpenColumnModal={() => setShowColumnModal(true)}
        onOpenImportModal={() => setShowImportModal(true)}
        onExportExcel={wh.handleExportExcel}
        toast={toast}
      />

      {/* 1.2. Hàng 2: Bộ lọc mở rộng dạng ngang (khi mở icon phễu) */}
      {wh.isFilterOpen && (
        <WarehouseFilterBar
          pageSize={wh.pageSize}
          setPageSize={wh.setPageSize}
          setPage={wh.setPage}
          timeFilter={wh.timeFilter}
          setTimeFilter={wh.setTimeFilter}
          selectedWarehouse={wh.selectedWarehouse}
          setSelectedWarehouse={wh.handleSelectWarehouse}
          categoryFilter={wh.categoryFilter}
          setCategoryFilter={wh.setCategoryFilter}
          unitMainFilter={wh.unitMainFilter}
          setUnitMainFilter={wh.setUnitMainFilter}
          stockStatusFilter={wh.stockStatusFilter}
          setStockStatusFilter={wh.setStockStatusFilter}
          activeFiltersCount={wh.activeFiltersCount}
          resetAllFilters={wh.resetAllFilters}
        />
      )}

      {/* 1.3. Hàng 3: Danh sách 7 Tab kho */}
      <WarehouseTabs
        selectedWarehouse={wh.selectedWarehouse}
        onSelectWarehouse={wh.handleSelectWarehouse}
      />

      {/* ══════════════════════════════════════════════════════════════
          KHU VỰC 2: KHỐI 2 BIỂU ĐỒ ĐỒNG BỘ DỮ LIỆU (40% - 60%)
          ══════════════════════════════════════════════════════════════ */}
      <div className="wh-dashboard-grid">
        {/* Biểu đồ Combo bên trái: Xu hướng hàng loại / Trả về */}
        <WarehouseOverviewChart
          selectedWarehouse={wh.selectedWarehouse}
          fromDate={wh.effectiveFromDate}
          toDate={wh.effectiveToDate}
          search={wh.search}
          categoryFilter={wh.categoryFilter}
          unitMainFilter={wh.unitMainFilter}
        />

        {/* Biểu đồ bên phải: Top 10 vật tư tồn lâu nhất (Tính trên toàn bộ danh mục sau lọc) */}
        <WarehouseTopAgingChart
          items={wh.allItems}
          selectedWarehouse={wh.selectedWarehouse}
          toDate={wh.effectiveToDate}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          KHU VỰC 3: BẢNG DỮ LIỆU XUẤT - NHẬP - TỒN & PHÂN TRANG
          ══════════════════════════════════════════════════════════════ */}
      {/* 3.1. Bảng XNT */}
      <WarehouseInventoryTable
        items={wh.items}
        loading={wh.loading}
        page={wh.page}
        pageSize={wh.pageSize}
        totalCount={wh.totalCount}
        visibleColumns={wh.visibleColumns}
        totals={wh.totals}
        onSelectMaterial={setSelectedMaterial}
      />

      {/* 3.2. Phân trang */}
      <WarehousePagination
        page={wh.page}
        setPage={wh.setPage}
        pageSize={wh.pageSize}
        totalCount={wh.totalCount}
        totalPages={wh.totalPages}
        itemsLength={wh.items.length}
      />

      {/* ── MODALS ── */}
      <WarehouseColumnModal
        isOpen={showColumnModal}
        onClose={() => setShowColumnModal(false)}
        visibleColumns={wh.visibleColumns}
        onToggleColumn={wh.handleToggleColumn}
        onToggleGroup={wh.handleToggleGroup}
        onShowAll={wh.handleShowAllColumns}
        onResetDefault={wh.handleResetDefaultColumns}
      />

      <WarehouseImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        toast={toast}
        onImportSuccess={() => wh.fetchReport()}
      />

      {/* Popup chi tiết vật tư (FIFO & Lịch sử) */}
      <WarehouseMaterialDetailModal
        isOpen={!!selectedMaterial}
        onClose={() => setSelectedMaterial(null)}
        material={selectedMaterial}
        initialWarehouse={wh.selectedWarehouse}
        initialFromDate={wh.fromDate}
        initialToDate={wh.toDate}
      />
    </div>
  );
};

export default WarehouseManagementPage;
