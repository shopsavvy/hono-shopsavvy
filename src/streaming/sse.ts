import { Hono } from "hono"
import { streamSSE } from "hono/streaming"
import { createClient } from "../client.js"
import type { ShopSavvyOptions } from "../types.js"

/**
 * Create a Hono app with an SSE streaming endpoint for real-time deals.
 *
 * Mount it at any prefix using `app.route("/stream", createShopSavvySSERouter())`.
 *
 * Endpoints (relative to mount prefix):
 * - `GET /deals/stream?category=...&interval=...`
 *   Streams new deals as SSE events. Each event is a JSON-encoded deal.
 *   `interval` controls poll frequency in milliseconds (default: 30000, min: 5000).
 *
 * @example
 * ```ts
 * import { Hono } from "hono"
 * import { createShopSavvySSERouter } from "@shopsavvy/hono"
 *
 * const app = new Hono()
 * app.route("/shopsavvy", createShopSavvySSERouter())
 * export default app
 * ```
 *
 * Browser-side usage:
 * ```ts
 * const es = new EventSource("/shopsavvy/deals/stream?category=electronics")
 * es.addEventListener("deal", (e) => console.log(JSON.parse(e.data)))
 * es.addEventListener("heartbeat", () => console.log("ping"))
 * es.addEventListener("error", (e) => console.error(e))
 * ```
 */
export function createShopSavvySSERouter(options: ShopSavvyOptions = {}) {
  const router = new Hono()

  router.get("/deals/stream", async (c) => {
    const apiKey =
      options.apiKey ||
      (c.env as Record<string, unknown> | undefined)?.SHOPSAVVY_API_KEY as string | undefined

    const client = createClient({ ...options, apiKey })

    const category = c.req.query("category")
    const rawInterval = parseInt(c.req.query("interval") ?? "30000")
    const interval = Math.max(5000, rawInterval)

    return streamSSE(c, async (stream) => {
      // Track the IDs of deals already sent to avoid duplicates
      const seen = new Set<string>()

      // Send an initial snapshot
      const initial = await client.getDeals({
        sort: "hot",
        limit: 20,
        ...(category ? { category } : {}),
      })

      for (const deal of initial.deals) {
        seen.add(deal.path)
        await stream.writeSSE({
          event: "deal",
          data: JSON.stringify(deal),
          id: deal.path,
        })
      }

      // Poll for new deals on the given interval
      let id = 0
      while (!stream.writableEnded) {
        await stream.sleep(interval)

        try {
          const page = await client.getDeals({
            sort: "new",
            limit: 10,
            ...(category ? { category } : {}),
          })

          for (const deal of page.deals) {
            if (!seen.has(deal.path)) {
              seen.add(deal.path)
              await stream.writeSSE({
                event: "deal",
                data: JSON.stringify(deal),
                id: deal.path,
              })
            }
          }
        } catch {
          // Emit a structured error event so clients can react
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ message: "Failed to fetch deals" }),
            id: String(++id),
          })
        }

        // Heartbeat keeps the connection alive through proxies
        await stream.writeSSE({
          event: "heartbeat",
          data: JSON.stringify({ ts: Date.now() }),
          id: String(++id),
        })
      }
    })
  })

  return router
}
