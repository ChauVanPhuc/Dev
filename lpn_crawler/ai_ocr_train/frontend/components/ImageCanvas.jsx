import React, { useState, useRef } from 'react';

export const ImageCanvas = ({
  images = {},
  activeTab = 'detected',
  onTabChange = () => { },
  loading = false,
  selectedRoiIdx = 0,
  onSelectRoiIdx = null
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [internalRoiIdx, setInternalRoiIdx] = useState(0);
  const effectiveRoiIdx = onSelectRoiIdx ? selectedRoiIdx : internalRoiIdx;
  const setEffectiveRoiIdx = onSelectRoiIdx || setInternalRoiIdx;
  const dragStartRef = useRef({ x: 0, y: 0 });

  const roiDetails = images?.roi_details || [];

  const handleTabSwitch = (newTab) => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    onTabChange(newTab);
  };

  const getCurrentImageSrc = () => {
    if (!images) return null;
    switch (activeTab) {
      case 'original':
        return images.original_preview;

      case 'detected':
        return images.detected_label_preview || images.original_preview;

      case 'roi':
        if (effectiveRoiIdx > 0 && roiDetails[effectiveRoiIdx - 1]) {
          return roiDetails[effectiveRoiIdx - 1].crop_preview || roiDetails[effectiveRoiIdx - 1].zoomed_preview;
        }
        return images.roi_preview || images.original_preview;

      case 'processed':
        if (effectiveRoiIdx > 0 && roiDetails[effectiveRoiIdx - 1]) {
          return roiDetails[effectiveRoiIdx - 1].zoomed_preview || images.processed_preview;
        }
        return images.processed_preview || images.roi_preview;

      case 'ocr':
        if (effectiveRoiIdx > 0 && roiDetails[effectiveRoiIdx - 1]) {
          return roiDetails[effectiveRoiIdx - 1].ocr_annotated_preview || roiDetails[effectiveRoiIdx - 1].zoomed_preview;
        }
        return images.ocr_annotated_preview || images.processed_preview;

      default:
        return images.detected_label_preview || images.original_preview;
    }
  };

  const currentSrc = getCurrentImageSrc();

  // Mouse drag to pan handlers
  const handleMouseDown = (e) => {
    if (zoomLevel <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panPosition.x,
      y: e.clientY - panPosition.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.2 : -0.2;
    setZoomLevel((prev) => {
      const nextZoom = Math.min(4.0, Math.max(0.6, prev + zoomDelta));
      if (nextZoom <= 1.0) {
        setPanPosition({ x: 0, y: 0 });
      }
      return parseFloat(nextZoom.toFixed(1));
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Lấy danh sách tokens cho tab OCR
  const getCurrentTokens = () => {
    if (activeTab !== 'ocr') return [];
    if (effectiveRoiIdx > 0 && roiDetails[effectiveRoiIdx - 1]) {
      return roiDetails[effectiveRoiIdx - 1].tokens || [];
    }
    const all = [];
    roiDetails.forEach(r => {
      if (Array.isArray(r.tokens)) all.push(...r.tokens);
    });
    return all;
  };

  const currentTokens = getCurrentTokens();

  return (
    <div className="ai-ocr-card" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', padding: '8px 12px', boxSizing: 'border-box', gap: '6px' }}>
      {/* 1. Header & 5 Workflow Tabs */}
      <div className="ai-ocr-card-header" style={{ flexShrink: 0, paddingBottom: '5px', borderBottom: '1px solid #EADCC9' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '6px' }}>
          <span className="ai-ocr-card-title" style={{ fontSize: '0.80rem', fontWeight: '800', color: '#4E3629', whiteSpace: 'nowrap', flexShrink: 0 }}>
            Trực Quan Hóa Hình Ảnh
          </span>

          {/* 5 Main Pipeline Step Buttons (Cuộn ngang mượt mà trên mobile) */}
          <div className="ai-canvas-tabs" style={{ display: 'flex', background: '#F4ECE1', borderRadius: '6px', padding: '2px', gap: '2px', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
            <button
              type="button"
              className={`ai-canvas-tab-btn ${activeTab === 'original' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('original')}
              title="1. Ảnh gốc toàn cảnh pallet"
              style={{ whiteSpace: 'nowrap', padding: '3px 7px', fontSize: '0.71rem', fontWeight: '700' }}
            >
              1. Ảnh Gốc
            </button>
            <button
              type="button"
              className={`ai-canvas-tab-btn ${activeTab === 'detected' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('detected')}
              title="2. Định vị vị trí các con tem"
              style={{ whiteSpace: 'nowrap', padding: '3px 7px', fontSize: '0.71rem', fontWeight: '700' }}
            >
              2. Vùng Nhãn
            </button>
            <button
              type="button"
              className={`ai-canvas-tab-btn ${activeTab === 'roi' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('roi')}
              title="3. Bóc tách riêng từng tem nhãn"
              style={{ whiteSpace: 'nowrap', padding: '3px 7px', fontSize: '0.71rem', fontWeight: '700' }}
            >
              3. Cắt ROI
            </button>
            <button
              type="button"
              className={`ai-canvas-tab-btn ${activeTab === 'processed' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('processed')}
              title="4. Cân bằng tương phản CLAHE & độ nét"
              style={{ whiteSpace: 'nowrap', padding: '3px 7px', fontSize: '0.71rem', fontWeight: '700' }}
            >
              4. Tiền Xử Lý
            </button>
            <button
              type="button"
              className={`ai-canvas-tab-btn ${activeTab === 'ocr' ? 'active' : ''}`}
              onClick={() => handleTabSwitch('ocr')}
              title="5. Khung vẽ tọa độ OCR và bóc tách chữ"
              style={{ whiteSpace: 'nowrap', padding: '3px 7px', fontSize: '0.71rem', fontWeight: '700' }}
            >
              5. Khung OCR
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Viewport */}
      <div
        className="ai-image-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{
          flex: 1,
          height: '100%',
          minHeight: 0,
          maxHeight: 'none',
          position: 'relative',
          background: '#1A1D20',
          backgroundImage: 'radial-gradient(#2E343B 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none',
          border: '1px solid #3A3F45'
        }}
      >
        {loading ? (
          <div className="ai-empty-viewport" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTopColor: '#B58D67',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: '0.82rem', color: '#F3EDE2', fontWeight: '600' }}>
              Đang phân tích hình ảnh và xử lý OCR...
            </span>
          </div>
        ) : currentSrc ? (
          <img
            src={currentSrc}
            alt="Pallet Preview"
            draggable={false}
            style={{
              maxWidth: '96%',
              maxHeight: '96%',
              objectFit: 'contain',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out'
            }}
          />
        ) : (
          <div className="ai-empty-viewport" style={{ color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center' }}>
            Chưa có ảnh hiển thị. Vui lòng chọn ảnh để kiểm thử.
          </div>
        )}

        {/* Legend for Tab 5 (Không emoji) */}
        {activeTab === 'ocr' && currentSrc && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(26, 29, 32, 0.92)',
            backdropFilter: 'blur(4px)',
            color: '#FFFFFF',
            fontSize: '0.68rem',
            padding: '4px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#1EDC1E', display: 'inline-block' }}></span>
              <strong>Mã LPN</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#1E82EB', display: 'inline-block' }}></span>
              <strong>Mã SKU</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#F08214', display: 'inline-block' }}></span>
              Ký tự khác
            </span>
          </div>
        )}

        {/* Zoom & View Controls Overlay */}
        {currentSrc && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(26, 29, 32, 0.90)',
            backdropFilter: 'blur(4px)',
            padding: '4px 8px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            zIndex: 10
          }}>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(0.6, prev - 0.25))}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: '0 4px' }}
              title="Thu nhỏ"
            >
              -
            </button>
            <span style={{ color: '#FFF', fontSize: '0.72rem', fontWeight: 'bold', minWidth: '38px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(4, prev + 0.25))}
              style={{ background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: '0 4px' }}
              title="Phóng to"
            >
              +
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                color: '#FFF',
                cursor: 'pointer',
                fontSize: '0.66rem',
                fontWeight: '600',
                padding: '2px 8px',
                borderRadius: '10px',
                marginLeft: '2px'
              }}
              title="Khôi phục góc nhìn vừa khung"
            >
              Vừa Khung
            </button>
          </div>
        )}
      </div>

      {/* 3. Token OCR Strip (Dành cho Tab 5, không emoji) */}
      {activeTab === 'ocr' && currentTokens.length > 0 && (
        <div style={{
          flexShrink: 0,
          background: '#FAF6F0',
          border: '1px solid #EADCC9',
          borderRadius: '6px',
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          overflowX: 'auto',
          fontSize: '0.70rem'
        }}>
          <span style={{ color: '#8D6E63', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            Ký tự đọc ({currentTokens.length}):
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' }}>
            {currentTokens.slice(0, 12).map((tok, idx) => {
              const txt = tok.text || '';
              const isLpn = txt.isdigit ? (txt.length >= 8 && txt.length <= 12) : /^\d{8,12}$/.test(txt);
              const isSku = /^[A-Z0-9]+-[A-Z0-9-]+$/i.test(txt);

              let bg = '#FEF3C7';
              let color = '#92400E';
              let border = '#FCD34D';

              if (isLpn) {
                bg = '#D1FAE5';
                color = '#065F46';
                border = '#34D399';
              } else if (isSku) {
                bg = '#DBEAFE';
                color = '#1E40AF';
                border = '#60A5FA';
              }

              return (
                <span
                  key={idx}
                  style={{
                    background: bg,
                    color: color,
                    border: `1px solid ${border}`,
                    borderRadius: '4px',
                    padding: '1px 6px',
                    whiteSpace: 'nowrap',
                    fontWeight: (isLpn || isSku) ? '700' : '500',
                    fontFamily: 'monospace'
                  }}
                  title={`Độ tin cậy: ${tok.confidence ? Math.round(tok.confidence * 100) : 0}%`}
                >
                  {txt}
                </span>
              );
            })}
            {currentTokens.length > 12 && (
              <span style={{ color: '#8D6E63', fontSize: '0.65rem' }}>
                +{currentTokens.length - 12} từ khác
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
