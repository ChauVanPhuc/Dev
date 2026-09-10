import { useState, useMemo, useEffect } from 'react';
import { parseDate, normalizePenaltyValue, getMonthYear, getMonthNumber, calculateTotalPenalty, getClaimTimeValue } from '../utils/claimHelpers';

export const useClaimFilter = (claims = []) => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Quick search & sort & status filter
  const [quickSearch, setQuickSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Filter bar & dropdowns
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'time', 'claim', 'transport', 'rows' or null

  // Date filters
  const [editYear, setEditYear] = useState('');
  const [editMonth, setEditMonth] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editKpiShowAllTime, setEditKpiShowAllTime] = useState(false);

  // Field filters
  const [editStatus, setEditStatus] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCompanyErrorCode, setEditCompanyErrorCode] = useState('');
  const [editCompanyErrorName, setEditCompanyErrorName] = useState('');
  const [editClaimItem, setEditClaimItem] = useState('');
  const [editDefectCode, setEditDefectCode] = useState('');
  const [editContainer, setEditContainer] = useState('');
  const [editLpn, setEditLpn] = useState('');
  const [editPenalty, setEditPenalty] = useState('');
  const [editPenaltyTotal, setEditPenaltyTotal] = useState('');

  // Suggestion visibility states
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
  const [showDefectCodeSuggestions, setShowDefectCodeSuggestions] = useState(false);
  const [showCompanyErrorCodeSuggestions, setShowCompanyErrorCodeSuggestions] = useState(false);
  const [showCompanyErrorNameSuggestions, setShowCompanyErrorNameSuggestions] = useState(false);
  const [showClaimItemSuggestions, setShowClaimItemSuggestions] = useState(false);
  const [showContainerSuggestions, setShowContainerSuggestions] = useState(false);
  const [showLpnSuggestions, setShowLpnSuggestions] = useState(false);
  const [showPenaltySuggestions, setShowPenaltySuggestions] = useState(false);
  const [showPenaltyTotalSuggestions, setShowPenaltyTotalSuggestions] = useState(false);

  // Action menu & selection states
  const [actionMenuClaimId, setActionMenuClaimId] = useState(null);
  const [selectedClaimIds, setSelectedClaimIds] = useState([]);

  // Click outside to close action menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuClaimId && !e.target.closest('.action-menu') && !e.target.closest('.action-btn')) {
        setActionMenuClaimId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [actionMenuClaimId]);

  const handleToggleSelectRow = (id) => {
    if (!id) return;
    setSelectedClaimIds(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    });
  };

  const handleToggleSelectAll = (allIds = []) => {
    const ids = Array.isArray(allIds) ? allIds : [];
    setSelectedClaimIds(prev => {
      const current = Array.isArray(prev) ? prev : [];
      if (ids.length > 0 && current.length === ids.length) {
        return [];
      }
      return ids;
    });
  };

  // Applied filters dictionary (flat for simplicity & consistency)
  const [appliedFilters, setAppliedFilters] = useState({});

  // Sync appliedFilters whenever edit states change
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
    if (editClaimItem && editClaimItem !== 'Cabinet#' && editClaimItem !== 'Cabinet #') newFilters.claimItem = editClaimItem;
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

  // Reset page to 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [quickSearch, statusFilter, appliedFilters, sortOption]);

  const syncYearMonthFromDates = (start, end) => {
    if (start && end) {
      const d1 = new Date(start);
      const d2 = new Date(end);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        if (d1.getFullYear() === d2.getFullYear()) {
          setEditYear(String(d1.getFullYear()));
          if (d1.getMonth() === d2.getMonth()) {
            setEditMonth(`Tháng ${d1.getMonth() + 1}`);
          } else {
            setEditMonth('');
          }
          return;
        }
      }
    }
    setEditYear('');
    setEditMonth('');
  };

  const handleYearChange = (year) => {
    setEditYear(year);
    if (!year) {
      setEditMonth('');
      setEditStartDate('');
      setEditEndDate('');
      return;
    }
    const mNum = getMonthNumber(editMonth);
    if (mNum) {
      const start = `${year}-${String(mNum).padStart(2, '0')}-01`;
      const lastDay = new Date(year, mNum, 0).getDate();
      const end = `${year}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setEditStartDate(start);
      setEditEndDate(end);
    } else {
      setEditStartDate(`${year}-01-01`);
      setEditEndDate(`${year}-12-31`);
    }
  };

  const handleMonthChange = (month) => {
    setEditMonth(month);
    if (!month) {
      if (editYear) {
        setEditStartDate(`${editYear}-01-01`);
        setEditEndDate(`${editYear}-12-31`);
      } else {
        setEditStartDate('');
        setEditEndDate('');
      }
      return;
    }
    const mNum = getMonthNumber(month);
    const y = editYear || new Date().getFullYear().toString();
    if (!editYear) setEditYear(y);

    if (mNum) {
      const start = `${y}-${String(mNum).padStart(2, '0')}-01`;
      const lastDay = new Date(y, mNum, 0).getDate();
      const end = `${y}-${String(mNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setEditStartDate(start);
      setEditEndDate(end);
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

  const isDateFilterValid = useMemo(() => {
    if (editStartDate && editEndDate) {
      const d1 = new Date(editStartDate);
      const d2 = new Date(editEndDate);
      return d1 <= d2;
    }
    return true;
  }, [editStartDate, editEndDate]);

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
    setEditClaimItem('');
    setEditDefectCode('');
    setEditContainer('');
    setEditLpn('');
    setEditPenalty('');
    setEditPenaltyTotal('');
    setQuickSearch('');
    setStatusFilter('');
    setSortOption('');
  };

  const removeFilterKey = (key) => {
    if (key === 'year') {
      setEditYear('');
      setEditMonth('');
      setEditStartDate('');
      setEditEndDate('');
    } else if (key === 'month') {
      setEditMonth('');
      if (editYear) {
        setEditStartDate(`${editYear}-01-01`);
        setEditEndDate(`${editYear}-12-31`);
      } else {
        setEditStartDate('');
        setEditEndDate('');
      }
    } else if (key === 'startDate') {
      setEditStartDate('');
    } else if (key === 'endDate') {
      setEditEndDate('');
    } else if (key === 'status') {
      setEditStatus('');
    } else if (key === 'sku') {
      setEditSku('');
    } else if (key === 'companyErrorCode') {
      setEditCompanyErrorCode('');
    } else if (key === 'companyErrorName') {
      setEditCompanyErrorName('');
    } else if (key === 'claimItem') {
      setEditClaimItem('');
    } else if (key === 'defectCode') {
      setEditDefectCode('');
    } else if (key === 'container') {
      setEditContainer('');
    } else if (key === 'lpn') {
      setEditLpn('');
    } else if (key === 'penalty') {
      setEditPenalty('');
    } else if (key === 'penaltyTotal') {
      setEditPenaltyTotal('');
    }
  };

  // Dynamic Suggestion lists extracted from claims
  const uniqueSkuOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.sku) set.add(c.sku);
      if (c.product_name) set.add(c.product_name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniqueDefectCodeOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.defect_code) set.add(c.defect_code);
      if (c.order_code) set.add(c.order_code);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniqueCompanyErrorCodeOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.company_error_code) set.add(c.company_error_code);
      if (c.factory_code) set.add(c.factory_code);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniqueCompanyErrorNameOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.company_error_name) set.add(c.company_error_name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniqueClaimItemOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.claim_code) set.add(c.claim_code);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniqueContainerOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.cont) set.add(c.cont);
      if (c.container_no) set.add(c.container_no);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniqueLpnOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.lpn) set.add(c.lpn);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniquePenaltyOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.penalty) set.add(c.penalty);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  const uniquePenaltyTotalOptions = useMemo(() => {
    const set = new Set();
    claims.forEach(c => {
      if (c.penalty_total) set.add(String(c.penalty_total));
    });
    return Array.from(set).filter(Boolean).sort();
  }, [claims]);

  // Filtered Claims calculation
  const filteredClaims = useMemo(() => {
    return claims.filter(item => {
      // 1. Quick search
      if (quickSearch.trim()) {
        const q = quickSearch.toLowerCase().trim();
        const matches = (
          (item.claim_code && String(item.claim_code).toLowerCase().includes(q)) ||
          (item.sku && String(item.sku).toLowerCase().includes(q)) ||
          (item.product_name && String(item.product_name).toLowerCase().includes(q)) ||
          (item.order_code && String(item.order_code).toLowerCase().includes(q)) ||
          (item.defect_code && String(item.defect_code).toLowerCase().includes(q)) ||
          (item.defect_name && String(item.defect_name).toLowerCase().includes(q)) ||
          (item.company_error_code && String(item.company_error_code).toLowerCase().includes(q)) ||
          (item.company_error_name && String(item.company_error_name).toLowerCase().includes(q)) ||
          (item.factory_code && String(item.factory_code).toLowerCase().includes(q)) ||
          (item.cont && String(item.cont).toLowerCase().includes(q)) ||
          (item.container_no && String(item.container_no).toLowerCase().includes(q)) ||
          (item.lpn && String(item.lpn).toLowerCase().includes(q)) ||
          (item.description && String(item.description).toLowerCase().includes(q)) ||
          (item.claim_description && String(item.claim_description).toLowerCase().includes(q))
        );
        if (!matches) return false;
      }

      // 2. Status quick filter (tab / status filter)
      if (statusFilter && item.status !== statusFilter) return false;

      // 3. Time Filter
      if (appliedFilters.year || appliedFilters.month || appliedFilters.startDate || appliedFilters.endDate) {
        const itemMY = getMonthYear(item); // e.g. "07-2026"
        const [itemM, itemY] = itemMY.split('-');

        if (appliedFilters.year && itemY !== String(appliedFilters.year)) {
          return false;
        }

        if (appliedFilters.month) {
          const mNum = getMonthNumber(appliedFilters.month);
          if (mNum && Number(itemM) !== mNum) {
            return false;
          }
        }

        if (appliedFilters.startDate || appliedFilters.endDate) {
          const rawDate = item.date || item.period || item.created_at || item.export_date;
          if (rawDate) {
            const itemDate = parseDate(rawDate);
            if (appliedFilters.startDate && itemDate < new Date(appliedFilters.startDate)) return false;
            if (appliedFilters.endDate) {
              const end = new Date(appliedFilters.endDate);
              end.setHours(23, 59, 59, 999);
              if (itemDate > end) return false;
            }
          }
        }
      }

      // 4. Claim field filters
      if (appliedFilters.status && item.status !== appliedFilters.status) return false;
      
      if (appliedFilters.sku) {
        const skuQ = appliedFilters.sku.toLowerCase();
        const matchesSku = (item.sku && String(item.sku).toLowerCase().includes(skuQ)) ||
                           (item.product_name && String(item.product_name).toLowerCase().includes(skuQ));
        if (!matchesSku) return false;
      }

      if (appliedFilters.defectCode) {
        const dQ = appliedFilters.defectCode.toLowerCase();
        const matchesDefect = (item.defect_code && String(item.defect_code).toLowerCase().includes(dQ)) ||
                              (item.order_code && String(item.order_code).toLowerCase().includes(dQ));
        if (!matchesDefect) return false;
      }

      if (appliedFilters.companyErrorCode) {
        const cQ = appliedFilters.companyErrorCode.toLowerCase();
        const matchesCode = (item.company_error_code && String(item.company_error_code).toLowerCase().includes(cQ)) ||
                            (item.factory_code && String(item.factory_code).toLowerCase().includes(cQ));
        if (!matchesCode) return false;
      }

      if (appliedFilters.companyErrorName) {
        const nQ = appliedFilters.companyErrorName.toLowerCase();
        if (!item.company_error_name || !String(item.company_error_name).toLowerCase().includes(nQ)) {
          return false;
        }
      }

      if (appliedFilters.claimItem && appliedFilters.claimItem !== 'Cabinet#' && appliedFilters.claimItem !== 'Cabinet #') {
        const cIQ = appliedFilters.claimItem.toLowerCase();
        const matchesClaim = (item.claim_code && String(item.claim_code).toLowerCase().includes(cIQ)) ||
                             (item.cabinet_code && String(item.cabinet_code).toLowerCase().includes(cIQ));
        if (!matchesClaim) return false;
      }

      // 5. Transport field filters
      if (appliedFilters.container) {
        const contQ = appliedFilters.container.toLowerCase();
        const matchesCont = (item.cont && String(item.cont).toLowerCase().includes(contQ)) ||
                            (item.container_no && String(item.container_no).toLowerCase().includes(contQ));
        if (!matchesCont) return false;
      }

      if (appliedFilters.lpn) {
        const lpnQ = appliedFilters.lpn.toLowerCase();
        if (!item.lpn || !String(item.lpn).toLowerCase().includes(lpnQ)) {
          return false;
        }
      }

      if (appliedFilters.penalty) {
        const pQ = appliedFilters.penalty.toLowerCase();
        if (!item.penalty || !String(item.penalty).toLowerCase().includes(pQ)) {
          return false;
        }
      }

      return true;
    });
  }, [claims, quickSearch, statusFilter, appliedFilters]);

  // Sorted Claims calculation (Default: Sort by Claim Period / Time from newest to oldest)
  const sortedClaims = useMemo(() => {
    const list = [...filteredClaims];

    if (!sortOption || sortOption === 'newest' || sortOption === 'time-desc') {
      return list.sort((a, b) => {
        const timeDiff = getClaimTimeValue(b) - getClaimTimeValue(a);
        if (timeDiff !== 0) return timeDiff;
        const bCreated = new Date(b.created_at || 0).getTime();
        const aCreated = new Date(a.created_at || 0).getTime();
        if (bCreated !== aCreated) return bCreated - aCreated;
        return (b.id || 0) - (a.id || 0);
      });
    }

    return list.sort((a, b) => {
      switch (sortOption) {
        case 'oldest':
        case 'time-asc':
          const timeDiff = getClaimTimeValue(a) - getClaimTimeValue(b);
          if (timeDiff !== 0) return timeDiff;
          return (a.id || 0) - (b.id || 0);
        case 'sku-asc':
        case 'name-asc':
          return (a.product_name || a.sku || '').localeCompare(b.product_name || b.sku || '');
        case 'sku-desc':
        case 'name-desc':
          return (b.product_name || b.sku || '').localeCompare(a.product_name || a.sku || '');
        case 'code-asc':
          return (a.claim_code || '').localeCompare(b.claim_code || '');
        case 'code-desc':
          return (b.claim_code || '').localeCompare(a.claim_code || '');
        default:
          return 0;
      }
    });
  }, [filteredClaims, sortOption]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedClaims.length / rowsPerPage) || 1;
  const paginatedClaims = useMemo(() => {
    if (rowsPerPage === Infinity) return sortedClaims;
    const start = (currentPage - 1) * rowsPerPage;
    return sortedClaims.slice(start, start + rowsPerPage);
  }, [sortedClaims, currentPage, rowsPerPage]);

  return {
    // Pagination
    currentPage,
    setCurrentPage,
    rowsPerPage,
    setRowsPerPage,
    totalPages,
    paginatedClaims,
    sortedClaims,
    filteredClaims,

    // Search & Sort
    quickSearch,
    setQuickSearch,
    sortOption,
    setSortOption,
    statusFilter,
    setStatusFilter,
    showStatusDropdown,
    setShowStatusDropdown,
    showSortDropdown,
    setShowSortDropdown,

    // Filter Bar & Dropdowns
    isFilterBarOpen,
    setIsFilterBarOpen,
    activeDropdown,
    setActiveDropdown,

    // Edit states
    editYear,
    setEditYear,
    editMonth,
    setEditMonth,
    editStartDate,
    setEditStartDate,
    editEndDate,
    setEditEndDate,
    editKpiShowAllTime,
    setEditKpiShowAllTime,
    editStatus,
    setEditStatus,
    editSku,
    setEditSku,
    editCompanyErrorCode,
    setEditCompanyErrorCode,
    editCompanyErrorName,
    setEditCompanyErrorName,
    editClaimItem,
    setEditClaimItem,
    editDefectCode,
    setEditDefectCode,
    editContainer,
    setEditContainer,
    editLpn,
    setEditLpn,
    editPenalty,
    setEditPenalty,
    editPenaltyTotal,
    setEditPenaltyTotal,

    // Applied Filters
    appliedFilters,
    setAppliedFilters,
    clearAllFilters,
    removeFilterKey,

    // Date handlers
    handleYearChange,
    handleMonthChange,
    handleStartDateChange,
    handleEndDateChange,
    isDateFilterValid,

    // Selection & Action Menu
    actionMenuClaimId,
    setActionMenuClaimId,
    selectedClaimIds,
    setSelectedClaimIds,
    handleToggleSelectRow,
    handleToggleSelectAll,

    // Suggestions
    showSkuSuggestions, setShowSkuSuggestions, uniqueSkuOptions, skuSuggestions: uniqueSkuOptions,
    showDefectCodeSuggestions, setShowDefectCodeSuggestions, uniqueDefectCodeOptions, defectCodeSuggestions: uniqueDefectCodeOptions,
    showCompanyErrorCodeSuggestions, setShowCompanyErrorCodeSuggestions, uniqueCompanyErrorCodeOptions, companyErrorCodeSuggestions: uniqueCompanyErrorCodeOptions,
    showCompanyErrorNameSuggestions, setShowCompanyErrorNameSuggestions, uniqueCompanyErrorNameOptions, companyErrorNameSuggestions: uniqueCompanyErrorNameOptions,
    showClaimItemSuggestions, setShowClaimItemSuggestions, uniqueClaimItemOptions, claimItemSuggestions: uniqueClaimItemOptions,
    showContainerSuggestions, setShowContainerSuggestions, uniqueContainerOptions, containerSuggestions: uniqueContainerOptions,
    showLpnSuggestions, setShowLpnSuggestions, uniqueLpnOptions, lpnSuggestions: uniqueLpnOptions,
    showPenaltySuggestions, setShowPenaltySuggestions, uniquePenaltyOptions, penaltySuggestions: uniquePenaltyOptions,
    showPenaltyTotalSuggestions, setShowPenaltyTotalSuggestions, uniquePenaltyTotalOptions, penaltyTotalSuggestions: uniquePenaltyTotalOptions
  };
};

export default useClaimFilter;
