/**
 * In-Memory Cache Service with TTL Support
 * 
 * Provides caching for expensive BigQuery queries to reduce costs and latency.
 * Uses a simple in-memory Map with automatic TTL-based expiration.
 * 
 * Ready for future Redis migration - just implement the same interface.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  keys: string[];
}

// Default TTLs in seconds
export const CACHE_TTL = {
  DASHBOARD_SUMMARY: 5 * 60,      // 5 minutes - aggregate data
  HIGH_RISK_LIST: 5 * 60,         // 5 minutes - list data
  DISTRIBUTION: 5 * 60,           // 5 minutes - chart data
  DISTRICT_RISK: 5 * 60,          // 5 minutes - heatmap data
  ENTITY_DETAIL: 60 * 60,         // 1 hour - individual records
  ANALYTICS: 10 * 60,             // 10 minutes - analytics data
} as const;

class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every minute to remove expired entries
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /**
   * Get a cached value by key
   * Returns null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data;
  }

  /**
   * Set a cached value with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlSeconds - Time to live in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number): void {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now(),
    };
    this.cache.set(key, entry);
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a pattern
   * Supports simple wildcard (*) at the end
   * Example: invalidate("dashboard:*") removes all dashboard keys
   */
  invalidate(pattern: string): number {
    let count = 0;
    
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      for (const key of this.cache.keys()) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
          count++;
        }
      }
    } else {
      if (this.cache.delete(pattern)) {
        count = 1;
      }
    }
    
    return count;
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Get cache hit rate as percentage
   */
  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return (this.hits / total) * 100;
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stop the cleanup interval (for testing/shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let cacheInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheInstance) {
    cacheInstance = new CacheService();
  }
  return cacheInstance;
}

// Helper to generate cache keys
export function cacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

export { CacheService };
