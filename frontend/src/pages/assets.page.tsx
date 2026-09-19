import type { Asset, AssetStatus, AssetType } from '@asset-tracker/shared'
import type { CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { AssetDetails } from '@/components/asset-details'
import { AssetMap, type AssetMapBounds } from '@/components/asset-map'
import { AssetFilters } from '@/components/asset-filters'
import { AssetList } from '@/components/asset-list'
import { CreateAssetDrawer } from '@/components/create-asset-drawer'
import { DeleteAssetDialog } from '@/components/delete-asset-dialog'
import { EditAssetDrawer } from '@/components/edit-asset-drawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAssets, useMapAssets } from '@/hooks/use-assets'

type TypeFilter = AssetType | 'all'
type StatusFilter = AssetStatus | 'all'

const PAGE_SIZE = 25
const EMPTY_ASSETS: Asset[] = []

export function AssetsPage() {
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [selectedAssetId, setSelectedAssetId] = useState<string>()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset>()
  const [deletingAsset, setDeletingAsset] = useState<Asset>()
  const [mapBounds, setMapBounds] = useState<AssetMapBounds>()
  const [offset, setOffset] = useState(0)
  const filters = {
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    ...mapBounds,
  }
  const assetsQuery = useAssets({ ...filters, limit: PAGE_SIZE, offset })
  const mapQuery = useMapAssets(filters)
  const assets = assetsQuery.isError ? EMPTY_ASSETS : assetsQuery.data?.data ?? EMPTY_ASSETS
  const mapAssets = mapQuery.isError ? EMPTY_ASSETS : mapQuery.data ?? EMPTY_ASSETS
  const selectedAsset = mapAssets.find((asset) => asset.id === selectedAssetId)
    ?? assets.find((asset) => asset.id === selectedAssetId)
  const selectAsset = useCallback((assetId: string) => setSelectedAssetId(assetId), [])
  const searchMapArea = useCallback((bounds: AssetMapBounds) => {
    setMapBounds(bounds)
    setOffset(0)
    setSelectedAssetId(undefined)
  }, [])
  const total = assetsQuery.isError ? 0 : assetsQuery.data?.meta.total ?? 0
  // A deletion or edit can remove the final item on the current page.
  if (assetsQuery.isSuccess && !assetsQuery.isFetching) {
    const lastOffset = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE
    if (offset > lastOffset) setOffset(lastOffset)
  }
  if (mapQuery.isSuccess && !mapQuery.isFetching &&
      assetsQuery.isSuccess && !assetsQuery.isFetching &&
      selectedAssetId && !selectedAsset) {
    setSelectedAssetId(undefined)
  }

  const clearMapArea = () => {
    setMapBounds(undefined)
    setOffset(0)
    setSelectedAssetId(undefined)
  }
  const firstVisible = assets.length === 0 ? 0 : offset + 1
  const lastVisible = assets.length === 0 ? 0 : Math.min(offset + assets.length, total)
  const hasPreviousPage = offset > 0
  const hasNextPage = offset + assets.length < total

  const changeType = (value: TypeFilter) => {
    setType(value)
    setOffset(0)
    setSelectedAssetId(undefined)
  }

  const changeStatus = (value: StatusFilter) => {
    setStatus(value)
    setOffset(0)
    setSelectedAssetId(undefined)
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30 lg:h-screen lg:overflow-hidden">
      <header className="shrink-0 border-b bg-background">
        <div className="flex items-center justify-between gap-6 px-6 py-5 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Monitor and manage infrastructure across your network.
            </p>
          </div>
          <Button size="lg" onClick={() => setIsCreateOpen(true)}>
            <Plus data-icon="inline-start" />
            Add Asset
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-4 lg:p-6">
        <div
          className="grid h-full min-h-[42rem] gap-4 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[26rem_minmax(0,1fr)] 2xl:grid-cols-[26rem_minmax(0,1fr)_var(--details-width)] 2xl:transition-[grid-template-columns] 2xl:duration-300 2xl:ease-out"
          style={
            {
              '--details-width': selectedAsset ? '24rem' : '0rem',
            } as CSSProperties
          }
        >
          <Card className="min-h-0 gap-0 py-0">
            <CardHeader className="shrink-0 gap-4 border-b py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Asset list</p>
                  <p className="text-xs text-muted-foreground">
                    {assetsQuery.isError
                      ? 'Assets unavailable'
                      : assetsQuery.data
                      ? `${assetsQuery.data.meta.total} matching assets`
                      : 'Loading assets'}
                  </p>
                </div>
              </div>
              <AssetFilters
                type={type}
                status={status}
                onTypeChange={changeType}
                onStatusChange={changeStatus}
              />
            </CardHeader>
            <CardContent className="min-h-0 flex-1 overflow-hidden px-0">
              <AssetList
                assets={assets}
                selectedAssetId={selectedAssetId}
                isLoading={assetsQuery.isPending}
                isError={assetsQuery.isError}
                errorMessage={assetsQuery.error?.message}
                onRetry={() => void assetsQuery.refetch()}
                onSelectAsset={selectAsset}
              />
            </CardContent>
            <CardFooter className="shrink-0 justify-between bg-background py-3">
              <span className="text-xs text-muted-foreground">
                {firstVisible}–{lastVisible} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous page"
                  disabled={!hasPreviousPage || assetsQuery.isFetching || assetsQuery.isError}
                  onClick={() => {
                    setOffset((current) => Math.max(0, current - PAGE_SIZE))
                  }}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={!hasNextPage || assetsQuery.isFetching || assetsQuery.isError}
                  onClick={() => {
                    setOffset((current) => current + PAGE_SIZE)
                  }}
                >
                  <ChevronRight />
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="min-h-0 gap-0 py-0">
            <CardHeader className="shrink-0 flex-row items-center justify-between border-b py-4">
              <div>
                <p className="font-medium">Asset map</p>
                <p className="text-xs text-muted-foreground">Geographic overview</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-emerald-500" />
                {mapQuery.isError ? 'Unavailable' : mapQuery.isFetching ? 'Updating…' : 'Live data'}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="min-h-0 flex-1 p-3">
              <AssetMap
                assets={mapAssets}
                selectedAssetId={selectedAssetId}
                hasActiveAreaSearch={Boolean(mapBounds)}
                onSelectAsset={selectAsset}
                onSearchArea={searchMapArea}
                onClearArea={clearMapArea}
                isLoading={mapQuery.isPending}
                isError={mapQuery.isError}
                onRetry={() => void mapQuery.refetch()}
              />
            </CardContent>
          </Card>

          <AssetDetails
            asset={selectedAsset}
            onClose={() => setSelectedAssetId(undefined)}
            onDelete={setDeletingAsset}
            onEdit={(asset) => {
              setSelectedAssetId(undefined)
              setEditingAsset(asset)
            }}
          />
        </div>
      </main>

      <CreateAssetDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => {
          clearMapArea()
          setType('all')
          setStatus('all')
          setIsCreateOpen(false)
        }}
      />
      <EditAssetDrawer
        asset={editingAsset}
        onClose={() => {
          setEditingAsset(undefined)
          setSelectedAssetId(editingAsset?.id)
        }}
        onUpdated={(asset) => {
          setEditingAsset(undefined)
          setSelectedAssetId(
            [...mapAssets, ...assets].some((item) => item.id === asset.id) ? asset.id : undefined,
          )
        }}
      />
      <DeleteAssetDialog
        asset={deletingAsset}
        onClose={() => setDeletingAsset(undefined)}
        onDeleted={() => {
          setDeletingAsset(undefined)
          setSelectedAssetId(undefined)
        }}
      />
    </div>
  )
}
