const cache = new Map<string, { value: unknown; expiresAt: number }>();

const DEFAULT_TTL_MS = 30_000; // 30 seconds

/**
 * Retrieve a cached value if it is still valid
 */
export function getCachedValue<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/**
 * Store a value in the cache with an optional TTL (default 30s)
 */
export function setCachedValue<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Clear one cache entry or the entire cache
 */
export function clearCache(key?: string): void {
  if (key) {
    cache.delete(key);
    return;
  }
  cache.clear();
}
