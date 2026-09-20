import type {
  Asset,
  AssetPage,
  MapAssetPage,
  AssetQueryParams,
  CreateAssetInput,
  UpdateAssetInput,
} from '@asset-tracker/shared'
import { assetSchema, assetPageSchema, mapAssetPageSchema } from '@asset-tracker/shared'
import { z } from 'zod'

const apiErrorSchema = z.object({ error: z.object({
  code: z.string().optional(), message: z.string().optional(), details: z.unknown().optional(),
}) })

export class AssetsApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(
    message: string,
    status: number,
    code = 'UNKNOWN_ERROR',
    details?: unknown,
  ) {
    super(message)
    this.name = 'AssetsApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

async function getApiError(response: Response, fallbackMessage: string) {
  const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null))
  const body = parsed.success ? parsed.data : undefined

  return new AssetsApiError(
    body?.error?.message ?? fallbackMessage,
    response.status,
    body?.error?.code,
    body?.error?.details,
  )
}

async function readAssetResponse<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
  const parsed = schema.safeParse(await response.json().catch(() => null))
  if (!parsed.success) {
    throw new AssetsApiError('The server returned invalid asset data. Try again.', response.status, 'INVALID_RESPONSE')
  }
  return parsed.data
}

export type GetAssetsParams = Pick<
  AssetQueryParams,
  'type' | 'status' | 'minLat' | 'maxLat' | 'minLng' | 'maxLng'
> & Required<Pick<AssetQueryParams, 'limit' | 'offset'>>

export type AssetFilterParams = Omit<GetAssetsParams, 'limit' | 'offset'>

export type { AssetPage } from '@asset-tracker/shared'

async function requestAssets(
  path: string,
  fallbackMessage: string,
  options?: RequestInit,
): Promise<Response> {
  const response = await fetch(`/api/assets${path}`, options)
  if (!response.ok) throw await getApiError(response, fallbackMessage)
  return response
}

function jsonBody(method: 'POST' | 'PATCH', input: CreateAssetInput | UpdateAssetInput): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }
}

function assetQueryString(params: GetAssetsParams) {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  })

  if (params.type) query.set('type', params.type)
  if (params.status) query.set('status', params.status)
  if (params.minLat !== undefined) query.set('minLat', String(params.minLat))
  if (params.maxLat !== undefined) query.set('maxLat', String(params.maxLat))
  if (params.minLng !== undefined) query.set('minLng', String(params.minLng))
  if (params.maxLng !== undefined) query.set('maxLng', String(params.maxLng))

  return query.toString()
}

export async function getAssets(params: GetAssetsParams, signal?: AbortSignal): Promise<AssetPage> {
  const response = await requestAssets(`?${assetQueryString(params)}`, 'Failed to load assets', { signal })
  return readAssetResponse(response, assetPageSchema)
}

export async function getMapAssets(params: GetAssetsParams, signal?: AbortSignal): Promise<MapAssetPage> {
  const response = await requestAssets(`/map?${assetQueryString(params)}`, 'Failed to load map assets', { signal })
  return readAssetResponse(response, mapAssetPageSchema)
}

export async function getAsset(id: string, signal?: AbortSignal): Promise<Asset> {
  const response = await requestAssets(`/${id}`, 'Failed to load asset details', { signal })
  return readAssetResponse(response, assetSchema)
}

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const response = await requestAssets('', 'Failed to create asset', jsonBody('POST', input))
  return readAssetResponse(response, assetSchema)
}

export async function updateAsset(id: string, input: UpdateAssetInput): Promise<Asset> {
  const response = await requestAssets(`/${id}`, 'Failed to update asset', jsonBody('PATCH', input))
  return readAssetResponse(response, assetSchema)
}

export async function deleteAsset(id: string): Promise<void> {
  await requestAssets(`/${id}`, 'Failed to delete asset', { method: 'DELETE' })
}
