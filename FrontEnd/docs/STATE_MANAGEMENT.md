# 🗃️ State Management - SmartFlow v2

Tài liệu này mô tả chi tiết về quản lý trạng thái (state management) trong SmartFlow v2, bao gồm Zustand stores, Context providers, và các patterns quản lý dữ liệu.

---

## 📋 Mục lục (Table of Contents)

1. [Tổng quan](#-tổng-quánverview)
2. [Zustand Stores](#-zustand-stores)
3. [Context Providers](#-context-providers)
4. [Local vs Global State](#-local-vs-global-state)
5. [Data Fetching Patterns](#-data-fetching-patterns)
6. [Caching Strategies](#-caching-strategies)
7. [Best Practices](#-best-practices)

---

## 🎯 Tổng quan (Overview)

### State Management Strategy

SmartFlow v2 sử dụng kết hợp 3 phương pháp quản lý state:

1. **Zustand** - Global state cho dữ liệu dùng chung
2. **React Context** - Global state cho UI theme, auth, screen
3. **Local State** - Component state cho dữ liệu tạm thời

### When to Use What

| Method | Use Case | Example |
|--------|----------|---------|
| **Zustand** | Dữ liệu dùng chung giữa nhiều components | Notifications, User info |
| **Context** | UI theme, Auth, Screen context | Dark mode, User session |
| **Local State** | Dữ liệu tạm thời trong component | Form input, Modal open/close |

---

## 🏪 Zustand Stores

### 1. Overview

Zustand là state management library nhẹ, đơn giản, và performant. SmartFlow v2 sử dụng Zustand cho các global stores.

### 2. Available Stores

#### uiStore - UI State

**Location:** `shared/store/uiStore.js`

```javascript
import { create } from 'zustand';

export const useUiStore = create((set) => ({
  // Sidebar state
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Modal state
  modalOpen: false,
  modalContent: null,
  openModal: (content) => set({ modalOpen: true, modalContent: content }),
  closeModal: () => set({ modalOpen: false, modalContent: null }),

  // Loading state
  loading: false,
  setLoading: (loading) => set({ loading }),

  // Toast notifications
  toasts: [],
  addToast: (toast) => set((state) => ({
    toasts: [...state.toasts, { ...toast, id: Date.now() }]
  })),
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter(t => t.id !== id)
  }))
}));
```

**Usage:**
```javascript
const { sidebarOpen, toggleSidebar } = useUiStore();
```

#### notificationStore - Notification State

**Location:** `shared/store/notificationStore.js`

```javascript
import { create } from 'zustand';

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,
  lastSeenId: 0,

  setNotifications: (notifications) => set({ notifications }),
  
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),
  
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, is_read: true })),
    unreadCount: 0
  })),
  
  setLastSeenId: (id) => set({ lastSeenId: id })
}));
```

**Usage:**
```javascript
const { notifications, unreadCount, markAsRead } = useNotificationStore();
```

#### authStore - Authentication State

**Location:** `shared/store/authStore.js`

```javascript
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),
  
  login: async (credentials) => {
    set({ loading: true });
    try {
      const response = await authService.login(credentials);
      set({ 
        user: response.user, 
        token: response.access_token,
        isAuthenticated: true,
        loading: false
      });
      localStorage.setItem('access_token', response.access_token);
      return response;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  
  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('access_token');
  }
}));
```

**Usage:**
```javascript
const { user, login, logout, isAuthenticated } = useAuthStore();
```

### 3. Creating Custom Stores

```javascript
import { create } from 'zustand';

export const useCustomStore = create((set, get) => ({
  // State
  data: [],
  loading: false,
  error: null,

  // Actions
  fetchData: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/endpoint');
      set({ data: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // Computed values
  filteredData: () => {
    const { data } = get();
    return data.filter(item => item.active);
  }
}));
```

### 4. Store Persistence

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const usePersistedStore = create(
  persist(
    (set) => ({
      theme: 'light',
      language: 'vi',
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language })
    }),
    {
      name: 'app-storage', // localStorage key
      partialize: (state) => ({ theme: state.theme, language: state.language })
    }
  )
);
```

---

## 🎨 Context Providers

### 1. AuthProvider

**Location:** `shared/context/AuthContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user, token, setUser, setToken } = useAuthStore();

  useEffect(() => {
    // Check for existing token on mount
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      // Fetch user info
      fetchUserInfo(storedToken).then(setUser);
    }
  }, []);

  const login = async (credentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    setToken(response.access_token);
    localStorage.setItem('access_token', response.access_token);
    return response;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

**Usage:**
```javascript
const { user, login, logout } = useAuth();
```

### 2. ScreenContext

**Location:** `shared/context/ScreenContext.jsx`

```javascript
import { createContext, useContext, useState } from 'react';

const ScreenContext = createContext(null);

export const ScreenProvider = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState(null);
  const [screenConfig, setScreenConfig] = useState({});

  const setScreen = (screenCode, config = {}) => {
    setCurrentScreen(screenCode);
    setScreenConfig(config);
  };

  return (
    <ScreenContext.Provider value={{ currentScreen, screenConfig, setScreen }}>
      {children}
    </ScreenContext.Provider>
  );
};

export const useScreen = () => useContext(ScreenContext);
```

**Usage:**
```javascript
const { currentScreen, setScreen } = useScreen();
```

### 3. ThemeProvider

**Location:** `shared/context/ThemeContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
```

**Usage:**
```javascript
const { theme, toggleTheme } = useTheme();
```

---

## 🔄 Local vs Global State

### 1. Local State (useState)

**Use when:**
- Dữ liệu chỉ dùng trong component
- Form inputs
- Modal open/close
- Temporary UI state

**Example:**
```javascript
const [formData, setFormData] = useState({
  username: '',
  password: ''
});

const [isModalOpen, setIsModalOpen] = useState(false);
```

### 2. Global State (Zustand)

**Use when:**
- Dữ liệu dùng chung giữa nhiều components
- User authentication
- Notifications
- Theme preferences

**Example:**
```javascript
const { user, notifications } = useAuthStore();
const { addNotification } = useNotificationStore();
```

### 3. Lifted State

**Use when:**
- Dữ liệu cần chia sẻ giữa parent và child components
- Không cần global access

**Example:**
```javascript
const Parent = () => {
  const [sharedData, setSharedData] = useState(null);
  
  return (
    <Child data={sharedData} setData={setSharedData} />
  );
};
```

---

## 📡 Data Fetching Patterns

### 1. Custom Hook Pattern

```javascript
// shared/hooks/useFetch.js
import { useState, useEffect } from 'react';

export const useFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await api.get(url, options);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, JSON.stringify(options)]);

  return { data, loading, error, refetch: fetchData };
};
```

**Usage:**
```javascript
const { data, loading, error } = useFetch('/plans/');
```

### 2. Mutation Pattern

```javascript
// shared/hooks/useMutation.js
import { useState } from 'react';

export const useMutation = (mutationFn) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const mutate = async (variables) => {
    setLoading(true);
    setError(null);
    try {
      const response = await mutationFn(variables);
      setData(response);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading, error, data };
};
```

**Usage:**
```javascript
const { mutate, loading } = useMutation((data) => 
  api.post('/deliveries/', data)
);

const handleSubmit = (formData) => {
  mutate(formData);
};
```

### 3. Query Pattern (with Zustand)

```javascript
// shared/store/queryStore.js
import { create } from 'zustand';

export const useQueryStore = create((set, get) => ({
  queries: {},
  
  setQuery: (key, data) => set((state) => ({
    queries: { ...state.queries, [key]: data }
  })),
  
  getQuery: (key) => {
    return get().queries[key];
  },
  
  invalidateQuery: (key) => set((state) => {
    const { [key]: _, ...rest } = state.queries;
    return { queries: rest };
  })
}));

// Custom hook
export const useQuery = (key, queryFn) => {
  const { queries, setQuery, getQuery } = useQueryStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cached = getQuery(key);
    if (cached) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await queryFn();
        setQuery(key, data);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [key, queryFn]);

  return {
    data: getQuery(key),
    loading,
    error,
    refetch: () => {
      const fetchData = async () => {
        setLoading(true);
        try {
          const data = await queryFn();
          setQuery(key, data);
        } catch (err) {
          setError(err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  };
};
```

**Usage:**
```javascript
const { data, loading, refetch } = useQuery(
  'plans',
  () => api.get('/plans/').then(r => r.data)
);
```

---

## 💾 Caching Strategies

### 1. Simple Cache (Zustand)

```javascript
export const useCacheStore = create((set) => ({
  cache: {},
  
  setCache: (key, data, ttl = 60000) => {
    set((state) => ({
      cache: {
        ...state.cache,
        [key]: {
          data,
          timestamp: Date.now(),
          ttl
        }
      }
    }));
  },
  
  getCache: (key) => {
    const cached = useCacheStore.getState().cache[key];
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      // Expired
      return null;
    }
    
    return cached.data;
  },
  
  clearCache: (key) => {
    set((state) => {
      const { [key]: _, ...rest } = state.cache;
      return { cache: rest };
    });
  }
}));
```

### 2. SWR Pattern (Stale-While-Revalidate)

```javascript
export const useSWR = (key, fetcher, options = {}) => {
  const { revalidateOnMount = true, revalidateOnFocus = true } = options;
  const { getCache, setCache } = useCacheStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const revalidate = async () => {
    setLoading(true);
    try {
      const freshData = await fetcher();
      setData(freshData);
      setCache(key, freshData);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check cache first
    const cached = getCache(key);
    if (cached) {
      setData(cached);
    }

    if (revalidateOnMount || !cached) {
      revalidate();
    }
  }, [key]);

  // Revalidate on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (revalidateOnFocus) {
        revalidate();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [revalidateOnFocus]);

  return { data, loading, error, revalidate };
};
```

### 3. Pagination Cache

```javascript
export const usePaginationStore = create((set) => ({
  pages: {},
  
  setPage: (key, page, data) => set((state) => ({
    pages: {
      ...state.pages,
      [key]: {
        ...state.pages[key],
        [page]: data
      }
    }
  })),
  
  getPage: (key, page) => {
    return usePaginationStore.getState().pages[key]?.[page];
  },
  
  clearPages: (key) => {
    set((state) => {
      const { [key]: _, ...rest } = state.pages;
      return { pages: rest };
    });
  }
}));
```

---

## ✅ Best Practices

### 1. Keep State Minimal

**Bad:**
```javascript
const [user, setUser] = useState({
  name: '',
  email: '',
  phone: '',
  address: '',
  // ... 20 more fields
});
```

**Good:**
```javascript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  phone: '',
  address: ''
});
```

### 2. Use Selectors for Zustand

**Bad:**
```javascript
const { notifications, unreadCount } = useNotificationStore();
// Component re-renders on any store change
```

**Good:**
```javascript
const unreadCount = useNotificationStore(state => state.unreadCount);
// Component only re-renders when unreadCount changes
```

### 3. Avoid Deep Nesting

**Bad:**
```javascript
const [data, setData] = useState({
  user: {
    profile: {
      address: {
        city: ''
      }
    }
  }
});
```

**Good:**
```javascript
const [city, setCity] = useState('');
```

### 4. Use useCallback for Event Handlers

```javascript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### 5. Clean Up Side Effects

```javascript
useEffect(() => {
  const interval = setInterval(() => {
    // Polling logic
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

### 6. Use Loading States

```javascript
const { data, loading, error } = useFetch('/plans/');

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <DataDisplay data={data} />;
```

---

## 📞 Hỗ trợ (Support)

Nếu bạn có câu hỏi về state management:

1. Kiểm tra **Zustand Docs**: https://zustand-demo.pmnd.rs/
2. Kiểm tra **React Context Docs**: https://react.dev/reference/react/useContext
3. Liên hệ **Frontend Team**: frontend@smartflowg7.cloud

---

**Last Updated:** 2026-06-03
**Version:** 2.0
**Branch:** test_v1
