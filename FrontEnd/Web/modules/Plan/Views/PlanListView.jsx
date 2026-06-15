import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  FileDown, 
  FileUp, 
  Clock,
  Plus,
  ChevronRight,
  FileText,
  Package,
  ShoppingBag,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { planService } from '@modules/Plan/Models/plan.service';
import { getBaseURL } from '@webShared/Services/api.service';

const ManufacturePlan = () => {
    const navigate = useNavigate();
    const { showModal, startGlobalUpload, activeUploads } = useOutletContext();
    const fileInputRef = React.useRef(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    // Mobile pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(15);
    // Mobile popup detail
    const [popupPlan, setPopupPlan] = useState(null);

    // Cập nhật đồng hồ mỗi giây
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Lấy dữ liệu từ API
    const fetchPlans = async () => {
        setLoading(true);
        try {
            const data = await planService.getPlans();
            setPlans(data || []);
        } catch (error) {
            console.error("Lỗi khi tải kế hoạch sản xuất:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    // Đã gỡ bỏ logic khóa điều hướng cục bộ, Layout sẽ xử lý ngầm

    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await startGlobalUpload(
                file, 
                '/production-plans/import', 
                () => fetchPlans()
            );
        } catch (error) {
            console.error("Lỗi chuẩn bị import:", error);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleExportExcel = () => {
        if (filteredPlans.length === 0) {
            alert("Không có dữ liệu kế hoạch sản xuất để xuất.");
            return;
        }

        const exportData = filteredPlans.map((plan, index) => {
            const totalProducts = plan.orders?.reduce((acc, o) => acc + (o.products?.length || 0), 0) || 0;
            const totalQty = plan.orders?.reduce((acc, o) => acc + o.products?.reduce((pAcc, p) => pAcc + (p.quantity || 0), 0), 0) || 0;
            const statusStyle = getStatusStyle(plan);
            const finishedDate = plan.finished_date ? new Date(plan.finished_date).toLocaleDateString('vi-VN') : 'Chưa định';

            return {
                "STT": index + 1,
                "Mã KHSX": plan.id || '',
                "Tên Kế Hoạch Sản Xuất": plan.name || '',
                "Số Lượng Đơn Hàng": plan.orders?.length || 0,
                "Số Lượng Sản Phẩm": totalProducts,
                "Tổng Sản Lượng": totalQty,
                "Trạng Thái": statusStyle.text,
                "Ngày Hoàn Thành Dự Kiến": finishedDate
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);

        const colWidths = [
            { wch: 6 },   // STT
            { wch: 12 },  // Mã KHSX
            { wch: 30 },  // Tên Kế Hoạch Sản Xuất
            { wch: 20 },  // Số Lượng Đơn Hàng
            { wch: 20 },  // Số Lượng Sản Phẩm
            { wch: 18 },  // Tổng Sản Lượng
            { wch: 18 },  // Trạng Thái
            { wch: 25 }   // Ngày Hoàn Thành Dự Kiến
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Danh Sách KHSX");
        
        const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
        XLSX.writeFile(workbook, `KeHoachSanXuat_${dateStr}.xlsx`);
    };

    const getDetailedStatus = (plan) => {
        if (plan.status !== 'Hoàn thành' && plan.finished_date && new Date(plan.finished_date) < new Date()) {
            return 'overdue';
        }
        const s = (plan.status || '').toLowerCase();
        if (s.includes('hoàn thành')) return 'completed';
        if (s.includes('sản xuất')) return 'production';
        return 'pending';
    };

    const getStatusStyle = (plan) => {
        const status = getDetailedStatus(plan);
        if (status === 'overdue') {
            return { text: 'Quá hạn', bg: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' };
        }
        if (status === 'completed') return { 
            text: 'Hoàn thành', 
            bg: '#ecfdf5', 
            color: '#10b981', 
            border: '1px solid #bbf7d0' 
        };
        if (status === 'production') return { 
            text: 'Đang sản xuất', 
            bg: '#eff6ff', 
            color: '#3b82f6', 
            border: '1px solid #bfdbfe' 
        };
        return { 
            text: plan.status || 'Chờ sản xuất', 
            bg: '#fffbeb', 
            color: '#f59e0b', 
            border: '1px solid #fef3c7' 
        };
    };

    const stats = [
        { id: 'all', label: 'TỔNG SỐ KẾ HOẠCH', value: `${plans.length} KH`, bg: '#F5F5F5', color: '#424242' },
        { id: 'production', label: 'ĐANG SẢN XUẤT', value: `${plans.filter(p => getDetailedStatus(p) === 'production').length} KH`, bg: '#FFF3E0', color: '#E65100' },
        { id: 'completed', label: 'ĐÃ HOÀN THÀNH', value: `${plans.filter(p => getDetailedStatus(p) === 'completed').length} KH`, bg: '#E8F5E9', color: '#2E7D32' },
        { id: 'overdue', label: 'QUÁ HẠN', value: `${plans.filter(p => getDetailedStatus(p) === 'overdue').length} KH`, bg: '#FFEBEE', color: '#C62828' },
    ];

    const [sortDirection, setSortDirection] = useState('desc'); // 'desc' là mặc định (Mới nhất lên đầu)

    const filteredPlans = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        let result = Array.isArray(plans) ? [...plans] : [];

        if (lowerSearch) {
            result = result.filter(plan => 
                (plan.name || '').toLowerCase().includes(lowerSearch) ||
                (plan.code || '').toLowerCase().includes(lowerSearch)
            );
        }

        if (filterStatus !== 'all') {
            result = result.filter(plan => getDetailedStatus(plan) === filterStatus);
        }

        // Sắp xếp theo Năm và Tháng cùng chiều
        result.sort((a, b) => {
            const yearA = a.year || 0;
            const yearB = b.year || 0;
            const monthA = a.month || 0;
            const monthB = b.month || 0;
            
            if (yearA !== yearB) {
                return sortDirection === 'asc' ? yearA - yearB : yearB - yearA;
            }
            return sortDirection === 'asc' ? monthA - monthB : monthB - monthA;
        });

        return result;
    }, [plans, searchTerm, filterStatus, sortDirection]);

    const totalPages = Math.ceil(filteredPlans.length / itemsPerPage);
    const paginatedPlans = filteredPlans.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="manufacture-plan-container">

            {/* ── POPUP MODAL (Mobile detail) ── */}
            {popupPlan && (
                <div className="bottom-sheet-backdrop" onClick={() => setPopupPlan(null)}>
                    <div className="bottom-sheet-container" onClick={e => e.stopPropagation()}>
                        <div className="bottom-sheet-handle"></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h3 style={{ color: '#5d3b32', fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{popupPlan.name}</h3>
                            <button onClick={() => setPopupPlan(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                        {[['Trạng thái', getStatusStyle(popupPlan).text], ['Số đơn hàng', `${popupPlan.orders?.length || 0} đơn`], ['Sản phẩm', `${popupPlan.orders?.reduce((a,o)=>a+(o.products?.length||0),0)||0} loại`], ['Tổng SL', popupPlan.orders?.reduce((a,o)=>a+o.products?.reduce((p,pr)=>p+(pr.quantity||0),0),0)||0], ['Hoàn thành', popupPlan.finished_date ? new Date(popupPlan.finished_date).toLocaleDateString('vi-VN') : 'Chưa định']].map(([k,v])=>(
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #FAF6F0' }}>
                                <span style={{ color: '#8D6E63', fontWeight: 600, fontSize: '0.9rem' }}>{k}</span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#2D1A12' }}>{v}</span>
                            </div>
                        ))}
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 20, padding: '12px' }} onClick={() => navigate(`/manufacture/plan/${popupPlan.id}`)}>Xem chi tiết kế hoạch</button>
                    </div>
                </div>
            )}

            {/* ── STICKY TOP ZONE (Desktop: stats-grid; Mobile: stats-strip + toolbar) ── */}
            <div className="sticky-top-zone">
                {/* Desktop stats grid */}
                <div className="stats-grid animate-card-entrance desktop-only" style={{ padding: '16px 16px 0' }}>
                    {stats.map((stat, idx) => {
                        const isActive = filterStatus === stat.id;
                        return (
                            <div 
                                key={idx} 
                                className="stat-card" 
                                style={{ 
                                    backgroundColor: isActive ? stat.color : stat.bg, 
                                    color: isActive ? '#fff' : '#1e293b',
                                    border: isActive ? `1px solid ${stat.color}` : '1px solid rgba(226, 232, 240, 0.8)', 
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onClick={() => { setFilterStatus(stat.id); setCurrentPage(1); }}
                            >
                                <p className="stat-title" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : '#64748b', transition: 'all 0.2s' }}>{stat.label}</p>
                                <h3 className="stat-value" style={{ color: isActive ? '#fff' : stat.color, transition: 'all 0.2s' }}>{stat.value}</h3>
                            </div>
                        );
                    })}
                </div>
                {/* Mobile compact stats strip */}
                <div className="stats-strip">
                    {stats.map((stat, idx) => {
                        const isActive = filterStatus === stat.id;
                        return (
                            <div 
                                key={idx} 
                                className={`stats-strip-item ${isActive ? 'active' : ''}`}
                                style={{ 
                                    backgroundColor: isActive ? stat.color : '#fff',
                                    cursor: 'pointer'
                                }}
                                onClick={() => { setFilterStatus(stat.id); setCurrentPage(1); }}
                            >
                                <span className="strip-value" style={{ color: isActive ? '#fff' : stat.color }}>
                                    {stat.value.replace(' KH', '')}
                                </span>
                                <span className="strip-label" style={{ color: isActive ? 'rgba(255,255,255,0.9)' : '#8D6E63' }}>
                                    {stat.label.replace('TỔNG SỐ ', '').replace('ĐANG ', '').replace('ĐÃ ', '')}
                                </span>
                            </div>
                        );
                    })}
                </div>


            {/* Toolbar */}
            <div className="mgmt-toolbar card" style={{ marginBottom: 0 }}>
                <div className="toolbar-left" style={{ flex: 1 }}>
                    <div className="search-wrapper">
                        <Search className="search-icon" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm lệnh, đơn, sản phẩm..." 
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <select 
                        value={itemsPerPage} 
                        onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
                        className="page-size-select"
                    >
                        <option value={15}>15 dòng</option>
                        <option value={30}>30 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>

                    <div style={{ position: 'relative' }}>
                        <button 
                            className="btn" 
                            title="Lọc nhanh"
                            style={{ 
                                padding: '0.5rem', 
                                background: filterStatus !== 'all' ? '#FDF2F2' : 'white', 
                                borderColor: filterStatus !== 'all' ? '#5d3b32' : '#E5E7EB',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        >
                            <Filter size={18} color={filterStatus !== 'all' ? '#5d3b32' : '#64748b'} />
                            {filterStatus !== 'all' && <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#5d3b32' }}>ON</span>}
                        </button>

                        {showFilterDropdown && (
                            <>
                                <div 
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                                    onClick={() => setShowFilterDropdown(false)} 
                                />
                                <div className="card-shadow" style={{ 
                                    position: 'absolute', 
                                    top: 'calc(100% + 8px)', 
                                    right: 0, 
                                    width: '200px', 
                                    backgroundColor: 'white', 
                                    borderRadius: '12px', 
                                    padding: '8px', 
                                    zIndex: 999,
                                    border: '1px solid #e2e8f0'
                                }}>
                                    {[
                                        { id: 'all', label: 'Tất cả kế hoạch', color: '#64748b' },
                                        { id: 'production', label: 'Đang sản xuất', color: '#3b82f6' },
                                        { id: 'completed', label: 'Đã hoàn thành', color: '#10b981' },
                                        { id: 'overdue', label: 'Quá hạn', color: '#ef4444' }
                                    ].map(item => (
                                        <div 
                                            key={item.id}
                                            onClick={() => {
                                                setFilterStatus(item.id);
                                                setShowFilterDropdown(false);
                                            }}
                                            style={{ 
                                                padding: '10px 12px', 
                                                borderRadius: '8px', 
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: '600',
                                                color: filterStatus === item.id ? '#5d3b32' : '#475569',
                                                backgroundColor: filterStatus === item.id ? '#FDF2F2' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = filterStatus === item.id ? '#FDF2F2' : '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = filterStatus === item.id ? '#FDF2F2' : 'transparent'}
                                        >
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }} />
                                            {item.label}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    
                    <button 
                        className={`btn-icon ${sortDirection === 'asc' ? 'active' : ''}`}
                        title="Đổi chiều sắp xếp"
                        style={{ 
                            background: sortDirection === 'asc' ? '#FDF2F2' : 'white', 
                            borderColor: sortDirection === 'asc' ? '#5d3b32' : '#e2e8f0',
                            borderWidth: '1px',
                            borderStyle: 'solid'
                        }}
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    >
                        <ArrowUpDown size={18} color={sortDirection === 'asc' ? '#5d3b32' : '#64748b'} />
                    </button>
                </div>

                <div className="toolbar-right">
                    <button 
                        onClick={() => navigate('/manufacture/plan/create')}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={18} />
                        <span className="btn-text-desktop">Thêm Kế hoạch</span>
                        <span className="btn-text-mobile">Thêm</span>
                    </button>
                    <div className="desktop-only" style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }}></div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".xlsx, .xls"
                        onChange={handleImportExcel}
                    />
                    <button 
                        className="btn" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <FileUp size={18} /> 
                        <span className="btn-text-desktop">Nhập Excel</span>
                        <span className="btn-text-mobile">Nhập</span>
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        className="btn" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <FileDown size={18} />
                        <span className="btn-text-desktop">Xuất Excel</span>
                        <span className="btn-text-mobile">Xuất</span>
                    </button>
                </div>
            </div>
            </div> {/* end sticky-top-zone */}

            {/* Data View: Desktop Table */}
            <div className="admin-list-layout desktop-only">
                <div className="mgmt-table admin-table-card card-shadow" style={{ background: '#fff' }}>
                    <div className="admin-table-scroll">
                        <table className="manufacture-table data-table">
                            <thead>
                        <tr>
                            {['STT', 'KHSX', 'Đơn hàng', 'Sản phẩm', 'SL', 'Trạng thái'].map(header => (
                                <th key={header}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlans.map((plan, index) => {
                            const totalProducts = plan.orders?.reduce((acc, o) => acc + (o.products?.length || 0), 0) || 0;
                            
                            return (
                                <tr 
                                    key={plan.id}
                                    className="plan-row-hover animate-card-entrance"
                                    onClick={() => navigate(`/manufacture/plan/${plan.id}`)}
                                >
                                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>
                                        {index + 1}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ color: '#5d3b32' }}>
                                                <FileText size={18} />
                                            </div>
                                            <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>{plan.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: '#64748b', fontWeight: '600' }}>
                                        {plan.orders?.length || 0} Đơn hàng
                                    </td>
                                    <td style={{ color: '#64748b' }}>
                                        {totalProducts} Sản phẩm
                                    </td>
                                    <td style={{ fontWeight: '700', color: '#1e293b' }}>
                                        {plan.orders?.reduce((acc, o) => acc + o.products?.reduce((pAcc, p) => pAcc + (p.quantity || 0), 0), 0) || 0}
                                    </td>
                                    <td>
                                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: getStatusStyle(plan).bg, color: getStatusStyle(plan).color, border: getStatusStyle(plan).border }}>{getStatusStyle(plan).text}</span>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredPlans.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                    {loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu hiển thị.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>

                {/* Footer Section */}
                <div className="admin-pagination-desktop">
                    <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                        Tổng cộng <b>{filteredPlans.length}</b> Kế hoạch
                    </div>

                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button 
                            className="page-btn"
                            disabled={true}
                        >
                            &lt; Trước
                        </button>
                        <button className="page-btn active">
                            1
                        </button>
                        <button 
                            className="page-btn"
                            disabled={true}
                        >
                            Sau &gt;
                        </button>
                    </div>
                </div>
            </div>
            </div>

            {/* Mobile Cards View - scrollable */}
            <div className="mobile-only manufacture-cards-scroll">
                <div className="manufacture-cards-container">
                    {paginatedPlans.map((plan) => {
                        const detailedStatus = getDetailedStatus(plan);
                        return (
                            <div key={plan.id} className={`plan-mobile-card status-${detailedStatus} animate-card-entrance`} onClick={() => setPopupPlan(plan)}>
                                <div className="card-header">
                                    <span className="card-khsx">{plan.name}</span>
                                    <span className="status-badge" style={{ backgroundColor: getStatusStyle(plan).bg, color: getStatusStyle(plan).color, border: getStatusStyle(plan).border }}>
                                        {getStatusStyle(plan).text}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Package size={14} color="#8D6E63" /> {plan.orders?.length || 0} đơn
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <ShoppingBag size={14} color="#8D6E63" /> {plan.orders?.reduce((a,o)=>a+(o.products?.length||0),0)||0} loại
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar RefreshCw size={14} color="#8D6E63" /> {plan.finished_date ? new Date(plan.finished_date).toLocaleDateString('vi-VN') : '---'}
                                    </span>
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>Nhấn để xem chi tiết ›</div>
                            </div>
                        );
                    })}
                    {filteredPlans.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Không có kế hoạch nào.</div>
                    )}
                </div>
            </div>

            {/* Mobile Sticky Pagination - Always visible */}
            <div className="pagination-mobile-sticky">
                <button className="page-btn" onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage===1}>‹</button>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#7B5233' }}>Trang {currentPage} / {totalPages || 1}</span>
                <button className="page-btn" onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} disabled={currentPage===totalPages || totalPages <= 1}>›</button>
            </div>
        </div>
    );
};

export default ManufacturePlan;
