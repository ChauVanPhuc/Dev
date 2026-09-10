import { useState, useEffect, useMemo } from 'react';
import api from '@/shared/services/api.service';
import * as XLSX from 'xlsx';

const INITIAL_G7_DEFECTS = [];
const INITIAL_CLIENT_DEFECTS = [];
const INITIAL_GLOSSARY_ATLAS = [];
const INITIAL_GLOSSARY_G7 = [];

export const useDefectManagement = () => {
  // --- Active Tab ---
  const [activeMainTab, setActiveMainTab] = useState('g7');

  // --- Data State ---
  const [g7Defects, setG7Defects] = useState(INITIAL_G7_DEFECTS);
  const [clientDefects, setClientDefects] = useState(INITIAL_CLIENT_DEFECTS);
  const [glossaryAtlas, setGlossaryAtlas] = useState(INITIAL_GLOSSARY_ATLAS);
  const [glossaryG7, setGlossaryG7] = useState(INITIAL_GLOSSARY_G7);
  const [loading, setLoading] = useState(false);

  // --- Dropdown and Action Popup State ---
  const [actionMenuId, setActionMenuId] = useState(null);
  const [quickSearch, setQuickSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAql, setSelectedAql] = useState('all');
  const [selectedMappingStatus, setSelectedMappingStatus] = useState('all');

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // --- Modals ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState('g7');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  // --- Toast ---
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  // --- Excel Import Modal State ---
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelWorkbook, setExcelWorkbook] = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [targetTab, setTargetTab] = useState('g7');
  const [parsedPreviewData, setParsedPreviewData] = useState([]);

  // Load backend data on mount
  useEffect(() => {
    const loadBackendData = async () => {
      try {
        setLoading(true);
        const [g7Data, clientData, glossaryData] = await Promise.all([
          api.get('/inspections/defect-types').catch(() => []),
          api.get('/inspections/client-defects').catch(() => []),
          api.get('/inspections/defect-glossary').catch(() => [])
        ]);

        if (Array.isArray(g7Data) && g7Data.length > 0) {
          const g7List = g7Data.map(item => ({
            id: item.id,
            code: item.code || `DEF-${item.id}`,
            name: item.name,
            aql_class: item.aql_class || 'Minor',
            description: item.description || '',
            category: item.category ? item.category.toUpperCase() : 'APP'
          }));
          setG7Defects(g7List);
        }

        if (Array.isArray(clientData) && clientData.length > 0) {
          const clientList = clientData.map(cd => ({
            id: cd.id,
            code: cd.code,
            name_en: cd.name_en || '',
            name: cd.name,
            method: cd.detection_method || 'MẮT',
            g7_code: cd.g7_code || ''
          }));
          setClientDefects(clientList);
        }

        if (Array.isArray(glossaryData)) {
          const atlas = glossaryData.filter(g => g.source === 'ATLAS').map(g => ({ code: g.code, description: g.description }));
          const g7 = glossaryData.filter(g => g.source === 'G7').map(g => ({ code: g.code, description: g.description }));
          setGlossaryAtlas(atlas);
          setGlossaryG7(g7);
        }
      } catch (err) {
        console.error('Error loading defect catalog:', err);
      } finally {
        setLoading(false);
      }
    };
    loadBackendData();
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSortDropdown(false);
      setIsOtherDropdownOpen(false);
      setIsExportDropdownOpen(false);
      setActionMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Reset pagination on filter or tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMainTab, quickSearch, selectedCategory, selectedAql, selectedMappingStatus, sortOption]);

  // Filtering G7 Defects
  const filteredG7Defects = useMemo(() => {
    let result = g7Defects.filter(item => {
      const q = quickSearch.toLowerCase();
      const matchesSearch = 
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesAql = selectedAql === 'all' || item.aql_class === selectedAql;

      return matchesSearch && matchesCat && matchesAql;
    });

    if (sortOption === 'code-asc') result.sort((a, b) => a.code.localeCompare(b.code));
    else if (sortOption === 'code-desc') result.sort((a, b) => b.code.localeCompare(a.code));
    else if (sortOption === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));

    return result;
  }, [g7Defects, quickSearch, selectedCategory, selectedAql, sortOption]);

  // Filtering Client Defects
  const filteredClientDefects = useMemo(() => {
    let result = clientDefects.filter(item => {
      const q = quickSearch.toLowerCase();
      const matchesSearch = 
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.name_en && item.name_en.toLowerCase().includes(q)) ||
        (item.method && item.method.toLowerCase().includes(q)) ||
        (item.g7_code && item.g7_code.toLowerCase().includes(q));

      let matchesMapping = true;
      if (selectedMappingStatus === 'mapped') matchesMapping = Boolean(item.g7_code);
      else if (selectedMappingStatus === 'unmapped') matchesMapping = !item.g7_code;

      return matchesSearch && matchesMapping;
    });

    if (sortOption === 'code-asc') result.sort((a, b) => a.code.localeCompare(b.code));
    else if (sortOption === 'code-desc') result.sort((a, b) => b.code.localeCompare(a.code));
    else if (sortOption === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));

    return result;
  }, [clientDefects, quickSearch, selectedMappingStatus, sortOption]);

  // Counts
  const g7CategoryCounts = useMemo(() => {
    const counts = { MAT: 0, STR: 0, PAI: 0, APP: 0 };
    g7Defects.forEach(d => {
      if (counts[d.category] !== undefined) counts[d.category]++;
    });
    return counts;
  }, [g7Defects]);

  const clientMappedCount = useMemo(() => {
    return clientDefects.filter(c => c.g7_code).length;
  }, [clientDefects]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedAql !== 'all') count++;
    if (selectedMappingStatus !== 'all') count++;
    return count;
  }, [selectedCategory, selectedAql, selectedMappingStatus]);

  // Pagination calculation
  const currentList = activeMainTab === 'g7' ? filteredG7Defects : filteredClientDefects;
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = currentList.slice(startIndex, startIndex + pageSize);

  // Excel Import handlers
  const handleOpenImportModal = (presetTargetTab = null) => {
    const target = presetTargetTab || activeMainTab;
    setTargetTab(target);
    setExcelFile(null);
    setExcelWorkbook(null);
    setAvailableSheets([]);
    setSelectedSheet('');
    setParsedPreviewData([]);
    setIsImportModalOpen(true);
  };

  const parseSheetData = (wb, sheetName, destinationTab) => {
    if (!wb || !sheetName) return;
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (jsonRows.length < 2) {
      setParsedPreviewData([]);
      return;
    }

    let headerIdx = jsonRows.findIndex(r => Array.isArray(r) && r.some(c => c && String(c).toUpperCase().includes('MÃ LỖI')));
    if (headerIdx === -1) headerIdx = 0;

    const headers = jsonRows[headerIdx].map(c => String(c || '').trim().toUpperCase());
    const dataRows = jsonRows.slice(headerIdx + 1).filter(r => r.some(cell => cell !== undefined && cell !== ''));

    const findCol = (keywords, fallbackIdx) => {
      const foundIdx = headers.findIndex(h => keywords.some(k => h.includes(k.toUpperCase())));
      return foundIdx !== -1 ? foundIdx : fallbackIdx;
    };

    if (destinationTab === 'g7') {
      const codeIdx = findCol(['MÃ LỖI', 'MA LOI'], 1);
      const nameIdx = findCol(['TÊN LỖI', 'TEN LOI'], 2);
      const aqlIdx = findCol(['AQL', 'PHÂN LOẠI AQL'], 3);
      const descIdx = findCol(['MÔ TẢ', 'MO TA', 'TIÊU CHUẨN', 'GHI NHẬT KÝ'], 4);
      const catIdx = findCol(['PHÂN LOẠI', 'PHAN LOAI', 'NHÓM'], 5);

      const parsed = dataRows.map((row, idx) => {
        const code = String(row[codeIdx] || row[1] || row[0] || '').trim();
        const name = String(row[nameIdx] || row[2] || row[1] || '').trim();
        const aql = String(row[aqlIdx] || 'Minor').trim();
        const desc = String(row[descIdx] || '').trim();
        const cat = String(row[catIdx] || 'MAT').trim().toUpperCase();

        return {
          id: Date.now() + idx,
          code: code || `G7-${idx + 1}`,
          name: name || 'Chưa đặt tên',
          aql_class: aql,
          description: desc,
          category: ['MAT', 'STR', 'PAI', 'APP'].includes(cat) ? cat : 'MAT'
        };
      });
      setParsedPreviewData(parsed);
    } else if (destinationTab === 'client') {
      const codeIdx = findCol(['MÃ LỖI', 'MA LOI'], 0);
      const nameEnIdx = findCol(['TIẾNG ANH', 'ENGLISH', 'NAME EN'], 1);
      const nameIdx = findCol(['TÊN LỖI', 'TEN LOI'], 2);
      const methodIdx = findCol(['PHƯƠNG PHÁP', 'XÁC ĐỊNH', 'METHOD'], 6);
      const g7CodeIdx = findCol(['MÃ LỖI TẠI G7', 'G7'], 7);

      const parsed = dataRows.map((row, idx) => {
        const code = String(row[codeIdx] || row[0] || '').trim();
        const name_en = String(row[nameEnIdx] || row[1] || '').trim();
        const name = String(row[nameIdx] || row[2] || '').trim();
        const method = String(row[methodIdx] || row[6] || row[3] || 'MẮT').trim();
        const g7_code = String(row[g7CodeIdx] || row[7] || row[4] || '').trim();

        return {
          id: Date.now() + idx,
          code: code || `KH-${idx + 1}`,
          name_en: name_en,
          name: name || 'Chưa đặt tên',
          method: method,
          g7_code: g7_code
        };
      });
      setParsedPreviewData(parsed);
    } else if (destinationTab === 'classification') {
      const parsed = dataRows.map((row) => ({
        code: String(row[0] || '').trim(),
        description: String(row[1] || '').trim()
      })).filter(item => {
        if (!item.code || !item.description) return false;
        const codeUp = item.code.toUpperCase();
        const descUp = item.description.toUpperCase();
        if (['KÝ TỰ', 'KÝ HIỆU', 'STT'].includes(codeUp)) return false;
        if (['MÔ TẢ', 'MÔ TẢ CHI TIẾT'].includes(descUp)) return false;
        return true;
      });
      setParsedPreviewData(parsed);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setExcelFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setExcelWorkbook(wb);
        const sheets = wb.SheetNames;
        setAvailableSheets(sheets);

        if (sheets.length > 0) {
          let autoSheet = sheets[0];
          if (targetTab === 'g7') {
            const found = sheets.find(s => s.toLowerCase().includes('g7'));
            if (found) autoSheet = found;
          } else if (targetTab === 'client') {
            const found = sheets.find(s => s.toLowerCase().includes('khách') || s.toLowerCase().includes('client'));
            if (found) autoSheet = found;
          } else if (targetTab === 'classification') {
            const found = sheets.find(s => s.toLowerCase().includes('bảng') || s.toLowerCase().includes('phân loại') || s.toLowerCase().includes('chú thích'));
            if (found) autoSheet = found;
          }
          setSelectedSheet(autoSheet);
          parseSheetData(wb, autoSheet, targetTab);
        }
      } catch (err) {
        console.error('Lỗi khi đọc file Excel:', err);
        showToast('Không thể đọc định dạng file Excel đã chọn', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSelectSheetChange = (e) => {
    const sheetName = e.target.value;
    setSelectedSheet(sheetName);
    parseSheetData(excelWorkbook, sheetName, targetTab);
  };

  const handleTargetTabChange = (e) => {
    const newTarget = e.target.value;
    setTargetTab(newTarget);
    parseSheetData(excelWorkbook, selectedSheet, newTarget);
  };

  const handleConfirmImport = async () => {
    if (parsedPreviewData.length === 0) {
      showToast('Không có dữ liệu để nhập!', 'error');
      return;
    }

    try {
      setLoading(true);
      await api.post('/inspections/import-excel-data', {
        targetTab: targetTab,
        items: parsedPreviewData
      });

      if (targetTab === 'g7') {
        setG7Defects(parsedPreviewData);
        setActiveMainTab('g7');
        showToast(`Đã lưu thành công ${parsedPreviewData.length} mã lỗi G7 vào CSDL!`, 'success');
      } else if (targetTab === 'client') {
        setClientDefects(parsedPreviewData);
        setActiveMainTab('client');
        showToast(`Đã lưu thành công ${parsedPreviewData.length} mã lỗi Khách Hàng vào CSDL!`, 'success');
      } else if (targetTab === 'classification') {
        const atlasItems = parsedPreviewData.filter(i => i.code.startsWith('DV') || ['NP', 'DF'].includes(i.code));
        const g7Items = parsedPreviewData.filter(i => !i.code.startsWith('DV') && !['NP', 'DF'].includes(i.code));
        if (atlasItems.length > 0) setGlossaryAtlas(atlasItems);
        if (g7Items.length > 0) setGlossaryG7(g7Items);
        setActiveMainTab('classification');
        showToast(`Đã lưu thành công bảng chú thích phân loại lỗi vào CSDL!`, 'success');
      }
    } catch (err) {
      console.error('Lỗi khi lưu dữ liệu vào CSDL:', err);
      showToast('Lỗi khi lưu dữ liệu vào CSDL', 'error');
    } finally {
      setLoading(false);
      setIsImportModalOpen(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const g7Rows = g7Defects.map((item, idx) => ({
        'STT': idx + 1,
        'Mã Lỗi': item.code,
        'Tên Lỗi Ngắn Gọn': item.name,
        'Phân Loại AQL': item.aql_class,
        'Mô Tả': item.description,
        'Phân loại': item.category
      }));
      const wsG7 = XLSX.utils.json_to_sheet(g7Rows);
      XLSX.utils.book_append_sheet(wb, wsG7, 'Lỗi G7');

      const clientRows = clientDefects.map((item, idx) => ({
        'STT': idx + 1,
        'MÃ LỖI': item.code,
        'TÊN TIẾNG ANH': item.name_en,
        'TÊN LỖI': item.name,
        'PHƯƠNG PHÁP XÁC ĐỊNH': item.method,
        'Mã lỗi tại G7': item.g7_code
      }));
      const wsClient = XLSX.utils.json_to_sheet(clientRows);
      XLSX.utils.book_append_sheet(wb, wsClient, 'Lỗi khách');

      const classRows = [
        ...glossaryAtlas.map(a => ({ 'KÝ TỰ': a.code, 'MÔ TẢ': a.description, 'NGUỒN': 'ATLAS' })),
        ...glossaryG7.map(g => ({ 'KÝ TỰ': g.code, 'MÔ TẢ': g.description, 'NGUỒN': 'G7' }))
      ];
      const wsClass = XLSX.utils.json_to_sheet(classRows);
      XLSX.utils.book_append_sheet(wb, wsClass, 'Bảng phân loại');

      XLSX.writeFile(wb, `Bang_Ma_Loi_QC_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Đã xuất file Excel thành công!', 'success');
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast('Không thể xuất file Excel', 'error');
    }
  };

  // Create / Edit modal handlers
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    if (activeMainTab === 'g7') {
      setFormType('g7');
      setFormData({ code: '', name: '', aql_class: 'Minor', description: '', category: 'MAT' });
    } else {
      setFormType('client');
      setFormData({ code: '', name_en: '', name: '', method: 'MẮT', g7_code: '' });
    }
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (item, type) => {
    setEditingItem(item);
    setFormType(type);
    setFormData({ ...item });
    setIsFormOpen(true);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      showToast('Vui lòng điền đầy đủ Mã Lỗi và Tên Lỗi!', 'error');
      return;
    }

    if (formType === 'g7') {
      if (editingItem) {
        setG7Defects(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formData } : item));
        showToast(`Đã cập nhật mã lỗi G7: ${formData.code}`, 'success');
      } else {
        const newItem = { id: Date.now(), ...formData };
        setG7Defects(prev => [newItem, ...prev]);
        showToast(`Đã thêm mới mã lỗi G7: ${formData.code}`, 'success');
      }
    } else {
      if (editingItem) {
        setClientDefects(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...formData } : item));
        showToast(`Đã cập nhật mã lỗi Khách Hàng: ${formData.code}`, 'success');
      } else {
        const newItem = { id: Date.now(), ...formData };
        setClientDefects(prev => [newItem, ...prev]);
        showToast(`Đã thêm mới mã lỗi Khách Hàng: ${formData.code}`, 'success');
      }
    }
    setIsFormOpen(false);
  };

  const handleDeleteItem = (item, type) => {
    setDeleteTarget({ ...item, type });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'g7') {
      setG7Defects(prev => prev.filter(item => item.id !== deleteTarget.id));
      showToast(`Đã xóa mã lỗi G7: ${deleteTarget.code}`, 'success');
    } else {
      setClientDefects(prev => prev.filter(item => item.id !== deleteTarget.id));
      showToast(`Đã xóa mã lỗi Khách Hàng: ${deleteTarget.code}`, 'success');
    }
    setDeleteTarget(null);
  };

  return {
    activeMainTab, setActiveMainTab,
    g7Defects, clientDefects, glossaryAtlas, glossaryG7, loading,
    actionMenuId, setActionMenuId,
    quickSearch, setQuickSearch,
    sortOption, setSortOption,
    showSortDropdown, setShowSortDropdown,
    isFilterBarOpen, setIsFilterBarOpen,
    isOtherDropdownOpen, setIsOtherDropdownOpen,
    isExportDropdownOpen, setIsExportDropdownOpen,
    selectedCategory, setSelectedCategory,
    selectedAql, setSelectedAql,
    selectedMappingStatus, setSelectedMappingStatus,
    currentPage, setCurrentPage,
    pageSize, setPageSize,
    totalItems, totalPages, startIndex, paginatedList,
    g7CategoryCounts, clientMappedCount, activeFiltersCount,
    isFormOpen, setIsFormOpen,
    formType, setFormType,
    editingItem, setEditingItem,
    formData, setFormData,
    deleteTarget, setDeleteTarget,
    toast, showToast,
    isImportModalOpen, setIsImportModalOpen,
    excelFile, availableSheets, selectedSheet, targetTab, parsedPreviewData,
    handleOpenImportModal, handleFileUpload, handleSelectSheetChange, handleTargetTabChange, handleConfirmImport,
    handleExportExcel, handleOpenCreateModal, handleOpenEditModal, handleSaveForm, handleDeleteItem, handleConfirmDelete
  };
};
