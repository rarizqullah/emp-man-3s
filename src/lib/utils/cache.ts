interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize = 100; // Maximum number of cached items

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Clear old entries if cache is getting too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item is expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // If still too large after cleanup, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 20% of entries
      const toRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Global cache instance
export const apiCache = new SimpleCache();

// Helper function for cache-aware API calls
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 300,
  endpoint?: string
): Promise<T> {
  // Try to get from cache first
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    // Record cache hit for performance monitoring
    if (endpoint && typeof window === 'undefined') { // Server-side only
      try {
        const { recordCacheHit } = await import('./performance-monitor');
        recordCacheHit(endpoint);
      } catch (error) {
        // Ignore import errors in case monitoring is not available
      }
    }
    return cached;
  }

  // If not in cache, fetch and cache
  const data = await fetcher();
  apiCache.set(key, data, ttlSeconds);
  return data;
}

// Cache invalidation helpers
export const invalidateCache = {
  departments: () => {
    apiCache.delete('departments:all');
    apiCache.delete('departments:search');
  },
  
  shifts: () => {
    apiCache.delete('shifts:all');
    apiCache.delete('shifts:search');
  },
  
  positions: () => {
    apiCache.delete('positions:all');
    apiCache.delete('positions:search');
  },
  
  subDepartments: () => {
    apiCache.delete('sub-departments:all');
    apiCache.delete('sub-departments:search');
  },
  
  allowances: () => {
    apiCache.delete('allowances:all');
    apiCache.delete('allowances:search');
  },
  
  employees: () => {
    // Clear all employee-related cache
    const stats = apiCache.getStats();
    stats.keys.forEach(key => {
      if (key.startsWith('employees:')) {
        apiCache.delete(key);
      }
    });
  },
  
  staticData: () => {
    // Clear all static configuration data
    apiCache.delete('departments:all');
    apiCache.delete('shifts:all');
    apiCache.delete('positions:all');
    apiCache.delete('sub-departments:all');
  },
  
  all: () => {
    apiCache.clear();
  }
}; 

// Cache helpers for static data with longer TTL
export const cacheHelpers = {
  // Cache untuk data yang jarang berubah (5 menit)
  staticData: <T>(key: string, fetcher: () => Promise<T>) => 
    withCache(key, fetcher, 300), // 5 minutes
    
  // Cache untuk data yang sering berubah (1 menit)
  dynamicData: <T>(key: string, fetcher: () => Promise<T>) => 
    withCache(key, fetcher, 60), // 1 minute
    
  // Cache untuk data real-time (15 detik)
  realtimeData: <T>(key: string, fetcher: () => Promise<T>) => 
    withCache(key, fetcher, 15), // 15 seconds
}; 