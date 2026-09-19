import type { Asset, UpdateAssetInput } from '@asset-tracker/shared'
import { toast } from 'sonner'
import { AssetForm } from '@/components/asset-form'
import { AssetFormDrawer } from '@/components/asset-form-drawer'
import { useUpdateAsset } from '@/hooks/use-update-asset'

type EditAssetDrawerProps = {
  asset?: Asset
  onClose: () => void
  onUpdated: (asset: Asset) => void
}

export function EditAssetDrawer({
  asset,
  onClose,
  onUpdated,
}: EditAssetDrawerProps) {
  const updateAsset = useUpdateAsset()

  const closeDrawer = () => {
    if (updateAsset.isPending) return
    updateAsset.reset()
    onClose()
  }

  const submitAsset = (values: UpdateAssetInput) => {
    if (!asset) return

    updateAsset.mutate(
      { id: asset.id, input: values },
      {
        onSuccess: (updatedAsset) => {
          toast.success('Asset updated', {
            description: `${updatedAsset.name} has been saved.`,
          })
          onUpdated(updatedAsset)
        },
        onError: (error) => {
          toast.error('Could not update asset', {
            description: error.message,
          })
        },
      },
    )
  }

  return (
    <AssetFormDrawer
      open={Boolean(asset)}
      onClose={closeDrawer}
      title="Edit asset"
      description="Update asset information and its map location."
      closeLabel="Close edit asset form"
      isPending={updateAsset.isPending}
      error={updateAsset.error}
    >
      {asset && (
        <AssetForm
          mode="edit"
          serverError={updateAsset.error}
          initialValues={asset}
          isSubmitting={updateAsset.isPending}
          submitLabel={updateAsset.isPending ? 'Saving…' : 'Save changes'}
          onSubmit={submitAsset}
        />
      )}
    </AssetFormDrawer>
  )
}
