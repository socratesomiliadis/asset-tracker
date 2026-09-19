import type { Asset, AssetStatus } from '@asset-tracker/shared'
import { assetStatusLabels, assetTypeLabels } from './asset-labels'

export const markerColors = {
  ok: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
} satisfies Record<Asset['status'], string>

// Simple type silhouettes remain readable at marker size.
const typePaths = {
  sensor: 'M12 11v2M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14',
  hydrant: 'M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z',
  valve: 'M12 3 21 12 12 21 3 12Z M8 12h8M12 8v8',
  pipe: 'M3 6h10a5 5 0 0 1 5 5v10M3 12h8a1 1 0 0 1 1 1v8M3 4v10M10 21h10',
} satisfies Record<Asset['type'], string>

export type StatusCounts = Record<AssetStatus, number>

function markerButton() {
  const element = document.createElement('button')
  element.type = 'button'
  element.style.cursor = 'pointer'
  return element
}

export function createClusterMarkerElement(total: number, counts: StatusCounts) {
  const element = markerButton()
  const summary = `${total} assets; ${counts.ok} ${assetStatusLabels.ok}; ${counts.warning} ${assetStatusLabels.warning}; ${counts.critical} ${assetStatusLabels.critical}`
  element.setAttribute('aria-label', `Expand cluster: ${summary}`)
  element.className = 'asset-cluster flex items-center justify-center rounded-full bg-slate-900 text-white'
  const size = total >= 100 ? 56 : 48
  element.style.width = `${size}px`
  element.style.height = `${size}px`
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  ring.setAttribute('viewBox', '0 0 48 48')
  ring.setAttribute('aria-hidden', 'true')
  ring.setAttribute('class', 'absolute inset-0 size-full')
  let offset = 0
  for (const status of ['ok', 'warning', 'critical'] as const) {
    if (counts[status] === 0) continue
    const share = counts[status] / total * 100
    const segment = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    segment.setAttribute('cx', '24')
    segment.setAttribute('cy', '24')
    segment.setAttribute('r', '20')
    segment.setAttribute('fill', 'none')
    segment.setAttribute('stroke', markerColors[status])
    segment.setAttribute('stroke-width', '5')
    segment.setAttribute('pathLength', '100')
    segment.setAttribute('stroke-dasharray', `${share} ${100 - share}`)
    segment.setAttribute('stroke-dashoffset', String(-offset))
    segment.setAttribute('transform', 'rotate(-90 24 24)')
    segment.setAttribute('data-status', status)
    ring.append(segment)
    offset += share
  }
  element.append(ring)
  const count = document.createElement('span')
  count.className = 'relative text-sm leading-none font-semibold tabular-nums'
  count.textContent = String(total)
  element.append(count)
  return element
}

export function createAssetMarkerElement(asset: Pick<Asset, 'id' | 'name' | 'type' | 'status'>, isSelected: boolean) {
  const element = markerButton()
  element.setAttribute('aria-label', `Select ${asset.name}`)
  element.setAttribute('aria-pressed', String(isSelected))
  element.className = 'asset-pin'
  element.style.backgroundColor = markerColors[asset.status]
  element.style.setProperty('--asset-color', markerColors[asset.status])
  element.dataset.selected = String(isSelected)
  element.title = `${asset.name} · ${assetTypeLabels[asset.type]} · ${assetStatusLabels[asset.status]}`
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  icon.setAttribute('viewBox', '0 0 24 24')
  icon.setAttribute('aria-hidden', 'true')
  icon.setAttribute('data-asset-type', asset.type)
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', typePaths[asset.type])
  icon.append(path)
  element.append(icon)
  if (isSelected) {
    const label = document.createElement('span')
    label.className = 'asset-pin-label'
    label.textContent = asset.name
    element.append(label)
  }
  return element
}
