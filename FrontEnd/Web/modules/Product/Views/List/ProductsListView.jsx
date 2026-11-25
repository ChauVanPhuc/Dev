import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import api, { getBaseURL, API_URL } from '@webShared/Services/api.service';
import { Search, Plus, FileSpreadsheet, FileText, ArrowUpDown, ChevronLeft, ChevronRight, Package, ShoppingBag, RefreshCw } from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import BeautifulConfirmModal from '@webShared/Views/components/feedback/BeautifulConfirmModal';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import SelectSheetsModal from './modals/SelectSheetsModal';

const ManufactureProducts = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const targetTabQuery = tabParam ? `?tab=${tabParam}` : '';

  const { showModal, startGlobalUpload, activeUploads, setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/products');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(tabParam === 'materials' ? 'BOM Vật tư sản phẩm' : title);
      if (setCustomSubtitle) setCustomSubtitle(tabParam === 'materials' ? 'Quản lý danh mục & định mức vật tư phụ kiện sản phẩm' : (subtitle || ''));
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode, tabParam]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { toast } = useToast();
  
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(30);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [woodFilter, setWoodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {}
  });
  const [sheetModal, setSheetModal] = useState({
    visible: false,
    file: null,
    sheets: []
  });

  useEffect(() => {
    const handleOutsideClick = () => {
      setActionMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, searchTerm, limit, filterType, tabParam]); // Reload when page, search, limit, filterType or tabParam changes
  
  // Đã gỡ bỏ logic khóa điều hướng cục bộ, Layout sẽ xử lý ngầm

  const fetchProducts = async (isSearch = false) => {
    if (isSearch) setPage(0); // Reset to page 1 on new search
    
    let interval;
    try {
      setLoading(true);
      setLoadingProgress(0);
      interval = setInterval(() => {
        setLoadingProgress(prev => (prev >= 90 ? 95 : prev + 5));
      }, 200);

      const skip = page * limit;
      let url = `/master-products/?skip=${skip}&limit=${limit}&q=${encodeURIComponent(searchTerm || '')}`;
      if (tabParam) {
        url += `&tab=${encodeURIComponent(tabParam)}`;
      }
      const response = await api.get(url);
      
      if (response && response.items) {
        setProducts(response.items);
        setTotal(response.total);
      } else if (Array.isArray(response)) {
        setProducts(response);
        setTotal(response.length);
      }
      setLoadingProgress(100);
    } catch (error) {
      console.error('Lỗi khi lấy danh sách sản phẩm mẫu:', error);
    } finally {
      clearInterval(interval);
      setTimeout(() => setLoading(false), 300);
    }
  };

  const handleImportExcel = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // NẾU ĐANG Ở CHẾ ĐỘ BOM VẬT TƯ (?tab=materials): TỰ ĐỘNG GỌI STREAMING API NẠP BOM VẬT TƯ (VTTH)
    if (tabParam === 'materials') {
      try {
        const targetFiles = files.length === 1 ? files[0] : files;
        if (startGlobalUpload) {
          await startGlobalUpload(
            targetFiles,
            '/master-products/import-material-bom-excel',
            () => fetchProducts()
          );
        } else {
          if (toast) toast('info', 'Hệ thống đang tiến hành nạp BOM vật tư...');
        }
      } catch (error) {
        console.error('Lỗi upload Excel BOM vật tư:', error);
        if (toast) toast('error', 'Có lỗi xảy ra khi nạp file Excel định mức vật tư.');
      } finally {
        e.target.value = '';
      }
      return;
    }

    try {
      if (files.length === 1) {
        const file = files[0];
        // 1. Quét nhanh metadata các sheet trong file Excel nếu là 1 file
        const formData = new FormData();
        formData.append('file', file);

        const token = localStorage.getItem('token');
        const authHeaders = { 'ngrok-skip-browser-warning': 'true' };
        if (token && token !== 'null' && token !== 'undefined') {
          authHeaders['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}master-products/inspect-excel-sheets`, {
          method: 'POST',
          body: formData,
          headers: authHeaders
        });

        if (response.ok) {
          const inspectRes = await response.json();
          if (inspectRes && inspectRes.sheets && inspectRes.sheets.length > 1) {
            // Nhiều sheet: Mở Modal cho người dùng chọn sheet mong muốn
            setSheetModal({
              visible: true,
              file: file,
              sheets: inspectRes.sheets
            });
            return;
          }
        }

        // File 1 sheet: Upload trực tiếp
        await startGlobalUpload(
          file, 
          '/master-products/import-excel', 
          () => fetchProducts()
        );
      } else {
        // Multi-file batch upload
        await startGlobalUpload(
          files,
          '/master-products/import-excel',
          () => fetchProducts()
        );
      }
    } catch (error) {
      console.error('Lỗi khi chuẩn bị upload:', error);
      toast('error', 'Không thể xử lý file Excel. Vui lòng kiểm tra lại định dạng file.');
    } finally {
      e.target.value = ''; // Reset input để có thể chọn lại cùng file
    }
  };

  const handleSyncFolderBom = () => {
    setConfirmModal({
      visible: true,
      title: 'Đồng bộ BOM từ D:\\SmartFlow\\BOM',
      message: 'Hệ thống sẽ quét và nạp toàn bộ các file BOM Excel trong thư mục D:\\SmartFlow\\BOM trên máy chủ để cập nhật dữ liệu cấu trúc chi tiết, quy cách và ĐVT chuẩn xác.\n\nBạn có muốn tiếp tục không?',
      type: 'primary',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        try {
          await startGlobalUpload(
            null,
            '/master-products/sync-bom-directory',
            () => fetchProducts(),
            { fileName: 'Đồng bộ thư mục D:\\SmartFlow\\BOM' }
          );
        } catch (err) {
          console.error('Lỗi khi kích hoạt đồng bộ thư mục:', err);
          toast('error', 'Không thể kết nối đến dịch vụ đồng bộ thư mục.');
        }
      }
    });
  };

  const handleConfirmSheetImport = async (selectedSheets) => {
    const targetFile = sheetModal.file;
    setSheetModal({ visible: false, file: null, sheets: [] });
    if (!targetFile) return;

    try {
      await startGlobalUpload(
        targetFile,
        '/master-products/import-excel',
        () => fetchProducts(),
        { sheets: JSON.stringify(selectedSheets) }
      );
    } catch (error) {
      console.error('Lỗi upload sheets:', error);
    }
  };

  const displayedProducts = products.filter(product => {
    if (filterType === 'atlas') {
      return (product.sku || '').toUpperCase().startsWith('A');
    }
    if (filterType === 'table') {
      return (product.sku || '').toUpperCase().startsWith('T');
    }
    if (filterType === 'other') {
      const sku = (product.sku || '').toUpperCase();
      return !sku.startsWith('A') && !sku.startsWith('T');
    }
    return true;
  });

  const handleDelete = (product) => {
    setConfirmModal({
      visible: true,
      title: 'Xác nhận xóa sản phẩm',
      message: `Bạn có chắc chắn muốn xóa sản phẩm "${product.name || product.sku}" (Mã: ${product.sku || 'N/A'}) không?\nThao tác này sẽ xóa toàn bộ dữ liệu chi tiết cấu thành và không thể khôi phục.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, visible: false }));
        try {
          await api.delete(`/master-products/${product.id}`);
          toast('success', `Đã xóa sản phẩm ${product.sku || product.name} thành công!`);
          fetchProducts();
        } catch (error) {
          console.error("Lỗi khi xóa sản phẩm:", error);
          toast('error', "Không thể xóa sản phẩm này. Vui lòng thử lại sau.");
        }
      }
    });
  };

  const purpleButtonStyle = (isActive) => ({
    minWidth: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    border: isActive ? '2px solid #6D28D9' : '1px solid #E5E7EB',
    backgroundColor: 'white',
    color: isActive ? '#6D28D9' : '#374151',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: isActive ? 'bold' : '500',
    transition: 'all 0.2s',
    margin: '0 2px'
  });

  return (
    <div className="gold-layout">
      {/* ── STICKY TOP ZONE ── */}
      <div className="sticky-top-zone">
        {/* Table Toolbar */}
        <PageToolbar
          searchValue={searchTerm}
          onSearchChange={(val) => { setSearchTerm(val); setPage(0); }}
          searchPlaceholder="Tìm kiếm mã sản phẩm..."
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={(filterType !== 'all' ? 1 : 0) + (woodFilter ? 1 : 0) + (statusFilter ? 1 : 0)}
          importActions={[
            {
              label: tabParam === 'materials' ? 'Nhập Excel BOM Vật tư' : 'Nhập file Excel (1 hoặc nhiều)',
              icon: <FileSpreadsheet size={16} />,
              onClick: () => document.getElementById('excel-upload').click()
            },
            ...(tabParam !== 'materials' ? [{
              label: 'Đồng bộ D:\\SmartFlow\\BOM',
              icon: <RefreshCw size={16} />,
              onClick: handleSyncFolderBom
            }] : [])
          ]}
          onExport={null}
          extraActions={[
            {
              label: 'Xuất Excel',
              onClick: () => {}
            },
            {
              label: 'Xuất PDF',
              onClick: () => {}
            }
          ]}
          onCreate={() => navigate(`/admin/products/create${targetTabQuery}`)}
          createLabel="Thêm trực tiếp"
          hasWritePermission={true}
        >
          <input type="file" id="excel-upload" style={{ display: 'none' }} accept=".xlsx, .xls" multiple onChange={handleImportExcel} />
        </PageToolbar>

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar" style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Bộ lọc phân loại */}
            <div className="filter-field-group">
              <label className="filter-field-label">Phân loại Dòng hàng</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Tất cả dòng hàng</option>
                <option value="atlas">Dòng tủ Atlas (A)</option>
                <option value="table">Dòng tủ Table (T)</option>
                <option value="other">Dòng khác</option>
              </select>
            </div>

            {/* Chất liệu gỗ */}
            <div className="filter-field-group">
              <label className="filter-field-label">Chất liệu gỗ</label>
              <select
                value={woodFilter}
                onChange={(e) => {
                  setWoodFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tất cả chất liệu</option>
                <option value="Oak">Gỗ Sồi (Oak)</option>
                <option value="Walnut">Gỗ Óc chó (Walnut)</option>
                <option value="Ash">Gỗ Tần bì (Ash)</option>
                <option value="Beech">Gỗ Dẻ dẻ (Beech)</option>
                <option value="Rubber">Gỗ Cao su</option>
              </select>
            </div>

            {/* Trạng thái phát triển */}
            <div className="filter-field-group">
              <label className="filter-field-label">Trạng thái phát triển</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Active">Đang sản xuất hàng loạt</option>
                <option value="Sample">Đang làm mẫu</option>
                <option value="Pending">Chờ phê duyệt kỹ thuật</option>
              </select>
            </div>

            {/* Hiển thị số dòng */}
            <div className="filter-field-group">
              <label className="filter-field-label">Hiển thị số dòng</label>
              <select 
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value));
                  setPage(0);
                }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            {(filterType !== 'all' || woodFilter || statusFilter || limit !== 15) && (
              <div className="filter-field-group">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => {
                    setFilterType('all');
                    setWoodFilter('');
                    setStatusFilter('');
                    setLimit(15);
                    setPage(0);
                  }}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    fontSize: '0.8rem',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1px solid #EADCC9',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && activeUploads === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 15px' }}>
            <div className="spinner" style={{ 
              border: '4px solid #f3f3f3', 
              borderTop: '4px solid #7B5233', 
              borderRadius: '50%', 
              width: '60px', 
              height: '60px', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '12px', fontWeight: 'bold', color: '#7B5233'
            }}>
              {loadingProgress}%
            </div>
          </div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          Đang tải dữ liệu...
        </div>
      ) : (
        <>
          {tabParam === 'materials' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', backgroundColor: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '10px', margin: '4px 0 10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: '800', fontSize: '0.85rem' }}>
                <Package size={18} color="#2563EB" />
                <span>Chế độ BOM Vật tư: Chỉ hiển thị các sản phẩm đã có dữ liệu định mức vật tư ({total} sản phẩm)</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/admin/products')}
                style={{ background: '#DBEAFE', border: 'none', padding: '5px 12px', borderRadius: '6px', color: '#1E40AF', fontWeight: '800', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Xem toàn bộ sản phẩm
              </button>
            </div>
          )}

          {/* Desktop view */}
          <div className="admin-list-layout desktop-only">
            <div className="mgmt-table admin-table-card card-shadow" style={{ position: 'relative', backgroundColor: 'white', minHeight: '400px' }}>
              <div className="table-responsive admin-table-scroll">
                <table className="manufacture-table data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                      <th>Tên sản phẩm</th>
                      <th>Tên sản phẩm mới</th>
                      <th>Dòng hàng</th>
                      <th>Mẫu sắc</th>
                      <th>Giá</th>
                      <th>Ngày điều chỉnh</th>
                      <th>Ghi chú</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                          Chưa có sản phẩm mẫu nào
                        </td>
                      </tr>
                    ) : (
                      displayedProducts.map((product, index) => (
                        <tr 
                          key={product.id || index} 
                          className="animate-card-entrance"
                          style={{
                            position: 'relative',
                            zIndex: actionMenuId === product.id ? 30 : 1,
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/admin/products/${product.id}${targetTabQuery}`, { state: { product } })}

                        >
                          <td data-label="STT" style={{ textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                            {String(page * limit + index + 1).padStart(2, '0')}
                          </td>
                          <td data-label="Tên sản phẩm">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#432818', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.78rem', overflow: 'hidden', flexShrink: 0 }}>
                                {product.image_url ? (
                                  <img
                                    src={product.image_url.startsWith('/') ? `${getBaseURL().replace(/\/api\/v1\/?$/, '')}${product.image_url}` : product.image_url}
                                    alt={product.sku}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : (
                                  (product.name || 'P').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: '800', color: '#1e293b' }}>{product.sku}</div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{product.name}</div>
                              </div>
                            </div>
                          </td>
                          <td data-label="Tên sản phẩm mới" style={{ fontWeight: '700', color: '#334155' }}>
                            {product.new_name || product.name}
                          </td>
                          <td data-label="Dòng hàng">
                            <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '800', whiteSpace: 'nowrap' }}>
                              {(product.category_name || '').replace(/^Dòng hàng\s*/i, '').trim() || (product.sku ? product.sku.slice(0, 3) : 'ADV')}
                            </span>
                          </td>
                          <td data-label="Mẫu sắc" style={{ fontWeight: '600', color: '#334155' }}>
                            {product.color || 'Tự nhiên'}
                          </td>
                          <td data-label="Giá" style={{ fontWeight: '800', color: '#432818' }}>
                            {product.price ? product.price.toLocaleString('vi-VN') : '0.00'}
                          </td>
                          <td data-label="Ngày điều chỉnh" style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {product.adjusted_date || '22/01/2026'}
                          </td>
                          <td data-label="Ghi chú" style={{ fontSize: '0.82rem', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {product.description || 'APT012'}
                          </td>
                          <td 
                            data-label="Thao Tác" 
                            style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === product.id ? 40 : 1 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                             <button
                               className="action-btn"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setActionMenuId(actionMenuId === product.id ? null : product.id);
                               }}
                             ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                             {actionMenuId === product.id && (
                               <div 
                                 className="action-menu" 
                                 style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}
                                 onClick={(e) => e.stopPropagation()}
                               >
                                 <button 
                                   className="action-menu-item" 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setActionMenuId(null);
                                     navigate(`/admin/products/${product.id}${targetTabQuery}`, { state: { product } });
                                   }}
                                 >
                                   Chi tiết
                                 </button>
                                 <button 
                                   className="action-menu-item danger" 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setActionMenuId(null);
                                     handleDelete(product);
                                   }}
                                 >
                                   Xóa
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
              
              {/* Desktop Pagination */}
              {!loading && (
                <div className="admin-pagination-desktop desktop-only">
                  <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                    Hiển thị <b>{total > 0 ? page * limit + 1 : 0} - {Math.min((page + 1) * limit, total)}</b> trên <b>{total}</b> sản phẩm
                  </div>
                  
                  <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button 
                      className="page-btn"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    <div style={{ display: 'flex', gap: '5px' }}>
                      {(() => {
                        const totalPages = Math.ceil(total / limit);
                        const pages = [];
                        let start = Math.max(0, page - 1);
                        let end = Math.min(totalPages - 1, start + 2);
                        if (end - start < 2) start = Math.max(0, end - 2);

                        if (start > 0) {
                          pages.push(
                            <button 
                              key={0} 
                              className={`page-btn ${page === 0 ? 'active' : ''}`} 
                              onClick={() => setPage(0)}
                            >
                              1
                            </button>
                          );
                          if (start > 1) pages.push(<span key="s1" style={{ padding: '0 4px', alignSelf: 'center', color: '#8D6E63' }}>...</span>);
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(
                            <button 
                              key={i} 
                              className={`page-btn ${page === i ? 'active' : ''}`} 
                              onClick={() => setPage(i)}
                            >
                              {i + 1}
                            </button>
                          );
                        }

                        if (end < totalPages - 1) {
                          if (end < totalPages - 2) pages.push(<span key="s2" style={{ padding: '0 4px', alignSelf: 'center', color: '#8D6E63' }}>...</span>);
                          pages.push(
                            <button 
                              key={totalPages - 1} 
                              className={`page-btn ${page === totalPages - 1 ? 'active' : ''}`} 
                              onClick={() => setPage(totalPages - 1)}
                            >
                              {totalPages}
                            </button>
                          );
                        }
                        
                        return pages;
                      })()}
                    </div>

                    <button 
                      className="page-btn"
                      onClick={() => setPage(p => p + 1)}
                      disabled={(page + 1) * limit >= total}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile view */}
          <div className="mobile-only manufacture-cards-scroll">
            <div className="manufacture-cards-container">
              {displayedProducts.map((product, idx) => (
                <div key={product.id} className="plan-mobile-card status-completed card-shadow animate-card-entrance" onClick={() => navigate(`/admin/products/${product.id}${targetTabQuery}`, { state: { product } })}>

                  <div className="card-header">
                    <span className="card-khsx">{product.name}</span>
                    <span className="status-badge" style={{ backgroundColor: '#ecfdf5', color: '#10b981', border: '1px solid #a7f3d0' }}>
                      #{page * limit + idx + 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Package size={14} color="#8D6E63" /> SKU: {product.sku || 'N/A'}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ShoppingBag size={14} color="#8D6E63" /> {product.length}x{product.width}x{product.height} mm
                    </span>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>Nhấn để xem chi tiết ›</div>
                </div>
              ))}
              {displayedProducts.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Không có sản phẩm nào.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Sticky Pagination */}
      <div className="pagination-mobile-sticky mobile-only">
          <button className="page-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7B5233' }}>Trang {page + 1} / {Math.ceil(total / limit) || 1}</span>
          <button className="page-btn" onClick={() => setPage(p => p + 1)} disabled={(page + 1) * limit >= total}>
              <ChevronRight size={16} />
          </button>
      </div>

      {/* Modal Xác nhận Xóa Sản phẩm Chuẩn Dự Án */}
      <BeautifulConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
      />

      {/* Modal Tùy chọn Sheets Import BOM */}
      {sheetModal.visible && (
        <SelectSheetsModal
          file={sheetModal.file}
          sheets={sheetModal.sheets}
          onClose={() => setSheetModal({ visible: false, file: null, sheets: [] })}
          onConfirm={handleConfirmSheetImport}
        />
      )}


    </div>
  );
};

export default ManufactureProducts;
