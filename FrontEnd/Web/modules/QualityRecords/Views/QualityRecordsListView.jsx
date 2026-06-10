import React, { useState, useEffect, useMemo } from 'react';
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

const QualityRecordsListView = () => {
    const { setCustomTitle, setCustomSubtitle } = useOutletContext();
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
    const [itemsPerPage] = useState(20);

    // Cập nhật Title và Subtitle lên Header
    useEffect(() => {
        setCustomTitle(
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={24} style={{ color: '#7B5233' }} />
                <span style={{ color: '#2D1A12' }}>Hồ sơ chất lượng (PO)</span>
            </div>
        );
        setCustomSubtitle("Quản lý và xem hồ sơ chất lượng của các đơn hàng theo kế hoạch sản xuất.");
    }, [setCustomTitle, setCustomSubtitle]);

    // Lấy danh sách KHSX
    useEffect(() => {
        const fetchPlans = async () => {
            setLoading(true);
            try {
                const data = await planService.getPlans();
                const plansData = Array.isArray(data) ? data : [];
                setPlans(plansData);
                
                if (plansData.length > 0) {
                    // Mặc định chọn KHSX mới nhất
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

    // Lấy chi tiết PO của KHSX đã chọn
    useEffect(() => {
        const fetchPlanDetails = async () => {
            if (!selectedPlanId) return;
            
            setLoading(true);
            try {
                const data = await qualityService.getPlanDetails(selectedPlanId); 
                setOrders(data.orders || []);
                const currentPlan = plans.find(p => p.id === parseInt(selectedPlanId));
                setSelectedPlan(currentPlan);
            } catch (error) {
                console.error("Lỗi khi tải chi tiết đơn hàng:", error);
                setOrders([]);
            } finally {
                setLoading(false);
            }
        };
        fetchPlanDetails();
    }, [selectedPlanId, plans]);

    // Filter dữ liệu dựa trên Search và Trạng thái dữ liệu
    const filteredOrders = useMemo(() => {
        const term = (searchTerm || '').toLowerCase();
        return orders.filter(o => {
            const code = (o.name || o.order_code || '').toLowerCase();
            const matchesSearch = code.includes(term);
            
            // Giả sử o.has_data hoặc o.order_status > 0 là có dữ liệu
            const hasData = o.has_data || o.order_status > 0;
            
            if (statusFilter === 'has_data') return matchesSearch && hasData;
            if (statusFilter === 'no_data') return matchesSearch && !hasData;
            return matchesSearch;
        });
    }, [orders, searchTerm, statusFilter]);

    // Tính toán phân trang
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

    const handlePlanChange = (e) => {
        setSelectedPlanId(e.target.value);
        setCurrentPage(1);
    };

    return (
        <div className="quality-records-container">
            <style dangerouslySetInnerHTML={{ __html: `
                .quality-records-container {
                    width: 100%;
                    padding-top: 160px; /* Mobile toolbar space */
                    padding-bottom: 80px; /* Mobile pagination space */
                    display: flex;
                    flex-direction: column;
                }
                
                @media (min-width: 1024px) {
                    .quality-records-container {
                        height: calc(100vh - 100px); /* Fit within desktop viewport */
                        padding-top: 0;
                        padding-bottom: 0;
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
                        padding: 1.5rem 0; /* Add top margin for mobile gap */
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
                    margin-bottom: 2rem;
                    background-color: #fff;
                    border-radius: 12px;
                    border: 1px solid #EADCC9;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    position: fixed;
                    top: 70px;
                    left: 0;
                    right: 0;
                    z-index: 50;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
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
                    overflow: hidden;
                }
                @media (min-width: 1024px) {
                    .qr-controls {
                        flex-direction: row;
                        align-items: center;
                        width: auto;
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
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 50;
                    box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
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

            {/* Toolbar & Filters */}
            <div className="qr-toolbar card-shadow">
                <div className="qr-controls">
                    {/* KHSX Selection Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                        <select
                            className="qr-khsx-select"
                            value={selectedPlanId}
                            onChange={handlePlanChange}
                            style={{
                                padding: '6px 28px 6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                backgroundColor: '#FAF6F0',
                                fontSize: '0.8rem',
                                color: '#7B5233',
                                fontWeight: '700',
                                cursor: 'pointer',
                                appearance: 'none',
                                height: '36px',
                                maxWidth: '100%',
                                width: '100%',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%237B5233'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'right 8px center',
                                backgroundSize: '14px'
                            }}
                        >
                            {plans.length > 0 ? plans.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name || `KHSX T${p.month} - ${p.year}`}
                                </option>
                            )) : <option value="">Đang tải kế hoạch...</option>}
                        </select>
                    </div>

                    <div className="desktop-only" style={{ width: '1px', height: '20px', backgroundColor: '#EADCC9' }}></div>

                    {/* Bộ lọc trạng thái dữ liệu */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} color="#7B5233" />
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid #EADCC9',
                                backgroundColor: '#FAF6F0',
                                fontSize: '0.8rem',
                                color: '#7B5233',
                                fontWeight: '600',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="all">Tất cả hồ sơ</option>
                            <option value="has_data">Đã có bàn giao/dữ liệu</option>
                            <option value="no_data">Chưa có dữ liệu</option>
                        </select>
                    </div>

                    <div className="desktop-only" style={{ width: '1px', height: '20px', backgroundColor: '#EADCC9' }}></div>

                    {/* Beautiful Search Input (Focus on order_code) */}
                    <div className="qr-search-wrapper">
                        <Search size={16} style={{ 
                            position: 'absolute', 
                            left: '12px', 
                            color: '#7B5233',
                            pointerEvents: 'none'
                        }} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm theo Mã PO (#APT...)" 
                            value={searchTerm} 
                            onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                            style={{ 
                                padding: '8px 12px 8px 36px', 
                                borderRadius: '10px', 
                                border: '1px solid #EADCC9', 
                                backgroundColor: '#FAF6F0', 
                                fontSize: '0.85rem', 
                                width: '100%',
                                transition: 'all 0.2s ease',
                                outline: 'none',
                                color: '#5D3B32',
                                fontWeight: '600'
                            }}
                            onFocus={(e) => {
                                e.target.style.backgroundColor = '#fff';
                                e.target.style.borderColor = '#7B5233';
                                e.target.style.boxShadow = '0 0 0 3px rgba(123, 82, 51, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.backgroundColor = '#FAF6F0';
                                e.target.style.borderColor = '#EADCC9';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>
                </div>
                
                <button className="btn qr-export-btn" style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '6px', 
                    padding: '8px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid #EADCC9', 
                    background: '#fff', 
                    fontSize: '0.85rem',
                    fontWeight: '700', 
                    color: '#7B5233', 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff'}
                >
                    <FileDown size={16} /> Xuất báo cáo
                </button>
            </div>

            {/* Grid Area with Scroll */}
            <div className="qr-grid-scroll-area">
                <div className="qr-grid">
                    {loading ? (
                    <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <div className="spinner"></div>
                            <span>Đang tải dữ liệu hồ sơ...</span>
                        </div>
                    </div>
                ) : currentOrders.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <FileText size={48} opacity={0.3} />
                            <span>Không tìm thấy hồ sơ PO nào cho {selectedPlan?.name || 'kế hoạch này'}.</span>
                        </div>
                    </div>
                ) : (
                    currentOrders.map((order, idx) => {
                        const stt = indexOfFirstItem + idx + 1;
                        const items = order.products || order.items || [];
                        const totalQty = items.reduce((acc, p) => acc + (p.quantity || 0), 0);
                        
                        return (
                            <div key={order.id} className="card-shadow" style={{ 
                                backgroundColor: '#fff', 
                                borderRadius: '12px', 
                                border: '1px solid #EADCC9',
                                padding: '1.25rem',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onClick={() => navigate(`/admin/quality-records/${order.order_code || order.name}`)}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#7B5233';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(123, 82, 51, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#EADCC9';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            >
                                {/* STT Badge */}
                                <div style={{ 
                                    position: 'absolute', 
                                    top: '0', 
                                    left: '0', 
                                    backgroundColor: '#FAF6F0', 
                                    color: '#7B5233', 
                                    fontSize: '0.7rem', 
                                    padding: '2px 8px', 
                                    borderBottomRightRadius: '8px',
                                    fontWeight: '700',
                                    borderRight: '1px solid #EADCC9',
                                    borderBottom: '1px solid #EADCC9'
                                }}>
                                    #{stt}
                                </div>

                                {/* Badge báo hiệu đã có dữ liệu bàn giao */}
                                {(order.has_data || order.order_status > 0) && (
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: '8px', 
                                        right: '8px', 
                                        backgroundColor: '#E8F5E9', 
                                        color: '#2E7D32', 
                                        fontSize: '0.65rem', 
                                        padding: '4px 8px', 
                                        borderRadius: '20px',
                                        fontWeight: '800',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        border: '1px solid #C8E6C9'
                                    }}>
                                        <CheckCircle2 size={12} />
                                        <span>ĐÃ CÓ DỮ LIỆU</span>
                                    </div>
                                )}

                                <div style={{ marginTop: '0.5rem' }}>
                                    <div style={{ color: '#8D6E63', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '4px' }}>
                                        Cont (Mã PO)
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#7B5233', marginBottom: '12px' }}>
                                        #{order.name || order.order_code}
                                    </div>

                                    <div style={{ width: '100%', height: '1px', backgroundColor: '#FAF6F0', marginBottom: '12px' }}></div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ color: '#8D6E63', fontSize: '0.75rem', fontWeight: '600' }}>Số lượng sản phẩm</div>
                                            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#2D1A12' }}>
                                                {totalQty} <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#8D6E63' }}>sản phẩm</span>
                                            </div>
                                        </div>
                                        <div style={{ 
                                            backgroundColor: '#FFF5F5', 
                                            padding: '8px', 
                                            borderRadius: '10px', 
                                            color: '#7B5233' 
                                        }}>
                                            <Eye size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            </div>

            {/* Pagination Container */}
            <div className="qr-pagination-container card-shadow">
                    <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600', textAlign: 'center' }}>
                        Hiển thị <b>{currentOrders.length}</b> trên <b>{filteredOrders.length}</b> hồ sơ
                    </div>
                    
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: '#7B5233' }}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            
                            {/* Optimized Pagination Window */}
                            {(() => {
                                const pages = [];
                                const maxVisible = 3; // Reduced for mobile
                                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                let end = Math.min(totalPages, start + maxVisible - 1);
                                
                                if (end - start + 1 < maxVisible) {
                                    start = Math.max(1, end - maxVisible + 1);
                                }

                                if (start > 1) {
                                    pages.push(
                                        <button key={1} onClick={() => setCurrentPage(1)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>1</button>
                                    );
                                    if (start > 2) pages.push(<span key="dots-start" style={{ color: '#8D6E63', fontSize: '0.7rem' }}>...</span>);
                                }

                                for (let i = start; i <= end; i++) {
                                    if (i < 1) continue;
                                    pages.push(
                                        <button 
                                            key={i}
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
                                        <button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', color: '#7B5233', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer' }}>{totalPages}</button>
                                    );
                                }
                                return pages;
                            })()}

                            <button 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{ padding: '6px 8px', borderRadius: '8px', border: '1px solid #EADCC9', backgroundColor: '#FAF6F0', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: '#7B5233' }}
                            >
                                <ChevronRight size={14} />
                            </button>
                </div>
            )}
        </div>
    </div>
);
};

export default QualityRecordsListView;
