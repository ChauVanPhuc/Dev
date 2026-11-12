import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  formatNumber,
  COLUMN_MIN_WIDTHS,
  DEFAULT_COLUMN_WIDTHS
} from '../../../types/warehouseInventory.types';

const STORAGE_KEY_COL_WIDTHS = 'smartflow_wh_mgmt_col_widths_v1';

/**
 * Bảng tổng hợp Xuất - Nhập - Tồn (XNT)
 * Header 2 cấp, hỗ trợ sticky header/cột và thay đổi chiều rộng cột (Column Resizing).
 */
export const WarehouseInventoryTable = ({
  items = [],
  loading = false,
  page = 1,
  pageSize = 25,
  totalCount = 0,
  visibleColumns = {},
  totals = {},
  onSelectMaterial = null
}) => {
  // 1. Quản lý độ rộng cột được lưu trong localStorage
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_COL_WIDTHS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
      }
    } catch (e) {
      console.warn('Lỗi đọc độ rộng cột:', e);
    }
    return { ...DEFAULT_COLUMN_WIDTHS };
  });

  // Lưu cấu hình độ rộng cột
  const saveColWidths = useCallback((newWidths) => {
    try {
      localStorage.setItem(STORAGE_KEY_COL_WIDTHS, JSON.stringify(newWidths));
    } catch (e) {
      console.warn('Lỗi lưu độ rộng cột:', e);
    }
  }, []);

  // 2. Tính toán vị trí sticky `left` động cho 3 cột cố định
  const stickyLefts = useMemo(() => {
    const sttW = colWidths.stt || DEFAULT_COLUMN_WIDTHS.stt;
    const codeW = colWidths.item_code || DEFAULT_COLUMN_WIDTHS.item_code;
    return {
      stt: 0,
      item_code: sttW,
      item_name: sttW + codeW
    };
  }, [colWidths.stt, colWidths.item_code]);

  // 3. Cơ chế kéo giãn cột đơn lẻ (Sub-column hoặc Standalone column)
  const startResizeCol = useCallback((e, colKey) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startW = colWidths[colKey] || DEFAULT_COLUMN_WIDTHS[colKey] || 100;
    const minW = COLUMN_MIN_WIDTHS[colKey] || 50;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    let currentW = startW;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      currentW = Math.max(minW, startW + deltaX);
      setColWidths((prev) => ({
        ...prev,
        [colKey]: currentW
      }));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      setColWidths((latest) => {
        saveColWidths(latest);
        return latest;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [colWidths, saveColWidths]);

  // 4. Cơ chế kéo giãn nhóm cột cha ở Hàng 1 (phân bổ đều cho các cột con đang hiển thị)
  const startResizeGroup = useCallback((e, groupKey, childKeys) => {
    e.preventDefault();
    e.stopPropagation();

    const activeChildren = childKeys.filter((k) => visibleColumns[k]);
    if (activeChildren.length === 0) return;

    const startX = e.clientX;
    const startSubWidths = {};
    let startTotal = 0;
    activeChildren.forEach((k) => {
      const w = colWidths[k] || DEFAULT_COLUMN_WIDTHS[k] || 90;
      startSubWidths[k] = w;
      startTotal += w;
    });

    const minTotal = activeChildren.reduce(
      (acc, k) => acc + (COLUMN_MIN_WIDTHS[k] || 50),
      0
    );

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newTotal = Math.max(minTotal, startTotal + deltaX);
      const actualDelta = newTotal - startTotal;
      const perChildDelta = actualDelta / activeChildren.length;

      setColWidths((prev) => {
        const next = { ...prev };
        activeChildren.forEach((k) => {
          const minW = COLUMN_MIN_WIDTHS[k] || 50;
          next[k] = Math.max(minW, Math.round(startSubWidths[k] + perChildDelta));
        });
        return next;
      });
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      setColWidths((latest) => {
        saveColWidths(latest);
        return latest;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [colWidths, visibleColumns, saveColWidths]);

  // 5. Tính colSpan cho các nhóm cấp 1 dựa trên số cột con hiển thị
  const unitColSpan = (visibleColumns.unit_main ? 1 : 0) + (visibleColumns.unit_conversion ? 1 : 0);
  const openingColSpan = (visibleColumns.opening_main ? 1 : 0) + (visibleColumns.opening_conv ? 1 : 0);
  const inColSpan = (visibleColumns.in_main ? 1 : 0) + (visibleColumns.in_conv ? 1 : 0);
  const outColSpan = (visibleColumns.out_main ? 1 : 0) + (visibleColumns.out_conv ? 1 : 0);
  const closingColSpan = (visibleColumns.closing_main ? 1 : 0) + (visibleColumns.closing_conv ? 1 : 0);
  const returnColSpan = (visibleColumns.return_main ? 1 : 0) + (visibleColumns.return_conv ? 1 : 0);

  // Tổng số cột con hiển thị thực tế cho colSpan dòng trống / loading
  const totalColumnsCount =
    3 + // STT, Mã, Tên
    unitColSpan +
    openingColSpan +
    inColSpan +
    outColSpan +
    closingColSpan +
    returnColSpan +
    (visibleColumns.inventory_days ? 1 : 0);

  // 6. Tính tổng độ rộng toàn bảng (đảm bảo bảng mở rộng tự nhiên, kích hoạt thanh cuộn ngang)
  const totalTableWidth = useMemo(() => {
    return (
      (colWidths.stt || 50) +
      (colWidths.item_code || 140) +
      (colWidths.item_name || 260) +
      (visibleColumns.unit_main ? (colWidths.unit_main || 75) : 0) +
      (visibleColumns.unit_conversion ? (colWidths.unit_conversion || 75) : 0) +
      (visibleColumns.opening_main ? (colWidths.opening_main || 110) : 0) +
      (visibleColumns.opening_conv ? (colWidths.opening_conv || 110) : 0) +
      (visibleColumns.in_main ? (colWidths.in_main || 110) : 0) +
      (visibleColumns.in_conv ? (colWidths.in_conv || 110) : 0) +
      (visibleColumns.out_main ? (colWidths.out_main || 110) : 0) +
      (visibleColumns.out_conv ? (colWidths.out_conv || 110) : 0) +
      (visibleColumns.closing_main ? (colWidths.closing_main || 115) : 0) +
      (visibleColumns.closing_conv ? (colWidths.closing_conv || 115) : 0) +
      (visibleColumns.return_main ? (colWidths.return_main || 105) : 0) +
      (visibleColumns.return_conv ? (colWidths.return_conv || 105) : 0) +
      (visibleColumns.inventory_days ? (colWidths.inventory_days || 110) : 0)
    );
  }, [colWidths, visibleColumns]);

  // STT bắt đầu theo trang hiện tại
  const startSTT = (page - 1) * pageSize;

  // Helper hiển thị ô số lượng ở dòng tổng cộng (độc lập từng cột)
  const renderTotalQuantityCell = (colKey) => {
    const colSummary = totals[colKey];
    if (colSummary && colSummary.status === 'single' && colSummary.sum !== null) {
      return formatNumber(colSummary.sum);
    }
    return '—';
  };

  return (
    <div className="exp-table-card">
      <div className="exp-table-scroll">
        <table
          className="exp-table wh-inv-table"
          style={{
            width: `${totalTableWidth}px`,
            minWidth: '100%',
            tableLayout: 'fixed'
          }}
        >
          {/* Định nghĩa kích thước từng cột chuẩn xác bằng colgroup */}
          <colgroup>
            <col style={{ width: `${colWidths.stt}px` }} />
            <col style={{ width: `${colWidths.item_code}px` }} />
            <col style={{ width: `${colWidths.item_name}px` }} />
            {visibleColumns.unit_main && <col style={{ width: `${colWidths.unit_main}px` }} />}
            {visibleColumns.unit_conversion && <col style={{ width: `${colWidths.unit_conversion}px` }} />}
            {visibleColumns.opening_main && <col style={{ width: `${colWidths.opening_main}px` }} />}
            {visibleColumns.opening_conv && <col style={{ width: `${colWidths.opening_conv}px` }} />}
            {visibleColumns.in_main && <col style={{ width: `${colWidths.in_main}px` }} />}
            {visibleColumns.in_conv && <col style={{ width: `${colWidths.in_conv}px` }} />}
            {visibleColumns.out_main && <col style={{ width: `${colWidths.out_main}px` }} />}
            {visibleColumns.out_conv && <col style={{ width: `${colWidths.out_conv}px` }} />}
            {visibleColumns.closing_main && <col style={{ width: `${colWidths.closing_main}px` }} />}
            {visibleColumns.closing_conv && <col style={{ width: `${colWidths.closing_conv}px` }} />}
            {visibleColumns.return_main && <col style={{ width: `${colWidths.return_main}px` }} />}
            {visibleColumns.return_conv && <col style={{ width: `${colWidths.return_conv}px` }} />}
            {visibleColumns.inventory_days && <col style={{ width: `${colWidths.inventory_days}px` }} />}
          </colgroup>

          {/* ── HEADER 2 CẤP CỐ ĐỊNH (STICKY 2-LEVEL) ── */}
          <thead>
            {/* Cấp 1 (Hàng 1, top: 0, cao 34px) */}
            <tr className="wh-header-row-1">
              {/* STT (rowSpan 2) */}
              <th
                rowSpan={2}
                className="wh-sticky-stt"
                style={{
                  left: `${stickyLefts.stt}px`,
                  width: `${colWidths.stt}px`,
                  textAlign: 'center'
                }}
              >
                <span>STT</span>
                <div
                  className="wh-col-resizer"
                  onMouseDown={(e) => startResizeCol(e, 'stt')}
                  title="Kéo thay đổi chiều rộng STT"
                />
              </th>

              {/* Mã vật tư (rowSpan 2) */}
              <th
                rowSpan={2}
                className="wh-sticky-code"
                style={{
                  left: `${stickyLefts.item_code}px`,
                  width: `${colWidths.item_code}px`,
                  textAlign: 'left'
                }}
              >
                <span>Mã vật tư</span>
                <div
                  className="wh-col-resizer"
                  onMouseDown={(e) => startResizeCol(e, 'item_code')}
                  title="Kéo thay đổi chiều rộng Mã vật tư"
                />
              </th>

              {/* Tên vật tư / Goods (rowSpan 2) */}
              <th
                rowSpan={2}
                className="wh-sticky-name"
                style={{
                  left: `${stickyLefts.item_name}px`,
                  width: `${colWidths.item_name}px`,
                  textAlign: 'left'
                }}
              >
                <span>Tên vật tư / Goods</span>
                <div
                  className="wh-col-resizer"
                  onMouseDown={(e) => startResizeCol(e, 'item_name')}
                  title="Kéo thay đổi chiều rộng Tên vật tư"
                />
              </th>

              {/* Nhóm ĐVT / Unit */}
              {unitColSpan > 0 && (
                <th
                  colSpan={unitColSpan}
                  style={{ textAlign: 'center' }}
                >
                  <span>ĐVT / Unit</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeGroup(e, 'unit_group', ['unit_main', 'unit_conversion'])}
                    title="Kéo thay đổi chiều rộng nhóm ĐVT"
                  />
                </th>
              )}

              {/* Nhóm Tồn đầu kỳ */}
              {openingColSpan > 0 && (
                <th
                  colSpan={openingColSpan}
                  style={{ textAlign: 'center' }}
                >
                  <span>Tồn đầu kỳ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeGroup(e, 'opening_group', ['opening_main', 'opening_conv'])}
                    title="Kéo thay đổi chiều rộng nhóm Tồn đầu"
                  />
                </th>
              )}

              {/* Nhóm Nhập trong kỳ */}
              {inColSpan > 0 && (
                <th
                  colSpan={inColSpan}
                  style={{ textAlign: 'center' }}
                >
                  <span>Nhập trong kỳ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeGroup(e, 'in_group', ['in_main', 'in_conv'])}
                    title="Kéo thay đổi chiều rộng nhóm Nhập"
                  />
                </th>
              )}

              {/* Nhóm Xuất trong kỳ */}
              {outColSpan > 0 && (
                <th
                  colSpan={outColSpan}
                  style={{ textAlign: 'center' }}
                >
                  <span>Xuất trong kỳ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeGroup(e, 'out_group', ['out_main', 'out_conv'])}
                    title="Kéo thay đổi chiều rộng nhóm Xuất"
                  />
                </th>
              )}

              {/* Nhóm Tồn cuối kỳ */}
              {closingColSpan > 0 && (
                <th
                  colSpan={closingColSpan}
                  style={{ textAlign: 'center' }}
                >
                  <span>Tồn cuối kỳ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeGroup(e, 'closing_group', ['closing_main', 'closing_conv'])}
                    title="Kéo thay đổi chiều rộng nhóm Tồn cuối"
                  />
                </th>
              )}

              {/* Nhóm Hàng trả về */}
              {returnColSpan > 0 && (
                <th
                  colSpan={returnColSpan}
                  style={{ textAlign: 'center' }}
                >
                  <span>Hàng trả về</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeGroup(e, 'return_group', ['return_main', 'return_conv'])}
                    title="Kéo thay đổi chiều rộng nhóm Hàng trả về"
                  />
                </th>
              )}

              {/* Thời gian tồn (rowSpan 2) */}
              {visibleColumns.inventory_days && (
                <th
                  rowSpan={2}
                  style={{
                    width: `${colWidths.inventory_days}px`,
                    textAlign: 'right'
                  }}
                >
                  <span>Thời gian tồn</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'inventory_days')}
                    title="Kéo thay đổi chiều rộng Thời gian tồn"
                  />
                </th>
              )}
            </tr>

            {/* Cấp 2 (Hàng 2, top: 34px, cao 30px: gắn liền dưới Cấp 1) */}
            <tr className="wh-header-row-2">
              {/* ĐVT: ĐVC */}
              {visibleColumns.unit_main && (
                <th style={{ width: `${colWidths.unit_main}px`, textAlign: 'center' }}>
                  <span>ĐVC</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'unit_main')}
                    title="Kéo độ rộng ĐVC"
                  />
                </th>
              )}

              {/* ĐVT: ĐVCĐ */}
              {visibleColumns.unit_conversion && (
                <th style={{ width: `${colWidths.unit_conversion}px`, textAlign: 'center' }}>
                  <span>ĐVCĐ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'unit_conversion')}
                    title="Kéo độ rộng ĐVCĐ"
                  />
                </th>
              )}

              {/* Tồn đầu: ĐVC */}
              {visibleColumns.opening_main && (
                <th style={{ width: `${colWidths.opening_main}px`, textAlign: 'right' }}>
                  <span>ĐVC</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'opening_main')}
                    title="Kéo độ rộng Tồn đầu ĐVC"
                  />
                </th>
              )}

              {/* Tồn đầu: ĐVCĐ */}
              {visibleColumns.opening_conv && (
                <th style={{ width: `${colWidths.opening_conv}px`, textAlign: 'right' }}>
                  <span>ĐVCĐ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'opening_conv')}
                    title="Kéo độ rộng Tồn đầu ĐVCĐ"
                  />
                </th>
              )}

              {/* Nhập: ĐVC */}
              {visibleColumns.in_main && (
                <th style={{ width: `${colWidths.in_main}px`, textAlign: 'right' }}>
                  <span>ĐVC</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'in_main')}
                    title="Kéo độ rộng Nhập ĐVC"
                  />
                </th>
              )}

              {/* Nhập: ĐVCĐ */}
              {visibleColumns.in_conv && (
                <th style={{ width: `${colWidths.in_conv}px`, textAlign: 'right' }}>
                  <span>ĐVCĐ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'in_conv')}
                    title="Kéo độ rộng Nhập ĐVCĐ"
                  />
                </th>
              )}

              {/* Xuất: ĐVC */}
              {visibleColumns.out_main && (
                <th style={{ width: `${colWidths.out_main}px`, textAlign: 'right' }}>
                  <span>ĐVC</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'out_main')}
                    title="Kéo độ rộng Xuất ĐVC"
                  />
                </th>
              )}

              {/* Xuất: ĐVCĐ */}
              {visibleColumns.out_conv && (
                <th style={{ width: `${colWidths.out_conv}px`, textAlign: 'right' }}>
                  <span>ĐVCĐ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'out_conv')}
                    title="Kéo độ rộng Xuất ĐVCĐ"
                  />
                </th>
              )}

              {/* Tồn cuối: ĐVC */}
              {visibleColumns.closing_main && (
                <th style={{ width: `${colWidths.closing_main}px`, textAlign: 'right' }}>
                  <span>ĐVC</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'closing_main')}
                    title="Kéo độ rộng Tồn cuối ĐVC"
                  />
                </th>
              )}

              {/* Tồn cuối: ĐVCĐ */}
              {visibleColumns.closing_conv && (
                <th style={{ width: `${colWidths.closing_conv}px`, textAlign: 'right' }}>
                  <span>ĐVCĐ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'closing_conv')}
                    title="Kéo độ rộng Tồn cuối ĐVCĐ"
                  />
                </th>
              )}

              {/* Hàng trả về: ĐVC */}
              {visibleColumns.return_main && (
                <th style={{ width: `${colWidths.return_main}px`, textAlign: 'right' }}>
                  <span>ĐVC</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'return_main')}
                    title="Kéo độ rộng Hàng trả về ĐVC"
                  />
                </th>
              )}

              {/* Hàng trả về: ĐVCĐ */}
              {visibleColumns.return_conv && (
                <th style={{ width: `${colWidths.return_conv}px`, textAlign: 'right' }}>
                  <span>ĐVCĐ</span>
                  <div
                    className="wh-col-resizer"
                    onMouseDown={(e) => startResizeCol(e, 'return_conv')}
                    title="Kéo độ rộng Hàng trả về ĐVCĐ"
                  />
                </th>
              )}
            </tr>
          </thead>

          {/* ── NỘI DUNG BẢNG ── */}
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={totalColumnsCount}
                  style={{ textAlign: 'center', padding: '40px 0', color: '#8D6E63' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        border: '3px solid #EADCC9',
                        borderTopColor: '#7B5233',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }}
                    />
                    <span>Đang tải dữ liệu tồn kho...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColumnsCount}
                  style={{ textAlign: 'center', padding: '40px 0', color: '#8D6E63' }}
                >
                  Không tìm thấy vật tư hoặc hàng hóa nào phù hợp với điều kiện lọc.
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const isOutOfStock = (Number(item.closing_main) || 0) <= 0;

                return (
                  <tr key={item.id}>
                    {/* Cột 1: STT */}
                    <td
                      className="wh-sticky-stt"
                      style={{
                        left: `${stickyLefts.stt}px`,
                        width: `${colWidths.stt}px`,
                        textAlign: 'center',
                        color: '#8D6E63'
                      }}
                    >
                      {startSTT + idx + 1}
                    </td>

                    {/* Cột 2: Mã vật tư */}
                    <td
                      className="wh-sticky-code"
                      style={{
                        left: `${stickyLefts.item_code}px`,
                        width: `${colWidths.item_code}px`,
                        textAlign: 'left',
                        fontWeight: 600,
                        color: '#2D1A12',
                        whiteSpace: 'nowrap'
                      }}
                      title={item.item_code}
                    >
                      <span
                        className="wh-material-link"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMaterial?.(item);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectMaterial?.(item);
                          }
                        }}
                        title={`Bấm xem chi tiết vật tư ${item.item_code}`}
                      >
                        {item.item_code}
                      </span>
                    </td>

                    {/* Cột 3: Tên vật tư / Goods */}
                    <td
                      className="wh-sticky-name"
                      style={{
                        left: `${stickyLefts.item_name}px`,
                        width: `${colWidths.item_name}px`,
                        textAlign: 'left',
                        whiteSpace: 'nowrap',
                        color: '#1E293B'
                      }}
                      title={item.item_name}
                    >
                      <span
                        className="wh-material-link"
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMaterial?.(item);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectMaterial?.(item);
                          }
                        }}
                        title={`Bấm xem chi tiết vật tư ${item.item_name}`}
                      >
                        {item.item_name}
                      </span>
                    </td>

                    {/* ĐVT: ĐVC */}
                    {visibleColumns.unit_main && (
                      <td style={{ width: `${colWidths.unit_main}px`, textAlign: 'center', color: '#5D4037' }}>
                        {item.unit_main || '—'}
                      </td>
                    )}

                    {/* ĐVT: ĐVCĐ */}
                    {visibleColumns.unit_conversion && (
                      <td style={{ width: `${colWidths.unit_conversion}px`, textAlign: 'center', color: '#8D6E63' }}>
                        {item.unit_conversion || '—'}
                      </td>
                    )}

                    {/* Tồn đầu: ĐVC */}
                    {visibleColumns.opening_main && (
                      <td style={{ width: `${colWidths.opening_main}px`, textAlign: 'right', color: '#1E293B' }}>
                        {formatNumber(item.opening_main)}
                      </td>
                    )}

                    {/* Tồn đầu: ĐVCĐ */}
                    {visibleColumns.opening_conv && (
                      <td style={{ width: `${colWidths.opening_conv}px`, textAlign: 'right', color: '#64748B' }}>
                        {formatNumber(item.opening_conv)}
                      </td>
                    )}

                    {/* Nhập: ĐVC */}
                    {visibleColumns.in_main && (
                      <td style={{ width: `${colWidths.in_main}px`, textAlign: 'right', color: '#1E293B' }}>
                        {formatNumber(item.in_main)}
                      </td>
                    )}

                    {/* Nhập: ĐVCĐ */}
                    {visibleColumns.in_conv && (
                      <td style={{ width: `${colWidths.in_conv}px`, textAlign: 'right', color: '#64748B' }}>
                        {formatNumber(item.in_conv)}
                      </td>
                    )}

                    {/* Xuất: ĐVC */}
                    {visibleColumns.out_main && (
                      <td style={{ width: `${colWidths.out_main}px`, textAlign: 'right', color: '#1E293B' }}>
                        {formatNumber(item.out_main)}
                      </td>
                    )}

                    {/* Xuất: ĐVCĐ */}
                    {visibleColumns.out_conv && (
                      <td style={{ width: `${colWidths.out_conv}px`, textAlign: 'right', color: '#64748B' }}>
                        {formatNumber(item.out_conv)}
                      </td>
                    )}

                    {/* Tồn cuối: ĐVC */}
                    {visibleColumns.closing_main && (
                      <td
                        style={{
                          width: `${colWidths.closing_main}px`,
                          textAlign: 'right',
                          fontWeight: 700,
                          color: isOutOfStock ? '#DC2626' : '#2D1A12'
                        }}
                      >
                        {formatNumber(item.closing_main)}
                      </td>
                    )}

                    {/* Tồn cuối: ĐVCĐ */}
                    {visibleColumns.closing_conv && (
                      <td
                        style={{
                          width: `${colWidths.closing_conv}px`,
                          textAlign: 'right',
                          color: isOutOfStock ? '#DC2626' : '#64748B',
                          fontWeight: 500
                        }}
                      >
                        {formatNumber(item.closing_conv)}
                      </td>
                    )}

                    {/* Hàng trả về: ĐVC */}
                    {visibleColumns.return_main && (
                      <td
                        style={{
                          width: `${colWidths.return_main}px`,
                          textAlign: 'right',
                          color: Number(item.return_main) > 0 ? '#B45309' : '#8D6E63',
                          fontWeight: Number(item.return_main) > 0 ? 600 : 400
                        }}
                      >
                        {Number(item.return_main) > 0 ? formatNumber(item.return_main) : '—'}
                      </td>
                    )}

                    {/* Hàng trả về: ĐVCĐ */}
                    {visibleColumns.return_conv && (
                      <td
                        style={{
                          width: `${colWidths.return_conv}px`,
                          textAlign: 'right',
                          color: Number(item.return_conv) > 0 ? '#B45309' : '#8D6E63'
                        }}
                      >
                        {Number(item.return_conv) > 0 ? formatNumber(item.return_conv) : '—'}
                      </td>
                    )}

                    {/* Thời gian tồn (Ngày) */}
                    {visibleColumns.inventory_days && (
                      <td style={{ width: `${colWidths.inventory_days}px`, textAlign: 'right', color: '#1E293B' }}>
                        {item.inventory_days ? `${item.inventory_days} ngày` : '—'}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>

          {/* ── DÒNG TỔNG CỘNG CUỐI BẢNG (STICKY FOOTER) ── */}
          {items.length > 0 && (
            <tfoot>
              <tr>
                {/* Nhóm nhãn Tổng cộng cố định */}
                <td
                  className="wh-sticky-stt"
                  style={{
                    left: `${stickyLefts.stt}px`,
                    width: `${colWidths.stt}px`,
                    textAlign: 'center',
                    fontWeight: 800
                  }}
                >
                  ∑
                </td>
                <td
                  className="wh-sticky-code"
                  style={{
                    left: `${stickyLefts.item_code}px`,
                    width: `${colWidths.item_code}px`,
                    textAlign: 'left',
                    fontWeight: 800,
                    color: '#7B5233'
                  }}
                >
                  TỔNG CỘNG
                </td>
                <td
                  className="wh-sticky-name"
                  style={{
                    left: `${stickyLefts.item_name}px`,
                    width: `${colWidths.item_name}px`,
                    textAlign: 'left',
                    fontWeight: 700,
                    color: '#2D1A12'
                  }}
                >
                  Toàn bộ {totalCount} mã vật tư
                </td>

                {/* ĐVT: ĐVC */}
                {visibleColumns.unit_main && (
                  <td style={{ width: `${colWidths.unit_main}px`, textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#2D1A12' }}>
                    {totals.unit_main_label || '—'}
                  </td>
                )}
                {/* ĐVT: ĐVCĐ */}
                {visibleColumns.unit_conversion && (
                  <td style={{ width: `${colWidths.unit_conversion}px`, textAlign: 'center', fontSize: '0.75rem', color: '#64748B' }}>
                    {totals.unit_conversion_label || '—'}
                  </td>
                )}

                {/* Tồn đầu: ĐVC */}
                {visibleColumns.opening_main && (
                  <td style={{ width: `${colWidths.opening_main}px`, textAlign: 'right', fontWeight: 700, color: '#2D1A12' }}>
                    {renderTotalQuantityCell('opening_main')}
                  </td>
                )}
                {/* Tồn đầu: ĐVCĐ */}
                {visibleColumns.opening_conv && (
                  <td style={{ width: `${colWidths.opening_conv}px`, textAlign: 'right', fontWeight: 600, color: '#64748B' }}>
                    {renderTotalQuantityCell('opening_conv')}
                  </td>
                )}

                {/* Nhập: ĐVC */}
                {visibleColumns.in_main && (
                  <td style={{ width: `${colWidths.in_main}px`, textAlign: 'right', fontWeight: 700, color: '#2D1A12' }}>
                    {renderTotalQuantityCell('in_main')}
                  </td>
                )}
                {/* Nhập: ĐVCĐ */}
                {visibleColumns.in_conv && (
                  <td style={{ width: `${colWidths.in_conv}px`, textAlign: 'right', fontWeight: 600, color: '#64748B' }}>
                    {renderTotalQuantityCell('in_conv')}
                  </td>
                )}

                {/* Xuất: ĐVC */}
                {visibleColumns.out_main && (
                  <td style={{ width: `${colWidths.out_main}px`, textAlign: 'right', fontWeight: 700, color: '#2D1A12' }}>
                    {renderTotalQuantityCell('out_main')}
                  </td>
                )}
                {/* Xuất: ĐVCĐ */}
                {visibleColumns.out_conv && (
                  <td style={{ width: `${colWidths.out_conv}px`, textAlign: 'right', fontWeight: 600, color: '#64748B' }}>
                    {renderTotalQuantityCell('out_conv')}
                  </td>
                )}

                {/* Tồn cuối: ĐVC */}
                {visibleColumns.closing_main && (
                  <td style={{ width: `${colWidths.closing_main}px`, textAlign: 'right', fontWeight: 800, color: '#2D1A12' }}>
                    {renderTotalQuantityCell('closing_main')}
                  </td>
                )}
                {/* Tồn cuối: ĐVCĐ */}
                {visibleColumns.closing_conv && (
                  <td style={{ width: `${colWidths.closing_conv}px`, textAlign: 'right', fontWeight: 600, color: '#64748B' }}>
                    {renderTotalQuantityCell('closing_conv')}
                  </td>
                )}

                {/* Hàng trả về: ĐVC */}
                {visibleColumns.return_main && (
                  <td style={{ width: `${colWidths.return_main}px`, textAlign: 'right', fontWeight: 700, color: '#B45309' }}>
                    {renderTotalQuantityCell('return_main')}
                  </td>
                )}
                {/* Hàng trả về: ĐVCĐ */}
                {visibleColumns.return_conv && (
                  <td style={{ width: `${colWidths.return_conv}px`, textAlign: 'right', fontWeight: 600, color: '#B45309' }}>
                    {renderTotalQuantityCell('return_conv')}
                  </td>
                )}

                {/* Thời gian tồn: KHÔNG CỘNG! */}
                {visibleColumns.inventory_days && (
                  <td style={{ width: `${colWidths.inventory_days}px`, textAlign: 'center', color: '#8D6E63' }}>
                    —
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default WarehouseInventoryTable;
