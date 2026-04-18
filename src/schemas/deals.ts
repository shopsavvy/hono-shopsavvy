import { z } from "zod"

export const dealsQuerySchema = z.object({
  category: z.string().optional(),
  sort: z.enum(["hot", "new", "top-hour", "top-day", "top-week"]).default("hot"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  retailer: z.string().optional(),
  tag: z.string().optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  grade: z.string().optional(),
})

export type DealsQuery = z.infer<typeof dealsQuerySchema>
