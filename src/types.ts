import type { ShopSavvyDataAPI } from "@shopsavvy/sdk"

/**
 * Options for configuring the ShopSavvy middleware and router.
 */
export interface ShopSavvyOptions {
  /** ShopSavvy API key. Falls back to SHOPSAVVY_API_KEY env var. */
  apiKey?: string
  /** Base URL override for the ShopSavvy API. */
  baseUrl?: string
  /** Request timeout in milliseconds. Default: 30000. */
  timeout?: number
}

/**
 * Hono context variable map — use with `createFactory<ShopSavvyEnv>()`.
 *
 * @example
 * ```ts
 * import type { ShopSavvyEnv } from "@shopsavvy/hono"
 * const app = new Hono<ShopSavvyEnv>()
 * ```
 */
export interface ShopSavvyEnv {
  Variables: {
    shopsavvy: ShopSavvyDataAPI
  }
}

/**
 * Cloudflare Workers environment bindings when using `shopsavvyMiddleware`
 * alongside Cloudflare KV / Cache API.
 */
export interface CloudflareEnv {
  SHOPSAVVY_API_KEY: string
  SHOPSAVVY_KV?: KVNamespace
}

// Re-export SDK types for convenience
export type {
  ShopSavvyDataAPI,
  ProductDetails,
  ProductWithOffers,
  Offer,
  OfferWithHistory,
  PriceHistoryEntry,
  Deal,
  DealsResponse,
  ProductSearchResult,
  UsageInfo,
} from "@shopsavvy/sdk"
