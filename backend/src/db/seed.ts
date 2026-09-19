import { initializeAssets } from './initialize.js'
import { pool } from './index.js'

initializeAssets()
  .then((result) => console.log(`Asset initialization: ${result}`))
  .catch((error: unknown) => {
    console.error('Database initialization failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
