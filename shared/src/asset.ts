import { z } from 'zod'

export const assetTypeSchema = z.enum(['pipe', 'hydrant', 'sensor', 'valve'])

export const assetStatusSchema = z.enum(['ok', 'warning', 'critical'])

export const isoDateSchema = z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true }),
])

export const assetSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    type: assetTypeSchema,
    status: assetStatusSchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    installed_at: isoDateSchema,
    last_inspected_at: isoDateSchema.nullable(),
    notes: z.string(),
  })
  .strict()

export const createAssetInputSchema = assetSchema.omit({ id: true }).strict()

export const updateAssetInputSchema = createAssetInputSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })

export const assetFiltersSchema = z
  .object({
    search: z.string().optional(),
    type: assetTypeSchema.optional(),
    status: assetStatusSchema.optional(),
    installed_from: isoDateSchema.optional(),
    installed_to: isoDateSchema.optional(),
    inspected_from: isoDateSchema.optional(),
    inspected_to: isoDateSchema.optional(),
  })
  .strict()

export const assetQueryParamsSchema = assetFiltersSchema
  .extend({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort_by: z
      .enum(['name', 'type', 'status', 'installed_at', 'last_inspected_at'])
      .optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  })
  .strict()

export type AssetType = z.infer<typeof assetTypeSchema>
export type AssetStatus = z.infer<typeof assetStatusSchema>
export type Asset = z.infer<typeof assetSchema>
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>
export type AssetFilters = z.infer<typeof assetFiltersSchema>
export type AssetQueryParams = z.infer<typeof assetQueryParamsSchema>
