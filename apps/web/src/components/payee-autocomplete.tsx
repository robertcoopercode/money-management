import { useEffect, useMemo, useRef, useState } from "react"
import {
  SearchableSelect,
  type SearchableSelectGroup,
} from "./searchable-select.js"

type Payee = {
  id: string
  name: string
}

export type PayeeOption = { kind: "payee"; id: string; name: string } | {
  kind: "transfer"
  id: string
  name: string
  accountId: string
  isLoanPayment?: boolean
}

type PayeeAutocompleteProps = {
  payees: Payee[]
  accounts: Array<{ id: string; name: string; type: string }>
  currentAccountId: string
  value: PayeeOption | null
  onChange: (selection: PayeeOption | null) => void
  onCreatePayee?: (name: string) => Promise<{ id: string; name: string }>
  onManagePayees?: () => void
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
  onManagePayees,
  disabled = false,
  isCreating = false,
  placeholder = "Payee",
  initialInputValue = "",
}: PayeeAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(initialInputValue)
  const [open, setOpen] = useState(false)
  const justCreatedRef = useRef(false)

  useEffect(() => {
    if (!value && !justCreatedRef.current) setInputValue("")
    if (value) justCreatedRef.current = false
  }, [value])

  const groups = useMemo<SearchableSelectGroup<PayeeOption>[]>(() => {
    const currentAccount = accounts.find((a) => a.id === currentAccountId)
    const transferItems: PayeeOption[] = accounts
      .filter((a) => a.id !== currentAccountId)
      .map((a) => {
        const isLoanTransfer =
          a.type === "LOAN" || currentAccount?.type === "LOAN"
        let displayName = a.name
        if (isLoanTransfer) {
          displayName =
            a.type === "LOAN"
              ? `Payment to ${a.name}`
              : `Payment from ${a.name}`
        }
        return {
          kind: "transfer" as const,
          id: `transfer:${a.id}`,
          name: displayName,
          accountId: a.id,
          isLoanPayment: isLoanTransfer,
        }
      })

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

  const exactMatchExists = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return true
    return groups.some((g) =>
      g.items.some((item) => item.name.toLowerCase() === query),
    )
  }, [groups, inputValue])

  const showCreateButton =
    Boolean(onCreatePayee) && inputValue.trim().length > 0 && !exactMatchExists

  const hasFilteredResults = useMemo(() => {
    if (!inputValue.trim()) return true
    const query = inputValue.toLowerCase()
    return groups.some((g) =>
      g.items.some((item) => item.name.toLowerCase().includes(query)),
    )
  }, [groups, inputValue])

  const handleCreate = async () => {
    const name = inputValue.trim()
    if (!name || !onCreatePayee) return
    const payee = await onCreatePayee(name)
    justCreatedRef.current = true
    onChange({ kind: "payee", id: payee.id, name: payee.name })
    setInputValue(payee.name)
    setOpen(false)
  }

  return (
    <SearchableSelect<PayeeOption>
      items={groups}
      value={value}
      onValueChange={(option) => onChange(option ?? null)}
      inputValue={inputValue}
      onInputValueChange={(newInputValue, details) => {
        if (justCreatedRef.current && details.reason !== "input-change") return
        setInputValue(newInputValue)
        if (details.reason === "input-change" && value) {
          onChange(null)
        }
      }}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      placeholder={placeholder}
      itemToString={(item) => item.name}
      isItemEqual={(a, b) => a.id === b.id}
      filter={(item, query) =>
        item.name.toLowerCase().includes(query.toLowerCase())
      }
      emptyMessage="No matching payees."
      topAction={
        showCreateButton ? (
          <button
            type="button"
            className="searchable-select-create"
            onClick={() => void handleCreate()}
            disabled={isCreating}
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
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12h8" />
              <path d="M12 8v8" />
            </svg>
            {isCreating
              ? "Creating payee..."
              : `Create "${inputValue.trim()}" Payee`}
          </button>
        ) : undefined
      }
      bottomAction={
        onManagePayees ? (
          <button
            type="button"
            className="searchable-select-link"
            onClick={() => {
              onManagePayees()
              setOpen(false)
            }}
          >
            Manage Payees
          </button>
        ) : undefined
      }
      renderItem={(item) => <span>{item.name}</span>}
      onInputKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          showCreateButton &&
          !hasFilteredResults &&
          !isCreating
        ) {
          e.preventDefault()
          void handleCreate()
        }
      }}
    />
  )
}
