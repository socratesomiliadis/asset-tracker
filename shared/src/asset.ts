import { z } from 'zod'

export const ASSET_TYPES = ['pipe', 'hydrant', 'sensor', 'valve'] as const
export const ASSET_STATUSES = ['ok', 'warning', 'critical'] as const

export const assetTypeSchema = z.enum(ASSET_TYPES)

export const assetStatusSchema = z.enum(ASSET_STATUSES)

export const assetIdSchema = z.string().uuid()

export const isoDateSchema = z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true }),
])

export const assetSchema = z
  .object({
    id: assetIdSchema,
    name: z.string().trim().min(1, 'Name is required'),
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

const latitudeQuerySchema = z.preprocess(
  (value) => (value === '' ? Number.NaN : value),
  z.coerce.number().min(-90).max(90),
)

const longitudeQuerySchema = z.preprocess(
  (value) => (value === '' ? Number.NaN : value),
  z.coerce.number().min(-180).max(180),
)

export const assetQueryParamsSchema = assetFiltersSchema
  .extend({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort_by: z
      .enum(['name', 'type', 'status', 'installed_at', 'last_inspected_at'])
      .optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
    minLat: latitudeQuerySchema.optional(),
    maxLat: latitudeQuerySchema.optional(),
    minLng: longitudeQuerySchema.optional(),
    maxLng: longitudeQuerySchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const bounds = [value.minLat, value.maxLat, value.minLng, value.maxLng]
    const providedBounds = bounds.filter((bound) => bound !== undefined).length

    if (providedBounds > 0 && providedBounds < bounds.length) {
      context.addIssue({
        code: 'custom',
        message: 'minLat, maxLat, minLng, and maxLng must be provided together',
        path: ['minLat'],
      })
      return
    }

    if (
      value.minLat !== undefined &&
      value.maxLat !== undefined &&
      value.minLat > value.maxLat
    ) {
      context.addIssue({
        code: 'custom',
        message: 'minLat must be less than or equal to maxLat',
        path: ['minLat'],
      })
    }

    if (
      value.minLng !== undefined &&
      value.maxLng !== undefined &&
      value.minLng > value.maxLng
    ) {
      context.addIssue({
        code: 'custom',
        message: 'minLng must be less than or equal to maxLng',
        path: ['minLng'],
      })
    }
  })

export type AssetType = z.infer<typeof assetTypeSchema>
export type AssetStatus = z.infer<typeof assetStatusSchema>
export type Asset = z.infer<typeof assetSchema>
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>
export type AssetFilters = z.infer<typeof assetFiltersSchema>
export type AssetQueryParams = z.infer<typeof assetQueryParamsSchema>

export type AssetPage = {
  data: Asset[]
  meta: { total: number; limit: number; offset: number }
}

export const DEFAULT_ASSET_LIMIT = 50
export const DEFAULT_ASSET_OFFSET = 0
