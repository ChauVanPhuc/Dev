import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api, { getBaseURL } from '@web/Shared/Services/api.service';
import { Search, Plus, FileSpreadsheet, FileText, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

const ManufactureProducts = () => {
  const navigate = useNavigate();
  const { showModal, startGlobalUpload, activeUploads } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  // Pagination & Search
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(15);

  useEffect(() => {
    fetchProducts();
  }, [page, searchTerm, limit]); // Reload when page, search, or limit changes
  
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
    <div className="orders-container" style={{ padding: '0 20px 20px 20px' }}>
      {/* Sticky Header Section */}
      <div style={{ 
        position: 'sticky', 
        top: '60px', 
        zIndex: 110, 
        backgroundColor: '#FAFAFA',
        margin: '0 -20px',
        padding: '10px 20px',
        borderBottom: '1px solid #e5e7eb',
        height: '60px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="orders-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '600px' }}>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input 
                type="text" 
                placeholder="Tìm kiếm mã sản phẩm..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                onKeyDown={(e) => e.key === 'Enter' && fetchProducts(true)}
                style={{ 
                  padding: '8px 12px 8px 40px', 
                  borderRadius: '8px', 
                  border: '1px solid #e5e7eb', 
                  width: '100%',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
            
            <button 
              onClick={() => fetchProducts(true)}
              style={{ padding: '8px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <ArrowUpDown size={18} />
            </button>

            <select 
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value));
                setPage(0);
              }}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: '1px solid #e5e7eb', 
                backgroundColor: 'white', 
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151',
                outline: 'none'
              }}
            >
              <option value={15}>15 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="file" id="excel-upload" style={{ display: 'none' }} accept=".xlsx, .xls" onChange={handleImportExcel} />
            <button 
              onClick={() => navigate('/manufacture/products/create')}
              style={{ padding: '8px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Thêm trực tiếp
            </button>
            <button 
              onClick={() => document.getElementById('excel-upload').click()}
              style={{ padding: '8px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <FileSpreadsheet size={16} /> Nhập Excel
            </button>
            <button style={{ padding: '8px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileSpreadsheet size={16} /> Xuất Excel
            </button>
            <button style={{ padding: '8px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={16} /> Xuất PDF
            </button>
          </div>
        </div>
      </div>

      <div className="orders-table-container" style={{ position: 'relative', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '400px' }}>
        {/* Gỡ bỏ Progress Bar Overlay tại chỗ để dùng Progress Card toàn cục */}

        {loading && activeUploads === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 15px' }}>
              <div className="spinner" style={{ 
                border: '4px solid #f3f3f3', 
                borderTop: '4px solid #A0301B', 
                borderRadius: '50%', 
                width: '60px', 
                height: '60px', 
                animation: 'spin 1s linear infinite' 
              }}></div>
              <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '12px', fontWeight: 'bold', color: '#A0301B'
              }}>
                {loadingProgress}%
              </div>
            </div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            Đang tải dữ liệu...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563', backgroundColor: '#f9fafb', position: 'sticky', top: '120px', zIndex: 90 }}>STT</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563', backgroundColor: '#f9fafb', position: 'sticky', top: '120px', zIndex: 90 }}>Mã SKU</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563', backgroundColor: '#f9fafb', position: 'sticky', top: '120px', zIndex: 90 }}>Tên Sản Phẩm</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', color: '#4b5563', backgroundColor: '#f9fafb', position: 'sticky', top: '120px', zIndex: 90 }}>Kích Thước (L-W-H)</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '600', color: '#4b5563', backgroundColor: '#f9fafb', position: 'sticky', top: '120px', zIndex: 90 }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                    Chưa có sản phẩm mẫu nào
                  </td>
                </tr>
              ) : (
                products.map((product, index) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px' }}>{index + 1}</td>
                    <td style={{ padding: '12px 16px', fontWeight: '500' }}>{product.sku || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>{product.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {product.length}x{product.width}x{product.height}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button 
                        onClick={() => navigate(`/manufacture/products/${product.id}`)}
                        style={{ marginRight: '8px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Chi tiết
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Purple Style Pagination Controls */}
        {!loading && (
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#111827' }}>
              {products.length} of {total}
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
  );
};

export default ManufactureProducts;
