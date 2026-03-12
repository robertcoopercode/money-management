import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PayeeAutocomplete } from "./payee-autocomplete.js"

const payees = [
  { id: "hydro", name: "Hydro One" },
  { id: "grocery", name: "Fresh Grocery" },
  { id: "rent", name: "City Rent" },
]

const accounts = [
  { id: "chequing", name: "RBC Chequing", type: "CASH" },
  { id: "credit", name: "Rogers MasterCard", type: "CREDIT" },
]

const defaultProps = {
  payees,
  accounts,
  currentAccountId: "chequing",
  value: null,
  onChange: vi.fn(),
}

afterEach(() => {
  cleanup()
})

describe("PayeeAutocomplete", () => {
  it("filters payees while typing", async () => {
    const user = userEvent.setup()

    render(<PayeeAutocomplete {...defaultProps} />)

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "hydr")

    expect(screen.getByRole("option", { name: /Hydro One/i })).toBeTruthy()
    expect(screen.queryByRole("option", { name: /Fresh Grocery/i })).toBeNull()
  })

  it("selects an existing payee from filtered results", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PayeeAutocomplete {...defaultProps} onChange={onChange} />)

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.type(input, "city")
    await user.click(screen.getByRole("option", { name: /City Rent/i }))

    expect(onChange).toHaveBeenLastCalledWith({
      kind: "payee",
      id: "rent",
      name: "City Rent",
    })
  })

  it("shows create button only when no payee matches", async () => {
    const user = userEvent.setup()
    const onCreatePayee = vi
      .fn()
      .mockResolvedValue({ id: "new", name: "Coffee Shop" })

    render(
      <PayeeAutocomplete {...defaultProps} onCreatePayee={onCreatePayee} />,
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

  it("shows transfer accounts excluding current account", async () => {
    const user = userEvent.setup()

    render(<PayeeAutocomplete {...defaultProps} />)

    const input = screen.getByRole("combobox")
    await user.click(input)

    expect(
      screen.getByRole("option", { name: /Rogers MasterCard/i }),
    ).toBeTruthy()
    expect(screen.queryByRole("option", { name: /RBC Chequing/i })).toBeNull()
  })

  it("calls onChange with transfer option when selecting a transfer account", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PayeeAutocomplete {...defaultProps} onChange={onChange} />)

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.click(screen.getByRole("option", { name: /Rogers MasterCard/i }))

    expect(onChange).toHaveBeenLastCalledWith({
      kind: "transfer",
      id: "transfer:credit",
      name: "Rogers MasterCard",
      accountId: "credit",
      isLoanPayment: false,
    })
  })
})
