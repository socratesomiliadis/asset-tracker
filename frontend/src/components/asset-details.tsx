import type { Asset } from '@asset-tracker/shared'
import { CalendarDays, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

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

export function AssetDetails({ asset, onClose }: AssetDetailsProps) {
  return (
    <Sheet
      open={Boolean(asset)}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent className="w-full sm:max-w-md">
        {asset && (
          <>
            <SheetHeader className="border-b pr-14">
              <SheetTitle className="text-lg">{asset.name}</SheetTitle>
              <SheetDescription>Asset details and maintenance information.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4">
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
            </div>

            <SheetFooter className="grid grid-cols-2 border-t">
              <Button type="button" variant="outline">
                <Pencil data-icon="inline-start" />
                Edit
              </Button>
              <Button type="button" variant="destructive">
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
