import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api, { getBaseURL } from '@webShared/Services/api.service';
import { Search, Plus, FileSpreadsheet, FileText, ArrowUpDown, ChevronLeft, ChevronRight, Package, ShoppingBag } from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const ManufactureProducts = () => {
  const navigate = useNavigate();
  const { showModal, startGlobalUpload, activeUploads } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { toast } = useToast();
  
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(15);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActionMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, searchTerm, limit, filterType]); // Reload when page, search, limit, or filterType changes
  
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
      const response = await api.get(`/master-products/?skip=${skip}&limit=${limit}&q=${searchTerm || ''}`);
      
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
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Sử dụng hàm upload toàn cục từ Layout
      await startGlobalUpload(
        file, 
        '/master-products/import-excel', 
        () => fetchProducts() // Refresh danh sách khi xong
      );
    } catch (error) {
      console.error('Lỗi khi chuẩn bị upload:', error);
    } finally {
      e.target.value = ''; // Reset input để có thể chọn lại cùng file nếu cần
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

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;
    try {
      await api.delete(`/master-products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm:", error);
      toast('error', "Không thể xóa sản phẩm này. Vui lòng thử lại sau.");
    }
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
    <div className="manufacture-plan-container">
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
          activeFiltersCount={filterType !== 'all' ? 1 : 0}
          importActions={[
            {
              label: 'Nhập Excel',
              icon: <FileSpreadsheet size={16} />,
              onClick: () => document.getElementById('excel-upload').click()
            }
          ]}
          onExport={null} // Wait, let's pass custom actions for export/pdf, or pass as extraActions
          extraActions={[
            {
              label: 'Xuất Excel',
              onClick: () => {} // Wait, let's keep the click handlers
            },
            {
              label: 'Xuất PDF',
              onClick: () => {}
            }
          ]}
          onCreate={() => navigate('/admin/products/create')}
          createLabel="Thêm trực tiếp"
          hasWritePermission={true}
        >
          <input type="file" id="excel-upload" style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImportExcel} />
        </PageToolbar>

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar">
            {/* Bộ lọc phân loại */}
            <div className="filter-field-group">
              <label className="filter-field-label">Phân loại</label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="atlas">Dòng tủ Atlas (A)</option>
                <option value="table">Dòng tủ Table (T)</option>
                <option value="other">Dòng khác</option>
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
          {/* Desktop view */}
          <div className="admin-list-layout desktop-only">
            <div className="mgmt-table admin-table-card card-shadow" style={{ position: 'relative', backgroundColor: 'white', minHeight: '400px' }}>
              <div className="table-responsive admin-table-scroll">
                <table className="manufacture-table">
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Mã SKU</th>
                      <th>Tên Sản Phẩm</th>
                      <th>Kích Thước (L-W-H)</th>
                      <th style={{ textAlign: 'center', width: '120px' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#6b7280' }}>
                          Chưa có sản phẩm mẫu nào
                        </td>
                      </tr>
                    ) : (
                      displayedProducts.map((product, index) => (
                        <tr 
                          key={product.id} 
                          className="animate-card-entrance"
                          style={{
                            position: 'relative',
                            zIndex: actionMenuId === product.id ? 30 : 1
                          }}
                        >
                          <td data-label="STT">{index + 1}</td>
                          <td data-label="Mã SKU" style={{ fontWeight: '500' }}>{product.sku || 'N/A'}</td>
                          <td data-label="Tên Sản Phẩm">{product.name}</td>
                          <td data-label="Kích Thước (L-W-H)">
                            {product.length}x{product.width}x{product.height}
                          </td>
                          <td data-label="Thao Tác" style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === product.id ? 40 : 1 }}>
                             <button
                               className="action-btn"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setActionMenuId(actionMenuId === product.id ? null : product.id);
                               }}
                             ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                             {actionMenuId === product.id && (
                               <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                                 <button 
                                   className="action-menu-item" 
                                   onClick={() => {
                                     setActionMenuId(null);
                                     navigate(`/admin/products/${product.id}`);
                                   }}
                                 >
                                   Chi tiết
                                 </button>
                                 <button 
                                   className="action-menu-item danger" 
                                   onClick={() => {
                                     setActionMenuId(null);
                                     handleDelete(product.id);
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
                  <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>
                    Hiển thị {displayedProducts.length} trên {total} sản phẩm
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      style={{ 
                        ...purpleButtonStyle(false),
                        backgroundColor: page === 0 ? '#F3F4F6' : 'white',
                        cursor: page === 0 ? 'not-allowed' : 'pointer',
                        color: page === 0 ? '#D1D5DB' : '#374151'
                      }}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    
                    <div style={{ display: 'flex' }}>
                      {(() => {
                        const totalPages = Math.ceil(total / limit);
                        const pages = [];
                        let start = Math.max(0, page - 1);
                        let end = Math.min(totalPages - 1, start + 2);
                        if (end - start < 2) start = Math.max(0, end - 2);

                        if (start > 0) {
                          pages.push(<button key={0} onClick={() => setPage(0)} style={purpleButtonStyle(page === 0)}>1</button>);
                          if (start > 1) pages.push(<span key="s1" style={{ padding: '0 8px', alignSelf: 'center', color: '#6B7280' }}>...</span>);
                        }

                        for (let i = start; i <= end; i++) {
                          pages.push(<button key={i} onClick={() => setPage(i)} style={purpleButtonStyle(page === i)}>{i + 1}</button>);
                        }

                        if (end < totalPages - 1) {
                          if (end < totalPages - 2) pages.push(<span key="s2" style={{ padding: '0 8px', alignSelf: 'center', color: '#6B7280' }}>...</span>);
                          pages.push(<button key={totalPages - 1} onClick={() => setPage(totalPages - 1)} style={purpleButtonStyle(page === totalPages - 1)}>{totalPages}</button>);
                        }
                        
                        return pages;
                      })()}
                    </div>

                    <button 
                      onClick={() => setPage(p => p + 1)}
                      disabled={(page + 1) * limit >= total}
                      style={{ 
                        ...purpleButtonStyle(false),
                        backgroundColor: (page + 1) * limit >= total ? '#F3F4F6' : 'white',
                        cursor: (page + 1) * limit >= total ? 'not-allowed' : 'pointer',
                        color: (page + 1) * limit >= total ? '#D1D5DB' : '#374151'
                      }}
                    >
                      <ChevronRight size={18} />
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
                <div key={product.id} className="plan-mobile-card status-completed card-shadow animate-card-entrance" onClick={() => navigate(`/admin/products/${product.id}`)}>
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
    </div>
  );
};

export default ManufactureProducts;
