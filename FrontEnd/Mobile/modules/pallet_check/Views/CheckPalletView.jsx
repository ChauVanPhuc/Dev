import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@mobile/Shared/Views/components/layout/MobileLayout';
import PageHeader from '@mobile/Shared/Views/components/layout/MobilePageHeader';
import MessageModal from '@mobile/Shared/Views/components/feedback/MessageModal';
import ConfirmModal from '@mobile/Shared/Views/components/feedback/ConfirmModal';
import apiClient from '@shared/services/api';
import { 
  Camera, 
  Image as ImageIcon, 
  RotateCcw, 
  CheckCircle2, 
  History, 
  ScanLine, 
  Loader2,
  FileText,
  Clock,
  Plus,
  Eye,
  X,
  Layers,
  Cpu,
  Upload,
  SwitchCamera,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Tag,
  Package,
  AlertTriangle,
  ChevronRight,
  Volume2,
  Check,
  RotateCw,
  Barcode
} from 'lucide-react';

/**
 * Tạo mã Pallet ngẫu nhiên dạng Primary Key duy nhất khi xác nhận
 * Ví dụ: PL-260917-4821
 */
const generatePalletId = () => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PL-${yy}${mm}${dd}-${rand}`;
};

/**
 * Giữ nguyên độ phân giải ảnh siêu nét như bản Web để AI OCR đọc chính xác tuyệt đối từng mã vạch và ký tự nhỏ.
 * Chỉ resize nhẹ với bộ lọc chất lượng cao khi ảnh quá khổ (> 3000px) để không làm mờ tem nhãn.
 */
const compressImage = (dataUrl, maxDim = 3000, quality = 0.98) => {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
      return resolve(dataUrl);
    }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        // Giữ nguyên 100% chất lượng ảnh gốc, không nén mờ
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/**
 * Kiểm tra xem một mã (LPN hoặc SKU) có phải là "khác nhau nhất trong đám" (outlier / dán tem khác lứa) hay không:
 * - "Bằng nhau hết thì ko tô màu": Nếu tất cả các mã có số lượng bằng nhau hết và định dạng đồng nhất: return false.
 * - "Khác nhau nhất trong đám thì cho màu đỏ":
 *   + Mã có số lượng ít hơn hẳn số đông (thiểu số / lạc loài).
 *   + Hoặc mã có tiền tố/định dạng khác hẳn toàn bộ các mã còn lại trong pallet.
 */
const checkIsOutlier = (item, allItems) => {
  if (!allItems || allItems.length <= 1) return false;

  const itemCode = String(item?.code || '').trim();
  const itemCount = Number(item?.count) || 1;

  // 1. Phân tích số lượng (Count Analysis)
  const counts = allItems.map(it => Number(it?.count) || 1);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);

  // Nếu số lượng khác nhau
  if (minCount !== maxCount) {
    if (allItems.length === 2) {
      // Khi chỉ có 2 mã: mã có số lượng ít hơn đáng kể (<= 60% của mã số đông) là khác lứa
      // Ví dụ: 1 cái so với 2 cái (1 <= 1.2), 1 cái so với 10 cái (1 <= 6) -> RED
      if (itemCount === minCount && minCount <= maxCount * 0.6) {
        return true;
      }
    } else {
      // Khi có từ 3 mã trở lên:
      const countFreq = {};
      counts.forEach(c => {
        countFreq[c] = (countFreq[c] || 0) + 1;
      });

      // Tìm giá trị count phổ biến nhất (mode / số đông)
      let dominantCount = maxCount;
      let maxFreq = 0;
      Object.entries(countFreq).forEach(([cnt, freq]) => {
        if (freq > maxFreq) {
          maxFreq = freq;
          dominantCount = Number(cnt);
        }
      });

      // Nếu có nhóm số đông (ít nhất 2 mã có cùng số lượng dominantCount)
      if (maxFreq >= 2) {
        if (itemCount < dominantCount) {
          return true; // Mã này ít hơn nhóm số đông -> khác lứa
        }
      } else {
        // Nếu không có nhóm trùng lặp (ví dụ counts = [10, 5, 1]):
        if (itemCount === minCount) {
          return true;
        }
      }
    }
  }

  // 2. Phân tích định dạng / tiền tố mã (Prefix Anomaly khi có từ 3 mã trở lên)
  if (allItems.length >= 3 && itemCode.length >= 4) {
    const prefixLen = Math.min(4, itemCode.length);
    const itemPrefix = itemCode.slice(0, prefixLen).toUpperCase();

    const samePrefixCount = allItems.filter(it => {
      const c = String(it?.code || '').trim().toUpperCase();
      return c.slice(0, prefixLen) === itemPrefix;
    }).length;

    // Nếu chỉ duy nhất 1 mã này có tiền tố lạ trong khi đa số các mã khác (>= 66%) đều chung tiền tố
    if (samePrefixCount === 1) {
      const otherPrefixes = allItems
        .filter(it => it !== item)
        .map(it => String(it?.code || '').trim().slice(0, prefixLen).toUpperCase());

      const otherFreq = {};
      otherPrefixes.forEach(p => { otherFreq[p] = (otherFreq[p] || 0) + 1; });
      const dominantOtherFreq = Math.max(...Object.values(otherFreq));

      if (dominantOtherFreq >= 2 && (dominantOtherFreq / (allItems.length - 1)) >= 0.66) {
        return true; // Mã có series khác hoàn toàn với các lứa còn lại!
      }
    }
  }

  return false;
};

/**
 * Phân biệt tem Top nóc (dán trên nóc thùng, xoay dọc) và tem Pallet đứng (dán hông thùng)
 */
const isRoofRoi = (roi) => {
  if (!roi) return false;
  if (roi.label_category === 'top_roof') return true;
  if (roi.label_category === 'pallet_standing') return false;
  if (roi.is_vertical === true) return true;
  if (roi.applied_rotation === 90 || roi.applied_rotation === 270) return true;
  if (Array.isArray(roi.bbox) && roi.bbox.length >= 4) {
    const w = roi.bbox[2];
    const h = roi.bbox[3];
    if (h > w * 1.05) return true;
  }
  return false;
};

/**
 * ZoomPanModal: Trình xem ảnh tương tác cao cấp hỗ trợ mượt mà trên CẢ điện thoại (cảm ứng vuốt, chụm 2 ngón zoom, chạm đúp)
 * VÀ máy tính / laptop (cuộn chuột zoom mượt, kéo chuột di chuyển ảnh, phím tắt, xoay góc 90 độ).
 */
const ZoomPanModal = ({ isOpen, imageSrc, title = 'Phóng to ảnh', onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerRef = useRef(null);
  const dragStartRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 });
  const touchPinchRef = useRef(null);
  const lastTapRef = useRef(0);
  const hasMovedRef = useRef(false);

  // Lưu trữ state trong Ref để các event listener non-passive luôn đọc giá trị mới nhất
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const positionRef = useRef(position);
  positionRef.current = position;
  const isDraggingRef = useRef(isDragging);
  isDraggingRef.current = isDragging;

  // Reset trạng thái mỗi khi mở ảnh mới hoặc đóng modal
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
      hasMovedRef.current = false;
    }
  }, [isOpen, imageSrc]);

  // Phím tắt bàn phím trên máy tính (Esc, +, -, 0, R)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      } else if (e.key === 'r' || e.key === 'R') {
        handleRotate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Khóa cuộn trang web của body khi đang bật xem ảnh
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Xử lý cuộn chuột (Wheel) và cảm ứng Mobile (Pinch + Drag) bằng native listener không passive
  useEffect(() => {
    const el = containerRef.current;
    if (!isOpen || !el) return;

    // Cuộn chuột zoom trên Laptop / Desktop
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const zoomStep = e.deltaY < 0 ? 0.35 : -0.35;
      setScale((prevScale) => {
        const next = Math.min(Math.max(1, +(prevScale + zoomStep).toFixed(2)), 8);
        if (next === 1) {
          setPosition({ x: 0, y: 0 });
        }
        return next;
      });
    };

    // Bắt đầu chạm trên Điện thoại
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        dragStartRef.current = {
          startX: t.clientX,
          startY: t.clientY,
          posX: positionRef.current.x,
          posY: positionRef.current.y
        };
        hasMovedRef.current = false;
        setIsDragging(true);

        // Phát hiện chạm đúp (Double Tap) để phóng to nhanh 2.5x hoặc về 1x
        const now = Date.now();
        if (now - lastTapRef.current < 320) {
          if (scaleRef.current > 1) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
          } else {
            setScale(2.5);
          }
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;
      } else if (e.touches.length === 2) {
        // Bắt đầu chụm 2 ngón (Pinch Zoom)
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchPinchRef.current = {
          initialDist: dist,
          initialScale: scaleRef.current
        };
        setIsDragging(true);
      }
    };

    // Di chuyển chạm trên Điện thoại
    const onTouchMove = (e) => {
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 2 && touchPinchRef.current) {
        // Phóng to / Thu nhỏ bằng 2 ngón tay
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (touchPinchRef.current.initialDist > 0) {
          const factor = currentDist / touchPinchRef.current.initialDist;
          const nextScale = Math.min(Math.max(1, +(touchPinchRef.current.initialScale * factor).toFixed(2)), 8);
          setScale(nextScale);
          hasMovedRef.current = true;
        }
      } else if (e.touches.length === 1 && isDraggingRef.current) {
        // Kéo di chuyển ảnh bằng 1 ngón tay
        const t = e.touches[0];
        const dx = t.clientX - dragStartRef.current.startX;
        const dy = t.clientY - dragStartRef.current.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          hasMovedRef.current = true;
        }
        setPosition({
          x: dragStartRef.current.posX + dx,
          y: dragStartRef.current.posY + dy
        });
      }
    };

    // Kết thúc chạm trên Điện thoại
    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        touchPinchRef.current = null;
      }
      if (e.touches.length === 0) {
        setIsDragging(false);
        if (scaleRef.current <= 1) {
          setPosition({ x: 0, y: 0 });
        }
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });
    el.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isOpen]);

  // Xử lý kéo chuột trên Laptop / Desktop qua window event
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e) => {
      const dx = e.clientX - dragStartRef.current.startX;
      const dy = e.clientY - dragStartRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedRef.current = true;
      }
      setPosition({
        x: dragStartRef.current.posX + dx,
        y: dragStartRef.current.posY + dy
      });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      if (scaleRef.current <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDragging]);

  if (!isOpen || !imageSrc) return null;

  const handleZoomIn = () => {
    setScale((prev) => Math.min(+(prev + 0.5).toFixed(2), 8));
  };

  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(1, +(prev - 0.5).toFixed(2));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Click chuột bắt đầu kéo trên Laptop
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    e.preventDefault();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: positionRef.current.x,
      posY: positionRef.current.y
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleDoubleClick = () => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2.5);
    }
  };

  const handleBackdropClick = (e) => {
    // Chỉ đóng khi người dùng nhấn trúng khoảng nền tối bên ngoài ảnh và không thực hiện thao tác kéo
    if (e.target === containerRef.current && !hasMovedRef.current) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 15, 29, 0.96)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {/* HEADER BAR */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: '800', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: scale > 1 ? '#38bdf8' : '#94a3b8',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 8px',
              borderRadius: '12px',
              border: scale > 1 ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent'
            }}
          >
            {Math.round(scale * 100)}%
          </span>
          {rotation > 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                color: '#a78bfa',
                backgroundColor: 'rgba(167, 139, 250, 0.15)',
                padding: '2px 6px',
                borderRadius: '6px'
              }}
            >
              {rotation}°
            </span>
          )}
        </div>

        {/* Nút đóng X to rõ */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
          title="Đóng xem ảnh (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      {/* VIEWPORT CANVAS (DRAGGABLE & ZOOMABLE) */}
      <div
        ref={containerRef}
        onClick={handleBackdropClick}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'zoom-in'),
          touchAction: 'none'
        }}
      >
        <div
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={imageSrc}
            alt={title}
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            style={{
              maxWidth: '92vw',
              maxHeight: '72vh',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
          />
        </div>
      </div>

      {/* FOOTER TOOLBAR: CÁC NÚT ĐIỀU KHIỂN */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 10
        }}
      >
        {/* Floating dock buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(30, 41, 59, 0.92)',
            padding: '6px 12px',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Thu nhỏ */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: scale <= 1 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
              border: 'none',
              color: scale <= 1 ? '#64748b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: scale <= 1 ? 'not-allowed' : 'pointer'
            }}
            title="Thu nhỏ (-)"
          >
            <ZoomOut size={16} />
          </button>

          {/* Reset về 1:1 */}
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: '0 10px',
              height: '34px',
              borderRadius: '17px',
              backgroundColor: (scale !== 1 || rotation !== 0) ? '#7B5233' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
            title="Đặt lại kích thước chuẩn (Phím 0)"
          >
            <RotateCcw size={12} />
            <span>1:1</span>
          </button>

          {/* Phóng to */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 8}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: scale >= 8 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
              border: 'none',
              color: scale >= 8 ? '#64748b' : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: scale >= 8 ? 'not-allowed' : 'pointer'
            }}
            title="Phóng to (+)"
          >
            <ZoomIn size={16} />
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

          {/* Xoay 90 độ */}
          <button
            type="button"
            onClick={handleRotate}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="Xoay 90 độ (Phím R)"
          >
            <RotateCw size={15} />
          </button>

          <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 2px' }} />

          {/* Đóng */}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0 12px',
              height: '34px',
              borderRadius: '17px',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              fontSize: '11px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
            <span>Đóng</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckPalletView = () => {
  const navigate = useNavigate();
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Tab: 'scan' (Kiểm tra mới) | 'history' (Lịch sử)
  const [activeTab, setActiveTab] = useState('scan');

  // Mô hình áp dụng: EasyOCR Standard (Base Engine) nhận diện toàn diện ký tự & kích thước
  const [activeModelName, setActiveModelName] = useState('EasyOCR Standard (Base Engine)');
  const [selectedModel, setSelectedModel] = useState('base_gpu_backbone');
  const [availableModels, setAvailableModels] = useState([]);

  // Image & Scanner State (Hỗ trợ từ 1 đến 4 ảnh chụp, tối đa 4 ảnh)
  const [capturedImages, setCapturedImages] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSeconds, setScanSeconds] = useState(0);
  const imagePreview = capturedImages.length > 0 ? capturedImages[0] : null;

  // Camera Live Viewfinder State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Danh sách các mã LPN & SKU đọc được từ ảnh (Đồng bộ 100% chuẩn Web với số lượng tem đọc được)
  const [detectedLpns, setDetectedLpns] = useState([]); // [{ code: '060076250', count: 1 }]
  const [detectedSkus, setDetectedSkus] = useState([]); // [{ code: '1-72D-WOA', count: 3 }]
  const [itemsList, setItemsList] = useState([]);
  const [scanConfidence, setScanConfidence] = useState('');
  const [scanDetails, setScanDetails] = useState(null);
  const [mixedSkuAlert, setMixedSkuAlert] = useState(null);
  const [engineInfo, setEngineInfo] = useState({ lpn: '', sku: '', summary: '' });

  // Trạng thái đã bấm quét mã hay chưa (chỉ hiển thị kết quả khi người dùng xác nhận quét)
  const [hasScanned, setHasScanned] = useState(false);

  // 2 Tab Kết quả đọc: 'standing' (Pallet đứng - tem bình thường) | 'roof' (Top nóc - tem xoay dọc)
  const [palletResultTab, setPalletResultTab] = useState('standing');

  // Dữ liệu phân loại chi tiết 2 Tab
  const [standingLpns, setStandingLpns] = useState([]);
  const [standingSkus, setStandingSkus] = useState([]);
  const [roofLpns, setRoofLpns] = useState([]);
  const [roofSkus, setRoofSkus] = useState([]);
  const [roofByImage, setRoofByImage] = useState([]);

  // Mục tiêu số lượng ảnh cho Tab Top nóc (người dùng thiết lập từ 4 đến 8 bức, mặc định 4)
  const [roofTargetCount, setRoofTargetCount] = useState(4);

  // Cảnh báo sai lệch Pallet đứng (đồng nhất LPN / SKU)
  const [palletAnomaly, setPalletAnomaly] = useState({
    hasAnomaly: false,
    hasLpnAnomaly: false,
    hasSkuAnomaly: false,
    lpnWarning: '',
    skuWarning: ''
  });

  // Cảnh báo sai lệch Top nóc (sai lệch LPN / SKU giữa các ảnh nóc hoặc so với Pallet đứng)
  const [roofAnomaly, setRoofAnomaly] = useState({
    hasAnomaly: false,
    warning: '',
    hasStandingDiff: false
  });

  // Phát âm thanh chuông báo ĐẠT CHUẨN êm ái, du dương (Web Audio API)
  const playSuccessSound = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();

      // Nốt chuông kép C6 (1046.5Hz) -> E6 (1318.5Hz) trong trẻo, êm tai
      const now = ctx.currentTime;
      [
        { freq: 1046.5, time: now, dur: 0.12 },
        { freq: 1318.5, time: now + 0.09, dur: 0.20 }
      ].forEach(tone => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(tone.freq, tone.time);

        gain.gain.setValueAtTime(0.2, tone.time);
        gain.gain.exponentialRampToValueAtTime(0.001, tone.time + tone.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(tone.time);
        osc.stop(tone.time + tone.dur + 0.02);
      });

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(60);
      }
    } catch (err) {
      console.warn('Không thể phát âm thanh thành công:', err);
    }
  };

  // Phát âm thanh còi cảnh báo khi KHÔNG ĐẠT / LỆCH MÃ (Web Audio API)
  const playAlertSound = (repeatTimes = 3) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      for (let i = 0; i < repeatTimes; i++) {
        const startTime = ctx.currentTime + (i * 0.26);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Âm thanh còi báo động công nghiệp: 880Hz quét xuống 540Hz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, startTime);
        osc.frequency.exponentialRampToValueAtTime(540, startTime + 0.16);

        gain.gain.setValueAtTime(0.35, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.16);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.18);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 150, 300, 150, 500]);
      }
    } catch (err) {
      console.warn('Không thể phát âm thanh cảnh báo:', err);
    }
  };

  // Popup xem chi tiết các bước đọc nhãn & trạng thái phóng to
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAnnotatedIdx, setSelectedAnnotatedIdx] = useState(0);
  const [isBboxZoomed, setIsBboxZoomed] = useState(false);
  const [selectedRoiForZoom, setSelectedRoiForZoom] = useState(null);
  const [roiTab, setRoiTab] = useState('lpn'); // 'lpn' | 'sku'
  const [bocTachCategory, setBocTachCategory] = useState('all'); // 'all' | 'standing' | 'roof'
  const [expandedRoiId, setExpandedRoiId] = useState(null); // ID con tem đang phóng to tại chỗ

  // Modal Phóng to & Di chuyển tương tác cao cấp (Cảm ứng Mobile + Chuột Laptop)
  const [zoomModal, setZoomModal] = useState({
    isOpen: false,
    imageSrc: null,
    title: 'Phóng to ảnh'
  });

  const handleOpenZoom = (imageSrc, title = 'Phóng to ảnh') => {
    if (imageSrc) {
      setZoomModal({ isOpen: true, imageSrc, title });
    }
  };

  const handleCloseZoom = () => {
    setZoomModal({ isOpen: false, imageSrc: null, title: 'Phóng to ảnh' });
  };

  // Đánh giá & Ghi chú
  const [evaluationStatus, setEvaluationStatus] = useState('pass');
  const [note, setNote] = useState('');

  // Lịch sử kiểm tra
  const [historyList, setHistoryList] = useState([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [historyImageIdx, setHistoryImageIdx] = useState(0);
  const [isHistoryZoomed, setIsHistoryZoomed] = useState(false);

  // Modal State
  const [messageModal, setMessageModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Tải và tự động áp dụng mô hình tối ưu nhất từ Backend
  useEffect(() => {
    apiClient.get('/pallet-check/models')
      .then(res => {
        if (res.data?.success) {
          if (res.data.models && Array.isArray(res.data.models)) {
            setAvailableModels(res.data.models);
          }
          if (res.data.default_model_name) {
            setActiveModelName(res.data.default_model_name);
          }
          if (res.data.default_model) {
            setSelectedModel(res.data.default_model);
          }
        }
      })
      .catch(err => {
        console.log('Dùng mô hình tối ưu mặc định:', err);
      });
  }, []);

  // Đồng hồ đếm giây thời gian thực khi đang quét
  useEffect(() => {
    let timer = null;
    if (isScanning) {
      setScanSeconds(0);
      timer = setInterval(() => {
        setScanSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setScanSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isScanning]);

  // Khởi động luồng Camera trực tiếp (Webcam hoặc Camera sau điện thoại)
  const startCamera = async (facing = 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia không được hỗ trợ');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });

      streamRef.current = stream;
      setCameraFacing(facing);
      setIsCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.log('Video play error:', err));
        }
      }, 150);
    } catch (err) {
      console.warn('Không thể mở Camera qua getUserMedia, chuyển sang Camera hệ thống:', err);
      // Tự động kích hoạt native camera input nếu getUserMedia bị chặn hoặc không khả dụng
      setIsCameraOpen(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
        cameraInputRef.current.click();
      }
    }
  };

  // Tắt luồng camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  // Đổi camera trước / sau
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  // Bấm nút chụp ảnh từ luồng camera trực tiếp
  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL('image/jpeg', 0.95);
      stopCamera();
      const compressed = await compressImage(base64, 2400, 0.95);
      const nextImages = [...capturedImages, compressed].slice(0, 4);
      setCapturedImages(nextImages);
      setHasScanned(false);
    } catch (err) {
      console.error('Lỗi khi chụp hình từ video:', err);
      stopCamera();
    }
  };

  // Mở thư viện chọn tệp ảnh từ máy
  const handleOpenGallery = () => {
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
      galleryInputRef.current.click();
    }
  };

  // Dọn dẹp stream khi unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Xử lý nạp danh sách 1 đến 4 ảnh Base64 và gửi lên Backend phân tích LPN & SKU
  const processImages = async (imagesList) => {
    if (!imagesList || imagesList.length === 0) {
      setDetectedLpns([]);
      setDetectedSkus([]);
      setItemsList([]);
      setScanConfidence('');
      setScanDetails(null);
      setHasScanned(false);
      return;
    }

    setIsScanning(true);
    setHasScanned(true);
    setDetectedLpns([]);
    setDetectedSkus([]);
    setItemsList([]);
    setScanConfidence('');
    setScanDetails(null);

    try {
      // Gọi Backend Module /pallet-check/scan với danh sách tối đa 4 ảnh (timeout 120s cho mô hình Deep Learning quét đa ảnh)
      const response = await apiClient.post(
        '/pallet-check/scan',
        {
          images_base64: imagesList.slice(0, 4),
          model_id: selectedModel
        },
        {
          timeout: 120000
        }
      );

      if (response.data && response.data.success) {
        const data = response.data;
        if (data.model_short_name) {
          setActiveModelName(data.model_short_name);
        }

        const lpns = (data.detected_lpns_detail && data.detected_lpns_detail.length > 0)
          ? data.detected_lpns_detail
          : (data.primary_lpn ? [{ code: data.primary_lpn, count: 1, is_primary: true }] : []);

        const skus = (data.detected_skus_detail && data.detected_skus_detail.length > 0)
          ? data.detected_skus_detail
          : (data.primary_sku ? [{ code: data.primary_sku, count: 1, is_primary: true }] : []);

        const standingLpnList = data.standing_lpns_detail || [];
        const standingSkuList = data.standing_skus_detail || [];
        const roofLpnList = data.roof_lpns_detail || [];
        const roofSkuList = data.roof_skus_detail || [];
        const roofByImgList = data.roof_by_image || [];

        // Lưu danh sách tổng thể và danh sách phân loại 2 Tab
        setDetectedLpns(lpns);
        setDetectedSkus(skus);
        setStandingLpns(standingLpnList.length > 0 ? standingLpnList : lpns);
        setStandingSkus(standingSkuList.length > 0 ? standingSkuList : skus);
        setRoofLpns(roofLpnList);
        setRoofSkus(roofSkuList);
        setRoofByImage(roofByImgList);

        // Kiểm tra tính đồng nhất của Pallet đứng (cùng 1 lúc):
        const effectiveStandingLpns = standingLpnList.length > 0 ? standingLpnList : lpns;
        const effectiveStandingSkus = standingSkuList.length > 0 ? standingSkuList : skus;
        const uniqueStandingLpns = Array.from(new Set(effectiveStandingLpns.map(it => it.code).filter(Boolean)));
        const uniqueStandingSkus = Array.from(new Set(effectiveStandingSkus.map(it => it.code).filter(Boolean)));

        const hasLpnError = uniqueStandingLpns.length > 1;
        const hasSkuError = uniqueStandingSkus.length > 1;
        const hasAnyError = hasLpnError || hasSkuError;

        const anomalyState = {
          hasAnomaly: hasAnyError,
          hasLpnAnomaly: hasLpnError,
          hasSkuAnomaly: hasSkuError,
          lpnWarning: hasLpnError ? `Phát hiện ${uniqueStandingLpns.length} mã LPN không giống nhau trên Pallet đứng: ${uniqueStandingLpns.join(', ')}` : '',
          skuWarning: hasSkuError ? `Phát hiện ${uniqueStandingSkus.length} mã SKU không giống nhau trên Pallet đứng: ${uniqueStandingSkus.join(', ')}` : ''
        };
        setPalletAnomaly(anomalyState);

        // Cập nhật trạng thái cảnh báo Top nóc (chỉ xét khi có từ 2 mã khác nhau giữa các ảnh nóc)
        const hasRoofContent = roofLpnList.length > 0 || roofSkuList.length > 0;
        const hasRoofDiff = Boolean(data.has_roof_anomaly) && hasRoofContent;
        setRoofAnomaly({
          hasAnomaly: hasRoofDiff,
          warning: hasRoofDiff ? (data.roof_anomaly_warning || '') : '',
          hasStandingDiff: false
        });

        // PHÂN BIỆT RẠCH RÒI ÂM THANH KHI ĐẠT CHUẨN VÀ KHI KHÔNG ĐẠT (SAI SÓT):
        if (hasAnyError) {
          // KHÔNG ĐẠT: Lệch mã LPN hoặc SKU trên Pallet đứng -> Phát còi báo động khẩn cấp
          playAlertSound(3);
        } else if (hasRoofDiff) {
          // KHÔNG ĐẠT: Lệch mã giữa các ảnh Top nóc -> Phát còi báo động
          playAlertSound(2);
        } else if (effectiveStandingLpns.length > 0 || effectiveStandingSkus.length > 0) {
          // ĐẠT CHUẨN ĐỒNG NHẤT 100% -> Phát chuông báo đạt du dương, êm ái (Ting!)
          playSuccessSound();
        }

        setItemsList(data.items || []);
        setScanConfidence(data.confidence || '99.1%');
        setScanDetails(data.details || null);
        if (data.is_mixed_sku) {
          setMixedSkuAlert({
            warning: data.mixed_sku_warning,
            breakdown: data.sku_breakdown
          });
        } else {
          setMixedSkuAlert(null);
        }
        setEngineInfo({
          lpn: data.lpn_engine || '',
          sku: data.sku_engine || '',
          summary: data.model_source_summary || ''
        });
        setEvaluationStatus('pass');

        if (lpns.length === 0 && skus.length === 0) {
          setMessageModal({
            isOpen: true,
            type: 'warning',
            title: 'Chưa phát hiện mã',
            message: 'Không phát hiện được mã LPN hoặc SKU hợp lệ trên ảnh này. Vui lòng chụp rõ nét hơn hoặc thêm mã trực tiếp.'
          });
        }
      } else {
        const errMsg = response.data?.error || 'Không phát hiện được mã LPN hoặc SKU hợp lệ trên ảnh này.';
        setMessageModal({
          isOpen: true,
          type: 'warning',
          title: 'Chưa phát hiện mã',
          message: `${errMsg} Vui lòng chụp rõ nét hơn hoặc thêm mã trực tiếp.`
        });
        setDetectedLpns([]);
        setDetectedSkus([]);
        setItemsList([]);
        setScanConfidence('0%');
      }
    } catch (error) {
      console.error('Lỗi khi gọi API AI OCR Scanner:', error);
      let errMsg = error.response?.data?.detail || error.message || 'Lỗi kết nối máy chủ quét AI OCR.';
      if (error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))) {
        errMsg = 'Quá trình phân tích AI OCR qua nhiều ảnh mất nhiều thời gian hơn quy định. Vui lòng bấm Quét lại hoặc thử quét từng góc chụp rõ nét.';
      }
      setMessageModal({
        isOpen: true,
        type: 'error',
        title: 'Lỗi nhận diện ảnh',
        message: errMsg
      });
      setDetectedLpns([]);
      setDetectedSkus([]);
      setItemsList([]);
      setScanConfidence('0%');
    } finally {
      setIsScanning(false);
    }
  };

  // Wrapper tương thích ngược
  const processImageBase64 = (base64) => {
    const nextImages = [base64];
    setCapturedImages(nextImages);
    setHasScanned(false);
  };

  // Xử lý khi chọn ảnh từ file input (Hỗ trợ 1 hoặc nhiều ảnh, tối đa 4 ảnh)
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 4 - capturedImages.length;
    if (remainingSlots <= 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Đạt tối đa ảnh',
        message: 'Hệ thống chỉ hỗ trợ chụp và phân tích tối đa 4 bức ảnh cho mỗi pallet.'
      });
      return;
    }

    const targetFiles = files.slice(0, remainingSlots);
    const compressedList = [];
    for (const f of targetFiles) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result);
        reader.readAsDataURL(f);
      });
      const compressed = await compressImage(dataUrl, 2400, 0.95);
      compressedList.push(compressed);
    }

    const nextImages = [...capturedImages, ...compressedList].slice(0, 4);
    setCapturedImages(nextImages);
    setHasScanned(false);
  };

  // Xóa một bức ảnh và reset trạng thái quét
  const handleRemoveImage = (indexToRemove) => {
    const nextImages = capturedImages.filter((_, idx) => idx !== indexToRemove);
    setCapturedImages(nextImages);
    setHasScanned(false);
    setDetectedLpns([]);
    setDetectedSkus([]);
    setStandingLpns([]);
    setStandingSkus([]);
    setRoofLpns([]);
    setRoofSkus([]);
    setRoofByImage([]);
    setPalletAnomaly({ hasAnomaly: false, hasLpnAnomaly: false, hasSkuAnomaly: false, lpnWarning: '', skuWarning: '' });
    setItemsList([]);
    setScanConfidence('');
    setScanDetails(null);
    setMixedSkuAlert(null);
    setEngineInfo({ lpn: '', sku: '', summary: '' });
    setExpandedRoiId(null);
    setSelectedRoiForZoom(null);
  };

  // Làm mới / Xóa toàn bộ ảnh
  const handleRetakeImage = () => {
    setCapturedImages([]);
    setHasScanned(false);
    setDetectedLpns([]);
    setDetectedSkus([]);
    setStandingLpns([]);
    setStandingSkus([]);
    setRoofLpns([]);
    setRoofSkus([]);
    setRoofByImage([]);
    setPalletAnomaly({ hasAnomaly: false, hasLpnAnomaly: false, hasSkuAnomaly: false, lpnWarning: '', skuWarning: '' });
    setItemsList([]);
    setScanConfidence('');
    setScanDetails(null);
    setMixedSkuAlert(null);
    setEngineInfo({ lpn: '', sku: '', summary: '' });
    setShowDetailsModal(false);
    setSelectedAnnotatedIdx(0);
    setExpandedRoiId(null);
    setSelectedRoiForZoom(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  // Reset toàn bộ form
  const handleResetForm = () => {
    handleRetakeImage();
    setEvaluationStatus('pass');
    setNote('');
  };

  // Cập nhật mã LPN
  const handleUpdateLpn = (index, value) => {
    setDetectedLpns(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], code: value };
      return copy;
    });
  };

  // Xóa mã LPN
  const handleRemoveLpn = (index) => {
    setDetectedLpns(prev => prev.filter((_, i) => i !== index));
  };

  // Thêm mã LPN mới
  const handleAddLpn = () => {
    setDetectedLpns(prev => [...prev, { code: '', count: 1 }]);
  };

  // Cập nhật mã SKU
  const handleUpdateSku = (index, value) => {
    setDetectedSkus(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], code: value };
      return copy;
    });
  };

  // Xóa mã SKU
  const handleRemoveSku = (index) => {
    setDetectedSkus(prev => prev.filter((_, i) => i !== index));
  };

  // Thêm mã SKU mới
  const handleAddSku = () => {
    setDetectedSkus(prev => [...prev, { code: '', count: 1 }]);
  };

  // Lấy tên hiển thị của mô hình tối ưu đang áp dụng
  const getSelectedModelLabel = () => {
    return activeModelName;
  };

  // Mở popup xác nhận kiểm tra
  const handleConfirmClick = () => {
    if (capturedImages.length === 0) {
      setMessageModal({
        isOpen: true,
        type: 'warning',
        title: 'Chưa có ảnh',
        message: 'Vui lòng chụp ít nhất 1 ảnh Pallet trước khi xác nhận!'
      });
      return;
    }

    const generatedKey = generatePalletId();

    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận kiểm tra Pallet',
      message: `Hệ thống sẽ tự sinh mã Pallet: [${generatedKey}]. Bạn có chắc chắn muốn lưu kết quả kiểm tra này không?`,
      onConfirm: () => executeSave(generatedKey)
    });
  };

  // Thực hiện lưu kết quả kiểm tra
  const executeSave = (generatedKey) => {
    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const hasStandingOutlier = (standingLpns || []).some(l => checkIsOutlier(l, standingLpns)) ||
                               (standingSkus || []).some(s => checkIsOutlier(s, standingSkus));
    const hasRoofOutlier = (roofLpns || []).some(l => checkIsOutlier(l, roofLpns)) ||
                           (roofSkus || []).some(s => checkIsOutlier(s, roofSkus));
    const hasOutlier = hasStandingOutlier || hasRoofOutlier;
    const allImgs = (capturedImages && capturedImages.length > 0)
      ? capturedImages
      : (scanDetails?.annotated_images && scanDetails.annotated_images.length > 0
          ? scanDetails.annotated_images
          : (scanDetails?.image ? [scanDetails.image] : []));

    const newRecord = {
      id: generatedKey,
      model: activeModelName || 'EasyOCR Standard (Base Engine)',
      lpns: detectedLpns,
      skus: detectedSkus,
      standingLpns: standingLpns,
      standingSkus: standingSkus,
      roofLpns: roofLpns,
      roofSkus: roofSkus,
      roofByImage: roofByImage,
      palletAnomaly: palletAnomaly,
      items: itemsList,
      status: (hasOutlier || palletAnomaly.hasAnomaly) ? 'fail' : 'pass',
      timestamp: timeStr,
      note: note.trim(),
      images: allImgs,
      image: allImgs[0] || null,
      scanDetails: scanDetails
    };

    setHistoryList(prev => [newRecord, ...prev]);

    setMessageModal({
      isOpen: true,
      type: 'success',
      title: 'Thành công',
      message: `Đã lưu thành công cho Pallet [${generatedKey}]!`
    });

    // Reset chuẩn bị cho lượt tiếp theo
    handleResetForm();
  };

  // ─── Style Constants (Chuẩn Brand G7 Mobile) ─────────────────────────
  const card = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid #e8e1d5',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  };

  const sectionLabel = {
    fontSize: '0.75rem',
    fontWeight: '800',
    color: '#78523b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  return (
    <Layout>
      <PageHeader
        title="G7 - Smart Flow"
        subTitle="MB30 | Kiểm Tra Pallet"
      />

      <div style={{
        backgroundColor: 'var(--bg-cream, #fcf8f1)',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        minHeight: 0,
        padding: '14px 14px 110px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box',
        width: '100%',
        maxWidth: '100%'
      }}>

        {/* ─── TAB CHUYỂN ĐỔI: KIỂM TRA MỚI / LỊCH SỬ ─── */}
        <div style={{
          display: 'flex',
          gap: '6px',
          backgroundColor: '#eae3d2',
          padding: '4px',
          borderRadius: '12px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'scan' ? '#ffffff' : 'transparent',
              color: activeTab === 'scan' ? '#4b301e' : '#7c6d5e',
              boxShadow: activeTab === 'scan' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <ScanLine size={15} />
            <span>Kiểm Tra Mới</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              flex: 1,
              padding: '9px 12px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '12px',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              backgroundColor: activeTab === 'history' ? '#ffffff' : 'transparent',
              color: activeTab === 'history' ? '#4b301e' : '#7c6d5e',
              boxShadow: activeTab === 'history' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
            }}
          >
            <History size={15} />
            <span>Lịch Sử ({historyList.length})</span>
          </button>
        </div>

        {/* ================================================================ */}
        {/* TAB 1: KIỂM TRA MỚI (CHỤP HÌNH & ĐỌC BẢNG LPN - SKU) */}
        {/* ================================================================ */}
        {activeTab === 'scan' && (
          <>
            {/* THẺ THÔNG TIN ẢNH CHỤP (HỖ TRỢ 1 ĐẾN 4 BỨC ẢNH) */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={sectionLabel}>
                  <Camera size={15} color="#4b301e" /> THÔNG TIN ẢNH CHỤP
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {capturedImages.length > 0 && (
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#7B5233',
                      backgroundColor: '#FAF4EE',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid #EADCC9'
                    }}>
                      {capturedImages.length}/4 ảnh
                    </span>
                  )}
                  {/* Nút Chi tiết đặt ngay bên cạnh chỗ / ảnh khi quét xong */}
                  {hasScanned && !isScanning && (
                    <button
                      type="button"
                      onClick={() => setShowDetailsModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#FAF4EE',
                        color: '#7B5233',
                        border: '1px solid #D5C7B7',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <Eye size={12} />
                      <span>Chi tiết</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Input ngầm cho Camera và Thư viện */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <input
                type="file"
                id="gallery-file-input"
                ref={galleryInputRef}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {/* Vùng nạp ảnh khi chưa có ảnh nào */}
              {capturedImages.length === 0 ? (
                <div style={{
                  border: '2px dashed #cbd5e1',
                  backgroundColor: '#faf4ee',
                  borderRadius: '14px',
                  padding: '20px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    backgroundColor: '#4b301e',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(75, 48, 30, 0.2)'
                  }}>
                    <Camera size={24} />
                  </div>

                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#4b301e' }}>
                      Chụp hình Pallet & Tem nhãn
                    </div>
                  </div>

                  {/* Nút hành động chụp / chọn ảnh */}
                  <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '320px', marginTop: '4px' }}>
                    <button
                      type="button"
                      onClick={() => startCamera()}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(75, 48, 30, 0.2)'
                      }}
                    >
                      <Camera size={16} /> Chụp ảnh
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenGallery}
                      style={{
                        flex: 1,
                        height: '42px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#4b301e',
                        fontWeight: '800',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={16} /> Thư viện
                    </button>
                  </div>
                </div>
              ) : (
                /* LƯỚI ẢNH ĐÃ CHỤP (TỪ 1 ĐẾN 4 ẢNH CÓ NÚT X ĐẶT TRÊN GÓC PHẢI TỪNG ẢNH) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {capturedImages.length === 1 ? (
                    /* Khi chỉ có 1 ảnh: Hiển thị khung lớn kèm nút X ở góc trên */
                    <div style={{
                      position: 'relative',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #e8e1d5',
                      backgroundColor: '#0f172a',
                      minHeight: '180px',
                      maxHeight: '260px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={capturedImages[0]}
                        alt="Pallet Ảnh 1"
                        onClick={() => handleOpenZoom(capturedImages[0], 'Ảnh chụp Pallet 1')}
                        title="Bấm để phóng to và di chuyển ảnh"
                        style={{ width: '100%', maxHeight: '260px', objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                      />
                      {/* Nút X xóa ảnh đặt trực tiếp trên góc phải bức ảnh (background không màu, icon đỏ) */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(0)}
                        title="Xóa ảnh này"
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '4px',
                          filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85))',
                          zIndex: 10
                        }}
                      >
                        <X size={22} strokeWidth={3} />
                      </button>

                      <span style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        color: '#ffffff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backdropFilter: 'blur(2px)'
                      }}>
                        Ảnh 1/4
                      </span>
                    </div>
                  ) : (
                    /* Khi có 2 đến 4 ảnh: Hiển thị lưới 2 cột trực quan */
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      width: '100%'
                    }}>
                      {capturedImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid #e8e1d5',
                            backgroundColor: '#0f172a',
                            height: '135px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Pallet Ảnh ${idx + 1}`}
                            onClick={() => handleOpenZoom(imgUrl, `Ảnh chụp Pallet ${idx + 1}`)}
                            title="Bấm để phóng to và di chuyển ảnh"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                          />
                          {/* Nút X xóa ảnh đặt nổi trên góc phải bức ảnh (background không màu, icon đỏ) */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            title={`Xóa ảnh ${idx + 1}`}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '3px',
                              filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0, 0.85))',
                              zIndex: 10
                            }}
                          >
                            <X size={20} strokeWidth={3} />
                          </button>

                          {/* Badge thứ tự ảnh */}
                          <span style={{
                            position: 'absolute',
                            bottom: '6px',
                            left: '6px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backdropFilter: 'blur(2px)'
                          }}>
                            Ảnh {idx + 1}
                          </span>
                        </div>
                      ))}

                    </div>
                  )}

                  {/* Các nút Chụp thêm & Thư viện nằm bên dưới danh sách ảnh */}
                  {capturedImages.length < 4 && (
                    <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: '8px' }}>
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          backgroundColor: '#4b301e',
                          color: '#ffffff',
                          borderRadius: '10px',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(75, 48, 30, 0.15)'
                        }}
                      >
                        <Camera size={14} /> Chụp thêm
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenGallery}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          backgroundColor: '#ffffff',
                          color: '#4b301e',
                          borderRadius: '10px',
                          border: '1.5px solid #cbd5e1',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Upload size={14} /> Thư viện
                      </button>
                    </div>
                  )}

                  {/* Nút Quét lại khi bộ đếm đọc xong: Đặt ngay bên dưới 2 nút Chụp ảnh & Thư viện ảnh */}
                  {hasScanned && !isScanning && capturedImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        processImages(capturedImages);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1.5px solid #7B5233',
                        backgroundColor: '#FAF4EE',
                        color: '#4b301e',
                        fontWeight: '800',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        marginTop: '8px',
                        boxShadow: '0 1px 3px rgba(75, 48, 30, 0.08)'
                      }}
                    >
                      <RotateCcw size={14} color="#4b301e" /> Quét lại ({capturedImages.length} ảnh)
                    </button>
                  )}

                  {/* Nút bấm để quét toàn bộ ảnh cùng 1 lúc khi chưa quét */}
                  {!isScanning && !hasScanned && capturedImages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setHasScanned(true);
                        processImages(capturedImages);
                      }}
                      style={{
                        width: '100%',
                        height: '42px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 3px 10px rgba(75, 48, 30, 0.25)',
                        marginTop: '8px'
                      }}
                    >
                      <ScanLine size={16} /> Bắt đầu quét ({capturedImages.length} ảnh)
                    </button>
                  )}

                  {/* Trạng thái đang quét kèm đồng hồ đếm giây */}
                  {isScanning && (
                    <div style={{
                      backgroundColor: '#faf4ee',
                      border: '1px solid #f0ede8',
                      borderRadius: '10px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      color: '#5d3b32',
                      marginTop: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '12px', fontWeight: '700' }}>
                          Đang phân tích {capturedImages.length} bức ảnh bằng AI OCR...
                        </span>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#ffffff',
                        backgroundColor: '#7B5233',
                        padding: '3px 8px',
                        borderRadius: '12px'
                      }}>
                        {scanSeconds}s
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* THẺ THÔNG TIN ĐỌC TỪ HÌNH ẢNH: 2 TAB CHUYỂN ĐỔI (PALLET ĐỨNG & TOP NÓC) */}
            {(hasScanned || isScanning || detectedLpns.length > 0 || detectedSkus.length > 0) && (
              <div style={card}>
                {/* THANH CHUYỂN ĐỔI 2 TAB: 1. PALLET ĐỨNG | 2. TOP NÓC */}
                <div style={{
                  display: 'flex',
                  backgroundColor: '#FAF5EE',
                  padding: '4px',
                  borderRadius: '10px',
                  border: '1px solid #EADCC9',
                  gap: '4px'
                }}>
                  {/* TAB 1: PALLET ĐỨNG */}
                  <button
                    type="button"
                    onClick={() => setPalletResultTab('standing')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backgroundColor: palletResultTab === 'standing' ? '#ffffff' : 'transparent',
                      color: palletResultTab === 'standing' ? '#4b301e' : '#7c6d5e',
                      boxShadow: palletResultTab === 'standing' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Package size={15} color={palletResultTab === 'standing' ? '#4b301e' : '#7c6d5e'} />
                    <span>Pallet đứng</span>
                  </button>

                  {/* TAB 2: TOP NÓC */}
                  <button
                    type="button"
                    onClick={() => setPalletResultTab('roof')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      backgroundColor: palletResultTab === 'roof' ? '#ffffff' : 'transparent',
                      color: palletResultTab === 'roof' ? '#4b301e' : '#7c6d5e',
                      boxShadow: palletResultTab === 'roof' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Layers size={15} color={palletResultTab === 'roof' ? '#4b301e' : '#7c6d5e'} />
                    <span>Top nóc</span>
                    <span style={{
                      fontSize: '10px',
                      backgroundColor: capturedImages.length >= roofTargetCount ? '#DCFCE7' : '#FEF3C7',
                      color: capturedImages.length >= roofTargetCount ? '#15803D' : '#92400E',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: '800'
                    }}>
                      {capturedImages.length}/{roofTargetCount} ảnh
                    </span>
                  </button>
                </div>

                {/* ============================================================== */}
                {/* NỘI DUNG TAB 1: PALLET ĐỨNG (CÁC NHÃN BÌNH THƯỜNG / NẰM NGANG) */}
                {/* ============================================================== */}
                {palletResultTab === 'standing' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>

                    {/* CẢNH BÁO KHI PALLET ĐỨNG CÓ SỰ SAI LỆCH (LỆCH LPN HOẶC LỆCH SKU) */}
                    {palletAnomaly.hasAnomaly ? (
                      <div style={{
                        padding: '10px 12px',
                        backgroundColor: '#FEF2F2',
                        border: '2px solid #EF4444',
                        borderRadius: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={18} color="#DC2626" />
                            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#991B1B' }}>
                              CẢNH BÁO: PALLET CÓ SỰ SAI LỆCH!
                            </span>
                          </div>
                          {/* Nút bấm nghe lại còi cảnh báo */}
                          <button
                            type="button"
                            onClick={() => playAlertSound(3)}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              border: '1px solid #F87171',
                              backgroundColor: '#FFFFFF',
                              color: '#DC2626',
                              fontSize: '0.68rem',
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            <Volume2 size={12} /> Còi báo (x3)
                          </button>
                        </div>

                        {palletAnomaly.hasLpnAnomaly && (
                          <div style={{ fontSize: '0.74rem', color: '#B91C1C', fontWeight: '800' }}>
                            {palletAnomaly.lpnWarning || 'Nhãn LPN SAI: Các mã LPN trên Pallet đứng không giống nhau!'}
                          </div>
                        )}

                        {palletAnomaly.hasSkuAnomaly && (
                          <div style={{ fontSize: '0.74rem', color: '#B91C1C', fontWeight: '800' }}>
                            {palletAnomaly.skuWarning || 'Nhãn SKU SAI: Các mã SKU trên Pallet đứng không giống nhau!'}
                          </div>
                        )}
                      </div>
                    ) : (
                      (standingLpns.length > 0 || standingSkus.length > 0) && (
                        <div style={{
                          padding: '6px 10px',
                          backgroundColor: '#F0FDF4',
                          border: '1px solid #86EFAC',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.72rem',
                          color: '#166534',
                          fontWeight: '700'
                        }}>
                          <Check size={14} color="#16A34A" />
                          <span>Pallet đứng đồng nhất: Tất cả các nhãn đều cùng mã SKU & LPN.</span>
                        </div>
                      )
                    )}

                    {/* 2 CỘT MÃ LPN & MÃ SKU CỦA TAB PALLET ĐỨNG */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      {/* Cột 1: LPN Pallet đứng */}
                      <div style={{
                        border: '1px solid #EADCC9',
                        borderRadius: '8px',
                        backgroundColor: '#FAF8F5',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0
                      }}>
                        <div style={{
                          padding: '5px 8px',
                          backgroundColor: '#FAF8F5',
                          borderBottom: '1px solid #EADCC9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4E3629', textTransform: 'uppercase' }}>
                            MÃ LPN
                          </span>
                          <span style={{ fontSize: '0.67rem', color: '#7B5233', fontWeight: '700', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '3px' }}>
                            {standingLpns.length} mã
                          </span>
                        </div>

                        <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                          {standingLpns.length === 0 ? (
                            <div style={{ padding: '16px 6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                              Chưa có mã LPN
                            </div>
                          ) : (
                            standingLpns.map((itemLpn, idx) => {
                              const isOutlier = checkIsOutlier(itemLpn, standingLpns);
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: isOutlier ? '#FEF2F2' : '#FFFFFF',
                                    border: isOutlier ? '1.5px solid #EF4444' : '1px solid #EADCC9',
                                    boxShadow: isOutlier ? '0 1px 4px rgba(239, 68, 68, 0.2)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px',
                                    minWidth: 0
                                  }}
                                >
                                  <span style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontSize: '0.82rem',
                                    fontWeight: '800',
                                    color: isOutlier ? '#DC2626' : '#1F2937',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {itemLpn.code}
                                  </span>
                                  <span style={{
                                    fontSize: '0.66rem',
                                    color: isOutlier ? '#DC2626' : '#4B5563',
                                    fontWeight: '700',
                                    backgroundColor: isOutlier ? '#FEE2E2' : '#FAF8F5',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: isOutlier ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}>
                                    {itemLpn.count || 1} cái
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Cột 2: SKU Pallet đứng */}
                      <div style={{
                        border: '1px solid #EADCC9',
                        borderRadius: '8px',
                        backgroundColor: '#FAF8F5',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: 0
                      }}>
                        <div style={{
                          padding: '5px 8px',
                          backgroundColor: '#FAF8F5',
                          borderBottom: '1px solid #EADCC9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexShrink: 0
                        }}>
                          <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4E3629', textTransform: 'uppercase' }}>
                            MÃ SKU
                          </span>
                          <span style={{ fontSize: '0.67rem', color: '#7B5233', fontWeight: '700', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '3px' }}>
                            {standingSkus.length} mã
                          </span>
                        </div>

                        <div style={{ padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                          {standingSkus.length === 0 ? (
                            <div style={{ padding: '16px 6px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                              Chưa có mã SKU
                            </div>
                          ) : (
                            standingSkus.map((itemSku, idx) => {
                              const isOutlier = checkIsOutlier(itemSku, standingSkus);
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: isOutlier ? '#FEF2F2' : '#FFFFFF',
                                    border: isOutlier ? '1.5px solid #EF4444' : '1px solid #EADCC9',
                                    boxShadow: isOutlier ? '0 1px 4px rgba(239, 68, 68, 0.2)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '6px',
                                    minWidth: 0
                                  }}
                                >
                                  <span style={{
                                    fontFamily: 'Consolas, monospace',
                                    fontSize: '0.82rem',
                                    fontWeight: '800',
                                    color: isOutlier ? '#DC2626' : '#1F2937',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {itemSku.code}
                                  </span>
                                  <span style={{
                                    fontSize: '0.66rem',
                                    color: isOutlier ? '#DC2626' : '#4B5563',
                                    fontWeight: '700',
                                    backgroundColor: isOutlier ? '#FEE2E2' : '#FAF8F5',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: isOutlier ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}>
                                    {itemSku.count || 1} cái
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* NỘI DUNG TAB 2: TOP NÓC (CÁC NHÃN BỊ QUAY DỌC / LƯU TẠM THEO ẢNH) */}
                {/* ============================================================== */}
                {palletResultTab === 'roof' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '2px' }}>
                    {/* BỘ THIẾT LẬP MỤC TIÊU SỐ LƯỢNG ẢNH TOP NÓC (4 ĐẾN 8 BỨC) - GỌN GÀNG, BỎ THANH TIẾN TRÌNH */}
                    <div style={{
                      backgroundColor: '#FAF5EE',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #EADCC9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4b301e' }}>
                          Mục tiêu số ảnh nóc:
                        </span>
                        {/* Selector các mức từ 4 đến 8 ảnh */}
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[4, 5, 6, 7, 8].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setRoofTargetCount(num)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: roofTargetCount === num ? '1.5px solid #7B5233' : '1px solid #D5C7B7',
                                backgroundColor: roofTargetCount === num ? '#7B5233' : '#FFFFFF',
                                color: roofTargetCount === num ? '#FFFFFF' : '#4b301e',
                                fontSize: '0.73rem',
                                fontWeight: '800',
                                cursor: 'pointer'
                              }}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Số ảnh đang có / mục tiêu (Không dùng thanh tiến trình) */}
                      <span style={{
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        color: capturedImages.length >= roofTargetCount ? '#16A34A' : '#7B5233',
                        backgroundColor: capturedImages.length >= roofTargetCount ? '#DCFCE7' : '#FAF4EE',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${capturedImages.length >= roofTargetCount ? '#86EFAC' : '#EADCC9'}`,
                        flexShrink: 0
                      }}>
                        {capturedImages.length}/{roofTargetCount} ảnh
                      </span>
                    </div>

                    {/* Chỉ thông báo khi đã đủ số lượng ảnh */}
                    {capturedImages.length >= roofTargetCount && (
                      <div style={{
                        padding: '6px 10px',
                        backgroundColor: '#F0FDF4',
                        border: '1px solid #86EFAC',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.72rem',
                        color: '#166534',
                        fontWeight: '800'
                      }}>
                        <CheckCircle2 size={14} color="#16A34A" />
                        <span>Đã đủ số lượng ảnh nóc yêu cầu ({capturedImages.length}/{roofTargetCount} bức)! Sẵn sàng xác nhận.</span>
                      </div>
                    )}

                    {/* DANH SÁCH LƯU TẠM CHI TIẾT THEO TỪNG BỨC ẢNH */}
                    {(() => {
                      // Chuẩn bị dữ liệu danh sách ảnh nóc
                      const currentRoofItems = (roofByImage.length > 0 ? roofByImage : capturedImages.map((_, i) => ({
                        image_index: i + 1,
                        image_label: `Ảnh ${i + 1}`,
                        lpns: (detectedLpns && detectedLpns[i]) ? [detectedLpns[i]] : [],
                        skus: (detectedSkus && detectedSkus[i]) ? [detectedSkus[i]] : [],
                        total_rois: 0
                      })));

                      // Thu thập tất cả các mã LPN và SKU qua các ảnh nóc
                      const allRoofLpns = [];
                      const allRoofSkus = [];
                      currentRoofItems.forEach(item => {
                        const rawL = item.lpns || item.all_lpns || [];
                        const rawS = item.skus || item.all_skus || [];
                        rawL.forEach(l => {
                          const code = typeof l === 'object' ? (l.code || l.lpn) : l;
                          if (code) allRoofLpns.push(String(code).trim());
                        });
                        rawS.forEach(s => {
                          const code = typeof s === 'object' ? (s.code || s.sku) : s;
                          if (code) allRoofSkus.push(String(code).trim());
                        });
                      });

                      const uniqueRoofLpns = Array.from(new Set(allRoofLpns));
                      const uniqueRoofSkus = Array.from(new Set(allRoofSkus));

                      // Kiểm tra sai lệch trong Top nóc (chỉ so sánh nội bộ giữa các ảnh nóc với nhau, TUYỆT ĐỐI KHÔNG so sánh với Pallet đứng):
                      const hasInternalLpnDiff = uniqueRoofLpns.length > 1;
                      const hasInternalSkuDiff = uniqueRoofSkus.length > 1;

                      const hasAnyRoofAnomaly = hasInternalLpnDiff || hasInternalSkuDiff || roofAnomaly.hasAnomaly;

                      // Nội dung cảnh báo chi tiết (chỉ báo khi có mâu thuẫn giữa các ảnh nóc)
                      const warningLines = [];
                      if (hasInternalLpnDiff) {
                        warningLines.push(`Lệch mã LPN giữa các ảnh nóc: ${uniqueRoofLpns.join(' ≠ ')}`);
                      }
                      if (hasInternalSkuDiff) {
                        warningLines.push(`Lệch mã SKU giữa các ảnh nóc: ${uniqueRoofSkus.join(' ≠ ')}`);
                      }
                      if (warningLines.length === 0 && roofAnomaly.warning) {
                        warningLines.push(roofAnomaly.warning);
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '0.73rem', fontWeight: '800', color: '#4b301e', textTransform: 'uppercase' }}>
                            Lưu tạm theo từng ảnh nóc ({currentRoofItems.length} ảnh):
                          </span>

                          {/* BANNER BÁO ĐỎ CẢNH BÁO KHI PHÁT HIỆN SAI LỆCH MÃ LPN / SKU NÓC */}
                          {hasAnyRoofAnomaly && (
                            <div style={{
                              padding: '10px 12px',
                              backgroundColor: '#FEF2F2',
                              border: '2px solid #EF4444',
                              borderRadius: '10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: '#991B1B' }}>
                                  CẢNH BÁO: TOP NÓC CÓ SỰ SAI LỆCH MÃ!
                                </span>
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#B91C1C', fontWeight: '700', paddingLeft: '26px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {warningLines.map((wLine, wIdx) => (
                                  <div key={wIdx}>• {wLine}</div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: (currentRoofItems.length > 1) ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                            gap: '8px'
                          }}>
                            {currentRoofItems.map((itemGroup, gIdx) => {
                              const imgIdx = (itemGroup.image_index ? itemGroup.image_index - 1 : gIdx);
                              const imgSrc = capturedImages[imgIdx] || capturedImages[gIdx];

                              // Chuẩn hóa danh sách LPN của ảnh này
                              const rawLpns = itemGroup.lpns || itemGroup.all_lpns || [];
                              const validLpns = Array.isArray(rawLpns)
                                ? rawLpns.map(l => {
                                    if (typeof l === 'object' && l !== null) {
                                      return { code: String(l.code || l.lpn || '').trim(), count: Number(l.count) || 1 };
                                    }
                                    return { code: String(l || '').trim(), count: 1 };
                                  }).filter(it => it.code !== '')
                                : [];

                              // Chuẩn hóa danh sách SKU của ảnh này
                              const rawSkus = itemGroup.skus || itemGroup.all_skus || [];
                              const validSkus = Array.isArray(rawSkus)
                                ? rawSkus.map(s => {
                                    if (typeof s === 'object' && s !== null) {
                                      return { code: String(s.code || s.sku || '').trim(), count: Number(s.count) || 1 };
                                    }
                                    return { code: String(s || '').trim(), count: 1 };
                                  }).filter(it => it.code !== '')
                                : [];

                              // Kiểm tra sai lệch riêng của từng Card ảnh này (chỉ so với các ảnh nóc khác)
                              const cardLpnCodes = validLpns.map(it => it.code);
                              const cardSkuCodes = validSkus.map(it => it.code);

                              const cardHasLpnAnomaly = Boolean(itemGroup.is_lpn_anomaly ||
                                (hasInternalLpnDiff && cardLpnCodes.some(c => c !== uniqueRoofLpns[0])));

                              const cardHasSkuAnomaly = Boolean(itemGroup.is_sku_anomaly ||
                                (hasInternalSkuDiff && cardSkuCodes.some(c => c !== uniqueRoofSkus[0])));

                              const cardHasAnomaly = cardHasLpnAnomaly || cardHasSkuAnomaly || Boolean(itemGroup.has_anomaly);

                              return (
                                <div
                                  key={gIdx}
                                  style={{
                                    border: cardHasAnomaly ? '1.5px solid #EF4444' : '1px solid #EADCC9',
                                    borderRadius: '8px',
                                    backgroundColor: cardHasAnomaly ? '#FFF5F5' : '#FAF8F5',
                                    padding: '8px 8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    boxShadow: cardHasAnomaly ? '0 2px 6px rgba(239, 68, 68, 0.12)' : 'none',
                                    transition: 'all 0.2s ease'
                                  }}
                                >
                                  {/* Header của ảnh */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                      <span style={{
                                        backgroundColor: cardHasAnomaly ? '#DC2626' : '#4b301e',
                                        color: '#ffffff',
                                        fontSize: '0.68rem',
                                        fontWeight: '800',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                      }}>
                                        {itemGroup.image_label || `Ảnh ${gIdx + 1}`}
                                      </span>
                                      {cardHasAnomaly && (
                                        <span style={{
                                          backgroundColor: '#FEE2E2',
                                          color: '#DC2626',
                                          fontSize: '0.58rem',
                                          fontWeight: '900',
                                          padding: '1px 5px',
                                          borderRadius: '3px',
                                          border: '1px solid #FCA5A5'
                                        }}>
                                          LỆCH MÃ
                                        </span>
                                      )}
                                    </div>
                                    {imgSrc && (
                                      <img
                                        src={imgSrc}
                                        alt={`Ảnh ${gIdx + 1}`}
                                        onClick={() => handleOpenZoom(imgSrc, `${itemGroup.image_label || `Ảnh ${gIdx + 1}`} - Top nóc`)}
                                        title="Chạm để phóng to ảnh"
                                        style={{ width: '28px', height: '28px', objectFit: 'cover', borderRadius: '4px', border: cardHasAnomaly ? '1px solid #EF4444' : '1px solid #D5C7B7', cursor: 'zoom-in' }}
                                      />
                                    )}
                                  </div>

                                  {/* Chi tiết LPN & SKU của ảnh này */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {/* LPN NÓC */}
                                    <div style={{
                                      backgroundColor: cardHasLpnAnomaly ? '#FEF2F2' : '#FFFFFF',
                                      padding: '5px 6px',
                                      borderRadius: '6px',
                                      border: cardHasLpnAnomaly ? '1.5px solid #EF4444' : '1px solid #E5E7EB',
                                      boxShadow: cardHasLpnAnomaly ? '0 1px 4px rgba(239, 68, 68, 0.1)' : 'none'
                                    }}>
                                      <div style={{
                                        fontSize: '0.62rem',
                                        fontWeight: '800',
                                        color: cardHasLpnAnomaly ? '#DC2626' : '#6B7280',
                                        marginBottom: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                      }}>
                                        <span>MÃ LPN NÓC:</span>
                                        {cardHasLpnAnomaly && (
                                          <span style={{
                                            fontSize: '0.56rem',
                                            fontWeight: '900',
                                            backgroundColor: '#EF4444',
                                            color: '#FFFFFF',
                                            padding: '0.5px 4px',
                                            borderRadius: '3px'
                                          }}>
                                            KHÁC MÃ
                                          </span>
                                        )}
                                      </div>
                                      {validLpns.length > 0 ? (
                                        validLpns.map((l, lIdx) => (
                                          <div
                                            key={lIdx}
                                            style={{
                                              fontFamily: 'Consolas, monospace',
                                              fontSize: '0.78rem',
                                              fontWeight: '800',
                                              color: cardHasLpnAnomaly ? '#991B1B' : '#1F2937',
                                              backgroundColor: cardHasLpnAnomaly ? '#FEE2E2' : '#FAF5EE',
                                              padding: '2px 4px',
                                              borderRadius: '4px',
                                              border: cardHasLpnAnomaly ? '1px solid #F87171' : '1px solid #EADCC9',
                                              marginTop: lIdx > 0 ? '3px' : '0',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis'
                                            }}
                                          >
                                            {l.code} {l.count > 1 && <span style={{ fontSize: '0.62rem', color: cardHasLpnAnomaly ? '#DC2626' : '#7B5233' }}>({l.count})</span>}
                                          </div>
                                        ))
                                      ) : (
                                        <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontStyle: 'italic' }}>Chưa nhận diện</span>
                                      )}
                                    </div>

                                    {/* SKU NÓC */}
                                    <div style={{
                                      backgroundColor: cardHasSkuAnomaly ? '#FEF2F2' : '#FFFFFF',
                                      padding: '5px 6px',
                                      borderRadius: '6px',
                                      border: cardHasSkuAnomaly ? '1.5px solid #EF4444' : '1px solid #E5E7EB',
                                      boxShadow: cardHasSkuAnomaly ? '0 1px 4px rgba(239, 68, 68, 0.1)' : 'none'
                                    }}>
                                      <div style={{
                                        fontSize: '0.62rem',
                                        fontWeight: '800',
                                        color: cardHasSkuAnomaly ? '#DC2626' : '#6B7280',
                                        marginBottom: '2px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                      }}>
                                        <span>MÃ SKU NÓC:</span>
                                        {cardHasSkuAnomaly && (
                                          <span style={{
                                            fontSize: '0.56rem',
                                            fontWeight: '900',
                                            backgroundColor: '#EF4444',
                                            color: '#FFFFFF',
                                            padding: '0.5px 4px',
                                            borderRadius: '3px'
                                          }}>
                                            KHÁC MÃ
                                          </span>
                                        )}
                                      </div>
                                      {validSkus.length > 0 ? (
                                        validSkus.map((s, sIdx) => (
                                          <div
                                            key={sIdx}
                                            style={{
                                              fontFamily: 'Consolas, monospace',
                                              fontSize: '0.78rem',
                                              fontWeight: '800',
                                              color: cardHasSkuAnomaly ? '#991B1B' : '#1F2937',
                                              backgroundColor: cardHasSkuAnomaly ? '#FEE2E2' : '#FAF5EE',
                                              padding: '2px 4px',
                                              borderRadius: '4px',
                                              border: cardHasSkuAnomaly ? '1px solid #F87171' : '1px solid #EADCC9',
                                              marginTop: sIdx > 0 ? '3px' : '0',
                                              whiteSpace: 'nowrap',
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis'
                                            }}
                                          >
                                            {s.code} {s.count > 1 && <span style={{ fontSize: '0.62rem', color: cardHasSkuAnomaly ? '#DC2626' : '#7B5233' }}>({s.count})</span>}
                                          </div>
                                        ))
                                      ) : (
                                        <span style={{ fontSize: '0.68rem', color: '#9CA3AF', fontStyle: 'italic' }}>Chưa nhận diện</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Ghi chú kiểm tra */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '10px', marginTop: '6px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '800', color: '#4b301e' }}>
                    Ghi chú kiểm tra:
                  </label>
                  <textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nhập ghi chú tình trạng kiện hàng (tùy chọn)..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      padding: '8px 10px',
                      fontSize: '12px',
                      color: '#4b301e',
                      backgroundColor: '#ffffff',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* ================================================================ */}
        {/* TAB 2: LỊCH SỬ KIỂM TRA PALLET */}
        {/* ================================================================ */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {historyList.length === 0 ? (
              <div style={{
                backgroundColor: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '30px 20px',
                textAlign: 'center',
                color: '#64748b',
                fontSize: '13px'
              }}>
                Chưa có lượt kiểm tra pallet nào được lưu.
              </div>
            ) : (
              historyList.map((item, idx) => {
                const lpnsList = (item.lpns && item.lpns.length > 0)
                  ? item.lpns
                  : (item.items || []).map(it => ({ code: it.lpn, count: 1 }));
                const skusList = (item.skus && item.skus.length > 0)
                  ? item.skus
                  : (item.items || []).map(it => ({ code: it.sku, count: 1 }));

                return (
                  <div
                    key={item.id + idx}
                    onClick={() => {
                      setSelectedHistoryItem(item);
                      setHistoryImageIdx(0);
                    }}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      border: '1px solid #EADCC9',
                      boxShadow: '0 3px 12px rgba(123, 82, 51, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* ─── Header: Icon + Mã Pallet + Badge Đạt + Thumbnail & Chevron ─── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '10px',
                          backgroundColor: '#FAF5F0',
                          border: '1px solid #EADCC9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Package size={17} color="#7B5233" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#8C7B70', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            MÃ PALLET
                          </span>
                          <span style={{
                            fontSize: '0.94rem',
                            fontWeight: '900',
                            color: '#3E271D',
                            fontFamily: 'Consolas, monospace',
                            letterSpacing: '-0.3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.id}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: '800',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          backgroundColor: item.status === 'pass' ? '#DEF7EC' : '#FDE8E8',
                          color: item.status === 'pass' ? '#03543F' : '#9B1C1C',
                          border: `1px solid ${item.status === 'pass' ? '#BCF0DA' : '#F8B4B4'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          {item.status === 'pass' ? (
                            <>
                              <CheckCircle2 size={12} color="#03543F" />
                              <span>ĐẠT</span>
                            </>
                          ) : (
                            <span>KHÔNG ĐẠT</span>
                          )}
                        </span>

                        <ChevronRight size={15} color="#7B5233" />
                      </div>
                    </div>

                    {/* ─── 2 Cột LPN & SKU thân thiện, hiện đại ─── */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      backgroundColor: '#FAF8F5',
                      borderRadius: '12px',
                      padding: '10px',
                      border: '1px solid #F0EDE8'
                    }}>
                      {/* CỘT LPN */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                          <span style={{ fontSize: '0.69rem', fontWeight: '800', color: '#78523B', textTransform: 'uppercase' }}>
                            MÃ LPN
                          </span>
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: '700',
                            color: '#7B5233',
                            backgroundColor: '#F4ECE1',
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}>
                            {lpnsList.length} mã
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {lpnsList.length === 0 ? (
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>Không có</span>
                          ) : (
                            lpnsList.map((l, i) => {
                              const lCode = String(l.code || l.lpn || l || '').trim();
                              const isStandingPeer = (item.standingLpns || []).some(it => String(it.code || it.lpn || it || '').trim() === lCode);
                              const peerList = (item.standingLpns && item.standingLpns.length > 0)
                                ? (isStandingPeer ? item.standingLpns : (item.roofLpns || lpnsList))
                                : lpnsList;
                              const isOutlier = checkIsOutlier(l, peerList);
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '4px 7px',
                                    borderRadius: '6px',
                                    backgroundColor: isOutlier ? '#FEF2F2' : '#FFFFFF',
                                    border: isOutlier ? '1px solid #EF4444' : '1px solid #EADCC9',
                                    gap: '4px',
                                    minWidth: 0
                                  }}
                                >
                                  <span style={{
                                    fontSize: '0.78rem',
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: '800',
                                    color: isOutlier ? '#DC2626' : '#1F2937',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {l.code || l.lpn || l}
                                  </span>
                                  {l.count && (
                                    <span style={{
                                      fontSize: '0.63rem',
                                      fontWeight: '700',
                                      color: isOutlier ? '#DC2626' : '#6B7280',
                                      backgroundColor: isOutlier ? '#FEE2E2' : '#FAF8F5',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      border: isOutlier ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}>
                                      {l.count} cái
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* CỘT SKU */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                          <span style={{ fontSize: '0.69rem', fontWeight: '800', color: '#78523B', textTransform: 'uppercase' }}>
                            MÃ SKU
                          </span>
                          <span style={{
                            fontSize: '0.64rem',
                            fontWeight: '700',
                            color: '#7B5233',
                            backgroundColor: '#F4ECE1',
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}>
                            {skusList.length} mã
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {skusList.length === 0 ? (
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>Không có</span>
                          ) : (
                            skusList.map((s, i) => {
                              const sCode = String(s.code || s.sku || s || '').trim();
                              const isStandingPeer = (item.standingSkus || []).some(it => String(it.code || it.sku || it || '').trim() === sCode);
                              const peerList = (item.standingSkus && item.standingSkus.length > 0)
                                ? (isStandingPeer ? item.standingSkus : (item.roofSkus || skusList))
                                : skusList;
                              const isOutlier = checkIsOutlier(s, peerList);
                              return (
                                <div
                                  key={i}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '4px 7px',
                                    borderRadius: '6px',
                                    backgroundColor: isOutlier ? '#FEF2F2' : '#FFFFFF',
                                    border: isOutlier ? '1px solid #EF4444' : '1px solid #EADCC9',
                                    gap: '4px',
                                    minWidth: 0
                                  }}
                                >
                                  <span style={{
                                    fontSize: '0.78rem',
                                    fontFamily: 'Consolas, monospace',
                                    fontWeight: '800',
                                    color: isOutlier ? '#DC2626' : '#1F2937',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {s.code || s.sku || s}
                                  </span>
                                  {s.count && (
                                    <span style={{
                                      fontSize: '0.63rem',
                                      fontWeight: '700',
                                      color: isOutlier ? '#DC2626' : '#6B7280',
                                      backgroundColor: isOutlier ? '#FEE2E2' : '#FAF8F5',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      border: isOutlier ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}>
                                      {s.count} cái
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ─── Ghi chú tùy chọn (chỉ hiện khi người dùng tự nhập) ─── */}
                    {item.note && item.note.trim() !== '' && item.note !== 'Kiểm tra bình thường' && (
                      <div style={{
                        fontSize: '0.72rem',
                        color: '#78523B',
                        backgroundColor: '#FAF5F0',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        borderLeft: '3px solid #7B5233',
                        fontStyle: 'italic'
                      }}>
                        {item.note}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>

      {/* ─── FIXED BOTTOM FOOTER (CHỈ KHI Ở TAB SCAN) ─── */}
      {activeTab === 'scan' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '450px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          gap: '12px',
          zIndex: 990,
          boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.06)',
          boxSizing: 'border-box',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <button
            type="button"
            onClick={handleResetForm}
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              color: '#4b5563',
              border: '1.5px solid #d1d5db',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.9rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={16} /> Làm mới
          </button>

          <button
            type="button"
            onClick={handleConfirmClick}
            disabled={capturedImages.length === 0 || isScanning}
            style={{
              flex: 2,
              background: (capturedImages.length === 0 || isScanning) ? '#94a3b8' : 'linear-gradient(135deg, #4A2C1D 0%, #7B5233 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.9rem',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: (capturedImages.length === 0 || isScanning) ? 'not-allowed' : 'pointer',
              boxShadow: (capturedImages.length === 0 || isScanning) ? 'none' : '0 4px 12px rgba(123, 82, 51, 0.25)',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle2 size={18} /> Xác nhận kiểm tra
          </button>
        </div>
      )}

      {/* ─── MODAL XEM CHI TIẾT CÁC BƯỚC ĐỌC NHÃN & PIPELINE ─── */}
      {showDetailsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            maxWidth: '430px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 35px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e8e1d5'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '14px 16px',
              backgroundColor: '#faf4ee',
              borderBottom: '1px solid #e8e1d5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#4b301e', display: 'block' }}>
                  Chi tiết đọc tem dán
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedRoiForZoom(null);
                  setIsBboxZoomed(false);
                }}
                style={{
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#4b301e',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Nội dung chi tiết các bước */}
            <div style={{
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Thông tin hình ảnh - Đặt ảnh 1 và ảnh 2 hàng ngang cùng hàng */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#78523b' }}>
                    Thông tin hình ảnh
                  </span>
                  <span style={{ fontSize: '9px', color: '#8c7b70', fontWeight: '600' }}>
                    Chạm ảnh để phóng to
                  </span>
                </div>

                {(() => {
                  const rawImgs = (scanDetails?.annotated_images && scanDetails.annotated_images.length > 0)
                    ? scanDetails.annotated_images
                    : (capturedImages && capturedImages.length > 0
                        ? capturedImages
                        : (scanDetails?.annotated_image ? [scanDetails.annotated_image] : []));
                  const imagesToDisplay = rawImgs.length > 0 ? rawImgs : (capturedImages[0] ? [capturedImages[0]] : []);

                  return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: imagesToDisplay.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
                      gap: '8px'
                    }}>
                      {imagesToDisplay.map((imgSrc, aIdx) => (
                        <div
                          key={aIdx}
                          onClick={() => {
                            setSelectedAnnotatedIdx(aIdx);
                            handleOpenZoom(imgSrc, `Ảnh ${aIdx + 1} - Phân tích tem nhãn Pallet`);
                          }}
                          style={{
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: selectedAnnotatedIdx === aIdx ? '1.5px solid #7B5233' : '1px solid #e8e1d5',
                            backgroundColor: '#0f172a',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: imagesToDisplay.length > 1 ? '115px' : '140px',
                            cursor: 'zoom-in',
                            position: 'relative',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                          }}
                          title={`Bấm vào Ảnh ${aIdx + 1} để phóng to & di chuyển`}
                        >
                          {/* Badge tên ảnh */}
                          <div style={{
                            position: 'absolute',
                            top: '5px',
                            left: '5px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: '#ffffff',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            fontWeight: '800',
                            zIndex: 2,
                            letterSpacing: '0.02em'
                          }}>
                            Ảnh {aIdx + 1}
                          </div>

                          {imgSrc ? (
                            <img
                              src={imgSrc}
                              alt={`Ảnh ${aIdx + 1}`}
                              style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                            />
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: '10px' }}>
                              Ảnh {aIdx + 1}
                            </div>
                          )}

                          {/* Nút phóng to nhỏ ở góc dưới */}
                          <div style={{
                            position: 'absolute',
                            bottom: '5px',
                            right: '5px',
                            backgroundColor: 'rgba(0,0,0,0.65)',
                            color: '#ffffff',
                            padding: '2px 6px',
                            borderRadius: '10px',
                            fontSize: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            pointerEvents: 'none'
                          }}>
                            <Maximize2 size={9} /> Phóng to
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* BÓC TÁCH TEM NHÃN */}
              {(() => {
                const roiList = (scanDetails?.roi_details && scanDetails.roi_details.length > 0)
                  ? scanDetails.roi_details
                  : itemsList;

                // Phân loại danh sách tem LPN và tem SKU (tem chỉ là 1 trong 2 loại)
                const lpnRois = roiList.filter(r => {
                  const code = r.extracted_lpn || r.lpn;
                  return code && code !== '---' && code !== 'None' && String(code).trim() !== '';
                });

                const skuRois = roiList.filter(r => {
                  const code = r.extracted_sku || r.sku;
                  return code && code !== '---' && code !== 'None' && String(code).trim() !== '';
                });

                const currentTypeRois = roiTab === 'lpn' ? lpnRois : skuRois;

                // Tách rõ ràng 2 nhóm: Pallet đứng và Top nóc
                const standingRois = currentTypeRois.filter(r => !isRoofRoi(r));
                const roofRois = currentTypeRois.filter(r => isRoofRoi(r));

                // Danh sách hiển thị theo bộ lọc bocTachCategory: 'all' | 'standing' | 'roof'
                const displayRois = bocTachCategory === 'standing'
                  ? standingRois
                  : (bocTachCategory === 'roof' ? roofRois : currentTypeRois);

                // Thống kê mã theo từng nhóm riêng biệt để kiểm tra sai lệch (outlier) TRONG CÙNG NHÓM
                // 1. Thống kê mã trong nhóm Pallet đứng
                const standingCodesMap = {};
                standingRois.forEach(r => {
                  const c = String((roiTab === 'lpn' ? (r.extracted_lpn || r.lpn) : (r.extracted_sku || r.sku)) || '').trim();
                  if (c && c !== '---' && c !== 'None') {
                    standingCodesMap[c] = (standingCodesMap[c] || 0) + 1;
                  }
                });
                const standingPeerList = Object.entries(standingCodesMap).map(([code, count]) => ({ code, count }));

                // 2. Thống kê mã trong nhóm Top nóc
                const roofCodesMap = {};
                roofRois.forEach(r => {
                  const c = String((roiTab === 'lpn' ? (r.extracted_lpn || r.lpn) : (r.extracted_sku || r.sku)) || '').trim();
                  if (c && c !== '---' && c !== 'None') {
                    roofCodesMap[c] = (roofCodesMap[c] || 0) + 1;
                  }
                });
                const roofPeerList = Object.entries(roofCodesMap).map(([code, count]) => ({ code, count }));

                // Hàm render từng Card tem
                const renderRoiCard = (roi, i) => {
                  const labelId = roi.label_id || (i + 1);
                  const isExpanded = expandedRoiId === labelId;
                  const lpnVal = roi.extracted_lpn || roi.lpn;
                  const skuVal = roi.extracted_sku || roi.sku;
                  const currentCode = String((roiTab === 'lpn' ? lpnVal : skuVal) || '').trim();
                  const previewImg = roi.crop_preview || roi.zoomed_preview || roi.ocr_annotated_preview || roi.roi_preview;
                  const isRoof = isRoofRoi(roi);

                  // CHỈ kiểm tra sai lệch so với các tem trong CÙNG NHÓM (Pallet đứng vs Pallet đứng, Top nóc vs Top nóc)
                  const peerList = isRoof ? roofPeerList : standingPeerList;
                  let isRoiOutlier = false;
                  if (currentCode && peerList.length > 1) {
                    const peerItem = peerList.find(it => it.code === currentCode);
                    if (peerItem) {
                      isRoiOutlier = checkIsOutlier(peerItem, peerList);
                    }
                  }

                  return (
                    <div
                      key={labelId}
                      style={{
                        backgroundColor: isRoiOutlier ? '#FEF2F2' : (isExpanded ? '#FAF5F0' : '#ffffff'),
                        border: isRoiOutlier ? '1.5px solid #EF4444' : (isExpanded ? '1.5px solid #7B5233' : '1px solid #e8e1d5'),
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: isRoiOutlier
                          ? '0 3px 10px rgba(239, 68, 68, 0.15)'
                          : (isExpanded ? '0 3px 10px rgba(123, 82, 51, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)'),
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* Dòng tóm tắt của con tem */}
                      <div
                        onClick={() => setExpandedRoiId(isExpanded ? null : labelId)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          cursor: 'pointer'
                        }}
                      >
                        {previewImg ? (
                          <img
                            src={previewImg}
                            alt={`Tem #${labelId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenZoom(
                                previewImg,
                                `Chi tiết Tem #${labelId}: ${roiTab === 'lpn' ? (lpnVal || 'Mã LPN') : (skuVal || 'Mã SKU')} (${isRoof ? 'Top nóc' : 'Pallet đứng'})`
                              );
                            }}
                            title="Bấm để phóng to và di chuyển tem nhãn"
                            style={{
                              width: '60px',
                              height: '42px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: isRoiOutlier ? '1.5px solid #EF4444' : (isExpanded ? '1.5px solid #7B5233' : '1px solid #cbd5e1'),
                              flexShrink: 0,
                              cursor: 'zoom-in'
                            }}
                          />
                        ) : (
                          <div style={{
                            width: '42px',
                            height: '42px',
                            backgroundColor: isRoiOutlier ? '#FEE2E2' : '#faf4ee',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isRoiOutlier ? '#DC2626' : '#78523b',
                            fontWeight: '800',
                            fontSize: '11px',
                            flexShrink: 0
                          }}>
                            #{labelId}
                          </div>
                        )}

                        <div style={{ flex: 1, fontSize: '11px', minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '3px' }}>
                            {/* Badge Số ảnh & Mã tem */}
                            <span style={{
                              fontSize: '9px',
                              fontWeight: '800',
                              color: isRoiOutlier ? '#DC2626' : (roiTab === 'lpn' ? '#166534' : '#1e40af'),
                              backgroundColor: isRoiOutlier ? '#FEE2E2' : (roiTab === 'lpn' ? '#dcfce7' : '#dbeafe'),
                              padding: '1px 6px',
                              borderRadius: '4px'
                            }}>
                              {roi.image_index ? `Ảnh ${roi.image_index} · ` : ''}TEM #{labelId}
                            </span>

                            {/* Badge phân loại: Pallet đứng vs Top nóc */}
                            {isRoof ? (
                              <span style={{
                                fontSize: '9px',
                                fontWeight: '800',
                                color: '#6B21A8',
                                backgroundColor: '#F3E8FF',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #E9D5FF',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                <RotateCw size={9} /> Top nóc
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '9px',
                                fontWeight: '800',
                                color: '#78523B',
                                backgroundColor: '#FAF5EE',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #EADCC9',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px'
                              }}>
                                <Package size={9} /> Pallet đứng
                              </span>
                            )}

                            {/* Badge cảnh báo sai lệch trong nhóm */}
                            {isRoiOutlier && (
                              <span style={{
                                fontSize: '9px',
                                fontWeight: '800',
                                color: '#DC2626',
                                backgroundColor: '#FEE2E2',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #FCA5A5'
                              }}>
                                Lệch trong {isRoof ? 'Top nóc' : 'Pallet đứng'}
                              </span>
                            )}
                          </div>

                          {/* Hiển thị duy nhất loại mã của tab tương ứng */}
                          {roiTab === 'lpn' ? (
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ color: '#78523b', fontWeight: '700' }}>MÃ LPN: </span>
                              <strong style={{
                                fontFamily: 'Consolas, monospace',
                                fontSize: '13px',
                                color: isRoiOutlier ? '#DC2626' : (isRoof ? '#6B21A8' : '#166534')
                              }}>
                                {lpnVal || '---'}
                              </strong>
                            </div>
                          ) : (
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ color: '#78523b', fontWeight: '700' }}>MÃ SKU: </span>
                              <strong style={{
                                fontFamily: 'Consolas, monospace',
                                fontSize: '13px',
                                color: isRoiOutlier ? '#DC2626' : '#1e40af'
                              }}>
                                {skuVal || '---'}
                              </strong>
                            </div>
                          )}
                        </div>

                        {/* Nút bấm phóng to tem nhãn tương tác */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (previewImg) {
                              handleOpenZoom(
                                previewImg,
                                `Chi tiết Tem #${labelId}: ${roiTab === 'lpn' ? (lpnVal || 'Mã LPN') : (skuVal || 'Mã SKU')} (${isRoof ? 'Top nóc' : 'Pallet đứng'})`
                              );
                            } else {
                              setExpandedRoiId(isExpanded ? null : labelId);
                            }
                          }}
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: '#ffffff',
                            backgroundColor: '#7B5233',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            boxShadow: '0 1px 3px rgba(123, 82, 51, 0.25)'
                          }}
                          title="Bấm để phóng to và di chuyển tem nhãn"
                        >
                          <ZoomIn size={11} /> Phóng to
                        </button>
                      </div>

                      {/* VÙNG PHÓNG TO CHI TIẾT TẠI CHỖ (IN-PLACE ZOOM) */}
                      {isExpanded && previewImg && (
                        <div style={{
                          marginTop: '4px',
                          paddingTop: '8px',
                          borderTop: '1px dashed #e2d9cc',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #7B5233',
                            backgroundColor: '#0f172a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '4px'
                          }}>
                            <img
                              src={previewImg}
                              alt={`Chi tiết Tem #${labelId}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenZoom(
                                  previewImg,
                                  `Chi tiết Tem #${labelId}: ${roiTab === 'lpn' ? (lpnVal || 'Mã LPN') : (skuVal || 'Mã SKU')} (${isRoof ? 'Top nóc' : 'Pallet đứng'})`
                                );
                              }}
                              title="Bấm để phóng to toàn màn hình & di chuyển"
                              style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block', cursor: 'zoom-in' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div>
                    {/* TIÊU ĐỀ BÓC TÁCH & TỔNG SỐ */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '900', color: '#4b301e', letterSpacing: '0.04em' }}>
                        BÓC TÁCH TEM NHÃN
                      </span>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '800',
                        color: '#78523b',
                        backgroundColor: '#f5ebe1',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {lpnRois.length} LPN · {skuRois.length} SKU
                      </span>
                    </div>

                    {/* NÚT SWITCH QUA LẠI GIỮA TEM LPN VÀ TEM SKU */}
                    <div style={{
                      display: 'flex',
                      backgroundColor: '#f1ece6',
                      borderRadius: '8px',
                      padding: '3px',
                      marginBottom: '8px',
                      gap: '4px'
                    }}>
                      <button
                        type="button"
                        onClick={() => { setRoiTab('lpn'); setExpandedRoiId(null); }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: roiTab === 'lpn' ? '#ffffff' : 'transparent',
                          color: roiTab === 'lpn' ? '#166534' : '#78523b',
                          fontWeight: '800',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: roiTab === 'lpn' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Tag size={13} />
                        <span>Tem LPN ({lpnRois.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRoiTab('sku'); setExpandedRoiId(null); }}
                        style={{
                          flex: 1,
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: roiTab === 'sku' ? '#ffffff' : 'transparent',
                          color: roiTab === 'sku' ? '#1e40af' : '#78523b',
                          fontWeight: '800',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          boxShadow: roiTab === 'sku' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Package size={13} />
                        <span>Tem SKU ({skuRois.length})</span>
                      </button>
                    </div>

                    {/* BỘ LỌC PHÂN BIỆT PALLET ĐỨNG VÀ TOP NÓC */}
                    <div style={{
                      display: 'flex',
                      backgroundColor: '#FAF5EE',
                      borderRadius: '8px',
                      padding: '3px',
                      marginBottom: '10px',
                      gap: '4px',
                      border: '1px solid #EADCC9'
                    }}>
                      <button
                        type="button"
                        onClick={() => { setBocTachCategory('all'); setExpandedRoiId(null); }}
                        style={{
                          flex: 1,
                          padding: '5px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: bocTachCategory === 'all' ? '#7B5233' : 'transparent',
                          color: bocTachCategory === 'all' ? '#ffffff' : '#78523B',
                          fontWeight: '800',
                          fontSize: '10px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        Tất cả ({currentTypeRois.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBocTachCategory('standing'); setExpandedRoiId(null); }}
                        style={{
                          flex: 1.2,
                          padding: '5px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: bocTachCategory === 'standing' ? '#7B5233' : 'transparent',
                          color: bocTachCategory === 'standing' ? '#ffffff' : '#78523B',
                          fontWeight: '800',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Package size={11} />
                        <span>Pallet đứng ({standingRois.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setBocTachCategory('roof'); setExpandedRoiId(null); }}
                        style={{
                          flex: 1.1,
                          padding: '5px 4px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: bocTachCategory === 'roof' ? '#7C3AED' : 'transparent',
                          color: bocTachCategory === 'roof' ? '#ffffff' : '#7C3AED',
                          fontWeight: '800',
                          fontSize: '10px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <RotateCw size={11} />
                        <span>Top nóc ({roofRois.length})</span>
                      </button>
                    </div>

                    {/* DANH SÁCH TEM THEO NHÓM ĐÃ CHỌN HOẶC GOM NHÓM TRỰC QUAN */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {displayRois.length === 0 ? (
                        <div style={{
                          padding: '20px 16px',
                          textAlign: 'center',
                          color: '#94a3b8',
                          fontSize: '11px',
                          fontStyle: 'italic',
                          backgroundColor: '#FAF8F5',
                          borderRadius: '10px',
                          border: '1px dashed #e2d9cc'
                        }}>
                          {bocTachCategory === 'standing'
                            ? 'Không có tem Pallet đứng nào trong ảnh'
                            : (bocTachCategory === 'roof' ? 'Không có tem Top nóc nào trong ảnh' : 'Không phát hiện tem nào')}
                        </div>
                      ) : bocTachCategory === 'all' && standingRois.length > 0 && roofRois.length > 0 ? (
                        <>
                          {/* PHÂN NHÓM 1: PALLET ĐỨNG */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 8px',
                              backgroundColor: '#F5ECE1',
                              borderRadius: '6px',
                              borderLeft: '3px solid #7B5233'
                            }}>
                              <span style={{ fontSize: '10px', fontWeight: '800', color: '#4b301e', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                TEM PALLET ĐỨNG ({standingRois.length})
                              </span>
                              <span style={{ fontSize: '9px', color: '#78523b', fontWeight: '600' }}>
                                So sánh riêng trong pallet
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {standingRois.map((roi, idx) => renderRoiCard(roi, idx))}
                            </div>
                          </div>

                          {/* PHÂN NHÓM 2: TOP NÓC */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '4px 8px',
                              backgroundColor: '#F3E8FF',
                              borderRadius: '6px',
                              borderLeft: '3px solid #7C3AED'
                            }}>
                              <span style={{ fontSize: '10px', fontWeight: '800', color: '#6B21A8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                TEM TOP NÓC ({roofRois.length})
                              </span>
                              <span style={{ fontSize: '9px', color: '#7C3AED', fontWeight: '600' }}>
                                So sánh riêng trong nóc
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {roofRois.map((roi, idx) => renderRoiCard(roi, idx))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {displayRois.map((roi, idx) => renderRoiCard(roi, idx))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* SYSTEM CONFIRM MODAL */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          if (confirmModal.onConfirm) confirmModal.onConfirm();
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        confirmText="Xác nhận"
        cancelText="Quay lại"
      />

      {/* SYSTEM MESSAGE MODAL */}
      <MessageModal
        isOpen={messageModal.isOpen}
        type={messageModal.type}
        title={messageModal.title}
        message={messageModal.message}
        onConfirm={() => setMessageModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ─── LIVE CAMERA VIEWFINDER MODAL ─── */}
      {isCameraOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          backgroundColor: '#000000',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100vw',
          height: '100vh',
          color: '#ffffff'
        }}>
          {/* Header Bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)'
          }}>
            <button
              type="button"
              onClick={stopCamera}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)'
              }}
            >
              <X size={22} />
            </button>

            <span style={{ fontSize: '13px', fontWeight: '800', letterSpacing: '0.5px' }}>
              CHỤP ẢNH PALLET
            </span>

            <button
              type="button"
              onClick={toggleCameraFacing}
              title="Đổi camera trước / sau"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                cursor: 'pointer',
                backdropFilter: 'blur(4px)'
              }}
            >
              <SwitchCamera size={20} />
            </button>
          </div>

          {/* Live Video Feed + Aim Box */}
          <div style={{
            flex: 1,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            backgroundColor: '#000000'
          }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />

            {/* Viewfinder Target Frame (4 góc căn chỉnh) */}
            <div style={{
              position: 'absolute',
              width: '82%',
              maxWidth: '360px',
              height: '56%',
              maxHeight: '340px',
              pointerEvents: 'none',
              boxSizing: 'border-box'
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '36px', height: '36px', borderTop: '4px solid #ffffff', borderLeft: '4px solid #ffffff', borderTopLeftRadius: '16px' }} />
              <div style={{ position: 'absolute', top: 0, right: 0, width: '36px', height: '36px', borderTop: '4px solid #ffffff', borderRight: '4px solid #ffffff', borderTopRightRadius: '16px' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, width: '36px', height: '36px', borderBottom: '4px solid #ffffff', borderLeft: '4px solid #ffffff', borderBottomLeftRadius: '16px' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: '36px', height: '36px', borderBottom: '4px solid #ffffff', borderRight: '4px solid #ffffff', borderBottomRightRadius: '16px' }} />
            </div>

            {/* Instruction Pill */}
            <div style={{
              position: 'absolute',
              bottom: '110px',
              backgroundColor: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              textAlign: 'center',
              maxWidth: '85%'
            }}>
              Căn chỉnh tem nhãn Pallet vào giữa khung hình
            </div>
          </div>

          {/* Bottom Shutter Controls */}
          <div style={{
            padding: '20px 20px 32px 20px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={capturePhoto}
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                border: '4px solid #ffffff',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '4px',
                boxShadow: '0 4px 20px rgba(255,255,255,0.3)',
                transition: 'transform 0.1s ease'
              }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#ffffff'
              }} />
            </button>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: '600' }}>
              Chạm nút tròn để chụp và quét nhãn ngay
            </span>
          </div>
        </div>
      )}

      {/* ─── MODAL XEM CHI TIẾT PALLET LỊCH SỬ KÈM HÌNH ẢNH ─── */}
      {selectedHistoryItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '18px',
            maxWidth: '430px',
            width: '100%',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 35px rgba(0, 0, 0, 0.25)',
            border: '1px solid #e8e1d5'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '14px 16px',
              backgroundColor: '#faf4ee',
              borderBottom: '1px solid #e8e1d5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  backgroundColor: '#FAF5F0',
                  border: '1px solid #EADCC9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Package size={15} color="#7B5233" />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '900', color: '#4b301e', fontFamily: 'Consolas, monospace' }}>
                    {selectedHistoryItem.id}
                  </span>
                </div>
                <span style={{
                  fontSize: '9px',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: selectedHistoryItem.status === 'pass' ? '#DEF7EC' : '#FDE8E8',
                  color: selectedHistoryItem.status === 'pass' ? '#03543F' : '#9B1C1C',
                  border: `1px solid ${selectedHistoryItem.status === 'pass' ? '#BCF0DA' : '#F8B4B4'}`
                }}>
                  {selectedHistoryItem.status === 'pass' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedHistoryItem(null);
                  setIsHistoryZoomed(false);
                }}
                style={{
                  border: 'none',
                  backgroundColor: '#ffffff',
                  color: '#4b301e',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body Modal */}
            <div style={{
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}>
              {/* Phần 1: Hình ảnh Pallet */}
              {(() => {
                const imgs = (selectedHistoryItem.scanDetails?.annotated_images && selectedHistoryItem.scanDetails.annotated_images.length > 0)
                  ? selectedHistoryItem.scanDetails.annotated_images
                  : (selectedHistoryItem.images && selectedHistoryItem.images.length > 0
                      ? selectedHistoryItem.images
                      : (selectedHistoryItem.image ? [selectedHistoryItem.image] : []));

                const activeImg = imgs[historyImageIdx] || imgs[0] || null;

                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#78523b' }}>
                        Hình ảnh Pallet ({imgs.length} ảnh)
                      </span>
                    </div>

                    {/* Tabs chọn ảnh nếu có nhiều ảnh */}
                    {imgs.length > 1 && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                        {imgs.map((_, aIdx) => (
                          <button
                            key={aIdx}
                            type="button"
                            onClick={() => setHistoryImageIdx(aIdx)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '800',
                              border: historyImageIdx === aIdx ? '1.5px solid #7B5233' : '1px solid #cbd5e1',
                              backgroundColor: historyImageIdx === aIdx ? '#FAF4EE' : '#ffffff',
                              color: historyImageIdx === aIdx ? '#7B5233' : '#64748b',
                              cursor: 'pointer'
                            }}
                          >
                            Ảnh {aIdx + 1}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Khung hiển thị ảnh */}
                    {activeImg ? (
                      <div
                        onClick={() => {
                          if (activeImg) {
                            handleOpenZoom(activeImg, `Ảnh Pallet ${selectedHistoryItem.id} (Lịch sử)`);
                          }
                        }}
                        style={{
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid #e8e1d5',
                          backgroundColor: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '160px',
                          cursor: 'zoom-in',
                          position: 'relative'
                        }}
                        title="Chạm vào ảnh để phóng to & di chuyển"
                      >
                        <img
                          src={activeImg}
                          alt="Pallet Photo"
                          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                        />
                        <div style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '8px',
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '9px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          pointerEvents: 'none'
                        }}>
                          <Maximize2 size={10} /> Chạm để phóng to
                        </div>
                      </div>
                    ) : (
                      <div style={{
                        padding: '24px 16px',
                        backgroundColor: '#FAF8F5',
                        borderRadius: '10px',
                        border: '1px dashed #EADCC9',
                        textAlign: 'center',
                        color: '#9CA3AF',
                        fontSize: '0.78rem'
                      }}>
                        Không có hình ảnh lưu kèm cho Pallet này
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Phần 2: Danh sách mã LPN & SKU đọc được */}
              <div>
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: '#78523b' }}>
                    Danh sách mã nhận diện được
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  backgroundColor: '#FAF8F5',
                  borderRadius: '12px',
                  padding: '10px',
                  border: '1px solid #F0EDE8'
                }}>
                  {/* Cột LPN */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                      <span style={{ fontSize: '0.69rem', fontWeight: '800', color: '#78523B', textTransform: 'uppercase' }}>
                        MÃ LPN
                      </span>
                      <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#7B5233', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '4px' }}>
                        {(selectedHistoryItem.lpns || []).length} mã
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {(selectedHistoryItem.lpns || []).length === 0 ? (
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>Không có</span>
                      ) : (
                        selectedHistoryItem.lpns.map((l, i) => {
                          const lCode = String(l.code || l.lpn || l || '').trim();
                          const isStandingPeer = (selectedHistoryItem.standingLpns || []).some(it => String(it.code || it.lpn || it || '').trim() === lCode);
                          const peerList = (selectedHistoryItem.standingLpns && selectedHistoryItem.standingLpns.length > 0)
                            ? (isStandingPeer ? selectedHistoryItem.standingLpns : (selectedHistoryItem.roofLpns || selectedHistoryItem.lpns))
                            : selectedHistoryItem.lpns;
                          const isOutlier = checkIsOutlier(l, peerList);
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 7px',
                                borderRadius: '6px',
                                backgroundColor: isOutlier ? '#FEF2F2' : '#FFFFFF',
                                border: isOutlier ? '1px solid #EF4444' : '1px solid #EADCC9',
                                gap: '4px',
                                minWidth: 0
                              }}
                            >
                              <span style={{
                                fontSize: '0.78rem',
                                fontFamily: 'Consolas, monospace',
                                fontWeight: '800',
                                color: isOutlier ? '#DC2626' : '#1F2937',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {l.code || l.lpn || l}
                              </span>
                              {l.count && (
                                <span style={{
                                  fontSize: '0.63rem',
                                  fontWeight: '700',
                                  color: isOutlier ? '#DC2626' : '#6B7280',
                                  backgroundColor: isOutlier ? '#FEE2E2' : '#FAF8F5',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  border: isOutlier ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}>
                                  {l.count} cái
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Cột SKU */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                      <span style={{ fontSize: '0.69rem', fontWeight: '800', color: '#78523B', textTransform: 'uppercase' }}>
                        MÃ SKU
                      </span>
                      <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#7B5233', backgroundColor: '#F4ECE1', padding: '1px 5px', borderRadius: '4px' }}>
                        {(selectedHistoryItem.skus || []).length} mã
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {(selectedHistoryItem.skus || []).length === 0 ? (
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF', fontStyle: 'italic' }}>Không có</span>
                      ) : (
                        selectedHistoryItem.skus.map((s, i) => {
                          const sCode = String(s.code || s.sku || s || '').trim();
                          const isStandingPeer = (selectedHistoryItem.standingSkus || []).some(it => String(it.code || it.sku || it || '').trim() === sCode);
                          const peerList = (selectedHistoryItem.standingSkus && selectedHistoryItem.standingSkus.length > 0)
                            ? (isStandingPeer ? selectedHistoryItem.standingSkus : (selectedHistoryItem.roofSkus || selectedHistoryItem.skus))
                            : selectedHistoryItem.skus;
                          const isOutlier = checkIsOutlier(s, peerList);
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '4px 7px',
                                borderRadius: '6px',
                                backgroundColor: isOutlier ? '#FEF2F2' : '#FFFFFF',
                                border: isOutlier ? '1px solid #EF4444' : '1px solid #EADCC9',
                                gap: '4px',
                                minWidth: 0
                              }}
                            >
                              <span style={{
                                fontSize: '0.78rem',
                                fontFamily: 'Consolas, monospace',
                                fontWeight: '800',
                                color: isOutlier ? '#DC2626' : '#1F2937',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}>
                                {s.code || s.sku || s}
                              </span>
                              {s.count && (
                                <span style={{
                                  fontSize: '0.63rem',
                                  fontWeight: '700',
                                  color: isOutlier ? '#DC2626' : '#6B7280',
                                  backgroundColor: isOutlier ? '#FEE2E2' : '#FAF8F5',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  border: isOutlier ? '1px solid #FCA5A5' : '1px solid #E5E7EB',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0
                                }}>
                                  {s.count} cái
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ghi chú tùy chọn */}
              {selectedHistoryItem.note && selectedHistoryItem.note.trim() !== '' && selectedHistoryItem.note !== 'Kiểm tra bình thường' && (
                <div style={{
                  fontSize: '0.74rem',
                  color: '#78523B',
                  backgroundColor: '#FAF5F0',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  borderLeft: '3px solid #7B5233',
                  fontStyle: 'italic'
                }}>
                  {selectedHistoryItem.note}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Phóng to & Di chuyển ảnh thông minh (Mobile Touch + Laptop Mouse) */}
      <ZoomPanModal
        isOpen={zoomModal.isOpen}
        imageSrc={zoomModal.imageSrc}
        title={zoomModal.title}
        onClose={handleCloseZoom}
      />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
};

export default CheckPalletView;
