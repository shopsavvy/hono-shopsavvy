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
  const clientFor = (env: unknown) =>
    createClient({
      ...options,
      apiKey: options.apiKey || (env as Record<string, unknown> | undefined)?.SHOPSAVVY_API_KEY as string | undefined,
    })

  // Routes are chained (not registered with separate `router.get(...)` statements) so
  // the returned Hono instance's type carries every route's path, validated input and
  // JSON output. That is what makes `ShopSavvyAppType` usable with `hc<>()`; with
  // unchained calls the type is a bare `Hono` and the RPC client knows no routes.
  return new Hono()
    // GET /search
    .get(
      "/search",
      zValidator("query", searchQuerySchema),
      async (c) => {
        const { q, limit, offset } = c.req.valid("query")
        const result = await clientFor(c.env).searchProducts(q, { limit, offset })
        return c.json({ success: true as const, data: result.data, pagination: result.pagination })
      }
    )
    // GET /offers/:identifier
    .get(
      "/offers/:identifier",
      zValidator("param", offersParamSchema),
      zValidator("query", offersQuerySchema),
      async (c) => {
        const { identifier } = c.req.valid("param")
        const { retailer } = c.req.valid("query")
        const result = await clientFor(c.env).getCurrentOffers(identifier, retailer ? { retailer } : undefined)
        return c.json({ success: true as const, data: result.data })
      }
    )
    // GET /history/:identifier
    .get(
      "/history/:identifier",
      zValidator("param", historyParamSchema),
      zValidator("query", historyQuerySchema),
      async (c) => {
        const { identifier } = c.req.valid("param")
        const { days, retailer, start, end } = c.req.valid("query")

        const endDate = end ?? new Date().toISOString().slice(0, 10)
        const startDate = start ?? (() => {
          const d = new Date()
          d.setDate(d.getDate() - days)
          return d.toISOString().slice(0, 10)
        })()

        const result = await clientFor(c.env).getPriceHistory(identifier, startDate, endDate, retailer ? { retailer } : undefined)
        return c.json({ success: true as const, data: result.data })
      }
    )
    // GET /deals
    .get(
      "/deals",
      zValidator("query", dealsQuerySchema),
      async (c) => {
        const query = c.req.valid("query")
        const result = await clientFor(c.env).getDeals(query)
        return c.json({ success: true as const, deals: result.deals, pagination: result.pagination })
      }
    )
    // GET /categories
    .get("/categories", (c) => {
      return c.json({ success: true as const, categories: CATEGORIES })
    })
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
