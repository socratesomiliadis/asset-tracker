import { afterEach, expect, it, vi } from 'vitest'

const startup = vi.hoisted(() => ({ initialize: vi.fn(), listen: vi.fn(), end: vi.fn() }))
vi.mock('./app.js', () => ({ app: { listen: startup.listen } }))
vi.mock('./config.js', () => ({ env: { PORT: 3001 } }))
vi.mock('./db/index.js', () => ({ pool: { end: startup.end } }))
vi.mock('./db/initialize.js', () => ({ initializeAssets: startup.initialize }))

afterEach(() => { vi.restoreAllMocks(); vi.resetAllMocks(); vi.resetModules() })

it('does not listen until initialization succeeds', async () => {
  const initialization = Promise.withResolvers<string>()
  startup.initialize.mockReturnValue(initialization.promise)
  vi.spyOn(process, 'on').mockReturnValue(process)
  vi.spyOn(console, 'log').mockImplementation(() => {})
  const loading = import('./server.js')
  await vi.waitFor(() => expect(startup.initialize).toHaveBeenCalledOnce())
  expect(startup.listen).not.toHaveBeenCalled()
  initialization.resolve('seeded')
  await loading
  expect(startup.listen).toHaveBeenCalledWith(3001, expect.any(Function))
})

it('closes the pool and exits without listening when initialization fails', async () => {
  startup.initialize.mockRejectedValue(new Error('Invalid seed'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
  await expect(import('./server.js')).rejects.toThrow('exit')
  expect(startup.end).toHaveBeenCalledOnce()
  expect(process.exit).toHaveBeenCalledWith(1)
  expect(startup.listen).not.toHaveBeenCalled()
})
