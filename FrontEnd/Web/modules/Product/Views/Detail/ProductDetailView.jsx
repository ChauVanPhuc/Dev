import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Layers, 
  Box, 
  Package, 
  Settings, 
  Database,
  ChevronRight,
  ChevronDown,
  Expand,
  Shrink,
  Plus,
  FileSpreadsheet,
  Trash2,
  Save,
  Share2,
  FileText,
  Palette,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import api from '@webShared/Services/api.service';

import AddDetailModal from './modals/AddDetailModal';
import AddComponentModal from './modals/AddComponentModal';
import AddPaintColorModal from './modals/AddPaintColorModal';

const flattenBOM = (items, parentPath = '', level = 0, result = []) => {
  items.forEach((item, index) => {
    const path = parentPath ? `${parentPath}-${index}` : `${index}`;
    const enrichedItem = {
      ...item,
      path,
      parentPath,
      level,
      hasChildren: item.children && item.children.length > 0
    };
    result.push(enrichedItem);
    if (enrichedItem.hasChildren) {
      flattenBOM(item.children, path, level + 1, result);
    }
  });
  return result;
};

const isRowVisible = (node, expandedPaths) => {
  if (node.level === 0) return true;
  const parts = node.path.split('-');
  let currentAncestorPath = '';
  for (let i = 0; i < parts.length - 1; i++) {
    currentAncestorPath = currentAncestorPath ? `${currentAncestorPath}-${parts[i]}` : parts[i];
    if (!expandedPaths.has(currentAncestorPath)) {
      return false;
    }
  }
  return true;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  
  // Active Tab: "bom" | "process" | "drawings" | "materials"
  const [activeTab, setActiveTab] = useState('bom');
  const [activeProcessStage, setActiveProcessStage] = useState('Định hình');

  // Modals state
  const [showAddDetailModal, setShowAddDetailModal] = useState(false);
  const [showAddComponentModal, setShowAddComponentModal] = useState(false);
  const [showAddPaintModal, setShowAddPaintModal] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [isGeneralInfoCollapsed, setIsGeneralInfoCollapsed] = useState(false);

  useEffect(() => {
    fetchProductDetail();
  }, [id]);

  const fetchProductDetail = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/master-products/${id}`);
      setProduct(data);
      
      if (data && data.master_bom_details) {
        const flattened = flattenBOM(data.master_bom_details);
        const initialExpanded = new Set();
        flattened.forEach(item => {
          if (item.hasChildren && item.level < 1) {
            initialExpanded.add(item.path);
          }
        });
        setExpandedPaths(initialExpanded);
      }
    } catch (error) {
      console.error('Lỗi khi lấy chi tiết sản phẩm:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
      Đang tải cấu trúc sản phẩm mẫu...
    </div>
  );

  if (!product) return <div style={{ textAlign: 'center', padding: '60px', color: '#dc2626' }}>Không tìm thấy sản phẩm.</div>;

  const flattenedData = flattenBOM(product.master_bom_details || []);

  const toggleNode = (path) => {
    setExpandedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allPaths = flattenedData.filter(item => item.hasChildren).map(item => item.path);
    setExpandedPaths(new Set(allPaths));
  };

  const handleCollapseAll = () => {
    setExpandedPaths(new Set());
  };

  const visibleRows = flattenedData.filter(node => isRowVisible(node, expandedPaths));

  const processStages = [
    { id: 'Tạo phôi', name: 'Tạo phôi' },
    { id: 'Định hình', name: 'Định hình' },
    { id: 'Lắp ráp', name: 'Lắp ráp' },
    { id: 'Sơn', name: 'Sơn' },
    { id: 'Đóng gói', name: 'Đóng gói' },
    { id: 'Lưu kho', name: 'Lưu kho' }
  ];

  return (
    <div style={{ backgroundColor: '#faf6f1', minHeight: '100vh', padding: '12px 16px', paddingBottom: '20px' }}>
      
      {/* Thông Tin Chung Box (Matching Mockup 2A top section) */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', padding: '10px 14px', marginBottom: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: isGeneralInfoCollapsed ? 'none' : '1px solid #f1f5f9', paddingBottom: isGeneralInfoCollapsed ? 0 : '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setIsGeneralInfoCollapsed(!isGeneralInfoCollapsed)}>
            <button style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#432818', display: 'flex', alignItems: 'center' }}>
              {isGeneralInfoCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </button>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#432818', margin: 0 }}>
              Thông tin chung
            </h3>
            {isGeneralInfoCollapsed && (
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '700', marginLeft: '6px' }}>
                ({product.sku} — {product.name})
              </span>
            )}
          </div>

          {/* Action Header Buttons matching Mockup 2A */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.76rem', fontWeight: '700', color: '#334155', cursor: 'pointer' }}>
              Lý lịch sản phẩm mới
            </button>
            <button style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.76rem', fontWeight: '700', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileSpreadsheet size={13} /> Nhập danh sách
            </button>
            <button style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.76rem', fontWeight: '700', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={13} /> Xóa sạch
            </button>
            <button style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 10px', fontSize: '0.76rem', fontWeight: '700', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Share2 size={13} /> Chuyển trạng thái
            </button>
            <button style={{ background: '#432818', border: 'none', borderRadius: '8px', padding: '4px 12px', fontSize: '0.76rem', fontWeight: '800', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Save size={13} /> Lưu thông tin
            </button>
          </div>
        </div>

        {!isGeneralInfoCollapsed && (
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px', marginTop: '8px' }}>
            {/* Image box */}
            <div style={{ width: '80px', height: '70px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <>
                  <Box size={22} />
                  <span style={{ fontSize: '0.62rem', marginTop: '2px' }}>Ảnh SP</span>
                </>
              )}
            </div>

            {/* Form grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '0.76rem' }}>
              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Mã sản phẩm</label>
                <input type="text" readOnly value={product.sku || ''} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '800', backgroundColor: '#f8fafc', color: '#1e293b' }} />
              </div>

              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Danh mục</label>
                <input type="text" readOnly value={product.category_name || 'Tủ quần áo'} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '700', backgroundColor: '#fff' }} />
              </div>

              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Dòng hàng</label>
                <input type="text" readOnly value={product.category_name || 'A'} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '700', backgroundColor: '#fff' }} />
              </div>

              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Tên sản phẩm</label>
                <input type="text" readOnly value={product.name || ''} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '800', backgroundColor: '#fff', color: '#432818' }} />
              </div>

              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Kích thước tổng thể (mm)</label>
                <input type="text" readOnly value={`${product.length || 0} x ${product.width || 0} x ${product.height || 0}`} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '700', backgroundColor: '#fff' }} />
              </div>

              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Khối lượng</label>
                <input type="text" readOnly value={`${product.weight || 0} kg`} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '700', backgroundColor: '#fff' }} />
              </div>

              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Ghi chú</label>
                <input type="text" readOnly value={product.specification || 'APT012'} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '600', backgroundColor: '#fff' }} />
              </div>

              <div>
                <label style={{ color: '#64748b', fontWeight: '600', display: 'block', marginBottom: '1px' }}>Mẫu màu sắc</label>
                <input type="text" readOnly value={product.color || 'Tự nhiên'} style={{ width: '100%', padding: '3px 6px', border: '1px solid #cbd5e1', borderRadius: '5px', fontWeight: '700', backgroundColor: '#fff' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 Tabs Header (BOM sản | Quy trình thực hiện | Bản vẽ kỹ thuật | Danh mục vật tư) */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '2px solid #cbd5e1', marginBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('bom')}
          style={{
            padding: '6px 14px', border: 'none', background: activeTab === 'bom' ? '#432818' : '#fff',
            color: activeTab === 'bom' ? '#fff' : '#64748b', borderRadius: '6px 6px 0 0',
            fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer'
          }}
        >
          BOM sản
        </button>

        <button
          onClick={() => setActiveTab('process')}
          style={{
            padding: '6px 14px', border: 'none', background: activeTab === 'process' ? '#432818' : '#fff',
            color: activeTab === 'process' ? '#fff' : '#64748b', borderRadius: '6px 6px 0 0',
            fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer'
          }}
        >
          Quy trình thực hiện
        </button>

        <button
          onClick={() => setActiveTab('drawings')}
          style={{
            padding: '6px 14px', border: 'none', background: activeTab === 'drawings' ? '#432818' : '#fff',
            color: activeTab === 'drawings' ? '#fff' : '#64748b', borderRadius: '6px 6px 0 0',
            fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer'
          }}
        >
          Bản vẽ kỹ thuật
        </button>

        <button
          onClick={() => setActiveTab('materials')}
          style={{
            padding: '6px 14px', border: 'none', background: activeTab === 'materials' ? '#432818' : '#fff',
            color: activeTab === 'materials' ? '#fff' : '#64748b', borderRadius: '6px 6px 0 0',
            fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer'
          }}
        >
          Danh mục vật tư
        </button>
      </div>

      {/* Tab 1: BOM sản */}
      {activeTab === 'bom' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #cbd5e1', padding: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#432818' }}>Cấu trúc BOM sản phẩm</span>
              <button onClick={handleExpandAll} style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '3px 8px', borderRadius: '5px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Expand size={11} /> Mở rộng
              </button>
              <button onClick={handleCollapseAll} style={{ border: '1px solid #cbd5e1', background: '#fff', padding: '3px 8px', borderRadius: '5px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Shrink size={11} /> Thu gọn
              </button>
            </div>

            {/* Buttons KT03: + Thêm mới */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setShowAddDetailModal(true)} style={{ backgroundColor: '#432818', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Plus size={12} /> KTO3.1: Thêm chi tiết
              </button>
              <button onClick={() => { setSelectedParentId(null); setShowAddComponentModal(true); }} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Plus size={12} /> KTO3.2: Thêm thành phần
              </button>
              <button onClick={() => setShowAddPaintModal(true)} style={{ backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Palette size={12} /> KTO3.3: Thêm mẫu màu sơn
              </button>
            </div>
          </div>

          <div style={{
            overflowX: 'auto',
            overflowY: 'auto',
            maxHeight: isGeneralInfoCollapsed ? 'calc(100vh - 230px)' : 'calc(100vh - 365px)',
            height: isGeneralInfoCollapsed ? 'calc(100vh - 230px)' : 'calc(100vh - 365px)',
            borderRadius: '12px',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
          }}>
            <table style={{ width: '100%', minWidth: '1150px', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#432818' }}>
                <tr style={{ backgroundColor: '#432818', color: '#fff', textAlign: 'left' }}>
                  <th style={{ padding: '10px', width: '50px', textAlign: 'center', whiteSpace: 'nowrap' }}>STT</th>
                  <th style={{ padding: '10px', width: '60px', textAlign: 'center', whiteSpace: 'nowrap' }}>Cấp</th>
                  <th style={{ padding: '10px', width: '280px', whiteSpace: 'nowrap' }}>Tên linh kiện / Vật tư</th>
                  <th style={{ padding: '10px', width: '90px', whiteSpace: 'nowrap' }}>Loại</th>
                  <th style={{ padding: '10px', width: '130px', whiteSpace: 'nowrap' }}>CĐ giao</th>
                  <th style={{ padding: '10px', width: '130px', whiteSpace: 'nowrap' }}>CĐ nhận</th>
                  <th style={{ padding: '10px', width: '110px', whiteSpace: 'nowrap' }}>Mã TP</th>
                  <th style={{ padding: '10px', width: '60px', textAlign: 'right', whiteSpace: 'nowrap' }}>SL</th>
                  <th style={{ padding: '10px', width: '50px', whiteSpace: 'nowrap' }}>ĐV</th>
                  <th style={{ padding: '10px', width: '90px', whiteSpace: 'nowrap' }}>Vật liệu</th>
                  <th style={{ padding: '10px', width: '120px', whiteSpace: 'nowrap' }}>Quy cách</th>
                  <th style={{ padding: '10px', width: '70px', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length > 0 ? (
                  visibleRows.map((item, idx) => (
                    <tr key={item.path || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: item.level === 0 ? '#fafaf9' : '#fff' }}>
                      
                      {/* STT */}
                      <td style={{ padding: '10px', textAlign: 'center', color: '#64748b', fontWeight: '700' }}>
                        {idx + 1}
                      </td>

                      {/* Cấp (Rounded Pill Badge like Image 2) */}
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          backgroundColor: item.level === 0 ? '#f3ece7' : '#f1f5f9',
                          color: item.level === 0 ? '#432818' : '#475569',
                          fontWeight: '900',
                          fontSize: '0.75rem',
                          border: item.level === 0 ? '1px solid #e7d8cc' : '1px solid #e2e8f0'
                        }}>
                          {item.level + 1}
                        </span>
                      </td>

                      {/* Tên linh kiện / Vật tư (Exact Image 2 tree layout) */}
                      <td style={{ padding: '10px' }}>
                        <div style={{ paddingLeft: `${item.level * 22}px`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          
                          {/* Tree connector line for sub-levels */}
                          {item.level > 0 && (
                            <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: '700' }}>└─</span>
                          )}

                          {/* Toggle expand button */}
                          {item.hasChildren ? (
                            <button
                              onClick={() => toggleNode(item.path)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#432818', display: 'flex', alignItems: 'center' }}
                            >
                              {expandedPaths.has(item.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : (
                            item.level > 0 && <span style={{ width: '14px' }} />
                          )}

                          {/* Node Icon Box matching Image 2 */}
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: item.level === 0 ? '#f5ece5' : '#e0f2fe',
                            color: item.level === 0 ? '#432818' : '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {item.level === 0 ? <Layers size={14} /> : <Database size={14} />}
                          </div>

                          {/* Node Name Label */}
                          <span style={{
                            fontWeight: item.level === 0 ? '900' : '700',
                            fontSize: item.level === 0 ? '0.86rem' : '0.83rem',
                            color: '#1e293b',
                            textTransform: item.level === 0 ? 'uppercase' : 'none'
                          }}>
                            {item.name}
                          </span>
                        </div>
                      </td>

                      {/* Loại */}
                      <td style={{ padding: '10px', fontWeight: '700', color: '#475569', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {item.level === 0 ? 'Sơn hộc' : (item.hasChildren ? 'Khung' : 'Chi tiết')}
                      </td>

                      {/* CĐ giao */}
                      <td style={{ padding: '10px', color: '#475569', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {item.input_stage || 'Bóng gỗ'}
                      </td>

                      {/* CĐ nhận */}
                      <td style={{ padding: '10px', color: '#475569', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                        {item.output_stage || 'Lưu kho'}
                      </td>

                      {/* Mã TP */}
                      <td style={{ padding: '10px', fontWeight: '800', color: '#432818', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                        {item.sku}
                      </td>

                      {/* SL */}
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '900', color: '#16a34a', whiteSpace: 'nowrap' }}>
                        {item.quantity}
                      </td>

                      {/* ĐV */}
                      <td style={{ padding: '10px', color: '#64748b', fontSize: '0.82rem' }}>
                        {item.unit}
                      </td>

                      {/* Vật liệu */}
                      <td style={{ padding: '10px', color: '#475569', fontSize: '0.82rem' }}>
                        {item.material || 'Gỗ'}
                      </td>

                      {/* Quy cách */}
                      <td style={{ padding: '10px', fontSize: '0.8rem', color: '#475569' }}>
                        {item.specification || (item.length ? `${item.length}*${item.width}*${item.height}` : '---')}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: '10px', textAlign: 'center' }}>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Xóa chi tiết ${item.name}?`)) {
                              await api.delete(`/master-products/${id}/bom-details/${item.id}`);
                              fetchProductDetail();
                            }
                          }}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="12" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Chưa có cấu trúc BOM</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Quy trình thực hiện (Sơ đồ 6 bước) */}
      {activeTab === 'process' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#432818', marginTop: 0, marginBottom: '16px' }}>
            Sơ đồ quy trình sản xuất
          </h3>

          {/* Visual Process Flow diagram matching Mockup 2A Tab 2 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '24px', backgroundColor: '#fcfaf7', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            {processStages.map((stage, idx) => {
              const isActive = activeProcessStage === stage.id;
              return (
                <React.Fragment key={stage.id}>
                  <button
                    onClick={() => setActiveProcessStage(stage.id)}
                    style={{
                      flex: 1,
                      padding: '14px 8px',
                      borderRadius: '10px',
                      border: isActive ? '2px solid #84cc16' : '1.5px solid #cbd5e1',
                      backgroundColor: isActive ? '#bef264' : '#fff',
                      color: isActive ? '#365314' : '#334155',
                      fontWeight: '900',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 4px 6px rgba(132, 204, 22, 0.3)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {stage.name}
                  </button>

                  {idx < processStages.length - 1 && (
                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: '#94a3b8' }}>➔</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#432818', marginBottom: '10px' }}>
            Danh sách chi tiết thuộc công đoạn: <span style={{ color: '#65a30d' }}>{activeProcessStage}</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#432818', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px', width: '50px' }}>STT</th>
                <th style={{ padding: '10px' }}>Loại</th>
                <th style={{ padding: '10px' }}>Công đoạn giao</th>
                <th style={{ padding: '10px' }}>Công đoạn nhận</th>
                <th style={{ padding: '10px' }}>Mã thành phần</th>
                <th style={{ padding: '10px' }}>Tên thành phần</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Số lượng</th>
                <th style={{ padding: '10px' }}>Đơn vị</th>
                <th style={{ padding: '10px' }}>Vật liệu</th>
                <th style={{ padding: '10px' }}>Quy cách (mm)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const stageFiltered = flattenedData.filter(item => {
                  const inp = item.input_stage || '';
                  const out = item.output_stage || '';
                  return inp.includes(activeProcessStage) || out.includes(activeProcessStage);
                });

                // Fallback smart stage assignment if string doesn't match directly
                const displayItems = stageFiltered.length > 0 
                  ? stageFiltered 
                  : (activeProcessStage === 'Tạo phôi' ? flattenedData.filter(i => i.level > 0)
                    : activeProcessStage === 'Lắp ráp' ? flattenedData.filter(i => i.hasChildren || i.level === 0)
                    : activeProcessStage === 'Sơn' ? flattenedData.filter(i => i.level === 0)
                    : activeProcessStage === 'Đóng gói' ? flattenedData.filter(i => i.level === 0)
                    : activeProcessStage === 'Lưu kho' ? flattenedData.filter(i => i.level === 0)
                    : flattenedData);

                return displayItems.length > 0 ? (
                  displayItems.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '10px', fontWeight: '700', color: '#475569' }}>
                        {item.level === 0 ? 'Cụm chính' : (item.hasChildren ? 'Khung' : 'Chi tiết')}
                      </td>
                      <td style={{ padding: '10px', color: '#475569' }}>{item.input_stage || 'NM3 - Tạo phôi 3'}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{item.output_stage || 'NM3 - Lắp ráp 3'}</td>
                      <td style={{ padding: '10px', fontWeight: '800', color: '#432818' }}>{item.sku}</td>
                      <td style={{ padding: '10px', fontWeight: '800', color: '#1e293b' }}>{item.name}</td>
                      <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>{item.quantity}</td>
                      <td style={{ padding: '10px', color: '#64748b' }}>{item.unit}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{item.material || 'Gỗ'}</td>
                      <td style={{ padding: '10px', color: '#475569' }}>{item.specification || (item.length ? `${item.length}*${item.width}*${item.height}` : '---')}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="10" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>Chưa có chi tiết thuộc công đoạn {activeProcessStage}</td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Bản vẽ kỹ thuật */}
      {activeTab === 'drawings' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#432818', margin: 0 }}>
              Lịch sử Revision Bản vẽ kỹ thuật
            </h3>
            <button
              onClick={async () => {
                const lot = prompt('Nhập mã lô áp dụng:', 'Lô 1');
                if (lot) {
                  await api.post(`/master-products/${id}/drawings`, {
                    lot_code: lot,
                    updated_by: 'Nguyễn Văn A',
                    status: 'Bản áp dụng',
                    change_reason: 'Thay đổi kỹ thuật',
                    approved_by: 'Trưởng phòng KT'
                  });
                  fetchProductDetail();
                }
              }}
              style={{ backgroundColor: '#432818', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Plus size={14} /> Thêm revision bản vẽ
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#432818', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px', width: '50px' }}>STT</th>
                <th style={{ padding: '10px' }}>Lô</th>
                <th style={{ padding: '10px' }}>Ngày cập nhật</th>
                <th style={{ padding: '10px' }}>Người cập nhật</th>
                <th style={{ padding: '10px' }}>Trạng thái</th>
                <th style={{ padding: '10px' }}>Lý do cập nhật</th>
                <th style={{ padding: '10px' }}>Người duyệt</th>
                <th style={{ padding: '10px' }}>Ngày duyệt</th>
                <th style={{ padding: '10px' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {(product.technical_drawings && product.technical_drawings.length > 0 ? product.technical_drawings : [
                { id: 1, lot_code: 'Bản vẽ', updated_at: '22/11/2026', updated_by: 'Nguyễn Văn A', status: 'Bản áp dụng', change_reason: 'Thay đổi', approved_by: 'Nguyễn Văn B', approved_at: '25/11/2026', note: 'Thêm hộc kéo a' },
                { id: 2, lot_code: 'Tài liệu thay đổi', updated_at: '22/4/2026', updated_by: 'Nguyễn Văn A', status: 'Tạm dừng', change_reason: 'Bổ sung', approved_by: 'Nguyễn Văn B', approved_at: '25/4/2026', note: 'Thay đổi' },
                { id: 3, lot_code: 'Bản cũ', updated_at: '22/4/2024', updated_by: 'Nguyễn Văn A', status: 'Thu hồi', change_reason: 'Thẩm định', approved_by: 'Nguyễn Văn B', approved_at: '25/4/2024', note: '' }
              ]).map((dwg, idx) => (
                <tr key={dwg.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: '700', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '10px', fontWeight: '800', color: '#432818' }}>{dwg.lot_code}</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{dwg.updated_at}</td>
                  <td style={{ padding: '10px', fontWeight: '700' }}>{dwg.updated_by}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{
                      backgroundColor: dwg.status === 'Bản áp dụng' ? '#dcfce7' : (dwg.status === 'Tạm dừng' ? '#fef3c7' : '#fee2e2'),
                      color: dwg.status === 'Bản áp dụng' ? '#15803d' : (dwg.status === 'Tạm dừng' ? '#b45309' : '#dc2626'),
                      padding: '3px 8px', borderRadius: '10px', fontSize: '0.76rem', fontWeight: '800'
                    }}>
                      {dwg.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: '#475569' }}>{dwg.change_reason}</td>
                  <td style={{ padding: '10px', fontWeight: '700' }}>{dwg.approved_by}</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{dwg.approved_at}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{dwg.note || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Danh mục vật tư */}
      {activeTab === 'materials' && (
        <div style={{ backgroundColor: '#fff', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '900', color: '#432818', marginTop: 0, marginBottom: '16px' }}>
            Danh mục vật tư & Nguyên liệu tiêu hao
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#432818', color: '#fff', textAlign: 'left' }}>
                <th style={{ padding: '10px', width: '50px' }}>STT</th>
                <th style={{ padding: '10px' }}>Mã vật tư</th>
                <th style={{ padding: '10px' }}>Tên vật tư / nguyên liệu</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Định mức tiêu hao</th>
                <th style={{ padding: '10px' }}>Đơn vị</th>
                <th style={{ padding: '10px' }}>Nhà cung cấp</th>
                <th style={{ padding: '10px' }}>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {[
                { id: 1, code: 'VT-KEO-01', name: 'Keo sữa D3 tiêu chuẩn gỗ', quota: 0.5, unit: 'kg', supplier: 'NPP Keo An Thái', note: 'Keo dán khung' },
                { id: 2, code: 'VT-SON-02', name: 'Sơn phủ bóng PU trong suốt', quota: 1.2, unit: 'lít', supplier: 'Sơn Nippon', note: 'Sơn mặt tiền' },
                { id: 3, code: 'VT-VIT-08', name: 'Vít tự khoan 4x30mm', quota: 24, unit: 'cái', supplier: 'Kim khí Minh Phát', note: 'Bắt hộc kéo' }
              ].map((mat, idx) => (
                <tr key={mat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: '700', color: '#64748b' }}>{idx + 1}</td>
                  <td style={{ padding: '10px', fontWeight: '800', color: '#432818' }}>{mat.code}</td>
                  <td style={{ padding: '10px', fontWeight: '800', color: '#1e293b' }}>{mat.name}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: '800', color: '#16a34a' }}>{mat.quota}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{mat.unit}</td>
                  <td style={{ padding: '10px', color: '#475569' }}>{mat.supplier}</td>
                  <td style={{ padding: '10px', color: '#64748b' }}>{mat.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Render Modals */}
      {showAddDetailModal && (
        <AddDetailModal
          productId={id}
          onClose={() => setShowAddDetailModal(false)}
          onSuccess={fetchProductDetail}
        />
      )}

      {showAddComponentModal && (
        <AddComponentModal
          productId={id}
          parentId={selectedParentId}
          onClose={() => setShowAddComponentModal(false)}
          onSuccess={fetchProductDetail}
        />
      )}

      {showAddPaintModal && (
        <AddPaintColorModal
          productId={id}
          onClose={() => setShowAddPaintModal(false)}
          onSuccess={fetchProductDetail}
        />
      )}

    </div>
  );
};

export default ProductDetail;
