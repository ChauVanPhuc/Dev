import React, { useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  Eye,
  FileText,
  X,
  RotateCcw,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Download,
  FileSpreadsheet,
  Printer,
  MoreVertical
} from 'lucide-react';
import PageToolbar from '@webShared/Views/components/layout/PageToolbar';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';

// Import custom hook
import { useInspectionReports, getInspectionTypeLabel } from './hooks/useInspectionReports';

import '@styles/components.css';

const InspectionReportsView = () => {
  const reports = useInspectionReports();
  const navigate = useNavigate();
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode } = useOutletContext() || {};
  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/reports');

  useEffect(() => {
    if (screenCode && title) {
      if (setCustomTitle) setCustomTitle(title);
      if (setCustomSubtitle) setCustomSubtitle(subtitle || '');
      if (setCustomScreenCode) setCustomScreenCode(screenCode);
    }
  }, [screenCode, title, subtitle, setCustomTitle, setCustomSubtitle, setCustomScreenCode]);
  const {
    activeActionMenu,
    activeTab,
    filterPending24h,
    adhesionInspections,
    aggData,
    applyDefaultBorders,
    b64,
    c,
    cleanPath,
    colIdx,
    conclusionCell,
    dailyEndDate,
    dailyInspections,
    dailyLimit,
    dailyPage,
    dailySearch,
    dailySort,
    dailyStartDate,
    date,
    dateText,
    defId,
    defectFreq,
    defectTypesMap,
    det,
    detailsHtml,
    entries,
    exportPoCode,
    fetchData,
    fetchImageBase64,
    filteredDailyList,
    filteredInboundList,
    filteredProcessList,
    filteredStageList,
    firstArticleInspections,
    formatDisplayDate,
    formatDisplayDateTime,
    formatExcelHeader,
    fullUrl,
    gIdx,
    generalImages,
    getDisplayInspector,
    getImageUrl,
    handleExportCurrentList,
    handleExportDetailedPO,
    handleExportQualitySummary,
    handleExportSingleExcel,
    handleExportSinglePDF,
    handleGlobalClick,
    handleImageError,
    handleResetFilters,
    i,
    imagesHtml,
    imagesList,
    imgPaths,
    inboundEndDate,
    inboundLimit,
    inboundPage,
    inboundSearch,
    inboundSort,
    inboundStartDate,
    inboundStatusFilter,
    inspectionTypes,
    isDaily,
    isExporting,
    isFilterBarOpen,
    isInput,
    isOpen,
    isPass,
    lightboxImage,
    loading,
    mVal,
    menuKey,
    moistVals,
    moistureInspections,
    pIdx,
    paginatedDailyList,
    paginatedInboundList,
    paginatedProcessList,
    paginatedStageList,
    parsed,
    parsedImages,
    passRate,
    photo,
    poInspections,
    pos,
    printWin,
    processInspections,
    r,
    rateCell,
    reader,
    remainingImages,
    renderActionDropdown,
    res,
    resCell,
    root,
    s,
    selectedDaily,
    selectedExportOption,
    selectedInbound,
    selectedInspection,
    filteredUnifiedList,
    paginatedUnifiedList,
    totalUnifiedPages,
    unifiedPage,
    setUnifiedPage,
    unifiedLimit,
    setUnifiedLimit,
    setActiveActionMenu,
    setActiveTab,
    setDailyEndDate,
    setDailyInspections,
    setDailyLimit,
    setDailyPage,
    setDailySearch,
    setDailySort,
    setDailyStartDate,
    setDefectTypesMap,
    setExportPoCode,
    setInboundEndDate,
    setInboundLimit,
    setInboundPage,
    setInboundSearch,
    setInboundSort,
    setInboundStartDate,
    setInboundStatusFilter,
    setIsExporting,
    setIsFilterBarOpen,
    setLightboxImage,
    setLoading,
    setSelectedDaily,
    setSelectedExportOption,
    setSelectedInbound,
    setSelectedInspection,
    setShowExportModal,
    setStageEndDate,
    setStageInspections,
    setStageLimit,
    setStagePage,
    setStageSearch,
    setStageSort,
    setStageStartDate,
    setStageStatusFilter,
    setStageTypeFilter,
    showExportModal,
    sizeVal,
    sortedDefects,
    stCell,
    stageEndDate,
    stageInspections,
    stageLimit,
    stagePage,
    stageSearch,
    stageSort,
    stageStartDate,
    stageStatusFilter,
    stageTypeFilter,
    stats,
    styleTableHeaderRow,
    szVal,
    timeDiff,
    totalDailyPages,
    totalInboundPages,
    totalProcessPages,
    totalStagePages,
    triggerFileDownload,
    type,
    typeLabel,
    uniqueImages,
    uniquePoList,
    usedImages,
  } = reports;

  return (
    <div className="gold-layout">
      <style dangerouslySetInnerHTML={{ __html: `
        .inspection-tabs {
          display: flex;
          border-bottom: 2px solid #EADCC9;
          margin-bottom: 16px;
          gap: 8px;
        }
        .inspection-tab-item {
          padding: 10px 24px;
          font-weight: 700;
          font-size: 0.95rem;
          color: #7B5233;
          border: none;
          background: transparent;
          cursor: pointer;
          position: relative;
          transition: all 0.2s;
        }
        .inspection-tab-item.active {
          color: #2D1A12;
        }
        .inspection-tab-item.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          right: 0;
          height: 3px;
          background-color: #7B5233;
          border-radius: 3px;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          white-space: nowrap;
        }
        .status-badge.pass {
          background-color: #ECFDF5;
          color: #10B981;
          border: 1px solid #A7F3D0;
        }
        .status-badge.fail {
          background-color: #FEF2F2;
          color: #EF4444;
          border: 1px solid #FCA5A5;
        }
        .grid-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 8px;
          margin-top: 8px;
        }
        .gallery-thumb {
          width: 80px;
          height: 80px;
          border-radius: 8px;
          object-fit: cover;
          border: 1px solid #EADCC9;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .gallery-thumb:hover {
          transform: scale(1.05);
          border-color: #7B5233;
        }
        .detail-grid-info {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (min-width: 768px) {
          .detail-grid-info {
            grid-template-columns: 1fr 1fr;
          }
        }
        .detail-row-item {
          display: flex;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px dashed #EADCC9;
          font-size: 0.9rem;
        }
        .detail-row-item span:first-child {
          color: #8D6E63;
          font-weight: 600;
        }
        .detail-row-item span:last-child {
          color: #2D1A12;
          font-weight: 700;
        }
        .detail-sub-section {
          background: #FAF6F0;
          border: 1px solid #EADCC9;
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
        }
        .detail-sub-title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #7B5233;
          margin: 0 0 12px 0;
          border-left: 3px solid #7B5233;
          padding-left: 8px;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .modal-container {
          background-color: white;
          border-radius: 20px;
          width: 92%;
          max-width: 700px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          position: relative;
          padding: 24px;
        }
        .export-option-card {
          border: 1.5px solid #EADCC9;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
          background-color: #fff;
        }
        .export-option-card:hover {
          border-color: #7B5233;
          background-color: #FAF6F0;
        }
        .export-option-card.active {
          border-color: #7B5233;
          background-color: #FAF6F0;
          box-shadow: 0 0 0 3px rgba(123, 82, 51, 0.1);
        }
      `}} />

      {/* ── STICKY TOP ZONE ── */}
      <div className="sticky-top-zone">
        {/* TOOLBAR: Search & Filters */}
        <PageToolbar
          title={title}
          subtitle={subtitle}
          screenCode={screenCode}
          searchValue={stageSearch}
          onSearchChange={(val) => {
            setStageSearch(val);
            setUnifiedPage(1);
          }}
          searchPlaceholder="Tìm PO, sản phẩm, QC, phân loại..."
          showSort={true}
          sortOptions={[
            { value: 'date_desc', label: 'Ngày: Mới nhất' },
            { value: 'date_asc', label: 'Ngày: Cũ nhất' },
            { value: 'po_asc', label: 'Mã PO: A-Z' },
            { value: 'po_desc', label: 'Mã PO: Z-A' }
          ]}
          sortValue={stageSort}
          onSortChange={(val) => {
            setStageSort(val);
            setUnifiedPage(1);
          }}
          showFilter={true}
          isFilterOpen={isFilterBarOpen}
          onFilterToggle={() => setIsFilterBarOpen(!isFilterBarOpen)}
          activeFiltersCount={
            (stageTypeFilter !== 'all' ? 1 : 0) +
            (stageStatusFilter !== 'all' ? 1 : 0) +
            (stageStartDate ? 1 : 0) +
            (stageEndDate ? 1 : 0)
          }
          onExport={() => setShowExportModal(true)}
          hasWritePermission={true}
        />

        {/* INLINE EXPANDABLE FILTER BAR */}
        {isFilterBarOpen && (
          <div className="filter-inline-bar">
            <div className="filter-field-group">
              <label className="filter-field-label">Phân loại</label>
              <select
                value={stageTypeFilter}
                onChange={(e) => {
                  setStageTypeFilter(e.target.value);
                  setUnifiedPage(1);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="stage">Kiểm tra công đoạn</option>
                <option value="input">Kiểm tra đầu vào (IQC)</option>
                <option value="process">Kiểm tra quy trình</option>
                <option value="daily">Ghi nhận lỗi hàng ngày</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Kết luận</label>
              <select
                value={stageStatusFilter}
                onChange={(e) => {
                  setStageStatusFilter(e.target.value);
                  setUnifiedPage(1);
                }}
              >
                <option value="all">Tất cả</option>
                <option value="pass">Đạt (Pass)</option>
                <option value="fail">Lỗi (Fail)</option>
              </select>
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Từ ngày</label>
              <input 
                type="date"
                value={stageStartDate}
                onChange={(e) => {
                  setStageStartDate(e.target.value);
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
              />
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Đến ngày</label>
              <input 
                type="date"
                value={stageEndDate}
                onChange={(e) => {
                  setStageEndDate(e.target.value);
                  setUnifiedPage(1);
                }}
                className="filter-dropdown-input"
              />
            </div>

            <div className="filter-field-group">
              <label className="filter-field-label">Hiển thị</label>
              <select
                value={unifiedLimit}
                onChange={(e) => {
                  setUnifiedLimit(parseInt(e.target.value));
                  setUnifiedPage(1);
                }}
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button 
                onClick={handleResetFilters}
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #EADCC9',
                  backgroundColor: '#fff',
                  color: '#7B5233',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} /> Xóa lọc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="admin-list-layout">
        {filterPending24h && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', marginBottom: '16px', color: '#EF4444', fontWeight: '600', fontSize: '0.9rem' }}>
            <span>⚠️ Đang hiển thị danh sách phiếu chưa xác nhận trong 24 giờ qua.</span>
            <button 
              onClick={() => navigate('/admin/reports')}
              style={{ backgroundColor: '#EF4444', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
            >
              Hiển thị tất cả
            </button>
          </div>
        )}
        <div className="mgmt-table card admin-table-card">
          
          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <div className="spinner"></div>
                <span>Đang tải dữ liệu kiểm tra...</span>
              </div>
            </div>
          ) : paginatedUnifiedList.length === 0 ? (
            <div style={{ padding: '5rem', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <FileText size={48} opacity={0.3} style={{ color: '#8D6E63' }} />
                <span>Không tìm thấy phiếu kiểm tra nào phù hợp.</span>
              </div>
            </div>
          ) : (
            <>
              <div className="table-responsive desktop-only admin-table-scroll" style={{ flex: 1, overflowY: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '90px', textAlign: 'center' }}>MÃ PHIẾU</th>
                      <th>Phân loại</th>
                      <th style={{ width: '150px' }}>Ngày kiểm tra</th>
                      <th>Mã PO</th>
                      <th>Công đoạn</th>
                      <th>Người kiểm QC</th>
                      <th style={{ width: '110px', textAlign: 'center' }}>Xác nhận</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Tỷ lệ lỗi (%)</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Kết quả</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUnifiedList.map((item, idx) => {
                      const isDaily = item.type === 'daily';
                      const isPass = item.conclusion === 'pass';
                      
                      const handleRowClick = () => {
                        if (item.type === 'daily') {
                          setSelectedDaily(item.raw_item);
                        } else if (item.type === 'input') {
                          setSelectedInbound(item.raw_item);
                        } else {
                          setSelectedInspection(item.raw_item);
                        }
                      };

                      const hasDefect = (item.defect_rate > 0) || (!isDaily && !isPass);

                      return (
                        <tr key={`${item.type}-${item.id}`} onClick={handleRowClick} style={{ cursor: 'pointer' }}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#8D6E63' }}>#{item.id}</td>
                          <td style={{ fontWeight: '600', color: '#7B5233' }}>{item.category}</td>
                          <td style={{ fontWeight: '600' }}>{formatDisplayDateTime(item.inspection_date)}</td>
                          <td style={{ color: '#7B5233', fontWeight: 'bold' }}>{item.batch_no || '---'}</td>
                          <td style={{ fontWeight: '700' }}>{item.stage || item.stage_name || item.product_sku || '---'}</td>
                          <td>{item.inspector_name || 'N/A'}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`status-badge ${item.is_confirmed ? 'pass' : 'fail'}`} style={{ backgroundColor: item.is_confirmed ? '#ECFDF5' : '#FEF2F2', color: item.is_confirmed ? '#10B981' : '#EF4444', borderColor: item.is_confirmed ? '#A7F3D0' : '#FCA5A5' }}>
                              {item.is_confirmed ? (isDaily ? 'Đã hoàn thành' : 'Đã xác nhận') : 'Chưa'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ 
                              fontWeight: '700', 
                              color: hasDefect ? '#D97706' : '#10B981',
                              backgroundColor: hasDefect ? '#FEF3C7' : '#ECFDF5',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '0.8rem',
                              border: `1px solid ${hasDefect ? '#FDE68A' : '#A7F3D0'}`
                            }}>
                              {(item.defect_rate || 0).toFixed(2)}%
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {isDaily ? (
                              <span style={{ fontWeight: '700', color: '#EF4444', fontSize: '0.85rem' }}>
                                {item.result_label}
                              </span>
                            ) : (
                              <span className={`status-badge ${isPass ? 'pass' : 'fail'}`}>
                                {isPass ? 'Đạt' : 'Lỗi'}
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                            {renderActionDropdown(item.raw_item, item.type)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card Grid */}
              <div className="mobile-only mgmt-cards-container" style={{ padding: '10px' }}>
                {paginatedUnifiedList.map((item, idx) => {
                  const isDaily = item.type === 'daily';
                  const isPass = item.conclusion === 'pass';
                  const hasDefect = (item.defect_rate > 0) || (!isDaily && !isPass);
                  
                  const handleRowClick = () => {
                    if (item.type === 'daily') {
                      setSelectedDaily(item.raw_item);
                    } else if (item.type === 'input') {
                      setSelectedInbound(item.raw_item);
                    } else {
                      setSelectedInspection(item.raw_item);
                    }
                  };

                  return (
                    <div 
                      key={`${item.type}-${item.id}`} 
                      className="mgmt-card animate-card-entrance" 
                      style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #EADCC9', padding: '12px', marginBottom: '10px', cursor: 'pointer' }}
                      onClick={handleRowClick}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontWeight: 'bold', color: '#8D6E63' }}>Mã: #{item.id}</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ 
                            fontWeight: '700', 
                            color: hasDefect ? '#D97706' : '#10B981',
                            backgroundColor: hasDefect ? '#FEF3C7' : '#ECFDF5',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            border: `1px solid ${hasDefect ? '#FDE68A' : '#A7F3D0'}`
                          }}>
                            {(item.defect_rate || 0).toFixed(2)}%
                          </span>
                          <span className={`status-badge ${item.is_confirmed ? 'pass' : 'fail'}`} style={{ backgroundColor: item.is_confirmed ? '#ECFDF5' : '#FEF2F2', color: item.is_confirmed ? '#10B981' : '#EF4444', borderColor: item.is_confirmed ? '#A7F3D0' : '#FCA5A5' }}>
                            {item.is_confirmed ? (isDaily ? 'HOÀN THÀNH' : 'ĐÃ XN') : 'CHƯA XN'}
                          </span>
                          <span className={`status-badge ${isDaily ? 'fail' : (isPass ? 'pass' : 'fail')}`}>
                            {isDaily ? 'LỖI' : (isPass ? 'ĐẠT' : 'LỖI')}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#8D6E63', fontWeight: 'bold', marginBottom: '4px' }}>
                        {item.category}
                      </div>
                      {item.batch_no && item.batch_no !== 'N/A' && item.batch_no !== '---' && (
                        <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#7B5233', marginBottom: '4px' }}>
                          PO: {item.batch_no}
                        </div>
                      )}
                      <div style={{ fontSize: '0.85rem', color: '#2D1A12', marginBottom: '4px' }}>
                        Công đoạn: <strong>{item.stage || item.stage_name || item.product_sku || 'N/A'}</strong>
                      </div>
                      {isDaily && (
                        <div style={{ fontSize: '0.85rem', color: '#EF4444', fontWeight: 'bold', marginBottom: '4px' }}>
                          {item.result_label}
                        </div>
                      )}
                      <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', justifyContent: 'space-between' }}>
                        <span>QC: {item.inspector_name || 'N/A'}</span>
                        <span>{formatDisplayDate(item.inspection_date)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="admin-pagination-desktop desktop-only">
                <div style={{ color: '#8D6E63', fontSize: '0.8rem', fontWeight: '600' }}>
                  Hiển thị <b>{filteredUnifiedList.length > 0 ? (unifiedPage - 1) * unifiedLimit + 1 : 0} - {Math.min(unifiedPage * unifiedLimit, filteredUnifiedList.length)}</b> trên <b>{filteredUnifiedList.length}</b> phiếu kiểm tra
                </div>
                {totalUnifiedPages > 1 && (
                  <div className="pagination-controls" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button 
                      className="page-btn" 
                      onClick={() => setUnifiedPage(prev => Math.max(prev - 1, 1))} 
                      disabled={unifiedPage === 1}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {(() => {
                      const pages = [];
                      const delta = 2;
                      for (let i = 1; i <= totalUnifiedPages; i++) {
                        if (i === 1 || i === totalUnifiedPages || (i >= unifiedPage - delta && i <= unifiedPage + delta)) {
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
                            className={`page-btn ${unifiedPage === p ? 'active' : ''}`}
                            onClick={() => setUnifiedPage(p)}
                          >
                            {p}
                          </button>
                        );
                      });
                    })()}
                    <button 
                      className="page-btn" 
                      onClick={() => setUnifiedPage(prev => Math.min(prev + 1, totalUnifiedPages))} 
                      disabled={unifiedPage >= totalUnifiedPages}
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

      {/* Mobile Sticky Pagination */}
      {totalUnifiedPages > 1 && (
        <div className="pagination-mobile-sticky mobile-only">
          <button className="page-btn" onClick={() => setUnifiedPage(prev => Math.max(prev - 1, 1))} disabled={unifiedPage === 1}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#7B5233' }}>Trang {unifiedPage} / {totalUnifiedPages || 1}</span>
          <button className="page-btn" onClick={() => setUnifiedPage(prev => Math.min(prev + 1, totalUnifiedPages))} disabled={unifiedPage >= totalUnifiedPages}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* EXPORT OPTIONS MODAL */}
      {showExportModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: '480px' }}>
            <button 
              onClick={() => setShowExportModal(false)} 
              style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
            >
              <X size={18} />
            </button>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: '0 0 20px 0' }}>Lựa chọn xuất báo cáo Excel</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              
              {/* Option 1 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'current' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('current')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'current'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất danh sách đang hiển thị</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                    Xuất các dòng hiện tại của danh sách theo các bộ lọc đang chọn ({filteredUnifiedList.length} dòng).
                  </span>
                </div>
              </div>

              {/* Option 2 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'po' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('po')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'po'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Xuất chi tiết theo mã PO / Lệnh SX</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63', marginBottom: '6px' }}>
                    Kết xuất tệp gồm nhiều Sheet chi tiết (Bám dính, Độ ẩm, Quy trình...) của một PO xác định.
                  </span>
                  {selectedExportOption === 'po' && (
                    <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '4px' }}>
                      <select 
                        value={exportPoCode} 
                        onChange={(e) => setExportPoCode(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #EADCC9',
                          backgroundColor: '#FAF6F0',
                          color: '#2D1A12',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          outline: 'none'
                        }}
                      >
                        {uniquePoList.map(po => (
                          <option key={po} value={po}>{po}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Option 3 */}
              <div 
                className={`export-option-card ${selectedExportOption === 'summary' ? 'active' : ''}`}
                onClick={() => setSelectedExportOption('summary')}
              >
                <div style={{ marginTop: '2px' }}>
                  <input type="radio" checked={selectedExportOption === 'summary'} readOnly style={{ accentColor: '#7B5233' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '800', color: '#2D1A12', fontSize: '0.9rem' }}>Báo cáo tổng hợp chất lượng theo thời gian</span>
                  <span style={{ fontSize: '0.78rem', color: '#8D6E63' }}>
                    Tổng hợp tỉ lệ đạt/lỗi của từng công đoạn và thống kê xếp hạng 15 lỗi xảy ra nhiều nhất dựa trên khoảng thời gian lọc hiện tại.
                  </span>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  if (selectedExportOption === 'current') handleExportCurrentList();
                  else if (selectedExportOption === 'po') handleExportDetailedPO();
                  else if (selectedExportOption === 'summary') handleExportQualitySummary();
                }}
                disabled={isExporting}
                style={{
                  flex: 1,
                  backgroundColor: '#7B5233',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: isExporting ? 'not-allowed' : 'pointer',
                  opacity: isExporting ? 0.7 : 1
                }}
              >
                <Download size={16} /> {isExporting ? 'Đang xuất file...' : 'Tải xuống Báo cáo'}
              </button>
              <button 
                onClick={() => setShowExportModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#fff',
                  color: '#64748b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: STAGE INSPECTION DETAIL POPUP */}
      {selectedInspection && (() => {
        const item = selectedInspection;
        let parsedData = {};
        try {
          parsedData = typeof item.data_json === 'string' ? JSON.parse(item.data_json || '{}') : (item.data_json || {});
        } catch (e) {
          console.error('Failed to parse details data_json', e);
        }

        // Aggregate all image URLs
        const imagesList = [];
        // Add step images (quy-trinh)
        if (parsedData.steps) {
          Object.values(parsedData.steps).forEach(st => {
            if (st.photo) imagesList.push(st.photo);
          });
        }
        // Add detail detailsList images (bam-dinh)
        if (Array.isArray(parsedData.detailsList)) {
          parsedData.detailsList.forEach(det => {
            if (det.image) imagesList.push(det.image);
          });
        }
        // Add samples images (do-am)
        if (Array.isArray(parsedData.samples)) {
          parsedData.samples.forEach(s => {
            if (s.moisture?.photo) imagesList.push(s.moisture.photo);
            if (s.size?.photo) imagesList.push(s.size.photo);
          });
        }
        // Add checklist images (mau-dau-tien)
        if (Array.isArray(parsedData.checklist_results)) {
          parsedData.checklist_results.forEach(res => {
            if (Array.isArray(res.images)) imagesList.push(...res.images);
            if (Array.isArray(res.steps)) {
              res.steps.forEach(st => {
                if (Array.isArray(st.images)) imagesList.push(...st.images);
              });
            }
          });
        }
        // Add general images (images_json)
        let generalImages = [];
        try {
          const parsedImages = typeof item.images_json === 'string' ? JSON.parse(item.images_json || '{}') : (item.images_json || {});
          Object.values(parsedImages).forEach(val => {
            if (Array.isArray(val)) generalImages.push(...val);
            else if (typeof val === 'string') generalImages.push(val);
          });
        } catch(e){}
        const usedDetailImages = new Set(imagesList);
        const remainingModalImages = Array.from(new Set(generalImages)).filter(img => img && !usedDetailImages.has(img));

        return (
          <div className="modal-overlay">
            <div className="modal-container">
              {/* Close Button */}
              <button 
                onClick={() => setSelectedInspection(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '40px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>
                    {`Phiếu ${getInspectionTypeLabel(item.inspection_type)}`}
                  </h3>
                  <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#8D6E63', backgroundColor: '#FAF6F0', padding: '2px 8px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                    #{item.ticket_code || `INS-${item.id}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleExportSingleExcel(item, 'stage')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                  <button
                    onClick={() => handleExportSinglePDF(item, 'stage')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <Printer size={15} /> PDF / In
                  </button>
                </div>
              </div>

              {/* General details grid */}
              <div className="detail-grid-info">
                <div>
                  <div className="detail-row-item">
                    <span>Mã PO/Batch:</span>
                    <span>{item.batch_no || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Sản phẩm / Công đoạn:</span>
                    <span>{item.product_sku || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Loại công đoạn:</span>
                    <span>{getInspectionTypeLabel(item.inspection_type)}</span>
                  </div>
                </div>
                <div>
                  <div className="detail-row-item">
                    <span>QC thực hiện:</span>
                    <span>{item.inspector_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Ngày kiểm tra:</span>
                    <span>{formatDisplayDateTime(item.inspection_date)}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Kết luận chung:</span>
                    <span style={{ color: item.conclusion === 'pass' ? '#10B981' : '#EF4444' }}>
                      {item.conclusion === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3 KPI SUMMARY CARDS */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>TỔNG SẢN PHẨM LÔ</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#2D1A12', marginTop: '2px' }}>
                    {(item.required_qty || parsedData.required_qty || 200).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>cái</span>
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SỐ LƯỢNG MẪU KIỂM</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#2D1A12', marginTop: '2px' }}>
                    {(item.sample_qty || parsedData.sample_qty || 35).toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>mẫu</span>
                  </div>
                </div>
                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                  <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SỐ LƯỢNG LỖI</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: (item.error_qty || parsedData.error_qty) > 0 ? '#EF4444' : '#10B981', marginTop: '2px' }}>
                    {item.error_qty || parsedData.error_qty || 0} <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#64748b' }}>lỗi</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {item.notes && (
                <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px', border: '1px solid #EADCC9', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <strong style={{ color: '#7B5233', display: 'block', marginBottom: '4px' }}>Ghi chú chung:</strong>
                  <span style={{ color: '#2D1A12' }}>{item.notes}</span>
                </div>
              )}

              {/* DEFECT LIST & STATS SECTION */}
              {(() => {
                let displayDefects = [];
                if (Array.isArray(parsedData.defects) && parsedData.defects.length > 0) {
                  displayDefects = parsedData.defects;
                } else if ((item.error_qty > 0) || (item.conclusion === 'fail') || parsedData.error_qty > 0) {
                  const notesText = item.notes || item.note || '';
                  const match = notesText.match(/gồm:?\s*([^\.]+)/i) || notesText.match(/lỗi\s*\(([^)]+)\)/i);
                  if (match && match[1]) {
                    const defectNames = match[1].split(/,|\band\b|\bvà\b/).map(s => s.trim()).filter(Boolean);
                    let rem = item.error_qty || parsedData.error_qty || defectNames.length || 2;
                    displayDefects = defectNames.map((dName, idx) => {
                      const cleanName = dName.replace(/\(\d+\s*cái\)/gi, '').trim();
                      const q = idx === defectNames.length - 1 ? Math.max(1, rem) : Math.max(1, Math.floor(rem / (defectNames.length - idx)));
                      rem -= q;
                      let code = 'APP-006';
                      if (cleanName.toLowerCase().includes('đồng màu')) code = 'APP-009';
                      else if (cleanName.toLowerCase().includes('nứt')) code = 'APP-001';
                      else if (cleanName.toLowerCase().includes('lệch màu')) code = 'APP-017';
                      else if (cleanName.toLowerCase().includes('cong')) code = 'STR-001';
                      else if (cleanName.toLowerCase().includes('bụi')) code = 'APP-004';
                      return {
                        defect_name: cleanName,
                        defect_code: code,
                        quantity: q
                      };
                    });
                  }
                }

                if (displayDefects.length === 0 && !(item.error_qty > 0) && item.conclusion === 'pass') {
                  return null;
                }

                const sQty = item.sample_qty || parsedData.sample_qty || 35;
                const eQty = item.error_qty || parsedData.error_qty || (displayDefects.reduce((acc, d) => acc + (d.quantity || 0), 0)) || 0;
                const dRate = sQty > 0 ? (eQty / sQty) * 100 : 0;

                return (
                  <div className="detail-sub-section" style={{ marginTop: '0px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 className="detail-sub-title" style={{ margin: 0, color: '#EF4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Danh sách chi tiết các lỗi ghi nhận ({eQty} lỗi)
                      </h4>
                      <span style={{ 
                        fontWeight: 'bold', 
                        fontSize: '0.8rem', 
                        color: '#D97706', 
                        backgroundColor: '#FEF3C7', 
                        padding: '3px 8px', 
                        borderRadius: '8px', 
                        border: '1px solid #FDE68A' 
                      }}>
                        Tỷ lệ lỗi: {dRate.toFixed(2)}%
                      </span>
                    </div>

                    {displayDefects.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {displayDefects.map((def, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #EADCC9', borderRadius: '8px', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 'bold', color: '#7B5233' }}>
                                {def.defect_name || def.name || `Mã lỗi #${def.defect_id}`}
                              </span>
                              {def.defect_code && (
                                <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#8D6E63', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                                  {def.defect_code}
                                </span>
                              )}
                            </div>
                            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>
                              Số lượng: {def.quantity} cái
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', fontSize: '0.85rem', fontWeight: '600' }}>
                        Ghi nhận {eQty} chi tiết chưa đạt quy cách (Chi tiết lỗi mô tả trong phần ghi chú).
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* DYNAMIC DETAIL PARSING BY INSPECTION TYPE */}
              {/* Type 1: bám dính */}
              {item.inspection_type === 'bam-dinh' && Array.isArray(parsedData.detailsList) && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả bám dính chi tiết</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #EADCC9', color: '#8D6E63', textAlign: 'left', fontWeight: 'bold' }}>
                        <th style={{ padding: '8px 0' }}>Tên linh kiện/phụ kiện</th>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '80px' }}>Kết quả</th>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '100px' }}>Minh chứng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.detailsList.map((det, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', fontWeight: 'bold' }}>{det.name}</td>
                          <td style={{ padding: '8px 0', textAlign: 'center' }}>
                            <span style={{ color: det.conclusion === 'pass' ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                              {det.conclusion === 'pass' ? 'Đạt' : 'Lỗi'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'center' }}>
                            {det.image ? (
                              <img 
                                src={getImageUrl(det.image)} 
                                alt="Evidence" 
                                className="gallery-thumb"
                                style={{ width: '36px', height: '36px', borderRadius: '4px', margin: 0 }}
                                onClick={() => setLightboxImage(det.image)}
                                onError={handleImageError}
                              />
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.action && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', fontWeight: 'bold', color: '#7B5233' }}>
                      Phương án xử lý: <span style={{ color: '#2D1A12' }}>{parsedData.action === 'luu-kho' ? 'Lưu kho thành phẩm' : parsedData.action === 'tra-ve' ? 'Trả về xưởng' : 'Cách ly'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Type 2: quy trình / tần suất */}
              {item.inspection_type === 'quy-trinh' && parsedData.steps && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả các bước quy trình kiểm soát</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(parsedData.steps).map(([stepKey, val]) => (
                      <div key={stepKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#2D1A12' }}>
                            Bước: {stepKey.split('_').slice(1, -1).join(' ') || stepKey}
                          </strong>
                          {val.value && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Giá trị đo: {val.value}</span>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: val.result === 'pass' ? '#10B981' : '#EF4444' }}>
                            {val.result === 'pass' ? 'Đạt' : 'Lỗi'}
                          </span>
                          {val.photo && (
                            <img 
                              src={getImageUrl(val.photo)} 
                              alt="Step" 
                              className="gallery-thumb"
                              style={{ width: '36px', height: '36px', borderRadius: '4px', margin: 0 }}
                              onClick={() => setLightboxImage(val.photo)}
                              onError={handleImageError}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {parsedData.general_notes && (
                    <div style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                      Ghi chú quy trình: {parsedData.general_notes}
                    </div>
                  )}
                </div>
              )}

              {/* Type 6: Kiểm tra mẫu đầu tiên (mau-dau-tien) */}
              {item.inspection_type === 'mau-dau-tien' && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả kiểm tra mẫu đầu tiên</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SL SẢN XUẤT</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{parsedData.quantity_produced || 0}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SL KIỂM MẪU</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{parsedData.quantity_sampled || 0}</div>
                    </div>
                    <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                      <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>SL LỖI/HỦY</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#EF4444', marginTop: '4px' }}>{parsedData.quantity_rejected || 0}</div>
                    </div>
                  </div>

                  {parsedData.machine_name && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#2D1A12' }}>
                      Máy thực hiện: <b>{parsedData.machine_name} ({parsedData.machine_code})</b>
                    </div>
                  )}

                  {Array.isArray(parsedData.checklist_results) && parsedData.checklist_results.length > 0 && (
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: '#7B5233', display: 'block', marginBottom: '8px' }}>Kết quả kiểm tra checklist:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {parsedData.checklist_results.map((res, i) => (
                          <div key={i} style={{ padding: '10px', background: '#fff', border: '1px solid #EADCC9', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#2D1A12' }}>Mẫu #{res.sampleNum}: {res.title}</strong>
                              <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: res.status === 'pass' ? '#10B981' : '#EF4444' }}>
                                {res.status === 'pass' ? 'Đạt' : 'Lỗi'}
                              </span>
                            </div>
                            {res.note && <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Ghi chú: {res.note}</div>}
                            
                            {/* Steps under checklist */}
                            {Array.isArray(res.steps) && res.steps.length > 0 && (
                              <div style={{ marginLeft: '12px', borderLeft: '2px solid #EADCC9', paddingLeft: '8px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {res.steps.map((s, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#4A5568' }}>
                                    <span>{s.step}: {s.title}</span>
                                    <span style={{ fontWeight: '600', color: s.status === 'pass' ? '#10B981' : '#EF4444' }}>{s.status === 'pass' ? 'Đạt' : 'Lỗi'}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Defects list */}
                  {Array.isArray(parsedData.defects) && parsedData.defects.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#7B5233', display: 'block', marginBottom: '8px' }}>Danh sách lỗi ghi nhận:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parsedData.defects.map((def, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#fff', border: '1px solid #EADCC9', borderRadius: '6px', fontSize: '0.8rem' }}>
                            <span>{def.defect_name} (Mã #{def.defect_id})</span>
                            <span style={{ color: '#EF4444', fontWeight: 'bold' }}>Số lượng: {def.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Type 3: độ ẩm / kích thước */}
              {item.inspection_type === 'do-am' && Array.isArray(parsedData.samples) && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả đo mẫu gỗ (Độ ẩm & Kích thước)</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #EADCC9', color: '#8D6E63', textAlign: 'left', fontWeight: 'bold' }}>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '50px' }}>Mẫu</th>
                        <th style={{ padding: '8px 0' }}>Kết quả đo độ ẩm (%)</th>
                        <th style={{ padding: '8px 0', textAlign: 'center' }}>Kích thước (Dày x Rộng x Dài mm)</th>
                        <th style={{ padding: '8px 0', textAlign: 'center', width: '80px' }}>Kết quả</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.samples.map((s) => (
                        <tr key={s.stt} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 'bold' }}>#{s.stt}</td>
                          <td style={{ padding: '8px 0' }}>
                            {s.moisture?.values && s.moisture.values.length > 0 ? (
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {s.moisture.values.map((v, i) => (
                                  <span key={i} style={{ padding: '2px 6px', background: '#F1F5F9', borderRadius: '4px', fontWeight: '600' }}>{v}%</span>
                                ))}
                              </div>
                            ) : 'Chưa đo'}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: '600' }}>
                            {s.size?.thickness ? `${s.size.thickness} x ${s.size.width} x ${s.size.length} mm` : 'Chưa đo'}
                          </td>
                          <td style={{ padding: '8px 0', textAlign: 'center' }}>
                            <span style={{ color: s.result === 'pass' ? '#10B981' : s.result === 'fail' ? '#EF4444' : '#94A3B8', fontWeight: 'bold' }}>
                              {s.result === 'pass' ? 'Đạt' : s.result === 'fail' ? 'Lỗi' : 'Chưa đo'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.85rem' }}>
                    <span>Tổng số lượng kiểm: <b>{parsedData.inspected_qty || 0}</b></span>
                    <span style={{ color: '#EF4444' }}>Số lượng lỗi: <b>{parsedData.failed_qty || 0}</b></span>
                    <span>Phương án xử lý: <b>{parsedData.action === 'luu-kho' ? 'Lưu kho' : 'Trả về/Cách ly'}</b></span>
                  </div>
                </div>
              )}

              {/* Type 4 & 5: sau-dong-goi, phu-kien */}
              {(item.inspection_type === 'sau-dong-goi' || item.inspection_type === 'phu-kien') && (
                <div className="detail-sub-section">
                  <h4 className="detail-sub-title">Kết quả kiểm tra chi tiết</h4>
                  {parsedData.check_type && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                      Hình thức kiểm: <b>{parsedData.check_type}</b>
                    </div>
                  )}
                  {parsedData.intended_use && (
                    <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                      Mục đích sử dụng: <b>{parsedData.intended_use}</b>
                    </div>
                  )}
                  {Array.isArray(parsedData.checklist) && parsedData.checklist.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#7B5233', display: 'block', marginBottom: '8px' }}>Danh sách tiêu chí đánh giá:</strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parsedData.checklist.map((c, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', background: '#fff', border: '1px solid #EADCC9', borderRadius: '6px', fontSize: '0.85rem' }}>
                            <span>{c.name || c.criterion}</span>
                            <span style={{ fontWeight: 'bold', color: c.status === 'pass' || c.result === 'pass' ? '#10B981' : '#EF4444' }}>
                              {c.status === 'pass' || c.result === 'pass' ? 'Đạt' : 'Lỗi'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* IMAGE GALLERY */}
              {remainingModalImages.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#7B5233', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={18} /> Thư viện hình ảnh bổ sung ({remainingModalImages.length} ảnh)
                  </h4>
                  <div className="grid-gallery">
                    {remainingModalImages.map((img, index) => (
                      <img 
                        key={index}
                        src={getImageUrl(img)} 
                        alt="Inspection Attachment"
                        className="gallery-thumb"
                        onClick={() => setLightboxImage(img)}
                        onError={handleImageError}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* MODAL 2: DAILY DEFECT DETAIL POPUP */}
      {selectedDaily && (() => {
        const item = selectedDaily;
        return (
          <div className="modal-overlay">
            <div className="modal-container" style={{ maxWidth: '500px' }}>
              <button 
                onClick={() => setSelectedDaily(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '40px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>
                    Phiếu ghi nhận lỗi hàng ngày
                  </h3>
                  <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#8D6E63', backgroundColor: '#FAF6F0', padding: '2px 8px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                    #{item.id}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleExportSingleExcel(item, 'daily')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                  <button
                    onClick={() => handleExportSinglePDF(item, 'daily')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <Printer size={15} /> PDF / In
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <div className="detail-row-item">
                  <span>Ngày ghi nhận:</span>
                  <span>{formatDisplayDate(item.inspection_date)}</span>
                </div>
                <div className="detail-row-item">
                  <span>Tên công đoạn:</span>
                  <span>{item.stage_name || 'N/A'}</span>
                </div>
                <div className="detail-row-item">
                  <span>QC ghi nhận:</span>
                  <span>{item.inspector_name || 'N/A'}</span>
                </div>
                <div className="detail-row-item">
                  <span>Tổng sản phẩm đã kiểm:</span>
                  <span>{item.total_products?.toLocaleString() || 0}</span>
                </div>
                <div className="detail-row-item">
                  <span>Tổng số lượng lỗi:</span>
                  <span style={{ color: '#EF4444' }}>{item.total_defects || 0} lỗi</span>
                </div>
                <div className="detail-row-item">
                  <span>Tỉ lệ lỗi (%):</span>
                  <span style={{ color: item.defect_rate > 0 ? '#F59E0B' : '#10B981' }}>{item.defect_rate?.toFixed(2) || '0.00'}%</span>
                </div>
              </div>

              {/* Renders list of defects if populated */}
              {Array.isArray(item.defects) && item.defects.length > 0 ? (
                <div className="detail-sub-section" style={{ marginTop: 0 }}>
                  <h4 className="detail-sub-title">Danh sách chi tiết các lỗi</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {item.defects.map((def, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#fff', border: '1px solid #EADCC9', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 'bold', color: '#7B5233' }}>
                          {def.defect_name || def.name || defectTypesMap[def.defect_id] || (def.defect_code ? `${def.defect_code} (Mã #${def.defect_id})` : `Mã lỗi #${def.defect_id}`)}
                        </span>
                        <span style={{ color: '#EF4444', fontWeight: 'bold' }}>Số lượng: {def.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '12px', border: '1px dashed #EADCC9', borderRadius: '8px', textAlign: 'center', color: '#8D6E63', fontSize: '0.85rem' }}>
                  <AlertTriangle size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                  Không có danh sách chi tiết lỗi đính kèm.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* MODAL 3: INCOMING/INPUT INSPECTION DETAIL POPUP */}
      {selectedInbound && (() => {
        const item = selectedInbound;
        const imagesList = [item.image_path_1, item.image_path_2, item.image_path_3].filter(Boolean);
        const isPass = item.result === 'Đạt';

        return (
          <div className="modal-overlay">
            <div className="modal-container">
              {/* Close Button */}
              <button 
                onClick={() => setSelectedInbound(null)} 
                style={{ position: 'absolute', top: '16px', right: '16px', border: 'none', background: '#F1F5F9', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingRight: '40px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#7B5233', margin: 0 }}>
                    Phiếu kiểm tra đầu vào (IQC)
                  </h3>
                  <span style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#8D6E63', backgroundColor: '#FAF6F0', padding: '2px 8px', borderRadius: '6px', border: '1px solid #EADCC9' }}>
                    #{item.ticket_code || `INS-${item.id}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => handleExportSingleExcel(item, 'input')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <FileSpreadsheet size={15} /> Excel
                  </button>
                  <button
                    onClick={() => handleExportSinglePDF(item, 'input')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', backgroundColor: '#F0F9FF', color: '#0284C7', border: '1px solid #BAE6FD', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    <Printer size={15} /> PDF / In
                  </button>
                </div>
              </div>

              {/* General details grid */}
              <div className="detail-grid-info">
                <div>
                  <div className="detail-row-item">
                    <span>Tên chi tiết / Linh kiện:</span>
                    <span>{item.part_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Quy cách linh kiện:</span>
                    <span>{item.specification || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Container / PO:</span>
                    <span>{item.cont_name || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <div className="detail-row-item">
                    <span>QC thực hiện:</span>
                    <span>{item.inspector_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Ngày kiểm tra:</span>
                    <span>{formatDisplayDateTime(item.inspected_at)}</span>
                  </div>
                  <div className="detail-row-item" style={{ marginTop: '8px' }}>
                    <span>Kết luận chung:</span>
                    <span style={{ color: isPass ? '#10B981' : '#EF4444' }}>
                      {isPass ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {item.note && (
                <div style={{ backgroundColor: '#FAF6F0', borderRadius: '8px', padding: '12px', border: '1px solid #EADCC9', fontSize: '0.85rem', marginBottom: '16px' }}>
                  <strong style={{ color: '#7B5233', display: 'block', marginBottom: '4px' }}>Ghi chú kiểm tra:</strong>
                  <span style={{ color: '#2D1A12' }}>{item.note}</span>
                </div>
              )}

              {/* Dimensions Section */}
              <div className="detail-sub-section" style={{ marginTop: 0 }}>
                <h4 className="detail-sub-title">Kết quả đo kích thước chi tiết (mm)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀI</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_length != null ? `${item.measured_length} mm` : '---'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU RỘNG</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_width != null ? `${item.measured_width} mm` : '---'}</div>
                  </div>
                  <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #EADCC9' }}>
                    <div style={{ fontSize: '0.75rem', color: '#8D6E63', fontWeight: 'bold' }}>CHIỀU DÀY</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2D1A12', marginTop: '4px' }}>{item.measured_height != null ? `${item.measured_height} mm` : '---'}</div>
                  </div>
                </div>
              </div>

              {/* IMAGE GALLERY */}
              {imagesList.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#7B5233', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={18} /> Thư viện hình ảnh minh chứng ({imagesList.length} ảnh)
                  </h4>
                  <div className="grid-gallery">
                    {imagesList.map((img, index) => (
                      <img 
                        key={index}
                        src={getImageUrl(img)} 
                        alt="IQC Evidence"
                        className="gallery-thumb"
                        onClick={() => setLightboxImage(img)}
                        onError={handleImageError}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX / FULL IMAGE VIEW */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={getImageUrl(lightboxImage)} 
            alt="Full Preview"
            onError={handleImageError}
            style={{
              maxWidth: '95%',
              maxHeight: '95%',
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              objectFit: 'contain'
            }}
          />
          <button 
            onClick={() => setLightboxImage(null)}
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}

    </div>
  );
};

export default InspectionReportsView;
