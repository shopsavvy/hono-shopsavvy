import type { CacheAdapter } from "./base.js"

/**
 * Cache adapter for Vercel Edge Config.
 * Suitable for low-churn data (categories, stable product details).
 *
 * Edge Config is read-only at runtime — writes go through the Vercel API.
 * For writable edge-region caching, use the in-memory adapter or Vercel KV.
 *
 * @see https://vercel.com/docs/storage/edge-config
 *
 * @example
 * ```ts
 * import { createClient as createEdgeConfig } from "@vercel/edge-config"
 * import { VercelEdgeConfigCache, withCache } from "@shopsavvy/hono/cache"
 *
 * const edgeConfig = createClient(process.env.EDGE_CONFIG)
 * const cache = new VercelEdgeConfigCache(edgeConfig, "https://api.vercel.com/v1/edge-config/...", process.env.VERCEL_TOKEN!)
 *
 * const categories = await withCache({
 *   key: "shopsavvy:categories",
 *   ttl: 3600,
 *   cache,
 *   loader: () => client.getDeals({ limit: 0 }),
 * })
 * ```
 */
export class VercelEdgeConfigCache implements CacheAdapter {
  constructor(
    private readonly edgeConfig: { get: <T>(key: string) => Promise<T | undefined> },
    private readonly edgeConfigApiUrl: string,
    private readonly vercelToken: string,
  ) {}

  async get(key: string): Promise<string | null> {
    const value = await this.edgeConfig.get<string>(this.sanitizeKey(key))
    return value ?? null
  }

  async set(key: string, value: string, _ttlSeconds?: number): Promise<void> {
    // Edge Config writes go through the management API
    await fetch(`${this.edgeConfigApiUrl}/items`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "upsert", key: this.sanitizeKey(key), value }],
      }),
    })
  }

  async delete(key: string): Promise<void> {
    await fetch(`${this.edgeConfigApiUrl}/items`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.vercelToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: [{ operation: "delete", key: this.sanitizeKey(key) }],
      }),
    })
  }

  /** Edge Config keys may only contain [a-zA-Z0-9_-] */
  private sanitizeKey(key: string): string {
    return key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 256)
  }
}

/**
 * Simple in-memory LRU-style cache for Node.js / Bun / Deno.
 * Items expire after `ttlSeconds`; the map never grows beyond `maxEntries`.
 *
 * @example
 * ```ts
 * import { InMemoryCache, withCache } from "@shopsavvy/hono/cache"
 *
 * const cache = new InMemoryCache({ maxEntries: 500, defaultTtl: 60 })
 * ```
 */
export class InMemoryCache implements CacheAdapter {
  private readonly store = new Map<string, { value: string; expiresAt: number }>()
  private readonly maxEntries: number
  private readonly defaultTtl: number

  constructor({ maxEntries = 1000, defaultTtl = 60 }: { maxEntries?: number; defaultTtl?: number } = {}) {
    this.maxEntries = maxEntries
    this.defaultTtl = defaultTtl
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key)
    if (!entry) return null
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key)
      return null
    }
    return entry.value
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.store.size >= this.maxEntries) {
      // Evict the oldest entry
      const firstKey = this.store.keys().next().value
      if (firstKey !== undefined) this.store.delete(firstKey)
    }
    const ttl = ttlSeconds ?? this.defaultTtl
    this.store.set(key, {
      value,
      // ttl <= 0 means "already expired" — set expiresAt in the past
      expiresAt: ttl <= 0 ? 0 : Date.now() + ttl * 1000,
    })
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }
}
