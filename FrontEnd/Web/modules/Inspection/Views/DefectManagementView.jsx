import React, { useState, useEffect, useMemo } from 'react';
import api from '@webShared/Services/api.service';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ComposedChart 
} from 'recharts';
import { Calendar, Filter, ChevronDown, ChevronUp, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import '@styles/components.css';

const COLORS = ['#7B5233', '#A67C52', '#D9B99B', '#F2E2CE', '#4b301e', '#8c6a51'];

/**
 * Component: Analytics Dashboard for Defects
 */
const DefectAnalytics = ({ stage }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month'); // week, month, year
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState(1); // 1-52
  const [selectedCategory, setSelectedCategory] = useState('');

  // Tính toán số tuần trong năm
  const weeksInYear = useMemo(() => {
    const weeks = [];
    for (let i = 1; i <= 52; i++) weeks.push(i);
    return weeks;
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        let start_date = '';
        let end_date = '';
        
        if (timeRange === 'week') {
          // Lấy ngày bắt đầu của tuần thứ N trong năm
          const firstDayOfYear = new Date(selectedYear, 0, 1);
          const daysOffset = (selectedWeek - 1) * 7;
          const start = new Date(selectedYear, 0, 1 + daysOffset);
          const end = new Date(selectedYear, 0, 1 + daysOffset + 6);
          start_date = start.toISOString().split('T')[0];
          end_date = end.toISOString().split('T')[0];
        } else if (timeRange === 'month') {
          const start = new Date(selectedYear, selectedMonth - 1, 1);
          const end = new Date(selectedYear, selectedMonth, 0);
          start_date = start.toISOString().split('T')[0];
          end_date = end.toISOString().split('T')[0];
        } else if (timeRange === 'year') {
          start_date = `${selectedYear}-01-01`;
          end_date = `${selectedYear}-12-31`;
        }

        const url = `/inspections/daily/analytics?start_date=${start_date}&end_date=${end_date}${stage ? `&stage=${encodeURIComponent(stage)}` : ''}${selectedCategory ? `&category=${selectedCategory}` : ''}&group_by=${timeRange === 'year' ? 'month' : 'date'}`;
        const res = await api.get(url);
        setData(res);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [timeRange, selectedYear, selectedMonth, selectedWeek, selectedCategory, stage]);

  // Hàm bổ trợ để tạo danh sách ngày đầy đủ trong tháng/tuần
  const fillMissingDates = (apiData, range, year, month, week) => {
    if (!apiData) return [];
    
    const filledData = [];
    const dataMap = {};
    apiData.forEach(item => {
      dataMap[item.date] = item;
    });

    if (range === 'month') {
      const lastDay = new Date(year, month, 0).getDate();
      for (let i = 1; i <= lastDay; i++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        filledData.push(dataMap[dateStr] || { date: dateStr, defect_rate: 0, defect_count: 0, product_count: 0 });
      }
    } else if (range === 'week') {
      const firstDayOfYear = new Date(year, 0, 1);
      const daysOffset = (week - 1) * 7;
      for (let i = 0; i < 7; i++) {
        const d = new Date(year, 0, 1 + daysOffset + i);
        const dateStr = d.toISOString().split('T')[0];
        filledData.push(dataMap[dateStr] || { date: dateStr, defect_rate: 0, defect_count: 0, product_count: 0 });
      }
    } else {
      return apiData; // Đối với năm (month grouping), giữ nguyên dữ liệu từ API
    }
    
    return filledData;
  };

  const chartData = useMemo(() => {
    return fillMissingDates(data?.trend, timeRange, selectedYear, selectedMonth, selectedWeek);
  }, [data, timeRange, selectedYear, selectedMonth, selectedWeek]);

  if (loading) return <div className="loading-spinner">Đang tải phân tích...</div>;
  if (!data) return null;

  return (
    <div className="analytics-dashboard" style={{ marginBottom: '30px' }}>
      {/* Analytics Controls */}
      <div className="analytics-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div>
          <h3 style={{ margin: '0 0 15px 0', color: '#4b301e', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={20} /> Phân tích xu hướng lỗi
          </h3>
          
          <div className="filters-row" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {/* Chế độ xem */}
            <div className="filter-group">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>CHẾ ĐỘ XEM</label>
              <div className="range-selector" style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                {['week', 'month', 'year'].map(range => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    style={{ 
                      padding: '6px 12px', 
                      fontSize: '0.8rem', 
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: timeRange === range ? '#4b301e' : 'transparent',
                      color: timeRange === range ? '#fff' : '#64748b',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {range === 'week' ? 'Tuần' : range === 'month' ? 'Tháng' : 'Năm'}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn Năm */}
            <div className="filter-group">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>NĂM</label>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '600' }}
              >
                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Chọn Tháng (Chỉ hiện khi chọn month) */}
            {timeRange === 'month' && (
              <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>THÁNG</label>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
              </div>
            )}

            {/* Chọn Tuần (Chỉ hiện khi chọn week) */}
            {timeRange === 'week' && (
              <div className="filter-group">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>TUẦN THỨ</label>
                <select 
                  value={selectedWeek} 
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                  style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '600' }}
                >
                  {weeksInYear.map(w => <option key={w} value={w}>Tuần {w}</option>)}
                </select>
              </div>
            )}

            {/* Chọn Nhóm Lỗi */}
            <div className="filter-group">
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>NHÓM LỖI</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: '600', minWidth: '150px' }}
              >
                <option value="">Tất cả nhóm</option>
                <option value="visual">Ngoại quan</option>
                <option value="structure">Kết cấu</option>
                <option value="material">Nguyên liệu</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600' }}>CẬP NHẬT LÚC</div>
           <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>{new Date().toLocaleTimeString('vi-VN')}</div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '25px' }}>
        <div className="stat-card card" style={{ padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>TỔNG PHIẾU</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#7B5233' }}>{data.summary.total_records}</div>
        </div>
        <div className="stat-card card" style={{ padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>TỔNG SẢN PHẨM</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#7B5233' }}>{data.summary.total_products.toLocaleString()}</div>
        </div>
        <div className="stat-card card" style={{ padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>TỔNG LỖI</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{data.summary.total_defects.toLocaleString()}</div>
        </div>
        <div className="stat-card card" style={{ padding: '15px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>TỶ LỆ LỖI TB</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{data.summary.avg_defect_rate.toFixed(1)}%</div>
        </div>
      </div>

      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
        {/* Pareto Chart */}
        <div className="chart-container card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#1e293b' }}>Biểu đồ Pareto (Lỗi trọng yếu)</h4>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <ComposedChart data={data.pareto}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="defect_name" fontSize={10} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis yAxisId="left" orientation="left" stroke="#7B5233" />
                <YAxis yAxisId="right" orientation="right" stroke="#ef4444" domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" name="Số lượng lỗi" fill="#7B5233" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative_percentage" name="% Lũy kế" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Chart */}
        <div className="chart-container card" style={{ padding: '20px' }}>
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#1e293b' }}>Phân bổ theo nhóm lỗi</h4>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="label"
                  label
                >
                  {data.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="chart-container card" style={{ padding: '20px', gridColumn: 'span 2' }}>
          <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', color: '#1e293b' }}>Biến động tỷ lệ lỗi theo thời gian</h4>
          <div style={{ height: '250px', width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  fontSize={10} 
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    if (isNaN(d.getTime())) return val;
                    if (timeRange === 'year') {
                      return `Tháng ${d.getMonth() + 1}`;
                    }
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis fontSize={10} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="defect_rate" name="Tỷ lệ lỗi (%)" stroke="#7B5233" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * View: Quản lý danh mục lỗi kiểm tra chất lượng (CRUD)
 */
const DefectManagement = () => {
  const [viewTab, setViewTab] = useState('analytics'); // 'analytics', 'list', 'field', 'complaint', 'capa'
  const [selectedStage, setSelectedStage] = useState('');
  // ─── Dữ liệu danh sách ──────────────────────────────────────
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // ─── Lọc & Bộ lọc ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('all'); // all, visual, structure, material, tracking
  const [showInactive, setShowInactive] = useState(true); // hiển thị cả lỗi ngừng dùng

  // ─── Phân trang ─────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // ─── Quản lý Modals / Trạng thái Form ────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null); // null = tạo mới, object = chỉnh sửa
  const [formData, setFormData] = useState({
    name: '',
    category: 'visual',
    stage: [], // Thay đổi thành array
    description: '',
    needs_tracking: false, // QA tracking
    qc_tracking: false,    // QC tracking
    is_active: true
  });
  
  // ─── Xác nhận Xóa ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // object cần xóa

  // ─── Trạng thái Toast thông báo ────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Hiển thị thông báo nhanh
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Tải dữ liệu từ API
  const fetchDefects = async () => {
    setLoading(true);
    try {
      // Gọi endpoint lấy danh mục lỗi
      // API hỗ trợ include_inactive
      const data = await api.get(`/inspections/defect-types?include_inactive=${showInactive}`);
      if (Array.isArray(data)) {
        setDefects(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục lỗi:', err);
      showToast('Không thể tải danh sách lỗi từ hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefects();
  }, [showInactive]);

  // Bộ lọc theo Tab và Ô tìm kiếm
  const filteredDefects = defects.filter(item => {
    // 1. Tìm kiếm theo tên
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Lọc theo Tab chuyên biệt
    let matchesTab = true;
    if (activeTab === 'visual') matchesTab = item.category === 'visual';
    else if (activeTab === 'structure') matchesTab = item.category === 'structure';
    else if (activeTab === 'material') matchesTab = item.category === 'material';
    else if (activeTab === 'tracking') matchesTab = item.needs_tracking === true;

    return matchesSearch && matchesTab;
  });

  // Tính toán phân trang
  const totalItems = filteredDefects.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDefects = filteredDefects.slice(startIndex, startIndex + pageSize);

  // Mở form thêm mới
  const handleOpenCreate = () => {
    setEditingDefect(null);
    setFormData({
      name: '',
      category: 'visual',
      stage: [], // Thay đổi thành array
      description: '',
      needs_tracking: false,
      qc_tracking: false,
      is_active: true
    });
    setIsFormOpen(true);
  };

  // Mở form chỉnh sửa
  const handleOpenEdit = (defect) => {
    setEditingDefect(defect);
    
    // Parse stage from JSON if it's a string
    let parsedStage = [];
    try {
      if (defect.stage) {
        if (defect.stage.startsWith('[')) {
          parsedStage = JSON.parse(defect.stage);
        } else {
          // Fallback for old data: comma separated string
          parsedStage = defect.stage.split(',').map(s => s.trim()).filter(s => s);
        }
      }
    } catch (e) {
      console.error("Error parsing stage:", e);
      parsedStage = defect.stage ? [defect.stage] : [];
    }

    setFormData({
      name: defect.name,
      category: defect.category,
      stage: parsedStage,
      description: defect.description || '',
      needs_tracking: defect.needs_tracking,
      qc_tracking: defect.qc_tracking || false,
      is_active: defect.is_active
    });
    setIsFormOpen(true);
  };

  // Thay đổi giá trị Form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Lưu Form (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên lỗi', 'error');
      return;
    }

    try {
      // Chuẩn bị payload: Chuyển array stage thành JSON string
      const payload = {
        ...formData,
        stage: JSON.stringify(formData.stage)
      };

      if (editingDefect) {
        // Cập nhật lỗi (PUT)
        await api.put(`/inspections/defect-types/${editingDefect.id}`, payload);
        showToast('Cập nhật thông tin lỗi thành công');
      } else {
        // Tạo lỗi mới (POST)
        await api.post('/inspections/defect-types', payload);
        showToast('Thêm loại lỗi mới thành công');
      }
      setIsFormOpen(false);
      fetchDefects();
    } catch (err) {
      console.error('Lỗi khi lưu thông tin lỗi:', err);
      showToast(err.response?.data?.detail || 'Lưu thất bại. Vui lòng thử lại!', 'error');
    }
  };

  // Bật/tắt nhanh trạng thái Cần theo dõi (Inline Toggle)
  const handleToggleTracking = async (defect, type = 'qa') => {
    try {
      const endpoint = type === 'qa' ? 'toggle-tracking' : 'toggle-qc-tracking';
      await api.patch(`/inspections/defect-types/${defect.id}/${endpoint}`);
      showToast(`Đã cập nhật trạng thái theo dõi ${type === 'qa' ? 'QA' : 'QC'} cho lỗi "${defect.name}"`);
      // Update local state instantly to feel responsive
      setDefects(prev => prev.map(item => 
        item.id === defect.id ? { 
          ...item, 
          needs_tracking: type === 'qa' ? !item.needs_tracking : item.needs_tracking,
          qc_tracking: type === 'qc' ? !item.qc_tracking : item.qc_tracking
        } : item
      ));
    } catch (err) {
      console.error(`Lỗi khi cập nhật trạng thái theo dõi ${type}:`, err);
      showToast('Không thể cập nhật trạng thái theo dõi', 'error');
    }
  };

  // Yêu cầu xóa lỗi
  const handleDeleteRequest = (defect) => {
    setDeleteTarget(defect);
  };

  // Xác nhận Xóa mềm (Ngưng hoạt động)
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/inspections/defect-types/${deleteTarget.id}`);
      showToast(`Đã chuyển lỗi "${deleteTarget.name}" sang ngưng hoạt động`);
      setDeleteTarget(null);
      fetchDefects();
    } catch (err) {
      console.error('Lỗi khi xóa lỗi:', err);
      showToast('Xóa lỗi thất bại. Vui lòng thử lại!', 'error');
    }
  };

  // Mảng định nghĩa nhóm lỗi
  const categoryLabels = {
    visual: 'Ngoại quan',
    structure: 'Kết cấu',
    material: 'Nguyên liệu',
    other: 'Khác',
  };

  const FACTORY_STAGES = [
    "NM1 - Định hình 1",
    "NM1 - Định hình ván 1",
    "NM1 - Lắp ráp, chà nhám 1",
    "NM1 - Sơn 1",
    "NM1 - Đóng gói 1",
    "NM2 - Định hình mặt tiền 2",
    "NM2 - Định hình tủ 2",
    "NM2 - Lắp ráp mặt tiền 2",
    "NM2 - Sơn Pallet 2",
    "NM2 - Sơn treo 2",
    "NM2 - Lắp ráp tủ 2",
    "NM2 - Đóng gói 2",
    "NM3 - Tạo phôi 3",
    "NM3 - Định hình 3",
    "NM3 - Lắp ráp 3",
    "NM3 - Sơn 3",
    "NM3 - Đóng gói 3"
  ];

  return (
    <div className="mgmt-container defect-mgmt-container">
      <div className="mgmt-main">
        {/* Toast Alert */}
        {toast.show && (
          <div className={`toast-alert ${toast.type}`}>
            <span className="toast-icon">{toast.type === 'success' ? '✓' : '✗'}</span>
            <span className="toast-text">{toast.message}</span>
          </div>
        )}

        {/* ── Main Tab Navigation ── */}
        <div className="main-tabs" style={{ display: 'flex', gap: '5px', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', overflowX: 'auto' }}>
          <button
            className={`tab-btn ${viewTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setViewTab('analytics')}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '700',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: viewTab === 'analytics' ? '3px solid #4b301e' : '3px solid transparent',
              color: viewTab === 'analytics' ? '#4b301e' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            📊 Biểu đồ phân tích
          </button>
          <button
            className={`tab-btn ${viewTab === 'list' ? 'active' : ''}`}
            onClick={() => setViewTab('list')}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '700',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: viewTab === 'list' ? '3px solid #4b301e' : '3px solid transparent',
              color: viewTab === 'list' ? '#4b301e' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            📋 Danh sách lỗi
          </button>
          <button
            className={`tab-btn ${viewTab === 'field' ? 'active' : ''}`}
            onClick={() => setViewTab('field')}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '700',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: viewTab === 'field' ? '3px solid #4b301e' : '3px solid transparent',
              color: viewTab === 'field' ? '#4b301e' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            🏭 Lỗi hiện trường
          </button>
          <button
            className={`tab-btn ${viewTab === 'complaint' ? 'active' : ''}`}
            onClick={() => setViewTab('complaint')}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '700',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: viewTab === 'complaint' ? '3px solid #4b301e' : '3px solid transparent',
              color: viewTab === 'complaint' ? '#4b301e' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            ⚠️ Lỗi khiếu nại
          </button>
          <button
            className={`tab-btn ${viewTab === 'capa' ? 'active' : ''}`}
            onClick={() => setViewTab('capa')}
            style={{
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '700',
              border: 'none',
              backgroundColor: 'transparent',
              borderBottom: viewTab === 'capa' ? '3px solid #4b301e' : '3px solid transparent',
              color: viewTab === 'capa' ? '#4b301e' : '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap'
            }}
          >
            🔧 Quản lý CAPA
          </button>
        </div>

        {/* ── Analytics Tab Content ── */}
        {viewTab === 'analytics' && (
          <div className="analytics-view animate-fade-in">
            <DefectAnalytics stage={selectedStage} />
          </div>
        )}

        {/* ── List Tab Content ── */}
        {viewTab === 'list' && (
          <div className="list-view animate-fade-in">
            {/* ── Thanh điều khiển chính (Gộp gọn gàng Toolbar + Filters) ── */}
            <div className="mgmt-toolbar card" style={{ flexDirection: 'column', alignItems: 'stretch', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 15 }}>
                <div className="toolbar-left" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  {/* Ô tìm kiếm */}
                  <div className="search-wrapper">
                    <span className="search-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7B5233" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                    </span>
                    <input
                      type="text"
                      placeholder="Tìm kiếm theo tên lỗi..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1); // Reset page về 1 khi tìm kiếm
                      }}
                    />
                  </div>

                  {/* Combobox lọc Nhóm lỗi (Normal Combobox) */}
                  <div className="filter-group">
                    <select
                      value={activeTab}
                      onChange={(e) => {
                        setActiveTab(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        color: '#4b301e',
                        backgroundColor: '#fff',
                        minWidth: '180px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">Tất cả danh mục</option>
                      <option value="visual">Ngoại quan (Visual)</option>
                      <option value="structure">Kết cấu (Structure)</option>
                      <option value="material">Nguyên liệu (Material)</option>
                      <option value="tracking">Đang theo dõi đặc biệt</option>
                    </select>
                  </div>

                  {/* Lọc theo công đoạn (Dùng cho cả list nếu cần) */}
                  <div className="filter-group">
                    <select 
                      value={selectedStage} 
                      onChange={(e) => setSelectedStage(e.target.value)}
                      style={{ 
                        padding: '10px 16px', 
                        borderRadius: '10px', 
                        border: '1px solid #e2e8f0', 
                        fontSize: '0.9rem',
                        color: '#4b301e',
                        backgroundColor: '#fff',
                        fontWeight: '600',
                        minWidth: '180px'
                      }}
                    >
                      <option value="">Tất cả công đoạn</option>
                      {FACTORY_STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle hiển thị lỗi ngừng hoạt động */}
                  <label className="checkbox-filter" style={{ margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={showInactive} 
                      onChange={(e) => {
                        setShowInactive(e.target.checked);
                        setCurrentPage(1);
                      }} 
                    />
                    <span className="checkbox-text" style={{ fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>Hiển thị lỗi ngưng kích hoạt</span>
                  </label>
                </div>

                <div className="toolbar-right">
                  <button className="btn btn-primary" onClick={handleOpenCreate} style={{ padding: '12px 24px', fontWeight: '800' }}>
                    + Thêm lỗi mới
                  </button>
                </div>
              </div>
            </div>

            {/* ── Bảng dữ liệu chính ── */}
            <div className="mgmt-table card">
              {loading ? (
                <div className="loading-state" style={{ padding: '60px', textAlign: 'center' }}>
                  <div className="spinner"></div>
                  <span style={{ marginTop: '15px', display: 'block', color: '#64748b' }}>Đang tải danh sách lỗi...</span>
                </div>
              ) : (
                <>
                  {/* Bảng Desktop */}
                  <div className="table-responsive desktop-only">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '80px', textAlign: 'center' }}>ID</th>
                          <th>Tên lỗi</th>
                          <th>Mô tả chi tiết</th>
                          <th style={{ width: '180px' }}>Phân nhóm</th>
                          <th style={{ width: '150px' }}>Công đoạn</th>
                          <th style={{ width: '120px', textAlign: 'center' }}>QA Track</th>
                          <th style={{ width: '160px', textAlign: 'center' }}>Trạng thái</th>
                          <th style={{ width: '150px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDefects.length > 0 ? (
                          paginatedDefects.map((defect) => (
                            <tr key={defect.id} className={!defect.is_active ? 'inactive-row' : ''}>
                              <td style={{ textAlign: 'center', color: '#888', fontWeight: 'bold' }}>#{defect.id}</td>
                              <td className="font-bold defect-name-cell">
                                <div>{defect.name}</div>
                              </td>
                              <td style={{ fontSize: '0.85rem', color: '#666' }}>
                                {defect.description || '---'}
                              </td>
                              <td>
                                <span className={`category-badge ${defect.category}`}>
                                  {categoryLabels[defect.category] || defect.category}
                                </span>
                              </td>
                              <td>
                                <div style={{ color: '#555', fontSize: '0.85rem', maxWidth: '200px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {(() => {
                                    try {
                                      if (!defect.stage) return '---';
                                      const stages = defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
                                      if (!Array.isArray(stages) || stages.length === 0) return '---';
                                      return stages.map((s, idx) => (
                                        <span key={idx} className="mgmt-card-chip info" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                          {s}
                                        </span>
                                      ));
                                    } catch (e) {
                                      return defect.stage || '---';
                                    }
                                  })()}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <label className="switch">
                                    <input
                                      type="checkbox"
                                      checked={defect.needs_tracking}
                                      onChange={() => handleToggleTracking(defect, 'qa')}
                                      disabled={!defect.is_active}
                                    />
                                    <span className="slider round" style={{ backgroundColor: defect.needs_tracking ? '#ef4444' : '#ccc' }}></span>
                                  </label>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {defect.is_active ? (
                                  <span className="status-badge active">Đang sử dụng</span>
                                ) : (
                                  <span className="status-badge inactive">Ngừng sử dụng</span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div className="action-buttons-cell">
                                  <button
                                    className="action-icon-btn edit"
                                    onClick={() => handleOpenEdit(defect)}
                                    title="Chỉnh sửa thông tin"
                                  >
                                    ✏️
                                  </button>
                                  {defect.is_active && (
                                    <button
                                      className="action-icon-btn delete"
                                      onClick={() => handleDeleteRequest(defect)}
                                      title="Ngưng kích hoạt"
                                    >
                                      🗑️
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" style={{ textAlign: 'center', padding: '50px 20px', color: '#888' }}>
                               Không tìm thấy loại lỗi nào khớp với bộ lọc hiện tại.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Giao diện Mobile Cards */}
                  <div className="mobile-only mgmt-cards-container">
                    {paginatedDefects.length > 0 ? (
                      paginatedDefects.map((defect) => (
                        <div key={defect.id} className={`mgmt-card ${!defect.is_active ? 'inactive-row' : ''}`}>
                          <div className="mgmt-card-main">
                            <div className="mgmt-card-avatar">
                              #{defect.id}
                            </div>
                            <div className="mgmt-card-details">
                              <div className="mgmt-card-title-row">
                                <h4 className="mgmt-card-title defect-name-cell">{defect.name}</h4>
                              </div>
                              {defect.description && (
                                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>{defect.description}</div>
                              )}
                              <div className="mgmt-card-meta-chips">
                                <span className={`category-badge ${defect.category}`}>
                                  {categoryLabels[defect.category] || defect.category}
                                </span>
                                {(() => {
                                    try {
                                      if (!defect.stage) return null;
                                      const stages = defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
                                      if (!Array.isArray(stages)) return null;
                                      return stages.map((s, idx) => (
                                        <span key={idx} className="mgmt-card-chip info" style={{ fontSize: '0.7rem' }}>
                                          ⚙️ {s}
                                        </span>
                                      ));
                                    } catch (e) {
                                      return null;
                                    }
                                  })()}
                                {defect.needs_tracking && (
                                  <span className="mgmt-card-chip danger" style={{ fontSize: '0.7rem', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}>
                                    ● QA Track
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mgmt-card-actions">
                              <button 
                                className="action-icon-btn"
                                onClick={() => handleOpenEdit(defect)}
                                title="Sửa"
                                style={{ border: '1px solid #EADCC9' }}
                              >✏️</button>
                              {defect.is_active && (
                                <button 
                                  className="action-icon-btn delete"
                                  onClick={() => handleDeleteRequest(defect)}
                                  title="Ngưng kích hoạt"
                                >🗑️</button>
                              )}
                            </div>
                          </div>
                          <div className="mgmt-card-footer">
                            <div className="mgmt-card-footer-left">
                              {defect.is_active ? (
                                <span className="status-badge active" style={{ fontSize: '0.75rem' }}>Đang sử dụng</span>
                              ) : (
                                <span className="status-badge inactive" style={{ fontSize: '0.75rem' }}>Ngừng sử dụng</span>
                              )}
                            </div>
                            <div className="mgmt-card-footer-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: '0.7rem', color: '#666' }}>QA:</span>
                                <label className="switch">
                                  <input
                                    type="checkbox"
                                    checked={defect.needs_tracking}
                                    onChange={() => handleToggleTracking(defect, 'qa')}
                                    disabled={!defect.is_active}
                                  />
                                  <span className="slider round" style={{ backgroundColor: defect.needs_tracking ? '#ef4444' : '#ccc' }}></span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-data-text-mobile" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                        Không tìm thấy loại lỗi nào khớp với bộ lọc hiện tại.
                      </div>
                    )}
                  </div>

                  {/* Phân trang */}
                  {totalItems > 0 && (
                    <div className="pagination" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                      <span className="pagination-info" style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        Hiển thị {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} / {totalItems} kết quả
                      </span>
                      <div className="pagination-controls">
                        <button 
                          disabled={currentPage === 1} 
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                          className="page-btn"
                        >
                          &lt; Trước
                        </button>
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i}
                            className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <button 
                          disabled={currentPage >= totalPages} 
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                          className="page-btn"
                        >
                          Sau &gt;
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Field Defects Tab Content ── */}
        {viewTab === 'field' && (
          <div className="field-view animate-fade-in">
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🏭</div>
              <h3 style={{ color: '#4b301e', marginBottom: '10px' }}>Lỗi hiện trường</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>Quản lý các lỗi phát hiện tại hiện trường sản xuất</p>
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '10px', color: '#94a3b8' }}>
                Tính năng đang được phát triển...
              </div>
            </div>
          </div>
        )}

        {/* ── Complaint Defects Tab Content ── */}
        {viewTab === 'complaint' && (
          <div className="complaint-view animate-fade-in">
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⚠️</div>
              <h3 style={{ color: '#4b301e', marginBottom: '10px' }}>Lỗi khiếu nại</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>Quản lý các lỗi khiếu nại từ khách hàng</p>
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '10px', color: '#94a3b8' }}>
                Tính năng đang được phát triển...
              </div>
            </div>
          </div>
        )}

        {/* ── CAPA Management Tab Content ── */}
        {viewTab === 'capa' && (
          <div className="capa-view animate-fade-in">
            <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔧</div>
              <h3 style={{ color: '#4b301e', marginBottom: '10px' }}>Quản lý CAPA</h3>
              <p style={{ color: '#64748b', marginBottom: '20px' }}>Quản lý Corrective and Preventive Actions</p>
              <div style={{ padding: '20px', backgroundColor: '#f8fafc', borderRadius: '10px', color: '#94a3b8' }}>
                Tính năng đang được phát triển...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: THÊM MỚI / CHỈNH SỬA ── */}
      {isFormOpen && (
        <div className="modal-backdrop">
          <div className="modal-content card">
            <div className="modal-header">
              <h3>{editingDefect ? '✏️ Cập nhật loại lỗi' : '✨ Thêm loại lỗi mới'}</h3>
              <button className="close-btn" onClick={() => setIsFormOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tên lỗi <span className="required">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ví dụ: Bề mặt xước, Cong vênh,..."
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Phân nhóm QC</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    <option value="visual">Ngoại quan (Visual)</option>
                    <option value="structure">Kết cấu (Structure)</option>
                    <option value="material">Nguyên liệu (Material)</option>
                    <option value="other">Khác (Other)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Công đoạn phát sinh <span className="required">*</span></label>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {FACTORY_STAGES.map((s) => (
                      <label key={s} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '0.85rem', 
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={formData.stage.includes(s)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData(prev => ({
                              ...prev,
                              stage: checked 
                                ? [...prev.stage, s]
                                : prev.stage.filter(item => item !== s)
                            }));
                          }}
                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                    * Có thể chọn nhiều công đoạn phát sinh lỗi này.
                  </div>
                </div>

                <div className="form-group">
                  <label>Mô tả chi tiết</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Nhập mô tả thêm về lỗi này (nếu có)..."
                    style={{ minHeight: '80px', padding: '10px' }}
                  />
                </div>

                <div className="form-group-checkbox">
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="needs_tracking"
                      checked={formData.needs_tracking}
                      onChange={handleInputChange}
                    />
                    <span className="slider round" style={{ backgroundColor: formData.needs_tracking ? '#ef4444' : '#ccc' }}></span>
                  </label>
                  <div className="checkbox-info">
                    <span className="checkbox-title" style={{ color: '#ef4444' }}>QA: Theo dõi đặc biệt</span>
                    <span className="checkbox-desc">QA đánh dấu nếu đây là lỗi trọng yếu cần giám sát chặt chẽ. (Màu Đỏ)</span>
                  </div>
                </div>

                <div className="form-group-checkbox">
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <span className="slider round"></span>
                  </label>
                  <div className="checkbox-info">
                    <span className="checkbox-title">Trạng thái kích hoạt</span>
                    <span className="checkbox-desc">Bật để lỗi hiển thị trong danh mục khai báo QC trên Mobile.</span>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setIsFormOpen(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDefect ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: XÁC NHẬN NGƯNG KÍCH HOẠT ── */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-content card" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>⚠️ Xác nhận ngưng hoạt động</h3>
              <button className="close-btn" onClick={() => setDeleteTarget(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0' }}>
              <p>Bạn có chắc chắn muốn ngưng sử dụng lỗi <strong>"{deleteTarget.name}"</strong> không?</p>
              <p style={{ color: '#D32F2F', fontSize: '0.85rem', marginTop: '10px' }}>
                * Lỗi này sẽ không xuất hiện trong các mục tạo QC mới trên Mobile nhưng dữ liệu lịch sử cũ vẫn được giữ nguyên.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setDeleteTarget(null)}>
                Hủy bỏ
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Ngưng sử dụng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DefectManagement;
