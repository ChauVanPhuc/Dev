import React, { createContext, useContext, useState, useEffect } from 'react';
import { screenService } from '@modules/System/Models/screen.service';

const ScreenContext = createContext(null);

export const DEFAULT_SCREENS_REGISTRY = {};

export const ScreenProvider = ({ children }) => {
  const [screensMap, setScreensMap] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchScreens = async () => {
    try {
      setLoading(true);
      const data = await screenService.getScreensMap('Web');
      setScreensMap(data || {});
    } catch (error) {
      console.error('Failed to fetch screen configurations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
  }, []);

  const normalizePathForMatching = (p) => {
    if (!p) return '';
    return p
      .trim()
      .replace(/^\//, '')
      .replace(/^(api\/v\d+\/|api\/|admin\/|manufacture\/)/i, '')
      .replace(/\/$/, '');
  };

  const getScreenInfo = (path) => {
    if (!path) {
      return {
        screenCode: '',
        title: 'Hệ thống ERP G7',
        subtitle: 'Quản trị dự án',
        isActive: true
      };
    }

    const lookupPathNormalized = normalizePathForMatching(path);
    const dbScreensList = Object.values(screensMap || {});

    // 1. PRIMARY MATCH: Search screensMap by backend_path
    let matchedScreen = dbScreensList.find(s => {
      if (!s.backend_path) return false;
      const bNorm = normalizePathForMatching(s.backend_path);
      if (!bNorm.includes(':')) return bNorm === lookupPathNormalized;
      const regexPattern = '^' + bNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
      try { return new RegExp(regexPattern).test(lookupPathNormalized); } catch { return false; }
    });

    // 2. SECONDARY MATCH: Search screensMap by route_path
    if (!matchedScreen) {
      matchedScreen = dbScreensList.find(s => {
        if (!s.route_path) return false;
        const rNorm = normalizePathForMatching(s.route_path);
        if (!rNorm.includes(':')) return rNorm === lookupPathNormalized;
        const regexPattern = '^' + rNorm.replace(/:[a-zA-Z0-9_]+/g, '[^/]+') + '$';
        try { return new RegExp(regexPattern).test(lookupPathNormalized); } catch { return false; }
      });
    }

    if (matchedScreen) {
      return {
        screenCode: matchedScreen.current_code || matchedScreen.default_code || '',
        title: matchedScreen.title || '',
        subtitle: matchedScreen.subtitle || '',
        isActive: matchedScreen.is_active !== false
      };
    }

    // If not configured in DB, return default system values
    return {
      screenCode: '',
      title: 'Hệ thống ERP G7',
      subtitle: 'Quản trị dự án',
      isActive: true
    };
  };

  return (
    <ScreenContext.Provider value={{ screens: screensMap, loading, refreshScreens: fetchScreens, getScreenInfo }}>
      {children}
    </ScreenContext.Provider>
  );
};

export const useScreen = () => {
  const context = useContext(ScreenContext);
  if (!context) {
    throw new Error('useScreen must be used within a ScreenProvider');
  }
  return context;
};
