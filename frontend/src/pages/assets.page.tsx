import { useCallback, useEffect, useReducer, type CSSProperties } from 'react'
import type { Asset, AssetStatus, AssetType } from '@asset-tracker/shared'
import type { AssetMapBounds } from '@/components/asset-map'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { AssetDetails } from '@/components/asset-details'
import { LazyAssetMap } from '@/components/lazy-maps'
import { AssetFilters } from '@/components/asset-filters'
import { AssetList } from '@/components/asset-list'
import { AssetResultsSummary } from '@/components/asset-results-summary'
import { CreateAssetDrawer } from '@/components/create-asset-drawer'
import { DeleteAssetDialog } from '@/components/delete-asset-dialog'
import { EditAssetDrawer } from '@/components/edit-asset-drawer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { useAsset, useAssets, useMapAssets } from '@/hooks/use-assets'

type Dialog = { kind: 'none' } | { kind: 'create' } | { kind: 'edit' | 'delete'; asset: Asset }
type State = {
  type: AssetType | 'all'
  status: AssetStatus | 'all'
  mapBounds?: AssetMapBounds
  offset: number
  selectedAssetId?: string
  dialog: Dialog
}
type Action =
  | { kind: 'type'; value: State['type'] }
  | { kind: 'status'; value: State['status'] }
  | { kind: 'area'; value?: AssetMapBounds }
  | { kind: 'clear-filters' }
  | { kind: 'select'; id?: string }
  | { kind: 'page'; offset: number }
  | { kind: 'open'; dialog: Dialog }
  | { kind: 'close-dialog' }
  | { kind: 'created'; id: string }
  | { kind: 'updated'; id?: string }
  | { kind: 'deleted' }

const initialState: State = { type: 'all', status: 'all', offset: 0, dialog: { kind: 'none' } }
const PAGE_SIZE = 25
const EMPTY_ASSETS: Asset[] = []

function reducePage(state: State, action: Action): State {
  switch (action.kind) {
    case 'type': return { ...state, type: action.value, offset: 0, selectedAssetId: undefined }
    case 'status': return { ...state, status: action.value, offset: 0, selectedAssetId: undefined }
    case 'area': return { ...state, mapBounds: action.value, offset: 0, selectedAssetId: undefined }
    case 'clear-filters': return { ...initialState, dialog: state.dialog }
    case 'select': return { ...state, selectedAssetId: action.id }
    case 'page': return { ...state, offset: Math.max(0, action.offset) }
    case 'open': return {
      ...state, dialog: action.dialog,
      selectedAssetId: action.dialog.kind === 'edit' ? undefined : state.selectedAssetId,
    }
    case 'close-dialog': return {
      ...state, dialog: { kind: 'none' },
      selectedAssetId: state.dialog.kind === 'edit' ? state.dialog.asset.id : state.selectedAssetId,
    }
    case 'created': return { ...initialState, selectedAssetId: action.id }
    case 'updated': return { ...state, dialog: { kind: 'none' }, selectedAssetId: action.id }
    case 'deleted': return { ...state, dialog: { kind: 'none' }, selectedAssetId: undefined }
  }
}

export function AssetsPage() {
  // Server data stays in Query; the local reducer owns this page's view choices.
  const [state, dispatch] = useReducer(reducePage, initialState)
  const { type, status, mapBounds, offset, selectedAssetId, dialog } = state
  const filters = {
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    ...mapBounds,
  }
  const assetsQuery = useAssets({ ...filters, limit: PAGE_SIZE, offset })
  const mapQuery = useMapAssets(filters)
  const assets = assetsQuery.isError ? EMPTY_ASSETS : assetsQuery.data?.data ?? EMPTY_ASSETS
  const mapAssets = mapQuery.isError ? EMPTY_ASSETS : mapQuery.data ?? EMPTY_ASSETS
  const listedAsset = assets.find((asset) => asset.id === selectedAssetId)
  const detailQuery = useAsset(listedAsset ? undefined : selectedAssetId)
  const selectedAsset = listedAsset ?? detailQuery.data
  const total = assetsQuery.isError ? 0 : assetsQuery.data?.meta.total ?? 0

  useEffect(() => {
    if (!assetsQuery.isSuccess || assetsQuery.isFetching) return
    const lastOffset = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1) * PAGE_SIZE
    if (offset > lastOffset) dispatch({ kind: 'page', offset: lastOffset })
  }, [assetsQuery.isSuccess, assetsQuery.isFetching, total, offset])

  useEffect(() => {
    if (mapQuery.isSuccess && !mapQuery.isFetching && assetsQuery.isSuccess && !assetsQuery.isFetching &&
        selectedAssetId && !listedAsset && !mapAssets.some((asset) => asset.id === selectedAssetId)) {
      dispatch({ kind: 'select' })
    }
  }, [mapQuery.isSuccess, mapQuery.isFetching, assetsQuery.isSuccess, assetsQuery.isFetching, selectedAssetId, listedAsset, mapAssets])

  const selectAsset = useCallback((id?: string) => dispatch({ kind: 'select', id }), [])
  const searchMapArea = useCallback((value: AssetMapBounds) => dispatch({ kind: 'area', value }), [])

  const firstVisible = assets.length === 0 ? 0 : offset + 1
  const lastVisible = assets.length === 0 ? 0 : Math.min(offset + assets.length, total)
  const hasPreviousPage = offset > 0
  const hasNextPage = offset + assets.length < total
  const changeType = (value: State['type']) => dispatch({ kind: 'type', value })
  const changeStatus = (value: State['status']) => dispatch({ kind: 'status', value })
  const clearMapArea = () => dispatch({ kind: 'area' })
  const clearAllFilters = () => dispatch({ kind: 'clear-filters' })
  const previousPage = () => dispatch({ kind: 'page', offset: offset - PAGE_SIZE })
  const nextPage = () => dispatch({ kind: 'page', offset: offset + PAGE_SIZE })
  const openCreate = () => dispatch({ kind: 'open', dialog: { kind: 'create' } })
  const openEdit = (asset: Asset) => dispatch({ kind: 'open', dialog: { kind: 'edit', asset } })
  const openDelete = (asset: Asset) => dispatch({ kind: 'open', dialog: { kind: 'delete', asset } })
  const closeDialog = () => dispatch({ kind: 'close-dialog' })
  const onCreated = (asset: Asset) => dispatch({ kind: 'created', id: asset.id })
  const onUpdated = (asset: Asset) => dispatch({
    kind: 'updated', id: [...mapAssets, ...assets].some((item) => item.id === asset.id) ? asset.id : undefined,
  })
  const onDeleted = () => dispatch({ kind: 'deleted' })

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
          <Button size="lg" onClick={openCreate}>
            <Plus data-icon="inline-start" />
            Add Asset
          </Button>
        </div>
      </header>

      {selectedAssetId && !selectedAsset && (
        <div role={detailQuery.isError ? 'alert' : 'status'} className="rounded-xl border bg-background p-4 text-sm">
          {detailQuery.isError ? detailQuery.error.message : 'Loading asset details…'}
          {detailQuery.isError && <Button variant="outline" className="mt-2" onClick={() => void detailQuery.refetch()}>Retry details</Button>}
          <Button variant="ghost" onClick={() => selectAsset(undefined)}>Close details</Button>
        </div>
      )}

      <main className="min-h-0 flex-1 p-4 lg:p-6">
        <div
          className="grid h-full min-h-[42rem] gap-4 lg:min-h-0 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[26rem_minmax(0,1fr)] xl:grid-cols-[22rem_minmax(0,1fr)_var(--details-width)] xl:transition-[grid-template-columns] xl:duration-300 xl:ease-out"
          style={
            {
              '--details-width': selectedAsset ? '20rem' : '0rem',
            } as CSSProperties
          }
        >
          <Card role="region" aria-labelledby="asset-list-heading" className="min-h-0 gap-0 py-0">
            <CardHeader className="shrink-0 gap-4 border-b py-4">
              <div className="space-y-1">
                <h2 id="asset-list-heading" className="font-medium">Asset list</h2>
                <AssetResultsSummary
                  total={assetsQuery.data?.meta.total}
                  hasActiveAreaSearch={Boolean(mapBounds)}
                  isError={assetsQuery.isError}
                  isFetching={assetsQuery.isFetching}
                />
              </div>
              <AssetFilters
                onClearAllFilters={clearAllFilters}
                hasActiveAreaSearch={Boolean(mapBounds)}
                onClearArea={clearMapArea}
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
                  onClick={previousPage}
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={!hasNextPage || assetsQuery.isFetching || assetsQuery.isError}
                  onClick={nextPage}
                >
                  <ChevronRight />
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card role="region" aria-labelledby="asset-map-heading" className="min-h-0 gap-0 py-0">
            <CardHeader className="shrink-0 gap-1 border-b py-4 [.border-b]:pb-4">
              <h2 id="asset-map-heading" className="font-medium">Asset map</h2>
              <AssetResultsSummary
                total={mapQuery.data?.length}
                hasActiveAreaSearch={Boolean(mapBounds)}
                isError={mapQuery.isError}
                isFetching={mapQuery.isFetching}
              />
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-3">
              <LazyAssetMap
                assets={mapAssets}
                selectedAssetId={selectedAssetId}
                hasActiveAreaSearch={Boolean(mapBounds)}
                onSelectAsset={selectAsset}
                onSearchArea={searchMapArea}
                isLoading={mapQuery.isPending}
                isError={mapQuery.isError}
                onRetry={() => void mapQuery.refetch()}
              />
            </CardContent>
          </Card>

          <AssetDetails
            asset={selectedAsset}
            onClose={() => selectAsset(undefined)}
            onDelete={openDelete}
            onEdit={openEdit}
          />
        </div>
      </main>

      <CreateAssetDrawer
        open={dialog.kind === 'create'}
        onOpenChange={(open) => { if (open) openCreate(); else closeDialog() }}
        onCreated={onCreated}
      />
      <EditAssetDrawer
        asset={dialog.kind === 'edit' ? dialog.asset : undefined}
        onClose={closeDialog}
        onUpdated={onUpdated}
      />
      <DeleteAssetDialog
        asset={dialog.kind === 'delete' ? dialog.asset : undefined}
        onClose={closeDialog}
        onDeleted={onDeleted}
      />
    </div>
  )
}
