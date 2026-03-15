import { ContextMenu } from "@base-ui/react/context-menu"
import type { Transaction } from "../types.js"

type TransactionContextMenuProps = {
  transaction: Transaction
  onToggleClearingStatus: (id: string, clearingStatus: "UNCLEARED" | "CLEARED" | "RECONCILED") => void
  onDuplicate: (transaction: Transaction) => void
  onDelete: (id: string) => void
  children: React.ReactNode
}

export function TransactionContextMenu({
  transaction,
  onToggleClearingStatus,
  onDuplicate,
  onDelete,
  children,
}: TransactionContextMenuProps) {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        render={<div style={{ display: "contents" }} />}
      >
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Positioner className="context-menu-positioner" sideOffset={4}>
          <ContextMenu.Popup className="context-menu-popup">
            <ContextMenu.Item
              className="context-menu-item"
              onClick={() =>
                onToggleClearingStatus(
                  transaction.id,
                  transaction.clearingStatus === "UNCLEARED" ? "CLEARED" : "UNCLEARED",
                )
              }
            >
              {transaction.clearingStatus === "UNCLEARED" ? "Mark as cleared" : "Mark as uncleared"}
            </ContextMenu.Item>
            <ContextMenu.Item
              className="context-menu-item"
              onClick={() => onDuplicate(transaction)}
            >
              Duplicate
            </ContextMenu.Item>
            <ContextMenu.Item
              className="context-menu-item context-menu-item-danger"
              onClick={() => onDelete(transaction.id)}
            >
              Delete
            </ContextMenu.Item>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
