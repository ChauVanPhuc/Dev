import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, Filter, Plus, Trash2, Layers, CheckCircle, Clock, Palette, FileUp } from 'lucide-react';
import { claimService } from '../../services/claim.service';
import * as XLSX from 'xlsx';
import { API_ROOT } from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import '../../styles/claim.css';
import '@styles/components.css';

// Import shared components
import { Table } from '../../components/Table';
import { Pagination } from '../../components/Pagination';
import { FilterModal, FormModal, AlertModal } from '../../components/Modal';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import {
  MOCK_CABINET_PRICES,
  getColorName,
  renderCabinetThumbnail
} from './priceListUtils';

const PriceListView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, showModal: contextShowModal } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/prices');
  const [localNotification, setLocalNotification] = useState(null);

  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle(title);
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle(subtitle || '');
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  const loggedInUser = JSON.parse(localStorage.getItem('smartflow_user') || '{}');
  const loggedInUserIsAdmin = loggedInUser.role_name === 'IT' || loggedInUser.role_name === 'BGD' || loggedInUser.username === 'admin';

  let activePermissions = {};
  try {
    activePermissions = JSON.parse(localStorage.getItem('smartflow_active_permissions') || '{}');
  } catch (e) {
    console.error('Failed to parse screen permissions in PriceListView:', e);
  }

  const hasWritePermission = loggedInUserIsAdmin || activePermissions['prices'] !== 'read';

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
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
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

  const [itemsPerPage, setItemsPerPage] = useState(15);

  const statCards = React.useMemo(() => {
    const totalCount = allPrices.length;
    const activeCount = allPrices.filter(p => p.status === 'Active').length;
    const inactiveCount = allPrices.filter(p => p.status === 'Inactive' || p.status === 'Pending').length;
    const colorsCount = uniqueColors.length;

    return [
      { label: 'TỔNG SẢN PHẨM', value: totalCount, iconBg: '#FAF6F0', iconColor: '#7B5233', Icon: Layers },
      { label: 'ĐANG ÁP DỤNG', value: activeCount, iconBg: '#ECFDF5', iconColor: '#10B981', Icon: CheckCircle },
      { label: 'TẠM DỪNG', value: inactiveCount, iconBg: '#FFFBEB', iconColor: '#F59E0B', Icon: Clock },
      { label: 'MÀU SẮC / DÒNG', value: `${colorsCount} màu / ${uniqueLines.length} dòng`, iconBg: '#EFF6FF', iconColor: '#3B82F6', Icon: Palette },
    ];
  }, [allPrices, uniqueColors, uniqueLines]);

  // Reset page when data, search, or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [prices, search, sortOption, filterLine, filterCode, filterColor, filterStatus, filterMinPrice, filterMaxPrice, itemsPerPage]);

  // Reactive filtering logic
  useEffect(() => {
    let filtered = [...allPrices];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(item => 
        (item.cabinet_code && item.cabinet_code.toLowerCase().includes(searchLower)) ||
        (item.cabinet_name && item.cabinet_name.toLowerCase().includes(searchLower)) ||
        (item.material && item.material.toLowerCase().includes(searchLower))
      );
    }
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
  }, [allPrices, search, filterLine, filterCode, filterColor, filterStatus, filterMinPrice, filterMaxPrice]);

  // Pagination computed values
  const sortedPrices = getSortedPrices(prices);
  const totalFilteredItems = sortedPrices.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
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
    reader.onload = (evt) => {
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
          setAllPrices(nextPrices);
          claimService.saveCabinetPricesTemp(nextPrices).catch(err => {
            console.error("Lỗi lưu trữ giá tạm thời:", err);
          });
          showModal('Thành công', `Đã nhập khẩu thành công ${importedItems.length} sản phẩm tủ gỗ từ file ${file.name}!`, 'success');
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

  const handleResolveDuplicates = (choice) => {
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
      setAllPrices(nextPrices);
      claimService.saveCabinetPricesTemp(nextPrices).catch(err => {
        console.error("Lỗi lưu trữ giá tạm thời:", err);
      });
      showModal('Thành công', `Đã cập nhật giá mới cho ${duplicates.length} sản phẩm trùng và thêm mới ${uniqueImported.length} sản phẩm từ file ${fileName}!`, 'success');
    } else if (choice === 'old') {
      const nextPrices = [...finalizedNewItems, ...updatedPricesList];
      setAllPrices(nextPrices);
      claimService.saveCabinetPricesTemp(nextPrices).catch(err => {
        console.error("Lỗi lưu trữ giá tạm thời:", err);
      });
      showModal('Thành công', `Đã giữ lại giá cũ cho ${duplicates.length} sản phẩm trùng và thêm mới ${uniqueImported.length} sản phẩm mới từ file ${fileName}!`, 'success');
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

  const handleCreateCabinet = (e) => {
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
    claimService.saveCabinetPricesTemp(nextPrices).catch(err => {
      console.error("Lỗi lưu trữ giá tạm thời:", err);
    });

    setIsAddModalOpen(false);
    setNewCode('');
    setNewName('');
    setNewSalePrice('');
    setNewImages([]);
    setNewImageCaptions([]);
    setEditingCabinet(null);
  };

  

  useEffect(() => {
    fetchPrices();
  }, [search]);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const response = await claimService.getCabinetPrices({
        search: search || undefined
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
    <div className="manufacture-plan-container mgmt-container">
      {/* Toast Notification */}
      {localNotification && (
        <div className={`toast-notification ${localNotification.type}`}>
          <div className="toast-content">
            <span className="toast-icon">{localNotification.type === 'error' ? '❌' : '✅'}</span>
            <span className="toast-text">{localNotification.message}</span>
          </div>
        </div>
      )}

      {/* ── Phần nội dung chính ── */}
      <div className="mgmt-main">
        {/* ── STICKY TOP ZONE (Fixed top container) ── */}
        <div className="sticky-top-zone">
          {/* KPI Stat Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '10px',
            marginBottom: '8px',
            width: '100%'
          }}>
            {statCards.map((stat, idx) => (
              <div key={idx} className="kpi-card" style={{
                background: '#fff', border: '1px solid #E2E8F0',
                padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  backgroundColor: stat.iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: stat.iconColor, flexShrink: 0
                }}>
                  <stat.Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700', letterSpacing: '0.05em' }}>{stat.label}</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Standard PageToolbar */}
          <PageToolbar
            searchValue={search}
            onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
            searchPlaceholder="Tìm kiếm nhanh tên sản phẩm, mã hàng..."
            showSort={true}
            sortOptions={[
              { value: 'name-asc', label: 'Tên: A → Z' },
              { value: 'name-desc', label: 'Tên: Z → A' },
              { value: 'time-desc', label: 'Mới cập nhật nhất' },
              { value: 'time-asc', label: 'Cũ nhất' }
            ]}
            sortValue={sortOption}
            onSortChange={(val) => setSortOption(val)}
            showFilter={true}
            isFilterOpen={isFilterBarOpen}
            onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
            activeFiltersCount={Object.keys(appliedFilters).length}
            importActions={[
              {
                label: 'Nhập từ Excel (.xlsx)',
                icon: <FileUp size={14} />,
                onClick: () => (excelInputRef.current || document.getElementById('price-excel-upload'))?.click()
              }
            ]}
            onExport={handleExportExcel}
            onCreate={handleOpenAddModal}
            createLabel="Thêm mới"
            hasWritePermission={hasWritePermission}
            extraActions={
              selectedPriceIds.length > 0 ? [
                {
                  label: 'Xóa các mục đã chọn',
                  icon: <Trash2 size={14} />,
                  color: '#EF4444',
                  badge: selectedPriceIds.length,
                  badgeColor: '#EF4444',
                  onClick: handleDeleteSelected,
                  requireWrite: true
                }
              ] : []
            }
          />

          <input
            id="price-excel-upload"
            type="file"
            ref={excelInputRef}
            style={{ display: 'none' }}
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
          />

          {/* INLINE EXPANDABLE FILTER BAR */}
          {isFilterBarOpen && (
            <div className="filter-inline-bar">
              {/* Dòng hàng */}
              <div className="filter-field-group">
                <label className="filter-field-label">Dòng hàng</label>
                <select value={filterLine} onChange={(e) => { setFilterLine(e.target.value); setCurrentPage(1); }}>
                  <option value="">Tất cả dòng hàng</option>
                  {uniqueLines.map(line => (
                    <option key={line} value={line}>{line}</option>
                  ))}
                </select>
              </div>

              {/* Màu sắc */}
              <div className="filter-field-group">
                <label className="filter-field-label">Màu sắc</label>
                <select value={filterColor} onChange={(e) => { setFilterColor(e.target.value); setCurrentPage(1); }}>
                  <option value="">Tất cả màu sắc</option>
                  {uniqueColors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              {/* Trạng thái */}
              <div className="filter-field-group">
                <label className="filter-field-label">Trạng thái áp dụng</label>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="Active">Đang áp dụng</option>
                  <option value="Inactive">Dừng áp dụng</option>
                </select>
              </div>

              {/* Khoảng giá min */}
              <div className="filter-field-group">
                <label className="filter-field-label">Giá từ ($)</label>
                <input
                  type="number"
                  placeholder="VD: 50"
                  value={filterMinPrice}
                  onChange={(e) => { setFilterMinPrice(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Khoảng giá max */}
              <div className="filter-field-group">
                <label className="filter-field-label">Giá đến ($)</label>
                <input
                  type="number"
                  placeholder="VD: 200"
                  value={filterMaxPrice}
                  onChange={(e) => { setFilterMaxPrice(e.target.value); setCurrentPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                />
              </div>

              {/* Hiển thị số dòng */}
              <div className="filter-field-group">
                <label className="filter-field-label">Hiển thị số dòng</label>
                <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}>
                  <option value={15}>15 dòng</option>
                  <option value={30}>30 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                </select>
              </div>
            </div>
          )}

          {/* Applied Filter Chips */}
          {Object.keys(appliedFilters).length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '4px 8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8D6E63' }}>Đã lọc:</span>
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
                  <div key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FAF6F0', color: '#7B5233', fontSize: '0.78rem', fontWeight: '700', padding: '2px 8px', borderRadius: '4px', border: '1px solid #EADCC9' }}>
                    <span>{displayLabel}</span>
                    <button type="button" onClick={() => removeFilterKey(key)} style={{ background: 'none', border: 'none', color: '#A0301B', cursor: 'pointer', fontWeight: 'bold', marginLeft: '2px' }}>&times;</button>
                  </div>
                );
              })}
              <button type="button" onClick={clearAllFilters} style={{ background: 'none', border: 'none', color: '#A0301B', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', textDecoration: 'underline', marginLeft: 'auto' }}>Xóa tất cả bộ lọc</button>
            </div>
          )}
        </div>

        {/* ── Bảng dữ liệu chuẩn /admin/users ── */}
        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            {loading ? (
              <div className="loading-state" style={{ padding: '3rem', textAlign: 'center', color: '#94A3B8' }}>Đang tải dữ liệu...</div>
            ) : prices.length === 0 ? (
              <div className="loading-state" style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}>Không tìm thấy đơn giá sản phẩm nào.</div>
            ) : (
              <>
                <div className="table-responsive desktop-only admin-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {hasWritePermission && (
                          <th style={{ width: '40px', textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              className="checkbox-custom"
                              checked={paginatedPrices.length > 0 && paginatedPrices.every(p => selectedPriceIds.includes(p.id))}
                              onChange={handleToggleSelectAll}
                            />
                          </th>
                        )}
                        <th style={{ width: '60px' }}>STT</th>
                        <th>Tên sản phẩm</th>
                        <th>Tên sản phẩm (new)</th>
                        <th>Dòng hàng</th>
                        <th>Dòng hàng (new)</th>
                        <th>Mã hàng</th>
                        <th>Màu sắc</th>
                        <th>Đơn giá bán ($)</th>
                        <th style={{ textAlign: 'center' }}>Trạng thái</th>
                        {hasWritePermission && <th style={{ textAlign: 'center' }}>Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPrices.map((item, idx) => {
                        const cleanCode = item.cabinet_code ? item.cabinet_code.split(/[\r\n\s]+/)[0].trim() : '';
                        const productLine = cleanCode ? cleanCode.charAt(0).toUpperCase() : '';
                        const itemCode = cleanCode ? cleanCode.split('-')[0].toUpperCase() : '';
                        const colorCode = cleanCode && cleanCode.length >= 3 ? cleanCode.slice(-3).toUpperCase() : '';

                        return (
                          <tr
                            key={item.id}
                            className="animate-card-entrance"
                            style={{
                              position: 'relative',
                              zIndex: actionMenuId === item.id ? 30 : 1
                            }}
                          >
                            {hasWritePermission && (
                              <td className="checkbox-col" style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  className="checkbox-custom"
                                  checked={selectedPriceIds.includes(item.id)}
                                  onChange={() => handleToggleSelectRow(item.id)}
                                />
                              </td>
                            )}
                            <td style={{ fontWeight: '600', color: 'var(--text-gray)' }}>{startIndex + idx + 1}</td>
                            <td className="text-left" style={{ fontWeight: '600', color: '#2D1A12' }}>{item.cabinet_code}</td>
                            <td className="text-left" style={{ fontWeight: '500', color: '#7B5233' }}>{item.cabinet_name}</td>
                            <td className="text-left" style={{ fontWeight: '500', color: '#5D4037' }}>{item.series || productLine}</td>
                            <td className="text-left" style={{ fontWeight: '500', color: '#5D4037' }}>{item.new_series || ''}</td>
                            <td className="code-ref text-left" style={{ fontWeight: '500' }}>{item.material || itemCode}</td>
                            <td className="text-left" style={{ fontWeight: '500', color: '#5D4037' }}>{item.dimensions || colorCode}</td>
                            <td className="value-penalty text-left" style={{ fontWeight: '700', color: '#2D1A12' }}>{formatPrice(item.sale_price)}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge badge-${item.status === 'Active' ? 'new' : 'pending'}`}>
                                {item.status === 'Active' ? 'Đang áp dụng' : 'Dừng áp dụng'}
                              </span>
                            </td>
                            {hasWritePermission && (
                              <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === item.id ? 40 : 1 }}>
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(actionMenuId === item.id ? null : item.id);
                                  }}
                                ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
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
                                    <button
                                      className="action-menu-item danger"
                                      onClick={() => {
                                        setActionMenuId(null);
                                        handleDeletePrice(item.id);
                                      }}
                                    >
                                      Xóa đơn giá
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phân trang Desktop - Đồng bộ chuẩn với /admin/users */}
                <div className="admin-pagination-desktop desktop-only">
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{totalFilteredItems > 0 ? startIndex + 1 : 0}–{Math.min(endIndex, totalFilteredItems)}</b> trên <b>{totalFilteredItems}</b> sản phẩm
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        disabled={safeCurrentPage === 1}
                        onClick={() => setCurrentPage(safeCurrentPage - 1)}
                        className="page-btn"
                        style={{ padding: '8px 12px' }}
                      >
                        &lt; Trước
                      </button>
                      {(() => {
                        const pages = [];
                        const delta = 2;
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
                            pages.push(i);
                          } else if (pages[pages.length - 1] !== '...') {
                            pages.push('...');
                          }
                        }
                        return pages.map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`ell-${idx}`} style={{ padding: '0 8px', color: '#7B5233', fontWeight: '700' }}>
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={p}
                              className={`page-btn ${safeCurrentPage === p ? 'active' : ''}`}
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}
                      <button
                        disabled={safeCurrentPage >= totalPages}
                        onClick={() => setCurrentPage(safeCurrentPage + 1)}
                        className="page-btn"
                        style={{ padding: '8px 12px' }}
                      >
                        Sau &gt;
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Phân trang Mobile Sticky */}
        {totalPages > 1 && (
          <div className="pagination-mobile-sticky mobile-only">
            <button className="page-btn" onClick={() => setCurrentPage(Math.max(safeCurrentPage - 1, 1))} disabled={safeCurrentPage === 1}>
              &lt;
            </button>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {safeCurrentPage} / {totalPages || 1}</span>
            <button className="page-btn" onClick={() => setCurrentPage(Math.min(safeCurrentPage + 1, totalPages))} disabled={safeCurrentPage === totalPages || totalPages <= 1}>
              &gt;
            </button>
          </div>
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