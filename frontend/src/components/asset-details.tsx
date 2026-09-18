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

const wideLayoutQuery = '(min-width: 96rem)'

const statusStyles = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
} satisfies Record<Asset['status'], string>

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
})

function formatDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return dateFormatter.format(date)
}

type AssetDetailsProps = {
  asset?: Asset
  onClose: () => void
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
            <Badge variant="secondary" className="capitalize">
              {asset.type}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Status</dt>
          <dd className="mt-1.5">
            <Badge variant="outline" className={statusStyles[asset.status]}>
              {asset.status}
            </Badge>
          </dd>
        </div>
      </div>

      <div>
        <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          Installed
        </dt>
        <dd className="mt-1.5 text-sm">{formatDate(asset.installed_at)}</dd>
      </div>

      <div>
        <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <CalendarDays className="size-4" aria-hidden="true" />
          Last inspected
        </dt>
        <dd className="mt-1.5 text-sm">
          {asset.last_inspected_at
            ? formatDate(asset.last_inspected_at)
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
        <dd className="mt-2 rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
          {asset.notes.trim() || 'No notes provided.'}
        </dd>
      </div>
    </dl>
  )
}

function DetailsActions({ className }: { className: string }) {
  return (
    <div className={className}>
      <Button type="button" variant="outline">
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
      <Button type="button" variant="destructive">
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

export function AssetDetails({ asset, onClose }: AssetDetailsProps) {
  const [displayedAsset, setDisplayedAsset] = useState(asset)
  const isWideLayout = useSyncExternalStore(
    subscribeToWideLayout,
    getWideLayoutSnapshot,
    () => false,
  )
  const isOpen = Boolean(asset)

  if (asset && asset.id !== displayedAsset?.id) setDisplayedAsset(asset)

  return (
    <>
      <aside
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`relative hidden min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-[opacity,transform] duration-300 ease-out 2xl:flex ${
          isOpen
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-4 opacity-0'
        }`}
      >
        {displayedAsset && (
          <>
            <CloseButton onClose={onClose} />
            <div className="border-b p-4 pr-14">
              <h2 className="text-lg font-medium">{displayedAsset.name}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Asset details and maintenance information.
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <DetailsFields asset={displayedAsset} />
            </div>
            <DetailsActions className="grid grid-cols-2 gap-2 border-t p-4" />
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
              <DrawerTitle className="text-lg">{displayedAsset.name}</DrawerTitle>
              <DrawerDescription>
                Asset details and maintenance information.
              </DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <DetailsFields asset={displayedAsset} />
            </div>
            <DrawerFooter className="grid grid-cols-2 border-t pt-4">
              <Button type="button" variant="outline">
                <Pencil data-icon="inline-start" />
                Edit
              </Button>
              <Button type="button" variant="destructive">
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  )
}
