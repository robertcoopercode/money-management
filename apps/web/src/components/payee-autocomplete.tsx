import { useEffect, useId, useMemo, useRef, useState } from "react"

type PayeeAutocompleteProps = {
  payees: Array<{
    id: string
    name: string
  }>
  value: string
  onChange: (payeeId: string) => void
  onCreatePayee?: (name: string) => void
  disabled?: boolean
  isCreating?: boolean
  placeholder?: string
}

type PayeeOption = {
  id: string
  name: string
  searchText: string
}

const normalizeSearchText = (text: string) => text.trim().toLowerCase()

export const PayeeAutocomplete = ({
  payees,
  value,
  onChange,
  onCreatePayee,
  disabled = false,
  isCreating = false,
  placeholder = "Payee",
}: PayeeAutocompleteProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listboxId = useId()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const options = useMemo<PayeeOption[]>(
    () =>
      payees.map((payee) => ({
        id: payee.id,
        name: payee.name,
        searchText: payee.name.toLowerCase(),
      })),
    [payees],
  )

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? null,
    [options, value],
  )

  useEffect(() => {
    setQuery(selectedOption?.name ?? "")
  }, [selectedOption])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) {
        return
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightedIndex(-1)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [])

  const normalizedQuery = normalizeSearchText(query)
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) {
      return options
    }

    return options.filter((option) =>
      option.searchText.includes(normalizedQuery),
    )
  }, [normalizedQuery, options])

  const showCreateButton =
    Boolean(onCreatePayee) &&
    normalizedQuery.length > 0 &&
    filteredOptions.length === 0

  const selectOption = (option: PayeeOption) => {
    onChange(option.id)
    setQuery(option.name)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  return (
    <div className="category-autocomplete" ref={rootRef}>
      <input
        className="category-autocomplete-input"
        type="text"
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => {
          if (!disabled) {
            setIsOpen(true)
          }
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
          setHighlightedIndex(-1)

          if (value) {
            onChange("")
          }
        }}
        onKeyDown={(event) => {
          if (!isOpen || filteredOptions.length === 0) {
            if (event.key === "Escape") {
              setIsOpen(false)
            }
            return
          }

          if (event.key === "ArrowDown") {
            event.preventDefault()
            setHighlightedIndex((current) =>
              Math.min(current + 1, filteredOptions.length - 1),
            )
            return
          }

          if (event.key === "ArrowUp") {
            event.preventDefault()
            setHighlightedIndex((current) => Math.max(current - 1, 0))
            return
          }

          if (event.key === "Enter" && highlightedIndex >= 0) {
            event.preventDefault()
            const option = filteredOptions[highlightedIndex]
            if (option) selectOption(option)
            return
          }

          if (event.key === "Escape") {
            setIsOpen(false)
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listboxId}
      />

      {isOpen && !disabled ? (
        <div
          className="category-autocomplete-menu"
          role="listbox"
          id={listboxId}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.id}
                type="button"
                className={`category-autocomplete-option ${
                  highlightedIndex === index ? "is-highlighted" : ""
                }`}
                onClick={() => selectOption(option)}
                role="option"
                aria-selected={selectedOption?.id === option.id}
              >
                <span>{option.name}</span>
              </button>
            ))
          ) : (
            <p className="category-autocomplete-empty">No matching payees.</p>
          )}

          {showCreateButton ? (
            <button
              type="button"
              className="category-autocomplete-create"
              onClick={() => {
                onCreatePayee?.(query.trim())
                setIsOpen(false)
              }}
              disabled={isCreating}
            >
              {isCreating ? "Creating payee..." : `New payee "${query.trim()}"`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
