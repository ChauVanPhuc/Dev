import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/shared/services/api.service';
import * as XLSX from 'xlsx';
import {
  Search, Plus, Edit, Trash2, Upload, Download,
  CheckCircle, AlertTriangle, X, ChevronLeft, ChevronRight,
  Filter, Layers, Table, FileSpreadsheet, Info, ShieldAlert,
  Users, CheckSquare, Eye, ArrowRight, ChevronDown, Grid
} from 'lucide-react';
import '@/shared/styles/components.css';
import '@/modules/claim/styles/claim.css';
import Pagination from '@/modules/claim/components/Pagination';

// Dữ liệu mặc định rỗng để chờ nhập từ Excel
const INITIAL_G7_DEFECTS = [];
const INITIAL_CLIENT_DEFECTS = [];

const INITIAL_GLOSSARY_ATLAS = [];
const INITIAL_GLOSSARY_G7 = [];

// ─── COMPONENT: Bảng phân loại - 2 bảng đặt cạnh nhau + cuộn nội bộ + thanh phân trang ────────
const ClassificationTab = ({ glossaryAtlas, glossaryG7 }) => {
  const [pageAtlas, setPageAtlas] = useState(1);
  const [pageG7, setPageG7] = useState(1);
  const pageSize = 15;

  const totalAtlasItems = glossaryAtlas.length;
  const totalAtlasPages = Math.max(1, Math.ceil(totalAtlasItems / pageSize));
  const startAtlas = (pageAtlas - 1) * pageSize;
  const paginatedAtlas = glossaryAtlas.slice(startAtlas, startAtlas + pageSize);

  const totalG7Items = glossaryG7.length;
  const totalG7Pages = Math.max(1, Math.ceil(totalG7Items / pageSize));
  const startG7 = (pageG7 - 1) * pageSize;
  const paginatedG7 = glossaryG7.slice(startG7, startG7 + pageSize);

  const GlossaryTableCard = ({
    title,
    headerBg,
    paginatedData,
    rowBadgeBg,
    rowBadgeText,
    colTitleColor,
    footerBg,
    footerBorder,
    footerTextColor,
    accentColor,
    currentPage,
    totalPages,
    startIndex,
    totalItems,
    onPageChange
  }) => (
    <div style={{
      backgroundColor: '#FFF',
      borderRadius: '12px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      border: `1px solid ${footerBorder}`
    }}>
      <div style={{ backgroundColor: headerBg, color: '#FFF', padding: '12px 20px', fontWeight: '800', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
        {title} ({totalItems})
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#FFF', borderBottom: `2px solid ${rowBadgeBg}` }}>
              <th style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: '800', color: colTitleColor, width: '60px', textAlign: 'center', backgroundColor: `${rowBadgeBg}40` }}>STT</th>
              <th style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: '800', color: colTitleColor, width: '110px', backgroundColor: `${rowBadgeBg}40` }}>KÝ TỰ</th>
              <th style={{ padding: '10px 16px', fontSize: '0.82rem', fontWeight: '800', color: colTitleColor, backgroundColor: `${rowBadgeBg}40` }}>MÔ TẢ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  Không tìm thấy dữ liệu chú thích.
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: '600', color: '#6B7280', textAlign: 'center' }}>
                    {startIndex + idx + 1}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ backgroundColor: rowBadgeBg, color: rowBadgeText, padding: '3px 10px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '800', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {item.code}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: '0.85rem', fontWeight: '600', color: '#1F2937', lineHeight: '1.5' }}>
                    {item.description}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* THANH FOOTER PHÂN TRANG THEO TONE MÀU ĐỒNG BỘ VÀ CĂN PHẢI CHUẨN */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '10px 16px',
        backgroundColor: footerBg,
        borderTop: `1px solid ${footerBorder}`,
        flexShrink: 0,
        gap: '12px'
      }}>
        <div style={{ color: footerTextColor, fontSize: '0.8rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
          Hiển thị <b>{totalItems === 0 ? 0 : startIndex + 1}</b>–<b>{Math.min(startIndex + paginatedData.length, totalItems)}</b> trên <b>{totalItems}</b> kết quả
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginLeft: 'auto' }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${footerBorder}`,
              backgroundColor: '#FFFFFF',
              color: footerTextColor,
              cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage <= 1 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: `1px solid ${page === currentPage ? accentColor : footerBorder}`,
                backgroundColor: page === currentPage ? accentColor : '#FFFFFF',
                color: page === currentPage ? '#FFFFFF' : footerTextColor,
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${footerBorder}`,
              backgroundColor: '#FFFFFF',
              color: footerTextColor,
              cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage >= totalPages ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        flex: 1,
        overflow: 'hidden'
      }}>
        <GlossaryTableCard
          title="BẢNG CHÚ THÍCH KÝ TỰ VIẾT TẮT CỦA ATLAS"
          headerBg="#15803D"
          rowBadgeBg="#DCFCE7"
          rowBadgeText="#166534"
          colTitleColor="#166534"
          footerBg="#F0FDF4"
          footerBorder="#DCFCE7"
          footerTextColor="#166534"
          accentColor="#15803D"
          paginatedData={paginatedAtlas}
          currentPage={pageAtlas}
          totalPages={totalAtlasPages}
          startIndex={startAtlas}
          totalItems={totalAtlasItems}
          onPageChange={setPageAtlas}
        />
        <GlossaryTableCard
          title="BẢNG CHÚ THÍCH PHÂN LOẠI LỖI TẠI G7"
          headerBg="#0284C7"
          rowBadgeBg="#E0F2FE"
          rowBadgeText="#0369A1"
          colTitleColor="#0369A1"
          footerBg="#F0F9FF"
          footerBorder="#E0F2FE"
          footerTextColor="#0369A1"
          accentColor="#0284C7"
          paginatedData={paginatedG7}
          currentPage={pageG7}
          totalPages={totalG7Pages}
          startIndex={startG7}
          totalItems={totalG7Items}
          onPageChange={setPageG7}
        />
      </div>
    </div>
  );
};

export const DefectManagement = () => {
  // ─── Trạng thái Tab chính ───────────────────────────────────────────────
  // 3 tab theo thứ tự yêu cầu: 
  // 1. 'g7' (Mã lỗi G7 - Nội bộ)
  // 2. 'client' (Mã lỗi Khách Hàng - KH)
  // 3. 'classification' (Bảng phân loại)
  const [activeMainTab, setActiveMainTab] = useState('g7');

  // ─── Trạng thái dữ liệu ────────────────────────────────────────────────
  const [g7Defects, setG7Defects] = useState(INITIAL_G7_DEFECTS);
  const [clientDefects, setClientDefects] = useState(INITIAL_CLIENT_DEFECTS);
  const [glossaryAtlas, setGlossaryAtlas] = useState(INITIAL_GLOSSARY_ATLAS);
  const [glossaryG7, setGlossaryG7] = useState(INITIAL_GLOSSARY_G7);
  const [loading, setLoading] = useState(false);

  // ─── Trạng thái Action Menu Popup (Thao tác 3 chấm chuẩn Claim) ───────
  const [actionMenuId, setActionMenuId] = useState(null);

  // ─── Bộ lọc & Tìm kiếm (Khớp 100% với Toolbar Claim) ─────────────────
  const [quickSearch, setQuickSearch] = useState('');
  const [sortOption, setSortOption] = useState('');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [isOtherDropdownOpen, setIsOtherDropdownOpen] = useState(false);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedAql, setSelectedAql] = useState('all');
  const [selectedMappingStatus, setSelectedMappingStatus] = useState('all');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedG7CodeFilter, setSelectedG7CodeFilter] = useState('all');

  // ─── Phân trang ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ─── Modals Thêm/Sửa & Xóa ─────────────────────────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState('g7');
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ─── Toast Thông báo ───────────────────────────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  // ─── Excel Import Modal State ──────────────────────────────────────────
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [excelWorkbook, setExcelWorkbook] = useState(null);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [targetTab, setTargetTab] = useState('g7');
  const [parsedPreviewData, setParsedPreviewData] = useState([]);

  // Gọi API backend
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

  // Click ngoài đóng dropdowns & action menu
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

  // Reset phân trang khi đổi tab hoặc bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [activeMainTab, quickSearch, selectedCategory, selectedAql, selectedMappingStatus, selectedMethod, selectedG7CodeFilter, sortOption]);

  // ─── Danh sách Tùy chọn Lọc Động từ Dữ liệu ──────────────────────────
  const distinctCategories = useMemo(() => {
    const set = new Set();
    g7Defects.forEach(d => { if (d.category) set.add(d.category); });
    return Array.from(set).sort();
  }, [g7Defects]);

  const distinctAqls = useMemo(() => {
    const set = new Set(['Critical', 'Major', 'Minor']);
    g7Defects.forEach(d => { if (d.aql_class) set.add(d.aql_class); });
    return Array.from(set);
  }, [g7Defects]);

  const distinctMethods = useMemo(() => {
    const set = new Set();
    clientDefects.forEach(c => { if (c.method) set.add(c.method.trim()); });
    return Array.from(set).sort();
  }, [clientDefects]);

  const distinctG7Codes = useMemo(() => {
    const set = new Set();
    clientDefects.forEach(c => { if (c.g7_code) set.add(c.g7_code.trim()); });
    return Array.from(set).sort();
  }, [clientDefects]);

  // ─── Danh sách Lọc cho Tab 1: Mã lỗi G7 - Nội bộ ──────────────────────
  const filteredG7Defects = useMemo(() => {
    let result = g7Defects.filter(item => {
      const q = quickSearch.toLowerCase();
      const matchesSearch = !q ||
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

  // ─── Danh sách Lọc cho Tab 2: Mã lỗi Khách Hàng - KH ─────────────────
  const filteredClientDefects = useMemo(() => {
    let result = clientDefects.filter(item => {
      const q = quickSearch.toLowerCase();
      const matchesSearch = !q ||
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.name_en && item.name_en.toLowerCase().includes(q));

      let matchesMapping = true;
      if (selectedMappingStatus === 'mapped') matchesMapping = Boolean(item.g7_code && item.g7_code.trim() !== '');
      else if (selectedMappingStatus === 'unmapped') matchesMapping = !item.g7_code || item.g7_code.trim() === '';

      const matchesMethod = selectedMethod === 'all' || (item.method && item.method.trim() === selectedMethod);
      const matchesG7Code = selectedG7CodeFilter === 'all' ||
        (item.g7_code && (item.g7_code.trim() === selectedG7CodeFilter || item.g7_code.trim().startsWith(selectedG7CodeFilter)));

      return matchesSearch && matchesMapping && matchesMethod && matchesG7Code;
    });

    if (sortOption === 'code-asc') result.sort((a, b) => a.code.localeCompare(b.code));
    else if (sortOption === 'code-desc') result.sort((a, b) => b.code.localeCompare(a.code));
    else if (sortOption === 'name-asc') result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === 'name-desc') result.sort((a, b) => b.name.localeCompare(a.name));

    return result;
  }, [clientDefects, quickSearch, selectedMappingStatus, selectedMethod, selectedG7CodeFilter, sortOption]);

  // Đếm theo nhóm lỗi
  const g7CategoryCounts = useMemo(() => {
    const counts = { MAT: 0, STR: 0, PAI: 0, APP: 0 };
    g7Defects.forEach(d => {
      if (counts[d.category] !== undefined) counts[d.category]++;
    });
    return counts;
  }, [g7Defects]);

  const clientMappedCount = useMemo(() => {
    return clientDefects.filter(c => c.g7_code && c.g7_code.trim() !== '').length;
  }, [clientDefects]);

  // ─── Phân trang ────────────────────────────────────────────────────────
  const currentList = activeMainTab === 'g7' ? filteredG7Defects : filteredClientDefects;
  const totalItems = currentList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedList = currentList.slice(startIndex, startIndex + pageSize);

  // Đếm số lượng bộ lọc đang active theo từng tab
  const activeFiltersCount = useMemo(() => {
    if (activeMainTab === 'g7') {
      let count = 0;
      if (selectedCategory !== 'all') count++;
      if (selectedAql !== 'all') count++;
      return count;
    } else if (activeMainTab === 'client') {
      let count = 0;
      if (selectedMappingStatus !== 'all') count++;
      if (selectedMethod !== 'all') count++;
      if (selectedG7CodeFilter !== 'all') count++;
      return count;
    }
    return 0;
  }, [activeMainTab, selectedCategory, selectedAql, selectedMappingStatus, selectedMethod, selectedG7CodeFilter]);

  // ─── Xử lý Modal Nhập Dữ Liệu Excel Đa Sheet ──────────────────────────
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

  const parseSheetData = (wb, sheetName, destinationTab) => {
    if (!wb || !sheetName) return;
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const jsonRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    if (jsonRows.length < 2) {
      setParsedPreviewData([]);
      return;
    }

    // Tự động tìm dòng Tiêu đề (Header Row)
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
      const parsed = dataRows.map((row, idx) => ({
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

  // ─── Xuất Excel ────────────────────────────────────────────────────────
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

  // ─── Thêm / Sửa Mã Lỗi ─────────────────────────────────────────────────
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

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.id) {
      try {
        await api.delete(`/inspections/defect-types/${deleteTarget.id}`);
      } catch (err) {
        console.warn('API delete error:', err);
      }
    }

    if (deleteTarget.type === 'g7') {
      setG7Defects(prev => prev.filter(item => String(item.id) !== String(deleteTarget.id) && item.code !== deleteTarget.code));
      showToast(`Đã xóa mã lỗi G7: ${deleteTarget.code}`, 'success');
    } else {
      setClientDefects(prev => prev.filter(item => String(item.id) !== String(deleteTarget.id) && item.code !== deleteTarget.code));
      showToast(`Đã xóa mã lỗi Khách Hàng: ${deleteTarget.code}`, 'success');
    }
    setDeleteTarget(null);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 0 }}>
      {/* Toast thông báo */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          backgroundColor: toast.type === 'error' ? '#DC2626' : '#10B981',
          color: '#FFF',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* SECTION 1: TWO SUMMARY CARDS (CẤU TRÚC 1:1 CHUẨN CÁC THẺ TRÊN MÀN HÌNH CLAIM KHÁCH HÀNG) */}
      <div className="overview-cards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '12px',
        marginBottom: '12px'
      }}>
        {/* CARD 1: Phân loại lỗi G7 */}
        <div
          className="summary-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            cursor: 'default',
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3EAE0',
            borderRadius: '12px',
            boxShadow: 'none'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
              Phân loại lỗi G7
            </span>
            <span style={{ fontSize: '0.72rem', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>
              MAT: <strong style={{ color: '#7B5233', fontStyle: 'normal' }}>{g7CategoryCounts.MAT}</strong> | STR: <strong style={{ color: '#2563EB', fontStyle: 'normal' }}>{g7CategoryCounts.STR}</strong> | PAI: <strong style={{ color: '#D97706', fontStyle: 'normal' }}>{g7CategoryCounts.PAI}</strong> | APP: <strong style={{ color: '#059669', fontStyle: 'normal' }}>{g7CategoryCounts.APP}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2D1A12' }}>
              {g7Defects.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6B7280' }}>mã lỗi</span>
            </span>
          </div>
        </div>

        {/* CARD 2: Phân loại lỗi Khách hàng */}
        <div
          className="summary-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            cursor: 'default',
            backgroundColor: '#FFFFFF',
            border: '1px solid #F3EAE0',
            borderRadius: '12px',
            boxShadow: 'none'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: '#7B5233', fontWeight: 'bold' }}>
              Phân loại lỗi Khách hàng
            </span>
            <span style={{ fontSize: '0.72rem', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>
              Đã ánh xạ G7: <strong style={{ color: '#059669', fontStyle: 'normal' }}>{clientMappedCount}</strong> / {clientDefects.length} mã lỗi
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#2D1A12' }}>
              {clientDefects.length} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#6B7280' }}>mã lỗi KH</span>
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: BAR TAB CỐ ĐỊNH 3 TAB THEO ĐÚNG YÊU CẦU */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid #E5E7EB',
        marginBottom: '12px',
        backgroundColor: '#FFF',
        borderRadius: '10px 10px 0 0',
        padding: '4px 12px 0 12px'
      }}>
        <button
          onClick={() => setActiveMainTab('g7')}
          style={{
            padding: '10px 20px',
            fontWeight: '800',
            fontSize: '0.9rem',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeMainTab === 'g7' ? '#7B5233' : '#6B7280',
            borderBottom: activeMainTab === 'g7' ? '3px solid #7B5233' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <ShieldAlert size={18} /> 1. Mã lỗi G7 - Nội bộ ({g7Defects.length})
        </button>

        <button
          onClick={() => setActiveMainTab('client')}
          style={{
            padding: '10px 20px',
            fontWeight: '800',
            fontSize: '0.9rem',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeMainTab === 'client' ? '#7B5233' : '#6B7280',
            borderBottom: activeMainTab === 'client' ? '3px solid #7B5233' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Users size={18} /> 2. Mã lỗi Khách Hàng - KH ({clientDefects.length})
        </button>

        <button
          onClick={() => setActiveMainTab('classification')}
          style={{
            padding: '10px 20px',
            fontWeight: '800',
            fontSize: '0.9rem',
            border: 'none',
            backgroundColor: 'transparent',
            color: activeMainTab === 'classification' ? '#7B5233' : '#6B7280',
            borderBottom: activeMainTab === 'classification' ? '3px solid #7B5233' : '3px solid transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <Table size={18} /> 3. Bảng phân loại
        </button>
      </div>

      {/* SECTION 3: TOOLBAR GIAO DIỆN CHUẨN MÀN HÌNH CLAIM KHÁCH HÀNG */}
      <div className="mgmt-toolbar card" style={{
        marginBottom: '12px',
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
        {/* Left Side: Search Pill + Sort A↓Z + Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          {/* Search Pill Input Box */}
          <div className="search-wrapper" style={{ margin: 0, height: '36px', width: '320px' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search nhanh SKU, Cont, LPN..."
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
            />
          </div>

          {/* Sort Button A↓Z */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowSortDropdown(!showSortDropdown); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: sortOption ? '#7B5233' : '#8D6E63',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                outline: 'none'
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
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', top: '40px', left: 0, zIndex: 100,
                  background: '#fff', border: '1px solid #EADCC9', borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(123,82,51,0.12)', padding: '6px 0',
                  minWidth: '190px'
                }}
              >
                {[
                  { value: '', label: 'Mặc định' },
                  { value: 'code-asc', label: 'Mã Lỗi: A → Z' },
                  { value: 'code-desc', label: 'Mã Lỗi: Z → A' },
                  { value: 'name-asc', label: 'Tên Lỗi: A → Z' },
                  { value: 'name-desc', label: 'Tên Lỗi: Z → A' }
                ].map(item => (
                  <div
                    key={item.value}
                    onClick={() => { setSortOption(item.value); setShowSortDropdown(false); }}
                    style={{
                      padding: '8px 16px', cursor: 'pointer', fontSize: '0.82rem',
                      fontWeight: sortOption === item.value ? '700' : '500',
                      color: sortOption === item.value ? '#7B5233' : '#5D4037',
                      backgroundColor: sortOption === item.value ? '#FAF6F0' : 'transparent'
                    }}
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
              onClick={(e) => { e.stopPropagation(); setIsFilterBarOpen(!isFilterBarOpen); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: isFilterBarOpen || activeFiltersCount > 0 ? '#7B5233' : '#8D6E63',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                outline: 'none',
                position: 'relative'
              }}
              title="Bộ lọc nâng cao"
            >
              <Filter size={20} strokeWidth={2.5} />
              {activeFiltersCount > 0 && (
                <span style={{
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
                }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Right Side Actions: NÚT NÂU KHÁC, NHẬP DỮ LIỆU, XUẤT DỮ LIỆU, TẠO MỚI (ĐÚNG THEO ẢNH TOOLBAR CLAIM) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

          {/* 1. NÚT KHÁC */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsOtherDropdownOpen(!isOtherDropdownOpen); setIsExportDropdownOpen(false); }}
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
                border: 'none'
              }}
            >
              <Grid size={14} />
              <span>Khác</span>
            </button>
            {isOtherDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)', minWidth: '200px', zIndex: 1000,
                  padding: '6px 0'
                }}
              >
                <button
                  type="button"
                  onClick={() => { setIsOtherDropdownOpen(false); setActiveMainTab('classification'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
                >
                  <Table size={14} color="#7B5233" />
                  Xem bảng chú thích
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOtherDropdownOpen(false);
                    setIsClearAllModalOpen(true);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#DC2626' }}
                >
                  <Trash2 size={14} color="#DC2626" />
                  Xóa tất cả dữ liệu
                </button>
              </div>
            )}
          </div>

          {/* 2. NÚT NHẬP DỮ LIỆU */}
          <button
            type="button"
            onClick={() => handleOpenImportModal(activeMainTab)}
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
              border: 'none'
            }}
          >
            <Download size={14} />
            <span>Nhập dữ liệu</span>
          </button>

          {/* 3. NÚT XUẤT DỮ LIỆU */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIsExportDropdownOpen(!isExportDropdownOpen); setIsOtherDropdownOpen(false); }}
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
                border: 'none'
              }}
            >
              <Upload size={14} />
              <span>Xuất dữ liệu</span>
              <ChevronDown size={14} />
            </button>
            {isExportDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  backgroundColor: '#FFFFFF', border: '1px solid #EADCC9', borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(123, 82, 51, 0.12)', minWidth: '180px', zIndex: 1000,
                  padding: '6px 0'
                }}
              >
                <button
                  type="button"
                  onClick={() => { setIsExportDropdownOpen(false); handleExportExcel(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: '600', fontSize: '0.85rem', color: '#2D1A12' }}
                >
                  <FileSpreadsheet size={14} color="#7B5233" />
                  Xuất file Excel (.xlsx)
                </button>
              </div>
            )}
          </div>

          {/* 4. NÚT + TẠO MỚI */}
          <button
            type="button"
            onClick={handleOpenCreateModal}
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
              backgroundColor: '#4A2E1B',
              color: '#FFFFFF',
              border: 'none'
            }}
          >
            <Plus size={16} />
            <span>Tạo mới</span>
          </button>
        </div>
      </div>

      {/* THANH BỘ LỌC NÂNG CAO BẬT/TẮT THEO ICON FILTER FUNNEL */}
      {isFilterBarOpen && activeMainTab !== 'classification' && (
        <div className="filter-inline-bar" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          backgroundColor: '#FAF6F0',
          borderRadius: '8px',
          border: '1px solid #EADCC9',
          flexWrap: 'wrap',
          marginBottom: '12px',
          boxSizing: 'border-box'
        }}>
          {activeMainTab === 'g7' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D4037', whiteSpace: 'nowrap' }}>Phân loại:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #C4B5A5',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#2D1A12',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  <option value="all">Tất cả phân loại</option>
                  {distinctCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D4037', whiteSpace: 'nowrap' }}>Phân loại AQL:</label>
                <select
                  value={selectedAql}
                  onChange={(e) => { setSelectedAql(e.target.value); setCurrentPage(1); }}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #C4B5A5',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#2D1A12',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  <option value="all">Tất cả AQL</option>
                  {distinctAqls.map(aql => (
                    <option key={aql} value={aql}>{aql}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {activeMainTab === 'client' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D4037', whiteSpace: 'nowrap' }}>Trạng thái ánh xạ:</label>
                <select
                  value={selectedMappingStatus}
                  onChange={(e) => { setSelectedMappingStatus(e.target.value); setCurrentPage(1); }}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #C4B5A5',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#2D1A12',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="mapped">Đã ánh xạ G7</option>
                  <option value="unmapped">Chưa ánh xạ G7</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D4037', whiteSpace: 'nowrap' }}>Phương pháp xác định:</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => { setSelectedMethod(e.target.value); setCurrentPage(1); }}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #C4B5A5',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#2D1A12',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  <option value="all">Tất cả phương pháp</option>
                  {distinctMethods.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D4037', whiteSpace: 'nowrap' }}>Mã lỗi tại G7:</label>
                <select
                  value={selectedG7CodeFilter}
                  onChange={(e) => { setSelectedG7CodeFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    height: '32px',
                    padding: '0 10px',
                    borderRadius: '6px',
                    border: '1px solid #C4B5A5',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    color: '#2D1A12',
                    backgroundColor: '#FFFFFF',
                    outline: 'none'
                  }}
                >
                  <option value="all">Tất cả mã G7</option>
                  <optgroup label="Nhóm Prefix">
                    <option value="APP">APP</option>
                    <option value="MAT">MAT</option>
                    <option value="STR">STR</option>
                    <option value="PAI">PAI</option>
                  </optgroup>
                  <optgroup label="Mã G7 cụ thể">
                    {distinctG7Codes.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </>
          )}
          {/* CHIPS ĐIỀU KIỆN ĐÃ CHỌN - INLINE CÙNG HÀNG VỚI CONTROL */}
          {activeFiltersCount > 0 && (
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
              <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#7B5233' }}>Đã chọn:</span>

              {activeMainTab === 'g7' && (
                <>
                  {selectedCategory !== 'all' && (
                    <span
                      className="filter-chip"
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
                      <span>Phân loại: {selectedCategory}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedCategory('all'); setCurrentPage(1); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Xóa điều kiện này"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </span>
                  )}

                  {selectedAql !== 'all' && (
                    <span
                      className="filter-chip"
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
                      <span>AQL: {selectedAql}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedAql('all'); setCurrentPage(1); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Xóa điều kiện này"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </span>
                  )}
                </>
              )}

              {activeMainTab === 'client' && (
                <>
                  {selectedMappingStatus !== 'all' && (
                    <span
                      className="filter-chip"
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
                      <span>Trạng thái: {selectedMappingStatus === 'mapped' ? 'Đã ánh xạ G7' : 'Chưa ánh xạ G7'}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedMappingStatus('all'); setCurrentPage(1); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Xóa điều kiện này"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </span>
                  )}

                  {selectedMethod !== 'all' && (
                    <span
                      className="filter-chip"
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
                      <span>Phương pháp: {selectedMethod}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedMethod('all'); setCurrentPage(1); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Xóa điều kiện này"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </span>
                  )}

                  {selectedG7CodeFilter !== 'all' && (
                    <span
                      className="filter-chip"
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
                      <span>Mã G7: {selectedG7CodeFilter}</span>
                      <button
                        type="button"
                        onClick={() => { setSelectedG7CodeFilter('all'); setCurrentPage(1); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8D6E63', padding: 0, display: 'flex', alignItems: 'center' }}
                        title="Xóa điều kiện này"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </span>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  if (activeMainTab === 'g7') {
                    setSelectedCategory('all');
                    setSelectedAql('all');
                  } else if (activeMainTab === 'client') {
                    setSelectedMappingStatus('all');
                    setSelectedMethod('all');
                    setSelectedG7CodeFilter('all');
                  }
                  setCurrentPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#DC2626',
                  fontSize: '0.72rem',
                  fontWeight: 'bold',
                  marginLeft: '4px'
                }}
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: MÃ LỖI G7 - NỘI BỘ */}
      {activeMainTab === 'g7' && (
        <div className="admin-table-card" style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, width: '100%', margin: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '60px' }}>STT</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '120px' }}>Mã Lỗi</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '220px' }}>Tên Lỗi Ngắn Gọn</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '140px' }}>Phân Loại AQL</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233' }}>Mô Tả Chi Tiết Tiêu Chuẩn Ghi Nhật Ký</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '110px' }}>Phân loại</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '90px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF' }}>
                      Không tìm thấy mã lỗi G7 phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: '600', color: '#6B7280' }}>
                        {startIndex + idx + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.86rem', fontWeight: '800', color: '#2D1A12' }}>
                        <span style={{ backgroundColor: '#F3EAE0', color: '#7B5233', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                          {item.code}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.86rem', fontWeight: '700', color: '#1F2937' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          backgroundColor: item.aql_class === 'Critical' ? '#FEE2E2' : item.aql_class === 'Major' ? '#FEF3C7' : '#D1FAE5',
                          color: item.aql_class === 'Critical' ? '#DC2626' : item.aql_class === 'Major' ? '#D97706' : '#059669'
                        }}>
                          {item.aql_class}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.84rem', color: '#4B5563', lineHeight: '1.4' }}>
                        {item.description || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: '700', color: '#7B5233' }}>
                        {item.category}
                      </td>
                      {/* CỘT THAO TÁC NÚT 3 CHẤM POPUP CHUẨN CLAIM KHÁCH HÀNG */}
                      <td style={{ padding: '10px 14px', position: 'relative', textAlign: 'center', zIndex: actionMenuId === item.id ? 40 : 1 }}>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(actionMenuId === item.id ? null : item.id);
                          }}
                          title="Thao tác"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {actionMenuId === item.id && (
                          <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => {
                                setActionMenuId(null);
                                handleOpenEditModal(item, 'g7');
                              }}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              className="action-menu-item"
                              style={{ color: '#DC2626' }}
                              onClick={() => {
                                setActionMenuId(null);
                                setDeleteTarget({ id: item.id, code: item.code, type: 'g7' });
                              }}
                            >
                              Xóa mã lỗi
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={startIndex + pageSize}
            totalItems={totalItems}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* TAB 2: MÃ LỖI KHÁCH HÀNG - KH */}
      {activeMainTab === 'client' && (
        <div className="admin-table-card" style={{ backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)', border: '1px solid #EADCC9', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, width: '100%', margin: 0 }}>
          <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '2px solid #EADCC9', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '60px' }}>STT</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '120px' }}>MÃ LỖI</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '240px' }}>TÊN TIẾNG ANH</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '220px' }}>TÊN LỖI</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233' }}>PHƯƠNG PHÁP XÁC ĐỊNH</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '150px' }}>Mã lỗi tại G7</th>
                  <th style={{ padding: '10px 14px', fontSize: '0.82rem', fontWeight: '800', color: '#7B5233', width: '90px', textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: '#9CA3AF' }}>
                      Không tìm thấy mã lỗi Khách hàng phù hợp.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: '600', color: '#6B7280' }}>
                        {startIndex + idx + 1}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.86rem', fontWeight: '800', color: '#2D1A12' }}>
                        <span style={{ backgroundColor: '#E0F2FE', color: '#0369A1', padding: '4px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
                          {item.code}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.84rem', fontWeight: '600', color: '#4B5563' }}>
                        {item.name_en || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.86rem', fontWeight: '700', color: '#1F2937' }}>
                        {item.name}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.84rem', color: '#6B7280' }}>
                        {item.method || 'MẮT'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {item.g7_code ? (
                          <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 10px', borderRadius: '12px', fontSize: '0.82rem', fontWeight: '800' }}>
                            {item.g7_code}
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF', fontSize: '0.8rem', fontStyle: 'italic' }}>Chưa ánh xạ</span>
                        )}
                      </td>
                      {/* CỘT THAO TÁC NÚT 3 CHẤM POPUP CHUẨN CLAIM KHÁCH HÀNG */}
                      <td style={{ padding: '10px 14px', position: 'relative', textAlign: 'center', zIndex: actionMenuId === item.id ? 40 : 1 }}>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(actionMenuId === item.id ? null : item.id);
                          }}
                          title="Thao tác"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="5" r="2" />
                            <circle cx="12" cy="12" r="2" />
                            <circle cx="12" cy="19" r="2" />
                          </svg>
                        </button>
                        {actionMenuId === item.id && (
                          <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <button
                              type="button"
                              className="action-menu-item"
                              onClick={() => {
                                setActionMenuId(null);
                                handleOpenEditModal(item, 'client');
                              }}
                            >
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              className="action-menu-item"
                              style={{ color: '#DC2626' }}
                              onClick={() => {
                                setActionMenuId(null);
                                setDeleteTarget({ id: item.id, code: item.code, type: 'client' });
                              }}
                            >
                              Xóa mã lỗi
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            startIndex={startIndex}
            endIndex={startIndex + pageSize}
            totalItems={totalItems}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* TAB 3: BẢNG PHÂN LOẠI - 2 BẢNG CHÚ THÍCH CẠNH NHAU + CUỘN NỘI BỘ + PHÂN TRANG FOOTER */}
      {activeMainTab === 'classification' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <ClassificationTab
            glossaryAtlas={glossaryAtlas}
            glossaryG7={glossaryG7}
          />
        </div>
      )}

      {/* ─── MODAL NHẬP DỮ LIỆU TỪ EXCEL ĐA SHEET ─── */}
      {isImportModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '850px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #E5E7EB', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet color="#7B5233" size={24} /> Nhập Dữ Liệu Lỗi Từ Excel (Đa Sheet)
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                1. Tải lên File Excel (.xlsx, .xls)
              </label>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '2px dashed #7B5233',
                  borderRadius: '8px',
                  backgroundColor: '#FAF6F0',
                  cursor: 'pointer'
                }}
              />
            </div>

            {availableSheets.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginBottom: '20px',
                backgroundColor: '#F9FAFB',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    2. Chọn Sheet trong File Excel:
                  </label>
                  <select
                    value={selectedSheet}
                    onChange={handleSelectSheetChange}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontWeight: '700' }}
                  >
                    {availableSheets.map((s, idx) => (
                      <option key={idx} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>
                    3. Nhập dữ liệu vào Tab Giao diện:
                  </label>
                  <select
                    value={targetTab}
                    onChange={handleTargetTabChange}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #D1D5DB', fontWeight: '700', color: '#7B5233' }}
                  >
                    <option value="g7">Tab 1: Mã lỗi G7 - Nội bộ</option>
                    <option value="client">Tab 2: Mã lỗi Khách Hàng - KH</option>
                    <option value="classification">Tab 3: Bảng phân loại</option>
                  </select>
                </div>
              </div>
            )}

            {parsedPreviewData.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '8px' }}>
                  4. Xem trước dữ liệu ({parsedPreviewData.length} dòng đọc được từ sheet "{selectedSheet}"):
                </label>
                <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#FAF6F0', borderBottom: '1px solid #EADCC9' }}>
                        <th style={{ padding: '8px 12px' }}>Code</th>
                        <th style={{ padding: '8px 12px' }}>Name / Tên Lỗi</th>
                        <th style={{ padding: '8px 12px' }}>Thông tin bổ sung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedPreviewData.slice(0, 10).map((row, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F3F4F6' }}>
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#7B5233' }}>{row.code}</td>
                          <td style={{ padding: '8px 12px' }}>{row.name || row.description}</td>
                          <td style={{ padding: '8px 12px', color: '#6B7280' }}>
                            {row.aql_class ? `AQL: ${row.aql_class}` : row.g7_code ? `Mã G7: ${row.g7_code}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #E5E7EB', paddingTop: '16px' }}>
              <button
                onClick={() => setIsImportModalOpen(false)}
                style={{ padding: '9px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', fontWeight: '600', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={parsedPreviewData.length === 0}
                style={{
                  padding: '9px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: parsedPreviewData.length === 0 ? '#9CA3AF' : '#7B5233',
                  color: '#FFF',
                  fontWeight: '700',
                  cursor: parsedPreviewData.length === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                Xác nhận Nhập Dữ Liệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA MÃ LỖI */}
      {isFormOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFF',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '550px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '800', color: '#2D1A12' }}>
              {editingItem ? 'Chỉnh Sửa Mã Lỗi' : 'Thêm Mới Mã Lỗi'} ({formType === 'g7' ? 'Mã lỗi G7' : 'Mã lỗi Khách Hàng'})
            </h3>

            <form onSubmit={handleSaveForm}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Mã Lỗi (*)</label>
                <input
                  type="text"
                  required
                  value={formData.code || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder={formType === 'g7' ? 'VD: MAT-01' : 'VD: DVA_01'}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                />
              </div>

              {formType === 'client' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Tên Tiếng Anh</label>
                  <input
                    type="text"
                    value={formData.name_en || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                    placeholder="VD: MOLD / CRACK"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Tên Lỗi (*)</label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VD: Gỗ nứt tét / Bong tróc sơn"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                />
              </div>

              {formType === 'g7' ? (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Phân loại AQL</label>
                      <select
                        value={formData.aql_class || 'Minor'}
                        onChange={(e) => setFormData(prev => ({ ...prev, aql_class: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                      >
                        <option value="Critical">Critical (Nghiêm trọng)</option>
                        <option value="Major">Major (Lỗi Nặng)</option>
                        <option value="Minor">Minor (Lỗi Nhẹ)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Nhóm Lỗi</label>
                      <select
                        value={formData.category || 'MAT'}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                      >
                        <option value="MAT">MAT - Nguyên liệu</option>
                        <option value="STR">STR - Kết cấu</option>
                        <option value="PAI">PAI - Sơn</option>
                        <option value="APP">APP - Ngoại quan</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Mô Tả</label>
                    <textarea
                      rows="3"
                      value={formData.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Phương Pháp Xác Định</label>
                    <input
                      type="text"
                      value={formData.method || 'MẮT'}
                      onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                      placeholder="VD: MẮT & TAY / ASTM D3363"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                    />
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Mã lỗi tại G7 (Ánh xạ)</label>
                    <select
                      value={formData.g7_code || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, g7_code: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #D1D5DB' }}
                    >
                      <option value="">-- Chưa ánh xạ --</option>
                      {g7Defects.map(g => (
                        <option key={g.id} value={g.code}>{g.code} - {g.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', fontWeight: '600', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#7B5233', color: '#FFF', fontWeight: '700', cursor: 'pointer' }}
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA MỘT MÃ LỖI */}
      {deleteTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setDeleteTarget(null)}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '12px', border: '1.5px solid #EADCC9', width: '100%', maxWidth: '400px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #EADCC9', backgroundColor: '#FEF2F2', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="#DC2626" /> Xóa mã lỗi
              </h3>
              <button onClick={() => setDeleteTarget(null)} style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#6B7280', lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: '20px', fontSize: '0.9rem', color: '#374151', fontWeight: '600' }}>
              Bạn có chắc muốn xóa mã lỗi <strong>{deleteTarget.code}</strong>?
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#FAF6F0' }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                style={{ padding: '7px 16px', borderRadius: '6px', border: '1px solid #D1D5DB', background: '#FFF', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem', color: '#4B5563' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                style={{ padding: '7px 18px', borderRadius: '6px', border: 'none', background: '#DC2626', color: '#FFF', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectManagement;
