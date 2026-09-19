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
      <DrawerContent className="data-[swipe-axis=x]:[--drawer-content-width:calc(100vw-1rem)] data-[swipe-axis=x]:sm:[--drawer-content-width:36rem] data-[swipe-axis=x]:lg:[--drawer-content-width:44rem]">
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
        <DrawerHeader className="shrink-0 border-b pb-4 pr-14">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {error && (
            <div
              role="alert"
              className="mx-4 mt-4 max-h-24 shrink-0 overflow-y-auto rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
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
