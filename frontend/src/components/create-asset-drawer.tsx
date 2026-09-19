import type { Asset, CreateAssetInput } from '@asset-tracker/shared'
import { toast } from 'sonner'
import { AssetForm } from '@/components/asset-form'
import { AssetFormDrawer } from '@/components/asset-form-drawer'
import { useCreateAsset } from '@/hooks/use-create-asset'

type CreateAssetDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (asset: Asset) => void
}

export function CreateAssetDrawer({
  open,
  onOpenChange,
  onCreated,
}: CreateAssetDrawerProps) {
  const createAsset = useCreateAsset()

  const closeDrawer = () => {
    if (createAsset.isPending) return
    createAsset.reset()
    onOpenChange(false)
  }

  const submitAsset = (values: CreateAssetInput) => {
    createAsset.mutate(values, {
      onSuccess: (asset) => {
        toast.success('Asset created', {
          description: `${asset.name} has been saved.`,
        })
        onCreated(asset)
      },
      onError: (error) => {
        toast.error('Could not create asset', {
          description: error.message,
        })
      },
    })
  }

  return (
    <AssetFormDrawer
      open={open}
      onClose={closeDrawer}
      title="Create asset"
      description="Add an infrastructure asset and choose its map location."
      closeLabel="Close create asset form"
      isPending={createAsset.isPending}
      error={createAsset.error}
    >
      {open && (
        <AssetForm
          mode="create"
          isSubmitting={createAsset.isPending}
          submitLabel={createAsset.isPending ? 'Creating…' : 'Create asset'}
          onSubmit={submitAsset}
        />
      )}
    </AssetFormDrawer>
  )
}
