import { z } from "zod"

export const offersParamSchema = z.object({
  identifier: z.string().min(1, "Product identifier is required"),
})

export const offersQuerySchema = z.object({
  retailer: z.string().optional(),
})

export type OffersParam = z.infer<typeof offersParamSchema>
export type OffersQuery = z.infer<typeof offersQuerySchema>
