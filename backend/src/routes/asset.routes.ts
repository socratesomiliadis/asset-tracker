import {
  assetIdSchema,
  assetQueryParamsSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
} from '@asset-tracker/shared'
import { Router } from 'express'
import { ApiError } from '../errors/api.error.js'
import { assetService } from '../services/asset.service.js'

const DEFAULT_LIMIT = 50
const DEFAULT_OFFSET = 0

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
    limit: parsed.data.limit ?? DEFAULT_LIMIT,
    offset: parsed.data.offset ?? DEFAULT_OFFSET,
  }
  const result = await assetService.findMany(query)

  response.json({
    data: result.data,
    meta: {
      total: result.total,
      limit: query.limit,
      offset: query.offset,
    },
  })
})

assetRouter.get('/:id', async (request, response) => {
  const parsedId = assetIdSchema.safeParse(request.params.id)

  if (!parsedId.success) {
    throw new ApiError(400, 'INVALID_ASSET_ID', 'Invalid asset ID')
  }

  const asset = await assetService.findById(parsedId.data)

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
  const parsedId = assetIdSchema.safeParse(request.params.id)
  const parsedBody = updateAssetInputSchema.safeParse(request.body)

  if (!parsedId.success) {
    throw new ApiError(400, 'INVALID_ASSET_ID', 'Invalid asset ID')
  }

  if (!parsedBody.success) {
    throw new ApiError(
      400,
      'INVALID_REQUEST_BODY',
      'Invalid request body',
      parsedBody.error.flatten(),
    )
  }

  const asset = await assetService.update(parsedId.data, parsedBody.data)

  if (!asset) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset not found')
  }

  response.json(asset)
})

assetRouter.delete('/:id', async (request, response) => {
  const parsedId = assetIdSchema.safeParse(request.params.id)

  if (!parsedId.success) {
    throw new ApiError(400, 'INVALID_ASSET_ID', 'Invalid asset ID')
  }

  const deleted = await assetService.delete(parsedId.data)

  if (!deleted) {
    throw new ApiError(404, 'ASSET_NOT_FOUND', 'Asset not found')
  }

  response.status(204).send()
})
