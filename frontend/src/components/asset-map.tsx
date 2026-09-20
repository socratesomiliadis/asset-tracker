import '@/lib/map-runtime'
import { assetStatusLabels } from '@/lib/asset-labels'
import { createMapStyle, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/map-config'
import type { MapAsset, AssetStatus } from '@asset-tracker/shared'
import { normalizeLongitudeBounds } from '@asset-tracker/shared'
import { Map, NavigationControl } from 'maplibre-gl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Supercluster from 'supercluster'
import { markerColors } from '@/lib/asset-markers'
import { useMapCamera, programmaticMoveEvent } from '@/hooks/use-map-camera'
import { useMapMarkers, type ClusterPreview, type ClusterCounts } from '@/hooks/use-map-markers'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle } from '@/components/ui/popover'


type AssetMapProps = {
  assets: MapAsset[]
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
  const [showSearchArea, setShowSearchArea] = useState(false)
  const [clusterPreview, setClusterPreview] = useState<ClusterPreview>()
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
  const clusters = useMemo(() => new Supercluster<MapAsset, ClusterCounts>({
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
      map.remove()
      mapRef.current = null
    }
  }, [])

  const showPreview = useCallback((preview: ClusterPreview) => {
    keepPreviewOpen()
    setClusterPreview(preview)
  }, [keepPreviewOpen])
  useMapMarkers({ mapRef, clusters, selectedAssetId, onSelectAsset,
    showPreview, dismissPreview, schedulePreviewClose })

  useMapCamera(mapRef, assets, selectedAssetId, hasActiveAreaSearch)

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
