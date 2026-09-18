import type { Asset, AssetStatus, AssetType } from '@asset-tracker/shared'

export type AssetFilters = {
  type?: AssetType
  status?: AssetStatus
}

export type AssetPage = {
  data: Asset[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export async function getAssets(filters: AssetFilters): Promise<AssetPage> {
  const query = new URLSearchParams({ limit: '50', offset: '0' })

  if (filters.type) query.set('type', filters.type)
  if (filters.status) query.set('status', filters.status)

  const response = await fetch(`/api/assets?${query}`)

  if (!response.ok) {
    throw new Error('Failed to load assets')
  }

  return response.json() as Promise<AssetPage>
}
