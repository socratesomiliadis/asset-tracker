import type { Asset, AssetStatus, AssetType } from '@asset-tracker/shared'

export type GetAssetsParams = {
  type?: AssetType
  status?: AssetStatus
  limit: number
  offset: number
}

export type AssetPage = {
  data: Asset[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export async function getAssets(params: GetAssetsParams): Promise<AssetPage> {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })

  if (params.type) query.set('type', params.type)
  if (params.status) query.set('status', params.status)

  const response = await fetch(`/api/assets?${query}`)

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string }
    } | null

    throw new Error(body?.error?.message ?? 'Failed to load assets')
  }

  return response.json() as Promise<AssetPage>
}
