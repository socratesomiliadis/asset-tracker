import { lazy, Suspense, type ComponentProps } from 'react'

const AssetMap = lazy(() => import('./asset-map').then((module) => ({ default: module.AssetMap })))
const AssetLocationPicker = lazy(() => import('./asset-location-picker').then((module) => ({ default: module.AssetLocationPicker })))

function MapFallback({ picker = false }: { picker?: boolean }) {
  return <div role="status" className={`${picker ? 'h-64' : 'h-full min-h-64'} grid place-items-center rounded-xl bg-muted text-sm text-muted-foreground`}>Loading map…</div>
}

export function LazyAssetMap(props: ComponentProps<typeof AssetMap>) {
  return <Suspense fallback={<MapFallback />}><AssetMap {...props} /></Suspense>
}

export function LazyAssetLocationPicker(props: ComponentProps<typeof AssetLocationPicker>) {
  return <Suspense fallback={<MapFallback picker />}><AssetLocationPicker {...props} /></Suspense>
}
