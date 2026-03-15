import { useEffect, useMemo, useRef, useState } from "react"
import {
  SearchableSelect,
  type SearchableSelectGroup,
} from "./searchable-select.js"

type Payee = {
  id: string
  name: string
}

export type PayeeOption =
  | { kind: "payee"; id: string; name: string }
  | {
      kind: "transfer"
      id: string
      name: string
      accountId: string
      isLoanPayment?: boolean
    }
  | { kind: "create"; id: string; name: string }

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
  isExpense?: boolean
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
  isExpense,
  placeholder = "Payee",
  initialInputValue = "",
}: PayeeAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(initialInputValue)
  const [open, setOpen] = useState(false)
  const justCreatedRef = useRef(false)
  const clearedByInputRef = useRef(false)

  useEffect(() => {
    if (!value && !justCreatedRef.current && !clearedByInputRef.current) {
      setInputValue("")
    }
    clearedByInputRef.current = false
    if (value) justCreatedRef.current = false
  }, [value])

  const groups = useMemo<SearchableSelectGroup<PayeeOption>[]>(() => {
    const currentAccount = accounts.find((a) => a.id === currentAccountId)
    const transferItems: PayeeOption[] = accounts
      .filter((a) => a.id !== currentAccountId)
      .map((a) => {
        const isLoanTransfer =
          a.type === "LOAN" || currentAccount?.type === "LOAN"
        const isOutgoing = isLoanTransfer
          ? a.type === "LOAN"
          : Boolean(isExpense)
        const isCashToCash =
          !isLoanTransfer && a.type === "CASH" && currentAccount?.type === "CASH"
        const prefix = isCashToCash ? "Transfer" : "Payment"
        const displayName = isOutgoing
          ? `${prefix} to ${a.name}`
          : `${prefix} from ${a.name}`
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
  }, [accounts, currentAccountId, payees, isExpense])

  const exactMatchExists = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return true
    return groups.some((g) =>
      g.items.some((item) => item.name.toLowerCase() === query),
    )
  }, [groups, inputValue])

  const showCreateOption =
    Boolean(onCreatePayee) && inputValue.trim().length > 0 && !exactMatchExists

  const groupsWithCreate = useMemo<SearchableSelectGroup<PayeeOption>[]>(() => {
    if (!showCreateOption) return groups
    const createItem: PayeeOption = {
      kind: "create",
      id: "__create__",
      name: `Create "${inputValue.trim()}" Payee`,
    }
    return [{ label: "", items: [createItem] }, ...groups]
  }, [groups, showCreateOption, inputValue])

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
      items={groupsWithCreate}
      value={value}
      onValueChange={(option) => {
        if (option && option.kind === "create") {
          void handleCreate()
          return
        }
        onChange(option ?? null)
      }}
      inputValue={inputValue}
      onInputValueChange={(newInputValue, details) => {
        if (justCreatedRef.current && details.reason !== "input-change") return
        setInputValue(newInputValue)
        if (details.reason === "input-change" && value) {
          clearedByInputRef.current = true
          onChange(null)
        }
      }}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      placeholder={placeholder}
      itemToString={(item) => (item.kind === "create" ? "" : item.name)}
      isItemEqual={(a, b) => a.id === b.id}
      filter={(item, query) => {
        if (item.kind === "create") return true
        return item.name.toLowerCase().includes(query.toLowerCase())
      }}
      emptyMessage="No matching payees."
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
      renderItem={(item) => {
        if (item.kind === "create") {
          return (
            <span className="searchable-select-create">
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
              {isCreating ? "Creating payee..." : item.name}
            </span>
          )
        }
        return <span>{item.name}</span>
      }}
    />
  )
}
