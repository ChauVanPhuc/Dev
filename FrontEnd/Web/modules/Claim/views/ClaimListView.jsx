import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import claimService from '../services/claim.service';

import { useClaimFilter } from '../hooks/useClaimFilter';
import { useClaimStatistics } from '../hooks/useClaimStatistics';
import { useClaimImport } from '../hooks/useClaimImport';
import { useClaimForm } from '../hooks/useClaimForm';

import {
  normalizePenaltyValue,
  calculateTotalPenalty,
  formatPenaltyValue,
  API_ROOT,
  resolveG7ErrorCode,
  resolveG7ErrorName
} from '../utils/claimHelpers';

import { ClaimStatsCards } from '../components/ClaimStatsCards';
import { ClaimToolbar } from '../components/ClaimToolbar';
import { ClaimFilterBar } from '../components/ClaimFilterBar';
import { ClaimTable } from '../components/ClaimTable';
import { Pagination } from '../components/Pagination';

import { ClaimMonthlyStatsModal } from '../components/ClaimMonthlyStatsModal';
import { ClaimCustomerPenaltyModal } from '../components/ClaimCustomerPenaltyModal';
import { ClaimReviewModal } from '../components/ClaimReviewModal';
import { ClaimExceptionModal } from '../components/ClaimExceptionModal';
import { ClaimAddModal } from '../components/ClaimAddModal';
import { ClaimProcessModal } from '../components/ClaimProcessModal';
import { ClaimImageZoomModal } from '../components/ClaimImageZoomModal';
import { ClaimPdfFolderModal } from '../components/ClaimPdfFolderModal';
import { AlertModal } from '../components/Modal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const ClaimListView = () => {
  const hasWritePermission = true;
  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => { });
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => { });
  const setHeaderExtra = outletContext.setHeaderExtra || (() => { });

  // Core Data States
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [g7DefectTypes, setG7DefectTypes] = useState([]);
  const [cabinetPrices, setCabinetPrices] = useState([]);

  // Local alert notification popup state
  const [localNotification, setLocalNotification] = useState(null);
  const showModal = (title, message, type = 'info') => {
    setLocalNotification({ title, message, type });
  };

  // Lightbox Preview Image state
  const [previewImage, setPreviewImage] = useState(null);

  // Initial Data Fetching
  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await claimService.getClaims();
      let rawItems = [];
      if (Array.isArray(response)) {
        rawItems = response;
      } else if (response && Array.isArray(response.items)) {
        rawItems = response.items;
      } else if (response && Array.isArray(response.data)) {
        rawItems = response.data;
      }

      if (rawItems && rawItems.length > 0) {
        const dbMapped = rawItems.map((item) => ({
          id: item.id,
          product_name: item.product_name || item.sku,
          avatar: `https://ui-avatars.com/api/?name=${item.product_name || item.sku}&background=random`,
          claim_code: item.claim_code,
          order_code: item.order_code || item.defect_code,
          company_error_code: item.company_error_code,
          company_error_name: item.company_error_name,
          penalty: item.penalty || item.action || '$0',
          lpn: item.lpn || 'N/A',
          cont: item.cont || item.container_no || 'N/A',
          period: item.period,
          created_at: item.created_at,
          export_date: item.export_date,
          date: item.period || (item.created_at ? (() => {
            const d = new Date(item.created_at);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}-${yyyy}`;
          })() : 'N/A'),
          status: item.status === 'Resolved' || item.status === 'Đã xử lý' || item.status === 'Chấp nhận' ? 'Đã xử lý' : item.status === 'Processing' || item.status === 'Đang xem xét' ? 'Đang xem xét' : 'Mới',
          claim_description: item.description || item.claim_description,
          image_paths: item.image_paths || [],
          image_captions: item.image_captions || [],
          customer_name: item.customer_name || 'N/A',
          severity: item.severity || 'Medium'
        }));
        setClaims(dbMapped);
      } else {
        setClaims([]);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách khiếu nại:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
    claimService.getDefects().then(res => {
      if (res && res.items) setDefectCatalog(res.items);
      else if (Array.isArray(res)) setDefectCatalog(res);
    }).catch(err => console.error('Lỗi tải danh mục mã lỗi KH:', err));

    claimService.getDefectTypes().then(res => {
      if (res && res.items) setG7DefectTypes(res.items);
      else if (Array.isArray(res)) setG7DefectTypes(res);
    }).catch(err => console.error('Lỗi tải danh mục mã lỗi G7:', err));

    claimService.getCabinetPrices().then(res => {
      if (res && res.items) setCabinetPrices(res.items);
      else if (Array.isArray(res)) setCabinetPrices(res);
    }).catch(err => console.error('Lỗi tải bảng giá tủ:', err));
  }, []);

  // Enriched claims array with auto-resolved G7 error code & name mapping
  const enrichedClaims = useMemo(() => {
    return claims.map(c => {
      const code = c.company_error_code || resolveG7ErrorCode(c.order_code || c.defect_code, defectCatalog);
      const name = c.company_error_name || resolveG7ErrorName(code, c.order_code || c.defect_code, g7DefectTypes, defectCatalog);
      return {
        ...c,
        company_error_code: code,
        company_error_name: name
      };
    });
  }, [claims, defectCatalog, g7DefectTypes]);

  // Header Title and Top Right Icons
  useEffect(() => {
    setCustomTitle('Quản lý khiếu nại');
    setCustomSubtitle('AD2 · Tổng quan hệ thống');
    setHeaderExtra(
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginRight: '10px' }}>
        <button title="Trợ giúp" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B5233', display: 'flex', padding: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
        <button title="Bố cục" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7B5233', display: 'flex', padding: '4px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9"></rect>
            <rect x="14" y="3" width="7" height="5"></rect>
            <rect x="14" y="12" width="7" height="9"></rect>
            <rect x="3" y="16" width="7" height="5"></rect>
          </svg>
        </button>
      </div>
    );
    return () => setHeaderExtra(null);
  }, []);

  // Filter Hook
  const filterProps = useClaimFilter(enrichedClaims);
  const {
    sortedClaims,
    paginatedClaims,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    quickSearch,
    setQuickSearch,
    sortOption,
    setSortOption,
    showSortDropdown,
    setShowSortDropdown,
    statusFilter,
    setStatusFilter,
    isFilterBarOpen,
    setIsFilterBarOpen,
    activeDropdown,
    setActiveDropdown,
    editYear,
    editMonth,
    editStartDate,
    editEndDate,
    editKpiShowAllTime,
    appliedFilters,
    setAppliedFilters,
    clearAllFilters,
    removeFilterKey,
    handleYearChange,
    handleMonthChange,
    handleStartDateChange,
    handleEndDateChange,
    isDateFilterValid,
    selectedClaimIds,
    setSelectedClaimIds,
    handleToggleSelectRow,
    handleToggleSelectAll,
    actionMenuClaimId,
    setActionMenuClaimId,
    skuSuggestions,
    claimItemSuggestions,
    defectCodeSuggestions,
    companyErrorCodeSuggestions,
    companyErrorNameSuggestions,
    containerSuggestions,
    lpnSuggestions,
    penaltySuggestions,
    penaltyTotalSuggestions,
    yearsList,
    monthsList,
    dateRangeError,
    editStatus, setEditStatus,
    editSku, setEditSku,
    editCompanyErrorCode, setEditCompanyErrorCode,
    editCompanyErrorName, setEditCompanyErrorName,
    editClaimItem, setEditClaimItem,
    editDefectCode, setEditDefectCode,
    editContainer, setEditContainer,
    editLpn, setEditLpn,
    editPenalty, setEditPenalty,
    editPenaltyTotal, setEditPenaltyTotal
  } = filterProps;

  // Statistics Hook
  const statsProps = useClaimStatistics(claims, cabinetPrices, showModal);
  const {
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    analyticsViewTab,
    setAnalyticsViewTab,
    customerPenalties,
    customerPenaltyFiles,
    editingMonthData,
    setEditingMonthData,
    editValue,
    setEditValue,
    isParsingPdf,
    analyticsData,
    totalCountAll,
    totalG7AmountAll,
    totalCustomerAmountAll,
    handleSingleMonthPdfUpload,
    handleCreditNotePdfChange,
    handleBatchPdfUpload
  } = statsProps;

  // Import Hook
  const importProps = useClaimImport({ fetchClaims, setLoading, showModal });
  const {
    pdfInputRef,
    folderInputRef,
    isOtherDropdownOpen,
    setIsOtherDropdownOpen,
    isImportDropdownOpen,
    setIsImportDropdownOpen,
    isExportDropdownOpen,
    setIsExportDropdownOpen,
    isExporting,
    setIsExporting,
    isPdfFolderModalOpen,
    setIsPdfFolderModalOpen,
    importedPdfs,
    selectedPdfForPreview,
    setSelectedPdfForPreview,
    pdfActionMenuId,
    setPdfActionMenuId,
    pdfSearchQuery,
    setPdfSearchQuery,
    highlightBatchId,
    triggerPdfUpload,
    triggerFolderUpload,
    handlePdfFileChange,
    handleFolderFileChange,
    handleDeletePdf,
    handleOpenPdfFolderModal,
    getFullPdfUrl
  } = importProps;

  // Form Hook
  const formProps = useClaimForm({
    claims: enrichedClaims,
    setClaims,
    defectCatalog,
    g7DefectTypes,
    cabinetPrices,
    setLoading,
    showModal,
    setQuickSearch,
    setAppliedFilters,
    setPreviewImage
  });
  const {
    addImageInputRef,
    editImageInputRef,
    activeDetailClaim,
    setActiveDetailClaim,
    modalMode,
    setModalMode,
    exceptionNavMode,
    setExceptionNavMode,
    exceptionNavClaims,
    setExceptionNavClaims,
    isAddModalOpen,
    setIsAddModalOpen,
    addDongHang, setAddDongHang,
    addLoaiClaim, setAddLoaiClaim,
    addMaThamChieu, setAddMaThamChieu,
    addTenSanPham, setAddTenSanPham,
    addMucPhat, setAddMucPhat,
    addGiaTriPhat, setAddGiaTriPhat,
    addHeSoPhat, setAddHeSoPhat,
    addMaLoi, setAddMaLoi,
    addMaLoiCty, setAddMaLoiCty,
    addTenLoiG7, setAddTenLoiG7,
    showAddG7CodeSuggestions, setShowAddG7CodeSuggestions,
    showAddG7NameSuggestions, setShowAddG7NameSuggestions,
    addLpn, setAddLpn,
    addMaCont, setAddMaCont,
    addNgayXuat, setAddNgayXuat,
    addTrangThaiXuLy, setAddTrangThaiXuLy,
    addLinkCapa, setAddLinkCapa,
    addGhiChu, setAddGhiChu,
    addImages,
    addImageCaptions,
    addModalError,
    showAddSuggestions, setShowAddSuggestions,
    showAddDefectSuggestions, setShowAddDefectSuggestions,
    handleOpenAddNewClaim,
    handleSaveNewClaim,
    getAddTotalPenaltyPreview,
    handleAddImageClick,
    handleEditAddImageClick,
    handleAddImageFileChange,
    handleDeleteAddImageClick,
    processDongHang, setProcessDongHang,
    processLoaiClaim, setProcessLoaiClaim,
    processMaThamChieu, setProcessMaThamChieu,
    processTenSanPham, setProcessTenSanPham,
    processMucPhat, setProcessMucPhat,
    processGiaTriPhat, setProcessGiaTriPhat,
    processHeSoPhat, setProcessHeSoPhat,
    processMaLoi, setProcessMaLoi,
    processMaLoiCty, setProcessMaLoiCty,
    processTenLoiG7, setProcessTenLoiG7,
    showProcessG7CodeSuggestions, setShowProcessG7CodeSuggestions,
    showProcessG7NameSuggestions, setShowProcessG7NameSuggestions,
    processLpn, setProcessLpn,
    processMaCont, setProcessMaCont,
    processNgayXuat, setProcessNgayXuat,
    processTrangThaiXuLy, setProcessTrangThaiXuLy,
    processLinkCapa, setProcessLinkCapa,
    processGhiChu, setProcessGhiChu,
    processImages,
    processImageCaptions,
    handleSaveProcessClaim,
    getProcessTotalPenaltyPreview,
    handleProcessAddImageClick,
    handleEditProcessImageClick,
    handleProcessImageFileChange,
    handleDeleteProcessImageClick,
    handlePrevClaim,
    handleNextClaim,
    handleSelectG7Code,
    handleSelectG7Name
  } = formProps;

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewCurrentPage, setReviewCurrentPage] = useState(1);
  const [reviewActionMenuId, setReviewActionMenuId] = useState(null);

  // Exception Modal State
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [exceptionActiveTab, setExceptionActiveTab] = useState('claimInfo');
  const [expandedExceptionItems, setExpandedExceptionItems] = useState({});
  const [exceptionActionMenuId, setExceptionActionMenuId] = useState(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  // Logic phát hiện ngoại lệ (Exception Detection)
  const exceptionData = useMemo(() => {
    const claimInfoExceptions = [];
    const transportExceptions = [];

    const knownDefectCodes = new Set(
      defectCatalog.map(d => (d.defect_code || '').trim().toUpperCase()).filter(Boolean)
    );

    const keyMap = {};
    sortedClaims.forEach(claim => {
      const cabNo = claim.claim_code || '';
      const sku = claim.product_name || claim.sku || '';
      const desc = claim.claim_description || claim.description || '';
      const defect = claim.order_code || claim.defect_code || '';
      const penalty = normalizePenaltyValue(claim.penalty || 'Không có');
      const lpn = claim.lpn || '';
      const cont = claim.cont || claim.container_no || '';
      const period = claim.date || claim.period || '';

      const key = `${cabNo}|${sku}|${desc}|${defect}|${penalty}|${lpn}|${cont}|${period}`.toLowerCase();
      if (!keyMap[key]) {
        keyMap[key] = [];
      }
      keyMap[key].push(claim);
    });

    sortedClaims.filter(c => c.status === 'Mới').forEach(claim => {
      const claimExceptions = [];
      const transportIssues = [];

      // 1. Kiểm tra mã lỗi KH không có trong danh sách mã lỗi
      const customerDefectCode = (claim.order_code || claim.defect_code || '').trim();
      if (customerDefectCode && knownDefectCodes.size > 0) {
        const tokens = customerDefectCode.split(/[\\,\/;]|\s+/).map(t => t.trim().toUpperCase()).filter(Boolean);
        const unmatchedCodes = tokens.filter(token => {
          return !defectCatalog.some(d => {
            const catalogCode = (d.defect_code || '').trim().toUpperCase();
            return catalogCode === token || catalogCode.replace('-', '_') === token.replace('-', '_');
          });
        });
        if (unmatchedCodes.length > 0) {
          claimExceptions.push({
            type: 'missing_defect_code',
            label: 'Mã lỗi KH không có trong danh mục',
            detail: `Mã lỗi: ${unmatchedCodes.join(', ')} — không tìm thấy trong danh sách mã lỗi hệ thống.`,
            severity: 'warning'
          });
        }
      } else if (!customerDefectCode) {
        claimExceptions.push({
          type: 'no_defect_code',
          label: 'Không có mã lỗi KH',
          detail: 'Claim này chưa được gán mã lỗi khách hàng.',
          severity: 'info'
        });
      }

      // 2. Có giá trị phạt nhưng tổng phạt = 0
      const penaltyRaw = normalizePenaltyValue(claim.penalty || 'Không có');
      const penaltyLower = penaltyRaw.toLowerCase();
      const hasPenaltyKeyword = penaltyLower.includes('x2 unit') || penaltyLower.includes('x2unit') ||
        penaltyLower.includes('2x unit') || penaltyLower.includes('x2') ||
        penaltyLower.includes('full bc') || penaltyLower.includes('ful bc');
      const totalPenalty = calculateTotalPenalty(claim, undefined, cabinetPrices);

      if (hasPenaltyKeyword && totalPenalty === 0) {
        const sku = claim.product_name || claim.sku || 'N/A';
        claimExceptions.push({
          type: 'penalty_no_total',
          label: 'Có giá trị phạt nhưng không tính được tổng phạt',
          detail: `Giá trị phạt: "${penaltyRaw}" — SKU "${sku}" không có trong bảng giá tủ.`,
          severity: 'error'
        });
      }

      // 3. Kiểm tra trùng lặp dữ liệu 100% trong đợt này
      const cabNo = claim.claim_code || '';
      const sku = claim.product_name || claim.sku || '';
      const desc = claim.claim_description || claim.description || '';
      const defect = claim.order_code || claim.defect_code || '';
      const penalty = normalizePenaltyValue(claim.penalty || 'Không có');
      const lpn = claim.lpn || '';
      const cont = claim.cont || claim.container_no || '';
      const period = claim.date || claim.period || '';
      const key = `${cabNo}|${sku}|${desc}|${defect}|${penalty}|${lpn}|${cont}|${period}`.toLowerCase();

      const duplicates = keyMap[key] || [];
      if (duplicates.length > 1) {
        const otherDups = duplicates.filter(d => d.id !== claim.id);
        claimExceptions.push({
          type: 'duplicate_claim',
          label: 'Trùng lặp dữ liệu 100%',
          detail: `Phát hiện dòng dữ liệu bị trùng lặp hoàn toàn với dòng khác.`,
          severity: 'error',
          duplicates: otherDups
        });
      }

      // 4. Thiếu LPN
      const lpnVal = (claim.lpn || '').trim();
      if (!lpnVal || lpnVal === 'N/A' || lpnVal === 'n/a' || lpnVal === '-') {
        transportIssues.push({
          type: 'missing_lpn',
          label: 'Thiếu LPN',
          detail: 'Claim này chưa có mã LPN (License Plate Number).',
          severity: 'warning'
        });
      }

      // 5. Thiếu Container
      const contVal = (claim.cont || claim.container_no || '').trim();
      if (!contVal || contVal === 'N/A' || contVal === 'n/a' || contVal === '-') {
        transportIssues.push({
          type: 'missing_container',
          label: 'Thiếu Container',
          detail: 'Claim này chưa có mã Container (mã vận chuyển).',
          severity: 'warning'
        });
      }

      if (claimExceptions.length > 0) {
        claimInfoExceptions.push({ claim, exceptions: claimExceptions });
      }
      if (transportIssues.length > 0) {
        transportExceptions.push({ claim, exceptions: transportIssues });
      }
    });

    return {
      claimInfo: claimInfoExceptions,
      transport: transportExceptions,
      totalCount: claimInfoExceptions.length + transportExceptions.length
    };
  }, [sortedClaims, defectCatalog, cabinetPrices]);

  // Handle Exception Processing from modal
  const handleStartExceptionProcessing = (targetClaim) => {
    const list = (exceptionActiveTab === 'claimInfo' ? exceptionData.claimInfo : exceptionData.transport).map(item => item.claim);
    setExceptionNavMode(true);
    setExceptionNavClaims(list);
    setModalMode('edit');
    setActiveDetailClaim(targetClaim);
    setIsExceptionModalOpen(false);
  };

  // Review Claims Modal Pagination
  const underReviewClaims = useMemo(() => {
    return claims.filter(c => c.status === 'Đang xem xét');
  }, [claims]);

  const reviewTotalPages = Math.ceil(underReviewClaims.length / 5);
  const safeReviewCurrentPage = Math.min(reviewCurrentPage, reviewTotalPages || 1);
  const reviewStartIndex = (safeReviewCurrentPage - 1) * 5;
  const reviewEndIndex = reviewStartIndex + 5;
  const reviewPaginatedClaims = underReviewClaims.slice(reviewStartIndex, reviewEndIndex);

  // Single & Bulk Delete Handlers
  const handleDeleteSelected = () => {
    if (selectedClaimIds.length === 0) return;
    const itemsToDelete = claims.filter(c => selectedClaimIds.includes(c.id));
    setDeleteConfirmation({
      items: itemsToDelete,
      onConfirm: async () => {
        try {
          setLoading(true);
          const results = await claimService.deleteBatchClaims(selectedClaimIds);
          const successfulIds = results.filter(r => r.success).map(r => r.id);
          const failedResults = results.filter(r => !r.success);

          if (successfulIds.length > 0) {
            setClaims(prev => prev.filter(c => !successfulIds.includes(c.id)));
            setSelectedClaimIds([]);
          }

          const itemsToDeleteMap = new Map(itemsToDelete.map(c => [c.id, c]));
          const successItems = results
            .filter(r => r.success)
            .map(r => ({ ...r, claim: itemsToDeleteMap.get(r.id) }));
          const failedItems = results
            .filter(r => !r.success)
            .map(r => ({ ...r, claim: itemsToDeleteMap.get(r.id) }));

          if (failedResults.length === 0) {
            showModal(
              'Xóa thành công',
              <div>
                <p style={{ fontWeight: '500', marginBottom: '12px' }}>
                  Đã xóa thành công <strong style={{ color: '#059669' }}>{successfulIds.length}</strong> dòng khiếu nại:
                </p>
                <DeleteResultList items={successItems} type="success" />
              </div>,
              'success'
            );
          } else if (successfulIds.length === 0) {
            showModal(
              'Xóa thất bại',
              <div>
                <p style={{ fontWeight: '500', marginBottom: '12px' }}>
                  Không thể xóa <strong style={{ color: '#DC2626' }}>{failedResults.length}</strong> dòng khiếu nại đã chọn:
                </p>
                <DeleteResultList items={failedItems} type="error" />
              </div>,
              'error'
            );
          } else {
            showModal(
              'Kết quả xóa',
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <p style={{ fontWeight: '500', marginBottom: '8px' }}>
                    Đã xóa thành công <strong style={{ color: '#059669' }}>{successfulIds.length}</strong> dòng:
                  </p>
                  <DeleteResultList items={successItems} type="success" />
                </div>
                <div>
                  <p style={{ fontWeight: '500', marginBottom: '8px' }}>
                    Thất bại <strong style={{ color: '#DC2626' }}>{failedResults.length}</strong> dòng:
                  </p>
                  <DeleteResultList items={failedItems} type="error" />
                </div>
              </div>,
              'info'
            );
          }
        } catch (err) {
          console.error('Lỗi khi xóa khiếu nại:', err);
          showModal('Thất bại', 'Đã xảy ra lỗi khi xóa các mục đã chọn.', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteClaim = (claim) => {
    setDeleteConfirmation({
      items: [claim],
      onConfirm: async () => {
        try {
          setLoading(true);
          await claimService.deleteClaim(claim.id);
          setClaims(prev => prev.filter(c => c.id !== claim.id));
          setSelectedClaimIds(prev => prev.filter(id => id !== claim.id));
          showModal('Thành công', `Đã xóa khiếu nại ${claim.claim_code} - ${claim.product_name || claim.sku} thành công!`, 'success');
        } catch (err) {
          console.error('Lỗi khi xóa khiếu nại:', err);
          showModal('Thất bại', 'Không thể xóa khiếu nại. Vui lòng thử lại.', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Helper inside Delete Confirmation modal
  const DeleteResultList = ({ items = [], type }) => {
    const [expanded, setExpanded] = useState({});
    const isSuccess = type === 'success';
    const borderColor = isSuccess ? '#A7F3D0' : '#FCA5A5';
    const bgColor = isSuccess ? '#ECFDF5' : '#FEF2F2';
    const textColor = isSuccess ? '#065F46' : '#991B1B';
    const accentColor = isSuccess ? '#059669' : '#DC2626';
    const separatorColor = isSuccess ? '#D1FAE5' : '#FEE2E2';
    const detailBg = isSuccess ? '#F0FDF4' : '#FFF1F2';
    const detailBorder = isSuccess ? '#BBF7D0' : '#FECDD3';

    return (
      <div style={{ border: `1px solid ${borderColor}`, borderRadius: '8px', overflowY: 'auto', maxHeight: '350px' }}>
        {items.map((r, i) => {
          const claim = r.claim || (claims.find(c => c.id === r.id)) || r;
          const isOpen = !!expanded[i];
          const displayName = claim.product_name || claim.sku || claim.claim_code || (r.id ? `Dòng ID #${r.id}` : 'N/A');
          return (
            <div key={i} style={{ borderBottom: i === items.length - 1 ? 'none' : `1px solid ${separatorColor}`, backgroundColor: bgColor }}>
              <div
                onClick={() => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
              >
                <span style={{ fontWeight: '600', color: textColor, fontSize: '0.84rem', wordBreak: 'break-word', flex: 1, paddingRight: '10px' }}>
                  {i + 1}. {displayName}
                </span>
                <span style={{ color: accentColor, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, fontWeight: '500' }}>
                  {isOpen ? 'Thu gọn' : 'Chi tiết'}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>
              {isOpen && (
                <div style={{ margin: '0 14px 10px', padding: '10px 14px', backgroundColor: detailBg, borderRadius: '6px', border: `1px solid ${detailBorder}`, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Mã tham chiếu:</span>
                    <span style={{ color: textColor, wordBreak: 'break-all' }}>{claim.claim_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Mã lỗi KH:</span>
                    <span style={{ color: textColor, wordBreak: 'break-all' }}>{claim.order_code || claim.defect_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Tên lỗi G7:</span>
                    <span style={{ color: textColor, wordBreak: 'break-all' }}>{claim.company_error_name || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>LPN:</span>
                    <span style={{ color: textColor, fontFamily: 'monospace', wordBreak: 'break-all' }}>{claim.lpn || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Container:</span>
                    <span style={{ color: textColor, wordBreak: 'break-all' }}>{claim.cont || 'N/A'}</span>
                  </div>
                  {claim.penalty && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Mức phạt:</span>
                      <span style={{ color: textColor }}>{claim.penalty}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Excel Export Handler
  const handleExportExcel = async (type = 'all') => {
    try {
      let targetClaims = [];
      let filename = 'DS_Khieu_Nai';

      if (type === 'selected') {
        targetClaims = claims.filter(c => selectedClaimIds.includes(c.id));
        filename = `DS_Khieu_Nai_Da_Chon_${selectedClaimIds.length}`;
      } else if (type === 'current') {
        // Current page rows strictly matching table dataset
        targetClaims = Array.isArray(paginatedClaims) ? paginatedClaims : [];
        filename = `DS_Khieu_Nai_Trang_${currentPage}_${targetClaims.length}_dondoc`;
      } else if (type === 'filtered') {
        targetClaims = Array.isArray(sortedClaims) ? sortedClaims : [];
        filename = `DS_Khieu_Nai_Bo_Loc_${targetClaims.length}`;
      } else {
        // Export all records within active search/filter scope
        targetClaims = Array.isArray(sortedClaims) && sortedClaims.length > 0 ? sortedClaims : claims;
        filename = `DS_Khieu_Nai_Tat_Ca_${targetClaims.length}`;
      }

      if (!targetClaims || targetClaims.length === 0) {
        showModal('Cảnh báo', 'Không có dữ liệu khiếu nại để xuất file Excel.', 'warning');
        return;
      }

      // Call backend API (POST /api/v1/claims/claims/export-excel)
      const response = await claimService.exportExcel(targetClaims);
      
      // Explicitly wrap binary response in an Excel .xlsx Blob
      const excelBlob = response instanceof Blob 
        ? new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        : new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const downloadUrl = window.URL.createObjectURL(excelBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.setAttribute('download', cleanFilename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      showModal('Thành công', `Đã xuất ${targetClaims.length} dòng khiếu nại ra file Excel (.xlsx) thành công!`, 'success');
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      showModal('Lỗi', 'Không thể xuất file Excel. Vui lòng thử lại.', 'error');
    }
  };

  return (
    <div className="claim-list-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 0 }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .dashboard-content {
          height: calc(100dvh - 60px) !important;
          max-height: calc(100dvh - 60px) !important;
          min-height: 0 !important;
          padding: 8px 16px 8px 16px !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
        }
        .dashboard-content > div {
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          flex: 1 1 auto !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
        .claim-list-container {
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: stretch !important;
          overflow: hidden !important;
          gap: 0 !important;
          margin: 0 !important;
        }
        .admin-table-card {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }
        .admin-table-scroll {
          flex: 1 1 auto !important;
          min-height: 0 !important;
          overflow-y: auto !important;
          overflow-x: auto !important;
        }
        `
      }} />
      {/* 4 KPI Overview Cards */}
      <div style={{ flexShrink: 0 }}>
        <ClaimStatsCards
          cabinetPrices={cabinetPrices}
          claims={claims}
          filteredClaims={sortedClaims}
          exceptionData={exceptionData}
          appliedFilters={appliedFilters}
          editMonth={editMonth}
          editYear={editYear}
          onOpenAnalytics={() => setIsAnalyticsOpen(true)}
          onOpenUnderReview={() => {
            setReviewCurrentPage(1);
            setIsReviewModalOpen(true);
          }}
          onOpenExceptions={() => {
            setExceptionActiveTab('claimInfo');
            setIsExceptionModalOpen(true);
          }}
        />
      </div>

      {/* Main Table Toolbar */}
      <div style={{ flexShrink: 0 }}>
        <ClaimToolbar
          quickSearch={quickSearch}
          setQuickSearch={setQuickSearch}
          sortOption={sortOption}
          setSortOption={setSortOption}
          showSortDropdown={showSortDropdown}
          setShowSortDropdown={setShowSortDropdown}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          isFilterBarOpen={isFilterBarOpen}
          setIsFilterBarOpen={setIsFilterBarOpen}
          activeFiltersCount={Object.keys(appliedFilters).filter(k => {
            if (k === 'time') return appliedFilters.time?.year || appliedFilters.time?.month || appliedFilters.time?.startDate || appliedFilters.time?.endDate;
            if (k === 'claim') return appliedFilters.claim?.status || appliedFilters.claim?.sku || appliedFilters.claim?.companyErrorCode || appliedFilters.claim?.companyErrorName || (appliedFilters.claim?.claimItem && appliedFilters.claim?.claimItem !== 'Cabinet#') || appliedFilters.claim?.defectCode;
            if (k === 'transport') return appliedFilters.transport?.container || appliedFilters.transport?.lpn || appliedFilters.transport?.penalty || appliedFilters.transport?.penaltyTotal;
            return !!appliedFilters[k];
          }).length}
          hasWritePermission={hasWritePermission}
          claims={claims}
          paginatedClaims={paginatedClaims}
          currentPageCount={paginatedClaims ? paginatedClaims.length : 0}
          totalFilteredCount={sortedClaims ? sortedClaims.length : claims.length}
          selectedClaimIds={selectedClaimIds}
          exceptionCount={exceptionData?.totalCount || 0}
          isOtherDropdownOpen={isOtherDropdownOpen}
          setIsOtherDropdownOpen={setIsOtherDropdownOpen}
          onProcessSelectedClaim={() => {
            let targetList = claims;
            if (selectedClaimIds && selectedClaimIds.length > 0) {
              targetList = claims.filter(c => selectedClaimIds.includes(c.id));
            }
            const unprocessed = targetList.filter(c => c.status !== 'Đã xử lý');
            if (unprocessed.length > 0) {
              setExceptionNavClaims(unprocessed);
              setExceptionNavMode(true);
              setModalMode('edit');
              setActiveDetailClaim(unprocessed[0]);
            } else {
              showModal('Thông báo', 'Tất cả các khiếu nại trong danh sách đã được xử lý!', 'info');
            }
          }}
          onOpenPdfFolderModal={handleOpenPdfFolderModal}
          onOpenExceptionModal={() => {
            setExceptionActiveTab('claimInfo');
            setIsExceptionModalOpen(true);
          }}
          onDeleteSelectedClaims={handleDeleteSelected}
          isImportDropdownOpen={isImportDropdownOpen}
          setIsImportDropdownOpen={setIsImportDropdownOpen}
          onTriggerPdfUpload={triggerPdfUpload}
          onTriggerFolderUpload={triggerFolderUpload}
          isExportDropdownOpen={isExportDropdownOpen}
          setIsExportDropdownOpen={setIsExportDropdownOpen}
          isExporting={isExporting}
          onExportExcel={handleExportExcel}
          onOpenAddNewClaim={handleOpenAddNewClaim}
        />
      </div>

      {/* Inline Advanced Filter Bar */}
      {isFilterBarOpen && (
        <div style={{ flexShrink: 0, marginBottom: '4px' }}>
          <ClaimFilterBar
            isOpen={isFilterBarOpen}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            rowsPerPage={rowsPerPage}
            setRowsPerPage={setRowsPerPage}
            editYear={editYear}
            editMonth={editMonth}
            editStartDate={editStartDate}
            editEndDate={editEndDate}
            editKpiShowAllTime={editKpiShowAllTime}
            onYearChange={handleYearChange}
            onMonthChange={handleMonthChange}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            isDateFilterValid={isDateFilterValid}
            yearsList={yearsList}
            monthsList={monthsList}
            dateRangeError={dateRangeError}
            editStatus={editStatus}
            setEditStatus={setEditStatus}
            editSku={editSku}
            setEditSku={setEditSku}
            skuSuggestions={skuSuggestions}
            editCompanyErrorCode={editCompanyErrorCode}
            setEditCompanyErrorCode={setEditCompanyErrorCode}
            companyErrorCodeSuggestions={companyErrorCodeSuggestions}
            editCompanyErrorName={editCompanyErrorName}
            setEditCompanyErrorName={setEditCompanyErrorName}
            companyErrorNameSuggestions={companyErrorNameSuggestions}
            editClaimItem={editClaimItem}
            setEditClaimItem={setEditClaimItem}
            claimItemSuggestions={claimItemSuggestions}
            editDefectCode={editDefectCode}
            setEditDefectCode={setEditDefectCode}
            defectCodeSuggestions={defectCodeSuggestions}
            editContainer={editContainer}
            setEditContainer={setEditContainer}
            containerSuggestions={containerSuggestions}
            editLpn={editLpn}
            setEditLpn={setEditLpn}
            lpnSuggestions={lpnSuggestions}
            editPenalty={editPenalty}
            setEditPenalty={setEditPenalty}
            penaltySuggestions={penaltySuggestions}
            editPenaltyTotal={editPenaltyTotal}
            setEditPenaltyTotal={setEditPenaltyTotal}
            penaltyTotalSuggestions={penaltyTotalSuggestions}
            appliedFilters={appliedFilters}
            onClearAllFilters={clearAllFilters}
            onRemoveFilterKey={removeFilterKey}
          />
        </div>
      )}

      {/* Main Table (Header + Body + Footer all in one Card) */}
      <ClaimTable
        claims={paginatedClaims}
        totalFilteredCount={sortedClaims.length}
        currentPage={currentPage}
        totalPages={totalPages}
        rowsPerPage={rowsPerPage}
        onPageChange={setCurrentPage}
        loading={loading}
        selectedClaimIds={selectedClaimIds}
        onToggleSelectAll={handleToggleSelectAll}
        onToggleSelectRow={handleToggleSelectRow}
        actionMenuClaimId={actionMenuClaimId}
        setActionMenuClaimId={setActionMenuClaimId}
        onOpenClaimDetail={(claim) => {
          setExceptionNavMode(false);
          setModalMode('view');
          setActiveDetailClaim(claim);
        }}
        onProcessClaim={(claim) => {
          setExceptionNavMode(false);
          setModalMode('edit');
          setActiveDetailClaim(claim);
        }}
        onDeleteClaim={handleDeleteClaim}
        hasWritePermission={hasWritePermission}
        highlightBatchId={highlightBatchId}
        cabinetPrices={cabinetPrices}
      />

      {/* Thống kê theo tháng Modal */}
      <ClaimMonthlyStatsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        analyticsViewTab={analyticsViewTab}
        setAnalyticsViewTab={setAnalyticsViewTab}
        analyticsData={analyticsData}
        totalCountAll={totalCountAll}
        totalG7AmountAll={totalG7AmountAll}
        totalCustomerAmountAll={totalCustomerAmountAll}
        customerPenalties={customerPenalties}
        customerPenaltyFiles={customerPenaltyFiles}
        filteredClaimsCount={totalCountAll}
        onOpenEditMonth={(data) => {
          setEditingMonthData(data);
          const currentVal = customerPenalties[data.month] !== undefined ? customerPenalties[data.month] : data.customerAmount || 0;
          setEditValue(currentVal.toString());
        }}
        onOpenEditPenaltyModal={(data) => {
          setEditingMonthData(data);
          const currentVal = customerPenalties[data.month] !== undefined ? customerPenalties[data.month] : data.customerAmount || 0;
          setEditValue(currentVal.toString());
        }}
        onBatchPdfUpload={handleBatchPdfUpload}
        isParsingPdf={isParsingPdf}
      />

      {/* Cập nhật phạt Khách hàng theo tháng Modal */}
      <ClaimCustomerPenaltyModal
        editingMonthData={editingMonthData}
        onClose={() => setEditingMonthData(null)}
        editValue={editValue}
        setEditValue={setEditValue}
        customerPenalties={customerPenalties}
        customerPenaltyFiles={customerPenaltyFiles}
        isParsingPdf={isParsingPdf}
        onSingleMonthPdfUpload={handleSingleMonthPdfUpload}
        onCreditNotePdfChange={handleCreditNotePdfChange}
      />

      {/* Danh sách khiếu nại đang xem xét Modal */}
      <ClaimReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        claims={underReviewClaims}
        paginatedClaims={reviewPaginatedClaims}
        currentPage={safeReviewCurrentPage}
        totalPages={reviewTotalPages}
        onPageChange={setReviewCurrentPage}
        reviewActionMenuId={reviewActionMenuId}
        setReviewActionMenuId={setReviewActionMenuId}
        onSelectClaim={(claim) => {
          setExceptionNavMode(false);
          setModalMode('view');
          setActiveDetailClaim(claim);
          setIsReviewModalOpen(false);
        }}
        onProcessClaim={(claim) => {
          setExceptionNavMode(false);
          setModalMode('edit');
          setActiveDetailClaim(claim);
          setIsReviewModalOpen(false);
        }}
      />

      {/* Phát hiện khiếu nại bất thường Modal */}
      <ClaimExceptionModal
        isOpen={isExceptionModalOpen}
        onClose={() => setIsExceptionModalOpen(false)}
        exceptionData={exceptionData}
        exceptionActiveTab={exceptionActiveTab}
        setExceptionActiveTab={setExceptionActiveTab}
        expandedExceptionItems={expandedExceptionItems}
        setExpandedExceptionItems={setExpandedExceptionItems}
        exceptionActionMenuId={exceptionActionMenuId}
        setExceptionActionMenuId={setExceptionActionMenuId}
        onStartExceptionProcessing={handleStartExceptionProcessing}
        onPreviewImage={setPreviewImage}
        cabinetPrices={cabinetPrices}
      />

      {/* Tạo mới khiếu nại Modal */}
      <ClaimAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveNewClaim}
        addDongHang={addDongHang} setAddDongHang={setAddDongHang}
        addLoaiClaim={addLoaiClaim} setAddLoaiClaim={setAddLoaiClaim}
        addMaThamChieu={addMaThamChieu} setAddMaThamChieu={setAddMaThamChieu}
        addTenSanPham={addTenSanPham} setAddTenSanPham={setAddTenSanPham}
        addMucPhat={addMucPhat} setAddMucPhat={setAddMucPhat}
        addGiaTriPhat={addGiaTriPhat} setAddGiaTriPhat={setAddGiaTriPhat}
        addHeSoPhat={addHeSoPhat} setAddHeSoPhat={setAddHeSoPhat}
        showAddSuggestions={showAddSuggestions} setShowAddSuggestions={setShowAddSuggestions}
        uniquePenaltyOptions={penaltySuggestions}
        getAddTotalPenaltyPreview={getAddTotalPenaltyPreview}
        addMaLoi={addMaLoi} setAddMaLoi={setAddMaLoi}
        showAddDefectSuggestions={showAddDefectSuggestions} setShowAddDefectSuggestions={setShowAddDefectSuggestions}
        defectCatalog={defectCatalog}
        addMaLoiCty={addMaLoiCty} setAddMaLoiCty={setAddMaLoiCty}
        g7DefectTypes={g7DefectTypes}
        showAddG7CodeSuggestions={showAddG7CodeSuggestions} setShowAddG7CodeSuggestions={setShowAddG7CodeSuggestions}
        uniqueCompanyErrorCodeOptions={companyErrorCodeSuggestions}
        handleSelectG7Code={handleSelectG7Code}
        addTenLoiG7={addTenLoiG7} setAddTenLoiG7={setAddTenLoiG7}
        showAddG7NameSuggestions={showAddG7NameSuggestions} setShowAddG7NameSuggestions={setShowAddG7NameSuggestions}
        uniqueCompanyErrorNameOptions={companyErrorNameSuggestions}
        handleSelectG7Name={handleSelectG7Name}
        addLpn={addLpn} setAddLpn={setAddLpn}
        addMaCont={addMaCont} setAddMaCont={setAddMaCont}
        addNgayXuat={addNgayXuat} setAddNgayXuat={setAddNgayXuat}
        addTrangThaiXuLy={addTrangThaiXuLy} setAddTrangThaiXuLy={setAddTrangThaiXuLy}
        addLinkCapa={addLinkCapa} setAddLinkCapa={setAddLinkCapa}
        addGhiChu={addGhiChu} setAddGhiChu={setAddGhiChu}
        addImages={addImages}
        addImageCaptions={addImageCaptions}
        addModalError={addModalError}
        handleAddImageClick={handleAddImageClick}
        handleEditAddImageClick={handleEditAddImageClick}
        handleDeleteAddImageClick={handleDeleteAddImageClick}
        onPreviewImage={setPreviewImage}
      />

      {/* Xử lý / Xem chi tiết khiếu nại Modal */}
      <ClaimProcessModal
        activeDetailClaim={activeDetailClaim}
        setActiveDetailClaim={setActiveDetailClaim}
        modalMode={modalMode}
        setModalMode={setModalMode}
        exceptionNavMode={exceptionNavMode}
        setExceptionNavMode={setExceptionNavMode}
        exceptionNavClaims={exceptionNavClaims}
        setExceptionNavClaims={setExceptionNavClaims}
        claims={claims}
        setClaims={setClaims}
        navList={exceptionNavMode ? exceptionNavClaims : sortedClaims}
        processDongHang={processDongHang} setProcessDongHang={setProcessDongHang}
        processLoaiClaim={processLoaiClaim} setProcessLoaiClaim={setProcessLoaiClaim}
        processMaThamChieu={processMaThamChieu} setProcessMaThamChieu={setProcessMaThamChieu}
        processTenSanPham={processTenSanPham} setProcessTenSanPham={setProcessTenSanPham}
        processMucPhat={processMucPhat} setProcessMucPhat={setProcessMucPhat}
        processGiaTriPhat={processGiaTriPhat} setProcessGiaTriPhat={setProcessGiaTriPhat}
        processHeSoPhat={processHeSoPhat} setProcessHeSoPhat={setProcessHeSoPhat}
        getProcessTotalPenaltyPreview={getProcessTotalPenaltyPreview}
        processMaLoi={processMaLoi} setProcessMaLoi={setProcessMaLoi}
        processMaLoiCty={processMaLoiCty} setProcessMaLoiCty={setProcessMaLoiCty}
        g7DefectTypes={g7DefectTypes}
        showProcessG7CodeSuggestions={showProcessG7CodeSuggestions} setShowProcessG7CodeSuggestions={setShowProcessG7CodeSuggestions}
        uniqueCompanyErrorCodeOptions={companyErrorCodeSuggestions}
        handleSelectG7Code={handleSelectG7Code}
        processTenLoiG7={processTenLoiG7} setProcessTenLoiG7={setProcessTenLoiG7}
        showProcessG7NameSuggestions={showProcessG7NameSuggestions} setShowProcessG7NameSuggestions={setShowProcessG7NameSuggestions}
        uniqueCompanyErrorNameOptions={companyErrorNameSuggestions}
        handleSelectG7Name={handleSelectG7Name}
        processLpn={processLpn} setProcessLpn={setProcessLpn}
        processMaCont={processMaCont} setProcessMaCont={setProcessMaCont}
        processNgayXuat={processNgayXuat} setProcessNgayXuat={setProcessNgayXuat}
        processTrangThaiXuLy={processTrangThaiXuLy} setProcessTrangThaiXuLy={setProcessTrangThaiXuLy}
        processLinkCapa={processLinkCapa} setProcessLinkCapa={setProcessLinkCapa}
        processGhiChu={processGhiChu} setProcessGhiChu={setProcessGhiChu}
        processImages={processImages}
        processImageCaptions={processImageCaptions}
        onSaveProcessClaim={handleSaveProcessClaim}
        handleProcessAddImageClick={handleProcessAddImageClick}
        handleEditProcessImageClick={handleEditProcessImageClick}
        handleDeleteProcessImageClick={handleDeleteProcessImageClick}
        handlePrevClaim={handlePrevClaim}
        handleNextClaim={handleNextClaim}
        onPreviewImage={setPreviewImage}
      />

      {/* Lightbox Zoom Image Modal */}
      <ClaimImageZoomModal
        previewImage={previewImage}
        onClose={() => setPreviewImage(null)}
      />

      {/* PDF Folder Archive & PDF Viewer Modal */}
      <ClaimPdfFolderModal
        isOpen={isPdfFolderModalOpen}
        onClose={() => setIsPdfFolderModalOpen(false)}
        importedPdfs={importedPdfs}
        pdfSearchQuery={pdfSearchQuery}
        setPdfSearchQuery={setPdfSearchQuery}
        selectedPdfForPreview={selectedPdfForPreview}
        setSelectedPdfForPreview={setSelectedPdfForPreview}
        pdfActionMenuId={pdfActionMenuId}
        setPdfActionMenuId={setPdfActionMenuId}
        hasWritePermission={hasWritePermission}
        onDeletePdf={handleDeletePdf}
        getFullPdfUrl={getFullPdfUrl}
      />

      {/* Hidden File Inputs for Import & Image Uploads */}
      <input
        type="file"
        ref={pdfInputRef}
        style={{ display: 'none' }}
        accept=".pdf"
        multiple
        onChange={handlePdfFileChange}
      />
      <input
        type="file"
        ref={folderInputRef}
        style={{ display: 'none' }}
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFolderFileChange}
      />
      <input
        type="file"
        ref={addImageInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleAddImageFileChange}
      />
      <input
        type="file"
        ref={editImageInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleProcessImageFileChange}
      />

      {/* Alert Notification Modal */}
      <AlertModal
        isOpen={!!localNotification}
        onClose={() => setLocalNotification(null)}
        title={localNotification?.title || ''}
        message={localNotification?.message || ''}
        type={localNotification?.type || 'info'}
        width={localNotification?.title === 'Kết quả xóa' || localNotification?.title === 'Xóa thành công' ? 'min(90vw, 680px)' : '420px'}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteConfirmation}
        items={deleteConfirmation?.items || []}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() => {
          const confirmAction = deleteConfirmation.onConfirm;
          setDeleteConfirmation(null);
          confirmAction();
        }}
        message={
          <p style={{ fontWeight: '500', marginBottom: '14px' }}>
            Bạn có chắc chắn muốn xóa <strong style={{ color: '#A0301B' }}>{deleteConfirmation?.items.length}</strong> dòng khiếu nại đã chọn không?
          </p>
        }
        renderItemDetails={(item, index, isExpanded, onToggle) => {
          const displayName = item.product_name || item.sku || 'N/A';
          return (
            <div
              key={index}
              style={{
                borderBottom: index === deleteConfirmation.items.length - 1 ? 'none' : '1px solid #FAF0E6',
                backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#FCFAF7',
                padding: '12px 16px',
                transition: 'background-color 0.2s'
              }}
            >
              <div
                onClick={onToggle}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span style={{ fontWeight: '600', color: '#2D1A12', fontSize: '0.88rem', wordBreak: 'break-word', flex: 1, paddingRight: '12px' }}>
                  {index + 1}. {displayName}
                </span>
                <span style={{ color: '#7B5233', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, fontWeight: '500' }}>
                  {isExpanded ? 'Thu gọn' : 'Xem chi tiết'}
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </span>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '10px', padding: '12px 16px', backgroundColor: '#F8F5F1', borderRadius: '8px', border: '1px solid #EADCC9', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold', minWidth: '120px' }}>Mã tham chiếu:</span>
                    <span style={{ color: '#2D1A12', wordBreak: 'break-all' }}>{item.claim_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold', minWidth: '120px' }}>Mã lỗi KH:</span>
                    <span style={{ color: '#2D1A12', wordBreak: 'break-all' }}>{item.order_code || item.defect_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold', minWidth: '120px' }}>Tên lỗi G7:</span>
                    <span style={{ color: '#2D1A12', wordBreak: 'break-all' }}>{item.company_error_name || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold', minWidth: '120px' }}>LPN:</span>
                    <span style={{ color: '#2D1A12', fontFamily: 'monospace', wordBreak: 'break-all' }}>{item.lpn || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold', minWidth: '120px' }}>Container:</span>
                    <span style={{ color: '#2D1A12', wordBreak: 'break-all' }}>{item.cont || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold', minWidth: '120px' }}>Mức phạt:</span>
                    <span style={{ color: '#2D1A12' }}>{item.penalty || '$0'}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold', minWidth: '120px' }}>Tổng tiền phạt:</span>
                    <span style={{ color: '#A0301B', fontWeight: 'bold' }}>{formatPenaltyValue(calculateTotalPenalty(item, undefined, cabinetPrices))}</span>
                  </div>
                </div>
              )}
            </div>
          );
        }}
      />
    </div>
  );
};
export default ClaimListView;
