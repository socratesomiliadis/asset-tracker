import type {
  Asset,
  AssetQueryParams,
  CreateAssetInput,
  UpdateAssetInput,
} from '@asset-tracker/shared'
import { assetRepository } from '../repositories/asset.repository.js'

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

  update(id: string, input: UpdateAssetInput): Promise<Asset | null> {
    return assetRepository.update(id, input)
  }

  delete(id: string): Promise<boolean> {
    return assetRepository.delete(id)
  }
}

export const assetService = new AssetService()
