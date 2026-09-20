import { QueryClient } from '@tanstack/react-query'
import { afterEach, expect, it } from 'vitest'
import type { Asset } from '@asset-tracker/shared'
import { assetSaved, assetDeleted } from './asset-cache'
import { assetQueryKeys as keys } from './asset-query-keys'

const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
const asset: Asset = { id: 'saved', name: 'Sensor', type: 'sensor', status: 'ok', lat: 40, lng: -70,
  installed_at: '2026-01-01', last_inspected_at: null, notes: 'New notes' }
afterEach(() => client.clear())

it('cancels an older detail read, caches the saved asset, and invalidates all collection variants', async () => {
  const detailKey = keys.detail(asset.id)
  let resolveOldRead!: (asset: Asset) => void
  const oldRead = new Promise<Asset>((resolve) => { resolveOldRead = resolve })
  const reading = client.fetchQuery({ queryKey: detailKey, queryFn: () => oldRead }).catch(() => undefined)
  const collections = [keys.list({ limit: 25, offset: 0 }), keys.list({ limit: 25, offset: 25, type: 'pipe' }), keys.map({}), keys.map({ status: 'critical' })]
  for (const key of collections) client.setQueryData(key, [])
  client.setQueryData(keys.detail('unrelated'), { ...asset, id: 'unrelated' })

  await assetSaved(client, asset)
  resolveOldRead({ ...asset, notes: 'Old notes' })
  await reading
  expect(client.getQueryData(detailKey)).toEqual(asset)
  for (const key of collections) expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  expect(client.getQueryState(keys.detail('unrelated'))?.isInvalidated).toBe(false)
})

it('removes deleted details and invalidates lists and maps without touching other details', async () => {
  client.setQueryData(keys.detail(asset.id), asset)
  client.setQueryData(keys.detail('other'), { ...asset, id: 'other' })
  client.setQueryData(keys.map({}), [])
  await assetDeleted(client, asset.id)
  expect(client.getQueryData(keys.detail(asset.id))).toBeUndefined()
  expect(client.getQueryData(keys.detail('other'))).toBeTruthy()
  expect(client.getQueryState(keys.map({}))?.isInvalidated).toBe(true)
})
