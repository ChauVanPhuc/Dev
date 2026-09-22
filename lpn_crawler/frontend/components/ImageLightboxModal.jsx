import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, X } from 'lucide-react';

/** Image Lightbox Preview Modal */
export function ImageLightboxModal({ imageData, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const initialSrc = typeof imageData === 'object' ? imageData.primary || imageData.url : imageData;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const src = typeof imageData === 'object' ? imageData.primary || imageData.url : imageData;
    setCurrentSrc(src);
    setIsError(false);
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, [imageData]);

  if (!imageData) return null;

  const handleImageError = () => {
    const fallback = typeof imageData === 'object' ? imageData.fallback : null;
    if (fallback && currentSrc !== fallback) {
      setCurrentSrc(fallback);
    } else {
      setIsError(true);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      setZoom((z) => Math.min(4, Math.round((z + 0.15) * 100) / 100));
    } else {
      setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100));
    }
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.min(4, Math.round((z + 0.25) * 100) / 100));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100));
  };

  const handleRotate = (e) => {
    e.stopPropagation();
    setRotation((r) => (r + 90) % 360);
  };

  const handleReset = (e) => {
    e.stopPropagation();
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
          onClose();
        }
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(4px)',
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '30px',
        userSelect: 'none'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '82vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible'
        }}
      >
        {!isError ? (
          <img
            src={currentSrc}
            alt="Preview"
            onError={handleImageError}
            onMouseDown={handleMouseDown}
            style={{
              maxWidth: '86vw',
              maxHeight: '78vh',
              objectFit: 'contain',
              borderRadius: '6px',
              border: '2px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.25, 1, 0.5, 1)',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              color: '#FFFFFF',
              padding: '32px 48px',
              textAlign: 'center',
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.18)'
            }}
          >
            <div style={{ marginBottom: '8px', opacity: 0.7 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '4px' }}>
              Không thể tải hình ảnh
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              Đường dẫn ảnh cục bộ và ảnh nguồn AppSheet hiện không khả dụng.
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1E140F',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '30px',
          padding: '5px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          color: '#FFFFFF',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          zIndex: 2010
        }}
      >
        <button
          type="button"
          onClick={handleZoomOut}
          style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
          title="Thu nhỏ (-)"
        >
          <ZoomOut size={16} />
        </button>

        <span
          onClick={handleReset}
          style={{ fontSize: '0.8rem', fontWeight: '700', minWidth: '38px', textAlign: 'center', color: '#FFFFFF', cursor: 'pointer' }}
          title="Bấm để reset về 100%"
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          onClick={handleZoomIn}
          style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
          title="Phóng to (+)"
        >
          <ZoomIn size={16} />
        </button>

        <button
          type="button"
          onClick={handleRotate}
          style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
          title="Xoay 90 độ"
        >
          <RotateCw size={16} />
        </button>

        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(255,255,255,0.25)' }} />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '4px' }}
          title="Đóng xem ảnh"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

export default ImageLightboxModal;
