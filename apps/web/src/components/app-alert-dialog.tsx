import type { ReactNode } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"

type AppAlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
}

export const AppAlertDialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}: AppAlertDialogProps) => (
  <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="dialog-backdrop" />
      <AlertDialog.Popup className="dialog-card">
        <div className="section-header">
          <AlertDialog.Title>{title}</AlertDialog.Title>
        </div>
        <AlertDialog.Description className="alert-dialog-description">
          {description}
        </AlertDialog.Description>
        <div className="dialog-actions">{children}</div>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  </AlertDialog.Root>
)
