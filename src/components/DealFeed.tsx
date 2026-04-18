/** @jsxImportSource hono/jsx */
import type { FC } from "hono/jsx"
import type { Deal } from "../types.js"

interface DealFeedProps {
  deals: Deal[]
  /** Show community vote counts. Default: true */
  showVotes?: boolean
  /** Show grade badge. Default: true */
  showGrade?: boolean
}

function gradeColor(letter: string): { bg: string; text: string } {
  switch (letter) {
    case "A": return { bg: "#d1fae5", text: "#065f46" }
    case "B": return { bg: "#dbeafe", text: "#1e40af" }
    case "C": return { bg: "#fef9c3", text: "#713f12" }
    case "D": return { bg: "#fee2e2", text: "#991b1b" }
    default:  return { bg: "#f3f4f6", text: "#374151" }
  }
}

/**
 * Server component — renders a vertical deal feed with grade badges,
 * pricing, retailer, vote counts, and a "Get Deal" CTA.
 *
 * @example
 * ```tsx
 * import { Hono } from "hono"
 * import { DealFeed } from "@shopsavvy/hono/components"
 *
 * const app = new Hono()
 * app.get("/deals", async (c) => {
 *   const client = c.get("shopsavvy")
 *   const { deals } = await client.getDeals({ limit: 10, sort: "hot" })
 *   return c.html(<DealFeed deals={deals} />)
 * })
 * ```
 */
export const DealFeed: FC<DealFeedProps> = ({ deals, showVotes = true, showGrade = true }) => {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "600px" }}>
      {deals.map((deal) => {
        const { bg, text } = gradeColor(deal.grade.letter)
        const savings =
          deal.pricing.original && deal.pricing.original > deal.pricing.current
            ? deal.pricing.original - deal.pricing.current
            : null

        return (
          <div
            key={deal.path}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "12px",
              background: "#fff",
              display: "flex",
              gap: "12px",
              alignItems: "flex-start",
            }}
          >
            {/* Thumbnail */}
            {deal.image?.url && (
              <img
                src={deal.image.url}
                alt={deal.title}
                style={{ width: "72px", height: "72px", objectFit: "contain", borderRadius: "8px", background: "#f9fafb", flexShrink: 0 }}
              />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                {/* Grade badge */}
                {showGrade && (
                  <span style={{
                    background: bg,
                    color: text,
                    borderRadius: "6px",
                    padding: "2px 8px",
                    fontSize: "13px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {deal.grade.letter}{deal.grade.suffix ?? ""}
                  </span>
                )}

                {/* Retailer */}
                <span style={{ fontSize: "12px", color: "#6b7280" }}>{deal.retailer.name}</span>
              </div>

              {/* Title */}
              <p style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 600, color: "#111827", lineHeight: "1.4" }}>
                {deal.emoji ? `${deal.emoji} ` : ""}{deal.title}
              </p>

              {/* Subtitle */}
              {deal.subtitle && (
                <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#6b7280", lineHeight: "1.4" }}>
                  {deal.subtitle}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                {/* Price */}
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: "18px", fontWeight: 700, color: "#111827" }}>
                    ${deal.pricing.current.toFixed(2)}
                  </span>
                  {savings && (
                    <>
                      <span style={{ fontSize: "13px", color: "#9ca3af", textDecoration: "line-through" }}>
                        ${deal.pricing.original!.toFixed(2)}
                      </span>
                      <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>
                        Save ${savings.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>

                {/* Votes */}
                {showVotes && (
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    ↑{deal.votes.upvotes} · ↓{deal.votes.downvotes}
                  </span>
                )}

                {/* CTA */}
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginLeft: "auto",
                    padding: "6px 14px",
                    background: "#111827",
                    color: "#fff",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  Get Deal
                </a>
              </div>
            </div>
          </div>
        )
      })}
      {deals.length === 0 && (
        <p style={{ textAlign: "center", color: "#9ca3af", padding: "24px" }}>No deals found.</p>
      )}
    </div>
  )
}
