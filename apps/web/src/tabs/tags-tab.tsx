import { useMemo, useState } from "react"
import { Switch } from "@base-ui/react/switch"
import { TextInput } from "../components/text-input.js"
import { AppDialog } from "../components/app-dialog.js"
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

const emptyTagForm = {
  name: "",
  description: "",
  backgroundColor: "#374151",
  textColor: "#FFFFFF",
}

type TagModal =
  | { mode: "create" }
  | { mode: "edit"; tagId: string }
  | null

type TagsTabProps = {
  tagsQuery: UseQueryResult<Tag[]>
  refetchCoreData: () => void
}

export const TagsTab = ({ tagsQuery, refetchCoreData }: TagsTabProps) => {
  const [modal, setModal] = useState<TagModal>(null)
  const [tagForm, setTagForm] = useState({ ...emptyTagForm })
  const [tagSearch, setTagSearch] = useState("")
  const [showArchived, setShowArchived] = useState(false)

  const closeModal = () => {
    setModal(null)
    setTagForm({ ...emptyTagForm })
  }

  const { createTagMutation, updateTagMutation, deleteTagMutation } =
    useTagMutations({
      refetchCoreData,
      onTagCreated: closeModal,
      onTagUpdated: closeModal,
    })

  const visibleTags = useMemo(() => {
    const normalizedSearch = tagSearch.trim().toLowerCase()
    return (tagsQuery.data ?? []).filter((tag) => {
      if (!showArchived && tag.isArchived) return false
      return tag.name.toLowerCase().includes(normalizedSearch)
    })
  }, [tagsQuery.data, tagSearch, showArchived])

  const openCreate = () => {
    setTagForm({ ...emptyTagForm })
    setModal({ mode: "create" })
  }

  const openEdit = (tag: Tag) => {
    setTagForm({
      name: tag.name,
      description: tag.description ?? "",
      backgroundColor: tag.backgroundColor,
      textColor: tag.textColor,
    })
    setModal({ mode: "edit", tagId: tag.id })
  }

  const handleSubmit = () => {
    if (!modal) return
    if (modal.mode === "create") {
      createTagMutation.mutate({
        name: tagForm.name,
        description: tagForm.description || undefined,
        backgroundColor: tagForm.backgroundColor,
        textColor: tagForm.textColor,
      })
    } else {
      updateTagMutation.mutate({
        tagId: modal.tagId,
        name: tagForm.name,
        description: tagForm.description || undefined,
        backgroundColor: tagForm.backgroundColor,
        textColor: tagForm.textColor,
      })
    }
  }

  const isPending = modal?.mode === "create"
    ? createTagMutation.isPending
    : updateTagMutation.isPending

  return (
    <>
      <section className="card">
        <div className="section-header">
          <h2>Tags</h2>
          <button type="button" title="Add tag" onClick={openCreate}>
            +
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.55rem", alignItems: "center", marginBottom: "0.8rem" }}>
          <TextInput
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="Search..."
            style={{ width: "12rem" }}
          />
          <label className="app-switch-label">
            <Switch.Root
              className="app-switch"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            >
              <Switch.Thumb className="app-switch-thumb" />
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
            {visibleTags.map((tag) => (
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
                    onClick={() => openEdit(tag)}
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
            ))}
          </div>
        )}
      </section>

      <AppDialog
        open={modal !== null}
        onOpenChange={(open) => { if (!open) closeModal() }}
        title={modal?.mode === "create" ? "New Tag" : "Edit Tag"}
      >
        {modal && (
          <form
            className="tag-create-form"
            onSubmit={(event) => {
              event.preventDefault()
              handleSubmit()
            }}
          >
            <div className="tag-form-fields">
              <label>
                Name
                <TextInput
                  autoFocus
                  value={tagForm.name}
                  onChange={(e) =>
                    setTagForm((s) => ({ ...s, name: e.target.value }))
                  }
                  required
                  maxLength={120}
                />
              </label>
              <label>
                Description
                <TextInput
                  value={tagForm.description}
                  onChange={(e) =>
                    setTagForm((s) => ({ ...s, description: e.target.value }))
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
                    value={tagForm.backgroundColor}
                    onChange={(e) =>
                      setTagForm((s) => ({ ...s, backgroundColor: e.target.value }))
                    }
                  />
                  <span className="tag-color-hex">{tagForm.backgroundColor}</span>
                </div>
              </label>
              <label>
                Text
                <div className="tag-color-picker">
                  <input
                    type="color"
                    value={tagForm.textColor}
                    onChange={(e) =>
                      setTagForm((s) => ({ ...s, textColor: e.target.value }))
                    }
                  />
                  <span className="tag-color-hex">{tagForm.textColor}</span>
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
                        setTagForm((s) => ({
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
                  backgroundColor: tagForm.backgroundColor,
                  color: tagForm.textColor,
                }}
              >
                {tagForm.name ? tagForm.name.toUpperCase() : "TAG NAME"}
              </span>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                onClick={closeModal}
                style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}
              >
                Cancel
              </button>
              <button type="submit" disabled={isPending}>
                {isPending
                  ? (modal.mode === "create" ? "Creating..." : "Saving...")
                  : (modal.mode === "create" ? "Create Tag" : "Save Changes")}
              </button>
            </div>
          </form>
        )}
      </AppDialog>
    </>
  )
}
