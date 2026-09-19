import { useEffect, type RefObject } from 'react'
import { LngLatBounds, type Map } from 'maplibre-gl'
import type { Asset } from '@asset-tracker/shared'

export const programmaticMoveEvent = { isProgrammaticMove: true } as const

export function useMapCamera(
  mapRef: RefObject<Map | null>,
  assets: Pick<Asset, 'id' | 'lng' | 'lat'>[],
  selectedAssetId: string | undefined,
  hasActiveAreaSearch: boolean,
) {
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
  }, [mapRef, assets, hasActiveAreaSearch, selectedAssetId])
}
