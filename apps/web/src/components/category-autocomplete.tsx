import { useMemo, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"

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
  onCreateCategory?: (name: string) => void
  disabled?: boolean
  isCreating?: boolean
  placeholder?: string
  initialInputValue?: string
}

type CategoryOption = {
  id: string
  name: string
  groupName: string
}

export const CategoryAutocomplete = ({
  categoryGroups,
  value,
  onChange,
  onCreateCategory,
  disabled = false,
  isCreating = false,
  placeholder = "Category",
  initialInputValue = "",
}: CategoryAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(initialInputValue)
  const [open, setOpen] = useState(false)

  const allOptions = useMemo<CategoryOption[]>(
    () =>
      categoryGroups.flatMap((group) =>
        group.categories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          groupName: group.name,
        })),
      ),
    [categoryGroups],
  )

  const selectedCategory = useMemo(
    () => allOptions.find((o) => o.id === value) ?? null,
    [allOptions, value],
  )

  const showCreateButton =
    Boolean(onCreateCategory) && inputValue.trim().length > 0

  return (
    <Combobox.Root<CategoryOption>
      value={selectedCategory}
      onValueChange={(category) => {
        onChange(category?.id ?? "")
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
      items={allOptions}
      itemToStringLabel={(c) => c.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={(item, query) =>
        `${item.groupName} ${item.name}`
          .toLowerCase()
          .includes(query.toLowerCase())
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
              {(category: CategoryOption) => (
                <Combobox.Item
                  key={category.id}
                  value={category}
                  className="category-autocomplete-option"
                >
                  <span>{category.name}</span>
                  <small>{category.groupName}</small>
                </Combobox.Item>
              )}
            </Combobox.List>
            <Combobox.Empty>
              <p className="category-autocomplete-empty">
                No matching categories.
              </p>
            </Combobox.Empty>
            {showCreateButton && (
              <button
                type="button"
                className="category-autocomplete-create"
                onClick={() => {
                  onCreateCategory?.(inputValue.trim())
                  setOpen(false)
                }}
                disabled={isCreating}
              >
                {isCreating
                  ? "Creating category..."
                  : `New category "${inputValue.trim()}"`}
              </button>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
