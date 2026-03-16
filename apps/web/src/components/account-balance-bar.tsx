import { formatMoney } from "@ledgr/shared"
import type { Account } from "../types.js"

type AccountBalanceBarProps = {
  account: Account
  onReconcile: () => void
}

export function AccountBalanceBar({
  account,
  onReconcile,
}: AccountBalanceBarProps) {
  return (
    <div className="account-balance-bar">
      <div className="balance-chips">
        <div className="balance-chip balance-chip--cleared">
          <span className="balance-chip__label">Cleared</span>
          <span className="balance-chip__amount">
            {formatMoney(account.clearedBalanceMinor)}
          </span>
        </div>

        <span className="balance-operator">+</span>

        <div className="balance-chip balance-chip--uncleared">
          <span className="balance-chip__label">Uncleared</span>
          <span className="balance-chip__amount">
            {formatMoney(account.unclearedBalanceMinor)}
          </span>
        </div>

        <span className="balance-operator">=</span>

        <div className="balance-chip balance-chip--working">
          <span className="balance-chip__label">Working</span>
          <span className="balance-chip__amount">
            {formatMoney(account.balanceMinor)}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="reconcile-button"
        onClick={onReconcile}
      >
        <svg
          className="reconcile-button__icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Reconcile
      </button>
    </div>
  )
}
