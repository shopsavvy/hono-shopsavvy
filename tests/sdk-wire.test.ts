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
    // The real /products/offers/history shape: one entry PER PRODUCT, each offer with
    // its own `history` (newest first; `currency` null / `availability` absent when unknown).
    data: [{
      title: "Sony WH-1000XM5",
      shopsavvy: "abc123",
      brand: "Sony",
      category: null,
      barcode: "027242923232",
      amazon: "B09XS7JWHH",
      model: "WH1000XM5/B",
      mpn: null,
      images: [],
      offers: [
        {
          id: "o1",
          availability: "in",
          condition: "new",
          retailer: "Amazon",
          currency: "USD",
          price: 299.99,
          seller: null,
          URL: "https://www.amazon.com/dp/B09XS7JWHH",
          timestamp: "2026-01-02T00:00:00Z",
          history: [
            { availability: "in", price: 299.99, currency: "USD", timestamp: "2026-01-02T00:00:00Z" },
            { price: 329.99, currency: null, timestamp: "2025-12-20T00:00:00Z" },
          ],
        },
        {
          id: "o2",
          availability: "in",
          condition: "used",
          retailer: "eBay",
          currency: "USD",
          price: 210,
          seller: "audio_reseller",
          URL: "https://www.ebay.com/itm/1234567890",
          timestamp: "2026-01-01T00:00:00Z",
          history: [],
        },
      ],
    }],
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
    const body = await res.json() as {
      data: Array<{ shopsavvy: string; offers: Array<{ id: string; history: Array<{ timestamp: string; price: number; currency?: string | null }> }> }>
    }
    expect(body.data).toHaveLength(1)
    expect(body.data[0].shopsavvy).toBe("abc123")
    expect(body.data[0].offers.map((o) => o.id)).toEqual(["o1", "o2"])
    expect(body.data[0].offers[0].history[0]).toMatchObject({ timestamp: "2026-01-02T00:00:00Z", price: 299.99, currency: "USD" })
    expect(body.data[0].offers[0].history[1]).toMatchObject({ price: 329.99, currency: null })
    expect(body.data[0].offers[1].history).toEqual([])

    const spec = await (await app.request("/openapi.json")).json() as any
    // data is an array of ProductWithOfferHistory (per product), whose offers are OfferWithHistory
    const schemas = spec.components.schemas
    expect(schemas.HistoryResponse.properties.data.items.$ref).toBe("#/components/schemas/ProductWithOfferHistory")
    // Schema.extend() is emitted as allOf: [$ref Base, { properties: { ...added } }]
    const productExtension = schemas.ProductWithOfferHistory.allOf.find((part: any) => part.properties?.offers)
    expect(productExtension.required).toContain("offers")
    expect(productExtension.properties.offers.items.$ref).toBe("#/components/schemas/OfferWithHistory")
    const offerExtension = schemas.OfferWithHistory.allOf.find((part: any) => part.properties?.history)
    expect(offerExtension.required).toContain("history")
    expect(offerExtension.properties.history.items.$ref).toBe("#/components/schemas/PriceHistoryEntry")
    expect(schemas.PriceHistoryEntry.required).toEqual(expect.arrayContaining(["timestamp", "price"]))
    expect(schemas.PriceHistoryEntry.properties.currency.nullable).toBe(true)
  })

  it("serves Swagger UI at the docs path", async () => {
    const app = createShopSavvyOpenAPIApp({ apiKey, baseUrl })
    const res = await app.request("/docs")
    expect(res.status).toBe(200)
    expect(await res.text()).toContain("/openapi.json")
  })
})
