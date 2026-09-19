import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as schema from '../src/db/schema.js'

// The supplied URL is only an administrative connection. Never migrate, seed,
// truncate, or otherwise write to the database named by the caller.
export async function createTestDatabase(connectionString: string) {
  const name = `asset_tracker_test_${randomUUID().replaceAll('-', '')}`
  const admin = new Pool({ connectionString })
  const url = new URL(connectionString)
  url.pathname = `/${name}`
  const pool = new Pool({ connectionString: url.toString() })
  let created = false
  const close = async () => {
    await pool.end()
    try {
      // Pool.end() can resolve before PostgreSQL finishes closing its sockets.
      // A normal drop lets those sessions exit instead of terminating them.
      if (created) await admin.query(`DROP DATABASE "${name}"`)
    } finally {
      await admin.end()
    }
  }
  try {
    await admin.query(`CREATE DATABASE "${name}"`)
    created = true
    const db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: new URL('../drizzle', import.meta.url).pathname })
    return { url: url.toString(), pool, db, close }
  } catch (error) {
    await close()
    throw error
  }
}
