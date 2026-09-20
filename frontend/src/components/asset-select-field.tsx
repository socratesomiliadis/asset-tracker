import { assetTypeLabels, assetStatusLabels } from '@/lib/asset-labels'
import type { AssetFormValues } from '@/lib/asset-form-values'
import type { CreateAssetInput } from '@asset-tracker/shared'
import { Controller, type Control } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type AssetSelectFieldProps = {
  control: Control<AssetFormValues, unknown, CreateAssetInput>
  name: 'type' | 'status'
  label: string
  id: string
}

export function AssetSelectField({
  control,
  name,
  label,
  id,
}: AssetSelectFieldProps) {
  const labels = name === 'type' ? assetTypeLabels : assetStatusLabels
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select items={labels} name={field.name} value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={id} className="w-full" aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={`Select a ${name}`} />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(labels).map(([option, displayLabel]) => (
                <SelectItem value={option} key={option}>
                  {displayLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}
