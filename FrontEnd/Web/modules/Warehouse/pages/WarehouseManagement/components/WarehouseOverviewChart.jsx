import React, { useMemo, useEffect, useState, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import { warehouseDataService } from '../../../services/warehouseData.service';
import { formatNumber } from '../../../types/warehouseInventory.types';

/**
 * Tạo danh sách ngày liên tục (YYYY-MM-DD) giữa hai mốc thời gian
 * Giới hạn tối đa maxDays (mặc định 60 ngày) để bảo vệ hiệu năng
 */
function getContinuousDateList(fromStr, toStr, maxDays = 60) {
  if (!fromStr || !toStr) return [];
  const cur = new Date(fromStr);
  const end = new Date(toStr);
  if (isNaN(cur.getTime()) || isNaN(end.getTime())) return [];

  const dates = [];
  let count = 0;
  while (cur <= end && count < maxDays) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
    count++;
  }
  return dates;
}

/**
 * Định dạng ngày YYYY-MM-DD thành DD/MM hoặc DD/MM/YYYY
 */
function formatDisplayDate(dateStr, includeYear = false) {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const [y, m, d] = parts;
  return includeYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/**
 * Xác định các điểm hiển thị DataLabel của đường Hàng trả về theo quy tắc cố định:
 * 1. Giá trị cao nhất toàn kỳ (Global Peak).
 * 2. Các đỉnh cục bộ đáng chú ý (Local Peaks: returned[i] > trước & sau, >= 20% maxVal, cách >= 2 ngày).
 * 3. Điểm cuối kỳ nếu có phát sinh (> 0, cách điểm đỉnh >= 1 ngày).
 */
function identifyLineLabelPoints(data = []) {
  if (!Array.isArray(data) || data.length === 0) return new Set();

  const labelIndices = new Set();
  const n = data.length;

  // 1. Tìm giá trị cao nhất toàn kỳ (Global Peak)
  let maxVal = 0;
  let maxIdx = -1;
  for (let i = 0; i < n; i++) {
    const v = Number(data[i]?.returned || 0);
    if (v > maxVal) {
      maxVal = v;
      maxIdx = i;
    }
  }
  if (maxVal > 0 && maxIdx !== -1) {
    labelIndices.add(maxIdx);
  }

  // 2. Tìm các đỉnh cục bộ đáng chú ý (Local Peaks)
  const threshold = Math.max(0.5, maxVal * 0.2);
  const candidatePeaks = [];

  for (let i = 1; i < n - 1; i++) {
    const prev = Number(data[i - 1]?.returned || 0);
    const curr = Number(data[i]?.returned || 0);
    const next = Number(data[i + 1]?.returned || 0);

    if (curr > prev && curr > next && curr >= threshold) {
      if (i !== maxIdx) {
        candidatePeaks.push({ index: i, value: curr });
      }
    }
  }

  // Sắp xếp đỉnh cục bộ giảm dần theo độ lớn để ưu tiên chọn đỉnh nổi bật
  candidatePeaks.sort((a, b) => b.value - a.value);
  for (const peak of candidatePeaks) {
    let tooClose = false;
    for (const existingIdx of labelIndices) {
      if (Math.abs(peak.index - existingIdx) < 2) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      labelIndices.add(peak.index);
    }
  }

  // 3. Điểm cuối kỳ nếu có phát sinh (End of period)
  const lastIdx = n - 1;
  const lastVal = Number(data[lastIdx]?.returned || 0);
  if (lastVal > 0) {
    let tooClose = false;
    for (const existingIdx of labelIndices) {
      if (Math.abs(lastIdx - existingIdx) < 1) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      labelIndices.add(lastIdx);
    }
  }

  return labelIndices;
}

/**
 * WarehouseOverviewChart
 * Biểu đồ Combo Chart (Cột nhóm + Đường) thể hiện Xu hướng hàng loại / Trả về:
 * - Cột 1: Lỗi sản xuất (#C58A4B - Cam đất, DataLabel số màu cam đất #8C4B18)
 * - Cột 2: Lỗi nhà cung cấp (#2563EB - Xanh dương, DataLabel số màu xanh dương #1D4ED8)
 * - Đường: Hàng trả về (#8D6E63 - Nâu, DataLabel tại đỉnh & cuối kỳ)
 * 
 * Đảm bảo:
 * - Đọc trực tiếp số liệu trên cột (> 0) mà không cần rê chuột.
 * - Tự động chống đè nhãn giữa 2 cột cùng ngày và giữa đường với cột.
 * - Hỗ trợ cuộn ngang nội bộ mượt mà khi chu kỳ dài, cố định trục Y và Header.
 */
export const WarehouseOverviewChart = ({
  selectedWarehouse = 'ALL',
  fromDate = '',
  toDate = '',
  search = '',
  categoryFilter = 'ALL',
  unitMainFilter = 'ALL'
}) => {
  // 1. Lắng nghe cập nhật dữ liệu tự động từ warehouseDataService và tải dữ liệu ban đầu
  const [syncVersion, setSyncVersion] = useState(0);
  useEffect(() => {
    const handleSync = () => setSyncVersion((v) => v + 1);
    window.addEventListener('smartflow:warehouse_data_sync', handleSync);
    warehouseDataService.fetchRejectedGoods().catch((e) => {
      console.warn('[WarehouseOverviewChart] Lỗi tải hàng loại từ API:', e);
    });
    return () => window.removeEventListener('smartflow:warehouse_data_sync', handleSync);
  }, []);

  // 2. Lấy danh sách phiếu hàng loại / trả về an toàn
  const rawRejectedList = useMemo(() => {
    try {
      const list = warehouseDataService.getRejectedGoods();
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.warn('[WarehouseOverviewChart] Lỗi tải danh sách hàng loại:', e);
      return [];
    }
  }, [syncVersion]);

  // 3. Lọc dữ liệu đồng bộ theo Single Source of Truth
  const filteredList = useMemo(() => {
    if (!Array.isArray(rawRejectedList)) return [];

    return rawRejectedList.filter((rg) => {
      if (!rg || rg.status === 'CANCELLED') return false;

      // 1. Lọc theo Kho
      if (selectedWarehouse && selectedWarehouse !== 'ALL') {
        if (rg.warehouse_code !== selectedWarehouse) return false;
      }

      // 2. Lọc theo Tìm kiếm
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        const matchCode = (rg.item_code || '').toLowerCase().includes(q);
        const matchName = (rg.item_name || '').toLowerCase().includes(q);
        const matchVoucher = (rg.voucher_no || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchVoucher) return false;
      }

      // 3. Lọc theo Nhóm vật tư
      if (categoryFilter && categoryFilter !== 'ALL') {
        if (rg.category_id !== categoryFilter && rg.category_name !== categoryFilter) {
          return false;
        }
      }

      // 4. Lọc theo Khoảng thời gian chung (chống lẫn dữ liệu khác kỳ)
      const cDate = (rg.created_date || '').trim();
      if (!cDate) return false;
      if (fromDate && cDate < fromDate) return false;
      if (toDate && cDate > toDate) return false;

      return true;
    });
  }, [rawRejectedList, selectedWarehouse, search, categoryFilter, fromDate, toDate]);

  // 4. Xác định ĐVT chủ đạo để đảm bảo tính đồng nhất đơn vị tính (tránh cộng chéo m3, tấm, cái, kg)
  const activeChartUnit = useMemo(() => {
    if (unitMainFilter && unitMainFilter !== 'ALL') {
      return unitMainFilter;
    }
    const unitCounts = {};
    (filteredList || []).forEach((r) => {
      const u = r.unit_main || 'm3';
      unitCounts[u] = (unitCounts[u] || 0) + 1;
    });
    let maxUnit = 'm3';
    let maxCount = 0;
    Object.entries(unitCounts).forEach(([u, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxUnit = u;
      }
    });
    return maxUnit;
  }, [unitMainFilter, filteredList]);

  // Lọc tập dữ liệu theo ĐVT đồng nhất
  const unitFilteredList = useMemo(() => {
    if (!Array.isArray(filteredList)) return [];
    return filteredList.filter(
      (rg) => (rg?.unit_main || '').toLowerCase() === activeChartUnit.toLowerCase()
    );
  }, [filteredList, activeChartUnit]);

  // 5. Xác định chuỗi timeline an toàn và sắp xếp theo chuẩn thời gian Date
  const timelineDays = useMemo(() => {
    let from = fromDate ? String(fromDate).trim() : '';
    let to = toDate ? String(toDate).trim() : '';

    // Nếu không có fromDate và toDate (Tất cả): chỉ hiển thị các ngày có dữ liệu phát sinh
    if (!from && !to) {
      const uniqueDates = Array.from(
        new Set(
          unitFilteredList
            .map((r) => r?.created_date)
            .filter(Boolean)
        )
      ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      return uniqueDates;
    }

    if (!from) from = to;
    if (!to) to = from;
    if (new Date(from) > new Date(to)) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    // Sinh chuỗi ngày liên tục theo lịch tăng dần
    const cont = getContinuousDateList(from, to, 60);
    return cont.length > 0 ? cont : [from];
  }, [fromDate, toDate, unitFilteredList]);

  // 6. Tổng hợp dữ liệu biểu đồ
  const chartData = useMemo(() => {
    if (!Array.isArray(timelineDays) || timelineDays.length === 0) return [];

    return timelineDays.map((dateStr) => {
      const dayRecords = (unitFilteredList || []).filter((r) => r?.created_date === dateStr);

      let prodSum = 0;
      let suppSum = 0;
      let retSum = 0;

      dayRecords.forEach((r) => {
        const isProd =
          (r?.defect_origin === 'production' || r?.source_type === 'PROD_RETURN') &&
          r?.return_mode !== 'GOOD_EXCESS';
        const isSupp =
          r?.defect_origin === 'supplier' || r?.source_type === 'QC_INCOMING';

        const rejQty = Number(
          r?.rejected_quantity !== undefined ? r.rejected_quantity : r?.quantity_main || 0
        );
        const retQty = Number(
          r?.returned_quantity !== undefined
            ? r.returned_quantity
            : r?.resolution === 'RETURN_SUPPLIER' || r?.resolution === 'RETURN_VENDOR' || r?.return_mode === 'GOOD_EXCESS'
            ? r.quantity_main
            : 0
        );

        if (isProd) prodSum += rejQty;
        if (isSupp) suppSum += rejQty;
        retSum += retQty;
      });

      return {
        dateKey: dateStr,
        displayDate: formatDisplayDate(dateStr, false),
        fullDate: dateStr,
        prod_defect: Math.round(prodSum * 100) / 100,
        supplier_defect: Math.round(suppSum * 100) / 100,
        returned: Math.round(retSum * 100) / 100
      };
    });
  }, [timelineDays, unitFilteredList]);

  // 7. Nhận diện các điểm hiển thị nhãn trên đường Hàng trả về
  const lineLabelIndices = useMemo(() => {
    return identifyLineLabelPoints(chartData);
  }, [chartData]);

  // 8. Tính toán mức trần của trục Y để chừa khoảng trống thoáng (Headroom) cho DataLabel
  const yAxisMax = useMemo(() => {
    let max = 0;
    (chartData || []).forEach((d) => {
      const p = Number(d.prod_defect || 0);
      const s = Number(d.supplier_defect || 0);
      const r = Number(d.returned || 0);
      if (p > max) max = p;
      if (s > max) max = s;
      if (r > max) max = r;
    });

    if (max <= 0) return 5;
    // Chừa 35% khoảng trống phía trên đỉnh cột cao nhất để DataLabel không bao giờ bị cắt
    const ceiling = Math.ceil(max * 1.35);
    if (ceiling <= 10) return ceiling;
    if (ceiling <= 30) return Math.ceil(ceiling / 5) * 5;
    return Math.ceil(ceiling / 10) * 10;
  }, [chartData]);

  // 9. Quản lý độ rộng biểu đồ và cơ chế cuộn ngang nội bộ (không cuộn trang)
  const scrollPaneRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scrollPaneRef.current;
    if (!el) return;

    const measure = () => {
      if (el) {
        setContainerWidth(el.clientWidth);
      }
    };
    measure();

    const ro = new ResizeObserver(() => {
      measure();
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [chartData.length]);

  // Chiều rộng tối thiểu mỗi ngày: 48px (đảm bảo 2 cột dày dặn, khoảng cách thoáng, nhãn ngày không chen chúc)
  const minDayWidth = 48;
  const requiredWidth = chartData.length * minDayWidth;
  const isScrollable = containerWidth > 0 && requiredWidth > containerWidth;
  const chartPlotWidth = isScrollable ? requiredWidth : '100%';

  // Cuộn về các ngày gần nhất (bên phải) khi tải dữ liệu chu kỳ dài
  useEffect(() => {
    if (isScrollable && scrollPaneRef.current) {
      scrollPaneRef.current.scrollLeft = scrollPaneRef.current.scrollWidth;
    }
  }, [fromDate, toDate, selectedWarehouse, isScrollable]);

  // Tooltip nhận diện G7 chuẩn ERP: Giao diện sáng, tinh gọn 4 chỉ tiêu, không có badge/chữ thừa
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0]?.payload || {};

    const prod = Number(item.prod_defect || 0);
    const supp = Number(item.supplier_defect || 0);
    const ret = Number(item.returned || 0);
    const totalDefects = Math.round((prod + supp) * 100) / 100;

    return (
      <div className="wh-combo-tooltip">
        <div className="wh-combo-tooltip-header">
          Ngày {formatDisplayDate(item.fullDate || label, true)}
        </div>

        <div className="wh-combo-tooltip-body">
          {/* 1. Lỗi sản xuất */}
          <div className="wh-combo-tooltip-row">
            <span className="wh-combo-tooltip-label">
              <span
                className="wh-combo-tooltip-dot"
                style={{ backgroundColor: '#C58A4B' }}
              />
              Lỗi sản xuất
            </span>
            <span className="wh-combo-tooltip-value" style={{ color: '#8C4B18' }}>
              {formatNumber(prod)} {activeChartUnit}
            </span>
          </div>

          {/* 2. Lỗi nhà cung cấp */}
          <div className="wh-combo-tooltip-row">
            <span className="wh-combo-tooltip-label">
              <span
                className="wh-combo-tooltip-dot"
                style={{ backgroundColor: '#2563EB' }}
              />
              Lỗi nhà cung cấp
            </span>
            <span className="wh-combo-tooltip-value" style={{ color: '#1D4ED8' }}>
              {formatNumber(supp)} {activeChartUnit}
            </span>
          </div>

          {/* Đường phân cách */}
          <div className="wh-combo-tooltip-divider" />

          {/* 3. Tổng lỗi */}
          <div className="wh-combo-tooltip-row">
            <span className="wh-combo-tooltip-label" style={{ fontWeight: 600, color: '#3D291D' }}>
              Tổng lỗi
            </span>
            <span className="wh-combo-tooltip-value" style={{ color: '#3D291D', fontWeight: 700 }}>
              {formatNumber(totalDefects)} {activeChartUnit}
            </span>
          </div>

          {/* 4. Hàng trả về */}
          <div className="wh-combo-tooltip-row" style={{ marginTop: 3 }}>
            <span className="wh-combo-tooltip-label">
              <span
                className="wh-combo-tooltip-dot"
                style={{ backgroundColor: '#8D6E63' }}
              />
              Hàng trả về
            </span>
            <span className="wh-combo-tooltip-value" style={{ color: '#7B5233', fontWeight: 600 }}>
              {formatNumber(ret)} {activeChartUnit}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render DataLabel trên đầu cột Lỗi sản xuất (Cam đất #8C4B18, căn giữa, chống đè nhãn)
  const renderProdBarLabel = (props) => {
    const { x, y, width, value, index } = props;
    const num = Number(value || 0);
    if (num <= 0 || isNaN(num)) return null;

    const item = chartData[index];
    const suppVal = Number(item?.supplier_defect || 0);

    // Định dạng: số nguyên không có thập phân, số lẻ tối đa 1-2 chữ số
    const labelText = formatNumber(num, 2);

    // Chống đè số ngang nếu cả 2 cột cùng ngày có số liệu và chiều cao gần bằng nhau
    let yOffset = -5;
    if (suppVal > 0) {
      const diff = Math.abs(num - suppVal);
      if (diff / yAxisMax < 0.12) {
        if (num < suppVal) {
          yOffset = -16;
        }
      }
    }

    return (
      <text
        x={x + width / 2}
        y={y + yOffset}
        fill="#8C4B18"
        fontSize={9.5}
        fontWeight="700"
        textAnchor="middle"
      >
        {labelText}
      </text>
    );
  };

  // Render DataLabel trên đầu cột Lỗi nhà cung cấp (Xanh dương #1D4ED8, căn giữa, chống đè nhãn)
  const renderSuppBarLabel = (props) => {
    const { x, y, width, value, index } = props;
    const num = Number(value || 0);
    if (num <= 0 || isNaN(num)) return null;

    const item = chartData[index];
    const prodVal = Number(item?.prod_defect || 0);

    const labelText = formatNumber(num, 2);

    let yOffset = -5;
    if (prodVal > 0) {
      const diff = Math.abs(num - prodVal);
      if (diff / yAxisMax < 0.12) {
        if (num <= prodVal) {
          yOffset = -16;
        }
      }
    }

    return (
      <text
        x={x + width / 2}
        y={y + yOffset}
        fill="#1D4ED8"
        fontSize={9.5}
        fontWeight="700"
        textAnchor="middle"
      >
        {labelText}
      </text>
    );
  };

  // Render DataLabel của đường Hàng trả về (Badge màu nâu #7B5233, chữ trắng, chống đè cột)
  const renderReturnLineLabel = (props) => {
    const { x, y, value, index } = props;
    const num = Number(value || 0);
    if (num <= 0 || !lineLabelIndices.has(index)) return null;

    const item = chartData[index];
    const prodVal = Number(item?.prod_defect || 0);
    const suppVal = Number(item?.supplier_defect || 0);
    const maxBarVal = Math.max(prodVal, suppVal);

    const strVal = formatNumber(num, 2);
    const badgeWidth = Math.max(26, strVal.length * 6.5 + 8);
    const badgeHeight = 14;

    // Chống va chạm với nhãn cột: nếu điểm line gần đỉnh cột thì nâng cao hơn
    let badgeY = y - 18;
    if (maxBarVal > 0) {
      if (Math.abs(num - maxBarVal) / yAxisMax < 0.18) {
        badgeY = y - 28;
      }
    }

    return (
      <g key={`ret-lbl-${index}`}>
        {/* Đường dóng chỉ xuống điểm dữ liệu nếu badge được nâng cao */}
        {badgeY < y - 20 && (
          <line
            x1={x}
            y1={badgeY + badgeHeight}
            x2={x}
            y2={y - 4}
            stroke="#7B5233"
            strokeWidth={1}
            strokeDasharray="1 1"
            opacity={0.65}
          />
        )}
        <rect
          x={x - badgeWidth / 2}
          y={badgeY}
          width={badgeWidth}
          height={badgeHeight}
          rx={3}
          fill="#7B5233"
          stroke="#FFFFFF"
          strokeWidth={1}
        />
        <text
          x={x}
          y={badgeY + 10}
          fill="#FFFFFF"
          fontSize={8.5}
          fontWeight="700"
          textAnchor="middle"
        >
          {strVal}
        </text>
      </g>
    );
  };

  // Render chấm tròn nổi bật trên đường Hàng trả về tại các điểm có nhãn
  const renderReturnLineDot = (props) => {
    const { cx, cy, value, index } = props;
    const num = Number(value || 0);
    if (num <= 0 || !lineLabelIndices.has(index)) return null;

    return (
      <circle
        key={`ret-dot-${index}`}
        cx={cx}
        cy={cy}
        r={3.5}
        fill="#7B5233"
        stroke="#FFFFFF"
        strokeWidth={1.5}
      />
    );
  };

  return (
    <div className="wh-chart-card">
      {/* ── 1. HEADER BIỂU ĐỒ GỌN GÀNG CỐ ĐỊNH: TIÊU ĐỀ & LEGEND PHÍA TRÊN ── */}
      <div className="wh-chart-card-header">
        <div className="wh-chart-card-header-left">
          <div className="wh-chart-icon-box" title="Xu hướng hàng loại / Trả về">
            <TrendingUp size={16} color="#7B5233" />
          </div>
          <h3 className="wh-chart-title">
            Xu hướng hàng loại / Trả về
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#8D6E63',
                marginLeft: '6px'
              }}
            >
              ({activeChartUnit})
            </span>
          </h3>
        </div>

        {/* Legend cố định phía trên */}
        <div className="wh-combo-legend-bar">
          <div className="wh-combo-legend-item">
            <span className="wh-combo-legend-color-box" style={{ backgroundColor: '#C58A4B' }} />
            <span className="wh-combo-legend-label">Lỗi sản xuất</span>
          </div>
          <div className="wh-combo-legend-item">
            <span className="wh-combo-legend-color-box" style={{ backgroundColor: '#2563EB' }} />
            <span className="wh-combo-legend-label">Lỗi nhà cung cấp</span>
          </div>
          <div className="wh-combo-legend-item">
            <span className="wh-combo-legend-line-glyph">
              <span className="wh-combo-legend-line" style={{ backgroundColor: '#8D6E63' }} />
              <span className="wh-combo-legend-dot" style={{ backgroundColor: '#8D6E63' }} />
            </span>
            <span className="wh-combo-legend-label">Hàng trả về</span>
          </div>
        </div>
      </div>

      {/* ── 2. VÙNG BIỂU ĐỒ COMBO (CHỐNG TRÀN TOÀN TRANG, CUỘN NGANG NỘI BỘ KHI KỲ DÀI) ── */}
      <div className="wh-chart-card-body">
        {chartData.length === 0 ? (
          <div className="wh-chart-empty-state">
            <AlertTriangle size={16} color="#B85D43" style={{ marginRight: 6 }} />
            Không có dữ liệu phát sinh hàng loại hoặc trả về ({activeChartUnit}) trong phạm vi lọc đã chọn.
          </div>
        ) : (
          <div className="wh-combo-chart-stage">
            {/* 1. Trục Y cố định bên trái (luôn hiển thị thang đo khi cuộn ngang) */}
            <div className="wh-combo-y-axis-pane">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={[{ y: 0 }, { y: yAxisMax }]}
                  margin={{ top: 26, right: 0, left: -6, bottom: 2 }}
                >
                  <YAxis
                    dataKey="y"
                    domain={[0, yAxisMax]}
                    allowDecimals={true}
                    tick={{ fontSize: 9.5, fill: '#6D4C41', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#EADCC9' }}
                    width={34}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* 2. Vùng vẽ biểu đồ có thể cuộn ngang mượt mà khi chu kỳ dài */}
            <div
              className="wh-combo-chart-scroll-pane"
              ref={scrollPaneRef}
            >
              <div
                style={{
                  width: isScrollable ? `${chartPlotWidth}px` : '100%',
                  minWidth: '100%',
                  height: '100%'
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 26, right: 18, left: 6, bottom: 2 }}
                    barGap={3}
                  >
                    {/* Lưới ngang và lưới dọc nhẹ để gióng cột xuống ngày trên trục X */}
                    <CartesianGrid
                      strokeDasharray="2 2"
                      horizontal={true}
                      vertical={true}
                      stroke="#EADCC9"
                      opacity={0.4}
                    />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 9.5, fill: '#5D4037', fontWeight: 600 }}
                      tickLine={{ stroke: '#C5A880', strokeWidth: 1 }}
                      axisLine={{ stroke: '#C5A880' }}
                      interval={0}
                    />
                    <YAxis
                      hide={true}
                      domain={[0, yAxisMax]}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ fill: 'rgba(123, 82, 51, 0.08)' }}
                      isAnimationActive={false}
                    />
                    {/* Cột 1: Lỗi sản xuất - Cam đất #C58A4B, nhãn màu cam đất #8C4B18 */}
                    <Bar
                      dataKey="prod_defect"
                      name="Lỗi sản xuất"
                      fill="#C58A4B"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={18}
                      label={renderProdBarLabel}
                    />
                    {/* Cột 2: Lỗi nhà cung cấp - Xanh dương #2563EB, nhãn màu xanh dương #1D4ED8 */}
                    <Bar
                      dataKey="supplier_defect"
                      name="Lỗi nhà cung cấp"
                      fill="#2563EB"
                      radius={[2, 2, 0, 0]}
                      maxBarSize={18}
                      label={renderSuppBarLabel}
                    />
                    {/* Đường: Hàng trả về - Nâu thanh mảnh #8D6E63, hiển thị nhãn tại đỉnh và điểm cuối */}
                    <Line
                      type="monotone"
                      dataKey="returned"
                      name="Hàng trả về"
                      stroke="#8D6E63"
                      strokeWidth={1.75}
                      dot={renderReturnLineDot}
                      activeDot={{ r: 4.5, fill: '#7B5233', stroke: '#FFFFFF', strokeWidth: 1.5 }}
                      label={renderReturnLineLabel}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseOverviewChart;
