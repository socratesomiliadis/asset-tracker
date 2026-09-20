import { expect, it, vi } from 'vitest'
import type { Asset } from '@asset-tracker/shared'
import { AssetValidationError } from '../errors/asset-validation.error.js'
import { AssetService, type AssetStore } from './asset.service.js'

const asset: Asset = {
  id: '17fc695a-07a0-4a6e-8822-e8f36c031199', name: 'Sensor', type: 'sensor', status: 'ok',
  lat: 40, lng: -70, installed_at: '2026-01-10', last_inspected_at: '2026-02-10', notes: '',
}
function store(): AssetStore {
  return {
    findById: vi.fn().mockResolvedValue(asset), findMany: vi.fn(), findMapPoints: vi.fn(),
    count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
  }
}

it('validates stored and changed values together without coupling domain errors to HTTP', async () => {
  const repository = store()
  const service = new AssetService(repository)
  await expect(service.update(asset.id, { installed_at: '2026-03-01' })).rejects.toBeInstanceOf(AssetValidationError)
  expect(repository.update).not.toHaveBeenCalled()
})

it('uses the supplied store and only writes the requested fields', async () => {
  const repository = store()
  const otherRepository = store()
  await new AssetService(repository).update(asset.id, { notes: 'Checked' })
  expect(repository.update).toHaveBeenCalledExactlyOnceWith(asset.id, { notes: 'Checked' })
  expect(otherRepository.findById).not.toHaveBeenCalled()
})
