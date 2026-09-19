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
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Updated' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ name: 'Updated' }))
  expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe(initialValues.notes)
})

it('submits changed dates and allows clearing the inspection date', async () => {
  const onSubmit = vi.fn()
  render(<AssetForm mode="edit" initialValues={{
    name: 'Test', type: 'pipe', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-01T12:34:56.789Z',
    last_inspected_at: '2026-02-01T09:10:11.123Z', notes: '',
  }} onSubmit={onSubmit} />)
  fireEvent.change(screen.getByLabelText('Installed date'), { target: { value: '2026-01-02' } })
  fireEvent.change(screen.getByLabelText('Last inspected date'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
    installed_at: '2026-01-02', last_inspected_at: null,
  }))
})

it('does not submit an unchanged edit or a reverted date change', () => {
  const onSubmit = vi.fn()
  render(<AssetForm mode="edit" initialValues={{
    name: 'Test', type: 'pipe', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-01T12:34:56.789Z', last_inspected_at: null, notes: '',
  }} onSubmit={onSubmit} />)
  const save = screen.getByRole('button', { name: 'Save changes' }) as HTMLButtonElement
  expect(save.disabled).toBe(true)
  fireEvent.change(screen.getByLabelText('Installed date'), { target: { value: '2026-01-02' } })
  expect(save.disabled).toBe(false)
  fireEvent.change(screen.getByLabelText('Installed date'), { target: { value: '2026-01-01' } })
  expect(save.disabled).toBe(true)
  fireEvent.click(save)
  expect(onSubmit).not.toHaveBeenCalled()
})
