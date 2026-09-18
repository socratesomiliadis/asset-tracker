import type { Asset, UpdateAssetInput } from '@asset-tracker/shared'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { AssetForm } from '@/components/asset-form'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
    <Drawer
      open={Boolean(asset)}
      swipeDirection="right"
      onOpenChange={(open) => {
        if (!open) closeDrawer()
      }}
    >
      <DrawerContent className="sm:[--drawer-content-width:36rem]">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close edit asset form"
          className="absolute top-3 right-3 z-10"
          disabled={updateAsset.isPending}
          onClick={closeDrawer}
        >
          <X />
        </Button>
        <DrawerHeader className="border-b pb-4 pr-14">
          <DrawerTitle>Edit asset</DrawerTitle>
          <DrawerDescription>
            Update asset information and its map location.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {updateAsset.isError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {updateAsset.error.message}
            </div>
          )}

          {asset && (
            <AssetForm
              mode="edit"
              initialValues={asset}
              isSubmitting={updateAsset.isPending}
              submitLabel={updateAsset.isPending ? 'Saving…' : 'Save changes'}
              onSubmit={submitAsset}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
