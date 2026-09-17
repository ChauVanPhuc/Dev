import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, ArrowUpDown, Filter, Plus, FileSpreadsheet, Share2, MoreHorizontal, ChevronRight, Layers, RefreshCw } from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import api from '@webShared/Services/api.service';
import AddPlanModal from './modals/AddPlanModal';

const ProductionPlansView = () => {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = outletContext;

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/plan');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);

  const [plans, setPlans] = useState([]);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get('/production/v2/plans');
      if (res && Array.isArray(res.plans) && res.plans.length > 0) {
        const mapped = res.plans.map((p, idx) => ({
          id: p.id || idx + 1,
          code: p.code || `KH-2026-${p.id}`,
          name: p.name || `Kế hoạch sản xuất ${p.month || 8}/${p.year || 2026}`,
          order: p.order_code || `DH-2026-${idx + 1}`,
          quantity: p.total_quantity || 100,
          factory: p.factory_name || 'Nhà máy 1',
          progress: p.progress_percent || 50,
          status: p.status || 'Đang chạy'
        }));
        setPlans(mapped);
      } else {
        setPlans([]);
      }
    } catch (err) {
      console.warn('Không lấy được dữ liệu kế hoạch từ API:', err);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSavePlan = (data) => {
    const newPlan = {
      id: plans.length + 1,
      code: `KH-2026-080${plans.length + 1}`,
      name: `Kế hoạch sản xuất ${data.orderId}`,
      order: data.orderId,
      quantity: Number(data.quantity),
      factory: data.factory,
      progress: 0,
      status: 'Đang chạy'
    };
    setPlans([newPlan, ...plans]);
  };

  const filteredPlans = plans.filter(p =>
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.order.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="gold-layout">
      {/* Action Toolbar */}
      <div className="sticky-top-zone">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '320px', background: '#FFF', borderRadius: '8px', border: '1.5px solid #EADCC9' }}>
              <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Tìm kiếm kế hoạch sản xuất..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '9px 12px 9px 38px', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.88rem' }}
              />
            </div>
            <button onClick={fetchPlans} title="Tải lại dữ liệu API" style={{ padding: '9px 12px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', cursor: 'pointer' }}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button style={{ padding: '9px 16px', background: '#FFF', border: '1.5px solid #EADCC9', borderRadius: '8px', color: '#5D3B32', fontWeight: '600', cursor: 'pointer' }}>
              Xuất Excel
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              style={{ padding: '9px 20px', background: '#5D3B32', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={18} /> Thêm kế hoạch
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-list-layout">
        <div className="mgmt-table card admin-table-card">
          <div className="admin-table-scroll">
            <table className="data-table">
          <thead>
            <tr style={{ background: '#FAF6F0', borderBottom: '1.5px solid #EADCC9', color: '#5D3B32' }}>
              <th style={{ padding: '14px 16px', fontWeight: '800' }}>STT</th>
              <th style={{ padding: '14px 16px', fontWeight: '800' }}>Mã kế hoạch</th>
              <th style={{ padding: '14px 16px', fontWeight: '800' }}>Tên kế hoạch</th>
              <th style={{ padding: '14px 16px', fontWeight: '800' }}>Mã đơn hàng</th>
              <th style={{ padding: '14px 16px', fontWeight: '800', textAlign: 'right' }}>Số lượng</th>
              <th style={{ padding: '14px 16px', fontWeight: '800' }}>Nhà máy</th>
              <th style={{ padding: '14px 16px', fontWeight: '800' }}>Tiến độ</th>
              <th style={{ padding: '14px 16px', fontWeight: '800' }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlans.map((p, idx) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '14px 16px', color: '#6B7280', fontWeight: '600' }}>{idx + 1}</td>
                <td style={{ padding: '14px 16px', fontWeight: '800', color: '#5D3B32' }}>{p.code}</td>
                <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1F2937' }}>{p.name}</td>
                <td style={{ padding: '14px 16px', color: '#4B5563', fontFamily: 'monospace', fontWeight: '600' }}>{p.order}</td>
                <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '800', color: '#2D1A12' }}>{p.quantity}</td>
                <td style={{ padding: '14px 16px', color: '#4B5563' }}>{p.factory}</td>
                <td style={{ padding: '14px 16px', width: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, background: '#E5E7EB', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${p.progress}%`, background: '#5D3B32', height: '100%' }}></div>
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#5D3B32' }}>{p.progress}%</span>
                  </div>
                </td>
                <td style={{ padding: '14px 16px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '700', background: '#DBEAFE', color: '#2563EB' }}>
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </div>
      </div>

      <AddPlanModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSavePlan} />
    </div>
  );
};

export default ProductionPlansView;
