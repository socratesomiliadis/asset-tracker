import { isoDateSchema, toUtcTimestamp } from '@asset-tracker/shared'

const formatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium', timeStyle: 'medium', timeZone: 'UTC',
})

export function formatAssetDate(value: string): string {
  return `${formatter.format(new Date(value))} UTC`
}

// datetime-local is a timezone-free control; this application's inputs are UTC.
export function toUtcInput(value?: string | null): string | null | undefined {
  return value ? toUtcTimestamp(value).slice(0, -1)
    .replace(/:00\.000$/, '').replace(/\.000$/, '').replace(/(\.\d*?[1-9])0+$/, '$1') : value
}

export function fromUtcInput(value: string): string {
  const timestamp = `${value.length === 16 ? `${value}:00` : value}Z`
  return isoDateSchema.safeParse(timestamp).success ? toUtcTimestamp(timestamp) : value
}
