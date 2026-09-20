import { afterEach, expect, it, vi } from 'vitest'
import { getAsset, getAssets, getMapAssets, createAsset, updateAsset, deleteAsset } from './assets-api'

const asset = {
  id: '17fc695a-07a0-4a6e-8822-e8f36c031199', name: 'Sensor', type: 'sensor', status: 'ok',
  lat: 40, lng: -70, installed_at: '2026-01-01T00:00:00.000Z', last_inspected_at: null, notes: '',
} as const
const { id, ...input } = asset
const page = { data: [asset], meta: { total: 1, limit: 25, offset: 0 } }

function reply(body: unknown, status = 200) {
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(JSON.stringify(body), { status })))
}
afterEach(() => vi.unstubAllGlobals())

it('validates full and map responses while preserving query serialization and cancellation', async () => {
  reply(page)
  const signal = new AbortController().signal
  expect(await getAssets({ limit: 25, offset: 0, status: 'ok' }, signal)).toEqual(page)
  expect(fetch).toHaveBeenCalledWith('/api/assets?limit=25&offset=0&status=ok', { signal })
  const { installed_at: _installed, last_inspected_at: _inspected, notes: _notes, ...point } = asset
  const points = { ...page, data: [point] }
  reply(points)
  expect(await getMapAssets({ limit: 25, offset: 0 })).toEqual(points)
})

it.each([
  { ...page, meta: { ...page.meta, total: '1' } },
  { ...page, data: [{ ...asset, lat: '40' }] },
  { ...page, data: [{ ...asset, installed_at: 'invalid' }] },
  { data: [asset] },
])('rejects a malformed successful page before it reaches components', async (body) => {
  reply(body)
  await expect(getAssets({ limit: 25, offset: 0 })).rejects.toMatchObject({ code: 'INVALID_RESPONSE', status: 200 })
})

it('validates detail and mutation responses and handles bodyless deletes', async () => {
  reply(asset)
  expect(await getAsset(id)).toEqual(asset)
  expect(await createAsset(input)).toEqual(asset)
  expect(await updateAsset(id, { notes: 'Updated' })).toEqual(asset)
  reply({ id })
  await expect(createAsset(input)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  await expect(updateAsset(id, { notes: 'Updated' })).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
  await expect(deleteAsset(id)).resolves.toBeUndefined()
})

it('handles malformed JSON and malformed error envelopes with controlled errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Wrong upstream</html>')))
  await expect(getAsset(id)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  reply({ error: { message: { unexpected: true } } }, 502)
  await expect(getAsset(id)).rejects.toMatchObject({ message: 'Failed to load asset details', status: 502 })
  reply({ error: { code: 'INVALID_REQUEST_BODY', message: 'Check inspection', details: { fieldErrors: {} } } }, 400)
  await expect(updateAsset(id, { notes: '' })).rejects.toMatchObject({
    code: 'INVALID_REQUEST_BODY', message: 'Check inspection', details: { fieldErrors: {} },
  })
})
