import { useMemo, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"

type Payee = {
  id: string
  name: string
}

export type PayeeOption =
  | { kind: "payee"; id: string; name: string }
  | { kind: "transfer"; id: string; name: string; accountId: string }

type PayeeGroup = {
  label: string
  items: PayeeOption[]
}

type PayeeAutocompleteProps = {
  payees: Payee[]
  accounts: Array<{ id: string; name: string }>
  currentAccountId: string
  value: PayeeOption | null
  onChange: (selection: PayeeOption | null) => void
  onCreatePayee?: (name: string) => void
  disabled?: boolean
  isCreating?: boolean
  placeholder?: string
  initialInputValue?: string
}

export const PayeeAutocomplete = ({
  payees,
  accounts,
  currentAccountId,
  value,
  onChange,
  onCreatePayee,
  disabled = false,
  isCreating = false,
  placeholder = "Payee",
  initialInputValue = "",
}: PayeeAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(initialInputValue)
  const [open, setOpen] = useState(false)

  const groups = useMemo<PayeeGroup[]>(() => {
    const transferItems: PayeeOption[] = accounts
      .filter((a) => a.id !== currentAccountId)
      .map((a) => ({
        kind: "transfer" as const,
        id: `transfer:${a.id}`,
        name: a.name,
        accountId: a.id,
      }))

    const payeeItems: PayeeOption[] = payees.map((p) => ({
      kind: "payee" as const,
      id: p.id,
      name: p.name,
    }))

    return [
      { label: "Payments and Transfers", items: transferItems },
      { label: "Saved Payees", items: payeeItems },
    ]
  }, [accounts, currentAccountId, payees])

  const showCreateButton =
    Boolean(onCreatePayee) && inputValue.trim().length > 0

  return (
    <Combobox.Root<PayeeOption, PayeeGroup>
      value={value}
      onValueChange={(option) => {
        onChange(option ?? null)
      }}
      inputValue={inputValue}
      onInputValueChange={(newInputValue, details) => {
        setInputValue(newInputValue)
        if (details.reason === "input-change" && value) {
          onChange(null)
        }
      }}
      open={open}
      onOpenChange={(nextOpen) => setOpen(nextOpen)}
      disabled={disabled}
      items={groups}
      itemToStringLabel={(item) => item.name}
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
              <Combobox.Collection>
                {(group: PayeeGroup) => (
                  <Combobox.Group key={group.label} items={group.items}>
                    <Combobox.GroupLabel className="payee-group-label">
                      {group.label}
                    </Combobox.GroupLabel>
                    <Combobox.Collection>
                      {(item: PayeeOption) => (
                        <Combobox.Item
                          key={item.id}
                          value={item}
                          className="category-autocomplete-option"
                        >
                          <span>{item.name}</span>
                        </Combobox.Item>
                      )}
                    </Combobox.Collection>
                  </Combobox.Group>
                )}
              </Combobox.Collection>
            </Combobox.List>
            <Combobox.Empty>
              <p className="category-autocomplete-empty">
                No matching payees.
              </p>
            </Combobox.Empty>
            {showCreateButton && (
              <button
                type="button"
                className="category-autocomplete-create"
                onClick={() => {
                  onCreatePayee?.(inputValue.trim())
                  setOpen(false)
                }}
                disabled={isCreating}
              >
                {isCreating
                  ? "Creating payee..."
                  : `New payee "${inputValue.trim()}"`}
              </button>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
