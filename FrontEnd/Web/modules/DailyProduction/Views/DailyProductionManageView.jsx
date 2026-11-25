import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, Plus, Sliders, FileSpreadsheet, Printer, Pencil,
  Trash2, Check, RefreshCw, Layers, Eye, EyeOff, Search,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { dailyProductionService } from '../Services/dailyProduction.service';
import '../styles/dailyProduction.css';

/**
 * View độc lập: Hôm nay sản xuất gì (/admin/daily-production)
 * Mã màn hình: SX03.1
 * Cho phép gộp các Cont lẻ tùy chọn từ Database (VD: APT-0063-03~04; APT-0074-02...)
 * và Custom chọn hiển thị chi tiết sản xuất hôm nay.
 */
const DailyProductionManageView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext() || {};
  const { setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra } = outletContext;
  const { toast } = useToast();

  // 1. Khai báo TẤT CẢ Hooks ở đầu Component (Tuân thủ tuyệt đối AGENTS.md)
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [planDate, setPlanDate] = useState(todayStr);
  const [showAllDates, setShowAllDates] = useState(true);
  const [factoryFilter, setFactoryFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Danh mục động lấy 100% từ Database (hr_factory_structures, stages, bom_details, product_plans, products)
  const [metadata, setMetadata] = useState({
    factories: [],
    stages: [],
    sections: [],
    plans: [],
    colors: []
  });

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(location.state?.selectedBatchId || null);
  const [loading, setLoading] = useState(true);

  // Chế độ Custom nhanh ngay trên bảng chính
  const [isQuickCustomMode, setIsQuickCustomMode] = useState(false);
  const [showHiddenInView, setShowHiddenInView] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [savingQuickCustom, setSavingQuickCustom] = useState(false);

  // Trạng thái Colab (thu gọn / mở rộng) theo từng mã tủ trên bảng danh sách (mặc định thu gọn cho gọn)
  const [expandedCabinets, setExpandedCabinets] = useState({});
  const [exportingExcel, setExportingExcel] = useState(false);

  const { screenCode, title, subtitle } = useScreenMetadataCached('/admin/daily-production');

  useEffect(() => {
    if (setCustomTitle) setCustomTitle(title || 'Hôm nay sản xuất gì');
    if (setCustomSubtitle) setCustomSubtitle(subtitle || 'Gộp Cont tùy chọn từ CSDL & Custom chi tiết hiển thị sản xuất trong ngày');
    if (setCustomScreenCode) setCustomScreenCode(screenCode || 'SX03.1');
    if (setHeaderExtra) setHeaderExtra(null);

    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [setCustomTitle, setCustomSubtitle, setCustomScreenCode, setHeaderExtra, title, subtitle, screenCode]);

  // Tải danh mục động từ CSDL
  const fetchMetadata = useCallback(async () => {
    try {
      const meta = await dailyProductionService.getMetadata();
      if (meta && typeof meta === 'object') {
        setMetadata({
          factories: meta.factories || [],
          stages: meta.stages || [],
          sections: meta.sections || [],
          plans: meta.plans || [],
          colors: meta.colors || []
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục động từ CSDL:', err);
    }
  }, []);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dailyProductionService.getBatches({
        plan_date: showAllDates ? 'ALL' : planDate,
        factory: factoryFilter,
        section_name: sectionFilter,
        include_items: true,
        only_visible: false
      });
      const list = res?.batches || [];
      setBatches(list);
      if (list.length > 0) {
        setSelectedBatchId(prev => (list.some(b => b.id === prev) ? prev : list[0].id));
      } else {
        setSelectedBatchId(null);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách bảng sản xuất hôm nay:', err);
      toast?.error('Không thể tải dữ liệu "Hôm nay sản xuất gì" từ CSDL.');
    } finally {
      setLoading(false);
    }
  }, [planDate, showAllDates, factoryFilter, sectionFilter, toast]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Bảng đang được chọn hiển thị
  const activeBatch = useMemo(() => {
    if (!batches || batches.length === 0) return null;
    return batches.find(b => b.id === selectedBatchId) || batches[0];
  }, [batches, selectedBatchId]);

  // Đồng bộ selectedBatchId nếu quay về từ trang tạo mới / chỉnh sửa
  useEffect(() => {
    if (location.state?.selectedBatchId) {
      setSelectedBatchId(location.state.selectedBatchId);
    }
  }, [location.state?.selectedBatchId]);

  // Đồng bộ draftItems & reset trạng thái Colab khi đổi activeBatch
  useEffect(() => {
    if (activeBatch && Array.isArray(activeBatch.items)) {
      setDraftItems(activeBatch.items.map(it => ({ ...it })));
    } else {
      setDraftItems([]);
    }
    setIsQuickCustomMode(false);
    setExpandedCabinets({});
  }, [activeBatch]);

  // Thống kê tổng quan trong ngày
  const kpiStats = useMemo(() => {
    const uniqueOrders = new Set();
    let totalCabs = 0;
    let totalVisibleParts = 0;

    batches.forEach(b => {
      (b.selected_orders || []).forEach(c => uniqueOrders.add(c));
      totalCabs += parseInt(b.total_cabinets || 0, 10);
      totalVisibleParts += parseInt(b.visible_detail_count || 0, 10);
    });

    return {
      batchesCount: batches.length,
      containersCount: uniqueOrders.size,
      totalCabinets: totalCabs,
      totalVisibleParts
    };
  }, [batches]);

  // Gom nhóm các dòng theo CABINET_HEADER để hỗ trợ chức năng Colab (Thu gọn / Mở rộng)
  const groupedDisplayRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const rawGroups = [];
    let currentGroup = null;

    draftItems.forEach((item, idx) => {
      if (item.row_type === 'CABINET_HEADER') {
        currentGroup = {
          groupKey: `cab-${idx}-${item.cabinet_code || ''}-${item.color_code || ''}`,
          header: { item, idx },
          details: []
        };
        rawGroups.push(currentGroup);
      } else {
        if (!currentGroup) {
          currentGroup = {
            groupKey: `orphan-${idx}`,
            header: null,
            details: []
          };
          rawGroups.push(currentGroup);
        }
        currentGroup.details.push({ item, idx });
      }
    });

    const matchesQuery = (it) => {
      if (!q) return true;
      return (
        (it.cont_code || '').toLowerCase().includes(q) ||
        (it.color_code || '').toLowerCase().includes(q) ||
        (it.cabinet_code || '').toLowerCase().includes(q) ||
        (it.stt_code || '').toLowerCase().includes(q) ||
        (it.material_name || '').toLowerCase().includes(q) ||
        (it.item_name || '').toLowerCase().includes(q) ||
        (it.source_orders_text || '').toLowerCase().includes(q) ||
        (it.note || '').toLowerCase().includes(q)
      );
    };

    const result = [];
    rawGroups.forEach(group => {
      const totalDetailCount = group.details.length;
      const visibleDetailCount = group.details.filter(d => d.item.is_visible).length;

      const visibilityFilteredDetails = group.details.filter(
        ({ item }) => isQuickCustomMode || showHiddenInView || item.is_visible
      );

      if (!q) {
        const headerVisible = !group.header || isQuickCustomMode || showHiddenInView || group.header.item.is_visible;
        if (headerVisible || visibilityFilteredDetails.length > 0) {
          result.push({
            ...group,
            details: visibilityFilteredDetails,
            totalDetailCount,
            visibleDetailCount,
            forceExpand: false
          });
        }
      } else {
        const headerMatches = group.header ? matchesQuery(group.header.item) : false;
        const matchedDetails = visibilityFilteredDetails.filter(({ item }) => matchesQuery(item));

        if (headerMatches) {
          result.push({
            ...group,
            details: visibilityFilteredDetails,
            totalDetailCount,
            visibleDetailCount,
            forceExpand: false
          });
        } else if (matchedDetails.length > 0) {
          result.push({
            ...group,
            details: matchedDetails,
            totalDetailCount,
            visibleDetailCount,
            forceExpand: true
          });
        }
      }
    });

    return result;
  }, [draftItems, isQuickCustomMode, showHiddenInView, searchQuery]);

  // Kiểm tra trạng thái mở rộng tất cả Colab
  const isAllCabinetsExpanded = useMemo(() => {
    const groupsWithHeader = groupedDisplayRows.filter(g => g.header);
    return groupsWithHeader.length > 0 && groupsWithHeader.every(g => !!expandedCabinets[g.groupKey]);
  }, [groupedDisplayRows, expandedCabinets]);

  const handleToggleCabinetColab = useCallback((groupKey) => {
    setExpandedCabinets(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }, []);

  const handleToggleAllCabinets = useCallback(() => {
    if (isAllCabinetsExpanded) {
      setExpandedCabinets({});
    } else {
      const next = {};
      groupedDisplayRows.forEach(g => {
        if (g.header) next[g.groupKey] = true;
      });
      setExpandedCabinets(next);
    }
  }, [isAllCabinetsExpanded, groupedDisplayRows]);

  const handlePrintSheet = useCallback(() => {
    if (!isAllCabinetsExpanded && groupedDisplayRows.some(g => g.header)) {
      const allOpen = {};
      groupedDisplayRows.forEach(g => {
        if (g.header) allOpen[g.groupKey] = true;
      });
      setExpandedCabinets(allOpen);
      setTimeout(() => window.print(), 120);
    } else {
      window.print();
    }
  }, [isAllCabinetsExpanded, groupedDisplayRows]);

  // Điều hướng sang trang Tạo mới / Chỉnh sửa độc lập
  const handleNavigateCreate = useCallback(() => {
    navigate('/admin/daily-production/create', {
      state: {
        initialDate: planDate,
        initialFactory: factoryFilter,
        metadata
      }
    });
  }, [navigate, planDate, factoryFilter, metadata]);

  const handleNavigateEdit = useCallback((batch) => {
    if (!batch?.id) return;
    navigate(`/admin/daily-production/edit/${batch.id}`, {
      state: {
        editingBatch: batch,
        initialDate: planDate,
        initialFactory: factoryFilter,
        metadata
      }
    });
  }, [navigate, planDate, factoryFilter, metadata]);

  // Handlers cho Chế độ Custom nhanh ngay trên bảng
  const handleQuickToggleVisible = useCallback((rowIndex) => {
    setDraftItems(prev => {
      const next = [...prev];
      const target = { ...next[rowIndex] };
      const nextVis = !target.is_visible;
      target.is_visible = nextVis;
      next[rowIndex] = target;

      if (target.row_type === 'CABINET_HEADER') {
        for (let i = rowIndex + 1; i < next.length; i++) {
          if (next[i].row_type === 'CABINET_HEADER') break;
          next[i] = { ...next[i], is_visible: nextVis };
        }
      }
      return next;
    });
  }, []);

  const handleQuickChangeQty = useCallback((rowIndex, valStr) => {
    const num = Math.max(0, parseInt(valStr || '0', 10) || 0);
    setDraftItems(prev => {
      const next = [...prev];
      const target = { ...next[rowIndex], custom_planned_qty: num };
      next[rowIndex] = target;

      if (target.row_type === 'CABINET_HEADER') {
        for (let i = rowIndex + 1; i < next.length; i++) {
          if (next[i].row_type === 'CABINET_HEADER') break;
          const setVal = parseFloat(next[i].set_qty || 1);
          next[i] = { ...next[i], custom_planned_qty: Math.round(setVal * num) };
        }
      }
      return next;
    });
  }, []);

  const handleQuickChangeNote = useCallback((rowIndex, noteVal) => {
    setDraftItems(prev => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], note: noteVal };
      return next;
    });
  }, []);

  const handleSaveQuickCustom = async () => {
    if (!activeBatch) return;
    setSavingQuickCustom(true);
    try {
      const updated = await dailyProductionService.quickUpdateBatchItems(activeBatch.id, {
        items: draftItems
      });
      setBatches(prev => prev.map(b => (b.id === updated.id ? updated : b)));
      setIsQuickCustomMode(false);
      toast?.success('Đã lưu Custom hiển thị & số lượng sản xuất hôm nay!');
    } catch (err) {
      console.error('Lỗi khi lưu Custom nhanh:', err);
      toast?.error('Không thể lưu thay đổi Custom.');
    } finally {
      setSavingQuickCustom(false);
    }
  };

  const handleDeleteBatch = async (batch) => {
    if (!batch) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bảng "${batch.batch_title}" (${batch.section_name}) không?`)) {
      return;
    }
    try {
      await dailyProductionService.deleteBatch(batch.id);
      toast?.success('Đã xóa bảng sản xuất ngày thành công.');
      fetchBatches();
    } catch (err) {
      console.error('Lỗi khi xóa bảng sản xuất ngày:', err);
      toast?.error('Không thể xóa bảng sản xuất này.');
    }
  };

  // Xuất Excel chuẩn mẫu Phiếu Xưởng ("BẢNG LIỆT KÊ CHI TIẾT") từ Backend OpenPyXL
  const handleExportExcel = useCallback(async () => {
    if (!activeBatch?.id || exportingExcel) return;
    setExportingExcel(true);
    try {
      const blob = await dailyProductionService.exportBatchExcel(activeBatch.id, {
        only_visible: !showHiddenInView
      });
      const safeDate = (activeBatch.plan_date || todayStr).replace(/-/g, '');
      const safeFactory = String(activeBatch.factory || 'SX').replace(/[^A-Za-z0-9_-]/g, '');
      const filename = `Bang_Liet_Ke_Chi_Tiet_${safeFactory}_${safeDate}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast?.success('Đã xuất file Excel chuẩn mẫu Phiếu Xưởng!');
    } catch (err) {
      console.error('Lỗi khi xuất file Excel Bảng Liệt Kê Chi Tiết:', err);
      toast?.error('Không thể xuất file Excel. Vui lòng thử lại.');
    } finally {
      setExportingExcel(false);
    }
  }, [activeBatch, exportingExcel, showHiddenInView, todayStr, toast]);

  return (
    <div className="daily-prod-page">
      {/* 1. KHỐI ĐIỀU KHIỂN & ĐỢT SẢN XUẤT SIÊU GỌN (ULTRA COMPACT SINGLE PANEL) */}
      <div className="daily-prod-compact-panel no-print">
        {/* Hàng 1: Bộ lọc nhanh & Nút hành động trên 1 đường thẳng duy nhất */}
        <div className="daily-panel-row-top">
          <div className="daily-compact-filters">
            <div className="daily-mini-filter-pill">
              <Calendar size={13} color="#7B5233" />
              <input
                type="date"
                className="daily-mini-date-input"
                disabled={showAllDates}
                value={planDate}
                onChange={(e) => {
                  setPlanDate(e.target.value);
                  setShowAllDates(false);
                }}
              />
              <button
                type="button"
                className={`daily-mini-btn-pill ${!showAllDates && planDate === todayStr ? 'active' : ''}`}
                onClick={() => {
                  setPlanDate(todayStr);
                  setShowAllDates(false);
                }}
              >
                Nay
              </button>
              <button
                type="button"
                className={`daily-mini-btn-pill ${showAllDates ? 'active' : ''}`}
                onClick={() => setShowAllDates(prev => !prev)}
              >
                Tất cả
              </button>
            </div>

            <select
              className="daily-mini-select"
              style={{ width: 95 }}
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
              title="Lọc theo Nhà máy"
            >
              <option value="ALL">Tất cả NM</option>
              {(metadata.factories || []).map(f => (
                <option key={f.code} value={f.code}>
                  {f.code}
                </option>
              ))}
            </select>

            <select
              className="daily-mini-select"
              style={{ width: 110 }}
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              title="Lọc theo Cụm / Công đoạn"
            >
              <option value="ALL">Tất cả Cụm</option>
              {(metadata.sections || []).map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="daily-mini-search-wrap">
              <Search size={12} className="daily-mini-search-icon" />
              <input
                type="text"
                className="daily-mini-search-input"
                placeholder="Lọc mã tủ, chi tiết..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="daily-panel-actions">
            <button
              type="button"
              className="daily-mini-icon-btn"
              onClick={fetchBatches}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={13} />
            </button>

            <button
              type="button"
              className="daily-btn-primary daily-btn-primary-compact"
              onClick={handleNavigateCreate}
            >
              <Plus size={14} /> Gộp Cont & Thiết Lập SX
            </button>
          </div>
        </div>

        {/* Hàng 2: Đợt SX (Trái) & Mini Stats Inline (Phải) liền mạch không viền rườm rà */}
        <div className="daily-panel-row-sub">
          <div className="daily-compact-batches">
            <span className="daily-batch-lead-label">Đợt SX:</span>
            {batches.length === 0 ? (
              <span className="daily-batch-empty-text">Chưa có đợt sản xuất nào trong ngày</span>
            ) : (
              batches.map(b => {
                const isSel = activeBatch && activeBatch.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    className={`daily-mini-batch-chip ${isSel ? 'active' : ''}`}
                    onClick={() => setSelectedBatchId(b.id)}
                    title={b.batch_title}
                  >
                    <span className="chip-badge">{b.section_name} • {b.factory}</span>
                    <span className="chip-title">{b.batch_title}</span>
                    <span className="chip-count">({b.total_cabinets} tủ • {b.orders_count} Cont)</span>
                  </button>
                );
              })
            )}
          </div>

          <div className="daily-compact-stats-inline">
            <span><b>{kpiStats.batchesCount}</b> bảng</span>
            <span className="dot">•</span>
            <span><b>{kpiStats.containersCount}</b> Cont</span>
            <span className="dot">•</span>
            <span className="stat-success"><b>{kpiStats.totalCabinets}</b> tủ</span>
            <span className="dot">•</span>
            <span className="stat-warning"><b>{kpiStats.totalVisibleParts}</b> BOM</span>
          </div>
        </div>
      </div>

      {/* 4. NỘI DUNG BẢNG LIỆT KÊ CHI TIẾT (CHUẨN MẪU PHIẾU XƯỞNG) */}
      {loading ? (
        <div className="factory-sheet-card" style={{ padding: 60, textAlign: 'center', color: '#7B5233', fontWeight: 700 }}>
          Đang tải bảng "Hôm nay sản xuất gì" từ CSDL...
        </div>
      ) : !activeBatch ? (
        <div className="factory-sheet-card" style={{ padding: 60, textAlign: 'center' }}>
          <Layers size={48} color="#7B5233" style={{ marginBottom: 12, opacity: 0.75 }} />
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem', fontWeight: 800, color: '#2D1A12' }}>
            Chưa có bảng "Hôm nay sản xuất gì" nào cho bộ lọc hiện tại
          </h3>
          <p style={{ margin: '0 auto 20px auto', maxWidth: 540, color: '#786452', fontSize: '0.9rem' }}>
            Hãy bấm nút <b>"Gộp Cont & Thiết Lập Hôm Nay SX Gì"</b> để chọn các Cont lẻ từ cơ sở dữ liệu (VD: APT-0063-03~04, APT-0074-01~02...) và Custom các chi tiết sản xuất trong ngày.
          </p>
          <button
            type="button"
            className="daily-btn-primary"
            onClick={handleNavigateCreate}
          >
            <Plus size={18} /> Tạo Bảng Gộp Cont & Custom Ngay
          </button>
        </div>
      ) : (
        <div className="factory-sheet-card factory-sheet-printable">
          {/* TIÊU ĐỀ IN PHIẾU (CHỈ HIỆN KHI IN GIẤY A4 NGANG) */}
          <div className="factory-sheet-print-header print-only">
            <div className="factory-sheet-print-company">
              CÔNG TY CỔ PHẦN VINA G7 - CCN Tam Phước 1, KP Long Khánh 3, P. Tam Phước, Tỉnh Đồng Nai | Website: https://phutai.com.vn/ - Email: vinag7@vinag7furniture.com
            </div>
            <h1 className="factory-sheet-main-title">
              BẢNG LIỆT KÊ CHI TIẾT - {activeBatch.section_name}
            </h1>
            <div className="factory-sheet-sub-orders">{activeBatch.batch_title}</div>
            <div className="factory-sheet-line-summary">
              {activeBatch.line_color_summary || `Nhà máy ${activeBatch.factory} • Ngày ${activeBatch.plan_date}`}
            </div>
          </div>

          {/* BANNER GỌN NHẸ & THANH THAO TÁC TRỰC QUAN (NO-PRINT) */}
          <div className="factory-sheet-banner-compact no-print">
            {/* Dòng 1: Thông tin bảng + Tiêu đề + Cont gộp trên 1 hàng gọn gàng */}
            <div className="factory-sheet-info-row">
              <div className="factory-sheet-title-group">
                <span className="factory-sheet-status-pill" title={`Đang hiển thị sản xuất ngày ${activeBatch.plan_date}`}>
                  ● {activeBatch.plan_date}
                </span>
                <span className="factory-sheet-title-inline">
                  BẢNG LIỆT KÊ CHI TIẾT - {activeBatch.section_name}
                </span>
                <span className="factory-sheet-sep">|</span>
                <span className="factory-sheet-orders-inline" title={activeBatch.batch_title}>
                  {activeBatch.batch_title}
                </span>
                <span className="factory-sheet-meta-inline">
                  ({activeBatch.batch_code} • {activeBatch.factory}
                  {activeBatch.line_color_summary ? ` • ${activeBatch.line_color_summary}` : ''})
                </span>
              </div>

              {activeBatch.selected_orders && activeBatch.selected_orders.length > 0 && (
                <div className="factory-sheet-cont-tags" title={activeBatch.selected_orders.join(', ')}>
                  {activeBatch.selected_orders.slice(0, 4).map(oc => (
                    <span key={oc} className="factory-sheet-cont-tag">{oc}</span>
                  ))}
                  {activeBatch.selected_orders.length > 4 && (
                    <span className="factory-sheet-cont-tag more">
                      +{activeBatch.selected_orders.length - 4} Cont
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Dòng 2: Thanh công cụ thao tác phân nhóm Trái (Xem/Custom) & Phải (Sửa/Xuất/In/Xóa) */}
            <div className="factory-sheet-action-bar">
              <div className="factory-sheet-action-group">
                <button
                  type="button"
                  className={`daily-sheet-btn ${isAllCabinetsExpanded ? 'active' : ''}`}
                  onClick={handleToggleAllCabinets}
                  title={isAllCabinetsExpanded ? 'Thu gọn tất cả chi tiết BOM theo từng mã tủ' : 'Mở rộng tất cả chi tiết BOM'}
                >
                  {isAllCabinetsExpanded ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                  {isAllCabinetsExpanded ? 'Thu gọn' : 'Mở tất cả'}
                </button>

                {isQuickCustomMode ? (
                  <>
                    <button
                      type="button"
                      className="daily-sheet-btn primary"
                      disabled={savingQuickCustom}
                      onClick={handleSaveQuickCustom}
                    >
                      <Check size={14} /> {savingQuickCustom ? 'Đang lưu...' : 'Lưu Custom'}
                    </button>
                    <button
                      type="button"
                      className="daily-sheet-btn"
                      onClick={() => {
                        setDraftItems((activeBatch.items || []).map(it => ({ ...it })));
                        setIsQuickCustomMode(false);
                      }}
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="daily-sheet-btn"
                      onClick={() => setIsQuickCustomMode(true)}
                      title="Bật chế độ tick chọn ẩn/hiện dòng và sửa số lượng trực tiếp trên bảng"
                    >
                      <Sliders size={13} /> Custom nhanh
                    </button>

                    <button
                      type="button"
                      className={`daily-sheet-btn ${showHiddenInView ? 'active' : ''}`}
                      onClick={() => setShowHiddenInView(prev => !prev)}
                      title="Xem cả các dòng đang bị ẩn để kiểm tra"
                    >
                      {showHiddenInView ? <EyeOff size={13} /> : <Eye size={13} />}
                      {showHiddenInView
                        ? 'Ẩn dòng không chọn'
                        : `Dòng ẩn (${Math.max(0, (activeBatch.total_detail_count || 0) - (activeBatch.visible_detail_count || 0))})`}
                    </button>
                  </>
                )}
              </div>

              {!isQuickCustomMode && (
                <div className="factory-sheet-action-group">
                  <button
                    type="button"
                    className="daily-sheet-btn accent"
                    onClick={() => handleNavigateEdit(activeBatch)}
                    title="Mở trang chỉnh sửa để gộp thêm Cont hoặc custom chi tiết BOM"
                  >
                    <Pencil size={13} /> Sửa / Gộp Cont
                  </button>

                  <button
                    type="button"
                    className="daily-sheet-btn"
                    disabled={exportingExcel}
                    onClick={handleExportExcel}
                    title="Xuất bảng hiện tại ra file Excel chuẩn mẫu Phiếu Xưởng"
                  >
                    <FileSpreadsheet size={13} /> {exportingExcel ? 'Đang xuất...' : 'Excel'}
                  </button>

                  <button
                    type="button"
                    className="daily-sheet-btn"
                    onClick={handlePrintSheet}
                    title="In phiếu Bảng Liệt Kê Chi Tiết"
                  >
                    <Printer size={13} /> In
                  </button>

                  <button
                    type="button"
                    className="daily-sheet-btn danger icon-only"
                    onClick={() => handleDeleteBatch(activeBatch)}
                    title="Xóa bảng sản xuất này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BẢNG DỮ LIỆU CHUẨN MẪU PHIẾU XƯỞNG */}
          <div className="factory-sheet-table-wrap">
            <table className="factory-sheet-table">
              <thead>
                <tr>
                  {isQuickCustomMode && (
                    <th rowSpan={2} style={{ width: 64 }} className="no-print">
                      HIỂN THỊ
                    </th>
                  )}
                  <th rowSpan={2} style={{ width: 92 }}>CONT</th>
                  <th rowSpan={2} style={{ width: 76 }}>MÀU</th>
                  <th rowSpan={2} style={{ width: 82 }}>STT</th>
                  <th rowSpan={2} style={{ minWidth: 165 }}>NGUYÊN LIỆU</th>
                  <th rowSpan={2} style={{ minWidth: 210 }}>SẢN PHẨM / CHI TIẾT</th>
                  <th colSpan={3}>QUY CÁCH TINH</th>
                  <th rowSpan={2} style={{ width: 65 }}>SET</th>
                  <th rowSpan={2} style={{ width: 95 }}>SLKH</th>
                  <th rowSpan={2} style={{ minWidth: 200 }}>GHI CHÚ</th>
                </tr>
                <tr>
                  <th style={{ width: 62 }}>Dày</th>
                  <th style={{ width: 68 }}>Rộng</th>
                  <th style={{ width: 68 }}>Dài</th>
                </tr>
              </thead>
              <tbody>
                {groupedDisplayRows.length === 0 ? (
                  <tr>
                    <td colSpan={isQuickCustomMode ? 12 : 11} style={{ textAlign: 'center', padding: 40, color: '#786452' }}>
                      Không có dòng chi tiết nào đang được chọn hiển thị. Hãy bấm <b>"Custom Nhanh Trên Bảng"</b> để tick chọn các mục cần hiển thị hôm nay.
                    </td>
                  </tr>
                ) : (
                  groupedDisplayRows.map(group => {
                    const isExpanded = !group.header || !!expandedCabinets[group.groupKey] || group.forceExpand;
                    const headerEntry = group.header;

                    return (
                      <React.Fragment key={group.groupKey}>
                        {headerEntry && (() => {
                          const { item, idx } = headerEntry;
                          const headerClass = [
                            'factory-sheet-row-cabinet',
                            'factory-sheet-row-cabinet-toggle',
                            isExpanded ? 'expanded' : '',
                            !item.is_visible ? 'factory-sheet-row-hidden' : ''
                          ].filter(Boolean).join(' ');

                          return (
                            <tr
                              key={item.id || `${item.cabinet_code}-${item.stt_code}-${idx}`}
                              className={headerClass}
                              onClick={() => handleToggleCabinetColab(group.groupKey)}
                              title={isExpanded ? 'Bấm để thu gọn chi tiết BOM' : 'Bấm để mở rộng chi tiết BOM'}
                            >
                              {isQuickCustomMode && (
                                <td
                                  style={{ textAlign: 'center' }}
                                  className="no-print"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={!!item.is_visible}
                                    onChange={() => handleQuickToggleVisible(idx)}
                                    style={{ width: 17, height: 17, accentColor: '#7B5233', cursor: 'pointer' }}
                                  />
                                </td>
                              )}
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>
                                <div className="daily-colab-cont-cell">
                                  <span className="daily-colab-chevron no-print">
                                    {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                  </span>
                                  <span>{item.cont_code}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>
                                {item.color_code}
                              </td>
                              <td style={{
                                textAlign: 'center',
                                fontWeight: 900,
                                paddingLeft: 10,
                                fontSize: '1rem'
                              }}>
                                {item.stt_code}
                              </td>
                              <td>
                                <span style={{ fontSize: '0.75rem', color: '#7B5233', fontWeight: 600 }} className="no-print">
                                  {item.source_orders_text ? `Cont: ${item.source_orders_text}` : ''}
                                </span>
                              </td>
                              <td style={{ paddingLeft: 10, fontWeight: 800 }}>
                                <div className="daily-colab-summary-cell no-print">
                                  <span>{item.item_name || `Tủ ${item.cabinet_code}`}</span>
                                  <span className="factory-sheet-colab-badge">
                                    {isQuickCustomMode || showHiddenInView
                                      ? `${group.visibleDetailCount}/${group.totalDetailCount} chi tiết`
                                      : `${group.details.length} chi tiết`}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}></td>
                              <td style={{ textAlign: 'center' }}></td>
                              <td style={{ textAlign: 'center' }}></td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}></td>
                              <td
                                style={{
                                  textAlign: 'center',
                                  fontWeight: 900,
                                  fontSize: '1.05rem',
                                  color: '#2D1A12'
                                }}
                                onClick={(e) => {
                                  if (isQuickCustomMode) e.stopPropagation();
                                }}
                              >
                                {isQuickCustomMode ? (
                                  <input
                                    type="number"
                                    min="0"
                                    className="daily-prod-input"
                                    style={{ width: 78, padding: '3px 6px', textAlign: 'center', fontWeight: 800 }}
                                    value={item.custom_planned_qty ?? 0}
                                    onChange={(e) => handleQuickChangeQty(idx, e.target.value)}
                                  />
                                ) : (
                                  item.custom_planned_qty
                                )}
                              </td>
                              <td style={{ fontWeight: 600, fontSize: '0.82rem', color: '#3F2A1D' }}>
                                {item.note}
                              </td>
                            </tr>
                          );
                        })()}

                        {isExpanded && group.details.map(({ item, idx }) => {
                          const isSubPart = String(item.stt_code || '').includes('.');
                          const rowClass = [
                            isSubPart ? 'factory-sheet-row-subpart' : 'factory-sheet-row-assembly',
                            !item.is_visible ? 'factory-sheet-row-hidden' : ''
                          ].filter(Boolean).join(' ');

                          return (
                            <tr key={item.id || `${item.cabinet_code}-${item.stt_code}-${idx}`} className={rowClass}>
                              {isQuickCustomMode && (
                                <td style={{ textAlign: 'center' }} className="no-print">
                                  <input
                                    type="checkbox"
                                    checked={!!item.is_visible}
                                    onChange={() => handleQuickToggleVisible(idx)}
                                    style={{ width: 17, height: 17, accentColor: '#7B5233', cursor: 'pointer' }}
                                  />
                                </td>
                              )}
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>
                                {item.cont_code}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 800 }}>
                                {item.color_code}
                              </td>
                              <td style={{
                                textAlign: isSubPart ? 'right' : 'left',
                                fontWeight: 700,
                                paddingLeft: isSubPart ? 20 : 10,
                                fontSize: '0.87rem'
                              }}>
                                {item.stt_code}
                              </td>
                              <td>{item.material_name}</td>
                              <td style={{
                                paddingLeft: isSubPart ? 24 : 10,
                                fontWeight: isSubPart ? 500 : 700
                              }}>
                                {item.item_name}
                              </td>
                              <td style={{ textAlign: 'center' }}>{item.dim_thick}</td>
                              <td style={{ textAlign: 'center' }}>{item.dim_width}</td>
                              <td style={{ textAlign: 'center' }}>{item.dim_length}</td>
                              <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.set_qty}</td>
                              <td style={{
                                textAlign: 'center',
                                fontWeight: 900,
                                fontSize: '0.9rem',
                                color: '#1E130C'
                              }}>
                                {isQuickCustomMode ? (
                                  <input
                                    type="number"
                                    min="0"
                                    className="daily-prod-input"
                                    style={{ width: 78, padding: '3px 6px', textAlign: 'center', fontWeight: 800 }}
                                    value={item.custom_planned_qty ?? 0}
                                    onChange={(e) => handleQuickChangeQty(idx, e.target.value)}
                                  />
                                ) : (
                                  item.custom_planned_qty
                                )}
                              </td>
                              <td style={{ fontWeight: 600, fontSize: '0.82rem', color: '#3F2A1D' }}>
                                {isQuickCustomMode ? (
                                  <input
                                    type="text"
                                    className="daily-prod-input"
                                    style={{ width: '100%', padding: '3px 6px', fontSize: '0.8rem' }}
                                    value={item.note || ''}
                                    placeholder="Nhập ghi chú..."
                                    onChange={(e) => handleQuickChangeNote(idx, e.target.value)}
                                  />
                                ) : (
                                  item.note
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyProductionManageView;
