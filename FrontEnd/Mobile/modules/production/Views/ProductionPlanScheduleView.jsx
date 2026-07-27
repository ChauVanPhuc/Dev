import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';

const ProductionPlanScheduleView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [month, setMonth] = useState('Tháng 7');
  const [week, setWeek] = useState('ALL');
  const [day, setDay] = useState('ALL');
  const [stage, setStage] = useState('Định hình');
  const [factory, setFactory] = useState('ALL');
  const [area, setArea] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(20);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const resp = await apiClient.get('/production-v2/plans');
        setItems(resp.data?.items || []);
        setTotal(resp.data?.total || 20);
      } catch (err) {
        console.error('Lỗi khi tải Kế hoạch sản xuất:', err);
        // Fallback demo
        setItems([
          { stt: '01', part_name: 'Thanh A', quantity_str: '0/12', progress: 0, area: 'NM1', status: 'Chưa SX', status_color: '#dc2626' },
          { stt: '02', part_name: 'Thanh B', quantity_str: '3/168', progress: 15, area: 'NM1', status: 'Đang SX', status_color: '#16a34a' },
          { stt: '03', part_name: 'Thanh C', quantity_str: '12/12', progress: 110, area: 'NM1', status: 'Hoàn thành', status_color: '#1e293b' },
          { stt: '04', part_name: 'Mặt đáy V1', quantity_str: '5/10', progress: 50, area: 'NM1', status: 'Đang SX', status_color: '#16a34a' },
          { stt: '05', part_name: 'Chân gỗ T1', quantity_str: '20/20', progress: 100, area: 'NM1', status: 'Hoàn thành', status_color: '#1e293b' }
        ]);
        setTotal(20);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [month, week, day, stage, factory, area, page]);

  return (
    <Layout>
      <PageHeader title="Thông tin sản xuất" subTitle="CL04: Kế hoạch sản xuất" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#faf6f1', paddingBottom: '80px' }}>
        
        {/* Filter Toolbar Grid (2 Rows) */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          
          {/* Row 1: Tháng | Tuần | Ngày */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Tháng</label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="Tháng 7">Tháng 7</option>
                <option value="Tháng 6">Tháng 6</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Tuần</label>
              <select
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">ALL</option>
                <option value="Tuần 27">Tuần 27</option>
                <option value="Tuần 28">Tuần 28</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Ngày</label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value)}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">ALL</option>
                <option value="27/07">27/07</option>
              </select>
            </div>
          </div>

          {/* Row 2: Công đoạn | Nhà máy | Khu vực */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Công đoạn</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="Định hình">Định hình</option>
                <option value="Lắp ráp">Lắp ráp</option>
                <option value="Sơn">Sơn</option>
                <option value="Đóng gói">Đóng gói</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Nhà máy</label>
              <select
                value={factory}
                onChange={(e) => setFactory(e.target.value)}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">ALL</option>
                <option value="NM1">NM1</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Khu vực</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">ALL</option>
                <option value="Khu đúc">Khu đúc</option>
              </select>
            </div>
          </div>

        </div>

        {/* Data Table */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 65px 55px 50px 85px',
              backgroundColor: '#432818',
              color: '#fff',
              padding: '10px 8px',
              fontSize: '0.75rem',
              fontWeight: '800',
              textAlign: 'center'
            }}>
              <span>STT</span>
              <span style={{ textAlign: 'left' }}>Chi tiết</span>
              <span>Số lượng</span>
              <span>Tiến độ</span>
              <span>Khu vực</span>
              <span>Trạng thái</span>
            </div>

            {/* Table Body */}
            <div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải kế hoạch...</div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px 1fr 65px 55px 50px 85px',
                      padding: '12px 8px',
                      borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                      fontSize: '0.8rem',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}
                  >
                    <span style={{ fontWeight: '700', color: '#64748b' }}>{item.stt}</span>
                    <span style={{ textAlign: 'left', fontWeight: '700', color: '#1e293b' }}>{item.part_name}</span>
                    <span style={{ fontWeight: '700', color: '#475569' }}>{item.quantity_str}</span>
                    <span style={{ fontWeight: '700', color: '#475569' }}>{item.progress}%</span>
                    <span style={{ fontWeight: '700', color: '#475569' }}>{item.area}</span>
                    <span style={{ fontWeight: '800', color: item.status_color }}>{item.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination Footer */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '8px 12px',
            border: '1px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.82rem',
            color: '#475569'
          }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
            >
              <ChevronLeft size={16} />
            </button>

            <span>Show <strong>1 to 10</strong> of <strong>{total}</strong> results</span>

            <button
              onClick={() => setPage(p => p + 1)}
              style={{ border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

        </div>

      </div>
    </Layout>
  );
};

export default ProductionPlanScheduleView;
