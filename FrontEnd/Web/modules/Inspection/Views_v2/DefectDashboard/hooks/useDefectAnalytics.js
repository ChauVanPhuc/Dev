import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@webShared/Services/api.service';

const formatLocalYmd = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const computeDynamicPresetDates = (newPreset) => {
  if (!newPreset || newPreset === 'all' || newPreset === 'custom') {
    return { start: '', end: '' };
  }
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (newPreset === 'today') {
    const s = formatLocalYmd(today);
    return { start: s, end: s };
  }
  if (newPreset === 'yesterday') {
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    const s = formatLocalYmd(yest);
    return { start: s, end: s };
  }
  if (newPreset === 'this_week') {
    const dow = today.getDay() === 0 ? 7 : today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow - 1));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: formatLocalYmd(mon), end: formatLocalYmd(sun) };
  }
  if (newPreset === 'last_week') {
    const dow = today.getDay() === 0 ? 7 : today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - (dow - 1) - 7);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { start: formatLocalYmd(mon), end: formatLocalYmd(sun) };
  }
  if (newPreset === 'this_month') {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: formatLocalYmd(first), end: formatLocalYmd(last) };
  }
  if (newPreset === 'last_month') {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { start: formatLocalYmd(first), end: formatLocalYmd(last) };
  }
  if (newPreset === 'this_year') {
    const y = today.getFullYear();
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }
  return { start: '', end: '' };
};

// Hook quản lý dữ liệu, bộ lọc và trạng thái của Dashboard từ Backend API thật
export const useDefectAnalytics = (initialStage = '') => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');

  // Điều hướng trang phân tích ('page1' | 'page2' | 'page3' | 'page4')
  const [activePage, setActivePage] = useState('page1');

  // 1. Bộ lọc thời gian (mặc định 'all' để hiển thị đầy đủ dữ liệu thực tế từ DB)
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 2. Bộ lọc phân tích
  const [selectedStage, setSelectedStage] = useState(initialStage || '');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAql, setSelectedAql] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cross-filter: stage, category, defect
  const [activeCrossFilter, setActiveCrossFilter] = useState({ type: null, value: null });

  // Drill-down Modal State
  const [drillDownState, setDrillDownState] = useState({
    isOpen: false,
    defect: null,
    stage: null,
    title: ''
  });

  // Modal bảng chi tiết nguyên nhân lỗi (Trang 2)
  const [isDetailTableOpen, setIsDetailTableOpen] = useState(false);

  // Modal danh sách sự cố CAPA (Trang 3)
  const [isActionItemsOpen, setIsActionItemsOpen] = useState(false);

  // Option lists từ API hệ thống
  const [rawStagesList, setRawStagesList] = useState([]);
  const [rawCategoriesList, setRawCategoriesList] = useState([]);

  // Tải danh sách Công đoạn & Nhóm lỗi từ Backend
  useEffect(() => {
    let isMounted = true;
    const fetchOptions = async () => {
      try {
        const [catsRes, stagesRes] = await Promise.all([
          api.get('/inspections/defect-categories?include_inactive=false').catch((e) => {
            console.error('[useDefectAnalytics] Error fetching defect categories:', e);
            return [];
          }),
          api.get('/stages/').catch((e) => {
            console.error('[useDefectAnalytics] Error fetching stages:', e);
            return [];
          })
        ]);

        if (!isMounted) return;

        if (Array.isArray(catsRes) && catsRes.length > 0) {
          setRawCategoriesList(catsRes);
        }
        if (Array.isArray(stagesRes) && stagesRes.length > 0) {
          const uniqueStages = Array.from(
            new Set(stagesRes.map((s) => s.name || s.stage_name).filter(Boolean))
          ).sort();
          setRawStagesList(uniqueStages);
        }
      } catch (err) {
        console.error('[useDefectAnalytics] Unexpected error loading filter options:', err);
      }
    };
    fetchOptions();
    return () => { isMounted = false; };
  }, []);

  const handlePresetChange = useCallback((newPreset) => {
    setPreset(newPreset);
    if (newPreset === 'custom') return;
    const { start, end } = computeDynamicPresetDates(newPreset);
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handleStartDateChange = useCallback((val) => {
    setStartDate(val);
    setPreset('custom');
  }, []);

  const handleEndDateChange = useCallback((val) => {
    setEndDate(val);
    setPreset('custom');
  }, []);

  // 3. Tải dữ liệu phân tích từ Backend SQL Server
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (preset) params.append('preset', preset);
      if (startDate && preset !== 'all') params.append('start_date', startDate);
      if (endDate && preset !== 'all') params.append('end_date', endDate);
      if (selectedStage && selectedStage !== 'all') params.append('stage', selectedStage);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (selectedAql && selectedAql !== 'all') params.append('aql_class', selectedAql);
      if (searchQuery && searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/inspections/daily/analytics?${params.toString()}`);
      setData(res || null);
      setError(null);
      setLastUpdatedTime(new Date().toLocaleTimeString('vi-VN'));
    } catch (err) {
      console.error('[useDefectAnalytics] Error fetching analytics from server:', err);
      setData(null);
      setError({
        hasError: true,
        type: 'FETCH_ERROR',
        message: err?.response?.data?.detail || 'Không thể kết nối hoặc tải dữ liệu phân tích chất lượng từ máy chủ.'
      });
    } finally {
      setLoading(false);
    }
  }, [preset, startDate, endDate, selectedStage, selectedCategory, selectedAql, searchQuery]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Hợp nhất danh sách công đoạn từ /stages/ và dữ liệu thực tế stage_breakdown
  const stagesList = useMemo(() => {
    const fromBreakdown = Array.isArray(data?.stage_breakdown)
      ? data.stage_breakdown.map((s) => s.stage).filter(Boolean)
      : [];
    const fromHeatmap = Array.isArray(data?.heatmap_stages)
      ? data.heatmap_stages.map((s) => s.name).filter(Boolean)
      : [];
    return Array.from(new Set([...rawStagesList, ...fromBreakdown, ...fromHeatmap])).sort();
  }, [rawStagesList, data?.stage_breakdown, data?.heatmap_stages]);

  // Hợp nhất danh sách nhóm lỗi từ API hoặc dữ liệu severity_by_category
  const categoriesList = useMemo(() => {
    if (rawCategoriesList.length > 0) return rawCategoriesList;
    if (Array.isArray(data?.severity_by_category) && data.severity_by_category.length > 0) {
      return data.severity_by_category.map((c) => ({
        code: c.category,
        name: c.category_name || c.category
      }));
    }
    return [];
  }, [rawCategoriesList, data?.severity_by_category]);

  // 4. Xử lý sự kiện lọc và tương tác
  const handleStageClick = useCallback((stg) => {
    if (!stg) {
      setSelectedStage('');
      setActiveCrossFilter({ type: null, value: null });
      return;
    }

    const stageName = typeof stg === 'string' ? stg : (stg?.stage || stg?.name || stg?.payload?.stage);
    if (!stageName || stageName === selectedStage) {
      setSelectedStage('');
      setActiveCrossFilter({ type: null, value: null });
    } else {
      setSelectedStage(stageName);
      setActiveCrossFilter({ type: 'stage', value: stageName });
    }
  }, [selectedStage]);

  const handleCategoryClick = useCallback((cat) => {
    const catCode = typeof cat === 'string' ? cat : (cat?.category || cat?.code || cat?.payload?.category);
    if (!catCode) {
      setSelectedCategory('');
      setActiveCrossFilter({ type: null, value: null });
      return;
    }

    if (selectedCategory === catCode) {
      setSelectedCategory('');
      setActiveCrossFilter({ type: null, value: null });
    } else {
      setSelectedCategory(catCode);
      setActiveCrossFilter({ type: 'category', value: catCode });
    }
  }, [selectedCategory]);

  const handleDefectClick = useCallback((defect, stageOverride) => {
    if (!defect) return;
    const defectObj = typeof defect === 'object' ? defect : { defect_name: defect };
    const effectiveStage = stageOverride !== undefined ? stageOverride : selectedStage;
    setDrillDownState({
      isOpen: true,
      defect: defectObj,
      stage: effectiveStage,
      title: `Chứng từ kiểm tra ghi nhận lỗi: ${defectObj.defect_name || defectObj.name || ''}`
    });
  }, [selectedStage]);

  const closeDrillDown = useCallback(() => {
    setDrillDownState({
      isOpen: false,
      defect: null,
      stage: null,
      title: ''
    });
  }, []);

  const resetAllFilters = useCallback(() => {
    handlePresetChange('all');
    setSelectedStage('');
    setSelectedCategory('');
    setSelectedAql('all');
    setSearchQuery('');
    setActiveCrossFilter({ type: null, value: null });
  }, [handlePresetChange]);

  const hasActiveFilter = Boolean(
    preset !== 'all' ||
    selectedStage ||
    selectedCategory ||
    selectedAql !== 'all' ||
    Boolean(searchQuery && searchQuery.trim()) ||
    activeCrossFilter.type
  );

  return {
    loading,
    error,
    data,
    activePage,
    setActivePage,
    retryFetch: fetchAnalytics,
    // Trang 1
    summary: data?.summary || null,
    trendChartData: data?.trend || [],
    stageBreakdown: data?.stage_breakdown || [],
    topDefectCauses: data?.top_defect_causes || [],
    stagePassRates: data?.stage_pass_rates || [],
    severityByCategory: data?.severity_by_category || [],
    // Trang 2
    kpiPareto: data?.kpi_pareto || {},
    paretoList: data?.pareto || [],
    defectStageHeatmap: data?.defect_stage_heatmap || [],
    heatmapStages: data?.heatmap_stages || [],
    dailyBreakdown: data?.daily_breakdown || [],
    aqlSeverityBreakdown: data?.aql_severity_breakdown || [],
    detailedDefectTable: data?.detailed_defect_table || [],
    isDetailTableOpen,
    setIsDetailTableOpen,
    // Trang 3
    kpiAction: data?.kpi_action || {},
    topDefectiveBatches: data?.top_defective_batches || [],
    productLineBreakdown: data?.product_line_breakdown || [],
    capaStatusBreakdown: data?.capa_status_breakdown || [],
    actionItems: data?.action_items || [],
    qcRoster: data?.qc_roster || [],
    isActionItemsOpen,
    setIsActionItemsOpen,
    // Filters & metadata
    stagesList,
    categoriesList,
    preset,
    setPreset: handlePresetChange,
    startDate,
    setStartDate: handleStartDateChange,
    endDate,
    setEndDate: handleEndDateChange,
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
    resetAllFilters,
    hasActiveFilter,
    drillDownState,
    closeDrillDown,
    fetchAnalytics
  };
};

export default useDefectAnalytics;
