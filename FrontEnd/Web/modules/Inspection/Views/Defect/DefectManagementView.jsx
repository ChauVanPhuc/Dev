import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '@webShared/Services/api.service';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, ComposedChart 
} from 'recharts';
import { Calendar, Filter, ChevronDown, ChevronUp, BarChart3, PieChart as PieChartIcon, TrendingUp, RefreshCw, ChevronLeft, ChevronRight, Search, Edit, Trash2, Camera, Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import ClaimListView from '@modules/Claim/views/Claim/ClaimListView';

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
  const [allDailyRecords, setAllDailyRecords] = useState([]);

  useEffect(() => {
    const fetchAllRecords = async () => {
      try {
        const res = await api.get('/inspections/daily?limit=1000');
        if (Array.isArray(res)) setAllDailyRecords(res);
      } catch (err) {
        console.error("Error fetching all daily records for filter options:", err);
      }
    };
    fetchAllRecords();
  }, []);

  // 1. Available Years (NĂM có dữ liệu)
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    allDailyRecords.forEach(item => {
      if (item.inspection_date) {
        const y = new Date(item.inspection_date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allDailyRecords]);

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  // 2. Available Months (THÁNG có dữ liệu trong năm đã chọn)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    allDailyRecords.forEach(item => {
      if (item.inspection_date) {
        const d = new Date(item.inspection_date);
        if (d.getFullYear() === selectedYear) {
          monthsSet.add(d.getMonth() + 1);
        }
      }
    });
    if (monthsSet.size === 0) {
      const currentMonth = new Date().getMonth() + 1;
      monthsSet.add(currentMonth);
    }
    return Array.from(monthsSet).sort((a, b) => a - b);
  }, [allDailyRecords, selectedYear]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // 3. Available Weeks (TUẦN có dữ liệu trong năm đã chọn)
  const availableWeeks = useMemo(() => {
    const weeksSet = new Set();
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };

    allDailyRecords.forEach(item => {
      if (item.inspection_date) {
        const d = new Date(item.inspection_date);
        if (d.getFullYear() === selectedYear) {
          const w = getWeekNumber(d);
          if (w >= 1 && w <= 52) weeksSet.add(w);
        }
      }
    });
    if (weeksSet.size === 0) weeksSet.add(1);
    return Array.from(weeksSet).sort((a, b) => a - b);
  }, [allDailyRecords, selectedYear]);

  useEffect(() => {
    if (availableWeeks.length > 0 && !availableWeeks.includes(selectedWeek)) {
      setSelectedWeek(availableWeeks[0]);
    }
  }, [availableWeeks]);

  // 4. Available Categories (NHÓM LỖI có dữ liệu)
  const availableCategories = useMemo(() => {
    const categoryLabels = {
      'visual': 'Ngoại quan',
      'paint': 'Sơn',
      'structure': 'Kết cấu',
      'material': 'Nguyên liệu',
      'other': 'Khác'
    };
    const catSet = new Set();
    allDailyRecords.forEach(item => {
      if (Array.isArray(item.defects)) {
        item.defects.forEach(def => {
          if (def.defect_type && def.defect_type.category) {
            catSet.add(def.defect_type.category);
          }
        });
      }
    });
    if (catSet.size === 0) {
      return Object.keys(categoryLabels).map(k => ({ key: k, label: categoryLabels[k] }));
    }
    return Array.from(catSet).map(k => ({ key: k, label: categoryLabels[k] || k }));
  }, [allDailyRecords]);

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
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
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
                  {availableMonths.map(m => <option key={m} value={m}>Tháng {m}</option>)}
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
                  {availableWeeks.map(w => <option key={w} value={w}>Tuần {w}</option>)}
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
                {availableCategories.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
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
      <div className="stats-grid" style={{ marginBottom: '25px' }}>
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

      <div className="charts-grid">
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
        <div className="chart-container card chart-full-width" style={{ padding: '20px' }}>
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
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/defects');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  const [viewTab, setViewTab] = useState('analytics'); // 'analytics', 'list', 'field', 'complaint', 'capa'
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActionMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // ─── Tải danh mục Bộ phận từ hệ thống (Chỉ lấy bộ phận thuộc Phòng ban QLCL) ───
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await api.get('/departments/?role_name=QLCL');
        if (Array.isArray(data)) {
          const qlclDepts = data.filter(d => 
            (d.role_name || '').toUpperCase().includes('QLCL') ||
            (d.role_name || '').toLowerCase().includes('chất lượng')
          );
          setDepartments(qlclDepts.length > 0 ? qlclDepts : data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách bộ phận QLCL:', err);
      }
    };
    fetchDepartments();
  }, []);

  // Gom nhóm các bộ phận theo Phòng ban (role_name)
  const groupedDepartments = useMemo(() => {
    const groups = {};
    departments.forEach(dept => {
      const roleName = dept.role_name || 'Bộ phận khác';
      if (!groups[roleName]) {
        groups[roleName] = [];
      }
      groups[roleName].push(dept);
    });
    return groups;
  }, [departments]);

  // ─── Dữ liệu danh sách ──────────────────────────────────────
  const [defects, setDefects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Lọc & Bộ lọc ──────────────────────────────────────────
  const [defectCategories, setDefectCategories] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // all, or dynamic category codes, tracking
  const [showInactive, setShowInactive] = useState(true); // hiển thị cả lỗi ngừng dùng
  const [selectedAql, setSelectedAql] = useState('all'); // all, Major, Minor
  const [sortBy, setSortBy] = useState('default'); // 'default', 'monthly_rate', 'all_time_rate'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'

  // ─── Phân trang ─────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // ─── Quản lý Modals / Trạng thái Form ────────────────────────
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState(null); // null = tạo mới, object = chỉnh sửa
  const [formData, setFormData] = useState({
    name: '',
    category: 'visual',
    stage: [], // Mảng chứa danh sách tên bộ phận áp dụng
    description: '',
    needs_tracking: false, // QA tracking
    qc_tracking: false,    // QC tracking
    is_active: true,
    code: '',
    aql_class: 'Minor',
    images: [] // Danh sách URL ảnh minh họa mẫu lỗi (tối đa 5 ảnh)
  });
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const imageUploadRef = useRef(null);

  // ─── Modal xem ảnh phóng to (Lightbox Preview) ──────────────
  const [previewModal, setPreviewModal] = useState({
    isOpen: false,
    images: [],
    currentIndex: 0,
    title: ''
  });
  
  // ─── Xác nhận Xóa ──────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState(null); // object cần xóa

  // ─── Trạng thái Toast thông báo ────────────────────────────
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // ─── Import Excel Ref & Handler ──────────────────────────
  const fileInputRef = useRef(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportExcelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsImporting(true);
    showToast('Đang tiến hành import danh mục lỗi từ Excel...', 'info');

    try {
      const res = await api.post('/inspections/defect-types/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(res.message || res.data?.message || 'Import thành công!', 'success');
      fetchDefects();
    } catch (err) {
      console.error('Lỗi khi import Excel:', err);
      showToast(err.response?.data?.detail || 'Import Excel thất bại', 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  // Hiển thị thông báo nhanh
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Tải danh mục phân nhóm lỗi từ API
  const fetchCategories = async () => {
    try {
      const res = await api.get('/inspections/defect-categories?include_inactive=true');
      if (Array.isArray(res)) {
        setDefectCategories(res);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục phân nhóm lỗi:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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

  // Nhãn danh mục hiển thị (tối giản trên 1 hàng)
  const categoryLabels = useMemo(() => {
    const defaultLabels = {
      'visual': 'Ngoại quan',
      'paint': 'Sơn & Bề mặt',
      'structure': 'Kết cấu',
      'material': 'Nguyên liệu',
      'other': 'Khác'
    };
    defectCategories.forEach(cat => {
      let cleanName = cat.name;
      if (cleanName && cleanName.includes('(')) {
        cleanName = cleanName.split('(')[0].trim();
      }
      defaultLabels[cat.code] = cleanName || cat.name;
    });
    return defaultLabels;
  }, [defectCategories]);

  // Bộ lọc theo Tab, Ô tìm kiếm, Bộ phận và Mức AQL
  const filteredDefects = defects.filter(item => {
    // 1. Tìm kiếm theo tên hoặc mã lỗi G7
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      item.name.toLowerCase().includes(query) ||
      (item.code && item.code.toLowerCase().includes(query));
    
    // 2. Lọc theo Tab chuyên biệt
    let matchesTab = true;
    if (activeTab === 'tracking') {
      matchesTab = item.needs_tracking === true;
    } else if (activeTab !== 'all') {
      matchesTab = (item.category || '').toLowerCase() === activeTab.toLowerCase();
    }

    // 3. Lọc theo Bộ phận (department / stage)
    let matchesDepartment = true;
    if (selectedDepartment) {
      try {
        if (item.stage) {
          const parsedStages = typeof item.stage === 'string' ? JSON.parse(item.stage) : item.stage;
          matchesDepartment = Array.isArray(parsedStages) && parsedStages.includes(selectedDepartment);
        } else {
          matchesDepartment = false;
        }
      } catch (e) {
        matchesDepartment = item.stage && item.stage.includes(selectedDepartment);
      }
    }

    // 4. Lọc theo Mức AQL
    let matchesAql = true;
    if (selectedAql !== 'all') {
      matchesAql = item.aql_class === selectedAql;
    }

    return matchesSearch && matchesTab && matchesDepartment && matchesAql;
  });

  // Sắp xếp danh sách (ví dụ: theo Tỷ lệ lỗi tháng hoặc all-time)
  const sortedDefects = useMemo(() => {
    let result = [...filteredDefects];
    if (sortBy === 'monthly_rate') {
      result.sort((a, b) => {
        const valA = a.monthly_rate || 0;
        const valB = b.monthly_rate || 0;
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
    } else if (sortBy === 'all_time_rate') {
      result.sort((a, b) => {
        const valA = a.all_time_rate || 0;
        const valB = b.all_time_rate || 0;
        return sortOrder === 'desc' ? valB - valA : valA - valB;
      });
    }
    return result;
  }, [filteredDefects, sortBy, sortOrder]);

  // Tính toán phân trang
  const totalItems = sortedDefects.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDefects = sortedDefects.slice(startIndex, startIndex + pageSize);

  // Tự động sinh mã lỗi G7 không trùng lặp (đọc tiền tố động từ DB)
  const fetchNextDefectCode = async (category = 'visual') => {
    try {
      const res = await api.get(`/inspections/defect-types/generate-code?category=${encodeURIComponent(category)}`);
      if (res && res.code) {
        setFormData(prev => ({ ...prev, code: res.code }));
        return res.code;
      }
    } catch (err) {
      console.warn("Lỗi khi lấy mã tự sinh từ backend:", err);
    }
    // Fallback tự sinh tại frontend dựa vào danh sách đã tải
    const catObj = defectCategories.find(c => c.code.toLowerCase() === (category || '').toLowerCase());
    const prefix = catObj?.prefix || (category.slice(0, 3)).toUpperCase() || 'APP';
    const pattern = new RegExp(`^${prefix}[-_]?(\\d+)$`, 'i');
    let maxNum = 0;
    defects.forEach(d => {
      if (d.code) {
        const m = d.code.match(pattern);
        if (m) {
          const num = parseInt(m[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    const nextCode = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, code: nextCode }));
    return nextCode;
  };

  // Trích xuất danh sách ảnh minh họa của lỗi
  const getDefectImages = (defect) => {
    if (!defect || !defect.images) return [];
    try {
      const imgs = typeof defect.images === 'string' ? JSON.parse(defect.images) : defect.images;
      return Array.isArray(imgs) ? imgs.filter(Boolean) : [imgs].filter(Boolean);
    } catch (e) {
      return defect.images ? [defect.images] : [];
    }
  };

  // Mở form thêm mới
  const handleOpenCreate = () => {
    setEditingDefect(null);
    const initialCategory = defectCategories.length > 0 ? defectCategories[0].code : 'visual';

    setFormData({
      name: '',
      category: initialCategory,
      stage: [],
      description: '',
      needs_tracking: false,
      qc_tracking: false,
      is_active: true,
      code: '',
      aql_class: 'Minor',
      images: []
    });
    setIsFormOpen(true);
    fetchNextDefectCode(initialCategory);
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
      console.error("Error parsing stage/department:", e);
      parsedStage = defect.stage ? [defect.stage] : [];
    }

    setFormData({
      name: defect.name,
      category: defect.category,
      stage: parsedStage,
      description: defect.description || '',
      needs_tracking: defect.needs_tracking,
      qc_tracking: defect.qc_tracking || false,
      is_active: defect.is_active,
      code: defect.code || '',
      aql_class: defect.aql_class || 'Minor',
      images: getDefectImages(defect)
    });
    setIsFormOpen(true);
  };

  // Quản lý upload ảnh minh họa mẫu lỗi (tối đa 5 ảnh)
  const handleAddImagesClick = () => {
    if (imageUploadRef.current) {
      imageUploadRef.current.click();
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentCount = (formData.images || []).length;
    const availableSlots = 5 - currentCount;

    if (availableSlots <= 0) {
      showToast('Đã đạt tối đa 5 hình ảnh minh họa cho loại lỗi này!', 'warning');
      e.target.value = '';
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      showToast(`Chỉ có thể tải thêm ${availableSlots} ảnh để không vượt quá giới hạn 5 ảnh.`, 'info');
    }

    const uploadData = new FormData();
    filesToUpload.forEach(f => uploadData.append('files', f));

    setIsUploadingImages(true);
    try {
      const res = await api.post('/inspections/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newPaths = res.paths || (res.data && res.data.paths) || [];
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...newPaths].slice(0, 5)
      }));
      showToast(`Đã tải lên ${newPaths.length} ảnh minh họa thành công`);
    } catch (err) {
      console.error('Lỗi khi tải ảnh minh họa:', err);
      showToast(err.response?.data?.detail || 'Tải ảnh thất bại. Vui lòng thử lại!', 'error');
    } finally {
      setIsUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      images: (prev.images || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Thay đổi giá trị Form
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value
      }));
      // Tự sinh lại mã lỗi theo nhóm mới khi đang tạo mới
      if (!editingDefect) {
        fetchNextDefectCode(value);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Lưu Form (Tạo mới hoặc Cập nhật)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên lỗi', 'error');
      return;
    }

    try {
      // Chuẩn bị payload: Chuyển array stage và images thành JSON string
      const payload = {
        ...formData,
        stage: JSON.stringify(formData.stage),
        images: formData.images && formData.images.length > 0 ? JSON.stringify(formData.images) : null
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

  const renderCompactDepartments = (stageStr) => {
    try {
      if (!stageStr) return null;
      const stages = stageStr.startsWith('[') ? JSON.parse(stageStr) : [stageStr];
      if (!Array.isArray(stages) || stages.length === 0) return null;
      
      if (stages.length <= 2) {
        return stages.map((s, idx) => (
          <span key={idx} className="mgmt-card-chip info" style={{ fontSize: '0.7rem' }}>
            🏢 {s}
          </span>
        ));
      } else {
        return (
          <>
            {stages.slice(0, 2).map((s, idx) => (
              <span key={idx} className="mgmt-card-chip info" style={{ fontSize: '0.7rem' }}>
                🏢 {s}
              </span>
            ))}
            <span className="mgmt-card-chip info" style={{ backgroundColor: '#e2e8f0', color: '#475569', fontWeight: 'bold', fontSize: '0.7rem' }}>
              +{stages.length - 2}
            </span>
          </>
        );
      }
    } catch (e) {
      return null;
    }
  };

  return (
    <>
      <div className="mgmt-container defect-mgmt-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .defect-mgmt-tabs {
          flex-shrink: 0 !important;
        }
        .analytics-view, .list-view {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .complaint-view {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .defect-list-layout {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 769px) {
          .defect-list-layout {
            height: calc(100vh - 250px);
            display: flex;
            flex-direction: column;
            min-width: 0; /* Ngăn flex item giãn ngang theo bảng */
            width: 100%;
          }
          .defect-table-card {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
            min-width: 0; /* Ngăn flex item giãn ngang theo bảng */
            width: 100%;
            margin-bottom: 0 !important;
            padding: 0 !important;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(123, 82, 51, 0.08) !important;
          }
          .defect-table-scroll {
            flex: 1;
            overflow-y: auto;
            overflow-x: auto;
            min-height: 0;
            min-width: 0;
            width: 100%;
          }
          .defect-table-scroll .data-table {
            margin-bottom: 0 !important;
          }
          .defect-table-scroll .data-table thead th {
            position: sticky !important;
            top: 0 !important;
            z-index: 10 !important;
            background-color: #FAF6F0 !important;
          }
          .defect-pagination-desktop {
            flex-shrink: 0;
            display: flex !important;
            justify-content: space-between;
            align-items: center;
            background: #fff;
            border-top: 1px solid #EADCC9; /* Đường kẻ trên thay vì viền bao quanh */
            padding: 15px 20px;
          }
        }
        @media (max-width: 768px) {
          .defect-pagination-desktop { display: none !important; }
          .defect-table-scroll { overflow-y: visible !important; max-height: none !important; }
          .mgmt-card-meta-chips {
            display: flex !important;
            flex-wrap: wrap !important;
            gap: 6px !important;
            align-items: center !important;
            margin: 8px 0 !important;
          }
          .mgmt-card-meta-chips .category-badge,
          .mgmt-card-meta-chips .mgmt-card-chip {
            display: inline-flex !important;
            align-items: center !important;
            margin: 0 !important;
            font-size: 0.7rem !important;
            padding: 4px 8px !important;
            height: auto !important;
            line-height: 1.2 !important;
            border-radius: 6px !important;
            white-space: nowrap !important;
          }
        }
        .modal-backdrop {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .modal-content, .modal-content:hover {
          transform: none !important;
          animation: none !important;
          transition: none !important;
        }
        .modal-footer .btn:hover {
          transform: none !important;
        }
      `}} />
      <div className="mgmt-main">
        {/* Toast Alert */}
        {toast.show && (
          <div className={`toast-alert ${toast.type}`}>
            <span className="toast-icon">{toast.type === 'success' ? '✓' : '✗'}</span>
            <span className="toast-text">{toast.message}</span>
          </div>
        )}

        {/* ── Main Tab Navigation ── */}
        <div className="main-tabs defect-mgmt-tabs">
          <button
            className={`tab-btn ${viewTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setViewTab('analytics')}
          >
            <span className="tab-emoji">📊</span>
            <span className="tab-text-desktop">Biểu đồ phân tích</span>
            <span className="tab-text-mobile">Biểu đồ</span>
          </button>
          <button
            className={`tab-btn ${viewTab === 'list' ? 'active' : ''}`}
            onClick={() => setViewTab('list')}
          >
            <span className="tab-emoji">📋</span>
            <span className="tab-text-desktop">Danh sách lỗi</span>
            <span className="tab-text-mobile">Danh sách</span>
          </button>
          <button
            className={`tab-btn ${viewTab === 'field' ? 'active' : ''}`}
            onClick={() => setViewTab('field')}
          >
            <span className="tab-emoji">🏭</span>
            <span className="tab-text-desktop">Lỗi hiện trường</span>
            <span className="tab-text-mobile">Hiện trường</span>
          </button>
          <button
            className={`tab-btn ${viewTab === 'complaint' ? 'active' : ''}`}
            onClick={() => setViewTab('complaint')}
          >
            <span className="tab-emoji">⚠️</span>
            <span className="tab-text-desktop">Lỗi khiếu nại</span>
            <span className="tab-text-mobile">Khiếu nại</span>
          </button>
          <button
            className={`tab-btn ${viewTab === 'capa' ? 'active' : ''}`}
            onClick={() => setViewTab('capa')}
          >
            <span className="tab-emoji">🔧</span>
            <span className="tab-text-desktop">Quản lý CAPA</span>
            <span className="tab-text-mobile">CAPA</span>
          </button>
        </div>

        {/* ── Analytics Tab Content ── */}
        {viewTab === 'analytics' && (
          <div className="analytics-view animate-fade-in">
            <DefectAnalytics stage={selectedDepartment} />
          </div>
        )}

        {/* ── List Tab Content ── */}
        {viewTab === 'list' && (
          <div className="list-view animate-fade-in">
            {/* ── Thanh điều khiển chính (Gộp gọn gàng Toolbar + Filters) ── */}
            {/* ── Thanh điều khiển chính (Gộp gọn gàng Toolbar + Filters) ── */}
            {/* ── Thanh điều khiển chính (Gộp gọn gàng Toolbar + Filters) ── */}
            <style>{`
              .defect-toolbar-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
                padding: 15px; 
                background: #fff; 
                border-radius: 12px;
                border: 1px solid #EADCC9;
                margin-bottom: 20px;
              }
              .defect-row-1, .defect-row-2, .defect-row-3 {
                display: flex;
                gap: 8px;
                width: 100%;
                align-items: center;
              }
              .defect-row-3 {
                justify-content: space-between;
                flex-wrap: wrap;
              }
              @media (min-width: 1024px) {
                .defect-toolbar-container {
                  flex-direction: row !important;
                  flex-wrap: nowrap !important;
                  align-items: center !important;
                  padding: 10px 15px !important;
                }
                .defect-row-1 {
                  width: auto !important;
                  flex: 2.5 !important;
                }
                .defect-row-2 {
                  width: auto !important;
                  flex: 2 !important;
                }
                .defect-row-3 {
                  width: auto !important;
                  flex: 3 !important;
                  justify-content: flex-end !important;
                  flex-wrap: nowrap !important;
                }
                .defect-toolbar-container select {
                  min-width: 110px !important;
                  max-width: 165px !important;
                }
                .defect-toolbar-container .page-size-select {
                  min-width: 95px !important;
                }
              }
              @media (max-width: 768px) {
                .defect-mgmt-tabs {
                  margin-bottom: 0 !important;
                }
                .defect-toolbar-container {
                  position: sticky !important;
                  top: 104px !important;
                  z-index: 100 !important;
                  background: #FAF6F0 !important;
                  border-radius: 0 !important;
                  border-left: none !important;
                  border-right: none !important;
                  border-top: none !important;
                  border-bottom: 1px solid #EADCC9 !important;
                  margin-left: -15px !important;
                  margin-right: -15px !important;
                  margin-bottom: 15px !important;
                  padding: 10px 15px !important;
                  box-shadow: 0 4px 6px rgba(123, 82, 51, 0.05) !important;
                }
              }
            `}</style>
            <PageToolbar
              title={title}
              subtitle={subtitle}
              screenCode={screenCode}
              searchValue={searchQuery}
              onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
              searchPlaceholder="Tìm theo tên, mã G7, lỗi khách..."
              showFilter={true}
              isFilterOpen={isFilterBarOpen}
              onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
              activeFiltersCount={
                (activeTab !== 'all' ? 1 : 0) +
                (selectedAql !== 'all' ? 1 : 0) +
                (selectedDepartment ? 1 : 0) +
                (!showInactive ? 1 : 0)
              }
              importActions={[
                { label: 'Import Bảng phân loại lỗi (.xlsx)', onClick: handleImportExcelClick }
              ]}
              onCreate={handleOpenCreate}
              createLabel="Thêm lỗi"
              hasWritePermission={true}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".xlsx, .xls"
                onChange={handleFileChange}
              />
            </PageToolbar>

            {/* INLINE EXPANDABLE FILTER BAR */}
            {isFilterBarOpen && (
              <div className="filter-inline-bar">
                {/* Lọc theo Phân nhóm */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Danh mục lỗi</label>
                  <select
                    value={activeTab}
                    onChange={(e) => {
                      setActiveTab(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">Tất cả danh mục</option>
                    <option value="tracking">Theo dõi đặc biệt</option>
                    {defectCategories.map(cat => (
                      <option key={cat.code} value={cat.code}>
                        {cat.name} ({cat.prefix})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lọc theo mức AQL */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Mức AQL</label>
                  <select 
                    value={selectedAql} 
                    onChange={(e) => { setSelectedAql(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">Tất cả mức AQL</option>
                    <option value="Major">Nặng (Major)</option>
                    <option value="Minor">Nhẹ (Minor)</option>
                  </select>
                </div>

                {/* Lọc theo Bộ phận */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Bộ phận</label>
                  <select 
                    value={selectedDepartment} 
                    onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="">Tất cả bộ phận</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Hiển thị số dòng */}
                <div className="filter-field-group">
                  <label className="filter-field-label">Hiển thị số dòng</label>
                  <select 
                    value={pageSize} 
                    onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                  >
                    <option value={15}>15 dòng</option>
                    <option value={30}>30 dòng</option>
                    <option value={50}>50 dòng</option>
                    <option value={100}>100 dòng</option>
                  </select>
                </div>

                {/* Trạng thái hoạt động */}
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                  <label className="checkbox-filter" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={showInactive} 
                      onChange={(e) => {
                        setShowInactive(e.target.checked);
                        setCurrentPage(1);
                      }} 
                    />
                    <span className="checkbox-text" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#7B5233', whiteSpace: 'nowrap' }}>Hiện ngưng dùng</span>
                  </label>
                </div>

                {(activeTab !== 'all' || selectedAql !== 'all' || selectedDepartment || !showInactive || pageSize !== 15 || searchQuery) && (
                  <div className="filter-field-group">
            <button
                      type="button"
                      className="page-btn"
                      onClick={() => {
                        setActiveTab('all');
                        setSelectedAql('all');
                        setSelectedDepartment('');
                        setShowInactive(true);
                        setPageSize(15);
                        setSearchQuery('');
                        setCurrentPage(1);
                      }}
                      style={{
                        height: '36px',
                        padding: '0 12px',
                        fontSize: '0.8rem',
                        backgroundColor: '#FAF6F0',
                        color: '#7B5233',
                        border: '1px solid #EADCC9',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Layout wrapper: table cuộn nội bộ, pagination cố định đáy ── */}
            <div className="defect-list-layout">

            {/* ── Bảng dữ liệu chính ── */}
            <div className="mgmt-table card defect-table-card">
              {loading ? (
                <div className="loading-state" style={{ padding: '60px', textAlign: 'center' }}>
                  <div className="spinner"></div>
                  <span style={{ marginTop: '15px', display: 'block', color: '#64748b' }}>Đang tải danh sách lỗi...</span>
                </div>
              ) : (
                <>
                  {/* Bảng Desktop */}
                  <div className="table-responsive desktop-only defect-table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: '110px', textAlign: 'center' }}>Mã G7 / ID</th>
                          <th>Tên lỗi / Mô tả</th>
                          <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Phân nhóm</th>
                          <th style={{ width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>Mức AQL</th>
                          <th 
                            style={{ 
                              textAlign: 'center', 
                              whiteSpace: 'nowrap', 
                              cursor: 'pointer',
                              userSelect: 'none',
                              backgroundColor: sortBy !== 'default' ? '#F4E8DB' : undefined
                            }}
                            onClick={() => {
                              if (sortBy === 'default') {
                                setSortBy('monthly_rate');
                                setSortOrder('desc');
                              } else if (sortBy === 'monthly_rate') {
                                setSortBy('all_time_rate');
                                setSortOrder('desc');
                              } else {
                                setSortBy('default');
                              }
                            }}
                            title="Click để đổi sắp xếp theo tỷ lệ lỗi: Tháng ↓ / Toàn bộ ↓ / Mặc định"
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              % Tỷ lệ {sortBy === 'monthly_rate' ? '⏳(Tháng ↓)' : sortBy === 'all_time_rate' ? '🌐(All ↓)' : '(Tháng/All)'}
                            </span>
                          </th>
                          <th style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>Bộ phận</th>
                          <th style={{ width: '90px', textAlign: 'center', whiteSpace: 'nowrap' }}>QA Track</th>
                          <th style={{ width: '130px', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                          <th style={{ width: '80px', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedDefects.length > 0 ? (
                          paginatedDefects.map((defect) => (
                            <tr 
                              key={defect.id}
                              className={`${!defect.is_active ? 'inactive-row' : ''} animate-card-entrance`}
                              style={{
                                position: 'relative',
                                zIndex: actionMenuId === defect.id ? 30 : 1
                              }}
                            >
                              <td style={{ textAlign: 'center', color: '#4b301e', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                {defect.code ? defect.code : `#${defect.id}`}
                              </td>
                              <td className="defect-name-cell">
                                <div style={{ fontWeight: '700', color: '#4b301e' }}>{defect.name}</div>
                                {defect.description && (
                                  <div style={{ fontSize: '0.75rem', color: '#777', fontWeight: 'normal', marginTop: '2px', lineHeight: '1.3' }}>
                                    {defect.description}
                                  </div>
                                )}
                                {/* Hiển thị thumbnails ảnh mẫu lỗi */}
                                {(() => {
                                  const imgs = getDefectImages(defect);
                                  if (imgs.length === 0) return null;
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '6px' }}>
                                      <div style={{ display: 'flex', gap: '4px' }}>
                                        {imgs.slice(0, 3).map((imgUrl, i) => (
                                          <img
                                            key={i}
                                            src={imgUrl}
                                            alt="Mẫu lỗi"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPreviewModal({
                                                isOpen: true,
                                                images: imgs,
                                                currentIndex: i,
                                                title: `${defect.code ? defect.code + ' - ' : ''}${defect.name}`
                                              });
                                            }}
                                            style={{
                                              width: '26px',
                                              height: '26px',
                                              borderRadius: '4px',
                                              objectFit: 'cover',
                                              border: '1px solid #D9B99B',
                                              cursor: 'pointer',
                                              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                                              transition: 'transform 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                            title="Click để phóng to ảnh mẫu lỗi"
                                          />
                                        ))}
                                      </div>
                                      {imgs.length > 3 && (
                                        <span 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewModal({
                                              isOpen: true,
                                              images: imgs,
                                              currentIndex: 0,
                                              title: `${defect.code ? defect.code + ' - ' : ''}${defect.name}`
                                            });
                                          }}
                                          style={{ 
                                            fontSize: '0.68rem', 
                                            color: '#7B5233', 
                                            fontWeight: '700', 
                                            cursor: 'pointer', 
                                            backgroundColor: '#FAF6F0', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px',
                                            border: '1px solid #EADCC9'
                                          }}
                                          title="Xem tất cả ảnh"
                                        >
                                          +{imgs.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()}
                              </td>
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                                <span 
                                  className={`category-badge ${defect.category}`} 
                                  style={{
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block',
                                    fontSize: '0.75rem',
                                    padding: '4px 12px',
                                    ...(defect.category === 'paint' ? { backgroundColor: '#F2D2BD', color: '#7B5233', border: '1px solid #EADCC9' } : {})
                                  }}
                                >
                                  {categoryLabels[defect.category] || defect.category}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {defect.aql_class ? (
                                  <span className="status-badge" style={{
                                    backgroundColor: 
                                      defect.aql_class === 'Major' ? '#fee2e2' : '#f0fdf4',
                                    color: 
                                      defect.aql_class === 'Major' ? '#991b1b' : '#166534',
                                    border: '1px solid currentColor',
                                    fontWeight: '700',
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    borderRadius: '4px'
                                  }}>
                                    {defect.aql_class === 'Major' ? 'Nặng' : 'Nhẹ'}
                                  </span>
                                ) : (
                                  <span style={{ color: '#999' }}>---</span>
                                )}
                              </td>

                              {/* Cột % Tỷ lệ lỗi (Tháng / All) */}
                              <td style={{ textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '4px 8px' }}>
                                <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', fontSize: '0.72rem' }}>
                                  <div 
                                    title={`Tháng này: ${defect.monthly_count || 0} lỗi (${defect.monthly_rate || 0}% tổng số lỗi tháng)`}
                                    style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <span style={{ color: '#888', fontSize: '0.65rem', fontWeight: 'bold' }}>T:</span>
                                    <span style={{ 
                                      fontWeight: '700', 
                                      fontSize: '0.7rem',
                                      color: (defect.monthly_rate || 0) >= 20 ? '#b91c1c' : (defect.monthly_rate || 0) > 0 ? '#b45309' : '#15803d',
                                      backgroundColor: (defect.monthly_rate || 0) >= 20 ? '#fee2e2' : (defect.monthly_rate || 0) > 0 ? '#fef3c7' : '#dcfce7',
                                      padding: '1px 5px',
                                      borderRadius: '3px'
                                    }}>
                                      {defect.monthly_rate !== undefined ? `${defect.monthly_rate}%` : '0%'}
                                    </span>
                                    {(defect.monthly_count || 0) > 0 && (
                                      <span style={{ fontSize: '0.65rem', color: '#777' }}>({defect.monthly_count})</span>
                                    )}
                                  </div>
                                  <div 
                                    title={`Toàn thời gian: ${defect.all_time_count || 0} lỗi (${defect.all_time_rate || 0}% tổng số lỗi toàn bộ)`}
                                    style={{ display: 'flex', alignItems: 'center', gap: '3px' }}
                                  >
                                    <span style={{ color: '#888', fontSize: '0.65rem', fontWeight: 'bold' }}>A:</span>
                                    <span style={{ 
                                      fontWeight: '600', 
                                      fontSize: '0.7rem',
                                      color: '#475569',
                                      backgroundColor: '#f1f5f9',
                                      padding: '1px 5px',
                                      borderRadius: '3px'
                                    }}>
                                      {defect.all_time_rate !== undefined ? `${defect.all_time_rate}%` : '0%'}
                                    </span>
                                    {(defect.all_time_count || 0) > 0 && (
                                      <span style={{ fontSize: '0.65rem', color: '#777' }}>({defect.all_time_count})</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle', padding: '4px 10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', alignItems: 'flex-start' }}>
                                  {(() => {
                                    try {
                                      if (!defect.stage) return <span style={{ color: '#999', fontSize: '0.68rem' }}>---</span>;
                                      const stages = defect.stage.startsWith('[') ? JSON.parse(defect.stage) : [defect.stage];
                                      if (!Array.isArray(stages) || stages.length === 0) return <span style={{ color: '#999', fontSize: '0.68rem' }}>---</span>;
                                      return stages.map((s, idx) => {
                                        // Rút gọn chữ để hiển thị ngắn gọn nhất (vd: "QC Kiểm soát đầu vào" -> "QC Đầu vào")
                                        const shortName = s.replace(/^QC\s+kiểm\s+(soát|tra)\s+/i, 'QC ');
                                        return (
                                          <span 
                                            key={idx} 
                                            title={s}
                                            style={{ 
                                              fontSize: '0.68rem', 
                                              color: '#4b301e',
                                              whiteSpace: 'nowrap',
                                              lineHeight: '1.15',
                                              fontWeight: '500'
                                            }}
                                          >
                                            {shortName}
                                          </span>
                                        );
                                      });
                                    } catch (e) {
                                      return <span style={{ whiteSpace: 'nowrap', fontSize: '0.68rem', color: '#4b301e' }}>{defect.stage || '---'}</span>;
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
                              <td style={{ position: 'relative', textAlign: 'center', zIndex: actionMenuId === defect.id ? 40 : 1 }}>
                                <button
                                  className="action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(actionMenuId === defect.id ? null : defect.id);
                                  }}
                                ><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
                                {actionMenuId === defect.id && (
                                  <div className="action-menu" style={{ right: '50%', transform: 'translateX(50%)', top: '80%' }}>
                                    <button
                                      className="action-menu-item"
                                      onClick={() => {
                                        setActionMenuId(null);
                                        handleOpenEdit(defect);
                                      }}
                                    >
                                      Chỉnh sửa
                                    </button>
                                    {defect.is_active && (
                                      <button
                                        className="action-menu-item danger"
                                        onClick={() => {
                                          setActionMenuId(null);
                                          handleDeleteRequest(defect);
                                        }}
                                      >
                                        Ngưng dùng
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '50px 20px', color: '#888' }}>
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
                        <div key={defect.id} className={`mgmt-card animate-card-entrance ${!defect.is_active ? 'inactive-row' : ''}`}>
                          <div className="mgmt-card-main">
                            <div className="mgmt-card-avatar" style={{ fontSize: '0.65rem', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                              {defect.code ? defect.code : `#${defect.id}`}
                            </div>
                            <div className="mgmt-card-details">
                              <div className="mgmt-card-title-row">
                                <h4 className="mgmt-card-title defect-name-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                                  <span>{defect.name}</span>
                                  {defect.aql_class && (
                                    <span style={{
                                      fontSize: '0.65rem',
                                      fontWeight: 'bold',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      backgroundColor: defect.aql_class === 'Major' ? '#fee2e2' : '#f0fdf4',
                                      color: defect.aql_class === 'Major' ? '#991b1b' : '#166534',
                                    }}>
                                      {defect.aql_class === 'Major' ? 'Nặng' : 'Nhẹ'}
                                    </span>
                                  )}
                                </h4>
                              </div>
                              {defect.description && (
                                <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px', lineHeight: '1.3' }}>{defect.description}</div>
                              )}
                              {/* Hiển thị thumbnails ảnh mẫu lỗi trên mobile card */}
                              {(() => {
                                const imgs = getDefectImages(defect);
                                if (imgs.length === 0) return null;
                                return (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      {imgs.slice(0, 4).map((imgUrl, i) => (
                                        <img
                                          key={i}
                                          src={imgUrl}
                                          alt="Mẫu lỗi"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setPreviewModal({
                                              isOpen: true,
                                              images: imgs,
                                              currentIndex: i,
                                              title: `${defect.code ? defect.code + ' - ' : ''}${defect.name}`
                                            });
                                          }}
                                          style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '6px',
                                            objectFit: 'cover',
                                            border: '1px solid #D9B99B',
                                            cursor: 'pointer'
                                          }}
                                        />
                                      ))}
                                    </div>
                                    {imgs.length > 4 && (
                                      <span 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setPreviewModal({
                                            isOpen: true,
                                            images: imgs,
                                            currentIndex: 0,
                                            title: `${defect.code ? defect.code + ' - ' : ''}${defect.name}`
                                          });
                                        }}
                                        style={{ 
                                          fontSize: '0.7rem', 
                                          color: '#7B5233', 
                                          fontWeight: '700', 
                                          cursor: 'pointer', 
                                          backgroundColor: '#FAF6F0', 
                                          padding: '2px 6px', 
                                          borderRadius: '4px',
                                          border: '1px solid #EADCC9'
                                        }}
                                      >
                                        +{imgs.length - 4}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                              <div className="mgmt-card-meta-chips">
                                <span className={`category-badge ${defect.category}`} style={{
                                  whiteSpace: 'nowrap',
                                  ...(defect.category === 'paint' ? { backgroundColor: '#F2D2BD', color: '#7B5233', border: '1px solid #EADCC9' } : {})
                                }}>
                                  {categoryLabels[defect.category] || defect.category}
                                </span>
                                <span className="mgmt-card-chip" style={{ backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1', fontSize: '0.68rem', whiteSpace: 'nowrap' }}>
                                  📊 T: <strong>{defect.monthly_rate || 0}%</strong> | A: <strong>{defect.all_time_rate || 0}%</strong>
                                </span>
                                {renderCompactDepartments(defect.stage)}
                                {defect.needs_tracking && (
                                  <span className="mgmt-card-chip danger" style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca', whiteSpace: 'nowrap' }}>
                                    ● QA Track
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mgmt-card-actions" style={{ alignSelf: 'flex-start' }}>
                              <button 
                                className="action-icon-btn"
                                onClick={() => handleOpenEdit(defect)}
                                title="Sửa"
                                style={{ border: '1px solid #EADCC9' }}
                              ><Edit size={14} /></button>
                              {defect.is_active && (
                                <button 
                                  className="action-icon-btn delete"
                                  onClick={() => handleDeleteRequest(defect)}
                                  title="Ngưng kích hoạt"
                                ><Trash2 size={14} /></button>
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


                  {/* Phân trang - Mobile Sticky */}
                  {totalItems > 0 && (
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
                    {/* Phân trang - Desktop */}
                    {totalItems > 0 && (
                      <div className="defect-pagination-desktop">
                          <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                              Hiển thị <b>{paginatedDefects.length}</b> trên <b>{totalItems}</b> loại lỗi
                          </div>
                          
                          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
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
              </div>{/* end mgmt-table card */}
            </div>{/* end defect-list-layout */}
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
            <ClaimListView />
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
    </div>

      {/* ── MODAL: THÊM MỚI / CHỈNH SỬA ── */}
      {isFormOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingDefect ? 'Cập nhật loại lỗi' : 'Thêm loại lỗi mới'}</h3>
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

                <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label>Mã lỗi G7 (Code)</label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code || ''}
                      onChange={handleInputChange}
                      placeholder="Ví dụ: APP-005, STR-002..."
                    />
                  </div>
                  <div>
                    <label>Cấp độ nghiêm trọng AQL</label>
                    <select name="aql_class" value={formData.aql_class || 'Minor'} onChange={handleInputChange}>
                      <option value="Minor">Nhẹ (Minor)</option>
                      <option value="Major">Nặng (Major)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Phân nhóm QC</label>
                  <select name="category" value={formData.category} onChange={handleInputChange}>
                    {defectCategories.length > 0 ? (
                      defectCategories
                        .filter(c => c.is_active || c.code === formData.category)
                        .map(cat => (
                          <option key={cat.code} value={cat.code}>
                            {cat.name} ({cat.prefix})
                          </option>
                        ))
                    ) : (
                      <>
                        <option value="visual">Ngoại quan (APP)</option>
                        <option value="structure">Kết cấu (STR)</option>
                        <option value="material">Nguyên liệu (MAT)</option>
                        <option value="paint">Sơn & Bề mặt (PAI)</option>
                        <option value="other">Khác (OTH)</option>
                      </>
                    )}
                  </select>
                </div>


                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontWeight: 600, color: '#4B301E' }}>
                      Bộ phận phụ trách / phát sinh <span className="required">*</span>
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        onClick={() => {
                          const allNames = departments.map(d => d.name).filter(Boolean);
                          setFormData(prev => ({ ...prev, stage: allNames }));
                        }}
                        style={{
                          fontSize: '0.75rem',
                          color: '#7B5233',
                          background: '#FAF6F0',
                          border: '1px solid #EADCC9',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#EADCC9'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                      >
                        Chọn tất cả
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setFormData(prev => ({ ...prev, stage: [] }))}
                        style={{
                          fontSize: '0.75rem',
                          color: '#78716C',
                          background: '#F5F5F4',
                          border: '1px solid #E7E5E4',
                          borderRadius: '6px',
                          padding: '3px 9px',
                          cursor: 'pointer',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E7E5E4'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F5F5F4'}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', 
                    gap: '8px',
                    padding: '12px',
                    backgroundColor: '#FAF8F5',
                    borderRadius: '10px',
                    border: '1.5px solid #EADCC9',
                    maxHeight: '210px',
                    overflowY: 'auto'
                  }}>
                    {departments.length > 0 ? (
                      departments.map((d) => {
                        const isSelected = formData.stage.includes(d.name);
                        return (
                          <div 
                            key={d.id} 
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                stage: isSelected
                                  ? prev.stage.filter(item => item !== d.name)
                                  : [...prev.stage, d.name]
                              }));
                            }}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '10px', 
                              padding: '8px 12px', 
                              borderRadius: '8px', 
                              cursor: 'pointer',
                              userSelect: 'none',
                              backgroundColor: isSelected ? '#FAF3EC' : '#FFFFFF',
                              border: isSelected ? '1.5px solid #7B5233' : '1px solid #E5E7EB',
                              boxShadow: isSelected ? '0 2px 5px rgba(123, 82, 51, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                              transition: 'all 0.18s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = '#CBB49E';
                                e.currentTarget.style.backgroundColor = '#FAFAFA';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.borderColor = '#E5E7EB';
                                e.currentTarget.style.backgroundColor = '#FFFFFF';
                              }
                            }}
                          >
                            <div style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              backgroundColor: isSelected ? '#7B5233' : '#FFFFFF',
                              border: isSelected ? '1.5px solid #7B5233' : '1.5px solid #D1D5DB',
                              transition: 'all 0.15s ease'
                            }}>
                              {isSelected && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                              )}
                            </div>
                            <span style={{ 
                              fontSize: '0.85rem',
                              fontWeight: isSelected ? '600' : '500', 
                              color: isSelected ? '#4B301E' : '#374151',
                              lineHeight: '1.25'
                            }}>
                              {d.name}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '12px 0', gridColumn: '1 / -1' }}>
                        Đang tải danh sách bộ phận...
                      </div>
                    )}
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

                {/* ── Khối Hình ảnh minh họa mẫu lỗi (0 - 5 ảnh) ── */}
                <div className="form-group" style={{ marginTop: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#4B301E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={16} />
                      <span>Hình ảnh minh họa mẫu lỗi</span>
                    </label>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: (formData.images || []).length >= 5 ? '#D97706' : '#7B5233' }}>
                      {(formData.images || []).length} / 5 ảnh
                    </span>
                  </div>

                  <input 
                    type="file" 
                    ref={imageUploadRef} 
                    style={{ display: 'none' }} 
                    multiple 
                    accept="image/*" 
                    onChange={handleImageUpload}
                  />

                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '10px', 
                    alignItems: 'center',
                    padding: '12px',
                    backgroundColor: '#FAF6F0',
                    borderRadius: '8px',
                    border: '1.5px dashed #EADCC9',
                    minHeight: '94px'
                  }}>
                    {(formData.images || []).map((imgUrl, idx) => (
                      <div 
                        key={idx}
                        style={{
                          position: 'relative',
                          width: '74px',
                          height: '74px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '1.5px solid #D9B99B',
                          backgroundColor: '#FFFFFF',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                        }}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Mẫu lỗi ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                          onClick={() => setPreviewModal({
                            isOpen: true,
                            images: formData.images,
                            currentIndex: idx,
                            title: formData.name || 'Ảnh mẫu lỗi'
                          })}
                          title="Click để phóng to ảnh"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage(idx);
                          }}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(220, 38, 38, 0.9)',
                            color: '#FFFFFF',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}
                          title="Xóa ảnh này"
                        >
                          ✕
                        </button>
                        <div style={{
                          position: 'absolute',
                          bottom: '2px',
                          left: '3px',
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          color: '#fff',
                          fontSize: '0.6rem',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          fontWeight: 700
                        }}>
                          #{idx + 1}
                        </div>
                      </div>
                    ))}

                    {(formData.images || []).length < 5 && (
                      <button
                        type="button"
                        onClick={handleAddImagesClick}
                        disabled={isUploadingImages}
                        style={{
                          width: '74px',
                          height: '74px',
                          borderRadius: '8px',
                          border: '1.5px dashed #A67C52',
                          backgroundColor: '#FFFFFF',
                          color: '#7B5233',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '3px',
                          cursor: isUploadingImages ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#7B5233';
                          e.currentTarget.style.backgroundColor = '#F5ECE3';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#A67C52';
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        {isUploadingImages ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            <span style={{ fontSize: '0.62rem' }}>Đang tải...</span>
                          </>
                        ) : (
                          <>
                            <Camera size={18} />
                            <span>Thêm ảnh</span>
                          </>
                        )}
                      </button>
                    )}

                    {(formData.images || []).length === 0 && !isUploadingImages && (
                      <span style={{ fontSize: '0.75rem', color: '#8c6a51', fontStyle: 'italic', marginLeft: '4px' }}>
                        (Tùy chọn: Nhấn "Thêm ảnh" để tải tối đa 5 hình ảnh minh họa mẫu lỗi)
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group-checkbox" style={{ alignItems: 'center' }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      name="needs_tracking"
                      checked={formData.needs_tracking}
                      onChange={handleInputChange}
                    />
                    <span className="slider round"></span>
                  </label>
                  <div className="checkbox-info">
                    <span className="checkbox-title">QA: Theo dõi đặc biệt</span>
                  </div>
                </div>

                <div className="form-group-checkbox" style={{ alignItems: 'center' }}>
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
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Xác nhận ngưng hoạt động</h3>
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

      {/* ── MODAL: XEM ẢNH PHÓNG TO (LIGHTBOX PREVIEW) ── */}
      {previewModal.isOpen && previewModal.images.length > 0 && (
        <div 
          className="modal-backdrop" 
          style={{ 
            zIndex: 9999, 
            backgroundColor: 'rgba(0, 0, 0, 0.88)', 
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
          onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            style={{ 
              position: 'relative', 
              maxWidth: '92vw', 
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header thông tin ảnh */}
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#FFFFFF',
              marginBottom: '12px',
              padding: '0 5px'
            }}>
              <div style={{ fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={18} color="#D9B99B" />
                <span>{previewModal.title || 'Hình ảnh mẫu lỗi'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <span style={{ fontSize: '0.85rem', color: '#D9B99B', fontWeight: 'bold' }}>
                  {previewModal.currentIndex + 1} / {previewModal.images.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.8)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Ảnh phóng to chính */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src={previewModal.images[previewModal.currentIndex]} 
                alt="Mẫu lỗi lớn" 
                style={{ 
                  maxWidth: '85vw', 
                  maxHeight: '75vh', 
                  objectFit: 'contain', 
                  borderRadius: '8px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.15)'
                }} 
              />

              {/* Nút Previous */}
              {previewModal.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPreviewModal(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
                  }))}
                  style={{
                    position: 'absolute',
                    left: '-20px',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#7B5233'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Nút Next */}
              {previewModal.images.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPreviewModal(prev => ({
                    ...prev,
                    currentIndex: (prev.currentIndex + 1) % prev.images.length
                  }))}
                  style={{
                    position: 'absolute',
                    right: '-20px',
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#7B5233'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.65)'}
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            {/* Thumbnail Navigation Bar bên dưới nếu có nhiều ảnh */}
            {previewModal.images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {previewModal.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Thumbnail"
                    onClick={() => setPreviewModal(prev => ({ ...prev, currentIndex: idx }))}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: idx === previewModal.currentIndex ? '2px solid #D9B99B' : '1px solid rgba(255,255,255,0.3)',
                      opacity: idx === previewModal.currentIndex ? 1 : 0.6,
                      transition: 'all 0.15s ease'
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DefectManagement;
