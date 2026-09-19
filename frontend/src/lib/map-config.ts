import type { StyleSpecification } from 'maplibre-gl'

export const DEFAULT_MAP_CENTER: [number, number] = [-98.5, 39.5]
export const DEFAULT_MAP_ZOOM = 3

export function createMapStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      openStreetMap: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'openStreetMap',
        type: 'raster',
        source: 'openStreetMap',
      },
    ],
  }
}
