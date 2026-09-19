import type { AssetStatus, AssetType } from '@asset-tracker/shared'

export const assetTypeLabels = {
  pipe: 'Pipe', hydrant: 'Hydrant', sensor: 'Sensor', valve: 'Valve',
} satisfies Record<AssetType, string>

export const assetStatusLabels = {
  ok: 'OK', warning: 'Warning', critical: 'Critical',
} satisfies Record<AssetStatus, string>

export const assetTypeFilterLabels = { all: 'All types', ...assetTypeLabels }
export const assetStatusFilterLabels = { all: 'All statuses', ...assetStatusLabels }
