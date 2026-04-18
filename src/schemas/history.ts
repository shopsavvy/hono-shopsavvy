import { z } from "zod"

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")

export const historyParamSchema = z.object({
  identifier: z.string().min(1, "Product identifier is required"),
})

export const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  retailer: z.string().optional(),
  start: isoDate.optional(),
  end: isoDate.optional(),
})

export type HistoryParam = z.infer<typeof historyParamSchema>
export type HistoryQuery = z.infer<typeof historyQuerySchema>
