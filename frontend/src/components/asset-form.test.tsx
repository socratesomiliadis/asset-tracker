import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetForm } from './asset-form'

vi.mock('@/components/asset-location-picker', () => ({ AssetLocationPicker: () => null }))
afterEach(cleanup)

it('blocks missing required fields, then submits after they are corrected', async () => {
  const onSubmit = vi.fn()
  render(<AssetForm mode="create" onSubmit={onSubmit} submitLabel="Save" />)
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText('Name is required')
  expect(screen.getByText('Latitude must be between -90 and 90.')).toBeTruthy()
  expect(screen.getByText('Enter a valid installed date.')).toBeTruthy()
  expect(screen.getByText('Longitude must be between -180 and 180.')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New pipe' } })
  fireEvent.change(screen.getByLabelText('Installed date'), { target: { value: '2026-01-01' } })
  fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '40' } })
  fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-70' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
    name: 'New pipe', type: 'pipe', status: 'ok', installed_at: '2026-01-01',
    lat: 40, lng: -70, last_inspected_at: null, notes: '',
  }))
})

it('preserves null inspection dates and long notes when editing', async () => {
  const onSubmit = vi.fn()
  const initialValues = { name: 'Test', type: 'pipe' as const, status: 'ok' as const, lat: 40, lng: -70, installed_at: '2026-01-01', last_inspected_at: null, notes: 'long note\n'.repeat(1000) }
  render(<AssetForm mode="edit" initialValues={initialValues} onSubmit={onSubmit} submitLabel="Save" />)
  expect((screen.getByLabelText('Last inspected date') as HTMLInputElement).value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(initialValues))
})
