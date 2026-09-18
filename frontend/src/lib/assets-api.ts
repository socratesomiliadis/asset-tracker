import type {
  Asset,
  AssetStatus,
  AssetType,
  CreateAssetInput,
} from '@asset-tracker/shared'

type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

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
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null

  return new AssetsApiError(
    body?.error?.message ?? fallbackMessage,
    response.status,
    body?.error?.code,
    body?.error?.details,
  )
}

export type GetAssetsParams = {
  type?: AssetType
  status?: AssetStatus
  minLat?: number
  maxLat?: number
  minLng?: number
  maxLng?: number
  limit: number
  offset: number
}

export type AssetPage = {
  data: Asset[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

export async function getAssets(params: GetAssetsParams): Promise<AssetPage> {
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

  const response = await fetch(`/api/assets?${query}`)

  if (!response.ok) {
    throw await getApiError(response, 'Failed to load assets')
  }

  return response.json() as Promise<AssetPage>
}

export async function createAsset(input: CreateAssetInput): Promise<Asset> {
  const response = await fetch('/api/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await getApiError(response, 'Failed to create asset')
  }

  return response.json() as Promise<Asset>
}
