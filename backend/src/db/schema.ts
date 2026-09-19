import { ASSET_TYPES, ASSET_STATUSES } from '@asset-tracker/shared'
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const assetTypeEnum = pgEnum('asset_type', ASSET_TYPES)

export const assetStatusEnum = pgEnum('asset_status', ASSET_STATUSES)

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    type: assetTypeEnum('type').notNull(),
    status: assetStatusEnum('status').notNull(),
    lat: numeric('lat', { precision: 9, scale: 6, mode: 'number' }).notNull(),
    lng: numeric('lng', { precision: 10, scale: 6, mode: 'number' }).notNull(),
    installed_at: timestamp('installed_at', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    last_inspected_at: timestamp('last_inspected_at', {
      withTimezone: true,
      mode: 'string',
    }),
    notes: text('notes').notNull(),
  },
  (table) => [
    check('assets_lat_range', sql`${table.lat} between -90 and 90`),
    check('assets_lng_range', sql`${table.lng} between -180 and 180`),
    check(
      'assets_inspection_after_installation',
      sql`${table.last_inspected_at} is null or ${table.last_inspected_at} >= ${table.installed_at}`,
    ),
    index('assets_type_idx').on(table.type),
    index('assets_status_idx').on(table.status),
    index('assets_installed_at_idx').on(table.installed_at),
  ],
)

export type AssetRow = typeof assets.$inferSelect
