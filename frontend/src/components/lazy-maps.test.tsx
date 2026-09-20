import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, expect, it, vi } from 'vitest'
import { AssetForm } from './asset-form'
import { AssetsPage } from '@/pages/assets.page'

vi.mock('@/lib/map-runtime', () => ({}))
vi.mock('maplibre-gl', async (original) => ({
  ...await original<typeof import('maplibre-gl')>(),
  Map: class {
    constructor() { throw new Error('WebGL unavailable') }
  },
}))

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('keeps the list and asset details usable when the main map cannot initialize', async () => {
  const asset = {
    id: '17fc695a-07a0-4a6e-8822-e8f36c031199', name: 'North sensor',
    type: 'sensor', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-01', last_inspected_at: null, notes: 'Check pressure.',
  }
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    data: [asset], meta: { total: 1, limit: 25, offset: 0 },
  }))))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const onCaughtError = vi.fn()
  try {
    render(<QueryClientProvider client={client}><AssetsPage /></QueryClientProvider>, { onCaughtError })
    expect((await screen.findByRole('alert')).textContent).toContain('Map unavailable')
    expect(onCaughtError.mock.calls[0]?.[0].message).toBe('WebGL unavailable')
    fireEvent.click(await screen.findByRole('button', { name: /North sensor/ }))
    const details = within(await screen.findByRole('dialog', { name: 'North sensor' }))
    expect(details.getByText('Check pressure.')).toBeTruthy()
    expect(details.getByRole('button', { name: 'Edit' })).toBeTruthy()
  } finally {
    cleanup()
    client.clear()
  }
})

it('preserves the form draft and submits typed coordinates after the location map fails', async () => {
  const onSubmit = vi.fn()
  const onCaughtError = vi.fn()
  render(<AssetForm mode="create" initialValues={{
    name: 'New sensor', type: 'sensor', status: 'ok', installed_at: '2026-01-01',
  }} onSubmit={onSubmit} />, { onCaughtError })
  fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Unsaved inspection notes' } })
  expect((await screen.findByRole('alert')).textContent).toContain('Enter latitude and longitude below')
  expect(onCaughtError.mock.calls[0]?.[0].message).toBe('WebGL unavailable')
  expect((screen.getByLabelText('Notes') as HTMLTextAreaElement).value).toBe('Unsaved inspection notes')
  fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '40' } })
  fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '-70' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create asset' }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
    name: 'New sensor', type: 'sensor', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-01T00:00:00.000Z', last_inspected_at: null,
    notes: 'Unsaved inspection notes',
  }))
})
