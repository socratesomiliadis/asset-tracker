import type { AssetStatus, AssetType } from '@asset-tracker/shared'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FilterValue<T extends string> = T | 'all'

type AssetFiltersProps = {
  type: FilterValue<AssetType>
  status: FilterValue<AssetStatus>
  onTypeChange: (value: FilterValue<AssetType>) => void
  onStatusChange: (value: FilterValue<AssetStatus>) => void
}

export function AssetFilters({
  type,
  status,
  onTypeChange,
  onStatusChange,
}: AssetFiltersProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Select value={type} onValueChange={(value) => onTypeChange(value as FilterValue<AssetType>)}>
        <SelectTrigger className="w-full" aria-label="Filter by asset type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="pipe">Pipes</SelectItem>
          <SelectItem value="hydrant">Hydrants</SelectItem>
          <SelectItem value="sensor">Sensors</SelectItem>
          <SelectItem value="valve">Valves</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as FilterValue<AssetStatus>)}
      >
        <SelectTrigger className="w-full" aria-label="Filter by asset status">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="ok">OK</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
