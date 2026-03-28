import { Fragment, useState, type ReactNode } from "react"
import { formatMoney } from "@ledgr/shared"
import { AppCheckbox } from "./app-checkbox.js"
import { Tooltip } from "@base-ui/react/tooltip"
import { Popover } from "@base-ui/react/popover"
import { ClearingStatusToggle } from "./clearing-status-toggle.js"
import type { Transaction, Tag } from "../types.js"
import type { EditableField } from "../lib/transaction-entry.js"

function TruncatedText({ text, children }: { text: string; children?: ReactNode }) {
  if (!text) return null
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={<span className="truncated-cell-text">{children ?? text}</span>}
      />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8}>
          <Tooltip.Popup className="note-tooltip">
            {text}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
}

type TransactionDisplayRowProps = {
  transaction: Transaction
  tags: Tag[]
  expandedSplitIds: Set<string>
  onStartEditing: (
    transaction: Transaction,
    field: EditableField,
    splitIndex?: number,
  ) => void
  onToggleSplitExpand: (id: string) => void
  onClearingStatusChange: (id: string, clearingStatus: "UNCLEARED" | "CLEARED" | "RECONCILED") => void
  onJumpToTransfer?: (transferPairId: string, sourceTransactionId: string) => void
  isUpdatePending: boolean
  isSelected: boolean
  onToggleSelect: (id: string, shiftKey: boolean) => void
  onApproveImport?: (transactionId: string) => void
  onRejectImport?: (transactionId: string) => void
  onUnmatchImport?: (transactionId: string) => void
}

function ImportApprovalIcon({
  transaction,
  onApprove,
  onReject,
  onUnmatch,
}: {
  transaction: Transaction
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  onUnmatch?: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const isMatched = transaction.pendingApproval && transaction.importedTransactionId && transaction.manualCreated
  const isNewImport = transaction.pendingApproval && !transaction.manualCreated

  if (!isMatched && !isNewImport) return null

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        render={
          <button
            type="button"
            className={`import-approval-trigger ${isMatched ? "import-matched" : "import-new"}`}
            aria-label={isMatched ? "Matched import - click to review" : "New import - click to review"}
          />
        }
      >
        {isMatched ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8}>
          <Popover.Popup className="import-approval-popup">
            <div className="import-approval-label">
              {isMatched ? "Matched import" : "New import"}
            </div>
            <div className="import-approval-actions">
              <button
                type="button"
                className="button-success import-approval-btn"
                onClick={() => { onApprove?.(transaction.id); setOpen(false) }}
              >
                Approve
              </button>
              {isMatched && (
                <button
                  type="button"
                  className="import-approval-btn"
                  onClick={() => { onUnmatch?.(transaction.id); setOpen(false) }}
                >
                  Unmatch
                </button>
              )}
              <button
                type="button"
                className="button-danger import-approval-btn"
                onClick={() => { onReject?.(transaction.id); setOpen(false) }}
              >
                Reject
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function TransactionDisplayRow({
  transaction,
  tags: _tags,
  expandedSplitIds,
  onStartEditing,
  onToggleSplitExpand,
  onClearingStatusChange,
  onJumpToTransfer,
  isUpdatePending,
  isSelected,
  onToggleSelect,
  onApproveImport,
  onRejectImport,
  onUnmatchImport,
}: TransactionDisplayRowProps) {
  const handleCellClick = (field: EditableField, shiftKey: boolean) => {
    if (isSelected && !shiftKey) {
      onStartEditing(transaction, field)
    } else {
      onToggleSelect(transaction.id, shiftKey)
    }
  }

  return (
    <Fragment>
      <div className={`transaction-row${isSelected ? " selected" : ""}`} role="row">
        <div
          className="transaction-cell transaction-cell-checkbox"
          role="cell"
          onClickCapture={(e) => {
            e.stopPropagation()
            onToggleSelect(transaction.id, e.shiftKey)
          }}
        >
          <AppCheckbox
            checked={isSelected}
            onCheckedChange={() => {}}
          />
        </div>
        <div
          className="transaction-cell clickable-cell"
          role="cell"
          tabIndex={0}
          onClick={(e) => handleCellClick("account", e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellClick("account", e.shiftKey)
          }}
        >
          {transaction.account.name}
        </div>
        <div
          className="transaction-cell clickable-cell"
          role="cell"
          tabIndex={0}
          onClick={(e) => handleCellClick("date", e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellClick("date", e.shiftKey)
          }}
        >
          {new Date(transaction.date).toISOString().slice(0, 10)}
        </div>
        <div
          className="transaction-cell clickable-cell truncated-cell"
          role="cell"
          tabIndex={0}
          onClick={(e) => handleCellClick("payee", e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellClick("payee", e.shiftKey)
          }}
        >
          <span className="payee-cell-content">
            <TruncatedText
              text={transaction.isTransfer
                ? (() => {
                    const isCashToCash =
                      transaction.account.type === "CASH" && transaction.transferAccount?.type === "CASH"
                    const prefix = isCashToCash ? "Transfer" : "Payment"
                    return transaction.amountMinor < 0
                      ? `${prefix} to ${transaction.transferAccount?.name ?? "Account"}`
                      : `${prefix} from ${transaction.transferAccount?.name ?? "Account"}`
                  })()
                : (transaction.payee?.name ?? "\u2014")}
            />
            {transaction.isTransfer && transaction.transferPairId && onJumpToTransfer && (
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <button
                      type="button"
                      className="jump-transfer-button"
                      aria-label="Jump to linked transfer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onJumpToTransfer(transaction.transferPairId!, transaction.id)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation()
                          e.preventDefault()
                          onJumpToTransfer(transaction.transferPairId!, transaction.id)
                        }
                      }}
                    />
                  }
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M7 16l-4-4 4-4" />
                    <path d="M17 8l4 4-4 4" />
                    <path d="M3 12h18" />
                  </svg>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={8}>
                    <Tooltip.Popup className="jump-transfer-tooltip">
                      Jump to the other side of this transfer
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}
          </span>
        </div>
        <div
          className="transaction-cell clickable-cell truncated-cell"
          role="cell"
          tabIndex={0}
          onClick={(e) => handleCellClick("category", e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellClick("category", e.shiftKey)
          }}
        >
          {transaction.splits?.length > 0 ? (
            <button
              type="button"
              className="split-chevron"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSplitExpand(transaction.id)
              }}
              aria-expanded={expandedSplitIds.has(transaction.id)}
              aria-label="Toggle split details"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={
                  expandedSplitIds.has(transaction.id)
                    ? "split-chevron-expanded"
                    : ""
                }
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <em>Split transaction</em>
            </button>
          ) : (() => {
            const isLoanAccount = transaction.account.type === "LOAN"
            const isLoanTransfer =
              transaction.isTransfer &&
              (transaction.transferAccount?.type === "LOAN" || isLoanAccount)
            const isNonLoanTransfer = transaction.isTransfer && !isLoanTransfer
            const categoryNotApplicable = isNonLoanTransfer || isLoanAccount
            const categoryName = transaction.category?.name

            if (categoryNotApplicable) {
              return <span className="category-not-applicable">Not applicable</span>
            }
            if (categoryName) {
              return <TruncatedText text={categoryName} />
            }
            return <span className="category-needs-badge">Needs category</span>
          })()}
        </div>
        <div
          className="transaction-cell clickable-cell truncated-cell"
          role="cell"
          tabIndex={0}
          onClick={(e) => handleCellClick("note", e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellClick("note", e.shiftKey)
          }}
        >
          <TruncatedText text={transaction.note || ""} />
        </div>
        <div
          className={`transaction-cell clickable-cell ${
            transaction.amountMinor >= 0 ? "amount-inflow" : "amount-outflow"
          }`}
          role="cell"
          tabIndex={0}
          onClick={(e) => handleCellClick("amount", e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellClick("amount", e.shiftKey)
          }}
        >
          {formatMoney(transaction.amountMinor)}
        </div>
        <div
          className="transaction-cell clickable-cell tag-display-cell"
          role="cell"
          tabIndex={0}
          onClick={(e) => handleCellClick("tags", e.shiftKey)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCellClick("tags", e.shiftKey)
          }}
        >
          {transaction.tags?.length > 0 && (
            <div className="tag-display-chips">
              {transaction.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="tag-chip tag-chip-small"
                  style={{
                    backgroundColor: tag.backgroundColor,
                    color: tag.textColor,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="transaction-cell" role="cell">
          <div className="row-actions">
            <ImportApprovalIcon
              transaction={transaction}
              onApprove={onApproveImport}
              onReject={onRejectImport}
              onUnmatch={onUnmatchImport}
            />
            <ClearingStatusToggle
              status={transaction.clearingStatus}
              onToggle={() =>
                onClearingStatusChange(
                  transaction.id,
                  transaction.clearingStatus === "UNCLEARED" ? "CLEARED" : "UNCLEARED",
                )
              }
              disabled={isUpdatePending}
            />
          </div>
        </div>
      </div>
      {expandedSplitIds.has(transaction.id) &&
        transaction.splits?.length > 0 &&
        transaction.splits.map((split, splitIndex) => (
          <div key={split.id} className="split-detail-row" role="row">
            <div className="transaction-cell split-detail-leading" />
            <div className="transaction-cell split-detail-payee" role="cell">
              {split.payee && split.payee.id !== transaction.payee?.id
                ? split.payee.name
                : ""}
            </div>
            <div
              className="transaction-cell clickable-cell split-detail-category"
              tabIndex={0}
              onClick={() =>
                onStartEditing(transaction, "category", splitIndex)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  onStartEditing(transaction, "category", splitIndex)
              }}
            >
              {split.category.group.name}: {split.category.name}
            </div>
            <div
              className="transaction-cell clickable-cell split-detail-note"
              tabIndex={0}
              onClick={() => onStartEditing(transaction, "note", splitIndex)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  onStartEditing(transaction, "note", splitIndex)
              }}
            >
              {split.note || ""}
            </div>
            <div
              className={`transaction-cell clickable-cell split-detail-amount ${
                split.amountMinor >= 0 ? "amount-inflow" : "amount-outflow"
              }`}
              tabIndex={0}
              onClick={() => onStartEditing(transaction, "amount", splitIndex)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  onStartEditing(transaction, "amount", splitIndex)
              }}
            >
              {formatMoney(split.amountMinor)}
            </div>
            <div
              className="transaction-cell clickable-cell split-detail-tags tag-display-cell"
              tabIndex={0}
              onClick={() => onStartEditing(transaction, "tags", splitIndex)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  onStartEditing(transaction, "tags", splitIndex)
              }}
            >
              {split.tags && split.tags.length > 0 && (
                <div className="tag-display-chips">
                  {split.tags.map(({ tag }) => (
                    <span
                      key={tag.id}
                      className="tag-chip tag-chip-small"
                      style={{
                        backgroundColor: tag.backgroundColor,
                        color: tag.textColor,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="transaction-cell split-detail-trailing" />
          </div>
        ))}
    </Fragment>
  )
}
