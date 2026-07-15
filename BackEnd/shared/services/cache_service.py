"""
Lightweight in-memory cache service.
Không cần Redis — chạy trong process memory, phù hợp cho single-instance deployment.
"""
import time
import threading
from functools import wraps
from typing import Optional

class InMemoryCache:
    """Thread-safe in-memory cache với TTL."""
    
    def __init__(self):
        self._store = {}
        self._lock = threading.Lock()
    
    def get(self, key: str):
        with self._lock:
            entry = self._store.get(key)
            if entry and time.time() < entry["expires_at"]:
                return entry["value"]
            if entry:
                del self._store[key]
            return None
    
    def set(self, key: str, value, ttl_seconds: int = 300):
        with self._lock:
            self._store[key] = {
                "value": value,
                "expires_at": time.time() + ttl_seconds
            }
    
    def delete(self, key: str):
        with self._lock:
            self._store.pop(key, None)
    
    def clear_prefix(self, prefix: str):
        with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]
    
    def clear_all(self):
        with self._lock:
            self._store.clear()

# Singleton instance
cache = InMemoryCache()

# Decorator for caching query results
def cached_query(prefix: str, ttl: int = 300):
    """
    Decorator cache kết quả query.
    Sử dụng: @cached_query("stages", ttl=600)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Build cache key from function args (exclude db session)
            cache_args = []
            for k, v in kwargs.items():
                if k not in ('db',) and not hasattr(v, 'execute'):
                    cache_args.append(f"{k}={v}")
            # Dành cho args thông thường
            for arg in args:
                if not hasattr(arg, 'execute') and not hasattr(arg, 'commit'):
                    cache_args.append(str(arg))
            key = f"{prefix}:{func.__name__}:{','.join(cache_args)}"
            
            result = cache.get(key)
            if result is not None:
                return result
            
            result = func(*args, **kwargs)
            cache.set(key, result, ttl)
            return result
        
        wrapper.invalidate = lambda: cache.clear_prefix(prefix)
        return wrapper
    return decorator
