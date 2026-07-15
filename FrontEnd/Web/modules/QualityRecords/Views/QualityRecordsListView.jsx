import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  FileDown, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { planService } from '@modules/Plan/Models/plan.service';
import { qualityService } from '@modules/QualityRecords/Models/quality.service';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';

const QualityRecordsListView = () => {
    const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext();
    const navigate = useNavigate();
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, has_data, no_data
    
    // State cho phân trang
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);   
    const [totalCount, setTotalCount] = useState(0);
    const [statsData, setStatsData] = useState({ all: 0, has_data: 0, no_data: 0 });
    const [uniqueProductNames, setUniqueProductNames] = useState([]);
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
    const [filterProduct, setFilterProduct] = useState('all');

    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [showSortPanel, setShowSortPanel] = useState(false);
    const [sortBy, setSortBy] = useState('none');
    const [actionMenuId, setActionMenuId] = useState(null);
    
    const filterRef = useRef(null);
    const sortRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilterPanel(false);
            }
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setShowSortPanel(false);
            }
            setActionMenuId(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cập nhật Title và Subtitle lên Header
    useEffect(() => {
        if (setCustomTitle) setCustomTitle("Hồ sơ chất lượng (PO)");
        if (setCustomSubtitle) setCustomSubtitle("Quản lý và xem hồ sơ chất lượng của các đơn hàng theo kế hoạch sản xuất.");
        if (setCustomScreenCode) setCustomScreenCode('AD13');
    }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

    // Lấy danh sách KHSX
    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            try {
                const data = await planService.getPlans();
                const plansData = Array.isArray(data) ? data : [];
                setPlans(plansData);
                
                if (plansData.length > 0) {
                    const latestPlan = plansData[0];
                    setSelectedPlanId(latestPlan.id.toString());
                }
            } catch (error) {
                console.error("Lỗi khi tải kế hoạch sản xuất:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    // Lấy chi tiết PO của KHSX đã chọn (Phân trang Server-side)
    const fetchPlanDetails = async () => {
        if (!selectedPlanId) return;
        
        setLoading(true);
        try {
            const res = await qualityService.getPlanDetails(
                selectedPlanId, 
                currentPage, 
                itemsPerPage, 
                searchTerm, 
                statusFilter, 
                filterProduct, 
                sortBy
            ); 
            if (res && res.items) {
                setOrders(res.items || []);
                setTotalCount(res.total_count || 0);
                if (res.stats) {
                    setStatsData(res.stats);
                }
                if (res.unique_products) {
                    setUniqueProductNames(res.unique_products);
                }
            } else {
                setOrders(res.orders || []);
                setTotalCount(res.orders ? res.orders.length : 0);
            }
            const currentPlan = plans.find(p => p.id === parseInt(selectedPlanId));
            setSelectedPlan(currentPlan);
        } catch (error) {
            console.error("Lỗi khi tải chi tiết đơn hàng:", error);
            setOrders([]);
            setTotalCount(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlanDetails();
    }, [selectedPlanId, currentPage, itemsPerPage, searchTerm, statusFilter, filterProduct, sortBy, plans]);

    // Tính toán phân trang
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = orders;
    const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

    const handlePlanChange = (e) => {
        setSelectedPlanId(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="quality-records-container">
            <style dangerouslySetInnerHTML={{ __html: `
                .quality-records-container {
                    width: 100%;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }
                
                @media (min-width: 1024px) {
                    .quality-records-container {
                        height: calc(100vh - 100px); /* Fit within desktop viewport */
                        padding: 0;
                        overflow: hidden;
                    }
                }

                .qr-grid-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.5rem 0.25rem;
                }
                
                @media (max-width: 1023px) {
                    .qr-grid-scroll-area {
                        overflow-y: visible;
                        padding: 0.5rem 0; /* Add top margin for mobile gap */
                    }
                }
                .qr-grid {
                    display: grid;
                    grid-template-columns: repeat(1, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.5rem;
                }
                @media (min-width: 640px) { .qr-grid { grid-template-columns: repeat(2, 1fr); } }
                @media (min-width: 1024px) { .qr-grid { grid-template-columns: repeat(3, 1fr); } }
                @media (min-width: 1280px) { .qr-grid { grid-template-columns: repeat(4, 1fr); } }
                @media (min-width: 1536px) { .qr-grid { grid-template-columns: repeat(5, 1fr); } }

                .qr-toolbar {
                    padding: 0.75rem 1rem;
                    margin-bottom: 0.75rem;
                    background-color: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    position: sticky;
                    top: 60px;
                    z-index: 100;
                    box-shadow: 0 4px 12px rgba(123, 82, 51, 0.08);
                }
                @media (min-width: 1024px) {
                    .qr-toolbar {
                        position: relative;
                        top: 0;
                        left: auto;
                        right: auto;
                        flex-direction: row;
                        align-items: center;
                        justify-content: space-between;
                        padding: 1rem 1.25rem;
                        z-index: 10;
                        margin-bottom: 1rem;
                        box-shadow: none;
                        border: 1px solid #EADCC9;
                        border-radius: 12px;
                    }
                }
                @media (max-width: 767px) {
                    .qr-toolbar {
                        padding: 0.5rem 0.75rem;
                    }
                }
                
                .qr-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    width: 100%;
                }
                @media (min-width: 1024px) {
                    .qr-controls {
                        flex-direction: row;
                        align-items: center;
                        width: auto;
                    }
                }
                
                .qr-mobile-row {
                    display: flex;
                    gap: 8px;
                    width: 100%;
                    align-items: center;
                }
                @media (min-width: 1024px) {
                    .qr-mobile-row {
                        width: auto;
                        gap: 12px;
                    }
                }

                .qr-search-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                }
                @media (min-width: 1024px) {
                    .qr-search-wrapper {
                        min-width: 350px;
                        width: auto;
                    }
                }
                
                .qr-export-btn {
                    width: 100%;
                }
                @media (min-width: 1024px) {
                    .qr-export-btn {
                        width: auto;
                    }
                }

                .qr-khsx-select {
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                @media (min-width: 1024px) {
                    .qr-khsx-select {
                        min-width: 200px;
                        width: auto;
                    }
                }

                .qr-khsx-select option {
                    white-space: normal;
                    word-wrap: break-word;
                }
                .qr-pagination-container {
                    padding: 0.5rem 1rem;
                    background-color: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    position: sticky;
                    bottom: 0;
                    z-index: 100;
                    box-shadow: 0 -4px 12px rgba(123, 82, 51, 0.08);
                    margin-top: 1.5rem;
                }
                @media (min-width: 1024px) {
                    .qr-pagination-container {
                        position: relative;
                        bottom: auto;
                        left: auto;
                        right: auto;
                        margin-top: 1rem;
                        box-shadow: none;
                        flex-direction: row;
                        justify-content: space-between;
                        padding: 1rem 1.25rem;
                        border: 1px solid #EADCC9;
                    }
                }
                @media (min-width: 768px) {
                    .qr-pagination-container {
                        flex-direction: row;
                        justify-content: space-between;
                    }
                }
            `}} />

            <PageToolbar
                searchValue={searchTerm}
                onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
                searchPlaceholder="Tìm kiếm theo Mã PO..."
                showSort={true}
                sortOptions={[
                  { value: 'none', label: 'Sắp xếp: Mặc định' },
                  { value: 'po_asc', label: 'Mã PO (A-Z)' },
                  { value: 'po_desc', label: 'Mã PO (Z-A)' },
                  { value: 'qty_asc', label: 'Sản lượng (Tăng dần)' },
                  { value: 'qty_desc', label: 'Sản lượng (Giảm dần)' }
                ]}
                sortValue={sortBy}
                onSortChange={(val) => { setSortBy(val); setCurrentPage(1); }}
                showFilter={true}
                isFilterOpen={isFilterBarOpen}
                onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
                activeFiltersCount={(statusFilter !== 'all' ? 1 : 0) + (selectedPlanId ? 1 : 0) + (filterProduct !== 'all' ? 1 : 0)}
                onExport={() => {}}
                hasWritePermission={true}
            />

            {/* INLINE EXPANDABLE FILTER BAR */}
            {isFilterBarOpen && (
              <div className="filter-inline-bar">
                {/* Lọc Trạng thái */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Trạng thái dữ liệu</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="has_data">Đã có dữ liệu</option>
                    <option value="no_data">Chưa có dữ liệu</option>
                  </select>
                </div>

                {/* Chọn KHSX */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Chọn KHSX tháng</label>
                  <select
                    value={selectedPlanId}
                    onChange={handlePlanChange}
                  >
                    {plans.length > 0 ? plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name || `KHSX T${p.month} - ${p.year}`}
                      </option>
                    )) : <option value="">Đang tải kế hoạch...</option>}
                  </select>
                </div>

                {/* Sản phẩm */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Sản phẩm</label>
                  <select
                    value={filterProduct}
                    onChange={(e) => { setFilterProduct(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Tất cả sản phẩm</option>
                    {uniqueProductNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Hiển thị số dòng */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Hiển thị số dòng</label>
                  <select 
                    value={itemsPerPage} 
                    onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                  >
                    <option value={15}>15 dòng</option>
                    <option value={30}>30 dòng</option>
                    <option value={50}>50 dòng</option>
                    <option value={100}>100 dòng</option>
                  </select>
                </div>
              </div>
            )}

            {/* Bảng dữ liệu */}
            <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <div className="spinner"></div>
                                <span>Đang tải dữ liệu hồ sơ...</span>
                            </div>
                        </div>
                    ) : currentOrders.length === 0 ? (
                        <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                                <span>Không tìm thấy hồ sơ PO nào cho {selectedPlan?.name || 'kế hoạch này'}.</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Bảng Desktop */}
                            <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                                <table className="data-table" style={{ minWidth: '1000px' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '80px', textAlign: 'center' }}>STT</th>
                                            <th>Mã PO</th>
                                            <th style={{ textAlign: 'right', paddingRight: '24px' }}>Số lượng sản phẩm</th>
                                            <th style={{ width: '200px', textAlign: 'center' }}>Trạng thái</th>
                                            <th style={{ width: '150px', textAlign: 'center' }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentOrders.map((order, idx) => {
                                            const stt = indexOfFirstItem + idx + 1;
                                            const items = order.products || order.items || [];
                                            const totalQty = items.reduce((acc, p) => acc + (p.quantity || 0), 0);
                                            const hasData = order.has_data || order.order_status > 0;

                                            return (
                                                <tr 
                                                    key={order.id} 
                                                    style={{ 
                                                        cursor: 'pointer',
                                                        position: 'relative',
                                                        zIndex: actionMenuId === order.id ? 30 : 1
                                                    }} 
                                                    onClick={() => navigate(`/admin/quality-records/${order.order_code || order.name}`)}
                                                >
                                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</td>
                                                    <td className="font-bold" style={{ color: '#7B5233', fontWeight: 'bold' }}>{order.name || order.order_code}</td>
                                                    <td style={{ textAlign: 'right', paddingRight: '24px', fontWeight: '600' }}>
                                                        {totalQty.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#8D6E63', fontWeight: 'normal' }}>sản phẩm</span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span 
                                                            style={{
                                                                display: 'inline-block',
                                                                padding: '4px 10px',
                                                                borderRadius: '12px',
                                                                fontSize: '0.75rem',
                                                                fontWeight: '700',
                                                                backgroundColor: hasData ? '#ECFDF5' : '#FEF2F2',
                                                                color: hasData ? '#10B981' : '#EF4444',
                                                                border: `1px solid ${hasData ? '#A7F3D0' : '#FCA5A5'}`,
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                        >
                                                            {hasData ? 'Đã có dữ liệu' : 'Chưa có dữ liệu'}
                                                        </span>
                                                    </td>
                                                    <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === order.id ? 40 : 1 }} onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            className="action-btn"
                                                            onClick={() => setActionMenuId(actionMenuId === order.id ? null : order.id)}
                                                        ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                                        {actionMenuId === order.id && (
                                                            <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                                                                <button 
                                                                    className="action-menu-item" 
                                                                    onClick={() => {
                                                                        setActionMenuId(null);
                                                                        navigate(`/admin/quality-records/${order.order_code || order.name}`);
                                                                    }}
                                                                >
                                                                    Xem chi tiết
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile View - Cards list */}
                            <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                                {currentOrders.map((order, idx) => {
                                    const stt = indexOfFirstItem + idx + 1;
                                    const items = order.products || order.items || [];
                                    const totalQty = items.reduce((acc, p) => acc + (p.quantity || 0), 0);
                                    const hasData = order.has_data || order.order_status > 0;

                                    return (
                                        <div key={order.id} className="mgmt-card animate-card-entrance" style={{ 
                                            backgroundColor: '#fff', 
                                            borderRadius: '10px', 
                                            border: '1px solid #EADCC9',
                                            padding: '12px',
                                            marginBottom: '10px',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => navigate(`/admin/quality-records/${order.order_code || order.name}`)}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>#{stt}</span>
                                                <span 
                                                    style={{
                                                        display: 'inline-block',
                                                        padding: '2px 8px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.7rem',
                                                        fontWeight: '700',
                                                        backgroundColor: hasData ? '#ECFDF5' : '#FEF2F2',
                                                        color: hasData ? '#10B981' : '#EF4444',
                                                        border: `1px solid ${hasData ? '#A7F3D0' : '#FCA5A5'}`
                                                    }}
                                                >
                                                    {hasData ? 'ĐÃ CÓ DỮ LIỆU' : 'CHƯA CÓ DỮ LIỆU'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                                                {order.name || order.order_code}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                                                Số lượng: <strong>{totalQty}</strong> sản phẩm
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Phân trang - Desktop */}
                            <div className="admin-pagination-desktop desktop-only">
                                    <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600', textAlign: 'center' }}>
                                        Hiển thị <b>{currentOrders.length}</b> trên <b>{totalCount}</b> hồ sơ
                                    </div>
                                    
                                    {totalPages > 1 && (
                                        <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                                            <button 
                                                className="page-btn"
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: '#7B5233' }}
                                            >
                                                <ChevronLeft size={14} />
                                            </button>
                                            
                                            {/* Optimized Pagination Window */}
                                            {(() => {
                                                const pages = [];
                                                const maxVisible = 3; 
                                                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                                let end = Math.min(totalPages, start + maxVisible - 1);
                                                
                                                if (end - start + 1 < maxVisible) {
                                                    start = Math.max(1, end - maxVisible + 1);
                                                }

                                                if (start > 1) {
                                                    pages.push(
                                                        <button key={1} className="page-btn" onClick={() => setCurrentPage(1)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>1</button>
                                                    );
                                                    if (start > 2) pages.push(<span key="dots-start" style={{ color: '#8D6E63', fontSize: '0.7rem' }}>...</span>);
                                                }

                                                for (let i = start; i <= end; i++) {
                                                    if (i < 1) continue;
                                                    pages.push(
                                                        <button 
                                                            key={i}
                                                            className={`page-btn ${currentPage === i ? 'active' : ''}`}
                                                            onClick={() => setCurrentPage(i)}
                                                            style={{ 
                                                                padding: '6px 10px', borderRadius: '8px', border: '1px solid #EADCC9', 
                                                                backgroundColor: currentPage === i ? '#7B5233' : '#FAF6F0', 
                                                                color: currentPage === i ? '#fff' : '#7B5233',
                                                                fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer'
                                                            }}
                                                        >
                                                            {i}
                                                        </button>
                                                    );
                                                }

                                                if (end < totalPages) {
                                                    if (end < totalPages - 1) pages.push(<span key="dots-end" style={{ color: '#8D6E63', fontSize: '0.7rem' }}>...</span>);
                                                    pages.push(
                                                        <button key={totalPages} className="page-btn" onClick={() => setCurrentPage(totalPages)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>{totalPages}</button>
                                                    );
                                                }
                                                return pages;
                                            })()}

                                            <button 
                                                className="page-btn"
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: '#7B5233' }}
                                            >
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Phân trang - Mobile Sticky */}
            {totalPages > 1 && (
                <div className="pagination-mobile-sticky mobile-only">
                    <button className="page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                        <ChevronLeft size={16} />
                    </button>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
                    <button className="page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages <= 1}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
    </div>
);
};

export default QualityRecordsListView;
