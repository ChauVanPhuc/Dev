import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import apiClient from '@shared/services/api';

const ProductionPlanScheduleView = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Options
  const [availableMonths, setAvailableMonths] = useState([]);
  const [availableStages, setAvailableStages] = useState([]);
  const [availableFactories, setAvailableFactories] = useState([]);

  // Filters
  const [month, setMonth] = useState('');
  const [week, setWeek] = useState('ALL');
  const [day, setDay] = useState('ALL');
  const [stage, setStage] = useState('ALL');
  const [factory, setFactory] = useState('ALL');
  const [area, setArea] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  // 1. Fetch available months, stages, and factories on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [monthsResp, stagesResp, factoriesResp] = await Promise.all([
          apiClient.get('/production-v2/available-months'),
          apiClient.get('/production-v2/stages'),
          apiClient.get('/production-v2/factories')
        ]);

        const months = monthsResp.data?.months || [];
        setAvailableMonths(months);
        const defMonth = monthsResp.data?.default_month || new Date().getMonth() + 1;
        const hasDef = months.some(m => m.month === defMonth);
        if (hasDef) {
          setMonth(defMonth.toString());
        } else if (months.length > 0) {
          setMonth(months[0].month.toString());
        }

        const stages = stagesResp.data || [];
        setAvailableStages(stages);

        const factories = factoriesResp.data || [];
        setAvailableFactories(factories);
      } catch (err) {
        console.error('Lỗi khi tải danh mục Kế hoạch sản xuất:', err);
      }
    };
    fetchMetadata();
  }, []);

  // 2. Fetch plans schedule items whenever filters/page change
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: pageSize.toString()
        });
        if (month) params.append('month', month);
        if (stage && stage !== 'ALL') params.append('stage', stage);
        if (factory && factory !== 'ALL') params.append('factory', factory);

        const resp = await apiClient.get(`/production-v2/plans?${params.toString()}`);
        setItems(resp.data?.items || []);
        setTotal(resp.data?.total || 0);
      } catch (err) {
        console.error('Lỗi khi tải Kế hoạch sản xuất từ CSDL:', err);
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [month, week, day, stage, factory, area, page]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <Layout>
      <PageHeader title="Thông tin sản xuất" subTitle="CL04: Kế hoạch sản xuất" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, backgroundColor: '#faf6f1', paddingBottom: '80px' }}>
        
        {/* Filter Toolbar Grid (2 Rows) */}
        <div style={{ position: 'sticky', top: 0, zIndex: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
          
          {/* Row 1: Tháng | Tuần | Ngày */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Tháng</label>
              <select
                value={month}
                onChange={(e) => { setMonth(e.target.value); setPage(1); }}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="">Tất cả tháng</option>
                {availableMonths.map(m => (
                  <option key={m.plan_id || m.month} value={m.month.toString()}>Tháng {m.month}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Tuần</label>
              <select
                value={week}
                onChange={(e) => { setWeek(e.target.value); setPage(1); }}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">Tất cả</option>
                <option value="Tuần 1">Tuần 1</option>
                <option value="Tuần 2">Tuần 2</option>
                <option value="Tuần 3">Tuần 3</option>
                <option value="Tuần 4">Tuần 4</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Ngày</label>
              <select
                value={day}
                onChange={(e) => { setDay(e.target.value); setPage(1); }}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">Tất cả</option>
              </select>
            </div>
          </div>

          {/* Row 2: Công đoạn | Nhà máy | Khu vực */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Công đoạn</label>
              <select
                value={stage}
                onChange={(e) => { setStage(e.target.value); setPage(1); }}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">Tất cả</option>
                {availableStages.map(st => (
                  <option key={st.id || st.name} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Nhà máy</label>
              <select
                value={factory}
                onChange={(e) => { setFactory(e.target.value); setPage(1); }}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">Tất cả</option>
                {availableFactories.map(f => (
                  <option key={f.id || f.code} value={f.code}>{f.code}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b' }}>Khu vực</label>
              <select
                value={area}
                onChange={(e) => { setArea(e.target.value); setPage(1); }}
                style={{ height: '36px', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '0 6px', fontSize: '0.8rem', fontWeight: '700', outline: 'none' }}
              >
                <option value="ALL">Tất cả</option>
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
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Đang tải kế hoạch từ CSDL...</div>
              ) : items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
                  Không tìm thấy kế hoạch sản xuất phù hợp với bộ lọc
                </div>
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
          {!loading && total > 0 && (
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

      </div>
    </Layout>
  );
};

export default ProductionPlanScheduleView;
