import { describe, expect, it } from 'vitest'
import {
  assetQueryParamsSchema,
  assetSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
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
