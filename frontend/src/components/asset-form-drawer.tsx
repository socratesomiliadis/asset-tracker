import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'

type AssetFormDrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  description: string
  closeLabel: string
  isPending: boolean
  error?: Error | null
  children: ReactNode
}

export function AssetFormDrawer({
  open,
  onClose,
  title,
  description,
  closeLabel,
  isPending,
  error,
  children,
}: AssetFormDrawerProps) {
  return (
    <Drawer
      open={open}
      swipeDirection="right"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
    >
      <DrawerContent className="sm:[--drawer-content-width:36rem]">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={closeLabel}
          className="absolute top-3 right-3 z-10"
          disabled={isPending}
          onClick={onClose}
        >
          <X />
        </Button>
        <DrawerHeader className="border-b pb-4 pr-14">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error.message}
            </div>
          )}
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
