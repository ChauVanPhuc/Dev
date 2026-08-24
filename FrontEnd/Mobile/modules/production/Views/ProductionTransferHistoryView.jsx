import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Info } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import useAuthStore from '@modules/auth/Models/authModel';
import apiClient from '@shared/services/api';

const ProductionTransferHistoryView = () => {
  const { user } = useAuthStore();
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Message Modal State
  const [msgModal, setMsgModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showMessage = (type, title, message) => {
    setMsgModal({ isOpen: true, type, title, message });
  };

  // Filters matching Mockup: Kế hoạch & Chi tiết
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedPart, setSelectedPart] = useState('Tất cả chi tiết');
  const [availableParts, setAvailableParts] = useState([]);

  const monthOptions = availableMonths.map((m) => ({
    value: m.month,
    label: `Tháng ${m.month}`
  }));

  const partOptions = [
    { value: 'Tất cả chi tiết', label: 'Tất cả chi tiết' },
    ...availableParts.map((p) => ({ value: p, label: p }))
  ];
  
  const [activeTab, setActiveTab] = useState('transfer'); // "transfer" | "inspection"
  const [selectedDetailItem, setSelectedDetailItem] = useState(null); // Detail Popup Modal State
  const [confirming, setConfirming] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  const handleConfirmInModal = async (item) => {
    if (!item || item.id === undefined || item.id === null) {
      showMessage('error', 'Lỗi dữ liệu', 'Không tìm thấy ID phiếu luân chuyển!');
      return;
    }
    setConfirming(true);
    try {
      const ticketId = item.id;
      await apiClient.patch(`/deliveries/${ticketId}/confirm`, {
        user_id: user?.id || 1,
        sx_receipt: user?.id || 1,
        quantity_received: Number(item.quantity || 0),
        status: 'Hoàn Thành'
      });
      setSelectedDetailItem(null);
      showMessage('success', 'Xác nhận thành công', `Đã xác nhận nhận hàng thành công cho phiếu ${item.code || `LC${ticketId}`}`);
      
      // Refresh transfer list
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        tab: activeTab
      });
      if (selectedMonth) params.append('month', selectedMonth.toString());
      if (selectedPart && selectedPart !== 'Tất cả chi tiết') params.append('part_name', selectedPart);

      const resp = await apiClient.get(`/production-v2/transfers?${params.toString()}`);
      setTransfers(resp.data?.items || []);
      setTotal(resp.data?.total || 0);
    } catch (e) {
      console.error('Lỗi xác nhận nhận hàng:', e);
      const errDetail = e.response?.data?.detail
        ? (typeof e.response.data.detail === 'string' ? e.response.data.detail : JSON.stringify(e.response.data.detail))
        : (e.message || 'Không rõ nguyên nhân');
      showMessage('error', 'Lỗi xác nhận', errDetail);
    } finally {
      setConfirming(false);
    }
  };

  const userRoleStr = (user?.role_name || user?.role_description || '').toLowerCase();
  const userDeptStr = (user?.department_name || user?.permission_name || '').toLowerCase();
  const combinedAuth = `${userRoleStr} | ${userDeptStr}`;
  const isAdminUser = combinedAuth.includes('admin') || combinedAuth.includes('it') || combinedAuth.includes('bgd');
  const hasStageSelect = isAdminUser || (user?.stageNames && user.stageNames.length > 1);
  const headerHeight = hasStageSelect ? 92 : 56;

  // Fetch available months on mount
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const resp = await apiClient.get('/production-v2/available-months');
        const months = resp.data?.months || [];
        setAvailableMonths(months);
        const currentMonth = resp.data?.default_month || new Date().getMonth() + 1;
        const hasCurrentMonth = months.some(m => m.month === currentMonth);
        if (hasCurrentMonth) {
          setSelectedMonth(currentMonth);
        } else if (months.length > 0) {
          setSelectedMonth(months[0].month);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách tháng:', err);
        setSelectedMonth(new Date().getMonth() + 1);
      }
    };
    fetchMonths();
  }, []);

  // Fetch parts options whenever selectedMonth changes
  useEffect(() => {
    const fetchParts = async () => {
      try {
        const resp = await apiClient.get(`/production-v2/parts?month=${selectedMonth || ''}`);
        const partsList = (resp.data || []).map(p => p.part_name).filter(Boolean);
        setAvailableParts(partsList);
      } catch (err) {
        console.error('Lỗi khi tải danh sách chi tiết:', err);
        setAvailableParts([]);
      }
    };
    fetchParts();
  }, [selectedMonth]);

  // Fetch transfers list from backend
  useEffect(() => {
    const fetchTransfers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString(),
          tab: activeTab
        });
        if (selectedMonth) params.append('month', selectedMonth.toString());
        if (selectedPart && selectedPart !== 'Tất cả chi tiết') params.append('part_name', selectedPart);

        const resp = await apiClient.get(`/production-v2/transfers?${params.toString()}`);
        setTransfers(resp.data?.items || []);
        setTotal(resp.data?.total || 0);

        if (resp.data?.available_parts && resp.data.available_parts.length > 0) {
          setAvailableParts(resp.data.available_parts);
        }
      } catch (err) {
        console.error('Lỗi khi tải Lịch sử luân chuyển:', err);
        setTransfers([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchTransfers();
  }, [selectedMonth, selectedPart, activeTab, page]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <Layout>
      <PageHeader title="Thông tin sản xuất" subTitle="CL05: Lịch sử luân chuyển" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, backgroundColor: '#faf6f1', position: 'relative' }}>
        
        {/* Sticky Filter Container matching Mockup Image 1 (below PageHeader) */}
        <div style={{ position: 'sticky', top: 0, zIndex: 8, backgroundColor: '#faf6f1', borderBottom: '1px solid #e2e8f0' }}>
          
          {/* Top Filter Container: 2 Outer Box Selects (Kế hoạch & Chi tiết) */}
          <div style={{ padding: '10px 14px', backgroundColor: '#fff' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '12px',
              padding: '10px 12px',
              backgroundColor: '#fff'
            }}>
              {/* Box 1: Kế hoạch */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#334155' }}>Kế hoạch</label>
                <CustomSelect
                  value={selectedMonth}
                  options={monthOptions}
                  onChange={(val) => { setSelectedMonth(parseInt(val, 10)); setSelectedPart('Tất cả chi tiết'); setPage(1); }}
                  style={{ height: '36px', minHeight: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '700' }}
                />
              </div>

              {/* Box 2: Chi tiết */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#334155' }}>Chi tiết</label>
                <CustomSelect
                  value={selectedPart}
                  options={partOptions}
                  onChange={(val) => { setSelectedPart(val); setPage(1); }}
                  style={{ height: '36px', minHeight: '36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: '700' }}
                />
              </div>
            </div>
          </div>

          {/* Tabs: Bàn giao | Kiểm tra */}
          <div style={{ display: 'flex', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
            <button
              onClick={() => { setActiveTab('transfer'); setPage(1); }}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', background: 'none',
                fontSize: '0.86rem', fontWeight: activeTab === 'transfer' ? '800' : '600',
                color: activeTab === 'transfer' ? '#432818' : '#64748b',
                borderBottom: activeTab === 'transfer' ? '3px solid #432818' : 'none',
                cursor: 'pointer'
              }}
            >
              Bàn giao
            </button>

            <button
              onClick={() => { setActiveTab('inspection'); setPage(1); }}
              style={{
                flex: 1, padding: '10px 4px', border: 'none', background: 'none',
                fontSize: '0.86rem', fontWeight: activeTab === 'inspection' ? '800' : '600',
                color: activeTab === 'inspection' ? '#432818' : '#64748b',
                borderBottom: activeTab === 'inspection' ? '3px solid #432818' : 'none',
                cursor: 'pointer'
              }}
            >
              Kiểm tra
            </button>
          </div>

        </div>

        {/* Transfers Cards List */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải lịch sử luân chuyển...</div>
          ) : transfers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Không có phiếu luân chuyển phù hợp với bộ lọc
            </div>
          ) : (
            transfers.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedDetailItem(item)}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, boxShadow 0.15s ease'
                }}
              >
                {/* Header Row: Code & Time */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: '900', color: '#432818', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{item.code}</span>
                    <Info size={14} color="#94a3b8" />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>
                    {item.time_str}
                  </div>
                </div>

                {/* Part Name & Quantity details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfaf9', padding: '6px 10px', borderRadius: '8px', border: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b' }}>
                    {item.part_name}
                  </span>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.78rem', fontWeight: '800' }}>
                    {item.is_inspection ? (
                      <>
                        <span style={{ color: 'var(--accent-color)' }}>Thực kiểm: {item.quantity}</span>
                        {item.error_qty > 0 && <span style={{ color: '#dc2626' }}>Lỗi: {item.error_qty}</span>}
                      </>
                    ) : (
                      <>
                        <span style={{ color: 'var(--accent-color)' }}>SL Giao: {item.quantity}</span>
                        {item.received_qty > 0 && <span style={{ color: '#16a34a' }}>Thực nhận: {item.received_qty}</span>}
                      </>
                    )}
                  </div>
                </div>

                {/* Route & Badge & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: '600' }}>
                      {item.route_str}
                    </span>
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#d97706',
                      borderRadius: '50%',
                      width: '22px', height: '22px',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: '900'
                    }}>
                      {item.version_badge}
                    </span>
                  </div>

                  <span style={{ fontSize: '0.84rem', fontWeight: '800', color: item.status_color }}>
                    {item.status}
                  </span>
                </div>

                {/* Personnel row */}
                <div style={{ fontSize: '0.75rem', color: '#64748b', borderTop: '1px dashed #f1f5f9', paddingTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  {item.is_inspection ? (
                    <>
                      <span>QC Kiểm: <strong style={{ color: item.inspector_name === 'Chưa kiểm tra QC' ? '#94a3b8' : '#1e40af' }}>{item.inspector_name}</strong></span>
                      <span>Nhận: <strong style={{ color: item.receiver_name === 'Chưa tiếp nhận' ? '#94a3b8' : '#334155' }}>{item.receiver_name}</strong></span>
                    </>
                  ) : (
                    <>
                      <span>Giao: <strong>{item.sender_name}</strong></span>
                      <span>Nhận: <strong style={{ color: item.receiver_name === 'Chưa tiếp nhận' ? '#94a3b8' : '#334155' }}>{item.receiver_name}</strong></span>
                    </>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Pagination Bar - Fixed inside frame at bottom */}
        {!loading && total > 0 && (
          <div style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 'auto',
            width: '100%',
            boxSizing: 'border-box',
            backgroundColor: '#fff',
            padding: '10px 14px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#475569',
            zIndex: 10
          }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={16} />
            </button>

            <span>Hiển thị <strong>{Math.min((page - 1) * pageSize + 1, total)}</strong> - <strong>{Math.min(page * pageSize, total)}</strong> / <strong>{total}</strong> kết quả</span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', opacity: page >= totalPages ? 0.5 : 1 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>

      {/* Detail Popup Modal */}
      {selectedDetailItem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          {/* Backdrop */}
          <div onClick={() => setSelectedDetailItem(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }} />
          
          {/* Modal Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#fff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '20px 18px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.2)',
            animation: 'slideUp 0.25s ease-out',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.12rem', fontWeight: '900', color: '#432818', margin: 0 }}>
                    {selectedDetailItem.is_inspection ? 'Phiếu QC Kiểm Tra' : 'Phiếu Luân Chuyển Bàn Giao'} [{selectedDetailItem.code}]
                  </h3>
                  {selectedDetailItem.mode && (
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '6px' }}>
                      {selectedDetailItem.mode === 'first_sample' ? 'Mẫu lần đầu' : selectedDetailItem.mode}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600', marginTop: '3px' }}>
                  🕒 {selectedDetailItem.time_str} • 📍 {selectedDetailItem.route_str}
                </div>
              </div>
              <button onClick={() => setSelectedDetailItem(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#475569', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* Status Badge Banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: selectedDetailItem.error_qty > 0 ? '#fef2f2' : '#f0fdf4',
              padding: '10px 14px',
              borderRadius: '12px',
              marginBottom: '14px',
              border: `1.5px solid ${selectedDetailItem.error_qty > 0 ? '#fecaca' : '#bbf7d0'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.9rem' }}>{selectedDetailItem.error_qty > 0 ? '❌' : '✅'}</span>
                <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#334155' }}>Kết luận chất lượng:</span>
              </div>
              <span style={{ fontSize: '0.88rem', fontWeight: '900', color: selectedDetailItem.status_color }}>
                {selectedDetailItem.status} {selectedDetailItem.error_qty > 0 ? `(${selectedDetailItem.error_qty} lỗi)` : '(Đạt tiêu chuẩn)'}
              </span>
            </div>

            {/* Content Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.84rem' }}>
              
              {/* Box 1: Thông tin Lô hàng & Đơn hàng */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#432818', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📦 Thông tin Lô hàng & Chi tiết:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '600', display: 'block' }}>Mã PO (Đơn hàng):</span>
                    <span style={{ fontWeight: '800', color: '#1e293b' }}>{selectedDetailItem.po_code || '-'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '600', display: 'block' }}>Mã Pallet / Thùng:</span>
                    <span style={{ fontWeight: '800', color: '#1e293b' }}>{selectedDetailItem.pallet_code || '-'}</span>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '600', display: 'block' }}>Tên chi tiết / Sản phẩm:</span>
                    <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.88rem' }}>{selectedDetailItem.part_name}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '600', display: 'block' }}>Quy cách:</span>
                    <span style={{ fontWeight: '700', color: '#334155' }}>{selectedDetailItem.specification}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.74rem', fontWeight: '600', display: 'block' }}>
                      {selectedDetailItem.is_inspection ? 'Người kiểm tra QC:' : 'Người bàn giao:'}
                    </span>
                    <span style={{ fontWeight: '800', color: '#1e40af' }}>
                      {selectedDetailItem.is_inspection ? selectedDetailItem.inspector_name : selectedDetailItem.sender_name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 2: Số lượng kiểm tra & Bàn giao */}
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#432818', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📊 Thống kê Số lượng:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: selectedDetailItem.is_inspection ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '6px' }}>
                  {selectedDetailItem.is_inspection && (
                    <div style={{ backgroundColor: '#f8fafc', padding: '8px 6px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>SL Lô:</div>
                      <div style={{ fontSize: '0.98rem', fontWeight: '900', color: '#475569' }}>{selectedDetailItem.lot_qty || selectedDetailItem.quantity}</div>
                    </div>
                  )}
                  <div style={{ backgroundColor: '#f8fafc', padding: '8px 6px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>
                      {selectedDetailItem.is_inspection ? 'Thực kiểm:' : 'SL Giao:'}
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: '900', color: 'var(--accent-color)' }}>{selectedDetailItem.quantity}</div>
                  </div>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '8px 6px', borderRadius: '8px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '600' }}>
                      {selectedDetailItem.is_inspection ? 'SL Đạt:' : 'Thực nhận:'}
                    </div>
                    <div style={{ fontSize: '0.98rem', fontWeight: '900', color: '#16a34a' }}>{selectedDetailItem.received_qty}</div>
                  </div>
                  <div style={{ backgroundColor: selectedDetailItem.error_qty > 0 ? '#fef2f2' : '#f8fafc', padding: '8px 6px', borderRadius: '8px', textAlign: 'center', border: `1px solid ${selectedDetailItem.error_qty > 0 ? '#fecaca' : '#e2e8f0'}` }}>
                    <div style={{ fontSize: '0.7rem', color: selectedDetailItem.error_qty > 0 ? '#991b1b' : '#64748b', fontWeight: '600' }}>SL Lỗi:</div>
                    <div style={{ fontSize: '0.98rem', fontWeight: '900', color: selectedDetailItem.error_qty > 0 ? '#dc2626' : '#16a34a' }}>{selectedDetailItem.error_qty}</div>
                  </div>
                </div>
              </div>

              {/* Box 3: DANH SÁCH LỖI CHI TIẾT (Defects Breakdown) */}
              <div style={{
                backgroundColor: selectedDetailItem.defects && selectedDetailItem.defects.length > 0 ? '#fff' : '#f8fafc',
                padding: '12px',
                borderRadius: '12px',
                border: `1.5px solid ${selectedDetailItem.defects && selectedDetailItem.defects.length > 0 ? '#fca5a5' : '#e2e8f0'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: '800', color: selectedDetailItem.defects && selectedDetailItem.defects.length > 0 ? '#991b1b' : '#432818', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚠️ Chi tiết Lỗi phát sinh:
                  </div>
                  {selectedDetailItem.defects && selectedDetailItem.defects.length > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '6px' }}>
                      {selectedDetailItem.defects.length} loại lỗi
                    </span>
                  )}
                </div>

                {selectedDetailItem.defects && selectedDetailItem.defects.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedDetailItem.defects.map((df, dfIdx) => (
                      <div
                        key={dfIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#fef2f2',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          borderLeft: '4px solid #dc2626'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '800', color: '#1e293b' }}>
                              [{df.code || 'ERR'}] {df.name || 'Lỗi kiểm tra'}
                            </span>
                            {df.isQA && (
                              <span style={{ fontSize: '0.65rem', fontWeight: '800', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '1px 5px', borderRadius: '4px' }}>
                                QA Track
                              </span>
                            )}
                            {df.isCTQ && (
                              <span style={{ fontSize: '0.65rem', fontWeight: '800', backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: '4px' }}>
                                CTQ
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#dc2626' }}>
                            {df.quantity} <span style={{ fontSize: '0.7rem', fontWeight: '600' }}>sp</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '700', padding: '6px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✅</span> Không ghi nhận lỗi phát sinh. Mẫu đạt tiêu chuẩn chất lượng.
                  </div>
                )}
              </div>

              {/* Box 4: HÌNH ẢNH MINH CHỨNG / ẢNH LỖI (Photos Gallery) */}
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '12px', border: '1.5px solid #cbd5e1' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#432818', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📷 Hình ảnh minh chứng / Ảnh lỗi hiện trường:
                </div>
                {selectedDetailItem.images && selectedDetailItem.images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {selectedDetailItem.images.map((imgUrl, imgIdx) => (
                      <div
                        key={imgIdx}
                        onClick={() => window.open(imgUrl, '_blank')}
                        style={{
                          position: 'relative',
                          aspectRatio: '1 / 1',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1.5px solid #cbd5e1',
                          cursor: 'pointer',
                          backgroundColor: '#f8fafc'
                        }}
                      >
                        <img
                          src={imgUrl}
                          alt={`Minh chứng ${imgIdx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: '0.65rem',
                          textAlign: 'center',
                          padding: '2px 0',
                          fontWeight: '700'
                        }}>
                          Ảnh {imgIdx + 1} (Xem)
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                    Chưa đính kèm hình ảnh minh chứng.
                  </div>
                )}
              </div>

              {/* Box 5: Thông số kỹ thuật & Ghi chú */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Độ ẩm / Thông số:</span>
                  <span style={{ fontWeight: '700', color: '#334155' }}>
                    {selectedDetailItem.parameter ? `${selectedDetailItem.parameter} (Đạt: ${selectedDetailItem.param_pass ?? selectedDetailItem.received_qty})` : `${selectedDetailItem.moisture_min}% - ${selectedDetailItem.moisture_max}%`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Ghi chú kiểm tra:</span>
                  <span style={{ fontWeight: '600', color: '#334155', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    {selectedDetailItem.note || 'Không có ghi chú'}
                  </span>
                </div>
              </div>

            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
              <button
                onClick={() => setSelectedDetailItem(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Đóng cửa sổ
              </button>
              {!selectedDetailItem.is_inspection && (() => {
                const sLower = String(selectedDetailItem.status || '').toLowerCase().trim()
                const isCompletedOrReturned = ['hoàn thành', 'đã nhận', 'trả lại', 'đã hủy', 'done', 'cancelled'].some((k) => sLower.includes(k))
                const isPendingState = ['chờ', 'pending', ''].some((k) => sLower.includes(k)) || sLower === 'chưa xác nhận'
                const canConfirm = !isCompletedOrReturned && isPendingState

                if (!canConfirm) return null

                return (
                  <button
                    disabled={confirming}
                    onClick={() => handleConfirmInModal(selectedDetailItem)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      backgroundColor: 'var(--primary-color)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '0.9rem',
                      cursor: 'pointer'
                    }}
                  >
                    {confirming ? 'Đang lưu...' : 'Xác nhận nhận hàng'}
                  </button>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Premium Alert Modal */}
      <MessageModal
        isOpen={msgModal.isOpen}
        type={msgModal.type}
        title={msgModal.title}
        message={msgModal.message}
        onConfirm={() => setMsgModal(prev => ({ ...prev, isOpen: false }))}
      />
    </Layout>
  );
};

export default ProductionTransferHistoryView;
