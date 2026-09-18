import type { Asset } from '@asset-tracker/shared'
import { TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteAsset } from '@/hooks/use-delete-asset'

type DeleteAssetDialogProps = {
  asset?: Asset
  onClose: () => void
  onDeleted: () => void
}

export function DeleteAssetDialog({
  asset,
  onClose,
  onDeleted,
}: DeleteAssetDialogProps) {
  const deleteAsset = useDeleteAsset()

  const closeDialog = () => {
    if (deleteAsset.isPending) return
    deleteAsset.reset()
    onClose()
  }

  const confirmDelete = () => {
    if (!asset) return

    deleteAsset.mutate(asset.id, {
      onSuccess: () => {
        toast.success('Asset deleted', {
          description: `${asset.name} has been removed.`,
        })
        onDeleted()
      },
      onError: (error) => {
        toast.error('Could not delete asset', {
          description: error.message,
        })
      },
    })
  }

  return (
    <AlertDialog
      open={Boolean(asset)}
      onOpenChange={(open) => {
        if (!open) closeDialog()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <TriangleAlert />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete {asset?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the asset and its stored information. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {deleteAsset.isError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {deleteAsset.error.message}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAsset.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleteAsset.isPending}
            onClick={confirmDelete}
          >
            {deleteAsset.isPending ? 'Deleting…' : 'Delete asset'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
