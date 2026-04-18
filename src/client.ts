import { ShopSavvyDataAPI } from "@shopsavvy/sdk"
import type { ShopSavvyOptions } from "./types.js"

/**
 * Resolve API key from options or environment variables.
 * Checks `options.apiKey`, then `process.env.SHOPSAVVY_API_KEY`,
 * then Cloudflare-style `globalThis.SHOPSAVVY_API_KEY`.
 */
function resolveApiKey(options: ShopSavvyOptions = {}): string {
  const key =
    options.apiKey ||
    (typeof process !== "undefined" ? process.env?.SHOPSAVVY_API_KEY : undefined) ||
    (typeof globalThis !== "undefined" ? (globalThis as Record<string, unknown>).SHOPSAVVY_API_KEY as string | undefined : undefined)

  if (!key) {
    throw new Error(
      "ShopSavvy API key is required. Pass { apiKey } or set the SHOPSAVVY_API_KEY environment variable. " +
      "Get your key at https://shopsavvy.com/data"
    )
  }

  return key
}

/**
 * Create a ShopSavvyDataAPI client from options.
 * This is the internal factory used by the middleware and router.
 */
export function createClient(options: ShopSavvyOptions = {}): ShopSavvyDataAPI {
  const apiKey = resolveApiKey(options)
  return new ShopSavvyDataAPI({
    apiKey,
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
    ...(options.timeout ? { timeout: options.timeout } : {}),
  })
}
