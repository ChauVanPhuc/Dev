// UnitOfMeasureView.jsx - Màn hình Quản lý đơn vị tính
// SmartFlow ERP G7 - Đồng bộ Design System với module Đơn hàng xuất khẩu
import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/exportOrderBase.css';
import '../styles/unitOfMeasure.css';

import { useUnitOfMeasure } from '../hooks/useUnitOfMeasure';
import UnitOfMeasureToolbar from '../components/UnitOfMeasureToolbar';
import UnitOfMeasureFilterBar from '../components/UnitOfMeasureFilterBar';
import UnitOfMeasureTable from '../components/UnitOfMeasureTable';
import UnitOfMeasureFormModal from '../components/UnitOfMeasureFormModal';
import UnitOfMeasureDeleteModal from '../components/UnitOfMeasureDeleteModal';
import UnitOfMeasureImportModal from '../components/UnitOfMeasureImportModal';

export const UnitOfMeasureView = () => {
  const { toast } = useToast();
  const { setCustomTitle, setCustomSubtitle } = useOutletContext() || {};

  useEffect(() => {
    document.title = 'Quản lý đơn vị tính - SmartFlow ERP';
    if (setCustomTitle) setCustomTitle('Quản lý đơn vị tính');
    if (setCustomSubtitle) setCustomSubtitle('');
  }, [setCustomTitle, setCustomSubtitle]);

  // Hook quản lý dữ liệu, phân trang, lọc và sắp xếp
  const uom = useUnitOfMeasure({ toast });

  // Quản lý hiển thị thanh bộ lọc (mặc định mở giống ExportOrder)
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  // Modal Thêm mới / Chỉnh sửa
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);

  // Modal Xóa có kiểm soát ràng buộc
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);

  // Modal Nhập Excel
  const [showImportModal, setShowImportModal] = useState(false);

  // Handlers mở modal
  const handleOpenCreateModal = () => {
    setSelectedUnit(null);
    setIsEditMode(false);
    setShowFormModal(true);
  };

  const handleOpenEditModal = (unit) => {
    setSelectedUnit(unit);
    setIsEditMode(true);
    setShowFormModal(true);
  };

  const handleOpenDeleteModal = (unit) => {
    setUnitToDelete(unit);
    setShowDeleteModal(true);
  };

  const handleSaveForm = async (payload) => {
    if (isEditMode && selectedUnit) {
      await uom.updateUnit(selectedUnit.id, payload);
    } else {
      await uom.createUnit(payload);
    }
  };

  const handleConfirmDelete = async (unit) => {
    try {
      await uom.deleteUnit(unit.id);
    } catch (err) {
      if (toast?.error) toast.error(err.message || 'Lỗi khi xóa đơn vị tính');
    }
  };

  const handleSwitchToInactive = async (unit) => {
    try {
      await uom.toggleStatus(unit.id);
    } catch (err) {
      if (toast?.error) toast.error(err.message || 'Lỗi khi đổi trạng thái');
    }
  };

  const handleImportSuccess = (count) => {
    uom.fetchUnits();
    if (toast?.success) toast.success(`Đã nhập thành công ${count} đơn vị tính từ Excel!`);
  };

  return (
    <div className="exp-master-container">
      {/* Thanh công cụ: Tìm kiếm, Sắp xếp, Bật/tắt lọc, Nút Thêm mới, Nhập/Xuất Excel */}
      <UnitOfMeasureToolbar
        search={uom.search}
        setSearch={uom.setSearch}
        setPage={uom.setPage}
        sortBy={uom.sortBy}
        setSortBy={uom.setSortBy}
        sortDir={uom.sortDir}
        setSortDir={uom.setSortDir}
        isFilterOpen={isFilterOpen}
        setIsFilterOpen={setIsFilterOpen}
        activeFiltersCount={uom.activeFiltersCount}
        openCreateModal={handleOpenCreateModal}
        openImportModal={() => setShowImportModal(true)}
        handleExportExcel={uom.exportExcel}
      />

      {/* Thanh bộ lọc inline: Số dòng/trang, Trạng thái, Xóa bộ lọc */}
      {isFilterOpen && (
        <UnitOfMeasureFilterBar
          pageSize={uom.pageSize}
          setPageSize={uom.setPageSize}
          setPage={uom.setPage}
          statusFilter={uom.statusFilter}
          setStatusFilter={uom.setStatusFilter}
          activeFiltersCount={uom.activeFiltersCount}
          resetAllFilters={uom.resetAllFilters}
          activeDropdown={uom.activeDropdown}
          setActiveDropdown={uom.setActiveDropdown}
        />
      )}

      {/* Bảng danh sách đơn vị tính và phân trang */}
      <UnitOfMeasureTable
        units={uom.pagedUnits}
        loading={uom.loading}
        totalCount={uom.totalCount}
        totalPages={uom.totalPages}
        page={uom.page}
        setPage={uom.setPage}
        pageSize={uom.pageSize}
        sortBy={uom.sortBy}
        setSortBy={uom.setSortBy}
        sortDir={uom.sortDir}
        setSortDir={uom.setSortDir}
        onEdit={handleOpenEditModal}
        onToggleStatus={uom.toggleStatus}
        onDelete={handleOpenDeleteModal}
      />

      {/* Popup Thêm mới / Chỉnh sửa */}
      <UnitOfMeasureFormModal
        show={showFormModal}
        isEdit={isEditMode}
        unit={selectedUnit}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveForm}
      />

      {/* Popup Xóa có kiểm soát */}
      <UnitOfMeasureDeleteModal
        show={showDeleteModal}
        unit={unitToDelete}
        onClose={() => {
          setShowDeleteModal(false);
          setUnitToDelete(null);
        }}
        onConfirmDelete={handleConfirmDelete}
        onSwitchToInactive={handleSwitchToInactive}
      />

      {/* Popup Nhập Excel */}
      <UnitOfMeasureImportModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
};

export default UnitOfMeasureView;
