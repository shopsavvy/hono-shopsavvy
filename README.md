# ShopSavvy for Hono

Edge-native product search and price comparison for [Hono](https://hono.dev) — runs on Cloudflare Workers, Vercel Edge, Bun, Node, and Deno with zero changes.

## Install

```bash
npm install @shopsavvy/hono
```

## Quick Start

```ts
import { Hono } from "hono"
import { createShopSavvyRouter } from "@shopsavvy/hono"

const app = new Hono()
app.route("/shopsavvy", createShopSavvyRouter())
export default app
```

Set your API key:

```bash
export SHOPSAVVY_API_KEY=ss_live_your_key_here
```

Get your API key at [shopsavvy.com/data](https://shopsavvy.com/data).

That's it. Your app now has five ShopSavvy endpoints ready to use.

## Endpoints

All endpoints are relative to the mount prefix (default `/shopsavvy`).

### `GET /search`

Search products by keyword across all retailers.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | required | Search query |
| `limit` | number | 10 | Results per page (1–100) |
| `offset` | number | 0 | Pagination offset |

```
GET /shopsavvy/search?q=AirPods+Pro&limit=5
```

```json
{
  "success": true,
  "data": [
    { "title": "Apple AirPods Pro (2nd gen)", "shopsavvy": "abc123", "brand": "Apple", ... }
  ],
  "pagination": { "total": 48, "limit": 5, "offset": 0, "returned": 5 }
}
```

### `GET /offers/:identifier`

Get current prices from all retailers for a product. The `identifier` can be a barcode, ASIN, URL, model number, or ShopSavvy product ID.

| Param | Type | Description |
|-------|------|-------------|
| `retailer` | string | Filter to a single retailer, by domain (e.g. `amazon.com`) |

```
GET /shopsavvy/offers/B0CHWRXH8B
```

```json
{
  "success": true,
  "data": [
    {
      "title": "Apple AirPods Pro (2nd gen)",
      "offers": [
        { "id": "o1", "retailer": "Amazon", "price": 189.99, "availability": "in_stock", "URL": "https://..." },
        { "id": "o2", "retailer": "Best Buy", "price": 199.99, "availability": "in_stock", "URL": "https://..." }
      ]
    }
  ]
}
```

### `GET /history/:identifier`

Retrieve historical pricing. Use `days` for a rolling window, or `start`/`end` for a fixed date range.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `days` | number | 30 | Rolling window in days (1–365) |
| `start` | string | — | Start date YYYY-MM-DD (overrides `days`) |
| `end` | string | — | End date YYYY-MM-DD (overrides `days`) |
| `retailer` | string | — | Filter to a single retailer, by domain (e.g. `amazon.com`) |

```
GET /shopsavvy/history/B0CHWRXH8B?days=90
```

### `GET /deals`

Browse expert-graded deals with community voting. Deals are sorted by a Reddit-style decay algorithm by default.

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sort` | `hot` \| `new` \| `top-hour` \| `top-day` \| `top-week` | `hot` | Sort order |
| `category` | string | — | Filter by category slug |
| `retailer` | string | — | Filter by retailer |
| `tag` | string | — | Filter by tag |
| `min_price` | number | — | Minimum price |
| `max_price` | number | — | Maximum price |
| `grade` | string | — | Filter by deal grade letter (A, B, C...) |
| `limit` | number | 20 | Results per page |
| `offset` | number | 0 | Pagination offset |

```
GET /shopsavvy/deals?category=electronics&sort=hot&limit=10
```

```json
{
  "success": true,
  "deals": [
    {
      "path": "/deals/sony-wh1000xm5",
      "title": "Sony WH-1000XM5 Wireless Headphones",
      "grade": { "letter": "A", "suffix": "+", "value": 97 },
      "pricing": { "current": 279.99, "original": 399.99, "currency": "USD" },
      "retailer": { "name": "Amazon" },
      "votes": { "upvotes": 124, "downvotes": 3, "score": 121 },
      "url": "https://..."
    }
  ],
  "pagination": { "total": 430, "has_more": true, "limit": 10, "offset": 0 }
}
```

### `GET /categories`

List all available category slugs and display names for use with `GET /deals?category=...`.

```
GET /shopsavvy/categories
```

```json
{
  "success": true,
  "categories": [
    { "slug": "electronics", "display": "Electronics" },
    { "slug": "computers", "display": "Computers" },
    ...
  ]
}
```

## Using the Middleware

Use `shopsavvyMiddleware()` to inject the ShopSavvy client into any route via `c.get('shopsavvy')`:

```ts
import { Hono } from "hono"
import { shopsavvyMiddleware } from "@shopsavvy/hono"
import type { ShopSavvyEnv } from "@shopsavvy/hono"

const app = new Hono<ShopSavvyEnv>()
app.use(shopsavvyMiddleware())

app.get("/my-search", async (c) => {
  const client = c.get("shopsavvy")
  const results = await client.searchProducts(c.req.query("q") ?? "")
  return c.json(results)
})
```

## OpenAPI + Swagger UI

Use `createShopSavvyOpenAPIApp()` for a fully documented app with auto-generated OpenAPI spec and Swagger UI:

```ts
import { createShopSavvyOpenAPIApp } from "@shopsavvy/hono"

const app = createShopSavvyOpenAPIApp({
  title: "My Product API",
  version: "2.0.0",
  docsPath: "/docs",   // Swagger UI served here
})

export default app
```

Spec is available at `GET /openapi.json`. Swagger UI at `GET /docs`.

## SSE Streaming

Stream real-time deals to connected clients with Server-Sent Events:

```ts
import { Hono } from "hono"
import { createShopSavvySSERouter } from "@shopsavvy/hono"

const app = new Hono()
app.route("/shopsavvy", createShopSavvySSERouter())
```

Then on the client:

```ts
const es = new EventSource("/shopsavvy/deals/stream?category=electronics&interval=15000")

es.addEventListener("deal", (e) => {
  const deal = JSON.parse(e.data)
  console.log(`${deal.grade.letter} deal: ${deal.title} — $${deal.pricing.current}`)
})

es.addEventListener("heartbeat", () => console.log("connection alive"))
es.addEventListener("error", (e) => console.error("stream error", e))
```

The stream sends new deals as `deal` events, a `heartbeat` event on each poll cycle to keep the connection alive through proxies, and an `error` event on fetch failures. The `interval` param controls poll frequency in milliseconds (min 5000, default 30000).

## JSX Components

Server-side JSX components for use with Hono's JSX engine:

```tsx
import { Hono } from "hono"
import { shopsavvyMiddleware } from "@shopsavvy/hono"
import { ProductCard, PriceComparisonTable, DealFeed } from "@shopsavvy/hono/components"

const app = new Hono()
app.use(shopsavvyMiddleware())

// Product card
app.get("/product/:id", async (c) => {
  const client = c.get("shopsavvy")
  const result = await client.getCurrentOffers(c.req.param("id"))
  return c.html(<ProductCard product={result.data[0]} />)
})

// Price comparison table
app.get("/compare/:id", async (c) => {
  const client = c.get("shopsavvy")
  const result = await client.getCurrentOffers(c.req.param("id"))
  const { offers, ...product } = result.data[0]
  return c.html(<PriceComparisonTable product={product} offers={offers} />)
})

// Deal feed
app.get("/deals", async (c) => {
  const client = c.get("shopsavvy")
  const { deals } = await client.getDeals({ sort: "hot", limit: 10 })
  return c.html(<DealFeed deals={deals} />)
})
```

Components are unstyled inline-style React-compatible JSX — no CSS dependencies, works in any runtime.

## RPC Client

Use Hono's typed `hc` client to get end-to-end type safety from server to client:

```ts
// server.ts
import { createShopSavvyRouter } from "@shopsavvy/hono"
import type { ShopSavvyAppType } from "@shopsavvy/hono"

export type { ShopSavvyAppType }

// client.ts (React, React Native, SvelteKit, etc.)
import { hc } from "hono/client"
import type { ShopSavvyAppType } from "./server"

const client = hc<ShopSavvyAppType>("https://myapp.com/shopsavvy")

// Fully typed — params, query, response
const res = await client.search.$get({ query: { q: "AirPods Pro", limit: "10" } })
const data = await res.json()
//    ^? { success: true, data: ProductDetails[], pagination: ... }
```

## Caching

### Cloudflare Workers (KV)

```ts
import { CloudflareKVCache, withCache } from "@shopsavvy/hono"

app.get("/deals", async (c) => {
  const client = c.get("shopsavvy")
  const cache = new CloudflareKVCache(c.env.SHOPSAVVY_KV)

  const deals = await withCache({
    key: "deals:hot",
    ttl: 120,
    cache,
    loader: () => client.getDeals({ sort: "hot", limit: 20 }),
  })

  return c.json(deals)
})
```

Declare the binding in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SHOPSAVVY_KV"
id = "your-kv-id"
```

### Cloudflare Cache API

```ts
import { CloudflareCacheAPIAdapter, withCache } from "@shopsavvy/hono"

const cache = new CloudflareCacheAPIAdapter()

const result = await withCache({
  key: "https://cache.local/search?q=AirPods",
  ttl: 60,
  cache,
  loader: () => client.searchProducts("AirPods"),
})
```

### Node / Bun / Deno (in-memory)

```ts
import { InMemoryCache, withCache } from "@shopsavvy/hono"

const cache = new InMemoryCache({ maxEntries: 500, defaultTtl: 60 })

const deals = await withCache({
  key: "deals:electronics",
  ttl: 90,
  cache,
  loader: () => client.getDeals({ category: "electronics" }),
})
```

### Custom adapter

Implement the two-method `CacheAdapter` interface to plug in Redis, Durable Objects, or anything else:

```ts
import type { CacheAdapter } from "@shopsavvy/hono"

const redisCache: CacheAdapter = {
  get: (key) => redis.get(key),
  set: (key, value, ttl) => redis.setex(key, ttl ?? 60, value),
  delete: (key) => redis.del(key),
}
```

## Multi-Runtime Examples

### Cloudflare Workers

```ts
import { Hono } from "hono"
import { createShopSavvyRouter, shopsavvyMiddleware } from "@shopsavvy/hono"

interface Env { SHOPSAVVY_API_KEY: string }

const app = new Hono<{ Bindings: Env }>()
app.use("*", (c, next) =>
  shopsavvyMiddleware({ apiKey: c.env.SHOPSAVVY_API_KEY })(c, next)
)
app.route("/shopsavvy", createShopSavvyRouter())
export default app
```

Deploy: `wrangler secret put SHOPSAVVY_API_KEY` then `wrangler deploy`.

### Bun

```ts
import { Hono } from "hono"
import { createShopSavvyRouter } from "@shopsavvy/hono"

const app = new Hono()
app.route("/shopsavvy", createShopSavvyRouter())
Bun.serve({ port: 3000, fetch: app.fetch })
```

### Deno Deploy

```ts
import { Hono } from "npm:hono"
import { createShopSavvyRouter } from "npm:@shopsavvy/hono"

const app = new Hono()
app.route("/shopsavvy", createShopSavvyRouter())
Deno.serve(app.fetch)
```

### Node.js

```ts
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { createShopSavvyRouter } from "@shopsavvy/hono"

const app = new Hono()
app.route("/shopsavvy", createShopSavvyRouter())
serve({ fetch: app.fetch, port: 3000 })
```

### Vercel Edge

```ts
import { handle } from "hono/vercel"
import { Hono } from "hono"
import { createShopSavvyRouter } from "@shopsavvy/hono"

export const config = { runtime: "edge" }
const app = new Hono().basePath("/api")
app.route("/shopsavvy", createShopSavvyRouter())
export default handle(app)
```

## Configuration

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | string | ShopSavvy API key. Falls back to `SHOPSAVVY_API_KEY` env var. |
| `baseUrl` | string | Override the ShopSavvy API base URL. |
| `timeout` | number | Request timeout in milliseconds. Default: 30000. |

```ts
createShopSavvyRouter({
  apiKey: process.env.SHOPSAVVY_API_KEY,
  timeout: 10000,
})
```

## More

- [Integration page](https://shopsavvy.com/integrations/hono)
- [ShopSavvy Data API docs](https://shopsavvy.com/data/documentation)
- [All integrations](https://shopsavvy.com/integrations)

## License

MIT
