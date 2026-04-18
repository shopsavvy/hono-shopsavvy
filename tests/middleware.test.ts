import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import { shopsavvyMiddleware } from "../src/middleware.js"
import type { ShopSavvyEnv } from "../src/types.js"

// ---- Mocks ----

vi.mock("@shopsavvy/sdk", () => {
  return {
    ShopSavvyDataAPI: vi.fn().mockImplementation(() => ({
      searchProducts: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0, limit: 10, offset: 0, returned: 0 } }),
      getCurrentOffers: vi.fn().mockResolvedValue({ data: [] }),
      getPriceHistory: vi.fn().mockResolvedValue({ data: [] }),
      getDeals: vi.fn().mockResolvedValue({ deals: [], pagination: { total: 0, has_more: false, limit: 20, offset: 0 } }),
    })),
  }
})

// ---- Tests ----

describe("shopsavvyMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("injects shopsavvy client into context", async () => {
    const app = new Hono<ShopSavvyEnv>()
    app.use(shopsavvyMiddleware({ apiKey: "ss_test_abc123" }))
    app.get("/test", (c) => {
      const client = c.get("shopsavvy")
      return c.json({ hasClient: !!client })
    })

    const res = await app.request("/test")
    expect(res.status).toBe(200)
    const body = await res.json() as { hasClient: boolean }
    expect(body.hasClient).toBe(true)
  })

  it("returns 500 when no API key is provided", async () => {
    const originalEnv = process.env.SHOPSAVVY_API_KEY
    delete process.env.SHOPSAVVY_API_KEY

    const app = new Hono<ShopSavvyEnv>()
    app.use(shopsavvyMiddleware())
    app.get("/test", (c) => c.json({ ok: true }))

    const res = await app.request("/test")
    // Hono catches thrown errors from middleware and returns 500
    expect(res.status).toBe(500)

    process.env.SHOPSAVVY_API_KEY = originalEnv
  })

  it("reads API key from environment variable", async () => {
    process.env.SHOPSAVVY_API_KEY = "ss_test_fromenv"

    const app = new Hono<ShopSavvyEnv>()
    app.use(shopsavvyMiddleware())
    app.get("/test", (c) => c.json({ hasClient: !!c.get("shopsavvy") }))

    const res = await app.request("/test")
    expect(res.status).toBe(200)

    delete process.env.SHOPSAVVY_API_KEY
  })
})
