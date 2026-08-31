import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, AlertTriangle, FileText, CheckCircle2, 
  Plus, Edit, Trash2, Search, Filter, RefreshCw, BarChart2, ShieldAlert, Award, FileCheck,
  Users, GraduationCap, Bell, Check, Sliders, Clock
} from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import api from '@webShared/Services/api.service';

const QualityObjectivesView = () => {
  // 6 Tabs as requested in system design:
  // 1: 'objectives' (Mục tiêu chất lượng)
  // 2: 'work_kpi' (Chỉ số công việc)
  // 3: 'violations' (Danh sách vi phạm)
  // 4: 'training' (Kế hoạch đào tạo)
  // 5: 'reports' (Báo cáo và BBCH)
  // 6: 'alerts' (Thiết lập cảnh báo)
  const [activeTab, setActiveTab] = useState('objectives');

  // Common State
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedFactory, setSelectedFactory] = useState('Tất cả');

  // Tab 1: Quality Objectives State
  const [dashboardStats, setDashboardStats] = useState(null);
  const [objectivesList, setObjectivesList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingObj, setEditingObj] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'FPY',
    factory_name: 'Tất cả',
    department_name: 'Tất cả',
    period_type: 'Tháng',
    year: 2026,
    month: 8,
    target_value: 98.5,
    target_unit: '%',
    operator: '>=',
    description: ''
  });

  // Tab 2: Work KPI Mock / Live State
  const [workKpiList, setWorkKpiList] = useState([
    { id: 1, staff_name: 'Nguyễn Văn QA', role: 'QC Lead', factory: 'NM1', inspections_done: 142, defect_catch_rate: 99.1, response_time: '12 phút', score: 98, status: 'Xuất sắc' },
    { id: 2, staff_name: 'Trần Thị QC', role: 'QC Staff', factory: 'NM1', inspections_done: 118, defect_catch_rate: 97.5, response_time: '18 phút', score: 92, status: 'Đạt' },
    { id: 3, staff_name: 'Lê Văn Kiểm', role: 'QC Staff', factory: 'NM2', inspections_done: 135, defect_catch_rate: 98.0, response_time: '15 phút', score: 95, status: 'Đạt' },
    { id: 4, staff_name: 'Phạm Minh Định', role: 'QA Inspector', factory: 'NM3', inspections_done: 96, defect_catch_rate: 96.2, response_time: '25 phút', score: 88, status: 'Cần cải thiện' }
  ]);

  // Tab 3: Violations Data (from /awards-discipline)
  const [violationsList, setViolationsList] = useState([]);

  // Tab 4: Training Plans State
  const [trainingPlans, setTrainingPlans] = useState([
    { id: 1, code: 'DT-2026-01', title: 'Đào tạo nhận diện lỗi bề mặt gỗ Sồi', trainer: 'Nguyễn Văn QA', target_audience: 'QC Định hình & QA', duration: '16h (2 ngày)', participants: 15, schedule: '10/09/2026 - 11/09/2026', status: 'Sắp diễn ra' },
    { id: 2, code: 'DT-2026-02', title: 'Quy trình kiểm định độ ẩm & đo màng sơn theo tiêu chuẩn ISO', trainer: 'Chuyên gia Độc lập', target_audience: 'Toàn bộ QC Nhà máy', duration: '24h (3 ngày)', participants: 25, schedule: '15/08/2026 - 17/08/2026', status: 'Đã hoàn thành' },
    { id: 3, code: 'DT-2026-03', title: 'Kỹ năng lập Biên bản sự cố & Báo cáo nhanh trên Mobile', trainer: 'Bộ phận IT & QA', target_audience: 'Tổ trưởng & QC Lead', duration: '8h (1 ngày)', participants: 18, schedule: '28/09/2026', status: 'Lên kế hoạch' }
  ]);
  
  // Tab 5: Quick Reports & BBCH Data (from /quick-reports)
  const [quickReportsList, setQuickReportsList] = useState([]);

  // Tab 6: Alert Settings State
  const [alertConfigs, setAlertConfigs] = useState([
    { id: 1, metric: 'Tỷ lệ Đạt FPY', condition: '< 95.0%', severity: 'Nguy hiểm (Critical)', channel: 'Zalo & Web Notification', receiver: 'Ban Giám Đốc & QA Manager', is_enabled: true },
    { id: 2, metric: 'Chỉ số Lỗi PPM', condition: '> 1500 PPM', severity: 'Cảnh báo (Warning)', channel: 'Web Notification', receiver: 'Quản lý Xưởng & QC Lead', is_enabled: true },
    { id: 3, metric: 'Số vụ Vi phạm Chất lượng', condition: '>= 2 vụ / tuần', severity: 'Nguy hiểm (Critical)', channel: 'Zalo Group QC', receiver: 'Trưởng phòng Nhân sự & QA', is_enabled: true },
    { id: 4, metric: 'Thời gian xử lý BBCH', condition: '> 48 giờ', severity: 'Nhắc nhở (Info)', channel: 'Web Notification', receiver: 'Người chủ trì cuộc họp', is_enabled: false }
  ]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Fetch Dashboard Stats & Objectives
  const fetchObjectivesData = async () => {
    setLoading(true);
    try {
      const [statsResp, listResp] = await Promise.all([
        api.get(`/quality-objectives/dashboard-stats?year=${selectedYear}`),
        api.get(`/quality-objectives/?year=${selectedYear}&factory=${selectedFactory}`)
      ]);
      setDashboardStats(statsResp || null);
      setObjectivesList(Array.isArray(listResp) ? listResp : []);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu mục tiêu chất lượng:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Violations (/awards-discipline)
  const fetchViolationsData = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/awards-discipline/');
      setViolationsList(Array.isArray(resp) ? resp : (resp?.items || []));
    } catch (err) {
      console.error('Lỗi khi tải danh sách vi phạm:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Quick Reports (/quick-reports)
  const fetchQuickReportsData = async () => {
    setLoading(true);
    try {
      const resp = await api.get('/quick-reports/');
      setQuickReportsList(Array.isArray(resp) ? resp : (resp?.items || []));
    } catch (err) {
      console.error('Lỗi khi tải danh sách báo cáo & BBCH:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'objectives') {
      fetchObjectivesData();
    } else if (activeTab === 'violations') {
      fetchViolationsData();
    } else if (activeTab === 'reports') {
      fetchQuickReportsData();
    }
    setCurrentPage(1);
  }, [activeTab, selectedYear, selectedFactory]);

  // Handle Objective Create / Edit Submit
  const handleSubmitObjective = async (e) => {
    e.preventDefault();
    try {
      if (editingObj) {
        await api.put(`/quality-objectives/${editingObj.id}`, formData);
      } else {
        await api.post('/quality-objectives/', formData);
      }
      setShowModal(false);
      setEditingObj(null);
      fetchObjectivesData();
    } catch (err) {
      alert('Đã xảy ra lỗi khi lưu mục tiêu: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Handle Objective Delete
  const handleDeleteObjective = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa mục tiêu chất lượng này?')) return;
    try {
      await api.delete(`/quality-objectives/${id}`);
      fetchObjectivesData();
    } catch (err) {
      alert('Đã xảy ra lỗi khi xóa mục tiêu: ' + (err.response?.data?.detail || err.message));
    }
  };

  const openCreateModal = () => {
    setEditingObj(null);
    setFormData({
      title: '',
      category: 'FPY',
      factory_name: 'Tất cả',
      department_name: 'Tất cả',
      period_type: 'Tháng',
      year: selectedYear,
      month: 8,
      target_value: 98.5,
      target_unit: '%',
      operator: '>=',
      description: ''
    });
    setShowModal(true);
  };

  const openEditModal = (obj) => {
    setEditingObj(obj);
    setFormData({
      title: obj.title,
      category: obj.category,
      factory_name: obj.factory_name || 'Tất cả',
      department_name: obj.department_name || 'Tất cả',
      period_type: obj.period_type || 'Tháng',
      year: obj.year || 2026,
      month: obj.month || 8,
      target_value: obj.target_value,
      target_unit: obj.target_unit,
      operator: obj.operator,
      description: obj.description || ''
    });
    setShowModal(true);
  };

  const toggleAlertSetting = (id) => {
    setAlertConfigs(prev => prev.map(item => item.id === id ? { ...item, is_enabled: !item.is_enabled } : item));
  };

  // Filtering Logic based on SearchQuery
  const getFilteredData = () => {
    const query = searchQuery.toLowerCase();
    if (activeTab === 'objectives') {
      return (Array.isArray(objectivesList) ? objectivesList : []).filter(item => 
        (item.title || '').toLowerCase().includes(query) ||
        (item.code || '').toLowerCase().includes(query) ||
        (item.category || '').toLowerCase().includes(query)
      );
    } else if (activeTab === 'work_kpi') {
      return (Array.isArray(workKpiList) ? workKpiList : []).filter(item =>
        (item.staff_name || '').toLowerCase().includes(query) ||
        (item.role || '').toLowerCase().includes(query) ||
        (item.factory || '').toLowerCase().includes(query)
      );
    } else if (activeTab === 'violations') {
      return (Array.isArray(violationsList) ? violationsList : []).filter(item =>
        (item.staff_name || '').toLowerCase().includes(query) ||
        (item.rule_name || '').toLowerCase().includes(query) ||
        (item.issue || '').toLowerCase().includes(query) ||
        (item.department || '').toLowerCase().includes(query)
      );
    } else if (activeTab === 'training') {
      return (Array.isArray(trainingPlans) ? trainingPlans : []).filter(item =>
        (item.code || '').toLowerCase().includes(query) ||
        (item.title || '').toLowerCase().includes(query) ||
        (item.trainer || '').toLowerCase().includes(query) ||
        (item.target_audience || '').toLowerCase().includes(query)
      );
    } else if (activeTab === 'reports') {
      return (Array.isArray(quickReportsList) ? quickReportsList : []).filter(item =>
        (item.code || '').toLowerCase().includes(query) ||
        (item.report_type || '').toLowerCase().includes(query) ||
        (item.creator_name || '').toLowerCase().includes(query) ||
        (item.main_content || '').toLowerCase().includes(query)
      );
    } else if (activeTab === 'alerts') {
      return (Array.isArray(alertConfigs) ? alertConfigs : []).filter(item =>
        (item.metric || '').toLowerCase().includes(query) ||
        (item.condition || '').toLowerCase().includes(query) ||
        (item.receiver || '').toLowerCase().includes(query)
      );
    }
    return [];
  };

  const filteredItems = getFilteredData();
  const totalPages = Math.ceil(filteredItems.length / limit) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <div className="gold-layout" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .badge-status-green {
          background-color: #ECFDF5;
          color: #059669;
          border: 1px solid #A7F3D0;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .badge-status-red {
          background-color: #FEF2F2;
          color: #DC2626;
          border: 1px solid #FCA5A5;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .badge-status-yellow {
          background-color: #FFFBEB;
          color: #D97706;
          border: 1px solid #FDE68A;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        .badge-status-blue {
          background-color: #F0F9FF;
          color: #0284C7;
          border: 1px solid #BAE6FD;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
        }
        /* Top Horizontal Nav Bar matching 100% User Design */
        .quality-6tab-bar {
          display: flex;
          background-color: #FFFFFF;
          border-bottom: 2px solid #E5E7EB;
          padding: 0 24px;
          gap: 32px;
        }
        .quality-6tab-item {
          padding: 14px 4px;
          font-weight: 500;
          font-size: 0.95rem;
          border: none;
          background: transparent;
          color: #6B7280;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease-in-out;
          white-space: nowrap;
          margin-bottom: -2px;
        }
        .quality-6tab-item:hover {
          color: #4B5563;
        }
        .quality-6tab-item.active {
          color: #5D3E26;
          font-weight: 700;
          border-bottom-color: #5D3E26;
        }
        .stat-card-gold {
          background: #FFFFFF;
          border: 1px solid #EADCC9;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 4px 12px rgba(123, 82, 51, 0.05);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(3px);
        }
        .modal-content {
          background: #ffffff;
          border-radius: 16px;
          width: 90%;
          max-width: 650px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #D1D5DB;
          transition: .4s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #059669;
        }
        input:checked + .slider:before {
          transform: translateX(20px);
        }
      ` }} />

      {/* STICKY TOP ZONE */}
      <div className="sticky-top-zone">
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          searchPlaceholder="Tìm kiếm mục tiêu, chỉ số, vi phạm, báo cáo, khóa đào tạo..."
          showSort={false}
          showFilter={true}
          isFilterOpen={false}
          onFilterToggle={() => {}}
          extraActions={
            activeTab === 'objectives' ? [
              { label: '+ Thêm Mục tiêu mới', onClick: openCreateModal }
            ] : activeTab === 'training' ? [
              { label: '+ Thêm Khóa đào tạo', onClick: () => alert('Tạo khóa đào tạo chất lượng mới') }
            ] : activeTab === 'alerts' ? [
              { label: '+ Thêm Cảnh báo mới', onClick: () => alert('Thiết lập ngưỡng cảnh báo tự động mới') }
            ] : []
          }
          onExport={() => {}}
          hasWritePermission={true}
        />

        {/* 6 TABS NAVIGATION (Matching User Design Mockup) */}
        <div className="quality-6tab-bar">
          <button 
            className={`quality-6tab-item ${activeTab === 'objectives' ? 'active' : ''}`}
            onClick={() => setActiveTab('objectives')}
          >
            Mục tiêu chất lượng
          </button>

          <button 
            className={`quality-6tab-item ${activeTab === 'work_kpi' ? 'active' : ''}`}
            onClick={() => setActiveTab('work_kpi')}
          >
            Chỉ số công việc
          </button>

          <button 
            className={`quality-6tab-item ${activeTab === 'violations' ? 'active' : ''}`}
            onClick={() => setActiveTab('violations')}
          >
            Danh sách vi phạm
          </button>

          <button 
            className={`quality-6tab-item ${activeTab === 'training' ? 'active' : ''}`}
            onClick={() => setActiveTab('training')}
          >
            Kế hoạch đào tạo
          </button>

          <button 
            className={`quality-6tab-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Báo cáo và BBCH
          </button>

          <button 
            className={`quality-6tab-item ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Thiết lập cảnh báo
          </button>
        </div>
      </div>

      {/* MAIN VIEW AREA */}
      <div className="admin-list-layout">
        {/* TAB 1: MỤC TIÊU CHẤT LƯỢNG (Overview Dashboard & Master Target List) */}
        {activeTab === 'objectives' && (
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', backgroundColor: '#FAF8F6' }}>
            {/* TOP METRIC CARDS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              <div className="stat-card-gold">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8D6E63', fontWeight: 700 }}>TỶ LỆ ĐẠT FPY</span>
                  <CheckCircle2 size={24} style={{ color: '#059669' }} />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2D1A12' }}>
                  {dashboardStats?.summary?.fpy?.actual || 98.2}%
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                  Mục tiêu: <b>{dashboardStats?.summary?.fpy?.target || 98.5}%</b> ({dashboardStats?.summary?.fpy?.status})
                </div>
              </div>

              <div className="stat-card-gold">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8D6E63', fontWeight: 700 }}>CHỈ SỐ LỖI PPM</span>
                  <TrendingUp size={24} style={{ color: '#7B5233' }} />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2D1A12' }}>
                  {dashboardStats?.summary?.ppm?.actual || 1150} PPM
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                  Mục tiêu khống chế: <b>&lt;= {dashboardStats?.summary?.ppm?.target || 1200} PPM</b>
                </div>
              </div>

              <div className="stat-card-gold">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8D6E63', fontWeight: 700 }}>SỐ VỤ VI PHẠM</span>
                  <ShieldAlert size={24} style={{ color: '#DC2626' }} />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#DC2626' }}>
                  {dashboardStats?.summary?.violations?.actual || 0} vụ
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                  Dữ liệu từ Mobile /awards
                </div>
              </div>

              <div className="stat-card-gold">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#8D6E63', fontWeight: 700 }}>BÁO CÁO & BBCH</span>
                  <FileCheck size={24} style={{ color: '#0284C7' }} />
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#2D1A12' }}>
                  {dashboardStats?.summary?.quick_reports?.actual || 0} báo cáo
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                  Dữ liệu từ Mobile /quick-report-create
                </div>
              </div>
            </div>

            {/* MASTER TABLE OF OBJECTIVES */}
            <div className="card admin-table-card" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #EADCC9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#7B5233', fontSize: '1.1rem', fontWeight: 700 }}>
                  Danh mục Cấu hình & Thực hiện Mục tiêu chất lượng năm {selectedYear}
                </h3>
                <button className="btn-gold" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={openCreateModal}>
                  + Thêm Mục tiêu
                </button>
              </div>

              <div className="table-responsive desktop-only admin-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                      <th style={{ width: '120px' }}>MÃ KPI</th>
                      <th style={{ minWidth: '220px' }}>TÊN MỤC TIÊU CHẤT LƯỢNG</th>
                      <th style={{ width: '110px' }}>LOẠI CHỈ SỐ</th>
                      <th style={{ width: '120px' }}>NHÀ MÁY</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>CHỈ TIÊU (TARGET)</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>THỰC TẾ (ACTUAL)</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>ĐÁNH GIÁ</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.length === 0 ? (
                      <tr>
                        <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#8D6E63' }}>
                          Chưa có mục tiêu chất lượng nào.
                        </td>
                      </tr>
                    ) : (
                      paginatedItems.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>
                            {String((currentPage - 1) * limit + idx + 1).padStart(2, '0')}
                          </td>
                          <td style={{ fontWeight: 700, color: '#7B5233' }}>{item.code}</td>
                          <td style={{ fontWeight: 700, color: '#2D1A12' }}>{item.title}</td>
                          <td><span className="badge-status-yellow">{item.category}</span></td>
                          <td>{item.factory_name || 'Tất cả'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.operator} {item.target_value} {item.target_unit}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#059669' }}>
                            {item.category === 'FPY' ? `${dashboardStats?.summary?.fpy?.actual || 98.2}%` : item.category === 'PPM' ? `${dashboardStats?.summary?.ppm?.actual || 1150} PPM` : item.category === 'Violation' ? `${dashboardStats?.summary?.violations?.actual || 0} Vụ` : '100%'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className="badge-status-green">ĐẠT TỐT</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                              <Edit 
                                size={16} 
                                style={{ color: '#7B5233', cursor: 'pointer' }}
                                onClick={() => openEditModal(item)}
                              />
                              <Trash2 
                                size={16} 
                                style={{ color: '#DC2626', cursor: 'pointer' }}
                                onClick={() => handleDeleteObjective(item.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="admin-pagination-desktop desktop-only" style={{ marginTop: '12px' }}>
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Show <b>{filteredItems.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredItems.length)}</b> of <b>{filteredItems.length}</b> results
                </div>
                <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button 
                    className="page-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CHỈ SỐ CÔNG VIỆC (Work Indices / Personnel Work Performance) */}
        {activeTab === 'work_kpi' && (
          <div className="mgmt-table card admin-table-card">
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '180px' }}>NHÂN VIÊN QC / QA</th>
                    <th style={{ width: '130px' }}>VỊ TRÍ / VAI TRÒ</th>
                    <th style={{ width: '120px' }}>NHÀ MÁY</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>SỐ PHIẾU ĐÃ THỰC HIỆN</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>TỶ LỆ PHÁT HIỆN LỖI</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>THỜI GIAN ĐÁP ỨNG</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>ĐIỂM ĐÁNH GIÁ</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>XẾP LOẠI KPI</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>
                        {String((currentPage - 1) * limit + idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#2D1A12' }}>{item.staff_name}</td>
                      <td style={{ fontWeight: 600, color: '#7B5233' }}>{item.role}</td>
                      <td>{item.factory}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.inspections_done} phiếu</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#059669' }}>{item.defect_catch_rate}%</td>
                      <td style={{ textAlign: 'center', color: '#4B5563' }}>{item.response_time}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#7B5233' }}>{item.score} / 100</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={item.status === 'Xuất sắc' ? 'badge-status-green' : item.status === 'Đạt' ? 'badge-status-blue' : 'badge-status-yellow'}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Show <b>{filteredItems.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredItems.length)}</b> of <b>{filteredItems.length}</b> results
              </div>
              <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DANH SÁCH VI PHẠM (from /awards-discipline - Mobile /awards) */}
        {activeTab === 'violations' && (
          <div className="mgmt-table card admin-table-card">
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '160px' }}>NHÂN VIÊN</th>
                    <th style={{ width: '120px' }}>PHÒNG BAN</th>
                    <th style={{ minWidth: '200px' }}>NỘI DUNG VI PHẠM</th>
                    <th style={{ width: '140px' }}>MỨC ĐỘ</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>ĐIỂM KỶ LUẬT</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>NGÀY GHI NHẬN</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                        Chưa có báo cáo vi phạm nào được ghi nhận từ Mobile (/awards).
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>
                          {String((currentPage - 1) * limit + idx + 1).padStart(2, '0')}
                        </td>
                        <td style={{ fontWeight: 700, color: '#2D1A12' }}>{item.staff_name}</td>
                        <td style={{ fontWeight: 500, color: '#7B5233' }}>{item.department || 'N/A'}</td>
                        <td>{item.issue || item.rule_name || item.description}</td>
                        <td>
                          <span className={item.impact === 'Cao' ? 'badge-status-red' : 'badge-status-yellow'}>
                            {item.impact || item.severity || 'Trung bình'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#DC2626' }}>
                          -{item.points || 0}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.date || item.created_at}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-status-green">{item.status || 'Chờ xử lý'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Show <b>{filteredItems.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredItems.length)}</b> of <b>{filteredItems.length}</b> results
              </div>
              <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: KẾ HOẠCH ĐÀO TẠO (Training Plans) */}
        {activeTab === 'training' && (
          <div className="mgmt-table card admin-table-card">
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '130px' }}>MÃ KHÓA</th>
                    <th style={{ minWidth: '220px' }}>TÊN KHÓA ĐÀO TẠO CHẤT LƯỢNG</th>
                    <th style={{ width: '150px' }}>GIẢNG VIÊN / CHUYÊN GIA</th>
                    <th style={{ width: '160px' }}>ĐỐI TƯỢNG THAM GIA</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>THỜI LƯỢNG</th>
                    <th style={{ width: '110px', textAlign: 'center' }}>HỌC VIÊN</th>
                    <th style={{ width: '160px', textAlign: 'center' }}>THỜI GIAN</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>
                        {String((currentPage - 1) * limit + idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#7B5233' }}>{item.code}</td>
                      <td style={{ fontWeight: 700, color: '#2D1A12' }}>{item.title}</td>
                      <td style={{ fontWeight: 600 }}>{item.trainer}</td>
                      <td>{item.target_audience}</td>
                      <td style={{ textAlign: 'center' }}>{item.duration}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#7B5233' }}>{item.participants} HV</td>
                      <td style={{ textAlign: 'center', fontSize: '0.85rem' }}>{item.schedule}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={item.status === 'Đã hoàn thành' ? 'badge-status-green' : item.status === 'Sắp diễn ra' ? 'badge-status-blue' : 'badge-status-yellow'}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Show <b>{filteredItems.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredItems.length)}</b> of <b>{filteredItems.length}</b> results
              </div>
              <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BÁO CÁO VÀ BBCH (from /quick-reports - Mobile /quick-report) */}
        {activeTab === 'reports' && (
          <div className="mgmt-table card admin-table-card">
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '130px' }}>MÃ BÁO CÁO</th>
                    <th style={{ width: '170px' }}>LOẠI BÁO CÁO</th>
                    <th style={{ width: '140px' }}>NGƯỜI LẬP</th>
                    <th style={{ minWidth: '220px' }}>NỘI DUNG CHÍNH</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>NGÀY TẠO</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#8D6E63' }}>
                        Chưa có báo cáo nhanh / biên bản cuộc họp nào được lập từ Mobile (/quick-report-create).
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>
                          {String((currentPage - 1) * limit + idx + 1).padStart(2, '0')}
                        </td>
                        <td style={{ fontWeight: 700, color: '#7B5233' }}>{item.code}</td>
                        <td>
                          <span className={item.report_type === 'Biên bản cuộc họp' ? 'badge-status-yellow' : 'badge-status-green'}>
                            {item.report_type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{item.creator_name || 'NV QC'}</td>
                        <td style={{ fontSize: '0.85rem', color: '#4B5563' }}>{item.main_content}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.created_at}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className="badge-status-green">{item.status || 'Chờ xử lý'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Show <b>{filteredItems.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredItems.length)}</b> of <b>{filteredItems.length}</b> results
              </div>
              <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: THIẾT LẬP CẢNH BÁO (Alert Configurations) */}
        {activeTab === 'alerts' && (
          <div className="mgmt-table card admin-table-card">
            <div className="table-responsive desktop-only admin-table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                    <th style={{ width: '200px' }}>CHỈ SỐ GIÁM SÁT</th>
                    <th style={{ width: '140px', textAlign: 'center' }}>ĐIỀU KIỆN KÍCH HOẠT</th>
                    <th style={{ width: '160px' }}>MỨC ĐỘ CẢNH BÁO</th>
                    <th style={{ width: '180px' }}>KÊNH THÔNG BÁO</th>
                    <th style={{ minWidth: '220px' }}>NGƯỜI NHẬN THÔNG BÁO</th>
                    <th style={{ width: '120px', textAlign: 'center' }}>KÍCH HOẠT</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>
                        {String((currentPage - 1) * limit + idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{ fontWeight: 700, color: '#2D1A12' }}>{item.metric}</td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#DC2626' }}>{item.condition}</td>
                      <td>
                        <span className={item.severity.includes('Critical') ? 'badge-status-red' : item.severity.includes('Warning') ? 'badge-status-yellow' : 'badge-status-blue'}>
                          {item.severity}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: '#0284C7' }}>{item.channel}</td>
                      <td style={{ fontSize: '0.85rem', color: '#4B5563' }}>{item.receiver}</td>
                      <td style={{ textAlign: 'center' }}>
                        <label className="toggle-switch">
                          <input 
                            type="checkbox" 
                            checked={item.is_enabled} 
                            onChange={() => toggleAlertSetting(item.id)} 
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div className="admin-pagination-desktop desktop-only">
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                Show <b>{filteredItems.length > 0 ? (currentPage - 1) * limit + 1 : 0}</b> to <b>{Math.min(currentPage * limit, filteredItems.length)}</b> of <b>{filteredItems.length}</b> results
              </div>
              <div className="pagination-controls" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button 
                  className="page-btn"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA MỤC TIÊU CHẤT LƯỢNG */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', color: '#7B5233', fontSize: '1.2rem', fontWeight: 700 }}>
              {editingObj ? 'Chỉnh sửa Mục tiêu chất lượng' : 'Thêm mới Mục tiêu chất lượng KPI'}
            </h3>

            <form onSubmit={handleSubmitObjective}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#5C4033', marginBottom: '4px' }}>
                    Tên Mục tiêu chất lượng *
                  </label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Tỷ lệ sản phẩm đạt kiểm tra lần đầu FPY"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#5C4033', marginBottom: '4px' }}>
                    Nhóm chỉ số KPI *
                  </label>
                  <select 
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '6px' }}
                  >
                    <option value="FPY">Tỷ lệ Đạt FPY (%)</option>
                    <option value="PPM">Chỉ số Lỗi (PPM)</option>
                    <option value="Violation">Số vụ Vi phạm</option>
                    <option value="QuickReport">Biên bản sự cố / BBCH</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#5C4033', marginBottom: '4px' }}>
                    Nhà máy áp dụng
                  </label>
                  <select 
                    value={formData.factory_name}
                    onChange={(e) => setFormData({ ...formData, factory_name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '6px' }}
                  >
                    <option value="Tất cả">Tất cả Nhà máy</option>
                    <option value="NM1">Nhà máy 1 (NM1)</option>
                    <option value="NM2">Nhà máy 2 (NM2)</option>
                    <option value="NM3">Nhà máy 3 (NM3)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#5C4033', marginBottom: '4px' }}>
                    Giá trị chỉ tiêu Target *
                  </label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    value={formData.target_value}
                    onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '6px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#5C4033', marginBottom: '4px' }}>
                    Đơn vị tính *
                  </label>
                  <input 
                    type="text"
                    required
                    value={formData.target_unit}
                    onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
                    placeholder="%, PPM, Vụ..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '6px' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#5C4033', marginBottom: '4px' }}>
                    Mô tả / Ghi chú cách đo
                  </label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Ghi chú chi tiết quy định phương pháp tính chỉ số..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #EADCC9', borderRadius: '6px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button 
                  type="button" 
                  className="btn-outline-secondary" 
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px' }}
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit" 
                  className="btn-gold"
                  style={{ padding: '8px 20px', borderRadius: '6px' }}
                >
                  {editingObj ? 'Lưu cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityObjectivesView;
