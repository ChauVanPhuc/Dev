import React, { useRef, useState } from 'react';
import { Camera, X, Loader2, ImagePlus } from 'lucide-react';
import { getFullImageUrl } from '@shared/services/api';
import mobileWarehouseService from '../../services/mobileWarehouseService';

/**
 * Component chụp/chọn nhiều ảnh thực tế trên Mobile, nén client và upload ngay lên server.
 */
const WarehousePhotoGrid = ({
  images = [],
  onChange,
  readOnly = false,
  maxPhotos = 6,
  onError,
  label = 'Ảnh chứng từ / Thực tế hiện trường',
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = '';

    const remain = Math.max(0, maxPhotos - images.length);
    const chosen = files.slice(0, remain);
    if (!chosen.length) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const f of chosen) {
        const url = await mobileWarehouseService.uploadImage(f);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0 && onChange) {
        onChange([...images, ...uploadedUrls]);
      }
    } catch (err) {
      console.error('[WarehousePhotoGrid] Lỗi tải ảnh lên:', err);
      if (onError) onError(err?.response?.data?.detail || err.message || 'Lỗi tải ảnh.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (idx) => {
    if (readOnly || !onChange) return;
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="mwh-section-title" style={{ marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#7b6456' }}>
          {images.length}/{maxPhotos} ảnh
        </span>
      </div>

      {images.length === 0 && readOnly ? (
        <div style={{ fontSize: '12.5px', color: '#9ca3af', fontStyle: 'italic' }}>
          Chưa có ảnh đính kèm.
        </div>
      ) : (
        <div className="mwh-photo-grid">
          {images.map((url, idx) => (
            <div key={`${url}_${idx}`} className="mwh-photo-slot" style={{ borderStyle: 'solid', borderColor: '#dfd0be' }}>
              <img
                src={getFullImageUrl(url)}
                alt={`wh-proof-${idx + 1}`}
                className="mwh-photo-img"
                onClick={() => window.open(getFullImageUrl(url), '_blank', 'noopener,noreferrer')}
              />
              {!readOnly && (
                <button
                  type="button"
                  className="mwh-photo-remove"
                  onClick={() => handleRemove(idx)}
                  aria-label="Xóa ảnh"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}

          {!readOnly && images.length < maxPhotos && (
            <div
              className="mwh-photo-slot"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 size={22} style={{ animation: 'mwhSpin 1s linear infinite' }} />
                  <span style={{ marginTop: 4 }}>Đang tải...</span>
                </>
              ) : (
                <>
                  {images.length === 0 ? <Camera size={22} /> : <ImagePlus size={22} />}
                  <span style={{ marginTop: 4 }}>Chụp / Thêm ảnh</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesSelected}
      />
    </div>
  );
};

export default WarehousePhotoGrid;
