import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Search, ArrowUpDown, Filter, Plus, Pencil, Download, Upload, Eye, Save, Send,
  FileText, ArrowLeft, RefreshCw, X, CheckCircle2, Clock, AlertTriangle, ClipboardList, Layers
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import api from '@webShared/Services/api.service';

const ProductionOrdersView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;

  // View Mode: 'list' (Mockup 1 - Mặc định) | 'create' (Mockup 2 - Khi bấm + Thêm dữ liệu)
  const [viewMode, setViewMode] = useState('list');
  const [activeStatusTab, setActiveStatusTab] = useState('all'); // 'all' | 'in_progress' | 'pending' | 'completed' | 'high_priority'

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/production-orders');

  // Đặt Tiêu đề & Subtitle theo Chế độ Xem chuẩn hệ thống
  useEffect(() => {
    if (viewMode === 'create') {
      if (setCustomTitle) setCustomTitle('Lệnh sản xuất');
      if (setCustomSubtitle) setCustomSubtitle('SX02.1: Tạo lệnh sản xuất');
      if (setCustomScreenCode) setCustomScreenCode('SX02.1');
    } else {
      if (setCustomTitle) setCustomTitle('Lệnh sản xuất');
      if (setCustomSubtitle) setCustomSubtitle('SX02: Danh sách lệnh sản xuất');
      if (setCustomScreenCode) setCustomScreenCode('SX02');
    }
  }, [viewMode, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // State danh sách Lệnh sản xuất (Mockup 1)
  const [ordersList, setOrdersList] = useState([
    { id: 1, planId: 1, code: 'LSX-2026-001', orderNo: 'DH-2026-088', totalProducts: 50, planQty: 50, startDate: '01/08/2026', endDate: '15/08/2026', priority: 'Cao', status: 'Đang sản xuất', note: 'Đơn hàng gấp xuất khẩu' },
    { id: 2, planId: 2, code: 'LSX-2026-002', orderNo: 'DH-EX-992', totalProducts: 120, planQty: 120, startDate: '02/08/2026', endDate: '18/08/2026', priority: 'Cao', status: 'Đang sản xuất', note: 'Kèm đệm bọc da' },
    { id: 3, planId: 3, code: 'LSX-2026-003', orderNo: 'DH-PM-104', totalProducts: 30, planQty: 30, startDate: '03/08/2026', endDate: '20/08/2026', priority: 'Bình thường', status: 'Chờ phân bổ', note: 'Sơn phủ PU mờ' },
    { id: 4, planId: 4, code: 'LSX-2026-004', orderNo: 'DH-TK-005', totalProducts: 80, planQty: 80, startDate: '03/08/2026', endDate: '12/08/2026', priority: 'Bình thường', status: 'Hoàn thành', note: 'Đã nhập kho đủ' },
    { id: 5, planId: 5, code: 'LSX-2026-005', orderNo: 'DH-2026-089', totalProducts: 200, planQty: 200, startDate: '04/08/2026', endDate: '25/08/2026', priority: 'Thấp', status: 'Đang sản xuất', note: 'Lô hàng dự phòng' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form Thông tin chung (Mockup 2)
  const [orderForm, setOrderForm] = useState({
    code: 'LSX-2026-006',
    orderId: 'DH-2026-088',
    priority: 'Bình thường',
    startDate: '2026-08-01',
    endDate: '2026-08-20',
    status: 'Đang sản xuất'
  });

  // Sub-tabs (Mockup 2)
  const [activeSubTab, setActiveSubTab] = useState('order_info');

  // Bảng 1: Thông tin đơn hàng (Mockup 2 - 12 Cột)
  const [orderProducts, setOrderProducts] = useState([
    {
      id: 1,
      productCode: 'SP1234',
      productName: 'APT1-42-WHT',
      category: 'Vanity',
      orderQty: 46,
      spareQty: 2,
      totalQty: 48,
      unit: 'Cái',
      startDate: '01/08/2026',
      endDate: '15/08/2026',
      deliveryDate: '22/11/2025',
      drawingCode: 'APT01'
    }
  ]);

  // Bảng 2: Chi tiết sản phẩm (Mockup 2 - 13 Cột)
  const [productDetails, setProductDetails] = useState([
    {
      id: 1,
      type: 'Chân',
      stageFrom: 'Định hình',
      stageTo: 'Lắp ráp',
      compCode: 'ADV691.1.1.1',
      compName: 'Cụm hông dưới',
      quantity: '0/24',
      unit: 'Cái',
      material: 'MDF',
      spec: '12*12*15',
      volume: 5,
      note: '',
      status: 'Chờ sản xuất'
    },
    {
      id: 2,
      type: 'Ván panel',
      stageFrom: 'Định hình',
      stageTo: 'Lắp ráp',
      compCode: 'ADV691.1.1.3',
      compName: 'Cụm hông dưới',
      quantity: '56/56',
      unit: 'Tấm',
      material: 'Cao su',
      spec: '12*12*15',
      volume: 5,
      note: '',
      status: 'Hoàn thành'
    }
  ]);

  // Gọi API lấy dữ liệu động nếu có
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/production/v2/orders');
      if (res && Array.isArray(res.orders) && res.orders.length > 0) {
        const mapped = res.orders.map((o, idx) => ({
          id: o.id || idx + 1,
          planId: o.plan_id || o.id || (idx + 1),
          code: o.po_code || o.order_code || `LSX-2026-${idx + 1}`,
          orderNo: o.order_code || `DH-2026-08${idx + 1}`,
          totalProducts: o.products ? o.products.length : 1,
          planQty: o.total_order_qty || 50,
          startDate: o.created_at ? o.created_at.split('T')[0] : '01/08/2026',
          endDate: o.delivery_date ? o.delivery_date.split('T')[0] : '15/08/2026',
          priority: o.priority || 'Cao',
          status: o.status || 'Đang sản xuất',
          note: o.note || 'Lệnh sản xuất từ hệ thống'
        }));
        setOrdersList(mapped);
      }
    } catch (err) {
      console.warn('Lỗi khi tải API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Xử lý khi nhấp vào dòng lệnh SX để mở Chi tiết (Mockup 2)
  const handleOpenOrderDetail = (item) => {
    setOrderForm({
      code: item.code,
      orderId: item.orderNo,
      priority: item.priority,
      startDate: '2026-08-01',
      endDate: '2026-08-20',
      status: item.status
    });
    setViewMode('create');
  };

  // Xử lý khi nhấp + Thêm dữ liệu để mở Form Tạo Lệnh SX Mới (Mockup 2)
  const handleOpenCreateOrder = () => {
    const nextCode = `LSX-2026-00${ordersList.length + 1}`;
    setOrderForm({
      code: nextCode,
      orderId: 'DH-2026-088',
      priority: 'Bình thường',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-08-30',
      status: 'Đang sản xuất'
    });
    setViewMode('create');
  };

  // Xử lý lưu thông tin Lệnh SX mới (Mockup 2) và trở về Mockup 1
  const handleSaveOrder = () => {
    const newOrderObj = {
      id: ordersList.length + 1,
      planId: ordersList.length + 1,
      code: orderForm.code || `LSX-2026-00${ordersList.length + 1}`,
      orderNo: orderForm.orderId,
      totalProducts: 1,
      planQty: 48,
      startDate: orderForm.startDate,
      endDate: orderForm.endDate,
      priority: orderForm.priority,
      status: orderForm.status,
      note: 'Lệnh SX mới tạo'
    };
    setOrdersList([newOrderObj, ...ordersList]);
    alert('Đã lưu thành công Lệnh sản xuất!');
    setViewMode('list'); // Trở về Mockup 1 ngay tại chỗ
  };

  // Tính toán Thống kê KPI động
  const totalOrdersCount = ordersList.length;
  const inProgressCount = ordersList.filter(o => o.status === 'Đang sản xuất').length;
  const urgentCount = ordersList.filter(o => o.priority === 'Cao').length;
  const completedCount = ordersList.filter(o => o.status === 'Hoàn thành').length;

  // Lọc dữ liệu theo Search và Status Tab
  const filteredOrders = ordersList.filter(o => {
    const matchesSearch = o.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          o.orderNo.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeStatusTab === 'in_progress') return matchesSearch && o.status === 'Đang sản xuất';
    if (activeStatusTab === 'pending') return matchesSearch && o.status === 'Chờ phân bổ';
    if (activeStatusTab === 'completed') return matchesSearch && o.status === 'Hoàn thành';
    if (activeStatusTab === 'high_priority') return matchesSearch && o.priority === 'Cao';
    return matchesSearch;
  });

  return (
    <div style={{ padding: '20px 24px', backgroundColor: '#FAF6F0', minHeight: 'calc(100vh - 110px)', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ---------------------------------------------------- */}
      {/* MÀN HÌNH 1: MẶC ĐỊNH (MATCH 100% MOCKUP 1 + RICH AESTHETICS) */}
      {/* ---------------------------------------------------- */}
      {viewMode === 'list' && (
        <div>
          {/* Top KPI Summary Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {[
              { label: 'Tổng số Lệnh SX', val: `${totalOrdersCount} Lệnh`, sub: 'Tổng toàn hệ thống', color: '#5D3B32', icon: ClipboardList, bg: '#F5EBE0' },
              { label: 'Đang sản xuất', val: `${inProgressCount} Lệnh`, sub: 'Đang chạy tại các xưởng', color: '#2563EB', icon: Clock, bg: '#EFF6FF' },
              { label: 'Cần xử lý gấp', val: `${urgentCount} Lệnh`, sub: 'Ưu tiên mức Cao', color: '#DC2626', icon: AlertTriangle, bg: '#FEF2F2' },
              { label: 'Đã hoàn thành', val: `${completedCount} Lệnh`, sub: 'Đã nhập kho sản phẩm', color: '#059669', icon: CheckCircle2, bg: '#ECFDF5' },
            ].map((stat, idx) => {
              const IconComp = stat.icon;
              return (
                <div key={idx} style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  border: '1.5px solid #EADCC9',
                  boxShadow: '0 2px 8px rgba(45, 26, 18, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: '600' }}>{stat.label}</div>
                    <div style={{ fontSize: '1.35rem', fontWeight: '900', color: '#2D1A12', margin: '4px 0 2px 0' }}>{stat.val}</div>
                    <div style={{ fontSize: '0.75rem', color: stat.color, fontWeight: '600' }}>{stat.sub}</div>
                  </div>
                  <div style={{ background: stat.bg, width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                    <IconComp size={22} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Status Filter Tabs Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tất cả lệnh', count: totalOrdersCount },
              { id: 'in_progress', label: 'Đang sản xuất', count: inProgressCount },
              { id: 'pending', label: 'Chờ phân bổ', count: ordersList.filter(o => o.status === 'Chờ phân bổ').length },
              { id: 'completed', label: 'Hoàn thành', count: completedCount },
              { id: 'high_priority', label: 'Ưu tiên cao', count: urgentCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveStatusTab(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  backgroundColor: activeStatusTab === tab.id ? '#5D3B32' : '#FFFFFF',
                  color: activeStatusTab === tab.id ? '#FFFFFF' : '#5D3B32',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: activeStatusTab === tab.id ? 'none' : '1px solid #EADCC9',
                  transition: 'all 0.2s'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: activeStatusTab === tab.id ? 'rgba(255,255,255,0.25)' : '#FAF6F0',
                  color: activeStatusTab === tab.id ? '#FFF' : '#5D3B32'
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Header Toolbar Bar (Match 100% Ảnh 1) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {/* Left: Search, A-Z Sort, Filter Funnel */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                position: 'relative',
                width: '300px',
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1.5px solid #EADCC9'
              }}>
                <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <button title="Sắp xếp" style={{ padding: '8px 12px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', cursor: 'pointer' }}>
                <ArrowUpDown size={18} />
              </button>
              <button title="Lọc dữ liệu" style={{ padding: '8px 12px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', cursor: 'pointer' }}>
                <Filter size={18} />
              </button>
            </div>

            {/* Right: Action Buttons (Khác, Nhập dữ liệu, Xuất dữ liệu, + Thêm dữ liệu) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button style={{ padding: '8px 16px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}>
                Khác
              </button>
              <button style={{ padding: '8px 16px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={16} /> Nhập dữ liệu
              </button>
              <button style={{ padding: '8px 16px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Download size={16} /> Xuất dữ liệu
              </button>
              
              {/* Nút chính + Thêm dữ liệu -> MỞ MOCKUP 2 NGAY TẠI CHỖ */}
              <button
                onClick={handleOpenCreateOrder}
                style={{
                  padding: '8px 20px',
                  background: '#5D3B32',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(93, 59, 50, 0.25)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#432818'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#5D3B32'}
              >
                <Plus size={18} /> + Thêm dữ liệu
              </button>
            </div>
          </div>

          {/* Bảng dữ liệu 10 Cột (Match 100% Mockup 1) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1.5px solid #EADCC9',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                    <th style={{ padding: '12px 14px', fontWeight: '800', width: '50px' }}>STT</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Mã lệnh</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Đơn hàng</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', textAlign: 'right' }}>Tổng số sản phẩm</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800', textAlign: 'right' }}>Số lượng kế hoạch</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Thời gian bắt đầu</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Thời gian kết thúc</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Mức độ ưu tiên</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Trạng thái</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800', textAlign: 'center' }}>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
                        Chưa có dữ liệu lệnh sản xuất phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.slice(0, pageSize).map((item, index) => (
                      <tr
                        key={item.id}
                        style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FFFFFF', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                      >
                        <td style={{ padding: '12px 14px', color: '#6B7280', fontWeight: '600' }}>{index + 1}</td>
                        <td
                          onClick={() => handleOpenOrderDetail(item)}
                          style={{ padding: '12px 16px', fontWeight: '800', color: '#5D3B32', cursor: 'pointer' }}
                          title="Nhấp để xem chi tiết Lệnh SX (Mockup 2)"
                        >
                          {item.code}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#1F2937', fontWeight: '600' }}>{item.orderNo}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#4B5563' }}>{item.totalProducts}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>{item.planQty}</td>
                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>{item.startDate}</td>
                        <td style={{ padding: '12px 16px', color: '#6B7280' }}>{item.endDate}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            backgroundColor: item.priority === 'Cao' ? '#FEE2E2' : '#FEF3C7',
                            color: item.priority === 'Cao' ? '#DC2626' : '#D97706'
                          }}>
                            {item.priority}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            backgroundColor: item.status === 'Hoàn thành' ? '#D1FAE5' : '#DBEAFE',
                            color: item.status === 'Hoàn thành' ? '#059669' : '#2563EB'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button onClick={() => handleOpenOrderDetail(item)} style={{ border: 'none', background: 'transparent', color: '#5D3B32', cursor: 'pointer' }}>
                            <Pencil size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Pagination Bar (Match 100% Mockup 1) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '1.5px solid #EADCC9',
              backgroundColor: '#FFFFFF',
              fontSize: '0.88rem',
              color: '#4B5563',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>Show 1 to</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{ padding: '4px 8px', border: '1.5px solid #EADCC9', borderRadius: '6px', outline: 'none', background: '#FFF', fontWeight: '700', color: '#5D3B32' }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>of {filteredOrders.length} results</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: '6px', cursor: 'pointer', color: '#6B7280', fontWeight: '600' }}>Previous</button>
                <button style={{ padding: '6px 12px', border: 'none', background: '#5D3B32', color: '#FFF', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>1</button>
                <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '600' }}>2</button>
                <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '600' }}>3</button>
                <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '600' }}>4</button>
                <span style={{ padding: '0 4px', color: '#9CA3AF' }}>...</span>
                <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '600' }}>10</button>
                <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '600' }}>11</button>
                <button style={{ padding: '6px 12px', border: '1px solid #E5E7EB', background: '#FFF', borderRadius: '6px', cursor: 'pointer', color: '#374151', fontWeight: '600' }}>Next</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MÀN HÌNH 2: TẠO/CHI TIẾT LỆNH SX (MATCH 100% MOCKUP 2) */}
      {/* ---------------------------------------------------- */}
      {viewMode === 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Nút Quay lại màn hình danh sách (Mockup 1) */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '8px 16px',
                backgroundColor: '#FFFFFF',
                border: '1.5px solid #5D3B32',
                borderRadius: '8px',
                color: '#5D3B32',
                fontWeight: '800',
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
              }}
            >
              <ArrowLeft size={16} /> Quay lại danh sách Lệnh SX
            </button>
          </div>

          {/* Card 1: Khung Thông tin chung (Match 100% Ảnh 2) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #EADCC9',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
          }}>
            {/* Header & 4 Nút Tác Vụ góc phải */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '900', color: '#2D1A12' }}>
                Thông tin chung
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button style={{
                  padding: '9px 16px',
                  backgroundColor: '#A07855',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Upload size={16} /> Nhập danh sách
                </button>

                <button style={{
                  padding: '9px 16px',
                  backgroundColor: '#A07855',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Download size={16} /> Xuất lệnh
                </button>

                <button style={{
                  padding: '9px 16px',
                  backgroundColor: '#65A30D',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Send size={16} /> Chuyển thông tin
                </button>

                <button
                  onClick={handleSaveOrder}
                  style={{
                    padding: '9px 20px',
                    backgroundColor: '#432818',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 10px rgba(67, 40, 24, 0.25)'
                  }}
                >
                  <Save size={16} /> Lưu thông tin
                </button>
              </div>
            </div>

            {/* Grid 6 ô Nhập liệu Thông tin chung (Match 100% Ảnh 2) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Mã lệnh</label>
                <input
                  type="text"
                  disabled
                  value={orderForm.code}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E5E7EB', backgroundColor: '#F3F4F6', color: '#6B7280', fontWeight: '700', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Mã đơn hàng</label>
                <select
                  value={orderForm.orderId}
                  onChange={(e) => setOrderForm({ ...orderForm, orderId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFFFFF', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="DH-2026-088">DH-2026-088 (Khách sạn Pullman)</option>
                  <option value="DH-EX-992">DH-EX-992 (Xuất khẩu Mỹ)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Mức độ ưu tiên</label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFFFFF', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
                >
                  <option value="Cao">Cao</option>
                  <option value="Bình thường">Bình thường</option>
                  <option value="Thấp">Thấp</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Thời gian bắt đầu</label>
                <input
                  type="date"
                  value={orderForm.startDate}
                  onChange={(e) => setOrderForm({ ...orderForm, startDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Thời gian hoàn thành dự kiến</label>
                <input
                  type="date"
                  value={orderForm.endDate}
                  onChange={(e) => setOrderForm({ ...orderForm, endDate: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #EADCC9', backgroundColor: '#FFFFFF', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#374151', marginBottom: '6px' }}>Trạng thái</label>
                <input
                  type="text"
                  disabled
                  value={orderForm.status}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #E5E7EB', backgroundColor: '#F3F4F6', color: '#2563EB', fontWeight: '800', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Sub-tabs & Bảng 1 - Thông tin đơn hàng (Match 100% Ảnh 2) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #EADCC9',
            padding: '20px 24px',
            boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '18px', borderBottom: '2px solid #F3F4F6' }}>
              {[
                { id: 'order_info', label: 'Thông tin đơn hàng' },
                { id: 'materials', label: 'Định mức vật tư' },
                { id: 'routing', label: 'Quy trình - kế hoạch' },
                { id: 'transfer', label: 'Phiếu luân chuyển' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '0.92rem',
                    fontWeight: activeSubTab === tab.id ? '800' : '600',
                    color: activeSubTab === tab.id ? '#5D3B32' : '#6B7280',
                    borderBottom: activeSubTab === tab.id ? '3px solid #5D3B32' : '3px solid transparent',
                    paddingBottom: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Bảng 1: Thông tin đơn hàng (12 Cột) */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                    <th style={{ padding: '12px 10px', fontWeight: '800', width: '45px' }}>STT</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Mã sản phẩm</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Tên sản phẩm</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Dòng hàng</th>
                    <th style={{ padding: '12px 10px', fontWeight: '800', textAlign: 'right' }}>Số lượng đặt</th>
                    <th style={{ padding: '12px 10px', fontWeight: '800', textAlign: 'right' }}>Dự phòng</th>
                    <th style={{ padding: '12px 10px', fontWeight: '800', textAlign: 'right' }}>Tổng số lượng sản xuất</th>
                    <th style={{ padding: '12px 10px', fontWeight: '800' }}>Đơn vị</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Ngày bắt đầu (dự kiến)</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Ngày kết thúc (dự kiến)</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Ngày giao hàng dự kiến</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800', textAlign: 'center' }}>Mã bản vẽ</th>
                  </tr>
                </thead>
                <tbody>
                  {orderProducts.map((p, idx) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FFFFFF' }}>
                      <td style={{ padding: '12px 10px', color: '#6B7280', fontWeight: '600' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 12px', fontFamily: 'monospace', fontWeight: '700', color: '#5D3B32' }}>{p.productCode}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#1F2937' }}>{p.productName}</td>
                      <td style={{ padding: '12px 12px', color: '#4B5563' }}>{p.category}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>{p.orderQty}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#D97706' }}>{p.spareQty}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#2563EB' }}>{p.totalQty}</td>
                      <td style={{ padding: '12px 10px', color: '#4B5563' }}>{p.unit}</td>
                      <td style={{ padding: '12px 12px', color: '#6B7280' }}>{p.startDate}</td>
                      <td style={{ padding: '12px 12px', color: '#6B7280' }}>{p.endDate}</td>
                      <td style={{ padding: '12px 12px', color: '#6B7280' }}>{p.deliveryDate}</td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#5D3B32', fontWeight: '700', cursor: 'pointer' }}>
                          <Eye size={14} /> {p.drawingCode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Chi tiết sản phẩm (Bảng 2 - 13 Cột - Match 100% Ảnh 2) */}
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1.5px solid #EADCC9',
            padding: '24px',
            boxShadow: '0 4px 16px rgba(45, 26, 18, 0.04)'
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', fontWeight: '900', color: '#2D1A12' }}>
              Chi tiết sản phẩm
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#5D3B32', color: '#FFFFFF' }}>
                    <th style={{ padding: '12px 10px', fontWeight: '800', width: '40px' }}>STT</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Loại</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Công đoạn giao</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Công đoạn nhận</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Mã thành phần</th>
                    <th style={{ padding: '12px 14px', fontWeight: '800' }}>Tên thành phần</th>
                    <th style={{ padding: '12px 10px', fontWeight: '800', textAlign: 'right' }}>Số lượng</th>
                    <th style={{ padding: '12px 10px', fontWeight: '800' }}>Đơn vị</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Vật liệu</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Quy cách (mm)</th>
                    <th style={{ padding: '12px 10px', fontWeight: '800', textAlign: 'right' }}>Khối lượng (m3)</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Ghi chú</th>
                    <th style={{ padding: '12px 12px', fontWeight: '800' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {productDetails.map((det, idx) => (
                    <tr key={det.id} style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FFFFFF' }}>
                      <td style={{ padding: '12px 10px', color: '#6B7280', fontWeight: '600' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 12px', fontWeight: '700', color: '#1F2937' }}>{det.type}</td>
                      <td style={{ padding: '12px 12px', color: '#4B5563' }}>{det.stageFrom}</td>
                      <td style={{ padding: '12px 12px', color: '#4B5563' }}>{det.stageTo}</td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: '800', color: '#5D3B32' }}>{det.compCode}</td>
                      <td style={{ padding: '12px 14px', fontWeight: '700', color: '#2D1A12' }}>{det.compName}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>{det.quantity}</td>
                      <td style={{ padding: '12px 10px', color: '#4B5563' }}>{det.unit}</td>
                      <td style={{ padding: '12px 12px', color: '#4B5563' }}>{det.material}</td>
                      <td style={{ padding: '12px 12px', color: '#4B5563' }}>{det.spec}</td>
                      <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: '700', color: '#4B5563' }}>{det.volume}</td>
                      <td style={{ padding: '12px 12px', color: '#9CA3AF' }}>{det.note || '-'}</td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          backgroundColor: det.status === 'Hoàn thành' ? '#D1FAE5' : '#FEF3C7',
                          color: det.status === 'Hoàn thành' ? '#059669' : '#D97706'
                        }}>
                          {det.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default ProductionOrdersView;
