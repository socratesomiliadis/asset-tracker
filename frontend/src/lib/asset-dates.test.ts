import { expect, it } from 'vitest'
import { formatAssetDate, fromUtcInput, toUtcInput } from './asset-dates'

it('keeps UTC calendar dates consistent between details and edit inputs', () => {
  // CI also runs this in America/New_York, where local formatting moves it back a day.
  expect(formatAssetDate('2025-05-27T00:00:00.000Z')).toBe('May 27, 2025, 12:00:00 AM UTC')
  expect(toUtcInput('2025-05-27T00:00:00.000Z')).toBe('2025-05-27T00:00')
  expect(fromUtcInput('2025-05-27T00:00')).toBe('2025-05-27T00:00:00.000Z')
})

it('preserves milliseconds and converts offsets to the displayed UTC instant', () => {
  expect(toUtcInput('2026-01-01T01:30:45.123+02:00')).toBe('2025-12-31T23:30:45.123')
  expect(fromUtcInput('2025-12-31T23:30:45.123')).toBe('2025-12-31T23:30:45.123Z')
  expect(toUtcInput('2026-01-01T12:34:56.120Z')).toBe('2026-01-01T12:34:56.12')
})

it('leaves empty and invalid values for form validation', () => {
  expect(toUtcInput(null)).toBeNull()
  expect(fromUtcInput('')).toBe('')
  expect(fromUtcInput('not-a-date')).toBe('not-a-date')
})
