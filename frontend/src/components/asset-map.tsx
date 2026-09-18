import type { Asset } from '@asset-tracker/shared'
import { LngLatBounds, Map, Marker, NavigationControl, Popup } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'
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
  const spansDateLine = west < -180 || east > 180

  return {
    minLat: Math.max(-90, bounds.getSouth()),
    maxLat: Math.min(90, bounds.getNorth()),
    minLng: spansDateLine ? -180 : west,
    maxLng: spansDateLine ? 180 : east,
  }
}

export function AssetMap({
  assets,
  selectedAssetId,
  hasActiveAreaSearch,
  onSelectAsset,
  onSearchArea,
}: AssetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [showSearchArea, setShowSearchArea] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new Map({
      container,
      center: [-98.5, 39.5],
      zoom: 3,
      style: {
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
      },
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

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    if (assets.length === 0) return

    const bounds = new LngLatBounds()

    markersRef.current = assets.map((asset) => {
      const isSelected = asset.id === selectedAssetId
      const element = document.createElement('button')
      element.type = 'button'
      element.title = asset.name
      element.setAttribute('aria-label', `Select ${asset.name}`)
      element.style.width = isSelected ? '22px' : '16px'
      element.style.height = isSelected ? '22px' : '16px'
      element.style.borderRadius = '9999px'
      element.style.border = '3px solid white'
      element.style.backgroundColor = markerColors[asset.status]
      element.style.boxShadow = isSelected
        ? '0 0 0 3px rgba(15, 23, 42, 0.7)'
        : '0 1px 4px rgba(15, 23, 42, 0.4)'
      element.style.cursor = 'pointer'
      element.addEventListener('click', () => onSelectAsset(asset.id))

      bounds.extend([asset.lng, asset.lat])

      return new Marker({ element })
        .setLngLat([asset.lng, asset.lat])
        .setPopup(
          new Popup({ closeButton: false, offset: 12 }).setText(
            `${asset.name} · ${asset.status}`,
          ),
        )
        .addTo(map)
    })

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
  }, [assets, hasActiveAreaSearch, onSelectAsset, selectedAssetId])

  const searchCurrentArea = () => {
    const map = mapRef.current
    if (!map) return

    onSearchArea(getSearchBounds(map))
    setShowSearchArea(false)
  }

  return (
    <div className="relative h-full min-h-[32rem] overflow-hidden rounded-lg">
      <div ref={containerRef} className="h-full w-full" aria-label="Asset map" />

      <div className="absolute top-3 left-3 flex gap-2 rounded-lg border bg-background/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        {Object.entries(markerColors).map(([status, color]) => (
          <span className="flex items-center gap-1.5 capitalize" key={status}>
            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
            {status}
          </span>
        ))}
      </div>

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
