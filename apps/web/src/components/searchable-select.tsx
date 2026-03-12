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
  topAction?: ReactNode
  bottomAction?: ReactNode
  renderItem: (item: T) => ReactNode
  renderGroupLabel?: (label: string) => ReactNode
  onInputKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
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
  topAction,
  bottomAction,
  renderItem,
  renderGroupLabel,
  onInputKeyDown,
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
    >
      <Combobox.Input
        className="category-autocomplete-input"
        placeholder={placeholder}
        onKeyDown={onInputKeyDown}
      />
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="combobox-positioner">
          <Combobox.Popup className="searchable-select-popup">
            {topAction && (
              <div className="searchable-select-top">{topAction}</div>
            )}
            <div className="searchable-select-scroll">
              <Combobox.List>
                <Combobox.Collection>
                  {(group: SearchableSelectGroup<T>) => (
                    <Combobox.Group key={group.label} items={group.items}>
                      {renderGroupLabel ? (
                        <Combobox.GroupLabel className="searchable-select-group-label">
                          {renderGroupLabel(group.label)}
                        </Combobox.GroupLabel>
                      ) : (
                        <Combobox.GroupLabel className="searchable-select-group-label">
                          {group.label}
                        </Combobox.GroupLabel>
                      )}
                      <Combobox.Collection>
                        {(item: T) => (
                          <Combobox.Item
                            key={itemToString(item)}
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
