import { useMemo, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"

type AccountOption = {
  id: string
  name: string
}

type AccountComboboxProps = {
  accounts: AccountOption[]
  value: string
  onChange: (accountId: string) => void
  disabled?: boolean
  placeholder?: string
  initialInputValue?: string
}

export const AccountCombobox = ({
  accounts,
  value,
  onChange,
  disabled = false,
  placeholder = "Select account",
  initialInputValue = "",
}: AccountComboboxProps) => {
  const [inputValue, setInputValue] = useState(initialInputValue)
  const [open, setOpen] = useState(false)

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === value) ?? null,
    [accounts, value],
  )

  return (
    <Combobox.Root<AccountOption>
      value={selectedAccount}
      onValueChange={(account) => {
        onChange(account?.id ?? "")
      }}
      inputValue={inputValue}
      onInputValueChange={(newInputValue, details) => {
        setInputValue(newInputValue)
        if (details.reason === "input-change" && value) {
          onChange("")
        }
      }}
      open={open}
      onOpenChange={(nextOpen) => setOpen(nextOpen)}
      disabled={disabled}
      items={accounts}
      itemToStringLabel={(a) => a.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={(item, query) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      }
    >
      <Combobox.Input
        className="category-autocomplete-input"
        placeholder={placeholder}
      />
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4}>
          <Combobox.Popup className="category-autocomplete-menu">
            <Combobox.List>
              {(account: AccountOption) => (
                <Combobox.Item
                  key={account.id}
                  value={account}
                  className="category-autocomplete-option"
                >
                  <span>{account.name}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
            <Combobox.Empty>
              <p className="category-autocomplete-empty">
                No matching accounts.
              </p>
            </Combobox.Empty>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
