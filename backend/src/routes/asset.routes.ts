import { assetQueryParamsSchema } from '@asset-tracker/shared'
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
