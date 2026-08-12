import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Plus } from 'lucide-react';
import { claimService } from '../../services/claim.service';
import { normalizePenaltyValue, parseDate } from '../../utils/claimHelpers';
import api, { API_ROOT } from '@webShared/Services/api.service';
import '../../styles/claim.css';
import '@styles/components.css';

// Import shared components
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { FilterModal, FormModal, AlertModal } from '../../components/Modal';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { useLocation, useNavigate } from 'react-router-dom';

export const useClaimList = () => {
  const { setCustomTitle, setCustomSubtitle, setHeaderExtra, showModal: contextShowModal } = useOutletContext() || {};
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

  const handleExportExcel = async (type = 'current') => {
    const dataToExport = type === 'all' ? claims : paginatedClaims;
    if (!dataToExport || dataToExport.length === 0) {
      showModal('Thông báo', 'Không có dữ liệu khiếu nại nào để xuất Excel.', 'info');
      return;
    }

    try {
      setIsExporting(true);
      const response = await claimService.exportExcel(dataToExport);
      const blob = new Blob([response.data || response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filenameSuffix = type === 'all' ? 'All' : 'Filtered';
      link.setAttribute('download', `SmartFlow_Claims_${filenameSuffix}_${dateStr}.xlsx`);
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
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [reviewActionMenuId, setReviewActionMenuId] = useState(null);
  const [reviewCurrentPage, setReviewCurrentPage] = useState(1);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [expandedDeleteItems, setExpandedDeleteItems] = useState({});
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [cabinetPrices, setCabinetPrices] = useState([]);

  // Exception modal state
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [expandedExceptionItems, setExpandedExceptionItems] = useState({});
  const [exceptionActiveTab, setExceptionActiveTab] = useState('claim');
  const [exceptionNavMode, setExceptionNavMode] = useState(false); // true when processing claim from exception list
  const [exceptionNavClaims, setExceptionNavClaims] = useState([]); // static copy of exception claims when entering processing flow
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false); // true when under review claims list modal is open

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

  // Fetch Dòng hàng (Categories) dynamically from SQL Server Database (/master-categories/ or /categories)
  const defaultCategoryList = [
    'Dòng hàng APT', 'Dòng hàng ATL', 'Dòng hàng FOL', 'Dòng hàng ADV',
    'Dòng hàng TPH', 'Dòng hàng HOR', 'Dòng hàng EYC', 'Dòng hàng COV',
    'Dòng hàng TIN', 'Dòng hàng BEZ', 'Dòng hàng MBC'
  ];
  const [categoryOptions, setCategoryOptions] = useState(defaultCategoryList);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let res = await api.get('/master-categories/').catch(() => null);
        if (!res || !Array.isArray(res) || res.length === 0) {
          res = await api.get('/categories').catch(() => []);
        }
        const dataList = Array.isArray(res) ? res : (res?.data || []);
        if (dataList.length > 0) {
          const names = dataList.map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
          if (names.length > 0) {
            setCategoryOptions(names);
            setAddDongHang(prev => names.includes(prev) ? prev : names[0]);
            setProcessDongHang(prev => names.includes(prev) ? prev : names[0]);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục dòng hàng cho claims:', err);
      }
    };
    fetchCategories();
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
  const [addDongHang, setAddDongHang] = useState(defaultCategoryList[0] || 'Dòng hàng APT');
  const [addLoaiClaim, setAddLoaiClaim] = useState('Khách nhắc nhở');
  const [addMaThamChieu, setAddMaThamChieu] = useState('');
  const [addTenSanPham, setAddTenSanPham] = useState('');
  const [addMucPhat, setAddMucPhat] = useState('Nhắc nhở');
  const [addGiaTriPhat, setAddGiaTriPhat] = useState('');
  const [addMaLoi, setAddMaLoi] = useState('');
  const [addMaLoiCty, setAddMaLoiCty] = useState('');
  const [addTenLoiG7, setAddTenLoiG7] = useState('');
  const [showAddG7CodeSuggestions, setShowAddG7CodeSuggestions] = useState(false);
  const [showAddG7NameSuggestions, setShowAddG7NameSuggestions] = useState(false);
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
  const [editKpiShowAllTime, setEditKpiShowAllTime] = useState(false);

  const [editStatus, setEditStatus] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCompanyErrorCode, setEditCompanyErrorCode] = useState('');
  const [editCompanyErrorName, setEditCompanyErrorName] = useState('');
  const [showCompanyErrorNameSuggestions, setShowCompanyErrorNameSuggestions] = useState(false);
  const [exceptionActionMenuId, setExceptionActionMenuId] = useState(null);
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

  const uniqueCompanyErrorNameOptions = useMemo(() => {
    const catalogNames = defectCatalog.map(d => d.name).filter(Boolean);
    if (catalogNames.length > 0) return Array.from(new Set(catalogNames));

    // Fallback: map claims manually
    const set = new Set();
    claims.forEach(c => {
      if (!c.order_code) return;
      const tokens = c.order_code.split(/[\\,\\/;]|\s+/).map(t => t.trim().toUpperCase()).filter(Boolean);
      tokens.forEach(token => {
        const match = defectCatalog.find(d =>
          (d.defect_code && d.defect_code.trim().toUpperCase() === token) ||
          (d.defect_code && d.defect_code.trim().toUpperCase().replace('-', '_') === token.replace('-', '_'))
        );
        if (match && match.name) {
          set.add(match.name);
        }
      });
    });
    return Array.from(set).sort();
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
    if (editCompanyErrorName) newFilters.companyErrorName = editCompanyErrorName;
    if (editClaimItem) newFilters.claimItem = editClaimItem;
    if (editDefectCode) newFilters.defectCode = editDefectCode;
    if (editContainer) newFilters.container = editContainer;
    if (editLpn) newFilters.lpn = editLpn;
    if (editPenalty) newFilters.penalty = editPenalty;
    if (editPenaltyTotal) newFilters.penaltyTotal = editPenaltyTotal;
    if (editKpiShowAllTime) newFilters.kpiShowAllTime = editKpiShowAllTime;
    setAppliedFilters(newFilters);
  }, [
    editYear, editMonth, editStartDate, editEndDate,
    editStatus, editSku, editCompanyErrorCode, editCompanyErrorName, editClaimItem,
    editDefectCode, editContainer, editLpn, editPenalty, editPenaltyTotal, editKpiShowAllTime
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
      const targetClaim = selectedClaims.find(c => c.status === 'Mới' || c.status === 'Đang xem xét');
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

    // 2. Nếu không tích dòng nào, tìm dòng đầu tiên là Mới hoặc Đang xem xét
    const targetClaim = filteredClaimsToDisplay.find(c => c.status === 'Mới' || c.status === 'Đang xem xét');
    if (targetClaim) {
      setModalMode('edit');
      setActiveDetailClaim(targetClaim);
    } else {
      showModal('Thông báo', 'Không còn khiếu nại nào ở trạng thái "Mới" hoặc "Đang xem xét" để xử lý.', 'info');
    }
  };

  const handleOpenAddNewClaim = () => {
    setAddDongHang(categoryOptions[0] || 'Dòng hàng APT');
    setAddLoaiClaim('Khách nhắc nhở');
    setAddMaThamChieu('Cabinet #');
    setAddTenSanPham('');
    setAddMucPhat('Nhắc nhở');
    setAddGiaTriPhat('');
    setAddMaLoi('');
    setAddMaLoiCty('');
    setAddTenLoiG7('');
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
    const navList = exceptionNavMode ? exceptionNavClaims : filteredClaimsToDisplay;
    const currentIndex = navList.findIndex(c => c.id === activeDetailClaim.id);
    if (currentIndex > 0) {
      setActiveDetailClaim(navList[currentIndex - 1]);
    }
  };

  const handleNextClaim = () => {
    const navList = exceptionNavMode ? exceptionNavClaims : filteredClaimsToDisplay;
    const currentIndex = navList.findIndex(c => c.id === activeDetailClaim.id);
    if (currentIndex < navList.length - 1) {
      setActiveDetailClaim(navList[currentIndex + 1]);
    }
  };

  const handleStartExceptionProcessing = (targetClaim) => {
    setExceptionActionMenuId(null);
    setExceptionNavMode(true);

    const allExceptionClaims = [
      ...exceptionData.claimInfo.map(item => item.claim),
      ...exceptionData.transport.map(item => item.claim)
    ];
    const seen = new Set();
    const uniqueClaims = allExceptionClaims.filter(c => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

    setExceptionNavClaims(uniqueClaims);
    setActiveDetailClaim(targetClaim);
    setModalMode('edit');
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
  const [processDongHang, setProcessDongHang] = useState(defaultCategoryList[0] || 'Dòng hàng APT');
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
  const [processTenLoiG7, setProcessTenLoiG7] = useState('');
  const [showProcessG7CodeSuggestions, setShowProcessG7CodeSuggestions] = useState(false);
  const [showProcessG7NameSuggestions, setShowProcessG7NameSuggestions] = useState(false);
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

  // Helper to map customer defect codes to G7 defect names
  const mapCustomerDefectsToG7Name = (custDefectString) => {
    if (!custDefectString) return '';
    const tokens = custDefectString.split(/[\\,\/;]|\s+/).map(t => t.trim().toUpperCase()).filter(Boolean);
    const mapped = tokens.map(token => {
      const match = defectCatalog.find(d =>
        (d.defect_code && d.defect_code.trim().toUpperCase() === token) ||
        (d.defect_code && d.defect_code.trim().toUpperCase().replace('-', '_') === token.replace('-', '_'))
      );
      return match ? (match.name || match.g7_defect_name || match.g7_defect_code) : null;
    }).filter(Boolean);

    return mapped.length > 0 ? mapped.join(', ') : '';
  };

  // Sync addMaLoi -> addMaLoiCty & addTenLoiG7
  useEffect(() => {
    setAddMaLoiCty(mapCustomerDefectsToCompany(addMaLoi));
    setAddTenLoiG7(mapCustomerDefectsToG7Name(addMaLoi));
  }, [addMaLoi, defectCatalog]);

  // Sync processMaLoi -> processMaLoiCty & processTenLoiG7
  useEffect(() => {
    setProcessMaLoiCty(mapCustomerDefectsToCompany(processMaLoi));
    setProcessTenLoiG7(mapCustomerDefectsToG7Name(processMaLoi));
  }, [processMaLoi, defectCatalog]);

  const handleSelectG7Code = (code, mode) => {
    const match = defectCatalog.find(d => d.g7_defect_code === code);
    if (mode === 'add') {
      setAddMaLoiCty(code);
      if (match) {
        setAddTenLoiG7(match.name || match.g7_defect_name || '');
        setAddMaLoi(match.defect_code || '');
      }
      setShowAddG7CodeSuggestions(false);
    } else {
      setProcessMaLoiCty(code);
      if (match) {
        setProcessTenLoiG7(match.name || match.g7_defect_name || '');
        setProcessMaLoi(match.defect_code || '');
      }
      setShowProcessG7CodeSuggestions(false);
    }
  };

  const handleSelectG7Name = (name, mode) => {
    const match = defectCatalog.find(d => (d.name === name || d.g7_defect_name === name));
    if (mode === 'add') {
      setAddTenLoiG7(name);
      if (match) {
        setAddMaLoiCty(match.g7_defect_code || '');
        setAddMaLoi(match.defect_code || '');
      }
      setShowAddG7NameSuggestions(false);
    } else {
      setProcessTenLoiG7(name);
      if (match) {
        setProcessMaLoiCty(match.g7_defect_code || '');
        setProcessMaLoi(match.defect_code || '');
      }
      setShowProcessG7NameSuggestions(false);
    }
  };

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
      if (addTrangThaiXuLy === 'Đang xem xét') {
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
        company_error_name: addTenLoiG7,
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
          company_error_name: result.company_error_name || addTenLoiG7,
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
          status: result.status === 'Resolved' ? 'Đã xử lý' : result.status === 'Processing' ? 'Đang xem xét' : 'Mới',
          claim_description: result.description,
          capa_link: addLinkCapa,
          image_paths: addImages,
          image_captions: addImageCaptions,
          customer_name: result.customer_name || addDongHang,
          severity: result.severity || (addMucPhat === 'Hủy đơn' ? 'High' : addMucPhat === 'Phạt tiền' ? 'Medium' : 'Low')
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
                      src={getFullImagePath(imgUrl)}
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
                      onClick={() => setPreviewImage(getFullImagePath(imgUrl))}
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
      if (processTrangThaiXuLy === 'Đang xem xét') {
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
        company_error_name: processTenLoiG7,
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
          company_error_name: result.company_error_name || processTenLoiG7,
          penalty: normalizePenaltyValue(processGiaTriPhat),
          lpn: processLpn,
          cont: processMaCont,
          status: (result.status === 'Resolved' || result.status === 'Đã xử lý') ? 'Đã xử lý' : (result.status === 'Processing' || result.status === 'Đang xem xét') ? 'Đang xem xét' : 'Mới',
          claim_description: result.description,
          capa_link: processLinkCapa,
          image_paths: processImages,
          image_captions: processImageCaptions,
          customer_name: result.customer_name || processDongHang,
          severity: result.severity || (processMucPhat === 'Hủy đơn' ? 'High' : processMucPhat === 'Phạt tiền' ? 'Medium' : 'Low')
        } : c));
        setActiveDetailClaim(null);
        setExceptionNavMode(false);
        setExceptionNavClaims([]);
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
      setProcessDongHang(activeDetailClaim.dong_hang || activeDetailClaim.customer_name || categoryOptions[0] || 'Dòng hàng APT');
      setProcessLoaiClaim(activeDetailClaim.loai_claim || 'Khách nhắc nhở');
      setProcessMaThamChieu(activeDetailClaim.claim_code || '');
      setProcessTenSanPham(activeDetailClaim.product_name || activeDetailClaim.sku || '');
      setProcessMucPhat(activeDetailClaim.muc_phat || 'Nhắc nhở');
      setProcessGiaTriPhat(normalizePenaltyValue(activeDetailClaim.penalty || activeDetailClaim.action || ''));
      setProcessMaLoi(activeDetailClaim.order_code || activeDetailClaim.defect_code || '');
      setProcessMaLoiCty(activeDetailClaim.company_error_code || '');
      setProcessTenLoiG7(activeDetailClaim.company_error_name || mapCustomerDefectsToG7Name(activeDetailClaim.order_code || activeDetailClaim.defect_code) || '');
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
      setProcessTrangThaiXuLy(activeDetailClaim.status === 'Đã xử lý' || activeDetailClaim.status === 'Chấp nhận' ? 'Đã xử lý' : activeDetailClaim.status === 'Đang xem xét' ? 'Đang xem xét' : 'Mới');
      setProcessLinkCapa(activeDetailClaim.capa_link || activeDetailClaim.link_capa || '');
      setProcessGhiChu(activeDetailClaim.claim_description || activeDetailClaim.description || '');
    }
  }, [activeDetailClaim]);

  // Dropdown states & refs
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const pdfInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const excelInputRef = useRef(null);
  const [isExcelImporting, setIsExcelImporting] = useState(false);

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
      if (!event.target.closest('.export-dropdown-container')) {
        setIsExportDropdownOpen(false);
      }
      if (!event.target.closest('.review-action-menu-container')) {
        setReviewActionMenuId(null);
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

  const handleImportExcelClick = () => {
    if (excelInputRef.current) excelInputRef.current.click();
  };

  const handleExcelFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsExcelImporting(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await claimService.importExcel(formData);
      if (res && res.success) {
        showModal('Thành công', `Đã nhập thành công ${res.imported_count} khiếu nại!`, 'success');
        fetchClaims();
      } else {
        showModal('Thất bại', res.message || 'Lỗi khi nhập file Excel', 'error');
      }
    } catch (err) {
      console.error(err);
      showModal('Thất bại', err.message || 'Lỗi hệ thống khi nhập Excel', 'error');
    } finally {
      setIsExcelImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  const handleMarkClaimProcessed = async (claimId) => {
    try {
      const res = await claimService.updateClaimStatus(claimId, 'Resolved');
      if (res) {
        showModal('Thành công', 'Đã đánh dấu khiếu nại là đã xử lý!', 'success');
        fetchClaims();
      }
    } catch (err) {
      console.error(err);
      showModal('Thất bại', err.message || 'Lỗi khi cập nhật trạng thái', 'error');
    }
  };

  const applyFilters = () => {};

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

  useEffect(() => {
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
            stt: r.stt,
            customer_name: r.customer_name || 'N/A',
            severity: r.severity || 'Medium'
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
    setEditKpiShowAllTime(false);

    setEditStatus('');
    setEditSku('');
    setEditCompanyErrorCode('');
    setEditCompanyErrorName('');
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
    else if (key === 'kpiShowAllTime') setEditKpiShowAllTime(false);
    else if (key === 'sku') setEditSku('');
    else if (key === 'companyErrorCode') setEditCompanyErrorCode('');
    else if (key === 'companyErrorName') setEditCompanyErrorName('');
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

      if (appliedFilters.companyErrorName) {
        const mappedName = mapCustomerDefectsToNames(claim.order_code) || claim.company_error_code || '';
        if (!mappedName.toLowerCase().includes(appliedFilters.companyErrorName.toLowerCase())) {
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

  // Review Modal pagination computed values
  const underReviewClaims = claims.filter(c => c.status === 'Đang xem xét');
  const reviewTotalPages = Math.ceil(underReviewClaims.length / 5);
  const safeReviewCurrentPage = Math.min(reviewCurrentPage, reviewTotalPages || 1);
  const reviewStartIndex = (safeReviewCurrentPage - 1) * 5;
  const reviewEndIndex = reviewStartIndex + 5;
  const reviewPaginatedClaims = underReviewClaims.slice(reviewStartIndex, reviewEndIndex);

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

  const totalCountAll = useMemo(() => {
    return analyticsData.reduce((sum, d) => sum + (d.count || 0), 0);
  }, [analyticsData]);

  const totalG7AmountAll = useMemo(() => {
    return analyticsData.reduce((sum, d) => sum + (d.totalAmount || 0), 0);
  }, [analyticsData]);

  const totalCustomerAmountAll = useMemo(() => {
    return analyticsData.reduce((sum, d) => sum + (customerPenalties[d.month] !== undefined ? customerPenalties[d.month] : d.customerAmount || 0), 0);
  }, [analyticsData, customerPenalties]);

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

    filteredClaimsToDisplay.filter(c => c.status === 'Mới').forEach(claim => {
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
    { label: 'Mã tham chiếu', className: 'text-left' },
    { label: 'Tên sản phẩm', className: 'text-left' },
    { label: 'Mã lỗi KH' },
    { label: 'Tên lỗi G7' },
    { label: 'Giá trị phạt' },
    { label: 'Tổng tiền phạt' },
    { label: 'LPN' },
    { label: 'Container' },
    { label: 'Thời gian Claim' },
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
                    <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Tên lỗi G7:</span>
                    <span style={{ color: textColor, wordBreak: 'break-all' }}>{claim.company_error_name || mapCustomerDefectsToG7Name(claim.order_code) || 'N/A'}</span>
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
            backgroundColor: processTrangThaiXuLy === 'Đã xử lý' ? '#ECFDF5' : processTrangThaiXuLy === 'Đang xem xét' ? '#FFFBEB' : '#FAF6F0',
            border: `1.5px solid ${processTrangThaiXuLy === 'Đã xử lý' ? '#A7F3D0' : processTrangThaiXuLy === 'Đang xem xét' ? '#FDE68A' : '#D7CCC8'}`,
            color: processTrangThaiXuLy === 'Đã xử lý' ? '#059669' : processTrangThaiXuLy === 'Đang xem xét' ? '#D97706' : '#8D6E63',
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
  const navList = exceptionNavMode ? exceptionNavClaims : filteredClaimsToDisplay;
  const currentClaimIndex = activeDetailClaim ? navList.findIndex(c => c.id === activeDetailClaim.id) : -1;
  const hasPrevClaim = currentClaimIndex > 0;
  const hasNextClaim = currentClaimIndex !== -1 && currentClaimIndex < navList.length - 1;

  // Count processed exception claims (status is 'Đang xem xét' or 'Đã xử lý')
  const exceptionProcessedCount = useMemo(() => {
    if (!exceptionNavMode) return 0;
    return exceptionNavClaims.filter(navClaim => {
      const currentClaim = claims.find(c => c.id === navClaim.id);
      return currentClaim && (currentClaim.status === 'Đang xem xét' || currentClaim.status === 'Đã xử lý');
    }).length;
  }, [exceptionNavClaims, claims, exceptionNavMode]);

  const claimNavFooterActions = activeDetailClaim && (
    <div className={`modal-footer-nav-group ${exceptionNavMode ? 'force-show' : ''}`} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
      {exceptionNavMode && (
        <span style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#059669' : '#D97706',
          backgroundColor: exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#ECFDF5' : '#FFFBEB',
          border: `1.5px solid ${exceptionProcessedCount === exceptionNavClaims.length && exceptionNavClaims.length > 0 ? '#A7F3D0' : '#FDE68A'}`,
          padding: '3px 10px',
          borderRadius: '12px',
          whiteSpace: 'nowrap'
        }}>
          Đã xử lý ngoại lệ: {exceptionProcessedCount}/{exceptionNavClaims.length}
        </span>
      )}
      <span style={{
        fontSize: '0.85rem',
        fontWeight: '700',
        color: '#5D4037',
        minWidth: '40px',
        textAlign: 'center',
        userSelect: 'none'
      }}>
        {currentClaimIndex !== -1 ? `${currentClaimIndex + 1}/${navList.length}` : '—'}
      </span>
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

  const kpiData = useMemo(() => {
    let targetMonthStr = null;
    let isViewingAll = false;

    if (appliedFilters.kpiShowAllTime) {
      isViewingAll = true;
    } else if (appliedFilters.year && appliedFilters.month) {
      const mNum = getMonthNumber(appliedFilters.month);
      if (mNum) {
        targetMonthStr = `${String(mNum).padStart(2, '0')}-${appliedFilters.year}`;
      } else {
        isViewingAll = true;
      }
    } else if (appliedFilters.year && !appliedFilters.month) {
      isViewingAll = true;
    } else {
      const currentDate = new Date();
      const prevMonthObj = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      targetMonthStr = `${String(prevMonthObj.getMonth() + 1).padStart(2, '0')}-${prevMonthObj.getFullYear()}`;
    }

    let kpiClaims = [];
    let prevMonthClaims = [];
    let prevMonthStr = '';

    if (targetMonthStr) {
      kpiClaims = claims.filter(c => getMonthYear(c) === targetMonthStr);

      const parts = targetMonthStr.split('-');
      const m = Number(parts[0]);
      const y = Number(parts[1]);
      const prevDate = new Date(y, m - 2, 1);
      prevMonthStr = `${String(prevDate.getMonth() + 1).padStart(2, '0')}-${prevDate.getFullYear()}`;

      prevMonthClaims = claims.filter(c => getMonthYear(c) === prevMonthStr);
    } else {
      kpiClaims = filteredClaimsToDisplay;
    }

    const currentCount = kpiClaims.length;
    const currentPenaltySum = kpiClaims.reduce((sum, c) => {
      const val = calculateTotalPenalty(c);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const prevCount = prevMonthClaims.length;
    const prevPenaltySum = prevMonthClaims.reduce((sum, c) => {
      const val = calculateTotalPenalty(c);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);

    const countDiff = currentCount - prevCount;
    const penaltyDiff = currentPenaltySum - prevPenaltySum;

    return {
      targetMonthStr,
      prevMonthStr,
      isViewingAll,
      currentCount,
      currentPenaltySum,
      prevCount,
      prevPenaltySum,
      countDiff,
      penaltyDiff,
    };
  }, [claims, filteredClaimsToDisplay, appliedFilters]);

  return {
    setCustomTitle,
    setCustomSubtitle,
    setHeaderExtra,
    localNotification,
    setLocalNotification,
    loggedInUser,
    loggedInUserIsAdmin,
    hasWritePermission,
    showModal,
    getFullImagePath,
    handleExportExcel,
    claims,
    setClaims,
    loading,
    setLoading,
    isExporting,
    setIsExporting,
    quickSearch,
    setQuickSearch,
    sortOption,
    setSortOption,
    showSortDropdown,
    setShowSortDropdown,
    isFilterBarOpen,
    setIsFilterBarOpen,
    activeDropdown,
    setActiveDropdown,
    editYear,
    setEditYear,
    editMonth,
    setEditMonth,
    editStartDate,
    setEditStartDate,
    editEndDate,
    setEditEndDate,
    editStatus,
    setEditStatus,
    editSku,
    setEditSku,
    editClaimItem,
    setEditClaimItem,
    editDefectCode,
    setEditDefectCode,
    editCompanyErrorCode,
    setEditCompanyErrorCode,
    editContainer,
    setEditContainer,
    editLpn,
    setEditLpn,
    editPenalty,
    setEditPenalty,
    editPenaltyTotal,
    setEditPenaltyTotal,
    appliedFilters,
    setAppliedFilters,
    showSkuSuggestions,
    setShowSkuSuggestions,
    showClaimItemSuggestions,
    setShowClaimItemSuggestions,
    showDefectCodeSuggestions,
    setShowDefectCodeSuggestions,
    showCompanyErrorCodeSuggestions,
    setShowCompanyErrorCodeSuggestions,
    showPenaltySuggestions,
    setShowPenaltySuggestions,
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    pdfInputRef,
    folderInputRef,
    isAddModalOpen,
    setIsAddModalOpen,
    addDongHang,
    setAddDongHang,
    addLoaiClaim,
    setAddLoaiClaim,
    addMaThamChieu,
    setAddMaThamChieu,
    addTenSanPham,
    setAddTenSanPham,
    addMucPhat,
    setAddMucPhat,
    addGiaTriPhat,
    setAddGiaTriPhat,
    addMaLoi,
    setAddMaLoi,
    addMaLoiCty,
    setAddMaLoiCty,
    addTenLoiG7,
    setAddTenLoiG7,
    addLpn,
    setAddLpn,
    addMaCont,
    setAddMaCont,
    addNgayXuat,
    setAddNgayXuat,
    addTrangThaiXuLy,
    setAddTrangThaiXuLy,
    addLinkCapa,
    setAddLinkCapa,
    addGhiChu,
    setAddGhiChu,
    addImages,
    setAddImages,
    addImageCaptions,
    setAddImageCaptions,
    addModalError,
    setAddModalError,
    showAddG7CodeSuggestions,
    setShowAddG7CodeSuggestions,
    showAddG7NameSuggestions,
    setShowAddG7NameSuggestions,
    activeDetailClaim,
    setActiveDetailClaim,
    previewImage,
    setPreviewImage,
    zoomScale,
    setZoomScale,
    zoomPosition,
    setZoomPosition,
    isZoomDragging,
    setIsZoomDragging,
    zoomDragStart,
    setZoomDragStart,
    customerPenalties,
    setCustomerPenalties,
    editingMonthData,
    setEditingMonthData,
    editValue,
    setEditValue,
    isParsingPdf,
    setIsParsingPdf,
    processDongHang,
    setProcessDongHang,
    processLoaiClaim,
    setProcessLoaiClaim,
    processMaThamChieu,
    setProcessMaThamChieu,
    processTenSanPham,
    setProcessTenSanPham,
    processMucPhat,
    setProcessMucPhat,
    processGiaTriPhat,
    setProcessGiaTriPhat,
    processMaLoi,
    setProcessMaLoi,
    processMaLoiCty,
    setProcessMaLoiCty,
    processTenLoiG7,
    setProcessTenLoiG7,
    showProcessG7CodeSuggestions,
    setShowProcessG7CodeSuggestions,
    showProcessG7NameSuggestions,
    setShowProcessG7NameSuggestions,
    processLpn,
    setProcessLpn,
    processMaCont,
    setProcessMaCont,
    disabledFieldStyle,
    processNgayXuat,
    setProcessNgayXuat,
    processTrangThaiXuLy,
    setProcessTrangThaiXuLy,
    processLinkCapa,
    setProcessLinkCapa,
    processGhiChu,
    setProcessGhiChu,
    processImages,
    setProcessImages,
    processImageCaptions,
    setProcessImageCaptions,
    isExceptionModalOpen,
    setIsExceptionModalOpen,
    exceptionData,
    exceptionActiveTab,
    setExceptionActiveTab,
    expandedExceptionItems,
    setExpandedExceptionItems,
    exceptionActionMenuId,
    setExceptionActionMenuId,
    isReviewModalOpen,
    setIsReviewModalOpen,
    underReviewClaims,
    reviewActionMenuId,
    setReviewActionMenuId,
    reviewCurrentPage,
    setReviewCurrentPage,
    isAnalyticsOpen,
    setIsAnalyticsOpen,
    analyticsViewTab,
    setAnalyticsViewTab,
    analyticsData,
    actionMenuId,
    setActionMenuId,
    modalMode,
    setModalMode,
    isPdfFolderModalOpen,
    setIsPdfFolderModalOpen,
    defectCatalog,
    setDefectCatalog,
    showProcessDefectSuggestions,
    setShowProcessDefectSuggestions,
    showAddSuggestions,
    setShowAddSuggestions,
    showAddDefectSuggestions,
    setShowAddDefectSuggestions,
    exceptionNavMode,
    setExceptionNavMode,
    exceptionNavClaims,
    setExceptionNavClaims,
    latestImport,
    setLatestImport,
    highlightBatchId,
    setHighlightBatchId,
    handleToggleSelectAll,
    handleToggleSelectRow,
    handleProcessSelectedClaim,
    handleOpenAddNewClaim,
    handlePrevClaim,
    handleNextClaim,
    handleStartExceptionProcessing,
    handleCreditNotePdfChange,
    handleSelectG7Code,
    handleSelectG7Name,
    handleEditAddImageClick,
    handleAddImageClick,
    handleAddImageFileChange,
    handleDeleteAddImageClick,
    handleEditProcessImageClick,
    handleProcessAddImageClick,
    handleProcessImageFileChange,
    handleDeleteProcessImageClick,
    handleSaveNewClaim,
    handleSaveProcessClaim,
    handleOpenPdfFolderModal,
    handleDeletePdf,
    handlePdfFileChange,
    handleFolderFileChange,
    handleSuccessRefresh,
    handleImportExcelClick,
    handleExcelFileChange,
    handleMarkClaimProcessed,
    applyFilters,
    excelInputRef,
    isExcelImporting,
    getAddTotalPenaltyPreview,
    getProcessTotalPenaltyPreview,
    removeFilterKey,
    clearAllFilters,
    fetchClaims,
    selectedClaimIds,
    setSelectedClaimIds,
    activeFiltersCount,
    filteredClaimsToDisplay,
    totalCountAll,
    totalG7AmountAll,
    totalCustomerAmountAll,
    kpiData,
    totalPages,
    startIndex,
    endIndex,
    totalFilteredItems,
    safeCurrentPage,
    paginatedClaims,
    reviewTotalPages,
    reviewStartIndex,
    reviewPaginatedClaims,
    handleYearChange,
    handleMonthChange,
    handleStartDateChange,
    handleEndDateChange,
    isDateFilterValid,
    editKpiShowAllTime,
    setEditKpiShowAllTime,
    uniqueContainerOptions,
    showContainerSuggestions,
    setShowContainerSuggestions,
    uniqueLpnOptions,
    showLpnSuggestions,
    setShowLpnSuggestions,
    uniqueSkuOptions,
    uniqueClaimItemOptions,
    uniqueDefectCodeOptions,
    uniqueCompanyErrorCodeOptions,
    uniqueCompanyErrorNameOptions,
    uniquePenaltyOptions,
    mapCustomerDefectsToG7Name,
    formatPenaltyValue,
    calculateTotalPenalty,
    tableHeaders,
    processModalTitle,
    claimNavFooterActions,
    claimNavLeftSideAction,
    claimNavRightSideAction,
    categoryOptions,
    setCategoryOptions,
  };
};