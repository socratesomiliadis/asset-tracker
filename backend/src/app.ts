import cors from 'cors'
import express from 'express'
import { errorHandler } from './middleware/error.middleware.js'
import { createAssetRouter } from './routes/asset.routes.js'
import type { AssetOperations } from './services/asset.service.js'
import { healthRouter } from './routes/health.routes.js'

export function createApp({ assetService, corsOrigin }: {
  assetService: AssetOperations
  corsOrigin: string
}) {
  const app = express()

  app.use(cors({ origin: corsOrigin }))
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/assets', createAssetRouter(assetService))

  app.use(errorHandler)
  return app
}
