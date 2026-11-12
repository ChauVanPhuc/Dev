import React from 'react';
import { Smartphone, Camera } from 'lucide-react';
import { getFullImageUrl } from '@webShared/Services/api.service';

export const ChannelBadge = ({ channel, imageCount = 0 }) => {
  const isMobile = String(channel || '').toLowerCase() === 'mobile';
  if (!isMobile && !imageCount) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 6, verticalAlign: 'middle' }}>
      {isMobile && (
        <span
          title="Phiếu tạo trực tiếp từ SmartFlow Mobile"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            padding: '1px 6px',
            borderRadius: 6,
            fontSize: '0.68rem',
            fontWeight: 700,
            backgroundColor: '#EEF2FF',
            color: '#4338CA',
            border: '1px solid #C7D2FE',
          }}
        >
          <Smartphone size={10} />
          Mobile
        </span>
      )}
      {imageCount > 0 && (
        <span
          title={`${imageCount} ảnh thực tế đính kèm`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: '1px 5px',
            borderRadius: 6,
            fontSize: '0.68rem',
            fontWeight: 700,
            backgroundColor: '#FDF2F8',
            color: '#BE185D',
            border: '1px solid #FBCFE8',
          }}
        >
          <Camera size={10} />
          {imageCount}
        </span>
      )}
    </span>
  );
};

export const MobileImagesGallery = ({ images = [], title = 'Ảnh thực tế đính kèm từ hiện trường / Mobile' }) => {
  if (!Array.isArray(images) || images.length === 0) return null;

  return (
    <div
      style={{
        marginTop: 10,
        padding: '10px 12px',
        borderRadius: 8,
        background: '#FAF6F0',
        border: '1px solid #EADCC9',
      }}
    >
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4A2E1B', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Camera size={14} />
        <span>{title} ({images.length})</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {images.map((url, idx) => {
          const full = getFullImageUrl(url);
          return (
            <a
              key={`${url}_${idx}`}
              href={full}
              target="_blank"
              rel="noopener noreferrer"
              title="Nhấn để xem ảnh phóng lớn"
              style={{
                width: 72,
                height: 72,
                borderRadius: 6,
                overflow: 'hidden',
                border: '1px solid #D5C7B7',
                background: '#fff',
                display: 'block',
              }}
            >
              <img src={full} alt={`proof-${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </a>
          );
        })}
      </div>
    </div>
  );
};

