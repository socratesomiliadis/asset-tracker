import { DatabaseSync } from 'node:sqlite'
import { and, eq, gte, lte } from 'drizzle-orm'
import { PgDialect } from 'drizzle-orm/pg-core'
import { expect, it } from 'vitest'
import { normalizeLongitudeBounds } from '@asset-tracker/shared'
import { assets } from '../db/schema.js'
import { longitudeCondition } from './longitude-condition.js'

// Execute the generated comparison predicate against boundary rows, without a server.
it.each([
  [170, 190, [-180, -179, -170, 170, 179, 180]],
  [-190, -170, [-180, -179, -170, 170, 179, 180]],
  [530, 550, [-180, -179, -170, 170, 179, 180]],
  [190, 200, [-170, -169]],
  [-10, 10, [0]],
  [170, 180, [-180, 170, 179, 180]],
  [-180, -170, [-180, -179, -170, 180]],
  [180, 180, [-180, 180]],
  [180, -180, [-180, 180]],
  [-180, 180, [-180, -179, -170, -169, 0, 169, 170, 179, 180]],
  [-200, 200, [-180, -179, -170, -169, 0, 169, 170, 179, 180]],
])('queries inclusive longitude bounds %s to %s while retaining other filters', (west, east, expected) => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('CREATE TABLE assets (lng REAL, lat REAL, type TEXT, status TEXT)')
    const insert = db.prepare('INSERT INTO assets VALUES (?, ?, ?, ?)')
    for (const lng of [-180, -179, -170, -169, 0, 169, 170, 179, 180]) {
      insert.run(lng, 10, 'sensor', 'warning')
      insert.run(lng, 21, 'sensor', 'warning')
      insert.run(lng, 10, 'pipe', 'warning')
      insert.run(lng, 10, 'sensor', 'ok')
    }
    const { minLng, maxLng } = normalizeLongitudeBounds(west, east)
    const condition = and(longitudeCondition(minLng, maxLng),
      gte(assets.lat, 10), lte(assets.lat, 20), eq(assets.type, 'sensor'), eq(assets.status, 'warning'))!
    const query = new PgDialect().sqlToQuery(condition)
    const rows = db.prepare(`SELECT lng FROM assets WHERE ${query.sql.replace(/\$\d+/g, '?')} ORDER BY lng`)
      .all(...query.params as (string | number)[])
    expect(rows.map((row) => row.lng)).toEqual(expected)
  } finally {
    db.close()
  }
})
