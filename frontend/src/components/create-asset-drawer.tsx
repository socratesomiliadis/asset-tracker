import type { Asset, CreateAssetInput } from '@asset-tracker/shared'
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
          description: `${asset.name} is now available in the asset list.`,
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
    <Drawer
      open={open}
      swipeDirection="right"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeDrawer()
      }}
    >
      <DrawerContent className="sm:[--drawer-content-width:36rem]">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close create asset form"
          className="absolute top-3 right-3 z-10"
          disabled={createAsset.isPending}
          onClick={closeDrawer}
        >
          <X />
        </Button>
        <DrawerHeader className="border-b pb-4 pr-14">
          <DrawerTitle>Create asset</DrawerTitle>
          <DrawerDescription>
            Add an infrastructure asset and choose its map location.
          </DrawerDescription>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {createAsset.isError && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {createAsset.error.message}
            </div>
          )}

          {open && (
            <AssetForm
              mode="create"
              isSubmitting={createAsset.isPending}
              submitLabel={createAsset.isPending ? 'Creating…' : 'Create asset'}
              onSubmit={submitAsset}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
