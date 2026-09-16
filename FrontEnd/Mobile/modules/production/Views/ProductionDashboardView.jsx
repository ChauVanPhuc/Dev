import React, { useState, useEffect } from 'react';
import { Pencil, ChevronLeft, ChevronRight, X, Check, AlertCircle } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';
import useAuthStore from '@modules/auth/Models/authModel';

const ProductionDashboardView = () => {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentNotifIndex, setCurrentNotifIndex] = useState(0);

  // Modal cập nhật kết quả công việc / checklist
  const [selectedTask, setSelectedTask] = useState(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState('Đang Làm');
  const [savingTask, setSavingTask] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const fetchData = async () => {
    try {
      const resp = await apiClient.get('/production-v2/dashboard', {
        params: {
          employee_id: user?.employee_id || undefined
        }
      });
      setData(resp.data || resp);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Production Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Đồng bộ tự động sau mỗi 10 giây
    const pollInterval = setInterval(fetchData, 10000);
    return () => clearInterval(pollInterval);
  }, [user?.employee_id]);

  // Tự động xoay vòng trượt thông báo sau 5 giây nếu có trên 1 thông báo
  useEffect(() => {
    if (data && data.notifications && data.notifications.length > 1) {
      const timer = setInterval(() => {
        setCurrentNotifIndex(prev => (prev + 1) % data.notifications.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [data]);

  // Mở modal sửa checklist
  const handleOpenEditModal = (task) => {
    setSelectedTask(task);
    setEditNotes(task.notes || '');
    setEditStatus(task.status || 'Chưa Làm');
    setSaveSuccessMsg('');
  };

  // Lưu cập nhật checklist
  const handleSaveChecklist = async () => {
    if (!selectedTask || !selectedTask.id) return;
    setSavingTask(true);
    try {
      await apiClient.put(`/production-v2/dashboard/checklist/${selectedTask.id}`, {
        notes: editNotes,
        status: editStatus
      });
      setSaveSuccessMsg('Đã cập nhật công việc thành công!');
      // Cập nhật ngay trong local state
      setData(prev => {
        if (!prev || !prev.action_items) return prev;
        const nextItems = prev.action_items.map(it => {
          if (it.id === selectedTask.id) {
            const stColor = editStatus === 'Đã Làm' ? '#16a34a' : (editStatus === 'Đang Làm' ? '#ea580c' : '#dc2626');
            return {
              ...it,
              notes: editNotes,
              status: editStatus,
              status_color: stColor
            };
          }
          return it;
        });
        return { ...prev, action_items: nextItems };
      });
      setTimeout(() => {
        setSelectedTask(null);
        setSaveSuccessMsg('');
      }, 1000);
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi cập nhật công việc');
    } finally {
      setSavingTask(false);
    }
  };

  if (loading || !data) {
    return (
      <Layout>
        <PageHeader title="Trang chủ" subTitle="CL1: Thông tin cần chú ý" />
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải dữ liệu...</div>
      </Layout>
    );
  }

  const rawMax = data.tracked_defects && data.tracked_defects.length > 0
    ? Math.max(...data.tracked_defects.map(d => (d.this_week || 0) + (d.yesterday || 0)))
    : 0;
  const maxDefectValue = Math.max(rawMax, 10);

  return (
    <Layout>
      <PageHeader title="Trang chủ" subTitle="CL1: Thông tin cần chú ý" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
        
        {/* Card 1: Hiển thị thông báo mới (GIỮ NGUYÊN 100% LOGIC CŨ THEO YÊU CẦU) */}
        {data.notifications && data.notifications.length > 0 && (() => {
          const notifs = data.notifications;
          const currentNotif = notifs[currentNotifIndex % notifs.length] || notifs[0];
          const hasMultiple = notifs.length > 1;

          return (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '18px 14px 14px 14px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: '105px'
            }}>
              {/* Nút mũi tên trái */}
              {hasMultiple && (
                <button
                  type="button"
                  onClick={() => setCurrentNotifIndex(prev => (prev - 1 + notifs.length) % notifs.length)}
                  style={{
                    position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'rgba(241, 245, 249, 0.95)', borderRadius: '50%',
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#475569', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* Nút mũi tên phải */}
              {hasMultiple && (
                <button
                  type="button"
                  onClick={() => setCurrentNotifIndex(prev => (prev + 1) % notifs.length)}
                  style={{
                    position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'rgba(241, 245, 249, 0.95)', borderRadius: '50%',
                    width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', color: '#475569', zIndex: 2, boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              )}

              {/* Nội dung thông báo */}
              <div style={{ padding: hasMultiple ? '0 38px' : '0 10px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#432818', wordBreak: 'break-word' }}>
                  {currentNotif.title || 'Hiển thị thông báo mới'}
                </h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.84rem', color: '#475569', lineHeight: '1.4', wordBreak: 'break-word' }}>
                  {currentNotif.content}
                </p>
              </div>

              {/* Các chấm chuyển đổi (Carousel Dots) */}
              {hasMultiple && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px' }}>
                  {notifs.slice(0, 8).map((_, idx) => (
                    <span
                      key={idx}
                      onClick={() => setCurrentNotifIndex(idx)}
                      style={{
                        width: idx === (currentNotifIndex % notifs.length) ? '18px' : '6px',
                        height: '6px',
                        borderRadius: '3px',
                        backgroundColor: idx === (currentNotifIndex % notifs.length) ? '#5D3B32' : '#CBD5E1',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Card 2: KPI theo người ở nhân sự /admin/kpi/quality-employees */}
        {data.kpi_month && data.kpi_month.items && data.kpi_month.items.length > 0 ? (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'grid',
            gridTemplateColumns: '100px 1fr',
            gap: '14px',
            alignItems: 'center'
          }}>
            {/* Left score */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid #f1f5f9',
              paddingRight: '10px'
            }}>
              <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#432818', textAlign: 'center' }}>
                {data.kpi_month.month || 'KPI tháng'}
              </span>
              <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', lineHeight: '1.1' }}>
                {data.kpi_month.score}
              </span>
            </div>

            {/* Right horizontal bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.kpi_month.items.map((kpi, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '700' }} title={kpi.full_name || kpi.name}>
                  <span style={{ minWidth: '65px', maxWidth: '85px', color: '#475569', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {kpi.name}:
                  </span>
                  <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '14px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, kpi.value))}%`, backgroundColor: '#78350f', height: '100%' }} />
                  </div>
                  <span style={{ minWidth: '32px', textAlign: 'right', color: '#1e293b' }}>
                    {kpi.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Nếu nhân sự chưa có KPI thì để trống card thông báo nhẹ nhàng theo yêu cầu */
          <div style={{
            backgroundColor: '#fafaf9',
            borderRadius: '16px',
            padding: '16px',
            border: '1px dashed #e2e8f0',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.82rem',
            fontWeight: '600'
          }}>
            Chưa có chỉ số KPI cá nhân phân bổ cho tháng này
          </div>
        )}

        {/* Card 3: Các lỗi cần theo dõi (Số liệu thực tế xưởng) */}
        {data.tracked_defects && data.tracked_defects.length > 0 && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '900', color: '#ea580c' }}>
              Các lỗi cần theo dõi
            </h3>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', fontWeight: '700' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#78350f' }} />
                <span style={{ color: '#475569' }}>Ghi nhận trong tuần</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fde68a' }} />
                <span style={{ color: '#475569' }}>Ghi nhận hôm qua</span>
              </div>
            </div>

            {/* Stacked Bars */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '125px', paddingTop: '10px', gap: '6px' }}>
              {data.tracked_defects.map((def, idx) => {
                const wQty = def.this_week || 0;
                const yQty = def.yesterday || 0;
                const weekHeight = Math.max(0, (wQty / maxDefectValue) * 85);
                const yestHeight = Math.max(0, (yQty / maxDefectValue) * 85);

                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    {/* Số lượng tổng lỗi hiển thị trên đầu cột */}
                    <span style={{ fontSize: '0.68rem', color: '#78350f', fontWeight: '800', marginBottom: '2px' }}>
                      {wQty + yQty > 0 ? `${wQty}` : ''}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', overflow: 'hidden', width: '100%', maxWidth: '28px' }}>
                      {yestHeight > 0 && <div style={{ height: `${yestHeight}px`, backgroundColor: '#fde68a' }} title={`Hôm qua: ${yQty}`} />}
                      {weekHeight > 0 && <div style={{ height: `${weekHeight}px`, backgroundColor: '#78350f' }} title={`Trong tuần: ${wQty}`} />}
                      {yestHeight === 0 && weekHeight === 0 && <div style={{ height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px' }} />}
                    </div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: '600', maxWidth: '46px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={def.category}>
                      {def.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card 4: Table Checklist công việc từ /admin/kpi/quality-employees */}
        <div style={{
          backgroundColor: '#432818',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          {/* Header Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 90px 40px',
            padding: '10px 12px',
            color: '#fff',
            fontWeight: '800',
            fontSize: '0.82rem',
            alignItems: 'center'
          }}>
            <span>STT</span>
            <span>Tên việc</span>
            <span style={{ textAlign: 'center' }}>Trạng thái</span>
            <span style={{ textAlign: 'center' }}>Ghi chú</span>
          </div>

          {/* Body Rows */}
          <div style={{ backgroundColor: '#fff' }}>
            {data.action_items && data.action_items.length > 0 ? (
              data.action_items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px 1fr 90px 40px',
                    padding: '12px',
                    borderBottom: idx < data.action_items.length - 1 ? '1px solid #f1f5f9' : 'none',
                    fontSize: '0.84rem',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#64748b' }}>{item.stt}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '6px' }}>
                    <span style={{ fontWeight: '700', color: '#1e293b', wordBreak: 'break-word', fontSize: '0.82rem' }}>
                      {item.task_name}
                    </span>
                    {item.notes && (
                      <span style={{ fontSize: '0.74rem', color: '#64748b', fontStyle: 'italic' }}>
                        Kết quả: {item.notes}
                      </span>
                    )}
                  </div>
                  <span style={{ fontWeight: '800', color: item.status_color, textAlign: 'center', fontSize: '0.78rem' }}>
                    {item.status}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                      title="Cập nhật kết quả công việc"
                    >
                      <Pencil size={16} color="#64748b" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.84rem' }}>
                Chưa có danh mục công việc được giao
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal Cập nhật kết quả Checklist công việc */}
      {selectedTask && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            padding: '20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '900', color: '#432818' }}>
                Cập nhật công việc #{selectedTask.stt}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Tên công việc */}
            <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '0.82rem', color: '#334155', fontWeight: '600' }}>
              {selectedTask.task_name}
            </div>

            {/* Chọn trạng thái */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Trạng thái:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {['Chưa Làm', 'Đang Làm', 'Đã Làm'].map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setEditStatus(st)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: editStatus === st ? '2px solid #5D3B32' : '1px solid #cbd5e1',
                      backgroundColor: editStatus === st ? '#F5EBE6' : '#fff',
                      color: editStatus === st ? '#432818' : '#64748b',
                      fontSize: '0.78rem',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Nhập ghi chú kết quả */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569' }}>Kết quả / Ghi chú:</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Nhập kết quả thực hiện (ví dụ: Đạt chuẩn 12%, hoàn thành biên bản...)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />
            </div>

            {saveSuccessMsg && (
              <div style={{ color: '#16a34a', fontSize: '0.82rem', fontWeight: '700', textAlign: 'center' }}>
                {saveSuccessMsg}
              </div>
            )}

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingTask}
                onClick={handleSaveChecklist}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#432818',
                  color: '#fff',
                  fontWeight: '800',
                  fontSize: '0.86rem',
                  cursor: savingTask ? 'not-allowed' : 'pointer'
                }}
              >
                {savingTask ? 'Đang lưu...' : 'Lưu kết quả'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProductionDashboardView;
