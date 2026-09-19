import type { AssetStatus, AssetType } from '@asset-tracker/shared'
import { useId } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type FilterValue<T extends string> = T | 'all'

const typeLabels = { all: 'All types', pipe: 'Pipes', hydrant: 'Hydrants', sensor: 'Sensors', valve: 'Valves' }
const statusLabels = { all: 'All statuses', ok: 'OK', warning: 'Warning', critical: 'Critical' }

type AssetFiltersProps = {
  type: FilterValue<AssetType>
  status: FilterValue<AssetStatus>
  hasActiveAreaSearch: boolean
  onClearAllFilters: () => void
  onClearArea: () => void
  onTypeChange: (value: FilterValue<AssetType>) => void
  onStatusChange: (value: FilterValue<AssetStatus>) => void
}

export function AssetFilters({
  type,
  status,
  hasActiveAreaSearch,
  onClearArea,
  onClearAllFilters,
  onTypeChange,
  onStatusChange,
}: AssetFiltersProps) {
  const id = useId()
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field className="gap-2">
        <FieldLabel htmlFor={`${id}-type`}>Type</FieldLabel>
        <Select items={typeLabels} value={type} onValueChange={(value) => onTypeChange(value as FilterValue<AssetType>)}>
          <SelectTrigger id={`${id}-type`} className="w-full" aria-label="Filter by asset type">
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
      </Field>

      <Field className="gap-2">
        <FieldLabel htmlFor={`${id}-status`}>Status</FieldLabel>
        <Select
          items={statusLabels}
          value={status}
          onValueChange={(value) => onStatusChange(value as FilterValue<AssetStatus>)}
        >
          <SelectTrigger id={`${id}-status`} className="w-full" aria-label="Filter by asset status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {(hasActiveAreaSearch || type !== 'all' || status !== 'all') && (
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2">
          {hasActiveAreaSearch && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 w-fit rounded-full text-xs"
              aria-label="Remove area filter"
              onClick={onClearArea}
            >
              Area filter active
              <X className="size-3" aria-hidden="true" />
            </Button>
          )}
          {(type !== 'all' || status !== 'all') && (
            <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs text-muted-foreground" onClick={onClearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
