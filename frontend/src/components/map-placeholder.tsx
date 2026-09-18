import type { Asset } from '@asset-tracker/shared'
import { Map, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type MapPlaceholderProps = {
  selectedAsset?: Asset
}

export function MapPlaceholder({ selectedAsset }: MapPlaceholderProps) {
  return (
    <div className="relative flex h-full min-h-[32rem] items-center justify-center overflow-hidden rounded-lg bg-slate-100">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e155_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e155_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative flex max-w-sm flex-col items-center gap-3 px-6 text-center">
        <div className="rounded-full border bg-background p-4 shadow-sm">
          <Map className="size-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <div>
          <p className="font-medium">Map view</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The interactive MapLibre view will appear here.
          </p>
        </div>
      </div>

      {selectedAsset && (
        <div className="absolute right-4 bottom-4 left-4 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur sm:left-auto sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{selectedAsset.name}</p>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden="true" />
                {selectedAsset.lat.toFixed(4)}, {selectedAsset.lng.toFixed(4)}
              </div>
            </div>
            <Badge variant="secondary" className="capitalize">
              {selectedAsset.type}
            </Badge>
          </div>
        </div>
      )}
    </div>
  )
}
