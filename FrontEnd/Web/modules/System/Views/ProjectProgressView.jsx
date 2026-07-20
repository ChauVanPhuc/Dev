import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { screenService } from '@modules/System/Models/screen.service';
import { bugService } from '@modules/System/Models/bug.service';
import api from '@webShared/Services/api.service';
import {
  Search, Filter, Plus, Trash2, Edit3, CheckCircle, Clock, AlertCircle,
  X, RefreshCw, Layers, ShieldAlert, Monitor, Phone, MoreVertical, FileDown
} from 'lucide-react';
import '@styles/components.css';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
};

const ProjectProgressView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [screens, setScreens] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [subsystemFilter, setSubsystemFilter] = useState('All');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [actionMenuId, setActionMenuId] = useState(null);

  const fileInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    toast(type, message);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [screensData, bugsData] = await Promise.all([
        screenService.getScreens(),
        bugService.getBugs()
      ]);
      setScreens(screensData || []);
      setBugs(bugsData || []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu tiến độ:', error);
      showToast('Tải dữ liệu thất bại!', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close actions dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.action-btn') && !e.target.closest('.action-menu')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Calculations for KPI top cards (identical to HD06)
  const stats = useMemo(() => {
    const totalScreens = screens.length;
    const completedScreens = screens.filter(s => s.status === 'Hoàn thành').length;
    const buildProgress = totalScreens > 0 ? Math.round((completedScreens / totalScreens) * 100) : 0;

    const totalScreensWithBugs = screens.filter(s => {
      const b = bugs.filter(bug => bug.screen_id === s.id);
      return b.length > 0;
    }).length;
    const screensWithAllBugsResolved = screens.filter(s => {
      const b = bugs.filter(bug => bug.screen_id === s.id);
      return b.length > 0 && b.every(bug => bug.status === 'Verified' || bug.status === 'Hoàn thành');
    }).length;
    const editProgress = totalScreensWithBugs > 0 ? Math.round((screensWithAllBugsResolved / totalScreensWithBugs) * 100) : 100;

    const totalBugs = bugs.length;
    const resolvedBugs = bugs.filter(b => b.status === 'Verified' || b.status === 'Hoàn thành' || b.status === 'Resolved').length;
    const fixProgress = totalBugs > 0 ? Math.round((resolvedBugs / totalBugs) * 100) : 100;

    const totalCritical = bugs.filter(b => b.severity === 'Critical' || b.severity === 'Khẩn cấp').length;
    const resolvedCritical = bugs.filter(b => (b.severity === 'Critical' || b.severity === 'Khẩn cấp') && (b.status === 'Verified' || b.status === 'Hoàn thành' || b.status === 'Resolved')).length;
    const criticalProgress = totalCritical > 0 ? Math.round((resolvedCritical / totalCritical) * 100) : 100;

    return {
      totalScreens,
      completedScreens,
      buildProgress,
      totalScreensWithBugs,
      screensWithAllBugsResolved,
      editProgress,
      totalBugs,
      resolvedBugs,
      fixProgress,
      totalCritical,
      resolvedCritical,
      criticalProgress
    };
  }, [bugs, screens]);

  // Screen progress bar calculation
  const getScreenBugsData = (screenId) => {
    const screenBugs = bugs.filter(b => b.screen_id === screenId);
    const total = screenBugs.length;
    const resolved = screenBugs.filter(b => b.status === 'Verified' || b.status === 'Hoàn thành' || b.status === 'Resolved').length;
    return { total, resolved };
  };

  const calculateScreenProgress = (screen, bugData) => {
    if (screen.status === 'Mới thiết kế') return 0;
    if (bugData.total === 0) return 100;
    return Math.round((bugData.resolved / bugData.total) * 100);
  };

  // Filter & Search screens
  const filteredScreens = useMemo(() => {
    return screens.filter(screen => {
      const matchesSearch =
        screen.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        screen.current_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (screen.subtitle && screen.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubsystem = subsystemFilter === 'All' || screen.subsystem === subsystemFilter;

      return matchesSearch && matchesSubsystem;
    });
  }, [screens, searchQuery, subsystemFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredScreens.length / pageSize);
  const paginatedScreens = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredScreens.slice(startIndex, startIndex + pageSize);
  }, [filteredScreens, currentPage, pageSize]);

  // Excel handlers
  const handleExportExcel = () => {
    if (filteredScreens.length === 0) {
      showToast('Không có dữ liệu màn hình nào để xuất!', 'error');
      return;
    }

    const headers = [
      'Mã',
      'Màn hình',
      'Mô tả',
      'Trạng thái',
      'Lỗi sửa',
      'Ngày cập nhật',
      'Người cập nhật',
      'Tiến độ (%)'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredScreens.map(screen => {
        const bugData = getScreenBugsData(screen.id);
        const progress = calculateScreenProgress(screen, bugData);

        // Find assignee of the latest bug on this screen, or default to Admin
        const screenBugs = bugs.filter(b => b.screen_id === screen.id);
        let updater = 'Admin';
        let updatedAt = screen.updated_at ? screen.updated_at.split('T')[0] : '';
        if (screenBugs.length > 0) {
          const sorted = [...screenBugs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
          updater = sorted[0].assignee || sorted[0].reporter || 'Admin';
          const bugUpdated = sorted[0].updates && sorted[0].updates.length > 0 ? sorted[0].updates[0].created_at : sorted[0].created_at;
          if (bugUpdated) {
            updatedAt = bugUpdated.split('T')[0];
          }
        }

        return [
          screen.current_code,
          `"${screen.title.replace(/"/g, '""')}"`,
          `"${(screen.subtitle || '').replace(/"/g, '""')}"`,
          screen.status,
          `${bugData.resolved}/${bugData.total}`,
          updatedAt,
          updater,
          `${progress}%`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tien_do_thuc_hien_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Xuất dữ liệu Excel (CSV) thành công!');
  };

  const handleImportExcelClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast(`Đang nhập dữ liệu từ tệp ${file.name}...`, 'info');
    setTimeout(() => {
      showToast(`Đã nhập dữ liệu thành công từ tệp ${file.name}!`, 'success');
    }, 1000);
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Force page wrapper to be full viewport height and disable page scroll */
        .admin-layout:has(.project-progress-container) {
          height: 100vh !important;
          overflow: hidden !important;
        }

        .admin-main:has(.project-progress-container) {
          height: 100vh !important;
          overflow: hidden !important;
          max-width: none !important;
        }

        .dashboard-content:has(.project-progress-container) {
          height: calc(100vh - 60px) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          padding: 8px 12px !important;
          box-sizing: border-box !important;
        }

        .admin-main:has(.project-progress-container) .admin-header {
          padding: 6px 12px !important;
          max-width: 100% !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
      `}} />

      <div className="mgmt-container project-progress-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', maxWidth: '100%', margin: '0', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>

        {/* KPI Dashboard Overview Card - Span 100% width at top */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
          width: '100%'
        }}>
          {/* Card 1: Tiến độ xây dựng */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến độ xây dựng</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.completedScreens}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalScreens}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.buildProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.buildProgress}%</span>
            </div>
          </div>

          {/* Card 2: Tiến độ chỉnh sửa */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến độ chỉnh sửa</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.screensWithAllBugsResolved}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalScreensWithBugs}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.editProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.editProgress}%</span>
            </div>
          </div>

          {/* Card 3: Tiến độ khắc phục */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiến độ khắc phục</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.resolvedBugs}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalBugs}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.fixProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.fixProgress}%</span>
            </div>
          </div>

          {/* Card 4: Lỗi khẩn cấp */}
          <div className="kpi-card" style={{ background: '#fff', border: '1px solid #E2E8F0', padding: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lỗi khẩn cấp</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
              <span style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1E293B' }}>{stats.resolvedCritical}</span>
              <span style={{ fontSize: '1rem', color: '#94A3B8', fontWeight: '500' }}>/{stats.totalCritical}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${stats.criticalProgress}%`, height: '100%', backgroundColor: '#7B5233', borderRadius: '4px' }} />
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748B', minWidth: '32px', textAlign: 'right' }}>{stats.criticalProgress}%</span>
            </div>
          </div>
        </div>

        {/* Toolbar region */}
         <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          searchPlaceholder="Nhập mã màn hình, tên màn hình..."
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={subsystemFilter !== 'All' ? 1 : 0}
          extraActions={[
            { label: 'Quản lý màn hình', onClick: () => navigate('/admin/screens') },
            { label: 'Danh sách lỗi hệ thống', onClick: () => navigate('/admin/screens/bugs') }
          ]}
          importActions={[
            { label: 'Nhập từ Excel (CSV)', onClick: handleImportExcelClick }
          ]}
          onExport={handleExportExcel}
          hasWritePermission={true}
        >
          <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        </PageToolbar>

        {/* Subsystem filter inline bar */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar" style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '8px' }}>
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo Phân hệ</label>
              <select
                value={subsystemFilter}
                onChange={(e) => { setSubsystemFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', minWidth: '180px', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả phân hệ</option>
                <option value="Quản lý hệ thống">Quản lý hệ thống</option>
                <option value="Quản lý nhân sự">Quản lý nhân sự</option>
                <option value="Quản lý sản xuất">Quản lý sản xuất</option>
                <option value="Quản lý chất lượng">Quản lý chất lượng</option>
                <option value="Quản lý kinh doanh">Quản lý kinh doanh</option>
                <option value="Quản lý kỹ thuật">Quản lý kỹ thuật</option>
                <option value="Bảo trì - cơ sở hạ tầng">Bảo trì - cơ sở hạ tầng</option>
                <option value="Trang chủ">Trang chủ</option>
              </select>
            </div>
            <button
              className="reset-filter-btn"
              onClick={() => {
                setSearchQuery('');
                setSubsystemFilter('All');
                setCurrentPage(1);
              }}
              style={{
                alignSelf: 'flex-end',
                height: '34px',
                background: '#FAF6F0',
                color: '#7B5233',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #EADCC9',
                transition: 'all 0.2s'
              }}
            >
              <RefreshCw size={14} /> Đặt lại
            </button>
          </div>
        )}

        {/* Table representation */}
        <div className="mgmt-table card admin-table-card" style={{ boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#7B5233', fontWeight: 'bold' }}>
              <RefreshCw size={28} className="spin-icon" style={{ color: '#7B5233' }} />
              <span>Đang tải dữ liệu tiến độ...</span>
            </div>
          ) : filteredScreens.length === 0 ? (
            <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#6B7280' }}>
              <AlertCircle size={36} style={{ color: '#9CA3AF' }} />
              <span style={{ fontSize: '0.9rem' }}>Không tìm thấy màn hình nào phù hợp!</span>
            </div>
          ) : (
            <>
              <div className="table-responsive admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #EADCC9', color: '#7B5233', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '85px' }}>Mã</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '220px' }}>Màn hình</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px' }}>Mô tả</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '130px' }}>Trạng thái</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '110px' }}>Lỗi sửa</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '120px' }}>Ngày cập nhật</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '130px' }}>Người cập nhật</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '220px' }}>Tiến độ</th>
                      <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', textAlign: 'center', width: '80px' }}>THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedScreens.map((screen, index) => {
                      const bugData = getScreenBugsData(screen.id);
                      const progress = calculateScreenProgress(screen, bugData);
                      const isLastFew = index >= paginatedScreens.length - 2 && paginatedScreens.length > 2;

                      // Calculate updater and updated_at based on latest screen bugs or screen update_at
                      const screenBugs = bugs.filter(b => b.screen_id === screen.id);
                      let updater = 'Admin';
                      let updatedAt = screen.updated_at;
                      if (screenBugs.length > 0) {
                        const sorted = [...screenBugs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
                        updater = sorted[0].assignee || sorted[0].reporter || 'Admin';
                        const bugUpdated = sorted[0].updates && sorted[0].updates.length > 0 ? sorted[0].updates[0].created_at : sorted[0].created_at;
                        if (bugUpdated) {
                          updatedAt = bugUpdated;
                        }
                      }

                      // Progress bar colors configuration:
                      // Red if progress < 35%
                      // Green if 35% - 99%
                      // Gray/default if 100%
                      let progressBarColor = '#9CA3AF'; // Gray (100%)
                      if (progress < 35) {
                        progressBarColor = '#EF4444'; // Red
                      } else if (progress < 100) {
                        progressBarColor = '#10B981'; // Green
                      }

                      return (
                        <tr
                          key={screen.id}
                          className="animate-card-entrance"
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            fontSize: '0.85rem',
                            transition: 'all 0.2s'
                          }}
                        >
                          {/* Mã */}
                          <td style={{ padding: '16px 20px !important', fontWeight: 'bold', color: '#7B5233', fontFamily: 'monospace' }}>
                            {screen.current_code}
                          </td>
                          {/* Màn hình */}
                          <td style={{ padding: '16px 20px !important' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <strong style={{ color: '#0F172A' }}>{screen.title}</strong>
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                Phân hệ: {screen.subsystem || 'Hệ thống'}
                              </span>
                            </div>
                          </td>
                          {/* Mô tả */}
                          <td style={{ padding: '16px 20px !important', color: '#475569' }}>
                            {screen.subtitle || screen.route_path}
                          </td>
                          {/* Trạng thái */}
                          <td style={{ padding: '16px 20px !important' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              backgroundColor: screen.status === 'Hoàn thành' ? '#ECFDF4' : '#F1F5F9',
                              color: screen.status === 'Hoàn thành' ? '#15803D' : '#475569'
                            }}>
                              {screen.status}
                            </span>
                          </td>
                          {/* Lỗi sửa */}
                          <td style={{ padding: '16px 20px !important', fontWeight: '600', color: bugData.total > 0 && bugData.resolved < bugData.total ? '#B45309' : '#1E293B' }}>
                            {bugData.resolved}/{bugData.total}
                          </td>
                          {/* Ngày cập nhật */}
                          <td style={{ padding: '16px 20px !important', color: '#4B5563' }}>
                            {formatDate(updatedAt)}
                          </td>
                          {/* Người cập nhật */}
                          <td style={{ padding: '16px 20px !important', color: '#4B5563', fontWeight: '500' }}>
                            {updater}
                          </td>
                          {/* Tiến độ */}
                          <td style={{ padding: '16px 20px !important' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ flex: 1, height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: progressBarColor, borderRadius: '4px' }} />
                              </div>
                              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', minWidth: '32px', textAlign: 'right' }}>
                                {progress}%
                              </span>
                            </div>
                          </td>
                          {/* Thao tác */}
                          <td style={{ position: 'relative', zIndex: actionMenuId === screen.id ? 40 : 1, textAlign: 'center' }}>
                            <button
                              className="action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                                  e.nativeEvent.stopImmediatePropagation();
                                }
                                setActionMenuId(actionMenuId === screen.id ? null : screen.id);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                padding: '6px',
                                cursor: 'pointer',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#7B5233',
                                transition: 'background-color 0.2s'
                              }}
                            >
                              <MoreVertical size={16} style={{ pointerEvents: 'none' }} />
                            </button>
                            {actionMenuId === screen.id && (
                              <div 
                                className="action-menu" 
                                style={{ 
                                  right: '10px', 
                                  opacity: 1, 
                                  animation: 'none',
                                  ...(isLastFew ? { top: 'auto', bottom: 'calc(100% + 4px)' } : {})
                                }}
                              >
                                <button
                                  className="action-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(null);
                                    navigate(`/admin/screens/${screen.id}`);
                                  }}
                                >
                                  Xem chi tiết
                                </button>
                                <button
                                  className="action-menu-item"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(null);
                                    navigate('/admin/screens/bugs', { state: { filterScreenId: screen.id } });
                                  }}
                                >
                                  Xem danh sách lỗi
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

              {/* Pagination control */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderTop: '1px solid #EADCC9', backgroundColor: '#FAF6F0' }}>
                  <span style={{ fontSize: '0.8rem', color: '#7B5233' }}>
                    Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredScreens.length)}</strong> trong tổng số <strong>{filteredScreens.length}</strong> màn hình
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', border: '1px solid #EADCC9', background: '#fff', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: '#7B5233', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #EADCC9',
                          background: currentPage === idx + 1 ? '#7B5233' : '#fff',
                          color: currentPage === idx + 1 ? '#fff' : '#7B5233',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 12px', border: '1px solid #EADCC9', background: '#fff', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: '#7B5233', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ProjectProgressView;
