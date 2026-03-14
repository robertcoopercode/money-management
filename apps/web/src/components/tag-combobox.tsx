import { useMemo, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"
import type { Tag } from "../types.js"

type TagItem = Tag & { kind?: "create" }

type TagComboboxProps = {
  tags: Tag[]
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  onCreateTag?: (name: string) => Promise<Tag>
  onInputKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function TagCombobox({
  tags,
  selectedTagIds,
  onChange,
  onCreateTag,
  onInputKeyDown,
}: TagComboboxProps) {
  const [inputValue, setInputValue] = useState("")

  const availableTags = useMemo(
    () => tags.filter((t) => !t.isArchived),
    [tags],
  )

  const selectedTags = useMemo(
    () =>
      selectedTagIds
        .map((id) => tags.find((t) => t.id === id))
        .filter((t): t is Tag => t !== undefined),
    [selectedTagIds, tags],
  )

  const exactMatchExists = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query) return true
    return availableTags.some((t) => t.name.toLowerCase() === query)
  }, [availableTags, inputValue])

  const showCreateOption =
    Boolean(onCreateTag) && inputValue.trim().length > 0 && !exactMatchExists

  const items = useMemo<TagItem[]>(() => {
    if (!showCreateOption) return availableTags
    const createItem: TagItem = {
      id: "__create__",
      name: `Create "${inputValue.trim()}" Tag`,
      backgroundColor: "#374151",
      textColor: "#FFFFFF",
      isArchived: false,
      kind: "create",
    }
    return [createItem, ...availableTags]
  }, [availableTags, showCreateOption, inputValue])

  const handleCreate = async () => {
    const name = inputValue.trim()
    if (!name || !onCreateTag) return
    const tag = await onCreateTag(name)
    onChange([...selectedTagIds, tag.id])
    setInputValue("")
  }

  return (
    <Combobox.Root<TagItem>
      multiple
      value={selectedTags}
      onValueChange={(values) => {
        const tagValues = values as TagItem[]
        const createItem = tagValues.find((t) => t.kind === "create")
        if (createItem) {
          void handleCreate()
          return
        }
        onChange(tagValues.map((t) => t.id))
      }}
      items={items}
      inputValue={inputValue}
      onInputValueChange={(value) => setInputValue(value)}
      itemToStringLabel={(tag) => (tag.kind === "create" ? "" : tag.name)}
      isItemEqualToValue={(a, b) => a.id === b.id}
      filter={(tag, query) => {
        if (tag.kind === "create") return true
        return tag.name.toLowerCase().includes(query.toLowerCase())
      }}
      autoHighlight
    >
      <Combobox.InputGroup className="tag-combobox-input-group">
        <Combobox.Chips className="tag-combobox-chips">
          {selectedTags.map((tag) => (
            <Combobox.Chip key={tag.id} className="tag-combobox-chip">
              <span
                className="tag-chip"
                style={{
                  backgroundColor: tag.backgroundColor,
                  color: tag.textColor,
                }}
              >
                {tag.name}
              </span>
              <Combobox.ChipRemove className="tag-chip-remove">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </Combobox.ChipRemove>
            </Combobox.Chip>
          ))}
          <Combobox.Input
            className="tag-combobox-input"
            placeholder={selectedTagIds.length === 0 ? "Tags..." : ""}
            onKeyDown={onInputKeyDown}
          />
        </Combobox.Chips>
      </Combobox.InputGroup>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className="combobox-positioner"
        >
          <Combobox.Popup className="searchable-select-popup">
            <div className="searchable-select-scroll">
              <Combobox.List>
                {(tag: TagItem) => (
                  <Combobox.Item
                    key={tag.id}
                    value={tag}
                    className="searchable-select-option tag-combobox-option"
                  >
                    {tag.kind === "create" ? (
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
                        {tag.name}
                      </span>
                    ) : (
                      <>
                        <span
                          className="tag-chip"
                          style={{
                            backgroundColor: tag.backgroundColor,
                            color: tag.textColor,
                          }}
                        >
                          {tag.name}
                        </span>
                        <Combobox.ItemIndicator className="tag-check-indicator">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </Combobox.ItemIndicator>
                      </>
                    )}
                  </Combobox.Item>
                )}
              </Combobox.List>
              <Combobox.Empty>
                <p className="searchable-select-empty">No tags found.</p>
              </Combobox.Empty>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
