import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Boxes,
  CheckCircle2,
  AlertTriangle,
  Package,
  Search,
  RefreshCw,
  RotateCw,
  FileSpreadsheet,
  Printer,
  Eye,
  Edit2,
  Trash2,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Barcode,
  Layers,
  Save,
  Filter,
  Zap,
  Calendar,
  Settings
} from 'lucide-react';
import * as XLSX from 'xlsx';
import containerScanService from '../Models/containerScan.service';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import '@lpn/styles/lpnCrawler.css';

/**
 * Kiểm định tự động quy chuẩn container xuất khẩu (áp dụng đồng bộ cả Web & Mobile)
 */
export const validateContainerRules = (pallets = []) => {
  const palletErrors = [];
  const topLpnGroup = {};

  // 1. Quét tìm tất cả các Pallet 2 kiện (4 SKU đứng, 2 LPN đứng, không kiện nóc)
  const twoBoxPalletIndices = [];
  (pallets || []).forEach((pallet) => {
    const standingSkus = pallet.standing?.skus?.length || 0;
    const standingLpns = pallet.standing?.lpns?.length || 0;
    const roofSkus = pallet.roof?.skus?.length || 0;
    const roofLpns = pallet.roof?.lpns?.length || 0;
    const hasRoof = Boolean(pallet.roof?.hasRoof) || (roofSkus > 0 || roofLpns > 0);

    if (!hasRoof && standingSkus === 4 && standingLpns === 2) {
      twoBoxPalletIndices.push(pallet.palletIndex);
    }
  });

  // Trong 1 Container chỉ cho phép DUY NHẤT 1 Pallet 2 kiện
  const allowedTwoBoxIndex = twoBoxPalletIndices.length > 0 ? twoBoxPalletIndices[0] : null;

  (pallets || []).forEach((pallet) => {
    const pIdx = pallet.palletIndex;
    const standingSkus = pallet.standing?.skus?.length || 0;
    const standingLpns = pallet.standing?.lpns?.length || 0;
    const roofSkus = pallet.roof?.skus?.length || 0;
    const roofLpns = pallet.roof?.lpns?.length || 0;
    const hasRoof = Boolean(pallet.roof?.hasRoof) || (roofSkus > 0 || roofLpns > 0);

    const isStandingOk = standingSkus === 8 && standingLpns === 4;
    let isRoofOk = true;
    let isPalletComplete = false;
    let isTwoBoxPallet = false;
    let errorReasons = [];

    // NGOẠI LỆ ĐẶC BIỆT: Pallet 2 kiện (4 SKU đứng + 2 LPN đứng, không nóc)
    if (!hasRoof && standingSkus === 4 && standingLpns === 2) {
      if (pIdx === allowedTwoBoxIndex) {
        // Hợp lệ: Duy nhất 1 Pallet 2 kiện trong container
        isPalletComplete = true;
        isTwoBoxPallet = true;
      } else {
        // Vượt quá số lượng: Container đã có 1 pallet 2 kiện khác
        isPalletComplete = false;
        errorReasons.push(`Chỉ được phép tối đa duy nhất 1 Pallet 2 kiện trong container (Đã có Pallet #${allowedTwoBoxIndex})`);
      }
    } else if (hasRoof) {
      // Pallet 5 kiện: Cần 8 + 2 = 10 SKU và 4 + 1 = 5 LPN
      isRoofOk = roofSkus === 2 && roofLpns === 1;
      isPalletComplete = isStandingOk && isRoofOk;

      if (!isStandingOk) {
        if (standingSkus < 8) errorReasons.push(`Thiếu SKU đứng (${standingSkus}/8)`);
        if (standingLpns < 4) errorReasons.push(`Thiếu LPN đứng (${standingLpns}/4)`);
      }
      if (!isRoofOk) {
        if (roofSkus < 2) errorReasons.push(`Thiếu SKU nóc (${roofSkus}/2)`);
        if (roofLpns < 1) errorReasons.push(`Thiếu LPN nóc (${roofLpns}/1)`);
      }

      const topLpnCode = pallet.roof?.standardLpn || pallet.roof?.lpns?.[0]?.code || 'CHƯA_CÓ_LPN';
      if (!topLpnGroup[topLpnCode]) {
        topLpnGroup[topLpnCode] = { count: 0, palletIndices: [] };
      }
      topLpnGroup[topLpnCode].count += 1;
      topLpnGroup[topLpnCode].palletIndices.push(pIdx);
    } else {
      // Pallet 4 kiện tiêu chuẩn: Cần 8 SKU và 4 LPN
      isPalletComplete = isStandingOk;
      if (!isStandingOk) {
        if (standingSkus < 8) errorReasons.push(`Thiếu SKU đứng (${standingSkus}/8)`);
        if (standingLpns < 4) errorReasons.push(`Thiếu LPN đứng (${standingLpns}/4)`);
      }
    }

    if (!isPalletComplete) {
      palletErrors.push({
        palletIndex: pIdx,
        palletId: pallet.palletId,
        hasRoof,
        isTwoBoxPallet,
        currentSkus: standingSkus + roofSkus,
        expectedSkus: hasRoof ? 10 : (isTwoBoxPallet ? 4 : 8),
        currentLpns: standingLpns + roofLpns,
        expectedLpns: hasRoof ? 5 : (isTwoBoxPallet ? 2 : 4),
        details: errorReasons.join(', ') || 'Chưa đủ số lượng mã'
      });
    }
  });

  // Kiểm tra số chẵn / lẻ của Kiện Top Nóc theo từng mã LPN
  const oddEntries = [];
  const evenEntries = [];

  Object.entries(topLpnGroup).forEach(([lpnCode, info]) => {
    if (info.count % 2 === 0) {
      evenEntries.push({
        lpnCode,
        count: info.count,
        palletIndices: info.palletIndices
      });
    } else {
      oddEntries.push({
        lpnCode,
        count: info.count,
        palletIndices: info.palletIndices
      });
    }
  });

  // Quy chuẩn ghép kiện nóc: Nếu có các mã lẻ (ví dụ 1 kiện lẻ + 3 kiện lẻ = 4 kiện chẵn)
  // mà tổng số kiện lẻ gộp lại là số CHẴN, thì vẫn đủ cặp ghép trên container, KHÔNG BÁO LỖI!
  const totalOddBoxes = oddEntries.reduce((sum, item) => sum + item.count, 0);
  const isOddCombinedEven = (oddEntries.length > 0) && (totalOddBoxes % 2 === 0);

  const oddTopLpnErrors = isOddCombinedEven ? [] : oddEntries;
  const pairedOddLpns = isOddCombinedEven ? oddEntries : [];

  const isValid = palletErrors.length === 0 && oddTopLpnErrors.length === 0;

  return {
    isValid,
    totalPalletsChecked: pallets.length,
    palletErrors,
    oddTopLpnErrors,
    validTopLpns: evenEntries,
    pairedOddLpns,
    isOddCombinedEven,
    totalOddBoxes,
    topLpnGroup,
    twoBoxPalletIndices,
    hasTwoBoxPallet: twoBoxPalletIndices.length > 0
  };
};

export default function ContainerScanListView() {
  const outletContext = useOutletContext() || {};
  const setCustomTitle = outletContext.setCustomTitle || (() => {});
  const setCustomSubtitle = outletContext.setCustomSubtitle || (() => {});
  const setCustomScreenCode = outletContext.setCustomScreenCode || (() => {});
  const setHeaderRightExtra = outletContext.setHeaderRightExtra || (() => {});

  const screenMeta = useScreenMetadataCached('/admin/pallet-check');
  const navigate = useNavigate();
  const { showToast } = useToast();

  const user = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const isAdmin = user.role_name === 'IT' || user.role_name === 'BGD' || user.username === 'admin';

  // State danh sách và KPI
  const [containers, setContainers] = useState([]);
  const [stats, setStats] = useState({
    totalContainers: 0,
    validContainers: 0,
    warningContainers: 0,
    totalPallets: 0,
    totalBoxes: 0,
    totalScans: 0
  });
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Bộ lọc & Sắp xếp & Phân trang chuẩn LPN Crawler
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, valid, warning
  const [inspectorFilter, setInspectorFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortOption, setSortOption] = useState('date-desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // UI Toolbar Popovers & Selection
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Modals state
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', inspector: '' });
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState(null);

  // Pallet inline edit trong modal chi tiết
  const [editingPalletIndex, setEditingPalletIndex] = useState(null);
  const [palletEditData, setPalletEditData] = useState({
    standingSkus: Array(8).fill(''),
    standingLpns: Array(4).fill(''),
    roofSkus: Array(2).fill(''),
    roofLpns: [''],
    hasRoof: false
  });
  const [expandedPalletIndex, setExpandedPalletIndex] = useState(null);

  // Print Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printContainerData, setPrintContainerData] = useState(null);

  // Đồng bộ Tiêu đề Top Header từ Screen Metadata (CW03)
  useEffect(() => {
    setCustomTitle(screenMeta.title || 'Quét Cont');
    setCustomSubtitle(screenMeta.subtitle || 'Công cụ quản lý & kiểm định dữ liệu quét Container');
    setCustomScreenCode(screenMeta.screenCode || 'CW03');
    return () => {
      setCustomTitle(null);
      setCustomSubtitle(null);
      setCustomScreenCode(null);
    };
  }, [screenMeta.title, screenMeta.subtitle, screenMeta.screenCode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.lpn-sort-container')) {
        setShowSortDropdown(false);
      }
      if (!event.target.closest('.lpn-other-container')) {
        setIsOtherDropdownOpen(false);
      }
      if (!event.target.closest('.lpn-export-container')) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tải dữ liệu từ Backend
  const loadData = useCallback(async (showSyncToast = false) => {
    setLoading(true);
    if (showSyncToast) setIsSyncing(true);
    try {
      const [contRes, statsRes] = await Promise.all([
        containerScanService.getContainers({ limit: 500 }),
        containerScanService.getStats()
      ]);

      if (contRes && contRes.data) {
        setContainers(contRes.data || []);
      }
      if (statsRes && statsRes.data) {
        setStats(statsRes.data);
      }
      if (showSyncToast && showToast?.success) {
        showToast.success('Đã đồng bộ dữ liệu Quét Container mới nhất!');
      }
    } catch (err) {
      console.error('Failed to load container scan data:', err);
      if (showToast?.error) {
        showToast.error('Không thể tải danh sách Container từ máy chủ: ' + (err.message || 'Lỗi mạng'));
      }
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Danh sách người kiểm duy nhất để lọc
  const distinctInspectors = useMemo(() => {
    const set = new Set();
    (containers || []).forEach(c => {
      if (c.inspector && c.inspector.trim()) {
        set.add(c.inspector.trim());
      }
    });
    return Array.from(set);
  }, [containers]);

  // Lọc và Sắp xếp dữ liệu hiển thị trên bảng
  const filteredContainers = useMemo(() => {
    const list = (containers || []).filter((item) => {
      // 1. Lọc theo từ khóa nhanh (Tên Cont, Mã Cont, Người kiểm, hoặc mã SKU / LPN bên trong Pallet)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (item.name || '').toLowerCase().includes(q);
        const matchId = (item.id || '').toLowerCase().includes(q);
        const matchInspector = (item.inspector || '').toLowerCase().includes(q);
        const matchPalletCode = (item.pallets || []).some(p => {
          const stSku = (p.standing?.standardSku || '').toLowerCase().includes(q);
          const stLpn = (p.standing?.standardLpn || '').toLowerCase().includes(q);
          const rfSku = (p.roof?.standardSku || '').toLowerCase().includes(q);
          const rfLpn = (p.roof?.standardLpn || '').toLowerCase().includes(q);
          const anyStSku = (p.standing?.skus || []).some(s => (s.code || '').toLowerCase().includes(q));
          const anyStLpn = (p.standing?.lpns || []).some(l => (l.code || '').toLowerCase().includes(q));
          return stSku || stLpn || rfSku || rfLpn || anyStSku || anyStLpn;
        });
        if (!matchName && !matchId && !matchInspector && !matchPalletCode) return false;
      }

      // 2. Lọc theo trạng thái
      if (statusFilter === 'valid') {
        if (!item.isValid) return false;
      } else if (statusFilter === 'warning') {
        if (item.isValid) return false;
      }

      // 3. Lọc theo người kiểm
      if (inspectorFilter.trim()) {
        if ((item.inspector || '').toLowerCase() !== inspectorFilter.trim().toLowerCase()) {
          return false;
        }
      }

      // 4. Lọc theo ngày
      if (dateFilter.trim()) {
        const timeStr = (item.completedAt || item.createdAt || '').toLowerCase();
        // dateFilter format YYYY-MM-DD -> check both YYYY-MM-DD and DD/MM/YYYY or D/M/YYYY
        const parts = dateFilter.split('-');
        if (parts.length === 3) {
          const [yyyy, mm, dd] = parts;
          const dmyZero = `${dd}/${mm}/${yyyy}`;
          const dmyNoZero = `${Number(dd)}/${Number(mm)}/${yyyy}`;
          if (!timeStr.includes(dateFilter) && !timeStr.includes(dmyZero) && !timeStr.includes(dmyNoZero)) {
            return false;
          }
        }
      }

      return true;
    });

    // Sắp xếp
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sortOption === 'name-asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortOption === 'name-desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortOption === 'pallets-desc') {
        return (b.totalPallets || 0) - (a.totalPallets || 0);
      }
      if (sortOption === 'boxes-desc') {
        return (b.totalBoxes || 0) - (a.totalBoxes || 0);
      }
      if (sortOption === 'date-asc') {
        return String(a.id || '').localeCompare(String(b.id || ''));
      }
      // Mặc định: mới nhất lên đầu
      return String(b.id || '').localeCompare(String(a.id || ''));
    });

    return sorted;
  }, [containers, searchQuery, statusFilter, inspectorFilter, dateFilter, sortOption]);

  // Reset về trang 1 khi thay đổi bộ lọc
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, inspectorFilter, dateFilter, sortOption, pageSize]);

  // Phân trang dữ liệu
  const effectivePageSize = pageSize === 'all' ? (filteredContainers.length || 1000) : Number(pageSize || 15);
  const totalItems = filteredContainers.length;
  const totalPages = Math.ceil(totalItems / effectivePageSize) || 1;
  const startIdx = totalItems > 0 ? (page - 1) * effectivePageSize + 1 : 0;
  const endIdx = totalItems > 0 ? Math.min(page * effectivePageSize, totalItems) : 0;

  const paginatedContainers = useMemo(() => {
    if (pageSize === 'all') return filteredContainers;
    const start = (page - 1) * effectivePageSize;
    return filteredContainers.slice(start, start + effectivePageSize);
  }, [filteredContainers, page, effectivePageSize, pageSize]);

  // Chọn dòng Checkbox
  const currentPageIds = useMemo(() => paginatedContainers.map(c => c.id), [paginatedContainers]);
  const isAllCurrentPageSelected = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.includes(id));

  const handleToggleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleToggleSelectAll = () => {
    if (isAllCurrentPageSelected) {
      setSelectedIds(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  // Xóa hàng loạt các Container đã chọn
  const handleConfirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => containerScanService.deleteContainer(id)));
      if (showToast?.success) {
        showToast.success(`Đã xóa ${selectedIds.length} Container thành công!`);
      }
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
      loadData(false);
    } catch (err) {
      console.error('Batch delete error:', err);
      if (showToast?.error) {
        showToast.error('Lỗi khi xóa hàng loạt: ' + err.message);
      }
    }
  };

  // Đếm số bộ lọc đang kích hoạt
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (searchQuery.trim()) chips.push({ key: 'search', label: 'Tìm kiếm', value: searchQuery.trim() });
    if (statusFilter !== 'all') {
      chips.push({
        key: 'status',
        label: 'Trạng thái',
        value: statusFilter === 'valid' ? 'Đạt chuẩn (100%)' : 'Báo đỏ vi phạm'
      });
    }
    if (inspectorFilter.trim()) chips.push({ key: 'inspector', label: 'Người kiểm', value: inspectorFilter });
    if (dateFilter.trim()) chips.push({ key: 'date', label: 'Ngày quét', value: dateFilter });
    return chips;
  }, [searchQuery, statusFilter, inspectorFilter, dateFilter]);

  const handleClearSingleFilter = (key) => {
    if (key === 'search') setSearchQuery('');
    if (key === 'status') setStatusFilter('all');
    if (key === 'inspector') setInspectorFilter('');
    if (key === 'date') setDateFilter('');
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setInspectorFilter('');
    setDateFilter('');
    setSortOption('date-desc');
  };

  const getPageButtons = () => {
    const btns = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) btns.push(i);
    } else {
      btns.push(1);
      if (page > 3) btns.push('...');
      const rStart = Math.max(2, page - 1);
      const rEnd = Math.min(totalPages - 1, page + 1);
      for (let i = rStart; i <= rEnd; i++) btns.push(i);
      if (page < totalPages - 2) btns.push('...');
      btns.push(totalPages);
    }
    return btns;
  };

  const sortOptionsList = [
    { value: 'date-desc', label: 'Mặc định (Thời gian mới nhất)' },
    { value: 'date-asc', label: 'Thời gian quét cũ nhất' },
    { value: 'name-asc', label: 'Số Container: A → Z' },
    { value: 'name-desc', label: 'Số Container: Z → A' },
    { value: 'pallets-desc', label: 'Số lượng Pallet: Cao → Thấp' },
    { value: 'boxes-desc', label: 'Số lượng Kiện: Cao → Thấp' }
  ];

  // Mở modal xem chi tiết
  const handleOpenDetail = useCallback(async (cont) => {
    try {
      // Tải chi tiết mới nhất từ server
      const res = await containerScanService.getContainerDetail(cont.id);
      if (res && res.data) {
        setSelectedContainer(res.data);
      } else {
        setSelectedContainer(cont);
      }
    } catch (e) {
      setSelectedContainer(cont);
    }
    setEditingPalletIndex(null);
    setExpandedPalletIndex(null);
    setIsDetailModalOpen(true);
  }, []);

  // Mở modal sửa thông tin Container
  const handleOpenEditContainer = (cont, e) => {
    if (e) e.stopPropagation();
    setSelectedContainer(cont);
    setEditFormData({
      name: cont.name || '',
      inspector: cont.inspector || ''
    });
    setIsEditModalOpen(true);
  };

  // Lưu sửa Container Info
  const handleSaveContainerInfo = async () => {
    if (!selectedContainer) return;
    try {
      const res = await containerScanService.updateContainer(selectedContainer.id, {
        name: editFormData.name.trim(),
        inspector: editFormData.inspector.trim()
      });
      if (res && res.data) {
        if (showToast?.success) showToast.success(`Đã cập nhật thông tin Cont [${selectedContainer.id}]!`);
        setIsEditModalOpen(false);
        loadData();
        if (isDetailModalOpen) {
          setSelectedContainer(res.data);
        }
      }
    } catch (err) {
      console.error('Error updating container info:', err);
      if (showToast?.error) showToast.error('Lỗi khi cập nhật thông tin: ' + err.message);
    }
  };

  // Mở modal xác nhận xóa
  const handleOpenDelete = (cont, e) => {
    if (e) e.stopPropagation();
    setContainerToDelete(cont);
    setIsDeleteModalOpen(true);
  };

  // Xác nhận xóa
  const handleConfirmDelete = async () => {
    if (!containerToDelete) return;
    try {
      await containerScanService.deleteContainer(containerToDelete.id);
      if (showToast?.success) showToast.success(`Đã xóa Container [${containerToDelete.id}] thành công!`);
      setIsDeleteModalOpen(false);
      setContainerToDelete(null);
      if (isDetailModalOpen && selectedContainer?.id === containerToDelete.id) {
        setIsDetailModalOpen(false);
      }
      loadData();
    } catch (err) {
      console.error('Error deleting container:', err);
      if (showToast?.error) showToast.error('Không thể xóa Container: ' + err.message);
    }
  };

  // Bắt đầu sửa chi tiết 8 SKU & 4 LPN đứng + Kiện nóc của một Pallet
  const handleStartEditPallet = (p) => {
    setEditingPalletIndex(p.palletIndex);

    // Chuẩn bị 8 ô SKU đứng (ưu tiên lấy từng mã tem đã quét, fallback về standardSku)
    const defaultSku = p.standing?.standardSku || p.standing?.skus?.[0]?.code || '';
    const stSkus = [];
    for (let i = 0; i < 8; i++) {
      stSkus.push(p.standing?.skus?.[i]?.code || defaultSku);
    }

    // Chuẩn bị 4 ô LPN đứng
    const defaultLpn = p.standing?.standardLpn || p.standing?.lpns?.[0]?.code || '';
    const stLpns = [];
    for (let i = 0; i < 4; i++) {
      stLpns.push(p.standing?.lpns?.[i]?.code || defaultLpn);
    }

    // Chuẩn bị 2 ô SKU nóc
    const defaultRfSku = p.roof?.standardSku || p.roof?.skus?.[0]?.code || '';
    const rfSkus = [];
    for (let i = 0; i < 2; i++) {
      rfSkus.push(p.roof?.skus?.[i]?.code || defaultRfSku);
    }

    // Chuẩn bị 1 ô LPN nóc
    const defaultRfLpn = p.roof?.standardLpn || p.roof?.lpns?.[0]?.code || '';
    const rfLpns = [
      p.roof?.lpns?.[0]?.code || defaultRfLpn
    ];

    const hasRoof = Boolean(p.roof?.hasRoof) || (p.roof?.skus?.length > 0 || p.roof?.lpns?.length > 0 || Boolean(p.roof?.standardLpn));

    setPalletEditData({
      standingSkus: stSkus,
      standingLpns: stLpns,
      roofSkus: rfSkus,
      roofLpns: rfLpns,
      hasRoof: hasRoof
    });
  };

  // Lưu sửa Pallet trực tiếp và re-validate kiểm định
  const handleSavePalletEdit = async () => {
    if (!selectedContainer || editingPalletIndex === null) return;
    try {
      const updatedPallets = (selectedContainer.pallets || []).map((p) => {
        if (p.palletIndex !== editingPalletIndex) return p;

        // Chuẩn hóa 8 SKU đứng
        const cleanStSkus = palletEditData.standingSkus
          .map((code, idx) => ({
            id: p.standing?.skus?.[idx]?.id || Date.now() + Math.random(),
            code: (code || '').trim(),
            time: p.standing?.skus?.[idx]?.time || new Date().toLocaleTimeString('vi-VN')
          }))
          .filter(s => s.code);

        // Chuẩn hóa 4 LPN đứng
        const cleanStLpns = palletEditData.standingLpns
          .map((code, idx) => ({
            id: p.standing?.lpns?.[idx]?.id || Date.now() + Math.random(),
            code: (code || '').trim(),
            time: p.standing?.lpns?.[idx]?.time || new Date().toLocaleTimeString('vi-VN')
          }))
          .filter(l => l.code);

        const hasRoof = Boolean(palletEditData.hasRoof);
        let cleanRfSkus = [];
        let cleanRfLpns = [];

        if (hasRoof) {
          cleanRfSkus = palletEditData.roofSkus
            .map((code, idx) => ({
              id: p.roof?.skus?.[idx]?.id || Date.now() + Math.random(),
              code: (code || '').trim(),
              time: p.roof?.skus?.[idx]?.time || new Date().toLocaleTimeString('vi-VN')
            }))
            .filter(s => s.code);

          cleanRfLpns = palletEditData.roofLpns
            .map((code, idx) => ({
              id: p.roof?.lpns?.[idx]?.id || Date.now() + Math.random(),
              code: (code || '').trim(),
              time: p.roof?.lpns?.[idx]?.time || new Date().toLocaleTimeString('vi-VN')
            }))
            .filter(l => l.code);
        }

        const newStanding = {
          skus: cleanStSkus,
          lpns: cleanStLpns,
          standardSku: cleanStSkus[0]?.code || '',
          standardLpn: cleanStLpns[0]?.code || ''
        };

        const newRoof = {
          hasRoof: hasRoof,
          skus: cleanRfSkus,
          lpns: cleanRfLpns,
          standardSku: cleanRfSkus[0]?.code || '',
          standardLpn: cleanRfLpns[0]?.code || ''
        };

        const totalScans = cleanStSkus.length + cleanStLpns.length + cleanRfSkus.length + cleanRfLpns.length;
        const isTwoBox = !hasRoof && cleanStSkus.length === 4 && cleanStLpns.length === 2;
        const isPass = ((cleanStSkus.length === 8 && cleanStLpns.length === 4) && (!hasRoof || (cleanRfSkus.length === 2 && cleanRfLpns.length === 1))) || isTwoBox;

        return {
          ...p,
          standing: newStanding,
          roof: newRoof,
          totalScans: totalScans,
          status: isPass ? 'pass' : 'warning'
        };
      });

      // Tự động kiểm định lại tiêu chuẩn
      const newAuditResult = validateContainerRules(updatedPallets);

      // Đồng bộ trạng thái từng Pallet theo kết quả kiểm định Container
      const finalPallets = updatedPallets.map(p => ({
        ...p,
        status: newAuditResult.palletErrors.some(e => e.palletIndex === p.palletIndex) ? 'warning' : 'pass'
      }));

      // Gửi PUT lên backend
      const res = await containerScanService.updateContainer(selectedContainer.id, {
        pallets: finalPallets,
        auditResult: newAuditResult,
        status: newAuditResult.isValid ? 'completed' : 'warning'
      });

      if (res && res.data) {
        if (showToast?.success) showToast.success(`Đã cập nhật đầy đủ 8 SKU & 4 LPN Pallet #${editingPalletIndex} và tái thẩm định!`);
        setSelectedContainer(res.data);
        setEditingPalletIndex(null);
        loadData();
      }
    } catch (err) {
      console.error('Error saving pallet edit:', err);
      if (showToast?.error) showToast.error('Lỗi cập nhật pallet: ' + err.message);
    }
  };

  // Xuất file Excel bảng Container tổng quan
  const handleExportAllExcel = () => {
    try {
      const rows = filteredContainers.map((c, idx) => ({
        'STT': idx + 1,
        'Mã Container': c.id,
        'Tên Container': c.name,
        'Số Pallet': c.totalPallets,
        'Ước tính Kiện': c.totalBoxes,
        'Tổng tia quét': c.totalScans,
        'Người kiểm tra': c.inspector,
        'Thời gian': c.completedAt || c.createdAt,
        'Trạng thái': c.isValid ? 'HỢP LỆ' : 'BÁO ĐỎ VI PHẠM'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Danh sách Quét Cont');
      XLSX.writeFile(wb, `SmartFlow_Danh_Sach_Quet_Cont_${new Date().toISOString().slice(0, 10)}.xlsx`);
      if (showToast?.success) showToast.success('Đã xuất báo cáo Excel thành công!');
    } catch (err) {
      console.error('Export excel error:', err);
      if (showToast?.error) showToast.error('Lỗi xuất file Excel: ' + err.message);
    }
  };

  // Xuất file Excel chi tiết một Container
  const handleExportContainerDetailExcel = (cont) => {
    try {
      const pallets = cont.pallets || [];
      const rows = pallets.map((p) => ({
        'Số thứ tự': `Pallet #${p.palletIndex}`,
        'Mã Pallet': p.palletId,
        'SKU Đứng': p.standing?.standardSku || '',
        'LPN Đứng': p.standing?.standardLpn || '',
        'Số tia Đứng': (p.standing?.skus?.length || 0) + (p.standing?.lpns?.length || 0),
        'Có kiện nóc': (p.roof?.hasRoof || (p.roof?.skus?.length > 0)) ? 'CÓ' : 'KHÔNG',
        'SKU Nóc': p.roof?.standardSku || '',
        'LPN Nóc': p.roof?.standardLpn || '',
        'Số tia Nóc': (p.roof?.skus?.length || 0) + (p.roof?.lpns?.length || 0),
        'Trạng thái Pallet': p.status === 'pass' ? 'ĐẠT' : 'CẢNH BÁO'
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Chi tiết ${cont.name}`);
      XLSX.writeFile(wb, `SmartFlow_ChiTiet_${cont.name}_${cont.id}.xlsx`);
      if (showToast?.success) showToast.success(`Đã xuất Excel chi tiết cho Cont [${cont.name}]!`);
    } catch (err) {
      console.error('Export container excel error:', err);
      if (showToast?.error) showToast.error('Lỗi xuất Excel: ' + err.message);
    }
  };

  // Mở popup in Container
  const handleOpenPrint = (cont, e) => {
    if (e) e.stopPropagation();
    setPrintContainerData(cont);
    setIsPrintModalOpen(true);
  };

  // In qua browser window.print()
  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="lpn-container">
      {/* 1. CONTROL PANEL (4 KPI SUMMARY CARDS + UNIFIED TOOLBAR) */}
      <div className="lpn-control-panel-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
        {/* 1.1 BỘ 4 KPI CARDS CHUẨN SMARTFLOW / LPN CRAWLER */}
        <div className="lpn-metrics-row">
          {/* KPI 1: Số lượng Container */}
          <div
            className="lpn-summary-card"
            onClick={() => setStatusFilter('all')}
            style={{
              cursor: 'pointer',
              border: statusFilter === 'all' ? '1.5px solid #7B5233' : '1px solid #EADCC9',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            title="Bấm để xem tất cả Container"
          >
            <div className="lpn-card-info">
              <span className="lpn-card-label">Số lượng Container</span>
              <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#8D6E63', fontWeight: '600' }}>
                (Tất cả phiên quét)
              </span>
            </div>
            <span className="lpn-card-number">{Number(stats.totalContainers || 0).toLocaleString()}</span>
          </div>

          {/* KPI 2: Số lượng Pallet/Box */}
          <div className="lpn-summary-card">
            <div className="lpn-card-info">
              <span className="lpn-card-label" style={{ color: '#0369A1' }}>Số lượng Pallet / Kiện</span>
              <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#0284C7', fontWeight: '600' }}>
                ({Number(stats.totalScans || 0).toLocaleString()} tia đã quét)
              </span>
            </div>
            <span className="lpn-card-number" style={{ color: '#0369A1' }}>
              {Number(stats.totalPallets || 0).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748B' }}>/</span> {Number(stats.totalBoxes || 0).toLocaleString()}
            </span>
          </div>

          {/* KPI 3: Container đạt chuẩn */}
          <div
            className="lpn-summary-card"
            onClick={() => setStatusFilter(statusFilter === 'valid' ? 'all' : 'valid')}
            style={{
              cursor: 'pointer',
              backgroundColor: statusFilter === 'valid' ? '#ECFDF5' : '#FFFFFF',
              border: statusFilter === 'valid' ? '1.5px solid #10B981' : '1px solid #EADCC9',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            title="Bấm để lọc các Container đạt chuẩn 100%"
          >
            <div className="lpn-card-info">
              <span className="lpn-card-label" style={{ color: '#15803D' }}>Container đạt chuẩn</span>
              <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: '600' }}>
                (100% Hợp lệ tiêu chuẩn)
              </span>
            </div>
            <span className="lpn-card-number" style={{ color: '#15803D' }}>
              {Number(stats.validContainers || 0).toLocaleString()}
            </span>
          </div>

          {/* KPI 4: Số Container vi phạm / thiếu mã */}
          <div
            className="lpn-summary-card"
            onClick={() => setStatusFilter(statusFilter === 'warning' ? 'all' : 'warning')}
            style={{
              cursor: 'pointer',
              backgroundColor: (stats.warningContainers > 0 || statusFilter === 'warning') ? '#FEF2F2' : '#FFFFFF',
              border: `1.5px solid ${(stats.warningContainers > 0 || statusFilter === 'warning') ? '#FCA5A5' : '#EADCC9'}`,
              transition: 'border-color 0.2s, box-shadow 0.2s',
              position: 'relative'
            }}
            title="Bấm để lọc các Container đang bị Báo đỏ vi phạm tiêu chuẩn"
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#EF4444';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = (stats.warningContainers > 0 || statusFilter === 'warning') ? '#FCA5A5' : '#EADCC9';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(123, 82, 51, 0.04)';
            }}
          >
            <div className="lpn-card-info">
              <span className="lpn-card-label" style={{ color: '#DC2626', fontWeight: '800' }}>
                Số Container vi phạm / thiếu mã
              </span>
              <span className="lpn-card-subtext" style={{ fontSize: '0.68rem', color: '#DC2626', fontWeight: '600' }}>
                (Cần kiểm tra & xử lý)
              </span>
            </div>
            <span className="lpn-card-number" style={{ color: '#DC2626', fontWeight: '900' }}>
              {Number(stats.warningContainers || 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* 1.2 TOOLBAR + INTEGRATED EXPANDABLE FILTER BAR */}
        <div
          className="mgmt-toolbar card"
          style={{
            margin: 0,
            flexShrink: 0,
            padding: isFilterBarOpen ? '6px 14px 8px 14px' : '6px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: isFilterBarOpen ? '6px' : '0',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #EADCC9',
            boxSizing: 'border-box',
            transition: 'all 0.2s ease'
          }}
        >
          <div className="lpn-toolbar-main-row">
            {/* Left Side: Search + Sort (A↓Z) + Filter (Funnel) */}
            <div className="lpn-toolbar-left">
              <div className="search-wrapper" style={{ margin: 0, height: '36px' }}>
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search nhanh Container, Mã phiên, Người kiểm, LPN, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8D6E63',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '2px'
                    }}
                    title="Xóa từ khóa"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Sort Button (A↓Z) */}
              <div className="lpn-sort-container lpn-desktop-only" style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSortDropdown(!showSortDropdown);
                    setIsOtherDropdownOpen(false);
                    setIsExportDropdownOpen(false);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: sortOption !== 'date-desc' ? '#7B5233' : '#8D6E63',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '36px',
                    outline: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  title="Sắp xếp danh sách"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="15" y1="4" x2="15" y2="20" />
                    <polyline points="11 16 15 20 19 16" />
                    <text x="3" y="10" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">A</text>
                    <text x="3" y="20" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="currentColor">Z</text>
                  </svg>
                </button>

                {showSortDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '40px',
                      left: 0,
                      zIndex: 1000,
                      background: '#fff',
                      border: '1px solid #EADCC9',
                      borderRadius: '10px',
                      boxShadow: '0 8px 24px rgba(123,82,51,0.12)',
                      padding: '6px 0',
                      minWidth: '220px',
                      animation: 'fadeIn 0.15s ease'
                    }}
                  >
                    {sortOptionsList.map((item) => (
                      <div
                        key={item.value}
                        onClick={() => {
                          setSortOption(item.value);
                          setShowSortDropdown(false);
                        }}
                        style={{
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '0.82rem',
                          fontWeight: sortOption === item.value ? '700' : '500',
                          color: sortOption === item.value ? '#7B5233' : '#5D4037',
                          backgroundColor: sortOption === item.value ? '#FAF6F0' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF6F0')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = sortOption === item.value ? '#FAF6F0' : 'transparent')}
                      >
                        {item.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter Funnel Icon Button */}
              <div className="lpn-desktop-only" style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  type="button"
                  onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: isFilterBarOpen || activeFilterChips.length > 0 ? '#7B5233' : '#8D6E63',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '36px',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  title="Bộ lọc nâng cao"
                >
                  <Filter size={20} strokeWidth={2.5} />
                  {activeFilterChips.length > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        backgroundColor: '#7B5233',
                        color: '#FFFFFF',
                        borderRadius: '50%',
                        width: '14px',
                        height: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.6rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {activeFilterChips.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Right Side Actions: Mở Mobile App, Khác, Xuất dữ liệu, Đồng bộ */}
            <div className="lpn-toolbar-right">
              {/* Nút Mở Mobile App (/pallet-check-v1) */}
              <a
                href="/pallet-check-v1"
                target="_blank"
                rel="noopener noreferrer"
                className="lpn-desktop-only"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '34px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  textDecoration: 'none',
                  boxShadow: '0 2px 5px rgba(217, 119, 6, 0.3)',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
                title="Mở giao diện Mobile App /pallet-check-v1 để bắn mã vạch"
              >
                <Barcode size={14} />
                <span>Mở Mobile App</span>
                <ExternalLink size={12} />
              </a>

              {/* Nút Khác (Dropdown) */}
              <div className="lpn-other-container" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOtherDropdownOpen(!isOtherDropdownOpen);
                    setIsExportDropdownOpen(false);
                    setShowSortDropdown(false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    backgroundColor: '#4A2E1B',
                    color: '#FFFFFF',
                    border: 'none',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                    <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                    <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                    <rect x="3" y="14" width="7" height="7" rx="1"></rect>
                  </svg>
                  <span>Khác</span>
                  {selectedIds.length > 0 && (
                    <span
                      style={{
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '0.68rem',
                        fontWeight: '800'
                      }}
                    >
                      {selectedIds.length}
                    </span>
                  )}
                </button>

                {isOtherDropdownOpen && (
                  <div
                    className="actions-dropdown-menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #EADCC9',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
                      minWidth: '230px',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '6px 0',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      animation: 'slideDown 0.2s ease forwards'
                    }}
                  >
                    <button
                      type="button"
                      className="import-dropdown-item"
                      onClick={() => {
                        setIsOtherDropdownOpen(false);
                        setIsFilterBarOpen(!isFilterBarOpen);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: '#2D1A12'
                      }}
                    >
                      <Filter size={14} color="#7B5233" />
                      <span>{isFilterBarOpen ? 'Ẩn thanh bộ lọc' : 'Mở bộ lọc nâng cao'}</span>
                    </button>

                    <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }} />

                    <button
                      type="button"
                      className="import-dropdown-item"
                      onClick={() => {
                        setIsOtherDropdownOpen(false);
                        window.open('/pallet-check-v1', '_blank');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: '#2D1A12'
                      }}
                    >
                      <Barcode size={14} color="#D97706" />
                      <span>Mở ứng dụng Quét Mobile</span>
                    </button>

                    {isAdmin && selectedIds.length > 0 && (
                      <>
                        <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }} />
                        <button
                          type="button"
                          className="import-dropdown-item"
                          onClick={() => {
                            setIsOtherDropdownOpen(false);
                            setIsBatchDeleteModalOpen(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            width: '100%',
                            padding: '10px 16px',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            color: '#DC2626'
                          }}
                        >
                          <Trash2 size={14} color="#DC2626" />
                          <span>Xóa các mục đã chọn ({selectedIds.length})</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Nút Xuất dữ liệu (Dropdown) */}
              <div className="lpn-export-container lpn-desktop-only" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExportDropdownOpen(!isExportDropdownOpen);
                    setIsOtherDropdownOpen(false);
                    setShowSortDropdown(false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    height: '34px',
                    padding: '0 14px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    backgroundColor: '#4A2E1B',
                    color: '#FFFFFF',
                    border: 'none',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <span>Xuất dữ liệu</span>
                </button>
                {isExportDropdownOpen && (
                  <div
                    className="actions-dropdown-menu"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #EADCC9',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)',
                      minWidth: '210px',
                      zIndex: 1000,
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '6px 0',
                      overflow: 'hidden',
                      animation: 'slideDown 0.2s ease forwards'
                    }}
                  >
                    <button
                      type="button"
                      className="import-dropdown-item"
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportAllExcel();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%',
                        padding: '10px 16px',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        color: '#2D1A12'
                      }}
                    >
                      <FileSpreadsheet size={14} color="#15803D" />
                      <span>Xuất Excel danh sách Cont</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Nút Đồng bộ (Sync) */}
              <div className="lpn-sync-container" style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => loadData(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '34px',
                    padding: '0 16px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    backgroundColor: isSyncing ? '#16A34A' : '#4A2E1B',
                    color: '#FFFFFF',
                    border: isSyncing ? '1px solid #15803D' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                  title="Đồng bộ dữ liệu mới nhất từ ứng dụng Mobile (/pallet-check-v1)"
                >
                  <RefreshCw
                    size={14}
                    strokeWidth={2.5}
                    style={isSyncing || loading ? { animation: 'spin 1.5s linear infinite' } : {}}
                  />
                  <span>{isSyncing ? 'Đang đồng bộ' : 'Đồng bộ'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 1.3 EXPANDABLE FILTER BAR — INTEGRATED DIRECTLY INSIDE TOOLBAR CARD */}
          {isFilterBarOpen && (
            <div
              style={{
                width: '100%',
                paddingTop: '8px',
                borderTop: '1px solid #F0E6D8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Lọc Trạng thái */}
                <div style={{ display: ' inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#5D4037' }}>Trạng thái:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #D5C7B7',
                      fontSize: '0.8rem',
                      color: '#2D1A12',
                      backgroundColor: '#FAF8F6',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="valid">✓ Đạt chuẩn (100% Hợp lệ)</option>
                    <option value="warning">✕ Báo đỏ vi phạm</option>
                  </select>
                </div>

                {/* Lọc Người kiểm */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#5D4037' }}>Người kiểm:</span>
                  <select
                    value={inspectorFilter}
                    onChange={(e) => setInspectorFilter(e.target.value)}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #D5C7B7',
                      fontSize: '0.8rem',
                      color: '#2D1A12',
                      backgroundColor: '#FAF8F6',
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  >
                    <option value="">Tất cả người kiểm</option>
                    {distinctInspectors.map(insp => (
                      <option key={insp} value={insp}>{insp}</option>
                    ))}
                  </select>
                </div>

                {/* Lọc Ngày quét */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#5D4037' }}>Ngày quét:</span>
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    style={{
                      height: '30px',
                      padding: '0 10px',
                      borderRadius: '6px',
                      border: '1px solid #D5C7B7',
                      fontSize: '0.8rem',
                      color: '#2D1A12',
                      backgroundColor: '#FAF8F6',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Số dòng / trang */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: '#5D4037' }}>Hiển thị:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{
                    height: '30px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: '1px solid #D5C7B7',
                    fontSize: '0.8rem',
                    color: '#7B5233',
                    backgroundColor: '#FAF6F0',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                >
                  <option value={15}>15 dòng / trang</option>
                  <option value={30}>30 dòng / trang</option>
                  <option value={50}>50 dòng / trang</option>
                  <option value={100}>100 dòng / trang</option>
                  <option value="all">Tất cả ({filteredContainers.length})</option>
                </select>
              </div>
            </div>
          )}

          {/* 1.4 ACTIVE FILTER CHIPS BAR */}
          {activeFilterChips.length > 0 && (
            <div
              style={{
                width: '100%',
                paddingTop: '6px',
                marginTop: '2px',
                borderTop: '1px dashed #F0E6D8',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>Đang lọc:</span>
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.key}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1px solid #EADCC9',
                    borderRadius: '14px',
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    fontWeight: '600'
                  }}
                >
                  <span>{chip.label}: {chip.value}</span>
                  <button
                    type="button"
                    onClick={() => handleClearSingleFilter(chip.key)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#8D6E63',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1
                    }}
                    title="Xóa điều kiện này"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={handleResetAllFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#DC2626',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  textDecoration: 'underline'
                }}
              >
                Xóa tất cả lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. MAIN DATA TABLE VIEW + PAGINATION FOOTER (ĐỒNG BỘ 100% VỚI LPN CRAWLER) */}
      <div className="lpn-table-container">
        <div className="lpn-table-scroll" style={{ overflowX: 'auto' }}>
          <table className="lpn-table-claim" style={{ minWidth: '1100px' }}>
            <thead>
              <tr>
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    className="checkbox-custom"
                    checked={isAllCurrentPageSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggleSelectAll();
                    }}
                    title="Chọn tất cả container trên trang này"
                  />
                </th>
                <th style={{ width: '48px', textAlign: 'center' }}>STT</th>
                <th style={{ minWidth: '150px' }}>Số Container</th>
                <th style={{ minWidth: '150px' }}>Mã Phiên</th>
                <th style={{ minWidth: '155px' }}>Timestamp</th>
                <th style={{ minWidth: '130px' }}>Người Kiểm</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Số Pallet</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Số Kiện</th>
                <th style={{ width: '105px', textAlign: 'center' }}>Số Tia Quét</th>
                <th style={{ minWidth: '140px', textAlign: 'center' }}>Trạng Thái</th>
                <th style={{ textAlign: 'center', width: '185px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading && paginatedContainers.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '42px', color: '#8D6E63' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <div className="lpn-spinner-sm" />
                      <span>Đang tải danh sách Container từ CSDL...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedContainers.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '44px', color: '#8D6E63' }}>
                    Không có dữ liệu Container nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedContainers.map((cont, index) => {
                  const isValid = cont.isValid;
                  const isSelected = selectedIds.includes(cont.id);
                  const stt = startIdx + index;
                  const errorCount = (cont.auditResult?.palletErrors?.length || 0) + (cont.auditResult?.oddTopLpnErrors?.length || 0);

                  return (
                    <tr
                      key={cont.id}
                      className={`lpn-row-interactive ${isSelected ? 'row-selected' : ''}`}
                      onClick={() => handleOpenDetail(cont)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Checkbox */}
                      <td
                        style={{ textAlign: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectRow(cont.id);
                        }}
                      >
                        <input
                          type="checkbox"
                          className="checkbox-custom"
                          checked={isSelected}
                          onChange={() => {}}
                        />
                      </td>

                      {/* STT */}
                      <td style={{ textAlign: 'center', color: '#8D6E63', fontWeight: '500' }}>
                        {stt}
                      </td>

                      {/* Số Container */}
                      <td style={{ fontWeight: '700', color: '#4A2E1B', letterSpacing: '0.3px' }}>
                        {cont.name}
                      </td>

                      {/* Mã Phiên */}
                      <td style={{ fontWeight: '600', color: '#7B5233', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {cont.id}
                      </td>

                      {/* Timestamp */}
                      <td style={{ color: '#6D4C41', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {cont.completedAt || cont.createdAt || '—'}
                      </td>

                      {/* Người Kiểm */}
                      <td style={{ color: '#4A2E1B', fontWeight: '600', fontSize: '0.82rem' }}>
                        {cont.inspector || 'Chưa rõ'}
                      </td>

                      {/* Số Pallet */}
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#7B5233' }}>
                        {cont.totalPallets || 0}
                      </td>

                      {/* Số Kiện */}
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#0369A1' }}>
                        {cont.totalBoxes || 0}
                      </td>

                      {/* Số Tia Quét */}
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#15803D' }}>
                        {cont.totalScans || 0}
                      </td>

                      {/* Trạng Thái */}
                      <td style={{ textAlign: 'center' }}>
                        {isValid ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              backgroundColor: '#ECFDF5',
                              color: '#059669',
                              border: '1px solid #A7F3D0',
                              whiteSpace: 'nowrap'
                            }}
                            title="100% Pallet và kiện Top Nóc trong Container đều đạt quy chuẩn"
                          >
                            <span>✓ Đạt chuẩn</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '9999px',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              whiteSpace: 'nowrap'
                            }}
                            title={`Phát hiện ${errorCount || 1} lỗi vi phạm quy chuẩn đóng kiện`}
                          >
                            <span>✕ Vi phạm{errorCount > 0 ? ` (${errorCount})` : ''}</span>
                          </span>
                        )}
                      </td>

                      {/* Thao Tác */}
                      <td style={{ textAlign: 'center', padding: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(cont)}
                            style={{
                              background: '#FAF6F0',
                              border: '1px solid #EADCC9',
                              borderRadius: '6px',
                              padding: '5px 8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: '#4A2E1B',
                              fontSize: '0.74rem',
                              fontWeight: '600',
                              transition: 'all 0.15s ease'
                            }}
                            title="Xem chi tiết kiểm định & 20 Pallet"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#4A2E1B';
                              e.currentTarget.style.color = '#FFFFFF';
                              e.currentTarget.style.borderColor = '#4A2E1B';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#FAF6F0';
                              e.currentTarget.style.color = '#4A2E1B';
                              e.currentTarget.style.borderColor = '#EADCC9';
                            }}
                          >
                            <Eye size={13} />
                            <span>Chi tiết</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenPrint(cont, e)}
                            style={{
                              padding: '5px 7px',
                              backgroundColor: '#FAF5EE',
                              border: '1px solid #EADCC9',
                              borderRadius: '6px',
                              color: '#7B5233',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}
                            title="In phiếu Container"
                          >
                            <Printer size={14} />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditContainer(cont, e)}
                                style={{
                                  padding: '5px 7px',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '6px',
                                  color: '#1D4ED8',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title="Admin sửa thông tin Container"
                              >
                                <Edit2 size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleOpenDelete(cont, e)}
                                style={{
                                  padding: '5px 7px',
                                  backgroundColor: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  borderRadius: '6px',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center'
                                }}
                                title="Xóa Container này"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer chuẩn LPN Crawler */}
        <div className="lpn-pagination-container">
          <div className="lpn-pagination-info">
            <span>
              Hiển thị <strong>{startIdx}</strong>–<strong>{endIdx}</strong> trong tổng số <strong>{Number(totalItems || 0).toLocaleString()}</strong> Container
            </span>
          </div>

          <div className="lpn-pagination-controls">
            <button
              type="button"
              className="lpn-page-btn lpn-page-nav-btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              title="Trang trước"
            >
              ‹ Trước
            </button>

            {getPageButtons().map((btn, idx) => {
              if (btn === '...') {
                return (
                  <span key={`dots-${idx}`} className="pagination-ellipsis">
                    …
                  </span>
                );
              }
              return (
                <button
                  key={`page-${btn}`}
                  type="button"
                  className={`lpn-page-btn ${page === btn ? 'active' : ''}`}
                  onClick={() => setPage(btn)}
                >
                  {btn}
                </button>
              );
            })}

            <button
              type="button"
              className="lpn-page-btn lpn-page-nav-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              title="Trang sau"
            >
              Sau ›
            </button>
          </div>
        </div>
      </div>

      {/* Modal Xác nhận Xóa hàng loạt */}
      {isBatchDeleteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(45, 26, 18, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              border: '1px solid #FECACA'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', color: '#DC2626' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                Xác nhận xóa {selectedIds.length} Container?
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6B5E55', lineHeight: 1.5, marginBottom: '20px' }}>
              Hành động này sẽ xóa vĩnh viễn <strong>{selectedIds.length}</strong> phiên quét Container đã chọn khỏi cơ sở dữ liệu và không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #D6C7B2',
                  backgroundColor: '#FFFFFF',
                  color: '#5D4037',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Xóa vĩnh viễn ({selectedIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          5. MODAL CHI TIẾT CONTAINER (FULL INSPECTOR MODAL)
          ════════════════════════════════════════════════════════════════════════ */}
      {isDetailModalOpen && selectedContainer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(45, 26, 18, 0.45)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '960px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #EADCC9',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              backgroundColor: '#FAF7F2',
              borderBottom: '1px solid #EADCC9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#2D1A12' }}>
                    {selectedContainer.name}
                  </h2>
                  <span style={{
                    fontSize: '0.775rem',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    backgroundColor: '#EADCC9',
                    color: '#7B5233',
                    fontFamily: 'monospace',
                    fontWeight: 600
                  }}>
                    {selectedContainer.id}
                  </span>
                  {selectedContainer.isValid ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}>
                      <CheckCircle2 size={13} />
                      100% HỢP LỆ
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#FEE2E2',
                      color: '#DC2626',
                      fontWeight: 700,
                      fontSize: '0.75rem'
                    }}>
                      <AlertTriangle size={13} />
                      BÁO ĐỎ VI PHẠM
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.825rem', color: '#6B5E55', marginTop: '4px' }}>
                  Người kiểm: <strong>{selectedContainer.inspector}</strong> • Hoàn thành: {selectedContainer.completedAt || selectedContainer.createdAt} • {selectedContainer.totalPallets} Pallet ({selectedContainer.totalBoxes} Kiện)
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleExportContainerDetailExcel(selectedContainer)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#15803D',
                    border: '1px solid #86EFAC',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                  title="Xuất file Excel cho container này"
                >
                  <FileSpreadsheet size={15} />
                  <span>Xuất Excel</span>
                </button>

                <button
                  onClick={() => handleOpenPrint(selectedContainer)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    backgroundColor: '#FFFFFF',
                    color: '#7B5233',
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer'
                  }}
                  title="In phiếu Container"
                >
                  <Printer size={15} />
                  <span>In Cont</span>
                </button>

                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  style={{
                    padding: '7px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EADCC9',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: '#8C7A6B'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, backgroundColor: '#FAF8F6' }}>
              {/* BÁO CÁO KIỂM ĐỊNH TIÊU CHUẨN CONTAINER */}
              {selectedContainer.auditResult && (
                <div style={{ marginBottom: '20px' }}>
                  {selectedContainer.auditResult.isValid ? (
                    <div style={{
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      borderRadius: '10px',
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <CheckCircle2 size={24} color="#15803D" />
                      <div>
                        <div style={{ color: '#15803D', fontWeight: 700, fontSize: '0.95rem' }}>
                          ✓ CONTAINER ĐẠT TIÊU CHUẨN XUẤT KHẨU (100% HỢP LỆ)
                        </div>
                        <div style={{ color: '#166534', fontSize: '0.825rem', marginTop: '2px' }}>
                          {selectedContainer.auditResult.hasTwoBoxPallet
                            ? `Tất cả pallet đủ mã (Bao gồm 1 Pallet 2 kiện hợp lệ). ${selectedContainer.auditResult.isOddCombinedEven ? `Các mã top nóc lẻ được ghép cặp chẵn hợp lệ (Tổng ${selectedContainer.auditResult.totalOddBoxes} kiện chẵn).` : 'Toàn bộ kiện Top Nóc là số chẵn hợp lệ.'}`
                            : (selectedContainer.auditResult.isOddCombinedEven
                                ? `Tất cả pallet đủ mã. Các mã top nóc lẻ được ghép cặp chẵn hợp lệ (Tổng ${selectedContainer.auditResult.totalOddBoxes} kiện chẵn).`
                                : 'Tất cả các pallet đã quét đủ số lượng tem đứng và toàn bộ các kiện Top Nóc đều là số chẵn hợp lệ.')
                          }
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '10px',
                      padding: '16px 20px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <AlertTriangle size={22} color="#DC2626" />
                        <span style={{ color: '#DC2626', fontWeight: 700, fontSize: '0.95rem' }}>
                          ❌ PHÁT HIỆN LỖI VI PHẠM TIÊU CHUẨN CONTAINER
                        </span>
                        <span style={{
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.725rem',
                          fontWeight: 700
                        }}>
                          BÁO ĐỎ
                        </span>
                      </div>

                      {/* Chi tiết lỗi top nóc số lẻ */}
                      {selectedContainer.auditResult.oddTopLpnErrors && selectedContainer.auditResult.oddTopLpnErrors.length > 0 && (
                        <div style={{ fontSize: '0.825rem', color: '#991B1B', marginTop: '6px' }}>
                          <strong>• Lỗi Top Nóc số lẻ: </strong>
                          {selectedContainer.auditResult.oddTopLpnErrors.map((err, i) => (
                            <span key={i} style={{ marginRight: '8px' }}>
                              Mã <code>[{err.lpnCode}]</code> có {err.count} kiện lẻ trên Pallet #{err.palletIndices?.join(', #')}
                              {i < selectedContainer.auditResult.oddTopLpnErrors.length - 1 ? '; ' : ''}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Chi tiết lỗi thiếu mã trên Pallet */}
                      {selectedContainer.auditResult.palletErrors && selectedContainer.auditResult.palletErrors.length > 0 && (
                        <div style={{ fontSize: '0.825rem', color: '#991B1B', marginTop: '6px' }}>
                          <strong>• Lỗi Pallet chưa đủ số lượng tem: </strong>
                          {selectedContainer.auditResult.palletErrors.map((err, i) => (
                            <span key={i} style={{ marginRight: '8px' }}>
                              Pallet #{err.palletIndex} ({err.details})
                              {i < selectedContainer.auditResult.palletErrors.length - 1 ? '; ' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* BẢNG KIỂM TRA KIỆN TOP NÓC TOÀN CONT (SỐ CHẴN) */}
              {selectedContainer.auditResult && selectedContainer.auditResult.topLpnGroup && Object.keys(selectedContainer.auditResult.topLpnGroup).length > 0 && (
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '10px',
                  border: '1px solid #EADCC9',
                  padding: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#7B5233', fontSize: '0.9rem' }}>
                      <Layers size={18} />
                      <span>KIỂM TRA KIỆN TOP NÓC TOÀN CONT (SỐ CHẴN)</span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#8C7A6B' }}>
                      Tổng số mã nóc: <strong>{Object.keys(selectedContainer.auditResult.topLpnGroup).length}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {Object.entries(selectedContainer.auditResult.topLpnGroup).map(([lpnCode, info]) => {
                      const isSelfEven = info.count % 2 === 0;
                      const isOddCombinedEven = selectedContainer.auditResult.isOddCombinedEven || (
                        !isSelfEven && (!selectedContainer.auditResult.oddTopLpnErrors || selectedContainer.auditResult.oddTopLpnErrors.length === 0)
                      );
                      const isOk = isSelfEven || isOddCombinedEven;

                      return (
                        <div
                          key={lpnCode}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            backgroundColor: isOk ? '#F0FDF4' : '#FEF2F2',
                            border: `1px solid ${isOk ? '#BBF7D0' : '#FECACA'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontFamily: 'monospace', color: isOk ? '#15803D' : '#DC2626', fontSize: '0.9rem' }}>
                              {lpnCode}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#6B5E55', marginTop: '2px' }}>
                              Pallet #{info.palletIndices.join(', #')}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '10px',
                            backgroundColor: isOk ? '#DCFCE7' : '#FEE2E2',
                            color: isOk ? '#15803D' : '#DC2626'
                          }}>
                            {isSelfEven
                              ? `✓ ${info.count} kiện (Chẵn - Hợp lệ)`
                              : isOddCombinedEven
                                ? `✓ ${info.count} kiện (Ghép chẵn ${selectedContainer.auditResult.totalOddBoxes || ''} kiện - Hợp lệ)`
                                : `❌ ${info.count} kiện (LẺ - BÁO ĐỎ)`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DANH SÁCH PALLET (PALLET EXPLORER) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#2D1A12' }}>
                  DANH SÁCH PALLET ({selectedContainer.pallets?.length || 0})
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#8C7A6B' }}>
                  Bấm vào Pallet để xem chi tiết hoặc chỉnh sửa tem trực tiếp
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(selectedContainer.pallets || []).map((p) => {
                  const isExpanded = expandedPalletIndex === p.palletIndex;
                  const isEditing = editingPalletIndex === p.palletIndex;
                  const standingCount = (p.standing?.skus?.length || 0) + (p.standing?.lpns?.length || 0);
                  const roofCount = (p.roof?.skus?.length || 0) + (p.roof?.lpns?.length || 0);
                  const hasRoof = Boolean(p.roof?.hasRoof) || roofCount > 0;

                  return (
                    <div
                      key={p.palletIndex}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '10px',
                        border: '1px solid #EADCC9',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* Pallet Card Header */}
                      <div
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#FAF5EE' : '#FFFFFF'
                        }}
                        onClick={() => setExpandedPalletIndex(isExpanded ? null : p.palletIndex)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#7B5233',
                            color: '#FFFFFF',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '0.8rem'
                          }}>
                            PALLET #{p.palletIndex}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, color: '#2D1A12', fontSize: '0.875rem' }}>
                              {p.palletId}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#8C7A6B', marginTop: '2px' }}>
                              {p.standing?.standardSku ? `SKU Đứng: ${p.standing.standardSku}` : 'Chưa quét SKU đứng'} • LPN: {p.standing?.standardLpn || '--'}
                              {hasRoof && (
                                <span style={{ marginLeft: '8px', color: '#B45309', fontWeight: 600 }}>
                                  • Kiện Nóc: {p.roof?.standardLpn || 'Chưa rõ'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} onClick={(e) => e.stopPropagation()}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: p.status === 'pass' ? '#DCFCE7' : '#FEF3C7',
                            color: p.status === 'pass' ? '#15803D' : '#B45309',
                            fontWeight: 600,
                            fontSize: '0.75rem'
                          }}>
                            {p.status === 'pass' 
                              ? ((!p.roof?.hasRoof && (p.standing?.skus?.length || 0) === 4 && (p.standing?.lpns?.length || 0) === 2) ? '✓ ĐỦ MÃ (2 KIỆN)' : '✓ ĐỦ MÃ') 
                              : 'CHƯA ĐỦ'}
                          </span>

                          {isAdmin && !isEditing && (
                            <button
                              onClick={() => handleStartEditPallet(p)}
                              style={{
                                padding: '5px 10px',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                color: '#1D4ED8',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Edit2 size={13} />
                              Sửa
                            </button>
                          )}

                          <button
                            onClick={() => setExpandedPalletIndex(isExpanded ? null : p.palletIndex)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8C7A6B' }}
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* INLINE EDIT PALLET FORM (ADMIN - 8 Ô SKU & 4 Ô LPN) */}
                      {isEditing && (
                        <div style={{ padding: '16px 20px', backgroundColor: '#EFF6FF', borderTop: '1px solid #BFDBFE' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Edit2 size={16} />
                              <span>Chỉnh sửa chi tiết Pallet #{p.palletIndex} (Admin)</span>
                            </div>
                            <span style={{ fontSize: '0.775rem', color: '#3B82F6', fontWeight: 600 }}>
                              Quy chuẩn: 8 SKU đứng • 4 LPN đứng {palletEditData.hasRoof ? '• 2 SKU nóc • 1 LPN nóc' : ''}
                            </span>
                          </div>

                          {/* KHỐI 1: 8 MÃ SKU ĐỨNG */}
                          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '14px', border: '1px solid #BFDBFE', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Package size={15} color="#2563EB" />
                                1. DANH SÁCH 8 MÃ SKU ĐỨNG (KIỆN #1 ➔ #8)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const first = palletEditData.standingSkus[0] || '';
                                  if (first) {
                                    setPalletEditData(prev => ({
                                      ...prev,
                                      standingSkus: Array(8).fill(first)
                                    }));
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  backgroundColor: '#DBEAFE',
                                  color: '#1D4ED8',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Tự động sao chép mã của ô SKU #1 cho tất cả 8 ô"
                              >
                                <Zap size={13} />
                                <span>Điền cả 8 theo SKU #1</span>
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                              {palletEditData.standingSkus.map((code, idx) => (
                                <div key={idx} style={{ position: 'relative' }}>
                                  <span style={{
                                    position: 'absolute',
                                    left: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    color: '#64748B'
                                  }}>
                                    #{idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={code}
                                    placeholder={`SKU #${idx + 1}`}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPalletEditData(prev => {
                                        const arr = [...prev.standingSkus];
                                        arr[idx] = val;
                                        return { ...prev, standingSkus: arr };
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '7px 8px 7px 28px',
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      fontSize: '0.8rem',
                                      fontFamily: 'monospace',
                                      fontWeight: 700,
                                      color: '#1E293B',
                                      backgroundColor: '#F8FAFC'
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* KHỐI 2: 4 MÃ LPN ĐỨNG */}
                          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '14px', border: '1px solid #BFDBFE', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Barcode size={15} color="#2563EB" />
                                2. DANH SÁCH 4 MÃ LPN ĐỨNG (LPN #1 ➔ #4)
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const first = palletEditData.standingLpns[0] || '';
                                  if (first) {
                                    setPalletEditData(prev => ({
                                      ...prev,
                                      standingLpns: Array(4).fill(first)
                                    }));
                                  }
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 10px',
                                  backgroundColor: '#DBEAFE',
                                  color: '#1D4ED8',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                                title="Tự động sao chép mã của ô LPN #1 cho tất cả 4 ô"
                              >
                                <Zap size={13} />
                                <span>Điền cả 4 theo LPN #1</span>
                              </button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                              {palletEditData.standingLpns.map((code, idx) => (
                                <div key={idx} style={{ position: 'relative' }}>
                                  <span style={{
                                    position: 'absolute',
                                    left: '8px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    color: '#64748B'
                                  }}>
                                    #{idx + 1}
                                  </span>
                                  <input
                                    type="text"
                                    value={code}
                                    placeholder={`LPN #${idx + 1}`}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPalletEditData(prev => {
                                        const arr = [...prev.standingLpns];
                                        arr[idx] = val;
                                        return { ...prev, standingLpns: arr };
                                      });
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '7px 8px 7px 28px',
                                      borderRadius: '6px',
                                      border: '1px solid #CBD5E1',
                                      fontSize: '0.8rem',
                                      fontFamily: 'monospace',
                                      fontWeight: 700,
                                      color: '#1E293B',
                                      backgroundColor: '#F8FAFC'
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* KHỐI 3: KIỆN NÓC (TOP ROOF) */}
                          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '14px', border: '1px solid #BFDBFE', marginBottom: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: palletEditData.hasRoof ? '12px' : '0' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 800, color: '#B45309', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={palletEditData.hasRoof}
                                  onChange={(e) => setPalletEditData({ ...palletEditData, hasRoof: e.target.checked })}
                                  style={{ width: '16px', height: '16px' }}
                                />
                                <span>3. KIỆN TOP NÓC (ROOF) - 2 SKU • 1 LPN</span>
                              </label>
                              {palletEditData.hasRoof && (
                                <span style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>
                                  Kiểm tra số chẵn toàn cont theo mã LPN nóc
                                </span>
                              )}
                            </div>

                            {palletEditData.hasRoof && (
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', paddingTop: '10px', borderTop: '1px dashed #E2E8F0' }}>
                                <div>
                                  <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                    SKU Nóc #1
                                  </label>
                                  <input
                                    type="text"
                                    value={palletEditData.roofSkus[0] || ''}
                                    placeholder="SKU Nóc #1"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPalletEditData(prev => {
                                        const arr = [...prev.roofSkus];
                                        arr[0] = val;
                                        return { ...prev, roofSkus: arr };
                                      });
                                    }}
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.825rem', fontFamily: 'monospace', fontWeight: 600 }}
                                  />
                                </div>

                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 700 }}>
                                      SKU Nóc #2
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const s1 = palletEditData.roofSkus[0] || '';
                                        if (s1) {
                                          setPalletEditData(prev => ({
                                            ...prev,
                                            roofSkus: [s1, s1]
                                          }));
                                        }
                                      }}
                                      style={{ border: 'none', background: 'none', color: '#2563EB', fontSize: '0.725rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                      title="Sao chép từ SKU Nóc #1"
                                    >
                                      Theo #1
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={palletEditData.roofSkus[1] || ''}
                                    placeholder="SKU Nóc #2"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPalletEditData(prev => {
                                        const arr = [...prev.roofSkus];
                                        arr[1] = val;
                                        return { ...prev, roofSkus: arr };
                                      });
                                    }}
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.825rem', fontFamily: 'monospace', fontWeight: 600 }}
                                  />
                                </div>

                                <div>
                                  <label style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                                    LPN Nóc (Top Roof)
                                  </label>
                                  <input
                                    type="text"
                                    value={palletEditData.roofLpns[0] || ''}
                                    placeholder="VD: 060094519"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPalletEditData(prev => ({ ...prev, roofLpns: [val] }));
                                    }}
                                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1.5px solid #F59E0B', fontSize: '0.85rem', fontFamily: 'monospace', fontWeight: 700, color: '#B45309', backgroundColor: '#FFFBEB' }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ACTION BUTTONS */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => setEditingPalletIndex(null)}
                              style={{ padding: '7px 14px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
                            >
                              Hủy
                            </button>
                            <button
                              onClick={handleSavePalletEdit}
                              style={{ padding: '7px 18px', backgroundColor: '#1D4ED8', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(29,78,216,0.2)' }}
                            >
                              <Save size={15} />
                              Lưu & Tái Thẩm Định Cont
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Pallet Expanded Details (Hiển thị đầy đủ 8 SKU & 4 LPN dạng Pill Badges) */}
                      {isExpanded && (
                        <div style={{ padding: '16px 20px', borderTop: '1px solid #F0E8DC', backgroundColor: '#FAF8F6', fontSize: '0.8rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            <div>
                              <div style={{ fontWeight: 800, color: '#7B5233', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Package size={15} />
                                <span>1. HÀNG ĐỨNG ({(p.standing?.skus?.length || 0)}/8 SKU • {(p.standing?.lpns?.length || 0)}/4 LPN)</span>
                              </div>

                              <div style={{ marginBottom: '10px' }}>
                                <div style={{ fontSize: '0.725rem', color: '#8C7A6B', fontWeight: 700, marginBottom: '5px' }}>8 MÃ SKU ĐỨNG:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {((p.standing?.skus || []).length > 0 ? p.standing.skus : Array(8).fill({ code: p.standing?.standardSku || '--' })).map((s, idx) => (
                                    <span key={idx} style={{
                                      fontSize: '0.75rem',
                                      padding: '3px 7px',
                                      borderRadius: '5px',
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #EADCC9',
                                      fontFamily: 'monospace',
                                      fontWeight: 600,
                                      color: '#2D1A12'
                                    }}>
                                      <strong style={{ color: '#8C7A6B', marginRight: '3px' }}>#{idx + 1}:</strong>{s.code || '--'}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '0.725rem', color: '#8C7A6B', fontWeight: 700, marginBottom: '5px' }}>4 MÃ LPN ĐỨNG:</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                  {((p.standing?.lpns || []).length > 0 ? p.standing.lpns : Array(4).fill({ code: p.standing?.standardLpn || '--' })).map((l, idx) => (
                                    <span key={idx} style={{
                                      fontSize: '0.75rem',
                                      padding: '3px 7px',
                                      borderRadius: '5px',
                                      backgroundColor: '#EFF6FF',
                                      border: '1px solid #BFDBFE',
                                      fontFamily: 'monospace',
                                      color: '#1E40AF',
                                      fontWeight: 700
                                    }}>
                                      <strong style={{ color: '#60A5FA', marginRight: '3px' }}>#{idx + 1}:</strong>{l.code || '--'}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div>
                              <div style={{ fontWeight: 800, color: '#B45309', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Layers size={15} />
                                <span>2. KIỆN TOP NÓC ({(p.roof?.skus?.length || 0)}/2 SKU • {(p.roof?.lpns?.length || 0)}/1 LPN)</span>
                              </div>

                              {hasRoof ? (
                                <div>
                                  <div style={{ marginBottom: '10px' }}>
                                    <div style={{ fontSize: '0.725rem', color: '#8C7A6B', fontWeight: 700, marginBottom: '5px' }}>2 MÃ SKU NÓC:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                      {((p.roof?.skus || []).length > 0 ? p.roof.skus : Array(2).fill({ code: p.roof?.standardSku || '--' })).map((s, idx) => (
                                        <span key={idx} style={{
                                          fontSize: '0.75rem',
                                          padding: '3px 7px',
                                          borderRadius: '5px',
                                          backgroundColor: '#FFFFFF',
                                          border: '1px solid #FDE68A',
                                          fontFamily: 'monospace',
                                          fontWeight: 600,
                                          color: '#92400E'
                                        }}>
                                          <strong style={{ color: '#D97706', marginRight: '3px' }}>#{idx + 1}:</strong>{s.code || '--'}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div>
                                    <div style={{ fontSize: '0.725rem', color: '#8C7A6B', fontWeight: 700, marginBottom: '5px' }}>1 MÃ LPN NÓC:</div>
                                    <span style={{
                                      fontSize: '0.8rem',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      backgroundColor: '#FEF3C7',
                                      border: '1.5px solid #F59E0B',
                                      fontFamily: 'monospace',
                                      color: '#B45309',
                                      fontWeight: 800
                                    }}>
                                      {p.roof?.standardLpn || p.roof?.lpns?.[0]?.code || 'CHƯA_CÓ'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ color: '#8C7A6B', fontStyle: 'italic', padding: '10px 0' }}>
                                  Pallet này không có kiện nóc (Pallet 4 kiện tiêu chuẩn)
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              backgroundColor: '#FAF7F2',
              borderTop: '1px solid #EADCC9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#7B5233',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          6. MODAL CHỈNH SỬA THÔNG TIN CONTAINER (ADMIN)
          ════════════════════════════════════════════════════════════════════════ */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '440px',
            border: '1px solid #EADCC9',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', color: '#2D1A12', fontWeight: 700 }}>
              Chỉnh Sửa Container
            </h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B5E55', display: 'block', marginBottom: '4px' }}>
                Mã Container
              </label>
              <input
                type="text"
                value={selectedContainer?.id || ''}
                disabled
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D6C7B2', backgroundColor: '#F5EFE6', color: '#7B5233', fontWeight: 600, fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B5E55', display: 'block', marginBottom: '4px' }}>
                Tên Container
              </label>
              <input
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D6C7B2' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B5E55', display: 'block', marginBottom: '4px' }}>
                Người kiểm tra
              </label>
              <input
                type="text"
                value={editFormData.inspector}
                onChange={(e) => setEditFormData({ ...editFormData, inspector: e.target.value })}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #D6C7B2' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', border: '1px solid #D6C7B2', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Hủy
              </button>
              <button
                onClick={handleSaveContainerInfo}
                style={{ padding: '8px 18px', backgroundColor: '#7B5233', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          7. MODAL XÁC NHẬN XÓA
          ════════════════════════════════════════════════════════════════════════ */}
      {isDeleteModalOpen && containerToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '420px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#2D1A12', fontWeight: 700 }}>
              Xác nhận xóa Container?
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#6B5E55' }}>
              Bạn có chắc chắn muốn xóa Container <strong>[{containerToDelete.name}]</strong> ({containerToDelete.id}) cùng toàn bộ dữ liệu {containerToDelete.totalPallets} pallet đã quét không?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ padding: '8px 18px', backgroundColor: '#FFFFFF', border: '1px solid #D6C7B2', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{ padding: '8px 20px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                Xóa Vĩnh Viễn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          8. MODAL IN PHIẾU CONTAINER (PRINT PREVIEW)
          ════════════════════════════════════════════════════════════════════════ */}
      {isPrintModalOpen && printContainerData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1070,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 15px 35px rgba(0,0,0,0.2)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #EADCC9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FAF7F2' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Printer size={18} />
                <span>Xem Trước Bản In Container</span>
              </h3>
              <button onClick={() => setIsPrintModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} color="#8C7A6B" />
              </button>
            </div>

            <div id="print-container-content" style={{ padding: '24px', overflowY: 'auto', flex: 1, fontFamily: 'monospace', fontSize: '0.85rem' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #000', paddingBottom: '12px', marginBottom: '12px' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>SMARTFLOW - PHIẾU KIỂM CONTAINER</div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>XUẤT BẢN TỪ MOBILE /PALLET-CHECK-V1</div>
              </div>

              <div style={{ lineHeight: '1.6', marginBottom: '12px' }}>
                <div><strong>TÊN CONT:</strong> {printContainerData.name}</div>
                <div><strong>MÃ CONT:</strong> {printContainerData.id}</div>
                <div><strong>NGƯỜI KIỂM:</strong> {printContainerData.inspector}</div>
                <div><strong>THỜI GIAN:</strong> {printContainerData.completedAt || printContainerData.createdAt}</div>
                <div><strong>TỔNG SỐ PALLET:</strong> {printContainerData.totalPallets} PL • {printContainerData.totalBoxes} Kiện</div>
                <div>
                  <strong>KIỂM ĐỊNH: </strong>
                  <span style={{ fontWeight: 700, color: printContainerData.isValid ? '#15803d' : '#dc2626' }}>
                    {printContainerData.isValid ? '✓ 100% ĐẠT TIÊU CHUẨN' : '❌ PHÁT HIỆN LỖI VI PHẠM'}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, marginBottom: '6px' }}>DANH SÁCH 20 PALLET:</div>
                {(printContainerData.pallets || []).map((p) => (
                  <div key={p.palletIndex} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                    <span>#{p.palletIndex} {p.palletId.slice(-18)}:</span>
                    <span>{p.standing?.standardSku || '--'} {p.roof?.standardLpn ? `(Nóc: ${p.roof.standardLpn})` : ''}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '2px dashed #000', paddingTop: '12px', textAlign: 'center', fontSize: '0.75rem', color: '#555' }}>
                Ký nhận QC / Ngày in: {new Date().toLocaleString('vi-VN')}
              </div>
            </div>

            <div style={{ padding: '12px 20px', borderTop: '1px solid #EADCC9', display: 'flex', justifyContent: 'flex-end', gap: '8px', backgroundColor: '#FAF7F2' }}>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                style={{ padding: '7px 14px', backgroundColor: '#FFFFFF', border: '1px solid #D6C7B2', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
              >
                Đóng
              </button>
              <button
                onClick={handleTriggerPrint}
                style={{ padding: '7px 18px', backgroundColor: '#7B5233', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={15} />
                <span>In Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print CSS styles */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media print {
          body * {
            visibility: hidden;
          }
          #print-container-content, #print-container-content * {
            visibility: visible;
          }
          #print-container-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

