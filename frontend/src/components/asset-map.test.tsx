import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetMap } from './asset-map'

const map = vi.hoisted(() => ({ west: 170, east: 190, on: vi.fn() }))
vi.mock('maplibre-gl', () => ({
  Map: class {
    addControl() {}
    on = map.on
    remove() {}
    resize() {}
    getBounds() {
      return { getWest: () => map.west, getEast: () => map.east, getSouth: () => -95, getNorth: () => 95 }
    }
  },
  NavigationControl: class {},
  LngLatBounds: class {},
  Marker: class {},
  Popup: class {},
}))

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
    onRetry={vi.fn()} onClearArea={vi.fn()} onSelectAsset={vi.fn()} onSearchArea={onSearchArea} />)
  const move = map.on.mock.calls.find(([event]) => event === 'moveend')![1]
  act(() => move({}))
  fireEvent.click(screen.getByRole('button', { name: 'Search this area' }))
  expect(onSearchArea).toHaveBeenCalledExactlyOnceWith({ minLat: -90, maxLat: 90, minLng, maxLng })
})
