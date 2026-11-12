import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useColumnResizing.js (v7 ERP Enterprise Edition)
 * Hook quản lý kích thước và kéo giãn chiều rộng cột (Auto-fit & Column Resizing)
 * - Tự động tính toán và phân bổ 100% chiều rộng vùng chứa (Container Width), triệt tiêu khoảng trắng dư thừa
 * - Cột linh hoạt (isFlex: true) tự động co giãn hấp thụ không gian thừa
 * - Hỗ trợ kéo giãn cột mượt mà (Pointer & Mouse Events), ưu tiên điều tiết cột flex lân cận
 * - Tự động xuất hiện thanh cuộn ngang khi người dùng kéo mở rộng vượt vùng bảng
 * - Tự động ẩn thanh cuộn ngang khi thu nhỏ lại vừa vặn
 * - Tương thích màn hình 1920x1080, 1600x900 và đa độ phân giải qua ResizeObserver
 * - Lưu và khôi phục an toàn theo schema v7 trong localStorage
 */
export const useColumnResizing = ({ tableKey, columns = [], containerRef = null }) => {
  const limitsRef = useRef({});
  const defaultWidthsRef = useRef({});
  const flexColKeyRef = useRef(null);

  columns.forEach((col) => {
    limitsRef.current[col.key] = {
      min: col.minWidth || 35,
      max: col.maxWidth || 600
    };
    defaultWidthsRef.current[col.key] = col.defaultWidth || 100;
    if (col.isFlex && !flexColKeyRef.current) {
      flexColKeyRef.current = col.key;
    }
  });

  const STORAGE_KEY = `smartflow_col_widths_v7_${tableKey}`;

  // State theo dõi các cột đã được người dùng tùy chỉnh thủ công
  const [customizedCols, setCustomizedCols] = useState(() => {
    if (typeof window === 'undefined' || !tableKey) return new Set();
    try {
      // Dọn dẹp cache cũ v1..v6 của bảng này
      ['', '_v2_', '_v3_', '_v4_', '_v5_', '_v6_'].forEach((ver) => {
        try {
          localStorage.removeItem(`smartflow_col_widths${ver}${tableKey}`);
        } catch (_) {}
      });

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed._customizedCols)) {
            return new Set(parsed._customizedCols);
          }
        }
      }
    } catch (_) {}
    return new Set();
  });

  // State lưu trữ độ rộng các cột
  const [colWidths, setColWidths] = useState(() => {
    const defaults = { ...defaultWidthsRef.current };
    if (typeof window === 'undefined' || !tableKey) return defaults;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          const validated = { ...defaults };
          let validKeyCount = 0;

          columns.forEach((col) => {
            if (typeof parsed[col.key] === 'number') {
              const lim = limitsRef.current[col.key] || { min: 35, max: 600 };
              validated[col.key] = Math.max(lim.min, Math.min(lim.max, parsed[col.key]));
              validKeyCount++;
            }
          });

          if (validKeyCount === columns.length) {
            return validated;
          }
        }
      }
    } catch (e) {
      console.warn(`[useColumnResizing] Không thể đọc cấu hình cột cho ${tableKey}:`, e);
    }
    return defaults;
  });

  // State theo dõi cột đang được kéo
  const [resizingCol, setResizingCol] = useState(null);
  const dragInfoRef = useRef(null);

  // Hàm kiểm tra cột đã được kéo tùy chỉnh hay chưa
  const isColCustomized = useCallback((colKey) => {
    return customizedCols.has(colKey);
  }, [customizedCols]);

  // Hàm tính toán Auto-fit: cân đối độ rộng sao cho tổng bằng đúng clientWidth của container
  const computeAutoFitWidths = useCallback((availWidth, currentWidths) => {
    const flexKey = flexColKeyRef.current;
    if (!flexKey || availWidth <= 0) return currentWidths;

    // Tính tổng các cột cố định (không phải flex)
    let fixedSum = 0;
    columns.forEach((col) => {
      if (col.key !== flexKey) {
        fixedSum += currentWidths[col.key] || defaultWidthsRef.current[col.key] || 100;
      }
    });

    const flexLimits = limitsRef.current[flexKey] || { min: 95, max: 600 };
    // Cột flex nhận toàn bộ không gian còn lại để lấp đầy 100% bảng
    const targetFlexWidth = Math.max(flexLimits.min, availWidth - fixedSum);

    if (currentWidths[flexKey] === targetFlexWidth) return currentWidths;
    return { ...currentWidths, [flexKey]: targetFlexWidth };
  }, [columns]);

  // Kích hoạt tính toán Auto-fit thủ công khi cần
  const triggerAutoFit = useCallback(() => {
    const el = containerRef?.current;
    if (!el) return;
    const availWidth = el.clientWidth;
    if (availWidth > 0) {
      setColWidths((prev) => computeAutoFitWidths(availWidth, prev));
    }
  }, [containerRef, computeAutoFitWidths]);

  // Lắng nghe thay đổi kích thước container (Modal mở, resize cửa sổ, xuất hiện scrollbar dọc)
  useEffect(() => {
    const el = containerRef?.current;
    if (!el) return;

    const handleResize = () => {
      if (dragInfoRef.current) return; // Không can thiệp khi người dùng đang kéo chuột
      const availWidth = el.clientWidth;
      if (availWidth > 0) {
        setColWidths((prev) => computeAutoFitWidths(availWidth, prev));
      }
    };

    // Chạy ngay lần đầu
    handleResize();

    let ro = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(el);
    }

    return () => {
      if (ro) ro.disconnect();
    };
  }, [containerRef, computeAutoFitWidths]);

  // Bắt đầu kéo cột
  const startResize = useCallback((colKey, e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const flexKey = flexColKeyRef.current;
    const containerEl = containerRef?.current;
    const containerWidth = containerEl ? containerEl.clientWidth : 0;

    dragInfoRef.current = {
      colKey,
      startX,
      startColWidths: { ...colWidths },
      startColWidth: colWidths[colKey] || defaultWidthsRef.current[colKey] || 100,
      startFlexWidth: flexKey ? (colWidths[flexKey] || defaultWidthsRef.current[flexKey] || 100) : 0,
      limits: limitsRef.current[colKey] || { min: 35, max: 600 },
      flexLimits: flexKey ? (limitsRef.current[flexKey] || { min: 95, max: 600 }) : { min: 95, max: 600 },
      flexKey,
      containerWidth
    };

    setResizingCol(colKey);

    setCustomizedCols((prev) => {
      if (prev.has(colKey)) return prev;
      const next = new Set(prev);
      next.add(colKey);
      return next;
    });

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent) => {
      if (!dragInfoRef.current) return;
      const {
        colKey: activeKey,
        startX: sX,
        startColWidths,
        startColWidth: sW,
        startFlexWidth: sFlexW,
        limits: lim,
        flexLimits,
        flexKey: fKey
      } = dragInfoRef.current;

      const deltaX = moveEvent.clientX - sX;
      const desiredWidth = Math.max(lim.min, Math.min(lim.max, Math.round(sW + deltaX)));
      const actualDelta = desiredWidth - sW;

      setColWidths((prev) => {
        const next = { ...prev, [activeKey]: desiredWidth };

        // Nếu kéo cột thông thường và có cột flex, ưu tiên điều tiết cột flex để giữ bảng lấp đầy 100%
        if (fKey && activeKey !== fKey) {
          if (actualDelta > 0) {
            // Cột đang kéo giãn rộng hơn -> cột flex co lại nếu còn không gian
            const canShrink = Math.max(0, sFlexW - flexLimits.min);
            const absorbed = Math.min(canShrink, actualDelta);
            next[fKey] = sFlexW - absorbed;
          } else if (actualDelta < 0) {
            // Cột đang kéo thu nhỏ lại -> cột flex mở rộng để lấp đầy khoảng trống
            next[fKey] = sFlexW + Math.abs(actualDelta);
          }
        }

        return next;
      });
    };

    const handlePointerUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);

      if (dragInfoRef.current) {
        const finishedKey = dragInfoRef.current.colKey;
        setColWidths((latest) => {
          try {
            if (tableKey && typeof window !== 'undefined') {
              setCustomizedCols((cCols) => {
                const updatedCols = new Set(cCols);
                updatedCols.add(finishedKey);
                const toSave = {
                  ...latest,
                  _customized: true,
                  _customizedCols: Array.from(updatedCols)
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
                return updatedCols;
              });
            }
          } catch (err) {
            console.warn('[useColumnResizing] Lỗi lưu cấu hình cột:', err);
          }
          return latest;
        });
      }

      dragInfoRef.current = null;
      setResizingCol(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
  }, [colWidths, containerRef, tableKey, STORAGE_KEY]);

  // Khôi phục độ rộng mặc định và tự động cân đối lại theo container
  const resetWidths = useCallback(() => {
    const defaults = { ...defaultWidthsRef.current };
    const el = containerRef?.current;
    const availWidth = el ? el.clientWidth : 0;
    const fitted = availWidth > 0 ? computeAutoFitWidths(availWidth, defaults) : defaults;

    setColWidths(fitted);
    setCustomizedCols(new Set());
    try {
      if (tableKey && typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[useColumnResizing] Lỗi reset cột:', e);
    }
  }, [containerRef, computeAutoFitWidths, tableKey, STORAGE_KEY]);

  return {
    colWidths,
    resizingCol,
    startResize,
    resetWidths,
    isColCustomized,
    triggerAutoFit
  };
};

export default useColumnResizing;
