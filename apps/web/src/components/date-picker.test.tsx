import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DatePicker } from "./date-picker.js"

afterEach(() => {
  cleanup()
})

describe("DatePicker", () => {
  it("displays a formatted date from ISO value", () => {
    render(<DatePicker value="2026-03-10" onChange={() => {}} />)
    expect(screen.getByDisplayValue("Mar 10, 2026")).toBeTruthy()
  })

  it("displays placeholder when value is empty", () => {
    render(<DatePicker value="" onChange={() => {}} />)
    expect(screen.getByPlaceholderText("Pick a date…")).toBeTruthy()
  })

  it("parses natural language on Enter", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-03-10" onChange={onChange} />)
    const input = screen.getByDisplayValue("Mar 10, 2026")
    await user.clear(input)
    await user.type(input, "march 5 2026{Enter}")
    expect(onChange).toHaveBeenCalledWith("2026-03-05")
  })

  it("parses natural language on blur", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-03-10" onChange={onChange} />)
    const input = screen.getByDisplayValue("Mar 10, 2026")
    await user.clear(input)
    await user.type(input, "march 5 2026")
    await user.tab()
    expect(onChange).toHaveBeenCalledWith("2026-03-05")
  })

  it("reverts invalid input on blur", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-03-10" onChange={onChange} />)
    const input = screen.getByDisplayValue("Mar 10, 2026")
    await user.clear(input)
    await user.type(input, "not a date")
    await user.tab()
    expect(onChange).not.toHaveBeenCalled()
    expect((input as HTMLInputElement).value).toBe("Mar 10, 2026")
  })

  it("accepts ISO date strings directly", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-03-10" onChange={onChange} />)
    const input = screen.getByDisplayValue("Mar 10, 2026")
    await user.clear(input)
    await user.type(input, "2026-01-15{Enter}")
    expect(onChange).toHaveBeenCalledWith("2026-01-15")
  })
})
