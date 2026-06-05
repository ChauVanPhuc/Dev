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
  FileText
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

    return (
        <div className="manufacture-plan-container" style={{ padding: '0.5rem 1rem' }}>

            {/* Stats Grid - Chuẩn hóa đồng bộ */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                {stats.map((stat, idx) => (
                    <div 
                        key={idx} 
                        className="card-shadow"
                        style={{ 
                            backgroundColor: stat.bg, 
                            padding: '20px 15px', 
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '120px',
                            textAlign: 'center',
                            border: '1px solid rgba(226, 232, 240, 0.8)',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                    >
                        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: '700', color: '#757575', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{stat.label}</p>
                        <h3 style={{ margin: '0 0 5px 0', fontSize: '28px', fontWeight: '800', color: stat.color }}>{stat.value}</h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#9E9E9E', fontWeight: '500' }}>{stat.sub}</p>
                    </div>
                ))}
            </div>


            {/* Toolbar */}
            <div className="action-bar card-shadow" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    <div className="search-input-wrapper">
                        <Search size={16} style={{ color: '#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm lệnh, đơn, sản phẩm..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
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

                <div className="action-buttons">
                    <button 
                        onClick={() => navigate('/manufacture/plan/create')}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <Plus size={18} /> Thêm Kế hoạch
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
                        <span className="desktop-only">Nhập Excel</span>
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        className="btn" 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <FileDown size={18} /> <span className="desktop-only">Xuất Excel</span>
                    </button>
                </div>
            </div>

            {/* Data View: Desktop Table */}
            <div className="desktop-only card-shadow" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#fcfcfc', borderBottom: '1px solid #f1f5f9' }}>
                            {['STT', 'KHSX', 'Đơn hàng', 'Sản phẩm', 'SL', 'Trạng thái'].map(header => (
                                <th key={header} style={{ padding: '0.75rem 0.5rem', textAlign: 'left', color: '#64748b', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase' }}>{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPlans.map((plan, index) => {
                            const totalProducts = plan.orders?.reduce((acc, o) => acc + (o.products?.length || 0), 0) || 0;
                            
                            return (
                                <tr 
                                    key={plan.id}
                                    className="plan-row-hover"
                                    onClick={() => navigate(`/manufacture/plan/${plan.id}`)}
                                    style={{ 
                                        cursor: 'pointer', 
                                        backgroundColor: 'white', 
                                        borderBottom: '1px solid #e2e8f0',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: '#94a3b8' }}>
                                        {index + 1}
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ color: '#5d3b32' }}>
                                                <FileText size={18} />
                                            </div>
                                            <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.95rem' }}>{plan.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem', color: '#64748b', fontWeight: '600' }}>
                                        {plan.orders?.length || 0} Đơn hàng
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem', color: '#64748b' }}>
                                        {totalProducts} Sản phẩm
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem', fontWeight: '700', color: '#1e293b' }}>
                                        {plan.orders?.reduce((acc, o) => acc + o.products?.reduce((pAcc, p) => pAcc + (p.quantity || 0), 0), 0) || 0}
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem' }}>
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

                {/* Footer Section */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fcfcfc' }}>
                    <div>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>Tổng cộng ({filteredPlans.length} Kế hoạch)</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Trang 1 trên {Math.max(1, Math.ceil(filteredPlans.length / 50))}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', color: '#94a3b8' }}>Trước</button>
                        <button style={{ width: '32px', height: '32px', borderRadius: '6px', backgroundColor: '#5d3b32', color: 'white', border: 'none', fontSize: '0.85rem', fontWeight: '700' }}>1</button>
                        <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Tiếp</button>
                    </div>
                </div>
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-only manufacture-cards-container">
                {filteredPlans.map((plan) => (
                    <div key={plan.id} className="plan-mobile-card card-shadow">
                        <div className="card-header">
                            <span className="card-khsx">{plan.name}</span>
                            <span className="status-badge" style={{
                                backgroundColor: getStatusStyle(plan).bg,
                                color: getStatusStyle(plan).color,
                                border: getStatusStyle(plan).border
                            }}>
                                {getStatusStyle(plan).text}
                            </span>
                        </div>
                        <div className="card-body">
                            <div className="info-row">
                                <span className="label">Đơn hàng:</span>
                                <span className="value">{plan.orders?.length || 0} lệnh</span>
                            </div>
                            <div className="info-row">
                                <span className="label">Sản phẩm:</span>
                                <span className="value">
                                    {plan.orders?.reduce((acc, o) => acc + (o.products?.length || 0), 0) || 0} loại
                                </span>
                            </div>
                            <div className="info-row highlight">
                                <span className="label">Ngày hoàn thành:</span>
                                <span className="value">{plan.finished_date ? new Date(plan.finished_date).toLocaleDateString() : 'Chưa định'}</span>
                            </div>
                        </div>
                        <div className="card-footer">
                            <button className="btn-card-action" onClick={() => navigate(`/manufacture/plan/${plan.id}`)}>
                                Chi tiết Kế hoạch
                            </button>
                        </div>
                    </div>
                ))}
                {filteredPlans.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                        Không có kế hoạch nào.
                    </div>
                )}
            </div>

            {/* Gỡ bỏ Progress Overlay tại chỗ */}
        </div>
    );
};

export default ManufacturePlan;
