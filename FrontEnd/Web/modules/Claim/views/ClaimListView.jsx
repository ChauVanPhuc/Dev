import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { claimService } from '../services/claim.service';
import { normalizePenaltyValue, parseDate } from '../utils/claimHelpers';
import { API_ROOT } from '@webShared/Services/api.service';
import '../styles/claim.css';

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
    let batchId = latestImport?.batch_id;

    if (!batchId) {
      try {
        setLoading(true);
        const batches = await claimService.getImportBatches();
        if (batches && batches.length > 0) {
          batchId = batches[0].batch_id;
        }
      } catch (err) {
        console.error('Lỗi khi lấy danh sách lô import:', err);
      } finally {
        setLoading(false);
      }
    }

    if (batchId) {
      const downloadUrl = getFullImagePath(`/api/v1/claims/claim_imports/excel/${batchId}_claims.xlsx`);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `${batchId}_claims.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      showModal('Thông báo', 'Không có dữ liệu lô import nào để xuất Excel. Vui lòng import PDF trước.', 'info');
    }
  };

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [expandedDeleteItems, setExpandedDeleteItems] = useState({});
  const [defectCatalog, setDefectCatalog] = useState([]);
  const [cabinetPrices, setCabinetPrices] = useState([]);

  // Fetch defect catalog on mount
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await claimService.getDefects();
        setDefectCatalog(res.items || []);
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
  const [rowsPerPage, setRowsPerPage] = useState(11);

  // Quick search input state
  const [quickSearch, setQuickSearch] = useState('');
  const [sortOption, setSortOption] = useState('');

  // Filter bar visibility
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'time', 'claim', 'transport', or null

  // Dropdown click outside hook
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeDropdown && !e.target.closest('.filter-dropdown-wrapper')) {
        setActiveDropdown(null);
      }
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

  // States for autocomplete visibility in the filter bar
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);
  const [showDefectCodeSuggestions, setShowDefectCodeSuggestions] = useState(false);
  const [showCompanyErrorCodeSuggestions, setShowCompanyErrorCodeSuggestions] = useState(false);
  const [showClaimItemSuggestions, setShowClaimItemSuggestions] = useState(false);
  const [showContainerSuggestions, setShowContainerSuggestions] = useState(false);
  const [showLpnSuggestions, setShowLpnSuggestions] = useState(false);

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
    setAppliedFilters(newFilters);
  }, [
    editYear, editMonth, editStartDate, editEndDate,
    editStatus, editSku, editCompanyErrorCode, editClaimItem,
    editDefectCode, editContainer, editLpn
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
    if (selectedClaimIds.length > 0) {
      const targetClaim = claims.find(c => c.id === selectedClaimIds[0]);
      if (targetClaim) {
        setActiveDetailClaim(targetClaim);
        return;
      }
    }

    if (claims.length > 0) {
      setActiveDetailClaim(claims[0]);
    } else {
      showModal('Thông báo', 'Không có dữ liệu khiếu nại nào để xử lý.', 'info');
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

  // Success summary modal state
  const [successSummary, setSuccessSummary] = useState({
    isOpen: false,
    batchId: '',
    claimsCount: 0,
    photoCount: 0,
    warningsCount: 0,
    warnings: [],
    fileStats: []
  });

  // Error modal state
  const [importError, setImportError] = useState({
    isOpen: false,
    message: ''
  });

  // Selected detail modal states
  const [activeDetailClaim, setActiveDetailClaim] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

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
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                      }} 
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
        status: backendStatus
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

      let formattedDate = '';
      if (activeDetailClaim.date) {
        const parts = activeDetailClaim.date.split('-');
        if (parts.length === 2) {
          formattedDate = `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
        } else if (activeDetailClaim.date.includes('/')) {
          const partsSlash = activeDetailClaim.date.split('/');
          if (partsSlash.length === 2) {
            formattedDate = `${partsSlash[1]}-${partsSlash[0].padStart(2, '0')}-01`;
          }
        }
      } else if (activeDetailClaim.period) {
        const parts = activeDetailClaim.period.split('-');
        if (parts.length === 2) {
          formattedDate = `${parts[1]}-${parts[0].padStart(2, '0')}-01`;
        }
      }
      setProcessNgayXuat(formattedDate);
      setProcessTrangThaiXuLy(activeDetailClaim.status === 'Đã xử lý' || activeDetailClaim.status === 'Chấp nhận' ? 'Đã xử lý' : activeDetailClaim.status === 'Đang xử lý' ? 'Đang xử lý' : 'Mới');
      setProcessLinkCapa(activeDetailClaim.capa_link || activeDetailClaim.link_capa || '');
      setProcessGhiChu(activeDetailClaim.claim_description || activeDetailClaim.description || '');
    }
  }, [activeDetailClaim]);

  // Dropdown states & refs for Import
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const pdfInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Simulated PDF OCR ingestion state
  const [uploadingState, setUploadingState] = useState({
    isOpen: false,
    title: '',
    progress: 0,
    statusText: '',
    filesCount: 0
  });

  // Dropdown click outside hook for Import dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.import-dropdown-container')) {
        setIsImportDropdownOpen(false);
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

    const file = files[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setImportError({
        isOpen: true,
        message: 'Chỉ chấp nhận các tệp tin định dạng PDF.'
      });
      return;
    }

    setUploadingState({
      isOpen: true,
      title: 'Đang xử lý PDF...',
      progress: 10,
      statusText: 'Đang khởi tạo...',
      filesCount: 1
    });

    let progressVal = 10;
    const progressInterval = setInterval(() => {
      progressVal += 5;
      if (progressVal > 95) {
        clearInterval(progressInterval);
      } else {
        let statusText = 'Đang đọc cấu trúc tệp tin PDF...';
        if (progressVal > 30 && progressVal <= 60) {
          statusText = 'Đang phân tích và trích xuất dữ liệu khiếu nại...';
        } else if (progressVal > 60 && progressVal <= 85) {
          statusText = 'Đang định vị và liên kết hình ảnh lỗi...';
        } else if (progressVal > 85) {
          statusText = 'Đang đóng gói dữ liệu và tạo tệp Excel...';
        }
        setUploadingState(prev => ({
          ...prev,
          progress: progressVal,
          statusText
        }));
      }
    }, 150);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await claimService.importPdf(formData);
      clearInterval(progressInterval);

      setUploadingState(prev => ({
        ...prev,
        progress: 100,
        statusText: 'Hoàn tất!'
      }));

      setTimeout(() => {
        setUploadingState(prev => ({ ...prev, isOpen: false }));

        if (response.success && response.total_records > 0) {
          // Fetch claims from DB (records no longer in response since JSON save disabled)
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

          // Show production success dialog
          setSuccessSummary({
            isOpen: true,
            batchId: response.batch_id,
            claimsCount: response.db_saved_count || response.total_records,
            photoCount: 0,
            warningsCount: response.parse_warnings ? response.parse_warnings.length : 0,
            warnings: response.parse_warnings || [],
            fileStats: response.file_stats || []
          });

        } else if (response.success && response.total_records === 0) {
          setImportError({
            isOpen: true,
            message: 'Không tìm thấy dữ liệu khiếu nại nào trong file PDF.'
          });
        } else {
          setImportError({
            isOpen: true,
            message: 'Định dạng phản hồi không hợp lệ từ máy chủ.'
          });
        }
      }, 400);

    } catch (error) {
      clearInterval(progressInterval);
      setUploadingState(prev => ({ ...prev, isOpen: false }));
      const errorMsg = error.response?.data?.detail || error.message || 'Lỗi kết nối máy chủ.';
      setImportError({
        isOpen: true,
        message: errorMsg
      });
    } finally {
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleFolderImportSuccess = (response) => {
    setUploadingState(prev => ({
      ...prev,
      progress: 100,
      statusText: 'Hoàn tất!'
    }));

    setTimeout(() => {
      setUploadingState(prev => ({ ...prev, isOpen: false }));

      if (response.success && response.total_records > 0) {

        // Fetch claims from DB to get up-to-date list (records no longer in response)
        fetchClaims();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const tableContainer = document.querySelector('.report-table-container');
        if (tableContainer) tableContainer.scrollTop = 0;

        // Highlight
        setHighlightBatchId(response.batch_id);
        setTimeout(() => {
          setHighlightBatchId(null);
        }, 4000);

        // Update latest import metadata
        setLatestImport({
          batch_id: response.batch_id,
          period: response.period,
          total_records: response.total_records,
          warnings_count: response.parse_warnings ? response.parse_warnings.length : 0,
          imported_at: new Date().toLocaleString('vi-VN')
        });

        // Success dialog
        setSuccessSummary({
          isOpen: true,
          batchId: response.batch_id,
          claimsCount: response.db_saved_count || response.total_records,
          photoCount: 0,
          warningsCount: response.parse_warnings ? response.parse_warnings.length : 0,
          warnings: response.parse_warnings || [],
          fileStats: response.file_stats || []
        });

      } else if (response.success && response.total_records === 0) {
        setImportError({
          isOpen: true,
          message: 'Không tìm thấy dữ liệu khiếu nại nào trong các file PDF đã chọn.'
        });
      } else {
        setImportError({
          isOpen: true,
          message: 'Định dạng phản hồi không hợp lệ từ máy chủ hoặc thư mục rỗng.'
        });
      }
    }, 400);
  };

  const handleFolderFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const pdfFiles = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      setImportError({
        isOpen: true,
        message: 'Không tìm thấy tệp tin PDF nào trong thư mục đã chọn.'
      });
      return;
    }

    setUploadingState({
      isOpen: true,
      title: `Đang xử lý ${pdfFiles.length} file PDF...`,
      progress: 5,
      statusText: `Đã phát hiện ${pdfFiles.length} file PDF. Đang tải lên...`,
      filesCount: pdfFiles.length
    });

    const formData = new FormData();
    pdfFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      // Try SSE streaming endpoint first (real-time progress)
      const response = await claimService.importFolderStream(formData, (event) => {
        if (event.type === 'start') {
          setUploadingState(prev => ({
            ...prev,
            progress: 8,
            statusText: `Bắt đầu xử lý ${event.total_files} file PDF...`
          }));
        } else if (event.type === 'progress') {
          const percent = Math.min(event.percent || 0, 98);
          let statusText = '';
          if (event.status === 'processing') {
            statusText = event.filename === 'Excel export'
              ? 'Đang tạo file Excel kết quả...'
              : `Đang phân tích: ${event.filename} (${event.file_index}/${event.total_files})`;
          } else if (event.status === 'done') {
            statusText = `✓ Hoàn tất: ${event.filename} — ${event.claims_found || 0} khiếu nại (${event.file_index}/${event.total_files})`;
          } else if (event.status === 'error') {
            statusText = `⚠ Lỗi file: ${event.filename} (${event.file_index}/${event.total_files})`;
          }
          setUploadingState(prev => ({
            ...prev,
            progress: percent,
            statusText
          }));
        }
      });

      handleFolderImportSuccess(response);

    } catch (streamError) {
      // If streaming endpoint fails (405 Method Not Allowed = server not updated),
      // automatically fallback to old non-streaming endpoint
      const is405 = streamError.message?.includes('Method Not Allowed') || streamError.message?.includes('405');

      if (is405) {
        console.warn('Streaming endpoint unavailable, falling back to standard import...');
        setUploadingState(prev => ({
          ...prev,
          progress: 10,
          statusText: `Đang xử lý ${pdfFiles.length} file PDF (chế độ tiêu chuẩn)...`
        }));

        // Rebuild FormData since the original one was consumed
        const formData2 = new FormData();
        pdfFiles.forEach(file => {
          formData2.append('files', file);
        });

        // Simulated progress for fallback
        let progressVal = 10;
        const progressInterval = setInterval(() => {
          progressVal += 2;
          if (progressVal > 95) {
            clearInterval(progressInterval);
          } else {
            let statusText = 'Đang tải lên các tệp PDF...';
            if (progressVal > 25 && progressVal <= 60) {
              statusText = `Đang trích xuất dữ liệu khiếu nại từ ${pdfFiles.length} tệp...`;
            } else if (progressVal > 60 && progressVal <= 80) {
              statusText = 'Đang cắt và liên kết hình ảnh lỗi...';
            } else if (progressVal > 80) {
              statusText = 'Đang đóng gói và kết xuất tệp Excel...';
            }
            setUploadingState(prev => ({
              ...prev,
              progress: progressVal,
              statusText
            }));
          }
        }, 500);

        try {
          const response = await claimService.importFolder(formData2);
          clearInterval(progressInterval);
          handleFolderImportSuccess(response);
        } catch (fallbackError) {
          clearInterval(progressInterval);
          setUploadingState(prev => ({ ...prev, isOpen: false }));
          const errorMsg = fallbackError.response?.data?.detail || fallbackError.message || 'Lỗi kết nối máy chủ.';
          setImportError({
            isOpen: true,
            message: `Không thể nhập khiếu nại từ thư mục. Lỗi: ${errorMsg}`
          });
        }
      } else {
        setUploadingState(prev => ({ ...prev, isOpen: false }));
        const errorMsg = streamError.message || 'Lỗi kết nối máy chủ.';
        setImportError({
          isOpen: true,
          message: `Không thể nhập khiếu nại từ thư mục. Lỗi: ${errorMsg}`
        });
      }
    } finally {
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

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
  const TABLE_ROW_HEIGHT = 56;
  const FIXED_CHROME_HEIGHT = 380; // Adjusted from 420 to prevent extra empty space at the bottom

  useEffect(() => {
    const handleResize = () => {
      const availableHeight = window.innerHeight - FIXED_CHROME_HEIGHT;
      const rows = Math.max(11, Math.floor(availableHeight / TABLE_ROW_HEIGHT));
      setRowsPerPage(rows);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset page when filters change, sort option changes or data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [claims, quickSearch, appliedFilters, sortOption]);

  // Pagination computed values
  const totalFilteredItems = filteredClaimsToDisplay.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedClaims = filteredClaimsToDisplay.slice(startIndex, endIndex);

  const getCabinetSalePrice = (sku) => {
    if (!sku) return 0;
    const cleanSku = sku.trim().toLowerCase();
    const match = cabinetPrices.find(p => p.cabinet_code && p.cabinet_code.trim().toLowerCase() === cleanSku);
    if (match) return match.sale_price || 0;
    return 0;
  };

  const getPenaltyStats = () => {
    const penaltyMap = {};
    let totalSum = 0;
    filteredClaimsToDisplay.forEach(c => {
      const p = normalizePenaltyValue(c.penalty || 'Không có');
      penaltyMap[p] = (penaltyMap[p] || 0) + 1;
      
      const lower = p.toLowerCase();
      const sku = c.product_name || c.sku;
      let val = 0;
      if (lower.includes('x2 unit') || lower.includes('x2unit') || lower.includes('2x unit')) {
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
      totalSum += val;
    });

    const uniqueValues = Object.keys(penaltyMap);
    return {
      totalSum,
      uniqueCount: uniqueValues.length,
      breakdown: uniqueValues.map(val => `${val}: ${penaltyMap[val]} vụ`).join('\n')
    };
  };

  const penaltyStats = getPenaltyStats();
  const uniquePenaltyOptions = Array.from(new Set(claims.map(c => normalizePenaltyValue(c.penalty)).filter(Boolean)));

  // Setup headers for Table component
  const tableHeaders = [
    {
      isCheckbox: true,
      label: (
        <input
          type="checkbox"
          className="checkbox-custom"
          checked={paginatedClaims.length > 0 && paginatedClaims.every(c => selectedClaimIds.includes(c.id))}
          onChange={handleToggleSelectAll}
        />
      )
    },
    { label: 'STT', style: { width: '60px' } },
    { label: 'Tên sản phẩm', className: 'text-left' },
    { label: 'Mã tham chiếu', className: 'text-left' },
    { label: 'Mã lỗi KH' },
    { label: 'Mã lỗi G7' },
    { label: 'Giá trị phạt' },
    { label: 'LPN' },
    { label: 'Container' },
    { label: 'Thời gian' },
    { label: 'Trạng thái' },
    { label: 'Thao tác' }
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
        <span style={{ margin: 0 }}>Xử lý khiếu nại</span>
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
            {activeDetailClaim.claim_code} · {activeDetailClaim.product_name || activeDetailClaim.sku} · Ngày xuất: {activeDetailClaim.date || activeDetailClaim.period}
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
        <div className="summary-card" title={penaltyStats.breakdown}>
          <div className="summary-card-left">
            <span className="summary-card-label">Tổng số tiền phạt</span>
            <span className="summary-card-value">
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(penaltyStats.totalSum)}
            </span>
          </div>
          <div className="summary-card-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-card-left">
            <span className="summary-card-label">Tổng số vụ ghi nhận</span>
            <span className="summary-card-value">{filteredClaimsToDisplay.length}</span>
          </div>
          <div className="summary-card-icon-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </div>
        </div>


      </div>

      {/* SECTION 3: DETAILED REPORT HEADER */}
      <div className="detailed-report-header" style={{ borderBottom: '1px solid #F0E6D8', paddingBottom: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '280px' }}>
            <input
              type="text"
              placeholder="Search nhanh SKU, Cont, LPN..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '0.85rem',
                border: '1.5px solid #E2E8F0',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: '#FFFDFB'
              }}
            />
            <svg style={{ position: 'absolute', left: '10px', top: '11px', color: '#94A3B8' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>

          <button
            type="button"
            className="btn-border-action"
            onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '37px',
              padding: '0 16px',
              borderColor: '#2D1A12',
              backgroundColor: isFilterBarOpen ? '#7B5233' : '#FFFFFF',
              color: isFilterBarOpen ? '#FFFFFF' : '#2D1A12',
              fontWeight: 'bold',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Bộ lọc
            {activeFiltersCount > 0 && (
              <span style={{
                backgroundColor: isFilterBarOpen ? '#FFFFFF' : '#7B5233',
                color: isFilterBarOpen ? '#7B5233' : '#FFFFFF',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                marginLeft: '4px'
              }}>
                {activeFiltersCount}
              </span>
            )}
          </button>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="btn-border-action"
              style={{
                height: '37px',
                borderColor: '#2D1A12',
                color: '#2D1A12',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '0 28px 0 34px',
                cursor: 'pointer',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                fontSize: '0.85rem'
              }}
            >
              <option value="">Sắp xếp</option>
              <option value="name-asc">Tên: A-Z</option>
              <option value="name-desc">Tên: Z-A</option>
              <option value="time-asc">Thời gian: Sớm nhất</option>
              <option value="time-desc">Thời gian: Trễ nhất</option>
            </select>
            <svg
              style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none', color: '#2D1A12' }}
              width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M15 18H3M21 14H3M17 10H3M21 6H3"></path>
            </svg>
            <svg
              style={{ position: 'absolute', right: '10px', top: '14px', pointerEvents: 'none', color: '#2D1A12' }}
              width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <div className="action-buttons-group" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn-overview-orange"
            onClick={handleProcessSelectedClaim}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '37px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Xử lý khiếu nại
          </button>

          <button
            className="btn-add-new"
            onClick={handleOpenAddNewClaim}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '37px',
              padding: '0 20px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Thêm mới
          </button>

          <div className="import-dropdown-container">
            <button
              className="btn-border-action"
              onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '37px',
                borderColor: '#2D1A12',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '0 16px',
                cursor: 'pointer'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Import
              <svg style={{ marginLeft: '6px', transform: isImportDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {isImportDropdownOpen && (
              <div className="import-dropdown-menu" style={{ minWidth: '160px' }}>
                <button className="import-dropdown-item" onClick={() => { setIsImportDropdownOpen(false); triggerPdfUpload(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  File PDF
                </button>
                <button className="import-dropdown-item" onClick={() => { setIsImportDropdownOpen(false); triggerFolderUpload(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Thư mục PDF
                </button>
              </div>
            )}
          </div>

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
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleFolderFileChange}
          />

          <button
            className="btn-border-action"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '37px',
              borderColor: '#2D1A12',
              fontWeight: 'bold',
              borderRadius: '8px',
              padding: '0 16px',
              cursor: 'pointer'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Export
          </button>

          <button
            className="btn-border-action"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '37px',
              borderColor: selectedClaimIds.length === 0 ? '#CBD5E1' : '#A0301B',
              color: selectedClaimIds.length === 0 ? '#94A3B8' : '#A0301B',
              cursor: selectedClaimIds.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              borderRadius: '8px',
              padding: '0 16px'
            }}
            disabled={selectedClaimIds.length === 0}
            onClick={() => {
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
                  
                  const succeeded = results.filter(r => r.success);
                  const failed = results.filter(r => !r.success);
                  
                  const remainingClaims = claims.filter(c => !succeeded.map(s => s.claim.id).includes(c.id));
                  setClaims(remainingClaims);
                  setSelectedClaimIds(prev => prev.filter(id => failed.map(f => f.claim.id).includes(id)));
                  
                  if (remainingClaims.length === 0) {
                    setLatestImport(null);
                  }
                  
                  const isAllSuccess = failed.length === 0;
                  const msgTitle = isAllSuccess ? 'Xóa thành công' : 'Kết quả xóa';
                  const msgType = isAllSuccess ? 'success' : failed.length === selectedClaims.length ? 'error' : 'info';
                  
                  const notificationContent = (
                    <div style={{ width: '100%', maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                      {succeeded.length > 0 && (
                        <div style={{ marginBottom: failed.length > 0 ? '16px' : '0' }}>
                          <p style={{ fontWeight: '600', color: '#059669', marginBottom: '8px' }}>
                            Đã xóa thành công {succeeded.length} khiếu nại:
                          </p>
                          <DeleteResultList items={succeeded} type="success" />
                        </div>
                      )}
                      
                      {failed.length > 0 && (
                        <div>
                          <p style={{ fontWeight: '600', color: '#DC2626', marginBottom: '8px' }}>
                            Xóa thất bại {failed.length} khiếu nại:
                          </p>
                          <DeleteResultList items={failed} type="error" />
                        </div>
                      )}
                    </div>
                  );
                  
                  showModal(msgTitle, notificationContent, msgType);
                }
              });
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Xóa đã chọn
          </button>
        </div>
      </div>

      {/* INLINE EXPANDABLE FILTER BAR */}
      {isFilterBarOpen && (
        <div className="filter-inline-bar">
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
              {['status', 'sku', 'defectCode', 'companyErrorCode'].filter(k => appliedFilters[k]).length > 0 && (
                <span className="filter-active-badge">
                  {['status', 'sku', 'defectCode', 'companyErrorCode'].filter(k => appliedFilters[k]).length}
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
      <Table
        loading={loading}
        isEmpty={claims.length === 0}
        emptyMessage="Chưa có dữ liệu khiếu nại nào được nhập."
        headers={tableHeaders}
      >
        {paginatedClaims.map((claim, idx) => (
          <tr key={claim.id} className={claim.batch_id && claim.batch_id === highlightBatchId ? 'claim-row-highlight' : ''}>
            <td className="checkbox-col">
              <input
                type="checkbox"
                className="checkbox-custom"
                checked={selectedClaimIds.includes(claim.id)}
                onChange={() => handleToggleSelectRow(claim.id)}
              />
            </td>
            <td style={{ fontWeight: '600', color: 'var(--text-gray)' }}>{startIndex + idx + 1}</td>
            <td className="text-left" style={{ fontWeight: '500', color: '#2D1A12' }}>{claim.product_name}</td>
            <td className="code-ref text-left">{claim.claim_code}</td>
            <td className="code-error">{claim.order_code}</td>
            <td className="code-error">{claim.company_error_code || ''}</td>
            <td className="value-penalty">{claim.penalty}</td>
            <td className="code-lpn">{claim.lpn}</td>
            <td className="code-cont">{claim.cont}</td>
            <td>{claim.date}</td>
            <td>
              <span className={`status-badge badge-${claim.status === 'Mới' ? 'new' : claim.status === 'Đang xử lý' ? 'pending' : 'accepted'}`}>
                {claim.status}
              </span>
            </td>
            <td>
              <button
                className="btn-action-edit"
                title="Chỉnh sửa"
                onClick={() => setActiveDetailClaim(claim)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </button>
            </td>
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



      {/* CENTERED STEP-BY-STEP PROGRESS MODAL */}
      {uploadingState.isOpen && (
        <div className="import-progress-overlay">
          <div className="import-progress-modal">
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--text-dark)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <svg style={{ color: 'var(--primary-color)', animation: 'spin 1.5s linear infinite' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12"></circle>
              </svg>
              {uploadingState.title}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '24px' }}>
              <div className={`import-step-item ${uploadingState.progress >= 10 ? (uploadingState.progress > 20 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block' }}>
                  {uploadingState.progress > 20 ? '✓' : '●'}
                </span>
                <span>Đang đọc cấu trúc PDF...</span>
              </div>

              <div className={`import-step-item ${uploadingState.progress >= 20 ? (uploadingState.progress > 50 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block' }}>
                  {uploadingState.progress > 50 ? '✓' : '●'}
                </span>
                <span>Đang trích xuất dữ liệu khiếu nại...</span>
              </div>

              <div className={`import-step-item ${uploadingState.progress >= 50 ? (uploadingState.progress > 80 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block' }}>
                  {uploadingState.progress > 80 ? '✓' : '●'}
                </span>
                <span>Đang liên kết hình ảnh minh chứng...</span>
              </div>

              <div className={`import-step-item ${uploadingState.progress >= 80 ? (uploadingState.progress > 95 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block' }}>
                  {uploadingState.progress > 95 ? '✓' : '●'}
                </span>
                <span>Đang kết xuất tệp Excel...</span>
              </div>

              <div className={`import-step-item ${uploadingState.progress >= 95 ? (uploadingState.progress === 100 ? 'import-step-done' : 'import-step-active') : 'import-step-pending'}`}>
                <span style={{ fontSize: '1.1rem', width: '20px', display: 'inline-block' }}>
                  {uploadingState.progress === 100 ? '✓' : '●'}
                </span>
                <span>Đang lưu trữ dữ liệu...</span>
              </div>
            </div>

            <div className="progress-container">
              <div className="progress-bar-bg" style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#E5E7EB',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div className="progress-bar-fill" style={{
                  width: `${uploadingState.progress}%`,
                  height: '100%',
                  backgroundColor: uploadingState.progress === 100 ? '#16A34A' : '#7B5233',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease, background-color 0.3s ease'
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#8D6E63', marginTop: '8px', fontWeight: '600' }}>
                <span style={{ flex: 1, wordBreak: 'break-word', paddingRight: '12px' }}>{uploadingState.statusText}</span>
                <span style={{ flexShrink: 0 }}>{uploadingState.progress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT SUCCESS DETAILS MODAL */}
      {successSummary.isOpen && (
        <div className="filter-modal-backdrop" style={{ zIndex: 1600 }}>
          <div className="filter-modal" style={{ maxWidth: '960px', width: '90%', maxHeight: '85vh' }}>
            <div className="filter-modal-header" style={{ borderBottom: '1px solid #E5E7EB', padding: '16px 20px', backgroundColor: '#ECFDF5' }}>
              <div className="filter-modal-title-area">
                <h3 className="filter-modal-title" style={{ color: '#065F46', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  Import PDF thành công
                </h3>
              </div>
              <button className="filter-modal-close" onClick={() => setSuccessSummary(prev => ({ ...prev, isOpen: false }))}>&times;</button>
            </div>

            <div className="filter-modal-body" style={{
              display: 'grid',
              gridTemplateColumns: successSummary.warningsCount > 0 ? '240px 1fr 1fr' : '240px 1fr',
              gridTemplateRows: successSummary.claimsCount === 0 ? 'auto 1fr' : '1fr',
              gap: '20px',
              padding: '20px',
              backgroundColor: '#FFFFFF',
              height: '450px',
              maxHeight: 'calc(85vh - 160px)',
              overflow: 'hidden'
            }}>
              {successSummary.claimsCount === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  backgroundColor: '#FAF6F0',
                  border: '1px solid #7B5233',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#2D1A12',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  lineHeight: '1.5',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, color: '#7B5233' }}>
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <span>
                    <strong>Thông báo:</strong> File PDF này không có thêm dòng khiếu nại mới nào vì toàn bộ dữ liệu đã được nhập từ trước (hệ thống tự động bỏ qua để tránh ghi đè hoặc tạo dữ liệu trùng lặp).
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Mã lô (Batch ID)</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#2D1A12', marginTop: '2px', wordBreak: 'break-all' }}>{successSummary.batchId}</div>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Số dòng đã trích xuất</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2D1A12', marginTop: '2px' }}>{successSummary.claimsCount}</div>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Ảnh minh chứng đã khớp</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2D1A12', marginTop: '2px' }}>{successSummary.photoCount}</div>
                </div>
                <div style={{ backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: '600' }}>Số cảnh báo lỗi cấu trúc</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#DC2626', marginTop: '2px' }}>{successSummary.warningsCount}</div>
                </div>
              </div>

              {successSummary.fileStats && successSummary.fileStats.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#1E293B', flexShrink: 0 }}>
                    Danh sách file PDF đã xử lý ({successSummary.fileStats.length} file - {successSummary.claimsCount} dòng):
                  </span>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#334155',
                    lineHeight: '1.6'
                  }}>
                    {successSummary.fileStats.map((file, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: index < successSummary.fileStats.length - 1 ? '1px solid #F1F5F9' : 'none', padding: '6px 0', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={file.filename}>
                          📄 {file.filename}
                        </span>
                        <span style={{ color: '#0F172A', fontWeight: '600', flexShrink: 0 }}>
                          {file.claims_count} dòng ({file.period || 'N/A'})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', fontSize: '0.8rem', color: '#64748B' }}>
                  Không có danh sách file
                </div>
              )}

              {successSummary.warningsCount > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflow: 'hidden' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#EA580C', flexShrink: 0 }}>
                    Danh sách cảnh báo ({successSummary.warningsCount}):
                  </span>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: '#FFF7ED',
                    border: '1px solid #FFEDD5',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#C2410C',
                    lineHeight: '1.4'
                  }}>
                    {successSummary.warnings.map((warn, index) => (
                      <div key={index} style={{ marginBottom: '6px', borderBottom: index < successSummary.warnings.length - 1 ? '1px solid #FFEDD5' : 'none', paddingBottom: '4px' }}>
                        • {warn}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="filter-modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', gap: '8px', justifyContent: 'flex-end', backgroundColor: '#F9FAFB' }}>
              <button
                type="button"
                className="btn-modal-apply"
                onClick={() => setSuccessSummary(prev => ({ ...prev, isOpen: false }))}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INGESTION ERROR MODAL */}
      {importError.isOpen && (
        <div className="filter-modal-backdrop" style={{ zIndex: 1600 }}>
          <div className="filter-modal" style={{ maxWidth: '450px' }}>
            <div className="filter-modal-header" style={{ borderBottom: '1px solid #E5E7EB', padding: '14px 20px', backgroundColor: '#FEF2F2' }}>
              <div className="filter-modal-title-area">
                <h3 className="filter-modal-title" style={{ color: '#991B1B', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  Lỗi Nhập PDF
                </h3>
              </div>
              <button className="filter-modal-close" onClick={() => setImportError(prev => ({ ...prev, isOpen: false }))}>&times;</button>
            </div>
            <div className="filter-modal-body" style={{ padding: '20px', fontSize: '0.85rem', color: '#1F2937', backgroundColor: '#FFFFFF', whiteSpace: 'pre-wrap' }}>
              {importError.message}
            </div>
            <div className="filter-modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#F9FAFB' }}>
              <button type="button" className="btn-modal-apply" style={{ backgroundColor: '#DC2626' }} onClick={() => setImportError(prev => ({ ...prev, isOpen: false }))}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP XỬ LÝ KHIẾU NẠI (Sử dụng FormModal dùng chung) */}
      <FormModal
        isOpen={!!activeDetailClaim}
        onClose={() => setActiveDetailClaim(null)}
        onSubmit={handleSaveProcessClaim}
        title={processModalTitle}
        width="min(95vw, 1150px)"
        cancelLabel="Hủy"
        confirmLabel="Lưu lại"
        leftFooterActions={claimNavFooterActions}
        leftSideAction={claimNavLeftSideAction}
        rightSideAction={claimNavRightSideAction}
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
                    onFocus={() => setShowProcessSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProcessSuggestions(false), 200)}
                  />
                  {showProcessSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniquePenaltyOptions
                        .filter(opt => !processGiaTriPhat || opt.toLowerCase().includes(processGiaTriPhat.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setProcessGiaTriPhat(opt);
                              setShowProcessSuggestions(false);
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
                    placeholder="Mã lỗi KH..."
                    value={processMaLoi}
                    onChange={(e) => setProcessMaLoi(e.target.value)}
                    className="add-claim-input"
                    onFocus={() => setShowProcessDefectSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowProcessDefectSuggestions(false), 200)}
                  />
                  {showProcessDefectSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {(defectCatalog.map(d => d.defect_code).filter(Boolean).length > 0 
                        ? defectCatalog.map(d => d.defect_code).filter(Boolean) 
                        : ['DVA_08', 'DVA_11', 'DVA_14', 'DVA_01', 'DVA_05', 'DVA_06', 'DVA_12', 'DVA_15'])
                        .filter(opt => !processMaLoi || opt.toLowerCase().includes(processMaLoi.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setProcessMaLoi(opt);
                              setShowProcessDefectSuggestions(false);
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
                    value={processMaLoiCty}
                    onChange={(e) => setProcessMaLoiCty(e.target.value)}
                    className="add-claim-input"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: LPN & Mã cont & Ngày xuất */}
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
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Ngày xuất</label>
                <input
                  type="date"
                  value={processNgayXuat}
                  onChange={(e) => setProcessNgayXuat(e.target.value)}
                  className="add-claim-input"
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
                        name="processTrangThaiXuLy"
                        value={statusVal}
                        checked={processTrangThaiXuLy === statusVal}
                        onChange={async (e) => {
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
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="add-claim-image-card-placeholder" onClick={handleProcessAddImageClick}>
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

            {/* Row 4: LPN & Mã cont & Ngày xuất */}
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
                <label className="add-claim-label">Ngày xuất <span style={{ color: '#EF4444', marginLeft: '2px' }}>*</span></label>
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
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Zoomed preview"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
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
    </div>
  );
};

export default ClaimListView;
