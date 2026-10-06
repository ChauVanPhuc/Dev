import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import './styles/dashboard.css';
import { dashboardApi } from './services/dashboardApi';
import { MOCK_FALLBACK } from './services/mockFallbackData';
import DashboardFilterBar from './components/DashboardFilterBar';
import MetricKpiCards from './components/MetricKpiCards';
import ParetoDefectChart from './components/ParetoDefectChart';
import TrendDefectChart from './components/TrendDefectChart';
import ComboCasesAmountChart from './components/ComboCasesAmountChart';
import ContainerLoadChart from './components/ContainerLoadChart';
import DefectGroupPieChart from './components/DefectGroupPieChart';

/**
 * Master Dashboard View: Phân hệ Phân tích & Thống kê Khiếu nại
 * - Tiêu đề đưa lên Header cạnh nút hamburger
 * - Switch Theo Tháng/Tổng Quan & Nút Lọc (Phễu) đưa lên cạnh nút chuông
 * - Bộ lọc dạng ẩn/hiện collapsible bar
 * - Toàn bộ biểu đồ bổ sung DataLabels, bỏ các subtitle rườm rà
 */
export default function DashboardView() {
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setHeaderRightExtra } = outletContext;

  const [filterOptions, setFilterOptions] = useState({
    periods: [
      { value: '08/2026', label: 'Tháng 08/2026' },
      { value: '07/2026', label: 'Tháng 07/2026' },
      { value: '06/2026', label: 'Tháng 06/2026' },
      { value: '05/2026', label: 'Tháng 05/2026' }
    ],
    default_period: '08/2026',
    customers: [
      { value: 'ALL', label: 'Tất cả khách hàng' },
      { value: 'Atlas Vanity', label: 'Atlas Vanity' },
      { value: 'G7 Home Furnishing', label: 'G7 Home' }
    ],
    severities: [
      { value: 'ALL', label: 'Tất cả mức độ' },
      { value: 'Critical', label: 'Nghiêm trọng' },
      { value: 'Major', label: 'Nặng' },
      { value: 'Minor', label: 'Nhẹ' }
    ]
  });

  const [filters, setFilters] = useState({
    mode: 'monthly', // 'monthly' | 'overview'
    period: '08/2026',
    customer: 'ALL',
    severity: 'ALL',
    status: '',
    sku: '',
    clientDefectCode: '',
    g7Code: '',
    g7Name: '',
    container: '',
    lpn: '',
    defectGroup: 'ALL',
    minPenalty: 0,
    maxPenalty: 50000,
    isMock: true
  });

  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // States dữ liệu hiển thị tức thì với Mock Fallback
  const [kpiData, setKpiData] = useState(MOCK_FALLBACK.summary);
  const [paretoData, setParetoData] = useState(MOCK_FALLBACK.pareto);
  const [comboData, setComboData] = useState(MOCK_FALLBACK.combo);
  const [containerLoadData, setContainerLoadData] = useState(MOCK_FALLBACK.containerLoad);
  const [defectGroupsData, setDefectGroupsData] = useState(MOCK_FALLBACK.defectGroups);

  // Đưa Tiêu đề lên Header cạnh nút hamburger
  useEffect(() => {
    if (setCustomTitle) {
      setCustomTitle('Báo Cáo Phân Tích & Thống Kê Khiếu Nại');
    }
    if (setCustomSubtitle) {
      setCustomSubtitle('Quản lý Claim, Giá tủ và Danh mục lỗi');
    }
    return () => {
      if (setCustomTitle) setCustomTitle(null);
      if (setCustomSubtitle) setCustomSubtitle(null);
    };
  }, [setCustomTitle, setCustomSubtitle]);

  // Đưa Switch "Theo Tháng / Tổng Quan", Chọn Tháng & Nút Lọc (Phễu) lên cạnh nút chuông
  useEffect(() => {
    if (!setHeaderRightExtra) return;

    setHeaderRightExtra(
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Switch Theo Tháng vs Tổng Quan */}
        <div className="dash-header-switch">
          <button
            type="button"
            className={`dash-header-switch-btn ${filters.mode === 'monthly' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, mode: 'monthly' }))}
          >
            Theo Tháng
          </button>
          <button
            type="button"
            className={`dash-header-switch-btn ${filters.mode === 'overview' ? 'active' : ''}`}
            onClick={() => setFilters(prev => ({ ...prev, mode: 'overview' }))}
          >
            Tổng Quan
          </button>
        </div>

        {/* Chọn kỳ tháng trực tiếp ở Header nếu đang ở mode monthly */}
        {filters.mode === 'monthly' && (
          <select
            className="dash-header-period-select"
            value={filters.period}
            onChange={(e) => setFilters(prev => ({ ...prev, period: e.target.value }))}
            style={{
              height: '32px',
              padding: '0 8px',
              borderRadius: '6px',
              border: '1px solid #D5C7B7',
              backgroundColor: '#FFFFFF',
              color: '#2D1A12',
              fontSize: '0.8rem',
              fontWeight: '600',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {(filterOptions?.periods || []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {/* Nút Phễu Lọc ẩn/hiện bộ lọc chi tiết đặt cạnh nút chuông */}
        <button
          type="button"
          className={`dash-header-filter-trigger ${isFilterBarOpen ? 'active' : ''}`}
          onClick={() => setIsFilterBarOpen(prev => !prev)}
          title={isFilterBarOpen ? "Bấm để tắt bộ lọc" : "Bấm để mở bộ lọc"}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Lọc</span>
        </button>
      </div>
    );

    return () => {
      setHeaderRightExtra(null);
    };
  }, [setHeaderRightExtra, filters.mode, filters.period, filterOptions.periods, isFilterBarOpen]);

  // Lấy danh mục filters từ Backend
  useEffect(() => {
    let isMounted = true;
    dashboardApi.getFilters()
      .then((opts) => {
        if (!isMounted || !opts) return;
        setFilterOptions(opts);
        if (opts.default_period) {
          setFilters((prev) => ({ ...prev, period: opts.default_period }));
        }
      })
      .catch((err) => {
        console.warn('Lấy filter options thất bại:', err);
      });
    return () => { isMounted = false; };
  }, []);

  // Fetch dữ liệu từ Backend khi filters thay đổi
  const fetchData = useCallback(async () => {
    setLoading(true);

    const queryParams = {
      mode: filters.mode,
      period: filters.period,
      customer: filters.customer,
      severity: filters.severity,
      min_penalty: filters.minPenalty,
      max_penalty: filters.maxPenalty,
      is_mock: filters.isMock
    };

    try {
      const [kpiRes, paretoRes, comboRes, contRes, groupRes] = await Promise.allSettled([
        dashboardApi.getSummary(queryParams),
        dashboardApi.getPareto(queryParams),
        dashboardApi.getCombo(queryParams),
        dashboardApi.getContainerLoad({ claim_month: filters.period, is_mock: filters.isMock }),
        dashboardApi.getDefectGroups(queryParams)
      ]);

      if (kpiRes.status === 'fulfilled' && kpiRes.value) setKpiData(kpiRes.value);
      if (paretoRes.status === 'fulfilled' && paretoRes.value) setParetoData(paretoRes.value);
      if (comboRes.status === 'fulfilled' && comboRes.value) setComboData(comboRes.value);
      if (contRes.status === 'fulfilled' && contRes.value) setContainerLoadData(contRes.value);
      if (groupRes.status === 'fulfilled' && groupRes.value) setDefectGroupsData(groupRes.value);
    } catch (err) {
      console.error('Lỗi khi fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      mode: 'monthly',
      period: filterOptions.default_period || '08/2026',
      customer: 'ALL',
      severity: 'ALL',
      status: '',
      sku: '',
      clientDefectCode: '',
      g7Code: '',
      g7Name: '',
      container: '',
      lpn: '',
      defectGroup: 'ALL',
      minPenalty: 0,
      maxPenalty: 50000,
      isMock: true
    });
  };

  const currentPeriodLabel = useMemo(() => {
    return filters.mode === 'overview' ? 'Toàn bộ trước giờ' : `Tháng ${filters.period}`;
  }, [filters.mode, filters.period]);

  return (
    <div className="dash-container">
      {/* 1. BẢNG BỘ LỌC NỔI POPOVER (CHỈ HIỆN KHI BẤM NÚT LỌC CẠNH CHUÔNG, KHÔNG ĐẨY BIỂU ĐỒ) */}
      <DashboardFilterBar
        isOpen={isFilterBarOpen}
        onClose={() => setIsFilterBarOpen(false)}
        filters={filters}
        filterOptions={filterOptions}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        loading={loading}
      />

      {/* 2. DÃY 5 THẺ KPI TỔNG HỢP (GIAO DIỆN CHUẨN CLAIM KHÁCH HÀNG) */}
      <MetricKpiCards data={kpiData} mode={filters.mode} period={filters.period} />

      {/* 3. HÀNG BIỂU ĐỒ 1 & 2 (PARETO TOP 10 & BIỂU ĐỒ LỖI THEO THỜI GIAN THEO HÌNH MẪU 3) */}
      <div className="dash-chart-row-1">
        <ParetoDefectChart data={paretoData} />
        <TrendDefectChart periodLabel={currentPeriodLabel} />
      </div>

      {/* 4. HÀNG BIỂU ĐỒ 3, 4 & 5 (TƯƠNG QUAN VỤ & TIỀN, THỜI GIAN ĐÓNG CONT, CƠ CẤU PHÂN NHÓM) */}
      <div className="dash-chart-row-2">
        <ComboCasesAmountChart data={comboData} />
        <ContainerLoadChart
          data={containerLoadData}
          claimMonth={currentPeriodLabel}
        />
        <DefectGroupPieChart data={defectGroupsData} />
      </div>
    </div>
  );
}
