import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMock = vi.hoisted(() => ({
  findMany: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('../services/asset.service.js', () => ({
  assetService: serviceMock,
}))

import { app } from '../app.js'

const asset = {
  id: '17fc695a-07a0-4a6e-8822-e8f36c031199',
  name: 'Sensor S-0001',
  type: 'sensor',
  status: 'warning',
  lat: 42.373366,
  lng: -71.133174,
  installed_at: '2001-04-05T00:00:00.000Z',
  last_inspected_at: '2025-09-21T00:00:00.000Z',
  notes: '',
}

const createInput = {
  name: asset.name,
  type: asset.type,
  status: asset.status,
  lat: asset.lat,
  lng: asset.lng,
  installed_at: asset.installed_at,
  last_inspected_at: asset.last_inspected_at,
  notes: asset.notes,
}

beforeEach(() => {
  vi.clearAllMocks()
  serviceMock.findMany.mockResolvedValue({ data: [asset], total: 150 })
  serviceMock.findById.mockResolvedValue(asset)
  serviceMock.create.mockResolvedValue(asset)
  serviceMock.update.mockResolvedValue(asset)
  serviceMock.delete.mockResolvedValue(true)
})

describe('asset API', () => {
  it('returns assets with pagination metadata', async () => {
    const response = await request(app).get('/api/assets?limit=20&offset=40')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: [asset],
      meta: { total: 150, limit: 20, offset: 40 },
    })
    expect(serviceMock.findMany).toHaveBeenCalledWith({ limit: 20, offset: 40 })
  })

  it('filters assets by type', async () => {
    const response = await request(app).get('/api/assets?type=sensor')

    expect(response.status).toBe(200)
    expect(serviceMock.findMany).toHaveBeenCalledWith({
      type: 'sensor',
      limit: 50,
      offset: 0,
    })
  })

  it('filters assets by status', async () => {
    const response = await request(app).get('/api/assets?status=warning')

    expect(response.status).toBe(200)
    expect(serviceMock.findMany).toHaveBeenCalledWith({
      status: 'warning',
      limit: 50,
      offset: 0,
    })
  })

  it('filters assets by bounding box', async () => {
    const response = await request(app).get(
      '/api/assets?minLat=40&maxLat=43&minLng=-75&maxLng=-70',
    )

    expect(response.status).toBe(200)
    expect(serviceMock.findMany).toHaveBeenCalledWith({
      minLat: 40,
      maxLat: 43,
      minLng: -75,
      maxLng: -70,
      limit: 50,
      offset: 0,
    })
  })

  it('returns 400 for an invalid geographic query', async () => {
    const response = await request(app).get(
      '/api/assets?minLat=43&maxLat=40&minLng=-75&maxLng=-70',
    )

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_QUERY_PARAMETERS')
    expect(serviceMock.findMany).not.toHaveBeenCalled()
  })

  it('creates a valid asset', async () => {
    const response = await request(app).post('/api/assets').send(createInput)

    expect(response.status).toBe(201)
    expect(response.body).toEqual(asset)
    expect(serviceMock.create).toHaveBeenCalledWith(createInput)
  })

  it('rejects invalid coordinates during creation', async () => {
    const response = await request(app)
      .post('/api/assets')
      .send({ ...createInput, lat: 91 })

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_REQUEST_BODY')
    expect(serviceMock.create).not.toHaveBeenCalled()
  })

  it('updates an asset', async () => {
    serviceMock.update.mockResolvedValueOnce({ ...asset, status: 'critical' })

    const response = await request(app)
      .patch(`/api/assets/${asset.id}`)
      .send({ status: 'critical' })

    expect(response.status).toBe(200)
    expect(response.body.status).toBe('critical')
    expect(serviceMock.update).toHaveBeenCalledWith(asset.id, {
      status: 'critical',
    })
  })

  it('deletes an asset', async () => {
    const response = await request(app).delete(`/api/assets/${asset.id}`)

    expect(response.status).toBe(204)
    expect(response.text).toBe('')
    expect(serviceMock.delete).toHaveBeenCalledWith(asset.id)
  })

  it('returns 404 for an unknown asset', async () => {
    serviceMock.findById.mockResolvedValueOnce(null)

    const response = await request(app).get(`/api/assets/${asset.id}`)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: { code: 'ASSET_NOT_FOUND', message: 'Asset not found' },
    })
  })
})

 it('returns an actionable error for notes exceeding the request limit', async () => {
   const response = await request(app).post('/api/assets').send({ ...createInput, notes: 'x'.repeat(110_000) })
   expect(response.status).toBe(413)
   expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE')
   expect(serviceMock.create).not.toHaveBeenCalled()
 })

 it('returns 400 instead of a server error for malformed JSON', async () => {
   const response = await request(app).post('/api/assets').set('Content-Type', 'application/json').send('{')
   expect(response.status).toBe(400)
   expect(response.body.error.code).toBe('INVALID_JSON')
   expect(serviceMock.create).not.toHaveBeenCalled()
 })
