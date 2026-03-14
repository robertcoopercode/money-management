import type { ReactNode } from "react"
import { Combobox } from "@base-ui/react/combobox"

export type SearchableSelectGroup<T,> = {
  label: string
  items: T[]
}

type SearchableSelectProps<T,> = {
  items: SearchableSelectGroup<T>[]
  value: T | null
  onValueChange: (value: T | null) => void
  inputValue: string
  onInputValueChange: (value: string, details: { reason: string }) => void
  placeholder?: string
  disabled?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  itemToString: (item: T) => string
  isItemEqual: (a: T, b: T) => boolean
  filter: (item: T, query: string) => boolean
  bottomAction?: ReactNode
  renderItem: (item: T) => ReactNode
  renderGroupLabel?: (label: string) => ReactNode
  emptyMessage?: string
}

export function SearchableSelect<T>({
  items,
  value,
  onValueChange,
  inputValue,
  onInputValueChange,
  placeholder,
  disabled = false,
  open,
  onOpenChange,
  itemToString,
  isItemEqual,
  filter,
  bottomAction,
  renderItem,
  renderGroupLabel,
  emptyMessage = "No results found.",
}: SearchableSelectProps<T>) {
  return (
    <Combobox.Root<T>
      value={value}
      onValueChange={(v) => onValueChange(v ?? null)}
      inputValue={inputValue}
      onInputValueChange={onInputValueChange}
      open={open}
      onOpenChange={onOpenChange}
      disabled={disabled}
      items={items}
      itemToStringLabel={itemToString}
      isItemEqualToValue={isItemEqual}
      filter={filter}
      autoHighlight
    >
      <Combobox.Input
        className="category-autocomplete-input"
        placeholder={placeholder}
      />
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="combobox-positioner">
          <Combobox.Popup className="searchable-select-popup">
            <div className="searchable-select-scroll">
              <Combobox.List>
                <Combobox.Collection>
                  {(group: SearchableSelectGroup<T>) => (
                    <Combobox.Group key={group.label || "__no-label__"} items={group.items}>
                      {group.label ? (
                        renderGroupLabel ? (
                          <Combobox.GroupLabel className="searchable-select-group-label">
                            {renderGroupLabel(group.label)}
                          </Combobox.GroupLabel>
                        ) : (
                          <Combobox.GroupLabel className="searchable-select-group-label">
                            {group.label}
                          </Combobox.GroupLabel>
                        )
                      ) : null}
                      <Combobox.Collection>
                        {(item: T) => (
                          <Combobox.Item
                            key={itemToString(item) || "__create__"}
                            value={item}
                            className="searchable-select-option"
                          >
                            {renderItem(item)}
                          </Combobox.Item>
                        )}
                      </Combobox.Collection>
                    </Combobox.Group>
                  )}
                </Combobox.Collection>
              </Combobox.List>
              <Combobox.Empty>
                <p className="searchable-select-empty">{emptyMessage}</p>
              </Combobox.Empty>
            </div>
            {bottomAction && (
              <div className="searchable-select-bottom">{bottomAction}</div>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
