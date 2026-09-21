import React, { useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

export const ImageLightboxModal = ({ imageUrl, onClose }) => {
  const [scale, setScale] = React.useState(1);
  const [rotate, setRotate] = React.useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      {/* Top Controls */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          right: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          zIndex: 10
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setScale(s => Math.min(s + 0.25, 3))}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF', padding: 8, borderRadius: 8 }}
          title="Phóng to"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF', padding: 8, borderRadius: 8 }}
          title="Thu nhỏ"
        >
          <ZoomOut size={20} />
        </button>
        <button
          onClick={() => setRotate(r => (r + 90) % 360)}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#FFF', padding: 8, borderRadius: 8 }}
          title="Xoay ảnh"
        >
          <RotateCw size={20} />
        </button>
        <button
          onClick={onClose}
          style={{ background: '#EF4444', color: '#FFF', padding: 8, borderRadius: 8 }}
          title="Đóng (Esc)"
        >
          <X size={20} />
        </button>
      </div>

      {/* Image Display */}
      <div
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Phóng to ảnh"
          style={{
            maxWidth: '100%',
            maxHeight: '85vh',
            objectFit: 'contain',
            borderRadius: 8,
            transform: `scale(${scale}) rotate(${rotate}deg)`,
            transition: 'transform 0.2s ease',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}
        />
      </div>
    </div>
  );
};
