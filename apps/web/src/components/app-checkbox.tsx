import { Checkbox } from "@base-ui/react/checkbox"

type AppCheckboxProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  indeterminate?: boolean
  disabled?: boolean
  "aria-label"?: string
}

export function AppCheckbox({
  checked,
  onCheckedChange,
  indeterminate,
  disabled,
  "aria-label": ariaLabel,
}: AppCheckboxProps) {
  return (
    <Checkbox.Root
      className="app-checkbox"
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <Checkbox.Indicator className="app-checkbox-indicator">
        {indeterminate ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <path d="M5 12h14" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </Checkbox.Indicator>
    </Checkbox.Root>
  )
}
