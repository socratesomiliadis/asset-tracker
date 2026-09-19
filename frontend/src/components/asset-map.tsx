import { createMapStyle, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/map-config'
import type { Asset } from '@asset-tracker/shared'
import { normalizeLongitudeBounds } from '@asset-tracker/shared'
import { LngLatBounds, Map, Marker, NavigationControl, Popup } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import Supercluster from 'supercluster'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'

const markerColors = {
  ok: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
} satisfies Record<Asset['status'], string>

const programmaticMoveEvent = { isProgrammaticMove: true } as const

type AssetMapProps = {
  assets: Asset[]
  selectedAssetId?: string
  hasActiveAreaSearch: boolean
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onSelectAsset: (assetId: string) => void
  onSearchArea: (bounds: AssetMapBounds) => void
}

export type AssetMapBounds = {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

function getSearchBounds(map: Map): AssetMapBounds {
  const bounds = map.getBounds()
  const west = bounds.getWest()
  const east = bounds.getEast()

  return {
    minLat: Math.max(-90, bounds.getSouth()),
    maxLat: Math.min(90, bounds.getNorth()),
    ...normalizeLongitudeBounds(west, east),
  }
}

export function AssetMap({
  assets,
  selectedAssetId,
  hasActiveAreaSearch,
  isLoading,
  isError,
  onRetry,
  onSelectAsset,
  onSearchArea,
}: AssetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [showSearchArea, setShowSearchArea] = useState(false)
  const clusters = useMemo(() => new Supercluster<Asset, { warning: number; critical: number }>({
    radius: 60,
    maxZoom: 14,
    map: (asset) => ({ warning: Number(asset.status === 'warning'), critical: Number(asset.status === 'critical') }),
    reduce: (total, counts) => {
      total.warning += counts.warning
      total.critical += counts.critical
    },
  }).load(assets.map((asset) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [asset.lng, asset.lat] }, properties: asset,
  }))), [assets])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new Map({
      container,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      style: createMapStyle(),
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('moveend', (event) => {
      if ('isProgrammaticMove' in event) return
      setShowSearchArea(true)
    })

    const resizeObserver = new ResizeObserver(() =>
      map.resize(programmaticMoveEvent),
    )
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      markersRef.current.forEach((marker) => marker.remove())
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const renderMarkers = () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = clusters.getClusters([-180, -90, 180, 90], Math.floor(map.getZoom())).map((feature) => {
        const element = document.createElement('button')
        element.type = 'button'
        element.style.cursor = 'pointer'
        const coordinates = feature.geometry.coordinates as [number, number]
        const properties = feature.properties
        if ('cluster' in properties && properties.cluster) {
          const counts = {
            ok: properties.point_count - properties.warning - properties.critical,
            warning: properties.warning,
            critical: properties.critical,
          }
          const summary = `${properties.point_count} assets; ${counts.ok} OK; ${counts.warning} warning; ${counts.critical} critical`
          element.title = summary
          element.setAttribute('aria-label', `Expand cluster: ${summary}`)
          element.className = 'flex items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-shadow duration-150 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900'
          const size = properties.point_count >= 100 ? 56 : 48
          element.style.width = `${size}px`
          element.style.height = `${size}px`
          const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          ring.setAttribute('viewBox', '0 0 48 48')
          ring.setAttribute('aria-hidden', 'true')
          ring.setAttribute('class', 'absolute inset-0 size-full')
          let offset = 0
          for (const status of ['ok', 'warning', 'critical'] as const) {
            if (counts[status] === 0) continue
            const share = counts[status] / properties.point_count * 100
            const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
            segment.setAttribute('cx', '24')
            segment.setAttribute('cy', '24')
            segment.setAttribute('r', '20')
            segment.setAttribute('fill', 'none')
            segment.setAttribute('stroke', markerColors[status])
            segment.setAttribute('stroke-width', '5')
            segment.setAttribute('pathLength', '100')
            segment.setAttribute('stroke-dasharray', `${share} ${100 - share}`)
            segment.setAttribute('stroke-dashoffset', String(-offset))
            segment.setAttribute('transform', 'rotate(-90 24 24)')
            segment.setAttribute('data-status', status)
            ring.append(segment)
            offset += share
          }
          element.append(ring)
          const count = document.createElement('span')
          count.className = 'relative text-sm leading-none font-semibold tabular-nums'
          count.textContent = String(properties.point_count)
          element.append(count)
          element.addEventListener('click', () => map.easeTo({
            center: coordinates,
            zoom: clusters.getClusterExpansionZoom(properties.cluster_id),
            duration: 500,
          }, programmaticMoveEvent))
          return new Marker({ element }).setLngLat(coordinates).addTo(map)
        }

        const asset = properties as Asset
        const isSelected = asset.id === selectedAssetId
        element.title = `${asset.name} · ${asset.status}`
        element.setAttribute('aria-label', `Select ${asset.name}`)
        element.setAttribute('aria-pressed', String(isSelected))
        element.style.width = isSelected ? '22px' : '16px'
        element.style.height = isSelected ? '22px' : '16px'
        element.style.borderRadius = '9999px'
        element.style.border = '3px solid white'
        element.style.backgroundColor = markerColors[asset.status]
        element.style.boxShadow = isSelected
          ? '0 0 0 3px rgba(15, 23, 42, 0.7)'
          : '0 1px 4px rgba(15, 23, 42, 0.4)'
        element.addEventListener('click', () => onSelectAsset(asset.id))
        return new Marker({ element }).setLngLat(coordinates)
          .setPopup(new Popup({ closeButton: false, offset: 12 }).setText(`${asset.name} · ${asset.status}`))
          .addTo(map)
      })
    }
    renderMarkers()
    map.on('moveend', renderMarkers)
    return () => {
      map.off('moveend', renderMarkers)
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [clusters, onSelectAsset, selectedAssetId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || assets.length === 0) return
    const bounds = new LngLatBounds()
    assets.forEach((asset) => bounds.extend([asset.lng, asset.lat]))
    const selectedAsset = assets.find((asset) => asset.id === selectedAssetId)

    if (selectedAsset) {
      map.easeTo(
        {
          center: [selectedAsset.lng, selectedAsset.lat],
          zoom: 16,
          duration: 500,
        },
        programmaticMoveEvent,
      )
    } else if (!hasActiveAreaSearch) {
      map.fitBounds(
        bounds,
        {
          padding: 64,
          maxZoom: 13,
          duration: 500,
        },
        programmaticMoveEvent,
      )
    }
  }, [assets, hasActiveAreaSearch, selectedAssetId])

  const searchCurrentArea = () => {
    const map = mapRef.current
    if (!map) return

    onSearchArea(getSearchBounds(map))
    setShowSearchArea(false)
  }

  return (
    <div className="relative h-full min-h-[32rem] overflow-hidden rounded-lg lg:min-h-0">
      <div ref={containerRef} className="h-full w-full" aria-label="Asset map" />

      <div className="absolute top-3 left-3 flex gap-2 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        {Object.entries(markerColors).map(([status, color]) => (
          <span className="flex items-center gap-1.5 capitalize" key={status}>
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {status}
          </span>
        ))}
      </div>

      {(isLoading || isError) && (
        <div role="status" className="absolute bottom-14 left-1/2 -translate-x-1/2 rounded-lg border bg-background/95 p-4 text-center text-sm shadow-sm">
          {isError ? 'Assets could not be loaded.' : 'Loading assets…'}
          {isError && <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>Try again</Button>}
        </div>
      )}
      {showSearchArea && (
        <Button
          type="button"
          size="sm"
          className="absolute top-3 left-1/2 -translate-x-1/2 shadow-md"
          onClick={searchCurrentArea}
        >
          <Search data-icon="inline-start" />
          Search this area
        </Button>
      )}
    </div>
  )
}
