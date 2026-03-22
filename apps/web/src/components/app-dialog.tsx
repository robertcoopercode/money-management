import type { ReactNode } from "react"
import { Dialog } from "@base-ui/react/dialog"

type AppDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  wide?: boolean
  children: ReactNode
}

export const AppDialog = ({
  open,
  onOpenChange,
  title,
  wide,
  children,
}: AppDialogProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Backdrop className="dialog-backdrop" />
      <Dialog.Popup
        className={wide ? "dialog-card dialog-card-wide" : "dialog-card"}
      >
        <div className="section-header">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close className="dialog-close-button" aria-label="Close">
            ×
          </Dialog.Close>
        </div>
        {children}
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
)
