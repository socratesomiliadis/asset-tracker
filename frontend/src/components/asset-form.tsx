import type {
  AssetStatus,
  AssetType,
  CreateAssetInput,
  UpdateAssetInput,
} from '@asset-tracker/shared'
import {
  createAssetInputSchema,
  updateAssetInputSchema,
} from '@asset-tracker/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Controller,
  type DefaultValues,
  type Resolver,
  useForm,
  useWatch,
} from 'react-hook-form'
import { useCallback, useId, useMemo } from 'react'
import { AssetLocationPicker } from '@/components/asset-location-picker'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type SharedAssetFormProps = {
  className?: string
  isSubmitting?: boolean
  submitLabel?: string
}

type AssetFormProps = SharedAssetFormProps &
  (
    | {
        mode: 'create'
        initialValues?: Partial<CreateAssetInput>
        onSubmit?: (values: CreateAssetInput) => void
      }
    | {
        mode: 'edit'
        initialValues: Partial<CreateAssetInput>
        onSubmit?: (values: UpdateAssetInput) => void
      }
  )

const assetTypes = ['pipe', 'hydrant', 'sensor', 'valve'] as const satisfies readonly AssetType[]
const assetStatuses = ['ok', 'warning', 'critical'] as const satisfies readonly AssetStatus[]

function toDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : value
}

export function AssetForm(props: AssetFormProps) {
  const formId = useId()
  const validationSchema =
    props.mode === 'create' ? createAssetInputSchema : updateAssetInputSchema
  const defaultValues = useMemo<DefaultValues<CreateAssetInput>>(
    () => ({
      name: props.initialValues?.name ?? '',
      type: props.initialValues?.type ?? 'pipe',
      status: props.initialValues?.status ?? 'ok',
      installed_at: toDateInputValue(props.initialValues?.installed_at) ?? '',
      last_inspected_at:
        toDateInputValue(props.initialValues?.last_inspected_at) ?? null,
      notes: props.initialValues?.notes ?? '',
      lat: props.initialValues?.lat,
      lng: props.initialValues?.lng,
    }),
    [props.initialValues],
  )
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    setValue,
  } = useForm<CreateAssetInput>({
    defaultValues,
    mode: 'onBlur',
    resolver: zodResolver(validationSchema) as Resolver<CreateAssetInput>,
  })
  const [latitude, longitude] = useWatch({
    control,
    name: ['lat', 'lng'],
  })

  const setLocation = useCallback(
    ({ lat, lng }: { lat: number; lng: number }) => {
      setValue('lat', Number(lat.toFixed(6)), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      setValue('lng', Number(lng.toFixed(6)), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    },
    [setValue],
  )

  const submitForm = handleSubmit((values) => {
    if (props.isSubmitting) return
    if (props.mode === 'create') {
      props.onSubmit?.(values)
    } else {
      props.onSubmit?.(values)
    }
  })

  return (
    <form
      className={cn('space-y-6', props.className)}
      noValidate
      onSubmit={submitForm}
    >
      <FieldGroup className="gap-5">
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor={`${formId}-name`}>Name</FieldLabel>
          <Input
            id={`${formId}-name`}
            placeholder="Asset name"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Controller
            control={control}
            name="type"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${formId}-type`}>Type</FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as AssetType)}
                >
                  <SelectTrigger
                    id={`${formId}-type`}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetTypes.map((type) => (
                      <SelectItem value={type} key={type}>
                        <span className="capitalize">{type}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={control}
            name="status"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${formId}-status`}>Status</FieldLabel>
                <Select
                  name={field.name}
                  value={field.value}
                  onValueChange={(value) => field.onChange(value as AssetStatus)}
                >
                  <SelectTrigger
                    id={`${formId}-status`}
                    className="w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {assetStatuses.map((status) => (
                      <SelectItem value={status} key={status}>
                        <span className="capitalize">{status}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.installed_at)}>
            <FieldLabel htmlFor={`${formId}-installed-at`}>Installed date</FieldLabel>
            <Input
              id={`${formId}-installed-at`}
              type="date"
              aria-invalid={Boolean(errors.installed_at)}
              {...register('installed_at')}
            />
            <FieldError>
              {errors.installed_at ? 'Enter a valid installed date.' : null}
            </FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.last_inspected_at)}>
            <FieldLabel htmlFor={`${formId}-last-inspected-at`}>
              Last inspected date
            </FieldLabel>
            <Input
              id={`${formId}-last-inspected-at`}
              type="date"
              aria-invalid={Boolean(errors.last_inspected_at)}
              {...register('last_inspected_at', {
                setValueAs: (value) => (value === '' ? null : value),
              })}
            />
            <FieldError>
              {errors.last_inspected_at
                ? 'Enter a valid inspection date or leave it blank.'
                : null}
            </FieldError>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.lat)}>
            <FieldLabel htmlFor={`${formId}-latitude`}>Latitude</FieldLabel>
            <Input
              id={`${formId}-latitude`}
              type="number"
              step="any"
              min={-90}
              max={90}
              placeholder="-90 to 90"
              aria-invalid={Boolean(errors.lat)}
              {...register('lat', { valueAsNumber: true })}
            />
            <FieldError>
              {errors.lat ? 'Latitude must be between -90 and 90.' : null}
            </FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.lng)}>
            <FieldLabel htmlFor={`${formId}-longitude`}>Longitude</FieldLabel>
            <Input
              id={`${formId}-longitude`}
              type="number"
              step="any"
              min={-180}
              max={180}
              placeholder="-180 to 180"
              aria-invalid={Boolean(errors.lng)}
              {...register('lng', { valueAsNumber: true })}
            />
            <FieldError>
              {errors.lng ? 'Longitude must be between -180 and 180.' : null}
            </FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel>Choose location</FieldLabel>
          <FieldDescription>
            Click the map to set or reposition the asset coordinates.
          </FieldDescription>
          <AssetLocationPicker
            latitude={Number.isFinite(latitude) ? latitude : undefined}
            longitude={Number.isFinite(longitude) ? longitude : undefined}
            onLocationChange={setLocation}
          />
        </Field>

        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor={`${formId}-notes`}>Notes</FieldLabel>
          <Textarea
            id={`${formId}-notes`}
            rows={4}
            className="max-h-64 overflow-y-auto"
            placeholder="Add maintenance or inspection notes"
            aria-invalid={Boolean(errors.notes)}
            {...register('notes')}
          />
          <FieldError errors={[errors.notes]} />
        </Field>
      </FieldGroup>

      <div className="flex justify-end">
        <Button type="submit" disabled={props.isSubmitting}>
          {props.submitLabel ??
            (props.mode === 'create' ? 'Create asset' : 'Save changes')}
        </Button>
      </div>
    </form>
  )
}
