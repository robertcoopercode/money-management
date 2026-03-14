import { useEffect, useMemo, useRef, useState } from "react"
import {
  SearchableSelect,
  type SearchableSelectGroup,
} from "./searchable-select.js"

type CategoryGroup = {
  id: string
  name: string
  categories: Array<{
    id: string
    name: string
  }>
}

type CategoryAutocompleteProps = {
  categoryGroups: CategoryGroup[]
  value: string
  onChange: (categoryId: string) => void
  onCreateCategory?: (name: string) => Promise<{ id: string; name: string }>
  onSplit?: () => void
  disabled?: boolean
  isCreating?: boolean
  placeholder?: string
  initialInputValue?: string
}

type CategoryOption = {
  id: string
  name: string
  groupName: string
  kind?: "create"
}

export const CategoryAutocomplete = ({
  categoryGroups,
  value,
  onChange,
  onCreateCategory,
  onSplit,
  disabled = false,
  isCreating = false,
  placeholder = "Category",
  initialInputValue = "",
}: CategoryAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(initialInputValue)
  const [open, setOpen] = useState(false)
  const justCreatedRef = useRef(false)

  const groups = useMemo<SearchableSelectGroup<CategoryOption>[]>(
    () =>
      categoryGroups.map((group) => ({
        label: group.name,
        items: group.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          groupName: group.name,
        })),
      })),
    [categoryGroups],
  )

  const allOptions = useMemo<CategoryOption[]>(
    () => groups.flatMap((g) => g.items),
    [groups],
  )

  const selectedCategory = useMemo(
    () => allOptions.find((o) => o.id === value) ?? null,
    [allOptions, value],
  )

  useEffect(() => {
    if (!value && !justCreatedRef.current) setInputValue("")
    if (value && selectedCategory) justCreatedRef.current = false
  }, [value, selectedCategory])

  const exactMatchExists = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return true
    return allOptions.some((item) => item.name.toLowerCase() === query)
  }, [allOptions, inputValue])

  const showCreateOption =
    Boolean(onCreateCategory) &&
    inputValue.trim().length > 0 &&
    !exactMatchExists

  const groupsWithCreate = useMemo<SearchableSelectGroup<CategoryOption>[]>(() => {
    if (!showCreateOption) return groups
    const createItem: CategoryOption = {
      id: "__create__",
      name: `Create "${inputValue.trim()}" Category`,
      groupName: "",
      kind: "create",
    }
    return [{ label: "", items: [createItem] }, ...groups]
  }, [groups, showCreateOption, inputValue])

  const handleCreate = async () => {
    const name = inputValue.trim()
    if (!name || !onCreateCategory) return
    const category = await onCreateCategory(name)
    justCreatedRef.current = true
    onChange(category.id)
    setInputValue(category.name)
    setOpen(false)
  }

  return (
    <SearchableSelect<CategoryOption>
      items={groupsWithCreate}
      value={selectedCategory}
      onValueChange={(category) => {
        if (category && category.kind === "create") {
          void handleCreate()
          return
        }
        onChange(category?.id ?? "")
      }}
      inputValue={inputValue}
      onInputValueChange={(newInputValue, details) => {
        if (justCreatedRef.current && details.reason !== "input-change") return
        setInputValue(newInputValue)
        if (details.reason === "input-change" && value) {
          onChange("")
        }
      }}
      open={open}
      onOpenChange={setOpen}
      disabled={disabled}
      placeholder={placeholder}
      itemToString={(c) => (c.kind === "create" ? "" : c.name)}
      isItemEqual={(a, b) => a.id === b.id}
      filter={(item, query) => {
        if (item.kind === "create") return true
        return `${item.groupName} ${item.name}`
          .toLowerCase()
          .includes(query.toLowerCase())
      }}
      emptyMessage="No matching categories."
      bottomAction={
        onSplit ? (
          <button
            type="button"
            className="searchable-select-split"
            onClick={() => {
              onSplit()
              setOpen(false)
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 3h5v5" />
              <path d="M8 3H3v5" />
              <path d="M12 22V8" />
              <path d="m3 8 9-5 9 5" />
            </svg>
            Split transaction
          </button>
        ) : undefined
      }
      renderItem={(category) => {
        if (category.kind === "create") {
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
              {isCreating ? "Creating category..." : category.name}
            </span>
          )
        }
        return (
          <>
            <span>{category.name}</span>
            <small>{category.groupName}</small>
          </>
        )
      }}
    />
  )
}
