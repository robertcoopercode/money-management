import { useMemo, useState } from "react"
import { Switch } from "@base-ui/react/switch"
import { TextInput } from "../components/text-input.js"
import { useTagMutations } from "../hooks/use-tag-mutations.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import type { Tag } from "../types.js"
import type { UseQueryResult } from "@tanstack/react-query"

const COLOR_PRESETS = [
  { bg: "#FDE68A", text: "#92400E" },
  { bg: "#FCA5A5", text: "#991B1B" },
  { bg: "#A5B4FC", text: "#312E81" },
  { bg: "#86EFAC", text: "#14532D" },
  { bg: "#67E8F9", text: "#164E63" },
  { bg: "#FCD34D", text: "#78350F" },
  { bg: "#F9A8D4", text: "#831843" },
  { bg: "#C4B5FD", text: "#4C1D95" },
  { bg: "#374151", text: "#FFFFFF" },
  { bg: "#F3F4F6", text: "#1F2937" },
]

type TagsTabProps = {
  tagsQuery: UseQueryResult<Tag[]>
  refetchCoreData: () => void
}

export const TagsTab = ({ tagsQuery, refetchCoreData }: TagsTabProps) => {
  const [newTag, setNewTag] = useState({
    name: "",
    description: "",
    backgroundColor: "#374151",
    textColor: "#FFFFFF",
  })
  const [tagSearch, setTagSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    backgroundColor: "",
    textColor: "",
  })

  const { createTagMutation, updateTagMutation, deleteTagMutation } =
    useTagMutations({
      refetchCoreData,
      onTagCreated: () =>
        setNewTag({
          name: "",
          description: "",
          backgroundColor: "#374151",
          textColor: "#FFFFFF",
        }),
      onTagUpdated: () => setEditingTagId(null),
    })

  const visibleTags = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLowerCase()
    return (tagsQuery.data ?? []).filter((tag) => {
      if (!showArchived && tag.isArchived) return false
      return tag.name.toLowerCase().includes(normalizedSearch)
    })
  }, [tagsQuery.data, tagSearch, showArchived])

  const startEditing = (tag: Tag) => {
    setEditingTagId(tag.id)
    setEditForm({
      name: tag.name,
      description: tag.description ?? "",
      backgroundColor: tag.backgroundColor,
      textColor: tag.textColor,
    })
  }

  return (
    <>
      <section className="card">
        <h2>Add a New Tag</h2>
        <form
          className="tag-create-form"
          onSubmit={(event) => {
            event.preventDefault()
            createTagMutation.mutate({
              name: newTag.name,
              description: newTag.description || undefined,
              backgroundColor: newTag.backgroundColor,
              textColor: newTag.textColor,
            })
          }}
        >
          <div className="tag-form-fields">
            <label>
              Name
              <TextInput
                value={newTag.name}
                onChange={(e) =>
                  setNewTag((s) => ({ ...s, name: e.target.value }))
                }
                required
                maxLength={120}
              />
            </label>
            <label>
              Description
              <TextInput
                value={newTag.description}
                onChange={(e) =>
                  setNewTag((s) => ({ ...s, description: e.target.value }))
                }
                maxLength={500}
                placeholder="Optional description"
              />
            </label>
          </div>
          <div className="tag-color-row">
            <label>
              Background
              <div className="tag-color-picker">
                <input
                  type="color"
                  value={newTag.backgroundColor}
                  onChange={(e) =>
                    setNewTag((s) => ({ ...s, backgroundColor: e.target.value }))
                  }
                />
                <span className="tag-color-hex">{newTag.backgroundColor}</span>
              </div>
            </label>
            <label>
              Text
              <div className="tag-color-picker">
                <input
                  type="color"
                  value={newTag.textColor}
                  onChange={(e) =>
                    setNewTag((s) => ({ ...s, textColor: e.target.value }))
                  }
                />
                <span className="tag-color-hex">{newTag.textColor}</span>
              </div>
            </label>
            <div className="tag-color-presets">
              <span className="tag-color-presets-label">Presets</span>
              <div className="tag-color-presets-row">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={`${preset.bg}-${preset.text}`}
                    type="button"
                    className="tag-chip tag-preset-button"
                    style={{
                      background: preset.bg,
                      color: preset.text,
                      borderColor: preset.bg,
                    }}
                    title={`${preset.bg} / ${preset.text}`}
                    onClick={() =>
                      setNewTag((s) => ({
                        ...s,
                        backgroundColor: preset.bg,
                        textColor: preset.text,
                      }))
                    }
                  >
                    Aa
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="tag-form-preview-row">
            <span className="tag-form-preview-label">Preview:</span>
            <span
              className="tag-chip"
              style={{
                backgroundColor: newTag.backgroundColor,
                color: newTag.textColor,
              }}
            >
              {newTag.name ? newTag.name.toUpperCase() : "TAG NAME"}
            </span>
          </div>
          <button type="submit" disabled={createTagMutation.isPending}>
            Create Tag
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Tags</h2>
        <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", marginBottom: "0.8rem" }}>
          <TextInput
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="Search..."
          />
          <label className="tag-archive-toggle">
            <Switch.Root
              className="tag-switch"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            >
              <Switch.Thumb className="tag-switch-thumb" />
            </Switch.Root>
            Show archived
          </label>
        </div>

        {tagsQuery.isError ? (
          <p className="error-text">
            {toDisplayErrorMessage(tagsQuery.error, "Failed to load tags.")}
          </p>
        ) : tagsQuery.isLoading ? (
          <p className="muted">Loading tags...</p>
        ) : visibleTags.length === 0 ? (
          <p className="muted">No tags found.</p>
        ) : (
          <div className="list">
            {visibleTags.map((tag) =>
              editingTagId === tag.id ? (
                <div className="list-item" key={tag.id} style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                    <TextInput
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((s) => ({ ...s, name: e.target.value }))
                      }
                      required
                      style={{ width: "10rem" }}
                    />
                    <TextInput
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((s) => ({ ...s, description: e.target.value }))
                      }
                      placeholder="Description"
                      style={{ flex: 1, minWidth: "6rem" }}
                    />
                    <div className="tag-edit-colors">
                      <input
                        type="color"
                        value={editForm.backgroundColor}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, backgroundColor: e.target.value }))
                        }
                      />
                      <input
                        type="color"
                        value={editForm.textColor}
                        onChange={(e) =>
                          setEditForm((s) => ({ ...s, textColor: e.target.value }))
                        }
                      />
                    </div>
                    <span
                      className="tag-chip"
                      style={{
                        backgroundColor: editForm.backgroundColor,
                        color: editForm.textColor,
                      }}
                    >
                      {editForm.name ? editForm.name.toUpperCase() : "PREVIEW"}
                    </span>
                  </div>
                  <div className="tag-edit-actions">
                    <button
                      type="button"
                      onClick={() =>
                        updateTagMutation.mutate({
                          tagId: tag.id,
                          name: editForm.name,
                          description: editForm.description || undefined,
                          backgroundColor: editForm.backgroundColor,
                          textColor: editForm.textColor,
                        })
                      }
                      disabled={updateTagMutation.isPending}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTagId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`list-item${tag.isArchived ? " tag-row-archived" : ""}`}
                  key={tag.id}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                    <span
                      className="tag-chip"
                      style={{
                        backgroundColor: tag.backgroundColor,
                        color: tag.textColor,
                      }}
                    >
                      {tag.name}
                    </span>
                    {tag.description ? (
                      <span className="muted" style={{ fontSize: "0.82rem" }}>
                        {tag.description}
                      </span>
                    ) : null}
                  </div>
                  <div className="tag-row-actions">
                    <button
                      type="button"
                      className="edit-icon-button"
                      title="Edit tag"
                      onClick={() => startEditing(tag)}
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
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="edit-icon-button"
                      title={tag.isArchived ? "Unarchive tag" : "Archive tag"}
                      onClick={() =>
                        updateTagMutation.mutate({
                          tagId: tag.id,
                          isArchived: !tag.isArchived,
                        })
                      }
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
                        <path d="M21 8v13H3V8" />
                        <path d="M1 3h22v5H1z" />
                        <path d="M10 12h4" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="icon-button-danger"
                      title="Delete tag"
                      onClick={() => deleteTagMutation.mutate(tag.id)}
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
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>
    </>
  )
}
