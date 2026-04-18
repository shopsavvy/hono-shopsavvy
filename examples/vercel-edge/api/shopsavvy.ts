import { handle } from "hono/vercel"
import { Hono } from "hono"
import {
  createShopSavvyRouter,
  createShopSavvySSERouter,
  withCache,
  InMemoryCache,
} from "@shopsavvy/hono"

export const config = { runtime: "edge" }

const app = new Hono().basePath("/shopsavvy")

// Pre-built router
app.route("/", createShopSavvyRouter({ apiKey: process.env.SHOPSAVVY_API_KEY }))

// SSE streaming
app.route("/stream", createShopSavvySSERouter({ apiKey: process.env.SHOPSAVVY_API_KEY }))

// In-memory cache for frequently accessed data
const cache = new InMemoryCache({ maxEntries: 200, defaultTtl: 60 })

app.get("/hot-deals", async (c) => {
  const { createClient } = await import("@shopsavvy/hono")
  const client = createClient({ apiKey: process.env.SHOPSAVVY_API_KEY! })

  const deals = await withCache({
    key: "hot-deals",
    ttl: 60,
    cache,
    loader: () => client.getDeals({ sort: "hot", limit: 20 }),
  })

  return c.json(deals)
})

export default handle(app)
