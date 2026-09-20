import { createApp } from './app.js'
import { env } from './config.js'
import { assetRepository } from './repositories/asset.repository.js'
import { AssetService } from './services/asset.service.js'

// The application's only composition root; tests supply their own dependencies.
export const app = createApp({
  assetService: new AssetService(assetRepository),
  corsOrigin: env.CORS_ORIGIN,
})
