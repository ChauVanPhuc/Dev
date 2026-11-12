// GoodsIssuePage.jsx - Trang Quản lý Xuất kho
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '../../styles/goodsReceipt.css';

import { useGoodsIssue } from '../../hooks/useGoodsIssue';
import { goodsIssueService } from '../../services/goodsIssue.service';
import GoodsIssueKPIs from './components/GoodsIssueKPIs';
import GoodsIssueToolbar from './components/GoodsIssueToolbar';
import GoodsIssueFilterBar from './components/GoodsIssueFilterBar';
import GoodsIssueTable from './components/GoodsIssueTable';
import GoodsIssueDetailModal from './components/GoodsIssueDetailModal';
import GoodsIssueImportModal from './components/GoodsIssueImportModal';

export const GoodsIssuePage = () => {
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle } = useOutletContext() || {};

  // Thiết lập tiêu đề và mô tả ngắn bên dưới tiêu đề đồng bộ toàn hệ thống
  useEffect(() => {
    document.title = 'Xuất kho - SmartFlow ERP';
    if (setCustomTitle) setCustomTitle('Xuất kho');
    if (setCustomSubtitle) {
      setCustomSubtitle('Quản lý danh sách phiếu xuất kho, theo dõi tiến độ và đối soát vật tư');
    }
  }, [setCustomTitle, setCustomSubtitle]);

  // Hook quản lý dữ liệu, phân trang, bộ lọc, sắp xếp, chọn dòng
  const wh = useGoodsIssue({ toast });

  // State quản lý hiển thị bộ lọc inline
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // State Modal Chi tiết / Chỉnh sửa / Thêm mới
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);

  // State Modal Nhập Excel
  const [showImportModal, setShowImportModal] = useState(false);

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    setSelectedIssue(null);
    setIsCreateMode(true);
    setIsEditMode(false);
    setShowDetailModal(true);
  };

  // Mở modal xem hoặc sửa
  const handleOpenDetailModal = (issue, isEdit = false) => {
    setSelectedIssue(issue);
    setIsCreateMode(false);
    setIsEditMode(isEdit);
    setShowDetailModal(true);
  };

  // Lưu phiếu xuất kho (Thêm mới hoặc Cập nhật)
  const handleSaveIssue = async (payload) => {
    try {
      if (isCreateMode) {
        await goodsIssueService.createIssue(payload);
        if (toast?.success) toast.success(`Đã tạo mới phiếu ${payload.voucher_no} thành công!`);
      } else if (selectedIssue) {
        await goodsIssueService.updateIssue(selectedIssue.id, payload);
        if (toast?.success) toast.success(`Đã cập nhật phiếu ${payload.voucher_no} thành công!`);
      }
      setShowDetailModal(false);
      wh.fetchIssues();
    } catch (err) {
      if (toast?.error) toast.error('Lỗi khi lưu phiếu xuất kho: ' + err.message);
    }
  };

  // Xóa các dòng đã chọn
  const handleDeleteSelected = () => {
    if (!wh.selectedIds || wh.selectedIds.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${wh.selectedIds.length} phiếu xuất kho đã chọn?`)) {
      wh.handleDeleteIssues(wh.selectedIds);
    }
  };

  // Xóa 1 phiếu
  const handleDeleteSingle = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa phiếu xuất kho này?')) {
      wh.handleDeleteIssues([id]);
    }
  };

  // Sau khi import Excel thành công
  const handleImportSuccess = (importedRows) => {
    if (toast?.success) {
      toast.success(`Đã nạp thành công ${importedRows.length} phiếu xuất kho từ tệp Excel!`);
    }
    wh.fetchIssues();
  };

  // Đồng bộ dữ liệu
  const handleSyncData = () => {
    if (toast?.info) toast.info('Đang đồng bộ dữ liệu xuất kho...');
    wh.fetchIssues();
    setTimeout(() => {
      if (toast?.success) toast.success('Đã đồng bộ dữ liệu xuất kho mới nhất!');
    }, 600);
  };

  return (
    <div className="wh-master-container">
      {/* 1. Dãy 4 thẻ KPI theo phong cách Đơn hàng xuất khẩu & Nhập kho */}
      <GoodsIssueKPIs stats={wh.stats} totalCount={wh.totalCount} />

      {/* 2. Thanh công cụ Toolbar (Tìm kiếm, Sắp xếp, Lọc, Cột hiển thị, Khác, Nhập/Xuất Excel, Thêm mới) */}
      <GoodsIssueToolbar
        search={wh.search}
        setSearch={wh.setSearch}
        setPage={wh.setPage}
        sortBy={wh.sortBy}
        setSortBy={wh.setSortBy}
        sortDir={wh.sortDir}
        setSortDir={wh.setSortDir}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        activeFiltersCount={wh.activeFiltersCount}
        visibleColumns={wh.visibleColumns}
        setVisibleColumns={wh.setVisibleColumns}
        handleToggleColumn={wh.handleToggleColumn}
        handleShowAllColumns={wh.handleShowAllColumns}
        handleResetDefaultColumns={wh.handleResetDefaultColumns}
        isColumnsMenuOpen={wh.isColumnsMenuOpen}
        setIsColumnsMenuOpen={wh.setIsColumnsMenuOpen}
        selectedIds={wh.selectedIds}
        handleDeleteSelected={handleDeleteSelected}
        openUploadModal={() => setShowImportModal(true)}
        handleExportExcel={wh.handleExportExcel}
        openCreateModal={handleOpenCreateModal}
        onSyncData={handleSyncData}
      />

      {/* 3. Thanh bộ lọc inline (Kho, Loại phiếu, Trạng thái, Bộ phận, Người tạo, From-To date, Khách hàng) */}
      {isFilterOpen && (
        <GoodsIssueFilterBar
          pageSize={wh.pageSize}
          setPageSize={wh.setPageSize}
          setPage={wh.setPage}
          activeDropdown={wh.activeDropdown}
          setActiveDropdown={wh.setActiveDropdown}
          warehouseFilter={wh.warehouseFilter}
          setWarehouseFilter={wh.setWarehouseFilter}
          issueTypeFilter={wh.issueTypeFilter}
          setIssueTypeFilter={wh.setIssueTypeFilter}
          statusFilter={wh.statusFilter}
          setStatusFilter={wh.setStatusFilter}
          departmentFilter={wh.departmentFilter}
          setDepartmentFilter={wh.setDepartmentFilter}
          createdByFilter={wh.createdByFilter}
          setCreatedByFilter={wh.setCreatedByFilter}
          customerFilter={wh.customerFilter}
          setCustomerFilter={wh.setCustomerFilter}
          dateRange={wh.dateRange}
          setDateRange={wh.setDateRange}
          activeFiltersCount={wh.activeFiltersCount}
          resetAllFilters={wh.resetAllFilters}
        />
      )}

      {/* 4. Bảng danh sách phiếu xuất kho (16 cột, thao tác 3 chấm gọn nhẹ) kèm Phân trang */}
      <GoodsIssueTable
        issues={wh.issues}
        loading={wh.loading}
        totalCount={wh.totalCount}
        totalPages={wh.totalPages}
        page={wh.page}
        setPage={wh.setPage}
        pageSize={wh.pageSize}
        sortBy={wh.sortBy}
        setSortBy={wh.setSortBy}
        sortDir={wh.sortDir}
        setSortDir={wh.setSortDir}
        selectedIds={wh.selectedIds}
        setSelectedIds={wh.setSelectedIds}
        visibleColumns={wh.visibleColumns}
        onOpenDetailModal={handleOpenDetailModal}
        onDeleteIssue={handleDeleteSingle}
      />

      {/* 5. Modal Chi tiết / Chỉnh sửa / Thêm mới */}
      <GoodsIssueDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        initialData={selectedIssue}
        isEditMode={isEditMode}
        isCreateMode={isCreateMode}
        onSave={handleSaveIssue}
      />

      {/* 6. Modal Nhập dữ liệu từ Excel */}
      <GoodsIssueImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default GoodsIssuePage;
