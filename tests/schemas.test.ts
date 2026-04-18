import { describe, it, expect } from "vitest"
import { searchQuerySchema } from "../src/schemas/search.js"
import { offersParamSchema, offersQuerySchema } from "../src/schemas/offers.js"
import { historyQuerySchema } from "../src/schemas/history.js"
import { dealsQuerySchema } from "../src/schemas/deals.js"

describe("searchQuerySchema", () => {
  it("parses valid query", () => {
    const result = searchQuerySchema.safeParse({ q: "AirPods Pro", limit: "5" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBe("AirPods Pro")
      expect(result.data.limit).toBe(5)
    }
  })

  it("rejects missing q", () => {
    const result = searchQuerySchema.safeParse({ limit: "5" })
    expect(result.success).toBe(false)
  })

  it("applies default limit", () => {
    const result = searchQuerySchema.safeParse({ q: "test" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
    }
  })

  it("rejects limit above 100", () => {
    const result = searchQuerySchema.safeParse({ q: "test", limit: "200" })
    expect(result.success).toBe(false)
  })
})

describe("offersParamSchema", () => {
  it("parses valid identifier", () => {
    const result = offersParamSchema.safeParse({ identifier: "012345678901" })
    expect(result.success).toBe(true)
  })

  it("rejects empty identifier", () => {
    const result = offersParamSchema.safeParse({ identifier: "" })
    expect(result.success).toBe(false)
  })
})

describe("offersQuerySchema", () => {
  it("allows optional retailer", () => {
    const result = offersQuerySchema.safeParse({ retailer: "Amazon" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.retailer).toBe("Amazon")
    }
  })

  it("allows empty object", () => {
    const result = offersQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe("historyQuerySchema", () => {
  it("applies default days", () => {
    const result = historyQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.days).toBe(30)
    }
  })

  it("rejects invalid date format", () => {
    const result = historyQuerySchema.safeParse({ start: "01-01-2024" })
    expect(result.success).toBe(false)
  })

  it("accepts valid date range", () => {
    const result = historyQuerySchema.safeParse({ start: "2024-01-01", end: "2024-01-31" })
    expect(result.success).toBe(true)
  })

  it("rejects days above 365", () => {
    const result = historyQuerySchema.safeParse({ days: "400" })
    expect(result.success).toBe(false)
  })
})

describe("dealsQuerySchema", () => {
  it("applies defaults", () => {
    const result = dealsQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sort).toBe("hot")
      expect(result.data.limit).toBe(20)
      expect(result.data.offset).toBe(0)
    }
  })

  it("rejects invalid sort value", () => {
    const result = dealsQuerySchema.safeParse({ sort: "invalid" })
    expect(result.success).toBe(false)
  })

  it("accepts all valid sort values", () => {
    for (const sort of ["hot", "new", "top-hour", "top-day", "top-week"]) {
      const result = dealsQuerySchema.safeParse({ sort })
      expect(result.success).toBe(true)
    }
  })
})
