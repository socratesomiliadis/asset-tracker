import type { StyleSpecification } from 'maplibre-gl'
import positron from './map-style/positron.json'

export const DEFAULT_MAP_CENTER: [number, number] = [-98.5, 39.5]
export const DEFAULT_MAP_ZOOM = 3

// OpenFreeMap's Positron style, with a softer palette to foreground our assets.
// Upstream credits and licenses are retained alongside the style.
export function createMapStyle(): StyleSpecification {
  const style = structuredClone(positron) as StyleSpecification
  const fills: Record<string, string> = {
    water: '#b8dcef',
    park: '#dce9d2',
    landcover_wood: '#d5e5ce',
    landuse_residential: '#f0efeb',
    building: '#e5e3de',
  }
  for (const layer of style.layers) {
    if (layer.type === 'fill' && fills[layer.id]) {
      layer.paint = { ...layer.paint, 'fill-color': fills[layer.id] }
    }
    if (layer.type === 'background') layer.paint = { 'background-color': '#f7f6f2' }
  }
  return style
}
