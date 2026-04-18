import { serve } from "@hono/node-server"
import { Hono } from "hono"
import {
  createShopSavvyRouter,
  createShopSavvySSERouter,
  shopsavvyMiddleware,
  withCache,
  InMemoryCache,
} from "@shopsavvy/hono"

const app = new Hono()
const cache = new InMemoryCache({ maxEntries: 500, defaultTtl: 60 })

// Inject ShopSavvy client
app.use("*", shopsavvyMiddleware())

// Mount pre-built router
app.route("/shopsavvy", createShopSavvyRouter())

// SSE streaming
app.route("/shopsavvy/stream", createShopSavvySSERouter())

// Custom cached endpoint
app.get("/deals", async (c) => {
  const client = c.get("shopsavvy")

  const deals = await withCache({
    key: "deals:hot",
    ttl: 60,
    cache,
    loader: () => client.getDeals({ sort: "hot", limit: 20 }),
  })

  return c.json(deals)
})

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Listening on http://localhost:${info.port}`)
})
