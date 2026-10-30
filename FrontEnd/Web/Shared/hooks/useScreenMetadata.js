import { useState, useEffect } from 'react';
import { screenService } from '@modules/System/Models/screen.service';
import { DEFAULT_SCREENS_REGISTRY } from '@shared/context/ScreenContext';

/**
 * Custom hook để lấy metadata của màn hình từ database
 */
const screenMetadataCache = new Map();
let globalScreensPromise = null;
const fetchAllScreensCached = () => {
  if (!globalScreensPromise) {
    globalScreensPromise = screenService.getScreens().catch(() => []);
  }
  return globalScreensPromise;
};

if (typeof window !== 'undefined') {
  window.screenMetadataCache = screenMetadataCache;
}

const normalizePathForMatching = (p) => {
  if (!p) return '';
  return p
    .trim()
    .replace(/^\//, '')
    .replace(/^(api\/v\d+\/|api\/|admin\/|manufacture\/)/i, '')
    .replace(/\/$/, '');
};

const findMatchingScreen = (screens, targetPath) => {
  if (!targetPath || !Array.isArray(screens) || screens.length === 0) return null;
  const norm = normalizePathForMatching(targetPath);
  if (!norm) return null;

  // 1. PRIMARY MATCH: Match backend_path
  let matched = screens.find(s => {
    if (!s.backend_path) return false;
    const sNorm = normalizePathForMatching(s.backend_path);
    if (!sNorm.includes(':')) return sNorm === norm;
    const pattern = '^' + sNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
    try { return new RegExp(pattern).test(norm); } catch { return false; }
  });

  if (matched) return matched;

  // 2. SECONDARY MATCH: Fallback match route_path (FE)
  matched = screens.find(s => {
    if (!s.route_path) return false;
    const sNorm = normalizePathForMatching(s.route_path);
    if (!sNorm.includes(':')) return sNorm === norm;
    const pattern = '^' + sNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
    try { return new RegExp(pattern).test(norm); } catch { return false; }
  });

  return matched || null;
};

const getFallbackMetadata = (routePath) => {
  if (!routePath) return { screenCode: '', title: '', subtitle: '' };
  
  if (DEFAULT_SCREENS_REGISTRY && DEFAULT_SCREENS_REGISTRY[routePath]) {
    const def = DEFAULT_SCREENS_REGISTRY[routePath];
    return {
      screenCode: def.code || '',
      title: def.title || '',
      subtitle: def.subtitle || ''
    };
  }

  const norm = normalizePathForMatching(routePath);
  const keys = Object.keys(DEFAULT_SCREENS_REGISTRY || {});
  let found = keys.find(k => normalizePathForMatching(k) === norm);
  if (!found) {
    found = keys.find(k => {
      const kNorm = normalizePathForMatching(k);
      if (!kNorm.includes(':')) return false;
      const regexPattern = '^' + kNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      try {
        return new RegExp(regexPattern).test(norm);
      } catch {
        return false;
      }
    });
  }

  if (found && DEFAULT_SCREENS_REGISTRY[found]) {
    const def = DEFAULT_SCREENS_REGISTRY[found];
    return {
      screenCode: def.code || '',
      title: def.title || '',
      subtitle: def.subtitle || ''
    };
  }

  return { screenCode: '', title: '', subtitle: '' };
};

export const useScreenMetadata = (routePath) => {
  const fallback = getFallbackMetadata(routePath);
  const [metadata, setMetadata] = useState({
    screenCode: fallback.screenCode,
    title: fallback.title,
    subtitle: fallback.subtitle,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setMetadata(prev => ({ ...prev, loading: true, error: null }));
        const res = await screenService.getScreens().catch(() => []);
        const screens = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        
        const screen = findMatchingScreen(screens, routePath);
        
        if (screen) {
          setMetadata({
            screenCode: screen.current_code || screen.default_code || '',
            title: screen.title || '',
            subtitle: screen.subtitle || '',
            loading: false,
            error: null
          });
        } else {
          setMetadata({
            screenCode: fallback.screenCode,
            title: fallback.title,
            subtitle: fallback.subtitle,
            loading: false,
            error: null
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

export const useScreenMetadataCached = (routePath, initialDefaults) => {
  const fallback = initialDefaults || getFallbackMetadata(routePath);
  const [metadata, setMetadata] = useState(() => {
    if (screenMetadataCache.has(routePath)) {
      return { ...screenMetadataCache.get(routePath), loading: false, error: null };
    }
    return {
      screenCode: fallback.screenCode || fallback.code || '',
      title: fallback.title || '',
      subtitle: fallback.subtitle || '',
      loading: true,
      error: null
    };
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      if (screenMetadataCache.has(routePath)) {
        const cached = screenMetadataCache.get(routePath);
        setMetadata({ ...cached, loading: false, error: null });
        return;
      }

      try {
        setMetadata(prev => ({ ...prev, loading: true, error: null }));
        
        const res = await fetchAllScreensCached();
        const screens = Array.isArray(res) ? res : (res?.data && Array.isArray(res.data) ? res.data : []);
        
        const screen = findMatchingScreen(screens, routePath);
        
        if (screen) {
          const result = {
            screenCode: screen.current_code || screen.default_code || '',
            title: screen.title || '',
            subtitle: screen.subtitle || '',
            loading: false,
            error: null
          };
          
          screenMetadataCache.set(routePath, result);
          setMetadata(result);
        } else {
          const result = {
            screenCode: fallback.screenCode || fallback.code || '',
            title: fallback.title || '',
            subtitle: fallback.subtitle || '',
            loading: false,
            error: null
          };
          setMetadata(result);
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

export const clearScreenMetadataCache = (routePath = null) => {
  globalScreensPromise = null;
  if (routePath) {
    screenMetadataCache.delete(routePath);
  } else {
    screenMetadataCache.clear();
  }
};
