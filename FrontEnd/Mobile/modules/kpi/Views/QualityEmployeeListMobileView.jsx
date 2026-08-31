import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import { Search, Plus, CheckSquare, Factory, UserCheck, RefreshCw, ChevronRight } from 'lucide-react';
import apiClient from '@shared/services/api';

const QualityEmployeeListMobileView = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedFactory, setSelectedFactory] = useState('');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        size: 100,
        search: search || undefined,
        factory: selectedFactory || undefined
      };
      const res = await apiClient.get('/quality-employees/', { params });
      if (res.data) {
        setEmployees(res.data.items || []);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách nhân sự QLCL Mobile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, selectedFactory]);

  const handleEvaluate = (empCode) => {
    navigate(`/staff-evaluation/new?employee_id=${empCode}`);
  };

  const getRatingBadge = (rating) => {
    switch (rating) {
      case 'A':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '800' }}>Loại A</span>;
      case 'B':
        return <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '800' }}>Loại B</span>;
      case 'C':
        return <span style={{ backgroundColor: '#fef9c3', color: '#a16207', padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '800' }}>Loại C</span>;
      case 'D':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '800' }}>Loại D</span>;
      default:
        return <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: '700' }}>{rating || '---'}</span>;
    }
  };

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="MB8.2 | Nhân sự Quản lý Chất lượng" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, padding: '14px', backgroundColor: 'var(--bg-cream)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Header Title Card */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '16px', border: '1px solid #e8e1d5', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={22} color="#32251E" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#32251E', margin: 0 }}>Danh Sách Nhân Sự QLCL</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0 0' }}>Tổng số: {employees.length} nhân sự QC/QA</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/staff-evaluation/new')}
            style={{ padding: '8px 12px', borderRadius: '10px', border: 'none', backgroundColor: '#8FA0B5', color: '#fff', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <Plus size={16} /> Đánh Giá Mới
          </button>
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Tìm tên hoặc mã NV..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 10px 9px 34px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none', backgroundColor: '#fff' }}
            />
          </div>
          <select
            value={selectedFactory}
            onChange={e => setSelectedFactory(e.target.value)}
            style={{ padding: '9px 10px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.82rem', backgroundColor: '#fff', color: '#334155', outline: 'none' }}
          >
            <option value="">Tất cả Nhà máy</option>
            <option value="Nhà máy 1">NM1</option>
            <option value="Nhà máy 2">NM2</option>
            <option value="Nhà máy 3">NM3</option>
          </select>
        </div>

        {/* Personnel Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '30px' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
              Đang tải danh sách nhân sự...
            </div>
          ) : employees.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Không tìm thấy nhân sự phù hợp
            </div>
          ) : (
            employees.map((emp) => (
              <div key={emp.id} style={{ backgroundColor: '#fff', borderRadius: '14px', padding: '14px', border: '1px solid #e8e1d5', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>{emp.full_name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontWeight: '700', color: '#334155' }}>{emp.employee_id}</span>
                      <span>• {emp.department || 'Phòng QLCL'}</span>
                    </div>
                  </div>
                  {getRatingBadge(emp.latest_rating)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #f1f5f9' }}>
                  <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Factory size={13} color="#64748b" />
                    <span>{emp.factory}</span>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <span style={{ color: '#1e293b' }}>{emp.stage || 'QLCL'}</span>
                  </div>

                  <button
                    onClick={() => handleEvaluate(emp.employee_id)}
                    style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: '#8FA0B5', color: '#fff', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckSquare size={13} /> Đánh Giá <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </Layout>
  );
};

export default QualityEmployeeListMobileView;
