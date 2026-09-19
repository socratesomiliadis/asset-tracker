import { z } from 'zod'

export const ASSET_TYPES = ['pipe', 'hydrant', 'sensor', 'valve'] as const
export const ASSET_STATUSES = ['ok', 'warning', 'critical'] as const

export const assetTypeSchema = z.enum(ASSET_TYPES)

export const assetStatusSchema = z.enum(ASSET_STATUSES)

export const assetIdSchema = z.string().uuid()

export const isoDateSchema = z.union([
  z.iso.date(),
  z.iso.datetime({ offset: true }),
]).refine((value) => {
  const date = new Date(value)
  const year = date.getUTCFullYear()
  const offset = value.match(/([+-])(\d{2}):(\d{2})$/)
  const offsetMinutes = offset ? Number(offset[2]) * 60 + Number(offset[3]) : 0
  return Number(value.slice(0, 4)) >= 1 && Number.isFinite(date.getTime()) &&
    year >= 1 && year <= 9999 && offsetMinutes <= 14 * 60
}, 'Use a date in years 0001–9999 and a timezone offset within ±14:00.')

// Date-only API values always mean midnight UTC, independent of the DB timezone.
export function toUtcTimestamp(value: string): string {
  return new Date(value).toISOString()
}

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

export const INSPECTION_DATE_ERROR = 'Inspection must be at or after the installation date and time (UTC).'

function inspectionDatesInOrder(value: {
  installed_at?: string
  last_inspected_at?: string | null
}) {
  if (!value.installed_at || !value.last_inspected_at) return true
  const installed = Date.parse(value.installed_at)
  const inspected = Date.parse(value.last_inspected_at)
  // Invalid formats are reported by the individual date fields.
  return !Number.isFinite(installed) || !Number.isFinite(inspected) || inspected >= installed
}

const assetInputSchema = assetSchema.omit({ id: true }).strict()
const inspectionDateIssue = { message: INSPECTION_DATE_ERROR, path: ['last_inspected_at'] }

export const createAssetInputSchema = assetInputSchema.refine(inspectionDatesInOrder, inspectionDateIssue)

export const updateAssetInputSchema = assetInputSchema
  .partial()
  .refine(inspectionDatesInOrder, inspectionDateIssue)
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
  (value) => (typeof value === 'string' && value.trim() === '' ? Number.NaN : value),
  z.coerce.number().min(-90).max(90),
)

const longitudeQuerySchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? Number.NaN : value),
  z.coerce.number(),
)

export function normalizeLongitudeBounds(west: number, east: number) {
  // Preserve a full-world viewport before wrapping its endpoints.
  if (east - west >= 360) return { minLng: -180, maxLng: 180 }
  const wrap = (longitude: number) => ((longitude + 180) % 360 + 360) % 360 - 180
  return { minLng: wrap(west), maxLng: wrap(east) }
}

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
    for (const [from, to] of [
      ['installed_from', 'installed_to'], ['inspected_from', 'inspected_to'],
    ] as const) {
      if (value[from] && value[to] && Date.parse(value[from]) > Date.parse(value[to])) {
        context.addIssue({ code: 'custom', message: `${from} must be at or before ${to}`, path: [from] })
      }
    }
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

  })
  .transform((value) => value.minLng !== undefined && value.maxLng !== undefined
    ? { ...value, ...normalizeLongitudeBounds(value.minLng, value.maxLng) }
    : value)

export type AssetType = z.infer<typeof assetTypeSchema>
export type AssetStatus = z.infer<typeof assetStatusSchema>
export type Asset = z.infer<typeof assetSchema>
export type MapAsset = Pick<Asset, 'id' | 'name' | 'type' | 'status' | 'lat' | 'lng'>
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>
export type AssetFilters = z.infer<typeof assetFiltersSchema>
export type AssetQueryParams = z.infer<typeof assetQueryParamsSchema>

export type AssetPage = {
  data: Asset[]
  meta: { total: number; limit: number; offset: number }
}
export type MapAssetPage = Omit<AssetPage, 'data'> & { data: MapAsset[] }

export const DEFAULT_ASSET_LIMIT = 50
export const DEFAULT_ASSET_OFFSET = 0
