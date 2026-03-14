import { Fragment, type ReactNode } from "react"
import { formatMoney } from "@ledgr/shared"
import { Tooltip } from "@base-ui/react/tooltip"
import { ClearedToggle } from "./cleared-toggle.js"
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
  onClearedChange: (id: string, cleared: boolean) => void
  onJumpToTransfer?: (transferPairId: string, sourceTransactionId: string) => void
  isUpdatePending: boolean
}

export function TransactionDisplayRow({
  transaction,
  tags: _tags,
  expandedSplitIds,
  onStartEditing,
  onToggleSplitExpand,
  onClearedChange,
  onJumpToTransfer,
  isUpdatePending,
}: TransactionDisplayRowProps) {
  return (
    <Fragment>
      <div className="transaction-row" role="row">
        <div
          className="transaction-cell clickable-cell"
          role="cell"
          tabIndex={0}
          onClick={() => onStartEditing(transaction, "account")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onStartEditing(transaction, "account")
          }}
        >
          {transaction.account.name}
        </div>
        <div
          className="transaction-cell clickable-cell"
          role="cell"
          tabIndex={0}
          onClick={() => onStartEditing(transaction, "date")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onStartEditing(transaction, "date")
          }}
        >
          {new Date(transaction.date).toISOString().slice(0, 10)}
        </div>
        <div
          className="transaction-cell clickable-cell truncated-cell"
          role="cell"
          tabIndex={0}
          onClick={() => onStartEditing(transaction, "payee")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onStartEditing(transaction, "payee")
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
          onClick={() => onStartEditing(transaction, "category")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onStartEditing(transaction, "category")
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
          ) : (
            <TruncatedText
              text={transaction.isTransfer
                ? (() => {
                    const isLoan =
                      transaction.transferAccount?.type === "LOAN" ||
                      transaction.account.type === "LOAN"
                    return isLoan ? (transaction.category?.name || "") : ""
                  })()
                : (transaction.category?.name || "")}
            />
          )}
        </div>
        <div
          className="transaction-cell clickable-cell truncated-cell"
          role="cell"
          tabIndex={0}
          onClick={() => onStartEditing(transaction, "note")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onStartEditing(transaction, "note")
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
          onClick={() => onStartEditing(transaction, "amount")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onStartEditing(transaction, "amount")
          }}
        >
          {formatMoney(transaction.amountMinor)}
        </div>
        <div
          className="transaction-cell clickable-cell tag-display-cell"
          role="cell"
          tabIndex={0}
          onClick={() => onStartEditing(transaction, "tags")}
          onKeyDown={(e) => {
            if (e.key === "Enter") onStartEditing(transaction, "tags")
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
            <ClearedToggle
              pressed={transaction.cleared}
              onPressedChange={(pressed) =>
                onClearedChange(transaction.id, pressed)
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
