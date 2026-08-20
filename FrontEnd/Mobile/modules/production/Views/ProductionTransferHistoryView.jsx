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
                  onChange={(val) => { setSelectedMonth(parseInt(val, 10)); setPage(1); }}
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
          <div onClick={() => setSelectedDetailItem(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          
          {/* Modal Container */}
          <div style={{
            position: 'relative',
            width: '100%',
            maxWidth: '480px',
            backgroundColor: '#fff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '20px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
            boxShadow: '0 -10px 25px rgba(0,0,0,0.15)',
            animation: 'slideUp 0.25s ease-out',
            maxHeight: '85vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '900', color: '#432818', margin: 0 }}>
                  {selectedDetailItem.is_inspection ? 'Chi tiết phiếu QC Kiểm Tra' : 'Chi tiết phiếu Bàn Giao'} [{selectedDetailItem.code}]
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>{selectedDetailItem.time_str}</span>
              </div>
              <button onClick={() => setSelectedDetailItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {/* Status Badge Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf6f1', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155' }}>Trạng thái xử lý:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '900', color: selectedDetailItem.status_color }}>
                {selectedDetailItem.status}
              </span>
            </div>

            {/* Main Info Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.84rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Tên chi tiết:</span>
                <span style={{ fontWeight: '800', color: '#1e293b' }}>{selectedDetailItem.part_name}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Quy cách:</span>
                <span style={{ fontWeight: '700', color: '#334155' }}>{selectedDetailItem.specification}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Công đoạn giao:</span>
                <span style={{ fontWeight: '700', color: '#334155' }}>{selectedDetailItem.delivery_stage}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Công đoạn nhận:</span>
                <span style={{ fontWeight: '700', color: '#334155' }}>{selectedDetailItem.receiving_stage}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Người bàn giao:</span>
                <span style={{ fontWeight: '800', color: selectedDetailItem.sender_name === 'Chưa phân công' ? '#94a3b8' : '#1e293b' }}>
                  {selectedDetailItem.sender_name}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Người tiếp nhận:</span>
                <span style={{ fontWeight: '800', color: selectedDetailItem.receiver_name === 'Chưa tiếp nhận' ? '#94a3b8' : '#1e293b' }}>
                  {selectedDetailItem.receiver_name}
                </span>
              </div>

              {selectedDetailItem.is_inspection && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontWeight: '600' }}>Người kiểm tra QC:</span>
                  <span style={{ fontWeight: '800', color: selectedDetailItem.inspector_name === 'Chưa kiểm tra QC' ? '#94a3b8' : '#1e40af' }}>
                    {selectedDetailItem.inspector_name}
                  </span>
                </div>
              )}

              {/* Quantities Section */}
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#432818', marginBottom: '8px' }}>Số lượng sản xuất & QC:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Số lượng giao:</div>
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--accent-color)' }}>{selectedDetailItem.quantity}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Số lượng thực nhận:</div>
                    <div style={{ fontSize: '1rem', fontWeight: '900', color: '#16a34a' }}>{selectedDetailItem.received_qty}</div>
                  </div>
                  {selectedDetailItem.is_inspection && (
                    <>
                      <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Số lượng lỗi:</div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: selectedDetailItem.error_qty > 0 ? '#dc2626' : '#16a34a' }}>{selectedDetailItem.error_qty}</div>
                      </div>
                      <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>Số lượng trả:</div>
                        <div style={{ fontSize: '1rem', fontWeight: '900', color: selectedDetailItem.returned_qty > 0 ? '#dc2626' : '#16a34a' }}>{selectedDetailItem.returned_qty}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Extra Info: Moisture & Note */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px', marginTop: '6px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Độ ẩm cho phép:</span>
                <span style={{ fontWeight: '700', color: '#334155' }}>{selectedDetailItem.moisture_min}% - {selectedDetailItem.moisture_max}%</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ color: '#64748b', fontWeight: '600' }}>Ghi chú:</span>
                <span style={{ fontWeight: '600', color: '#334155', backgroundColor: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  {selectedDetailItem.note}
                </span>
              </div>

            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
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
              {['Chờ Nhận Hàng', 'Chờ Xác Nhận'].some(s => String(selectedDetailItem.status || '').toLowerCase().includes(s.toLowerCase())) && (
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
              )}
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
