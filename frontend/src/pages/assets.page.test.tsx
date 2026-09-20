import type { AssetFilters } from '@/components/asset-filters'
import type { CreateAssetDrawer } from '@/components/create-asset-drawer'
import type { EditAssetDrawer } from '@/components/edit-asset-drawer'
import type { DeleteAssetDialog } from '@/components/delete-asset-dialog'
import type { AssetDetails } from '@/components/asset-details'
import type { AssetMap } from '@/components/asset-map'
import type { ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Asset } from '@asset-tracker/shared'
import { getAssets, getMapAssets, getAsset } from '@/lib/assets-api'
import { AssetsPage } from './assets.page'

vi.mock('@/lib/assets-api', () => ({ getAssets: vi.fn(), getMapAssets: vi.fn(), getAsset: vi.fn() }))
vi.mock('@/components/asset-map', () => ({
  AssetMap: ({ assets, onSelectAsset, onSearchArea, isError, onRetry }: ComponentProps<typeof AssetMap>) => <div>
    <span>{isError ? 'Map unavailable' : `Map assets: ${assets.length}`}</span>
    {assets.map((asset) => <button key={asset.id} onClick={() => onSelectAsset(asset.id)}>Marker {asset.name}</button>)}
    {isError && <button onClick={onRetry}>Retry map</button>}
    <button onClick={() => onSearchArea({ minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 })}>Search area</button>
  </div>,
}))
vi.mock('@/components/asset-details', () => ({
  AssetDetails: ({ asset, onDelete, onEdit }: ComponentProps<typeof AssetDetails>) => asset && <div>
    <span>Details: {asset.name}</span>
    <button onClick={() => onDelete(asset)}>Delete selected</button>
    <button onClick={() => onEdit(asset)}>Edit selected</button>
  </div>,
}))
vi.mock('@/components/delete-asset-dialog', () => ({
  DeleteAssetDialog: ({ asset, onDeleted }: ComponentProps<typeof DeleteAssetDialog>) => asset && <button onClick={onDeleted}>Confirm deletion</button>,
}))
vi.mock('@/components/edit-asset-drawer', () => ({
  EditAssetDrawer: ({ asset, onUpdated }: ComponentProps<typeof EditAssetDrawer>) => asset && <button onClick={() => onUpdated({ ...asset, lat: 40 })}>Finish edit</button>,
}))
vi.mock('@/components/create-asset-drawer', () => ({
  CreateAssetDrawer: ({ open, onCreated }: ComponentProps<typeof CreateAssetDrawer>) => open && <button onClick={() => { rows.push(asset); void client.invalidateQueries({ queryKey: ['assets'] }); onCreated(asset) }}>Finish creation</button>,
}))
vi.mock('@/components/asset-filters', () => ({
  AssetFilters: ({ onTypeChange, onStatusChange, onClearAllFilters, onClearArea, hasActiveAreaSearch, type, status }: ComponentProps<typeof AssetFilters>) => <>
    <button onClick={() => onTypeChange('sensor')}>Filter sensors</button>
    <button onClick={() => onStatusChange('warning')}>Filter warning</button>
    {hasActiveAreaSearch && <button onClick={onClearArea}>Clear area</button>}
    {(type !== 'all' || status !== 'all') && <button onClick={onClearAllFilters}>Clear all filters</button>}
  </>,
}))

const asset: Asset = { id: 'a', name: 'Test asset', type: 'pipe', status: 'ok', lat: 40, lng: -70, installed_at: '2026-01-01', last_inspected_at: null, notes: '' }
let client: QueryClient
let rows: Asset[]
beforeEach(() => {
  rows = Array.from({ length: 26 }, (_, i) => ({ ...asset, id: String(i), name: `Asset ${i}` }))
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(getMapAssets).mockImplementation((params, signal) => getAssets(params, signal))
  vi.mocked(getAsset).mockImplementation(async (id) => rows.find((row) => row.id === id)!)
  vi.mocked(getAssets).mockImplementation(async (params) => {
    const filtered = rows.filter((item) =>
      (!params.type || item.type === params.type) &&
      (!params.status || item.status === params.status) &&
      (params.minLat === undefined || (
        item.lat >= params.minLat && item.lat <= params.maxLat! &&
        item.lng >= params.minLng! && item.lng <= params.maxLng!
      )))
    return { data: filtered.slice(params.offset, params.offset + params.limit), meta: { total: filtered.length, offset: params.offset, limit: params.limit } }
  })
})
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks() })
function mount() { render(<QueryClientProvider client={client}><AssetsPage /></QueryClientProvider>) }

function expectResultsSummary(total: number, scope: string) {
  for (const name of ['Asset list', 'Asset map']) {
    const panel = within(screen.getByRole('region', { name }))
    expect(panel.getByText(`${total} matching ${total === 1 ? 'asset' : 'assets'}`)).toBeTruthy()
    expect(panel.getByText(scope)).toBeTruthy()
  }
}

it('clears type, status, area, pagination, and selection together', async () => {
  mount()
  await screen.findByText('Asset 0')
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  fireEvent.click(await screen.findByText('Asset 25'))
  expect(screen.getByText('Details: Asset 25')).toBeTruthy()
  fireEvent.click(screen.getByText('Filter sensors'))
  fireEvent.click(screen.getByText('Filter warning'))
  fireEvent.click(screen.getByText('Search area'))
  await screen.findByText('No assets match these filters.')
  expect(screen.getAllByText('No assets match these filters.')).toHaveLength(1)
  expect(screen.getAllByRole('button', { name: 'Clear all filters' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }))
  await screen.findByText('1–25 of 26')
  expect(screen.queryByText('Clear area')).toBeNull()
  expect(screen.queryByText('Details: Asset 25')).toBeNull()
  await waitFor(() => expect(vi.mocked(getAssets).mock.lastCall?.[0]).toMatchObject({
    type: undefined, status: undefined, offset: 0,
  }))
  expect(vi.mocked(getAssets).mock.lastCall?.[0].minLat).toBeUndefined()
  expect(vi.mocked(getAssets).mock.lastCall?.[0].maxLat).toBeUndefined()
  expect(vi.mocked(getAssets).mock.lastCall?.[0].minLng).toBeUndefined()
  expect(vi.mocked(getAssets).mock.lastCall?.[0].maxLng).toBeUndefined()
})

it('loads all map pages with bounded requests and selects assets outside the list page', async () => {
  rows = Array.from({ length: 205 }, (_, i) => ({ ...asset, id: String(i), name: `Asset ${i}` }))
  mount()
  await screen.findByText('Map assets: 205')
  expectResultsSummary(205, 'All locations')
  expect(screen.getByText('1–25 of 205')).toBeTruthy()
  expect(screen.queryByText('Asset 204')).toBeNull()
  expect(vi.mocked(getAssets).mock.calls.map(([params]) => [params.limit, params.offset]))
    .toEqual([[25, 0], [100, 0], [100, 100], [100, 200]])

  fireEvent.click(screen.getByText('Marker Asset 204'))
  expect(await screen.findByText('Details: Asset 204')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  await screen.findByText('26–50 of 205')
  expectResultsSummary(205, 'All locations')
  expect(screen.getByText('Map assets: 205')).toBeTruthy()
  expect(await screen.findByText('Details: Asset 204')).toBeTruthy()
  expect(vi.mocked(getAssets).mock.calls.filter(([params]) => params.limit === 100)).toHaveLength(3)
  fireEvent.click(screen.getByText('Edit selected'))
  fireEvent.click(screen.getByText('Finish edit'))
  expect(await screen.findByText('Details: Asset 204')).toBeTruthy()
})

it('applies type, status, and area filters to every map page and resets selection', async () => {
  rows = Array.from({ length: 102 }, (_, i) => ({
    ...asset, id: String(i), name: `Match ${i}`, type: 'sensor', status: 'warning', lat: 0.5, lng: 0.5,
  }))
  rows.push(
    { ...asset, id: 'wrong-type', lat: 0.5, lng: 0.5, status: 'warning' },
    { ...asset, id: 'wrong-status', type: 'sensor', lat: 0.5, lng: 0.5 },
    { ...asset, id: 'outside', type: 'sensor', status: 'warning' },
  )
  mount()
  await screen.findByText('Map assets: 105')
  fireEvent.click(screen.getByText('Filter sensors'))
  await screen.findByText('Map assets: 104')
  fireEvent.click(screen.getByText('Filter warning'))
  await screen.findByText('Map assets: 103')
  fireEvent.click(screen.getByText('Marker Match 101'))
  expect(await screen.findByText('Details: Match 101')).toBeTruthy()
  fireEvent.click(screen.getByText('Search area'))
  await screen.findByText('Map assets: 102')
  expectResultsSummary(102, 'Searched area')
  expect(screen.queryByText('Details: Match 101')).toBeNull()
  const areaRequests = vi.mocked(getAssets).mock.calls
    .map(([params]) => params).filter((params) => params.limit === 100 && params.minLat !== undefined)
  expect(areaRequests).toEqual([0, 100].map((offset) => ({
    type: 'sensor', status: 'warning', minLat: 0, maxLat: 1, minLng: 0, maxLng: 1, limit: 100, offset,
  })))
  fireEvent.click(screen.getByText('Clear area'))
  await screen.findByText('Map assets: 103')
  expectResultsSummary(103, 'All locations')
})

it('reports a failed later map page without presenting partial results and retries independently', async () => {
  rows = Array.from({ length: 101 }, (_, i) => ({ ...asset, id: String(i), name: `Asset ${i}` }))
  const getPage = vi.mocked(getAssets).getMockImplementation()!
  let failMap = true
  vi.mocked(getAssets).mockImplementation(async (params, signal) => {
    if (failMap && params.offset === 100) throw new Error('Map page unavailable')
    return getPage(params, signal)
  })
  mount()
  await screen.findByText('Map unavailable')
  expect(within(screen.getByRole('region', { name: 'Asset map' })).getByText('Assets unavailable')).toBeTruthy()
  expect(within(screen.getByRole('region', { name: 'Asset list' })).getByText('101 matching assets')).toBeTruthy()
  expect(screen.getByText('1–25 of 101')).toBeTruthy()
  expect(screen.queryByText('Marker Asset 0')).toBeNull()
  failMap = false
  fireEvent.click(screen.getByText('Retry map'))
  await screen.findByText('Map assets: 101')
  expect(vi.mocked(getAssets).mock.calls.filter(([params]) => params.limit === 25)).toHaveLength(1)
})

it('recovers an off-page detail request without losing the map selection', async () => {
  vi.mocked(getAsset).mockRejectedValueOnce(new Error('Details temporarily unavailable'))
  mount()
  fireEvent.click(await screen.findByText('Marker Asset 25'))
  await screen.findByText('Details temporarily unavailable')
  expect(screen.getByText('Map assets: 26')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Retry details' }))
  expect(await screen.findByText('Details: Asset 25')).toBeTruthy()
})

it('resets pagination and clears selection when a filter returns no matches', async () => {
  mount()
  await screen.findByText('Asset 0')
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  fireEvent.click(await screen.findByText('Asset 25'))
  expect(screen.getByText('Details: Asset 25')).toBeTruthy()
  fireEvent.click(screen.getByText('Filter sensors'))
  await screen.findByText('No assets match these filters.')
  expect(screen.queryByText('Details: Asset 25')).toBeNull()
  expect(screen.getByText('0–0 of 0')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Next page' }) as HTMLButtonElement).disabled).toBe(true)
})

it('recovers the previous page after its last asset is deleted and does not restore selection', async () => {
  mount()
  await screen.findByText('Asset 0')
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
  fireEvent.click(await screen.findByText('Asset 25'))
  fireEvent.click(screen.getByText('Delete selected'))
  rows.pop()
  fireEvent.click(screen.getByText('Confirm deletion'))
  await client.invalidateQueries({ queryKey: ['assets'] })
  await screen.findByText('1–25 of 25')
  expect(screen.queryByText('Details: Asset 25')).toBeNull()
})

it('clears map bounds and filters after creating an asset outside the area', async () => {
  mount()
  await screen.findByText('Asset 0')
  fireEvent.click(screen.getByText('Search area'))
  await screen.findByText('No assets match these filters.')
  fireEvent.click(screen.getByText('Filter sensors'))
  fireEvent.click(screen.getByRole('button', { name: 'Add Asset' }))
  fireEvent.click(screen.getByText('Finish creation'))
  await screen.findByText('Asset 0')
  expect(screen.queryByText('Clear area')).toBeNull()
  expect(await screen.findByText('Details: Test asset')).toBeTruthy()
  expect(await screen.findByText('Marker Test asset')).toBeTruthy()
  await waitFor(() => expect(vi.mocked(getAssets).mock.lastCall?.[0]).toMatchObject({ offset: 0, type: undefined }))
})

it('keeps the map available when the list fails and recovers on retry', async () => {
  vi.mocked(getAssets).mockRejectedValueOnce(new Error('API unavailable'))
  mount()
  await screen.findByText('Assets could not be loaded')
  expect(screen.queryByText('No assets match these filters.')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Clear all filters' })).toBeNull()
  expect(await screen.findByText('Map assets: 26')).toBeTruthy()
  expect(screen.getByText('Assets unavailable')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  await screen.findByText('Asset 0')
})

it('clears selection when an edited location leaves the searched area', async () => {
  rows = [{ ...asset, lat: 0.5, lng: 0.5 }]
  mount()
  await screen.findByText('Test asset')
  fireEvent.click(screen.getByText('Search area'))
  fireEvent.click(await screen.findByText('Test asset'))
  fireEvent.click(screen.getByText('Edit selected'))
  rows = [{ ...asset, lat: 40 }]
  await client.invalidateQueries({ queryKey: ['assets'] })
  await screen.findByText('No assets match these filters.')
  fireEvent.click(screen.getByText('Finish edit'))
  expect(screen.queryByText('Details: Test asset')).toBeNull()
  fireEvent.click(screen.getByText('Clear area'))
  await screen.findByText('Test asset')
  expect(screen.queryByText('Details: Test asset')).toBeNull()
})
