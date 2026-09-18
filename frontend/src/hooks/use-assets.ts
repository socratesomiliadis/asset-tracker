import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getAssets, type GetAssetsParams } from '@/lib/assets-api'

export const assetQueryKeys = {
  all: ['assets'] as const,
  list: (params: GetAssetsParams) => [...assetQueryKeys.all, 'list', params] as const,
}

export function useAssets(params: GetAssetsParams) {
  return useQuery({
    queryKey: assetQueryKeys.list(params),
    queryFn: () => getAssets(params),
    placeholderData: keepPreviousData,
  })
}
