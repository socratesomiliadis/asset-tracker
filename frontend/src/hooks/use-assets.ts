import { useQuery } from '@tanstack/react-query'
import type { MapAsset } from '@asset-tracker/shared'
import { getAssets, getMapAssets, getAsset, type AssetFilterParams, type GetAssetsParams } from '@/lib/assets-api'

import { assetQueryKeys } from '@/lib/asset-query-keys'

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: assetQueryKeys.detail(id),
    queryFn: ({ signal }) => getAsset(id!, signal),
    enabled: Boolean(id),
  })
}

export function useMapAssets(filters: AssetFilterParams) {
  return useQuery({
    queryKey: assetQueryKeys.map(filters),
    queryFn: async ({ signal }) => {
      const assets = new Map<string, MapAsset>()
      let offset = 0
      // Fetch all matches while respecting the API's maximum page size.
      while (true) {
        const page = await getMapAssets({ ...filters, limit: 100, offset }, signal)
        for (const asset of page.data) assets.set(asset.id, asset)
        offset += page.data.length
        if (offset >= page.meta.total || page.data.length === 0) return [...assets.values()]
      }
    },
  })
}

export function useAssets(params: GetAssetsParams) {
  return useQuery({
    queryKey: assetQueryKeys.list(params),
    queryFn: ({ signal }) => getAssets(params, signal),
  })
}
