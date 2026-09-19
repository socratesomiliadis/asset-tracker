import { describe, expect, it } from 'vitest'
import {
  assetQueryParamsSchema,
  assetSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
  INSPECTION_DATE_ERROR,
  normalizeLongitudeBounds,
  isoDateSchema,
} from './asset.js'

const asset = {
  id: '40f7b8c9-99d4-4439-8242-d719afd728b7',
  name: 'North hydrant',
  type: 'hydrant',
  status: 'ok',
  lat: 37.9838,
  lng: 23.7275,
  installed_at: '2025-01-10T09:30:00Z',
  last_inspected_at: null,
  notes: '',
} as const

describe('asset schemas', () => {
  it.each(['0000-01-01', '0001-01-01T00:00:00+14:00', '9999-12-31T23:59:59-14:00',
    '2026-01-01T12:00:00+23:59', '2026-01-01T12:00:00+14:01'])('rejects unsupported date %s', (value) => {
    expect(isoDateSchema.safeParse(value).success).toBe(false)
  })
  it.each(['0001-01-01', '9999-12-31', '2026-01-01T12:00:00+14:00', '2026-01-01T12:00:00-14:00'])('accepts supported date %s', (value) => {
    expect(isoDateSchema.safeParse(value).success).toBe(true)
  })
  it('rejects reversed date filters and whitespace-only coordinates', () => {
    expect(assetQueryParamsSchema.safeParse({ installed_from: '2026-01-02', installed_to: '2026-01-01' }).success).toBe(false)
    expect(assetQueryParamsSchema.safeParse({ inspected_from: '2026-01-02', inspected_to: '2026-01-01' }).success).toBe(false)
    expect(assetQueryParamsSchema.safeParse({ minLat: ' ', maxLat: 40, minLng: -80, maxLng: -70 }).success).toBe(false)
  })
  it.each([
    [-75, -70, -75, -70],
    [170, 190, 170, -170],
    [-190, -170, 170, -170],
    [530, 550, 170, -170],
    [190, 200, -170, -160],
    [-550, -540, 170, -180],
    [170, -170, 170, -170],
    [-180, 180, -180, 180],
    [180, 540, -180, 180],
    [-200, 200, -180, 180],
    [180, 180, -180, -180],
    [180, -180, -180, -180],
    [0, 0, 0, 0],
  ])('normalizes longitude bounds %s to %s', (west, east, minLng, maxLng) => {
    expect(normalizeLongitudeBounds(west, east)).toEqual({ minLng, maxLng })
    expect(assetQueryParamsSchema.parse({ minLat: -10, maxLat: 10, minLng: west, maxLng: east }))
      .toEqual({ minLat: -10, maxLat: 10, minLng, maxLng })
  })

  it.each(['', 'NaN', 'Infinity', '-Infinity'])('rejects non-finite longitude %j', (minLng) => {
    expect(assetQueryParamsSchema.safeParse({ minLat: 0, maxLat: 1, minLng, maxLng: 10 }).success).toBe(false)
  })
  it('rejects inspection before installation with a field error', () => {
    const { id: _id, ...input } = asset
    const result = createAssetInputSchema.safeParse({ ...input, last_inspected_at: '2025-01-09' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors).toEqual({
      last_inspected_at: [INSPECTION_DATE_ERROR],
    })
    expect(updateAssetInputSchema.safeParse({ installed_at: '2025-02-01', last_inspected_at: '2025-01-01' }).success).toBe(false)
  })

  it('compares instants across offsets and accepts equality, null, and partial dates', () => {
    expect(updateAssetInputSchema.safeParse({ installed_at: '2025-01-01T10:00:00+02:00', last_inspected_at: '2025-01-01T08:00:00Z' }).success).toBe(true)
    expect(updateAssetInputSchema.safeParse({ installed_at: '2025-01-01T10:00:00+02:00', last_inspected_at: '2025-01-01T09:00:00+03:00' }).success).toBe(false)
    expect(updateAssetInputSchema.safeParse({ last_inspected_at: null }).success).toBe(true)
    expect(updateAssetInputSchema.safeParse({ last_inspected_at: '2025-01-01' }).success).toBe(true)
  })
  it('validates an Asset', () => {
    expect(assetSchema.parse(asset)).toEqual(asset)
  })

  it('accepts ISO dates used by seed data', () => {
    expect(
      assetSchema.parse({
        ...asset,
        installed_at: '2025-01-10',
        last_inspected_at: '2025-02-15',
      }),
    ).toMatchObject({
      installed_at: '2025-01-10',
      last_inspected_at: '2025-02-15',
    })
  })

  it('validates create and partial update inputs', () => {
    const { id: _id, ...createInput } = asset

    expect(createAssetInputSchema.parse(createInput)).toEqual(createInput)
    expect(updateAssetInputSchema.parse({ status: 'warning' })).toEqual({
      status: 'warning',
    })
    expect(updateAssetInputSchema.safeParse({}).success).toBe(false)
    expect(createAssetInputSchema.safeParse({ ...createInput, name: ' ' }).success).toBe(false)
  })

  it('coerces numeric query parameters', () => {
    expect(
      assetQueryParamsSchema.parse({
        type: 'pipe',
        status: 'critical',
        limit: '25',
        offset: '50',
      }),
    ).toEqual({
      type: 'pipe',
      status: 'critical',
      limit: 25,
      offset: 50,
    })
  })

  it('validates a complete bounding box', () => {
    expect(
      assetQueryParamsSchema.parse({
        minLat: '40',
        maxLat: '43',
        minLng: '-75',
        maxLng: '-70',
      }),
    ).toEqual({ minLat: 40, maxLat: 43, minLng: -75, maxLng: -70 })
  })

  it('rejects incomplete or reversed bounding boxes', () => {
    const incomplete = assetQueryParamsSchema.safeParse({
      minLat: '40',
      maxLat: '43',
    })
    const reversed = assetQueryParamsSchema.safeParse({
      minLat: '43',
      maxLat: '40',
      minLng: '-70',
      maxLng: '-75',
    })

    expect(incomplete.success).toBe(false)
    expect(reversed.success).toBe(false)
  })
})
