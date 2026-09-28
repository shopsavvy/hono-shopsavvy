import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { swaggerUI } from "@hono/swagger-ui"
import { createClient } from "./client.js"
import { searchQuerySchema } from "./schemas/search.js"
import { offersParamSchema, offersQuerySchema } from "./schemas/offers.js"
import { historyParamSchema, historyQuerySchema } from "./schemas/history.js"
import { dealsQuerySchema } from "./schemas/deals.js"
import type { ShopSavvyOptions } from "./types.js"

// ---- Shared response schemas ----

const ErrorSchema = z.object({
  success: z.literal(false),
  error: z.string(),
}).openapi("Error")

const ProductSchema = z.object({
  title: z.string(),
  shopsavvy: z.string(),
  brand: z.string().optional(),
  category: z.string().optional(),
  images: z.array(z.string()).optional(),
  barcode: z.string().optional(),
  amazon: z.string().optional(),
  model: z.string().optional(),
}).openapi("Product")

const OfferSchema = z.object({
  id: z.string(),
  retailer: z.string().optional(),
  price: z.number().optional(),
  currency: z.string().optional(),
  availability: z.string().optional(),
  condition: z.string().optional(),
  URL: z.string().optional(),
  timestamp: z.string().optional(),
}).openapi("Offer")

const DealSchema = z.object({
  path: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  grade: z.object({
    letter: z.string(),
    suffix: z.string().optional(),
    value: z.number(),
    justification: z.string().optional(),
  }),
  pricing: z.object({
    current: z.number(),
    original: z.number().optional(),
    currency: z.string(),
  }),
  retailer: z.object({ name: z.string() }),
  url: z.string(),
  image: z.object({ url: z.string() }).optional(),
  votes: z.object({
    upvotes: z.number(),
    downvotes: z.number(),
    score: z.number(),
  }),
  comment_count: z.number(),
  created_at: z.string(),
}).openapi("Deal")

// ---- Routes ----

const searchRoute = createRoute({
  method: "get",
  path: "/search",
  summary: "Search products",
  description: "Search for products across thousands of retailers by keyword.",
  tags: ["Products"],
  request: { query: searchQuerySchema },
  responses: {
    200: {
      description: "Matching products",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(ProductSchema),
            pagination: z.object({
              total: z.number(),
              limit: z.number(),
              offset: z.number(),
              returned: z.number(),
            }),
          }).openapi("SearchResponse"),
        },
      },
    },
    400: { description: "Bad request", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
})

const offersRoute = createRoute({
  method: "get",
  path: "/offers/{identifier}",
  summary: "Get current offers",
  description: "Retrieve current prices from all retailers for a product.",
  tags: ["Products"],
  request: {
    params: offersParamSchema,
    query: offersQuerySchema,
  },
  responses: {
    200: {
      description: "Product with current offers",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(ProductSchema.extend({ offers: z.array(OfferSchema) })),
          }).openapi("OffersResponse"),
        },
      },
    },
    400: { description: "Bad request", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
})

const historyRoute = createRoute({
  method: "get",
  path: "/history/{identifier}",
  summary: "Get price history",
  description: "Retrieve historical pricing data. Use `days` for a relative window or `start`/`end` for a fixed range.",
  tags: ["Products"],
  request: {
    params: historyParamSchema,
    query: historyQuerySchema,
  },
  responses: {
    200: {
      description: "Offers with price history",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            data: z.array(OfferSchema.extend({
              history: z.array(z.object({
                timestamp: z.string(),
                price: z.number(),
                currency: z.string().nullable().optional(),
                availability: z.string().optional(),
              })),
            })),
          }).openapi("HistoryResponse"),
        },
      },
    },
    400: { description: "Bad request", content: { "application/json": { schema: ErrorSchema } } },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
})

const dealsRoute = createRoute({
  method: "get",
  path: "/deals",
  summary: "Get trending deals",
  description: "Browse expert-graded deals with community voting. Supports category, sort, and price filtering.",
  tags: ["Deals"],
  request: { query: dealsQuerySchema },
  responses: {
    200: {
      description: "Trending deals",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            deals: z.array(DealSchema),
            pagination: z.object({
              total: z.number(),
              has_more: z.boolean(),
              limit: z.number(),
              offset: z.number(),
            }),
          }).openapi("DealsResponse"),
        },
      },
    },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
})

const categoriesRoute = createRoute({
  method: "get",
  path: "/categories",
  summary: "List deal categories",
  description: "Retrieve available deal categories for filtering.",
  tags: ["Deals"],
  responses: {
    200: {
      description: "Available categories",
      content: {
        "application/json": {
          schema: z.object({
            success: z.literal(true),
            categories: z.array(z.object({
              slug: z.string(),
              display: z.string(),
            })),
          }).openapi("CategoriesResponse"),
        },
      },
    },
    500: { description: "Server error", content: { "application/json": { schema: ErrorSchema } } },
  },
})

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
 * Build a fully OpenAPI-documented ShopSavvy Hono app.
 * Mounts Swagger UI at the given `docsPath` (default `/docs`).
 *
 * @example
 * ```ts
 * import { createShopSavvyOpenAPIApp } from "@shopsavvy/hono"
 *
 * export default createShopSavvyOpenAPIApp()
 * ```
 */
export function createShopSavvyOpenAPIApp(options: ShopSavvyOptions & {
  docsPath?: string
  title?: string
  version?: string
} = {}) {
  const {
    docsPath = "/docs",
    title = "ShopSavvy API",
    version = "1.0.0",
    ...clientOptions
  } = options

  const app = new OpenAPIHono()

  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title,
      version,
      description: "Product search and price comparison powered by ShopSavvy.",
      contact: {
        name: "ShopSavvy",
        url: "https://shopsavvy.com/data",
      },
    },
    servers: [{ url: "/" }],
  })

  app.get(docsPath, swaggerUI({ url: "/openapi.json" }))

  // ---- Handlers ----

  app.openapi(searchRoute, async (c) => {
    const client = createClient(clientOptions)
    const { q, limit, offset } = c.req.valid("query")
    const result = await client.searchProducts(q, { limit, offset })
    return c.json({ success: true as const, data: result.data, pagination: result.pagination }, 200)
  })

  app.openapi(offersRoute, async (c) => {
    const client = createClient(clientOptions)
    const { identifier } = c.req.valid("param")
    const { retailer } = c.req.valid("query")
    const result = await client.getCurrentOffers(identifier, retailer ? { retailer } : undefined)
    return c.json({ success: true as const, data: result.data }, 200)
  })

  app.openapi(historyRoute, async (c) => {
    const client = createClient(clientOptions)
    const { identifier } = c.req.valid("param")
    const { days, retailer, start, end } = c.req.valid("query")

    const endDate = end ?? new Date().toISOString().slice(0, 10)
    const startDate = start ?? (() => {
      const d = new Date()
      d.setDate(d.getDate() - days)
      return d.toISOString().slice(0, 10)
    })()

    const result = await client.getPriceHistory(identifier, startDate, endDate, retailer ? { retailer } : undefined)
    return c.json({ success: true as const, data: result.data }, 200)
  })

  app.openapi(dealsRoute, async (c) => {
    const client = createClient(clientOptions)
    const query = c.req.valid("query")
    const result = await client.getDeals(query)
    return c.json({ success: true as const, deals: result.deals, pagination: result.pagination }, 200)
  })

  app.openapi(categoriesRoute, async (c) => {
    return c.json({ success: true as const, categories: CATEGORIES }, 200)
  })

  return app
}
