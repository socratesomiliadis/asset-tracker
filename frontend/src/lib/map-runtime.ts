import { setWorkerUrl } from 'maplibre-gl'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'

// Loaded with either lazy map, before its first Map is constructed.
setWorkerUrl(mapWorkerUrl)
