import { readFile } from 'node:fs/promises'
import { assetSchema, createAssetInputSchema, toUtcTimestamp } from '@asset-tracker/shared'
import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './index.js'
import { assets, initializations } from './schema.js'

const INITIALIZATION_KEY = 'seed.json'

export async function initializeAssets() {
  return db.transaction(async (transaction) => {
    // Serialize first startup across API processes; released on commit or rollback.
    await transaction.execute(sql`select pg_advisory_xact_lock(731024, 1)`)
    const [completed] = await transaction.select().from(initializations)
      .where(eq(initializations.key, INITIALIZATION_KEY)).limit(1)
    if (completed) return 'already-initialized'

    const [existing] = await transaction.select({ id: assets.id }).from(assets).limit(1)
    if (!existing) {
      const contents = await readFile(new URL('../../../seed.json', import.meta.url), 'utf8')
      const seedAssets = z.array(assetSchema).parse(JSON.parse(contents)).map(({ id, ...input }) => ({
        id, ...createAssetInputSchema.parse(input),
        installed_at: toUtcTimestamp(input.installed_at),
        last_inspected_at: input.last_inspected_at === null ? null : toUtcTimestamp(input.last_inspected_at),
      }))
      if (seedAssets.length > 0) await transaction.insert(assets).values(seedAssets)
    }

    // Adopt pre-existing databases without overwriting their assets. Record even
    // an empty seed so deleting every asset never triggers another import.
    await transaction.insert(initializations).values({ key: INITIALIZATION_KEY })
    return existing ? 'adopted-existing' : 'seeded'
  })
}
