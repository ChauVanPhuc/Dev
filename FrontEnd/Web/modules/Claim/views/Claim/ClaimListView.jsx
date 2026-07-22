import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Plus } from 'lucide-react';
import { claimService } from '../../services/claim.service';
import { normalizePenaltyValue, parseDate } from '../../utils/claimHelpers';
import { API_ROOT } from '@webShared/Services/api.service';
import '../../styles/claim.css';
import '@styles/components.css';

// Import shared components
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { FilterModal, FormModal, AlertModal } from '../../components/Modal';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';

// Import sub-components
import ClaimCreateModal from '../../components/ClaimList/ClaimCreateModal';
import ClaimProcessModal from '../../components/ClaimList/ClaimProcessModal';
import ClaimAnalyticsModal from '../../components/ClaimList/ClaimAnalyticsModal';
import ExceptionClaimModal from '../../components/ClaimList/ExceptionClaimModal';
import ReviewClaimModal from '../../components/ClaimList/ReviewClaimModal';

// Import new modular UI components
import ClaimOverviewCards from '../../components/ClaimList/ClaimOverviewCards';
import ClaimFilterBar from '../../components/ClaimList/ClaimFilterBar';
import ClaimTableSection from '../../components/ClaimList/ClaimTableSection';

// Import custom hook
import { useClaimList } from '../hooks/useClaimList';

const ClaimListView = () => {
  const list = useClaimList();

  return (
    <div className="claim-container">
      {/* SECTION 2: THREE SUMMARY CARDS */}
      <ClaimOverviewCards
        kpiData={list.kpiData}
        setIsAnalyticsOpen={list.setIsAnalyticsOpen}
        exceptionData={list.exceptionData}
        setIsExceptionModalOpen={list.setIsExceptionModalOpen}
        claims={list.claims}
        setIsReviewModalOpen={list.setIsReviewModalOpen}
        setReviewCurrentPage={list.setReviewCurrentPage}
      />

      {/* SECTION 3: DETAILED REPORT HEADER */}
      <div className="mgmt-toolbar card" style={{ 
        marginBottom: '12px', 
        flexShrink: 0, 
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '10px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #EADCC9',
        height: '52px',
        boxSizing: 'border-box'
      }}>
        {/* Left Side: Search + A↓Z + Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Search Input Box */}
          <div className="search-wrapper" style={{ 
            margin: 0, 
            height: '36px', 
            borderRadius: '20px', 
            border: '1px solid #C4B5A5', 
            padding: '0 14px',
            width: '320px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} className="search-icon" style={{ color: '#8D6E63', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search nhanh SKU, Cont, LPN..." 
              value={list.quickSearch}
              onChange={(e) => list.setQuickSearch(e.target.value)}
              style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#2D1A12',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>

          {/* Sort Button A↓Z */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => { list.setShowSortDropdown(!list.showSortDropdown); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: list.sortOption ? '#7B5233' : '#8D6E63',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              title="Sắp xếp danh sách"
              onMouseEnter={(e) => e.currentTarget.style.color = '#7B5233'}
              onMouseLeave={(e) => e.currentTarget.style.color = list.sortOption ? '#7B5233' : '#8D6E63'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="15" y1="4" x2="15" y2="20" />
                <polyline points="11 16 15 20 19 16" />
                <text x="3" y="10" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">A</text>
                <text x="3" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">Z</text>
              </svg>
            </button>
            {list.showSortDropdown && (
              <div style={{
                position: 'absolute', top: '40px', left: 0, zIndex: 100,
                background: '#fff', border: '1px solid #EADCC9', borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(123,82,51,0.12)', padding: '6px 0',
                minWidth: '190px', animation: 'fadeIn 0.15s ease'
              }}>
                {[
                  { value: '', label: 'Mặc định' },
                  { value: 'name-asc', label: 'Tên: A → Z' },
                  { value: 'name-desc', label: 'Tên: Z → A' },
                  { value: 'time-asc', label: 'Thời gian: Sớm nhất' },
                  { value: 'time-desc', label: 'Thời gian: Mới nhất' }
                ].map(item => (
                  <div
                    key={item.value}
                    onClick={() => { list.setSortOption(item.value); list.setShowSortDropdown(false); }}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: '0.82rem',
                      fontWeight: list.sortOption === item.value ? '700' : '500',
                      color: list.sortOption === item.value ? '#7B5233' : '#5D4037',
                      backgroundColor: list.sortOption === item.value ? '#FAF6F0' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = list.sortOption === item.value ? '#FAF6F0' : 'transparent'}
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Filter Funnel Icon Button */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => list.setIsFilterBarOpen(!list.isFilterBarOpen)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: list.isFilterBarOpen || list.activeFiltersCount > 0 ? '#7B5233' : '#8D6E63',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                outline: 'none',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              title="Bộ lọc nâng cao"
              onMouseEnter={(e) => e.currentTarget.style.color = '#7B5233'}
              onMouseLeave={(e) => e.currentTarget.style.color = list.isFilterBarOpen || list.activeFiltersCount > 0 ? '#7B5233' : '#8D6E63'}
            >
              <Filter size={20} strokeWidth={list.isFilterBarOpen || list.activeFiltersCount > 0 ? 3 : 2} />
              {list.activeFiltersCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-4px',
                  backgroundColor: '#A0301B',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #FFFFFF'
                }}>
                  {list.activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {list.hasWritePermission && (
            <button
              type="button"
              onClick={list.handleImportExcelClick}
              disabled={list.isExcelImporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '0.8rem',
                cursor: list.isExcelImporting ? 'not-allowed' : 'pointer',
                backgroundColor: list.isExcelImporting ? '#E0D0C0' : '#FAF6F0',
                color: '#7B5233',
                border: '1.5px solid #EADCC9',
                transition: 'background-color 0.2s',
                opacity: list.isExcelImporting ? 0.7 : 1
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>{list.isExcelImporting ? 'Đang nhập...' : 'Nhập Excel'}</span>
            </button>
          )}

          {list.hasWritePermission && (
            <input
              type="file"
              ref={list.excelInputRef}
              style={{ display: 'none' }}
              accept=".xlsx, .xls"
              onChange={list.handleExcelFileChange}
            />
          )}

          {/* Excel Export Menu Trigger */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={() => list.setIsExporting(!list.isExporting)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '0.8rem',
                cursor: 'pointer',
                backgroundColor: '#FAF6F0',
                color: '#7B5233',
                border: '1.5px solid #EADCC9',
                transition: 'background-color 0.2s'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Xuất Excel</span>
            </button>
            {list.isExporting && (
              <div style={{
                position: 'absolute', top: '40px', right: 0, zIndex: 100,
                background: '#fff', border: '1px solid #EADCC9', borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(123,82,51,0.12)', padding: '6px 0',
                minWidth: '190px', animation: 'fadeIn 0.15s ease',
                display: 'flex', flexDirection: 'column'
              }}>
                <button
                  type="button"
                  onClick={() => { list.setIsExporting(false); list.handleExportExcel('current'); }}
                  style={{
                    padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.82rem', fontWeight: '500', color: '#5D4037', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span>Xuất trang hiện tại</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { list.setIsExporting(false); list.handleExportExcel('all'); }}
                  style={{
                    padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
                    fontSize: '0.82rem', fontWeight: '500', color: '#5D4037', transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    <span>Xuất tất cả</span>
                  </div>
                  <span style={{
                    backgroundColor: '#7B5233',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    marginLeft: '8px'
                  }}>
                    {list.claims.length}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* 4. NÚT TẠO MỚI */}
          {list.hasWritePermission && (
            <button
              type="button"
              onClick={list.handleOpenAddNewClaim}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 14px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.82rem',
                cursor: 'pointer',
                backgroundColor: '#4A2E1B',
                color: '#FFFFFF',
                border: 'none',
                transition: 'background-color 0.2s',
                boxShadow: 'none'
              }}
            >
              <Plus size={14} strokeWidth={3} />
              <span>Tạo mới</span>
            </button>
          )}
        </div>

        {list.hasWritePermission && (
          <input
            type="file"
            ref={list.pdfInputRef}
            style={{ display: 'none' }}
            accept=".pdf"
            multiple
            onChange={list.handlePdfFileChange}
          />
        )}
        {list.hasWritePermission && (
          <input
            type="file"
            ref={list.folderInputRef}
            style={{ display: 'none' }}
            webkitdirectory=""
            directory=""
            multiple
            onChange={list.handleFolderFileChange}
          />
        )}
      </div>

      {/* INLINE EXPANDABLE FILTER BAR */}
      <ClaimFilterBar
        isOpen={list.isFilterBarOpen}
        activeDropdown={list.activeDropdown}
        setActiveDropdown={list.setActiveDropdown}
        appliedFilters={list.appliedFilters}
        editYear={list.editYear}
        setEditYear={list.setEditYear}
        editMonth={list.editMonth}
        setEditMonth={list.setEditMonth}
        editStartDate={list.editStartDate}
        setEditStartDate={list.setEditStartDate}
        editEndDate={list.editEndDate}
        setEditEndDate={list.setEditEndDate}
        editStatus={list.editStatus}
        setEditStatus={list.setEditStatus}
        editSku={list.editSku}
        setEditSku={list.setEditSku}
        editClaimItem={list.editClaimItem}
        setEditClaimItem={list.setEditClaimItem}
        editDefectCode={list.editDefectCode}
        setEditDefectCode={list.setEditDefectCode}
        editCompanyErrorCode={list.editCompanyErrorCode}
        setEditCompanyErrorCode={list.setEditCompanyErrorCode}
        editContainer={list.editContainer}
        setEditContainer={list.setEditContainer}
        editLpn={list.editLpn}
        setEditLpn={list.setEditLpn}
        editPenalty={list.editPenalty}
        setEditPenalty={list.setEditPenalty}
        editPenaltyTotal={list.editPenaltyTotal}
        setEditPenaltyTotal={list.setEditPenaltyTotal}
        showSkuSuggestions={list.showSkuSuggestions}
        setShowSkuSuggestions={list.setShowSkuSuggestions}
        showClaimItemSuggestions={list.showClaimItemSuggestions}
        setShowClaimItemSuggestions={list.setShowClaimItemSuggestions}
        showDefectCodeSuggestions={list.showDefectCodeSuggestions}
        setShowDefectCodeSuggestions={list.setShowDefectCodeSuggestions}
        showCompanyErrorCodeSuggestions={list.showCompanyErrorCodeSuggestions}
        setShowCompanyErrorCodeSuggestions={list.setShowCompanyErrorCodeSuggestions}
        showPenaltySuggestions={list.showPenaltySuggestions}
        setShowPenaltySuggestions={list.setShowPenaltySuggestions}
        uniqueSkuOptions={list.uniqueSkuOptions}
        uniqueClaimItemOptions={list.uniqueClaimItemOptions}
        uniqueDefectCodeOptions={list.uniqueDefectCodeOptions}
        uniqueCompanyErrorCodeOptions={list.uniqueCompanyErrorCodeOptions}
        uniquePenaltyOptions={list.uniquePenaltyOptions}
        uniqueCompanyErrorNameOptions={list.uniqueCompanyErrorNameOptions}
        activeFiltersCount={list.activeFiltersCount}
        applyFilters={list.applyFilters}
        clearAllFilters={list.clearAllFilters}
        removeFilterKey={list.removeFilterKey}
        rowsPerPage={list.rowsPerPage}
        setRowsPerPage={list.setRowsPerPage}
        setCurrentPage={list.setCurrentPage}
        handleYearChange={list.handleYearChange}
        handleMonthChange={list.handleMonthChange}
        handleStartDateChange={list.handleStartDateChange}
        handleEndDateChange={list.handleEndDateChange}
        isDateFilterValid={list.isDateFilterValid}
        editKpiShowAllTime={list.editKpiShowAllTime}
        setEditKpiShowAllTime={list.setEditKpiShowAllTime}
        uniqueContainerOptions={list.uniqueContainerOptions}
        showContainerSuggestions={list.showContainerSuggestions}
        setShowContainerSuggestions={list.setShowContainerSuggestions}
        uniqueLpnOptions={list.uniqueLpnOptions}
        showLpnSuggestions={list.showLpnSuggestions}
        setShowLpnSuggestions={list.setShowLpnSuggestions}
      />

      {/* SECTION 4: MAIN DETAILED TABLE */}
      <ClaimTableSection
        loading={list.loading}
        claims={list.claims}
        tableHeaders={list.tableHeaders}
        paginatedClaims={list.paginatedClaims}
        highlightBatchId={list.highlightBatchId}
        actionMenuId={list.actionMenuId}
        setActionMenuId={list.setActionMenuId}
        setActiveDetailClaim={list.setActiveDetailClaim}
        setModalMode={list.setModalMode}
        hasWritePermission={list.hasWritePermission}
        selectedClaimIds={list.selectedClaimIds}
        handleToggleSelectRow={list.handleToggleSelectRow}
        startIndex={list.startIndex}
        mapCustomerDefectsToG7Name={list.mapCustomerDefectsToG7Name}
        formatPenaltyValue={list.formatPenaltyValue}
        calculateTotalPenalty={list.calculateTotalPenalty}
        safeCurrentPage={list.safeCurrentPage}
        totalPages={list.totalPages}
        endIndex={list.endIndex}
        totalFilteredItems={list.totalFilteredItems}
        setCurrentPage={list.setCurrentPage}
      />

      {/* POPUP MODALS */}
      <ClaimProcessModal
        isOpen={!!list.activeDetailClaim}
        onClose={() => { list.setActiveDetailClaim(null); list.setExceptionNavMode(false); list.setExceptionNavClaims([]); }}
        onSubmit={list.handleSaveProcessClaim}
        title={list.processModalTitle}
        modalMode={list.modalMode}
        setModalMode={list.setModalMode}
        exceptionNavMode={list.exceptionNavMode}
        exceptionProcessedCount={list.exceptionProcessedCount}
        exceptionNavClaims={list.exceptionNavClaims}
        claimNavFooterActions={list.claimNavFooterActions}
        claimNavLeftSideAction={list.claimNavLeftSideAction}
        claimNavRightSideAction={list.claimNavRightSideAction}
        processDongHang={list.processDongHang}
        setProcessDongHang={list.setProcessDongHang}
        processLoaiClaim={list.processLoaiClaim}
        setProcessLoaiClaim={list.setProcessLoaiClaim}
        processMaThamChieu={list.processMaThamChieu}
        setProcessMaThamChieu={list.setProcessMaThamChieu}
        processTenSanPham={list.processTenSanPham}
        setProcessTenSanPham={list.setProcessTenSanPham}
        processMucPhat={list.processMucPhat}
        setProcessMucPhat={list.setProcessMucPhat}
        processGiaTriPhat={list.processGiaTriPhat}
        setProcessGiaTriPhat={list.setProcessGiaTriPhat}
        formatPenaltyValue={list.formatPenaltyValue}
        getProcessTotalPenaltyPreview={list.getProcessTotalPenaltyPreview}
        processMaLoi={list.processMaLoi}
        setProcessMaLoi={list.setProcessMaLoi}
        processMaLoiCty={list.processMaLoiCty}
        setProcessMaLoiCty={list.setProcessMaLoiCty}
        showProcessG7CodeSuggestions={list.showProcessG7CodeSuggestions}
        setShowProcessG7CodeSuggestions={list.setShowProcessG7CodeSuggestions}
        uniqueCompanyErrorCodeOptions={list.uniqueCompanyErrorCodeOptions}
        handleSelectG7Code={list.handleSelectG7Code}
        processTenLoiG7={list.processTenLoiG7}
        setProcessTenLoiG7={list.setProcessTenLoiG7}
        showProcessG7NameSuggestions={list.showProcessG7NameSuggestions}
        setShowProcessG7NameSuggestions={list.setShowProcessG7NameSuggestions}
        uniqueCompanyErrorNameOptions={list.uniqueCompanyErrorNameOptions}
        handleSelectG7Name={list.handleSelectG7Name}
        processLpn={list.processLpn}
        setProcessLpn={list.setProcessLpn}
        processMaCont={list.processMaCont}
        setProcessMaCont={list.setProcessMaCont}
        processNgayXuat={list.processNgayXuat}
        setProcessNgayXuat={list.setProcessNgayXuat}
        processTrangThaiXuLy={list.processTrangThaiXuLy}
        setProcessTrangThaiXuLy={list.setProcessTrangThaiXuLy}
        processLinkCapa={list.processLinkCapa}
        setProcessLinkCapa={list.setProcessLinkCapa}
        processGhiChu={list.processGhiChu}
        setProcessGhiChu={list.setProcessGhiChu}
        processImages={list.processImages}
        handleProcessAddImageClick={list.handleProcessAddImageClick}
        handleEditProcessImageClick={list.handleEditProcessImageClick}
        handleDeleteProcessImageClick={list.handleDeleteProcessImageClick}
        getFullImagePath={list.getFullImagePath}
        setPreviewImage={list.setPreviewImage}
        processImageCaptions={list.processImageCaptions}
        disabledFieldStyle={list.disabledFieldStyle}
        claimService={claimService}
        setClaims={list.setClaims}
        activeDetailClaim={list.activeDetailClaim}
        setActiveDetailClaim={list.setActiveDetailClaim}
      />

      <ClaimCreateModal
        isOpen={list.isAddModalOpen}
        onClose={() => list.setIsAddModalOpen(false)}
        onSubmit={list.handleSaveNewClaim}
        addDongHang={list.addDongHang}
        setAddDongHang={list.setAddDongHang}
        addLoaiClaim={list.addLoaiClaim}
        setAddLoaiClaim={list.setAddLoaiClaim}
        addMaThamChieu={list.addMaThamChieu}
        setAddMaThamChieu={list.setAddMaThamChieu}
        addTenSanPham={list.addTenSanPham}
        setAddTenSanPham={list.setAddTenSanPham}
        addMucPhat={list.addMucPhat}
        setAddMucPhat={list.setAddMucPhat}
        addGiaTriPhat={list.addGiaTriPhat}
        setAddGiaTriPhat={list.setAddGiaTriPhat}
        showAddSuggestions={list.showAddSuggestions}
        setShowAddSuggestions={list.setShowAddSuggestions}
        uniquePenaltyOptions={list.uniquePenaltyOptions}
        formatPenaltyValue={list.formatPenaltyValue}
        getAddTotalPenaltyPreview={list.getAddTotalPenaltyPreview}
        addMaLoi={list.addMaLoi}
        setAddMaLoi={list.setAddMaLoi}
        showAddDefectSuggestions={list.showAddDefectSuggestions}
        setShowAddDefectSuggestions={list.setShowAddDefectSuggestions}
        defectCatalog={list.defectCatalog}
        addMaLoiCty={list.addMaLoiCty}
        setAddMaLoiCty={list.setAddMaLoiCty}
        showAddG7CodeSuggestions={list.showAddG7CodeSuggestions}
        setShowAddG7CodeSuggestions={list.setShowAddG7CodeSuggestions}
        uniqueCompanyErrorCodeOptions={list.uniqueCompanyErrorCodeOptions}
        handleSelectG7Code={list.handleSelectG7Code}
        addTenLoiG7={list.addTenLoiG7}
        setAddTenLoiG7={list.setAddTenLoiG7}
        showAddG7NameSuggestions={list.showAddG7NameSuggestions}
        setShowAddG7NameSuggestions={list.setShowAddG7NameSuggestions}
        uniqueCompanyErrorNameOptions={list.uniqueCompanyErrorNameOptions}
        handleSelectG7Name={list.handleSelectG7Name}
        addLpn={list.addLpn}
        setAddLpn={list.setAddLpn}
        addMaCont={list.addMaCont}
        setAddMaCont={list.setAddMaCont}
        addNgayXuat={list.addNgayXuat}
        setAddNgayXuat={list.setAddNgayXuat}
        addTrangThaiXuLy={list.addTrangThaiXuLy}
        setAddTrangThaiXuLy={list.setAddTrangThaiXuLy}
        addLinkCapa={list.addLinkCapa}
        setAddLinkCapa={list.setAddLinkCapa}
        addGhiChu={list.addGhiChu}
        setAddGhiChu={list.setAddGhiChu}
        addModalError={list.addModalError}
        addImages={list.addImages}
        handleAddImageClick={list.handleAddImageClick}
        handleEditAddImageClick={list.handleEditAddImageClick}
        handleDeleteAddImageClick={list.handleDeleteAddImageClick}
        getFullImagePath={list.getFullImagePath}
        setPreviewImage={list.setPreviewImage}
        addImageCaptions={list.addImageCaptions}
        disabledFieldStyle={list.disabledFieldStyle}
      />

      <ClaimAnalyticsModal
        isOpen={list.isAnalyticsOpen}
        onClose={() => list.setIsAnalyticsOpen(false)}
        analyticsViewTab={list.analyticsViewTab}
        setAnalyticsViewTab={list.setAnalyticsViewTab}
        analyticsData={list.analyticsData}
        customerPenalties={list.customerPenalties}
        setCustomerPenalties={list.setCustomerPenalties}
        editingMonthData={list.editingMonthData}
        setEditingMonthData={list.setEditingMonthData}
        editValue={list.editValue}
        setEditValue={list.setEditValue}
        showModal={list.showModal}
        handleCreditNotePdfChange={list.handleCreditNotePdfChange}
        isParsingPdf={list.isParsingPdf}
        totalCountAll={list.totalCountAll}
        totalG7AmountAll={list.totalG7AmountAll}
        totalCustomerAmountAll={list.totalCustomerAmountAll}
        filteredClaimsToDisplay={list.filteredClaimsToDisplay}
      />

      <ExceptionClaimModal
        isOpen={list.isExceptionModalOpen}
        onClose={() => list.setIsExceptionModalOpen(false)}
        exceptionData={list.exceptionData}
        exceptionActiveTab={list.exceptionActiveTab}
        setExceptionActiveTab={list.setExceptionActiveTab}
        expandedExceptionItems={list.expandedExceptionItems}
        setExpandedExceptionItems={list.setExpandedExceptionItems}
        exceptionActionMenuId={list.exceptionActionMenuId}
        setExceptionActionMenuId={list.setExceptionActionMenuId}
        handleStartExceptionProcessing={list.handleStartExceptionProcessing}
        normalizePenaltyValue={list.normalizePenaltyValue}
        formatPenaltyValue={list.formatPenaltyValue}
        calculateTotalPenalty={list.calculateTotalPenalty}
        getFullImagePath={list.getFullImagePath}
        setPreviewImage={list.setPreviewImage}
        filteredClaimsToDisplay={list.filteredClaimsToDisplay}
      />

      <ReviewClaimModal
        isOpen={list.isReviewModalOpen}
        onClose={() => list.setIsReviewModalOpen(false)}
        underReviewClaims={list.underReviewClaims}
        reviewPaginatedClaims={list.reviewPaginatedClaims}
        reviewStartIndex={list.reviewStartIndex}
        mapCustomerDefectsToG7Name={list.mapCustomerDefectsToG7Name}
        formatPenaltyValue={list.formatPenaltyValue}
        calculateTotalPenalty={list.calculateTotalPenalty}
        reviewActionMenuId={list.reviewActionMenuId}
        setReviewActionMenuId={list.setReviewActionMenuId}
        setActiveDetailClaim={list.setActiveDetailClaim}
        setModalMode={list.setModalMode}
        handleMarkClaimProcessed={list.handleMarkClaimProcessed}
        reviewTotalPages={list.reviewTotalPages}
        reviewCurrentPage={list.reviewCurrentPage}
        setReviewCurrentPage={list.setReviewCurrentPage}
      />
    </div>
  );
};

export default ClaimListView;
