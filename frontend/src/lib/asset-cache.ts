import type { Asset } from '@asset-tracker/shared'
import type { QueryClient } from '@tanstack/react-query'
import { assetQueryKeys } from './asset-query-keys'

// Mutations own cache policy. Pages only decide which view to show next.
function refreshCollections(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: assetQueryKeys.lists }),
    client.invalidateQueries({ queryKey: assetQueryKeys.maps }),
  ])
}

export async function assetSaved(client: QueryClient, asset: Asset) {
  const queryKey = assetQueryKeys.detail(asset.id)
  // A read started before the write must not overwrite the mutation response.
  await client.cancelQueries({ queryKey, exact: true })
  client.setQueryData(queryKey, asset)
  await refreshCollections(client)
}

export async function assetDeleted(client: QueryClient, id: string) {
  const queryKey = assetQueryKeys.detail(id)
  await client.cancelQueries({ queryKey, exact: true })
  await refreshCollections(client)
  client.removeQueries({ queryKey, exact: true })
}
