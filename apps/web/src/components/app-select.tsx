import { Select } from "@base-ui/react/select"
import { ScrollArea } from "./scroll-area.js"

type AppSelectOption = {
  value: string
  label: string
}

type AppSelectProps = {
  options: AppSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function AppSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled,
}: AppSelectProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => onChange(v ?? "")}
      disabled={disabled}
    >
      <Select.Trigger className="app-select-trigger">
        <Select.Value placeholder={placeholder} className="app-select-value">
          {value
            ? (options.find((o) => o.value === value)?.label ?? value)
            : null}
        </Select.Value>
        <Select.Icon className="app-select-icon">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          className="app-select-positioner"
          sideOffset={6}
          alignItemWithTrigger={false}
          side="bottom"
          align="start"
        >
          <Select.Popup className="app-select-popup">
            <ScrollArea>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="app-select-option"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="app-select-check">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </ScrollArea>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
