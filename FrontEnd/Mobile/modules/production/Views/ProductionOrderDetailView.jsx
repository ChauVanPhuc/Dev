import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowUpDown, Filter, Search, X, Check } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard';
import DataTable from '@mobile/Shared/Views/components/ui/DataTable';
import useAuthStore from '@modules/auth/Models/authModel';
import apiClient from '@shared/services/api';

const ProductionOrderDetailView = () => {
  const { poCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [currentPo, setCurrentPo] = useState(poCode || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (poCode) {
      setCurrentPo(poCode);
    }
  }, [poCode]);

  // Filter & Sort state
  const [showFilter, setShowFilter] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('DEFAULT');

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        let poToFetch = currentPo;
        if (!poToFetch) {
          const ordResp = await apiClient.get('/production-v2/orders');
          const orders = ordResp.data?.orders || ordResp.orders || [];
          if (orders.length > 0) {
            poToFetch = orders[0].po_code;
            setCurrentPo(poToFetch);
          }
        }
        if (poToFetch) {
          const resp = await apiClient.get(`/production-v2/orders/${encodeURIComponent(poToFetch)}/detail`);
          setData(resp.data || resp);
        } else {
          setData({ po_code: '', all_pos: [], stages: [] });
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết Lệnh sản xuất:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [currentPo]);

  // Auth & Header height checks
  const uRole = (user?.role_name || user?.role_description || '').toLowerCase();
  const uPerm = (user?.permission_name || user?.department_name || '').toLowerCase();
  const combinedAuth = `${uRole} | ${uPerm}`;
  const isAdminUser = combinedAuth.includes('admin') || combinedAuth.includes('it') || combinedAuth.includes('bgd');
  const hasStageSelect = isAdminUser || (user?.stageNames && user.stageNames.length > 1);
  const headerHeight = hasStageSelect ? 92 : 56;

  // Filter and sort details
  const getProcessedDetails = (detailsList) => {
    if (!detailsList || !Array.isArray(detailsList)) return [];
    let list = [...detailsList];

    if (statusFilter !== 'ALL') {
      list = list.filter(item => item.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(item => (item.part_name || '').toLowerCase().includes(q));
    }

    if (sortOrder === 'NAME_ASC') {
      list.sort((a, b) => (a.part_name || '').localeCompare(b.part_name || ''));
    } else if (sortOrder === 'NAME_DESC') {
      list.sort((a, b) => (b.part_name || '').localeCompare(a.part_name || ''));
    } else if (sortOrder === 'PROGRESS_DESC') {
      list.sort((a, b) => (b.progress || 0) - (a.progress || 0));
    } else if (sortOrder === 'PROGRESS_ASC') {
      list.sort((a, b) => (a.progress || 0) - (b.progress || 0));
    } else if (sortOrder === 'QTY_DESC') {
      list.sort((a, b) => {
        const getQty = (str) => parseInt((str || '0/0').split('/')[1] || '0', 10);
        return getQty(b.quantity_str) - getQty(a.quantity_str);
      });
    }

    return list;
  };

  const tableColumns = [
    {
      header: 'STT',
      key: 'stt',
      nowrap: true,
      render: (row, idx) => <span style={{ fontWeight: '700', color: '#64748b' }}>{row?.stt || String((idx ?? 0) + 1).padStart(2, '0')}</span>
    },
    {
      header: 'Tên chi tiết',
      key: 'part_name',
      render: (row) => (
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: '700', color: '#1e293b' }}>{row.part_name}</div>
          {row.output_stage && row.output_stage !== '—' && (
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
              👉 Nhận: <span style={{ fontWeight: '600', color: '#0284c7' }}>{row.output_stage}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Số lượng',
      key: 'quantity_str',
      nowrap: true,
      render: (row) => {
        const parts = (row.quantity_str || '0/0').split('/');
        const actual = parts[0];
        const plan = parts[1];
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: '800', color: 'var(--accent-color)' }}>{actual}</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', borderTop: '1px solid #e2e8f0', marginTop: '2px' }}>KH: {plan}</div>
          </div>
        );
      }
    },
    {
      header: 'Tiến độ',
      key: 'progress',
      render: (row) => <span style={{ fontWeight: '700', color: '#475569' }}>{row.progress}%</span>
    },
    {
      header: 'Khu vực',
      key: 'area',
      render: (row) => <span style={{ fontWeight: '700', color: '#475569' }}>{row.area}</span>
    },
    {
      header: 'Trạng thái',
      key: 'status',
      render: (row) => (
        <span style={{
          backgroundColor: 
            row.status === 'Hoàn thành' ? '#dcfce7' : 
            row.status === 'Đang SX' ? '#dbeafe' : '#fee2e2',
          color: 
            row.status === 'Hoàn thành' ? '#166534' : 
            row.status === 'Đang SX' ? '#1e40af' : '#991b1b',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '0.72rem',
          fontWeight: '700',
          whiteSpace: 'nowrap',
          display: 'inline-block'
        }}>
          {row.status}
        </span>
      )
    }
  ];

  const sortOptions = [
    { label: 'Mặc định', value: 'DEFAULT' },
    { label: 'Tên chi tiết (A → Z)', value: 'NAME_ASC' },
    { label: 'Tên chi tiết (Z → A)', value: 'NAME_DESC' },
    { label: 'Tiến độ cao nhất trước', value: 'PROGRESS_DESC' },
    { label: 'Tiến độ thấp nhất trước', value: 'PROGRESS_ASC' },
    { label: 'Số lượng kế hoạch lớn nhất', value: 'QTY_DESC' },
  ];

  const hasActiveFilter = statusFilter !== 'ALL' || searchQuery.trim() !== '';
  const hasActiveSort = sortOrder !== 'DEFAULT';

  return (
    <Layout>
      <PageHeader title="Thông tin sản xuất" subTitle="CL03: Chi tiết lệnh sản xuất" />

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, backgroundColor: '#faf6f1', paddingBottom: '56px' }}>
        
        {/* Sticky Toolbar (below PageHeader) */}
        <div style={{ position: 'sticky', top: 0, zIndex: 8, backgroundColor: '#faf6f1', borderBottom: '1px solid #e2e8f0' }}>
          {/* Toolbar: Select PO & Action Buttons */}
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', padding: '0 10px', height: '40px' }}>
              <span style={{ fontSize: '0.84rem', color: '#334155', fontWeight: '700', marginRight: '6px' }}>PO:</span>
              <select
                value={currentPo}
                onChange={(e) => navigate(`/production/order-detail/${encodeURIComponent(e.target.value)}`)}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.84rem', fontWeight: '800', outline: 'none', color: '#1e293b' }}
              >
                {(data?.all_pos && data.all_pos.length > 0 ? data.all_pos : [currentPo]).map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>

            {/* Sort Button */}
            <button 
              onClick={() => setShowSortModal(true)}
              style={{ 
                border: hasActiveSort ? '1px solid #f9dcc5' : '1px solid #cbd5e1', 
                backgroundColor: hasActiveSort ? '#fdf3ea' : '#fff', 
                borderRadius: '8px',
                cursor: 'pointer', 
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowUpDown size={18} color={hasActiveSort ? '#7c5438' : '#432818'} />
            </button>

            {/* Filter Toggle Button */}
            <button 
              onClick={() => setShowFilter(!showFilter)}
              style={{ 
                border: hasActiveFilter ? '1px solid #f9dcc5' : '1px solid #cbd5e1', 
                backgroundColor: hasActiveFilter ? '#fdf3ea' : '#fff', 
                borderRadius: '8px',
                cursor: 'pointer', 
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Filter size={18} color={hasActiveFilter ? '#7c5438' : '#432818'} />
            </button>
          </div>

          {/* Expandable Filter Panel */}
          {showFilter && (
            <div style={{
              padding: '0 14px 12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              animation: 'slideDown 0.2s ease-out'
            }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm tên chi tiết, vách, ke góc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 32px 8px 32px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none',
                    backgroundColor: '#fff',
                    color: '#1e293b',
                    boxSizing: 'border-box'
                  }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                {[
                  { label: 'Tất cả', value: 'ALL' },
                  { label: 'Chưa SX', value: 'Chưa SX' },
                  { label: 'Đang SX', value: 'Đang SX' },
                  { label: 'Hoàn thành', value: 'Hoàn thành' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setStatusFilter(opt.value)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      border: statusFilter === opt.value ? 'none' : '1px solid #cbd5e1',
                      backgroundColor: statusFilter === opt.value ? 'var(--primary-color)' : '#fff',
                      color: statusFilter === opt.value ? '#fff' : '#475569',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stage Accordions */}
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading || !data ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Đang tải chi tiết Lệnh sản xuất...</div>
          ) : (
            data.stages.map((st, idx) => {
              const processedDetails = getProcessedDetails(st.details);
              return (
                <CollapsibleCard
                  key={st.stage_id}
                  title={st.stage_name}
                  progress={st.progress}
                  defaultOpen={false}
                >
                  <div style={{ padding: '8px' }}>
                    <DataTable columns={tableColumns} data={processedDetails} />
                  </div>
                </CollapsibleCard>
              );
            })
          )}
        </div>

      </div>

      {/* Sort Selection Bottom Sheet Modal */}
      {showSortModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowSortModal(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)', animation: 'slideUp 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>Sắp xếp chi tiết</h3>
              <button onClick={() => setShowSortModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortOptions.map(opt => {
                const isSelected = sortOrder === opt.value;
                return (
                  <button 
                    key={opt.value} 
                    onClick={() => { setSortOrder(opt.value); setShowSortModal(false); }} 
                    style={{ 
                      display: 'flex', 
                      justify: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      borderRadius: '12px', 
                      border: isSelected ? '1.5px solid var(--primary-color)' : '1px solid #e2e8f0', 
                      backgroundColor: isSelected ? '#fdf3ea' : '#f8fafc', 
                      fontWeight: isSelected ? '800' : '600', 
                      color: isSelected ? 'var(--primary-color)' : '#334155', 
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={18} color="var(--primary-color)" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProductionOrderDetailView;
