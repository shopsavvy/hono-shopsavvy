import { z } from "zod"

export const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
