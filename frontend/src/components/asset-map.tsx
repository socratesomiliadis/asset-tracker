import { assetStatusLabels, assetTypeLabels } from '@/lib/asset-labels'
import { createMapStyle, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/map-config'
import type { Asset, AssetStatus } from '@asset-tracker/shared'
import { normalizeLongitudeBounds } from '@asset-tracker/shared'
import { LngLatBounds, Map, Marker, NavigationControl } from 'maplibre-gl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Supercluster from 'supercluster'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle } from '@/components/ui/popover'

const markerColors = {
  ok: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
} satisfies Record<Asset['status'], string>

// Simple type silhouettes remain readable at marker size.
const typePaths = {
  sensor: 'M12 11v2M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
  hydrant: 'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z',
  valve: 'M12 3 21 12 12 21 3 12Z M8 12h8M12 8v8',
  pipe: 'M3 6h10a5 5 0 0 1 5 5v10M3 12h8a1 1 0 0 1 1 1v8M3 4v10M10 21h10',
} satisfies Record<Asset['type'], string>

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
  const [clusterPreview, setClusterPreview] = useState<{
    anchor: HTMLElement
    total: number
    counts: Record<AssetStatus, number>
  }>()
  const previewCloseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const keepPreviewOpen = useCallback(() => clearTimeout(previewCloseTimer.current), [])
  const dismissPreview = useCallback(() => {
    clearTimeout(previewCloseTimer.current)
    setClusterPreview(undefined)
  }, [])
  const schedulePreviewClose = useCallback(() => {
    clearTimeout(previewCloseTimer.current)
    previewCloseTimer.current = setTimeout(() => setClusterPreview(undefined), 180)
  }, [])
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
      clearTimeout(previewCloseTimer.current)
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
      dismissPreview()
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
          const summary = `${properties.point_count} assets; ${counts.ok} ${assetStatusLabels.ok}; ${counts.warning} ${assetStatusLabels.warning}; ${counts.critical} ${assetStatusLabels.critical}`
          element.setAttribute('aria-label', `Expand cluster: ${summary}`)
          const showPreview = () => {
            keepPreviewOpen()
            setClusterPreview({ anchor: element, total: properties.point_count, counts })
          }
          element.addEventListener('mouseenter', showPreview)
          element.addEventListener('mouseleave', schedulePreviewClose)
          element.addEventListener('focus', showPreview)
          element.addEventListener('blur', schedulePreviewClose)
          element.className = 'asset-cluster flex items-center justify-center rounded-full bg-slate-900 text-white'
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
          element.addEventListener('click', () => {
            dismissPreview()
            map.easeTo({
            center: coordinates,
            zoom: clusters.getClusterExpansionZoom(properties.cluster_id),
            duration: 500,
            }, programmaticMoveEvent)
          })
          return new Marker({ element }).setLngLat(coordinates).addTo(map)
        }

        const asset = properties as Asset
        const isSelected = asset.id === selectedAssetId
        element.setAttribute('aria-label', `Select ${asset.name}`)
        element.setAttribute('aria-pressed', String(isSelected))
        element.className = 'asset-pin'
        element.style.backgroundColor = markerColors[asset.status]
        element.style.setProperty('--asset-color', markerColors[asset.status])
        element.dataset.selected = String(isSelected)
        element.title = `${asset.name} · ${assetTypeLabels[asset.type]} · ${assetStatusLabels[asset.status]}`
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
        icon.setAttribute('viewBox', '0 0 24 24')
        icon.setAttribute('aria-hidden', 'true')
        icon.setAttribute('data-asset-type', asset.type)
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', typePaths[asset.type])
        icon.append(path)
        element.append(icon)
        if (isSelected) {
          const label = document.createElement('span')
          label.className = 'asset-pin-label'
          label.textContent = asset.name
          element.append(label)
        }
        element.addEventListener('click', () => onSelectAsset(asset.id))
        return new Marker({ element }).setLngLat(coordinates)
          .addTo(map)
      })
    }
    renderMarkers()
    map.on('moveend', renderMarkers)
    map.on('movestart', dismissPreview)
    return () => {
      map.off('moveend', renderMarkers)
      map.off('movestart', dismissPreview)
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
    }
  }, [clusters, onSelectAsset, selectedAssetId, dismissPreview, keepPreviewOpen, schedulePreviewClose])

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
    <div className="asset-map relative h-full min-h-[32rem] overflow-hidden rounded-xl lg:min-h-0">
      <div ref={containerRef} className="h-full w-full" aria-label="Asset map" />

      <Popover open={Boolean(clusterPreview)} onOpenChange={(open) => { if (!open) dismissPreview() }}>
        <PopoverContent
          anchor={clusterPreview?.anchor}
          side="top"
          sideOffset={10}
          className="w-56 gap-3"
          initialFocus={false}
          finalFocus={false}
          onMouseEnter={keepPreviewOpen}
          onMouseLeave={schedulePreviewClose}
          onFocus={keepPreviewOpen}
          onBlur={schedulePreviewClose}
        >
          {clusterPreview && <>
            <PopoverHeader>
              <PopoverTitle>{clusterPreview.total} assets</PopoverTitle>
              <PopoverDescription className="text-xs">Click the cluster to zoom in.</PopoverDescription>
            </PopoverHeader>
            <dl className="space-y-2 border-t pt-3">
              {(['ok', 'warning', 'critical'] as const).map((status) => (
                <div key={status} className="flex items-center justify-between">
                  <dt className="flex items-center gap-2 text-sm">
                    <span className="size-2 rounded-full" style={{ backgroundColor: markerColors[status] }} />
                    {assetStatusLabels[status]}
                  </dt>
                  <dd className="text-sm font-medium tabular-nums">{clusterPreview.counts[status]}</dd>
                </div>
              ))}
            </dl>
          </>}
        </PopoverContent>
      </Popover>

      <div className="absolute bottom-7 left-3 flex gap-3 rounded-full border border-white/70 bg-white/90 px-3.5 py-2 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur-md">
        {Object.entries(markerColors).map(([status, color]) => (
          <span className="flex items-center gap-1.5" key={status}>
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {assetStatusLabels[status as AssetStatus]}
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
