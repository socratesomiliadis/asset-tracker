import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Asset } from '@asset-tracker/shared'
import { getAssets } from '@/lib/assets-api'
import { AssetsPage } from './assets.page'

vi.mock('@/lib/assets-api', () => ({ getAssets: vi.fn() }))
vi.mock('@/components/asset-map', () => ({
  AssetMap: ({ assets, onSearchArea, onClearArea, hasActiveAreaSearch, isError }: any) => <div>
    <span>{isError ? 'Map unavailable' : `Map assets: ${assets.length}`}</span>
    <button onClick={() => onSearchArea({ minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 })}>Search area</button>
    {hasActiveAreaSearch && <button onClick={onClearArea}>Clear area</button>}
  </div>,
}))
vi.mock('@/components/asset-details', () => ({
  AssetDetails: ({ asset, onDelete, onEdit }: any) => asset && <div>
    <span>Details: {asset.name}</span>
    <button onClick={() => onDelete(asset)}>Delete selected</button>
    <button onClick={() => onEdit(asset)}>Edit selected</button>
  </div>,
}))
vi.mock('@/components/delete-asset-dialog', () => ({
  DeleteAssetDialog: ({ asset, onDeleted }: any) => asset && <button onClick={onDeleted}>Confirm deletion</button>,
}))
vi.mock('@/components/edit-asset-drawer', () => ({
  EditAssetDrawer: ({ asset, onUpdated }: any) => asset && <button onClick={() => onUpdated({ ...asset, lat: 40 })}>Finish edit</button>,
}))
vi.mock('@/components/create-asset-drawer', () => ({
  CreateAssetDrawer: ({ open, onCreated }: any) => open && <button onClick={() => onCreated({})}>Finish creation</button>,
}))
vi.mock('@/components/asset-filters', () => ({
  AssetFilters: ({ onTypeChange }: any) => <button onClick={() => onTypeChange('sensor')}>Filter sensors</button>,
}))

const asset: Asset = { id: 'a', name: 'Test asset', type: 'pipe', status: 'ok', lat: 40, lng: -70, installed_at: '2026-01-01', last_inspected_at: null, notes: '' }
let client: QueryClient
let rows: Asset[]
beforeEach(() => {
  rows = Array.from({ length: 26 }, (_, i) => ({ ...asset, id: String(i), name: `Asset ${i}` }))
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.mocked(getAssets).mockImplementation(async (params) => {
    const filtered = rows.filter((item) => (!params.type || item.type === params.type) && (params.minLat === undefined || item.lat <= params.maxLat!))
    return { data: filtered.slice(params.offset, params.offset + params.limit), meta: { total: filtered.length, offset: params.offset, limit: params.limit } }
  })
})
afterEach(() => { cleanup(); client.clear(); vi.clearAllMocks() })
function mount() { render(<QueryClientProvider client={client}><AssetsPage /></QueryClientProvider>) }

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
  await waitFor(() => expect(vi.mocked(getAssets).mock.lastCall?.[0]).toMatchObject({ offset: 0, type: undefined }))
})

it('shows API failure in both views and recovers on retry', async () => {
  vi.mocked(getAssets).mockRejectedValueOnce(new Error('API unavailable'))
  mount()
  await screen.findByText('Assets could not be loaded')
  expect(screen.getByText('Map unavailable')).toBeTruthy()
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
