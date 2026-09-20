vi.mock('@/lib/map-runtime', () => ({}))
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AssetMap } from './asset-map'

const map = vi.hoisted(() => ({ west: 170, east: 190, zoom: 3, on: vi.fn(), off: vi.fn(), easeTo: vi.fn(), container: null as HTMLElement | null }))
vi.mock('maplibre-gl', () => ({
  Map: class {
    constructor({ container }: { container: HTMLElement }) { map.container = container }
    getZoom() { return map.zoom }
    easeTo = map.easeTo
    fitBounds() {}
    off = map.off
    addControl() {}
    on = map.on
    remove() {}
    resize() {}
    getBounds() {
      return { getWest: () => map.west, getEast: () => map.east, getSouth: () => -95, getNorth: () => 95 }
    }
  },
  NavigationControl: class {},
  LngLatBounds: class { extend() { return this } },
  Marker: class {
    element: HTMLElement
    constructor({ element }: { element: HTMLElement }) { this.element = element }
    setLngLat() { return this }
    setPopup() { return this }
    addTo() { map.container?.append(this.element); return this }
    remove() { this.element.remove() }
  },
  Popup: class { setText() { return this } },
}))

beforeEach(() => { map.west = -180; map.east = 180; map.zoom = 3; vi.stubGlobal('ResizeObserver', class { observe() {}; disconnect() {} }) })

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals() })

it.each([
  [170, 190, 170, -170],
  [-190, -170, 170, -170],
  [530, 550, 170, -170],
  [190, 200, -170, -160],
  [-180, 180, -180, 180],
  [180, 180, -180, -180],
])('searches normalized viewport %s to %s', (west, east, minLng, maxLng) => {
  map.west = west
  map.east = east
  vi.stubGlobal('ResizeObserver', class { observe() {}; disconnect() {} })
  const onSearchArea = vi.fn()
  render(<AssetMap assets={[]} hasActiveAreaSearch={false} isLoading={false} isError={false}
    onRetry={vi.fn()} onSelectAsset={vi.fn()} onSearchArea={onSearchArea} />)
  const move = map.on.mock.calls.find(([event]) => event === 'moveend')![1]
  act(() => move({}))
  expect(onSearchArea).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Search this area' }))
  expect(onSearchArea).toHaveBeenCalledExactlyOnceWith({ minLat: -90, maxLat: 90, minLng, maxLng })
  expect(screen.queryByRole('button', { name: 'Search this area' })).toBeNull()
})


const assets = ['ok', 'warning', 'critical'].map((status, index) => ({
  id: String(index), name: `Asset ${index}`, type: 'sensor' as const,
  status: status as 'ok' | 'warning' | 'critical', lat: 40 + index * 0.001, lng: -70,
  installed_at: '2026-01-01', last_inspected_at: null, notes: '',
}))
const props = { hasActiveAreaSearch: true, isLoading: false, isError: false,
  onRetry: vi.fn(), onSearchArea: vi.fn() }

it('offers area search after cluster navigation while ignoring automatic camera moves', () => {
  render(<AssetMap {...props} assets={assets} onSelectAsset={vi.fn()} />)
  const move = map.on.mock.calls.find(([event]) => event === 'moveend')![1]
  act(() => move({ isProgrammaticMove: true }))
  expect(screen.queryByRole('button', { name: 'Search this area' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: /^Expand cluster:/ }))
  const [, event] = map.easeTo.mock.lastCall!
  act(() => move(event ?? {}))
  expect(screen.getByRole('button', { name: 'Search this area' })).toBeTruthy()
  expect(props.onSearchArea).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Search this area' }))
  expect(props.onSearchArea).toHaveBeenCalledOnce()
  expect(screen.queryByRole('button', { name: 'Search this area' })).toBeNull()
})

it('renders only markers within the visible geographic bounds', () => {
  map.west = 10
  map.east = 20
  render(<AssetMap {...props} assets={assets} onSelectAsset={vi.fn()} />)
  expect(screen.queryByRole('button', { name: /Expand cluster|Select Asset/ })).toBeNull()
})

it('keeps empty maps unobstructed while retaining distinct API failure and retry feedback', () => {
  const onRetry = vi.fn()
  const { rerender } = render(<AssetMap {...props} assets={[]} onSelectAsset={vi.fn()} onRetry={onRetry} />)
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('button', { name: /Clear/ })).toBeNull()
  rerender(<AssetMap {...props} assets={[]} isError onSelectAsset={vi.fn()} onRetry={onRetry} />)
  expect(screen.getByText('Assets could not be loaded.')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(onRetry).toHaveBeenCalledOnce()
})

function zoomTo(zoom: number) {
  map.zoom = zoom
  const renderMarkers = map.on.mock.calls.filter(([event]) => event === 'moveend').at(-1)![1]
  act(() => renderMarkers({}))
}

it('shows a shadcn status popover on hover and focus without interfering with expansion', async () => {
  render(<AssetMap {...props} assets={assets} onSelectAsset={vi.fn()} />)
  const cluster = screen.getByRole('button', { name: 'Expand cluster: 3 assets; 1 OK; 1 Warning; 1 Critical' })
  expect(cluster.title).toBe('')
  fireEvent.mouseEnter(cluster)
  const preview = await screen.findByRole('dialog', { name: '3 assets' })
  expect(preview.getAttribute('data-slot')).toBe('popover-content')
  for (const label of ['OK', 'Warning', 'Critical']) expect(within(preview).getByText(label)).toBeTruthy()
  expect(within(preview).getAllByRole('definition').map((entry) => entry.textContent)).toEqual(['1', '1', '1'])
  fireEvent.mouseLeave(cluster)
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  fireEvent.focus(cluster)
  await screen.findByRole('dialog', { name: '3 assets' })
  fireEvent.click(cluster)
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(map.easeTo).toHaveBeenCalledWith(expect.objectContaining({ zoom: expect.any(Number) }))
})

it('counts mixed statuses and expands a cluster into selectable status-colored markers', () => {
  const onSelectAsset = vi.fn()
  const { rerender } = render(<AssetMap {...props} assets={assets} onSelectAsset={onSelectAsset} />)
  const cluster = screen.getByRole('button', { name: 'Expand cluster: 3 assets; 1 OK; 1 Warning; 1 Critical' })
  expect(cluster.textContent).toContain('3')
  expect(cluster.getAttribute('aria-label')).toContain('1 Warning; 1 Critical')
  expect(cluster.getAttribute('aria-label')).toContain('1 OK')
  const segments = cluster.querySelectorAll('circle')
  expect([...segments].map((segment) => segment.getAttribute('stroke'))).toEqual(['#10b981', '#f59e0b', '#ef4444'])
  for (const segment of segments) expect(Number(segment.getAttribute('stroke-dasharray')!.split(' ')[0])).toBeCloseTo(100 / 3)
  expect(screen.queryByRole('button', { name: 'Select Asset 0' })).toBeNull()
  fireEvent.click(cluster)
  expect(onSelectAsset).not.toHaveBeenCalled()
  const [camera, event] = map.easeTo.mock.lastCall!
  expect(camera.zoom).toBeGreaterThan(3)
  expect(event).toBeUndefined()
  zoomTo(camera.zoom)
  expect(screen.queryByRole('button', { name: 'Expand cluster: 3 assets; 1 OK; 1 Warning; 1 Critical' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Select Asset 2' })).toBeTruthy()
  zoomTo(16)
  expect(screen.queryByRole('button', { name: /Expand cluster/ })).toBeNull()
  for (const [index, color] of ['#10b981', '#f59e0b', '#ef4444'].entries()) {
    expect(screen.getByRole('button', { name: `Select Asset ${index}` }).style.backgroundColor).toBe(color)
  }
  fireEvent.click(screen.getByRole('button', { name: 'Select Asset 2' }))
  expect(onSelectAsset).toHaveBeenCalledExactlyOnceWith('2')
  rerender(<AssetMap {...props} assets={assets} selectedAssetId="2" onSelectAsset={onSelectAsset} />)
  expect(screen.getByRole('button', { name: 'Select Asset 2' }).getAttribute('aria-pressed')).toBe('true')
  expect(map.easeTo).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 16 }), { isProgrammaticMove: true })
})

it('refreshes counts and severity on asset changes, reclusters on zoom out, and clears removed assets', () => {
  const onSelectAsset = vi.fn()
  const { rerender, unmount } = render(<AssetMap {...props} assets={assets} onSelectAsset={onSelectAsset} />)
  const warningAssets = assets.slice(0, 2)
  rerender(<AssetMap {...props} assets={warningAssets} onSelectAsset={onSelectAsset} />)
  expect(screen.getByRole('button', { name: 'Expand cluster: 2 assets; 1 OK; 1 Warning; 0 Critical' }).querySelector('circle[data-status=warning]')?.getAttribute('stroke-dasharray')).toBe('50 50')
  const okAssets = warningAssets.map((asset) => ({ ...asset, status: 'ok' as const }))
  rerender(<AssetMap {...props} assets={okAssets} onSelectAsset={onSelectAsset} />)
  expect(screen.getByRole('button', { name: 'Expand cluster: 2 assets; 2 OK; 0 Warning; 0 Critical' }).querySelector('circle[data-status=ok]')?.getAttribute('stroke-dasharray')).toBe('100 0')
  zoomTo(16)
  expect(screen.getByRole('button', { name: 'Select Asset 0' })).toBeTruthy()
  zoomTo(3)
  expect(screen.getByRole('button', { name: /Expand cluster: 2 assets/ })).toBeTruthy()
  rerender(<AssetMap {...props} assets={[]} onSelectAsset={onSelectAsset} />)
  expect(screen.queryByRole('button', { name: /Expand cluster|Select Asset/ })).toBeNull()
  unmount()
  expect(map.off).toHaveBeenCalledWith('moveend', expect.any(Function))
})

it('identifies marker types and labels only the selected asset without opening a duplicate popup', () => {
  map.zoom = 16
  const typedAssets = (['sensor', 'hydrant', 'valve', 'pipe'] as const).map((type, index) => ({
    ...assets[0], id: String(index), name: `Test ${type}`, type,
  }))
  const { rerender } = render(<AssetMap {...props} assets={typedAssets} selectedAssetId="1" onSelectAsset={vi.fn()} />)
  for (const asset of typedAssets) {
    const marker = screen.getByRole('button', { name: `Select ${asset.name}` })
    expect(marker.querySelector('svg')?.getAttribute('data-asset-type')).toBe(asset.type)
    expect(marker.title).toContain('OK')
    expect(marker.querySelector('.asset-pin-label')?.textContent ?? null).toBe(asset.id === '1' ? asset.name : null)
  }
  rerender(<AssetMap {...props} assets={typedAssets} selectedAssetId="2" onSelectAsset={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Select Test hydrant' }).querySelector('.asset-pin-label')).toBeNull()
  expect(screen.getByRole('button', { name: 'Select Test valve' }).querySelector('.asset-pin-label')?.textContent).toBe('Test valve')
})
