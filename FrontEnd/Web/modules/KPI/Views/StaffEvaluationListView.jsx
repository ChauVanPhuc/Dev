import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Award, Search, Filter, RefreshCw, Plus, Edit2, Trash2, Eye, 
  Download, FileSpreadsheet, Calendar, User, Building, MapPin, 
  CheckCircle, Clock, AlertCircle, TrendingUp, X, Check, ChevronDown, ChevronLeft, ChevronRight,
  FileText, Star, Target, Lightbulb, MessageSquare, RotateCcw
} from 'lucide-react';
import apiClient from '@shared/services/api';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import * as XLSX from 'xlsx';
import '@styles/components.css';

const StaffEvaluationListView = () => {
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};

  // 1. React Hooks ở ĐẦU Component (Tuân thủ nghiêm ngặt AGENTS.md)
  const [evaluations, setEvaluations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Bộ lọc
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterRating, setFilterRating] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFactory, setFilterFactory] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  // Phân trang
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState('date_desc');

  // Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEval, setSelectedEval] = useState(null);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingEval, setEditingEval] = useState(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Thiết lập tiêu đề trang
  useEffect(() => {
    if (typeof setCustomTitle === 'function') setCustomTitle('Đánh giá từ nhân viên');
    if (typeof setCustomSubtitle === 'function') setCustomSubtitle('Hồ sơ nhận xét, năng lực & xếp loại đánh giá định kỳ nhân sự QLCL');
    if (typeof setCustomScreenCode === 'function') setCustomScreenCode('CL04');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode]);

  // Thông báo Toast tự tắt
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
  };

  // Tải danh sách đánh giá từ Backend
  const loadEvaluations = async () => {
    setLoading(true);
    try {
      // 1. Tải danh sách đánh giá
      try {
        const resEval = await apiClient.get('/staff-evaluations/');
        const evalData = Array.isArray(resEval.data) ? resEval.data : (resEval.data?.data || []);
        setEvaluations(evalData);
      } catch (e) {
        console.error('Lỗi API staff-evaluations:', e);
        showToast('Không thể tải danh sách đánh giá từ máy chủ!', 'error');
      }

      // 2. Tải danh sách nhân sự tham chiếu (hỗ trợ autocomplete trong modal)
      try {
        const resEmp = await apiClient.get('/quality-employees/', { params: { size: 300, page: 1 } });
        const empData = resEmp.data?.items || resEmp.data?.data || (Array.isArray(resEmp.data) ? resEmp.data : []);
        setEmployees(empData);
      } catch (e) {
        console.warn('Lỗi tải danh sách nhân sự tham chiếu:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluations();
  }, [refreshTrigger]);

  // Danh sách các tùy chọn lọc độc nhất
  const uniqueFactories = useMemo(() => {
    const set = new Set();
    evaluations.forEach(e => { if (e.factory) set.add(e.factory); });
    employees.forEach(e => { if (e.factory) set.add(e.factory); });
    return Array.from(set).sort();
  }, [evaluations, employees]);

  const uniqueStages = useMemo(() => {
    const set = new Set();
    evaluations.forEach(e => { if (e.stage) set.add(e.stage); });
    return Array.from(set).sort();
  }, [evaluations]);

  const uniquePeriods = useMemo(() => {
    const set = new Set();
    evaluations.forEach(e => {
      if (e.eval_date) {
        const parts = e.eval_date.split('/');
        if (parts.length === 3) set.add(`Tháng ${parts[1]}/${parts[2]}`);
        else if (parts.length === 2) set.add(`Tháng ${parts[0]}/${parts[1]}`);
        else set.add(e.eval_date);
      }
    });
    return Array.from(set).sort().reverse();
  }, [evaluations]);

  // Đếm số lượng filter đang active
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterPeriod !== 'all') count++;
    if (filterRating !== 'all') count++;
    if (filterStatus !== 'all') count++;
    if (filterFactory !== 'all') count++;
    if (filterStage !== 'all') count++;
    return count;
  }, [filterPeriod, filterRating, filterStatus, filterFactory, filterStage]);

  // Lọc và sắp xếp dữ liệu
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = String(item.employee_id || '').toLowerCase();
        const name = String(item.staff_name || '').toLowerCase();
        const stage = String(item.stage || '').toLowerCase();
        const dept = String(item.department || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !stage.includes(q) && !dept.includes(q)) {
          return false;
        }
      }

      if (filterRating !== 'all') {
        if (String(item.rating || '').toUpperCase() !== filterRating.toUpperCase()) return false;
      }

      if (filterStatus !== 'all') {
        if (String(item.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;
      }

      if (filterFactory !== 'all') {
        if (String(item.factory || '').toLowerCase() !== filterFactory.toLowerCase()) return false;
      }

      if (filterStage !== 'all') {
        if (String(item.stage || '').toLowerCase() !== filterStage.toLowerCase()) return false;
      }

      if (filterPeriod !== 'all') {
        const cleanPeriod = filterPeriod.replace('Tháng ', '');
        if (!String(item.eval_date || '').includes(cleanPeriod)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'score_desc') return (b.actual_score || 0) - (a.actual_score || 0);
      if (sortBy === 'score_asc') return (a.actual_score || 0) - (b.actual_score || 0);
      if (sortBy === 'name_asc') return String(a.staff_name || '').localeCompare(String(b.staff_name || ''));
      return (b.id || 0) - (a.id || 0);
    });
  }, [evaluations, searchQuery, filterRating, filterStatus, filterFactory, filterStage, filterPeriod, sortBy]);

  // Thống kê Metrics
  const stats = useMemo(() => {
    const total = evaluations.length;
    if (total === 0) return { total: 0, avgScore: 0, countA: 0, countB: 0, countCD: 0 };
    
    let sumScore = 0;
    let countA = 0;
    let countB = 0;
    let countCD = 0;

    evaluations.forEach(e => {
      const score = Number(e.actual_score) || 0;
      sumScore += score;
      const r = String(e.rating || '').toUpperCase();
      if (r === 'A') countA++;
      else if (r === 'B') countB++;
      else countCD++;
    });

    return {
      total,
      avgScore: (sumScore / total).toFixed(1),
      countA,
      countB,
      countCD
    };
  }, [evaluations]);

  // Phân trang
  const total = filteredEvaluations.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEvaluations.slice(start, start + pageSize);
  }, [filteredEvaluations, page, pageSize]);

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterRating('all');
    setFilterStatus('all');
    setFilterFactory('all');
    setFilterStage('all');
    setFilterPeriod('all');
    setSortBy('date_desc');
    setPage(1);
  };

  const handleViewDetail = (item) => {
    setSelectedEval(item);
    setDetailModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingEval(null);
    setFormModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingEval(item);
    setFormModalOpen(true);
  };

  const handleDeleteEvaluation = async (id) => {
    try {
      await apiClient.delete(`/staff-evaluations/${id}`);
      showToast('Đã xóa hồ sơ đánh giá thành công!', 'success');
      setDeleteConfirmId(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Lỗi xóa đánh giá:', err);
      showToast('Không thể xóa đánh giá này. Vui lòng thử lại!', 'error');
    }
  };

  // Xuất file Excel
  const handleExportExcel = () => {
    try {
      if (filteredEvaluations.length === 0) {
        showToast('Không có dữ liệu đánh giá để xuất Excel', 'error');
        return;
      }
      const exportData = filteredEvaluations.map((item, index) => ({
        'STT': index + 1,
        'Mã Nhân Viên': item.employee_id || '',
        'Họ Và Tên': item.staff_name || '',
        'Vị Trí / Công Đoạn': item.stage || '',
        'Bộ Phận': item.department || 'QLCL',
        'Nhà Máy': item.factory || '',
        'Ngày Đánh Giá': item.eval_date || '',
        'Điểm Đánh Giá': item.actual_score || 0,
        'Xếp Loại': item.rating || '',
        'Trạng Thái': item.status || '',
        'Thành Tích Nổi Bật': item.achievements || '',
        'Hạn Chế Tồn Tại': item.limitations || '',
        'Kế Hoạch Cải Tiến': item.improvement_plan || '',
        'Đề Xuất Kiến Nghị': item.proposals || '',
        'Nhận Xét Quản Lý': item.manager_note || '',
        'Hành Động Đề Xuất': item.proposed_action || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách Đánh Giá');
      
      const fileName = `Danh_Sach_Danh_Gia_Nhan_Su_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      showToast('Xuất danh sách đánh giá ra Excel thành công!', 'success');
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      showToast('Có lỗi xảy ra khi xuất file Excel', 'error');
    }
  };

  const renderRatingBadge = (rating) => {
    const r = String(rating || 'A').toUpperCase();
    if (r === 'A') {
      return (
        <span style={{ 
          backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #BBF7D0',
          padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '0.74rem',
          display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
          <Star size={11} fill="#15803D" /> Loại A
        </span>
      );
    }
    if (r === 'B') {
      return (
        <span style={{ 
          backgroundColor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE',
          padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '0.74rem',
          display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
          <Check size={11} /> Loại B
        </span>
      );
    }
    if (r === 'C') {
      return (
        <span style={{ 
          backgroundColor: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A',
          padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '0.74rem',
          display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
          <AlertCircle size={11} /> Loại C
        </span>
      );
    }
    return (
      <span style={{ 
        backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA',
        padding: '2px 8px', borderRadius: '12px', fontWeight: '700', fontSize: '0.74rem',
        display: 'inline-flex', alignItems: 'center', gap: '4px'
      }}>
        <AlertCircle size={11} /> Loại D
      </span>
    );
  };

  const renderStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('đã') || s.includes('hoàn tất')) {
      return (
        <span style={{ 
          backgroundColor: '#F0FDF4', color: '#166534', border: '1px solid #DCFCE7',
          padding: '2px 7px', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem',
          display: 'inline-flex', alignItems: 'center', gap: '3px'
        }}>
          <CheckCircle size={11} /> Đã đánh giá
        </span>
      );
    }
    if (s.includes('chờ') || s.includes('duyệt')) {
      return (
        <span style={{ 
          backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A',
          padding: '2px 7px', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem',
          display: 'inline-flex', alignItems: 'center', gap: '3px'
        }}>
          <Clock size={11} /> Chờ duyệt
        </span>
      );
    }
    return (
      <span style={{ 
        backgroundColor: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB',
        padding: '2px 7px', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem',
        display: 'inline-flex', alignItems: 'center', gap: '3px'
      }}>
        <AlertCircle size={11} /> Chưa đánh giá
      </span>
    );
  };

  return (
    <div className="mgmt-container gold-layout" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '24px', right: '28px', zIndex: 10000,
          backgroundColor: toastMessage.type === 'error' ? '#EF4444' : '#15803D',
          color: '#FFFFFF', padding: '10px 18px', borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
          display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '0.85rem'
        }}>
          {toastMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      <div className="mgmt-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        
        {/* 1. PageToolbar chuẩn ERP đồng bộ với các màn hình khác */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
          searchPlaceholder="Tìm kiếm theo mã NV, họ tên, vị trí, công đoạn..."
          showFilter={true}
          isFilterOpen={filterOpen}
          onFilterToggle={() => setFilterOpen(!filterOpen)}
          activeFiltersCount={activeFiltersCount}
          onExport={handleExportExcel}
          exportLabel="Xuất Excel"
          onCreate={handleOpenCreateModal}
          createLabel="Thêm mới"
          hasWritePermission={true}
        />

        {/* 2. Filter Bar Dropdowns đồng bộ chuẩn ERP (.filter-inline-bar) */}
        {filterOpen && (
          <div className="filter-inline-bar">
            {/* Kỳ đánh giá */}
            <div className="filter-field-group">
              <label className="filter-field-label">Kỳ đánh giá</label>
              <select
                value={filterPeriod}
                onChange={(e) => { setFilterPeriod(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả các kỳ</option>
                {uniquePeriods.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Xếp loại */}
            <div className="filter-field-group">
              <label className="filter-field-label">Xếp loại</label>
              <select
                value={filterRating}
                onChange={(e) => { setFilterRating(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả xếp loại</option>
                <option value="A">Loại A (Xuất sắc)</option>
                <option value="B">Loại B (Khá)</option>
                <option value="C">Loại C (Trung bình)</option>
                <option value="D">Loại D (Cần cải thiện)</option>
              </select>
            </div>

            {/* Trạng thái */}
            <div className="filter-field-group">
              <label className="filter-field-label">Trạng thái</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Đã đánh giá">Đã đánh giá</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Chưa đánh giá">Chưa đánh giá</option>
              </select>
            </div>

            {/* Nhà máy */}
            <div className="filter-field-group">
              <label className="filter-field-label">Nhà máy</label>
              <select
                value={filterFactory}
                onChange={(e) => { setFilterFactory(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả nhà máy</option>
                {uniqueFactories.map(fac => (
                  <option key={fac} value={fac}>{fac}</option>
                ))}
              </select>
            </div>

            {/* Công đoạn */}
            <div className="filter-field-group">
              <label className="filter-field-label">Công đoạn</label>
              <select
                value={filterStage}
                onChange={(e) => { setFilterStage(e.target.value); setPage(1); }}
              >
                <option value="all">Tất cả công đoạn</option>
                {uniqueStages.map(stg => (
                  <option key={stg} value={stg}>{stg}</option>
                ))}
              </select>
            </div>

            {/* Nút đặt lại */}
            {activeFiltersCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    height: '38px',
                    padding: '0 14px',
                    fontSize: '0.8rem',
                    backgroundColor: '#FAF6F0',
                    color: '#7B5233',
                    border: '1.5px solid #EADCC9',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  title="Đặt lại bộ lọc về mặc định"
                >
                  <RotateCcw size={13} />
                  <span>Xóa lọc</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. Thẻ thống kê tổng quan (Thanh tóm tắt tinh gọn chuẩn Gold Design) */}
        <div style={{ 
          display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap',
          marginBottom: '10px', flexShrink: 0 
        }}>
          <div style={{ 
            backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '8px',
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#7B5233', fontWeight: '600' }}>Tổng hồ sơ:</span>
            <span style={{ fontSize: '0.9rem', color: '#3D2B1F', fontWeight: '800' }}>{stats.total}</span>
          </div>

          <div style={{ 
            backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '8px',
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#7B5233', fontWeight: '600' }}>Điểm trung bình:</span>
            <span style={{ fontSize: '0.9rem', color: '#7B5233', fontWeight: '800' }}>{stats.avgScore} / 100</span>
          </div>

          <div style={{ 
            backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px',
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#15803D', fontWeight: '700' }}>Loại A:</span>
            <span style={{ fontSize: '0.9rem', color: '#15803D', fontWeight: '800' }}>{stats.countA}</span>
            <span style={{ fontSize: '0.74rem', color: '#16A34A' }}>
              ({stats.total > 0 ? Math.round((stats.countA / stats.total) * 100) : 0}%)
            </span>
          </div>

          <div style={{ 
            backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px',
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#1D4ED8', fontWeight: '700' }}>Loại B:</span>
            <span style={{ fontSize: '0.9rem', color: '#1D4ED8', fontWeight: '800' }}>{stats.countB}</span>
            <span style={{ fontSize: '0.74rem', color: '#2563EB' }}>
              ({stats.total > 0 ? Math.round((stats.countB / stats.total) * 100) : 0}%)
            </span>
          </div>

          <div style={{ 
            backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px',
            padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            <span style={{ fontSize: '0.78rem', color: '#B45309', fontWeight: '700' }}>Cần cải thiện (C/D):</span>
            <span style={{ fontSize: '0.9rem', color: '#B45309', fontWeight: '800' }}>{stats.countCD}</span>
          </div>
        </div>

        {/* 4. Khối bảng dữ liệu đồng bộ chuẩn ERP (admin-list-layout) */}
        <div className="admin-list-layout" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div className="mgmt-table card admin-table-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #EADCC9' }}>
            
            <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <table className="data-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#FAF6F0' }}>
                  <tr>
                    <th style={{ width: '48px', textAlign: 'center', padding: '9px 8px' }}>STT</th>
                    <th style={{ width: '85px', padding: '9px 8px' }}>MÃ NV</th>
                    <th style={{ minWidth: '180px', padding: '9px 12px' }}>HỌ VÀ TÊN</th>
                    <th style={{ minWidth: '150px', padding: '9px 10px' }}>VỊ TRÍ / CÔNG ĐOẠN</th>
                    <th style={{ minWidth: '160px', padding: '9px 10px' }}>NHÀ MÁY</th>
                    <th style={{ width: '110px', padding: '9px 10px' }}>NGÀY ĐÁNH GIÁ</th>
                    <th style={{ width: '90px', textAlign: 'center', padding: '9px 8px' }}>ĐIỂM SỐ</th>
                    <th style={{ width: '100px', textAlign: 'center', padding: '9px 8px' }}>XẾP LOẠI</th>
                    <th style={{ minWidth: '220px', padding: '9px 10px' }}>THÀNH TÍCH & ĐÓNG GÓP</th>
                    <th style={{ width: '115px', textAlign: 'center', padding: '9px 8px' }}>TRẠNG THÁI</th>
                    <th style={{ width: '95px', textAlign: 'center', padding: '9px 8px' }}>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} style={{ padding: '40px', textAlign: 'center', color: '#7B5233' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem' }}>
                          <RefreshCw size={16} className="spin" />
                          <span>Đang tải dữ liệu đánh giá từ hệ thống...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedData.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '60px 20px', color: '#7B5233' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                          <Award size={40} color="#D4B896" />
                          <div style={{ fontWeight: '700', fontSize: '1rem', color: '#4A2E1B' }}>
                            Chưa có dữ liệu đánh giá nhân sự
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#8D6E63' }}>
                            Nhấn nút <b>[+ Thêm mới]</b> ở góc trên để bắt đầu ghi nhận hồ sơ đánh giá.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, index) => {
                      const stt = (page - 1) * pageSize + index + 1;
                      return (
                        <tr 
                          key={item.id}
                          style={{ borderBottom: '1px solid #EADCC9' }}
                        >
                          {/* STT */}
                          <td style={{ textAlign: 'center', fontWeight: '700', color: '#8D6E63', padding: '8px' }}>
                            {stt}
                          </td>

                          {/* Mã NV */}
                          <td style={{ fontWeight: '700', color: '#7B5233', padding: '8px' }}>
                            {item.employee_id || '-'}
                          </td>

                          {/* Họ và tên */}
                          <td style={{ fontWeight: '600', color: '#2D1A12', padding: '8px 12px' }}>
                            {item.staff_name}
                          </td>

                          {/* Vị trí / Công đoạn */}
                          <td style={{ color: '#4A2E1B', padding: '8px 10px' }}>
                            {item.stage || '-'}
                          </td>

                          {/* Nhà máy */}
                          <td style={{ color: '#4A2E1B', padding: '8px 10px' }}>
                            {item.factory || 'Nhà máy chung'}
                          </td>

                          {/* Ngày đánh giá */}
                          <td style={{ color: '#6B7280', fontSize: '0.8rem', padding: '8px 10px' }}>
                            {item.eval_date || '-'}
                          </td>

                          {/* Điểm số */}
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            <span style={{ 
                              fontWeight: '800', fontSize: '0.88rem',
                              color: Number(item.actual_score) >= 90 ? '#15803D' : (Number(item.actual_score) >= 80 ? '#1D4ED8' : '#D97706')
                            }}>
                              {Number(item.actual_score || 0).toFixed(1)}
                            </span>
                          </td>

                          {/* Xếp loại */}
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            {renderRatingBadge(item.rating)}
                          </td>

                          {/* Thành tích */}
                          <td style={{ padding: '8px 10px' }}>
                            <div style={{ 
                              maxHeight: '38px', overflow: 'hidden', textOverflow: 'ellipsis',
                              fontSize: '0.78rem', color: '#4B5563', lineHeight: '1.4'
                            }} title={item.achievements || item.manager_note || ''}>
                              {item.achievements || item.manager_note || '-'}
                            </div>
                          </td>

                          {/* Trạng thái */}
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            {renderStatusBadge(item.status)}
                          </td>

                          {/* Thao tác */}
                          <td style={{ textAlign: 'center', padding: '8px' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => handleViewDetail(item)}
                                title="Xem chi tiết"
                                style={{ background: 'none', border: 'none', color: '#7B5233', cursor: 'pointer', padding: '3px' }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                title="Chỉnh sửa"
                                style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: '3px' }}
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(item.id)}
                                title="Xóa"
                                style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '3px' }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Phân trang cố định đáy chuẩn ERP (.admin-pagination-desktop) */}
            <div className="admin-pagination-desktop desktop-only" style={{ flexShrink: 0, padding: '10px 16px', borderTop: '1px solid #EADCC9', backgroundColor: '#FAF6F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span>
                  Hiển thị <b>{total > 0 ? (page - 1) * pageSize + 1 : 0} - {Math.min(page * pageSize, total)}</b> trên <b>{total}</b> hồ sơ
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.78rem' }}>Số dòng:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    style={{
                      height: '26px', padding: '0 6px', fontSize: '0.78rem',
                      border: '1px solid #D4B896', borderRadius: '4px', backgroundColor: '#FFF',
                      color: '#7B5233', fontWeight: '600', cursor: 'pointer'
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(Math.max(1, page - 1))}
                    className="page-btn"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {(() => {
                    const pageButtons = [];
                    for (let i = 1; i <= totalPages; i++) {
                      if (totalPages > 7) {
                        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
                          pageButtons.push(
                            <button
                              key={i}
                              className={`page-btn ${page === i ? 'active' : ''}`}
                              onClick={() => setPage(i)}
                            >
                              {i}
                            </button>
                          );
                        } else if (i === page - 2 || i === page + 2) {
                          pageButtons.push(<span key={i} style={{ padding: '0 4px', color: '#8D6E63' }}>...</span>);
                        }
                      } else {
                        pageButtons.push(
                          <button
                            key={i}
                            className={`page-btn ${page === i ? 'active' : ''}`}
                            onClick={() => setPage(i)}
                          >
                            {i}
                          </button>
                        );
                      }
                    }
                    return pageButtons;
                  })()}
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    className="page-btn"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* MODAL 1: XEM CHI TIẾT ĐÁNH GIÁ (EvaluationDetailModal) */}
      {detailModalOpen && selectedEval && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '800px',
            maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #EADCC9'
          }}>
            {/* Header Modal */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FAF6F0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="#7B5233" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#4A2E1B' }}>
                  Chi Tiết Đánh Giá Nhân Sự #{selectedEval.id}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#7B5233', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div style={{ padding: '20px' }}>
              {/* Profile Card */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#FAF8F5', padding: '14px 18px', borderRadius: '8px',
                border: '1px solid #EADCC9', marginBottom: '18px'
              }}>
                <div>
                  <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1F2937' }}>
                    {selectedEval.staff_name}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', fontSize: '0.8rem', color: '#4B5563' }}>
                    <span style={{ fontWeight: '700', backgroundColor: '#EADCC9', color: '#7B5233', padding: '1px 6px', borderRadius: '4px' }}>
                      #{selectedEval.employee_id || 'N/A'}
                    </span>
                    <span>•</span>
                    <span>{selectedEval.stage || 'QC'}</span>
                    <span>•</span>
                    <span>{selectedEval.factory || 'Nhà máy chung'}</span>
                    <span>•</span>
                    <span>{selectedEval.eval_date || 'Định kỳ'}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: '600' }}>ĐIỂM ĐÁNH GIÁ</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end', marginTop: '2px' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: '800', color: '#7B5233' }}>
                      {Number(selectedEval.actual_score || 0).toFixed(1)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>/ 100</span>
                  </div>
                  <div style={{ marginTop: '2px' }}>
                    {renderRatingBadge(selectedEval.rating)}
                  </div>
                </div>
              </div>

              {/* 5 Nhóm Nội Dung Trọng Tâm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
                
                {/* 1. Thành tích nổi bật */}
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#15803D', fontWeight: '800', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <Star size={15} fill="#15803D" />
                    <span>1. THÀNH TÍCH & ĐÓNG GÓP NỔI BẬT</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#166534', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {selectedEval.achievements || 'Chưa ghi nhận chi tiết thành tích nổi bật.'}
                  </div>
                </div>

                {/* 2. Hạn chế, khó khăn tồn tại */}
                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B45309', fontWeight: '800', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <AlertCircle size={15} />
                    <span>2. HẠN CHẾ & KHÓ KHĂN CẦN KHẮC PHỤC</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#92400E', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {selectedEval.limitations || 'Không có ghi nhận vi phạm hay hạn chế lớn.'}
                  </div>
                </div>

                {/* 3. Kế hoạch hành động cải tiến */}
                <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1D4ED8', fontWeight: '800', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <Target size={15} />
                    <span>3. KẾ HOẠCH HÀNH ĐỘNG CẢI TIẾN</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#1E40AF', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {selectedEval.improvement_plan || 'Duy trì hiệu suất công tác theo tiêu chuẩn chất lượng hiện hành.'}
                  </div>
                </div>

                {/* 4. Đề xuất & Kiến nghị */}
                <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B21A8', fontWeight: '800', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <Lightbulb size={15} />
                    <span>4. ĐỀ XUẤT, KIẾN NGHỊ VỚI CÔNG TY & BỘ PHẬN</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#581C87', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                    {selectedEval.proposals || 'Không có đề xuất bổ sung.'}
                  </div>
                </div>

                {/* 5. Nhận xét của Quản lý trực tiếp */}
                <div style={{ backgroundColor: '#FAF6F0', border: '1px solid #EADCC9', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7B5233', fontWeight: '800', fontSize: '0.86rem', marginBottom: '6px' }}>
                    <MessageSquare size={15} />
                    <span>5. Ý KIẾN & NHẬN XÉT CỦA QUẢN LÝ TRỰC TIẾP</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#4B5563', lineHeight: '1.5', fontStyle: 'italic', whiteSpace: 'pre-line' }}>
                    "{selectedEval.manager_note || 'Đạt yêu cầu tiêu chuẩn công tác kiểm tra chất lượng theo kế hoạch tháng.'}"
                  </div>
                  {selectedEval.proposed_action && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #D4B896', fontSize: '0.82rem', color: '#7B5233', fontWeight: '700' }}>
                      👉 Đề xuất hành động: {selectedEval.proposed_action}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid #E5E7EB', backgroundColor: '#FAF6F0',
              display: 'flex', justifyContent: 'flex-end', gap: '8px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenEditModal(selectedEval);
                }}
                style={{
                  padding: '7px 14px', backgroundColor: '#FAF6F0', color: '#7B5233',
                  border: '1px solid #D4B896', borderRadius: '6px', fontWeight: '700',
                  fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
                }}
              >
                <Edit2 size={13} /> Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                style={{
                  padding: '7px 16px', backgroundColor: '#7B5233', color: '#FFFFFF',
                  border: 'none', borderRadius: '6px', fontWeight: '700',
                  fontSize: '0.82rem', cursor: 'pointer'
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: TẠO MỚI / CHỈNH SỬA ĐÁNH GIÁ (EvaluationFormModal) */}
      {formModalOpen && (
        <EvaluationFormModal
          isOpen={formModalOpen}
          initialData={editingEval}
          employees={employees}
          onClose={() => setFormModalOpen(false)}
          onSuccess={() => {
            setFormModalOpen(false);
            setRefreshTrigger(prev => prev + 1);
            showToast(editingEval ? 'Cập nhật đánh giá thành công!' : 'Tạo mới đánh giá thành công!', 'success');
          }}
        />
      )}

      {/* MODAL 3: XÁC NHẬN XÓA */}
      {deleteConfirmId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: '10px', width: '100%', maxWidth: '400px',
            padding: '22px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)', textAlign: 'center'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#FEE2E2',
              color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <Trash2 size={22} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', fontWeight: '800', color: '#1F2937' }}>
              Xác nhận xóa đánh giá?
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.82rem', color: '#6B7280', lineHeight: '1.4' }}>
              Bạn có chắc chắn muốn xóa hồ sơ đánh giá này không? Dữ liệu đã xóa sẽ không thể khôi phục.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  padding: '7px 16px', backgroundColor: '#F3F4F6', color: '#4B5563',
                  border: '1px solid #D1D5DB', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDeleteEvaluation(deleteConfirmId)}
                style={{
                  padding: '7px 18px', backgroundColor: '#DC2626', color: '#FFFFFF',
                  border: 'none', borderRadius: '6px', fontWeight: '700', cursor: 'pointer', fontSize: '0.82rem'
                }}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// COMPONENT MODAL NHẬP LIỆU ĐÁNH GIÁ (EvaluationFormModal)
const EvaluationFormModal = ({ isOpen, initialData, employees, onClose, onSuccess }) => {
  const [selectedEmpId, setSelectedEmpId] = useState(initialData?.employee_id || '');
  const [staffName, setStaffName] = useState(initialData?.staff_name || '');
  const [stage, setStage] = useState(initialData?.stage || '');
  const [department, setDepartment] = useState(initialData?.department || 'QLCL');
  const [evalDate, setEvalDate] = useState(initialData?.eval_date || new Date().toLocaleDateString('vi-VN'));
  const [actualScore, setActualScore] = useState(initialData?.actual_score ?? 95);
  const [rating, setRating] = useState(initialData?.rating || 'A');
  const [status, setStatus] = useState(initialData?.status || 'Đã đánh giá');

  const [achievements, setAchievements] = useState(initialData?.achievements || '');
  const [limitations, setLimitations] = useState(initialData?.limitations || '');
  const [improvementPlan, setImprovementPlan] = useState(initialData?.improvement_plan || '');
  const [proposals, setProposals] = useState(initialData?.proposals || '');
  const [managerNote, setManagerNote] = useState(initialData?.manager_note || '');
  const [proposedAction, setProposedAction] = useState(initialData?.proposed_action || '');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleEmployeeChange = (empCode) => {
    setSelectedEmpId(empCode);
    const emp = employees.find(e => String(e.employee_id) === String(empCode));
    if (emp) {
      setStaffName(emp.full_name || '');
      setStage(emp.stage || '');
      setDepartment(emp.department || 'QLCL');
    }
  };

  const handleScoreChange = (val) => {
    const num = parseFloat(val) || 0;
    setActualScore(num);
    if (num >= 90) setRating('A');
    else if (num >= 80) setRating('B');
    else if (num >= 65) setRating('C');
    else setRating('D');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!staffName.trim()) {
      setErrorMsg('Vui lòng nhập hoặc chọn nhân sự đánh giá!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        employee_id: selectedEmpId || null,
        staff_name: staffName.trim(),
        stage: stage || 'QC',
        department: department || 'QLCL',
        level: initialData?.level || 'Cấp 4',
        goal_score: 100.0,
        actual_score: Number(actualScore),
        rating: rating,
        status: status,
        eval_date: evalDate,
        achievements: achievements.trim(),
        limitations: limitations.trim(),
        improvement_plan: improvementPlan.trim(),
        proposals: proposals.trim(),
        manager_note: managerNote.trim(),
        proposed_action: proposedAction.trim()
      };

      if (initialData?.id) {
        await apiClient.put(`/staff-evaluations/${initialData.id}`, payload);
      } else {
        await apiClient.post('/staff-evaluations/', payload);
      }

      onSuccess();
    } catch (err) {
      console.error('Lỗi lưu đánh giá:', err);
      setErrorMsg(err.response?.data?.detail || 'Có lỗi xảy ra khi lưu đánh giá. Vui lòng kiểm tra lại!');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '750px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #EADCC9'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FAF6F0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} color="#7B5233" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: '#4A2E1B' }}>
              {initialData ? 'Chỉnh Sửa Hồ Sơ Đánh Giá Nhân Sự' : 'Thêm Mới Hồ Sơ Đánh Giá Nhân Sự'}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#7B5233', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {errorMsg && (
            <div style={{
              backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
              padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem', marginBottom: '14px'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Hàng 1: Chọn Nhân sự & Họ tên */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Chọn nhân sự từ hệ thống
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => handleEmployeeChange(e.target.value)}
                style={{
                  width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem',
                  border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', backgroundColor: '#FFF'
                }}
              >
                <option value="">-- Chọn nhân viên (tự điền) --</option>
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.full_name} ({emp.employee_id}) - {emp.stage || emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Họ và tên nhân sự <span style={{ color: '#DC2626' }}>*</span>
              </label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Nhập tên nhân sự..."
                required
                style={{
                  width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem',
                  border: '1px solid #D4B896', borderRadius: '6px', outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Hàng 2: Vị trí, Bộ phận, Ngày đánh giá */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Vị trí / Công đoạn
              </label>
              <input
                type="text"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                placeholder="VD: QC Định hình Khung"
                style={{
                  width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem',
                  border: '1px solid #D4B896', borderRadius: '6px', outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Phòng ban / Bộ phận
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="VD: QLCL"
                style={{
                  width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem',
                  border: '1px solid #D4B896', borderRadius: '6px', outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Ngày đánh giá
              </label>
              <input
                type="text"
                value={evalDate}
                onChange={(e) => setEvalDate(e.target.value)}
                placeholder="DD/MM/YYYY"
                style={{
                  width: '100%', height: '36px', padding: '0 10px', fontSize: '0.82rem',
                  border: '1px solid #D4B896', borderRadius: '6px', outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Hàng 3: Điểm số, Xếp loại, Trạng thái */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '16px', backgroundColor: '#FAF6F0', padding: '12px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Điểm thực tế (Thang 100)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={actualScore}
                onChange={(e) => handleScoreChange(e.target.value)}
                style={{
                  width: '100%', height: '34px', padding: '0 10px', fontSize: '0.88rem', fontWeight: '800',
                  color: '#7B5233', border: '1px solid #D4B896', borderRadius: '6px', outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Xếp loại đánh giá
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                style={{
                  width: '100%', height: '34px', padding: '0 10px', fontSize: '0.82rem', fontWeight: '700',
                  border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', backgroundColor: '#FFF'
                }}
              >
                <option value="A">Loại A (Xuất sắc &gt;= 90)</option>
                <option value="B">Loại B (Khá 80 - 89.9)</option>
                <option value="C">Loại C (Trung bình 65 - 79.9)</option>
                <option value="D">Loại D (Cần cải thiện &lt; 65)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '4px' }}>
                Trạng thái duyệt
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: '100%', height: '34px', padding: '0 10px', fontSize: '0.82rem',
                  border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', backgroundColor: '#FFF'
                }}
              >
                <option value="Đã đánh giá">Đã đánh giá</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Chưa đánh giá">Chưa đánh giá</option>
              </select>
            </div>
          </div>

          {/* Hàng 4: 4 Khung Text Đánh Giá */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#15803D', marginBottom: '3px' }}>
              🌟 1. Thành tích, đóng góp nổi bật trong kỳ
            </label>
            <textarea
              rows={2}
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              placeholder="Ghi nhận các điểm mạnh, sáng kiến, bám chuyền, tỉ lệ lỗi thấp..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#B45309', marginBottom: '3px' }}>
              ⚠️ 2. Hạn chế, khó khăn tồn tại cần khắc phục
            </label>
            <textarea
              rows={2}
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
              placeholder="Các điểm yếu cần khắc phục, kỹ năng cần trau dồi..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#1D4ED8', marginBottom: '3px' }}>
              🎯 3. Kế hoạch hành động cải tiến
            </label>
            <textarea
              rows={2}
              value={improvementPlan}
              onChange={(e) => setImprovementPlan(e.target.value)}
              placeholder="Các biện pháp cụ thể, khóa học, phương pháp cải tiến..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#6B21A8', marginBottom: '3px' }}>
              💡 4. Đề xuất, kiến nghị của nhân sự
            </label>
            <textarea
              rows={2}
              value={proposals}
              onChange={(e) => setProposals(e.target.value)}
              placeholder="Đề xuất công cụ, thiết bị đo kiểm, chế độ chính sách..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#7B5233', marginBottom: '3px' }}>
              📝 5. Ý kiến & Nhận xét của Quản lý trực tiếp (QC Lead / Trưởng bộ phận)
            </label>
            <textarea
              rows={2}
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
              placeholder="Nhận xét tổng quát của Quản lý về thái độ và kết quả công việc..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '0.82rem',
                border: '1px solid #D4B896', borderRadius: '6px', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          {/* Footer nút hành động */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '14px',
            borderTop: '1px solid #E5E7EB'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: '7px 16px', backgroundColor: '#F3F4F6', color: '#4B5563',
                border: '1px solid #D1D5DB', borderRadius: '6px', fontWeight: '600',
                fontSize: '0.82rem', cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '7px 20px', backgroundColor: '#7B5233', color: '#FFFFFF',
                border: 'none', borderRadius: '6px', fontWeight: '700',
                fontSize: '0.82rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px'
              }}
            >
              {submitting ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
              <span>{initialData ? 'Lưu cập nhật' : 'Tạo đánh giá'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StaffEvaluationListView;
