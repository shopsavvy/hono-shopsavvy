/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx"
import type { ProductDetails, Offer } from "../types.js"

interface ProductCardProps {
  product: ProductDetails & { offers?: Offer[] }
  /** Show the lowest available price. Default: true */
  showPrice?: boolean
  /** Show retailer count badge. Default: true */
  showRetailerCount?: boolean
}

/**
 * Async server component — renders a product card with image, title, brand,
 * lowest price, and optional retailer count badge.
 *
 * @example
 * ```tsx
 * import { Hono } from "hono"
 * import { ProductCard } from "@shopsavvy/hono/components"
 *
 * const app = new Hono()
 * app.get("/product/:id", async (c) => {
 *   const client = c.get("shopsavvy")
 *   const result = await client.getCurrentOffers(c.req.param("id"))
 *   const product = result.data[0]
 *   return c.html(<ProductCard product={product} />)
 * })
 * ```
 */
export const ProductCard: FC<ProductCardProps> = ({ product, showPrice = true, showRetailerCount = true }) => {
  const image = product.images?.[0]
  const lowestOffer = product.offers
    ?.filter((o) => typeof o.price === "number")
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0]

  const retailerCount = product.offers?.length ?? 0

  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: "12px",
      overflow: "hidden",
      background: "#fff",
      maxWidth: "320px",
      fontFamily: "system-ui, sans-serif",
    }}>
      {image && (
        <div style={{ background: "#f9fafb", padding: "24px", textAlign: "center" }}>
          <img
            src={image}
            alt={product.title}
            style={{ maxHeight: "160px", maxWidth: "100%", objectFit: "contain" }}
          />
        </div>
      )}
      <div style={{ padding: "16px" }}>
        {product.brand && (
          <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {product.brand}
          </p>
        )}
        <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: 600, lineHeight: "1.4", color: "#111827" }}>
          {product.title}
        </h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {showPrice && lowestOffer && typeof lowestOffer.price === "number" && (
            <div>
              <span style={{ fontSize: "20px", fontWeight: 700, color: "#111827" }}>
                ${lowestOffer.price.toFixed(2)}
              </span>
              {lowestOffer.retailer && (
                <span style={{ marginLeft: "6px", fontSize: "12px", color: "#6b7280" }}>
                  at {lowestOffer.retailer}
                </span>
              )}
            </div>
          )}
          {showRetailerCount && retailerCount > 1 && (
            <span style={{
              background: "#f3f4f6",
              borderRadius: "9999px",
              padding: "4px 10px",
              fontSize: "12px",
              color: "#374151",
              fontWeight: 500,
            }}>
              {retailerCount} stores
            </span>
          )}
        </div>
        {lowestOffer?.URL && (
          <a
            href={lowestOffer.URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              marginTop: "12px",
              padding: "10px",
              background: "#111827",
              color: "#fff",
              borderRadius: "8px",
              textAlign: "center",
              textDecoration: "none",
              fontSize: "14px",
              fontWeight: 500,
            }}
          >
            View Deal
          </a>
        )}
      </div>
    </div>
  )
}
