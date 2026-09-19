import { createMapStyle, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/map-config'
import { Map, Marker, NavigationControl } from 'maplibre-gl'
import { useEffect, useRef, useState } from 'react'

type AssetLocation = {
  lat: number
  lng: number
}

type AssetLocationPickerProps = {
  latitude?: number
  longitude?: number
  onLocationChange: (location: AssetLocation) => void
}

function getLocation(
  latitude: number | undefined,
  longitude: number | undefined,
): AssetLocation | null {
  if (
    latitude === undefined || longitude === undefined ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180
  ) return null

  return {
    lat: latitude,
    lng: longitude,
  }
}

export function AssetLocationPicker({
  latitude,
  longitude,
  onLocationChange,
}: AssetLocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const [initialLocation] = useState(() => getLocation(latitude, longitude))
  const location = getLocation(latitude, longitude)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const map = new Map({
      container,
      center: initialLocation
        ? [initialLocation.lng, initialLocation.lat]
        : DEFAULT_MAP_CENTER,
      zoom: initialLocation ? 14 : DEFAULT_MAP_ZOOM,
      style: createMapStyle(),
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('click', (event) => {
      const nextLocation = {
        lat: event.lngLat.lat,
        lng: event.lngLat.wrap().lng,
      }

      if (markerRef.current) {
        markerRef.current.setLngLat([nextLocation.lng, nextLocation.lat])
      } else {
        markerRef.current = new Marker({ color: '#171717' })
          .setLngLat([nextLocation.lng, nextLocation.lat])
          .addTo(map)
      }

      onLocationChange(nextLocation)
    })

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
  }, [initialLocation, onLocationChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!location) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([location.lng, location.lat])
    } else {
      markerRef.current = new Marker({ color: '#171717' })
        .setLngLat([location.lng, location.lat])
        .addTo(map)
    }

    if (!map.getBounds().contains([location.lng, location.lat])) {
      map.easeTo({
        center: [location.lng, location.lat],
        zoom: Math.max(map.getZoom(), 14),
        duration: 300,
      })
    }
  }, [location])

  return (
    <div className="asset-map relative h-64 overflow-hidden rounded-xl border bg-muted">
      <div
        ref={containerRef}
        className="h-full w-full"
        aria-label="Choose asset location"
      />
      {!location && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border bg-background/95 px-3 py-2 text-center text-xs text-muted-foreground shadow-sm backdrop-blur">
          Click the map to choose a location
        </div>
      )}
    </div>
  )
}
