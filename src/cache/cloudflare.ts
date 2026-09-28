import type { CacheAdapter } from "./base.js"

// ---- Cloudflare KV ----

/**
 * The subset of Cloudflare's `KVNamespace` binding this adapter uses. Declared
 * structurally so the published types do not depend on `@cloudflare/workers-types`
 * being installed; a real `KVNamespace` binding satisfies it.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Cache adapter backed by Cloudflare KV.
 * Pass your KV namespace binding from `c.env`.
 *
 * @example
 * ```ts
 * import { CloudflareKVCache, withCache } from "@shopsavvy/hono/cache"
 *
 * const cache = new CloudflareKVCache(c.env.SHOPSAVVY_KV)
 * const result = await withCache({
 *   key: `offers:${identifier}`,
 *   ttl: 300,
 *   cache,
 *   loader: () => client.getCurrentOffers(identifier),
 * })
 * ```
 */
export class CloudflareKVCache implements CacheAdapter {
  constructor(private readonly kv: KVNamespaceLike) {}

  async get(key: string): Promise<string | null> {
    return this.kv.get(key)
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    await this.kv.put(key, value, { expirationTtl: ttlSeconds })
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key)
  }
}

// ---- Cloudflare Cache API ----

/**
 * Cache adapter backed by the Cloudflare Cache API (edge caching by URL).
 * Best for read-heavy, public endpoints. Requires a deterministic cache URL.
 *
 * @example
 * ```ts
 * import { CloudflareCacheAPIAdapter, withCache } from "@shopsavvy/hono/cache"
 *
 * const cache = new CloudflareCacheAPIAdapter()
 * const result = await withCache({
 *   key: `https://cache.local/search?q=AirPods`,
 *   ttl: 120,
 *   cache,
 *   loader: () => client.searchProducts("AirPods"),
 * })
 * ```
 */
export class CloudflareCacheAPIAdapter implements CacheAdapter {
  private readonly cache: Cache

  constructor(cache?: Cache) {
    // `caches.default` is available in the Workers runtime
    this.cache = cache ?? (caches as CacheStorage & { default: Cache }).default
  }

  async get(key: string): Promise<string | null> {
    const response = await this.cache.match(key)
    if (!response) return null
    return response.text()
  }

  async set(key: string, value: string, ttlSeconds = 60): Promise<void> {
    const response = new Response(value, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${ttlSeconds}`,
      },
    })
    await this.cache.put(key, response)
  }

  async delete(key: string): Promise<void> {
    await this.cache.delete(key)
  }
}
