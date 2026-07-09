import React, { useState, useEffect } from 'react';
import apiClient from '@shared/services/api';

const NgrokImage = ({ src, alt, style, className }) => {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;

    // Nếu là blob hoặc data url thì dùng luôn
    if (src.startsWith('blob:') || src.startsWith('data:')) {
      setImgUrl(src);
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        // Tải ảnh qua apiClient (đã có sẵn header ngrok-skip-browser-warning)
        // Chèn thêm /image-proxy nếu đường dẫn bắt đầu bằng static/ hoặc /static/
        let targetPath = src;
        
        // Nếu src chứa API_URL hoặc API_ROOT, lọc lấy phần path tương đối
        const cleanPath = (p) => {
          if (p.includes('static/')) {
            return p.substring(p.indexOf('static/'));
          }
          return p;
        };

        const relPath = cleanPath(src);
        
        const response = await apiClient.get(`/deliveries/image-proxy?path=${encodeURIComponent(relPath)}`, {
          responseType: 'blob'
        });
        
        const url = URL.createObjectURL(response.data);
        setImgUrl(url);
        setError(false);
      } catch (err) {
        console.error('Error fetching image via proxy:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    // Cleanup
    return () => {
      if (imgUrl && imgUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imgUrl);
      }
    };
  }, [src]);

  if (loading) {
    return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9' }}>...</div>;
  }

  if (error || !imgUrl) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fef2f2', color: '#ef4444', fontSize: '0.6rem', padding: '4px', textAlign: 'center' }}>
        Lỗi tải ảnh
      </div>
    );
  }

  return <img src={imgUrl} alt={alt} style={style} className={className} />;
};

export default NgrokImage;
