import cors from 'cors'
import express from 'express'
import { env } from './config.js'
import { assetRouter } from './routes/asset.routes.js'
import { healthRouter } from './routes/health.routes.js'

export const app = express()

app.use(cors({ origin: env.CORS_ORIGIN }))
app.use(express.json())

app.use('/api/health', healthRouter)
app.use('/api/assets', assetRouter)

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error)
    response.status(500).json({ error: 'Internal server error' })
  },
)
