import { config } from 'dotenv'
import { z } from 'zod'

config({ path: new URL('../../.env', import.meta.url) })

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://asset_tracker:asset_tracker@localhost:5432/asset_tracker'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
})

export const env = envSchema.parse(process.env)
