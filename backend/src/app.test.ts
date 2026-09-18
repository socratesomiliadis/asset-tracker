import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const serviceMock = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('./services/asset.service.js', () => ({
  assetService: serviceMock,
}))

import { app } from './app.js'

const asset = {
  id: '17fc695a-07a0-4a6e-8822-e8f36c031199',
  name: 'Sensor S-0001',
  type: 'sensor',
  status: 'ok',
  lat: 42.373366,
  lng: -71.133174,
  installed_at: '2001-04-05T00:00:00.000Z',
  last_inspected_at: '2025-09-21T00:00:00.000Z',
  notes: '',
}

beforeEach(() => {
  serviceMock.findMany.mockReset()
  serviceMock.findMany.mockResolvedValue({ data: [asset], total: 150 })
})

describe('GET /api/health', () => {
  it('reports that the API is healthy', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })
})

describe('GET /api/assets', () => {
  it('returns assets with default pagination metadata', async () => {
    const response = await request(app).get('/api/assets')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: [asset],
      meta: { total: 150, limit: 50, offset: 0 },
    })
    expect(serviceMock.findMany).toHaveBeenCalledWith({ limit: 50, offset: 0 })
  })

  it('accepts explicit limit and offset values', async () => {
    const response = await request(app).get('/api/assets?limit=20&offset=40')

    expect(response.status).toBe(200)
    expect(response.body.meta).toEqual({ total: 150, limit: 20, offset: 40 })
    expect(serviceMock.findMany).toHaveBeenCalledWith({ limit: 20, offset: 40 })
  })

  it('composes type and status filters', async () => {
    const response = await request(app).get(
      '/api/assets?type=sensor&status=warning&limit=10',
    )

    expect(response.status).toBe(200)
    expect(serviceMock.findMany).toHaveBeenCalledWith({
      type: 'sensor',
      status: 'warning',
      limit: 10,
      offset: 0,
    })
  })

  it('passes a complete bounding box to the service', async () => {
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

  it.each(['/api/assets?limit=0', '/api/assets?limit=101', '/api/assets?offset=-1'])(
    'rejects invalid pagination for %s',
    async (url) => {
      const response = await request(app).get(url)

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid query parameters')
      expect(serviceMock.findMany).not.toHaveBeenCalled()
    },
  )

  it.each(['/api/assets?type=meter', '/api/assets?status=offline'])(
    'rejects invalid filters for %s',
    async (url) => {
      const response = await request(app).get(url)

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Invalid query parameters')
      expect(serviceMock.findMany).not.toHaveBeenCalled()
    },
  )

  it.each([
    '/api/assets?minLat=40&maxLat=43&minLng=-75',
    '/api/assets?minLat=-91&maxLat=43&minLng=-75&maxLng=-70',
    '/api/assets?minLat=43&maxLat=40&minLng=-75&maxLng=-70',
    '/api/assets?minLat=40&maxLat=43&minLng=-70&maxLng=-75',
  ])('rejects invalid geographic queries for %s', async (url) => {
    const response = await request(app).get(url)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Invalid query parameters')
    expect(response.body.message).toEqual(expect.any(String))
    expect(serviceMock.findMany).not.toHaveBeenCalled()
  })
})
