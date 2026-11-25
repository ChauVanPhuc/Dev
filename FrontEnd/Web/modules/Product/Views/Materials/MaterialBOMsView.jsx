import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Layers, Plus, Edit2, Trash2, X, AlertTriangle, 
  FileSpreadsheet, Upload, Download, RefreshCw, MoreVertical,
  ChevronLeft, ChevronRight, Package, CheckCircle2, ShieldCheck, Box
} from 'lucide-react';
import api, { getBaseURL } from '@webShared/Services/api.service';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

/**
 * View: KT03.4 - Quản lý BOM Vật tư (/admin/material-boms)
 * Trang chuyên biệt quản lý danh mục Định mức vật tư phụ kiện (Hàng Trắng & Sau Sơn).
 */
const DEFAULT_MATERIAL_GROUPS = [
  'Vật tư lắp ráp',
  'Sơn',
  'Sơn Lót',
  'Sơn Bóng',
  'Sơn UV',
  'Sơn UV Plywood',
  'Sơn UV Mặt Tiền',
  'Sơn UV Chi Tiết Phụ',
  'Sơn UV Ván Hậu',
  'Sơn UV THK',
  'Sơn Lót Mặt Tiền',
  'Sơn Lót Cạnh',
  'Sơn Lót Sườn tủ',
  'Sơn Bóng Mặt tiền',
  'Sơn Bóng Sườn Tủ',
  'Sơn Stain Màu',
  'Sơn Dặm Glaze',
  'Bao bì, đóng gói',
  'Vật tư đi kèm',
  'Vật tư dùng chung',
  'Vật tư dùng chung (ĐH 1)',
  'Vật tư dùng chung (ĐHV1)',
  'Vật tư dùng chung (LR,Chà nhám 1)',
  'Vật tư dùng chung (Sơn 1)',
  'Vật tư lắp ráp (LR3-ADV)',
  'Vật tư lắp ráp (Đóng gói)',
  'Vật tư lắp ráp (Định hình tủ)',
  'Vật tư dùng chung (Định hình mặt tiền 2)',
  'Vật tư dùng chung (Sơn 2)',
  'Vật tư dùng chung (ĐH 2, LR 2)'
];

const MaterialBOMsView = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, startGlobalUpload } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/material-boms', {
    code: 'KT03.4',
    title: 'BOM Vật tư',
    subtitle: 'Quản lý danh mục định mức vật tư phụ kiện sản phẩm'
  });

  useEffect(() => {
    if (!isEmbedded) {
      if (setCustomTitle) setCustomTitle(title || 'BOM Vật tư');
      if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Quản lý danh mục định mức vật tư phụ kiện sản phẩm');
      if (setCustomScreenCode) setCustomScreenCode(screenCode || 'KT03.4');
    }
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, isEmbedded, title, subtitle, screenCode]);

  // Data states
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({
    count_hang_trang: 0,
    count_sau_son: 0,
    unique_products: 0
  });
  const [availableGroups, setAvailableGroups] = useState(DEFAULT_MATERIAL_GROUPS);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  // Action menu state
  const [actionMenuId, setActionMenuId] = useState(null);

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.action-menu')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Filter & Pagination states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Active filters count
  const activeFiltersCount = (selectedProductId ? 1 : 0) + (groupFilter ? 1 : 0) + (supplierFilter ? 1 : 0);

  // Modal & Dialog states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    master_product_id: '',
    product_name: '',
    group_type: 'VẬT TƯ HÀNG TRẮNG',
    stt: 1,
    material_code: '',
    material_name: '',
    color: '',
    quota: 1.0,
    unit: 'Cái',
    supplier: '',
    note: ''
  });

  // Load products list
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await api.get('/master-products/?skip=0&limit=100').catch(() => null);
        if (res && res.items) {
          setProducts(res.items);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh mục sản phẩm:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch materials list
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * pageSize;
      let url = `/master-products/all-materials?skip=${skip}&limit=${pageSize}`;
      if (selectedProductId) url += `&product_id=${selectedProductId}`;
      if (groupFilter) url += `&group_type=${encodeURIComponent(groupFilter)}`;
      if (supplierFilter) url += `&supplier=${encodeURIComponent(supplierFilter)}`;
      if (searchTerm.trim()) url += `&q=${encodeURIComponent(searchTerm.trim())}`;

      const res = await api.get(url).catch(() => null);
      if (res) {
        setItems(res.items || []);
        setTotal(res.total || 0);
        if (res.summary) {
          setSummary(res.summary);
          if (res.summary.groups && res.summary.groups.length > 0) {
            setAvailableGroups(Array.from(new Set([...res.summary.groups, ...DEFAULT_MATERIAL_GROUPS])));
          }
        }
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách BOM vật tư:', err);
      if (toast) toast('error', 'Không thể tải danh sách BOM vật tư');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [currentPage, pageSize, searchTerm, selectedProductId, groupFilter, supplierFilter]);

  // Reset filters
  const handleResetFilters = () => {
    setSelectedProductId('');
    setGroupFilter('');
    setSupplierFilter('');
    setCurrentPage(1);
  };

  // Open modal create
  const handleOpenCreate = () => {
    setEditingItem(null);
    const firstP = products.length > 0 ? products[0] : null;
    const defaultProdText = firstP ? (firstP.product_code || firstP.sku ? `${firstP.product_code || firstP.sku} - ${firstP.name}` : firstP.name) : '';
    setFormData({
      master_product_id: firstP ? String(firstP.id) : '',
      product_name: defaultProdText,
      group_type: availableGroups[0] || 'Vật tư lắp ráp',
      stt: items.length + 1,
      material_code: `VT-${String(items.length + 1).padStart(3, '0')}`,
      material_name: '',
      color: '',
      quota: 1.0,
      unit: 'Cái',
      supplier: '',
      note: ''
    });
    setShowFormModal(true);
  };

  // Open modal edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    const prodText = item.product_sku && item.product_name && item.product_sku !== '---' 
      ? `${item.product_sku} - ${item.product_name}` 
      : (item.product_name || item.product_sku || '');
    setFormData({
      master_product_id: String(item.master_product_id || ''),
      product_name: prodText,
      group_type: item.group_type || 'Vật tư lắp ráp',
      stt: item.stt || 1,
      material_code: item.material_code || '',
      material_name: item.material_name || '',
      color: item.color || '',
      quota: item.quota || 1.0,
      unit: item.unit || 'Cái',
      supplier: item.supplier || '',
      note: item.note || ''
    });
    setShowFormModal(true);
  };

  // Submit form (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.material_name.trim()) {
      if (toast) toast('error', 'Vui lòng nhập tên vật tư');
      return;
    }
    if (!formData.product_name || !formData.product_name.trim()) {
      if (toast) toast('error', 'Vui lòng nhập hoặc chọn sản phẩm áp dụng');
      return;
    }

    try {
      setSubmitting(true);
      const typed = (formData.product_name || '').trim();
      let pId = formData.master_product_id;
      if (typed) {
        const found = products.find(p => 
          `${p.sku || p.product_code || ''} - ${p.name || ''}`.trim().toLowerCase() === typed.toLowerCase() ||
          (p.sku && p.sku.toLowerCase() === typed.toLowerCase()) ||
          (p.name && p.name.toLowerCase() === typed.toLowerCase())
        );
        if (found) {
          pId = String(found.id);
        }
      }

      const payload = {
        ...formData,
        master_product_id: pId ? Number(pId) : null,
        product_identifier: typed,
        product_name: typed
      };

      if (editingItem) {
        await api.put(`/master-products/materials-item/${editingItem.id}`, payload);
        if (toast) toast('success', `Đã cập nhật vật tư "${formData.material_name}" thành công!`);
      } else {
        await api.post('/master-products/material-items', payload);
        if (toast) toast('success', `Đã thêm vật tư "${formData.material_name}" thành công!`);
      }
      setShowFormModal(false);
      fetchMaterials();
    } catch (err) {
      console.error('Lỗi khi lưu vật tư:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi lưu vật tư');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete confirm
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setSubmitting(true);
      await api.delete(`/master-products/materials-item/${deletingItem.id}`);
      if (toast) toast('success', `Đã xóa vật tư "${deletingItem.material_name}" thành công!`);
      setDeletingItem(null);
      fetchMaterials();
    } catch (err) {
      console.error('Lỗi khi xóa vật tư:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi xóa vật tư');
    } finally {
      setSubmitting(false);
    }
  };

  // Excel Import Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setShowImportModal(false);
      if (startGlobalUpload) {
        await startGlobalUpload(
          file,
          '/master-products/import-material-bom-excel',
          () => fetchMaterials()
        );
      } else {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        setIsImporting(true);
        setImportProgress('Đang đọc cấu trúc file Excel BOM vật tư...');
        const res = await api.post('/master-products/import-material-bom-excel', formDataUpload, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res && res.status === 'success') {
          const successMsg = res.message || `Đã nhập thành công ${res.imported_count} dòng định mức vật tư!`;
          if (toast) toast('success', successMsg);
          fetchMaterials();
        } else {
          if (toast) toast('error', 'Không thể nhập dữ liệu từ file Excel');
        }
      }
    } catch (err) {
      console.error('Lỗi upload Excel BOM vật tư:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi xử lý file Excel');
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="gold-layout">
      {/* Dynamic CSS override for Super Compact Table & Clean ERP View with Full Scroll & Fixed Pagination Support */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (min-width: 769px) {
          .material-bom-unified-container {
            height: calc(100vh - 68px) !important;
            max-height: calc(100vh - 68px) !important;
            min-height: 0 !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 4px !important;
          }
          .material-bom-unified-container .sticky-top-zone {
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            margin-bottom: 0 !important;
          }
          .material-bom-unified-container .admin-list-layout {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            max-height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .material-bom-unified-container .admin-table-card {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            max-height: 100% !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 !important;
            border-radius: 8px !important;
          }
          .material-bom-unified-container .admin-table-scroll {
            flex: 1 1 0% !important;
            height: 100% !important;
            min-height: 0 !important;
            overflow-x: auto !important;
            overflow-y: auto !important;
            display: block !important;
            position: relative !important;
            -webkit-overflow-scrolling: touch !important;
          }
          .material-bom-unified-container .admin-pagination-desktop {
            flex-shrink: 0 !important;
            flex-grow: 0 !important;
            height: 42px !important;
            min-height: 42px !important;
            max-height: 42px !important;
            padding: 0 16px !important;
            margin-top: auto !important;
            background: #FFFFFF !important;
            border-top: 1px solid #EADCC9 !important;
            z-index: 15 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
        }

        /* Custom Scrollbar */
        .material-bom-unified-container .admin-table-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .material-bom-unified-container .admin-table-scroll::-webkit-scrollbar-track {
          background: #FAF6F0;
          border-radius: 4px;
        }
        .material-bom-unified-container .admin-table-scroll::-webkit-scrollbar-thumb {
          background: #D7C4B2;
          border-radius: 4px;
        }
        .material-bom-unified-container .admin-table-scroll::-webkit-scrollbar-thumb:hover {
          background: #A67C52;
        }

        /* Sticky Table Header */
        .material-bom-unified-container table.data-table thead tr th {
          padding: 8px 10px !important;
          font-size: 0.76rem !important;
          white-space: nowrap !important;
          line-height: 1.15 !important;
          height: 36px !important;
          background-color: #FAF6F0 !important;
          color: #7B5233 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 20 !important;
          border-bottom: 1px solid #EADCC9 !important;
          box-shadow: 0 1px 0 #EADCC9 !important;
        }
        .material-bom-unified-container table.data-table tbody tr td {
          padding: 8px 10px !important;
          font-size: 0.82rem !important;
          line-height: 1.25 !important;
          vertical-align: middle !important;
        }
      `}} />

      {/* ── STICKY TOP ZONE ── */}
      <div className="sticky-top-zone">
        {/* ── PageToolbar (Chuẩn 100% theo Trang Gốc UserManagement / ProductsListView) ── */}
        <PageToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
          searchPlaceholder="Nhập mã vật tư, tên vật tư, sản phẩm, nhà cung cấp..."
          showFilter={true}
          isFilterOpen={showFilterPanel}
          onFilterToggle={() => setShowFilterPanel(!showFilterPanel)}
          activeFiltersCount={activeFiltersCount}
          onCreate={handleOpenCreate}
          createLabel="Tạo mới"
          hasWritePermission={true}
          importActions={[
            {
              label: 'Nhập Excel',
              icon: <FileSpreadsheet size={16} />,
              onClick: () => setShowImportModal(true)
            }
          ]}
        />

        {/* ── INLINE FILTER PANEL ── */}
        {showFilterPanel && (
          <div className="filter-inline-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '14px 20px', backgroundColor: '#FAF6F0', borderRadius: '12px', border: '1.5px solid #EADCC9', marginBottom: '8px', alignItems: 'flex-end' }}>
            
            {/* Lọc theo Sản phẩm */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Sản phẩm áp dụng</label>
              <select
                value={selectedProductId}
                onChange={(e) => { setSelectedProductId(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '180px' }}
              >
                <option value="">Tất cả sản phẩm</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.product_code || p.sku ? `${p.product_code || p.sku} - ${p.name}` : p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lọc theo Nhóm vật tư */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Nhóm vật tư</label>
              <select
                value={groupFilter}
                onChange={(e) => { setGroupFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '180px' }}
              >
                <option value="">Tất cả nhóm ({availableGroups.length} nhóm)</option>
                {availableGroups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Lọc theo Nhà cung cấp */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Nhà cung cấp</label>
              <input
                type="text"
                value={supplierFilter}
                placeholder="Nhập tên nhà cung cấp..."
                onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', backgroundColor: '#FFF', minWidth: '160px' }}
              />
            </div>

            {/* Hiển thị số dòng */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Hiển thị số dòng</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF' }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            {/* Nút Xóa bộ lọc */}
            {activeFiltersCount > 0 && (
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{ padding: '7px 14px', background: '#E2E8F0', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '800', color: '#475569', cursor: 'pointer' }}
                >
                  Xóa bộ lọc ({activeFiltersCount})
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bảng dữ liệu Desktop ── */}
      <div className="admin-list-layout desktop-only" style={{ flex: 1, minHeight: 0 }}>
        <div className="mgmt-table card admin-table-card card-shadow" style={{ position: 'relative', backgroundColor: 'white', display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }}>
          {loading ? (
            <div className="loading-state" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải dữ liệu...</div>
          ) : (
            <>
              {/* Bảng Desktop */}
              <div className="table-responsive admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>STT</th>
                        <th>SẢN PHẨM ÁP DỤNG</th>
                        <th>NHÓM VẬT TƯ</th>
                        <th>MÃ VẬT TƯ</th>
                        <th>TÊN VẬT TƯ</th>
                        <th>MÀU SẮC / XI MẠ</th>
                        <th style={{ textAlign: 'center' }}>ĐỊNH MỨC</th>
                        <th style={{ textAlign: 'center' }}>ĐVT</th>
                        <th>NHÀ CUNG CẤP</th>
                        <th>GHI CHÚ</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr 
                          key={item.id || idx} 
                          className="animate-card-entrance"
                          style={{
                            position: 'relative',
                            zIndex: actionMenuId === item.id ? 30 : 1
                          }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            {String((currentPage - 1) * pageSize + idx + 1).padStart(2, '0')}
                          </td>
                          <td>
                            <div className="font-bold">{item.product_sku || item.product_name || '-'}</div>
                            {item.product_name && item.product_sku && item.product_name !== item.product_sku && (
                              <div style={{ fontSize: '0.78rem', color: '#8C7B72' }}>{item.product_name}</div>
                            )}
                          </td>
                          <td>
                            <span 
                              style={{
                                display: 'inline-block',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {item.group_type || 'Vật tư dùng chung'}
                            </span>
                          </td>
                          <td className="font-bold">{item.material_code || '-'}</td>
                          <td>{item.material_name || '-'}</td>
                          <td>{item.color || '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#7B5233' }}>
                            {Number(item.quota || 0).toLocaleString('vi-VN')}
                          </td>
                          <td style={{ textAlign: 'center', color: '#666' }}>
                            {item.unit || 'Cái'}
                          </td>
                          <td>{item.supplier || '-'}</td>
                          <td>{item.note || '-'}</td>
                          <td style={{ position: 'relative', zIndex: actionMenuId === item.id ? 40 : 1, textAlign: 'center' }}>
                            <button
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === item.id ? null : item.id);
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="2"/>
                                <circle cx="12" cy="12" r="2"/>
                                <circle cx="12" cy="19" r="2"/>
                              </svg>
                            </button>
                            {actionMenuId === item.id && (
                              <div className="action-menu" style={{ right: 0, top: '100%' }}>
                                <button 
                                  className="action-menu-item" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(null);
                                    handleOpenEdit(item);
                                  }}
                                >
                                  <Edit2 size={14} style={{ marginRight: '6px' }} />
                                  Chỉnh sửa
                                </button>
                                <button 
                                  className="action-menu-item danger" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(null);
                                    setDeletingItem(item);
                                  }}
                                >
                                  <Trash2 size={14} style={{ marginRight: '6px' }} />
                                  Xóa
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && !loading && (
                        <tr>
                          <td colSpan="11" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                            Không tìm thấy dữ liệu
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Phân trang - Desktop (Luôn cố định chân bảng) */}
                <div className="admin-pagination-desktop desktop-only">
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{total > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, total)}</b> trên <b>{total}</b> mục vật tư
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="page-btn"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      {(() => {
                        const pages = [];
                        const delta = 2;
                        for (let i = 1; i <= totalPages; i++) {
                          if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                            pages.push(i);
                          } else if (pages[pages.length - 1] !== '...') {
                            pages.push('...');
                          }
                        }
                        return pages.map((p, idx) => {
                          if (p === '...') {
                            return (
                              <span key={`ell-${idx}`} style={{ padding: '0 4px', color: '#8D6E63', fontWeight: '700' }}>
                                ...
                              </span>
                            );
                          }
                          return (
                            <button
                              key={p}
                              className={`page-btn ${currentPage === p ? 'active' : ''}`}
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </button>
                          );
                        });
                      })()}
                      <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="page-btn"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Thẻ Mobile ── */}
        <div className="mobile-only mgmt-cards-container" style={{ flex: 1, overflowY: 'auto' }}>
          {items.length === 0 && !loading && <div className="no-data-text-mobile">Không tìm thấy dữ liệu</div>}
          {items.map((item) => (
            <div key={item.id} className="mgmt-card animate-card-entrance" style={{ zIndex: actionMenuId === item.id ? 100 : 1 }}>
              <div className="mgmt-card-main">
                <div className="mgmt-card-details">
                  <div className="mgmt-card-title-row">
                    <h4 className="mgmt-card-title">{item.material_name}</h4>
                    <span className="mgmt-card-subtitle">#{item.material_code || '-'}</span>
                  </div>
                  <div className="mgmt-card-meta-chips">
                    <span className="mgmt-card-chip">{item.product_sku || item.product_name || 'N/A'}</span>
                    <span className="mgmt-card-chip secondary">
                      Định mức: {item.quota} {item.unit}
                    </span>
                  </div>
                </div>
                <div className="mgmt-card-actions">
                  <button
                    className="action-btn"
                    onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                  ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                  {actionMenuId === item.id && (
                    <div className="action-menu" style={{ right: 0, top: '100%' }}>
                      <button className="action-menu-item" onClick={() => { setActionMenuId(null); handleOpenEdit(item); }}>Chỉnh sửa</button>
                      <button className="action-menu-item danger" onClick={() => { setActionMenuId(null); setDeletingItem(item); }}>Xóa</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="mgmt-card-footer">
                <div className="mgmt-card-footer-left font-semibold">{item.supplier || '-'}</div>
                <span 
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    border: '1px solid #BFDBFE'
                  }}
                >
                  {item.group_type || 'Vật tư dùng chung'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Phân trang - Mobile Sticky */}
        {totalPages > 1 && (
          <div className="pagination-mobile-sticky mobile-only">
            <button className="page-btn" onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
            <button className="page-btn" onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))} disabled={currentPage >= totalPages || totalPages <= 1}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showFormModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(45, 26, 18, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            border: '1.5px solid #EADCC9'
          }}>
            <div style={{
              padding: '18px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #EADCC9',
              backgroundColor: '#FAF6F0'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#2D1A12', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#7B5233" />
                {editingItem ? 'Chỉnh sửa vật tư định mức' : 'Thêm vật tư định mức mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#2D1A12' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Chọn Sản phẩm & Nhóm vật tư */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                      Sản phẩm áp dụng * <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 'normal' }}>(Nhập trực tiếp hoặc chọn gợi ý)</span>
                    </label>
                    <input
                      type="text"
                      list="product-boms-suggestions"
                      required
                      placeholder="Gõ mã hoặc tên sản phẩm..."
                      value={formData.product_name || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = products.find(p => `${p.product_code || p.sku || ''} - ${p.name || ''}`.trim().toLowerCase() === val.trim().toLowerCase() || (p.sku && p.sku.toLowerCase() === val.trim().toLowerCase()) || (p.name && p.name.toLowerCase() === val.trim().toLowerCase()));
                        setFormData(prev => ({
                          ...prev,
                          product_name: val,
                          master_product_id: match ? String(match.id) : prev.master_product_id
                        }));
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #CBD5E1',
                        fontSize: '0.86rem',
                        outline: 'none',
                        backgroundColor: '#FFFFFF',
                        color: '#1E293B',
                        fontWeight: '600'
                      }}
                    />
                    <datalist id="product-boms-suggestions">
                      {products.map(p => {
                        const label = p.product_code || p.sku ? `${p.product_code || p.sku} - ${p.name}` : p.name;
                        return (
                          <option key={p.id} value={label}>
                            {p.name}
                          </option>
                        );
                      })}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Nhóm vật tư *</label>
                    <select
                      value={formData.group_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, group_type: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.86rem', outline: 'none', backgroundColor: '#FFFFFF', fontWeight: '700', color: '#7B5233' }}
                    >
                      {availableGroups.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                      {formData.group_type && !availableGroups.includes(formData.group_type) && (
                        <option value={formData.group_type}>{formData.group_type}</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Mã vật tư & Tên vật tư */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Mã vật tư *</label>
                    <input
                      type="text"
                      required
                      placeholder="VT-001..."
                      value={formData.material_code}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_code: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Tên vật tư *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Vít bắn gỗ 4x30, Khung U cao su..."
                      value={formData.material_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, material_name: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Màu sắc / Xi mạ & Định mức & Đơn vị */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Màu sắc / Xi mạ</label>
                    <input
                      type="text"
                      placeholder="Đen, Mạ Niken, Vàng 7 màu..."
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Định mức / SP *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      min="0.001"
                      value={formData.quota}
                      onChange={(e) => setFormData(prev => ({ ...prev, quota: Number(e.target.value) }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Đơn vị tính *</label>
                    <input
                      type="text"
                      required
                      placeholder="Cái, Bộ, Con, Mét..."
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Nhà cung cấp & Ghi chú */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Nhà cung cấp</label>
                    <input
                      type="text"
                      placeholder="Nhập tên nhà cung cấp..."
                      value={formData.supplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Ghi chú kỹ thuật</label>
                    <input
                      type="text"
                      placeholder="Ghi chú đóng gói / lắp ráp..."
                      value={formData.note}
                      onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.86rem', outline: 'none' }}
                    />
                  </div>
                </div>

              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  style={{ padding: '9px 18px', background: '#E2E8F0', border: 'none', borderRadius: '8px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 22px',
                    background: 'linear-gradient(135deg, #7B5233 0%, #5D3B32 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '800',
                    color: '#FFFFFF',
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Đang lưu...' : (editingItem ? 'Lưu thay đổi' : 'Thêm vật tư')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EXCEL IMPORT MODAL ── */}
      {showImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(45, 26, 18, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            border: '1.5px solid #EADCC9'
          }}>
            <div style={{
              padding: '18px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #EADCC9',
              backgroundColor: '#F0F9FF'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#0369A1', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileSpreadsheet size={22} color="#0284C7" />
                Nhập BOM Vật tư từ Excel
              </h3>
              <button
                type="button"
                onClick={() => !isImporting && setShowImportModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: isImporting ? 'not-allowed' : 'pointer', color: '#2D1A12' }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                border: '2px dashed #0284C7',
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                cursor: isImporting ? 'not-allowed' : 'pointer'
              }}
              onClick={() => !isImporting && fileInputRef.current?.click()}
              >
                <Upload size={40} color="#0284C7" style={{ margin: '0 auto 12px auto' }} />
                <div style={{ fontWeight: '800', color: '#0369A1', fontSize: '1rem', marginBottom: '6px' }}>
                  {isImporting ? 'Đang xử lý tải lên...' : 'Chọn hoặc kéo thả file Excel BOM Vật tư'}
                </div>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
                  Hỗ trợ định dạng .xlsx, .xls (Tự động nhận diện file bảng phẳng VTTH hoặc tệp nhiều sheet)
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  disabled={isImporting}
                />
              </div>

              {importProgress && (
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#0284C7', fontWeight: '700', fontSize: '0.86rem' }}>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>{importProgress}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ── */}
      {deletingItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(45, 26, 18, 0.45)',
          backdropFilter: 'blur(3px)',
          zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1F2937', marginBottom: '8px' }}>Xác nhận xóa vật tư</h3>
            <p style={{ fontSize: '0.88rem', color: '#4B5563', marginBottom: '20px', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn xóa dòng vật tư <strong style={{ color: '#DC2626' }}>"{deletingItem.material_name}"</strong> khỏi định mức sản phẩm?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                style={{ padding: '8px 18px', background: '#E5E7EB', border: 'none', borderRadius: '8px', fontWeight: '700', color: '#374151', cursor: 'pointer' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                style={{ padding: '8px 20px', background: '#DC2626', border: 'none', borderRadius: '8px', fontWeight: '800', color: '#FFFFFF', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Đang xóa...' : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MaterialBOMsView;
