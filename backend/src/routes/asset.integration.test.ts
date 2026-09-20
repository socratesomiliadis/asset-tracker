import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Pool } from 'pg'
import type { Express } from 'express'
import type { AssetPage, MapAssetPage } from '@asset-tracker/shared'
import { createTestDatabase } from '../../test/database.js'

describe.skipIf(!process.env.TEST_DATABASE_URL)('asset API through PostgreSQL', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>
  let apiPool: Pool
  let app: Express
  const input = {
    name: 'Integration sensor', type: 'sensor', status: 'warning', lat: 40, lng: -70,
    installed_at: '2026-01-10', last_inspected_at: null, notes: 'Original notes',
  }

  beforeAll(async () => {
    database = await createTestDatabase(process.env.TEST_DATABASE_URL!)
    const url = new URL(database.url)
    // Date-only writes and filters must not depend on the connection timezone.
    url.searchParams.set('options', '-c timezone=America/New_York')
    vi.stubEnv('DATABASE_URL', url.toString())
    ;({ app } = await import('../app.js'))
    ;({ pool: apiPool } = await import('../db/index.js'))
  })
  beforeEach(async () => { await database.pool.query('TRUNCATE assets') })
  afterAll(async () => {
    await apiPool?.end()
    await database?.close()
    vi.unstubAllEnvs()
  })

  it('persists a complete CRUD flow and preserves untouched timestamps', async () => {
    const created = await request(app).post('/api/assets').send(input).expect(201)
    const asset = created.body
    expect(asset.installed_at).toBe('2026-01-10T00:00:00.000Z')
    expect((await request(app).get(`/api/assets/${asset.id}`).expect(200)).body).toEqual(asset)
    const updated = await request(app).patch(`/api/assets/${asset.id}`)
      .send({ notes: 'Updated notes', last_inspected_at: '2026-01-10T13:45:12.123+02:00' }).expect(200)
    expect(updated.body).toMatchObject({
      installed_at: asset.installed_at, last_inspected_at: '2026-01-10T11:45:12.123Z', notes: 'Updated notes',
    })
    await request(app).patch(`/api/assets/${asset.id}`).send({ installed_at: '2026-01-11' }).expect(400)
    const filtered = await request(app).get('/api/assets').query({
      type: 'sensor', status: 'warning', search: 'UPDATED', installed_from: '2026-01-10', installed_to: '2026-01-10',
    }).expect(200)
    expect(filtered.body.data).toEqual([updated.body])
    expect(filtered.body.meta.total).toBe(1)
    await request(app).delete(`/api/assets/${asset.id}`).expect(204)
    await request(app).get(`/api/assets/${asset.id}`).expect(404)
    await request(app).patch(`/api/assets/${asset.id}`).send({ notes: 'Gone' }).expect(404)
    await request(app).delete(`/api/assets/${asset.id}`).expect(404)
    expect((await request(app).get('/api/assets')).body.meta.total).toBe(0)
  })

  it('combines filters before counting and paginating, with inclusive spatial edges', async () => {
    const ids: string[] = []
    for (const [lat, lng] of [[40, -75], [41, -72], [42, -70]]) {
      const result = await request(app).post('/api/assets').send({ ...input, lat, lng }).expect(201)
      ids.push(result.body.id)
    }
    for (const patch of [{ type: 'pipe' }, { status: 'ok' }, { lat: 39 }, { lng: -69 }]) {
      await request(app).post('/api/assets').send({ ...input, ...patch }).expect(201)
    }
    const query = { type: 'sensor', status: 'warning', minLat: 40, maxLat: 42, minLng: -75, maxLng: -70, limit: 2 }
    const first: AssetPage = (await request(app).get('/api/assets').query(query).expect(200)).body
    const second: AssetPage = (await request(app).get('/api/assets').query({ ...query, offset: 2 }).expect(200)).body
    expect(first.meta).toEqual({ total: 3, limit: 2, offset: 0 })
    expect(second.meta).toEqual({ total: 3, limit: 2, offset: 2 })
    expect([...first.data, ...second.data].map((asset) => asset.id)).toEqual(ids.sort())
    const points: MapAssetPage = (await request(app).get('/api/assets/map').query({ ...query, limit: 100 }).expect(200)).body
    expect(points.meta.total).toBe(3)
    expect(points.data.map((point) => point.id)).toEqual(ids)
    expect(Object.keys(points.data[0]!).sort()).toEqual(['id', 'lat', 'lng', 'name', 'status', 'type'])
  })

  it('queries both sides of the antimeridian in PostgreSQL', async () => {
    for (const lng of [-180, -179, 0, 179, 180]) {
      await request(app).post('/api/assets').send({ ...input, lng }).expect(201)
    }
    const page: AssetPage = (await request(app).get('/api/assets').query({ minLat: 39, maxLat: 41, minLng: 170, maxLng: 190 }).expect(200)).body
    expect(page.meta.total).toBe(4)
    expect(page.data.map((asset) => asset.lng).sort((a, b) => a - b)).toEqual([-180, -179, 179, 180])
  })

  it.each(['0000-01-01', '2026-01-01T12:00:00+23:59'])('rejects unsupported date %s before SQL execution', async (date) => {
    await request(app).get('/api/assets').query({ installed_from: date }).expect(400)
    await request(app).post('/api/assets').send({ ...input, installed_at: date }).expect(400)
    const created = await request(app).post('/api/assets').send(input).expect(201)
    await request(app).patch(`/api/assets/${created.body.id}`).send({ installed_at: date }).expect(400)
    expect((await request(app).get('/api/assets')).body.meta.total).toBe(1)
  })
})
