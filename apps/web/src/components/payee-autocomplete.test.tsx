import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PayeeAutocomplete } from "./payee-autocomplete.js"

const payees = [
  { id: "hydro", name: "Hydro One" },
  { id: "grocery", name: "Fresh Grocery" },
  { id: "mortgage", name: "City Mortgage" },
]

afterEach(() => {
  cleanup()
})

describe("PayeeAutocomplete", () => {
  it("filters payees while typing", async () => {
    const user = userEvent.setup()

    render(<PayeeAutocomplete payees={payees} value="" onChange={vi.fn()} />)

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "hydr")

    expect(screen.getByRole("option", { name: /Hydro One/i })).toBeTruthy()
    expect(screen.queryByRole("option", { name: /Fresh Grocery/i })).toBeNull()
  })

  it("selects an existing payee from filtered results", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PayeeAutocomplete payees={payees} value="" onChange={onChange} />)

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "city")
    await user.click(screen.getByRole("option", { name: /City Mortgage/i }))

    expect(onChange).toHaveBeenLastCalledWith("mortgage")
  })

  it("shows create button only when no payee matches", async () => {
    const user = userEvent.setup()
    const onCreatePayee = vi.fn()

    render(
      <PayeeAutocomplete
        payees={payees}
        value=""
        onChange={vi.fn()}
        onCreatePayee={onCreatePayee}
      />,
    )

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "Coffee Shop")

    const createButton = screen.getByRole("button", {
      name: /New payee "Coffee Shop"/i,
    })
    await user.click(createButton)

    expect(onCreatePayee).toHaveBeenCalledWith("Coffee Shop")
  })
})
