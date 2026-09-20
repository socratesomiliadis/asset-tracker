import { createAssetInputSchema, assetTypeSchema, assetStatusSchema, type CreateAssetInput } from '@asset-tracker/shared'
import { z } from 'zod'
import { fromUtcInput, toUtcInput } from './asset-dates'

// Raw controls may be empty or invalid while editing. API values may not.
const formValuesSchema = z.object({
  name: z.string(),
  type: assetTypeSchema,
  status: assetStatusSchema,
  lat: z.union([z.number(), z.nan()]).optional(),
  lng: z.union([z.number(), z.nan()]).optional(),
  installed_at: z.string(),
  last_inspected_at: z.string(),
  notes: z.string(),
})
export type AssetFormValues = z.input<typeof formValuesSchema>

export function toAssetFormValues(initial?: Partial<CreateAssetInput>): AssetFormValues {
  return {
    name: initial?.name ?? '', type: initial?.type ?? 'pipe', status: initial?.status ?? 'ok',
    lat: initial?.lat, lng: initial?.lng, notes: initial?.notes ?? '',
    installed_at: toUtcInput(initial?.installed_at) ?? '',
    last_inspected_at: toUtcInput(initial?.last_inspected_at) ?? '',
  }
}

export function createAssetFormSchema(initial?: Partial<CreateAssetInput>) {
  const defaults = toAssetFormValues(initial)
  return formValuesSchema.transform((values) => ({
    ...values,
    installed_at: values.installed_at === defaults.installed_at && initial?.installed_at !== undefined
      ? initial.installed_at : fromUtcInput(values.installed_at),
    last_inspected_at: values.last_inspected_at === defaults.last_inspected_at && initial?.last_inspected_at !== undefined
      ? initial.last_inspected_at : values.last_inspected_at ? fromUtcInput(values.last_inspected_at) : null,
  })).pipe(createAssetInputSchema)
}
