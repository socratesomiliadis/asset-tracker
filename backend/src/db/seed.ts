import { readFile } from 'node:fs/promises'
import { assetSchema } from '@asset-tracker/shared'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, pool } from './index.js'
import { assets } from './schema.js'

async function seed() {
  const seedFile = new URL('../../../seed.json', import.meta.url)
  const contents = await readFile(seedFile, 'utf8')
  const seedAssets = z.array(assetSchema).parse(JSON.parse(contents))

  if (seedAssets.length === 0) {
    console.log('No assets found in seed.json')
    return
  }

  const seeded = await db
    .insert(assets)
    .values(seedAssets)
    .onConflictDoUpdate({
      target: assets.id,
      set: {
        name: sql`excluded.name`,
        type: sql`excluded.type`,
        status: sql`excluded.status`,
        lat: sql`excluded.lat`,
        lng: sql`excluded.lng`,
        installed_at: sql`excluded.installed_at`,
        last_inspected_at: sql`excluded.last_inspected_at`,
        notes: sql`excluded.notes`,
      },
    })
    .returning({ id: assets.id })

  console.log(`Seeded ${seeded.length} assets`)
}

seed()
  .catch((error: unknown) => {
    console.error('Database seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
