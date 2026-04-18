import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { createClient } from "./client.js"
import { searchQuerySchema } from "./schemas/search.js"
import { offersParamSchema, offersQuerySchema } from "./schemas/offers.js"
import { historyParamSchema, historyQuerySchema } from "./schemas/history.js"
import { dealsQuerySchema } from "./schemas/deals.js"
import type { ShopSavvyOptions } from "./types.js"

/**
 * Known deal categories from ShopSavvy.
 */
const CATEGORIES = [
  { slug: "electronics", display: "Electronics" },
  { slug: "computers", display: "Computers" },
  { slug: "phones", display: "Phones & Tablets" },
  { slug: "home", display: "Home & Garden" },
  { slug: "kitchen", display: "Kitchen & Dining" },
  { slug: "clothing", display: "Clothing & Apparel" },
  { slug: "shoes", display: "Shoes" },
  { slug: "sports", display: "Sports & Outdoors" },
  { slug: "toys", display: "Toys & Games" },
  { slug: "beauty", display: "Beauty & Personal Care" },
  { slug: "automotive", display: "Automotive" },
  { slug: "books", display: "Books & Media" },
  { slug: "food", display: "Food & Grocery" },
  { slug: "travel", display: "Travel" },
  { slug: "tools", display: "Tools & Hardware" },
  { slug: "office", display: "Office & School" },
]

/**
 * Create a pre-built Hono router with ShopSavvy endpoints.
 * Mount it at any prefix using `app.route("/shopsavvy", router)`.
 *
 * Endpoints (relative to mount prefix):
 * - `GET /search?q=...&limit=...&offset=...`
 * - `GET /offers/:identifier?retailer=...`
 * - `GET /history/:identifier?days=...&start=...&end=...&retailer=...`
 * - `GET /deals?category=...&sort=...&limit=...`
 * - `GET /categories`
 *
 * @example
 * ```ts
 * import { Hono } from "hono"
 * import { createShopSavvyRouter } from "@shopsavvy/hono"
 *
 * const app = new Hono()
 * app.route("/shopsavvy", createShopSavvyRouter())
 * export default app
 * ```
 */
export function createShopSavvyRouter(options: ShopSavvyOptions = {}) {
  const router = new Hono()

  // GET /search
  router.get(
    "/search",
    zValidator("query", searchQuerySchema),
    async (c) => {
      const client = createClient({
        ...options,
        apiKey: options.apiKey || (c.env as Record<string, unknown> | undefined)?.SHOPSAVVY_API_KEY as string | undefined,
      })
      const { q, limit, offset } = c.req.valid("query")
      const result = await client.searchProducts(q, { limit, offset })
      return c.json({ success: true, data: result.data, pagination: result.pagination })
    }
  )

  // GET /offers/:identifier
  router.get(
    "/offers/:identifier",
    zValidator("param", offersParamSchema),
    zValidator("query", offersQuerySchema),
    async (c) => {
      const client = createClient({
        ...options,
        apiKey: options.apiKey || (c.env as Record<string, unknown> | undefined)?.SHOPSAVVY_API_KEY as string | undefined,
      })
      const { identifier } = c.req.valid("param")
      const { retailer } = c.req.valid("query")
      const result = await client.getCurrentOffers(identifier, retailer ? { retailer } : undefined)
      return c.json({ success: true, data: result.data })
    }
  )

  // GET /history/:identifier
  router.get(
    "/history/:identifier",
    zValidator("param", historyParamSchema),
    zValidator("query", historyQuerySchema),
    async (c) => {
      const client = createClient({
        ...options,
        apiKey: options.apiKey || (c.env as Record<string, unknown> | undefined)?.SHOPSAVVY_API_KEY as string | undefined,
      })
      const { identifier } = c.req.valid("param")
      const { days, retailer, start, end } = c.req.valid("query")

      const endDate = end ?? new Date().toISOString().slice(0, 10)
      const startDate = start ?? (() => {
        const d = new Date()
        d.setDate(d.getDate() - days)
        return d.toISOString().slice(0, 10)
      })()

      const result = await client.getPriceHistory(identifier, startDate, endDate, retailer ? { retailer } : undefined)
      return c.json({ success: true, data: result.data })
    }
  )

  // GET /deals
  router.get(
    "/deals",
    zValidator("query", dealsQuerySchema),
    async (c) => {
      const client = createClient({
        ...options,
        apiKey: options.apiKey || (c.env as Record<string, unknown> | undefined)?.SHOPSAVVY_API_KEY as string | undefined,
      })
      const query = c.req.valid("query")
      const result = await client.getDeals(query)
      return c.json({ success: true, deals: result.deals, pagination: result.pagination })
    }
  )

  // GET /categories
  router.get("/categories", (c) => {
    return c.json({ success: true, categories: CATEGORIES })
  })

  return router
}

/**
 * TypeScript RPC type for use with Hono's `hc` typed client.
 *
 * @example
 * ```ts
 * import { hc } from "hono/client"
 * import type { ShopSavvyAppType } from "@shopsavvy/hono"
 *
 * const client = hc<ShopSavvyAppType>("https://myapp.com/shopsavvy")
 * const results = await client.search.$get({ query: { q: "AirPods Pro", limit: "10" } })
 * ```
 */
export type ShopSavvyAppType = ReturnType<typeof createShopSavvyRouter>
