// Middleware
export { shopsavvyMiddleware } from "./middleware.js"

// Router
export { createShopSavvyRouter } from "./router.js"
export type { ShopSavvyAppType } from "./router.js"

// OpenAPI app (includes Swagger UI)
export { createShopSavvyOpenAPIApp } from "./openapi.js"

// SSE streaming
export { createShopSavvySSERouter } from "./streaming/sse.js"

// Cache helpers
export { withCache, CloudflareKVCache, CloudflareCacheAPIAdapter, InMemoryCache, VercelEdgeConfigCache } from "./cache/index.js"
export type { CacheAdapter } from "./cache/index.js"

// Components
export { ProductCard, PriceComparisonTable, DealFeed } from "./components/index.js"

// Types
export type {
  ShopSavvyOptions,
  ShopSavvyEnv,
  CloudflareEnv,
  ShopSavvyDataAPI,
  ProductDetails,
  ProductWithOffers,
  Offer,
  OfferWithHistory,
  ProductWithOfferHistory,
  PriceHistoryEntry,
  Deal,
  DealsResponse,
  ProductSearchResult,
  UsageInfo,
} from "./types.js"

// Internal client factory (for advanced usage)
export { createClient } from "./client.js"
