/**
 * Common cache interface implemented by all runtime-specific adapters.
 */
export interface CacheAdapter {
  /** Retrieve a cached value by key. Returns `null` if missing or expired. */
  get(key: string): Promise<string | null>
  /** Store a value with an optional TTL in seconds. */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  /** Remove a value from the cache. */
  delete(key: string): Promise<void>
}

/**
 * Wrap a Hono handler with caching using any CacheAdapter.
 * If a cached response exists, it is returned immediately (JSON).
 * Otherwise the loader is called, the result cached, and then returned.
 *
 * @example
 * ```ts
 * import { withCache } from "@shopsavvy/hono/cache"
 * import { CloudflareKVCache } from "@shopsavvy/hono/cache"
 *
 * app.get("/search", (c) =>
 *   withCache({
 *     c,
 *     key: `search:${c.req.query("q")}`,
 *     ttl: 60,
 *     cache: new CloudflareKVCache(c.env.SHOPSAVVY_KV),
 *     loader: async () => client.searchProducts(c.req.query("q")!),
 *   })
 * )
 * ```
 */
export async function withCache<T>({
  key,
  ttl = 60,
  cache,
  loader,
}: {
  key: string
  ttl?: number
  cache: CacheAdapter
  loader: () => Promise<T>
}): Promise<T> {
  const cached = await cache.get(key)
  if (cached !== null) {
    return JSON.parse(cached) as T
  }

  const value = await loader()
  await cache.set(key, JSON.stringify(value), ttl)
  return value
}
