import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Plus } from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { claimService } from '../services/claim.service';
import { normalizePenaltyValue, parseDate } from '../utils/claimHelpers';
import { API_ROOT } from '@webShared/Services/api.service';
import '../styles/claim.css';
import '@styles/components.css';

// Import shared components
import { Table } from '../components/Table';
import { Pagination } from '../components/Pagination';
import { FilterModal, FormModal, AlertModal } from '../components/Modal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

/**
 * View: Quản lý Khiếu nại Khách hàng (Customer Claims) - Mockup chuẩn theo UI thiết kế
 */

const ClaimListView = () => {
  const { setCustomTitle, setCustomSubtitle, setHeaderExtra, showModal: contextShowModal } = useOutletContext();
  const [localNotification, setLocalNotification] = useState(null);

  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';

  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions in ClaimListView:', e);
  }

  const hasWritePermission = loggedInUserIsAdmin || activePermissions['claim'] !== 'read';


  const showModal = (title, message, type = 'info') => {
    setLocalNotification({ title, message, type });
    if (type === 'success' && typeof message === 'string') {
      setTimeout(() => {
        setLocalNotification(prev => prev && prev.message === message ? null : prev);
      }, 3500);
    }
    if (typeof contextShowModal === 'function') {
      try {
        contextShowModal(title, message, type);
      } catch (err) {
        console.error('Error calling contextShowModal:', err);
      }
    }
  };

  const getFullImagePath = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${API_ROOT}${cleanPath}`;
  };

  const handleExportExcel = async () => {
    if (!filteredClaimsToDisplay || filteredClaimsToDisplay.length === 0) {
      showModal('Thông báo', 'Không có dữ liệu khiếu nại nào hiển thị để xuất Excel.', 'info');
      return;
    }

    try {
      setIsExporting(true);
      const response = await claimService.exportExcel(filteredClaimsToDisplay);
      const blob = new Blob([response.data || response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      link.setAttribute('download', `SmartFlow_Claims_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Lỗi khi xuất file Excel:', err);
      showModal('Lỗi', `Không thể xuất file Excel: ${err.message || err}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [expandedDeleteItems, setExpandedDeleteItems] = useState({});
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [cabinetPrices, setCabinetPrices] = useState([]);

  // Exception modal state
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [expandedExceptionItems, setExpandedExceptionItems] = useState({});
  const [exceptionActiveTab, setExceptionActiveTab] = useState('claim');

  // Monthly trends analytics modal state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [analyticsViewTab, setAnalyticsViewTab] = useState('chart'); // 'chart' or 'table'

  const getCabinetSalePrice = (sku) => {
    if (!sku) return 0;
    const cleanSku = sku.trim().toLowerCase();
    const match = cabinetPrices.find(p => p.cabinet_code && p.cabinet_code.trim().toLowerCase() === cleanSku);
    if (match) return match.sale_price || 0;
    return 0;
  };

  const formatPenaltyValue = (number) => {
    if (!number || isNaN(number)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
  };

  const calculateTotalPenalty = (claim) => {
    const p = normalizePenaltyValue(claim.penalty || 'Không có');
    const lower = p.toLowerCase();
    const sku = claim.product_name || claim.sku;
    let val = 0;
    if (lower.includes('x2 unit') || lower.includes('x2unit') || lower.includes('2x unit') || lower.includes('x2')) {
      const salePrice = getCabinetSalePrice(sku);
      val = salePrice * 2;
    } else if (lower.includes('full bc') || lower.includes('ful bc')) {
      const salePrice = getCabinetSalePrice(sku);
      val = salePrice;
    } else {
      const parsed = parseFloat(String(p).replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed)) {
        val = parsed;
      }
    }
    return val;
  };

  const getProcessTotalPenaltyPreview = () => {
    const mockClaim = {
      penalty: processGiaTriPhat,
      product_name: processTenSanPham || activeDetailClaim?.product_name || activeDetailClaim?.sku
    };
    return calculateTotalPenalty(mockClaim);
  };

  const getAddTotalPenaltyPreview = () => {
    const mockClaim = {
      penalty: addGiaTriPhat,
      product_name: addTenSanPham
    };
    return calculateTotalPenalty(mockClaim);
  };

  // Fetch defect catalog on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await claimService.getDefects();
        const rawItems = Array.isArray(res) ? res : (res.items || []);
        const mappedItems = rawItems.map(d => ({
          ...d,
          defect_code: d.defect_code || d.code,
          g7_defect_code: d.g7_defect_code || d.g7_code
        }));
        setDefectCatalog(mappedItems);
      } catch (err) {
        console.error('Lỗi tải danh mục lỗi cho khiếu nại:', err);
      }
    };
    fetchCatalog();
  }, []);

  // Fetch cabinet prices on mount
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await claimService.getCabinetPrices({ size: 100000 });
        setCabinetPrices(res.items || []);
      } catch (err) {
        console.error('Lỗi tải bảng giá tủ gỗ:', err);
      }
    };
    fetchPrices();
  }, []);

  useEffect(() => {
    const handleChatViewPhoto = (e) => {
      const item = e.detail;
      const matchedClaim = claims.find(c => String(c.id) === String(item.id));
      if (matchedClaim) {
        setActiveDetailClaim(matchedClaim);
      } else {
        setActiveDetailClaim({
          id: item.id,
          product_name: item.sku,
          sku: item.sku,
          claim_code: item.claim_code || `Cabinet #${item.cabinet_no}`,
          order_code: item.defect_code,
          defect_code: item.defect_code,
          company_error_code: item.company_error_code,
          penalty: item.action || item.penalty,
          lpn: item.lpn,
          cont: item.container_no,
          date: item.period,
          status: item.status,
          claim_description: item.claim_description || item.description,
          image_paths: item.image_paths,
          image_captions: item.image_captions
        });
      }
    };
    window.addEventListener('claim-chat-view-photo', handleChatViewPhoto);
    return () => window.removeEventListener('claim-chat-view-photo', handleChatViewPhoto);
  }, [claims]);

  useEffect(() => {
    const pendingItemStr = sessionStorage.getItem('pending-chat-detail-item');
    if (pendingItemStr) {
      try {
        const item = JSON.parse(pendingItemStr);
        sessionStorage.removeItem('pending-chat-detail-item');
        const matchedClaim = claims.find(c => String(c.id) === String(item.id));
        if (matchedClaim) {
          setActiveDetailClaim(matchedClaim);
        } else {
          setActiveDetailClaim({
            id: item.id,
            product_name: item.sku,
            sku: item.sku,
            claim_code: item.claim_code || `Cabinet #${item.cabinet_no}`,
            order_code: item.defect_code,
            defect_code: item.defect_code,
            company_error_code: item.company_error_code,
            penalty: item.action || item.penalty,
            lpn: item.lpn,
            cont: item.container_no,
            date: item.period,
            status: item.status,
            claim_description: item.claim_description || item.description,
            image_paths: item.image_paths,
            image_captions: item.image_captions
          });
        }
      } catch (err) {
        console.error('Error loading pending chat detail item:', err);
      }
    }
  }, [claims]);




  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Quick search input state
  const [quickSearch, setQuickSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Filter bar visibility
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'time', 'claim', 'transport', or null
  const [actionMenuId, setActionMenuId] = useState(null);
  const [modalMode, setModalMode] = useState('view'); // 'edit', 'process', 'view'

  // Dropdown click outside hook
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeDropdown && !e.target.closest('.filter-dropdown-wrapper')) {
        setActiveDropdown(null);
      }
      setActionMenuId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeDropdown]);

  // Add new claim modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addDongHang, setAddDongHang] = useState('Atlas');
  const [addLoaiClaim, setAddLoaiClaim] = useState('Khách nhắc nhở');
  const [addMaThamChieu, setAddMaThamChieu] = useState('');
  const [addTenSanPham, setAddTenSanPham] = useState('');
  const [addMucPhat, setAddMucPhat] = useState('Nhắc nhở');
  const [addGiaTriPhat, setAddGiaTriPhat] = useState('');
  const [addMaLoi, setAddMaLoi] = useState('');
  const [addMaLoiCty, setAddMaLoiCty] = useState('');
  const [addLpn, setAddLpn] = useState('');
  const [addMaCont, setAddMaCont] = useState('');
  const [addNgayXuat, setAddNgayXuat] = useState('');
  const [addTrangThaiXuLy, setAddTrangThaiXuLy] = useState('Mới');
  const [addLinkCapa, setAddLinkCapa] = useState('');
  const [addGhiChu, setAddGhiChu] = useState('');
  const [addImages, setAddImages] = useState([]);
  const [addImageCaptions, setAddImageCaptions] = useState([]);
  const [addModalError, setAddModalError] = useState('');

  // States for filter inputs inside the popup modal
  const [editYear, setEditYear] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const [editStatus, setEditStatus] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCompanyErrorCode, setEditCompanyErrorCode] = useState('');
  const [editClaimItem, setEditClaimItem] = useState('Cabinet#');
  const [editDefectCode, setEditDefectCode] = useState('');
  const [editContainer, setEditContainer] = useState('');
  const [editLpn, setEditLpn] = useState('');
  const [editPenalty, setEditPenalty] = useState('');
  const [editPenaltyTotal, setEditPenaltyTotal] = useState('');

  // States for autocomplete visibility in the filter bar
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
  const [showDefectCodeSuggestions, setShowDefectCodeSuggestions] = useState(false);
  const [showCompanyErrorCodeSuggestions, setShowCompanyErrorCodeSuggestions] = useState(false);
  const [showClaimItemSuggestions, setShowClaimItemSuggestions] = useState(false);
  const [showContainerSuggestions, setShowContainerSuggestions] = useState(false);
  const [showLpnSuggestions, setShowLpnSuggestions] = useState(false);
  const [showPenaltySuggestions, setShowPenaltySuggestions] = useState(false);
  const [showPenaltyTotalSuggestions, setShowPenaltyTotalSuggestions] = useState(false);

  // Computed suggestion options using useMemo based on current claims or defectCatalog
  const uniqueSkuOptions = useMemo(() => {
    return Array.from(new Set(claims.map(c => c.product_name || c.sku).filter(Boolean)));
  }, [claims]);

  const uniqueDefectCodeOptions = useMemo(() => {
    const catalogCodes = defectCatalog.map(d => d.defect_code).filter(Boolean);
    if (catalogCodes.length > 0) return Array.from(new Set(catalogCodes));
    return Array.from(new Set(claims.map(c => c.order_code || c.defect_code).filter(Boolean)));
  }, [defectCatalog, claims]);

  const uniqueCompanyErrorCodeOptions = useMemo(() => {
    const catalogG7 = defectCatalog.map(d => d.g7_defect_code).filter(Boolean);
    if (catalogG7.length > 0) return Array.from(new Set(catalogG7));
    return Array.from(new Set(claims.map(c => c.company_error_code).filter(Boolean)));
  }, [defectCatalog, claims]);

  const uniqueClaimItemOptions = useMemo(() => {
    return Array.from(new Set(claims.map(c => c.claim_code).filter(Boolean)));
  }, [claims]);

  const uniqueContainerOptions = useMemo(() => {
    return Array.from(new Set(claims.map(c => c.cont || c.container_no).filter(Boolean)));
  }, [claims]);

  const uniqueLpnOptions = useMemo(() => {
    return Array.from(new Set(claims.map(c => c.lpn).filter(Boolean)));
  }, [claims]);

  const uniquePenaltyOptions = useMemo(() => {
    return Array.from(new Set(claims.map(c => normalizePenaltyValue(c.penalty)).filter(Boolean)));
  }, [claims]);

  const uniquePenaltyTotalOptions = useMemo(() => {
    return Array.from(new Set(claims.map(c => calculateTotalPenalty(c)).filter(val => val > 0)))
      .map(val => formatPenaltyValue(val));
  }, [claims]);

  // Active applied filters
  const [appliedFilters, setAppliedFilters] = useState({});

  const activeFiltersCount = useMemo(() => {
    return Object.entries(appliedFilters).filter(([key, value]) => {
      if (!value) return false;
      if (key === 'claimItem' && (value === 'Cabinet#' || value === 'Cabinet #')) return false;
      return true;
    }).length;
  }, [appliedFilters]);

  // Reactive filtering useEffect
  useEffect(() => {
    const newFilters = {};
    if (editYear) newFilters.year = editYear;
    if (editMonth) newFilters.month = editMonth;
    if (editStartDate) newFilters.startDate = editStartDate;
    if (editEndDate) newFilters.endDate = editEndDate;
    if (editStatus) newFilters.status = editStatus;
    if (editSku) newFilters.sku = editSku;
    if (editCompanyErrorCode) newFilters.companyErrorCode = editCompanyErrorCode;
    if (editClaimItem) newFilters.claimItem = editClaimItem;
    if (editDefectCode) newFilters.defectCode = editDefectCode;
    if (editContainer) newFilters.container = editContainer;
    if (editLpn) newFilters.lpn = editLpn;
    if (editPenalty) newFilters.penalty = editPenalty;
    if (editPenaltyTotal) newFilters.penaltyTotal = editPenaltyTotal;
    setAppliedFilters(newFilters);
  }, [
    editYear, editMonth, editStartDate, editEndDate,
    editStatus, editSku, editCompanyErrorCode, editClaimItem,
    editDefectCode, editContainer, editLpn, editPenalty, editPenaltyTotal
  ]);

  // Helper to extract integer month from "Tháng X"
  const getMonthNumber = (monthStr) => {
    if (!monthStr) return null;
    const match = monthStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  };

  // Synchronize Year and Month dropdowns based on manual Date Range selection
  const syncYearMonthFromDates = (start, end) => {
    if (start && end) {
      const sParts = start.split('-');
      const eParts = end.split('-');
      const sYear = sParts[0];
      const sMonth = parseInt(sParts[1], 10);
      const eYear = eParts[0];
      const eMonth = parseInt(eParts[1], 10);

      if (sYear === eYear && sMonth === eMonth) {
        setEditYear(sYear);
        setEditMonth(`Tháng ${sMonth}`);
      } else {
        // Spans multiple months/years
        setEditYear('');
        setEditMonth('');
      }
    } else if (start) {
      const sParts = start.split('-');
      setEditYear(sParts[0]);
      setEditMonth(`Tháng ${parseInt(sParts[1], 10)}`);
    }
  };

  // Custom handlers for date filter controls
  const handleYearChange = (yearVal) => {
    setEditYear(yearVal);
    if (!yearVal) {
      setEditMonth('');
    } else {
      if (editMonth) {
        const mNum = getMonthNumber(editMonth);
        const firstDay = `${yearVal}-${String(mNum).padStart(2, '0')}-01`;
        const lastDayDate = new Date(parseInt(yearVal, 10), mNum, 0);
        const lastDay = `${yearVal}-${String(mNum).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setEditStartDate(firstDay);
        setEditEndDate(lastDay);
      } else {
        if (editStartDate) {
          const sYear = editStartDate.split('-')[0];
          if (sYear !== yearVal) setEditStartDate(`${yearVal}-01-01`);
        }
        if (editEndDate) {
          const eYear = editEndDate.split('-')[0];
          if (eYear !== yearVal) setEditEndDate(`${yearVal}-12-31`);
        }
      }
    }
  };

  const handleMonthChange = (monthVal) => {
    setEditMonth(monthVal);
    if (monthVal && editYear) {
      const mNum = getMonthNumber(monthVal);
      const firstDay = `${editYear}-${String(mNum).padStart(2, '0')}-01`;
      const lastDayDate = new Date(parseInt(editYear, 10), mNum, 0);
      const lastDay = `${editYear}-${String(mNum).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
      setEditStartDate(firstDay);
      setEditEndDate(lastDay);
    }
  };

  const handleStartDateChange = (val) => {
    setEditStartDate(val);
    syncYearMonthFromDates(val, editEndDate);
  };

  const handleEndDateChange = (val) => {
    setEditEndDate(val);
    syncYearMonthFromDates(editStartDate, val);
  };

  // Check if date selection is valid
  const isDateFilterValid = () => {
    if (editYear) {
      if (editStartDate) {
        const sYear = editStartDate.split('-')[0];
        if (sYear !== editYear) return false;
      }
      if (editEndDate) {
        const eYear = editEndDate.split('-')[0];
        if (eYear !== editYear) return false;
      }
    }
    if (editMonth && editYear) {
      const mNum = getMonthNumber(editMonth);
      if (editStartDate) {
        const sParts = editStartDate.split('-');
        const sYear = sParts[0];
        const sMonth = parseInt(sParts[1], 10);
        if (sYear !== editYear || sMonth !== mNum) return false;
      }
      if (editEndDate) {
        const eParts = editEndDate.split('-');
        const eYear = eParts[0];
        const eMonth = parseInt(eParts[1], 10);
        if (eYear !== editYear || eMonth !== mNum) return false;
      }
    }
    if (editStartDate && editEndDate) {
      if (editStartDate > editEndDate) return false;
    }
    return true;
  };

  // Modal states for claim edit interactions
  const [selectedClaimIds, setSelectedClaimIds] = useState([]);

  const handleToggleSelectAll = () => {
    // Only toggle rows visible on the current page
    const displayedIds = paginatedClaims.map(c => c.id);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedClaimIds.includes(id));

    if (allSelected) {
      setSelectedClaimIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedClaimIds(prev => {
        const next = [...prev];
        displayedIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id) => {
    if (selectedClaimIds.includes(id)) {
      setSelectedClaimIds(prev => prev.filter(rowId => rowId !== id));
    } else {
      setSelectedClaimIds(prev => [...prev, id]);
    }
  };

  const handleProcessSelectedClaim = () => {
    // 1. Nếu có hàng được tích chọn
    if (selectedClaimIds.length > 0) {
      const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
      const targetClaim = selectedClaims.find(c => c.status === 'Mới' || c.status === 'Đang xử lý');
      if (targetClaim) {
        setModalMode('edit');
        setActiveDetailClaim(targetClaim);
        return;
      } else {
        showModal(
          'Thông báo', 
          'Không thể xử lý: Tất cả các dòng được chọn đều đã ở trạng thái "Đã xử lý". Để chỉnh sửa dòng đã xử lý, vui lòng nhấp vào dòng đó để xem chi tiết rồi nhấn biểu tượng cây bút 📝 ở góc trên, hoặc chọn "Xử lý khiếu nại" từ menu thao tác của dòng đó.', 
          'info'
        );
        return;
      }
    }

    // 2. Nếu không tích dòng nào, tìm dòng đầu tiên là Mới hoặc Đang xử lý
    const targetClaim = filteredClaimsToDisplay.find(c => c.status === 'Mới' || c.status === 'Đang xử lý');
    if (targetClaim) {
      setModalMode('edit');
      setActiveDetailClaim(targetClaim);
    } else {
      showModal('Thông báo', 'Không còn khiếu nại nào ở trạng thái "Mới" hoặc "Đang xử lý" để xử lý.', 'info');
    }
  };

  const handleOpenAddNewClaim = () => {
    setAddDongHang('Atlas');
    setAddLoaiClaim('Khách nhắc nhở');
    setAddMaThamChieu('Cabinet #');
    setAddTenSanPham('');
    setAddMucPhat('Nhắc nhở');
    setAddGiaTriPhat('');
    setAddMaLoi('');
    setAddMaLoiCty('');
    setAddLpn('');
    setAddMaCont('');
    setAddNgayXuat('');
    setAddTrangThaiXuLy('Mới');
    setAddLinkCapa('');
    setAddGhiChu('');
    setAddImages([]);
    setAddImageCaptions([]);
    setAddModalError('');
    setIsAddModalOpen(true);
  };

  const handlePrevClaim = () => {
    const currentIndex = filteredClaimsToDisplay.findIndex(c => c.id === activeDetailClaim.id);
    if (currentIndex > 0) {
      setActiveDetailClaim(filteredClaimsToDisplay[currentIndex - 1]);
    }
  };

  const handleNextClaim = () => {
    const currentIndex = filteredClaimsToDisplay.findIndex(c => c.id === activeDetailClaim.id);
    if (currentIndex < filteredClaimsToDisplay.length - 1) {
      setActiveDetailClaim(filteredClaimsToDisplay[currentIndex + 1]);
    }
  };

  // Latest Import metadata for status banner
  const [latestImport, setLatestImport] = useState(null);

  // Highlighting state
  const [highlightBatchId, setHighlightBatchId] = useState(null);

  // Selected detail modal states
  const [activeDetailClaim, setActiveDetailClaim] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const [zoomDragStart, setZoomDragStart] = useState({ x: 0, y: 0 });
  const [customerPenalties, setCustomerPenalties] = useState(() => {
    const saved = localStorage.getItem('smartflow_customer_penalties');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('smartflow_customer_penalties', JSON.stringify(customerPenalties));
  }, [customerPenalties]);

  const [editingMonthData, setEditingMonthData] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [isParsingPdf, setIsParsingPdf] = useState(false);

  const handleCreditNotePdfChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showModal('Lỗi', 'Chỉ chấp nhận tệp tin định dạng PDF.', 'error');
      return;
    }

    setIsParsingPdf(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await claimService.parseCreditNote(formData);
      setIsParsingPdf(false);
      
      if (!res.success || !res.month) {
        showModal(
          'Lỗi đọc tệp', 
          'Không thể trích xuất thông tin tháng hoặc tổng tiền phạt từ tệp PDF này. Vui lòng kiểm tra lại cấu trúc tệp.', 
          'error'
        );
        return;
      }

      // Check month match
      if (res.month !== editingMonthData.month) {
        showModal(
          'Sai tháng thống kê',
          `Tháng trong tệp Credit Note (${res.month}) không khớp với tháng bạn đang cập nhật (${editingMonthData.month})!`,
          'error'
        );
        return;
      }

      // Populate value
      setEditValue(res.total_amount);
      showModal(
        'Đọc thành công',
        `Đã trích xuất số tiền $${res.total_amount.toLocaleString()} từ Credit Note của tháng ${res.month}!`,
        'success'
      );
    } catch (err) {
      setIsParsingPdf(false);
      const errMsg = err.response?.data?.detail || err.message || 'Lỗi khi đọc file PDF.';
      showModal('Lỗi đọc tệp', errMsg, 'error');
    } finally {
      // Clear input so same file can be selected again
      e.target.value = '';
    }
  };

  // Reset zoom states when preview image changes or is closed
  useEffect(() => {
    setZoomScale(1);
    setZoomPosition({ x: 0, y: 0 });
    setIsZoomDragging(false);
  }, [previewImage]);

  // Handle escape key to close the image preview modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };
    if (previewImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewImage]);

  // Process claim modal state
  const [processDongHang, setProcessDongHang] = useState('Atlas');
  const [processLoaiClaim, setProcessLoaiClaim] = useState('Khách nhắc nhở');
  const [processMaThamChieu, setProcessMaThamChieu] = useState('');
  const [processTenSanPham, setProcessTenSanPham] = useState('');
  const [processMucPhat, setProcessMucPhat] = useState('Nhắc nhở');
  const [processGiaTriPhat, setProcessGiaTriPhat] = useState('');
  const [showProcessSuggestions, setShowProcessSuggestions] = useState(false);
  const [showAddSuggestions, setShowAddSuggestions] = useState(false);
  const [showProcessDefectSuggestions, setShowProcessDefectSuggestions] = useState(false);
  const [showAddDefectSuggestions, setShowAddDefectSuggestions] = useState(false);
  const [processMaLoi, setProcessMaLoi] = useState('');
  const [processMaLoiCty, setProcessMaLoiCty] = useState('');
  const [processLpn, setProcessLpn] = useState('');
  const [processMaCont, setProcessMaCont] = useState('');
  const disabledFieldStyle = {
    backgroundColor: '#F5F5F5',
    color: '#757575',
    borderColor: '#E0E0E0',
    cursor: 'not-allowed',
    opacity: 0.8
  };
  const [processNgayXuat, setProcessNgayXuat] = useState('');
  const [processTrangThaiXuLy, setProcessTrangThaiXuLy] = useState('Mới');
  const [processLinkCapa, setProcessLinkCapa] = useState('');
  const [processGhiChu, setProcessGhiChu] = useState('');
  const [processImages, setProcessImages] = useState([]);
  const [processImageCaptions, setProcessImageCaptions] = useState([]);
  const [editingAddImageIndex, setEditingAddImageIndex] = useState(null);
  const [editingProcessImageIndex, setEditingProcessImageIndex] = useState(null);
  const addImageInputRef = useRef(null);
  const editImageInputRef = useRef(null);
  // Helper to map customer defect codes (comma/slash/space separated) to G7 company defect codes
  const mapCustomerDefectsToCompany = (custDefectString) => {
    if (!custDefectString) return '';
    const tokens = custDefectString.split(/[\\,\/;]|\s+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    const mapped = tokens.map(token => {
      const match = defectCatalog.find(d => 
        (d.defect_code && d.defect_code.trim().toUpperCase() === token) ||
        (d.defect_code && d.defect_code.trim().toUpperCase().replace('-', '_') === token.replace('-', '_'))
      );
      return match ? match.g7_defect_code : null;
    }).filter(Boolean);
    
    return mapped.length > 0 ? mapped.join(', ') : '';
  };

  // Sync addMaLoi -> addMaLoiCty
  useEffect(() => {
    setAddMaLoiCty(mapCustomerDefectsToCompany(addMaLoi));
  }, [addMaLoi, defectCatalog]);

  // Sync processMaLoi -> processMaLoiCty
  useEffect(() => {
    setProcessMaLoiCty(mapCustomerDefectsToCompany(processMaLoi));
  }, [processMaLoi, defectCatalog]);

  const handleEditAddImageClick = (index) => {
    setEditingAddImageIndex(index);
    if (addImageInputRef.current) {
      addImageInputRef.current.click();
    }
  };

  const handleAddImageClick = () => {
    setEditingAddImageIndex(-1); // -1 indicates adding a new image
    if (addImageInputRef.current) {
      addImageInputRef.current.click();
    }
  };

  const handleAddImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      if (editingAddImageIndex === -1) {
        setAddImages(prev => [...prev, imageUrl]);
        setAddImageCaptions(prev => [...prev, file.name.split('.')[0]]);
      } else if (editingAddImageIndex !== null) {
        setAddImages(prev => prev.map((img, idx) => idx === editingAddImageIndex ? imageUrl : img));
      }
    }
    setEditingAddImageIndex(null);
    e.target.value = '';
  };

  const handleDeleteAddImageClick = (index) => {
    setAddImages(prev => prev.filter((_, idx) => idx !== index));
    setAddImageCaptions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleEditProcessImageClick = (index) => {
    setEditingProcessImageIndex(index);
    if (editImageInputRef.current) {
      editImageInputRef.current.click();
    }
  };

  const handleProcessAddImageClick = () => {
    setEditingProcessImageIndex(-1); // -1 indicates adding a new image
    if (editImageInputRef.current) {
      editImageInputRef.current.click();
    }
  };

  const handleProcessImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      if (editingProcessImageIndex === -1) {
        setProcessImages(prev => [...prev, imageUrl]);
        setProcessImageCaptions(prev => [...prev, file.name.split('.')[0]]);
      } else if (editingProcessImageIndex !== null) {
        setProcessImages(prev => prev.map((img, idx) => idx === editingProcessImageIndex ? imageUrl : img));
      }
    }
    setEditingProcessImageIndex(null);
    e.target.value = '';
  };

  const handleDeleteProcessImageClick = (index) => {
    setProcessImages(prev => prev.filter((_, idx) => idx !== index));
    setProcessImageCaptions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveNewClaim = async () => {
    const missingFields = [];
    if (!addTenSanPham || !addTenSanPham.trim()) {
      missingFields.push("Tên sản phẩm");
    }
    if (!addMaThamChieu || !addMaThamChieu.trim()) {
      missingFields.push("Mã tham chiếu");
    }
    if (!addNgayXuat || !addNgayXuat.trim()) {
      missingFields.push("Thời gian (Ngày xuất)");
    }
    if (!addImages || addImages.length === 0) {
      missingFields.push("Hình ảnh minh chứng");
    }

    if (missingFields.length > 0) {
      setAddModalError(`Thiếu thông tin bắt buộc: ${missingFields.join(', ')}. Yêu cầu nhập đầy đủ trước khi lưu.`);
      return;
    }
    setAddModalError('');

    try {
      setLoading(true);
      let backendStatus = 'Received';
      if (addTrangThaiXuLy === 'Đang xử lý') {
        backendStatus = 'Processing';
      } else if (addTrangThaiXuLy === 'Đã xử lý') {
        backendStatus = 'Resolved';
      }

      const claimData = {
        claim_code: addMaThamChieu,
        customer_name: addDongHang,
        product_name: addTenSanPham,
        order_code: addMaLoi,
        company_error_code: addMaLoiCty,
        description: addGhiChu,
        severity: addMucPhat === 'Hủy đơn' ? 'High' : addMucPhat === 'Phạt tiền' ? 'Medium' : 'Low',
        status: backendStatus
      };

      const result = await claimService.createClaim(claimData);
      
      if (result && result.id) {
        const newClaim = {
          id: result.id,
          product_name: result.product_name,
          avatar: mockupClaims[Math.floor(Math.random() * mockupClaims.length)].avatar,
          claim_code: result.claim_code,
          order_code: result.order_code,
          company_error_code: result.company_error_code,
          penalty: normalizePenaltyValue(addGiaTriPhat || '$0'),
          lpn: addLpn,
          cont: addMaCont,
          date: addNgayXuat ? (() => {
            const parts = addNgayXuat.split('-');
            if (parts.length === 3) return `${parts[1]}-${parts[0]}`; // YYYY-MM-DD -> MM-YYYY
            return '06-2026';
          })() : (() => {
            const d = new Date();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}-${yyyy}`;
          })(),
          status: result.status === 'Resolved' ? 'Đã xử lý' : result.status === 'Processing' ? 'Đang xử lý' : 'Mới',
          claim_description: result.description,
          capa_link: addLinkCapa,
          image_paths: addImages,
          image_captions: addImageCaptions
        };

        // Reset quickSearch and appliedFilters so the newly added claim is guaranteed to be shown
        setQuickSearch('');
        setAppliedFilters({});

        setClaims(prev => [newClaim, ...prev]);
        setIsAddModalOpen(false);
        
        const successMessage = (
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <p style={{ marginBottom: '14px', fontWeight: '500', color: '#2D1A12' }}>
                Thêm mới khiếu nại khách hàng thành công!
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', border: '1.5px solid #EADCC9' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', width: '35%', color: '#7B5233' }}>Tên sản phẩm</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.product_name}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Mã tham chiếu</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.claim_code}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Mã lỗi KH</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.order_code || 'N/A'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Mã lỗi G7</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.company_error_code || 'N/A'}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Giá trị phạt</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12', fontWeight: '500' }}>{newClaim.penalty}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #EADCC9' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Tổng tiền phạt</td>
                    <td style={{ padding: '8px 12px', color: '#B91C1C', fontWeight: '600' }}>{formatPenaltyValue(calculateTotalPenalty(newClaim))}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', fontWeight: 'bold', color: '#7B5233' }}>Container</td>
                    <td style={{ padding: '8px 12px', color: '#2D1A12' }}>{newClaim.cont || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {newClaim.image_paths && newClaim.image_paths.length > 0 && (
              <div style={{ width: '130px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233' }}>Ảnh minh chứng:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {newClaim.image_paths.map((imgUrl, idx) => (
                    <img 
                      key={idx}
                      src={imgUrl} 
                      alt={`Minh chứng ${idx + 1}`} 
                      style={{ 
                        width: '100%', 
                        height: '75px', 
                        objectFit: 'cover', 
                        borderRadius: '6px', 
                        border: '1px solid #EADCC9',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'zoom-in'
                      }} 
                      onClick={() => setPreviewImage(imgUrl)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

        showModal('Thành công', successMessage, 'success');
      } else {
        showModal('Thất bại', 'Không thể lưu khiếu nại mới vào cơ sở dữ liệu.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi lưu khiếu nại:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Lỗi không xác định khi lưu khiếu nại.';
      showModal('Thất bại', `Lỗi: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProcessClaim = async () => {
    if (!processTenSanPham.trim()) {
      showModal('Cảnh báo', 'Vui lòng nhập Tên sản phẩm.', 'warning');
      return;
    }
    if (!processMaThamChieu.trim()) {
      showModal('Cảnh báo', 'Vui lòng nhập Mã tham chiếu.', 'warning');
      return;
    }
    if (!processMaLoi.trim()) {
      showModal('Cảnh báo', 'Vui lòng nhập Mã lỗi.', 'warning');
      return;
    }

    try {
      setLoading(true);
      let backendStatus = 'Received';
      if (processTrangThaiXuLy === 'Đang xử lý') {
        backendStatus = 'Processing';
      } else if (processTrangThaiXuLy === 'Đã xử lý') {
        backendStatus = 'Resolved';
      }

      const claimData = {
        claim_code: processMaThamChieu,
        customer_name: processDongHang,
        product_name: processTenSanPham,
        order_code: processMaLoi,
        company_error_code: processMaLoiCty,
        description: processGhiChu,
        severity: processMucPhat === 'Hủy đơn' ? 'High' : processMucPhat === 'Phạt tiền' ? 'Medium' : 'Low',
        status: backendStatus,
        action: processGiaTriPhat,
        lpn: processLpn,
        container_no: processMaCont,
        image_paths: processImages,
        image_captions: processImageCaptions
      };

      const result = await claimService.updateClaim(activeDetailClaim.id, claimData);
      
      if (result && result.id) {
        setClaims(prev => prev.map(c => c.id === activeDetailClaim.id ? {
          ...c,
          product_name: result.product_name,
          claim_code: result.claim_code,
          order_code: result.order_code,
          company_error_code: result.company_error_code,
          penalty: normalizePenaltyValue(processGiaTriPhat),
          lpn: processLpn,
          cont: processMaCont,
          status: (result.status === 'Resolved' || result.status === 'Đã xử lý') ? 'Đã xử lý' : (result.status === 'Processing' || result.status === 'Đang xử lý') ? 'Đang xử lý' : 'Mới',
          claim_description: result.description,
          capa_link: processLinkCapa,
          image_paths: processImages,
          image_captions: processImageCaptions
        } : c));
        setActiveDetailClaim(null);
        showModal('Thành công', `Cập nhật thành công sản phẩm ${processTenSanPham}!`, 'success');
      } else {
        showModal('Thất bại', 'Không thể cập nhật khiếu nại. Vui lòng thử lại.', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật khiếu nại:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Lỗi không xác định khi cập nhật khiếu nại.';
      showModal('Thất bại', `Lỗi: ${errorMsg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeDetailClaim) {
      setProcessDongHang(activeDetailClaim.dong_hang || 'Atlas');
      setProcessLoaiClaim(activeDetailClaim.loai_claim || 'Khách nhắc nhở');
      setProcessMaThamChieu(activeDetailClaim.claim_code || '');
      setProcessTenSanPham(activeDetailClaim.product_name || activeDetailClaim.sku || '');
      setProcessMucPhat(activeDetailClaim.muc_phat || 'Nhắc nhở');
      setProcessGiaTriPhat(normalizePenaltyValue(activeDetailClaim.penalty || activeDetailClaim.action || ''));
      setProcessMaLoi(activeDetailClaim.order_code || activeDetailClaim.defect_code || '');
      setProcessMaLoiCty(activeDetailClaim.company_error_code || '');
      setProcessLpn(activeDetailClaim.lpn || '');
      setProcessMaCont(activeDetailClaim.cont || activeDetailClaim.container_no || '');
      setProcessImages(activeDetailClaim.image_paths || []);
      setProcessImageCaptions(activeDetailClaim.image_captions || []);

      // Ngày xuất: only month/year from period field, no fake day
      let formattedDate = '';
      const rawPeriod = activeDetailClaim.date || activeDetailClaim.period || '';
      if (rawPeriod) {
        // period format: "MM-YYYY" or "MM/YYYY"
        const parts = rawPeriod.split(/[-/]/);
        if (parts.length === 2) {
          formattedDate = `${parts[0].padStart(2, '0')}/${parts[1]}`; // display as MM/YYYY
        } else {
          formattedDate = rawPeriod;
        }
      }
      setProcessNgayXuat(formattedDate);
      setProcessTrangThaiXuLy(activeDetailClaim.status === 'Đã xử lý' || activeDetailClaim.status === 'Chấp nhận' ? 'Đã xử lý' : activeDetailClaim.status === 'Đang xử lý' ? 'Đang xử lý' : 'Mới');
      setProcessLinkCapa(activeDetailClaim.capa_link || activeDetailClaim.link_capa || '');
      setProcessGhiChu(activeDetailClaim.claim_description || activeDetailClaim.description || '');
    }
  }, [activeDetailClaim]);

  // Dropdown states & refs
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const pdfInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // PDF Archive states
  const [isPdfFolderModalOpen, setIsPdfFolderModalOpen] = useState(false);
  const [importedPdfs, setImportedPdfs] = useState([]);
  const [selectedPdfForPreview, setSelectedPdfForPreview] = useState(null);
  const [pdfActionMenuId, setPdfActionMenuId] = useState(null);
  const [pdfSearchQuery, setPdfSearchQuery] = useState('');

  const fetchImportedPdfs = async () => {
    try {
      const res = await claimService.getImportedPdfs();
      setImportedPdfs(res || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách PDF:', err);
    }
  };

  const getFullPdfUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
    return `${API_ROOT}${cleanUrl}`;
  };

  const handleOpenPdfFolderModal = () => {
    setIsPdfFolderModalOpen(true);
    fetchImportedPdfs();
  };

  const handleDeletePdf = async (filename) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa file PDF này? Hành động này không thể khôi phục.`)) {
      return;
    }
    try {
      setLoading(true);
      await claimService.deleteImportedPdf(filename);
      setPdfActionMenuId(null);
      fetchImportedPdfs();
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.error('Lỗi khi xóa PDF:', err);
      alert('Không thể xóa file PDF. Lỗi: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Dropdown click outside hook for new Import dropdown & Other dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.import-dropdown-container')) {
        setIsImportDropdownOpen(false);
      }
      if (!event.target.closest('.other-dropdown-container')) {
        setIsOtherDropdownOpen(false);
      }
      if (!event.target.closest('.pdf-action-menu-container')) {
        setPdfActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const triggerPdfUpload = () => {
    if (pdfInputRef.current) pdfInputRef.current.click();
  };

  const triggerFolderUpload = () => {
    if (folderInputRef.current) folderInputRef.current.click();
  };

  const handlePdfFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      window.dispatchEvent(new CustomEvent('start-claim-pdf-import-error', {
        detail: { message: 'Chỉ chấp nhận các tệp tin định dạng PDF.' }
      }));
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }

    window.dispatchEvent(new CustomEvent('start-claim-pdf-import', {
      detail: {
        files: pdfFiles,
        isMultiple: pdfFiles.length > 1
      }
    }));
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handleFolderFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      window.dispatchEvent(new CustomEvent('start-claim-pdf-import-error', {
        detail: { message: 'Không tìm thấy tệp tin PDF nào trong thư mục đã chọn.' }
      }));
      if (folderInputRef.current) folderInputRef.current.value = '';
      return;
    }

    window.dispatchEvent(new CustomEvent('start-claim-pdf-import', {
      detail: {
        files: pdfFiles,
        isMultiple: true
      }
    }));
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  useEffect(() => {
    const handleSuccessRefresh = (e) => {
      const response = e.detail;
      fetchClaims();
      // Scroll to top of table and window
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const tableContainer = document.querySelector('.report-table-container');
      if (tableContainer) tableContainer.scrollTop = 0;

      // Highlight row animation
      setHighlightBatchId(response.batch_id);
      setTimeout(() => {
        setHighlightBatchId(null);
      }, 4000);

      // Update latest import metadata banner
      setLatestImport({
        batch_id: response.batch_id,
        period: response.period,
        total_records: response.total_records,
        warnings_count: response.parse_warnings ? response.parse_warnings.length : 0,
        imported_at: new Date().toLocaleString('vi-VN')
      });
    };

    window.addEventListener('pdf-import-success-refresh', handleSuccessRefresh);
    return () => window.removeEventListener('pdf-import-success-refresh', handleSuccessRefresh);
  }, []);

  useEffect(() => {
    // Set Header titles exactly like the top of screenshot
    setCustomTitle('Quản lý khiếu nại');
    setCustomSubtitle('AD2 · Tổng quan hệ thống');

    // Set top right header extra icons (? and layout grid)
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

    loadLatestImportBatch();

    return () => setHeaderExtra(null);
  }, []);

  const loadLatestImportBatch = async () => {
    setLoading(true);
    try {
      const batches = await claimService.getImportBatches();
      if (batches && batches.length > 0) {
        const latest = batches[0];
        const batchDetail = await claimService.getImportBatch(latest.batch_id);
        if (batchDetail && batchDetail.records && batchDetail.records.length > 0) {
          const mappedClaims = batchDetail.records.map(r => ({
            id: r.id,
            product_name: r.sku,
            avatar: `https://ui-avatars.com/api/?name=${r.sku}&background=random`,
            claim_code: `Cabinet #${r.cabinet_no}`,
            order_code: r.defect_code,
            company_error_code: r.company_error_code,
            penalty: normalizePenaltyValue(r.action),
            lpn: r.lpn,
            cont: r.container_no,
            date: r.period,
            status: r.status || 'Mới',

            sku: r.sku,
            cabinet_no: r.cabinet_no,
            claim_description: r.claim_description,
            defect_code: r.defect_code,
            action: normalizePenaltyValue(r.action),
            period: r.period,
            image_paths: r.image_paths,
            image_captions: r.image_captions,
            source_page: r.source_page,
            photo_pages: r.photo_pages,
            batch_id: r.batch_id,
            stt: r.stt
          }));

          setClaims(mappedClaims);

          setLatestImport({
            batch_id: latest.batch_id,
            period: latest.period,
            total_records: latest.total_records,
            warnings_count: batchDetail.parse_warnings ? batchDetail.parse_warnings.length : 0,
            imported_at: latest.created_at
          });
          return;
        }
      }
      await fetchClaims();
    } catch (err) {
      console.error('Lỗi khi tải lô import gần nhất:', err);
      await fetchClaims();
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await claimService.getClaims();
      if (response.items && response.items.length > 0) {
        const dbMapped = response.items.map((item, idx) => ({
          id: item.id,
          product_name: item.product_name || item.sku,
          avatar: `https://ui-avatars.com/api/?name=${item.product_name || item.sku}&background=random`,
          claim_code: item.claim_code,
          order_code: item.order_code || item.defect_code,
          company_error_code: item.company_error_code,
          penalty: item.penalty || item.action || '$0',
          lpn: item.lpn || 'N/A',
          cont: item.cont || item.container_no || 'N/A',
          date: item.period || (item.created_at ? (() => {
            const d = new Date(item.created_at);
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${mm}-${yyyy}`;
          })() : 'N/A'),
          status: item.status === 'Resolved' || item.status === 'Đã xử lý' || item.status === 'Chấp nhận' ? 'Đã xử lý' : item.status === 'Processing' || item.status === 'Đang xử lý' ? 'Đang xử lý' : 'Mới',
          claim_description: item.description || item.claim_description,
          image_paths: item.image_paths || [],
          image_captions: item.image_captions || []
        }));
        setClaims(dbMapped);
      } else {
        setClaims([]);
      }
    } catch (error) {
      console.error('Lỗi tải danh sách khiếu nại:', error);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  // --- FILTER ACTIONS ---
  const clearAllFilters = () => {
    setEditYear('');
    setEditMonth('');
    setEditStartDate('');
    setEditEndDate('');

    setEditStatus('');
    setEditSku('');
    setEditCompanyErrorCode('');
    setEditClaimItem('Cabinet#');
    setEditDefectCode('');
    setEditContainer('');
    setEditLpn('');
    setEditPenalty('');
    setEditPenaltyTotal('');
  };

  const removeFilterKey = (key) => {
    if (key === 'year') setEditYear('');
    else if (key === 'month') setEditMonth('');
    else if (key === 'startDate') setEditStartDate('');
    else if (key === 'endDate') setEditEndDate('');
    else if (key === 'status') setEditStatus('');
    else if (key === 'sku') setEditSku('');
    else if (key === 'companyErrorCode') setEditCompanyErrorCode('');
    else if (key === 'claimItem') setEditClaimItem('Cabinet#');
    else if (key === 'defectCode') setEditDefectCode('');
    else if (key === 'container') setEditContainer('');
    else if (key === 'lpn') setEditLpn('');
    else if (key === 'penalty') setEditPenalty('');
    else if (key === 'penaltyTotal') setEditPenaltyTotal('');
  };

  // --- CLIENT-SIDE FILTER EXECUTOR ---
  const getFilteredClaims = () => {
    return claims.filter(claim => {
      // 1. Quick search
      if (quickSearch) {
        const term = quickSearch.toLowerCase();
        const matchesSku = claim.product_name?.toLowerCase().includes(term);
        const matchesClaimItem = claim.claim_code?.toLowerCase().includes(term);
        const matchesDefectCode = claim.order_code?.toLowerCase().includes(term);
        const matchesLpn = claim.lpn?.toLowerCase().includes(term);
        const matchesCont = claim.cont?.toLowerCase().includes(term);

        if (!matchesSku && !matchesClaimItem && !matchesDefectCode && !matchesLpn && !matchesCont) {
          return false;
        }
      }

      // 2. Applied Filters
      let monthVal = 0;
      let yearVal = '';
      let claimDateObj = null;

      if (claim.date) {
        const dateParts = claim.date.split(/[-/]/);
        if (dateParts.length === 2) {
          // MM-YYYY
          monthVal = parseInt(dateParts[0], 10);
          yearVal = dateParts[1];
          claimDateObj = new Date(parseInt(yearVal, 10), monthVal - 1, 1);
        } else if (dateParts.length === 3) {
          if (dateParts[0].length === 4) {
            // YYYY-MM-DD
            yearVal = dateParts[0];
            monthVal = parseInt(dateParts[1], 10);
            claimDateObj = new Date(parseInt(yearVal, 10), monthVal - 1, parseInt(dateParts[2], 10));
          } else {
            // DD-MM-YYYY
            yearVal = dateParts[2];
            monthVal = parseInt(dateParts[1], 10);
            claimDateObj = new Date(parseInt(yearVal, 10), monthVal - 1, parseInt(dateParts[0], 10));
          }
        }
      }

      if (appliedFilters.year) {
        if (yearVal !== appliedFilters.year) {
          return false;
        }
      }

      if (appliedFilters.month) {
        const cleanMonthStr = appliedFilters.month.replace('Tháng ', '');
        const targetMonth = parseInt(cleanMonthStr, 10);
        if (monthVal !== targetMonth) {
          return false;
        }
      }

      if (appliedFilters.startDate) {
        const start = new Date(appliedFilters.startDate);
        start.setHours(0, 0, 0, 0);
        if (claimDateObj) {
          const claimTime = new Date(claimDateObj);
          claimTime.setHours(0, 0, 0, 0);
          if (claimTime < start) {
            return false;
          }
        } else {
          return false;
        }
      }

      if (appliedFilters.endDate) {
        const end = new Date(appliedFilters.endDate);
        end.setHours(23, 59, 59, 999);
        if (claimDateObj) {
          const claimTime = new Date(claimDateObj);
          claimTime.setHours(0, 0, 0, 0);
          if (claimTime > end) {
            return false;
          }
        } else {
          return false;
        }
      }

      if (appliedFilters.status) {
        if (claim.status !== appliedFilters.status) {
          return false;
        }
      }

      // Inline status filter from toolbar button
      if (statusFilter) {
        if (claim.status !== statusFilter) {
          return false;
        }
      }

      if (appliedFilters.sku) {
        if (!claim.product_name?.toLowerCase().includes(appliedFilters.sku.toLowerCase())) {
          return false;
        }
      }

      if (appliedFilters.claimItem) {
        const cleanClaimItem = appliedFilters.claimItem.replace(/\s+/g, '').toLowerCase();
        if (cleanClaimItem && cleanClaimItem !== 'cabinet' && cleanClaimItem !== 'cabinet#') {
          const cleanClaimCode = (claim.claim_code || '').replace(/\s+/g, '').toLowerCase();
          if (!cleanClaimCode.includes(cleanClaimItem)) {
            return false;
          }
        }
      }

      if (appliedFilters.defectCode) {
        if (!claim.order_code?.toLowerCase().includes(appliedFilters.defectCode.toLowerCase())) {
          return false;
        }
      }

      if (appliedFilters.companyErrorCode) {
        if (!claim.company_error_code?.toLowerCase().includes(appliedFilters.companyErrorCode.toLowerCase())) {
          return false;
        }
      }

      if (appliedFilters.container) {
        if (!claim.cont?.toLowerCase().includes(appliedFilters.container.toLowerCase())) {
          return false;
        }
      }

      if (appliedFilters.lpn) {
        if (!claim.lpn?.toLowerCase().includes(appliedFilters.lpn.toLowerCase())) {
          return false;
        }
      }

      if (appliedFilters.penalty) {
        const term = appliedFilters.penalty.toLowerCase();
        if (!claim.penalty?.toLowerCase().includes(term)) {
          return false;
        }
      }

      if (appliedFilters.penaltyTotal) {
        const term = appliedFilters.penaltyTotal.toLowerCase();
        const calculatedStr = formatPenaltyValue(calculateTotalPenalty(claim)).toLowerCase();
        const calculatedRawStr = String(calculateTotalPenalty(claim)).toLowerCase();
        if (!calculatedStr.includes(term) && !calculatedRawStr.includes(term)) {
          return false;
        }
      }

      return true;
    });
  };



  const getSortedClaims = (claimsList) => {
    if (!sortOption) return claimsList;
    return [...claimsList].sort((a, b) => {
      if (sortOption === 'name-asc') {
        return (a.product_name || '').localeCompare(b.product_name || '');
      }
      if (sortOption === 'name-desc') {
        return (b.product_name || '').localeCompare(a.product_name || '');
      }
      if (sortOption === 'time-asc') {
        return parseDate(a.date) - parseDate(b.date);
      }
      if (sortOption === 'time-desc') {
        return parseDate(b.date) - parseDate(a.date);
      }
      return 0;
    });
  };

  const filteredClaimsToDisplay = getSortedClaims(getFilteredClaims());

  // --- DYNAMIC ROWS PER PAGE CALCULATION ---
  // rowsPerPage is now controlled by user selection (10, 15, 20, All)
  // No dynamic calculation needed - user picks from dropdown

  // Reset page when filters change, sort option changes or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [claims, quickSearch, appliedFilters, sortOption, statusFilter]);

  // Pagination computed values
  const totalFilteredItems = filteredClaimsToDisplay.length;
  const isAllRows = rowsPerPage === Infinity || rowsPerPage === 'all';
  const totalPages = isAllRows ? 1 : Math.max(1, Math.ceil(totalFilteredItems / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = isAllRows ? 0 : (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = isAllRows ? totalFilteredItems : startIndex + rowsPerPage;
  const paginatedClaims = filteredClaimsToDisplay.slice(startIndex, endIndex);



  const getPenaltyStats = () => {
    const penaltyMap = {};
    let totalSum = 0;
    filteredClaimsToDisplay.forEach(c => {
      const p = normalizePenaltyValue(c.penalty || 'Không có');
      penaltyMap[p] = (penaltyMap[p] || 0) + 1;
      totalSum += calculateTotalPenalty(c);
    });

    const uniqueValues = Object.keys(penaltyMap);
    return {
      totalSum,
      uniqueCount: uniqueValues.length,
      breakdown: uniqueValues.map(val => `${val}: ${penaltyMap[val]} vụ`).join('\n')
    };
  };

  const penaltyStats = getPenaltyStats();

  const getMonthYear = (claim) => {
    const dateStr = claim.date || claim.period || '';
    if (!dateStr) return 'N/A';
    if (/^\d{2}-\d{4}$/.test(dateStr)) {
      return dateStr;
    }
    const match = dateStr.match(/^(\d{4})-(\d{2})/);
    if (match) {
      return `${match[2]}-${match[1]}`;
    }
    return dateStr;
  };

  const analyticsData = useMemo(() => {
    const monthlyMap = {};
    filteredClaimsToDisplay.forEach(c => {
      const month = getMonthYear(c);
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, count: 0, totalAmount: 0 };
      }
      monthlyMap[month].count += 1;
      monthlyMap[month].totalAmount += calculateTotalPenalty(c);
    });

    const sortedMonths = Object.keys(monthlyMap).sort((a, b) => {
      if (a === 'N/A') return 1;
      if (b === 'N/A') return -1;
      const [aMonth, aYear] = a.split('-').map(Number);
      const [bMonth, bYear] = b.split('-').map(Number);
      if (aYear !== bYear) return aYear - bYear;
      return aMonth - bMonth;
    });

    // Limit to maximum of recent 12 months from the filtered data
    const displayedMonths = sortedMonths.slice(-12);

    return displayedMonths.map(month => {
      const data = monthlyMap[month];
      return {
        month,
        count: data.count,
        totalAmount: data.totalAmount,
        customerAmount: customerPenalties[month] || 0,
        average: data.count > 0 ? (data.totalAmount / data.count) : 0
      };
    });
  }, [filteredClaimsToDisplay, customerPenalties]);

  // ============ EXCEPTION DETECTION LOGIC ============
  // Computes exception claims split into Claim Info and Transport sections
  const exceptionData = useMemo(() => {
    const claimInfoExceptions = [];
    const transportExceptions = [];

    // Build a Set of known defect codes from catalog for fast lookup
    const knownDefectCodes = new Set(
      defectCatalog.map(d => (d.defect_code || '').trim().toUpperCase()).filter(Boolean)
    );

    // Group claims to identify exact 100% duplicates
    const keyMap = {};
    filteredClaimsToDisplay.forEach(claim => {
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

    filteredClaimsToDisplay.forEach(claim => {
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
      const totalPenalty = calculateTotalPenalty(claim);

      if (hasPenaltyKeyword && totalPenalty === 0) {
        const sku = claim.product_name || claim.sku || 'N/A';
        claimExceptions.push({
          type: 'penalty_no_total',
          label: 'Có giá trị phạt nhưng không tính được tổng phạt',
          detail: `Giá trị phạt: "${penaltyRaw}" — SKU "${sku}" không có trong bảng giá tủ (Module Kinh doanh). Cần dò giá với quản lý giá tủ.`,
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
          detail: `Phát hiện dòng dữ liệu bị trùng lặp hoàn toàn với dòng khác. Vui lòng đối chiếu ảnh minh chứng bên dưới để xem có bị trùng lặp ảnh hay không.`,
          severity: 'error',
          duplicates: otherDups
        });
      }

      // --- TRANSPORT EXCEPTIONS ---
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
  }, [filteredClaimsToDisplay, defectCatalog, cabinetPrices]);
  // ============ END EXCEPTION DETECTION LOGIC ============

  // Setup headers for Table component
  const tableHeaders = [
    ...(hasWritePermission ? [{
      isCheckbox: true,
      label: (
        <input
          type="checkbox"
          className="checkbox-custom"
          checked={paginatedClaims.length > 0 && paginatedClaims.every(c => selectedClaimIds.includes(c.id))}
          onChange={handleToggleSelectAll}
        />
      )
    }] : []),
    { label: 'STT', style: { width: '60px' } },
    { label: 'Tên sản phẩm', className: 'text-left' },
    { label: 'Mã lỗi KH' },
    { label: 'Mã lỗi G7' },
    { label: 'Giá trị phạt' },
    { label: 'Tổng tiền phạt' },
    { label: 'LPN' },
    { label: 'Container' },
    { label: 'Thời gian Claim' },
    { label: 'Mã tham chiếu', className: 'text-left' },
    { label: 'Trạng thái' },
    ...(hasWritePermission ? [{ label: 'Thao tác' }] : [])
  ];

  // Helper inside Delete Confirmation modal to list out deletion results inside nested collapsible list
  const DeleteResultList = ({ items, type }) => {
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
      <div style={{ border: `1px solid ${borderColor}`, borderRadius: '8px', overflow: 'hidden' }}>
        {items.map((r, i) => {
          const claim = r.claim;
          const isOpen = !!expanded[i];
          const displayName = claim.product_name || claim.sku || 'N/A';
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
                    <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Mã lỗi G7:</span>
                    <span style={{ color: textColor, wordBreak: 'break-all' }}>{claim.company_error_code || 'N/A'}</span>
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
                  {!isSuccess && r.error && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', paddingTop: '6px', borderTop: `1px dashed ${detailBorder}` }}>
                      <span style={{ color: '#B91C1C', fontWeight: 'bold', minWidth: '110px' }}>Lý do thất bại:</span>
                      <span style={{ color: '#B91C1C', fontStyle: 'italic', wordBreak: 'break-word' }}>{r.error}</span>
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

  // Header Title setup for Process claim modal
  const processModalTitle = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingRight: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ margin: 0 }}>{modalMode === 'edit' || modalMode === 'process' ? 'Xử lý khiếu nại' : 'Chi tiết khiếu nại'}</span>
        {activeDetailClaim && (
          <div style={{
            fontSize: '0.85rem',
            fontWeight: 'bold',
            backgroundColor: processTrangThaiXuLy === 'Đã xử lý' ? '#ECFDF5' : processTrangThaiXuLy === 'Đang xử lý' ? '#FFFBEB' : '#FAF6F0',
            border: `1.5px solid ${processTrangThaiXuLy === 'Đã xử lý' ? '#A7F3D0' : processTrangThaiXuLy === 'Đang xử lý' ? '#FDE68A' : '#D7CCC8'}`,
            color: processTrangThaiXuLy === 'Đã xử lý' ? '#059669' : processTrangThaiXuLy === 'Đang xử lý' ? '#D97706' : '#8D6E63',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            {activeDetailClaim.claim_code} · {activeDetailClaim.product_name || activeDetailClaim.sku} · Thời gian Claim: {activeDetailClaim.date || activeDetailClaim.period}
          </div>
        )}
      </div>
    </div>
  );

  // Setup navigation variables for footer and side buttons
  const currentClaimIndex = activeDetailClaim ? filteredClaimsToDisplay.findIndex(c => c.id === activeDetailClaim.id) : -1;
  const hasPrevClaim = currentClaimIndex > 0;
  const hasNextClaim = currentClaimIndex !== -1 && currentClaimIndex < filteredClaimsToDisplay.length - 1;

  const claimNavFooterActions = activeDetailClaim && (
    <div className="modal-footer-nav-group" style={{ display: 'flex', gap: '8px' }}>
      <button
        title="Khiếu nại trước"
        type="button"
        onClick={handlePrevClaim}
        disabled={!hasPrevClaim}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #D7CCC8',
          backgroundColor: '#FFFFFF',
          color: '#7B5233',
          fontWeight: '600',
          fontSize: '0.85rem',
          cursor: hasPrevClaim ? 'pointer' : 'not-allowed',
          opacity: hasPrevClaim ? 1 : 0.4,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (hasPrevClaim) {
            e.currentTarget.style.backgroundColor = '#FAF6F0';
            e.currentTarget.style.borderColor = '#7B5233';
          }
        }}
        onMouseLeave={(e) => {
          if (hasPrevClaim) {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#D7CCC8';
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span>Trước đó</span>
      </button>
      <button
        title="Khiếu nại tiếp theo"
        type="button"
        onClick={handleNextClaim}
        disabled={!hasNextClaim}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 16px',
          borderRadius: '8px',
          border: '1px solid #D7CCC8',
          backgroundColor: '#FFFFFF',
          color: '#7B5233',
          fontWeight: '600',
          fontSize: '0.85rem',
          cursor: hasNextClaim ? 'pointer' : 'not-allowed',
          opacity: hasNextClaim ? 1 : 0.4,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          if (hasNextClaim) {
            e.currentTarget.style.backgroundColor = '#FAF6F0';
            e.currentTarget.style.borderColor = '#7B5233';
          }
        }}
        onMouseLeave={(e) => {
          if (hasNextClaim) {
            e.currentTarget.style.backgroundColor = '#FFFFFF';
            e.currentTarget.style.borderColor = '#D7CCC8';
          }
        }}
      >
        <span>Tiếp theo</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    </div>
  );

  const claimNavLeftSideAction = activeDetailClaim && (
    <button
      className="modal-side-nav-btn left"
      title="Khiếu nại trước"
      type="button"
      onClick={handlePrevClaim}
      disabled={!hasPrevClaim}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
  );

  const claimNavRightSideAction = activeDetailClaim && (
    <button
      className="modal-side-nav-btn right"
      title="Khiếu nại tiếp theo"
      type="button"
      onClick={handleNextClaim}
      disabled={!hasNextClaim}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  );

  return (
    <div className="claim-container">
      {/* SECTION 2: THREE SUMMARY CARDS */}
      <div className="overview-cards-grid">
        <div 
          className="summary-card" 
          style={{ transition: 'transform 0.2s ease' }}
        >
          <div className="summary-card-left">
            <span className="summary-card-label">Tổng số tiền phạt</span>
            <span className="summary-card-value">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(penaltyStats.totalSum)}
            </span>
          </div>
          <div 
            className="summary-card-icon-wrapper" 
            style={{ cursor: 'pointer' }}
            title="Nhấn để xem chi tiết thống kê theo tháng"
            onClick={() => setIsAnalyticsOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>

        <div 
          className="summary-card"
          style={{ transition: 'transform 0.2s ease' }}
        >
          <div className="summary-card-left">
            <span className="summary-card-label">Tổng số vụ ghi nhận</span>
            <span className="summary-card-value">{filteredClaimsToDisplay.length}</span>
          </div>
          <div 
            className="summary-card-icon-wrapper" 
            style={{ cursor: 'pointer' }}
            title="Nhấn để xem chi tiết thống kê theo tháng"
            onClick={() => setIsAnalyticsOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
        </div>


      </div>

      {/* SECTION 3: TOOLBAR */}
      <PageToolbar
        searchValue={quickSearch}
        onSearchChange={setQuickSearch}
        searchPlaceholder="Search nhanh SKU, Cont, LPN..."
        showSort={true}
        sortOptions={[
          { value: '', label: 'Mặc định' },
          { value: 'name-asc', label: 'Tên: A → Z' },
          { value: 'name-desc', label: 'Tên: Z → A' },
          { value: 'time-asc', label: 'Thời gian: Sớm nhất' },
          { value: 'time-desc', label: 'Thời gian: Mới nhất' }
        ]}
        sortValue={sortOption}
        onSortChange={setSortOption}
        showFilter={true}
        isFilterOpen={isFilterBarOpen}
        onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
        activeFiltersCount={activeFiltersCount}
        extraActions={[
          ...(hasWritePermission ? [{
            label: 'Xử lý khiếu nại',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>,
            onClick: handleProcessSelectedClaim,
            badge: claims.filter(c => c.status === 'Mới' || c.status === 'Đang xử lý').length
          }] : []),
          {
            label: 'Thư mục PDF',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
            onClick: handleOpenPdfFolderModal
          },
          {
            label: 'Ngoại lệ',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
            onClick: () => { setIsExceptionModalOpen(true); setExpandedExceptionItems({}); },
            badge: exceptionData.totalCount,
            badgeColor: '#C2410C',
            color: exceptionData.totalCount > 0 ? '#C2410C' : '#2D1A12'
          },
          ...(hasWritePermission && selectedClaimIds.length > 0 ? [{
            label: 'Xóa các mục đã chọn',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
            onClick: () => {
              if (selectedClaimIds.length === 0) return;
              const selectedClaims = claims.filter(c => selectedClaimIds.includes(c.id));
              setExpandedDeleteItems({});
              setDeleteConfirmation({
                items: selectedClaims,
                onConfirm: async () => {
                  setLoading(true);
                  const results = [];
                  for (const claim of selectedClaims) {
                    try {
                      await claimService.deleteClaim(claim.id);
                      results.push({ claim, success: true });
                    } catch (error) {
                      console.error(`Error deleting claim ${claim.id}:`, error);
                      const errMsg = error.response?.data?.detail || error.message || 'Lỗi không xác định';
                      results.push({ claim, success: false, error: errMsg });
                    }
                  }
                  setLoading(false);
                  setSelectedClaimIds([]);
                  fetchClaims();
                  const failures = results.filter(r => !r.success);
                  if (failures.length > 0) {
                    showModal('Kết quả xóa', `Đã xóa thành công ${results.length - failures.length}/${results.length} khiếu nại. Có ${failures.length} mục lỗi không xóa được.`, 'warning');
                  }
                }
              });
            },
            color: '#DC2626',
            divider: true
          }] : [])
        ]}
        importActions={hasWritePermission ? [
          {
            label: 'Nhập file PDF',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>,
            onClick: triggerPdfUpload
          },
          {
            label: 'Nhập thư mục',
            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
            onClick: triggerFolderUpload
          }
        ] : []}
        onExport={handleExportExcel}
        isExporting={isExporting}
        onCreate={hasWritePermission ? handleOpenAddNewClaim : undefined}
        hasWritePermission={hasWritePermission}
      >
        {hasWritePermission && (
          <input
            type="file"
            ref={pdfInputRef}
            style={{ display: 'none' }}
            accept=".pdf"
            multiple
            onChange={handlePdfFileChange}
          />
        )}
        {hasWritePermission && (
          <input
            type="file"
            ref={folderInputRef}
            style={{ display: 'none' }}
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderFileChange}
          />
        )}
      </PageToolbar>
      {/* INLINE EXPANDABLE FILTER BAR */}
      {isFilterBarOpen && (
        <div className="filter-inline-bar">
          {/* CATEGORY 0: HIỂN THỊ SỐ DÒNG */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'rows' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'rows' ? null : 'rows'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="9" x2="15" y2="9"></line>
                <line x1="9" y1="13" x2="15" y2="13"></line>
                <line x1="9" y1="17" x2="13" y2="17"></line>
              </svg>
              <span>Hiển thị: {rowsPerPage === Infinity ? 'Tất cả' : `${rowsPerPage} dòng`}</span>
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'rows' && (
              <div className="filter-dropdown-card" style={{ width: '160px', padding: '12px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group" style={{ margin: 0 }}>
                  <label className="filter-field-label">Hiển thị số dòng</label>
                  <select
                    value={rowsPerPage === Infinity ? 'all' : rowsPerPage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRowsPerPage(val === 'all' ? Infinity : parseInt(val, 10));
                      setCurrentPage(1);
                      setActiveDropdown(null);
                    }}
                    style={{
                      width: '100%',
                      height: '32px',
                      border: '1px solid #EADCC9',
                      borderRadius: '6px',
                      padding: '0 8px',
                      fontSize: '0.8rem',
                      color: '#7B5233',
                      fontWeight: 'bold',
                      backgroundColor: '#FAF6F0',
                      outline: 'none'
                    }}
                  >
                    <option value={10}>10 dòng</option>
                    <option value={15}>15 dòng</option>
                    <option value={20}>20 dòng</option>
                    <option value="all">Tất cả</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 1: THỜI GIAN */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'time' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'time' ? null : 'time'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>Thời gian</span>
              {['year', 'month', 'startDate', 'endDate'].filter(k => appliedFilters[k]).length > 0 && (
                <span className="filter-active-badge">
                  {['year', 'month', 'startDate', 'endDate'].filter(k => appliedFilters[k]).length}
                </span>
              )}
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'time' && (
              <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group">
                  <label className="filter-field-label">Năm</label>
                  <select value={editYear} onChange={(e) => handleYearChange(e.target.value)}>
                    <option value="">Tất cả</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
                <div className="filter-field-group">
                  <label className="filter-field-label">Tháng</label>
                  <select value={editMonth} onChange={(e) => handleMonthChange(e.target.value)} disabled={!editYear}>
                    <option value="">{editYear ? 'Tất cả' : 'Chọn năm'}</option>
                    <option value="Tháng 1">Tháng 1</option>
                    <option value="Tháng 2">Tháng 2</option>
                    <option value="Tháng 3">Tháng 3</option>
                    <option value="Tháng 4">Tháng 4</option>
                    <option value="Tháng 5">Tháng 5</option>
                    <option value="Tháng 6">Tháng 6</option>
                    <option value="Tháng 7">Tháng 7</option>
                    <option value="Tháng 8">Tháng 8</option>
                    <option value="Tháng 9">Tháng 9</option>
                    <option value="Tháng 10">Tháng 10</option>
                    <option value="Tháng 11">Tháng 11</option>
                    <option value="Tháng 12">Tháng 12</option>
                  </select>
                </div>
                <div className="filter-field-group">
                  <label className="filter-field-label">Từ ngày</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="filter-dropdown-input"
                  />
                </div>
                <div className="filter-field-group">
                  <label className="filter-field-label">Đến ngày</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="filter-dropdown-input"
                  />
                </div>
                {!isDateFilterValid() && (
                  <div style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '2px', fontWeight: '600', gridColumn: 'span 2' }}>
                    Ngày tạo claim phải nằm trong tháng/năm đã chọn.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CATEGORY 2: THÔNG TIN CLAIM */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'claim' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'claim' ? null : 'claim'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              <span>Thông tin claim</span>
              {['status', 'sku', 'defectCode', 'companyErrorCode', 'penalty', 'penaltyTotal'].filter(k => appliedFilters[k]).length > 0 && (
                <span className="filter-active-badge">
                  {['status', 'sku', 'defectCode', 'companyErrorCode', 'penalty', 'penaltyTotal'].filter(k => appliedFilters[k]).length}
                </span>
              )}
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'claim' && (
              <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group" style={{ gridColumn: 'span 2' }}>
                  <label className="filter-field-label">Trạng thái</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                    <option value="">Tất cả</option>
                    <option value="Mới">Mới</option>
                    <option value="Đang xử lý">Đang xử lý</option>
                    <option value="Đã xử lý">Đã xử lý</option>
                  </select>
                </div>
                <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label className="filter-field-label">Tên sản phẩm</label>
                  <input
                    type="text"
                    placeholder="Tên sản phẩm..."
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowSkuSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSkuSuggestions(false), 200)}
                  />
                  {showSkuSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniqueSkuOptions
                        .filter(opt => !editSku || opt.toLowerCase().includes(editSku.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditSku(opt);
                              setShowSkuSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="filter-field-group" style={{ position: 'relative' }}>
                  <label className="filter-field-label">Mã lỗi KH</label>
                  <input
                    type="text"
                    placeholder="Mã lỗi KH..."
                    value={editDefectCode}
                    onChange={(e) => setEditDefectCode(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowDefectCodeSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDefectCodeSuggestions(false), 200)}
                  />
                  {showDefectCodeSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniqueDefectCodeOptions
                        .filter(opt => !editDefectCode || opt.toLowerCase().includes(editDefectCode.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditDefectCode(opt);
                              setShowDefectCodeSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="filter-field-group" style={{ position: 'relative' }}>
                  <label className="filter-field-label">Mã lỗi G7</label>
                  <input
                    type="text"
                    placeholder="Mã lỗi G7..."
                    value={editCompanyErrorCode}
                    onChange={(e) => setEditCompanyErrorCode(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowCompanyErrorCodeSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowCompanyErrorCodeSuggestions(false), 200)}
                  />
                  {showCompanyErrorCodeSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniqueCompanyErrorCodeOptions
                        .filter(opt => !editCompanyErrorCode || opt.toLowerCase().includes(editCompanyErrorCode.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditCompanyErrorCode(opt);
                              setShowCompanyErrorCodeSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="filter-field-group" style={{ position: 'relative' }}>
                  <label className="filter-field-label">Giá trị phạt</label>
                  <input
                    type="text"
                    placeholder="Giá trị phạt..."
                    value={editPenalty}
                    onChange={(e) => setEditPenalty(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowPenaltySuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPenaltySuggestions(false), 200)}
                  />
                  {showPenaltySuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniquePenaltyOptions
                        .filter(opt => !editPenalty || opt.toLowerCase().includes(editPenalty.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditPenalty(opt);
                              setShowPenaltySuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="filter-field-group" style={{ position: 'relative' }}>
                  <label className="filter-field-label">Tổng tiền phạt</label>
                  <input
                    type="text"
                    placeholder="Tổng tiền phạt..."
                    value={editPenaltyTotal}
                    onChange={(e) => setEditPenaltyTotal(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowPenaltyTotalSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowPenaltyTotalSuggestions(false), 200)}
                  />
                  {showPenaltyTotalSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniquePenaltyTotalOptions
                        .filter(opt => !editPenaltyTotal || opt.toLowerCase().includes(editPenaltyTotal.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditPenaltyTotal(opt);
                              setShowPenaltyTotalSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CATEGORY 3: THAM CHIẾU & VẬN CHUYỂN */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'transport' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'transport' ? null : 'transport'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>Vận chuyển & Tham chiếu</span>
              {['claimItem', 'container', 'lpn'].filter(k => {
                const val = appliedFilters[k];
                if (!val) return false;
                if (k === 'claimItem' && (val === 'Cabinet#' || val === 'Cabinet #')) return false;
                return true;
              }).length > 0 && (
                <span className="filter-active-badge">
                  {['claimItem', 'container', 'lpn'].filter(k => {
                    const val = appliedFilters[k];
                    if (!val) return false;
                    if (k === 'claimItem' && (val === 'Cabinet#' || val === 'Cabinet #')) return false;
                    return true;
                  }).length}
                </span>
              )}
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'transport' && (
              <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label className="filter-field-label">Claim item</label>
                  <input
                    type="text"
                    placeholder="Cabinet#1..."
                    value={editClaimItem}
                    onChange={(e) => setEditClaimItem(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowClaimItemSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowClaimItemSuggestions(false), 200)}
                  />
                  {showClaimItemSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniqueClaimItemOptions
                        .filter(opt => !editClaimItem || opt.toLowerCase().includes(editClaimItem.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditClaimItem(opt);
                              setShowClaimItemSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label className="filter-field-label">Container</label>
                  <input
                    type="text"
                    placeholder="WHSU..."
                    value={editContainer}
                    onChange={(e) => setEditContainer(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowContainerSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowContainerSuggestions(false), 200)}
                  />
                  {showContainerSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniqueContainerOptions
                        .filter(opt => !editContainer || opt.toLowerCase().includes(editContainer.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditContainer(opt);
                              setShowContainerSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label className="filter-field-label">LPN</label>
                  <input
                    type="text"
                    placeholder="Mã LPN..."
                    value={editLpn}
                    onChange={(e) => setEditLpn(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowLpnSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLpnSuggestions(false), 200)}
                  />
                  {showLpnSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniqueLpnOptions
                        .filter(opt => !editLpn || opt.toLowerCase().includes(editLpn.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setEditLpn(opt);
                              setShowLpnSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active applied filter chips container with a border wrapper */}
          {activeFiltersCount > 0 && (
            <div
              className="filter-chips-wrapper"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                border: '1.5px dashed #EADCC9',
                borderRadius: '8px',
                padding: '4px 10px',
                backgroundColor: '#FFFFFF',
                minHeight: '34px',
                boxSizing: 'border-box',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8D6E63', display: 'flex', alignItems: 'center' }}>Đã chọn:</span>
              {Object.entries(appliedFilters).map(([key, value]) => {
                if (!value) return null;
                if (key === 'claimItem' && (value === 'Cabinet#' || value === 'Cabinet #')) return null;
                let displayLabel = '';

                if (key === 'year') displayLabel = `Năm: ${value}`;
                else if (key === 'month') displayLabel = `Tháng: ${value}`;
                else if (key === 'startDate') displayLabel = `Từ ngày: ${value}`;
                else if (key === 'endDate') displayLabel = `Đến ngày: ${value}`;
                else if (key === 'status') displayLabel = `Trạng thái: ${value}`;
                else if (key === 'sku') displayLabel = `Tên sản phẩm: ${value}`;
                else if (key === 'claimItem') displayLabel = `Mã tham chiếu: ${value}`;
                else if (key === 'defectCode') displayLabel = `Mã lỗi KH: ${value}`;
                else if (key === 'companyErrorCode') displayLabel = `Mã lỗi G7: ${value}`;
                else if (key === 'container') displayLabel = `Container: ${value}`;
                else if (key === 'lpn') displayLabel = `LPN: ${value}`;
                else return null;

                return (
                  <div
                    key={key}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#FAF6F0',
                      color: '#7B5233',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: '1px solid #EADCC9',
                      height: '24px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span>{displayLabel}</span>
                    <button
                      type="button"
                      onClick={() => removeFilterKey(key)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#A0301B',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        lineHeight: 1,
                        padding: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontWeight: '900',
                        marginLeft: '2px'
                      }}
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Reset filter button if any filter is active */}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#A0301B',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 'bold',
                textDecoration: 'underline',
                padding: '0 12px',
                height: '34px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      )}

      {/* SECTION 4: MAIN DETAILED TABLE */}
      <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <Table
            loading={loading}
            isEmpty={claims.length === 0}
            emptyMessage="Chưa có dữ liệu khiếu nại nào được nhập."
            headers={tableHeaders}
          >
            {paginatedClaims.map((claim, idx) => (
              <tr 
                key={claim.id} 
                onClick={(e) => {
                  if (e.target.closest('.checkbox-col') || e.target.closest('td:last-child') || e.target.closest('.action-btn') || e.target.closest('.action-menu')) {
                    return;
                  }
                  setActiveDetailClaim(claim);
                  setModalMode('view');
                }}
                className={`claim-row-clickable ${claim.batch_id && claim.batch_id === highlightBatchId ? 'claim-row-highlight' : ''}`}
                style={{
                  position: 'relative',
                  zIndex: actionMenuId === claim.id ? 30 : 1,
                  cursor: 'pointer'
                }}
              >
                {hasWritePermission && (
                  <td className="checkbox-col">
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={selectedClaimIds.includes(claim.id)}
                      onChange={() => handleToggleSelectRow(claim.id)}
                    />
                  </td>
                )}
                <td style={{ fontWeight: '600', color: 'var(--text-gray)' }}>{startIndex + idx + 1}</td>
                <td className="text-left" style={{ fontWeight: '500', color: '#2D1A12' }}>{claim.product_name}</td>
                <td className="code-error">{claim.order_code}</td>
                <td className="code-error">{mapCustomerDefectsToCompany(claim.order_code) || claim.company_error_code || ''}</td>
                <td className="value-penalty">{claim.penalty}</td>
                <td className="value-penalty" style={{ fontWeight: '600', color: '#B91C1C' }}>
                  {formatPenaltyValue(calculateTotalPenalty(claim))}
                </td>
                <td className="code-lpn">{claim.lpn}</td>
                <td className="code-cont">{claim.cont}</td>
                <td>{claim.date}</td>
                <td className="code-ref text-left">{claim.claim_code}</td>
                <td>
                  <span className={`status-badge badge-${claim.status === 'Mới' ? 'new' : claim.status === 'Đang xử lý' ? 'pending' : 'accepted'}`}>
                    {claim.status}
                  </span>
                </td>
                {hasWritePermission && (
                  <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === claim.id ? 40 : 1 }}>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuId(actionMenuId === claim.id ? null : claim.id);
                      }}
                    ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                    {actionMenuId === claim.id && (
                      <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button 
                          className="action-menu-item" 
                          onClick={() => {
                            setActionMenuId(null);
                            setActiveDetailClaim(claim);
                            setModalMode('edit');
                          }}
                        >
                          Xử lý khiếu nại
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </Table>

          {/* SECTION 5: PAGINATION FOOTER */}
          {!loading && claims.length > 0 && paginatedClaims.length > 0 && (
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalFilteredItems}
              onPageChange={(page) => setCurrentPage(page)}
            />
          )}
        </div>
      </div>




      {/* POPUP XỬ LÝ KHIẾU NẠI (Sử dụng FormModal dùng chung) */}
      <FormModal
        isOpen={!!activeDetailClaim}
        onClose={() => setActiveDetailClaim(null)}
        onSubmit={handleSaveProcessClaim}
        title={processModalTitle}
        width="min(95vw, 1150px)"
        cancelLabel="Hủy"
        confirmLabel={modalMode === 'view' ? null : "Lưu lại"}
        leftFooterActions={claimNavFooterActions}
        leftSideAction={claimNavLeftSideAction}
        rightSideAction={claimNavRightSideAction}
        headerActions={
          modalMode === 'view' && (
            <button
              type="button"
              title="Xử lý khiếu nại"
              onClick={() => setModalMode('edit')}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                padding: '4px 6px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          )
        }
      >
        <div className="add-claim-layout-split">
          {/* Left Column: Form Inputs */}
          <div className="add-claim-form-col">
            {/* Row 1: Dòng hàng & Loại claim */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Dòng hàng</label>
                <select
                  value={processDongHang}
                  onChange={(e) => setProcessDongHang(e.target.value)}
                  className="add-claim-select"
                  disabled
                  style={disabledFieldStyle}
                >
                  {['Atlas', 'Oak', 'Maple', 'Pine'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {processDongHang && !['Atlas', 'Oak', 'Maple', 'Pine'].includes(processDongHang) && (
                     <option value={processDongHang}>{processDongHang}</option>
                  )}
                </select>
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Loại claim</label>
                <select
                  value={processLoaiClaim}
                  onChange={(e) => setProcessLoaiClaim(e.target.value)}
                  className="add-claim-select"
                  disabled
                  style={disabledFieldStyle}
                >
                  {['Khách nhắc nhở', 'Đền bù', 'Trả hàng', 'Khác'].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {processLoaiClaim && !['Khách nhắc nhở', 'Đền bù', 'Trả hàng', 'Khác'].includes(processLoaiClaim) && (
                    <option value={processLoaiClaim}>{processLoaiClaim}</option>
                  )}
                </select>
              </div>
            </div>

            {/* Row 2: Mã tham chiếu & Tên mã sản phẩm */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Mã tham chiếu</label>
                <input
                  type="text"
                  placeholder="Cabinet#3"
                  value={processMaThamChieu}
                  onChange={(e) => setProcessMaThamChieu(e.target.value)}
                  className="add-claim-input"
                  disabled
                  style={disabledFieldStyle}
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Tên sản phẩm</label>
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm..."
                  value={processTenSanPham}
                  onChange={(e) => setProcessTenSanPham(e.target.value)}
                  className="add-claim-input"
                  disabled
                  style={disabledFieldStyle}
                />
              </div>
            </div>

            {/* Row 3: Mức phạt + Giá trị phạt & Chọn mã lỗi */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-subgrid-2">
                <div className="add-claim-field" style={{ flex: '1.5' }}>
                  <label className="add-claim-label">Mức phạt</label>
                  <select
                    value={processMucPhat}
                    onChange={(e) => setProcessMucPhat(e.target.value)}
                    className="add-claim-select"
                    disabled
                    style={disabledFieldStyle}
                  >
                    {['Nhắc nhở', 'Phạt tiền', 'Hủy đơn'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                    {processMucPhat && !['Nhắc nhở', 'Phạt tiền', 'Hủy đơn'].includes(processMucPhat) && (
                      <option value={processMucPhat}>{processMucPhat}</option>
                    )}
                  </select>
                </div>
                <div className="add-claim-field" style={{ flex: '1', position: 'relative' }}>
                  <label className="add-claim-label">Giá trị phạt</label>
                  <input
                    type="text"
                    placeholder="$0"
                    value={processGiaTriPhat}
                    onChange={(e) => setProcessGiaTriPhat(e.target.value)}
                    className="add-claim-input"
                    disabled
                    style={disabledFieldStyle}
                  />
                </div>
                <div className="add-claim-field" style={{ flex: '1' }}>
                  <label className="add-claim-label">Tổng phạt</label>
                  <input
                    type="text"
                    value={formatPenaltyValue(getProcessTotalPenaltyPreview())}
                    className="add-claim-input"
                    disabled
                    style={{ ...disabledFieldStyle, backgroundColor: '#F5F5F5', color: '#B91C1C', fontWeight: '600' }}
                  />
                </div>
              </div>
              <div className="add-claim-subgrid-2">
                <div className="add-claim-field" style={{ flex: '1', position: 'relative' }}>
                  <label className="add-claim-label">Mã lỗi KH</label>
                  <input
                    type="text"
                    placeholder="Mã lỗi KH..."
                    value={processMaLoi}
                    onChange={(e) => setProcessMaLoi(e.target.value)}
                    className="add-claim-input"
                    disabled
                    style={disabledFieldStyle}
                  />
                </div>
                <div className="add-claim-field" style={{ flex: '1' }}>
                  <label className="add-claim-label">Mã lỗi G7</label>
                  <input
                    type="text"
                    placeholder="Mã lỗi G7..."
                    value={processMaLoiCty}
                    onChange={(e) => setProcessMaLoiCty(e.target.value)}
                    className="add-claim-input"
                    disabled={modalMode !== 'edit'}
                    style={modalMode !== 'edit' ? disabledFieldStyle : {}}
                  />
                </div>
              </div>
            </div>

            {/* Row 4: LPN & Mã cont & Thời gian Claim */}
            <div className="add-claim-row add-claim-grid-3">
              <div className="add-claim-field">
                <label className="add-claim-label">
                  LPN
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shield-icon" style={{ marginLeft: '4px', verticalAlign: 'middle', color: '#7B5233' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 11l2 2 4-4"></path>
                  </svg>
                </label>
                <input
                  type="text"
                  placeholder="Nhập LPN"
                  value={processLpn}
                  onChange={(e) => setProcessLpn(e.target.value)}
                  className="add-claim-input"
                  disabled
                  style={disabledFieldStyle}
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">
                  Mã cont
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shield-icon" style={{ marginLeft: '4px', verticalAlign: 'middle', color: '#7B5233' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 11l2 2 4-4"></path>
                  </svg>
                </label>
                <input
                  type="text"
                  placeholder="Nhập cont"
                  value={processMaCont}
                  onChange={(e) => setProcessMaCont(e.target.value)}
                  className="add-claim-input"
                  disabled
                  style={disabledFieldStyle}
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Thời gian Claim</label>
                <input
                  type="text"
                  value={processNgayXuat}
                  onChange={(e) => setProcessNgayXuat(e.target.value)}
                  className="add-claim-input"
                  disabled
                  style={disabledFieldStyle}
                  placeholder="MM/YYYY"
                />
              </div>
            </div>

            {/* Row 5: Trạng thái xử lý & Link CAPA */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Trạng thái xử lý</label>
                <div className="add-claim-radio-group">
                  {['Mới', 'Đang xử lý', 'Đã xử lý'].map((statusVal) => (
                    <label key={statusVal} className="add-claim-radio-label" style={{ whiteSpace: 'nowrap', color: modalMode === 'view' ? '#9E9E9E' : '#3E2723', cursor: modalMode === 'view' ? 'not-allowed' : 'pointer' }}>
                      <input
                        type="radio"
                        name="processTrangThaiXuLy"
                        value={statusVal}
                        checked={processTrangThaiXuLy === statusVal}
                        disabled={modalMode === 'view'}
                        onChange={async (e) => {
                          if (modalMode === 'view') return;
                          const newStatus = e.target.value;
                          setProcessTrangThaiXuLy(newStatus);
                          if (activeDetailClaim) {
                            try {
                              await claimService.patchClaimStatus(activeDetailClaim.id, newStatus);
                              setClaims(prev => prev.map(c => c.id === activeDetailClaim.id ? { ...c, status: newStatus } : c));
                              setActiveDetailClaim(prev => prev ? { ...prev, status: newStatus } : prev);
                            } catch (err) {
                              console.error('Lỗi cập nhật trạng thái:', err);
                            }
                          }
                        }}
                        className="add-claim-radio-input"
                      />
                      <span className="custom-radio-circle"></span>
                      {statusVal}
                    </label>
                  ))}
                </div>
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Link CAPA (nếu có)</label>
                <input
                  type="text"
                  placeholder="Ghi chú"
                  value={processLinkCapa}
                  onChange={(e) => setProcessLinkCapa(e.target.value)}
                  className="add-claim-input"
                  disabled
                  style={disabledFieldStyle}
                />
              </div>
            </div>

            {/* Row 6: Ghi chú */}
            <div className="add-claim-row">
              <div className="add-claim-field full-width">
                <label className="add-claim-label">Ghi chú</label>
                <textarea
                  placeholder="Ghi chú"
                  value={processGhiChu}
                  onChange={(e) => setProcessGhiChu(e.target.value)}
                  className="add-claim-textarea"
                  rows="4"
                  disabled={modalMode === 'view'}
                  style={modalMode === 'view' ? disabledFieldStyle : {}}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Claim Images */}
          <div className="add-claim-image-col">
            <div className="filter-section-header" style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1.5px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Ảnh minh chứng ({processImages.length})
              </span>
              {modalMode === 'edit' && (
                <button
                  type="button"
                  onClick={handleProcessAddImageClick}
                  style={{
                    background: '#FAF6F0',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    color: '#7B5233',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                >
                  + Thêm ảnh
                </button>
              )}
            </div>

            <div className="add-claim-image-scrollbox" style={{
              flex: 1,
              overflowY: processImages.length >= 4 ? 'auto' : 'hidden',
              paddingRight: '4px'
            }}>
              <div className="add-claim-image-card-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: processImages.length <= 3 ? '100%' : 'auto'
              }}>
                {processImages.length > 0 ? (
                  processImages.map((path, index) => {
                    const num = processImages.length;
                    const cardStyle = num === 1
                      ? { flex: 1, height: '100%', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                      : num === 2
                        ? { flex: 1, height: 'calc(50% - 6px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                        : num === 3
                          ? { flex: 1, height: 'calc(33.33% - 8px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                          : { height: '180px', flexShrink: 0, position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' };

                    return (
                      <div key={index} className="add-claim-image-card-wrapper" style={cardStyle}>
                        {modalMode === 'edit' && (
                          <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px', zIndex: 10 }}>
                            <button
                              type="button"
                              title="Thay thế ảnh"
                              onClick={() => handleEditProcessImageClick(index)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                border: '1px solid #EADCC9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#7B5233',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button
                              type="button"
                              title="Xóa ảnh"
                              onClick={() => handleDeleteProcessImageClick(index)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                border: '1px solid #FCA5A5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: '#EF4444',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            </button>
                          </div>
                        )}
                        <img
                          src={getFullImagePath(path)}
                          alt={`Defect photo ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                          onClick={() => setPreviewImage(getFullImagePath(path))}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = `<div style="padding: 20px; font-size: 0.8rem; color: #8D6E63; font-weight: bold; text-align: center;">Không tải được ảnh</div>`;
                          }}
                        />

                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(45, 26, 18, 0.7)',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          padding: '6px 8px',
                          textAlign: 'center',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {processImageCaptions[index] || `Ảnh minh chứng ${index + 1}`}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="add-claim-image-card-placeholder" style={{ cursor: 'default', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', border: '1.5px dashed #D1D5DB', borderRadius: '6px', backgroundColor: '#FAF9F8' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                    <span style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '8px', fontWeight: '500' }}>Không có ảnh minh chứng</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      {/* POPUP THÊM MỚI KHIẾU NẠI (Sử dụng FormModal dùng chung) */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSaveNewClaim}
        title="Đăng ký khiếu nại mới"
        width="min(95vw, 1150px)"
        cancelLabel="Hủy"
        confirmLabel="Lưu"
      >
        <div className="add-claim-layout-split">
          {/* Left Column: Form Inputs */}
          <div className="add-claim-form-col">
            {/* Row 1: Dòng hàng & Loại claim */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Dòng hàng</label>
                <select
                  value={addDongHang}
                  onChange={(e) => setAddDongHang(e.target.value)}
                  className="add-claim-select"
                >
                  <option value="Atlas">Atlas</option>
                  <option value="Oak">Oak</option>
                  <option value="Maple">Maple</option>
                  <option value="Pine">Pine</option>
                </select>
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Loại claim</label>
                <select
                  value={addLoaiClaim}
                  onChange={(e) => setAddLoaiClaim(e.target.value)}
                  className="add-claim-select"
                >
                  <option value="Khách nhắc nhở">Khách nhắc nhở</option>
                  <option value="Đền bù">Đền bù</option>
                  <option value="Trả hàng">Trả hàng</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            {/* Row 2: Mã tham chiếu & Tên mã sản phẩm */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Mã tham chiếu <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Cabinet#..."
                  value={addMaThamChieu}
                  onChange={(e) => setAddMaThamChieu(e.target.value)}
                  className="add-claim-input"
                  required
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Tên sản phẩm <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span></label>
                <input
                  type="text"
                  placeholder="Nhập tên sản phẩm..."
                  value={addTenSanPham}
                  onChange={(e) => setAddTenSanPham(e.target.value)}
                  className="add-claim-input"
                  required
                />
              </div>
            </div>

            {/* Row 3: Mức phạt + Giá trị phạt & Chọn mã lỗi */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-subgrid-2">
                <div className="add-claim-field" style={{ flex: '1.5' }}>
                  <label className="add-claim-label">Mức phạt</label>
                  <select
                    value={addMucPhat}
                    onChange={(e) => setAddMucPhat(e.target.value)}
                    className="add-claim-select"
                  >
                    <option value="Nhắc nhở">Nhắc nhở</option>
                    <option value="Phạt tiền">Phạt tiền</option>
                    <option value="Hủy đơn">Hủy đơn</option>
                  </select>
                </div>
                <div className="add-claim-field" style={{ flex: '1', position: 'relative' }}>
                  <label className="add-claim-label">Giá trị phạt</label>
                  <input
                    type="text"
                    placeholder="$0"
                    value={addGiaTriPhat}
                    onChange={(e) => setAddGiaTriPhat(e.target.value)}
                    className="add-claim-input"
                    onFocus={() => setShowAddSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddSuggestions(false), 200)}
                  />
                </div>
                <div className="add-claim-field" style={{ flex: '1' }}>
                  <label className="add-claim-label">Tổng phạt</label>
                  <input
                    type="text"
                    value={formatPenaltyValue(getAddTotalPenaltyPreview())}
                    className="add-claim-input"
                    disabled
                    style={{ ...disabledFieldStyle, color: '#B91C1C', fontWeight: '600' }}
                  />
                  {showAddSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniquePenaltyOptions
                        .filter(opt => !addGiaTriPhat || opt.toLowerCase().includes(addGiaTriPhat.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setAddGiaTriPhat(opt);
                              setShowAddSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="add-claim-subgrid-2">
                <div className="add-claim-field" style={{ flex: '1', position: 'relative' }}>
                  <label className="add-claim-label">Mã lỗi KH</label>
                  <input
                    type="text"
                    placeholder="Mã lỗi..."
                    value={addMaLoi}
                    onChange={(e) => setAddMaLoi(e.target.value)}
                    className="add-claim-input"
                    onFocus={() => setShowAddDefectSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowAddDefectSuggestions(false), 200)}
                  />
                  {showAddDefectSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {(defectCatalog.map(d => d.defect_code).filter(Boolean).length > 0 
                        ? defectCatalog.map(d => d.defect_code).filter(Boolean) 
                        : ['DVA_08', 'DVA_11', 'DVA_14', 'DVA_01', 'DVA_05', 'DVA_06', 'DVA_12', 'DVA_15'])
                        .filter(opt => !addMaLoi || opt.toLowerCase().includes(addMaLoi.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setAddMaLoi(opt);
                              setShowAddDefectSuggestions(false);
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="add-claim-field" style={{ flex: '1' }}>
                  <label className="add-claim-label">Mã lỗi G7</label>
                  <input
                    type="text"
                    placeholder="Mã lỗi G7..."
                    value={addMaLoiCty}
                    onChange={(e) => setAddMaLoiCty(e.target.value)}
                    className="add-claim-input"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: LPN & Mã cont & Thời gian Claim */}
            <div className="add-claim-row add-claim-grid-3">
              <div className="add-claim-field">
                <label className="add-claim-label">
                  LPN
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shield-icon" style={{ marginLeft: '4px', verticalAlign: 'middle', color: '#7B5233' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 11l2 2 4-4"></path>
                  </svg>
                </label>
                <input
                  type="text"
                  placeholder="Nhập LPN"
                  value={addLpn}
                  onChange={(e) => setAddLpn(e.target.value)}
                  className="add-claim-input"
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">
                  Mã cont
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shield-icon" style={{ marginLeft: '4px', verticalAlign: 'middle', color: '#7B5233' }}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <path d="M9 11l2 2 4-4"></path>
                  </svg>
                </label>
                <input
                  type="text"
                  placeholder="Nhập cont"
                  value={addMaCont}
                  onChange={(e) => setAddMaCont(e.target.value)}
                  className="add-claim-input"
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Thời gian Claim <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span></label>
                <input
                  type="date"
                  value={addNgayXuat}
                  onChange={(e) => setAddNgayXuat(e.target.value)}
                  className="add-claim-input"
                  required
                />
              </div>
            </div>

            {/* Row 5: Trạng thái xử lý & Link CAPA */}
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Trạng thái xử lý</label>
                <div className="add-claim-radio-group">
                  {['Mới', 'Đang xử lý', 'Đã xử lý'].map((statusVal) => (
                    <label key={statusVal} className="add-claim-radio-label" style={{ whiteSpace: 'nowrap' }}>
                      <input
                        type="radio"
                        name="addTrangThaiXuLy"
                        value={statusVal}
                        checked={addTrangThaiXuLy === statusVal}
                        onChange={(e) => setAddTrangThaiXuLy(e.target.value)}
                        className="add-claim-radio-input"
                      />
                      <span className="custom-radio-circle"></span>
                      {statusVal}
                    </label>
                  ))}
                </div>
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Link CAPA (nếu có)</label>
                <input
                  type="text"
                  placeholder="Ghi chú"
                  value={addLinkCapa}
                  onChange={(e) => setAddLinkCapa(e.target.value)}
                  className="add-claim-input"
                />
              </div>
            </div>

            {/* Row 6: Ghi chú */}
            <div className="add-claim-row">
              <div className="add-claim-field full-width">
                <label className="add-claim-label">Ghi chú</label>
                <textarea
                  placeholder="Ghi chú"
                  value={addGhiChu}
                  onChange={(e) => setAddGhiChu(e.target.value)}
                  className="add-claim-textarea"
                  rows="4"
                />
              </div>
            </div>

            {addModalError && (
              <div style={{
                color: '#DC2626',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                marginTop: '12px',
                backgroundColor: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                padding: '8px 16px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{addModalError}</span>
              </div>
            )}
          </div>

          {/* Right Column: Claim Images */}
          <div className="add-claim-image-col">
            <div className="filter-section-header" style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1.5px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Ảnh minh chứng <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span> ({addImages.length})
              </span>
              <button
                type="button"
                onClick={handleAddImageClick}
                style={{
                  background: '#FAF6F0',
                  border: '1px solid #EADCC9',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 'bold',
                  color: '#7B5233',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                + Thêm ảnh
              </button>
            </div>

            <div className="add-claim-image-scrollbox" style={{
              flex: 1,
              overflowY: addImages.length >= 4 ? 'auto' : 'hidden',
              paddingRight: '4px'
            }}>
              <div className="add-claim-image-card-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: addImages.length <= 3 ? '100%' : 'auto'
              }}>
                {addImages.length > 0 ? (
                  addImages.map((path, index) => {
                    const num = addImages.length;
                    const cardStyle = num === 1
                      ? { flex: 1, height: '100%', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                      : num === 2
                        ? { flex: 1, height: 'calc(50% - 6px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                        : num === 3
                          ? { flex: 1, height: 'calc(33.33% - 8px)', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' }
                          : { height: '180px', flexShrink: 0, position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid #E5E7EB', backgroundColor: '#F2F0F0' };

                    return (
                      <div key={index} className="add-claim-image-card-wrapper" style={cardStyle}>
                        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px', zIndex: 10 }}>
                          <button
                            type="button"
                            title="Thay thế ảnh"
                            onClick={() => handleEditAddImageClick(index)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #EADCC9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#7B5233',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                          </button>
                          <button
                            type="button"
                            title="Xóa ảnh"
                            onClick={() => handleDeleteAddImageClick(index)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid #FCA5A5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#EF4444',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        </div>

                        <img
                          src={getFullImagePath(path)}
                          alt={`Defect photo ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }}
                          onClick={() => setPreviewImage(getFullImagePath(path))}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = `<div style="padding: 20px; font-size: 0.8rem; color: #8D6E63; font-weight: bold; text-align: center;">Không tải được ảnh</div>`;
                          }}
                        />

                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(45, 26, 18, 0.7)',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          padding: '6px 8px',
                          textAlign: 'center',
                          fontWeight: '500',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {addImageCaptions[index] || `Ảnh minh chứng ${index + 1}`}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="add-claim-image-card-placeholder" onClick={handleAddImageClick}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      {/* FULL-SIZE IMAGE PREVIEW DIALOG */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            cursor: zoomScale > 1 ? (isZoomDragging ? 'grabbing' : 'grab') : 'zoom-out',
            animation: 'fadeIn 0.2s ease',
            userSelect: 'none'
          }}
          onClick={() => setPreviewImage(null)}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const zoomFactor = 0.15;
            let newScale = zoomScale;
            if (e.deltaY < 0) {
              // Zoom in
              newScale = Math.min(zoomScale + zoomFactor, 5);
            } else {
              // Zoom out
              newScale = Math.max(zoomScale - zoomFactor, 1);
            }
            if (newScale === 1) {
              setZoomPosition({ x: 0, y: 0 });
            }
            setZoomScale(newScale);
          }}
        >
          {/* ZOOMABLE IMAGE */}
          <img
            src={previewImage}
            alt="Zoomed preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              objectFit: 'contain',
              transform: `translate(${zoomPosition.x}px, ${zoomPosition.y}px) scale(${zoomScale})`,
              cursor: zoomScale > 1 ? (isZoomDragging ? 'grabbing' : 'grab') : 'zoom-in',
              transition: isZoomDragging ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)',
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => {
              if (zoomScale <= 1) return;
              e.preventDefault();
              setIsZoomDragging(true);
              setZoomDragStart({
                x: e.clientX - zoomPosition.x,
                y: e.clientY - zoomPosition.y
              });
            }}
            onMouseMove={(e) => {
              if (!isZoomDragging) return;
              e.preventDefault();
              setZoomPosition({
                x: e.clientX - zoomDragStart.x,
                y: e.clientY - zoomDragStart.y
              });
            }}
            onMouseUp={() => setIsZoomDragging(false)}
            onMouseLeave={() => setIsZoomDragging(false)}
            onClick={(e) => e.stopPropagation()}
          />

          {/* FLOATING CONTROL BAR */}
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '16px',
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              padding: '10px 24px',
              borderRadius: '30px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              zIndex: 2100,
              alignItems: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* THU NHỎ (ZOOM OUT) */}
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
                outline: 'none'
              }}
              onClick={() => {
                const newScale = Math.max(zoomScale - 0.25, 1);
                if (newScale === 1) setZoomPosition({ x: 0, y: 0 });
                setZoomScale(newScale);
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Thu nhỏ"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>

            {/* PHẦN TRĂM ZOOM */}
            <span style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: '800', minWidth: '56px', textAlign: 'center', userSelect: 'none', fontFamily: 'monospace' }}>
              {Math.round(zoomScale * 100)}%
            </span>

            {/* PHÓNG TO (ZOOM IN) */}
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
                outline: 'none'
              }}
              onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 5))}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Phóng to"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
            </button>

            {/* ĐẶT LẠI (RESET) */}
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'background-color 0.2s',
                outline: 'none'
              }}
              onClick={() => {
                setZoomScale(1);
                setZoomPosition({ x: 0, y: 0 });
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Đặt lại kích thước"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M23 4v6h-6"></path>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
            </button>

            {/* PHÂN CÁCH (SEPARATOR) */}
            <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.25)' }}></div>

            {/* ĐÓNG (CLOSE) */}
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: '#FFFFFF',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onClick={() => setPreviewImage(null)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.85)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Đóng (Esc)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* POPUP THƯ MỤC PDF */}
      {isPdfFolderModalOpen && (
        <div className="add-claim-backdrop" style={{ zIndex: 1998 }} onClick={() => setIsPdfFolderModalOpen(false)}>
          <div className="form-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="add-claim-modal" style={{ width: 'min(95vw, 850px)', display: 'flex', flexDirection: 'column', height: '80vh', border: '1px solid #EADCC9', borderRadius: '12px', boxShadow: '0 20px 50px rgba(123, 82, 51, 0.15)', overflow: 'hidden' }}>
              
              {/* Header */}
              <div className="add-claim-header" style={{ padding: '16px 24px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FFFDFB' }}>
                <h2 className="add-claim-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B5233', margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: '#7B5233' }}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Thư mục PDF đã nhập ({importedPdfs.length})
                </h2>
                <button
                  type="button"
                  className="add-claim-icon-btn"
                  title="Đóng"
                  onClick={() => setIsPdfFolderModalOpen(false)}
                  style={{ fontSize: '1.6rem', padding: '0 6px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                >
                  &times;
                </button>
              </div>

              {/* Sub-header with Search */}
              <div style={{ padding: '12px 24px', backgroundColor: '#FAF6F0', borderBottom: '1px solid #F0E6D8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="search-wrapper" style={{ margin: 0, width: '320px', height: '32px', position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} className="search-icon" style={{ position: 'absolute', left: '10px', color: '#A1887F' }} />
                  <input
                    type="text"
                    placeholder="Tìm nhanh tên file PDF..."
                    value={pdfSearchQuery}
                    onChange={(e) => setPdfSearchQuery(e.target.value)}
                    style={{ fontSize: '0.82rem', width: '100%', height: '100%', padding: '0 12px 0 32px', border: '1px solid #EADCC9', borderRadius: '6px', outline: 'none', backgroundColor: '#FFFFFF' }}
                  />
                </div>
              </div>

              {/* Body (Table List) */}
              <div className="add-claim-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', backgroundColor: '#FFFFFF' }}>
                {importedPdfs.filter(pdf => pdf.original_name.toLowerCase().includes(pdfSearchQuery.toLowerCase())).length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8D6E63', gap: '12px' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Chưa có file PDF nào được lưu trữ hoặc tìm thấy.</span>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #EADCC9', color: '#7B5233', fontWeight: 'bold', textAlign: 'left' }}>
                        <th style={{ padding: '10px 8px' }}>Tên file gốc</th>
                        <th style={{ padding: '10px 8px', width: '120px' }}>Dung lượng</th>
                        <th style={{ padding: '10px 8px', width: '160px' }}>Thời gian import</th>
                        <th style={{ padding: '10px 8px', width: '80px', textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importedPdfs
                        .filter(pdf => pdf.original_name.toLowerCase().includes(pdfSearchQuery.toLowerCase()))
                        .map((pdf) => (
                          <tr 
                            key={pdf.filename} 
                            style={{ borderBottom: '1px solid #F0E6D8', color: '#2D1A12', transition: 'background-color 0.15s', cursor: 'pointer' }} 
                            className="table-row-hover"
                            onClick={(e) => {
                              if (e.target.closest('.pdf-action-menu-container') || e.target.closest('.action-menu')) {
                                return;
                              }
                              setSelectedPdfForPreview(pdf);
                            }}
                          >
                            <td style={{ padding: '12px 8px', fontWeight: '500', wordBreak: 'break-all' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedPdfForPreview(pdf)}
                                style={{
                                  border: 'none',
                                  background: 'none',
                                  padding: 0,
                                  margin: 0,
                                  color: '#7B5233',
                                  fontWeight: '600',
                                  textDecoration: 'none',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  transition: 'color 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#A0301B';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#7B5233';
                                }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                  <polyline points="14 2 14 8 20 8"></polyline>
                                </svg>
                                {pdf.original_name.replace(/_/g, ' ')}
                              </button>
                            </td>
                            <td style={{ padding: '12px 8px', color: '#5D4037' }}>
                              {pdf.size ? (pdf.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
                            </td>
                            <td style={{ padding: '12px 8px', color: '#5D4037' }}>
                              {pdf.created_at}
                            </td>
                            <td style={{ padding: '12px 8px', textAlign: 'center', position: 'relative' }} className="pdf-action-menu-container">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPdfActionMenuId(pdfActionMenuId === pdf.filename ? null : pdf.filename);
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: '#7B5233',
                                  padding: '4px 8px',
                                  borderRadius: '4px'
                                }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <circle cx="12" cy="5" r="2"/>
                                  <circle cx="12" cy="12" r="2"/>
                                  <circle cx="12" cy="19" r="2"/>
                                </svg>
                              </button>
                              {pdfActionMenuId === pdf.filename && (
                                <div
                                  className="action-menu"
                                  style={{
                                    right: '100%',
                                    top: '0',
                                    transform: 'translateX(-4px)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    zIndex: 1500,
                                    position: 'absolute',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #EADCC9',
                                    borderRadius: '6px',
                                    boxShadow: '0 4px 12px rgba(123, 82, 51, 0.15)',
                                    padding: '4px 0',
                                    minWidth: '120px'
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="action-menu-item"
                                    onClick={() => {
                                      setPdfActionMenuId(null);
                                      setSelectedPdfForPreview(pdf);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.8rem', border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#2D1A12', fontWeight: '500' }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                      <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    Xem trước
                                  </button>
                                  <a
                                    href={getFullPdfUrl(pdf.url)}
                                    download={pdf.original_name}
                                    onClick={() => setPdfActionMenuId(null)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.8rem', textDecoration: 'none', color: '#2D1A12', fontWeight: '500' }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                      <polyline points="7 10 12 15 17 10"></polyline>
                                      <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    Tải về
                                  </a>
                                  {hasWritePermission && (
                                    <button
                                      type="button"
                                      className="action-menu-item"
                                      onClick={() => handleDeletePdf(pdf.filename)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.8rem', border: 'none', background: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', color: '#DC2626', fontWeight: '500' }}
                                    >
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                      </svg>
                                      Xóa file
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="add-claim-actions-row" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#FFFDFB', margin: 0 }}>
                <button type="button" className="add-claim-btn-cancel" onClick={() => setIsPdfFolderModalOpen(false)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XEM TRƯỚC PDF */}
      {selectedPdfForPreview && (
        <div className="add-claim-backdrop" style={{ zIndex: 1999 }} onClick={() => setSelectedPdfForPreview(null)}>
          <div className="form-modal-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="add-claim-modal" style={{ width: 'min(95vw, 1000px)', display: 'flex', flexDirection: 'column', height: '90vh', border: '1px solid #EADCC9', borderRadius: '12px', boxShadow: '0 20px 50px rgba(123, 82, 51, 0.15)', overflow: 'hidden' }}>
              
              {/* Header */}
              <div className="add-claim-header" style={{ padding: '16px 24px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FFFDFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="add-claim-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7B5233', fontSize: '1.1rem', fontWeight: 'bold', margin: 0, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                  </svg>
                  Xem trước: {selectedPdfForPreview.original_name.replace(/_/g, ' ')}
                </h2>
                
                {/* Header Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <a
                    href={getFullPdfUrl(selectedPdfForPreview.url)}
                    download={selectedPdfForPreview.original_name}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#7B5233',
                      color: '#FFFFFF',
                      fontSize: '0.78rem',
                      fontWeight: 'bold',
                      textDecoration: 'none',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Tải về máy
                  </a>
                  <button
                    type="button"
                    className="add-claim-icon-btn"
                    title="Đóng"
                    onClick={() => setSelectedPdfForPreview(null)}
                    style={{ fontSize: '1.6rem', padding: '0 6px', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Body (Iframe view) */}
              <div className="add-claim-body" style={{ flex: 1, padding: 0, backgroundColor: '#525659', display: 'flex', flexDirection: 'column' }}>
                <iframe
                  src={getFullPdfUrl(selectedPdfForPreview.url)}
                  title="PDF Preview"
                  width="100%"
                  height="100%"
                  style={{ border: 'none', flex: 1 }}
                />
              </div>

              {/* Footer */}
              <div className="add-claim-actions-row" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#FFFDFB', margin: 0 }}>
                <button type="button" className="add-claim-btn-cancel" onClick={() => setSelectedPdfForPreview(null)}>
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input for Add Modal Image Uploading */}
      <input
        type="file"
        ref={addImageInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleAddImageFileChange}
      />

      {/* Hidden File Input for Process/Edit Modal Image Uploading */}
      <input
        type="file"
        ref={editImageInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleProcessImageFileChange}
      />

      {/* LOCAL ALERTS/NOTIFICATIONS POPUP */}
      <AlertModal
        isOpen={!!localNotification}
        onClose={() => setLocalNotification(null)}
        title={localNotification?.title || ''}
        message={localNotification?.message || ''}
        type={localNotification?.type || 'info'}
        width={localNotification?.title === 'Kết quả xóa' || localNotification?.title === 'Xóa thành công' ? 'min(90vw, 680px)' : '420px'}
      />

      {/* DELETE CONFIRMATION MODAL */}
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
                <div 
                  style={{ 
                    marginTop: '10px', 
                    padding: '12px 16px', 
                    backgroundColor: '#FAF6F0', 
                    borderRadius: '8px', 
                    border: '1px solid #EADCC9',
                    fontSize: '0.82rem',
                    color: '#2D1A12',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: '1px dashed #EADCC9', paddingBottom: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Mã tham chiếu:</span>
                    <span style={{ fontWeight: '600', color: '#A0301B', wordBreak: 'break-all' }}>{item.claim_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: '1px dashed #EADCC9', paddingBottom: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Mã lỗi KH:</span>
                    <span style={{ color: '#2D1A12', wordBreak: 'break-all' }}>{item.order_code || item.defect_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: '1px dashed #EADCC9', paddingBottom: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Mã lỗi G7:</span>
                    <span style={{ color: '#2D1A12', wordBreak: 'break-all' }}>{item.company_error_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: '1px dashed #EADCC9', paddingBottom: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>LPN:</span>
                    <span style={{ color: '#475569', fontFamily: 'monospace', wordBreak: 'break-all' }}>{item.lpn || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: item.penalty || item.date || item.status || item.claim_description ? '1px dashed #EADCC9' : 'none', paddingBottom: item.penalty || item.date || item.status || item.claim_description ? '6px' : '0' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Container:</span>
                    <span style={{ color: '#475569', wordBreak: 'break-all' }}>{item.cont || 'N/A'}</span>
                  </div>
                  {item.penalty && (
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: item.date || item.status || item.claim_description ? '1px dashed #EADCC9' : 'none', paddingBottom: item.date || item.status || item.claim_description ? '6px' : '0' }}>
                      <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Mức phạt:</span>
                      <span style={{ color: '#2D1A12', fontWeight: '500' }}>{item.penalty}</span>
                    </div>
                  )}
                  {item.date && (
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: item.status || item.claim_description ? '1px dashed #EADCC9' : 'none', paddingBottom: item.status || item.claim_description ? '6px' : '0' }}>
                      <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Thời gian:</span>
                      <span style={{ color: '#2D1A12' }}>{item.date}</span>
                    </div>
                  )}
                  {item.status && (
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: item.claim_description ? '1px dashed #EADCC9' : 'none', paddingBottom: item.claim_description ? '6px' : '0' }}>
                      <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Trạng thái:</span>
                      <span style={{ color: '#2D1A12' }}>{item.status}</span>
                    </div>
                  )}
                  {item.claim_description && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Mô tả khiếu nại:</span>
                      <span style={{ color: '#2D1A12', fontStyle: 'italic', wordBreak: 'break-word' }}>{item.claim_description}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        }}
      />

      {/* ============ MONTHLY TRENDS ANALYTICS MODAL ============ */}
      {isAnalyticsOpen && (
        <div
          className="exception-modal-backdrop"
          style={{ zIndex: 2500 }}
          onClick={() => setIsAnalyticsOpen(false)}
        >
          <div
            className="exception-modal"
            style={{ width: 'min(95vw, 1024px)', animation: 'modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="exception-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '14px', borderBottom: '1px solid #F0E6D8' }}>
              <div className="exception-modal-title-area" style={{ flex: 1, paddingRight: '16px' }}>
                <h3 className="exception-modal-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Thống kê khiếu nại theo tháng
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* VIEW SWITCH TAB CONTROLLER */}
                <div style={{ 
                  display: 'inline-flex', 
                  backgroundColor: '#FAF6F0', 
                  padding: '3px', 
                  borderRadius: '8px', 
                  border: '1px solid #EADCC9' 
                }}>
                  <button
                    type="button"
                    onClick={() => setAnalyticsViewTab('chart')}
                    style={{
                      padding: '5px 16px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: analyticsViewTab === 'chart' ? '#7B5233' : 'transparent',
                      color: analyticsViewTab === 'chart' ? '#FFFFFF' : '#7B5233',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    Biểu đồ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalyticsViewTab('table')}
                    style={{
                      padding: '5px 16px',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      border: 'none',
                      backgroundColor: analyticsViewTab === 'table' ? '#7B5233' : 'transparent',
                      color: analyticsViewTab === 'table' ? '#FFFFFF' : '#7B5233',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    Bảng số liệu
                  </button>
                </div>
                <button
                  className="exception-modal-close"
                  onClick={() => setIsAnalyticsOpen(false)}
                  aria-label="Đóng"
                  style={{ position: 'relative', top: 'auto', right: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0 }}
                >
                  &times;
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="exception-modal-body" style={{ padding: '20px 24px', overflowY: 'auto' }}>
              {analyticsData.length === 0 ? (
                <div className="exception-empty-state">
                  <span>Không có dữ liệu khiếu nại để thống kê</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* CHART VIEW */}
                  {analyticsViewTab === 'chart' && (
                    <div style={{ 
                      border: '1px solid #F0E6D8', 
                      borderRadius: '12px', 
                      padding: '24px 20px 16px 20px', 
                      backgroundColor: '#FCFAF8',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
                        <h4 style={{ margin: 0, color: '#7B5233', fontSize: '0.95rem', fontWeight: 'bold' }}>
                          Biểu đồ xu hướng (Tối đa 12 tháng gần nhất)
                        </h4>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#8FA5B5', borderRadius: '3px' }}></div>
                            <span style={{ color: '#4B5563', fontWeight: '500' }}>Số lượng khiếu nại (vụ)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#8B6D58', borderRadius: '3px' }}></div>
                            <span style={{ color: '#4B5563', fontWeight: '500' }}>Tổng tiền phạt G7 ($)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '12px', height: '12px', backgroundColor: '#C25953', borderRadius: '3px' }}></div>
                            <span style={{ color: '#4B5563', fontWeight: '500' }}>Tổng tiền phạt Khách hàng ($)</span>
                          </div>
                        </div>
                      </div>

                      {/* BARS CONTAINER */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-around', 
                        alignItems: 'flex-end', 
                        height: '200px', 
                        paddingBottom: '8px',
                        borderBottom: '2px solid #EADCC9',
                        position: 'relative',
                        gap: '8px'
                      }}>
                        {analyticsData.map((d) => {
                          const maxAmountVal = Math.max(...analyticsData.map(m => Math.max(m.totalAmount, m.customerAmount)), 1);
                          const maxCountVal = Math.max(...analyticsData.map(m => m.count), 1);
                          
                          const countHeight = (d.count / maxCountVal) * 135;
                          const g7Height = (d.totalAmount / maxAmountVal) * 135;
                          const customerHeight = (d.customerAmount / maxAmountVal) * 135;
                          const formatCompact = (val) => val >= 1000 ? '$' + (val / 1000).toFixed(1).replace('.0', '') + 'k' : '$' + val;

                          return (
                            <div key={d.month} style={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              flex: 1,
                              position: 'relative'
                            }}>
                              {/* Bars group with datalabels */}
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '170px' }}>
                                {/* Count Column Group */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#6B7C8A', whiteSpace: 'nowrap' }}>
                                    {d.count}
                                  </span>
                                  <div 
                                    className="analytics-bar count-bar"
                                    style={{ 
                                      width: '24px', 
                                      height: `${Math.max(countHeight, 4)}px`, 
                                      backgroundColor: '#8FA5B5', 
                                      borderRadius: '2px 2px 0 0',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.opacity = '0.9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                                    title={`Số lượng: ${d.count} vụ`}
                                  >
                                  </div>
                                </div>

                                {/* G7 Amount Column Group */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#6E5241', whiteSpace: 'nowrap' }}>
                                    {formatCompact(d.totalAmount)}
                                  </span>
                                  <div 
                                    className="analytics-bar g7-bar"
                                    style={{ 
                                      width: '24px', 
                                      height: `${Math.max(g7Height, 4)}px`, 
                                      backgroundColor: '#8B6D58', 
                                      borderRadius: '2px 2px 0 0',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.opacity = '0.9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                                    title={`Tổng tiền phạt G7: $${d.totalAmount.toLocaleString()}`}
                                  >
                                  </div>
                                </div>

                                {/* Customer Amount Column Group */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#9C413D', whiteSpace: 'nowrap' }}>
                                    {formatCompact(d.customerAmount)}
                                  </span>
                                  <div 
                                    className="analytics-bar customer-bar"
                                    style={{ 
                                      width: '24px', 
                                      height: `${Math.max(customerHeight, 4)}px`, 
                                      backgroundColor: '#C25953', 
                                      borderRadius: '2px 2px 0 0',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.opacity = '0.9'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.opacity = '1'; }}
                                    title={`Tổng tiền phạt Khách hàng: $${d.customerAmount.toLocaleString()}`}
                                  >
                                  </div>
                                </div>
                              </div>

                              {/* X-axis label */}
                              <span style={{ 
                                marginTop: '8px', 
                                fontSize: '0.8rem', 
                                fontWeight: 'bold', 
                                color: '#5D4037',
                                whiteSpace: 'nowrap'
                              }}>
                                {d.month}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TABLE VIEW */}
                  {analyticsViewTab === 'table' && (
                    <div style={{ overflowX: 'auto', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                      <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.05rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FCFAF8', borderBottom: '1.5px solid #F0E6D8' }}>
                            <th style={{ padding: '14px 18px', textAlign: 'center', color: '#7B5233', fontWeight: '800', fontSize: '1.1rem' }}>Tháng</th>
                            <th style={{ padding: '14px 18px', textAlign: 'center', color: '#7B5233', fontWeight: '800', fontSize: '1.1rem' }}>Số lượng khiếu nại (vụ)</th>
                            <th style={{ padding: '14px 18px', textAlign: 'right', color: '#7B5233', fontWeight: '800', fontSize: '1.1rem' }}>Tổng tiền phạt G7</th>
                            <th style={{ padding: '14px 18px', textAlign: 'right', color: '#7B5233', fontWeight: '800', fontSize: '1.1rem' }}>Tổng tiền phạt Khách hàng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.map((d, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F3EAE0' }}>
                              <td style={{ padding: '14px 18px', textAlign: 'center', fontWeight: '700', color: '#2D1A12', fontSize: '1.1rem' }}>
                                {d.month}
                              </td>
                              <td style={{ padding: '14px 18px', textAlign: 'center', color: '#7B5233', fontWeight: '600', fontSize: '1.05rem' }}>
                                {d.count}
                              </td>
                              <td style={{ padding: '14px 18px', textAlign: 'right', color: '#2D1A12', fontWeight: '700', fontSize: '1.1rem' }}>
                                ${d.totalAmount.toLocaleString()}
                              </td>
                              <td style={{ 
                                padding: '14px 18px', 
                                textAlign: 'right', 
                                fontWeight: '700', 
                                color: (customerPenalties[d.month] || 0) > d.totalAmount ? '#DC2626' : '#2D1A12', 
                                fontSize: '1.1rem' 
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                  <span>
                                    ${(customerPenalties[d.month] !== undefined ? customerPenalties[d.month] : 0).toLocaleString()}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingMonthData(d);
                                      setEditValue(customerPenalties[d.month] !== undefined ? customerPenalties[d.month] : 0);
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      color: '#7B5233',
                                      display: 'flex',
                                      alignItems: 'center',
                                      borderRadius: '4px',
                                      transition: 'background-color 0.2s',
                                      outline: 'none'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FFF8F0'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    title="Chỉnh sửa tiền phạt Khách hàng"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="exception-modal-footer" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-start' }}>
              <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: '500' }}>
                Số liệu tính trên {filteredClaimsToDisplay.length} khiếu nại đang hiển thị
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============ EDIT CUSTOMER PENALTY MODAL ============ */}
      {editingMonthData && (
        <div
          className="filter-modal-backdrop"
          style={{ zIndex: 3000 }}
          onClick={() => setEditingMonthData(null)}
        >
          <div
            className="filter-modal"
            style={{ width: 'min(90vw, 440px)', maxHeight: '85vh', borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="filter-modal-header" style={{ borderBottom: '1px solid #F0E6D8' }}>
              <div className="filter-modal-title-area">
                <h3 className="filter-modal-title" style={{ color: '#7B5233', fontWeight: '800' }}>
                  Cập nhật phạt Khách hàng
                </h3>
              </div>
              <button
                className="filter-modal-close"
                onClick={() => setEditingMonthData(null)}
              >
                &times;
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: '20px 24px', backgroundColor: '#FCFAF8' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* ROW DETAILS (READ ONLY) */}
                <div style={{ 
                  backgroundColor: '#FFFFFF', 
                  border: '1px solid #F0E6D8', 
                  borderRadius: '10px', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.88rem',
                  boxShadow: '0 1px 3px rgba(123, 82, 51, 0.05)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Tháng thống kê:</span>
                    <span style={{ color: '#2D1A12', fontWeight: '800' }}>{editingMonthData.month}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F9F7F5', paddingTop: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Số lượng khiếu nại:</span>
                    <span style={{ color: '#2D1A12', fontWeight: '800' }}>{editingMonthData.count} vụ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F9F7F5', paddingTop: '8px' }}>
                    <span style={{ color: '#8D6E63', fontWeight: '600' }}>Tổng tiền phạt G7:</span>
                    <span style={{ color: '#2D1A12', fontWeight: '800' }}>${editingMonthData.totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                 {/* EDIT INPUT */}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <label style={{ fontSize: '0.85rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>
                       Tổng tiền phạt Khách hàng ($)
                     </label>
                     
                     {/* Upload PDF button */}
                     <div style={{ position: 'relative' }}>
                       <input
                         type="file"
                         accept=".pdf"
                         id="credit-note-pdf-upload"
                         style={{ display: 'none' }}
                         onChange={handleCreditNotePdfChange}
                       />
                       <label
                         htmlFor="credit-note-pdf-upload"
                         style={{
                           display: 'inline-flex',
                           alignItems: 'center',
                           gap: '6px',
                           padding: '5px 10px',
                           borderRadius: '6px',
                           border: '1px dashed #7B5233',
                           backgroundColor: '#FFFFFF',
                           color: '#7B5233',
                           fontSize: '0.75rem',
                           fontWeight: 'bold',
                           cursor: 'pointer',
                           transition: 'all 0.2s ease',
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.backgroundColor = '#FFF8F0';
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.backgroundColor = '#FFFFFF';
                         }}
                       >
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                           <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                           <polyline points="17 8 12 3 7 8"></polyline>
                           <line x1="12" y1="3" x2="12" y2="15"></line>
                         </svg>
                         {isParsingPdf ? 'Đang đọc PDF...' : 'Nhập từ file PDF'}
                       </label>
                     </div>
                   </div>

                   <input
                     type="number"
                     min="0"
                     value={editValue}
                     onChange={(e) => {
                       const val = e.target.value;
                       if (val === '') {
                         setEditValue('');
                         return;
                       }
                       const numericVal = Number(val);
                       if (numericVal >= 0) {
                         setEditValue(val);
                       }
                     }}
                     onKeyDown={(e) => {
                       if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') {
                         e.preventDefault();
                       }
                     }}
                     placeholder="Nhập số tiền phạt của Khách hàng..."
                     style={{
                       height: '40px',
                       width: '100%',
                       backgroundColor: '#FFFFFF',
                       border: '1px solid #EADCC9',
                       borderRadius: '8px',
                       padding: '0 12px',
                       fontSize: '0.9rem',
                       color: '#2D1A12',
                       fontWeight: '700',
                       outline: 'none',
                       boxShadow: 'none',
                       transition: 'all 0.2s ease'
                     }}
                     onFocus={(e) => e.target.select()}
                     autoFocus
                   />
                 </div>

              </div>
            </div>

            {/* MODAL FOOTER */}
            <div className="filter-modal-footer" style={{ borderTop: '1px solid #F0E6D8' }}>
              <button
                type="button"
                className="btn-modal-reset"
                onClick={() => setEditingMonthData(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-modal-apply"
                style={{ backgroundColor: '#7B5233' }}
                onClick={() => {
                  setCustomerPenalties(prev => ({
                    ...prev,
                    [editingMonthData.month]: Number(editValue) || 0
                  }));
                  setEditingMonthData(null);
                  showModal(
                    'Thành công',
                    `Đã lưu Tổng tiền phạt Khách hàng cho tháng ${editingMonthData.month} thành công!`,
                    'success'
                  );
                }}
              >
                Lưu lại
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============ EXCEPTION MODAL ============ */}
      {isExceptionModalOpen && (
        <div
          className="exception-modal-backdrop"
          onClick={() => setIsExceptionModalOpen(false)}
        >
          <div
            className="exception-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="exception-modal-header">
              <div className="exception-modal-title-area">
                <h3 className="exception-modal-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  Danh sách ngoại lệ
                </h3>
                <p className="exception-modal-subtitle">
                  Tổng cộng {exceptionData.totalCount} claim có ngoại lệ cần kiểm tra
                </p>
              </div>
              <button
                className="exception-modal-close"
                onClick={() => setIsExceptionModalOpen(false)}
                title="Đóng"
              >
                &times;
              </button>
            </div>

            {/* TAB BAR */}
            <div className="exception-tabs-bar">
              <button
                type="button"
                className={`exception-tab-btn ${exceptionActiveTab === 'claim' ? 'active' : ''}`}
                onClick={() => setExceptionActiveTab('claim')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
                Thông tin Claim
                {exceptionData.claimInfo.length > 0 && (
                  <span className="exception-tab-count">{exceptionData.claimInfo.length}</span>
                )}
              </button>
              <button
                type="button"
                className={`exception-tab-btn ${exceptionActiveTab === 'transport' ? 'active' : ''}`}
                onClick={() => setExceptionActiveTab('transport')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
                Vận chuyển tham chiếu
                {exceptionData.transport.length > 0 && (
                  <span className="exception-tab-count">{exceptionData.transport.length}</span>
                )}
              </button>
            </div>

            {/* TAB CONTENT */}
            <div className="exception-modal-body" style={{ padding: '0 24px 20px 24px' }}>
              {/* TAB: THÔNG TIN CLAIM */}
              {exceptionActiveTab === 'claim' && (
                <div className="exception-tab-content">
                  {exceptionData.claimInfo.length === 0 ? (
                    <div className="exception-empty-state">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <span>Không có ngoại lệ nào về thông tin claim</span>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', marginTop: '16px', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                      <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FCFAF8', borderBottom: '1.5px solid #F0E6D8' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>Tên tủ</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', color: '#7B5233', fontWeight: '800', fontSize: '1.05rem', width: '180px', whiteSpace: 'nowrap' }}>Thời gian Claim</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '1.05rem', width: '320px', whiteSpace: 'nowrap' }}>Nguyên nhân</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptionData.claimInfo.map((item, idx) => {
                            const expandKey = `claim_${idx}`;
                            const isExpanded = !!expandedExceptionItems[expandKey];
                            const displayName = item.claim.product_name || item.claim.sku || 'N/A';
                            const claimDate = item.claim.date || item.claim.period || 'N/A';
                            const reasonText = item.exceptions.map(ex => ex.label).join(', ');

                            return (
                              <React.Fragment key={expandKey}>
                                <tr
                                  onClick={() => setExpandedExceptionItems(prev => ({ ...prev, [expandKey]: !prev[expandKey] }))}
                                  style={{ cursor: 'pointer', borderBottom: '1px solid #F3EAE0', backgroundColor: isExpanded ? '#FFF5F5' : 'transparent' }}
                                  className="exception-table-row"
                                >
                                  <td style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.95rem' }}>
                                    {idx + 1}. {displayName}
                                  </td>
                                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#5D4037', fontWeight: '600', fontSize: '0.95rem' }}>
                                    {claimDate}
                                  </td>
                                  <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                                    <span className="exception-severity-badge" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                                      {reasonText}
                                    </span>
                                  </td>
                                </tr>
                                 {isExpanded && (
                                   <tr style={{ backgroundColor: '#FCFAF8' }}>
                                     <td colSpan="3" style={{ padding: '16px 24px', borderBottom: '1px solid #F0E6D8' }}>
                                       <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                         {/* Chi tiết bảng */}
                                         <table className="exception-sub-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #FECACA', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                                           <thead>
                                             <tr style={{ backgroundColor: '#FEF2F2', borderBottom: '1.5px solid #FECACA' }}>
                                               <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã tham chiếu</th>
                                               <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã lỗi KH</th>
                                               <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã lỗi G7</th>
                                               <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Giá trị phạt</th>
                                               <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B' }}>Tổng tiền phạt</th>
                                             </tr>
                                           </thead>
                                           <tbody>
                                             <tr>
                                               <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.claim_code || 'N/A'}</td>
                                               <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.order_code || item.claim.defect_code || 'N/A'}</td>
                                               <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.company_error_code || 'N/A'}</td>
                                               <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{normalizePenaltyValue(item.claim.penalty || 'Không có')}</td>
                                               <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontWeight: '700', fontSize: '0.88rem', borderBottom: 'none' }}>{formatPenaltyValue(calculateTotalPenalty(item.claim))}</td>
                                             </tr>
                                           </tbody>
                                         </table>

                                         {/* Mô tả ngoại lệ */}
                                         <div style={{ backgroundColor: '#FFF5F5', border: '1px solid #FEE2E2', borderRadius: '6px', padding: '10px 14px', fontSize: '0.82rem', color: '#991B1B' }}>
                                           <strong style={{ display: 'block', marginBottom: '4px' }}>Chi tiết ngoại lệ phát hiện:</strong>
                                           <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                             {item.exceptions.map((ex, i) => (
                                               <li key={i} style={{ marginBottom: '4px' }}>{ex.detail}</li>
                                             ))}
                                           </ul>
                                         </div>

                                         {/* Khu vực xem ảnh minh chứng đối chiếu */}
                                         <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '4px' }}>
                                           {/* Cột ảnh dòng hiện tại */}
                                           <div style={{ flex: '1', minWidth: '250px' }}>
                                             <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '6px' }}>
                                               🖼️ Ảnh minh chứng (Dòng hiện tại STT {item.claim.stt}):
                                             </span>
                                             {item.claim.image_paths && item.claim.image_paths.length > 0 ? (
                                               <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                 {item.claim.image_paths.map((imgUrl, imgIdx) => (
                                                   <div key={imgIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                     <img
                                                       src={imgUrl}
                                                       alt="Dòng hiện tại"
                                                       style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #EADCC9', cursor: 'zoom-in' }}
                                                       onClick={() => setPreviewImage(imgUrl)}
                                                     />
                                                     <span style={{ fontSize: '0.7rem', color: '#8D6E63', marginTop: '2px' }}>
                                                       {item.claim.image_captions?.[imgIdx] || `Ảnh ${imgIdx + 1}`}
                                                     </span>
                                                   </div>
                                                 ))}
                                               </div>
                                             ) : (
                                               <span style={{ fontSize: '0.8rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh</span>
                                             )}
                                           </div>

                                           {/* Cột ảnh dòng đối ứng bị trùng 100% */}
                                           {item.exceptions.some(ex => ex.type === 'duplicate_claim' && ex.duplicates && ex.duplicates.length > 0) && (
                                             <div style={{ flex: '1', minWidth: '250px', borderLeft: '1.5px dashed #FECACA', paddingLeft: '20px' }}>
                                               {item.exceptions.filter(ex => ex.type === 'duplicate_claim').map((ex, exIdx) => (
                                                 <div key={exIdx}>
                                                   {ex.duplicates.map((dupClaim, dupIdx) => (
                                                     <div key={dupIdx} style={{ marginBottom: '10px' }}>
                                                       <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#DC2626', display: 'block', marginBottom: '6px' }}>
                                                         ⚠️ Ảnh minh chứng (Dòng đối ứng bị trùng STT {dupClaim.stt}):
                                                       </span>
                                                       {dupClaim.image_paths && dupClaim.image_paths.length > 0 ? (
                                                         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                           {dupClaim.image_paths.map((imgUrl, imgIdx) => (
                                                             <div key={imgIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                               <img
                                                                 src={imgUrl}
                                                                 alt="Dòng đối ứng"
                                                                 style={{ width: '120px', height: '90px', objectFit: 'cover', borderRadius: '6px', border: '1.5px solid #FECACA', cursor: 'zoom-in' }}
                                                                 onClick={() => setPreviewImage(imgUrl)}
                                                               />
                                                               <span style={{ fontSize: '0.7rem', color: '#DC2626', marginTop: '2px' }}>
                                                                 {dupClaim.image_captions?.[imgIdx] || `Ảnh ${imgIdx + 1}`}
                                                               </span>
                                                             </div>
                                                           ))}
                                                         </div>
                                                       ) : (
                                                         <span style={{ fontSize: '0.8rem', color: '#9E9E9E', fontStyle: 'italic' }}>Không có hình ảnh</span>
                                                       )}
                                                     </div>
                                                   ))}
                                                 </div>
                                               ))}
                                             </div>
                                           )}
                                         </div>
                                       </div>
                                     </td>
                                   </tr>
                                 )}
                               </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: VẬN CHUYỂN THAM CHIẾU */}
              {exceptionActiveTab === 'transport' && (
                <div className="exception-tab-content">
                  {exceptionData.transport.length === 0 ? (
                    <div className="exception-empty-state">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <span>Không có ngoại lệ nào về vận chuyển</span>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto', marginTop: '16px', border: '1px solid #F0E6D8', borderRadius: '12px' }}>
                      <table className="report-table exception-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#FCFAF8', borderBottom: '1.5px solid #F0E6D8' }}>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '1.05rem', whiteSpace: 'nowrap' }}>Tên tủ</th>
                            <th style={{ padding: '14px 16px', textAlign: 'center', color: '#7B5233', fontWeight: '800', fontSize: '1.05rem', width: '180px', whiteSpace: 'nowrap' }}>Thời gian Claim</th>
                            <th style={{ padding: '14px 16px', textAlign: 'left', color: '#7B5233', fontWeight: '800', fontSize: '1.05rem', width: '320px', whiteSpace: 'nowrap' }}>Nguyên nhân</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exceptionData.transport.map((item, idx) => {
                            const expandKey = `transport_${idx}`;
                            const isExpanded = !!expandedExceptionItems[expandKey];
                            const displayName = item.claim.product_name || item.claim.sku || 'N/A';
                            const claimDate = item.claim.date || item.claim.period || 'N/A';
                            const reasonText = item.exceptions.map(ex => ex.label).join(', ');

                            return (
                              <React.Fragment key={expandKey}>
                                <tr
                                  onClick={() => setExpandedExceptionItems(prev => ({ ...prev, [expandKey]: !prev[expandKey] }))}
                                  style={{ cursor: 'pointer', borderBottom: '1px solid #F3EAE0', backgroundColor: isExpanded ? '#FFF5F5' : 'transparent' }}
                                  className="exception-table-row"
                                >
                                  <td style={{ padding: '14px 16px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.95rem' }}>
                                    {idx + 1}. {displayName}
                                  </td>
                                  <td style={{ padding: '14px 16px', textAlign: 'center', color: '#5D4037', fontWeight: '600', fontSize: '0.95rem' }}>
                                    {claimDate}
                                  </td>
                                  <td style={{ padding: '14px 16px', textAlign: 'left' }}>
                                    <span className="exception-severity-badge" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
                                      {reasonText}
                                    </span>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr style={{ backgroundColor: '#FCFAF8' }}>
                                    <td colSpan="3" style={{ padding: '16px 24px', borderBottom: '1px solid #F0E6D8' }}>
                                      <table className="exception-sub-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #FECACA', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#FEF2F2', borderBottom: '1.5px solid #FECACA' }}>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Mã tham chiếu</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>LPN</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B', borderRight: '1px solid #FECACA' }}>Container</th>
                                            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '800', fontSize: '0.85rem', color: '#991B1B' }}>Thời gian</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          <tr>
                                            <td style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '700', color: '#2D1A12', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.claim_code || 'N/A'}</td>
                                            <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontFamily: 'monospace', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.lpn || 'N/A'}</td>
                                            <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontFamily: 'monospace', fontSize: '0.85rem', borderRight: '1px solid #FECACA', borderBottom: 'none' }}>{item.claim.cont || item.claim.container_no || 'N/A'}</td>
                                            <td style={{ padding: '10px 14px', textAlign: 'left', color: '#2D1A12', fontSize: '0.85rem', borderBottom: 'none' }}>{item.claim.date || item.claim.period || 'N/A'}</td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* MODAL FOOTER */}
            <div className="exception-modal-footer">
              <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                Dữ liệu dựa trên {filteredClaimsToDisplay.length} claim đang hiển thị
              </span>
              <button
                className="btn btn-primary"
                onClick={() => setIsExceptionModalOpen(false)}
                style={{ height: '38px', padding: '0 24px', borderRadius: '8px' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ============ END EXCEPTION MODAL ============ */}
    </div>
  );
};

export default ClaimListView;
