import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import { createShopSavvyRouter } from "../src/router.js"

// ---- Mocks ----

const mockClient = {
  searchProducts: vi.fn(),
  getCurrentOffers: vi.fn(),
  getPriceHistory: vi.fn(),
  getDeals: vi.fn(),
}

vi.mock("../src/client.js", () => ({
  createClient: vi.fn(() => mockClient),
}))

// ---- Tests ----

describe("createShopSavvyRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClient.searchProducts.mockResolvedValue({
      data: [{ title: "AirPods Pro", shopsavvy: "abc" }],
      pagination: { total: 1, limit: 10, offset: 0, returned: 1 },
    })
    mockClient.getCurrentOffers.mockResolvedValue({
      data: [{ title: "AirPods Pro", shopsavvy: "abc", offers: [{ id: "o1", price: 199.99, retailer: "Amazon" }] }],
    })
    mockClient.getPriceHistory.mockResolvedValue({
      data: [{ id: "o1", price: 199.99, price_history: [{ date: "2024-01-01", price: 199.99, availability: "in_stock" }] }],
    })
    mockClient.getDeals.mockResolvedValue({
      deals: [
        {
          path: "/deals/airpods",
          title: "AirPods Pro deal",
          grade: { letter: "A", value: 95 },
          pricing: { current: 199.99, currency: "USD" },
          retailer: { name: "Amazon" },
          url: "https://amzn.to/abc",
          votes: { upvotes: 42, downvotes: 1, score: 41 },
          comment_count: 3,
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      pagination: { total: 1, has_more: false, limit: 20, offset: 0 },
    })
  })

  it("GET /search returns results", async () => {
    const app = new Hono()
    app.route("/shopsavvy", createShopSavvyRouter({ apiKey: "ss_test_abc" }))

    const res = await app.request("/shopsavvy/search?q=AirPods+Pro")
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(body.data).toHaveLength(1)
    expect(mockClient.searchProducts).toHaveBeenCalledWith("AirPods Pro", { limit: 10, offset: 0 })
  })

  it("GET /search with missing q returns 400", async () => {
    const app = new Hono()
    app.route("/shopsavvy", createShopSavvyRouter({ apiKey: "ss_test_abc" }))

    const res = await app.request("/shopsavvy/search")
    expect(res.status).toBe(400)
  })

  it("GET /offers/:identifier returns offers", async () => {
    const app = new Hono()
    app.route("/shopsavvy", createShopSavvyRouter({ apiKey: "ss_test_abc" }))

    const res = await app.request("/shopsavvy/offers/012345678901")
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; data: unknown[] }
    expect(body.success).toBe(true)
    expect(mockClient.getCurrentOffers).toHaveBeenCalledWith("012345678901", undefined)
  })

  it("GET /history/:identifier uses days param to compute date range", async () => {
    const app = new Hono()
    app.route("/shopsavvy", createShopSavvyRouter({ apiKey: "ss_test_abc" }))

    const res = await app.request("/shopsavvy/history/012345678901?days=7")
    expect(res.status).toBe(200)
    expect(mockClient.getPriceHistory).toHaveBeenCalledOnce()
    const [id, start, end] = mockClient.getPriceHistory.mock.calls[0] as [string, string, string]
    expect(id).toBe("012345678901")
    // end should be today
    expect(end).toBe(new Date().toISOString().slice(0, 10))
    // start should be 7 days ago
    const expectedStart = new Date()
    expectedStart.setDate(expectedStart.getDate() - 7)
    expect(start).toBe(expectedStart.toISOString().slice(0, 10))
  })

  it("GET /deals returns deals", async () => {
    const app = new Hono()
    app.route("/shopsavvy", createShopSavvyRouter({ apiKey: "ss_test_abc" }))

    const res = await app.request("/shopsavvy/deals?sort=hot&limit=5")
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; deals: unknown[] }
    expect(body.success).toBe(true)
    expect(body.deals).toHaveLength(1)
  })

  it("GET /categories returns category list", async () => {
    const app = new Hono()
    app.route("/shopsavvy", createShopSavvyRouter({ apiKey: "ss_test_abc" }))

    const res = await app.request("/shopsavvy/categories")
    expect(res.status).toBe(200)
    const body = await res.json() as { success: boolean; categories: { slug: string; display: string }[] }
    expect(body.success).toBe(true)
    expect(body.categories.length).toBeGreaterThan(0)
    expect(body.categories[0]).toHaveProperty("slug")
    expect(body.categories[0]).toHaveProperty("display")
  })
})
