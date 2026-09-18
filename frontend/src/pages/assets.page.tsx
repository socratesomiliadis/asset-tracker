import type { Asset, AssetStatus, AssetType } from '@asset-tracker/shared'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { AssetFilters } from '@/components/asset-filters'
import { AssetList } from '@/components/asset-list'
import { MapPlaceholder } from '@/components/map-placeholder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getAssets } from '@/lib/assets-api'

type TypeFilter = AssetType | 'all'
type StatusFilter = AssetStatus | 'all'

export function AssetsPage() {
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string>()
  const filters = {
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
  }
  const assetsQuery = useQuery({
    queryKey: ['assets', filters],
    queryFn: () => getAssets(filters),
  })
  const assets = assetsQuery.data?.data ?? []
  const selectedAsset =
    assets.find((asset) => asset.id === selectedId) ?? assets[0]

  const selectAsset = (asset: Asset) => setSelectedId(asset.id)

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
        <div className="grid h-full min-h-[42rem] gap-4 lg:grid-cols-[26rem_minmax(0,1fr)]">
          <Card className="min-h-0 gap-0 py-0">
            <CardHeader className="gap-4 border-b py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Asset list</p>
                  <p className="text-xs text-muted-foreground">
                    {assetsQuery.data
                      ? `${assets.length} of ${assetsQuery.data.meta.total} assets`
                      : 'Loading assets'}
                  </p>
                </div>
              </div>
              <AssetFilters
                type={type}
                status={status}
                onTypeChange={setType}
                onStatusChange={setStatus}
              />
            </CardHeader>
            <CardContent className="min-h-0 flex-1 px-0">
              <AssetList
                assets={assets}
                selectedId={selectedAsset?.id}
                isLoading={assetsQuery.isPending}
                isError={assetsQuery.isError}
                onSelect={selectAsset}
              />
            </CardContent>
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
              <MapPlaceholder selectedAsset={selectedAsset} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
