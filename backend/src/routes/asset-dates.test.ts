import request from 'supertest'
import { beforeEach, expect, it, vi } from 'vitest'
import { INSPECTION_DATE_ERROR } from '@asset-tracker/shared'

import { createApp } from '../app.js'
import { AssetService, type AssetStore } from '../services/asset.service.js'
const repository = {
  findMany: vi.fn(), findMapPoints: vi.fn(), count: vi.fn(), delete: vi.fn(),
  findById: vi.fn(), create: vi.fn(), update: vi.fn(),
} satisfies AssetStore
const app = createApp({ assetService: new AssetService(repository), corsOrigin: 'http://localhost:5173' })

const asset = {
  id: '17fc695a-07a0-4a6e-8822-e8f36c031199', name: 'Sensor', type: 'sensor', status: 'ok',
  lat: 40, lng: -70, installed_at: '2026-01-10T12:00:00.000Z',
  last_inspected_at: '2026-02-10T12:00:00.000Z', notes: '',
}
const { id, ...input } = asset

beforeEach(() => {
  vi.resetAllMocks()
  repository.findById.mockResolvedValue(asset)
  repository.create.mockResolvedValue(asset)
  repository.update.mockImplementation(async (_id, patch) => ({ ...asset, ...patch }))
})

it('returns a field-level 400 on creation before writing', async () => {
  const response = await request(app).post('/api/assets').send({ ...input, last_inspected_at: '2026-01-01' })
  expect(response.status).toBe(400)
  expect(response.body.error.details.fieldErrors).toEqual({ last_inspected_at: [INSPECTION_DATE_ERROR] })
  expect(repository.create).not.toHaveBeenCalled()
})

it.each([
  { last_inspected_at: '2026-01-10T11:59:59.999Z' },
  { installed_at: '2026-02-11' },
])('validates a partial update against stored dates: %j', async (patch) => {
  const response = await request(app).patch(`/api/assets/${id}`).send(patch)
  expect(response.status).toBe(400)
  expect(response.body.error.details.fieldErrors).toEqual({ last_inspected_at: [INSPECTION_DATE_ERROR] })
  expect(repository.update).not.toHaveBeenCalled()
})

it.each([
  { notes: 'Updated notes' },
  { last_inspected_at: null },
  { last_inspected_at: asset.installed_at },
  { installed_at: '2026-03-01', last_inspected_at: '2026-03-02' },
  { installed_at: '2026-01-01' },
])('accepts valid updates and writes only supplied fields: %j', async (patch) => {
  const response = await request(app).patch(`/api/assets/${id}`).send(patch)
  expect(response.status).toBe(200)
  expect(repository.update).toHaveBeenCalledExactlyOnceWith(id, patch)
})

it('preserves 404 for partial updates to missing assets', async () => {
  repository.findById.mockResolvedValue(null)
  const response = await request(app).patch(`/api/assets/${id}`).send({ installed_at: '2026-03-01' })
  expect(response.status).toBe(404)
  expect(repository.update).not.toHaveBeenCalled()
})

it('maps a wrapped database constraint violation to the inspection field', async () => {
  repository.update.mockRejectedValue(new Error('Query failed', {
    cause: { code: '23514', constraint: 'assets_inspection_after_installation' },
  }))
  const response = await request(app).patch(`/api/assets/${id}`).send({ notes: 'Concurrent edit' })
  expect(response.status).toBe(400)
  expect(response.body.error.details.fieldErrors).toEqual({ last_inspected_at: [INSPECTION_DATE_ERROR] })
})
