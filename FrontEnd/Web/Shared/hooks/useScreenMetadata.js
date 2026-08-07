import { useState, useEffect } from 'react';
import { screenService } from '@modules/System/Models/screen.service';

/**
 * Custom hook để lấy metadata của màn hình từ database
 * Thay thế việc hardcode title, subtitle, screen code trong component
 * 
 * @param {string} routePath - Đường dẫn route của màn hình (vd: '/admin/quality-records')
 * @returns {object} { screenCode, title, subtitle, loading, error }
 * 
 * @example
 * const { screenCode, title, subtitle } = useScreenMetadata('/admin/quality-records');
 */
export const useScreenMetadata = (routePath) => {
  const [metadata, setMetadata] = useState({
    screenCode: '',
    title: '',
    subtitle: '',
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setMetadata(prev => ({ ...prev, loading: true, error: null }));
        
        // Gọi API lấy screen theo route_path
        const res = await screenService.getScreens().catch(() => []);
        const screens = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        const normalizePathForMatching = (p) => {
          if (!p) return '';
          return p.replace(/^\//, '').replace(/^(admin|manufacture)\//, '');
        };
        
        const routePathNormalized = normalizePathForMatching(routePath);
        
        const screen = screens.find(s => {
          const sNormalized = normalizePathForMatching(s.route_path);
          if (!sNormalized.includes(':')) {
            return sNormalized === routePathNormalized;
          }
          const regexPattern = '^' + sNormalized.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
          const regex = new RegExp(regexPattern);
          return regex.test(routePathNormalized);
        });
        
        if (screen) {
          setMetadata({
            screenCode: screen.current_code || '',
            title: screen.title || '',
            subtitle: screen.subtitle || '',
            loading: false,
            error: null
          });
        } else {
          // Fallback nếu không tìm thấy
          console.warn(`Screen metadata not found for route: ${routePath}`);
          setMetadata({
            screenCode: '',
            title: '',
            subtitle: '',
            loading: false,
            error: `Screen not found: ${routePath}`
          });
        }
      } catch (error) {
        console.error('Error fetching screen metadata:', error);
        setMetadata(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    if (routePath) {
      fetchMetadata();
    }
  }, [routePath]);

  return metadata;
};

/**
 * Hook tối ưu hơn - cache metadata để tránh gọi API nhiều lần
 */
const screenMetadataCache = new Map();

// Expose cache ra window để có thể clear từ components
if (typeof window !== 'undefined') {
  window.screenMetadataCache = screenMetadataCache;
}

export const useScreenMetadataCached = (routePath) => {
  const [metadata, setMetadata] = useState({
    screenCode: '',
    title: '',
    subtitle: '',
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      // Kiểm tra cache trước
      if (screenMetadataCache.has(routePath)) {
        const cached = screenMetadataCache.get(routePath);
        setMetadata({ ...cached, loading: false });
        return;
      }

      try {
        setMetadata(prev => ({ ...prev, loading: true, error: null }));
        
        const res = await screenService.getScreens().catch(() => []);
        const screens = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        const normalizePathForMatching = (p) => {
          if (!p) return '';
          return p.replace(/^\//, '').replace(/^(admin|manufacture)\//, '');
        };
        
        const routePathNormalized = normalizePathForMatching(routePath);
        
        const screen = screens.find(s => {
          const sNormalized = normalizePathForMatching(s.route_path);
          if (!sNormalized.includes(':')) {
            return sNormalized === routePathNormalized;
          }
          const regexPattern = '^' + sNormalized.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
          const regex = new RegExp(regexPattern);
          return regex.test(routePathNormalized);
        });
        
        if (screen) {
          const result = {
            screenCode: screen.current_code || '',
            title: screen.title || '',
            subtitle: screen.subtitle || '',
            loading: false,
            error: null
          };
          
          // Lưu vào cache
          screenMetadataCache.set(routePath, result);
          setMetadata(result);
        } else {
          console.warn(`Screen metadata not found for route: ${routePath}`);
          setMetadata({
            screenCode: '',
            title: '',
            subtitle: '',
            loading: false,
            error: `Screen not found: ${routePath}`
          });
        }
      } catch (error) {
        console.error('Error fetching screen metadata:', error);
        setMetadata(prev => ({
          ...prev,
          loading: false,
          error: error.message
        }));
      }
    };

    if (routePath) {
      fetchMetadata();
    }
  }, [routePath]);

  return metadata;
};

/**
 * Function để clear cache khi cần (vd: sau khi update screen)
 */
export const clearScreenMetadataCache = (routePath = null) => {
  if (routePath) {
    screenMetadataCache.delete(routePath);
  } else {
    screenMetadataCache.clear();
  }
};
