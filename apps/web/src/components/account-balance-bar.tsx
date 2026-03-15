import { formatMoney } from "@ledgr/shared"
import { Switch } from "@base-ui/react/switch"
import type { Account } from "../types.js"

type AccountBalanceBarProps = {
  account: Account
  onReconcile: () => void
  showReconciled: boolean
  onToggleShowReconciled: () => void
}

export function AccountBalanceBar({
  account,
  onReconcile,
  showReconciled,
  onToggleShowReconciled,
}: AccountBalanceBarProps) {
  return (
    <div className="account-balance-bar">
      <button
        type="button"
        className="reconcile-button"
        onClick={onReconcile}
      >
        Reconcile
      </button>
      <div className="balance-group">
        <span className="balance-label balance-cleared">
          Cleared: {formatMoney(account.clearedBalanceMinor)}
        </span>
        <span className="balance-operator">+</span>
        <span className="balance-label balance-uncleared">
          Uncleared: {formatMoney(account.unclearedBalanceMinor)}
        </span>
        <span className="balance-operator">=</span>
        <span className="balance-label balance-working">
          Working: {formatMoney(account.balanceMinor)}
        </span>
      </div>
      <label className="show-reconciled-toggle">
        <Switch.Root
          className="reconciled-switch"
          checked={showReconciled}
          onCheckedChange={onToggleShowReconciled}
        >
          <Switch.Thumb className="reconciled-switch-thumb" />
        </Switch.Root>
        <span>Show reconciled</span>
      </label>
    </div>
  )
}
