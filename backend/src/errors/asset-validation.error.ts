// Domain validation is independent of HTTP status codes and response envelopes.
export class AssetValidationError extends Error {
  constructor(readonly details: { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> }) {
    super('Invalid asset values')
    this.name = 'AssetValidationError'
  }
}
