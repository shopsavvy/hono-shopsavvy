import { describe, it, expect, expectTypeOf } from "vitest"
import { hc } from "hono/client"
import type { ShopSavvyAppType } from "../src/router.js"

// Compile-time check that ShopSavvyAppType carries the router's routes, so the README's
// `hc<ShopSavvyAppType>()` example is actually typed. `tsc -p tsconfig.test.json` (run
// by `npm test`) fails if these routes disappear from the type.
describe("ShopSavvyAppType RPC typing", () => {
  it("exposes every route on the hc client", () => {
    const client = hc<ShopSavvyAppType>("http://localhost/shopsavvy")
    expectTypeOf(client.search.$get).toBeFunction()
    expectTypeOf(client.offers[":identifier"].$get).toBeFunction()
    expectTypeOf(client.history[":identifier"].$get).toBeFunction()
    expectTypeOf(client.deals.$get).toBeFunction()
    expectTypeOf(client.categories.$get).toBeFunction()
    // The README example must type-check as written (never invoked here).
    const readmeExample = () => client.search.$get({ query: { q: "AirPods Pro", limit: "10" } })
    expectTypeOf(readmeExample).toBeFunction()
    expect(typeof client.search.$get).toBe("function")
  })
})
