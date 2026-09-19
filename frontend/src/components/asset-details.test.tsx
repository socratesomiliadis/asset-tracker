import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { Asset } from '@asset-tracker/shared'
import { AssetDetails } from './asset-details'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it.each([1366, 1440])('uses non-modal details at %ipx and targets actions at the newly selected asset', (width) => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: width >= Number(query.match(/([\d.]+)rem/)?.[1]) * 16,
    addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }))
  const asset: Asset = { id: 'a', name: 'First asset', type: 'sensor', status: 'ok', lat: 40, lng: -70,
    installed_at: '2026-01-01', last_inspected_at: null, notes: 'Maintenance notes' }
  const onEdit = vi.fn(), onDelete = vi.fn(), onClose = vi.fn()
  const { rerender } = render(<AssetDetails asset={asset} onEdit={onEdit} onDelete={onDelete} onClose={onClose} />)
  expect(screen.queryByRole('dialog')).toBeNull()
  const details = within(screen.getByRole('complementary', { name: 'Asset details' }))
  expect(details.getByRole('heading', { name: 'First asset' })).toBeTruthy()
  const next = { ...asset, id: 'b', name: 'Second asset' }
  rerender(<AssetDetails asset={next} onEdit={onEdit} onDelete={onDelete} onClose={onClose} />)
  expect(details.getByRole('heading', { name: 'Second asset' })).toBeTruthy()
  fireEvent.click(details.getByRole('button', { name: 'Edit' }))
  fireEvent.click(details.getByRole('button', { name: 'Delete' }))
  expect(onEdit).toHaveBeenCalledExactlyOnceWith(next)
  expect(onDelete).toHaveBeenCalledExactlyOnceWith(next)
  fireEvent.click(details.getByRole('button', { name: 'Close' }))
  expect(onClose).toHaveBeenCalledOnce()
})
