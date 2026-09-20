import type {
  Asset,
  AssetQueryParams,
  CreateAssetInput,
  UpdateAssetInput,
} from '@asset-tracker/shared'
import type { AssetRepository } from '../repositories/asset.repository.js'
import { createAssetInputSchema } from '@asset-tracker/shared'
import { AssetValidationError } from '../errors/asset-validation.error.js'

export type AssetStore = Pick<AssetRepository, 'findMapPoints' | 'findMany' | 'count' | 'findById' | 'create' | 'update' | 'delete'>

export class AssetService {
  constructor(private readonly repository: AssetStore) {}

  async findMapPoints(params: AssetQueryParams) {
    const [data, total] = await Promise.all([
      this.repository.findMapPoints(params), this.repository.count(params),
    ])
    return { data, total }
  }

  async findMany(params: AssetQueryParams): Promise<{
    data: Asset[]
    total: number
  }> {
    const [data, total] = await Promise.all([
      this.repository.findMany(params),
      this.repository.count(params),
    ])

    return { data, total }
  }

  findById(id: string): Promise<Asset | null> {
    return this.repository.findById(id)
  }

  create(input: CreateAssetInput): Promise<Asset> {
    return this.repository.create(input)
  }

  async update(id: string, input: UpdateAssetInput): Promise<Asset | null> {
    const existing = await this.repository.findById(id)
    if (!existing) return null
    const { id: _id, ...values } = existing
    const parsed = createAssetInputSchema.safeParse({ ...values, ...input })
    if (!parsed.success) {
      throw new AssetValidationError(parsed.error.flatten())
    }
    // Validate the merged state, but only write the fields supplied by the caller.
    return this.repository.update(id, input)
  }

  delete(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}

export type AssetOperations = Pick<AssetService, 'findMapPoints' | 'findMany' | 'findById' | 'create' | 'update' | 'delete'>
