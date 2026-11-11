import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Calendar, Plus, Sliders, FileSpreadsheet, Printer, Pencil,
  Trash2, Check, RefreshCw, Layers, Eye, EyeOff, Search, PackageCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useScreenMetadataCached } from '@webShared/hooks/useScreenMetadata';
import { useToast } from '@webShared/Views/components/feedback/ToastContext';
import { dailyProductionService } from '../Services/dailyProduction.service';
import DailyProductionBuilderModal from './DailyProductionBuilderModal';
import '../styles/dailyProduction.css';

/**
 * View độc lập: Hôm nay sản xuất gì (/admin/daily-production)
 * Mã màn hình: SX03.1
 * Cho phép gộp các Cont lẻ tùy chọn từ Database (VD: APT-0063-03~04; APT-0074-02...)
 * và Custom chọn hiển thị chi tiết sản xuất hôm nay.
 */
const DailyProductionManageView = () => {
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
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chế độ Custom nhanh ngay trên bảng chính
  const [isQuickCustomMode, setIsQuickCustomMode] = useState(false);
  const [showHiddenInView, setShowHiddenInView] = useState(false);
  const [draftItems, setDraftItems] = useState([]);
  const [savingQuickCustom, setSavingQuickCustom] = useState(false);

  // Workspace tạo mới / chỉnh sửa gộp Cont (Hiển thị inline toàn trang, không bị Sidebar che)
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

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

  // Đồng bộ draftItems khi đổi activeBatch
  useEffect(() => {
    if (activeBatch && Array.isArray(activeBatch.items)) {
      setDraftItems(activeBatch.items.map(it => ({ ...it })));
    } else {
      setDraftItems([]);
    }
    setIsQuickCustomMode(false);
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

  // Các dòng hiển thị trên bảng chính
  const displayedRowsWithIndex = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return draftItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => {
        if (!isQuickCustomMode && !showHiddenInView && !item.is_visible) {
          return false;
        }
        if (!q) return true;
        return (
          (item.cont_code || '').toLowerCase().includes(q) ||
          (item.color_code || '').toLowerCase().includes(q) ||
          (item.cabinet_code || '').toLowerCase().includes(q) ||
          (item.stt_code || '').toLowerCase().includes(q) ||
          (item.material_name || '').toLowerCase().includes(q) ||
          (item.item_name || '').toLowerCase().includes(q) ||
          (item.note || '').toLowerCase().includes(q)
        );
      });
  }, [draftItems, isQuickCustomMode, showHiddenInView, searchQuery]);

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

  // Xuất Excel chuẩn mẫu "BẢNG LIỆT KÊ CHI TIẾT"
  const handleExportExcel = useCallback(() => {
    if (!activeBatch) return;
    const rowsToExport = (activeBatch.items || []).filter(it => it.is_visible);
    const sheetData = [
      [`BẢNG LIỆT KÊ CHI TIẾT - ${activeBatch.section_name}`],
      [activeBatch.batch_title],
      [activeBatch.line_color_summary || `Ngày SX: ${activeBatch.plan_date} - Nhà máy: ${activeBatch.factory}`],
      [],
      ['CONT', 'MÀU', 'STT', 'NGUYÊN LIỆU', 'SẢN PHẨM / CHI TIẾT', 'Dày', 'Rộng', 'Dài', 'SET', 'SLKH', 'GHI CHÚ']
    ];

    rowsToExport.forEach(it => {
      const isCab = it.row_type === 'CABINET_HEADER';
      sheetData.push([
        it.cont_code || '',
        it.color_code || '',
        it.stt_code || '',
        isCab ? '' : (it.material_name || ''),
        isCab ? '' : (it.item_name || ''),
        isCab ? '' : (it.dim_thick || ''),
        isCab ? '' : (it.dim_width || ''),
        isCab ? '' : (it.dim_length || ''),
        isCab ? '' : (it.set_qty ?? ''),
        it.custom_planned_qty ?? 0,
        it.note || ''
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 24 },
      { wch: 28 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
      { wch: 8 }, { wch: 12 }, { wch: 32 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HomNaySanXuatGi');
    const safeDate = (activeBatch.plan_date || todayStr).replace(/-/g, '');
    XLSX.writeFile(wb, `Bang_Liet_Ke_Chi_Tiet_${activeBatch.factory}_${safeDate}.xlsx`);
    toast?.success('Đã xuất file Excel Bảng Liệt Kê Chi Tiết!');
  }, [activeBatch, todayStr, toast]);

  return (
    <div className={`daily-prod-page ${isBuilderOpen ? 'builder-active' : ''}`}>
      {/* KHI MỞ WORKSPACE GỘP CONT & CUSTOM -> HIỂN THỊ TRỰC TIẾP TRONG TRANG (KHÔNG DÙNG POPUP BỊ SIDEBAR CHE) */}
      {isBuilderOpen ? (
        <DailyProductionBuilderModal
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSaved={(savedBatch) => {
            fetchBatches();
            if (savedBatch && savedBatch.id) {
              setSelectedBatchId(savedBatch.id);
            }
          }}
          initialDate={planDate}
          initialFactory={factoryFilter}
          editingBatch={editingBatch}
          metadata={metadata}
        />
      ) : (
        <>
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
                  onClick={() => {
                    setEditingBatch(null);
                    setIsBuilderOpen(true);
                  }}
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
                onClick={() => {
                  setEditingBatch(null);
                  setIsBuilderOpen(true);
                }}
              >
                <Plus size={18} /> Tạo Bảng Gộp Cont & Custom Ngay
              </button>
            </div>
          ) : (
            <div className="factory-sheet-card factory-sheet-printable">
              {/* BANNER TIÊU ĐỀ CHUẨN TỜ PHIẾU XƯỞNG */}
              <div className="factory-sheet-banner">
                <div style={{ minWidth: 200 }} className="no-print">
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    background: '#DCFCE7',
                    color: '#15803D',
                    padding: '4px 10px',
                    borderRadius: 99,
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    marginBottom: 6
                  }}>
                    ● ĐANG HIỂN THỊ SẢN XUẤT ({activeBatch.plan_date})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#5D3E26', fontWeight: 600 }}>
                    Mã bảng: <b>{activeBatch.batch_code}</b> • Nhà máy: <b>{activeBatch.factory}</b>
                  </div>
                  {/* Hiển thị các tag Cont lẻ đã được gộp */}
                  {activeBatch.selected_orders && activeBatch.selected_orders.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {activeBatch.selected_orders.map(oc => (
                        <span
                          key={oc}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#EFE4D4',
                            color: '#4A3525',
                            padding: '2px 7px',
                            borderRadius: 5
                          }}
                        >
                          {oc}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="factory-sheet-heading-center">
                  <h1 className="factory-sheet-main-title">
                    BẢNG LIỆT KÊ CHI TIẾT - {activeBatch.section_name}
                  </h1>
                  <div className="factory-sheet-sub-orders">
                    {activeBatch.batch_title}
                  </div>
                  <div className="factory-sheet-line-summary">
                    {activeBatch.line_color_summary || `Nhà máy ${activeBatch.factory} • Ngày ${activeBatch.plan_date}`}
                  </div>
                </div>

                {/* CÁC NÚT THAO TÁC TRÊN BẢNG */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }} className="no-print">
                  {isQuickCustomMode ? (
                    <>
                      <button
                        type="button"
                        className="daily-btn-primary"
                        disabled={savingQuickCustom}
                        onClick={handleSaveQuickCustom}
                      >
                        <Check size={16} /> {savingQuickCustom ? 'Đang lưu...' : 'Lưu Custom Hiển Thị'}
                      </button>
                      <button
                        type="button"
                        className="daily-btn-outline"
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
                        className="daily-btn-outline"
                        onClick={() => setIsQuickCustomMode(true)}
                        title="Bật chế độ tick chọn ẩn/hiện dòng và sửa số lượng trực tiếp trên bảng"
                      >
                        <Sliders size={15} /> Custom Nhanh Trên Bảng
                      </button>

                      <button
                        type="button"
                        className={`daily-btn-outline ${showHiddenInView ? 'active' : ''}`}
                        onClick={() => setShowHiddenInView(prev => !prev)}
                        title="Xem cả các dòng đang bị ẩn để kiểm tra"
                      >
                        {showHiddenInView ? <EyeOff size={15} /> : <Eye size={15} />}
                        {showHiddenInView ? 'Ẩn dòng không chọn' : `Xem cả dòng ẩn (${activeBatch.total_detail_count - activeBatch.visible_detail_count})`}
                      </button>

                      <button
                        type="button"
                        className="daily-btn-outline"
                        onClick={() => {
                          setEditingBatch(activeBatch);
                          setIsBuilderOpen(true);
                        }}
                      >
                        <Pencil size={15} /> Gộp thêm / Sửa Cont
                      </button>

                      <button
                        type="button"
                        className="daily-btn-outline"
                        onClick={handleExportExcel}
                      >
                        <FileSpreadsheet size={15} /> Xuất Excel
                      </button>

                      <button
                        type="button"
                        className="daily-btn-outline"
                        onClick={() => window.print()}
                      >
                        <Printer size={15} /> In Phiếu
                      </button>

                      <button
                        type="button"
                        className="daily-btn-danger"
                        onClick={() => handleDeleteBatch(activeBatch)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
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
                      <th rowSpan={2} style={{ width: 76 }}>CONT</th>
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
                    {displayedRowsWithIndex.length === 0 ? (
                      <tr>
                        <td colSpan={isQuickCustomMode ? 12 : 11} style={{ textAlign: 'center', padding: 40, color: '#786452' }}>
                          Không có dòng chi tiết nào đang được chọn hiển thị. Hãy bấm <b>"Custom Nhanh Trên Bảng"</b> để tick chọn các mục cần hiển thị hôm nay.
                        </td>
                      </tr>
                    ) : (
                      displayedRowsWithIndex.map(({ item, idx }) => {
                        const isCabHeader = item.row_type === 'CABINET_HEADER';
                        const isSubPart = !isCabHeader && String(item.stt_code || '').includes('.');
                        const rowClass = [
                          isCabHeader
                            ? 'factory-sheet-row-cabinet'
                            : isSubPart
                              ? 'factory-sheet-row-subpart'
                              : 'factory-sheet-row-assembly',
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
                              textAlign: isCabHeader ? 'center' : (isSubPart ? 'right' : 'left'),
                              fontWeight: isCabHeader ? 900 : 700,
                              paddingLeft: isSubPart ? 20 : 10,
                              fontSize: isCabHeader ? '1rem' : '0.87rem'
                            }}>
                              {item.stt_code}
                            </td>
                            <td>
                              {isCabHeader ? (
                                <span style={{ fontSize: '0.75rem', color: '#7B5233', fontWeight: 600 }} className="no-print">
                                  {item.source_orders_text ? `Cont: ${item.source_orders_text}` : ''}
                                </span>
                              ) : (
                                item.material_name
                              )}
                            </td>
                            <td style={{
                              paddingLeft: isSubPart ? 24 : 10,
                              fontWeight: isCabHeader ? 800 : (isSubPart ? 500 : 700)
                            }}>
                              {isCabHeader ? '' : item.item_name}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isCabHeader ? '' : item.dim_thick}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isCabHeader ? '' : item.dim_width}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {isCabHeader ? '' : item.dim_length}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 700 }}>
                              {isCabHeader ? '' : item.set_qty}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              fontWeight: 900,
                              fontSize: isCabHeader ? '1.05rem' : '0.9rem',
                              color: isCabHeader ? '#2D1A12' : '#1E130C'
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
                              {isQuickCustomMode && !isCabHeader ? (
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyProductionManageView;
