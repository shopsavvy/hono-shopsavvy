import { Hono } from "hono"
import { createShopSavvyRouter, createShopSavvySSERouter, shopsavvyMiddleware } from "@shopsavvy/hono"
import { hc } from "hono/client"
import type { ShopSavvyAppType } from "@shopsavvy/hono"

const app = new Hono()

// Inject ShopSavvy client
app.use("*", shopsavvyMiddleware())

// Mount pre-built router
const shopRouter = createShopSavvyRouter()
app.route("/shopsavvy", shopRouter)

// Mount SSE streaming
app.route("/shopsavvy/stream", createShopSavvySSERouter())

// Custom endpoint using the injected client
app.get("/", async (c) => {
  const client = c.get("shopsavvy")
  const deals = await client.getDeals({ sort: "hot", limit: 5 })
  return c.json({ message: "ShopSavvy + Hono on Bun", topDeals: deals.deals.slice(0, 3) })
})

const server = Bun.serve({
  port: 3000,
  fetch: app.fetch,
})

console.log(`Listening on http://localhost:${server.port}`)

// ---- Typed RPC client example ----
// In a separate client file (e.g. client.ts), use the typed hc client:

export const rpcClient = hc<ShopSavvyAppType>("http://localhost:3000/shopsavvy")

// Usage (type-safe):
// const res = await rpcClient.search.$get({ query: { q: "AirPods Pro", limit: "10" } })
// const data = await res.json()
