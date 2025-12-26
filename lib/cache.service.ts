/**
 * In-Memory Cache Service
 * Provides caching for frequently accessed data to improve API performance
 * 
 * Cache TTLs:
 * - Product details: 1 hour
 * - Benefit mappings: 24 hours
 * - Offer rules: 1 hour
 * - Store products: 30 minutes
 * - Questions: 1 hour
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 1000; // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval (every 5 minutes)
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache with TTL (Time To Live) in milliseconds
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    // If cache is full, remove oldest entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest(10); // Remove 10 oldest entries
    }

    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, {
      data: value,
      expiresAt,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      console.log(`[CacheService] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Evict oldest entries (LRU-like eviction)
   */
  private evictOldest(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      .slice(0, count);

    entries.forEach(([key]) => {
      this.cache.delete(key);
    });
  }

  /**
   * Generate cache key
   */
  static generateKey(prefix: string, ...parts: (string | number | null | undefined)[]): string {
    const validParts = parts.filter(p => p !== null && p !== undefined);
    return `${prefix}:${validParts.join(':')}`;
  }
}

// Cache TTLs (in milliseconds)
export const CACHE_TTL = {
  PRODUCT_DETAILS: 60 * 60 * 1000, // 1 hour
  BENEFIT_MAPPINGS: 24 * 60 * 60 * 1000, // 24 hours
  OFFER_RULES: 60 * 60 * 1000, // 1 hour
  STORE_PRODUCTS: 30 * 60 * 1000, // 30 minutes
  QUESTIONS: 60 * 60 * 1000, // 1 hour
  SESSION_DATA: 5 * 60 * 1000, // 5 minutes
  STORE_DATA: 30 * 60 * 1000, // 30 minutes
} as const;

// Singleton instance
export const cacheService = new CacheService();

