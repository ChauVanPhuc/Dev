import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Edit2, Trash2, X, AlertTriangle, MoreVertical } from 'lucide-react';
import api from '@webShared/Services/api.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import '@styles/components.css';

/**
 * View: KT03.1 - Quản lý Chi tiết (/admin/product-details)
 * Thiết kế chuẩn 100% theo trang Gốc (UserManagement / Quản lý người dùng - AD3).
 */
const ProductDetailsManagementView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;

  // Data states
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
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
  const [inputStageFilter, setInputStageFilter] = useState('');
  const [outputStageFilter, setOutputStageFilter] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Count active filters
  const activeFiltersCount = (selectedProductId ? 1 : 0) + (inputStageFilter ? 1 : 0) + (outputStageFilter ? 1 : 0) + (materialFilter ? 1 : 0);

  // Modal & Dialog states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    master_product_id: '',
    name: '',
    quantity: 1,
    unit: 'Cái',
    input_stage: 'Định hình',
    output_stage: 'Lắp ráp',
    parent_name: '',
    material: 'Gỗ tự nhiên'
  });

  const stageOptions = ['Tạo phôi', 'Định hình', 'Lắp ráp', 'Sơn', 'Đóng gói', 'Lưu kho'];
  const materialOptions = ['Gỗ tự nhiên', 'MDF', 'Gỗ Sồi', 'Gỗ thông', 'Ván ép', 'Kim loại'];
  const unitOptions = ['Cái', 'Tấm', 'Bộ', 'm2', 'm3'];

  // Setup header Title & Navigation Back button
  useEffect(() => {
    if (setCustomTitle) setCustomTitle('Quản lý sản phẩm');
    if (setCustomSubtitle) setCustomSubtitle('KT03.1: Quản lý Chi tiết');
    if (setCustomScreenCode) setCustomScreenCode('KT03.1');
    if (setHeaderExtra) {
      setHeaderExtra(
        <button
          type="button"
          className="secondary-btn"
          onClick={() => navigate('/admin/products')}
          style={{
            padding: '7px 16px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #5D3B32',
            borderRadius: '8px',
            color: '#5D3B32',
            fontWeight: '800',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          ‹ Quay lại danh sách sản phẩm
        </button>
      );
    }
    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, navigate]);

  // Load products list for dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/master-products/?skip=0&limit=100').catch(() => null);
        if (res && res.items) {
          setProducts(res.items);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh sách sản phẩm:', err);
      }
    };
    fetchProducts();
  }, []);

  // Fetch list of details from backend
  const fetchDetails = async () => {
    try {
      setLoading(true);
      const skip = (currentPage - 1) * pageSize;
      let url = `/master-products/all-product-details?skip=${skip}&limit=${pageSize}`;
      if (selectedProductId) url += `&product_id=${selectedProductId}`;
      if (inputStageFilter) url += `&input_stage=${encodeURIComponent(inputStageFilter)}`;
      if (outputStageFilter) url += `&output_stage=${encodeURIComponent(outputStageFilter)}`;
      if (materialFilter) url += `&material=${encodeURIComponent(materialFilter)}`;
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
      console.error('Lỗi lấy danh sách chi tiết:', err);
      if (toast) toast('error', 'Không thể tải danh sách chi tiết');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [currentPage, pageSize, searchTerm, selectedProductId, inputStageFilter, outputStageFilter, materialFilter]);

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedProductId('');
    setInputStageFilter('');
    setOutputStageFilter('');
    setMaterialFilter('');
    setCurrentPage(1);
  };

  // Open modal for creating
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      master_product_id: products.length > 0 ? String(products[0].id) : '',
      name: '',
      quantity: 1,
      unit: 'Cái',
      input_stage: 'Định hình',
      output_stage: 'Lắp ráp',
      parent_name: '',
      material: 'Gỗ tự nhiên'
    });
    setShowFormModal(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      master_product_id: String(item.master_product_id || ''),
      name: item.name || '',
      quantity: item.quantity || 1,
      unit: item.unit || 'Cái',
      input_stage: item.input_stage || 'Định hình',
      output_stage: item.output_stage || 'Lắp ráp',
      parent_name: item.parent_name || '',
      material: item.material || 'Gỗ tự nhiên'
    });
    setShowFormModal(true);
  };

  // Submit form (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      if (toast) toast('error', 'Vui lòng nhập Tên chi tiết');
      return;
    }
    const prodId = formData.master_product_id || (products.length > 0 ? products[0].id : 1);
    const payload = { ...formData, master_product_id: prodId };

    try {
      setSubmitting(true);
      if (editingItem) {
        await api.put(`/master-products/product-details-item/${editingItem.id}`, payload);
        if (toast) toast('success', `Đã cập nhật chi tiết "${formData.name}" thành công!`);
      } else {
        await api.post(`/master-products/${prodId}/product-details`, payload);
        if (toast) toast('success', `Đã thêm chi tiết "${formData.name}" thành công!`);
      }
      setShowFormModal(false);
      fetchDetails();
    } catch (err) {
      console.error('Lỗi khi lưu thông tin chi tiết:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi lưu thông tin chi tiết');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    try {
      setSubmitting(true);
      await api.delete(`/master-products/product-details/${deletingItem.id}`);
      if (toast) toast('success', `Đã xóa chi tiết "${deletingItem.name}" thành công!`);
      setDeletingItem(null);
      fetchDetails();
    } catch (err) {
      console.error('Lỗi khi xóa chi tiết:', err);
      if (toast) toast('error', 'Có lỗi xảy ra khi xóa chi tiết');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="mgmt-container">
      <div className="mgmt-main">

        {/* ── PageToolbar (Chuẩn 100% theo Trang Gốc UserManagement) ── */}
        <PageToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
          searchPlaceholder="Nhập tên chi tiết, công đoạn, vật liệu..."
          showFilter={true}
          isFilterOpen={showFilterPanel}
          onFilterToggle={() => setShowFilterPanel(!showFilterPanel)}
          activeFiltersCount={activeFiltersCount}
          onCreate={handleOpenCreate}
          createLabel="Tạo mới"
          hasWritePermission={true}
        />

        {/* ── INLINE EXPANDABLE FILTER BAR (Chuẩn 100% Trang Gốc UserManagement) ── */}
        {showFilterPanel && (
          <div className="filter-inline-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', padding: '14px 20px', backgroundColor: '#FAF6F0', borderRadius: '12px', border: '1.5px solid #EADCC9', marginBottom: '16px', alignItems: 'flex-end' }}>

            {/* Lọc theo Công đoạn giao */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Công đoạn giao</label>
              <select
                value={inputStageFilter}
                onChange={(e) => { setInputStageFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '150px' }}
              >
                <option value="">Tất cả công đoạn</option>
                {stageOptions.map((st, i) => (
                  <option key={i} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Lọc theo Công đoạn nhận */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Công đoạn nhận</label>
              <select
                value={outputStageFilter}
                onChange={(e) => { setOutputStageFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '150px' }}
              >
                <option value="">Tất cả công đoạn</option>
                {stageOptions.map((st, i) => (
                  <option key={i} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Lọc theo Vật liệu */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontWeight: '700', fontSize: '0.82rem', color: '#5D3B32' }}>Vật liệu</label>
              <select
                value={materialFilter}
                onChange={(e) => { setMaterialFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', color: '#2D1A12', fontWeight: '600', backgroundColor: '#FFF', minWidth: '140px' }}
              >
                <option value="">Tất cả vật liệu</option>
                {materialOptions.map((mat, i) => (
                  <option key={i} value={mat}>{mat}</option>
                ))}
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
                        <th>SẢN PHẨM MẪU</th>
                        <th>TÊN CHI TIẾT</th>
                        <th style={{ textAlign: 'center', width: '90px' }}>SỐ LƯỢNG</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>ĐƠN VỊ</th>
                        <th>CÔNG ĐOẠN GIAO</th>
                        <th>CÔNG ĐOẠN NHẬN</th>
                        <th>THÀNH PHẨM</th>
                        <th>VẬT LIỆU</th>
                        <th style={{ textAlign: 'center', width: '100px' }}>THAO TÁC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center', fontWeight: '700' }}>
                            {(currentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td>
                            <strong style={{ color: '#2D1A12' }}>{item.product_sku}</strong>
                            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{item.product_name}</div>
                          </td>
                          <td style={{ fontWeight: '800', color: '#2D1A12' }}>{item.name}</td>
                          <td style={{ textAlign: 'center', fontWeight: '800' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'center' }}>{item.unit}</td>
                          <td>{item.input_stage || '---'}</td>
                          <td>{item.output_stage || '---'}</td>
                          <td>{item.parent_name || '---'}</td>
                          <td>{item.material || '---'}</td>
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
                                  Xóa chi tiết
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
                            Không tìm thấy dữ liệu chi tiết nào.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ── Thanh Phân Trang chuẩn Gốc UserManagement ── */}
                <div className="admin-pagination-desktop desktop-only">
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{items.length}</b> trên <b>{total}</b> chi tiết
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="page-btn"
                        style={{ padding: '8px 12px' }}
                      >
                        &lt; Trước
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
                              <span key={`ell-${idx}`} style={{ padding: '0 8px', color: '#7B5233', fontWeight: '700' }}>
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
            maxWidth: '580px',
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
                {editingItem ? 'Chỉnh sửa chi tiết sản phẩm' : 'Thêm mới chi tiết sản phẩm'}
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
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12', marginBottom: '4px' }}>Tên chi tiết *</label>
                    <input
                      type="text"
                      required
                      placeholder="Nhập tên chi tiết..."
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12', marginBottom: '4px' }}>Số lượng *</label>
                    <input
                      type="number" min="1" step="any" required
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12', marginBottom: '4px' }}>Đơn vị *</label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                    >
                      {unitOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12', marginBottom: '4px' }}>Công đoạn giao</label>
                    <select
                      value={formData.input_stage}
                      onChange={(e) => setFormData(prev => ({ ...prev, input_stage: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                    >
                      {stageOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12', marginBottom: '4px' }}>Công đoạn nhận</label>
                    <select
                      value={formData.output_stage}
                      onChange={(e) => setFormData(prev => ({ ...prev, output_stage: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                    >
                      {stageOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12', marginBottom: '4px' }}>Thành phẩm</label>
                    <input
                      type="text"
                      placeholder="Nhập tên thành phẩm..."
                      value={formData.parent_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, parent_name: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: '700', color: '#2D1A12', marginBottom: '4px' }}>Vật liệu</label>
                  <select
                    value={formData.material}
                    onChange={(e) => setFormData(prev => ({ ...prev, material: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #EADCC9', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                  >
                    {materialOptions.map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
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
                    {submitting ? 'Đang lưu...' : (editingItem ? 'Lưu thay đổi' : 'Tạo chi tiết')}
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
              Xác nhận xóa chi tiết
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#64748B', margin: '0 0 20px 0', lineHeight: '1.5' }}>
              Bạn có chắc chắn muốn xóa chi tiết <strong style={{ color: '#0F172A' }}>"{deletingItem.name}"</strong> không? Thao tác này không thể hoàn tác.
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
                {submitting ? 'Đang xóa...' : 'Xóa chi tiết'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProductDetailsManagementView;
