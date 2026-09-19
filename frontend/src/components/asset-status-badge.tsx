import type { AssetStatus } from '@asset-tracker/shared'
import { Badge } from '@/components/ui/badge'

const statusStyles = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  critical: 'border-red-200 bg-red-50 text-red-700',
} satisfies Record<AssetStatus, string>

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      {status}
    </Badge>
  )
}
