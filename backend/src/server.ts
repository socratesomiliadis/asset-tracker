import { app } from './bootstrap.js'
import { env } from './config.js'
import { pool } from './db/index.js'
import { initializeAssets } from './db/initialize.js'

try {
  const result = await initializeAssets()
  console.log(`Asset initialization: ${result}`)
} catch (error) {
  console.error('Asset initialization failed; API was not started', error)
  await pool.end()
  process.exit(1)
}

const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
})

const shutdown = async () => {
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
