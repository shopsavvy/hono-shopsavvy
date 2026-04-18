import { createMiddleware } from "hono/factory"
import { createClient } from "./client.js"
import type { ShopSavvyEnv, ShopSavvyOptions } from "./types.js"

/**
 * Hono middleware that injects a ShopSavvyDataAPI client into context.
 * Access it in handlers via `c.get('shopsavvy')`.
 *
 * @example
 * ```ts
 * import { Hono } from "hono"
 * import { shopsavvyMiddleware } from "@shopsavvy/hono"
 *
 * const app = new Hono<ShopSavvyEnv>()
 * app.use(shopsavvyMiddleware())
 *
 * app.get("/search", async (c) => {
 *   const client = c.get("shopsavvy")
 *   const results = await client.searchProducts(c.req.query("q") ?? "")
 *   return c.json(results)
 * })
 * ```
 *
 * For Cloudflare Workers, pass `apiKey` from env bindings:
 * ```ts
 * app.use((c, next) => shopsavvyMiddleware({ apiKey: c.env.SHOPSAVVY_API_KEY })(c, next))
 * ```
 */
export function shopsavvyMiddleware(options: ShopSavvyOptions = {}) {
  return createMiddleware<ShopSavvyEnv>(async (c, next) => {
    // For Cloudflare Workers, also check c.env for the API key
    const apiKey =
      options.apiKey ||
      (c.env as Record<string, unknown> | undefined)?.SHOPSAVVY_API_KEY as string | undefined

    const client = createClient({ ...options, apiKey })
    c.set("shopsavvy", client)
    await next()
  })
}
