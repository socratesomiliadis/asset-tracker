import type { ErrorRequestHandler } from 'express'
import { ApiError } from '../errors/api.error.js'

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
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
