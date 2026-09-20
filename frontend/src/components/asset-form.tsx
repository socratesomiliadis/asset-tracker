import type {
  CreateAssetInput,
  UpdateAssetInput,
} from '@asset-tracker/shared'
import {
  createAssetInputSchema,
  INSPECTION_DATE_ERROR,
} from '@asset-tracker/shared'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useForm,
  useWatch,
} from 'react-hook-form'
import { useCallback, useEffect, useId, useMemo } from 'react'
import { z } from 'zod'
import { AssetsApiError } from '@/lib/assets-api'
import { LazyAssetLocationPicker } from '@/components/lazy-maps'
import { createAssetFormSchema, toAssetFormValues, type AssetFormValues } from '@/lib/asset-form-values'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AssetSelectField } from '@/components/asset-select-field'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type SharedAssetFormProps = {
  scrollable?: boolean
  className?: string
  isSubmitting?: boolean
  submitLabel?: string
  serverError?: Error | null
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

export function AssetForm(props: AssetFormProps) {
  const formId = useId()
  const defaultValues = useMemo(() => toAssetFormValues(props.initialValues), [props.initialValues])
  const validationSchema = useMemo(() => createAssetFormSchema(
    props.mode === 'edit' ? props.initialValues : undefined,
  ), [props.mode, props.initialValues])
  const {
    control,
    formState: { errors, dirtyFields, isDirty },
    handleSubmit,
    register,
    setValue,
    setError,
  } = useForm<AssetFormValues, unknown, CreateAssetInput>({
    defaultValues,
    mode: 'onBlur',
    resolver: zodResolver(validationSchema),
  })
  useEffect(() => {
    if (!(props.serverError instanceof AssetsApiError)) return
    const details = z.object({ fieldErrors: z.record(z.string(), z.array(z.string())) })
      .safeParse(props.serverError.details)
    if (!details.success) return
    for (const field of Object.keys(createAssetInputSchema.shape) as (keyof CreateAssetInput)[]) {
      const message = details.data.fieldErrors[field]?.[0]
      if (message) setError(field, { type: 'server', message })
    }
  }, [props.serverError, setError])
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
    if (props.mode === 'edit') {
      // Compare against the date inputs' defaults, not the original timestamps.
      // Untouched dates must retain their full precision on the server.
      const changes: UpdateAssetInput = Object.fromEntries(
        Object.entries(values).filter(
          ([key]) => dirtyFields[key as keyof CreateAssetInput],
        ),
      )
      if (Object.keys(changes).length === 0) return
      props.onSubmit?.(changes)
      return
    }
    props.onSubmit?.(values)
  })

  return (
    <form
      className={cn(props.scrollable ? 'flex min-h-0 flex-1 flex-col' : 'space-y-6', props.className)}
      noValidate
      onSubmit={submitForm}
    >
      <FieldGroup className={cn('gap-5', props.scrollable && 'min-h-0 flex-1 overflow-y-auto p-4 sm:p-6')}>
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
          <AssetSelectField
            control={control}
            name="type"
            label="Type"
            id={`${formId}-type`}
          />
          <AssetSelectField
            control={control}
            name="status"
            label="Status"
            id={`${formId}-status`}
          />
        </div>

        <FieldDescription>Dates and times are shown and entered in UTC.</FieldDescription>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.installed_at)}>
            <FieldLabel htmlFor={`${formId}-installed-at`}>Installed (UTC)</FieldLabel>
            <Input
              id={`${formId}-installed-at`}
              type="datetime-local"
              step="0.001"
              min="0001-01-01T00:00"
              max="9999-12-31T23:59:59.999"
              aria-invalid={Boolean(errors.installed_at)}
              {...register('installed_at')}
            />
            <FieldError>
              {errors.installed_at ? 'Enter a valid installation date and time (UTC).' : null}
            </FieldError>
          </Field>

          <Field data-invalid={Boolean(errors.last_inspected_at)}>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor={`${formId}-last-inspected-at`}>Last inspected (UTC)</FieldLabel>
              <span id={`${formId}-inspection-optional`} className="text-sm text-muted-foreground">(optional)</span>
            </div>
            <Input
              id={`${formId}-last-inspected-at`}
              aria-describedby={`${formId}-inspection-optional`}
              type="datetime-local"
              step="0.001"
              min="0001-01-01T00:00"
              max="9999-12-31T23:59:59.999"
              aria-invalid={Boolean(errors.last_inspected_at)}
              {...register('last_inspected_at')}
            />
            <FieldError>
              {errors.last_inspected_at
                ? errors.last_inspected_at.message === INSPECTION_DATE_ERROR
                  ? INSPECTION_DATE_ERROR
                  : 'Enter a valid inspection date and time (UTC), or leave it blank.'
                : null}
            </FieldError>
          </Field>
        </div>

        <Field>
          <FieldLabel>Choose location</FieldLabel>
          <FieldDescription>
            Click the map or enter latitude and longitude below. Both methods update the same location.
          </FieldDescription>
          <LazyAssetLocationPicker
            latitude={Number.isFinite(latitude) ? latitude : undefined}
            longitude={Number.isFinite(longitude) ? longitude : undefined}
            onLocationChange={setLocation}
          />
        </Field>

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

        <Field data-invalid={Boolean(errors.notes)}>
          <div className="flex items-center gap-1.5">
            <FieldLabel htmlFor={`${formId}-notes`}>Notes</FieldLabel>
            <span id={`${formId}-notes-optional`} className="text-sm text-muted-foreground">(optional)</span>
          </div>
          <Textarea
            id={`${formId}-notes`}
            aria-describedby={`${formId}-notes-optional`}
            rows={4}
            className="max-h-64 overflow-y-auto"
            placeholder="Add maintenance or inspection notes"
            aria-invalid={Boolean(errors.notes)}
            {...register('notes')}
          />
          <FieldError errors={[errors.notes]} />
        </Field>
      </FieldGroup>

      <div className={cn('flex justify-end', props.scrollable && 'shrink-0 border-t bg-background px-4 py-4 sm:px-6')}>
        <Button
          type="submit"
          disabled={props.isSubmitting || (props.mode === 'edit' && !isDirty)}
        >
          {props.submitLabel ??
            (props.mode === 'create' ? 'Create asset' : 'Save changes')}
        </Button>
      </div>
    </form>
  )
}
