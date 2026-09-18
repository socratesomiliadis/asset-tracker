import type { AssetStatus, AssetType } from '@asset-tracker/shared'
import type { CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import { AssetDetails } from '@/components/asset-details'
import { AssetMap, type AssetMapBounds } from '@/components/asset-map'
import { AssetFilters } from '@/components/asset-filters'
import { AssetList } from '@/components/asset-list'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAssets } from '@/hooks/use-assets'

type TypeFilter = AssetType | 'all'
type StatusFilter = AssetStatus | 'all'

const PAGE_SIZE = 25

export function AssetsPage() {
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [selectedAssetId, setSelectedAssetId] = useState<string>()
  const [mapBounds, setMapBounds] = useState<AssetMapBounds>()
  const [offset, setOffset] = useState(0)
  const query = {
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    ...mapBounds,
    limit: PAGE_SIZE,
    offset,
  }
  const assetsQuery = useAssets(query)
  const assets = assetsQuery.data?.data ?? []
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId)
  const selectAsset = useCallback((assetId: string) => setSelectedAssetId(assetId), [])
  const searchMapArea = useCallback((bounds: AssetMapBounds) => {
    setMapBounds(bounds)
    setOffset(0)
    setSelectedAssetId(undefined)
  }, [])
  const total = assetsQuery.data?.meta.total ?? 0
  const firstVisible = total === 0 ? 0 : offset + 1
  const lastVisible = Math.min(offset + assets.length, total)
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
          <Button size="lg">
            <Plus data-icon="inline-start" />
            Add Asset
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 p-4 lg:p-6">
        <div
          className="grid h-full min-h-[42rem] gap-4 lg:grid-cols-[26rem_minmax(0,1fr)] 2xl:grid-cols-[26rem_minmax(0,1fr)_var(--details-width)] 2xl:transition-[grid-template-columns] 2xl:duration-300 2xl:ease-out"
          style={
            {
              '--details-width': selectedAsset ? '24rem' : '0rem',
            } as CSSProperties
          }
        >
          <Card className="min-h-0 gap-0 py-0">
            <CardHeader className="gap-4 border-b py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Asset list</p>
                  <p className="text-xs text-muted-foreground">
                    {assetsQuery.data
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
            <CardContent className="min-h-0 flex-1 px-0">
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
            <CardFooter className="justify-between bg-background py-3">
              <span className="text-xs text-muted-foreground">
                {firstVisible}–{lastVisible} of {total}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Previous page"
                  disabled={!hasPreviousPage || assetsQuery.isFetching}
                  onClick={() => {
                    setOffset((current) => Math.max(0, current - PAGE_SIZE))
                    setSelectedAssetId(undefined)
                  }}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={!hasNextPage || assetsQuery.isFetching}
                  onClick={() => {
                    setOffset((current) => current + PAGE_SIZE)
                    setSelectedAssetId(undefined)
                  }}
                >
                  <ChevronRight />
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="min-h-0 gap-0 py-0">
            <CardHeader className="flex-row items-center justify-between border-b py-4">
              <div>
                <p className="font-medium">Asset map</p>
                <p className="text-xs text-muted-foreground">Geographic overview</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-emerald-500" />
                Live data
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="min-h-0 flex-1 p-3">
              <AssetMap
                assets={assets}
                selectedAssetId={selectedAssetId}
                hasActiveAreaSearch={Boolean(mapBounds)}
                onSelectAsset={selectAsset}
                onSearchArea={searchMapArea}
              />
            </CardContent>
          </Card>

          <AssetDetails
            asset={selectedAsset}
            onClose={() => setSelectedAssetId(undefined)}
          />
        </div>
      </main>
    </div>
  )
}
