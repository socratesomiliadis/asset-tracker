import { describe, expect, it } from 'vitest'
import {
  assetQueryParamsSchema,
  assetSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
  INSPECTION_DATE_ERROR,
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
