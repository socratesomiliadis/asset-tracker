import { useEffect, useRef, type RefObject } from 'react'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import type Supercluster from 'supercluster'
import { normalizeLongitudeBounds, type MapAsset, type AssetStatus } from '@asset-tracker/shared'
import { createAssetMarkerElement, createClusterMarkerElement } from '@/lib/asset-markers'

export type ClusterCounts = { warning: number; critical: number }
export type ClusterPreview = { anchor: HTMLElement; total: number; counts: Record<AssetStatus, number> }
type MarkerEntry = { marker: Marker; element: HTMLElement; signature: string }

export function useMapMarkers({ mapRef, clusters, selectedAssetId, onSelectAsset,
  showPreview, dismissPreview, schedulePreviewClose }: {
  mapRef: RefObject<MapLibreMap | null>
  clusters: Supercluster<MapAsset, ClusterCounts>
  selectedAssetId?: string
  onSelectAsset: (id: string) => void
  showPreview: (preview: ClusterPreview) => void
  dismissPreview: () => void
  schedulePreviewClose: () => void
}) {
  const markers = useRef(new Map<string, MarkerEntry>())

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const upsert = (key: string, signature: string, coordinates: [number, number], build: () => HTMLElement) => {
      let entry = markers.current.get(key)
      if (!entry) {
        const element = build()
        entry = { element, signature, marker: new Marker({ element }).setLngLat(coordinates).addTo(map) }
        markers.current.set(key, entry)
      } else {
        entry.marker.setLngLat(coordinates)
        if (entry.signature !== signature) {
          const updated = build()
          // Preserve the button, focus, MapLibre classes, position, and handlers.
          for (const attribute of Array.from(updated.attributes)) {
            if (attribute.name !== 'style' && attribute.name !== 'class') {
              entry.element.setAttribute(attribute.name, attribute.value)
            }
          }
          for (const property of Array.from(updated.style)) {
            entry.element.style.setProperty(property, updated.style.getPropertyValue(property))
          }
          entry.element.replaceChildren(...Array.from(updated.childNodes))
          entry.signature = signature
        }
      }
      return entry.element
    }

    const renderMarkers = () => {
      dismissPreview()
      const bounds = map.getBounds()
      const { minLng, maxLng } = normalizeLongitudeBounds(bounds.getWest(), bounds.getEast())
      const visible = new Set<string>()
      const features = clusters.getClusters([
        minLng, Math.max(-90, bounds.getSouth()), maxLng, Math.min(90, bounds.getNorth()),
      ], Math.floor(map.getZoom()))
      for (const feature of features) {
        const coordinates = feature.geometry.coordinates as [number, number]
        const properties = feature.properties
        if ('cluster' in properties && properties.cluster) {
          const key = `cluster:${properties.cluster_id}`
          visible.add(key)
          const counts = {
            ok: properties.point_count - properties.warning - properties.critical,
            warning: properties.warning, critical: properties.critical,
          }
          const element = upsert(key, JSON.stringify(counts), coordinates,
            () => createClusterMarkerElement(properties.point_count, counts))
          const preview = () => showPreview({ anchor: element, total: properties.point_count, counts })
          element.onmouseenter = preview
          element.onfocus = preview
          element.onmouseleave = schedulePreviewClose
          element.onblur = schedulePreviewClose
          // Refresh the closure even when an index rebuild reuses a cluster ID.
          element.onclick = () => {
            dismissPreview()
            map.easeTo({ center: coordinates, zoom: clusters.getClusterExpansionZoom(properties.cluster_id), duration: 500 })
          }
        } else {
          const asset = properties as MapAsset
          const key = `asset:${asset.id}`
          visible.add(key)
          const selected = asset.id === selectedAssetId
          const element = upsert(key, JSON.stringify([asset.name, asset.type, asset.status, selected]), coordinates,
            () => createAssetMarkerElement(asset, selected))
          element.onclick = () => onSelectAsset(asset.id)
        }
      }
      for (const [key, entry] of markers.current) {
        if (!visible.has(key)) {
          entry.marker.remove()
          markers.current.delete(key)
        }
      }
    }
    renderMarkers()
    map.on('moveend', renderMarkers)
    map.on('movestart', dismissPreview)
    return () => {
      map.off('moveend', renderMarkers)
      map.off('movestart', dismissPreview)
    }
  }, [mapRef, clusters, selectedAssetId, onSelectAsset, showPreview, dismissPreview, schedulePreviewClose])

  useEffect(() => {
    const entries = markers.current
    return () => {
      entries.forEach(({ marker }) => marker.remove())
      entries.clear()
    }
  }, [])
}
