import { Component, lazy, Suspense, type ComponentProps, type ReactNode } from 'react'

const AssetMap = lazy(() => import('./asset-map').then((module) => ({ default: module.AssetMap })))
const AssetLocationPicker = lazy(() => import('./asset-location-picker').then((module) => ({ default: module.AssetLocationPicker })))

function MapFallback({ picker = false }: { picker?: boolean }) {
  return <div role="status" className={`${picker ? 'h-64' : 'h-full min-h-64'} grid place-items-center rounded-xl bg-muted text-sm text-muted-foreground`}>Loading map…</div>
}

// Keep a failed lazy import or map initialization inside the map's own panel.
class MapErrorBoundary extends Component<{ children: ReactNode; picker?: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className={`${this.props.picker ? 'h-64' : 'h-full min-h-64'} grid place-content-center gap-2 rounded-xl border bg-muted p-6 text-center text-sm`}>
          <p className="font-medium">Map unavailable</p>
          <p className="text-muted-foreground">
            {this.props.picker
              ? 'Enter latitude and longitude below to choose the location.'
              : 'You can still browse, filter, and manage assets in the list.'}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}

export function LazyAssetMap(props: ComponentProps<typeof AssetMap>) {
  return <MapErrorBoundary><Suspense fallback={<MapFallback />}><AssetMap {...props} /></Suspense></MapErrorBoundary>
}

export function LazyAssetLocationPicker(props: ComponentProps<typeof AssetLocationPicker>) {
  return <MapErrorBoundary picker><Suspense fallback={<MapFallback picker />}><AssetLocationPicker {...props} /></Suspense></MapErrorBoundary>
}
