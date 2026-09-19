import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { Asset } from '@asset-tracker/shared'
import type { ComponentProps } from 'react'
import type { AssetMap } from '@/components/asset-map'
import { AssetsPage } from './assets.page'

// These tests exercise the real controls, list, details, and request serialization.
// Maps are unrelated to these interactions and need no WebGL implementation.
vi.mock('@/components/asset-map', () => ({
  AssetMap: ({ onSearchArea }: ComponentProps<typeof AssetMap>) => <>
    <button onClick={() => onSearchArea({ minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 })}>Search this area</button>
  </>,
}))
vi.mock('@/components/asset-location-picker', () => ({ AssetLocationPicker: () => null }))

const asset: Asset = {
  id: '17fc695a-07a0-4a6e-8822-e8f36c031199',
  name: 'North sensor',
  type: 'sensor',
  status: 'warning',
  lat: 40,
  lng: -70,
  installed_at: '2026-01-01',
  last_inspected_at: null,
  notes: 'Check the pressure reading.',
}
const fetchMock = vi.fn<typeof fetch>()
let client: QueryClient
let user: ReturnType<typeof userEvent.setup>

beforeEach(() => {
  user = userEvent.setup()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  fetchMock.mockImplementation(async () => new Response(JSON.stringify({
    data: [asset],
    meta: { total: 1, limit: 25, offset: 0 },
  }), { headers: { 'Content-Type': 'application/json' } }))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  cleanup()
  client.clear()
  fetchMock.mockReset()
  vi.unstubAllGlobals()
})

function mount() {
  render(<QueryClientProvider client={client}><AssetsPage /></QueryClientProvider>)
}

async function chooseFilter(label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

function latestRequest() {
  return new URL(String(fetchMock.mock.lastCall?.[0]), 'http://localhost').searchParams
}

it('keeps area removal in the filter controls without resetting type or status', async () => {
  mount()
  await screen.findByRole('button', { name: /North sensor/ })
  expect(screen.queryByText('Area filter active')).toBeNull()
  await chooseFilter('Filter by asset type', 'Sensor')
  await chooseFilter('Filter by asset status', 'Warning')
  for (const action of ['Remove area filter']) {
    await user.click(screen.getByRole('button', { name: 'Search this area' }))
    expect(screen.getByText('Area filter active')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Clear area filter' })).toBeNull()
    expect(screen.getAllByRole('button', { name: 'Clear all filters' })).toHaveLength(1)
    await waitFor(() => expect(latestRequest().get('minLat')).toBe('0'))
    await user.click(screen.getByRole('button', { name: action }))
    expect(screen.queryByText('Area filter active')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear area filter' })).toBeNull()
    await waitFor(() => {
      expect(latestRequest().get('type')).toBe('sensor')
      expect(latestRequest().get('status')).toBe('warning')
      for (const bound of ['minLat', 'maxLat', 'minLng', 'maxLng']) expect(latestRequest().has(bound)).toBe(false)
    })
  }
})

it('sends the selected type and status, and removes filters when reset', async () => {
  mount()
  await screen.findByRole('button', { name: /North sensor/ })
  expect(latestRequest().has('type')).toBe(false)
  expect(latestRequest().has('status')).toBe(false)

  await chooseFilter('Filter by asset type', 'Sensor')
  await waitFor(() => expect(latestRequest().get('type')).toBe('sensor'))

  await chooseFilter('Filter by asset status', 'Warning')
  await waitFor(() => {
    expect(latestRequest().get('type')).toBe('sensor')
    expect(latestRequest().get('status')).toBe('warning')
    expect(latestRequest().get('offset')).toBe('0')
  })

  await chooseFilter('Filter by asset type', 'All types')
  await waitFor(() => {
    expect(latestRequest().has('type')).toBe(false)
    expect(latestRequest().get('status')).toBe('warning')
  })

  await chooseFilter('Filter by asset status', 'All statuses')
  await waitFor(() => {
    expect(latestRequest().has('type')).toBe(false)
    expect(latestRequest().has('status')).toBe(false)
  })
})

it('opens the selected asset details and lets the user close them', async () => {
  mount()
  expect(screen.queryByRole('dialog')).toBeNull()
  await user.click(await screen.findByRole('button', { name: /North sensor/ }))

  const details = within(await screen.findByRole('dialog', { name: 'North sensor' }))
  expect(details.getByText('Check the pressure reading.')).toBeTruthy()
  expect(details.getByText('Not yet inspected')).toBeTruthy()
  expect(details.getByText('40.000000, -70.000000')).toBeTruthy()

  await user.click(details.getByRole('button', { name: 'Close' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByRole('button', { name: /North sensor/ }).getAttribute('aria-pressed')).toBe('false')
})

it('PATCHes only notes and preserves the original installation and inspection timestamps', async () => {
  const original = {
    ...asset,
    installed_at: '2026-01-01T12:34:56.789Z',
    last_inspected_at: '2026-02-03T09:10:11.123Z',
  }
  let saved = { ...original }
  fetchMock.mockImplementation(async (_url, options) => {
    if (options?.method === 'PATCH') {
      saved = { ...saved, ...JSON.parse(String(options.body)) }
      return new Response(JSON.stringify(saved))
    }
    return new Response(JSON.stringify({
      data: [saved], meta: { total: 1, limit: 25, offset: 0 },
    }))
  })

  mount()
  await user.click(await screen.findByRole('button', { name: /North sensor/ }))
  await user.click(screen.getByRole('button', { name: 'Edit' }))
  const form = within(await screen.findByRole('dialog', { name: 'Edit asset' }))
  await user.clear(form.getByLabelText('Notes'))
  await user.type(form.getByLabelText('Notes'), 'Pressure reading checked.')
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  await waitFor(() => {
    const patches = fetchMock.mock.calls.filter(([, options]) => options?.method === 'PATCH')
    expect(patches).toHaveLength(1)
    expect(patches[0]?.[0]).toBe(`/api/assets/${asset.id}`)
    expect(JSON.parse(String(patches[0]?.[1]?.body))).toEqual({ notes: 'Pressure reading checked.' })
    expect(saved).toEqual({ ...original, notes: 'Pressure reading checked.' })
  })
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Edit asset' })).toBeNull())
  const details = within(await screen.findByRole('dialog', { name: 'North sensor' }))
  expect(details.getByText('Pressure reading checked.')).toBeTruthy()
})
