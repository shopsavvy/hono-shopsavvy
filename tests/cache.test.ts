import { describe, it, expect, beforeEach } from "vitest"
import { InMemoryCache, withCache } from "../src/cache/index.js"

describe("InMemoryCache", () => {
  let cache: InMemoryCache

  beforeEach(() => {
    cache = new InMemoryCache({ maxEntries: 5, defaultTtl: 10 })
  })

  it("stores and retrieves values", async () => {
    await cache.set("key1", "value1")
    const result = await cache.get("key1")
    expect(result).toBe("value1")
  })

  it("returns null for missing keys", async () => {
    const result = await cache.get("missing")
    expect(result).toBeNull()
  })

  it("deletes values", async () => {
    await cache.set("key1", "value1")
    await cache.delete("key1")
    const result = await cache.get("key1")
    expect(result).toBeNull()
  })

  it("evicts oldest entry when at capacity", async () => {
    for (let i = 0; i < 5; i++) {
      await cache.set(`key${i}`, `value${i}`)
    }
    // key0 is the oldest and should be evicted
    await cache.set("key5", "value5")
    const evicted = await cache.get("key0")
    expect(evicted).toBeNull()
    const newest = await cache.get("key5")
    expect(newest).toBe("value5")
  })

  it("returns null for entries with 0 TTL (expired immediately)", async () => {
    cache = new InMemoryCache({ defaultTtl: 0 })
    // ttl=0 means expiresAt is set to epoch 0, so the entry is already expired
    await cache.set("key1", "value1", 0)
    const result = await cache.get("key1")
    expect(result).toBeNull()
  })
})

describe("withCache", () => {
  it("calls loader on cache miss and caches result", async () => {
    const cache = new InMemoryCache()
    let callCount = 0
    const loader = async () => {
      callCount++
      return { data: "loaded" }
    }

    const result1 = await withCache({ key: "test", ttl: 60, cache, loader })
    const result2 = await withCache({ key: "test", ttl: 60, cache, loader })

    expect(callCount).toBe(1)
    expect(result1).toEqual({ data: "loaded" })
    expect(result2).toEqual({ data: "loaded" })
  })

  it("calls loader again after TTL expires", async () => {
    const cache = new InMemoryCache({ defaultTtl: 0 })
    let callCount = 0
    const loader = async () => {
      callCount++
      return { data: `call-${callCount}` }
    }

    await withCache({ key: "test", ttl: 0, cache, loader })
    await withCache({ key: "test", ttl: 0, cache, loader })

    expect(callCount).toBe(2)
  })
})
