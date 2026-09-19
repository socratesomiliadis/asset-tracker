vi.mock('@/lib/map-runtime', () => ({}))
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetLocationPicker } from './asset-location-picker'

const { setLngLat, on } = vi.hoisted(() => ({ setLngLat: vi.fn(), on: vi.fn() }))
vi.mock('maplibre-gl', () => ({
  Map: class {
    addControl() {}
    on = on
    remove() {}
    getBounds() { return { contains: () => true } }
  },
  Marker: class {
    setLngLat(value: number[]) { setLngLat(value); return this }
    addTo() { return this }
    remove() {}
  },
  NavigationControl: class {},
}))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('never passes invalid typed coordinates to MapLibre and recovers when corrected', () => {
  const onLocationChange = vi.fn()
  const { rerender } = render(<AssetLocationPicker latitude={40} longitude={-70} onLocationChange={onLocationChange} />)
  expect(setLngLat).toHaveBeenLastCalledWith([-70, 40])
  setLngLat.mockClear()
  for (const [lat, lng] of [[91, 0], [-91, 0], [0, 181], [0, -181], [NaN, 0], [0, Infinity]]) {
    rerender(<AssetLocationPicker latitude={lat} longitude={lng} onLocationChange={onLocationChange} />)
  }
  expect(setLngLat).not.toHaveBeenCalled()
  rerender(<AssetLocationPicker latitude={41} longitude={-71} onLocationChange={onLocationChange} />)
  expect(setLngLat).toHaveBeenLastCalledWith([-71, 41])
})

it('normalizes map clicks on a wrapped copy of the world', () => {
  const onLocationChange = vi.fn()
  render(<AssetLocationPicker onLocationChange={onLocationChange} />)
  const click = on.mock.calls.find(([event]) => event === 'click')![1]
  click({ lngLat: { lat: 30, lng: 190, wrap: () => ({ lng: -170 }) } })
  expect(onLocationChange).toHaveBeenCalledWith({ lat: 30, lng: -170 })
})
