import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { createShopSavvyRouter } from "../src/router.js"
import { createShopSavvyOpenAPIApp } from "../src/openapi.js"

// These tests use the REAL @shopsavvy/sdk (no vi.mock) against a local HTTP server
// standing in for api.shopsavvy.com, so they prove the full path: Hono route ->
// SDK method -> the exact URL, query string and auth header the Data API receives.
// The other test files mock the SDK, which is how a router calling SDK methods that
// did not exist in the installed SDK version went unnoticed.

type Seen = { path: string; params: Record<string, string>; auth: string | undefined }

const seen: Seen[] = []
let server: Server
let baseUrl: string

const fixtures: Record<string, unknown> = {
  "/v1/products/search": {
    success: true,
    data: [{ title: "Sony WH-1000XM5", shopsavvy: "abc123" }],
    pagination: { total: 1, limit: 5, offset: 0, returned: 1 },
  },
  "/v1/products/offers": {
    success: true,
    data: [{ title: "Sony WH-1000XM5", shopsavvy: "abc123", offers: [{ id: "o1", retailer: "Amazon", price: 279.99 }] }],
  },
  "/v1/products/offers/history": {
    success: true,
    data: [{ id: "o1", retailer: "Amazon", history: [{ timestamp: "2026-01-02T00:00:00Z", price: 299.99, currency: "USD" }] }],
  },
  "/v1/deals": {
    success: true,
    deals: [],
    pagination: { total: 0, has_more: false, limit: 10, offset: 0 },
  },
}

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost")
    seen.push({
      path: url.pathname,
      params: Object.fromEntries(url.searchParams),
      auth: req.headers.authorization,
    })
    const body = fixtures[url.pathname]
    res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" })
    res.end(JSON.stringify(body ?? { success: false, error: "not found" }))
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

const apiKey = "ss_test_wirecheck123"

describe("router -> real SDK -> Data API wire format", () => {
  it("GET /search sends q/limit/offset with the bearer key", async () => {
    seen.length = 0
    const app = createShopSavvyRouter({ apiKey, baseUrl })
    const res = await app.request("/search?q=sony&limit=5&offset=10")
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ title: string }> }
    expect(body.data[0].title).toBe("Sony WH-1000XM5")
    expect(seen).toEqual([{ path: "/v1/products/search", params: { q: "sony", limit: "5", offset: "10" }, auth: `Bearer ${apiKey}` }])
  })

  it("GET /offers/:identifier sends ids and retailer", async () => {
    seen.length = 0
    const app = createShopSavvyRouter({ apiKey, baseUrl })
    const res = await app.request("/offers/B09XS7JWHH?retailer=amazon.com")
    expect(res.status).toBe(200)
    expect(seen[0].path).toBe("/v1/products/offers")
    expect(seen[0].params).toEqual({ ids: "B09XS7JWHH", retailer: "amazon.com" })
  })

  it("GET /history/:identifier sends ids/start/end (the params the API reads)", async () => {
    seen.length = 0
    const app = createShopSavvyRouter({ apiKey, baseUrl })
    const res = await app.request("/history/B09XS7JWHH?start=2026-01-01&end=2026-01-31")
    expect(res.status).toBe(200)
    expect(seen[0].path).toBe("/v1/products/offers/history")
    expect(seen[0].params).toEqual({ ids: "B09XS7JWHH", start: "2026-01-01", end: "2026-01-31" })
  })

  it("GET /deals calls the SDK's getDeals and forwards filters", async () => {
    seen.length = 0
    const app = createShopSavvyRouter({ apiKey, baseUrl })
    const res = await app.request("/deals?category=electronics&sort=new&limit=10")
    expect(res.status).toBe(200)
    expect(seen[0].path).toBe("/v1/deals")
    expect(seen[0].params).toMatchObject({ category: "electronics", sort: "new", limit: "10", offset: "0" })
  })
})

describe("OpenAPI app -> real SDK", () => {
  it("serves the history response in the shape its spec documents", async () => {
    seen.length = 0
    const app = createShopSavvyOpenAPIApp({ apiKey, baseUrl })
    const res = await app.request("/history/B09XS7JWHH?start=2026-01-01&end=2026-01-31")
    expect(res.status).toBe(200)
    const body = await res.json() as { data: Array<{ history: Array<{ timestamp: string; price: number }> }> }
    expect(body.data[0].history[0]).toMatchObject({ timestamp: "2026-01-02T00:00:00Z", price: 299.99 })

    const spec = await (await app.request("/openapi.json")).json() as any
    // Offer.extend() is emitted as allOf: [$ref Offer, { properties: { history } }]
    const historyItem = spec.components.schemas.HistoryResponse.properties.data.items
    const extension = historyItem.allOf.find((part: any) => part.properties?.history)
    expect(extension.required).toContain("history")
    expect(Object.keys(extension.properties.history.items.properties)).toEqual(
      expect.arrayContaining(["timestamp", "price"]),
    )
  })

  it("serves Swagger UI at the docs path", async () => {
    const app = createShopSavvyOpenAPIApp({ apiKey, baseUrl })
    const res = await app.request("/docs")
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("/openapi.json")
  })
})
