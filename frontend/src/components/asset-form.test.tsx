import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetForm } from './asset-form'
import { INSPECTION_DATE_ERROR } from '@asset-tracker/shared'
import { AssetsApiError } from '@/lib/assets-api'
import userEvent from '@testing-library/user-event'

vi.mock('@/components/asset-location-picker', () => ({ AssetLocationPicker: () => null }))
afterEach(cleanup)

it('displays readable select labels while submitting the original API enum values', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  render(<AssetForm mode="edit" initialValues={{
    name: 'Test', type: 'pipe', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-01', last_inspected_at: null, notes: '',
  }} onSubmit={onSubmit} />)
  expect(screen.getByRole('combobox', { name: 'Type' }).textContent).toContain('Pipe')
  expect(screen.getByRole('combobox', { name: 'Status' }).textContent).toContain('OK')
  await user.click(screen.getByRole('combobox', { name: 'Type' }))
  await user.click(await screen.findByRole('option', { name: 'Sensor' }))
  await user.click(screen.getByRole('combobox', { name: 'Status' }))
  await user.click(await screen.findByRole('option', { name: 'Critical' }))
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ type: 'sensor', status: 'critical' }))
})

it.each(['create', 'edit'] as const)('shows an actionable inspection error in %s mode and allows correction', async (mode) => {
  const onSubmit = vi.fn()
  render(<AssetForm mode={mode} initialValues={{
    name: 'Test', type: 'pipe', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-10T12:00:00.000Z', last_inspected_at: null, notes: '',
  }} onSubmit={onSubmit} />)
  fireEvent.change(screen.getByLabelText('Last inspected date'), { target: { value: '2026-01-09' } })
  fireEvent.click(screen.getByRole('button', { name: mode === 'create' ? 'Create asset' : 'Save changes' }))
  await screen.findByText(INSPECTION_DATE_ERROR)
  expect(screen.getByLabelText('Last inspected date').getAttribute('aria-invalid')).toBe('true')
  expect(onSubmit).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Last inspected date'), { target: { value: '2026-01-11' } })
  fireEvent.click(screen.getByRole('button', { name: mode === 'create' ? 'Create asset' : 'Save changes' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
})

it('validates a changed inspection date against the full unchanged installation timestamp', async () => {
  const onSubmit = vi.fn()
  render(<AssetForm mode="edit" initialValues={{
    name: 'Test', type: 'pipe', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-10T12:00:00.000Z', last_inspected_at: null, notes: '',
  }} onSubmit={onSubmit} />)
  fireEvent.change(screen.getByLabelText('Last inspected date'), { target: { value: '2026-01-10' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
  await screen.findByText(INSPECTION_DATE_ERROR)
  expect(onSubmit).not.toHaveBeenCalled()
})

it('displays server inspection validation errors at the field', async () => {
  render(<AssetForm mode="create" serverError={new AssetsApiError(
    'Invalid request body', 400, 'INVALID_REQUEST_BODY',
    { fieldErrors: { last_inspected_at: [INSPECTION_DATE_ERROR] } },
  )} />)
  await screen.findByText(INSPECTION_DATE_ERROR)
  expect(screen.getByLabelText('Last inspected date').getAttribute('aria-invalid')).toBe('true')
})

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
