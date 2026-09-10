import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import './styles/DefectDashboard.css';
import { useDefectAnalytics } from './hooks/useDefectAnalytics';
import KpiCardsRow from './components/KpiCardsRow';
import DashboardToolbar from './components/DashboardToolbar';
import TrendLineChart from './components/TrendLineChart';
import StageBarChart from './components/StageBarChart';
import ParetoDefectChart from './components/ParetoDefectChart';
import CategoryDonutChart from './components/CategoryDonutChart';

/**
 * DefectDashboardView
 * Giao diện Dashboard Tổng quan cho tab QLCL – Thống kê số lượng lỗi (ERP G7)
 * Khớp 100% hình ảnh tham chiếu của hệ thống.
 * Chiếm trọn 100% chiều cao màn hình tới sát đáy (Zero-scroll, Zero dead-space).
 */
export const DefectDashboardView = ({ stage: propStage }) => {
  const {
    loading,
    data,
    summary,
    trendChartData,
    stageChartData,
    paretoList,
    distributionList,
    stagesList,
    categoriesList,
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    selectedStage,
    setSelectedStage,
    selectedCategory,
    setSelectedCategory,
    selectedAql,
    setSelectedAql,
    searchQuery,
    setSearchQuery,
    lastUpdatedTime,
    activeCrossFilter,
    handleStageClick,
    handleCategoryClick,
    handleDefectClick,
    handleDateClick,
    resetAllFilters,
    hasActiveFilter
  } = useDefectAnalytics(propStage);

  // Dynamic viewport measurement to guarantee 100% stretch on any monitor
  const [dashboardHeight, setDashboardHeight] = useState('calc(100vh - 120px)');

  useEffect(() => {
    const updateHeight = () => {
      const vh = window.innerHeight;
      // Trừ 60px header, 38px tab bar, 16px padding
      const available = Math.max(500, vh - 116);
      setDashboardHeight(`${available}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div className="erp-defect-dashboard" style={{ height: dashboardHeight, maxHeight: dashboardHeight }}>
      {/* ── 1. Toolbar ERP G7 (Bộ lọc đặt trên cùng) ── */}
      <DashboardToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        hasActiveFilter={hasActiveFilter}
        resetAllFilters={resetAllFilters}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedStage={selectedStage}
        setSelectedStage={setSelectedStage}
        stagesList={stagesList}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categoriesList={categoriesList}
        selectedAql={selectedAql}
        setSelectedAql={setSelectedAql}
        lastUpdatedTime={lastUpdatedTime}
        activeCrossFilter={activeCrossFilter}
        paretoList={paretoList}
      />

      {/* ── 2. KPI Cards Row (5 Thẻ trên 1 hàng theo tháng) ── */}
      <KpiCardsRow
        summary={summary}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      {/* ── 3. Khu vực 4 Biểu đồ (2 hàng x 2 cột) ── */}
      <div className="erp-charts-grid">
        {/* [Hàng 1 Trái]: Pareto lỗi trọng yếu */}
        <ParetoDefectChart
          paretoList={paretoList}
          activeCrossFilter={activeCrossFilter}
          onDefectClick={handleDefectClick}
        />

        {/* [Hàng 1 Phải]: Tỷ lệ lỗi theo công đoạn */}
        <StageBarChart
          stageChartData={stageChartData}
          activeCrossFilter={activeCrossFilter}
          onStageClick={handleStageClick}
        />

        {/* [Hàng 2 Trái]: Xu hướng tỷ lệ lỗi theo thời gian */}
        <TrendLineChart
          trendChartData={trendChartData}
          activeCrossFilter={activeCrossFilter}
          avgRate={summary?.avg_defect_rate || 0.8}
          onDateClick={handleDateClick}
        />

        {/* [Hàng 2 Phải]: Cơ cấu theo nhóm lỗi */}
        <CategoryDonutChart
          distributionList={distributionList}
          totalDefects={summary?.total_defects || 1933}
          activeCrossFilter={activeCrossFilter}
          onCategoryClick={handleCategoryClick}
        />
      </div>
    </div>
  );
};

export default DefectDashboardView;
