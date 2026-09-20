type AssetResultsSummaryProps = {
  total?: number
  hasActiveAreaSearch: boolean
  isError: boolean
  isFetching: boolean
}

export function AssetResultsSummary({
  total, hasActiveAreaSearch, isError, isFetching,
}: AssetResultsSummaryProps) {
  const message = isError
    ? 'Assets unavailable'
    : total === undefined
      ? 'Loading assets…'
      : `${total} matching ${total === 1 ? 'asset' : 'assets'}`

  return (
    <p className="flex flex-wrap items-baseline gap-x-1 text-xs text-muted-foreground">
      <span>{message}</span>
      <span aria-hidden="true">·</span>
      <span>{hasActiveAreaSearch ? 'Searched area' : 'All locations'}</span>
      {!isError && isFetching && total !== undefined && <span role="status">Updating…</span>}
    </p>
  )
}
