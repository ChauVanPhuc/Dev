import React, { useState, useEffect } from 'react';
import { Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';

const ProductionDashboardView = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentNotifIndex, setCurrentNotifIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resp = await apiClient.get('/production-v2/dashboard');
        setData(resp.data || resp);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu Production Dashboard:', err);
        // Fallback demo data
        setData(prev => prev || {
          notifications: [
            { id: 1, title: 'Hiển thị thông báo mới', content: 'Cập nhật tiến độ sản xuất lô hàng APT007 cần chú ý tiến độ công đoạn Lắp ráp.', is_urgent: true }
          ],
          kpi_month: {
            month: 'Tháng 3',
            score: 100,
            items: [
              { name: 'KPI 1', value: 75 },
              { name: 'KPI 2', value: 20 },
              { name: 'KPI 3', value: 55 },
              { name: 'KPI 4', value: 100 },
              { name: 'KPI 5', value: 50 }
            ]
          },
          tracked_defects: [
            { category: 'Nứt tét', this_week: 40, yesterday: 20 },
            { category: 'Hở', this_week: 35, yesterday: 15 },
            { category: 'Lõm', this_week: 50, yesterday: 30 },
            { category: 'Lệch màu', this_week: 60, yesterday: 40 },
            { category: 'Lỗi đinh', this_week: 80, yesterday: 50 },
            { category: 'Khác', this_week: 25, yesterday: 15 }
          ],
          action_items: [
            { stt: '01', task_name: 'Xác nhận hồ sơ kiểm tra', status: 'Chưa Làm', notes: '', status_color: '#dc2626' },
            { stt: '02', task_name: 'Kiểm tra độ ẩm gỗ xưởng 1', status: 'Đã Làm', notes: 'Đạt chuẩn 12%', status_color: '#16a34a' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Đồng bộ tự động sau mỗi 5 giây
    const pollInterval = setInterval(fetchData, 5000);
    return () => clearInterval(pollInterval);
  }, []);

  // Tự động xoay vòng trượt thông báo sau 5 giây nếu có trên 1 thông báo
  useEffect(() => {
    if (data && data.notifications && data.notifications.length > 1) {
      const timer = setInterval(() => {
        setCurrentNotifIndex(prev => (prev + 1) % data.notifications.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [data]);

  if (loading || !data) {
    return (
      <Layout>
        <PageHeader title="Trang chủ" subTitle="CL1: Thông tin cần chú ý" />
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải dữ liệu...</div>
      </Layout>
    );
  }

  const maxDefectValue = Math.max(...data.tracked_defects.map(d => d.this_week + d.yesterday), 100);

  return (
    <Layout>
      <PageHeader title="Trang chủ" subTitle="CL1: Thông tin cần chú ý" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
        
        {/* Card 1: Hiển thị thông báo mới (Hỗ trợ trượt tự động 5s) */}
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

              {/* Nội dung thông báo - Có khoảng đệm 38px hai bên để KHÔNG ĐÈ LÊN MŨI TÊN */}
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

        {/* Card 2: KPI tháng 3 */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'grid',
          gridTemplateColumns: '110px 1fr',
          gap: '16px',
          alignItems: 'center'
        }}>
          {/* Left score */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: '1px solid #f1f5f9',
            paddingRight: '12px'
          }}>
            <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#432818' }}>
              KPI tháng 3
            </span>
            <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#1e293b', lineHeight: '1' }}>
              {data.kpi_month.score}
            </span>
          </div>

          {/* Right horizontal bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {data.kpi_month.items.map((kpi, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '700' }}>
                <span style={{ width: '40px', color: '#475569', flexShrink: 0 }}>{kpi.name}:</span>
                <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '14px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${kpi.value}%`, backgroundColor: '#78350f', height: '100%' }} />
                </div>
                <span style={{ width: '28px', textAlign: 'right', color: '#1e293b' }}>{kpi.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 3: Các lỗi cần theo dõi */}
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
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', paddingTop: '10px', gap: '8px' }}>
            {data.tracked_defects.map((def, idx) => {
              const weekHeight = (def.this_week / maxDefectValue) * 100;
              const yestHeight = (def.yesterday / maxDefectValue) * 100;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '4px', overflow: 'hidden', width: '100%', maxWidth: '28px' }}>
                    <div style={{ height: `${yestHeight}px`, backgroundColor: '#fde68a' }} />
                    <div style={{ height: `${weekHeight}px`, backgroundColor: '#78350f' }} />
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px', textAlign: 'center', whiteSpace: 'nowrap', fontWeight: '600' }}>
                    {def.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card 4: Table Các công việc cần làm */}
        <div style={{
          backgroundColor: '#432818',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          {/* Header Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 100px 40px',
            padding: '10px 12px',
            color: '#fff',
            fontWeight: '800',
            fontSize: '0.82rem',
            alignItems: 'center'
          }}>
            <span>STT</span>
            <span>Tên việc</span>
            <span>Trạng thái</span>
            <span style={{ textAlign: 'center' }}>Ghi chú</span>
          </div>

          {/* Body Rows */}
          <div style={{ backgroundColor: '#fff' }}>
            {data.action_items.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 100px 40px',
                  padding: '12px',
                  borderBottom: idx < data.action_items.length - 1 ? '1px solid #f1f5f9' : 'none',
                  fontSize: '0.84rem',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontWeight: '700', color: '#64748b' }}>{item.stt}</span>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{item.task_name}</span>
                <span style={{ fontWeight: '800', color: item.status_color }}>{item.status}</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Pencil size={16} color="#64748b" style={{ cursor: 'pointer' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default ProductionDashboardView;
