import type { Asset } from '@asset-tracker/shared'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const statusStyles = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
} satisfies Record<Asset['status'], string>

type AssetListProps = {
  assets: Asset[]
  selectedAssetId?: string
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  onRetry: () => void
  onSelectAsset: (assetId: string) => void
}

export function AssetList({
  assets,
  selectedAssetId,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onSelectAsset,
}: AssetListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="space-y-2 rounded-lg border p-4" key={index}>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <div>
          <p className="text-sm font-medium">Assets could not be loaded</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {errorMessage ?? 'Check that the API is running and try again.'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
        No assets match these filters.
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div>
        {assets.map((asset, index) => {
          const isSelected = selectedAssetId === asset.id

          return (
            <div key={asset.id}>
              {index > 0 && <Separator />}
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectAsset(asset.id)}
                className={`w-full border-l-4 px-4 py-4 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted ${
                  isSelected ? 'border-l-primary bg-muted' : 'border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          asset.status === 'ok'
                            ? 'bg-emerald-500'
                            : asset.status === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                      />
                      <p className="truncate font-medium">{asset.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      <span>
                        {asset.lat.toFixed(4)}, {asset.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Badge variant="outline" className={statusStyles[asset.status]}>
                      {asset.status}
                    </Badge>
                    <span className="text-xs capitalize text-muted-foreground">
                      {asset.type}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
