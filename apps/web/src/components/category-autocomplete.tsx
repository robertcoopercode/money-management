import { useEffect, useMemo, useRef, useState } from "react"
import { Popover } from "@base-ui/react/popover"
import { TextInput } from "./text-input.js"
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

export type CreateCategoryInput = { name: string; groupName: string }

type CategoryAutocompleteProps = {
  categoryGroups: CategoryGroup[]
  value: string
  onChange: (categoryId: string) => void
  onCreateCategory?: (
    input: CreateCategoryInput,
  ) => Promise<{ id: string; name: string }>
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

type GroupOption = {
  id: string
  name: string
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
  const clearedByInputRef = useRef(false)

  // Popover state
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverCategoryName, setPopoverCategoryName] = useState("")
  const [groupInputValue, setGroupInputValue] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null)
  const [groupOpen, setGroupOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const categoryNameInputRef = useRef<HTMLInputElement>(null)
  const groupJustSelectedRef = useRef(false)

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
    if (!value && !justCreatedRef.current && !clearedByInputRef.current) {
      setInputValue("")
    }
    clearedByInputRef.current = false
    if (value && selectedCategory) {
      setInputValue(selectedCategory.name)
      justCreatedRef.current = false
    }
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

  // Group options for the popover
  const groupOptions = useMemo<SearchableSelectGroup<GroupOption>[]>(() => {
    const existingGroups: GroupOption[] = categoryGroups.map((g) => ({
      id: g.id,
      name: g.name,
    }))

    const query = groupInputValue.trim().toLowerCase()
    const exactGroupMatch =
      !query || existingGroups.some((g) => g.name.toLowerCase() === query)

    if (!exactGroupMatch && groupInputValue.trim()) {
      const createItem: GroupOption = {
        id: "__create_group__",
        name: `Create "${groupInputValue.trim()}" group`,
        kind: "create",
      }
      return [
        { label: "", items: [createItem] },
        { label: "", items: existingGroups },
      ]
    }

    return [{ label: "", items: existingGroups }]
  }, [categoryGroups, groupInputValue])

  const openPopover = (name: string) => {
    setPopoverCategoryName(name)
    setGroupInputValue("")
    setSelectedGroup(null)
    setOpen(false)
    setPopoverOpen(true)
    // Focus the name input after popover opens
    requestAnimationFrame(() => {
      categoryNameInputRef.current?.focus()
      categoryNameInputRef.current?.select()
    })
  }

  const handlePopoverSubmit = async () => {
    const name = popoverCategoryName.trim()
    if (!name || !onCreateCategory) return

    let groupName: string
    if (selectedGroup) {
      groupName =
        selectedGroup.kind === "create"
          ? groupInputValue.trim()
          : selectedGroup.name
    } else if (groupInputValue.trim()) {
      groupName = groupInputValue.trim()
    } else {
      groupName = "Uncategorized"
    }

    const category = await onCreateCategory({ name, groupName })
    justCreatedRef.current = true
    onChange(category.id)
    setInputValue(category.name)
    setPopoverOpen(false)
  }

  return (
    <div ref={anchorRef} className="category-autocomplete-anchor">
      <SearchableSelect<CategoryOption>
        items={groupsWithCreate}
        value={selectedCategory}
        onValueChange={(category) => {
          if (category && category.kind === "create") {
            openPopover(inputValue.trim())
            return
          }
          onChange(category?.id ?? "")
        }}
        inputValue={inputValue}
        onInputValueChange={(newInputValue, details) => {
          if (justCreatedRef.current && details.reason !== "input-change") return
          setInputValue(newInputValue)
          if (details.reason === "input-change" && value) {
            clearedByInputRef.current = true
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

      <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
        <Popover.Portal>
          <Popover.Positioner
            className="create-category-positioner"
            sideOffset={4}
            align="start"
            anchor={anchorRef}
          >
            <Popover.Popup className="create-category-popover">
              <div className="create-category-popover-title">
                Create Category
              </div>
              <label className="create-category-field">
                <span className="create-category-label">Name</span>
                <TextInput
                  ref={categoryNameInputRef}
                  className="create-category-input"
                  value={popoverCategoryName}
                  onChange={(e) => setPopoverCategoryName(e.target.value)}
                  placeholder="Category name"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void handlePopoverSubmit()
                    }
                  }}
                />
              </label>
              <label className="create-category-field">
                <span className="create-category-label">Group</span>
                <SearchableSelect<GroupOption>
                  items={groupOptions}
                  value={selectedGroup}
                  onValueChange={(group) => {
                    if (group && group.kind === "create") {
                      groupJustSelectedRef.current = true
                      setSelectedGroup(group)
                      setGroupInputValue(groupInputValue.trim())
                      setGroupOpen(false)
                      return
                    }
                    groupJustSelectedRef.current = true
                    setSelectedGroup(group)
                  }}
                  inputValue={groupInputValue}
                  onInputValueChange={(val, details) => {
                    if (groupJustSelectedRef.current && details.reason !== "input-change") {
                      return
                    }
                    groupJustSelectedRef.current = false
                    setGroupInputValue(val)
                    if (selectedGroup) setSelectedGroup(null)
                  }}
                  open={groupOpen}
                  onOpenChange={setGroupOpen}
                  placeholder="Select or create group"
                  itemToString={(g) =>
                    g.kind === "create" ? groupInputValue.trim() : g.name
                  }
                  isItemEqual={(a, b) => a.id === b.id}
                  filter={(item, query) => {
                    if (item.kind === "create") return true
                    return item.name
                      .toLowerCase()
                      .includes(query.toLowerCase())
                  }}
                  emptyMessage="No groups found."
                  renderItem={(group) => {
                    if (group.kind === "create") {
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
                          {group.name}
                        </span>
                      )
                    }
                    return <span>{group.name}</span>
                  }}
                />
              </label>
              <button
                type="button"
                className="create-category-submit"
                disabled={!popoverCategoryName.trim() || isCreating}
                onClick={() => void handlePopoverSubmit()}
              >
                {isCreating ? "Creating..." : "Create"}
              </button>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  )
}
