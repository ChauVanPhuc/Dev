import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
  Cell
} from 'recharts';
import { formatNumber, formatDateVN, getVoucherStatusInfo } from '../../../types/warehouseInventory.types';
import { useColumnResizing } from '../../../hooks';
import { WAREHOUSE_TABS } from '../../../types/warehouseInventory.types';
import { warehouseFifoService, getWarehouseDisplayName, normalizeWarehouseCode } from '../../../services/warehouseFifo.service';
import { goodsReceiptService } from '../../../services/goodsReceipt.service';
import { goodsIssueService } from '../../../services/goodsIssue.service';
import { warehouseDataService } from '../../../services/warehouseData.service';
import { REJECTED_SOURCE_TYPES, REJECTED_STATUSES, REJECTED_RESOLUTIONS, getRejectedResultInfo } from '../../../types/rejectedGoods.types';
import { GoodsReceiptDetailModal } from '../../GoodsReceipt/components/GoodsReceiptDetailModal';
import { GoodsIssueDetailModal } from '../../GoodsIssue/components/GoodsIssueDetailModal';
import WarehouseRejectedDetailModal from './WarehouseRejectedDetailModal';

/**
 * Tính toán khoảng ngày mặc định theo chế độ lọc
 * Không hardcode ngày/tháng, tự động lấy động theo ngày hệ thống
 */
export const getDatePresetRange = (preset, baseDate = new Date()) => {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const d = baseDate.getDate();
  const pad = (n) => String(n).padStart(2, '0');

  if (preset === 'TODAY') {
    const todayStr = `${y}-${pad(m + 1)}-${pad(d)}`;
    return { fromDate: todayStr, toDate: todayStr };
  }

  if (preset === 'THREE_DAYS') {
    const past = new Date(baseDate.getTime());
    past.setDate(past.getDate() - 2);
    return {
      fromDate: `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`,
      toDate: `${y}-${pad(m + 1)}-${pad(d)}`
    };
  }

  if (preset === 'THIS_WEEK') {
    const dayOfWeek = baseDate.getDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate.getTime());
    monday.setDate(monday.getDate() + diffToMon);
    const sunday = new Date(monday.getTime());
    sunday.setDate(sunday.getDate() + 6);
    return {
      fromDate: `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`,
      toDate: `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`
    };
  }

  if (preset === 'THIS_MONTH') {
    const lastDayOfMonth = new Date(y, m + 1, 0).getDate();
    return {
      fromDate: `${y}-${pad(m + 1)}-01`,
      toDate: `${y}-${pad(m + 1)}-${pad(lastDayOfMonth)}`
    };
  }

  if (preset === 'LAST_MONTH') {
    const lastDayPrevMonth = new Date(y, m, 0);
    const py = lastDayPrevMonth.getFullYear();
    const pm = lastDayPrevMonth.getMonth() + 1;
    return {
      fromDate: `${py}-${pad(pm)}-01`,
      toDate: `${py}-${pad(pm)}-${pad(lastDayPrevMonth.getDate())}`
    };
  }

  if (preset === 'ALL') {
    return {
      fromDate: '',
      toDate: ''
    };
  }

  return { fromDate: '', toDate: '' };
};

/**
 * WarehouseMaterialDetailModal
 * Popup chi tiết vật tư chuẩn ERP G7:
 * - Header cố định: Chi tiết vật tư – [Mã], Tên đầy đủ bên dưới.
 * - 1 nút X đóng góc phải duy nhất.
 * - Sticky Header và Footer trên toàn bộ 4 bảng.
 * - Căn giữa đồng bộ cột trạng thái.
 * - Bộ lọc thời gian đồng bộ 3 tab (mặc định Tháng này, Tháng trước, Tùy chọn, Tất cả).
 * - 2 Biểu đồ chuyên sâu tại Tab Hàng loại / Trả về: Xu hướng & Pareto 80/20.
 */
export const WarehouseMaterialDetailModal = ({
  isOpen,
  onClose,
  material = null,
  initialWarehouse = 'ALL',
  initialFromDate = '',
  initialToDate = ''
}) => {
  // 1. Quản lý Tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'rejected'

  // 2. Bộ lọc dùng chung đồng bộ cả 3 Tab
  const [selectedWarehouse, setSelectedWarehouse] = useState(initialWarehouse || 'ALL');
  const [timeFilterMode, setTimeFilterMode] = useState(
    initialFromDate || initialToDate ? 'CUSTOM' : 'THREE_DAYS'
  );
  const initialRange = useMemo(() => getDatePresetRange('THREE_DAYS'), []);
  const [filterFromDate, setFilterFromDate] = useState(initialFromDate || initialRange.fromDate);
  const [filterToDate, setFilterToDate] = useState(initialToDate || initialRange.toDate);

  // 3. Dữ liệu Tab 1 (FIFO Overview & Lịch sử biến động tồn kho)
  const [fifoData, setFifoData] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loadingFifo, setLoadingFifo] = useState(false);

  // 4. Dữ liệu Tab 2 (Lịch sử Nhập / Xuất thống nhất)
  const [receiptLines, setReceiptLines] = useState([]);
  const [issueLines, setIssueLines] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [inPage, setInPage] = useState(1);
  const [outPage, setOutPage] = useState(1);
  const histPageSize = 8;

  // 5. Dữ liệu Tab 3 (Hàng loại / Trả về)
  const [rejSourceType, setRejSourceType] = useState('ALL');
  const [rejStatus, setRejStatus] = useState('ALL');
  const [rejectedLines, setRejectedLines] = useState([]);
  const [loadingRejected, setLoadingRejected] = useState(false);
  const [rejPage, setRejPage] = useState(1);
  const rejPageSize = 10;

  // 6. State mở Modal chi tiết phiếu nhập / xuất / hàng loại
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedRejected, setSelectedRejected] = useState(null);

  // 7. Refs đồng bộ cuộn ngang giữa Header, Body và Footer của bảng Sổ kho Tab 1
  const ledgerHeaderRef = useRef(null);
  const ledgerBodyRef = useRef(null);
  const ledgerFooterRef = useRef(null);

  // 8. Refs theo dõi và đo lường kích thước 2 bảng Tab 2 (Nhập kho & Xuất kho)
  const histInWrapperRef = useRef(null);
  const histInTableRef = useRef(null);
  const histOutWrapperRef = useRef(null);
  const histOutTableRef = useRef(null);
  const rejWrapperRef = useRef(null);
  const rejTableRef = useRef(null);

  const handleLedgerBodyScroll = useCallback((e) => {
    const { scrollLeft } = e.currentTarget;
    if (ledgerHeaderRef.current && ledgerHeaderRef.current.scrollLeft !== scrollLeft) {
      ledgerHeaderRef.current.scrollLeft = scrollLeft;
    }
    if (ledgerFooterRef.current && ledgerFooterRef.current.scrollLeft !== scrollLeft) {
      ledgerFooterRef.current.scrollLeft = scrollLeft;
    }
  }, []);

  // ── HOOK QUẢN LÝ RESIZING CỘT (KÉO GIÃN CHIỀU RỘNG CỘT & LƯU LOCALSTORAGE V4) ──
  // 1. Sổ kho biến động (Tab 1) - Chuẩn hóa tổng chiều rộng gọn gàng trong container
  const ledgerColsConfig = useMemo(() => [
    { key: 'stt', defaultWidth: 42, minWidth: 36, maxWidth: 65 },
    { key: 'date', defaultWidth: 95, minWidth: 85, maxWidth: 130 },
    { key: 'voucher_no', defaultWidth: 125, minWidth: 110, maxWidth: 180 },
    { key: 'desc', defaultWidth: 260, minWidth: 160, maxWidth: 500 },
    { key: 'qty_in', defaultWidth: 85, minWidth: 75, maxWidth: 130 },
    { key: 'qty_out', defaultWidth: 85, minWidth: 75, maxWidth: 130 },
    { key: 'qty_return', defaultWidth: 85, minWidth: 75, maxWidth: 130 },
    { key: 'balance', defaultWidth: 105, minWidth: 90, maxWidth: 150 }
  ], []);
  const ledgerResizing = useColumnResizing({
    tableKey: 'modal_ledger',
    columns: ledgerColsConfig
  });

  // 2. Lịch sử nhập kho (Tab 2) - Chiều rộng tối ưu: STT, Ngày, SL, Trạng thái gọn; Kho là cột linh hoạt (isFlex: true) tự co giãn lấp đầy vùng chứa
  const histInColsConfig = useMemo(() => [
    { key: 'stt', defaultWidth: 38, minWidth: 32, maxWidth: 55 },
    { key: 'voucher_no', defaultWidth: 125, minWidth: 105, maxWidth: 180 },
    { key: 'date', defaultWidth: 85, minWidth: 75, maxWidth: 115 },
    { key: 'warehouse', defaultWidth: 140, minWidth: 95, maxWidth: 350, isFlex: true },
    { key: 'qty', defaultWidth: 75, minWidth: 65, maxWidth: 120 },
    { key: 'status', defaultWidth: 90, minWidth: 80, maxWidth: 130 }
  ], []);
  const histInResizing = useColumnResizing({
    tableKey: 'modal_hist_in',
    columns: histInColsConfig,
    containerRef: histInWrapperRef
  });

  // 3. Lịch sử xuất kho (Tab 2) - Chiều rộng tối ưu: STT, Ngày, SL, Trạng thái gọn; Kho là cột linh hoạt (isFlex: true) tự co giãn lấp đầy vùng chứa
  const histOutColsConfig = useMemo(() => [
    { key: 'stt', defaultWidth: 38, minWidth: 32, maxWidth: 55 },
    { key: 'voucher_no', defaultWidth: 125, minWidth: 105, maxWidth: 180 },
    { key: 'date', defaultWidth: 85, minWidth: 75, maxWidth: 115 },
    { key: 'warehouse', defaultWidth: 140, minWidth: 95, maxWidth: 350, isFlex: true },
    { key: 'qty', defaultWidth: 75, minWidth: 65, maxWidth: 120 },
    { key: 'status', defaultWidth: 90, minWidth: 80, maxWidth: 130 }
  ], []);
  const histOutResizing = useColumnResizing({
    tableKey: 'modal_hist_out',
    columns: histOutColsConfig,
    containerRef: histOutWrapperRef
  });

  // 4. Hàng loại / Trả về (Tab 3) - Đúng 8 cột theo yêu cầu: STT, Mã phiếu, Ngày, SL (ĐVC), SL (ĐVCĐ), Thuộc lỗi gì, Thông tin thêm, Kết quả
  const rejColsConfig = useMemo(() => [
    { key: 'stt', defaultWidth: 45, minWidth: 36, maxWidth: 65 },
    { key: 'voucher_no', defaultWidth: 140, minWidth: 120, maxWidth: 220 },
    { key: 'date', defaultWidth: 90, minWidth: 80, maxWidth: 120 },
    { key: 'qty_main', defaultWidth: 105, minWidth: 85, maxWidth: 150 },
    { key: 'qty_conv', defaultWidth: 105, minWidth: 85, maxWidth: 150 },
    { key: 'defect_origin', defaultWidth: 115, minWidth: 100, maxWidth: 150 },
    { key: 'extra_info', defaultWidth: 260, minWidth: 180, maxWidth: 500, isFlex: true },
    { key: 'result', defaultWidth: 120, minWidth: 100, maxWidth: 160 }
  ], []);
  const rejResizing = useColumnResizing({
    tableKey: 'modal_rejected',
    columns: rejColsConfig,
    containerRef: rejWrapperRef
  });

  // Tự động kiểm tra và cân đối kích thước bảng Tab 2 & Tab 3 (Auto-fit 100% container)
  useEffect(() => {
    if (activeTab === 'history') {
      const timer = setTimeout(() => {
        histInResizing.triggerAutoFit();
        histOutResizing.triggerAutoFit();
      }, 50);
      return () => clearTimeout(timer);
    } else if (activeTab === 'rejected') {
      const timer = setTimeout(() => {
        rejResizing.triggerAutoFit();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [activeTab, receiptLines.length, issueLines.length, rejectedLines.length]);

  // Khởi tạo lại bộ lọc khi mở modal hoặc đổi vật tư
  useEffect(() => {
    if (isOpen && material) {
      const defaultRange = getDatePresetRange('THIS_MONTH');
      setTimeFilterMode('THIS_MONTH');
      setFilterFromDate(initialFromDate || defaultRange.fromDate);
      setFilterToDate(initialToDate || defaultRange.toDate);
      setSelectedWarehouse(initialWarehouse || 'ALL');
      setRejSourceType('ALL');
      setRejStatus('ALL');
      setInPage(1);
      setOutPage(1);
      setRejPage(1);
    }
  }, [isOpen, material?.item_code || material?.material_code]);

  // Xử lý thay đổi chế độ thời gian
  const handleTimeFilterModeChange = (mode) => {
    setTimeFilterMode(mode);
    if (mode === 'THIS_MONTH' || mode === 'LAST_MONTH' || mode === 'ALL') {
      const range = getDatePresetRange(mode);
      setFilterFromDate(range.fromDate);
      setFilterToDate(range.toDate);
    }
    setInPage(1);
    setOutPage(1);
    setRejPage(1);
  };

  const handleFromDateChange = (val) => {
    setTimeFilterMode('CUSTOM');
    setFilterFromDate(val);
    setInPage(1);
    setOutPage(1);
    setRejPage(1);
  };

  const handleToDateChange = (val) => {
    setTimeFilterMode('CUSTOM');
    setFilterToDate(val);
    setInPage(1);
    setOutPage(1);
    setRejPage(1);
  };

  const handleResetFilters = () => {
    const range = getDatePresetRange('THREE_DAYS');
    setTimeFilterMode('THREE_DAYS');
    setFilterFromDate(range.fromDate);
    setFilterToDate(range.toDate);
    setSelectedWarehouse('ALL');
    setRejSourceType('ALL');
    setRejStatus('ALL');
    setInPage(1);
    setOutPage(1);
    setRejPage(1);
  };

  // ── 1. TẢI DỮ LIỆU TAB 1: BÁO CÁO XNT & SỔ KHO BIẾN ĐỘNG ──
  useEffect(() => {
    if (!isOpen || !material?.item_code) return;
    let isCancelled = false;
    setLoadingFifo(true);

    (async () => {
      try {
        const rawItems = await warehouseDataService.getRawItems({
          fromDate: filterFromDate,
          toDate: filterToDate
        });

        const cleanCode = String(material.item_code).trim().toLowerCase();
        const matched = rawItems.find(
          (it) => String(it.item_code || it.material_code).trim().toLowerCase() === cleanCode
        ) || material;

        const [fifoRes, ledgerRes] = await Promise.all([
          warehouseFifoService.calculateFifoOverview({
            item: matched,
            warehouseCode: selectedWarehouse,
            asOfDate: filterToDate || '',
            fromDate: filterFromDate || ''
          }),
          warehouseFifoService.getInventoryLedger({
            item: matched,
            warehouseCode: selectedWarehouse,
            fromDate: filterFromDate || '',
            toDate: filterToDate || ''
          })
        ]);

        if (!isCancelled) {
          setFifoData(fifoRes);
          setLedgerData(ledgerRes);
          setLoadingFifo(false);
        }
      } catch (err) {
        console.error('Lỗi tính toán dữ liệu Tab 1:', err);
        if (!isCancelled) setLoadingFifo(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, material?.item_code, selectedWarehouse, filterFromDate, filterToDate]);

  // ── 2. TẢI DỮ LIỆU TAB 2: LỊCH SỬ NHẬP KHO & XUẤT KHO ──
  useEffect(() => {
    if (!isOpen || !material?.item_code) return;
    let isCancelled = false;
    setLoadingHistory(true);

    (async () => {
      try {
        const [rcps, isss] = await Promise.all([
          warehouseFifoService.getReceiptLines({
            itemCode: material.item_code,
            item: material,
            warehouseCode: selectedWarehouse,
            fromDate: filterFromDate,
            toDate: filterToDate
          }),
          warehouseFifoService.getIssueLines({
            itemCode: material.item_code,
            item: material,
            warehouseCode: selectedWarehouse,
            fromDate: filterFromDate,
            toDate: filterToDate
          })
        ]);

        if (!isCancelled) {
          setReceiptLines(rcps || []);
          setIssueLines(isss || []);
          setLoadingHistory(false);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu Tab 2:', err);
        if (!isCancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, material?.item_code, selectedWarehouse, filterFromDate, filterToDate]);

  // ── 3. TẢI DỮ LIỆU TAB 3: DANH SÁCH HÀNG LOẠI & TRẢ VỀ ──
  useEffect(() => {
    if (!isOpen || !material?.item_code) return;
    let isCancelled = false;

    (async () => {
      setLoadingRejected(true);
      try {
        const allRejected = await warehouseDataService.fetchRejectedGoods();
        if (isCancelled) return;
        const cleanCode = String(material.item_code).trim().toLowerCase();

        const filtered = (Array.isArray(allRejected) ? allRejected : []).filter((rg) => {
          if (rg.status === 'CANCELLED' && rejStatus !== 'CANCELLED') return false;
          if (String(rg.item_code).trim().toLowerCase() !== cleanCode) return false;

          // Lọc theo Kho
          if (selectedWarehouse !== 'ALL') {
            const whCode = normalizeWarehouseCode(rg.warehouse_name);
            if (whCode !== selectedWarehouse && rg.warehouse_name !== selectedWarehouse) return false;
          }

          // Lọc theo Nguồn
          if (rejSourceType !== 'ALL' && rg.source_type !== rejSourceType) return false;

          // Lọc theo Trạng thái
          if (rejStatus !== 'ALL' && rg.status !== rejStatus) return false;

          // Lọc theo Ngày phát sinh
          const rDate = rg.created_date || '';
          if (filterFromDate && rDate && rDate < filterFromDate) return false;
          if (filterToDate && rDate && rDate > filterToDate) return false;

          return true;
        });

        filtered.sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));
        setRejectedLines(filtered);
      } catch (err) {
        console.error('Lỗi tải dữ liệu Tab 3:', err);
      } finally {
        if (!isCancelled) setLoadingRejected(false);
      }
    })();

    return () => { isCancelled = true; };
  }, [isOpen, material?.item_code, selectedWarehouse, rejSourceType, rejStatus, filterFromDate, filterToDate]);

  // ── BIỂU ĐỒ 1: TÍNH TOÁN DỮ LIỆU BIỂU ĐỒ COMBO XU HƯỚNG HÀNG LOẠI / TRẢ VỀ ──
  const trendChartData = useMemo(() => {
    if (!rejectedLines || rejectedLines.length === 0) return [];

    const pad = (n) => String(n).padStart(2, '0');
    let isDaily = true;
    let diffDays = 0;

    if (filterFromDate && filterToDate) {
      const start = new Date(filterFromDate);
      const end = new Date(filterToDate);
      diffDays = Math.round((end - start) / 86400000) + 1;
      isDaily = diffDays <= 45;
    } else {
      isDaily = timeFilterMode !== 'ALL';
    }

    const map = {};

    // Khởi tạo các mốc ngày liên tục nếu ở chế độ xem theo ngày trong khoảng thời gian xác định (đảm bảo hiển thị số 0)
    if (isDaily && filterFromDate && filterToDate && diffDays > 0 && diffDays <= 45) {
      const cur = new Date(filterFromDate);
      const end = new Date(filterToDate);
      while (cur <= end) {
        const y = cur.getFullYear();
        const m = pad(cur.getMonth() + 1);
        const d = pad(cur.getDate());
        const key = `${y}-${m}-${d}`;
        map[key] = {
          key,
          timeLabel: `${d}/${m}`,
          prod_defect_qty: 0,
          supplier_defect_qty: 0,
          returned_qty: 0
        };
        cur.setDate(cur.getDate() + 1);
      }
    }

    rejectedLines.forEach((r) => {
      const dStr = (r.created_date || '').split('T')[0];
      if (!dStr) return;
      let key = '';
      let label = '';

      if (isDaily) {
        key = dStr;
        const parts = dStr.split('-');
        label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dStr;
      } else {
        key = dStr.slice(0, 7);
        const parts = key.split('-');
        label = parts.length === 2 ? `T${parts[1]}/${parts[0].slice(2)}` : key;
      }

      if (!map[key]) {
        map[key] = {
          key,
          timeLabel: label,
          prod_defect_qty: 0,
          supplier_defect_qty: 0,
          returned_qty: 0
        };
      }

      const qReject = Number(r.rejected_quantity !== undefined ? r.rejected_quantity : r.quantity_main || 0);
      const qReturn = Number(
        r.returned_quantity !== undefined
          ? r.returned_quantity
          : (r.resolution === 'RETURN_SUPPLIER' || r.source_type === 'PROD_RETURN' ? r.quantity_main : 0)
      );

      const isProd = r.defect_origin === 'production' || r.source_type === 'PROD_RETURN';
      const isSupplier = r.defect_origin === 'supplier' || r.source_type === 'QC_INCOMING';

      if (isProd) {
        map[key].prod_defect_qty = Math.round((map[key].prod_defect_qty + qReject) * 10) / 10;
      } else if (isSupplier) {
        map[key].supplier_defect_qty = Math.round((map[key].supplier_defect_qty + qReject) * 10) / 10;
      } else {
        map[key].prod_defect_qty = Math.round((map[key].prod_defect_qty + qReject) * 10) / 10;
      }

      map[key].returned_qty = Math.round((map[key].returned_qty + qReturn) * 10) / 10;
    });

    return Object.keys(map).sort().map((k) => map[k]);
  }, [rejectedLines, timeFilterMode, filterFromDate, filterToDate]);

  // ── BIỂU ĐỒ 2: TÍNH TOÁN PARETO NGUYÊN NHÂN LỖI 80/20 (PARETO CHART) ──
  const paretoChartData = useMemo(() => {
    if (!rejectedLines || rejectedLines.length === 0) return [];

    const map = {};
    let totalQty = 0;

    rejectedLines.forEach((r) => {
      const cat = r.defect_category || r.defect_reason || 'Lỗi quy cách';
      const q = Number(r.quantity_main || 0);
      map[cat] = (map[cat] || 0) + q;
      totalQty += q;
    });

    const sorted = Object.keys(map)
      .map((name) => ({ name, qty: Math.round(map[name] * 10) / 10 }))
      .sort((a, b) => b.qty - a.qty);

    let running = 0;
    return sorted.map((item) => {
      running += item.qty;
      const pct = totalQty > 0 ? (item.qty / totalQty) * 100 : 0;
      const cumPct = totalQty > 0 ? (running / totalQty) * 100 : 0;
      return {
        name: item.name,
        shortName: item.name.length > 15 ? item.name.slice(0, 14) + '…' : item.name,
        qty: item.qty,
        percentage: Math.round(pct * 10) / 10,
        cumPercentage: Math.min(100, Math.round(cumPct * 10) / 10)
      };
    });
  }, [rejectedLines]);

  // Tooltip tùy chỉnh cho Biểu đồ Combo (Lỗi SX, Lỗi NCC, Hàng trả về)
  const CustomComboTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const prodVal = Number(payload.find((p) => p.dataKey === 'prod_defect_qty')?.value || 0);
    const suppVal = Number(payload.find((p) => p.dataKey === 'supplier_defect_qty')?.value || 0);
    const retVal = Number(payload.find((p) => p.dataKey === 'returned_qty')?.value || 0);
    const unit = material?.unit_main || 'ĐVC';

    return (
      <div
        style={{
          backgroundColor: '#2D1A12',
          color: '#FFFFFF',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.78rem',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
          border: '1px solid #5D4037'
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 5,
            borderBottom: '1px solid #5D4037',
            paddingBottom: 3,
            color: '#FAF6F0'
          }}
        >
          Ngày: {label}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FDE68A', marginBottom: 2 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#C58A4B', borderRadius: 2 }} />
          <span>Lỗi sản xuất: <strong>{formatNumber(prodVal)}</strong> {unit}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#93C5FD', marginBottom: 2 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#2563EB', borderRadius: 2 }} />
          <span>Lỗi nhà cung cấp: <strong>{formatNumber(suppVal)}</strong> {unit}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EADCC9', marginTop: 2 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, backgroundColor: '#5B3924', borderRadius: '50%' }} />
          <span>Hàng trả về: <strong>{formatNumber(retVal)}</strong> {unit}</span>
        </div>
      </div>
    );
  };

  // Tooltip tùy chỉnh cho Biểu đồ Pareto
  const CustomParetoTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;
    const unit = material?.unit_main || 'ĐVC';

    return (
      <div
        style={{
          backgroundColor: '#2D1A12',
          color: '#FFFFFF',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.78rem',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
          border: '1px solid #5D4037',
          maxWidth: 240
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 5,
            borderBottom: '1px solid #5D4037',
            paddingBottom: 3,
            color: '#FAF6F0',
            wordBreak: 'break-word'
          }}
        >
          {data.name}
        </div>
        <div style={{ color: '#EADCC9', marginBottom: 2 }}>
          Số lượng lỗi: <strong style={{ color: '#FFFFFF' }}>{formatNumber(data.qty)}</strong> {unit}
        </div>
        <div style={{ color: '#FDE68A', marginBottom: 2 }}>
          Tỷ trọng nhóm: <strong>{data.percentage}%</strong>
        </div>
        <div style={{ color: '#FCA5A5', fontWeight: 700, marginTop: 3 }}>
          Tỷ lệ lũy kế: <strong>{data.cumPercentage}%</strong>
        </div>
      </div>
    );
  };

  // Mở chi tiết phiếu nhập
  const handleOpenReceiptDetail = async (voucherNo, voucherId) => {
    try {
      const receipts = await goodsReceiptService.getReceipts();
      const found = receipts.find(
        (r) => r.voucher_no === voucherNo || String(r.id) === String(voucherId)
      );
      if (found) {
        setSelectedReceipt(found);
      }
    } catch (e) {
      console.warn('Lỗi tìm phiếu nhập:', e);
    }
  };

  // Mở chi tiết phiếu xuất
  const handleOpenIssueDetail = async (voucherNo, voucherId) => {
    try {
      const issues = await goodsIssueService.getIssues();
      const found = issues.find(
        (i) => i.voucher_no === voucherNo || String(i.id) === String(voucherId)
      );
      if (found) {
        setSelectedIssue(found);
      }
    } catch (e) {
      console.warn('Lỗi tìm phiếu xuất:', e);
    }
  };

  // Phân trang Tab 2: Nhập kho
  const sortedReceipts = useMemo(() => {
    const list = [...receiptLines];
    list.sort((a, b) => {
      const cmp = String(b.receipt_date || b.date || '').localeCompare(String(a.receipt_date || a.date || ''));
      if (cmp !== 0) return cmp;
      return String(b.voucher_no || '').localeCompare(String(a.voucher_no || ''));
    });
    return list;
  }, [receiptLines]);

  const totalInPages = Math.max(1, Math.ceil(sortedReceipts.length / histPageSize));
  const paginatedReceipts = useMemo(() => {
    const start = (inPage - 1) * histPageSize;
    return sortedReceipts.slice(start, start + histPageSize);
  }, [sortedReceipts, inPage, histPageSize]);

  // Phân trang Tab 2: Xuất kho
  const sortedIssues = useMemo(() => {
    const list = [...issueLines];
    list.sort((a, b) => {
      const cmp = String(b.issue_date || b.date || '').localeCompare(String(a.issue_date || a.date || ''));
      if (cmp !== 0) return cmp;
      return String(b.voucher_no || '').localeCompare(String(a.voucher_no || ''));
    });
    return list;
  }, [issueLines]);

  const totalOutPages = Math.max(1, Math.ceil(sortedIssues.length / histPageSize));
  const paginatedIssues = useMemo(() => {
    const start = (outPage - 1) * histPageSize;
    return sortedIssues.slice(start, start + histPageSize);
  }, [sortedIssues, outPage, histPageSize]);

  // Phân trang Tab 3: Hàng loại
  const totalRejPages = Math.max(1, Math.ceil(rejectedLines.length / rejPageSize));
  const paginatedRejLines = useMemo(() => {
    const start = (rejPage - 1) * rejPageSize;
    return rejectedLines.slice(start, start + rejPageSize);
  }, [rejectedLines, rejPage, rejPageSize]);

  if (!isOpen || !material) return null;

  const currentWarehouseName = getWarehouseDisplayName(selectedWarehouse);

  const resolvedInventoryDays = fifoData?.inventory_days !== undefined
    ? fifoData.inventory_days
    : material.inventory_days;

  const isClosingZero = (fifoData?.closing_main ?? material.closing_main) <= 0;

  // Thanh bộ lọc dùng chung cho Tab 1 & Tab 2
  const renderSharedFilterBar = (extra = null) => (
    <div className="wh-hist-filter-card">
      <div className="wh-hist-filter-row">
        <div className="wh-hist-filter-item">
          <label>Kho:</label>
          <select
            value={selectedWarehouse}
            onChange={(e) => {
              setSelectedWarehouse(e.target.value);
              setInPage(1);
              setOutPage(1);
              setRejPage(1);
            }}
            className="wh-hist-select"
          >
            {WAREHOUSE_TABS.map((w) => (
              <option key={w.code} value={w.code}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div className="wh-hist-filter-item">
          <label>Thời gian:</label>
          <select
            value={timeFilterMode}
            onChange={(e) => handleTimeFilterModeChange(e.target.value)}
            className="wh-hist-select"
            style={{ fontWeight: 600, color: '#4E342E' }}
          >
            <option value="THREE_DAYS">3 ngày gần nhất</option>
            <option value="TODAY">Hôm nay</option>
            <option value="THIS_WEEK">Tuần này</option>
            <option value="THIS_MONTH">Tháng này</option>
            <option value="LAST_MONTH">Tháng trước</option>
            <option value="CUSTOM">Tùy chọn</option>
            <option value="ALL">Tất cả lịch sử</option>
          </select>
        </div>

        <div className="wh-hist-filter-item">
          <label>Từ ngày:</label>
          <input
            type="date"
            value={filterFromDate}
            onChange={(e) => handleFromDateChange(e.target.value)}
            className="wh-hist-date"
          />
        </div>

        <div className="wh-hist-filter-item">
          <label>Đến ngày:</label>
          <input
            type="date"
            value={filterToDate}
            onChange={(e) => handleToDateChange(e.target.value)}
            className="wh-hist-date"
          />
        </div>

        {extra}

        <button
          type="button"
          onClick={handleResetFilters}
          className="wh-hist-reset-icon-btn"
          title="Đặt lại bộ lọc"
          aria-label="Đặt lại bộ lọc"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );

  return createPortal(
    <div className="wh-material-dialog-overlay" onClick={onClose}>
      <div
        className="wh-material-dialog-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-detail-title"
      >
        {/* ── HEADER CỐ ĐỊNH ── */}
        <div className="wh-material-dialog-header">
          <div className="wh-material-dialog-title-area">
            <h2 id="material-detail-title" className="wh-material-dialog-title">
              Chi tiết vật tư – {material.item_code}
            </h2>
            <div className="wh-material-dialog-subtitle">
              {material.item_name}
            </div>
          </div>
          <button
            type="button"
            className="wh-material-close-btn"
            onClick={onClose}
            title="Đóng popup (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── THANH TAB CỐ ĐỊNH (3 TAB) ── */}
        <div className="wh-material-dialog-nav">
          <button
            type="button"
            className={`wh-material-nav-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Tổng quan xuất nhập tồn
          </button>
          <button
            type="button"
            className={`wh-material-nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Lịch sử nhập xuất kho
          </button>
          <button
            type="button"
            className={`wh-material-nav-btn ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            Hàng loại / Trả về
          </button>
        </div>

        {/* ── KHU VỰC NỘI DUNG CUỘN (CHỈ KHU VỰC NÀY ĐƯỢC CUỘN) ── */}
        <div className="wh-material-dialog-body">
          {activeTab === 'overview' ? (
            /* ════════════════ TAB 1: TỔNG QUAN XUẤT NHẬP TỒN ════════════════ */
            <>
              {/* 1. Bộ lọc thời gian & kho đồng bộ Tab 1 */}
              {renderSharedFilterBar()}

              {/* 2. Báo cáo Xuất - Nhập - Tồn kỳ hiện tại (Header 2 cấp cố định Sticky) */}
              <div className="wh-mat-section wh-mat-section-summary">
                <div className="wh-mat-section-header">
                  <h3 className="wh-mat-section-title">
                    Báo cáo Xuất – Nhập – Tồn kỳ hiện tại
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.84rem' }}>
                    <span>
                      <span style={{ color: '#8D6E63', fontWeight: 500 }}>Đơn vị chính:</span>{' '}
                      <strong style={{ color: '#2D1A12', fontWeight: 600 }}>{material.unit_main || '—'}</strong>
                    </span>
                    <span style={{ color: '#D7CCC8', userSelect: 'none' }}>|</span>
                    <span>
                      <span style={{ color: '#8D6E63', fontWeight: 500 }}>Đơn vị chuyển đổi:</span>{' '}
                      <strong style={{ color: '#2D1A12', fontWeight: 600 }}>{material.unit_conversion || '—'}</strong>
                    </span>
                  </div>
                </div>

                <div className="wh-mat-table-wrapper wh-mat-summary-wrapper">
                  <table className="wh-table-2level">
                    <colgroup>
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '9%' }} />
                      <col style={{ width: '10%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th colSpan={2} style={{ textAlign: 'center' }}>Tồn đầu kỳ</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>Nhập trong kỳ</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>Xuất trong kỳ</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>Tồn cuối kỳ</th>
                        <th colSpan={2} style={{ textAlign: 'center' }}>Hàng trả về</th>
                        <th rowSpan={2} style={{ textAlign: 'right', width: '130px' }}>Thời gian tồn</th>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'right' }}>ĐVC</th>
                        <th style={{ textAlign: 'right' }}>ĐVCĐ</th>
                        <th style={{ textAlign: 'right' }}>ĐVC</th>
                        <th style={{ textAlign: 'right' }}>ĐVCĐ</th>
                        <th style={{ textAlign: 'right' }}>ĐVC</th>
                        <th style={{ textAlign: 'right' }}>ĐVCĐ</th>
                        <th style={{ textAlign: 'right' }}>ĐVC</th>
                        <th style={{ textAlign: 'right' }}>ĐVCĐ</th>
                        <th style={{ textAlign: 'right' }}>ĐVC</th>
                        <th style={{ textAlign: 'right' }}>ĐVCĐ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingFifo ? (
                        <tr>
                          <td colSpan={11} style={{ textAlign: 'center', padding: '24px 0', color: '#8D6E63' }}>
                            Đang tính toán xuất nhập tồn và phân bổ FIFO...
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td style={{ textAlign: 'right' }}>{formatNumber(fifoData?.opening_main ?? material.opening_main)}</td>
                          <td style={{ textAlign: 'right', color: '#64748B' }}>{formatNumber(fifoData?.opening_conv ?? material.opening_conv)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(fifoData?.in_main ?? material.in_main)}</td>
                          <td style={{ textAlign: 'right', color: '#64748B' }}>{formatNumber(fifoData?.in_conv ?? material.in_conv)}</td>
                          <td style={{ textAlign: 'right' }}>{formatNumber(fifoData?.out_main ?? material.out_main)}</td>
                          <td style={{ textAlign: 'right', color: '#64748B' }}>{formatNumber(fifoData?.out_conv ?? material.out_conv)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#2D1A12' }}>
                            {formatNumber(fifoData?.closing_main ?? material.closing_main)}
                          </td>
                          <td style={{ textAlign: 'right', color: '#64748B' }}>
                            {formatNumber(fifoData?.closing_conv ?? material.closing_conv)}
                          </td>
                          <td style={{ textAlign: 'right', color: Number(fifoData?.return_main ?? material.return_main) > 0 ? '#B45309' : '#8D6E63', fontWeight: Number(fifoData?.return_main ?? material.return_main) > 0 ? 600 : 400 }}>
                            {Number(fifoData?.return_main ?? material.return_main) > 0 ? formatNumber(fifoData?.return_main ?? material.return_main) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', color: Number(fifoData?.return_conv ?? material.return_conv) > 0 ? '#B45309' : '#8D6E63' }}>
                            {Number(fifoData?.return_conv ?? material.return_conv) > 0 ? formatNumber(fifoData?.return_conv ?? material.return_conv) : '—'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>
                            {resolvedInventoryDays === 'Chưa xác định' ? (
                              <span className="wh-fifo-badge-unresolved" title="Không đủ lịch sử lô để xác định ngày nhập gốc">
                                Chưa xác định
                              </span>
                            ) : isClosingZero ? (
                              <span className="wh-fifo-badge-zero">0 ngày</span>
                            ) : (
                              <span className="wh-fifo-badge-days">
                                {resolvedInventoryDays} ngày
                              </span>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'history' ? (
            /* ════════════════ TAB 2: LỊCH SỬ NHẬP XUẤT KHO (2 BẢNG SONG SONG) ════════════════ */
            <>
              {/* Bộ lọc dùng chung Tab 2 */}
              {renderSharedFilterBar()}

              {/* Bố cục 2 bảng song song: Nhập kho & Xuất kho */}
              <div className="wh-hist-two-tables-container" style={{ marginTop: 8 }}>
                {/* 1. BẢNG BÊN TRÁI: LỊCH SỬ NHẬP KHO */}
                <div className="wh-hist-col-card">
                  <div className="wh-hist-col-header">
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#2D1A12' }}>
                      Lịch sử nhập kho ({receiptLines.length})
                    </h4>
                  </div>

                  <div className="wh-hist-table-wrapper" ref={histInWrapperRef}>
                    <table className="wh-table-1level" ref={histInTableRef}>
                      <colgroup>
                        <col style={{ width: `${histInResizing.colWidths.stt}px` }} />
                        <col style={{ width: `${histInResizing.colWidths.voucher_no}px` }} />
                        <col style={{ width: `${histInResizing.colWidths.date}px` }} />
                        <col style={{ width: `${histInResizing.colWidths.warehouse}px` }} />
                        <col style={{ width: `${histInResizing.colWidths.qty}px` }} />
                        <col style={{ width: `${histInResizing.colWidths.status}px` }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                            STT
                            <div
                              className={`wh-col-resizer ${histInResizing.resizingCol === 'stt' ? 'active' : ''}`}
                              onPointerDown={(e) => histInResizing.startResize('stt', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'left' }}>
                            Số phiếu nhập
                            <div
                              className={`wh-col-resizer ${histInResizing.resizingCol === 'voucher_no' ? 'active' : ''}`}
                              onPointerDown={(e) => histInResizing.startResize('voucher_no', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                            Ngày nhập
                            <div
                              className={`wh-col-resizer ${histInResizing.resizingCol === 'date' ? 'active' : ''}`}
                              onPointerDown={(e) => histInResizing.startResize('date', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'left' }}>
                            Kho nhập
                            <div
                              className={`wh-col-resizer ${histInResizing.resizingCol === 'warehouse' ? 'active' : ''}`}
                              onPointerDown={(e) => histInResizing.startResize('warehouse', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'right' }}>
                            Số lượng
                            <div
                              className={`wh-col-resizer ${histInResizing.resizingCol === 'qty' ? 'active' : ''}`}
                              onPointerDown={(e) => histInResizing.startResize('qty', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                            Trạng thái
                            <div
                              className={`wh-col-resizer ${histInResizing.resizingCol === 'status' ? 'active' : ''}`}
                              onPointerDown={(e) => histInResizing.startResize('status', e)}
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingHistory ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: '#8D6E63' }}>
                              Đang tải lịch sử nhập kho...
                            </td>
                          </tr>
                        ) : receiptLines.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: '#8D6E63' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <AlertCircle size={20} color="#D5C3B2" />
                                <span>Không có chứng từ nhập kho nào trong kỳ.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedReceipts.map((r, idx) => (
                            <tr key={r.line_id || r.id || idx}>
                              <td style={{ textAlign: 'center', color: '#8D6E63' }}>
                                {(inPage - 1) * histPageSize + idx + 1}
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <button
                                  type="button"
                                  className="wh-voucher-link-btn"
                                  onClick={() => handleOpenReceiptDetail(r.voucher_no, r.voucher_id)}
                                  title={`Xem chi tiết ${r.voucher_no}`}
                                >
                                  {r.voucher_no}
                                </button>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {formatDateVN(r.receipt_date || r.date)}
                              </td>
                              <td style={{ textAlign: 'left', color: '#4B5563' }} title={r.warehouse_name}>
                                <div className="wh-cell-ellipsis">{r.warehouse_name}</div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>
                                {formatNumber(r.quantity_main || r.quantity)}
                              </td>
                              <td className="wh-cell-status">
                                <div className="wh-cell-status-inner">
                                  {(() => {
                                    const st = getVoucherStatusInfo(r.status, 'IN');
                                    return (
                                      <span
                                        className={`wh-status-badge ${st.className}`}
                                        style={{
                                          backgroundColor: st.bg,
                                          color: st.color,
                                          borderColor: st.border,
                                          border: `1px solid ${st.border}`
                                        }}
                                      >
                                        {st.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Phân trang Bảng Nhập kho */}
                  <div className="wh-sub-pagination">
                    <span>
                      {receiptLines.length > 0
                        ? `${(inPage - 1) * histPageSize + 1} - ${Math.min(receiptLines.length, inPage * histPageSize)} trên ${receiptLines.length}`
                        : '0 chứng từ'}
                    </span>
                    {receiptLines.length > histPageSize && (
                      <div className="wh-sub-pagination-btns">
                        <button
                          type="button"
                          disabled={inPage <= 1}
                          onClick={() => setInPage((p) => Math.max(1, p - 1))}
                          className="wh-sub-pg-btn"
                        >
                          Trước
                        </button>
                        <span className="wh-sub-pg-indicator">{inPage} / {totalInPages}</span>
                        <button
                          type="button"
                          disabled={inPage >= totalInPages}
                          onClick={() => setInPage((p) => Math.min(totalInPages, p + 1))}
                          className="wh-sub-pg-btn"
                        >
                          Sau
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. BẢNG BÊN PHẢI: LỊCH SỬ XUẤT KHO */}
                <div className="wh-hist-col-card">
                  <div className="wh-hist-col-header">
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#2D1A12' }}>
                      Lịch sử xuất kho ({issueLines.length})
                    </h4>
                  </div>

                  <div className="wh-hist-table-wrapper" ref={histOutWrapperRef}>
                    <table className="wh-table-1level" ref={histOutTableRef}>
                      <colgroup>
                        <col style={{ width: `${histOutResizing.colWidths.stt}px` }} />
                        <col style={{ width: `${histOutResizing.colWidths.voucher_no}px` }} />
                        <col style={{ width: `${histOutResizing.colWidths.date}px` }} />
                        <col style={{ width: `${histOutResizing.colWidths.warehouse}px` }} />
                        <col style={{ width: `${histOutResizing.colWidths.qty}px` }} />
                        <col style={{ width: `${histOutResizing.colWidths.status}px` }} />
                      </colgroup>
                      <thead>
                        <tr>
                          <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                            STT
                            <div
                              className={`wh-col-resizer ${histOutResizing.resizingCol === 'stt' ? 'active' : ''}`}
                              onPointerDown={(e) => histOutResizing.startResize('stt', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'left' }}>
                            Số phiếu xuất
                            <div
                              className={`wh-col-resizer ${histOutResizing.resizingCol === 'voucher_no' ? 'active' : ''}`}
                              onPointerDown={(e) => histOutResizing.startResize('voucher_no', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                            Ngày xuất
                            <div
                              className={`wh-col-resizer ${histOutResizing.resizingCol === 'date' ? 'active' : ''}`}
                              onPointerDown={(e) => histOutResizing.startResize('date', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'left' }}>
                            Kho xuất
                            <div
                              className={`wh-col-resizer ${histOutResizing.resizingCol === 'warehouse' ? 'active' : ''}`}
                              onPointerDown={(e) => histOutResizing.startResize('warehouse', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'right' }}>
                            Số lượng
                            <div
                              className={`wh-col-resizer ${histOutResizing.resizingCol === 'qty' ? 'active' : ''}`}
                              onPointerDown={(e) => histOutResizing.startResize('qty', e)}
                            />
                          </th>
                          <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                            Trạng thái
                            <div
                              className={`wh-col-resizer ${histOutResizing.resizingCol === 'status' ? 'active' : ''}`}
                              onPointerDown={(e) => histOutResizing.startResize('status', e)}
                            />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingHistory ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: '#8D6E63' }}>
                              Đang tải lịch sử xuất kho...
                            </td>
                          </tr>
                        ) : issueLines.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px 0', color: '#8D6E63' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <AlertCircle size={20} color="#D5C3B2" />
                                <span>Không có chứng từ xuất kho nào trong kỳ.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          paginatedIssues.map((iss, idx) => (
                            <tr key={iss.line_id || iss.id || idx}>
                              <td style={{ textAlign: 'center', color: '#8D6E63' }}>
                                {(outPage - 1) * histPageSize + idx + 1}
                              </td>
                              <td style={{ textAlign: 'left' }}>
                                <button
                                  type="button"
                                  className="wh-voucher-link-btn"
                                  onClick={() => handleOpenIssueDetail(iss.voucher_no, iss.voucher_id)}
                                  title={`Xem chi tiết ${iss.voucher_no}`}
                                >
                                  {iss.voucher_no}
                                </button>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                {formatDateVN(iss.issue_date || iss.date)}
                              </td>
                              <td style={{ textAlign: 'left', color: '#4B5563' }} title={iss.warehouse_name}>
                                <div className="wh-cell-ellipsis">{iss.warehouse_name}</div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>
                                {formatNumber(iss.quantity_main || iss.quantity)}
                              </td>
                              <td className="wh-cell-status">
                                <div className="wh-cell-status-inner">
                                  {(() => {
                                    const st = getVoucherStatusInfo(iss.status, 'OUT');
                                    return (
                                      <span
                                        className={`wh-status-badge ${st.className}`}
                                        style={{
                                          backgroundColor: st.bg,
                                          color: st.color,
                                          borderColor: st.border,
                                          border: `1px solid ${st.border}`
                                        }}
                                      >
                                        {st.label}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Phân trang Bảng Xuất kho */}
                  <div className="wh-sub-pagination">
                    <span>
                      {issueLines.length > 0
                        ? `${(outPage - 1) * histPageSize + 1} - ${Math.min(issueLines.length, outPage * histPageSize)} trên ${issueLines.length}`
                        : '0 chứng từ'}
                    </span>
                    {issueLines.length > histPageSize && (
                      <div className="wh-sub-pagination-btns">
                        <button
                          type="button"
                          disabled={outPage <= 1}
                          onClick={() => setOutPage((p) => Math.max(1, p - 1))}
                          className="wh-sub-pg-btn"
                        >
                          Trước
                        </button>
                        <span className="wh-sub-pg-indicator">{outPage} / {totalOutPages}</span>
                        <button
                          type="button"
                          disabled={outPage >= totalOutPages}
                          onClick={() => setOutPage((p) => Math.min(totalOutPages, p + 1))}
                          className="wh-sub-pg-btn"
                        >
                          Sau
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ════════════════ TAB 3: HÀNG LOẠI / TRẢ VỀ & 2 BIỂU ĐỒ ════════════════ */
            <>
              {/* 1. Bộ lọc Tab 3 (Bao gồm Kho, Thời gian, Nguồn, Trạng thái) */}
              {renderSharedFilterBar(
                <>
                  <div className="wh-hist-filter-item">
                    <label>Nguồn:</label>
                    <select
                      value={rejSourceType}
                      onChange={(e) => {
                        setRejSourceType(e.target.value);
                        setRejPage(1);
                      }}
                      className="wh-hist-select"
                    >
                      <option value="ALL">Tất cả nguồn</option>
                      <option value="QC_INCOMING">QC kiểm tra đầu vào</option>
                      <option value="PROD_RETURN">Sản xuất trả về</option>
                    </select>
                  </div>

                  <div className="wh-hist-filter-item">
                    <label>Trạng thái:</label>
                    <select
                      value={rejStatus}
                      onChange={(e) => {
                        setRejStatus(e.target.value);
                        setRejPage(1);
                      }}
                      className="wh-hist-select"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="PENDING">Chờ xử lý</option>
                      <option value="IN_PROGRESS">Đang xử lý</option>
                      <option value="RESOLVED">Đã giải quyết</option>
                      <option value="CANCELLED">Đã hủy</option>
                    </select>
                  </div>
                </>
              )}

              {/* 2. HAI BIỂU ĐỒ NẰM NGANG: XU HƯỚNG & PARETO */}
              <div className="wh-rej-charts-grid">
                {/* BIỂU ĐỒ 1: XU HƯỚNG HÀNG LOẠI / TRẢ VỀ */}
                <div className="wh-rej-chart-card">
                  <div className="wh-rej-chart-header">
                    <h4 className="wh-rej-chart-title">Xu hướng hàng loại / Trả về</h4>
                  </div>
                  <div className="wh-rej-chart-body">
                    {trendChartData.length === 0 ? (
                      <div className="wh-rej-chart-empty">
                        <AlertCircle size={18} color="#D5C7B7" />
                        <span>Không có phát sinh hàng loại trong kỳ đã chọn</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendChartData} margin={{ top: 12, right: 16, bottom: 20, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" vertical={false} />
                          <XAxis
                            dataKey="timeLabel"
                            tick={{ fontSize: 10, fill: '#6D4C41' }}
                            interval={trendChartData.length > 14 ? Math.ceil(trendChartData.length / 10) : 0}
                            height={24}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#6D4C41' }}
                            domain={[0, 'auto']}
                            allowDecimals={false}
                          />
                          <RechartsTooltip content={<CustomComboTooltip />} />
                          <RechartsLegend
                            wrapperStyle={{ fontSize: '0.74rem', paddingTop: '2px', color: '#5D4037' }}
                            iconSize={8}
                          />
                          {/* Cột 1: Lỗi sản xuất - Grouped side-by-side (NO stackId), terracotta/earth orange #C58A4B */}
                          <Bar
                            dataKey="prod_defect_qty"
                            name="Lỗi sản xuất"
                            fill="#C58A4B"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={20}
                          />
                          {/* Cột 2: Lỗi nhà cung cấp - Grouped side-by-side (NO stackId), blue #2563EB */}
                          <Bar
                            dataKey="supplier_defect_qty"
                            name="Lỗi nhà cung cấp"
                            fill="#2563EB"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={20}
                          />
                          {/* Đường Line: Hàng trả về - dark brown #5B3924, dot nhỏ */}
                          <Line
                            type="monotone"
                            dataKey="returned_qty"
                            name="Hàng trả về"
                            stroke="#5B3924"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#5B3924' }}
                            activeDot={{ r: 5, fill: '#5B3924' }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* BIỂU ĐỒ 2: PARETO NGUYÊN NHÂN HÀNG LOẠI */}
                <div className="wh-rej-chart-card">
                  <div className="wh-rej-chart-header">
                    <h4 className="wh-rej-chart-title">Pareto nguyên nhân hàng loại</h4>
                  </div>
                  <div className="wh-rej-chart-body">
                    {paretoChartData.length === 0 ? (
                      <div className="wh-rej-chart-empty">
                        <AlertCircle size={18} color="#D5C7B7" />
                        <span>Không có dữ liệu lỗi để phân tích Pareto</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={paretoChartData} margin={{ top: 8, right: 26, bottom: 24, left: -12 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0E6D8" vertical={false} />
                          <XAxis
                            dataKey="shortName"
                            tick={{ fontSize: 10, fill: '#6D4C41' }}
                            interval={0}
                            angle={-18}
                            textAnchor="end"
                            height={34}
                          />
                          <YAxis
                            yAxisId="left"
                            tick={{ fontSize: 10, fill: '#6D4C41' }}
                            domain={[0, 'auto']}
                            allowDecimals={false}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            domain={[0, 100]}
                            ticks={[0, 20, 40, 60, 80, 100]}
                            tick={{ fontSize: 10, fill: '#DC2626', fontWeight: 600 }}
                            unit="%"
                          />
                          <RechartsTooltip content={<CustomParetoTooltip />} />
                          <ReferenceLine
                            y={80}
                            yAxisId="right"
                            stroke="#DC2626"
                            strokeDasharray="3 3"
                            strokeWidth={1.2}
                            label={{ value: '80%', fill: '#DC2626', fontSize: 10, position: 'right' }}
                          />
                          <Bar
                            yAxisId="left"
                            dataKey="qty"
                            name="Số lượng (ĐVC)"
                            fill="#7B5233"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={32}
                          >
                            {paretoChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#5D4037' : '#7B5233'} />
                            ))}
                          </Bar>
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="cumPercentage"
                            name="Lũy kế %"
                            stroke="#DC2626"
                            strokeWidth={2}
                            dot={{ r: 3, fill: '#DC2626' }}
                            activeDot={{ r: 5 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. BẢNG DANH SÁCH HÀNG LOẠI / TRẢ VỀ (Tự giãn hết chiều cao, Sticky Header) */}
              <div
                className="wh-mat-section wh-mat-section-fill wh-rej-list-section"
                style={{ marginTop: 4 }}
              >
                <div className="wh-mat-section-header">
                  <h3 className="wh-mat-section-title">
                    Danh sách phát sinh hàng loại &amp; trả về ({rejectedLines.length} phiếu)
                  </h3>
                </div>

                <div
                  ref={rejWrapperRef}
                  className="wh-mat-table-wrapper wh-mat-table-wrapper-fill"
                >
                  <table
                    ref={rejTableRef}
                    className="wh-table-1level"
                    style={{
                      width: '100%',
                      height: rejectedLines.length === 0 || loadingRejected ? '100%' : 'auto',
                    }}
                  >
                    <colgroup>
                      <col style={{ width: `${rejResizing.colWidths.stt}px` }} />
                      <col style={{ width: `${rejResizing.colWidths.voucher_no}px` }} />
                      <col style={{ width: `${rejResizing.colWidths.date}px` }} />
                      <col style={{ width: `${rejResizing.colWidths.qty_main}px` }} />
                      <col style={{ width: `${rejResizing.colWidths.qty_conv}px` }} />
                      <col style={{ width: `${rejResizing.colWidths.defect_origin}px` }} />
                      <col style={{ width: `${rejResizing.colWidths.extra_info}px` }} />
                      <col style={{ width: `${rejResizing.colWidths.result}px` }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                          STT
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'stt' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('stt', e)}
                          />
                        </th>
                        <th className="wh-th-resizable" style={{ textAlign: 'left' }}>
                          Mã phiếu
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'voucher_no' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('voucher_no', e)}
                          />
                        </th>
                        <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                          Ngày
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'date' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('date', e)}
                          />
                        </th>
                        <th className="wh-th-resizable" style={{ textAlign: 'right' }}>
                          SL (ĐVC)
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'qty_main' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('qty_main', e)}
                          />
                        </th>
                        <th className="wh-th-resizable" style={{ textAlign: 'right' }}>
                          SL (ĐVCĐ)
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'qty_conv' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('qty_conv', e)}
                          />
                        </th>
                        <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                          Thuộc lỗi gì
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'defect_origin' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('defect_origin', e)}
                          />
                        </th>
                        <th className="wh-th-resizable" style={{ textAlign: 'left' }}>
                          Thông tin thêm
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'extra_info' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('extra_info', e)}
                          />
                        </th>
                        <th className="wh-th-resizable" style={{ textAlign: 'center' }}>
                          Kết quả
                          <div
                            className={`wh-col-resizer ${rejResizing.resizingCol === 'result' ? 'active' : ''}`}
                            onPointerDown={(e) => rejResizing.startResize('result', e)}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingRejected ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', verticalAlign: 'middle', height: '100%', padding: '36px 0', color: '#8D6E63' }}>
                            <div className="wh-rej-empty-body">
                              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Đang tải danh sách hàng loại / trả về...</span>
                            </div>
                          </td>
                        </tr>
                      ) : rejectedLines.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            style={{
                              textAlign: 'center',
                              verticalAlign: 'middle',
                              height: '100%',
                              padding: '36px 16px',
                              color: '#8D6E63',
                              backgroundColor: '#FFFFFF',
                              borderBottom: 'none'
                            }}
                          >
                            <div className="wh-rej-empty-body">
                              <AlertCircle size={28} color="#D5C3B2" />
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#8D6E63' }}>
                                Không có phát sinh trong kỳ đã chọn
                              </span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rejectedLines.map((rej, rIdx) => {
                          const isSupplier = rej.defect_origin === 'supplier' || rej.source_type === 'QC_INCOMING';
                          const originLabel = isSupplier ? 'Nhà cung cấp' : 'Sản xuất';
                          const originBadgeStyle = isSupplier
                            ? { backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }
                            : { backgroundColor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' };

                          const extraInfo = rej.defect_category || rej.defect_reason || rej.notes || '—';
                          const tooltipText = rej.defect_reason
                            ? (rej.defect_category && rej.defect_category !== rej.defect_reason
                                ? `${rej.defect_category}: ${rej.defect_reason}`
                                : rej.defect_reason)
                            : extraInfo;

                          const resInfo = getRejectedResultInfo(rej);

                          return (
                            <tr key={rej.id || rIdx}>
                              {/* 1. STT */}
                              <td style={{ textAlign: 'center', color: '#8D6E63' }}>
                                {rIdx + 1}
                              </td>

                              {/* 2. Mã phiếu */}
                              <td style={{ textAlign: 'left' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' }}>
                                  <button
                                    type="button"
                                    className="wh-voucher-link-btn"
                                    onClick={() => setSelectedRejected(rej)}
                                    title={`Xem chi tiết phiếu hàng loại ${rej.voucher_no}`}
                                    style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                  >
                                    {rej.voucher_no}
                                  </button>
                                  {rej.is_demo && (
                                    <span
                                      style={{
                                        display: 'inline-block',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        fontSize: '0.68rem',
                                        fontWeight: 600,
                                        backgroundColor: '#FEF3C7',
                                        color: '#B45309',
                                        border: '1px solid #FCD34D',
                                        flexShrink: 0
                                      }}
                                      title="Dữ liệu mẫu kiểm thử"
                                    >
                                      Demo
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 3. Ngày */}
                              <td style={{ textAlign: 'center' }}>
                                {formatDateVN(rej.created_date)}
                              </td>

                              {/* 4. SL (ĐVC) */}
                              <td style={{ textAlign: 'right', fontWeight: 700, color: '#B45309' }}>
                                <div className="wh-cell-ellipsis">
                                  {formatNumber(rej.quantity_main)} {rej.unit_main || material?.unit_main || ''}
                                </div>
                              </td>

                              {/* 5. SL (ĐVCĐ) */}
                              <td style={{ textAlign: 'right', color: '#8D6E63' }}>
                                <div className="wh-cell-ellipsis">
                                  {rej.quantity_conv ? `${formatNumber(rej.quantity_conv)} ${rej.unit_conversion || material?.unit_conversion || ''}` : '—'}
                                </div>
                              </td>

                              {/* 6. Thuộc lỗi gì */}
                              <td style={{ textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.74rem',
                                    fontWeight: 600,
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    ...originBadgeStyle
                                  }}
                                  title={`Nguồn phát sinh: ${originLabel}`}
                                >
                                  {originLabel}
                                </span>
                              </td>

                              {/* 7. Thông tin thêm */}
                              <td style={{ textAlign: 'left', color: '#374151' }} title={tooltipText}>
                                <div className="wh-cell-ellipsis" style={{ fontWeight: 500 }}>
                                  {extraInfo}
                                </div>
                              </td>

                              {/* 8. Kết quả */}
                              <td className="wh-cell-status">
                                <div className="wh-cell-status-inner">
                                  <span
                                    className="wh-status-badge"
                                    style={{
                                      backgroundColor: resInfo.bg,
                                      color: resInfo.color,
                                      border: `1px solid ${resInfo.color}33`,
                                      maxWidth: '100%',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    title={resInfo.label}
                                  >
                                    {resInfo.label}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── POPUP XEM CHỨNG TỪ GỐC NHẬP / XUẤT NẾU CÓ ── */}
        {selectedReceipt && (
          <GoodsReceiptDetailModal
            isOpen={!!selectedReceipt}
            receipt={selectedReceipt}
            onClose={() => setSelectedReceipt(null)}
            onSave={() => setSelectedReceipt(null)}
            isEditing={false}
          />
        )}

        {selectedIssue && (
          <GoodsIssueDetailModal
            isOpen={!!selectedIssue}
            issue={selectedIssue}
            onClose={() => setSelectedIssue(null)}
            onSave={() => setSelectedIssue(null)}
            isEditing={false}
          />
        )}

        {/* ── POPUP XEM CHI TIẾT PHIẾU HÀNG LOẠI / TRẢ VỀ ── */}
        {selectedRejected && (
          <WarehouseRejectedDetailModal
            isOpen={!!selectedRejected}
            voucher={selectedRejected}
            onClose={() => setSelectedRejected(null)}
            onOpenReceipt={handleOpenReceiptDetail}
            onOpenIssue={handleOpenIssueDetail}
          />
        )}
      </div>
    </div>,
    document.body
  );
};

export default WarehouseMaterialDetailModal;
