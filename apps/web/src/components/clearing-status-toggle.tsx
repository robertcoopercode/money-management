import type { ClearingStatus } from "../types.js"

interface ClearingStatusToggleProps {
  status: ClearingStatus
  onToggle: () => void
  disabled?: boolean
}

export function ClearingStatusToggle({
  status,
  onToggle,
  disabled,
}: ClearingStatusToggleProps) {
  const isReconciled = status === "RECONCILED"

  return (
    <button
      type="button"
      className={`cleared-toggle${status !== "UNCLEARED" ? " pressed" : ""}`}
      onClick={onToggle}
      disabled={disabled || isReconciled}
      aria-label={
        isReconciled
          ? "Reconciled"
          : status === "CLEARED"
            ? "Cleared"
            : "Uncleared"
      }
    >
      {isReconciled ? (
        <svg
          width="22"
          height="22"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="14"
            cy="14"
            r="12"
            className="cleared-toggle-circle"
            strokeWidth="2"
          />
          <path
            d="M10 12V11C10 8.79 11.79 7 14 7C16.21 7 18 8.79 18 11V12M10 12H18M10 12C9.45 12 9 12.45 9 13V19C9 19.55 9.45 20 10 20H18C18.55 20 19 19.55 19 19V13C19 12.45 18.55 12 18 12"
            className="cleared-toggle-letter"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : (
        <svg
          width="22"
          height="22"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="14"
            cy="14"
            r="12"
            className="cleared-toggle-circle"
            strokeWidth="2"
          />
          <text
            x="14"
            y="14"
            textAnchor="middle"
            dominantBaseline="central"
            className="cleared-toggle-letter"
            fontSize="14"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            C
          </text>
        </svg>
      )}
    </button>
  )
}
