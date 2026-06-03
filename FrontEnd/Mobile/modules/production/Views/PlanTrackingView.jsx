import { useState, useEffect, useMemo } from 'react'
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout'
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader'
import CustomSelect from '@mobile/Shared/Views/components/form/CustomSelect'
import CollapsibleCard from '@mobile/Shared/Views/components/ui/CollapsibleCard'
import DataTable from '@mobile/Shared/Views/components/ui/DataTable'
import { usePlanController } from '@modules/production/Controllers/planController'
import { X, CheckCircle2, Clock, AlertCircle, Filter, ArrowDownWideNarrow, Check, Search, Calendar } from 'lucide-react'
import useAuthStore from '@modules/auth/Models/authModel'
import apiClient from '@shared/services/api'

/**
 * PlanTracking Screen
 */
const PlanTracking = () => {
  const { plans, fetchPlans, fetchDeliveriesByPlan, fetchPlanDetail, loading: controllerLoading } = usePlanController()
  const { user } = useAuthStore()
  const userRoleStr = [
    user?.permission_description,
    user?.permission_name,
    user?.role_description,
    user?.role_name,
    user?.full_name,
    user?.username
  ].filter(Boolean).join(' ').toLowerCase().normalize('NFC');
  const isAdmin = userRoleStr.includes('admin');
  const showStageSelect = isAdmin || (user?.stageNames && user.stageNames.length > 1);

  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedOrderCode, setSelectedOrderCode] = useState('ALL')
  const [deliveries, setDeliveries] = useState([])
  const [detailedPlan, setDetailedPlan] = useState(null)
  const [displayOrders, setDisplayOrders] = useState([])
  const [currentPage, setCurrentPage] = useState(1) // [NEW] Trang hiện tại
  const [totalOrders, setTotalOrders] = useState(0)
  const itemsPerPage = 15
  const totalPages = Math.ceil(totalOrders / itemsPerPage)
  const [loadingMore, setLoadingMore] = useState(false)
  const [detailModal, setDetailModal] = useState({ isOpen: false, product: null })
  const [loading, setLoading] = useState(false)

  // State cho bộ lọc
  const [filterModal, setFilterModal] = useState(false)
  const [sortModal, setSortModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortOrder, setSortOrder] = useState('NAME_ASC')
  const [activePrefix, setActivePrefix] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const userStage = user?.activeStageDescription || user?.activeStageName || user?.stage_description || user?.stage_name || '';

  useEffect(() => {
    fetchPlans(userStage)
  }, [fetchPlans, userStage])

  const sortedPlans = useMemo(() => {
    if (!Array.isArray(plans)) return [];
    return [...plans].sort((a, b) => {
      const yearA = a.year || 0;
      const yearB = b.year || 0;
      const monthA = a.month || 0;
      const monthB = b.month || 0;

      if (yearA !== yearB) return yearB - yearA;
      return monthB - monthA;
    });
  }, [plans]);

  const planOptions = useMemo(() => {
    return sortedPlans.map(p => ({ label: p.name, value: p.id.toString() }));
  }, [sortedPlans]);

  // Rút gọn tên kế hoạch để hiển thị trên Mobile (Giữ nguyên dữ liệu gốc)
  const formatPlanLabel = (name) => {
    if (!name) return 'Không tên';
    const dates = name.match(/\d{2}\/\d{2}/g);
    if (dates && dates.length >= 2) return `KHSX: ${dates[0]} - ${dates[1]}`;
    return name.replace('KẾ HOẠCH SẢN XUẤT - ', 'KHSX: ');
  };

  const shortPlanOptions = useMemo(() => {
    return sortedPlans.map(p => ({ label: formatPlanLabel(p.name), value: p.id.toString() }));
  }, [sortedPlans]);

  // Ưu tiên dùng detailedPlan nếu có để có dữ liệu BOM
  const currentPlan = detailedPlan || plans.find(p => p.id.toString() === selectedPlanId)

  // [FIX] Dùng plans (dữ liệu đầy đủ) cho dropdown PO, không dùng detailedPlan (chỉ có 15 đơn/trang)
  const fullPlan = plans.find(p => p.id.toString() === selectedPlanId)
  const orderOptions = [
    { label: 'Tất cả đơn', value: 'ALL' },
    ...(fullPlan && Array.isArray(fullPlan.orders) ? fullPlan.orders.map(o => ({ label: o.name || o.order_code, value: o.name || o.order_code })) : [])
  ]

  useEffect(() => { if (planOptions.length > 0 && !selectedPlanId) setSelectedPlanId(planOptions[0].value) }, [planOptions, selectedPlanId])
  useEffect(() => {
    // Reset toàn bộ trạng thái về mặc định khi đổi Kế hoạch
    setActivePrefix('ALL')
    setSearchQuery('')
    setStatusFilter('ALL')
    setSortOrder('NAME_ASC')
    setSelectedOrderCode('ALL') // [FIX] Reset PO khi đổi kế hoạch
    setCurrentPage(1)
    setDisplayOrders([])
    setDetailedPlan(null)
    setTotalOrders(0)
    setDeliveries([])

    if (selectedPlanId) {
      loadPage(1, 'ALL', '', 'ALL', 'NAME_ASC', 'ALL')
    }
  }, [selectedPlanId])

  // Tải dữ liệu bàn giao CHỈ KHI người dùng xem chi tiết (để tiết kiệm băng thông)
  useEffect(() => {
    if (detailModal.isOpen && selectedPlanId && deliveries.length === 0) {
      fetchDeliveriesByPlan(selectedPlanId, 0, 1000).then(data => {
        setDeliveries(data || [])
      })
    }
  }, [detailModal.isOpen, selectedPlanId])

  // [FIX] Hàm tải trang — định nghĩa TRƯỚC các useEffect để tránh stale closure
  const loadPage = async (page, p_activePrefix, p_searchQuery, p_status, p_sort, p_orderCode) => {
    if (!selectedPlanId) return;
    // Dùng giá trị truyền vào, fallback sang state hiện tại
    const _prefix = p_activePrefix !== undefined ? p_activePrefix : activePrefix
    const _search = p_searchQuery !== undefined ? p_searchQuery : searchQuery
    const _status = p_status !== undefined ? p_status : statusFilter
    const _sort = p_sort !== undefined ? p_sort : sortOrder
    const _order = p_orderCode !== undefined ? p_orderCode : selectedOrderCode

    setLoading(true)
    try {
      const skip = (page - 1) * itemsPerPage
      const qParam = _search.trim() ? `&q=${encodeURIComponent(_search.trim())}` : ''
      const prefixParam = _prefix !== 'ALL' ? `&prefix=${encodeURIComponent(_prefix)}` : ''
      const statusParam = `&status=${_status}`
      const sortParam = `&sort_order=${_sort}`
      const orderCodeParam = _order !== 'ALL' ? `&exact_order=${encodeURIComponent(_order)}` : ''
      const stageParam = userStage ? `&user_stage=${encodeURIComponent(userStage)}` : ''

      const url = `plans/${selectedPlanId}?skip=${skip}&limit=${itemsPerPage}${qParam}${prefixParam}${statusParam}${sortParam}${orderCodeParam}${stageParam}`

      const response = await apiClient.get(url)
      const data = response.data
      if (data) {
        setDetailedPlan(data)
        setDisplayOrders(data.orders || [])
        setTotalOrders(data.total_orders || 0)
        setCurrentPage(page)
      }
    } catch (err) {
      console.error('[MB4 loadPage ERROR]', err)
    } finally {
      setLoading(false)
    }
  }

  // [FIX] Tự động tải lại Trang 1 khi thay đổi bộ lọc, sắp xếp, đơn hàng, hoặc công đoạn (userStage)
  // Truyền trực tiếp giá trị mới vào loadPage để tránh stale closure
  useEffect(() => {
    if (selectedPlanId) {
      loadPage(1, activePrefix, searchQuery, statusFilter, sortOrder, selectedOrderCode)
    }
  }, [statusFilter, sortOrder, selectedOrderCode, userStage])

  // Các hàm xử lý sự kiện lọc/sắp xếp
  const handleFilterChange = (newPrefix) => {
    setActivePrefix(newPrefix)
    loadPage(1, newPrefix, searchQuery, statusFilter, sortOrder, selectedOrderCode)
  }

  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery)
    loadPage(1, activePrefix, newQuery, statusFilter, sortOrder, selectedOrderCode)
  }

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus)
    setFilterModal(false)
  }

  const handleSortChange = (newSort) => {
    setSortOrder(newSort)
    setSortModal(false)
  }

  const handlePageChange = async (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return
    setLoadingMore(true)
    try {
      const skip = (newPage - 1) * itemsPerPage
      const qParam = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ''
      const prefixParam = activePrefix !== 'ALL' ? `&prefix=${encodeURIComponent(activePrefix)}` : ''
      const statusParam = `&status=${statusFilter}`
      const sortParam = `&sort_order=${sortOrder}`
      const orderCodeParam = selectedOrderCode !== 'ALL' ? `&exact_order=${encodeURIComponent(selectedOrderCode)}` : ''
      const stageParam = userStage ? `&user_stage=${encodeURIComponent(userStage)}` : ''

      const response = await apiClient.get(`plans/${selectedPlanId}?skip=${skip}&limit=${itemsPerPage}${qParam}${prefixParam}${statusParam}${sortParam}${orderCodeParam}${stageParam}`)
      if (response.data) {
        setDetailedPlan(response.data)
        setDisplayOrders(response.data.orders || [])
        setTotalOrders(response.data.total_orders || 0)
        setCurrentPage(newPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (err) {
      console.error('Error changing page:', err)
    } finally {
      setLoadingMore(false)
    }
  }

  const TabItem = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: '10px', backgroundColor: active ? 'var(--primary-color)' : '#fff', color: active ? '#fff' : '#64748b', border: active ? 'none' : '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap', transition: 'all 0.2s ease' }}>
      {label}
    </button>
  );

  const getAugmentedProducts = (order) => {
    if (!order?.products) return [];

    return order.products.map(p => {
      let tPlanned = 0, tDelivered = 0;

      // Lấy nguồn dữ liệu BOM (Ưu tiên bom_details, sau đó đến components)
      const rawBom = p.bom_details || p.components || p.parts || [];

      // Hàm đệ quy để tính toán tiến độ cho từng chi tiết
      const processItems = (items) => {
        if (!items || !Array.isArray(items)) return [];

        return items.map(item => {
          // Lấy số liệu ĐÃ TÍNH TOÁN TỪ BACKEND
          const planned = item.planned || 0;
          const delivered = item.delivered || 0;

          tPlanned += planned;
          tDelivered += delivered;

          // Xử lý đệ quy cho các cấp con (nếu có)
          const children = processItems(item.parts || item.components || item.children || item.bom_details);

          return {
            name: item.name,
            planned,
            delivered,
            status: delivered >= planned && planned > 0 ? 'Xong' : (delivered > 0 ? 'Dở dang' : 'Chờ'),
            subParts: children // Hiển thị các chi tiết cấp con bên dưới
          };
        });
      };

      const breakdown = processItems(rawBom);

      // ƯU TIÊN TIẾN ĐỘ TỪ SERVER (đã được tính toán chính xác trên toàn bộ DB)
      let finalProgress = tPlanned > 0 ? (tDelivered / tPlanned) * 100 : 0;
      if (typeof p.progress === 'number') {
        finalProgress = p.progress;
      }

      const roundedProgress = Math.min(100, Math.round(finalProgress));

      return {
        ...p,
        delivered: tDelivered,
        totalPlannedParts: tPlanned,
        progress: roundedProgress,
        status: roundedProgress >= 100 ? 'Hoàn thành' : (roundedProgress > 0 ? 'Đang làm' : 'Chờ làm'),
        breakdown
      };
    });
  }

  const getOrderProgress = (order) => {
    const products = getAugmentedProducts(order)
    if (products.length === 0) return 0
    const sumProg = products.reduce((s, p) => s + p.progress, 0)
    return Math.round(sumProg / products.length)
  }

  const prefixes = useMemo(() => {
    // Luôn ưu tiên dùng danh sách prefixes do Server tính toán cho TOÀN BỘ Kế hoạch
    if (detailedPlan?.prefixes && Array.isArray(detailedPlan.prefixes)) {
      return detailedPlan.prefixes
    }

    // Chỉ tính toán thủ công nếu server chưa phản hồi (để tránh màn hình bị trống Tab khi đang load)
    const ordersToProcess = detailedPlan?.orders || currentPlan?.orders || []
    if (ordersToProcess.length === 0) return []

    const set = new Set();
    ordersToProcess.forEach(o => {
      const p = (o.name || o.order_code || '').split('-')[0];
      if (p && p.length < 10) set.add(p.toUpperCase().trim());
    });
    return Array.from(set).sort()
  }, [detailedPlan, currentPlan])

  const getFilteredOrders = () => {
    return displayOrders || []
  }

  const filteredOrders = getFilteredOrders()

  const SelectionModal = ({ isOpen, onClose, title, options, value, onChange }) => {
    if (!isOpen) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div onClick={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} />
        <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '24px', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><h3 style={{ fontSize: '1.2rem', fontWeight: '900' }}>{title}</h3><button onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={24} /></button></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{options.map(opt => (<button key={opt.value} onClick={() => { onChange(opt.value); onClose(); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderRadius: '16px', backgroundColor: value === opt.value ? 'rgba(124, 82, 59, 0.05)' : 'transparent', border: value === opt.value ? '1px solid var(--primary-color)' : '1px solid #f1f5f9' }}><span style={{ fontWeight: value === opt.value ? '800' : '600', color: value === opt.value ? 'var(--primary-color)' : '#475569' }}>{opt.label}</span>{value === opt.value && <Check size={20} color="var(--primary-color)" strokeWidth={3} />}</button>))}</div>
        </div>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
      </div>
    );
  };

  return (
    <Layout>
      <PageHeader title="G7 - Smart Flow" subTitle="MB4 | Theo dõi kế hoạch" />

      <div style={{ position: 'sticky', top: showStageSelect ? '94px' : '58px', zIndex: 99, backgroundColor: 'var(--bg-cream)', padding: '16px 16px 4px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
          <div id="plan-select-calendar" style={{ width: '165px', minWidth: 0, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, pointerEvents: 'none' }}><Calendar size={16} color="#7c5438" /></div>
            <CustomSelect value={selectedPlanId} options={shortPlanOptions} onChange={setSelectedPlanId} style={{ paddingLeft: '34px', height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
          </div>
          <div id="plan-select-order" style={{ flex: 1, minWidth: 0 }}>
            <CustomSelect value={selectedOrderCode} options={orderOptions} onChange={setSelectedOrderCode} style={{ height: '42px', borderRadius: '12px', fontSize: '0.85rem' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
          <div id="plan-search-box" style={{ flex: 1, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Search size={16} /></div>
            <input type="text" placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '0.85rem', fontWeight: '600', outline: 'none' }} />
          </div>
          <div id="plan-filter-buttons" style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setFilterModal(true)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', position: 'relative' }}>
              <Filter size={18} color={statusFilter !== 'ALL' ? 'var(--primary-color)' : '#7c5438'} />
              {statusFilter !== 'ALL' && <div style={{ position: 'absolute', top: 2, right: 2, width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-color)' }} />}
            </button>
            <button onClick={() => setSortModal(true)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' }}>
              <ArrowDownWideNarrow size={18} color={sortOrder.includes('PROGRESS') ? 'var(--primary-color)' : '#7c5438'} />
            </button>
          </div>
        </div>

        {prefixes.length > 0 && (
          <div id="plan-prefix-tabs" style={{ display: 'flex', overflowX: 'auto', gap: '6px', paddingBottom: '8px', marginBottom: '4px', scrollbarWidth: 'none' }}>
            <TabItem label="Tất cả" active={activePrefix === 'ALL'} onClick={() => handleFilterChange('ALL')} />
            {prefixes.map(p => <TabItem key={p} label={p} active={activePrefix === p} onClick={() => handleFilterChange(p)} />)}
          </div>
        )}
      </div>

      <div id="plan-orders-list" className="page-content" style={{ padding: '0 16px 16px 16px', backgroundColor: 'var(--bg-cream)', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '8px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#64748b', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            TIẾN ĐỘ (Trang {currentPage}/{totalPages || 1})
          </h4>
        </div>

        {(loading || controllerLoading || loadingMore) ? <div style={{ textAlign: 'center', padding: '40px' }}><p style={{ color: '#64748b' }}>Đang tải dữ liệu...</p></div> : (
          filteredOrders.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}><p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>Trống</p></div> :
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' }}>
              {filteredOrders.map(order => (
                <CollapsibleCard key={order.id} title={order.name || order.order_code} progress={getOrderProgress(order)} defaultOpen={selectedOrderCode !== 'ALL' || searchQuery !== ''}>
                  <DataTable columns={[{ header: 'Mã SP', key: 'sku', render: (row) => <div style={{ textAlign: 'left', paddingLeft: '4px' }}>{row.sku || row.name || '---'}</div> }, { header: 'KH', key: 'quantity', nowrap: true, render: (row) => row.quantity || 0 }, { header: 'Tiến độ', key: 'progress', nowrap: true, render: (row) => <span style={{ fontSize: '0.8rem', fontWeight: '800' }}>{row.progress}%</span> }, { header: 'Trạng thái', key: 'status', render: (row) => <span style={{ color: row.status === 'Hoàn thành' ? 'var(--status-success)' : (row.status === 'Đang làm' ? '#3b82f6' : '#94a3b8'), fontWeight: '700', fontSize: '0.75rem' }}>{row.status}</span> }]} data={getAugmentedProducts(order)} onRowClick={(row) => setDetailModal({ isOpen: true, product: row, activeTab: 'bom' })} />
                </CollapsibleCard>
              ))}

              {/* Thanh phân trang kiểu Table */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px', padding: '10px 0 40px' }}>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === 1 ? 0.4 : 1 }}
                  >
                    «
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === 1 ? 0.4 : 1 }}
                  >
                    ‹
                  </button>

                  <div style={{ padding: '8px 16px', borderRadius: '12px', backgroundColor: 'var(--primary-color)', color: '#fff', fontWeight: '900', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(124, 82, 59, 0.2)' }}>
                    {currentPage} / {totalPages}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === totalPages ? 0.4 : 1 }}
                  >
                    ›
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fff', color: '#64748b', fontWeight: '800', opacity: currentPage === totalPages ? 0.4 : 1 }}
                  >
                    »
                  </button>
                </div>
              )}
            </div>
        )}

        {detailModal.isOpen && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div onClick={() => setDetailModal({ ...detailModal, isOpen: false })} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)' }} />
            <div style={{ position: 'relative', width: '100%', maxWidth: '450px', backgroundColor: '#fff', borderRadius: '30px', display: 'flex', flexDirection: 'column', maxHeight: '88vh', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                <div><h3 style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b' }}>Chi tiết cấu thành</h3><span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600' }}>{detailModal.product?.sku}</span></div>
                <button onClick={() => setDetailModal({ ...detailModal, isOpen: false })} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} strokeWidth={2.5} /></button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f8fafc' }}>
                {/* Tab điều hướng nhỏ trong Modal */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <button
                    onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'bom' }))}
                    style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', border: 'none', backgroundColor: (detailModal.activeTab || 'bom') === 'bom' ? 'var(--primary-color)' : '#e2e8f0', color: (detailModal.activeTab || 'bom') === 'bom' ? '#fff' : '#64748b' }}
                  >
                    Cấu thành (BOM)
                  </button>
                  <button
                    onClick={() => setDetailModal(prev => ({ ...prev, activeTab: 'logs' }))}
                    style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '800', border: 'none', backgroundColor: detailModal.activeTab === 'logs' ? 'var(--primary-color)' : '#e2e8f0', color: detailModal.activeTab === 'logs' ? '#fff' : '#64748b' }}
                  >
                    Lịch sử ({
                      deliveries.filter(d => {
                        const pName = (detailModal.product?.name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
                        const dName = (d.part_name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
                        return dName.includes(pName) || pName.includes(dName);
                      }).length
                    })
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {(detailModal.activeTab || 'bom') === 'bom' ? (
                    detailModal.product?.breakdown?.length > 0 ? (
                      detailModal.product.breakdown.map((comp, cIdx) => (
                        <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', marginBottom: '24px' }}>
                          <div style={{ padding: '16px', borderRadius: '20px', backgroundColor: '#fff', border: comp.status === 'Xong' ? '2px solid #22c55e' : '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: comp.status === 'Xong' ? '#dcfce7' : (comp.status === 'Dở dang' ? '#dbeafe' : '#f1f5f9'), display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '14px' }}>
                                {comp.status === 'Xong' ? <CheckCircle2 size={24} color="#166534" /> : (comp.status === 'Dở dang' ? <Clock size={24} color="#1e40af" /> : <AlertCircle size={24} color="#64748b" />)}
                              </div>
                              <div><div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#0f172a' }}>{comp.name}</div><div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', fontWeight: '600' }}>Tiến độ: <span style={{ color: comp.status === 'Xong' ? '#16a34a' : '#78523b', fontWeight: '900' }}>{comp.delivered}</span> / {comp.planned}</div></div>
                            </div>
                            <div style={{ fontSize: '0.7rem', fontWeight: '900', padding: '4px 10px', borderRadius: '10px', backgroundColor: comp.status === 'Xong' ? '#dcfce7' : (comp.status === 'Dở dang' ? '#dbeafe' : '#f1f5f9'), color: comp.status === 'Xong' ? '#166534' : (comp.status === 'Dở dang' ? '#1e40af' : '#64748b') }}>{comp.status}</div>
                          </div>
                          {comp.subParts?.length > 0 && (
                            <div style={{ marginLeft: '23px', display: 'flex', flexDirection: 'column', borderLeft: '2.5px solid #cbd5e1', paddingLeft: '16px', marginTop: '-10px', paddingTop: '20px' }}>
                              {comp.subParts.map((part, pIdx) => (
                                <div key={pIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: part.status === 'Xong' ? 'rgba(34, 197, 94, 0.05)' : 'transparent', borderRadius: '12px', marginBottom: '6px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                    <div style={{ position: 'absolute', left: '-18px', top: '50%', width: '10px', height: '2px', backgroundColor: '#cbd5e1' }} />
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: part.status === 'Xong' ? '#22c55e' : '#cbd5e1', marginRight: '10px' }} />
                                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: part.status === 'Xong' ? '#1e293b' : '#64748b' }}>{part.name}</span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: part.status === 'Xong' ? '#16a34a' : '#475569', fontWeight: '900' }}>{part.delivered} / {part.planned}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', padding: '40px' }}>
                        <AlertCircle size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Không tìm thấy chi tiết cấu thành cho sản phẩm này.</p>
                      </div>
                    )
                  ) : (
                    /* Tab Lịch sử bàn giao */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {deliveries.filter(d => {
                        const pName = (detailModal.product?.name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
                        const dName = (d.part_name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
                        return dName.includes(pName) || pName.includes(dName);
                      }).length > 0 ? (
                        deliveries.filter(d => {
                          const pName = (detailModal.product?.name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
                          const dName = (d.part_name || '').toLowerCase().normalize('NFC').replace(/\s+/g, '');
                          return dName.includes(pName) || pName.includes(dName);
                        })
                          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                          .map((log, lIdx) => (
                            <div key={lIdx} style={{ padding: '14px', borderRadius: '16px', backgroundColor: '#fff', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '700', marginBottom: '4px' }}>{new Date(log.created_at).toLocaleString('vi-VN')}</div>
                                <div style={{ fontSize: '0.85rem', fontWeight: '900', color: '#1e293b' }}>{log.delivery_stage} → {log.receiving_stage}</div>
                                <div style={{ fontSize: '0.75rem', color: log.status === 'Hoàn thành' ? '#16a34a' : '#3b82f6', fontWeight: '800' }}>Trạng thái: {log.status}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>Số lượng</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '1000', color: 'var(--primary-color)' }}>{log.quantity_received || log.quantity_total || 0}</div>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                          <Clock size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                          <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>Chưa có lịch sử bàn giao cho sản phẩm này.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ padding: '24px', borderTop: '1px solid #f1f5f9', backgroundColor: '#fff', boxShadow: '0 -10px 20px -15px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
                  <div><span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '4px' }}>Tổng tiến độ sản phẩm</span><span style={{ fontSize: '1.5rem', fontWeight: '1000', color: '#1e293b' }}>{detailModal.product?.progress}%</span></div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '900', color: detailModal.product?.status === 'Hoàn thành' ? '#16a34a' : '#3b82f6', backgroundColor: detailModal.product?.status === 'Hoàn thành' ? '#dcfce7' : '#dbeafe', padding: '4px 10px', borderRadius: '8px' }}>{detailModal.product?.status}</span>
                </div>
                <div style={{ width: '100%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}><div style={{ width: `${detailModal.product?.progress}%`, height: '100%', backgroundColor: detailModal.product?.progress >= 100 ? 'var(--status-success)' : 'var(--accent-color)', borderRadius: '6px', transition: 'width 0.5s ease' }} /></div>
              </div>
            </div>
          </div>
        )}

        <SelectionModal isOpen={filterModal} onClose={() => setFilterModal(false)} title="Trạng thái" options={[{ label: 'Tất cả', value: 'ALL' }, { label: 'Chờ làm (0%)', value: 'PENDING' }, { label: 'Đang làm (1-99%)', value: 'DOING' }, { label: 'Hoàn thành (100%)', value: 'DONE' }]} value={statusFilter} onChange={handleStatusChange} />
        <SelectionModal isOpen={sortModal} onClose={() => setSortModal(false)} title="Sắp xếp" options={[{ label: 'Tên đơn (A-Z)', value: 'NAME_ASC' }, { label: 'Tên đơn (Z-A)', value: 'NAME_DESC' }, { label: 'Tiến độ giảm dần', value: 'PROGRESS_DESC' }, { label: 'Tiến độ tăng dần', value: 'PROGRESS_ASC' }]} value={sortOrder} onChange={handleSortChange} />
      </div>
    </Layout>
  )
}
export default PlanTracking
