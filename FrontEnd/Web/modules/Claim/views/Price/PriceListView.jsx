import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Plus } from 'lucide-react';
import { claimService } from '../../services/claim.service';
import * as XLSX from 'xlsx';
import { API_ROOT } from '@webShared/Services/api.service';
import '../../styles/claim.css';

// Import shared components
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import { FilterModal, FormModal, AlertModal } from '../../components/Modal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';

const MOCK_CABINET_PRICES = [
  { id: 1, cabinet_code: 'A042S-L-BC-WOA', cabinet_name: 'Tủ gỗ Atlas màu sồi tự nhiên', material: 'Gỗ sồi (Oak)', dimensions: '600x800x400', base_price: 100.00, sale_price: 142.49, status: 'Active', last_updated: '2026-06-01T08:00:00Z' },
  { id: 2, cabinet_code: 'A037S-R-BC-WHT', cabinet_name: 'Tủ gỗ Atlas màu trắng bên phải', material: 'Gỗ sồi (Oak)', dimensions: '600x800x400', base_price: 110.00, sale_price: 142.49, status: 'Active', last_updated: '2026-06-02T10:30:00Z' },
  { id: 3, cabinet_code: 'T066D-BC-WOA', cabinet_name: 'Tủ gỗ Table màu sồi tự nhiên', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 150.00, sale_price: 195.00, status: 'Active', last_updated: '2026-05-15T14:20:00Z' },
  { id: 4, cabinet_code: 'T036S-R-BC-GRY', cabinet_name: 'Tủ gỗ Table màu xám bên phải', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 130.00, sale_price: 175.50, status: 'Active', last_updated: '2026-06-03T16:45:00Z' },
  { id: 5, cabinet_code: 'T036S-L-BC-MNB', cabinet_name: 'Tủ gỗ Table màu xanh navy bên trái', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 135.00, sale_price: 175.50, status: 'Active', last_updated: '2026-06-05T11:15:00Z' },
  { id: 6, cabinet_code: 'A049S-BC-WHT', cabinet_name: 'Tủ gỗ Atlas màu trắng', material: 'Gỗ sồi (Oak)', dimensions: '600x800x400', base_price: 90.00, sale_price: 125.00, status: 'Active', last_updated: '2026-04-20T09:00:00Z' },
  { id: 7, cabinet_code: 'T072D-BC-WOA', cabinet_name: 'Tủ gỗ Table lớn sồi tự nhiên', material: 'Gỗ sồi (Oak)', dimensions: '1200x2000x600', base_price: 180.00, sale_price: 240.00, status: 'Inactive', last_updated: '2026-06-06T15:30:00Z' }
];

const getColorName = (code) => {
  if (!code) return '';
  return code.slice(-3).toUpperCase();
};

const renderCabinetThumbnail = (cabinetCode) => {
  if (!cabinetCode) return null;
  const last3 = cabinetCode.slice(-3).toUpperCase();
  let bgColor = '#D7CCC8';
  let iconColor = '#5D4037';
  let label = 'Cabinet';

  if (last3 === 'WHT') {
    bgColor = '#F5F5F5';
    iconColor = '#9E9E9E';
    label = 'Trắng';
  } else if (last3 === 'WOA') {
    bgColor = '#E0C39E';
    iconColor = '#795548';
    label = 'Sồi';
  } else if (last3 === 'GRY') {
    bgColor = '#ECEFF1';
    iconColor = '#607D8B';
    label = 'Xám';
  } else if (last3 === 'MNB') {
    bgColor = '#1A237E';
    iconColor = '#C5CAE9';
    label = 'Xanh Navy';
  } else if (last3 === 'BLK') {
    bgColor = '#212121';
    iconColor = '#B0BEC5';
    label = 'Đen';
  } else if (last3 === 'VGN') {
    bgColor = '#E8F5E9';
    iconColor = '#2E7D32';
    label = 'Xanh Lá';
  } else if (last3 === 'BRO') {
    bgColor = '#D7CCC8';
    iconColor = '#5D4037';
    label = 'Nâu';
  } else if (last3 === 'SAN') {
    bgColor = '#FFF9C4';
    iconColor = '#F57F17';
    label = 'Cát';
  } else if (last3 === 'ESP') {
    bgColor = '#3E2723';
    iconColor = '#D7CCC8';
    label = 'Espresso';
  }

  return (
    <div
      style={{
        width: '40px',
        height: '40px',
        borderRadius: '6px',
        backgroundColor: bgColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}
      title={`Màu sắc: ${label}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M3 12h18" />
        <circle cx="9" cy="7.5" r="1" fill={iconColor} />
        <circle cx="15" cy="7.5" r="1" fill={iconColor} />
        <circle cx="9" cy="16.5" r="1" fill={iconColor} />
        <circle cx="15" cy="16.5" r="1" fill={iconColor} />
      </svg>
    </div>
  );
};

const PriceListView = () => {
  const { setCustomTitle, setCustomSubtitle, showModal: contextShowModal } = useOutletContext() || {};
  const [localNotification, setLocalNotification] = useState(null);

  const hasWritePermission = true;

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

  const [allPrices, setAllPrices] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [selectedPriceIds, setSelectedPriceIds] = useState([]);
  const [isImportDropdownOpen, setIsImportDropdownOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [actionMenuId, setActionMenuId] = useState(null);
  const excelInputRef = useRef(null);
  const [duplicateImportData, setDuplicateImportData] = useState(null);

  const getFullImagePath = (path) => {
    if (!path) return '';
    let clean = typeof path === 'string' ? path.trim() : '';
    if (clean.startsWith('http://localhost') || clean.startsWith('http://127.0.0.1')) {
      clean = clean.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, '');
    }
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('blob:') || clean.startsWith('data:')) {
      return clean;
    }
    const cleanPath = clean.startsWith('/') ? clean.slice(1) : clean;
    return `${API_ROOT}${cleanPath}`;
  };

  // Add cabinet modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCabinet, setEditingCabinet] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newSalePrice, setNewSalePrice] = useState('');
  const [newStatus, setNewStatus] = useState('Active');
  const [newSeries, setNewSeries] = useState('');
  const [newNewSeries, setNewNewSeries] = useState('');

  // State for multiple images upload
  const [newImages, setNewImages] = useState([]);
  const [newImageCaptions, setNewImageCaptions] = useState([]);
  const [editingImageIndex, setEditingImageIndex] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const editImageInputRef = useRef(null);

  const autoLine = newCode ? newCode.charAt(0).toUpperCase() : '';
  const autoCode = newCode ? newCode.split('-')[0].toUpperCase() : '';
  const autoColorCode = newCode && newCode.length >= 3 ? newCode.slice(-3).toUpperCase() : '';
  const autoNewSeries = newName ? newName.charAt(0).toUpperCase() : '';

  const handleEditImageClick = (index) => {
    setEditingImageIndex(index);
    if (editImageInputRef.current) {
      editImageInputRef.current.click();
    }
  };

  const handleAddImageClick = () => {
    setEditingImageIndex(-1);
    if (editImageInputRef.current) {
      editImageInputRef.current.click();
    }
  };

  const handleEditImageFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result;
        if (editingImageIndex === -1) {
          setNewImages(prev => [...prev, imageUrl]);
          setNewImageCaptions(prev => [...prev, file.name.split('.')[0]]);
        } else if (editingImageIndex !== null) {
          setNewImages(prev => prev.map((img, idx) => idx === editingImageIndex ? imageUrl : img));
        }
      };
      reader.readAsDataURL(file);
    }
    setEditingImageIndex(null);
    e.target.value = '';
  };

  const handleDeleteImageClick = (index) => {
    setNewImages(prev => prev.filter((_, idx) => idx !== index));
    setNewImageCaptions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleOpenAddModal = () => {
    setEditingCabinet(null);
    setNewCode('');
    setNewName('');
    setNewSalePrice('');
    setNewStatus('Active');
    setNewImages([]);
    setNewImageCaptions([]);
    setNewSeries('');
    setNewNewSeries('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingCabinet(item);
    setNewCode(item.cabinet_code || '');
    setNewName(item.cabinet_name || '');
    setNewSalePrice(item.sale_price || '');
    setNewStatus(item.status || 'Active');
    const imgs = item.images || (item.image ? [item.image] : []);
    setNewImages(imgs);
    setNewImageCaptions(item.image_captions || imgs.map((_, idx) => `${item.cabinet_code || 'Tủ'} - Ảnh ${idx + 1}`));
    setNewSeries(item.series || '');
    setNewNewSeries(item.new_series || '');
    setIsAddModalOpen(true);
  };

  // Advanced Filter states
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'product', 'price', or null
  const [filterLine, setFilterLine] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMinPrice, setFilterMinPrice] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    const newFilters = {};
    if (filterLine) newFilters.line = filterLine;
    if (filterCode) newFilters.code = filterCode;
    if (filterColor) newFilters.color = filterColor;
    if (filterStatus) newFilters.status = filterStatus;
    if (filterMinPrice) newFilters.minPrice = filterMinPrice;
    if (filterMaxPrice) newFilters.maxPrice = filterMaxPrice;
    setAppliedFilters(newFilters);
  }, [filterLine, filterCode, filterColor, filterStatus, filterMinPrice, filterMaxPrice]);

  const clearAllFilters = () => {
    setFilterLine('');
    setFilterCode('');
    setFilterColor('');
    setFilterStatus('');
    setFilterMinPrice('');
    setFilterMaxPrice('');
  };

  const removeFilterKey = (key) => {
    if (key === 'line') setFilterLine('');
    else if (key === 'code') setFilterCode('');
    else if (key === 'color') setFilterColor('');
    else if (key === 'status') setFilterStatus('');
    else if (key === 'minPrice') setFilterMinPrice('');
    else if (key === 'maxPrice') setFilterMaxPrice('');
  };

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

  // Extract unique lines and colors dynamically from allPrices
  const uniqueLines = React.useMemo(() => {
    const lines = allPrices.map(item => {
      if (item.series) return item.series.toUpperCase();
      const cleanCode = item.cabinet_code ? item.cabinet_code.split(/[\r\n\s]+/)[0].trim() : '';
      return cleanCode ? cleanCode.charAt(0).toUpperCase() : '';
    });
    return [...new Set(lines)].filter(Boolean).sort();
  }, [allPrices]);

  const uniqueColors = React.useMemo(() => {
    const colors = allPrices.map(item => {
      if (item.dimensions) return item.dimensions.toUpperCase();
      const cleanCode = item.cabinet_code ? item.cabinet_code.split(/[\r\n\s]+/)[0].trim() : '';
      if (cleanCode && cleanCode.length >= 3) {
        return cleanCode.slice(-3).toUpperCase();
      }
      return '';
    });
    return [...new Set(colors)].filter(Boolean).sort();
  }, [allPrices]);

  const uniqueItemCodes = React.useMemo(() => {
    const codes = allPrices.map(item => {
      if (item.material) return item.material.toUpperCase();
      const cleanCode = item.cabinet_code ? item.cabinet_code.split(/[\r\n\s]+/)[0].trim() : '';
      return cleanCode ? cleanCode.split('-')[0].toUpperCase() : '';
    });
    return [...new Set(codes)].filter(Boolean).sort();
  }, [allPrices]);

  const [showFilterCodeSuggestions, setShowFilterCodeSuggestions] = useState(false);

  const getSortedPrices = (pricesList) => {
    if (!sortOption) return pricesList;
    return [...pricesList].sort((a, b) => {
      if (sortOption === 'name-asc') {
        return (a.cabinet_code || '').localeCompare(b.cabinet_code || '');
      }
      if (sortOption === 'name-desc') {
        return (b.cabinet_code || '').localeCompare(a.cabinet_code || '');
      }
      if (sortOption === 'time-asc') {
        const dateA = a.last_updated ? new Date(a.last_updated) : new Date(0);
        const dateB = b.last_updated ? new Date(b.last_updated) : new Date(0);
        return dateA - dateB;
      }
      if (sortOption === 'time-desc') {
        const dateA = a.last_updated ? new Date(a.last_updated) : new Date(0);
        const dateB = b.last_updated ? new Date(b.last_updated) : new Date(0);
        return dateB - dateA;
      }
      return 0;
    });
  };

  const rowsPerPage = 30;

  // Reset page when data, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [prices, search, sortOption, filterLine, filterCode, filterColor, filterStatus, filterMinPrice, filterMaxPrice]);

  // Reactive filtering logic
  useEffect(() => {
    let filtered = [...allPrices];

    if (filterLine) {
      filtered = filtered.filter(item => {
        const line = item.series || (item.cabinet_code ? item.cabinet_code.charAt(0).toUpperCase() : '');
        return line.toLowerCase() === filterLine.toLowerCase();
      });
    }
    if (filterCode) {
      filtered = filtered.filter(item => {
        const code = item.material || (item.cabinet_code ? item.cabinet_code.split('-')[0].toUpperCase() : '');
        return code.toLowerCase().includes(filterCode.toLowerCase());
      });
    }
    if (filterColor) {
      filtered = filtered.filter(item => {
        const color = item.dimensions || (item.cabinet_code && item.cabinet_code.length >= 3 ? item.cabinet_code.slice(-3).toUpperCase() : '');
        return color.toLowerCase() === filterColor.toLowerCase();
      });
    }
    if (filterStatus) {
      filtered = filtered.filter(item => item.status === filterStatus);
    }
    if (filterMinPrice) {
      filtered = filtered.filter(item => item.sale_price >= Number(filterMinPrice));
    }
    if (filterMaxPrice) {
      filtered = filtered.filter(item => item.sale_price <= Number(filterMaxPrice));
    }

    setPrices(filtered);
  }, [allPrices, filterLine, filterCode, filterColor, filterStatus, filterMinPrice, filterMaxPrice]);

  // Pagination computed values
  const sortedPrices = getSortedPrices(prices);
  const totalFilteredItems = sortedPrices.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / rowsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedPrices = sortedPrices.slice(startIndex, endIndex);

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

  const handleToggleSelectAll = () => {
    const displayedIds = paginatedPrices.map(p => p.id);
    const allSelected = displayedIds.length > 0 && displayedIds.every(id => selectedPriceIds.includes(id));
    if (allSelected) {
      setSelectedPriceIds(prev => prev.filter(id => !displayedIds.includes(id)));
    } else {
      setSelectedPriceIds(prev => {
        const next = [...prev];
        displayedIds.forEach(id => {
          if (!next.includes(id)) next.push(id);
        });
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id) => {
    if (selectedPriceIds.includes(id)) {
      setSelectedPriceIds(prev => prev.filter(rowId => rowId !== id));
    } else {
      setSelectedPriceIds(prev => [...prev, id]);
    }
  };

  const handleImportFile = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    showModal('Đang xử lý', 'Đang đọc và tải dữ liệu từ file lên hệ thống...', 'info');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length <= 1) {
          showModal('Thông báo', 'File không có dữ liệu hoặc định dạng không đúng.', 'warning');
          return;
        }

        const rawHeaders = jsonData[0];
        const headers = [];
        if (rawHeaders) {
          for (let i = 0; i < rawHeaders.length; i++) {
            const h = rawHeaders[i];
            headers.push(h ? String(h).trim().replace(/\s+/g, ' ').toLowerCase() : '');
          }
        }

        let skuIdx = headers.findIndex(h => h === 'sku' || h === 'tên sản phẩm' || h === 'ten san pham');
        let nameIdx = headers.findIndex(h => h === 'new sku form' || h === 'tên sản phẩm (new)' || h === 'tên sản phẩm (mới)');
        let colorIdx = headers.findIndex(h => h === 'color' || h === 'màu sắc' || h === 'mau sac');
        let seriesIdx = headers.findIndex(h => h === 'series' || h === 'dòng hàng' || h === 'dong hang');
        let newSeriesIdx = headers.findIndex(h => h === 'new series' || h === 'dòng hàng (new)' || h === 'dòng hàng new');
        let salePriceIdx = headers.findIndex(h => h && (h.includes('giá bán cho atlas') || h === 'giá bán' || h === 'sale price' || h === 'giá'));

        let collectionIdx = headers.findIndex(h => h === 'collection');
        let verpIdx = headers.findIndex(h => h === 'verp');
        let categoryIdx = headers.findIndex(h => h === 'category');
        let rangeIdx = headers.findIndex(h => h === 'range');
        let statusIdx = headers.findIndex(h => h && (h.includes('trạng thái') || h.includes('status')));

        // Fallbacks for standard file formats if not matched exactly
        if (skuIdx === -1) {
          skuIdx = headers.findIndex((h, idx) => idx !== nameIdx && h && (h.includes('sku') || h.includes('sản phẩm') || h.includes('product') || (h.includes('mã') && !h.includes('hàng'))));
        }
        if (nameIdx === -1) {
          nameIdx = headers.findIndex((h, idx) => idx !== skuIdx && h && (h.includes('tên') || h.includes('name') || h.includes('mới') || h.includes('new')));
        }
        if (colorIdx === -1) colorIdx = headers.findIndex(h => h && (h.includes('color') || h.includes('màu')));
        if (seriesIdx === -1) seriesIdx = headers.findIndex(h => h && (h.includes('series') || h.includes('dòng hàng')));
        if (newSeriesIdx === -1) newSeriesIdx = headers.findIndex(h => h && (h.includes('new series') || (h.includes('dòng') && h.includes('mới')) || (h.includes('dòng') && h.includes('new'))));
        if (salePriceIdx === -1) salePriceIdx = headers.findIndex(h => h && (h.includes('giá') || h.includes('price')));

        // Default position fallback if still not found
        if (skuIdx === -1) skuIdx = 1;
        if (colorIdx === -1) colorIdx = 2;
        if (seriesIdx === -1) seriesIdx = 5;
        if (newSeriesIdx === -1) newSeriesIdx = 6;
        if (nameIdx === -1) nameIdx = 7;
        if (salePriceIdx === -1) salePriceIdx = 9;

        const importedItems = [];
        const timestamp = new Date().toISOString();

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const rawSku = skuIdx !== -1 && row[skuIdx] ? String(row[skuIdx]).trim() : '';
          if (!rawSku) continue;

          const rawColor = colorIdx !== -1 && row[colorIdx] ? String(row[colorIdx]).trim() : '';
          const rawVerp = verpIdx !== -1 && row[verpIdx] ? String(row[verpIdx]).trim() : '';
          const rawCategory = categoryIdx !== -1 && row[categoryIdx] ? String(row[categoryIdx]).trim() : '';
          const rawSeries = seriesIdx !== -1 && row[seriesIdx] ? String(row[seriesIdx]).trim() : '';
          const rawNewSeries = newSeriesIdx !== -1 && row[newSeriesIdx] ? String(row[newSeriesIdx]).trim() : '';
          const rawName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
          const rawRange = rangeIdx !== -1 && row[rangeIdx] ? String(row[rangeIdx]).trim() : '';
          const rawCollection = collectionIdx !== -1 && row[collectionIdx] ? String(row[collectionIdx]).trim() : '';

          const calculatedLine = rawSku.charAt(0).toUpperCase();
          const calculatedCode = rawSku.split('-')[0].toUpperCase();
          const calculatedColor = rawSku.length >= 3 ? rawSku.slice(-3).toUpperCase() : '';

          const sale_price = salePriceIdx !== -1 && row[salePriceIdx] !== undefined ? Number(String(row[salePriceIdx]).replace(/[^0-9.]/g, '')) || 0 : 0;

          let statusVal = 'Active';
          if (statusIdx !== -1 && row[statusIdx] !== undefined) {
            const rawStatus = String(row[statusIdx]).trim().toLowerCase();
            if (rawStatus === 'inactive' || rawStatus.includes('dừng') || rawStatus === 'pending') {
              statusVal = 'Inactive';
            }
          }

          importedItems.push({
            id: Date.now() + i,
            cabinet_code: rawSku,
            cabinet_name: rawName || rawSku,
            material: rawVerp || calculatedCode,
            dimensions: rawColor || calculatedColor,
            series: rawSeries || calculatedLine,
            new_series: rawNewSeries || '',
            collection: rawCollection || '',
            verp: rawVerp || '',
            category: rawCategory || '',
            range: rawRange || '',
            base_price: 0,
            sale_price: sale_price,
            status: statusVal,
            last_updated: timestamp
          });
        }

        if (importedItems.length === 0) {
          showModal('Thông báo', 'Không tìm thấy dòng dữ liệu hợp lệ nào trong file (Tên sản phẩm không được để trống).', 'warning');
          return;
        }

        const duplicates = [];
        const uniqueImported = [];

        importedItems.forEach(item => {
          const existing = allPrices.find(p => p.cabinet_code?.trim() === item.cabinet_code?.trim());
          if (existing) {
            duplicates.push({ imported: item, existing });
          } else {
            uniqueImported.push(item);
          }
        });

        if (duplicates.length > 0) {
          setLocalNotification(null);
          setDuplicateImportData({
            duplicates,
            uniqueImported,
            fileName: file.name
          });
        } else {
          const finalizedNewItems = importedItems.map(item => ({
            ...item,
            price_history: [{
              price: item.sale_price,
              updated_at: item.last_updated,
              source: 'import'
            }]
          }));

          const nextPrices = [...finalizedNewItems, ...allPrices];
          try {
            await claimService.saveCabinetPricesTemp(nextPrices);
            setAllPrices(nextPrices);
            fetchPrices();
            showModal('Thành công', `Đã nhập khẩu và lưu thành công ${importedItems.length} sản phẩm tủ gỗ vào CSDL từ file ${file.name}!`, 'success');
          } catch (err) {
            console.error("Lỗi lưu trữ giá vào CSDL:", err);
            const detail = err?.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join('; ') : (typeof detail === 'object' ? JSON.stringify(detail) : (detail || err.message));
            showModal('Lỗi', `Lưu dữ liệu vào Database thất bại: ${msg}`, 'error');
          }
        }
      } catch (error) {
        console.error('Lỗi phân tích file Excel/CSV:', error);
        showModal('Lỗi', `Có lỗi xảy ra khi đọc file: ${error.message}`, 'error');
      }
    };

    reader.onerror = () => {
      showModal('Lỗi', 'Không thể đọc được file.', 'error');
    };

    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleResolveDuplicates = async (choice) => {
    if (!duplicateImportData) return;
    const { duplicates, uniqueImported, fileName } = duplicateImportData;
    const timestamp = new Date().toISOString();

    let updatedPricesList = [...allPrices];

    const finalizedNewItems = uniqueImported.map(item => ({
      ...item,
      price_history: [{
        price: item.sale_price,
        updated_at: timestamp,
        source: 'import'
      }]
    }));

    if (choice === 'new') {
      duplicates.forEach(({ imported, existing }) => {
        updatedPricesList = updatedPricesList.map(p => {
          if (p.id === existing.id) {
            const oldPrice = p.sale_price;
            const newPrice = imported.sale_price;
            let history = [...(p.price_history || [])];

            if (history.length === 0) {
              history.push({
                price: oldPrice,
                updated_at: p.last_updated || timestamp,
                source: 'import'
              });
            }

            if (oldPrice !== newPrice) {
              history.push({
                price: newPrice,
                updated_at: timestamp,
                source: 'import'
              });
            }

            return {
              ...p,
              sale_price: newPrice,
              last_updated: timestamp,
              price_history: history
            };
          }
          return p;
        });
      });

      const nextPrices = [...finalizedNewItems, ...updatedPricesList];
      try {
        await claimService.saveCabinetPricesTemp(nextPrices);
        setAllPrices(nextPrices);
        fetchPrices();
        showModal('Thành công', `Đã cập nhật giá mới cho ${duplicates.length} sản phẩm trùng và thêm mới ${uniqueImported.length} sản phẩm vào CSDL từ file ${fileName}!`, 'success');
      } catch (err) {
        console.error("Lỗi lưu trữ giá vào CSDL:", err);
        const detail = err?.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join('; ') : (typeof detail === 'object' ? JSON.stringify(detail) : (detail || err.message));
        showModal('Lỗi', `Lưu dữ liệu vào Database thất bại: ${msg}`, 'error');
      }
    } else if (choice === 'old') {
      const nextPrices = [...finalizedNewItems, ...updatedPricesList];
      try {
        await claimService.saveCabinetPricesTemp(nextPrices);
        setAllPrices(nextPrices);
        fetchPrices();
        showModal('Thành công', `Đã giữ lại giá cũ cho ${duplicates.length} sản phẩm trùng và thêm mới ${uniqueImported.length} sản phẩm mới vào CSDL từ file ${fileName}!`, 'success');
      } catch (err) {
        console.error("Lỗi lưu trữ giá vào CSDL:", err);
        const detail = err?.response?.data?.detail;
        const msg = Array.isArray(detail) ? detail.map(d => d.msg || JSON.stringify(d)).join('; ') : (typeof detail === 'object' ? JSON.stringify(detail) : (detail || err.message));
        showModal('Lỗi', `Lưu dữ liệu vào Database thất bại: ${msg}`, 'error');
      }
    }

    setDuplicateImportData(null);
  };

  const handleExportExcel = () => {
    if (prices.length === 0) {
      showModal('Thông báo', 'Không có dữ liệu giá để xuất.', 'info');
      return;
    }

    const headers = [
      'Collection',
      'SKU',
      'Color',
      'VERP',
      'Category',
      'Series',
      'New series',
      'New SKU form',
      'Range',
      'GIÁ BÁN CHO ATLAS'
    ];
    const rows = prices.map((p) => [
      p.collection || '',
      p.cabinet_code || '',
      p.dimensions || (p.cabinet_code && p.cabinet_code.length >= 3 ? p.cabinet_code.slice(-3).toUpperCase() : ''),
      p.verp || (p.cabinet_code ? p.cabinet_code.split('-')[0].toUpperCase() : ''),
      p.category || 'BASE_CABINET',
      p.series || (p.cabinet_code ? p.cabinet_code.charAt(0).toUpperCase() : ''),
      p.new_series || (p.cabinet_name ? p.cabinet_name.charAt(0).toUpperCase() : ''),
      p.cabinet_name || '',
      p.range || 'Pigment',
      p.sale_price
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const colWidths = [
      { wch: 15 },  // Collection
      { wch: 25 },  // SKU
      { wch: 10 },  // Color
      { wch: 20 },  // VERP
      { wch: 18 },  // Category
      { wch: 10 },  // Series
      { wch: 12 },  // New series
      { wch: 25 },  // New SKU form
      { wch: 12 },  // Range
      { wch: 20 }   // GIÁ BÁN CHO ATLAS
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bảng giá tủ gỗ");
    XLSX.writeFile(workbook, "Bang_gia_tu_go.xlsx");
  };

  const handleCreateCabinet = async (e) => {
    e.preventDefault();
    if (!newCode || !newSalePrice) {
      showModal('Lỗi', 'Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
      return;
    }

    let nextPrices;
    const timestamp = new Date().toISOString();

    if (editingCabinet) {
      const oldPrice = editingCabinet.sale_price;
      const newPrice = Number(newSalePrice) || 0;
      let history = [...(editingCabinet.price_history || [])];

      if (history.length === 0) {
        history.push({
          price: oldPrice,
          updated_at: editingCabinet.last_updated || timestamp,
          source: 'manual'
        });
      }

      if (oldPrice !== newPrice) {
        history.push({
          price: newPrice,
          updated_at: timestamp,
          source: 'manual'
        });
      }

      const displaySeries = newSeries || autoLine;
      const displayNewSeries = newNewSeries || autoNewSeries;

      nextPrices = allPrices.map(p => p.id === editingCabinet.id ? {
        ...p,
        cabinet_code: newCode,
        cabinet_name: newName,
        material: autoCode,
        dimensions: autoColorCode,
        series: displaySeries,
        new_series: displayNewSeries,
        sale_price: newPrice,
        status: newStatus,
        image: newImages[0] || '',
        images: newImages,
        image_captions: newImageCaptions,
        last_updated: timestamp,
        price_history: history
      } : p);
      showModal('Thành công', `Đã cập nhật đơn giá sản phẩm ${editingCabinet.cabinet_code} thành công!`, 'success');
    } else {
      const newPrice = Number(newSalePrice) || 0;
      const displaySeries = newSeries || autoLine;
      const displayNewSeries = newNewSeries || autoNewSeries;

      const newCabinet = {
        id: Date.now(),
        cabinet_code: newCode,
        cabinet_name: newName,
        material: autoCode,
        dimensions: autoColorCode,
        series: displaySeries,
        new_series: displayNewSeries,
        base_price: 0,
        sale_price: newPrice,
        status: newStatus,
        image: newImages[0] || '',
        images: newImages,
        image_captions: newImageCaptions,
        last_updated: timestamp,
        price_history: [{
          price: newPrice,
          updated_at: timestamp,
          source: 'manual'
        }]
      };
      nextPrices = [newCabinet, ...allPrices];
      showModal('Thành công', `Đã thêm đơn giá sản phẩm ${newCode} mới thành công!`, 'success');
    }

    setAllPrices(nextPrices);
    try {
      await claimService.saveCabinetPricesTemp(nextPrices);
      fetchPrices();
    } catch (err) {
      console.error("Lỗi lưu trữ giá:", err);
    }

    setIsAddModalOpen(false);
    setNewCode('');
    setNewName('');
    setNewSalePrice('');
    setNewImages([]);
    setNewImageCaptions([]);
    setEditingCabinet(null);
  };

  useEffect(() => {
    setCustomTitle('Bảng giá tủ gỗ');
    setCustomSubtitle('Quản lý giá tủ · Thiết lập đơn giá sản xuất & xuất khẩu');
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [search]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const response = await claimService.getCabinetPrices({
        search: search || undefined,
        size: 5000
      });
      let fetched = response.items || [];
      if (search) {
        fetched = fetched.filter(item =>
          item.cabinet_code?.toLowerCase().includes(search.toLowerCase()) ||
          item.cabinet_name?.toLowerCase().includes(search.toLowerCase()) ||
          item.material?.toLowerCase().includes(search.toLowerCase())
        );
      }
      setAllPrices(fetched);
    } catch (error) {
      console.error('Lỗi tải danh mục giá:', error);
      let fetched = [];
      setAllPrices(fetched);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (number) => {
    if (!number) return '$0.00';
    if (number < 10000) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(number);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(number);
  };

  const handleDeleteSelected = () => {
    if (selectedPriceIds.length === 0) return;
    const selectedPrices = allPrices.filter(p => selectedPriceIds.includes(p.id));
    setDeleteConfirmation({
      items: selectedPrices,
      onConfirm: async () => {
        setLoading(true);
        const results = [];
        for (const price of selectedPrices) {
          try {
            await claimService.deleteCabinetPrice(price.id);
            results.push({ price, success: true });
          } catch (error) {
            console.error(`Error deleting cabinet price ${price.id}:`, error);
            const errMsg = error.response?.data?.detail || error.message || 'Lỗi không xác định';
            results.push({ price, success: false, error: errMsg });
          }
        }
        setLoading(false);

        const succeeded = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        const remainingPrices = allPrices.filter(p => !succeeded.map(s => s.price.id).includes(p.id));
        setAllPrices(remainingPrices);
        setSelectedPriceIds(prev => prev.filter(id => failed.map(f => f.price.id).includes(id)));

        claimService.saveCabinetPricesTemp(remainingPrices).catch(err => {
          console.error("Lỗi lưu trữ giá tạm thời:", err);
        });

        const isAllSuccess = failed.length === 0;
        const msgTitle = isAllSuccess ? 'Xóa thành công' : 'Kết quả xóa';
        const msgType = isAllSuccess ? 'success' : failed.length === selectedPrices.length ? 'error' : 'info';

        const DeleteResultList = ({ items, type }) => {
          const [expanded, setExpanded] = React.useState({});
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
                const price = r.price;
                const isOpen = !!expanded[i];
                const displayName = price.cabinet_code || 'N/A';
                const cleanCode = price.cabinet_code ? price.cabinet_code.split(/[\r\n\s]+/)[0].trim() : '';
                const productLine = cleanCode ? cleanCode.charAt(0).toUpperCase() : '';
                const itemCode = cleanCode ? cleanCode.split('-')[0].toUpperCase() : '';
                const colorCode = cleanCode && cleanCode.length >= 3 ? cleanCode.slice(-3).toUpperCase() : '';
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
                          <span style={{ color: textColor, wordBreak: 'break-all' }}>{price.cabinet_code || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Đơn giá:</span>
                          <span style={{ color: textColor, fontWeight: '700' }}>{formatPrice(price.sale_price)}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Dòng hàng:</span>
                          <span style={{ color: textColor }}>{productLine || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Mã hàng:</span>
                          <span style={{ color: textColor }}>{itemCode || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ color: textColor, fontWeight: 'bold', minWidth: '110px' }}>Màu sắc:</span>
                          <span style={{ color: textColor }}>{colorCode || 'N/A'}</span>
                        </div>
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

        const notificationContent = (
          <div style={{ width: '100%', maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
            {succeeded.length > 0 && (
              <div style={{ marginBottom: failed.length > 0 ? '16px' : '0' }}>
                <p style={{ fontWeight: '600', color: '#059669', marginBottom: '8px' }}>
                  Đã xóa thành công {succeeded.length} dòng sản phẩm:
                </p>
                <DeleteResultList items={succeeded} type="success" />
              </div>
            )}

            {failed.length > 0 && (
              <div>
                <p style={{ fontWeight: '600', color: '#DC2626', marginBottom: '8px' }}>
                  Xóa thất bại {failed.length} dòng sản phẩm:
                </p>
                <DeleteResultList items={failed} type="error" />
              </div>
            )}
          </div>
        );

        showModal(msgTitle, notificationContent, msgType);
      }
    });
  };

  const tableHeaders = [
    ...(hasWritePermission ? [{
      isCheckbox: true,
      label: (
        <input
          type="checkbox"
          className="checkbox-custom"
          checked={paginatedPrices.length > 0 && paginatedPrices.every(p => selectedPriceIds.includes(p.id))}
          onChange={handleToggleSelectAll}
        />
      )
    }] : []),
    { label: 'STT', style: { width: '60px' } },
    { label: 'Tên sản phẩm', className: 'text-left' },
    { label: 'Tên sản phẩm (new)', className: 'text-left' },
    { label: 'Dòng hàng', className: 'text-left' },
    { label: 'Dòng hàng (new)', className: 'text-left' },
    { label: 'Mã hàng', className: 'text-left' },
    { label: 'Màu sắc', className: 'text-left' },
    { label: 'Giá', className: 'text-left' },
    { label: 'Trạng thái' },
    ...(hasWritePermission ? [{ label: 'Thao tác', style: { textAlign: 'center' } }] : [])
  ];


  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 0 }}>
      {/* FILTER & ACTIONS BAR */}
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
        <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="search-wrapper" style={{ margin: 0, height: '36px', width: '320px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search nhanh tên sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            type="button"
            className={`icon-btn-minimal ${isFilterBarOpen ? 'active' : ''}`}
            onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              border: '1px solid #EADCC9',
              backgroundColor: isFilterBarOpen ? '#7B5233' : '#FAF6F0',
              color: isFilterBarOpen ? '#FFFFFF' : '#7B5233',
              fontWeight: 'bold',
              borderRadius: '8px',
              padding: '0 16px',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            <Filter size={14} />
            Bộ lọc
            {Object.keys(appliedFilters).length > 0 && (
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
                {Object.keys(appliedFilters).length}
              </span>
            )}
          </button>

          {/* SORT DROPDOWN */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="select-minimal"
              style={{
                height: '36px',
                borderColor: '#EADCC9',
                color: '#7B5233',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '0 12px 0 28px',
                cursor: 'pointer',
                backgroundColor: '#FAF6F0',
                outline: 'none',
                fontSize: '0.8rem'
              }}
            >
              <option value="">Sắp xếp</option>
              <option value="name-asc">Tên: A-Z</option>
              <option value="name-desc">Tên: Z-A</option>
              <option value="time-asc">Thời gian: Sớm nhất</option>
              <option value="time-desc">Thời gian: Trễ nhất</option>
            </select>
            <svg
              style={{ position: 'absolute', left: '8px', top: '11px', pointerEvents: 'none', color: '#7B5233' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M15 18H3M21 14H3M17 10H3M21 6H3"></path>
            </svg>
          </div>
        </div>

        <div className="toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {hasWritePermission && (
            <button
              className="btn btn-primary"
              onClick={handleOpenAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '36px',
                padding: '0 20px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
                backgroundColor: '#7B5233',
                color: '#fff'
              }}
            >
              <Plus size={16} />
              Thêm mới
            </button>
          )}

          {hasWritePermission && (
            <div className="import-dropdown-container" style={{ position: 'relative' }}>
              <button
                className="btn btn-outline"
                onClick={() => setIsImportDropdownOpen(!isImportDropdownOpen)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '36px',
                  borderColor: '#EADCC9',
                  color: '#7B5233',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  padding: '0 16px',
                  cursor: 'pointer',
                  backgroundColor: '#fff'
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
                <div className="import-dropdown-menu" style={{ minWidth: '160px', position: 'absolute', top: '100%', right: 0, zIndex: 1000 }}>
                  <button className="import-dropdown-item" onClick={() => { setIsImportDropdownOpen(false); excelInputRef.current.click(); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    File Excel (.xlsx)
                  </button>
                  <button className="import-dropdown-item" onClick={() => { setIsImportDropdownOpen(false); excelInputRef.current.click(); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                    File CSV (.csv)
                  </button>
                </div>
              )}
            </div>
          )}

          {hasWritePermission && (
            <input
              type="file"
              ref={excelInputRef}
              style={{ display: 'none' }}
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
            />
          )}

          <button
            className="btn btn-outline"
            onClick={handleExportExcel}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              border: '1px solid #EADCC9',
              backgroundColor: '#fff',
              color: '#7B5233'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            Export
          </button>

          {hasWritePermission && (
            <button
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '36px',
                borderColor: selectedPriceIds.length === 0 ? '#CBD5E1' : '#A0301B',
                color: selectedPriceIds.length === 0 ? '#94A3B8' : '#A0301B',
                cursor: selectedPriceIds.length === 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                borderRadius: '8px',
                padding: '0 16px',
                backgroundColor: '#fff'
              }}
              disabled={selectedPriceIds.length === 0}
              onClick={handleDeleteSelected}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Xóa đã chọn
            </button>
          )}
        </div>
      </div>

      {/* INLINE EXPANDABLE FILTER BAR */}
      {isFilterBarOpen && (
        <div className="filter-inline-bar">
          {/* CATEGORY 1: SẢN PHẨM & MÀU SẮC */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'product' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'product' ? null : 'product'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="12" x2="21" y2="12"></line>
              </svg>
              <span>Sản phẩm & Màu sắc</span>
              {['line', 'code', 'color'].filter(k => appliedFilters[k]).length > 0 && (
                <span className="filter-active-badge">
                  {['line', 'code', 'color'].filter(k => appliedFilters[k]).length}
                </span>
              )}
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'product' && (
              <div className="filter-dropdown-card grid-2col" style={{ width: '360px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group">
                  <label className="filter-field-label">Dòng hàng</label>
                  <select value={filterLine} onChange={(e) => setFilterLine(e.target.value)}>
                    <option value="">Tất cả</option>
                    {uniqueLines.map(line => (
                      <option key={line} value={line}>{line}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-field-group">
                  <label className="filter-field-label">Màu sắc</label>
                  <select value={filterColor} onChange={(e) => setFilterColor(e.target.value)}>
                    <option value="">Tất cả</option>
                    {uniqueColors.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-field-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label className="filter-field-label">Mã hàng</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: A042S..."
                    value={filterCode}
                    onChange={(e) => setFilterCode(e.target.value)}
                    className="filter-dropdown-input"
                    onFocus={() => setShowFilterCodeSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowFilterCodeSuggestions(false), 200)}
                  />
                  {showFilterCodeSuggestions && (
                    <div className="custom-autocomplete-suggestions">
                      {uniqueItemCodes
                        .filter(opt => !filterCode || opt.toLowerCase().includes(filterCode.toLowerCase()))
                        .map((opt, idx) => (
                          <div
                            key={idx}
                            className="custom-autocomplete-option"
                            onMouseDown={() => {
                              setFilterCode(opt);
                              setShowFilterCodeSuggestions(false);
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

          {/* CATEGORY 2: TRẠNG THÁI & GIÁ CẢ */}
          <div className="filter-dropdown-wrapper">
            <button
              type="button"
              className={`btn-filter-dropdown ${activeDropdown === 'price' ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'price' ? null : 'price'); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Trạng thái & Giá cả</span>
              {['status', 'minPrice', 'maxPrice'].filter(k => appliedFilters[k]).length > 0 && (
                <span className="filter-active-badge">
                  {['status', 'minPrice', 'maxPrice'].filter(k => appliedFilters[k]).length}
                </span>
              )}
              <span className="dropdown-arrow">▾</span>
            </button>
            {activeDropdown === 'price' && (
              <div className="filter-dropdown-card" style={{ width: '320px' }} onClick={(e) => e.stopPropagation()}>
                <div className="filter-field-group">
                  <label className="filter-field-label">Trạng thái áp dụng</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">Tất cả</option>
                    <option value="Active">Đang áp dụng</option>
                    <option value="Inactive">Dừng áp dụng</option>
                  </select>
                </div>
                <div className="filter-field-group">
                  <label className="filter-field-label">Khoảng giá bán ($)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      placeholder="Từ"
                      value={filterMinPrice}
                      onChange={(e) => setFilterMinPrice(e.target.value)}
                      className="filter-dropdown-input"
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#8D6E63', fontWeight: 'bold' }}>-</span>
                    <input
                      type="number"
                      placeholder="Đến"
                      value={filterMaxPrice}
                      onChange={(e) => setFilterMaxPrice(e.target.value)}
                      className="filter-dropdown-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active applied filter chips container with a border wrapper */}
          {Object.keys(appliedFilters).length > 0 && (
            <div
              className="filter-chips-wrapper"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px dashed #D5C7B7',
                borderRadius: '6px',
                padding: '2px 8px',
                backgroundColor: '#FFFFFF',
                minHeight: '28px',
                boxSizing: 'border-box',
                flexWrap: 'wrap'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8D6E63', display: 'flex', alignItems: 'center' }}>Đã chọn:</span>
              {Object.entries(appliedFilters).map(([key, value]) => {
                if (!value) return null;
                let displayLabel = '';

                if (key === 'line') displayLabel = `Dòng: ${value}`;
                else if (key === 'code') displayLabel = `Mã: ${value}`;
                else if (key === 'color') displayLabel = `Màu: ${value}`;
                else if (key === 'status') displayLabel = `Trạng thái: ${value === 'Active' ? 'Áp dụng' : 'Dừng áp dụng'}`;
                else if (key === 'minPrice') displayLabel = `Giá từ: $${value}`;
                else if (key === 'maxPrice') displayLabel = `Giá đến: $${value}`;
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
          {Object.keys(appliedFilters).length > 0 && (
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

      {/* TABLE VIEW */}
      <div 
        className="admin-table-card" 
        style={{ 
          backgroundColor: '#FFF', 
          borderRadius: '12px', 
          boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)', 
          border: '1px solid #EADCC9',
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          minHeight: 0,
          width: '100%',
          margin: 0
        }}
      >
        <Table
          loading={loading}
          isEmpty={prices.length === 0}
          emptyMessage="Không tìm thấy đơn giá sản phẩm tủ gỗ nào."
          headers={tableHeaders}
        >
          {paginatedPrices.map((item, idx) => {
            const cleanCode = item.cabinet_code ? item.cabinet_code.split(/[\r\n\s]+/)[0].trim() : '';
            const productLine = cleanCode ? cleanCode.charAt(0).toUpperCase() : '';
            const itemCode = cleanCode ? cleanCode.split('-')[0].toUpperCase() : '';
            const colorCode = cleanCode && cleanCode.length >= 3 ? cleanCode.slice(-3).toUpperCase() : '';

            return (
              <tr
                key={item.id}
                style={{
                  position: 'relative',
                  zIndex: actionMenuId === item.id ? 30 : 1
                }}
              >
                {hasWritePermission && (
                  <td className="checkbox-col" style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="checkbox-custom"
                      checked={selectedPriceIds.includes(item.id)}
                      onChange={() => handleToggleSelectRow(item.id)}
                    />
                  </td>
                )}
                <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--text-gray)', textAlign: 'center' }}>{startIndex + idx + 1}</td>
                <td className="text-left" style={{ padding: '10px 14px', fontWeight: '500', color: '#2D1A12' }}>{item.cabinet_code}</td>
                <td className="text-left" style={{ padding: '10px 14px', fontWeight: '500', color: '#7B5233' }}>{item.cabinet_name}</td>
                <td className="text-left" style={{ padding: '10px 14px', fontWeight: '500', color: '#5D4037' }}>{item.series || productLine}</td>
                <td className="text-left" style={{ padding: '10px 14px', fontWeight: '500', color: '#5D4037' }}>{item.new_series || ''}</td>
                <td className="code-ref text-left" style={{ padding: '10px 14px', fontWeight: '500' }}>{item.material || itemCode}</td>
                <td className="text-left" style={{ padding: '10px 14px', fontWeight: '500', color: '#5D4037' }}>{item.dimensions || colorCode}</td>
                <td className="value-penalty text-left" style={{ padding: '10px 14px', fontWeight: 'bold', color: '#2D1A12' }}>{formatPrice(item.sale_price)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span className={`status-badge badge-${item.status === 'Active' ? 'new' : 'pending'}`}>
                    {item.status === 'Active' ? 'Áp dụng' : 'Dừng áp dụng'}
                  </span>
                </td>
                {hasWritePermission && (
                  <td style={{ padding: '10px 14px', position: 'relative', textAlign: 'center', zIndex: actionMenuId === item.id ? 40 : 1 }}>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuId(actionMenuId === item.id ? null : item.id);
                      }}
                    ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg></button>
                    {actionMenuId === item.id && (
                      <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                        <button
                          className="action-menu-item"
                          onClick={() => {
                            setActionMenuId(null);
                            handleOpenEditModal(item);
                          }}
                        >
                          Chỉnh sửa
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </Table>

          {/* PAGINATION FOOTER */}
          {prices.length > 0 && !loading && (
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalFilteredItems}
              onPageChange={setCurrentPage}
            />
          )}
        </div>

      {/* ADD NEW CABINET PRICE MODAL */}
      <FormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateCabinet}
        title={editingCabinet ? "Chỉnh sửa đơn giá tủ" : "Thêm mới đơn giá tủ"}
        width="min(95vw, 920px)"
        bodyStyle={{ padding: '0' }}
        actionsStyle={{ marginTop: '20px', borderTop: '1px solid #F3F4F6', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end', padding: '16px 24px' }}
        confirmLabel="Lưu lại"
        cancelLabel="Hủy"
      >
        <div className="add-claim-layout-split" style={{ padding: '20px 24px 0' }}>
          {/* Left Column: Form Inputs */}
          <div className="add-claim-form-col">
            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Tên sản phẩm *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: A042S-L-BC-WOA"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="add-claim-input"
                  required
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Tên sản phẩm (new)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tủ gỗ Atlas màu sồi tự nhiên"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="add-claim-input"
                />
              </div>
            </div>

            <div className="add-claim-row add-claim-grid-2">
              <div className="add-claim-field">
                <label className="add-claim-label">Giá bán ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={newSalePrice}
                  onChange={(e) => setNewSalePrice(e.target.value)}
                  className="add-claim-input"
                  required
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Trạng thái áp dụng</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="add-claim-select"
                >
                  <option value="Active">Áp dụng (Active)</option>
                  <option value="Inactive">Dừng áp dụng (Inactive)</option>
                </select>
              </div>
            </div>

            <div className="add-claim-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div className="add-claim-field">
                <label className="add-claim-label">Dòng hàng</label>
                <input
                  type="text"
                  value={newSeries}
                  placeholder={autoLine || "Ví dụ: T"}
                  onChange={(e) => setNewSeries(e.target.value)}
                  className="add-claim-input"
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Dòng hàng (new)</label>
                <input
                  type="text"
                  value={newNewSeries}
                  placeholder={autoNewSeries || "Ví dụ: 2"}
                  onChange={(e) => setNewNewSeries(e.target.value)}
                  className="add-claim-input"
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Mã hàng</label>
                <input
                  type="text"
                  value={autoCode}
                  readOnly
                  className="add-claim-input"
                  style={{ backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
                />
              </div>
              <div className="add-claim-field">
                <label className="add-claim-label">Màu sắc</label>
                <input
                  type="text"
                  value={autoColorCode}
                  readOnly
                  className="add-claim-input"
                  style={{ backgroundColor: '#F8FAFC', color: '#64748B', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {editingCabinet && (
              <div style={{ borderTop: '1px solid #E2E8F0', marginTop: '16px', paddingTop: '16px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#4E3629', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  Lịch sử biến động giá
                </h3>

                {(!editingCabinet.price_history || editingCabinet.price_history.length === 0) ? (
                  <div style={{ padding: '12px', backgroundColor: '#FAF6F0', borderRadius: '8px', border: '1px dashed #EADCC9', color: '#8D6E63', textAlign: 'center', fontSize: '0.8rem', fontWeight: '500' }}>
                    Chưa có dữ liệu lịch sử biến động giá cho sản phẩm này.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', border: '1px solid #EADCC9', borderRadius: '8px', backgroundColor: '#FFFFFF', maxHeight: '180px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9', position: 'sticky', top: 0, zIndex: 1 }}>
                          <th style={{ padding: '8px 12px', fontWeight: '700', color: '#7B5233', width: '50px' }}>STT</th>
                          <th style={{ padding: '8px 12px', fontWeight: '700', color: '#7B5233' }}>Đơn giá</th>
                          <th style={{ padding: '8px 12px', fontWeight: '700', color: '#7B5233' }}>Mốc thời gian cập nhật</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingCabinet.price_history.map((hist, index) => (
                          <tr key={index} style={{ borderBottom: index === editingCabinet.price_history.length - 1 ? 'none' : '1px solid #F0E6D8' }}>
                            <td style={{ padding: '8px 12px', color: '#5D4037', fontWeight: '600' }}>{index + 1}</td>
                            <td style={{ padding: '8px 12px', color: '#2D1A12', fontWeight: '700' }}>{formatPrice(hist.price)}</td>
                            <td style={{ padding: '8px 12px', color: '#4E3629' }}>{new Date(hist.updated_at).toLocaleString('vi-VN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Cabinet Images */}
          <div className="add-claim-image-col">
            <div className="filter-section-header" style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1.5px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Hình ảnh sản phẩm ({newImages.length})
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
              overflowY: newImages.length >= 4 ? 'auto' : 'hidden',
              paddingRight: '4px'
            }}>
              <div className="add-claim-image-card-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: newImages.length <= 3 ? '100%' : 'auto'
              }}>
                {newImages.length > 0 ? (
                  newImages.map((path, index) => {
                    const num = newImages.length;
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
                            onClick={() => handleEditImageClick(index)}
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
                            onClick={() => handleDeleteImageClick(index)}
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
                          alt={`Cabinet photo ${index + 1}`}
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
                          {newImageCaptions[index] || `Hình ảnh sản phẩm ${index + 1}`}
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

          <input
            type="file"
            ref={editImageInputRef}
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleEditImageFileChange}
          />
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

      {/* RICH ALERTS/NOTIFICATIONS POPUP */}
      {localNotification && (
        <AlertModal
          isOpen={!!localNotification}
          title={localNotification.title}
          message={localNotification.message}
          type={localNotification.type}
          width={localNotification.title === 'Kết quả xóa' || localNotification.title === 'Xóa thành công' ? 'min(90vw, 680px)' : '420px'}
          onClose={() => setLocalNotification(null)}
        />
      )}

      {/* DUPLICATE RESOLUTION MODAL */}
      {duplicateImportData && (
        <div className="add-claim-backdrop" style={{ zIndex: 1800 }}>
          <div className="add-claim-modal" style={{ width: 'min(95vw, 650px)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="add-claim-header" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <h2 className="add-claim-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B58E6F' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                Phát hiện trùng lặp sản phẩm
              </h2>
              <button className="add-claim-icon-btn" onClick={() => setDuplicateImportData(null)} style={{ fontSize: '1.6rem', padding: '0 6px', lineHeight: 1 }}>&times;</button>
            </div>

            {/* Body */}
            <div className="add-claim-body" style={{ padding: '20px 24px', overflowY: 'auto' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.92rem', color: '#2D1A12', lineHeight: '1.5' }}>
                Có <strong>{duplicateImportData.duplicates.length}</strong> sản phẩm trong file <code>{duplicateImportData.fileName}</code> đã tồn tại trong hệ thống (trùng Tên sản phẩm).
              </p>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #EADCC9', borderRadius: '8px', padding: '10px 14px', backgroundColor: '#FFFDFB', marginBottom: '20px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#7B5233', display: 'block', marginBottom: '8px' }}>Danh sách sản phẩm trùng lặp:</span>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#5D4037', lineHeight: '1.6' }}>
                  {duplicateImportData.duplicates.map(({ imported }, idx) => (
                    <li key={idx}>
                      <code>{imported.cabinet_code}</code>: Giá mới {formatPrice(imported.sale_price)}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: '12px 16px', backgroundColor: '#FAF6F0', borderRadius: '8px', border: '1.5px dashed #EADCC9', fontSize: '0.85rem', color: '#7B5233', lineHeight: '1.5' }}>
                <strong>Vui lòng chọn phương án xử lý trùng lặp:</strong>
                <ol style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                  <li><strong>Ghi đè giá mới:</strong> Cập nhật giá bán mới từ file Excel và lưu lịch sử biến động giá cho {duplicateImportData.duplicates.length} sản phẩm trùng.</li>
                  <li><strong>Giữ lại giá cũ:</strong> Giữ nguyên đơn giá hiện có trong hệ thống của {duplicateImportData.duplicates.length} sản phẩm trùng.</li>
                  <li>Các sản phẩm mới hoàn toàn ({duplicateImportData.uniqueImported.length} sản phẩm) vẫn sẽ được thêm vào hệ thống trong cả hai trường hợp.</li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="add-claim-actions-row" style={{ borderTop: '1px solid #F3F4F6', padding: '16px 24px', display: 'flex', gap: '12px', justifyContent: 'flex-end', backgroundColor: '#FFFDFB', margin: 0 }}>
              <button type="button" className="add-claim-btn-cancel" onClick={() => setDuplicateImportData(null)}>Hủy bỏ</button>
              <button type="button" className="add-claim-btn-save" onClick={() => handleResolveDuplicates('old')} style={{ backgroundColor: '#78909C', borderColor: '#78909C' }}>Giữ lại giá cũ</button>
              <button type="button" className="add-claim-btn-save" onClick={() => handleResolveDuplicates('new')}>Ghi đè giá mới</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmationModal
        isOpen={!!deleteConfirmation}
        items={deleteConfirmation ? deleteConfirmation.items : []}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={() => {
          const confirmFn = deleteConfirmation.onConfirm;
          setDeleteConfirmation(null);
          confirmFn();
        }}
        message={
          deleteConfirmation ? (
            <p style={{ fontWeight: '500', marginBottom: '14px' }}>
              Bạn có chắc chắn muốn xóa <strong style={{ color: '#A0301B' }}>{deleteConfirmation.items.length}</strong> dòng giá tủ đã chọn không?
            </p>
          ) : null
        }
        renderItemDetails={(item, index, isExpanded, onToggle) => {
          const cleanCode = item.cabinet_code ? item.cabinet_code.split(/[\r\n\s]+/)[0].trim() : '';
          const productLine = cleanCode ? cleanCode.charAt(0).toUpperCase() : '';
          const itemCode = cleanCode ? cleanCode.split('-')[0].toUpperCase() : '';
          const colorCode = cleanCode && cleanCode.length >= 3 ? cleanCode.slice(-3).toUpperCase() : '';
          const displayName = item.cabinet_code || 'N/A';

          return (
            <div
              key={index}
              style={{
                borderBottom: deleteConfirmation && index === deleteConfirmation.items.length - 1 ? 'none' : '1px solid #FAF0E6',
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
                    <span style={{ fontWeight: '600', color: '#A0301B', wordBreak: 'break-all' }}>{item.cabinet_code || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: '1px dashed #EADCC9', paddingBottom: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Đơn giá:</span>
                    <span style={{ fontWeight: '700', color: '#2D1A12' }}>{formatPrice(item.sale_price)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: '1px dashed #EADCC9', paddingBottom: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Dòng hàng:</span>
                    <span style={{ color: '#2D1A12' }}>{productLine || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: '1px dashed #EADCC9', paddingBottom: '6px' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Mã hàng:</span>
                    <span style={{ color: '#2D1A12' }}>{itemCode || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', borderBottom: item.status ? '1px dashed #EADCC9' : 'none', paddingBottom: item.status ? '6px' : '0' }}>
                    <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Màu sắc:</span>
                    <span style={{ color: '#475569' }}>{colorCode || 'N/A'}</span>
                  </div>
                  {item.status && (
                    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px' }}>
                      <span style={{ color: '#7B5233', fontWeight: 'bold' }}>Trạng thái:</span>
                      <span style={{ color: '#2D1A12' }}>{item.status === 'Active' ? 'Đang áp dụng' : 'Dừng áp dụng'}</span>
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

export default PriceListView;
