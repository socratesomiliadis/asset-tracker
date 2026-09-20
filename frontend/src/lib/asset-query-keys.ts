import type { AssetFilterParams, GetAssetsParams } from './assets-api'

export const assetQueryKeys = {
  all: ['assets'] as const,
  lists: ['assets', 'list'] as const,
  maps: ['assets', 'map'] as const,
  list: (params: GetAssetsParams) => ['assets', 'list', params] as const,
  map: (params: AssetFilterParams) => ['assets', 'map', params] as const,
  detail: (id: string | undefined) => ['assets', 'detail', id] as const,
}
