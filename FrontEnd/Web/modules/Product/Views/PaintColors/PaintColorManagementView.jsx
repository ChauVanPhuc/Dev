import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Edit2, Trash2, X, AlertTriangle, Palette, Image as ImageIcon, MoreVertical, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

/**
 * View: KT03.3 - Quản lý Mẫu sơn (/admin/paint-colors)
 * Thiết kế chuẩn 100% theo trang Gốc (UserManagement / Quản lý người dùng - AD3).
 */
const PaintColorManagementView = ({ isEmbedded = false }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;

  useEffect(() => {
    if (!isEmbedded) {
      if (setCustomTitle) setCustomTitle('Quản lý Mẫu sơn');
      if (setCustomSubtitle) setCustomSubtitle('Quản lý danh sách mẫu màu sơn theo từng sản phẩm mẫu');
      if (setCustomScreenCode) setCustomScreenCode('KT03.3');
    }
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, isEmbedded]);

  // Data states
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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
  const [supplierFilter, setSupplierFilter] = useState('');
  const [hasImageFilter, setHasImageFilter] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Count active filters
  const activeFiltersCount = (selectedProductId ? 1 : 0) + (supplierFilter ? 1 : 0) + (hasImageFilter ? 1 : 0);

  // Modal & Dialog states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    master_product_id: '',
    color_code: '',
    color_name: '',
    supplier: '',
    expiry_date: '',
    image_url: '',
    note: ''
  });

  // Setup header Title
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quản lý sản phẩm');
    if (setCustomSubtitle) setCustomSubtitle('KT03.3: Quản lý Mẫu sơn');
    if (setCustomScreenCode) setCustomScreenCode('KT03.3');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Suggestion states for autocomplete
  const [colorCodeSuggestions, setColorCodeSuggestions] = useState([]);
  const [colorNameSuggestions, setColorNameSuggestions] = useState([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [showColorNameMenu, setShowColorNameMenu] = useState(false);
  const [showSupplierMenu, setShowSupplierMenu] = useState(false);
  const [showNoteMenu, setShowNoteMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.suggest-color-name-box')) setShowColorNameMenu(false);
      if (!e.target.closest('.suggest-supplier-box')) setShowSupplierMenu(false);
      if (!e.target.closest('.suggest-note-box')) setShowNoteMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load products list and paint color suggestions
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await api.get('/master-products/?skip=0&limit=100').catch(() => null);
        if (res && res.items) {
          setProducts(res.items);
        }
        const sugRes = await api.get('/master-products/paint-color-suggestions').catch(() => null);
        if (sugRes) {
          setColorCodeSuggestions(sugRes.color_codes || []);
          setColorNameSuggestions(sugRes.color_names || []);
          setSupplierSuggestions(sugRes.suppliers || []);
        }
      } catch (err) {
        console.warn('Lỗi lấy dữ liệu ban đầu:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch list of paint color samples from backend
  const fetchPaintColors = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * pageSize;
      let url = `/master-products/all-paint-colors?skip=${skip}&limit=${pageSize}`;
      if (selectedProductId) url += `&product_id=${selectedProductId}`;
      if (supplierFilter) url += `&supplier=${encodeURIComponent(supplierFilter)}`;
      if (hasImageFilter) url += `&has_image=${hasImageFilter}`;
      if (searchTerm.trim()) url += `&q=${encodeURIComponent(searchTerm.trim())}`;

      const res = await api.get(url).catch(() => null);
      if (res) {
        setItems(res.items || []);
        setTotal(res.total || 0);
      } else {
        setItems([]);
        setTotal(0);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách mẫu màu sơn:', err);
      if (toast) toast('error', 'Không thể tải danh sách mẫu màu sơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaintColors();
  }, [currentPage, pageSize, searchTerm, selectedProductId, supplierFilter, hasImageFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedProductId('');
    setSupplierFilter('');
    setHasImageFilter('');
    setCurrentPage(1);
  };

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFormData(prev => ({ ...prev, image_url: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getDefaultExpiryDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  };

  const generateAutoCode = () => {
    const nextNum = (total || items.length || 0) + 1;
    return `MS-${String(nextNum).padStart(3, '0')}`;
  };

  // Open modal for creating
  const handleOpenCreate = () => {
    setEditingItem(null);
    setImagePreview(null);
    const autoCode = generateAutoCode();
    setFormData({
      master_product_id: products.length > 0 ? String(products[0].id) : '',
      color_code: autoCode,
      color_name: '',
      supplier: '',
      expiry_date: getDefaultExpiryDate(),
      image_url: '',
      note: ''
    });
    setShowFormModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setImagePreview(item.image_url || null);
    setFormData({
      master_product_id: String(item.master_product_id || ''),
      color_code: item.color_code || '',
      color_name: item.color_name || '',
      supplier: item.supplier || '',
      expiry_date: item.expiry_date || '',
      image_url: item.image_url || '',
      note: item.note || ''
    });
    setShowFormModal(true);
  };

  // Submit form (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalCode = formData.color_code.trim() || generateAutoCode();
    if (!formData.color_name.trim()) {
      if (toast) toast('error', 'Vui lòng chọn Tên màu sơn');
      return;
    }
    const prodId = formData.master_product_id || (products.length > 0 ? products[0].id : 1);
    const payload = {
      ...formData,
      color_code: finalCode,
      master_product_id: prodId
    };

    try {
      setSubmitting(true);
      if (editingItem) {
        await api.put(`/master-products/paint-colors-item/${editingItem.id}`, payload);
        if (toast) toast('success', `Đã cập nhật mẫu màu sơn "${finalCode}" thành công!`);
      } else {
        await api.post(`/master-products/${prodId}/paint-colors`, payload);
        if (toast) toast('success', `Đã thêm mẫu màu sơn "${finalCode}" thành công!`);
      }
      setShowFormModal(false);
      fetchPaintColors();
    } catch (err) {
      console.error('Lỗi khi lưu mẫu màu sơn:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi lưu mẫu màu sơn');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setSubmitting(true);
      await api.delete(`/master-products/paint-colors/${deletingItem.id}`);
      if (toast) toast('success', `Đã xóa mẫu màu sơn "${deletingItem.color_code}" thành công!`);
      setDeletingItem(null);
      fetchPaintColors();
    } catch (err) {
      console.error('Lỗi khi xóa mẫu màu sơn:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi xóa mẫu màu sơn');
    } finally {
      setSubmitting(false);
    }
  };

  // Sync all data directly from Master BOM
  const handleSyncBom = async () => {
    try {
      setSyncing(true);
      const res = await api.post('/master-products/sync-bom-data');
      if (res && res.status === 'success') {
        if (toast) toast('success', `Đã tự động đọc full BOM và đồng bộ thành công ${res.unique_paint_colors_inserted} mẫu màu sơn!`);
        fetchPaintColors();
        // Refresh paint suggestions lookups
        const sugRes = await api.get('/master-products/paint-color-suggestions').catch(() => null);
        if (sugRes) {
          setColorCodeSuggestions(sugRes.color_codes || []);
          setColorNameSuggestions(sugRes.color_names || []);
          setSupplierSuggestions(sugRes.suppliers || []);
        }
      } else {
        if (toast) toast('error', res?.message || 'Không thể đồng bộ dữ liệu BOM');
      }
    } catch (err) {
      console.error('Lỗi khi đồng bộ BOM:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi đồng bộ từ BOM');
    } finally {
      setSyncing(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="mgmt-container" style={{ padding: isEmbedded ? 0 : undefined, minHeight: isEmbedded ? 'auto' : undefined, maxWidth: '100%' }}>
      <div className="mgmt-main" style={{ boxShadow: isEmbedded ? 'none' : undefined, border: isEmbedded ? 'none' : undefined, padding: isEmbedded ? '20px' : undefined, borderRadius: isEmbedded ? '16px' : undefined }}>

        {/* ── PageToolbar (Chuẩn 100% theo Trang Gốc UserManagement) ── */}
        <PageToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
          searchPlaceholder="Nhập mã màu sơn, tên màu, nhà cung cấp..."
          showFilter={true}
          isFilterOpen={showFilterPanel}
          onFilterToggle={() => setShowFilterPanel(!showFilterPanel)}
          activeFiltersCount={activeFiltersCount}
          onSync={handleSyncBom}
          isSyncing={syncing}
          syncLabel="Đồng bộ từ BOM"
          onCreate={handleOpenCreate}
          createLabel="Tạo mới"
          hasWritePermission={true}
        />

        {/* ── INLINE EXPANDABLE FILTER BAR (Chuẩn 100% Trang Gốc UserManagement) ── */}
        {showFilterPanel && (
          <div className="filter-inline-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '14px 20px', backgroundColor: '#FAF6F0', borderRadius: '12px', border: '1.5px solid #EADCC9', marginBottom: '16px', alignItems: 'flex-end' }}>

            {/* Lọc theo Sản phẩm mẫu */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Sản phẩm mẫu</label>
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

            {/* Lọc theo Nhà cung cấp */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Nhà cung cấp</label>
              <select
                value={supplierFilter}
                onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '160px' }}
              >
                <option value="">Tất cả nhà cung cấp</option>
                <option value="Công ty TNHH Sơn Nippon">Công ty TNHH Sơn Nippon</option>
                <option value="NPP Sơn Oseven">NPP Sơn Oseven</option>
                <option value="Công ty Sơn Dulux">Công ty Sơn Dulux</option>
                <option value="Sơn Á Châu">Sơn Á Châu</option>
                <option value="Nội bộ G7">Nội bộ G7</option>
              </select>
            </div>

            {/* Lọc theo Trạng thái ảnh */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Hình ảnh mẫu</label>
              <select
                value={hasImageFilter}
                onChange={(e) => { setHasImageFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '140px' }}
              >
                <option value="">Tất cả mẫu</option>
                <option value="yes">Có ảnh mẫu</option>
                <option value="no">Chưa có ảnh</option>
              </select>
            </div>

            {/* Hiển thị số dòng (Số dòng / trang - Chuẩn 100% UserManagement) */}
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

        {/* ── Bảng dữ liệu ── */}
        <div className="admin-list-layout">
          <div className="mgmt-table card admin-table-card">
            {loading ? (
              <div className="loading-state">Đang tải dữ liệu...</div>
            ) : (
              <>
                <div className="table-responsive desktop-only admin-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                        <th style={{ width: '70px', textAlign: 'center' }}>ẢNH MẪU</th>
                        <th>SẢN PHẨM MẪU</th>
                        <th>MÃ MÀU SƠN</th>
                        <th>TÊN MÀU SƠN</th>
                        <th>NHÀ CUNG CẤP</th>
                        <th style={{ textAlign: 'center' }}>NGÀY HẾT HẠN</th>
                        <th>GHI CHÚ</th>
                        <th style={{ textAlign: 'center' }}>NGÀY TẠO</th>
                        <th style={{ textAlign: 'center', width: '100px' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.color_name} style={{ width: '38px', height: '38px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #D1D5DB' }} />
                            ) : (
                              <div style={{ width: '38px', height: '38px', borderRadius: '6px', backgroundColor: '#E2E8F0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Palette size={18} color="#94A3B8" />
                              </div>
                            )}
                          </td>
                          <td>
                            <strong style={{ color: '#2D1A12' }}>{item.product_sku}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{item.product_name}</div>
                          </td>
                          <td style={{ fontWeight: '900', color: '#2D1A12' }}>{item.color_code}</td>
                          <td style={{ fontWeight: '700', color: '#334155' }}>{item.color_name}</td>
                          <td>{item.supplier || '---'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('vi-VN') : '---'}
                          </td>
                          <td style={{ color: '#64748B' }}>{item.note || '---'}</td>
                          <td style={{ textAlign: 'center', color: '#94A3B8' }}>{item.created_at || '---'}</td>
                          <td style={{ textAlign: 'center', position: 'relative' }}>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => setActionMenuId(actionMenuId === item.id ? null : item.id)}
                              title="Thao tác"
                            >
                              <MoreVertical size={16} />
                            </button>
                            {actionMenuId === item.id && (
                              <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%', zIndex: 100 }}>
                                <button
                                  type="button"
                                  className="action-menu-item"
                                  onClick={() => { setActionMenuId(null); handleOpenEdit(item); }}
                                >
                                  Chỉnh sửa
                                </button>
                                <button
                                  type="button"
                                  className="action-menu-item danger"
                                  onClick={() => { setActionMenuId(null); setDeletingItem(item); }}
                                >
                                  Xóa mẫu sơn
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                            Không tìm thấy mẫu màu sơn nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Thanh Phân Trang chuẩn Gốc UserManagement ── */}
                <div className="admin-pagination-desktop desktop-only">
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{total > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, total)}</b> trên <b>{total}</b> mẫu màu sơn
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
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

      </div>

      {/* CREATE / EDIT MODAL */}
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
            maxWidth: '700px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            overflow: 'hidden',
            border: '1.5px solid #EADCC9'
          }}>
            <div style={{
              padding: '18px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #EADCC9'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#2D1A12', margin: 0 }}>
                {editingItem ? 'KT03.3: Chỉnh sửa mẫu màu sơn' : 'KT03.3: Thêm mẫu màu sơn'}
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
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '100px', height: '100px', borderRadius: '12px', border: '2px dashed #cbd5e1',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: '#f8fafc', overflow: 'hidden', position: 'relative', cursor: 'pointer'
                    }}
                    onClick={() => document.getElementById('paint-img-upload-input').click()}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="Mẫu màu sơn" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <ImageIcon size={28} color="#94a3b8" />
                        <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', fontWeight: '600' }}>Tải ảnh mẫu</span>
                      </>
                    )}
                    <input id="paint-img-upload-input" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Mã màu sơn *</label>
                      <input
                        type="text" disabled readOnly
                        value={formData.color_code || 'MS-001'}
                        placeholder="Mã màu sơn tự sinh..."
                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '700', cursor: 'not-allowed', outline: 'none' }}
                      />
                    </div>

                    <div className="suggest-color-name-box" style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Tên màu sơn *</label>
                      <input
                        type="text"
                        required
                        placeholder="Nhập hoặc chọn tên màu sơn..."
                        value={formData.color_name}
                        onFocus={() => setShowColorNameMenu(true)}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, color_name: e.target.value }));
                          setShowColorNameMenu(true);
                        }}
                        style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                      />
                      {showColorNameMenu && (
                        (() => {
                          const options = Array.from(new Set([
                            ...colorNameSuggestions,
                            'Sơn PU mờ 50%',
                            'Sơn PU mờ 70%',
                            'Sơn PU bóng 100%',
                            'Sơn bóng gỗ sồi',
                            'Sơn lót Polyurethane',
                            'Sơn trắng 2K',
                            'Sơn màu Walnut'
                          ]));
                          const queryStr = (formData.color_name || '').toLowerCase().trim();
                          const filtered = queryStr ? options.filter(s => s.toLowerCase().includes(queryStr)) : options;
                          if (filtered.length === 0) return null;
                          return (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '4px',
                              backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                              boxShadow: '0 10px 20px rgba(45, 26, 18, 0.15)', maxHeight: '180px', overflowY: 'auto', zIndex: 3000
                            }}>
                              {filtered.map((item, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, color_name: item }));
                                    setShowColorNameMenu(false);
                                  }}
                                  style={{
                                    padding: '8px 12px', fontSize: '0.84rem', fontWeight: '600', color: '#2D1A12',
                                    cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="suggest-supplier-box" style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Nhà cung cấp *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập hoặc chọn nhà cung cấp..."
                      value={formData.supplier}
                      onFocus={() => setShowSupplierMenu(true)}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, supplier: e.target.value }));
                        setShowSupplierMenu(true);
                      }}
                      style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                    />
                    {showSupplierMenu && (
                      (() => {
                        const options = Array.from(new Set([
                          ...supplierSuggestions,
                          'Công ty Sơn Nippon',
                          'NPP Sơn Oseven',
                          'NPP Sơn Dulux',
                          'Sơn Á Châu',
                          'Nội bộ G7'
                        ]));
                        const queryStr = (formData.supplier || '').toLowerCase().trim();
                        const filtered = queryStr ? options.filter(s => s.toLowerCase().includes(queryStr)) : options;
                        if (filtered.length === 0) return null;
                        return (
                          <div style={{
                            position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '4px',
                            backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                            boxShadow: '0 10px 20px rgba(45, 26, 18, 0.15)', maxHeight: '180px', overflowY: 'auto', zIndex: 3000
                          }}>
                            {filtered.map((item, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, supplier: item }));
                                  setShowSupplierMenu(false);
                                }}
                                style={{
                                  padding: '8px 12px', fontSize: '0.84rem', fontWeight: '600', color: '#2D1A12',
                                  cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                              >
                                {item}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Ngày hết hạn của mẫu *</label>
                    <input
                      type="date" required
                      value={formData.expiry_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="suggest-note-box" style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '2px' }}>Ghi chú</label>
                  <input
                    type="text"
                    placeholder="Nhập hoặc chọn ghi chú / điều kiện bảo quản..."
                    value={formData.note}
                    onFocus={() => setShowNoteMenu(true)}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, note: e.target.value }));
                      setShowNoteMenu(true);
                    }}
                    style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.84rem', outline: 'none', backgroundColor: '#FFFFFF' }}
                  />
                  {showNoteMenu && (
                    (() => {
                      const options = [
                        'Bảo quản nơi khô ráo, thoáng mát (25-30°C)',
                        'Đóng kín nắp ngay sau khi lấy mẫu',
                        'Tránh ánh nắng trực tiếp',
                        'Mẫu thử tiêu chuẩn kiểm định chất lượng',
                        'Dùng cho công đoạn sơn phủ bề mặt'
                      ];
                      const queryStr = (formData.note || '').toLowerCase().trim();
                      const filtered = queryStr ? options.filter(s => s.toLowerCase().includes(queryStr)) : options;
                      if (filtered.length === 0) return null;
                      return (
                        <div style={{
                          position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '4px',
                          backgroundColor: '#FFFFFF', border: '1.5px solid #EADCC9', borderRadius: '8px',
                          boxShadow: '0 10px 20px rgba(45, 26, 18, 0.15)', maxHeight: '180px', overflowY: 'auto', zIndex: 3000
                        }}>
                          {filtered.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, note: item }));
                                setShowNoteMenu(false);
                              }}
                              style={{
                                padding: '8px 12px', fontSize: '0.84rem', fontWeight: '600', color: '#2D1A12',
                                cursor: 'pointer', borderBottom: idx < filtered.length - 1 ? '1px solid #F1F5F9' : 'none'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#FAF6F0'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = '#FFFFFF'}
                            >
                              {item}
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    style={{ padding: '10px 22px', backgroundColor: '#FFFFFF', border: '1.5px solid #2D1A12', borderRadius: '8px', color: '#2D1A12', fontWeight: '800', cursor: 'pointer' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{ padding: '10px 28px', backgroundColor: '#5D3B32', border: 'none', borderRadius: '8px', color: '#FFFFFF', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer' }}
                  >
                    {submitting ? 'Đang lưu...' : 'Xác nhận'}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE DIALOG */}
      {deletingItem && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 2100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2',
              color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: '#1E293B', margin: '0 0 8px 0' }}>
              Xác nhận xóa mẫu màu sơn
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn xóa mẫu màu sơn <strong style={{ color: '#0F172A' }}>"{deletingItem.color_code} - {deletingItem.color_name}"</strong> không? Thao tác này không thể hoàn tác.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                style={{ padding: '9px 20px', border: '1px solid #CBD5E1', background: '#FFFFFF', borderRadius: '8px', fontWeight: '700', fontSize: '0.86rem', cursor: 'pointer' }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteConfirm}
                style={{ padding: '9px 24px', border: 'none', background: '#EF4444', color: '#FFFFFF', borderRadius: '8px', fontWeight: '800', fontSize: '0.86rem', cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Đang xóa...' : 'Xóa mẫu sơn'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaintColorManagementView;
