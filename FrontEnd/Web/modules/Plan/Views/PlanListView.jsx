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
  Calendar,
  Layers,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { planService } from '@modules/Plan/Models/plan.service';
import { getBaseURL } from '@webShared/Services/api.service';

const ManufacturePlan = () => {
    const navigate = useNavigate();
    const { showModal, startGlobalUpload, activeUploads } = useOutletContext();
    const fileInputRef = React.useRef(null);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
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
        { id: 'all', label: 'TỔNG SỐ KẾ HOẠCH', value: plans.length, bg: '#F5F5F5', color: '#424242', iconBg: '#FAF6F0', iconColor: '#7B5233', Icon: Layers, themeColor: '#7B5233', activeBg: '#FAF6F0' },
        { id: 'production', label: 'ĐANG SẢN XUẤT', value: plans.filter(p => getDetailedStatus(p) === 'production').length, bg: '#FFF3E0', color: '#E65100', iconBg: '#FFFBEB', iconColor: '#F59E0B', Icon: Clock, themeColor: '#F59E0B', activeBg: '#FFFBEB' },
        { id: 'completed', label: 'ĐÃ HOÀN THÀNH', value: plans.filter(p => getDetailedStatus(p) === 'completed').length, bg: '#E8F5E9', color: '#2E7D32', iconBg: '#ECFDF4', iconColor: '#10B981', Icon: CheckCircle, themeColor: '#10B981', activeBg: '#ECFDF4' },
        { id: 'overdue', label: 'QUÁ HẠN', value: plans.filter(p => getDetailedStatus(p) === 'overdue').length, bg: '#FFEBEE', color: '#C62828', iconBg: '#FEF2F2', iconColor: '#EF4444', Icon: AlertCircle, themeColor: '#EF4444', activeBg: '#FEF2F2' },
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
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 20, padding: '12px' }} onClick={() => navigate(`/admin/plan/${popupPlan.id}`)}>Xem chi tiết kế hoạch</button>
                    </div>
                </div>
            )}

            {/* ── STICKY TOP ZONE (Desktop: stats-grid; Mobile: stats-strip + toolbar) ── */}
            <div className="sticky-top-zone">
                {/* Desktop stats grid */}
                <div className="stats-grid animate-card-entrance desktop-only" style={{ padding: '16px 16px 0' }}>
                    {stats.map((stat, idx) => {
                        return (
                            <div 
                                key={idx} 
                                className="kpi-card" 
                                style={{ 
                                    background: '#fff', 
                                    border: '1px solid #E2E8F0',
                                    padding: '8px 12px', 
                                    borderRadius: '10px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <div style={{
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '8px',
                                    backgroundColor: stat.iconBg,
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    color: stat.iconColor, 
                                    flexShrink: 0
                                }}>
                                    <stat.Icon size={18} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: '700', letterSpacing: '0.05em' }}>{stat.label}</div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>
                                        {new Intl.NumberFormat('vi-VN').format(stat.value)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {/* Mobile compact stats strip */}
                <div className="stats-strip">
                    {stats.map((stat, idx) => {
                        return (
                            <div 
                                key={idx} 
                                className="stats-strip-item"
                                style={{ 
                                    backgroundColor: '#fff',
                                    border: '1px solid #E2E8F0'
                                }}
                            >
                                <span className="strip-value" style={{ color: stat.iconColor }}>
                                    {new Intl.NumberFormat('vi-VN').format(stat.value)}
                                </span>
                                <span className="strip-label" style={{ color: '#64748B' }}>
                                    {stat.label.replace('TỔNG SỐ ', '').replace('ĐANG ', '').replace('ĐÃ ', '')}
                                </span>
                            </div>
                        );
                    })}
                </div>


            {/* Toolbar */}
            {/* Toolbar */}
            <PageToolbar
              searchValue={searchTerm}
              onSearchChange={(val) => { setSearchTerm(val); setCurrentPage(1); }}
              searchPlaceholder="Tìm kiếm lệnh, đơn, sản phẩm..."
              showSort={true}
              sortOptions={[
                { value: 'desc', label: 'Thời gian: Mới nhất' },
                { value: 'asc', label: 'Thời gian: Cũ nhất' }
              ]}
              sortValue={sortDirection}
              onSortChange={setSortDirection}
              showFilter={true}
              isFilterOpen={isFilterBarOpen}
              onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
              activeFiltersCount={filterStatus !== 'all' ? 1 : 0}
              importActions={[
                {
                  label: 'Nhập Excel',
                  icon: <FileUp size={14} />,
                  onClick: () => fileInputRef.current?.click()
                }
              ]}
              onExport={handleExportExcel}
              onCreate={() => navigate('/admin/plan/create')}
              createLabel="Thêm Kế hoạch"
              hasWritePermission={true}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx, .xls"
                onChange={handleImportExcel}
              />
            </PageToolbar>

            {/* INLINE EXPANDABLE FILTER BAR */}
            {isFilterBarOpen && (
              <div className="filter-inline-bar">
                {/* Trạng thái */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Trạng thái</label>
                  <select 
                    value={filterStatus} 
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Tất cả trạng thái</option>
                    <option value="production">Đang sản xuất</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="overdue">Quá hạn</option>
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
                                    onClick={() => navigate(`/admin/plan/${plan.id}`)}
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
