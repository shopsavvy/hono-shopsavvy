/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx"
import type { Offer, ProductDetails } from "../types.js"

interface PriceComparisonTableProps {
  product: ProductDetails
  offers: Offer[]
  /** Maximum rows to render. Default: all */
  maxRows?: number
}

/**
 * Async server component — renders a sortable price comparison table showing
 * retailer, price, availability, and a direct link for each offer.
 *
 * @example
 * ```tsx
 * import { Hono } from "hono"
 * import { PriceComparisonTable } from "@shopsavvy/hono/components"
 *
 * const app = new Hono()
 * app.get("/compare/:id", async (c) => {
 *   const client = c.get("shopsavvy")
 *   const result = await client.getCurrentOffers(c.req.param("id"))
 *   const { offers, ...product } = result.data[0]
 *   return c.html(<PriceComparisonTable product={product} offers={offers} />)
 * })
 * ```
 */
export const PriceComparisonTable: FC<PriceComparisonTableProps> = ({ product, offers, maxRows }) => {
  const sorted = [...offers]
    .filter((o) => typeof o.price === "number")
    .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
    .slice(0, maxRows)

  const lowestPrice = sorted[0]?.price

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "640px" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", color: "#111827" }}>
        {product.title}
      </h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "#6b7280", fontWeight: 600 }}>Retailer</th>
              <th style={{ textAlign: "right", padding: "8px 12px", color: "#6b7280", fontWeight: 600 }}>Price</th>
              <th style={{ textAlign: "center", padding: "8px 12px", color: "#6b7280", fontWeight: 600 }}>Availability</th>
              <th style={{ textAlign: "center", padding: "8px 12px", color: "#6b7280", fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((offer, index) => {
              const isLowest = offer.price === lowestPrice
              return (
                <tr
                  key={offer.id}
                  style={{
                    borderBottom: "1px solid #f3f4f6",
                    background: index % 2 === 0 ? "#fff" : "#f9fafb",
                  }}
                >
                  <td style={{ padding: "10px 12px", color: "#374151", fontWeight: offer.retailer ? 500 : 400 }}>
                    {offer.retailer ?? "Unknown Retailer"}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right" }}>
                    <span style={{
                      fontWeight: 700,
                      color: isLowest ? "#059669" : "#111827",
                      fontSize: isLowest ? "15px" : "14px",
                    }}>
                      {typeof offer.price === "number"
                        ? `$${offer.price.toFixed(2)}`
                        : "—"}
                    </span>
                    {isLowest && (
                      <span style={{
                        marginLeft: "6px",
                        fontSize: "11px",
                        background: "#d1fae5",
                        color: "#065f46",
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        fontWeight: 600,
                      }}>
                        Best
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <span style={{
                      fontSize: "12px",
                      color: offer.availability === "in_stock" ? "#059669" : "#6b7280",
                      textTransform: "capitalize",
                    }}>
                      {offer.availability?.replace(/_/g, " ") ?? "Unknown"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    {offer.URL && (
                      <a
                        href={offer.URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-block",
                          padding: "5px 12px",
                          background: "#111827",
                          color: "#fff",
                          borderRadius: "6px",
                          textDecoration: "none",
                          fontSize: "12px",
                          fontWeight: 500,
                        }}
                      >
                        Buy
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {offers.length === 0 && (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>No offers available.</p>
        )}
      </div>
    </div>
  )
}
