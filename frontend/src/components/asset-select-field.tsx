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
  control: Control<CreateAssetInput>
  name: 'type' | 'status'
  label: string
  id: string
  options: readonly string[]
}

export function AssetSelectField({
  control,
  name,
  label,
  id,
  options,
}: AssetSelectFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Select name={field.name} value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={id} className="w-full" aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={`Select a ${name}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem value={option} key={option}>
                  <span className="capitalize">{option}</span>
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
