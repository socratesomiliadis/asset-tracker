import { DEFAULT_ASSET_LIMIT, DEFAULT_ASSET_OFFSET } from '@asset-tracker/shared'
import {
  type AssetPage,
  assetIdSchema,
  assetQueryParamsSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
} from '@asset-tracker/shared'
import { Router } from 'express'
import { ApiError } from '../errors/api.error.js'
import { assetService } from '../services/asset.service.js'

function parseAssetId(value: unknown): string {
  const result = assetIdSchema.safeParse(value)
  if (!result.success) {
    throw new ApiError(400, 'INVALID_ASSET_ID', 'Invalid asset ID')
  }
  return result.data
}

export const assetRouter = Router()

assetRouter.get('/', async (request, response) => {
  const parsed = assetQueryParamsSchema.safeParse(request.query)

  if (!parsed.success) {
    throw new ApiError(
      400,
      'INVALID_QUERY_PARAMETERS',
      'Invalid query parameters',
      parsed.error.flatten(),
    )
  }

  const query = {
    ...parsed.data,
    limit: parsed.data.limit ?? DEFAULT_ASSET_LIMIT,
    offset: parsed.data.offset ?? DEFAULT_ASSET_OFFSET,
  }
  const result = await assetService.findMany(query)

  response.json({
    data: result.data,
    meta: {
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    },
  } satisfies AssetPage)
})

assetRouter.get('/:id', async (request, response) => {
  const assetId = parseAssetId(request.params.id)

  const asset = await assetService.findById(assetId)

  if (!asset) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset not found')
  }

  response.json(asset)
})

assetRouter.post('/', async (request, response) => {
  const parsed = createAssetInputSchema.safeParse(request.body)

  if (!parsed.success) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'Invalid request body',
      parsed.error.flatten(),
    )
  }

  const asset = await assetService.create(parsed.data)
  response.status(201).json(asset)
})

assetRouter.patch('/:id', async (request, response) => {
  const assetId = parseAssetId(request.params.id)
  const parsedBody = updateAssetInputSchema.safeParse(request.body)

  if (!parsedBody.success) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'Invalid request body',
      parsedBody.error.flatten(),
    )
  }

  const asset = await assetService.update(assetId, parsedBody.data)

  if (!asset) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset not found')
  }

  response.json(asset)
})

assetRouter.delete('/:id', async (request, response) => {
  const assetId = parseAssetId(request.params.id)

  const deleted = await assetService.delete(assetId)

  if (!deleted) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset not found')
  }

  response.status(204).send()
})
