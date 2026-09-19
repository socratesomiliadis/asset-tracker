import { formatAssetDate } from '@/lib/asset-dates'
import { assetTypeLabels } from '@/lib/asset-labels'
import { AssetStatusBadge } from '@/components/asset-status-badge'
import type { Asset } from '@asset-tracker/shared'
import { CalendarDays, MapPin, Pencil, Trash2, X } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

const wideLayoutQuery = '(min-width: 80rem)'

type AssetDetailsProps = {
  asset?: Asset
  onClose: () => void
  onDelete: (asset: Asset) => void
  onEdit: (asset: Asset) => void
}

function subscribeToWideLayout(onChange: () => void) {
  const mediaQuery = window.matchMedia(wideLayoutQuery)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}

function getWideLayoutSnapshot() {
  return window.matchMedia(wideLayoutQuery).matches
}

function DetailsFields({ asset }: { asset: Asset }) {
  return (
    <dl className="space-y-6 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Type</dt>
          <dd className="mt-1.5">
            <Badge variant="secondary">
              {assetTypeLabels[asset.type]}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Status</dt>
          <dd className="mt-1.5">
            <AssetStatusBadge status={asset.status} />
          </dd>
        </div>
      </div>

      <div>
        <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          Installed
        </dt>
        <dd className="mt-1.5 text-sm">{formatAssetDate(asset.installed_at)}</dd>
      </div>

      <div>
        <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          Last inspected
        </dt>
        <dd className="mt-1.5 text-sm">
          {asset.last_inspected_at
            ? formatAssetDate(asset.last_inspected_at)
            : 'Not yet inspected'}
        </dd>
      </div>

      <div>
        <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <MapPin className="size-4" aria-hidden="true" />
          Coordinates
        </dt>
        <dd className="mt-1.5 font-mono text-sm">
          {asset.lat.toFixed(6)}, {asset.lng.toFixed(6)}
        </dd>
      </div>

      <div>
        <dt className="text-xs font-medium text-muted-foreground">Notes</dt>
        <dd className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
          {asset.notes.trim() || 'No notes provided.'}
        </dd>
      </div>
    </dl>
  )
}

function DetailsActions({
  className,
  onDelete,
  onEdit,
}: {
  className: string
  onDelete: () => void
  onEdit: () => void
}) {
  return (
    <div className={className}>
      <Button type="button" variant="outline" onClick={onEdit}>
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
      <Button type="button" variant="destructive" onClick={onDelete}>
        <Trash2 data-icon="inline-start" />
        Delete
      </Button>
    </div>
  )
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      onClick={onClose}
      className="absolute top-3 right-3 z-10 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  )
}

export function AssetDetails({
  asset,
  onClose,
  onDelete,
  onEdit,
}: AssetDetailsProps) {
  // Keep the last asset visible during the closing animation.
  const [displayedAsset, setDisplayedAsset] = useState(asset)
  const isWideLayout = useSyncExternalStore(
    subscribeToWideLayout,
    getWideLayoutSnapshot,
    () => false,
  )
  const isOpen = Boolean(asset)

  if (asset && asset !== displayedAsset) setDisplayedAsset(asset)

  return (
    <>
      <aside
        aria-label="Asset details"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`relative hidden min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-[opacity,transform] duration-300 ease-out xl:flex ${
          isOpen
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-4 opacity-0'
        }`}
      >
        {displayedAsset && (
          <>
            <CloseButton onClose={onClose} />
            <div className="shrink-0 border-b p-4 pr-14">
              <h2 className="text-lg font-medium [overflow-wrap:anywhere]">{displayedAsset.name}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Asset details and maintenance information.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <DetailsFields asset={displayedAsset} />
            </div>
            <DetailsActions
              className="grid shrink-0 grid-cols-2 gap-2 border-t p-4"
              onDelete={() => onDelete(displayedAsset)}
              onEdit={() => onEdit(displayedAsset)}
            />
          </>
        )}
      </aside>

      {displayedAsset && (
        <Drawer
          open={isOpen && !isWideLayout}
          swipeDirection="right"
          onOpenChange={(open) => {
            if (!open) onClose()
          }}
        >
          <DrawerContent>
            <CloseButton onClose={onClose} />
            <DrawerHeader className="border-b pb-4 pr-14">
              <DrawerTitle className="text-lg [overflow-wrap:anywhere]">{displayedAsset.name}</DrawerTitle>
              <DrawerDescription>
                Asset details and maintenance information.
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <DetailsFields asset={displayedAsset} />
            </div>
            <DrawerFooter className="grid grid-cols-2 border-t pt-4">
              <DetailsActions
                className="contents"
                onEdit={() => onEdit(displayedAsset)}
                onDelete={() => onDelete(displayedAsset)}
              />
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}
