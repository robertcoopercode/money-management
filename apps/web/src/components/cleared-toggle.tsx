import { Toggle } from "@base-ui/react/toggle"

interface ClearedToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  disabled?: boolean
}

export function ClearedToggle({
  pressed,
  onPressedChange,
  disabled,
}: ClearedToggleProps) {
  return (
    <Toggle
      className="cleared-toggle"
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      aria-label="Cleared"
    >
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
    </Toggle>
  )
}
