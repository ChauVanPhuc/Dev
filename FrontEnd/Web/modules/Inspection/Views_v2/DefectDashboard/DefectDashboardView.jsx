import React, { useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { AlertTriangle, RefreshCw, Info } from 'lucide-react';
import './styles/DefectDashboard.css';
import { useDefectAnalytics } from './hooks/useDefectAnalytics';
import DashboardToolbar from './components/DashboardToolbar';
import { DashboardExportModal } from '@webShared/Views/components/common/DashboardExportModal';

// Tải động ClaimDashboardView (Trang 4) để tối ưu hiệu năng và tránh coupling với Trang 1
const ClaimDashboardView = lazy(() => import('@modules/Claim/components/ClaimDashboardView'));

// Trang 1 Components
import KpiCardsRow from './components/KpiCardsRow';
import TrendLineChart from './components/TrendLineChart';
import StageDonutWithTable from './components/StageDonutWithTable';
import TopDefectCausesChart from './components/TopDefectCausesChart';
import StagePassRateChart from './components/StagePassRateChart';

// Trang 2 Components
import Page2KpiRow from './components/Page2KpiRow';
import ParetoDefectChart from './components/ParetoDefectChart';
import DefectStageHeatmap from './components/DefectStageHeatmap';
import DailyQualityTrendComboChart from './components/DailyQualityTrendComboChart';
import AqlSeverityDonutChart from './components/AqlSeverityDonutChart';
import DetailedDefectTableModal from './components/DetailedDefectTableModal';

// Trang 3 Components
import Page3KpiRow from './components/Page3KpiRow';
import TopDefectiveBatchesChart from './components/TopDefectiveBatchesChart';
import ProductLineDefectChart from './components/ProductLineDefectChart';
import QcAuditRosterTable from './components/QcAuditRosterTable';
import CapaStatusChart from './components/CapaStatusChart';
import ActionItemsModal from './components/ActionItemsModal';

// Shared Drilldown Modal
import DrillDownInspectionModal from './components/DrillDownInspectionModal';

// Giao diện Dashboard phân tích lỗi và kiểm soát chất lượng (4 trang):
// - Trang 1: Tổng quan chất lượng
// - Trang 2: Phân tích lỗi
// - Trang 3: Kiểm soát và hành động
// - Trang 4: Khiếu nại khách hàng
export const DefectDashboardView = ({ stage: propStage, activePage: propActivePage }) => {
  const {
    loading,
    error,
    retryFetch,
    activePage: hookActivePage,
    // Trang 1
    summary,
    trendChartData,
    stageBreakdown,
    topDefectCauses,
    stagePassRates,
    // Trang 2
    kpiPareto,
    paretoList,
    defectStageHeatmap,
    heatmapStages,
    dailyBreakdown,
    aqlSeverityBreakdown,
    detailedDefectTable,
    isDetailTableOpen,
    setIsDetailTableOpen,
    // Trang 3
    kpiAction,
    topDefectiveBatches,
    productLineBreakdown,
    capaStatusBreakdown,
    actionItems,
    qcRoster,
    isActionItemsOpen,
    setIsActionItemsOpen,
    // Filters & metadata
    stagesList,
    categoriesList,
    preset,
    setPreset,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedStage,
    setSelectedStage,
    selectedCategory,
    setSelectedCategory,
    selectedAql,
    setSelectedAql,
    searchQuery,
    setSearchQuery,
    lastUpdatedTime,
    handleStageClick,
    handleDefectClick,
    resetAllFilters,
    hasActiveFilter,
    drillDownState,
    closeDrillDown
  } = useDefectAnalytics(propStage);

  const currentActivePage = propActivePage || hookActivePage || 'page1';

  const defectDashboardRef = useRef(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const renderDefectCustomFilters = useCallback(({ customFilters, updateFilter }) => (
    <div className="filter" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Từ ngày:
        </label>
        <input
          type="date"
          value={customFilters.startDate || ''}
          onChange={(e) => updateFilter('startDate', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 6px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Đến ngày:
        </label>
        <input
          type="date"
          value={customFilters.endDate || ''}
          onChange={(e) => updateFilter('endDate', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 6px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Công đoạn:
        </label>
        <select
          value={customFilters.stage || ''}
          onChange={(e) => updateFilter('stage', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 4px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        >
          <option value="">Tất cả công đoạn</option>
          {stagesList.map((stg) => (
            <option key={stg} value={stg}>{stg}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Nhóm lỗi:
        </label>
        <select
          value={customFilters.category || ''}
          onChange={(e) => updateFilter('category', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 4px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        >
          <option value="">Tất cả nhóm lỗi</option>
          {categoriesList.map((cat) => (
            <option key={cat.code || cat.name} value={cat.code || cat.name}>
              {cat.name || cat.code}
            </option>
          ))}
        </select>
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: '#795137', marginBottom: '2px' }}>
          Mức nghiêm trọng AQL:
        </label>
        <select
          value={customFilters.aql || 'all'}
          onChange={(e) => updateFilter('aql', e.target.value)}
          style={{ width: '100%', height: '26px', padding: '0 4px', border: '1px solid #E8E2DC', borderRadius: '4px', fontSize: '0.72rem', background: '#FFFFFF', boxSizing: 'border-box' }}
        >
          <option value="all">Tất cả mức AQL</option>
          <option value="Critical">Nghiêm trọng (Critical)</option>
          <option value="Major">Nặng (Major)</option>
          <option value="Minor">Nhẹ (Minor)</option>
        </select>
      </div>
    </div>
  ), [stagesList, categoriesList]);

  const handleExportCustom = useCallback(async ({ filenamePrefix, timestamp, exportElement }) => {
    if (defectDashboardRef.current) {
      await exportElement(defectDashboardRef.current, `${filenamePrefix}_Custom_${timestamp}`);
    }
  }, []);

  const defectModalInitialFilters = useMemo(() => ({
    startDate,
    endDate,
    stage: selectedStage,
    category: selectedCategory,
    aql: selectedAql
  }), [startDate, endDate, selectedStage, selectedCategory, selectedAql]);

  const activeDashboardLabel = useMemo(() => {
    switch (currentActivePage) {
      case 'page1': return 'Tổng quan chất lượng';
      case 'page2': return 'Phân tích lỗi';
      case 'page3': return 'Kiểm soát & hành động';
      case 'page4': return 'Khiếu nại khách hàng';
      default: return 'Phân tích lỗi';
    }
  }, [currentActivePage]);

  const reportPeriodText = useMemo(() => {
    const s = startDate ? (startDate.includes('-') ? startDate.split('-').reverse().join('/') : startDate) : '';
    const e = endDate ? (endDate.includes('-') ? endDate.split('-').reverse().join('/') : endDate) : '';
    if (s && e) return `${s} – ${e}`;
    if (s) return `Từ ${s}`;
    if (e) return `Đến ${e}`;
    return 'Tất cả';
  }, [startDate, endDate]);

  const activeFiltersSummaryText = useMemo(() => {
    const parts = [];
    if (selectedStage && selectedStage !== 'all') parts.push(`Công đoạn: ${selectedStage}`);
    if (selectedCategory && selectedCategory !== 'all') parts.push(`Nhóm lỗi: ${selectedCategory}`);
    if (selectedAql && selectedAql !== 'all') parts.push(`Mức AQL: ${selectedAql}`);
    return parts.length > 0 ? parts.join(' · ') : 'Tất cả';
  }, [selectedStage, selectedCategory, selectedAql]);

  const isEmptyDataset = currentActivePage !== 'page4' && !loading && !error?.hasError && summary && Number(summary.total_records || 0) === 0;

  return (
    <div
      ref={defectDashboardRef}
      className={`erp-defect-dashboard ${currentActivePage === 'page4' ? 'fit-screen' : ''}`}
      data-report-title={activeDashboardLabel}
      data-report-period={`Kỳ báo cáo: ${reportPeriodText}`}
      data-report-filters={activeFiltersSummaryText !== 'Tất cả' ? activeFiltersSummaryText : ''}
    >
      {/* ── HEADER BÁO CÁO TINH GỌN (CHỈ HIỂN THỊ KHI XUẤT PREVIEW/PNG/PDF THAY CHO THANH CÔNG CỤ) ── */}
      <div
        className="dashboard-export-header"
        style={{
          display: 'none',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 14px',
          backgroundColor: '#FAF6F0',
          border: '1.5px solid #EADCC9',
          borderRadius: '6px',
          marginBottom: '6px',
          boxSizing: 'border-box',
          width: '100%',
          flexShrink: 0
        }}
      >
        <span style={{ fontSize: '0.96rem', fontWeight: 800, color: '#303030' }}>
          {activeDashboardLabel}
        </span>
        <span style={{ fontSize: '0.80rem', fontWeight: 700, color: '#79543D' }}>
          Kỳ báo cáo: {reportPeriodText}
        </span>
      </div>

      {/* Thanh công cụ và bộ lọc chung (Trang 1 - 3) */}
      {currentActivePage !== 'page4' && (
        <div
          data-toolbar="true"
          data-no-export="true"
          className="no-export dashboard-toolbar-container"
          style={{ width: '100%', flexShrink: 0 }}
        >
          <DashboardToolbar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            preset={preset}
            setPreset={setPreset}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            selectedStage={selectedStage}
            setSelectedStage={setSelectedStage}
            stagesList={stagesList}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            categoriesList={categoriesList}
            selectedAql={selectedAql}
            setSelectedAql={setSelectedAql}
            resetAllFilters={resetAllFilters}
            hasActiveFilter={hasActiveFilter}
            lastUpdatedTime={lastUpdatedTime}
            onExportClick={() => setIsExportModalOpen(true)}
          />
        </div>
      )}

      {/* Thông báo lỗi khi tải dữ liệu */}
      {error?.hasError && currentActivePage !== 'page4' && (
        <div
          style={{
            margin: '4px 0',
            padding: '8px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} style={{ color: '#B91C1C' }} />
            <div>
              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#991B1B' }}>
                {error.message || 'Lỗi tải dữ liệu phân tích chất lượng'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#78716C', marginLeft: '8px' }}>
                Vui lòng kiểm tra lại bộ lọc hoặc tải lại dữ liệu.
              </span>
            </div>
          </div>
          <button
            type="button"
            className="page-btn"
            onClick={() => retryFetch && retryFetch()}
            style={{
              padding: '4px 12px',
              backgroundColor: '#795137',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <RefreshCw size={12} /> Thử lại
          </button>
        </div>
      )}

      {/* Thông báo trung thực khi không có bản ghi phù hợp bộ lọc */}
      {isEmptyDataset && (
        <div
          style={{
            margin: '2px 0',
            padding: '6px 12px',
            backgroundColor: '#FAF6F0',
            border: '1px solid #EADCC9',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.74rem',
            color: '#795137',
            fontWeight: 600,
            flexShrink: 0
          }}
        >
          <Info size={14} />
          <span>Không có dữ liệu kiểm tra phù hợp với bộ lọc hiện tại. Hãy nới rộng khoảng thời gian hoặc đặt lại bộ lọc.</span>
        </div>
      )}

      {/* Trang 1: Tổng quan chất lượng */}
      {currentActivePage === 'page1' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '3px', overflow: 'hidden' }}>
          <KpiCardsRow summary={summary} />

          <div className="erp-charts-grid">
            <div className="erp-chart-wrapper">
              <TrendLineChart trendChartData={trendChartData} />
            </div>

            <div className="erp-chart-wrapper">
              <StageDonutWithTable
                stageBreakdown={stageBreakdown}
                selectedStage={selectedStage}
                onStageClick={handleStageClick}
                preset={preset}
                startDate={startDate}
                endDate={endDate}
                category={selectedCategory}
                aqlClass={selectedAql}
              />
            </div>

            <div className="erp-chart-wrapper">
              <TopDefectCausesChart
                topDefectCauses={topDefectCauses}
                onDefectClick={handleDefectClick}
              />
            </div>

            <div className="erp-chart-wrapper">
              <StagePassRateChart
                stagePassRates={stagePassRates}
                onStageClick={handleStageClick}
              />
            </div>
          </div>
        </div>
      )}

      {/* Trang 2: Phân tích lỗi */}
      {currentActivePage === 'page2' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '3px', overflow: 'hidden' }}>
          <Page2KpiRow kpiPareto={kpiPareto} totalDefects={summary?.total_defects || 0} />

          <div className="erp-charts-grid">
            <div className="erp-chart-wrapper">
              <ParetoDefectChart
                paretoList={paretoList}
                allDefects={detailedDefectTable}
                onDefectClick={handleDefectClick}
              />
            </div>

            <div className="erp-chart-wrapper">
              <DefectStageHeatmap
                heatmapData={defectStageHeatmap}
                stages={heatmapStages}
                onCellClick={(row, stageName) => {
                  handleDefectClick(row, stageName);
                  if (stageName) setSelectedStage(stageName);
                }}
                onViewDetailTable={() => setIsDetailTableOpen(true)}
              />
            </div>

            <div className="erp-chart-wrapper">
              <DailyQualityTrendComboChart dailyBreakdown={dailyBreakdown} />
            </div>

            <div className="erp-chart-wrapper">
              <AqlSeverityDonutChart
                aqlBreakdown={aqlSeverityBreakdown}
                preset={preset}
                startDate={startDate}
                endDate={endDate}
                stage={selectedStage}
                category={selectedCategory}
              />
            </div>
          </div>
        </div>
      )}

      {/* Trang 3: Kiểm soát và hành động */}
      {currentActivePage === 'page3' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '3px', overflow: 'hidden' }}>
          <Page3KpiRow kpiAction={kpiAction} />

          <div className="erp-charts-grid">
            <div className="erp-chart-wrapper">
              <TopDefectiveBatchesChart batches={topDefectiveBatches} />
            </div>

            <div className="erp-chart-wrapper">
              <ProductLineDefectChart productLines={productLineBreakdown} />
            </div>

            <div className="erp-chart-wrapper">
              <QcAuditRosterTable qcRoster={qcRoster} />
            </div>

            <div className="erp-chart-wrapper">
              <CapaStatusChart
                capaStatus={capaStatusBreakdown}
                onViewActionItems={() => setIsActionItemsOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Trang 4: Khiếu nại khách hàng */}
      {currentActivePage === 'page4' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#795137', fontWeight: 600, fontSize: '0.85rem' }}>
              Đang tải dữ liệu Khiếu nại khách hàng...
            </div>
          }>
            <ClaimDashboardView />
          </Suspense>
        </div>
      )}

      {/* Cửa sổ xem phiếu kiểm tra chi tiết */}
      <DrillDownInspectionModal
        isOpen={drillDownState.isOpen}
        onClose={closeDrillDown}
        defect={drillDownState.defect}
        stage={drillDownState.stage}
        preset={preset}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Cửa sổ bảng chi tiết nguyên nhân lỗi */}
      <DetailedDefectTableModal
        isOpen={isDetailTableOpen}
        onClose={() => setIsDetailTableOpen(false)}
        defectList={detailedDefectTable}
        onDefectClick={handleDefectClick}
      />

      {/* Cửa sổ danh sách sự cố CAPA */}
      <ActionItemsModal
        isOpen={isActionItemsOpen}
        onClose={() => setIsActionItemsOpen(false)}
        actionItems={actionItems}
      />

      {/* Cửa sổ Modal Xuất Dashboard dùng chung chuẩn ERP G7 */}
      <DashboardExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        dashboardTitle="Dashboard Kiểm soát chất lượng & Phân tích lỗi"
        defaultFilenamePrefix="Dashboard_Defects"
        targetRef={defectDashboardRef}
        currentPageId={currentActivePage}
        initialCustomFilters={defectModalInitialFilters}
        renderCustomFilters={renderDefectCustomFilters}
        onExportCustom={handleExportCustom}
      />
    </div>
  );
};

export default DefectDashboardView;
