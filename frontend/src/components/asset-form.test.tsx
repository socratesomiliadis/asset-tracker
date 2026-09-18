import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetForm } from './asset-form'

vi.mock('@/components/asset-location-picker', () => ({ AssetLocationPicker: () => null }))
afterEach(cleanup)

it('blocks invalid forms without submitting', async () => {
  const onSubmit = vi.fn()
  render(<AssetForm mode="create" onSubmit={onSubmit} submitLabel="Save" />)
  fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '999' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await screen.findByText('Name is required')
  expect(screen.getByText('Latitude must be between -90 and 90.')).toBeTruthy()
  expect(onSubmit).not.toHaveBeenCalled()
})

it('preserves null inspection dates and long notes when editing', async () => {
  const onSubmit = vi.fn()
  const initialValues = { name: 'Test', type: 'pipe' as const, status: 'ok' as const, lat: 40, lng: -70, installed_at: '2026-01-01', last_inspected_at: null, notes: 'long note\n'.repeat(1000) }
  render(<AssetForm mode="edit" initialValues={initialValues} onSubmit={onSubmit} submitLabel="Save" />)
  expect((screen.getByLabelText('Last inspected date') as HTMLInputElement).value).toBe('')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(initialValues))
})
