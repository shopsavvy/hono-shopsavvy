import { Hono } from "hono"
import {
  createShopSavvyRouter,
  createShopSavvySSERouter,
  shopsavvyMiddleware,
  withCache,
  CloudflareKVCache,
} from "@shopsavvy/hono"

interface Env {
  SHOPSAVVY_API_KEY: string
  SHOPSAVVY_KV: KVNamespace
}

const app = new Hono<{ Bindings: Env }>()

// Inject ShopSavvy client into all routes
app.use("*", (c, next) =>
  shopsavvyMiddleware({ apiKey: c.env.SHOPSAVVY_API_KEY })(c, next)
)

// Mount the pre-built router at /shopsavvy
// Provides: /shopsavvy/search, /shopsavvy/offers/:id, /shopsavvy/history/:id, /shopsavvy/deals, /shopsavvy/categories
app.route("/shopsavvy", createShopSavvyRouter())

// Mount SSE streaming at /shopsavvy/stream/deals/stream
app.route("/shopsavvy/stream", createShopSavvySSERouter())

// Custom route using the injected client + KV cache
app.get("/deals/electronics", async (c) => {
  const client = c.get("shopsavvy")
  const cache = new CloudflareKVCache(c.env.SHOPSAVVY_KV)

  const result = await withCache({
    key: "deals:electronics",
    ttl: 120,
    cache,
    loader: () => client.getDeals({ category: "electronics", sort: "hot", limit: 10 }),
  })

  return c.json(result)
})

export default app
