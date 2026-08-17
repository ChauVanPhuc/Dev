import React, { useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import {
  Search, Filter, Plus, Trash2, Edit3, CheckCircle, Clock, AlertCircle,
  X, RefreshCw, Layers, ShieldAlert, Monitor, Phone, Clipboard, FolderOpen,
  MoreVertical
} from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

// Import custom hook
import { useScreenBugManagement, parseDescription } from './hooks/useScreenBugManagement';

import BugDetailsPanel from './components/BugDetailsPanel';
import AddBugModal from './components/AddBugModal';
import '@styles/components.css';

const ScreenBugManagementView = () => {
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/screens/bugs');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title);
    if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || '');
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, title, subtitle, screenCode]);

  const bugManager = useScreenBugManagement();
  const {
    actionMenuId,
    activeLightboxUrl,
    activeUpdateForProof,
    addForm,
    addImages,
    addScreenSearch,
    bugToDelete,
    bugs,
    commentImages,
    commentText,
    confirmDeleteBug,
    createdDateFilter,
    criticalProgress,
    csvContent,
    data,
    date,
    datePart,
    editForm,
    editModalMode,
    editProgress,
    expectedDateFilter,
    fetchBugs,
    fetchScreens,
    fetchUsers,
    file,
    fileInputRef,
    files,
    currentPage,
    totalPages,
    getImageUrl,
    filteredBugs,
    finalDescription,
    fixProgress,
    formatDate,
    formatDateTime,
    handleAddSubmit,
    handleDeleteClick,
    handleEditClick,
    handleEditSubmit,
    handleExportExcel,
    handleFileChange,
    handleImportExcelClick,
    handleManualUpload,
    handleOutsideClick,
    handlePasteFromClipboardAPI,
    handlePasteImage,
    handlePostComment,
    handleQuickStatusChange,
    handleRowClick,
    handleSocketMessage,
    isAddScreenDropdownOpen,
    isFilterBarOpen,
    isSubmitting,
    itUsers,
    items,
    lastScreenId,
    lastUpdate,
    loading,
    location,
    matched,
    matchesCreatedDate,
    matchesExpectedDate,
    matchesPlatform,
    matchesScreen,
    matchesSearch,
    matchesSeverity,
    matchesStatus,
    matchesUpdatedDate,
    navigate,
    newUpdate,
    pageSize,
    paginatedBugs,
    platformFilter,
    proofImages,
    proofNotes,
    renderQuickStatusActions,
    renderSeverityBadge,
    renderStatusBadge,
    resolvedBugs,
    resolvedCritical,
    screenComponents,
    screenFilter,
    screens,
    screensWithAllBugsResolved,
    searchQuery,
    selectedBug,
    selectedScreenData,
    setAddForm,
    setAddImages,
    setAddScreenSearch,
    setBugToDelete,
    setBugs,
    setCreatedDateFilter,
    setCurrentPage,
    setExpectedDateFilter,
    setIsAddScreenDropdownOpen,
    setIsFilterBarOpen,
    setLoading,
    setPageSize,
    setPlatformFilter,
    setScreenFilter,
    setScreens,
    setSearchQuery,
    setSelectedBug,
    setSeverityFilter,
    setShowAddModal,
    setShowDeleteModal,
    setSortBy,
    setStatusFilter,
    setUpdatedDateFilter,
    setUsers,
    severityFilter,
    showAddModal,
    showDeleteModal,
    showProofModal,
    showToast,
    sortBy,
    sortOptions,
    sortedScreens,
    stats,
    status,
    statusFilter,
    triggerStatusUpdate,
    updatedDateFilter,
    userObj,
    userStr,
    users,
  } = bugManager;

  return (
    <>
      <div className="mgmt-container screen-management-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px', maxWidth: '100%', margin: '0', width: '100%', minHeight: '100%' }}>

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

        {/* Search and Filters Toolbar - Span 100% width at top */}
        <PageToolbar
          searchValue={searchQuery}
          onSearchChange={(val) => { setSearchQuery(val); setCurrentPage(1); }}
          searchPlaceholder="Nhập mã lỗi, mã màn hình, tên màn hình"
          showSort={true}
          sortValue={sortBy}
          onSortChange={setSortBy}
          sortOptions={sortOptions}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={
            (platformFilter !== 'All' ? 1 : 0) +
            (statusFilter !== 'All' ? 1 : 0) +
            (severityFilter !== 'All' ? 1 : 0) +
            (screenFilter !== 'All' ? 1 : 0) +
            (createdDateFilter ? 1 : 0) +
            (updatedDateFilter ? 1 : 0) +
            (expectedDateFilter ? 1 : 0)
          }
          extraActions={[
            { label: 'Quản lý màn hình', onClick: () => navigate('/admin/screens') },
            { label: 'Tiến độ thực hiện', onClick: () => navigate('/admin/screens/progress') }
          ]}
          importActions={[
            { label: 'Nhập từ Excel (CSV)', onClick: handleImportExcelClick }
          ]}
          onExport={handleExportExcel}
          onCreate={() => setShowAddModal(true)}
          createLabel="Thêm mới"
          hasWritePermission={true}
        >
          <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display: 'none' }} />
        </PageToolbar>

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '8px' }}>
            {/* Lọc theo màn hình */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo màn hình</label>
              <select
                value={screenFilter}
                onChange={(e) => { setScreenFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', minWidth: '160px', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả màn hình</option>
                {screens.map(s => (
                  <option key={s.id} value={s.id.toString()}>{s.current_code}: {s.title}</option>
                ))}
              </select>
            </div>

            {/* Mức độ */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo mức độ</label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', minWidth: '130px', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả mức độ</option>
                <option value="Critical">Khẩn cấp</option>
                <option value="High">Cao</option>
                <option value="Medium">Trung bình</option>
                <option value="Low">Thấp</option>
              </select>
            </div>

            {/* Trạng thái */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo trạng thái</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', minWidth: '140px', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="New">Mới</option>
                <option value="In Progress">Cần kiểm tra</option>
                <option value="Resolved">Đã sửa</option>
                <option value="Verified">Đã xác nhận</option>
              </select>
            </div>

            {/* Ngày ghi nhận */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo ngày ghi nhận</label>
              <input
                type="date"
                value={createdDateFilter}
                onChange={(e) => { setCreatedDateFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              />
            </div>

            {/* Ngày cập nhật */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Lọc theo ngày cập nhật</label>
              <input
                type="date"
                value={updatedDateFilter}
                onChange={(e) => { setUpdatedDateFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              />
            </div>

            {/* Nền tảng */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Nền tảng</label>
              <select
                value={platformFilter}
                onChange={(e) => { setPlatformFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              >
                <option value="All">Tất cả nền tảng</option>
                <option value="Web">Web</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            {/* Hiển thị số dòng */}
            <div className="filter-field-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label className="filter-field-label" style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748B' }}>Hiển thị số dòng</label>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setCurrentPage(1); }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', outline: 'none', fontSize: '0.8rem', height: '34px', cursor: 'pointer' }}
              >
                <option value={10}>10 dòng</option>
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>

            {/* Nút Reset */}
            <button
              className="reset-filter-btn"
              onClick={() => {
                setSearchQuery('');
                setPlatformFilter('All');
                setStatusFilter('All');
                setSeverityFilter('All');
                setScreenFilter('All');
                setCreatedDateFilter('');
                setUpdatedDateFilter('');
                setExpectedDateFilter('');
                setSortBy('created_at_desc');
                setCurrentPage(1);
              }}
              style={{
                alignSelf: 'flex-end',
                height: '38px',
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
              title="Đặt lại bộ lọc"
            >
              <RefreshCw size={14} /> Đặt lại
            </button>
          </div>
        )}

        {/* Container Flex chia đôi Master-Detail */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', width: '100%', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Master List (Bên trái: Bảng danh sách) */}
          <div className="admin-list-layout-bug" style={{
            flex: selectedBug ? '0 0 calc(40% - 10px)' : '1 1 100%',
            maxWidth: selectedBug ? '40%' : '100%',
            width: selectedBug ? 'calc(40% - 10px)' : '100%',
            minWidth: '350px',
            transition: 'all 0.3s ease-in-out',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            {/* Table Container */}
            <div className="mgmt-table card admin-table-card" style={{ boxShadow: '0 4px 12px rgba(123, 82, 51, 0.08)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {loading ? (
                <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#7B5233', fontWeight: 'bold' }}>
                  <RefreshCw size={28} className="spin-icon" style={{ color: '#7B5233' }} />
                  <span>Đang tải dữ liệu lỗi...</span>
                </div>
              ) : filteredBugs.length === 0 ? (
                <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#6B7280' }}>
                  <AlertCircle size={36} style={{ color: '#9CA3AF' }} />
                  <span style={{ fontSize: '0.9rem' }}>Không tìm thấy báo cáo lỗi màn hình nào phù hợp!</span>
                </div>
              ) : (
                <>
                  <div className="table-responsive admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #EADCC9', color: '#7B5233', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {selectedBug ? (
                            <>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '70px' }}>Mã</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px' }}>Màn hình</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px' }}>Nội dung</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '80px' }}>Mức độ</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '90px' }}>Trạng thái</th>
                            </>
                          ) : (
                            <>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '85px' }}>Mã</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '180px' }}>Tên màn hình</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '130px' }}>Component</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px' }}>Mô tả</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '110px' }}>Mức độ</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '120px' }}>Trạng thái</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '120px' }}>Ngày cập nhật</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '130px' }}>Người cập nhật</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', width: '120px' }}>Ngày ghi nhận</th>
                              <th style={{ position: 'sticky', top: 0, backgroundColor: '#FAF6F0', zIndex: 2, padding: '12px 16px', textAlign: 'center', width: '80px' }}>THAO TÁC</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedBugs.map((bug) => {
                          const lastUpdate = bug.updates && bug.updates.length > 0 ? bug.updates[0] : null;
                          const updatedAt = lastUpdate ? lastUpdate.created_at : bug.created_at;
                          const updater = lastUpdate ? lastUpdate.updater : (bug.reporter || 'Chưa rõ');
                          const { tag, text } = parseDescription(bug.description);

                          return (
                            <tr
                              key={bug.id}
                              onClick={() => handleRowClick(bug)}
                              className="animate-card-entrance"
                              style={{
                                borderBottom: '1px solid #F1F5F9',
                                fontSize: '0.85rem',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                backgroundColor: selectedBug && selectedBug.id === bug.id ? '#F2ECE4 !important' : 'transparent',
                                borderLeft: selectedBug && selectedBug.id === bug.id ? '4px solid #7B5233 !important' : '4px solid transparent',
                                position: 'relative',
                                zIndex: actionMenuId === bug.id ? 30 : 1
                              }}
                            >
                              {selectedBug ? (
                                <>
                                  {/* Mã ID */}
                                  <td style={{ padding: '10px 12px !important', fontWeight: 'bold', color: '#7B5233', fontFamily: 'monospace' }}>
                                    BUG-{bug.id}
                                  </td>
                                  {/* Màn hình */}
                                  <td style={{ padding: '10px 12px !important' }}>
                                    <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bug.screen_code}</strong>
                                  </td>
                                  {/* Nội dung */}
                                  <td style={{ padding: '10px 12px !important', maxWidth: '150px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {tag && (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '1px 4px',
                                          borderRadius: '3px',
                                          fontSize: '0.6rem',
                                          fontWeight: 'bold',
                                          color: '#7B5233',
                                          backgroundColor: '#FAF6F0',
                                          border: '1px solid #EADCC9',
                                          width: 'fit-content'
                                        }}>
                                          {tag}
                                        </span>
                                      )}
                                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }} title={text}>{text}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 12px !important' }}>{renderSeverityBadge(bug.severity)}</td>
                                  <td style={{ padding: '10px 12px !important' }}>{renderStatusBadge(bug.status)}</td>
                                </>
                              ) : (
                                <>
                                  {/* Mã */}
                                  <td style={{ padding: '16px 20px !important', fontWeight: 'bold', color: '#7B5233', fontFamily: 'monospace' }}>
                                    BUG-{bug.id}
                                  </td>
                                  {/* Tên màn hình */}
                                  <td style={{ padding: '16px 20px !important' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{bug.screen_code}</strong>
                                      <span style={{ fontSize: '0.75rem', color: '#64748B' }} title={bug.screen_title}>
                                        {bug.screen_title}
                                      </span>
                                    </div>
                                  </td>
                                  {/* Component */}
                                  <td style={{ padding: '16px 20px !important' }}>
                                    {tag ? (
                                      <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '0.68rem',
                                        fontWeight: 'bold',
                                        color: '#7B5233',
                                        backgroundColor: '#FAF6F0',
                                        border: '1px solid #EADCC9'
                                      }}>
                                        {tag}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94A3B8', fontSize: '0.75rem', fontStyle: 'italic' }}>Chung</span>
                                    )}
                                  </td>
                                  {/* Mô tả */}
                                  <td style={{ padding: '16px 20px !important', maxWidth: '280px' }}>
                                    <div style={{ fontWeight: '500', color: '#334155', wordBreak: 'break-word' }}>
                                      <span title={text}>{text}</span>
                                    </div>
                                  </td>
                                  {/* Mức độ */}
                                  <td style={{ padding: '16px 20px !important' }}>{renderSeverityBadge(bug.severity)}</td>
                                  {/* Trạng thái */}
                                  <td style={{ padding: '16px 20px !important' }}>{renderStatusBadge(bug.status)}</td>
                                  {/* Ngày cập nhật */}
                                  <td style={{ padding: '16px 20px !important', color: '#4B5563' }}>{formatDate(updatedAt)}</td>
                                  {/* Người cập nhật */}
                                  <td style={{ padding: '16px 20px !important', color: '#4B5563', fontWeight: '500' }}>{updater}</td>
                                  {/* Ngày ghi nhận */}
                                  <td style={{ padding: '16px 20px !important', color: '#4B5563' }}>{formatDate(bug.created_at)}</td>
                                  {/* Thao tác */}
                                  <td style={{ position: 'relative', zIndex: actionMenuId === bug.id ? 40 : 1, textAlign: 'center' }}>
                                    <button
                                      className="action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (e.nativeEvent && e.nativeEvent.stopImmediatePropagation) {
                                          e.nativeEvent.stopImmediatePropagation();
                                        }
                                        setActionMenuId(actionMenuId === bug.id ? null : bug.id);
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
                                    {actionMenuId === bug.id && (
                                      <div className="action-menu" style={{ opacity: 1, animation: 'none' }}>
                                        <button
                                          className="action-menu-item"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMenuId(null);
                                            handleEditClick(bug);
                                          }}
                                        >
                                          Chỉnh sửa
                                        </button>
                                        <button
                                          className="action-menu-item danger"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMenuId(null);
                                            handleDeleteClick(bug);
                                          }}
                                        >
                                          Xóa
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="admin-pagination-desktop desktop-only">
                    <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                      Hiển thị <b>{filteredBugs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredBugs.length)}</b> trên <b>{filteredBugs.length}</b> lỗi màn hình
                    </div>

                    {totalPages > 1 && (
                      <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                        <button
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          className="page-btn"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        {(() => {
                          const pages = [];
                          const delta = 2;
                          for (let i = 1; i <= totalPages; i++) {
                            if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                              pages.push(i);
                            } else if (pages[pages.length - 1] !== '...') {
                              pages.push('...');
                            }
                          }
                          return pages.map((p, idx) => {
                            if (p === '...') {
                              return (
                                <span key={`ell-${idx}`} style={{ padding: '0 4px', color: '#8D6E63', fontWeight: '700' }}>
                                  ...
                                </span>
                              );
                            }
                            return (
                              <button
                                key={p}
                                className={`page-btn ${currentPage === p ? 'active' : ''}`}
                                onClick={() => setCurrentPage(p)}
                              >
                                {p}
                              </button>
                            );
                          });
                        })()}
                        <button
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          className="page-btn"
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

          {/* Detail Pane (Bên phải: Panel thông tin chi tiết thay thế cho popup modal) */}
          <div style={{
            flex: selectedBug ? '0 0 calc(60% - 10px)' : '0 0 0%',
            maxWidth: selectedBug ? '60%' : '0%',
            width: selectedBug ? 'calc(60% - 10px)' : '0%',
            minWidth: selectedBug ? '400px' : '0px',
            display: selectedBug ? 'flex' : 'none',
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)',
            flexDirection: 'column',
            boxSizing: 'border-box',
            transition: 'all 0.3s ease-in-out',
            height: '100%',
            minHeight: 0,
            overflow: 'hidden'
          }}>
            <BugDetailsPanel bugManager={bugManager} />
          </div>

        </div>
      </div>

      {/* Add Bug Modal */}
      <AddBugModal bugManager={bugManager} />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && bugToDelete && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                <Trash2 size={20} style={{ color: '#FCA5A5' }} /> Xác nhận xóa báo cáo lỗi
              </h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', marginBottom: '18px' }}>
                <div style={{
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <AlertCircle size={22} />
                </div>
                <div style={{ fontSize: '0.95rem', color: '#4B5563', lineHeight: '1.5' }}>
                  Bạn có chắc chắn muốn xóa báo cáo lỗi của màn hình:
                  <div style={{ fontWeight: 'bold', color: '#1F2937', marginTop: '4px', fontSize: '1rem' }}>
                    {bugToDelete.screen_code} - {bugToDelete.screen_title}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#FAF8F6',
                borderLeft: '4px solid #7B5233',
                borderRadius: '8px',
                padding: '12px 16px',
                maxHeight: '120px',
                overflowY: 'auto',
                fontSize: '0.88rem',
                color: '#4B5563',
                fontStyle: 'italic',
                lineHeight: '1.6',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}>
                "{bugToDelete.description}"
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '15px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: '#FAF9F6' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowDeleteModal(false)} style={{ borderRadius: '8px', padding: '8px 16px' }}>Hủy</button>
              <button type="button" className="btn-primary" onClick={confirmDeleteBug} style={{ borderRadius: '8px', backgroundColor: '#DC2626', borderColor: '#DC2626', padding: '8px 16px', color: '#fff', fontWeight: 'bold' }}>Xóa ngay</button>
            </div>
          </div>
        </div>
      )}

      {/* Proof Image Modal for Resolved/Verified */}
      {showProofModal && activeUpdateForProof && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal-container" style={{ maxWidth: '420px', borderRadius: '12px', border: '1px solid #EADCC9' }}>
            <div className="modal-header" style={{
              backgroundColor: activeUpdateForProof.status === 'Resolved' ? '#D97706' : (activeUpdateForProof.status === 'Verified' ? '#10B981' : '#EF4444'),
              color: '#fff',
              padding: '12px 18px'
            }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold' }}>
                {activeUpdateForProof.status === 'Resolved' ? '✓ Cập nhật Đã sửa lỗi' : (activeUpdateForProof.status === 'Verified' ? '✓ Xác nhận lỗi đã sửa (Hoàn thành)' : '✗ Từ chối sửa lỗi (Sửa lại)')}
              </h4>
              <button
                className="btn-close"
                onClick={() => {
                  setShowProofModal(false);
                  setActiveUpdateForProof(null);
                  setProofImages([]);
                  setProofNotes('');
                }}
                style={{ color: '#fff', border: 'none', background: 'transparent' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Custom Text Area for notes */}
              <div className="form-group">
                <label className={activeUpdateForProof.status === 'In Progress' ? "required" : ""} style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#7B5233', display: 'block', marginBottom: '4px' }}>
                  {activeUpdateForProof.status === 'In Progress' ? 'Lý do từ chối (Bắt buộc):' : 'Nội dung phản hồi (Tùy chọn):'}
                </label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={proofNotes}
                  onChange={(e) => setProofNotes(e.target.value)}
                  placeholder={activeUpdateForProof.status === 'In Progress' ? 'Vui lòng nhập lý do từ chối sửa lỗi...' : 'Nhập nội dung/chú thích phản hồi (nếu có)...'}
                  required={activeUpdateForProof.status === 'In Progress'}
                  style={{ fontSize: '0.82rem', borderRadius: '8px', padding: '8px', border: '1px solid #E2E8F0', width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              {activeUpdateForProof.status !== 'In Progress' && (
                <div className="form-group">
                  <label className={activeUpdateForProof.status === 'Resolved' ? "required" : ""} style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#7B5233', display: 'block', marginBottom: '4px' }}>
                    {activeUpdateForProof.status === 'Resolved' ? 'Hình ảnh bằng chứng sửa lỗi (Bắt buộc):' : 'Hình ảnh đính kèm (Tùy chọn):'}
                  </label>
                  
                  <div
                    onPaste={(e) => handlePasteImage(e, setProofImages)}
                    tabIndex={0}
                    style={{
                      border: '2px dashed #7B5233',
                      borderRadius: '10px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: '#FAF6F0',
                      cursor: 'pointer',
                      outline: 'none',
                      transition: 'background-color 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onFocus={(e) => e.currentTarget.style.backgroundColor = '#FFF8F0'}
                    onBlur={(e) => e.currentTarget.style.backgroundColor = '#FAF6F0'}
                    onClick={() => document.getElementById('proof-file-input-manual')?.click()}
                  >
                    <span style={{ fontSize: '1.5rem' }}>📷</span>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#5D4037', fontWeight: 'bold', lineHeight: '1.4' }}>
                      Dán ảnh chụp màn hình (Ctrl+V) hoặc kéo thả tại đây
                    </p>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', width: '100%', maxWidth: '360px', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => document.getElementById('proof-file-input-manual')?.click()}
                        style={{
                          height: '34px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0 12px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          backgroundColor: '#4F46E5',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <FolderOpen size={14} /> Duyệt qua các tệp
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handlePasteFromClipboardAPI(setProofImages)}
                        style={{
                          height: '34px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '0 12px',
                          backgroundColor: '#fff',
                          border: '1px solid #7B5233',
                          color: '#7B5233',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Clipboard size={14} /> Dán từ bộ nhớ tạm
                      </button>
                    </div>
    
                    <input
                      type="file"
                      id="proof-file-input-manual"
                      multiple
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        try {
                          showToast('Đang tải ảnh chứng minh...', 'success');
                          for (let i = 0; i < files.length; i++) {
                            const res = await bugService.uploadImage(files[i]);
                            if (res && res.url) {
                              setProofImages(prev => [...prev, res.url]);
                            }
                          }
                          showToast('Tải ảnh thành công!');
                        } catch (err) {
                          showToast('Không thể tải ảnh chứng minh!', 'error');
                        } finally {
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Preview của các ảnh đã chọn/dán */}
              {proofImages.length > 0 && (
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '6px', display: 'block' }}>
                    Ảnh đã đính kèm ({proofImages.length}):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', backgroundColor: '#FAF6F0', padding: '8px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    {proofImages.map((path, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '55px', height: '55px' }}>
                        <img
                          src={getImageUrl(path)}
                          alt="proof-preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px', border: '1px solid #D3C1B4' }}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProofImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            backgroundColor: '#EF4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '16px',
                            height: '16px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #E5E7EB', padding: '12px 18px', display: 'flex', justifyContent: 'flex-end', gap: '10px', backgroundColor: '#FAF9F6' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowProofModal(false);
                  setActiveUpdateForProof(null);
                  setProofImages([]);
                  setProofNotes('');
                }}
                style={{ borderRadius: '6px', fontSize: '0.75rem', padding: '6px 12px' }}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={async () => {
                  const { id, status, isInitial } = activeUpdateForProof;
                  
                  // Validation
                  if (status === 'Resolved' && proofImages.length === 0) {
                    showToast('Vui lòng đính kèm hình ảnh bằng chứng sửa lỗi!', 'error');
                    return;
                  }
                  if (status === 'In Progress' && !proofNotes.trim()) {
                    showToast('Vui lòng nhập lý do từ chối sửa lỗi!', 'error');
                    return;
                  }

                  try {
                    const username = getCurrentUserName();
                    const statusLabel =
                      status === 'New' ? 'Chưa hoàn thành (Mới)' :
                        status === 'In Progress' ? 'Từ chối (Sửa lại)' :
                          status === 'Resolved' ? 'Hoàn thành (Đã sửa)' : 'Đã xác nhận (Hoàn thành)';

                    const defaultNotes = status === 'Resolved'
                      ? 'Đã khắc phục lỗi giao diện.'
                      : (status === 'Verified' ? 'Đã xác nhận hoàn thành sửa lỗi.' : 'Từ chối sửa lỗi.');
                      
                    const finalNotes = proofNotes.trim() || defaultNotes;

                    if (isInitial) {
                      const payload = {
                        notes: finalNotes,
                        image_paths: proofImages,
                        updater: username,
                        status: status
                      };
                      const res = await bugService.addBugUpdate(selectedBug.id, payload);
                      showToast(`Đã chuyển trạng thái sang "${statusLabel}"!`);

                      setSelectedBug(prev => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          status: status,
                          updates: [res, ...(prev.updates || [])]
                        };
                      });
                      setEditForm(prev => ({
                        ...prev,
                        status: status,
                        completed_at: (status === 'Resolved' || status === 'Verified') ? new Date().toISOString().split('T')[0] : ''
                      }));
                    } else {
                      await bugService.updateCommentStatus(id, status, proofImages);
                      showToast('Đã cập nhật trạng thái phản hồi và đính kèm ảnh chứng minh!');

                      setSelectedBug(prev => {
                        if (!prev) return null;
                        const updatedUpdates = prev.updates.map(u => {
                          if (u.id === id) {
                            const newImgs = proofImages.map((path, idx) => ({
                              id: Date.now() + idx,
                              image_path: path,
                              update_id: id,
                              bug_id: prev.id,
                              created_at: new Date().toISOString()
                            }));
                            return {
                              ...u,
                              status: status,
                              images: [...(u.images || []), ...newImgs]
                            };
                          }
                          return u;
                        });
                        return {
                          ...prev,
                          status: status,
                          updates: updatedUpdates
                        };
                      });
                      setEditForm(prev => ({ ...prev, status: status }));
                    }

                    fetchBugs();
                    setShowProofModal(false);
                    setActiveUpdateForProof(null);
                    setProofImages([]);
                  } catch (error) {
                    showToast('Cập nhật trạng thái lỗi thất bại!', 'error');
                  }
                }}
                style={{
                  borderRadius: '6px',
                  backgroundColor: '#7B5233',
                  borderColor: '#7B5233',
                  fontSize: '0.75rem',
                  padding: '6px 12px',
                  color: '#fff',
                  fontWeight: 'bold'
                }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal để phóng to hình ảnh */}
      {activeLightboxUrl && (
        <div
          onClick={() => setActiveLightboxUrl(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img
            src={activeLightboxUrl}
            alt="Enlarged screenshot"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
            }}
          />
          <button
            onClick={() => setActiveLightboxUrl(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#fff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#333',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Embedded CSS for animations and custom styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .spin-icon {
          animation: mgmtSpin 1.2s linear infinite;
        }
        @keyframes mgmtSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .kpi-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease !important;
          cursor: pointer;
        }
        .kpi-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.04) !important;
        }
        .timeline-container::-webkit-scrollbar {
          width: 4px;
        }
        .timeline-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .timeline-container::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
      `}} />
    </>
  );
};

export default ScreenBugManagementView;
