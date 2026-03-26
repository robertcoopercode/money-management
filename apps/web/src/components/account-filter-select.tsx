import { Select } from "@base-ui/react/select"
import { ScrollArea } from "./scroll-area.js"

type AccountFilterSelectProps = {
  accounts: { id: string; name: string }[]
  value: string
  onChange: (value: string) => void
}

export const AccountFilterSelect = ({
  accounts,
  value,
  onChange,
}: AccountFilterSelectProps) => {
  return (
    <Select.Root
      value={value}
      onValueChange={(value) => onChange(value ?? "")}
    >
      <Select.Trigger className="account-filter-trigger">
        <Select.Value
          placeholder="All accounts"
          className="account-filter-value"
        >
          {accounts.find((a) => a.id === value)?.name ?? null}
        </Select.Value>
        <Select.Icon className="account-filter-icon">
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
          className="account-filter-positioner"
          sideOffset={6}
          alignItemWithTrigger={false}
          side="bottom"
          align="start"
        >
          <Select.Popup className="account-filter-popup">
            <ScrollArea>
              <Select.Item value="" className="account-filter-option">
                <Select.ItemText>All accounts</Select.ItemText>
              </Select.Item>
              {accounts.map((account) => (
                <Select.Item
                  key={account.id}
                  value={account.id}
                  className="account-filter-option"
                >
                  <Select.ItemText>{account.name}</Select.ItemText>
                  <Select.ItemIndicator className="account-filter-check">
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
