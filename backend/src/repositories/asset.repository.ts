import type {
  Asset,
  AssetQueryParams,
  CreateAssetInput,
  UpdateAssetInput,
} from '@asset-tracker/shared'
import {
  and,
  asc,
  count as countRows,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
} from 'drizzle-orm'
import { db } from '../db/index.js'
import { assets, type AssetRow } from '../db/schema.js'

function toAsset(row: AssetRow): Asset {
  return {
    ...row,
    installed_at: new Date(row.installed_at).toISOString(),
    last_inspected_at: row.last_inspected_at
      ? new Date(row.last_inspected_at).toISOString()
      : null,
  }
}

function getConditions(params: AssetQueryParams) {
  return [
    params.type ? eq(assets.type, params.type) : undefined,
    params.status ? eq(assets.status, params.status) : undefined,
    params.search
      ? or(
          ilike(assets.name, `%${params.search}%`),
          ilike(assets.notes, `%${params.search}%`),
        )
      : undefined,
    params.installed_from
      ? gte(assets.installed_at, params.installed_from)
      : undefined,
    params.installed_to ? lte(assets.installed_at, params.installed_to) : undefined,
    params.inspected_from
      ? gte(assets.last_inspected_at, params.inspected_from)
      : undefined,
    params.inspected_to
      ? lte(assets.last_inspected_at, params.inspected_to)
      : undefined,
    params.minLat !== undefined ? gte(assets.lat, params.minLat) : undefined,
    params.maxLat !== undefined ? lte(assets.lat, params.maxLat) : undefined,
    params.minLng !== undefined ? gte(assets.lng, params.minLng) : undefined,
    params.maxLng !== undefined ? lte(assets.lng, params.maxLng) : undefined,
  ]
}

export class AssetRepository {
  async findMany(params: AssetQueryParams = {}): Promise<Asset[]> {
    const sortColumns = {
      name: assets.name,
      type: assets.type,
      status: assets.status,
      installed_at: assets.installed_at,
      last_inspected_at: assets.last_inspected_at,
    }
    const sortColumn = params.sort_by
      ? sortColumns[params.sort_by]
      : assets.installed_at
    const sortDirection = params.sort_order === 'asc' ? asc : desc

    const rows = await db
      .select()
      .from(assets)
      .where(and(...getConditions(params)))
      .orderBy(sortDirection(sortColumn), asc(assets.id))
      .limit(params.limit ?? 50)
      .offset(params.offset ?? 0)

    return rows.map(toAsset)
  }

  async count(params: AssetQueryParams = {}): Promise<number> {
    const [result] = await db
      .select({ total: countRows() })
      .from(assets)
      .where(and(...getConditions(params)))

    return result?.total ?? 0
  }

  async findById(id: string): Promise<Asset | null> {
    const [row] = await db.select().from(assets).where(eq(assets.id, id)).limit(1)
    return row ? toAsset(row) : null
  }

  async create(input: CreateAssetInput): Promise<Asset> {
    const [row] = await db.insert(assets).values(input).returning()

    if (!row) {
      throw new Error('Failed to create asset')
    }

    return toAsset(row)
  }

  async update(id: string, input: UpdateAssetInput): Promise<Asset | null> {
    const [row] = await db
      .update(assets)
      .set(input)
      .where(eq(assets.id, id))
      .returning()

    return row ? toAsset(row) : null
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await db
      .delete(assets)
      .where(eq(assets.id, id))
      .returning({ id: assets.id })

    return deleted.length > 0
  }
}

export const assetRepository = new AssetRepository()
