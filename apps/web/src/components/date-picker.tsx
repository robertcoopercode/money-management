import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react"
import { Popover } from "@base-ui/react/popover"
import { TextInput } from "./text-input.js"
import { DayPicker } from "react-day-picker"
import * as chrono from "chrono-node"
import { format, parse } from "date-fns"
import "react-day-picker/style.css"
import "./date-picker.css"

function parseNaturalDate(text: string): Date | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = parse(trimmed, "yyyy-MM-dd", new Date())
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return chrono.parseDate(trimmed, new Date(), { forwardDate: false })
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function toDisplayDate(isoString: string): string {
  if (!isoString) return ""
  const date = parse(isoString, "yyyy-MM-dd", new Date())
  return format(date, "MMM d, yyyy")
}

type DatePickerProps = {
  value: string
  onChange: (date: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date…",
  disabled,
  required,
}, ref) {
  const [inputValue, setInputValue] = useState(() => toDisplayDate(value))
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => inputRef.current!, [])

  useEffect(() => {
    setInputValue(toDisplayDate(value))
  }, [value])

  const selectedDate = value
    ? parse(value, "yyyy-MM-dd", new Date())
    : undefined

  const commitInput = () => {
    const parsed = parseNaturalDate(inputValue)
    if (parsed) {
      onChange(toIsoDate(parsed))
    } else {
      setInputValue(toDisplayDate(value))
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="date-picker">
        <TextInput
          ref={inputRef}
          className="date-picker-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => {
            inputRef.current?.select()
          }}
          onBlur={commitInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitInput()
              setOpen(false)
              inputRef.current?.blur()
            }
            if (e.key === "Escape") {
              setInputValue(toDisplayDate(value))
              setOpen(false)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
        />
        <Popover.Trigger className="date-picker-trigger">
          <svg
            width="15"
            height="15"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
            <path d="M6 2.5v4M14 2.5v4M3 8.5h14" />
          </svg>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Positioner
          className="date-picker-positioner"
          sideOffset={4}
          align="start"
        >
          <Popover.Popup className="date-picker-popup">
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(day) => {
                if (day) {
                  onChange(toIsoDate(day))
                  setOpen(false)
                }
              }}
              defaultMonth={selectedDate}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
})
