import type {
  Asset,
  AssetQueryParams,
  CreateAssetInput,
  UpdateAssetInput,
} from '@asset-tracker/shared'
import { assetRepository } from '../repositories/asset.repository.js'
import { createAssetInputSchema } from '@asset-tracker/shared'
import { ApiError } from '../errors/api.error.js'

export class AssetService {
  async findMany(params: AssetQueryParams): Promise<{
    data: Asset[]
    total: number
  }> {
    const [data, total] = await Promise.all([
      assetRepository.findMany(params),
      assetRepository.count(params),
    ])

    return { data, total }
  }

  findById(id: string): Promise<Asset | null> {
    return assetRepository.findById(id)
  }

  create(input: CreateAssetInput): Promise<Asset> {
    return assetRepository.create(input)
  }

  async update(id: string, input: UpdateAssetInput): Promise<Asset | null> {
    const existing = await assetRepository.findById(id)
    if (!existing) return null
    const { id: _id, ...values } = existing
    const parsed = createAssetInputSchema.safeParse({ ...values, ...input })
    if (!parsed.success) {
      throw new ApiError(400, 'INVALID_REQUEST_BODY', 'Invalid request body', parsed.error.flatten())
    }
    // Validate the merged state, but only write the fields supplied by the caller.
    return assetRepository.update(id, input)
  }

  delete(id: string): Promise<boolean> {
    return assetRepository.delete(id)
  }
}

export const assetService = new AssetService()
