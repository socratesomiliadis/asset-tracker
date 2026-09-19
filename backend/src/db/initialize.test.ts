import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as schema from './schema.js'

const state = vi.hoisted(() => ({ db: undefined as unknown as NodePgDatabase<typeof schema> }))
vi.mock('./index.js', () => ({ get db() { return state.db } }))
vi.mock('node:fs/promises', async (original) => ({
  ...await original<typeof import('node:fs/promises')>(), readFile: vi.fn(),
}))
import { initializeAssets } from './initialize.js'

// Opt in with a PostgreSQL URL whose user can create databases. Never use its
// existing tables: each run migrates and later drops a uniquely named database.
describe.skipIf(!process.env.TEST_DATABASE_URL)('startup initialization (PostgreSQL)', () => {
  const databaseName = `asset_tracker_test_${randomUUID().replaceAll('-', '')}`
  let admin: Pool
  let pool: Pool
  const seed = [{
    id: randomUUID(), name: 'Seed asset', type: 'sensor', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-01', last_inspected_at: null, notes: '',
  }, {
    id: randomUUID(), name: 'Second asset', type: 'pipe', status: 'warning', lat: 41, lng: -71,
    installed_at: '2026-01-01', last_inspected_at: null, notes: '',
  }]

  beforeAll(async () => {
    admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL })
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    const url = new URL(process.env.TEST_DATABASE_URL!)
    url.pathname = `/${databaseName}`
    pool = new Pool({ connectionString: url.toString() })
    state.db = drizzle(pool, { schema })
    await migrate(state.db, { migrationsFolder: new URL('../../drizzle', import.meta.url).pathname })
  })

  afterAll(async () => {
    await pool?.end()
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
      await admin.end()
    }
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE assets, initializations')
    vi.mocked(readFile).mockReset().mockResolvedValue(JSON.stringify(seed))
  })

  it('imports seed.json and records completion exactly once', async () => {
    expect(await initializeAssets()).toBe('seeded')
    expect(await state.db.select().from(schema.assets)).toHaveLength(2)
    const records = await state.db.select().from(schema.initializations)
    expect(records).toEqual([{ key: 'seed.json', completed_at: expect.any(Date) }])
    expect(await initializeAssets()).toBe('already-initialized')
    expect(readFile).toHaveBeenCalledTimes(1)
    expect(vi.mocked(readFile).mock.calls[0]?.[0]).toEqual(new URL('../../../seed.json', import.meta.url))
  })

  it('preserves edits and deletions, including deletion of every asset', async () => {
    await initializeAssets()
    await pool.query('UPDATE assets SET notes = $1 WHERE id = $2', ['Edited', seed[0]!.id])
    await pool.query('DELETE FROM assets WHERE id = $1', [seed[1]!.id])
    vi.mocked(readFile).mockRejectedValue(new Error('Seed file unavailable on restart'))
    await initializeAssets()
    expect(await state.db.select().from(schema.assets)).toMatchObject([{ id: seed[0]!.id, notes: 'Edited' }])
    await pool.query('DELETE FROM assets')
    expect(await initializeAssets()).toBe('already-initialized')
    expect(await state.db.select().from(schema.assets)).toEqual([])
    expect(readFile).toHaveBeenCalledTimes(1)
  })

  it('adopts existing data without reading or overwriting the seed', async () => {
    await state.db.insert(schema.assets).values({ ...seed[0]!, type: 'sensor', status: 'ok', notes: 'Existing edit' })
    expect(await initializeAssets()).toBe('adopted-existing')
    expect(readFile).not.toHaveBeenCalled()
    expect(await state.db.select().from(schema.assets)).toMatchObject([{ notes: 'Existing edit' }])
    await pool.query('DELETE FROM assets')
    expect(await initializeAssets()).toBe('already-initialized')
  })

  it('records a successful empty seed', async () => {
    vi.mocked(readFile).mockResolvedValue('[]')
    expect(await initializeAssets()).toBe('seeded')
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(seed))
    expect(await initializeAssets()).toBe('already-initialized')
    expect(await state.db.select().from(schema.assets)).toEqual([])
  })

  it.each(['invalid JSON', JSON.stringify([{ ...seed[0], last_inspected_at: '2025-01-01' }])])('does not mark invalid input as initialized: %s', async (contents) => {
    vi.mocked(readFile).mockResolvedValue(contents)
    await expect(initializeAssets()).rejects.toThrow()
    expect(await state.db.select().from(schema.initializations)).toEqual([])
    expect(await state.db.select().from(schema.assets)).toEqual([])
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(seed))
    expect(await initializeAssets()).toBe('seeded')
  })

  it('rolls back asset inserts when recording completion fails and permits retry', async () => {
    await pool.query("ALTER TABLE initializations ADD CONSTRAINT fail_record CHECK (key <> 'seed.json')")
    try {
      await expect(initializeAssets()).rejects.toThrow()
      expect(await state.db.select().from(schema.assets)).toEqual([])
      expect(await state.db.select().from(schema.initializations)).toEqual([])
    } finally {
      await pool.query('ALTER TABLE initializations DROP CONSTRAINT fail_record')
    }
    expect(await initializeAssets()).toBe('seeded')
  })

  it('serializes concurrent startup attempts', async () => {
    expect((await Promise.all([initializeAssets(), initializeAssets()])).sort())
      .toEqual(['already-initialized', 'seeded'])
    expect(readFile).toHaveBeenCalledTimes(1)
    expect(await state.db.select().from(schema.assets)).toHaveLength(2)
    expect(await state.db.select().from(schema.initializations)).toHaveLength(1)
  })
})
