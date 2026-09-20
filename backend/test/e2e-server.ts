import { createTestDatabase } from './database.js'

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL is required for the isolated browser test database.')
const database = await createTestDatabase(process.env.TEST_DATABASE_URL)
process.env.DATABASE_URL = database.url
let stop: (() => Promise<void>) | undefined
let shutdownPromise: Promise<void> | undefined
const shutdown = () => shutdownPromise ??= (async () => {
  await stop?.()
  await database.close()
})()
try {
  const { app } = await import('../src/bootstrap.js')
  const { pool } = await import('../src/db/index.js')
  const { initializeAssets } = await import('../src/db/initialize.js')
  stop = () => pool.end()
  await initializeAssets()
  const server = app.listen(3101, '127.0.0.1')
  stop = async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await pool.end()
  }
  server.on('error', (error) => { console.error(error); void shutdown().finally(() => process.exit(1)) })
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      void shutdown().then(() => process.exit(0), (error) => {
        console.error(error)
        process.exit(1)
      })
    })
  }
} catch (error) {
  await shutdown()
  throw error
}
