import { useEffect, useRef, useState } from "react"
import { TextInput } from "./text-input.js"

type InlineEditNameProps = {
  value: string
  onSave: (name: string) => void
  isSaving?: boolean
  className?: string
  inputWidth?: string
  ariaLabel?: string
}

export function InlineEditName({
  value,
  onSave,
  isSaving,
  className,
  inputWidth = "12rem",
  ariaLabel,
}: InlineEditNameProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const save = () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === value) {
      setEditing(false)
      setDraft(value)
      return
    }
    onSave(trimmed)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(value)
  }

  // Reset editing state when parent signals save completed (value changes)
  useEffect(() => {
    setEditing(false)
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <div className="inline-edit-name">
        <TextInput
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") cancel()
          }}
          disabled={isSaving}
          aria-label={ariaLabel ?? `Edit name`}
          style={{ width: inputWidth }}
        />
        <button
          type="button"
          className="edit-icon-button button-success"
          onClick={save}
          disabled={isSaving}
          aria-label="Save"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </button>
        <button
          type="button"
          className="edit-icon-button button-danger"
          onClick={cancel}
          disabled={isSaving}
          aria-label="Cancel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <span
      className={`inline-edit-name-display ${className ?? ""}`}
      onClick={() => {
        setEditing(true)
        setDraft(value)
      }}
      title="Click to rename"
    >
      {value}
    </span>
  )
}
