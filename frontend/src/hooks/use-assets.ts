import { useQuery } from '@tanstack/react-query'
import type { Asset } from '@asset-tracker/shared'
import { getAssets, type AssetFilterParams, type GetAssetsParams } from '@/lib/assets-api'

export const assetQueryKeys = {
  all: ['assets'] as const,
  list: (params: GetAssetsParams) => [...assetQueryKeys.all, 'list', params] as const,
  map: (params: AssetFilterParams) => [...assetQueryKeys.all, 'map', params] as const,
}

export function useMapAssets(filters: AssetFilterParams) {
  return useQuery({
    queryKey: assetQueryKeys.map(filters),
    queryFn: async ({ signal }) => {
      const assets: Asset[] = []
      let offset = 0
      // Fetch all matches while respecting the API's maximum page size.
      while (true) {
        const page = await getAssets({ ...filters, limit: 100, offset }, signal)
        assets.push(...page.data)
        offset += page.data.length
        if (offset >= page.meta.total || page.data.length === 0) return assets
      }
    },
  })
}

export function useAssets(params: GetAssetsParams) {
  return useQuery({
    queryKey: assetQueryKeys.list(params),
    queryFn: () => getAssets(params),
  })
}
