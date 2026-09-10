import React, { useState, useEffect } from 'react';

export const ClaimImageZoomModal = ({ previewImage, onClose }) => {
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const [zoomDragStart, setZoomDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom on open
  useEffect(() => {
    if (previewImage) {
      setZoomScale(1);
      setZoomPosition({ x: 0, y: 0 });
      setIsZoomDragging(false);
    }
  }, [previewImage]);

  // Keyboard shortcut: Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    if (previewImage) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [previewImage, onClose]);

  if (!previewImage) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: zoomScale > 1 ? (isZoomDragging ? 'grabbing' : 'grab') : 'zoom-out',
        animation: 'fadeIn 0.2s ease',
        userSelect: 'none'
      }}
      onClick={onClose}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const zoomFactor = 0.15;
        let newScale = zoomScale;
        if (e.deltaY < 0) {
          newScale = Math.min(zoomScale + zoomFactor, 5);
        } else {
          newScale = Math.max(zoomScale - zoomFactor, 1);
        }
        if (newScale === 1) {
          setZoomPosition({ x: 0, y: 0 });
        }
        setZoomScale(newScale);
      }}
    >
      {/* ZOOMABLE IMAGE */}
      <img
        src={previewImage}
        alt="Zoomed preview"
        style={{
          maxWidth: '90%',
          maxHeight: '90%',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          objectFit: 'contain',
          transform: `translate(${zoomPosition.x}px, ${zoomPosition.y}px) scale(${zoomScale})`,
          cursor: zoomScale > 1 ? (isZoomDragging ? 'grabbing' : 'grab') : 'zoom-in',
          transition: isZoomDragging ? 'none' : 'transform 0.15s cubic-bezier(0.25, 0.8, 0.25, 1)',
          userSelect: 'none',
          pointerEvents: 'auto'
        }}
        onMouseDown={(e) => {
          if (zoomScale <= 1) return;
          e.preventDefault();
          setIsZoomDragging(true);
          setZoomDragStart({
            x: e.clientX - zoomPosition.x,
            y: e.clientY - zoomPosition.y
          });
        }}
        onMouseMove={(e) => {
          if (!isZoomDragging) return;
          e.preventDefault();
          setZoomPosition({
            x: e.clientX - zoomDragStart.x,
            y: e.clientY - zoomDragStart.y
          });
        }}
        onMouseUp={() => setIsZoomDragging(false)}
        onMouseLeave={() => setIsZoomDragging(false)}
        onClick={(e) => e.stopPropagation()}
      />

      {/* FLOATING CONTROL BAR */}
      <div
        style={{
          position: 'absolute',
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '16px',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          padding: '10px 24px',
          borderRadius: '30px',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          backdropFilter: 'blur(8px)',
          zIndex: 3100,
          alignItems: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* THU NHỎ (ZOOM OUT) */}
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
            outline: 'none'
          }}
          onClick={() => {
            const newScale = Math.max(zoomScale - 0.25, 1);
            if (newScale === 1) setZoomPosition({ x: 0, y: 0 });
            setZoomScale(newScale);
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Thu nhỏ"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>

        {/* PHẦN TRĂM ZOOM */}
        <span style={{ color: '#FFFFFF', fontSize: '0.9rem', fontWeight: '800', minWidth: '56px', textAlign: 'center', userSelect: 'none', fontFamily: 'monospace' }}>
          {Math.round(zoomScale * 100)}%
        </span>

        {/* PHÓNG TO (ZOOM IN) */}
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
            outline: 'none'
          }}
          onClick={() => setZoomScale(prev => Math.min(prev + 0.25, 5))}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Phóng to"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>

        {/* ĐẶT LẠI (RESET) */}
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '50%',
            transition: 'background-color 0.2s',
            outline: 'none'
          }}
          onClick={() => {
            setZoomScale(1);
            setZoomPosition({ x: 0, y: 0 });
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Đặt lại kích thước"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M23 4v6h-6"></path>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
        </button>

        {/* PHÂN CÁCH (SEPARATOR) */}
        <div style={{ width: '1px', height: '20px', backgroundColor: 'rgba(255, 255, 255, 0.25)' }}></div>

        {/* ĐÓNG (CLOSE) */}
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#FFFFFF',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '50%',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onClick={onClose}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.85)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          title="Đóng (Esc)"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};
