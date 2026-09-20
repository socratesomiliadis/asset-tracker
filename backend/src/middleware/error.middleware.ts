import type { ErrorRequestHandler } from 'express'
import { ApiError } from '../errors/api.error.js'
import { AssetValidationError } from '../errors/asset-validation.error.js'
import { INSPECTION_DATE_ERROR } from '@asset-tracker/shared'

function isInspectionConstraintError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ('code' in error && error.code === '23514' &&
      'constraint' in error && error.constraint === 'assets_inspection_after_installation') return true
  return 'cause' in error && error.cause !== error && isInspectionConstraintError(error.cause)
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof AssetValidationError) {
    error = new ApiError(400, 'INVALID_REQUEST_BODY', 'Invalid request body', error.details)
  }
  // Keep the database guard effective, including when concurrent edits race validation.
  if (isInspectionConstraintError(error)) {
    error = new ApiError(400, 'INVALID_REQUEST_BODY', INSPECTION_DATE_ERROR, {
      formErrors: [],
      fieldErrors: { last_inspected_at: [INSPECTION_DATE_ERROR] },
    })
  }
  if (error instanceof ApiError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    })
    return
  }

  const errorType =
    error && typeof error === 'object' && 'type' in error ? error.type : undefined

  if (errorType === 'entity.too.large') {
    response.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Asset data is too large. Shorten the notes and try again.',
      },
    })
    return
  }

  if (errorType === 'entity.parse.failed') {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' },
    })
    return
  }

  console.error(error)
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred',
    },
  })
}
