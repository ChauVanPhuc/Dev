import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, ArrowUpDown, Filter, Lock, Search, X, Check } from 'lucide-react';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import useAuthStore from '@modules/auth/Models/authModel';
import apiClient from '@shared/services/api';

const ProductionOrdersView = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [expandedPo, setExpandedPo] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const pageSize = 10;

  // Filter & Sort state
  const [showFilter, setShowFilter] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('DEFAULT');

  // Role & Permission Calculation
  const userRoleStr = (user?.role_name || user?.role_description || '').toLowerCase();
  const userDeptStr = (user?.department_name || user?.permission_name || '').toLowerCase();
  const combinedAuth = `${userRoleStr} | ${userDeptStr}`;

  const isFullAccess = ['qa', 'quan ly', 'manager', 'bgd', 'admin', 'it', 'lead'].some(r => combinedAuth.includes(r)) || !user;

  // Map category tab labels
  const categoriesList = [
    { key: 'Tất cả', label: 'Tất cả' },
    { key: 'Vanity 1', label: 'Vanity 1 (NM1)' },
    { key: 'Vanity 2', label: 'Vanity 2 (NM2)' },
    { key: 'Furniture', label: 'Furniture (NM3)' }
  ];

  // User assigned factory
  const userFactory = user?.assigned_factory || (combinedAuth.includes('nm2') ? 'NM2' : (combinedAuth.includes('nm3') ? 'NM3' : 'NM1'));

  // Fetch available months from product_plans table on mount
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const resp = await apiClient.get('/production-v2/available-months');
        const months = resp.data?.months || [];
        setAvailableMonths(months);
        // Auto-select current month if available, otherwise first in list
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

  useEffect(() => {
    if (!isFullAccess) {
      if (userFactory === 'NM1' && activeCategory !== 'Vanity 1') setActiveCategory('Vanity 1');
      if (userFactory === 'NM2' && activeCategory !== 'Vanity 2') setActiveCategory('Vanity 2');
      if (userFactory === 'NM3' && activeCategory !== 'Furniture') setActiveCategory('Furniture');
    }
  }, [isFullAccess, userFactory, activeCategory]);

  useEffect(() => {
    if (selectedMonth === null) return;
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const resp = await apiClient.get(`/production-v2/orders?month=${selectedMonth}&category=${encodeURIComponent(activeCategory)}&user_role=${encodeURIComponent(userRoleStr)}&user_factory=${encodeURIComponent(userFactory)}&page=${currentPage}&limit=${pageSize}`);
        setOrders(resp.data?.orders || []);
        setTotalOrders(resp.data?.total || 0);
        setTotalPages(resp.data?.total_pages || 1);
      } catch (err) {
        console.error('Lỗi khi tải danh sách Lệnh sản xuất:', err);
        setOrders([]);
        setTotalOrders(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [selectedMonth, activeCategory, userRoleStr, userFactory, currentPage]);

  const toggleExpand = (po_code) => {
    setExpandedPo(prev => (prev === po_code ? null : po_code));
  };

  const handleOpenDetail = (po_code) => {
    navigate(`/production/order-detail/${encodeURIComponent(po_code)}`);
  };

  const handleCategoryChange = (catKey) => {
    setActiveCategory(catKey);
    setCurrentPage(1);
  };

  const handleMonthChange = (monthVal) => {
    setSelectedMonth(monthVal);
    setCurrentPage(1);
  };

  // Filter and Sort orders
  const getProcessedOrders = (ordersList) => {
    if (!ordersList || !Array.isArray(ordersList)) return [];
    let list = [...ordersList];

    if (statusFilter === 'Chưa SX') {
      list = list.filter(o => o.overall_progress === 0);
    } else if (statusFilter === 'Đang SX') {
      list = list.filter(o => o.overall_progress > 0 && o.overall_progress < 100);
    } else if (statusFilter === 'Hoàn thành') {
      list = list.filter(o => o.overall_progress >= 100);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(o => 
        (o.po_code || '').toLowerCase().includes(q) ||
        (o.items && o.items.some(it => (it.product_name || '').toLowerCase().includes(q)))
      );
    }

    if (sortOrder === 'PO_ASC') {
      list.sort((a, b) => (a.po_code || '').localeCompare(b.po_code || ''));
    } else if (sortOrder === 'PO_DESC') {
      list.sort((a, b) => (b.po_code || '').localeCompare(a.po_code || ''));
    } else if (sortOrder === 'PROGRESS_DESC') {
      list.sort((a, b) => (b.overall_progress || 0) - (a.overall_progress || 0));
    } else if (sortOrder === 'PROGRESS_ASC') {
      list.sort((a, b) => (a.overall_progress || 0) - (b.overall_progress || 0));
    }

    return list;
  };

  const sortOptions = [
    { label: 'Mặc định', value: 'DEFAULT' },
    { label: 'Mã PO (A → Z)', value: 'PO_ASC' },
    { label: 'Mã PO (Z → A)', value: 'PO_DESC' },
    { label: 'Tiến độ cao nhất trước', value: 'PROGRESS_DESC' },
    { label: 'Tiến độ thấp nhất trước', value: 'PROGRESS_ASC' },
  ];

  const hasActiveFilter = statusFilter !== 'ALL' || searchQuery.trim() !== '';
  const hasActiveSort = sortOrder !== 'DEFAULT';

  const processedOrders = getProcessedOrders(orders);

  return (
    <Layout>
      <PageHeader title="Thông tin sản xuất" subTitle="CL02: Lệnh sản xuất" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, backgroundColor: '#faf6f1', position: 'relative' }}>
        
        {/* Sticky Toolbar + Tabs (below PageHeader) */}
        <div style={{ position: 'sticky', top: 0, zIndex: 8, backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          {/* Toolbar */}
          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '10px', backgroundColor: '#f8fafc', padding: '0 10px', height: '38px' }}>
              <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '800', marginRight: '6px', whiteSpace: 'nowrap' }}>Lệnh SX:</span>
              <select
                value={selectedMonth || ''}
                onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
                style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.84rem', fontWeight: '800', outline: 'none', color: '#1e293b', cursor: 'pointer' }}
              >
                {availableMonths.map(m => (
                  <option key={m.plan_id} value={m.month}>Tháng {m.month}</option>
                ))}
              </select>
            </div>

            {/* Sort Button */}
            <button 
              onClick={() => setShowSortModal(true)}
              style={{ 
                border: hasActiveSort ? '1.5px solid #432818' : '1px solid #cbd5e1', 
                backgroundColor: hasActiveSort ? '#fdf3ea' : '#fff', 
                borderRadius: '10px',
                cursor: 'pointer', 
                padding: '8px',
                height: '38px', width: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowUpDown size={16} color={hasActiveSort ? '#432818' : '#64748b'} />
            </button>

            {/* Filter Button */}
            <button 
              onClick={() => setShowFilter(!showFilter)}
              style={{ 
                border: hasActiveFilter ? '1.5px solid #432818' : '1px solid #cbd5e1', 
                backgroundColor: hasActiveFilter ? '#fdf3ea' : '#fff', 
                borderRadius: '10px',
                cursor: 'pointer', 
                padding: '8px',
                height: '38px', width: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Filter size={16} color={hasActiveFilter ? '#432818' : '#64748b'} />
            </button>
          </div>

          {/* Expandable Filter Panel */}
          {showFilter && (
            <div style={{
              padding: '0 14px 10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              animation: 'slideDown 0.2s ease-out'
            }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Tìm mã PO (APT-0069, FOL-0459...), tên sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 30px 7px 30px',
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
                    style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
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
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '0.72rem',
                      fontWeight: '800',
                      border: statusFilter === opt.value ? 'none' : '1px solid #cbd5e1',
                      backgroundColor: statusFilter === opt.value ? '#432818' : '#fff',
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

          {/* Category Tabs */}
          <div style={{ display: 'flex', borderTop: '1px solid #f1f5f9', backgroundColor: '#fff', padding: '0 8px', overflowX: 'auto' }}>
            {categoriesList.map(cat => {
              const isDisabled = !isFullAccess && (
                (userFactory === 'NM1' && cat.key !== 'Vanity 1') ||
                (userFactory === 'NM2' && cat.key !== 'Vanity 2') ||
                (userFactory === 'NM3' && cat.key !== 'Furniture')
              );
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleCategoryChange(cat.key)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? '900' : '600',
                    color: isDisabled ? '#cbd5e1' : (isActive ? '#432818' : '#64748b'),
                    borderBottom: isActive ? '2.5px solid #432818' : '2.5px solid transparent',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{cat.label}</span>
                  {isDisabled && <Lock size={11} color="#cbd5e1" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* POs Accordion List */}
        <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '0.85rem' }}>Đang tải danh sách Lệnh sản xuất...</div>
          ) : processedOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>
              Không tìm thấy Lệnh sản xuất phù hợp với bộ lọc
            </div>
          ) : (
            processedOrders.map((po, idx) => {
              const isExpanded = expandedPo === po.po_code;
              return (
                <div
                  key={`po-${po.po_code}-${idx}`}
                  style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'border-color 0.15s ease'
                  }}
                >
                  {/* Accordion Header */}
                  <div
                    onClick={() => toggleExpand(po.po_code)}
                    style={{
                      padding: '11px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      userSelect: 'none',
                      backgroundColor: isExpanded ? '#fdfaf6' : '#fff'
                    }}
                  >
                    <span
                      onClick={(e) => { e.stopPropagation(); handleOpenDetail(po.po_code); }}
                      style={{ 
                        fontSize: '1.02rem', 
                        fontWeight: '900', 
                        color: '#432818', 
                        flexShrink: 0, 
                        width: '128px',
                        minWidth: '128px',
                        textDecoration: 'none', 
                        letterSpacing: '-0.2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                      title={po.po_code}
                    >
                      {po.po_code}
                    </span>

                    {/* Progress bar */}
                    <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${po.overall_progress}%`, backgroundColor: po.progress_color || '#16a34a', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                    </div>

                    <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#334155', flexShrink: 0, width: '42px', minWidth: '42px', textAlign: 'right' }}>
                      {po.overall_progress}%
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded Body: SKU Table */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #e2e8f0', overflowX: 'auto' }}>
                      {/* Table Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 1fr 50px 65px 80px',
                        backgroundColor: '#432818',
                        color: '#fff',
                        padding: '7px 8px',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        textAlign: 'center',
                        alignItems: 'center'
                      }}>
                        <span>STT</span>
                        <span style={{ textAlign: 'left', paddingLeft: '4px' }}>Tên sản phẩm</span>
                        <span>Tiến độ</span>
                        <span>Số lượng</span>
                        <span>Trạng thái</span>
                      </div>

                      {/* Table Rows */}
                      <div>
                        {po.items.map((item, itemIdx) => {
                          let badgeBg = '#fef2f2';
                          let badgeColor = '#dc2626';
                          if (item.status === 'Hoàn thành') {
                            badgeBg = '#f0fdf4';
                            badgeColor = '#16a34a';
                          } else if (item.status === 'Đang SX') {
                            badgeBg = '#eff6ff';
                            badgeColor = '#2563eb';
                          }

                          return (
                            <div
                              key={itemIdx}
                              onClick={() => handleOpenDetail(po.po_code)}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '32px 1fr 50px 65px 80px',
                                padding: '9px 8px',
                                borderBottom: itemIdx < po.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                                backgroundColor: itemIdx % 2 === 0 ? '#fff' : '#fafafa',
                                fontSize: '0.78rem',
                                alignItems: 'center',
                                textAlign: 'center',
                                cursor: 'pointer'
                              }}
                            >
                              <span style={{ fontWeight: '700', color: '#94a3b8' }}>{item.stt}</span>
                              <span style={{ textAlign: 'left', paddingLeft: '4px', fontWeight: '700', color: '#1e293b', wordBreak: 'break-word' }}>{item.product_name}</span>
                              <span style={{ fontWeight: '800', color: '#334155' }}>{item.progress}%</span>
                              <span style={{ fontWeight: '700', color: '#475569' }}>{item.quantity_str}</span>
                              <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  fontWeight: '800',
                                  backgroundColor: badgeBg,
                                  color: badgeColor,
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar - Fixed inside frame at bottom */}
        {!loading && totalOrders > 0 && (
          <div style={{
            position: 'sticky',
            bottom: 0,
            marginTop: 'auto',
            width: '100%',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '8px 12px',
            backgroundColor: '#fff',
            borderTop: '1px solid #e2e8f0',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
            zIndex: 10
          }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{
                width: '32px', height: '32px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                backgroundColor: currentPage <= 1 ? '#f8fafc' : '#fff',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: currentPage <= 1 ? '#cbd5e1' : '#334155',
                fontSize: '0.95rem', fontWeight: '800'
              }}
            >
              ‹
            </button>

            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>
              Hiển thị {Math.min((currentPage - 1) * pageSize + 1, totalOrders)} đến{' '}
              <input
                type="number"
                value={currentPage}
                min={1}
                max={totalPages}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (val >= 1 && val <= totalPages) setCurrentPage(val);
                }}
                style={{
                  width: '34px', textAlign: 'center',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 0',
                  fontSize: '0.8rem',
                  fontWeight: '800',
                  color: '#1e293b',
                  outline: 'none',
                  margin: '0 2px'
                }}
              />
              {' '}trên {totalOrders} kết quả
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                width: '32px', height: '32px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                backgroundColor: currentPage >= totalPages ? '#f8fafc' : '#fff',
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: currentPage >= totalPages ? '#cbd5e1' : '#334155',
                fontSize: '0.95rem', fontWeight: '800'
              }}
            >
              ›
            </button>
          </div>
        )}

      </div>

      {/* Sort Selection Bottom Sheet Modal */}
      {showSortModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={() => setShowSortModal(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '20px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)', animation: 'slideUp 0.25s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: '900', color: '#1e293b', margin: 0 }}>Sắp xếp Lệnh sản xuất</h3>
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

export default ProductionOrdersView;
