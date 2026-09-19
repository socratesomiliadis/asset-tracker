import { and, eq, gte, lte, or } from 'drizzle-orm'
import { assets } from '../db/schema.js'

export function longitudeCondition(west?: number, east?: number) {
  if (west === undefined || east === undefined) return undefined
  const interval = west > east
    ? or(gte(assets.lng, west), lte(assets.lng, east))
    : and(gte(assets.lng, west), lte(assets.lng, east))
  // Both stored representations of the antimeridian refer to the same meridian.
  return or(interval, west === -180 ? eq(assets.lng, 180) : undefined,
    east === 180 ? eq(assets.lng, -180) : undefined)
}
