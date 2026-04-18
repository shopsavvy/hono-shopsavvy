// deno run --allow-net --allow-env server.ts
import { Hono } from "npm:hono"
import { createShopSavvyRouter, createShopSavvySSERouter, shopsavvyMiddleware } from "npm:@shopsavvy/hono"

const app = new Hono()

// Inject ShopSavvy client (reads SHOPSAVVY_API_KEY from env)
app.use("*", shopsavvyMiddleware())

// Mount pre-built router
app.route("/shopsavvy", createShopSavvyRouter())

// SSE streaming
app.route("/shopsavvy/stream", createShopSavvySSERouter())

// Custom endpoint
app.get("/", async (c) => {
  const client = c.get("shopsavvy")
  const deals = await client.getDeals({ sort: "hot", limit: 5 })
  return c.json({ runtime: "Deno", deals: deals.deals })
})

Deno.serve({ port: 3000 }, app.fetch)
