import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Copy, Layers, CheckSquare, Square, Box, Info, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import api from '@webShared/Services/api.service';

const labelStyle = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: '700',
  color: '#2D1A12',
  marginBottom: '4px',
};

const inputBaseStyle = {
  width: '100%',
  padding: '8px 12px',
  border: '1.5px solid #EADCC9',
  borderRadius: '8px',
  fontSize: '0.85rem',
  fontWeight: '600',
  color: '#2D1A12',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  backgroundColor: '#FFFFFF',
};

const CopyProductModal = ({ isOpen, onClose, onApply, currentSku = '' }) => {
  if (!isOpen) return null;

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [categoriesOptions, setCategoriesOptions] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingList, setLoadingList] = useState(false);

  // Selected Source Product State
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [sourceProductDetail, setSourceProductDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Copy Options Checkboxes
  const [copyOptions, setCopyOptions] = useState({
    copyGeneralInfo: true,
    copyBOM: true,
    copyDetails: true,
    copyPaintColors: true,
    syncSKUPrefix: true
  });

  // Load danh mục dòng hàng
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        let res = await api.get('/master-categories/').catch(() => null);
        if (!res || !Array.isArray(res) || res.length === 0) {
          res = await api.get('/categories').catch(() => []);
        }
        const dataList = Array.isArray(res) ? res : (res?.data || []);
        if (dataList.length > 0) {
          const list = dataList.map(c => {
            const rawName = typeof c === 'string' ? c : (c.name || '');
            const cleanName = rawName.replace(/^Dòng hàng\s*/i, '').trim();
            return typeof c === 'string' ? { name: cleanName } : { ...c, name: cleanName };
          });
          setCategoriesOptions(list);
        }
      } catch (err) {
        console.warn('Lỗi lấy danh mục:', err);
      }
    };
    fetchCategories();
  }, []);

  // Fetch danh sách sản phẩm mẫu với Debounce tìm kiếm
  useEffect(() => {
    let isCancelled = false;
    const fetchProducts = async () => {
      setLoadingList(true);
      try {
        let queryParams = `skip=0&limit=80`;
        if (searchTerm.trim()) {
          queryParams += `&q=${encodeURIComponent(searchTerm.trim())}`;
        }
        const res = await api.get(`/master-products/?${queryParams}`).catch(() => null);
        if (!isCancelled && res) {
          const items = Array.isArray(res.items) ? res.items : (Array.isArray(res) ? res : []);
          setProductsList(items);
          setTotalProducts(res.total || items.length);

          // Tự động chọn sản phẩm đầu tiên nếu chưa chọn cái nào
          if (!selectedProductId && items.length > 0) {
            setSelectedProductId(items[0].id);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách sản phẩm:', err);
      } finally {
        if (!isCancelled) setLoadingList(false);
      }
    };

    const timer = setTimeout(fetchProducts, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Lọc danh sách sản phẩm theo Dòng hàng đã chọn
  const filteredProducts = useMemo(() => {
    if (!selectedLine) return productsList;
    return productsList.filter(p => {
      const brand = p.brand_name || p.category_name || '';
      const sku = p.sku || '';
      return brand.toLowerCase().includes(selectedLine.toLowerCase()) || sku.toUpperCase().startsWith(selectedLine.toUpperCase());
    });
  }, [productsList, selectedLine]);

  // Khi chọn 1 sản phẩm -> Tải chi tiết đầy đủ của sản phẩm đó
  useEffect(() => {
    if (!selectedProductId) {
      setSourceProductDetail(null);
      return;
    }

    let isCancelled = false;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await api.get(`/master-products/${selectedProductId}`).catch(() => null);
        if (!isCancelled && res) {
          const data = (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) ? res.data : res;
          setSourceProductDetail(data);
        }
      } catch (err) {
        console.warn('Lỗi tải chi tiết sản phẩm mẫu:', err);
      } finally {
        if (!isCancelled) setLoadingDetail(false);
      }
    };

    fetchDetail();
    return () => { isCancelled = true; };
  }, [selectedProductId]);

  const toggleOption = (key) => {
    setCopyOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApply = () => {
    if (!sourceProductDetail) return;
    onApply(sourceProductDetail, copyOptions);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(45, 26, 18, 0.55)',
      backdropFilter: 'blur(4px)',
      zIndex: 2500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '1080px',
        maxHeight: '92vh',
        boxShadow: '0 25px 50px -12px rgba(45, 26, 18, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1.5px solid #EADCC9'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1.5px solid #EADCC9',
          backgroundColor: '#FAF6F1'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#5D3B32',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Copy size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.18rem', fontWeight: '800', color: '#2D1A12', margin: 0 }}>
                Lấy thông tin từ sản phẩm mẫu khác
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#7C675B', fontWeight: '600' }}>
                Kế thừa thông số kích thước, cây BOM định mức và mẫu màu từ sản phẩm đã có
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#5D3B32',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EADCC9'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={22} />
          </button>
        </div>

        {/* Body 2 Cột (Master - Detail) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '420px 1fr',
          flex: 1,
          overflow: 'hidden',
          backgroundColor: '#FAF8F5'
        }}>
          {/* CỘT TRÁI: Tìm kiếm & Danh sách sản phẩm nguồn */}
          <div style={{
            borderRight: '1.5px solid #EADCC9',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#FFFFFF',
            overflow: 'hidden'
          }}>
            {/* Thanh tìm kiếm & bộ lọc */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1ECE6', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#8D6E63' }} />
                <input
                  type="text"
                  placeholder="Tìm theo mã SKU hoặc tên sản phẩm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    ...inputBaseStyle,
                    paddingLeft: '32px',
                    backgroundColor: '#FAF6F1',
                    fontSize: '0.82rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D3B32', whiteSpace: 'nowrap' }}>Dòng hàng:</label>
                <select
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                  style={{
                    ...inputBaseStyle,
                    padding: '6px 10px',
                    fontSize: '0.8rem',
                    backgroundColor: '#FAF6F1'
                  }}
                >
                  <option value="">Tất cả dòng hàng</option>
                  {categoriesOptions.map(cat => (
                    <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#8D6E63', fontWeight: '700' }}>
                <span>Hiển thị {filteredProducts.length} sản phẩm</span>
                {loadingList && <span style={{ color: '#5D3B32' }}>Đang tải...</span>}
              </div>
            </div>

            {/* Danh sách cuộn sản phẩm */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              {filteredProducts.length === 0 && !loadingList ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
                  <Box size={36} style={{ margin: '0 auto 8px', color: '#D1D5DB' }} />
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600' }}>Không tìm thấy sản phẩm phù hợp</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProductId === p.id;
                  const brand = p.brand_name || p.category_name || (p.sku ? p.sku.slice(0, 3) : '');
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProductId(p.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #5D3B32' : '1px solid #EADCC9',
                        backgroundColor: isSelected ? '#FAF2E9' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(93, 59, 50, 0.12)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#FCF9F6';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <span style={{
                          fontSize: '0.88rem',
                          fontWeight: '800',
                          color: isSelected ? '#5D3B32' : '#2D1A12'
                        }}>
                          {p.sku}
                        </span>
                        {brand && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#EADCC9',
                            color: '#5D3B32'
                          }}>
                            {brand}
                          </span>
                        )}
                      </div>

                      <div style={{
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        color: '#4B5563',
                        marginBottom: '4px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {p.name}
                      </div>

                      <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: '#8D6E63', fontWeight: '600' }}>
                        {p.length || p.width || p.height ? (
                          <span>{p.length || 0}×{p.width || 0}×{p.height || 0} mm</span>
                        ) : (
                          <span>{p.specification || 'Kích thước chuẩn'}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CỘT PHẢI: Xem trước chi tiết & Tùy chọn sao chép */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: '#FAF8F5'
          }}>
            {loadingDetail ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px', color: '#5D3B32' }}>
                <RefreshCw size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>Đang nạp chi tiết sản phẩm mẫu...</span>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
            ) : sourceProductDetail ? (
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Khung Thông tin tóm tắt sản phẩm nguồn */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #EADCC9',
                  padding: '14px 16px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Sản phẩm nguồn đã chọn
                      </span>
                      <h4 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', fontWeight: '900', color: '#2D1A12' }}>
                        {sourceProductDetail.sku} - {sourceProductDetail.name}
                      </h4>
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#DEF7EC',
                      color: '#03543F',
                      fontSize: '0.75rem',
                      fontWeight: '800'
                    }}>
                      {sourceProductDetail.status || 'Hoạt động'}
                    </span>
                  </div>

                  {/* Grid 4 chỉ số */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', paddingTop: '8px', borderTop: '1px dashed #EADCC9' }}>
                    <div style={{ backgroundColor: '#FAF6F1', padding: '8px 10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#8D6E63', fontWeight: '700' }}>Dòng hàng</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>{sourceProductDetail.brand_name || sourceProductDetail.category_name || 'APT'}</span>
                    </div>
                    <div style={{ backgroundColor: '#FAF6F1', padding: '8px 10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#8D6E63', fontWeight: '700' }}>Kích thước (D×R×C)</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>{sourceProductDetail.length || 0}×{sourceProductDetail.width || 0}×{sourceProductDetail.height || 0}</span>
                    </div>
                    <div style={{ backgroundColor: '#FAF6F1', padding: '8px 10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#8D6E63', fontWeight: '700' }}>Màu sắc</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>{sourceProductDetail.color || 'Tự nhiên'}</span>
                    </div>
                    <div style={{ backgroundColor: '#FAF6F1', padding: '8px 10px', borderRadius: '8px' }}>
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#8D6E63', fontWeight: '700' }}>Khối lượng</span>
                      <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>{sourceProductDetail.weight || 0} kg</span>
                    </div>
                  </div>
                </div>

                {/* Khung Tùy Chọn Sao Chép (Options Checkboxes) */}
                <div style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #EADCC9',
                  padding: '14px 16px'
                }}>
                  <h5 style={{ margin: '0 0 10px 0', fontSize: '0.88rem', fontWeight: '800', color: '#2D1A12', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} color="#5D3B32" /> Chọn dữ liệu muốn sao chép:
                  </h5>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label
                      onClick={() => toggleOption('copyGeneralInfo')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: copyOptions.copyGeneralInfo ? '#FAF6F1' : '#FFFFFF',
                        border: copyOptions.copyGeneralInfo ? '1px solid #EADCC9' : '1px solid #F1ECE6',
                        cursor: 'pointer'
                      }}
                    >
                      {copyOptions.copyGeneralInfo ? <CheckSquare size={18} color="#5D3B32" /> : <Square size={18} color="#9CA3AF" />}
                      <div>
                        <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>
                          Thông tin quy cách & Kích thước
                        </span>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#6B7280' }}>
                          Kế thừa Dòng hàng, Dài × Rộng × Cao, Khối lượng, Màu sắc, Ghi chú
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => toggleOption('copyBOM')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: copyOptions.copyBOM ? '#FAF6F1' : '#FFFFFF',
                        border: copyOptions.copyBOM ? '1px solid #EADCC9' : '1px solid #F1ECE6',
                        cursor: 'pointer'
                      }}
                    >
                      {copyOptions.copyBOM ? <CheckSquare size={18} color="#5D3B32" /> : <Square size={18} color="#9CA3AF" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2D1A12' }}>
                            Cây cấu trúc linh kiện BOM Master
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#5D3B32', backgroundColor: '#EADCC9', padding: '1px 6px', borderRadius: '4px' }}>
                            {(sourceProductDetail.master_bom_details || []).length} linh kiện
                          </span>
                        </div>
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#6B7280' }}>
                          Sao chép toàn bộ bảng BOM 13 cột phân cấp bậc (1, 1.1, 1.1.1...) kèm công đoạn và vật liệu
                        </span>
                      </div>
                    </label>

                    {copyOptions.copyBOM && (
                      <label
                        onClick={() => toggleOption('syncSKUPrefix')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 10px 6px 36px',
                          cursor: 'pointer'
                        }}
                      >
                        {copyOptions.syncSKUPrefix ? <CheckSquare size={16} color="#5D3B32" /> : <Square size={16} color="#9CA3AF" />}
                        <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D3B32' }}>
                          Tự động cập nhật tiền tố mã linh kiện theo SKU mới ({currentSku || 'SKU-MỚI'}.1, .1.1...)
                        </span>
                      </label>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <label
                        onClick={() => toggleOption('copyDetails')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: copyOptions.copyDetails ? '#FAF6F1' : '#FFFFFF',
                          border: copyOptions.copyDetails ? '1px solid #EADCC9' : '1px solid #F1ECE6',
                          cursor: 'pointer'
                        }}
                      >
                        {copyOptions.copyDetails ? <CheckSquare size={18} color="#5D3B32" /> : <Square size={18} color="#9CA3AF" />}
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#2D1A12' }}>
                            Chi tiết sản phẩm (KT03.1)
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#6B7280' }}>
                            {(sourceProductDetail.product_details || []).length} mục chi tiết
                          </span>
                        </div>
                      </label>

                      <label
                        onClick={() => toggleOption('copyPaintColors')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: copyOptions.copyPaintColors ? '#FAF6F1' : '#FFFFFF',
                          border: copyOptions.copyPaintColors ? '1px solid #EADCC9' : '1px solid #F1ECE6',
                          cursor: 'pointer'
                        }}
                      >
                        {copyOptions.copyPaintColors ? <CheckSquare size={18} color="#5D3B32" /> : <Square size={18} color="#9CA3AF" />}
                        <div>
                          <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#2D1A12' }}>
                            Mẫu màu sơn (KT03.3)
                          </span>
                          <span style={{ display: 'block', fontSize: '0.7rem', color: '#6B7280' }}>
                            {(sourceProductDetail.paint_color_samples || []).length} mẫu màu
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Khung Xem trước BOM tóm tắt */}
                {sourceProductDetail.master_bom_details && sourceProductDetail.master_bom_details.length > 0 && (
                  <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1.5px solid #EADCC9',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#8D6E63' }}>
                      Xem trước cây BOM mẫu ({sourceProductDetail.master_bom_details.length} dòng):
                    </span>
                    <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {sourceProductDetail.master_bom_details.slice(0, 15).map((bom, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          backgroundColor: idx % 2 === 0 ? '#FAF8F5' : '#FFFFFF',
                          fontSize: '0.75rem'
                        }}>
                          <span style={{ fontWeight: '700', color: '#5D3B32' }}>{bom.sku || `Part-${idx + 1}`}</span>
                          <span style={{ fontWeight: '600', color: '#2D1A12', flex: 1, marginLeft: '12px' }}>{bom.name}</span>
                          <span style={{ color: '#8D6E63', fontWeight: '600' }}>{bom.quantity || 1} {bom.unit || 'Cái'}</span>
                        </div>
                      ))}
                      {sourceProductDetail.master_bom_details.length > 15 && (
                        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#8D6E63', fontStyle: 'italic', padding: '4px' }}>
                          ... và {sourceProductDetail.master_bom_details.length - 15} linh kiện khác
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', padding: '20px' }}>
                <span>Vui lòng chọn 1 sản phẩm ở danh sách bên trái để xem trước</span>
              </div>
            )}

            {/* Footer Actions */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1.5px solid #EADCC9',
              backgroundColor: '#FAF6F1',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              alignItems: 'center'
            }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 20px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #5D3B32',
                  borderRadius: '8px',
                  color: '#5D3B32',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleApply}
                disabled={!sourceProductDetail}
                style={{
                  padding: '9px 24px',
                  backgroundColor: sourceProductDetail ? '#5D3B32' : '#CBD5E1',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  cursor: sourceProductDetail ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: sourceProductDetail ? '0 4px 10px rgba(93, 59, 50, 0.2)' : 'none'
                }}
              >
                <ArrowRight size={16} /> Áp dụng vào sản phẩm mới
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default CopyProductModal;
