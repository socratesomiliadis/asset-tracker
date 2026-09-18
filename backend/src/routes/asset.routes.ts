import {
  assetIdSchema,
  assetQueryParamsSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
} from '@asset-tracker/shared'
import { Router } from 'express'
import { assetService } from '../services/asset.service.js'

const DEFAULT_LIMIT = 50
const DEFAULT_OFFSET = 0

export const assetRouter = Router()

assetRouter.get('/', async (request, response) => {
  const parsed = assetQueryParamsSchema.safeParse(request.query)

  if (!parsed.success) {
    response.status(400).json({
      error: 'Invalid query parameters',
      message: parsed.error.issues[0]?.message,
      issues: parsed.error.flatten(),
    })
    return
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
    response.status(400).json({ error: 'Invalid asset ID' })
    return
  }

  const asset = await assetService.findById(parsedId.data)

  if (!asset) {
    response.status(404).json({ error: 'Asset not found' })
    return
  }

  response.json(asset)
})

assetRouter.post('/', async (request, response) => {
  const parsed = createAssetInputSchema.safeParse(request.body)

  if (!parsed.success) {
    response.status(400).json({
      error: 'Invalid asset',
      issues: parsed.error.flatten(),
    })
    return
  }

  const asset = await assetService.create(parsed.data)
  response.status(201).json(asset)
})

assetRouter.patch('/:id', async (request, response) => {
  const parsedId = assetIdSchema.safeParse(request.params.id)
  const parsedBody = updateAssetInputSchema.safeParse(request.body)

  if (!parsedId.success) {
    response.status(400).json({ error: 'Invalid asset ID' })
    return
  }

  if (!parsedBody.success) {
    response.status(400).json({
      error: 'Invalid asset update',
      issues: parsedBody.error.flatten(),
    })
    return
  }

  const asset = await assetService.update(parsedId.data, parsedBody.data)

  if (!asset) {
    response.status(404).json({ error: 'Asset not found' })
    return
  }

  response.json(asset)
})

assetRouter.delete('/:id', async (request, response) => {
  const parsedId = assetIdSchema.safeParse(request.params.id)

  if (!parsedId.success) {
    response.status(400).json({ error: 'Invalid asset ID' })
    return
  }

  const deleted = await assetService.delete(parsedId.data)

  if (!deleted) {
    response.status(404).json({ error: 'Asset not found' })
    return
  }

  response.status(204).send()
})
