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

    const createOption = screen.getByRole("option", {
      name: /Create "Coffee Shop" Payee/i,
    })
    await user.click(createOption)

    expect(onCreatePayee).toHaveBeenCalledWith("Coffee Shop")
  })

  it("shows transfer accounts with Payment to prefix for cash-to-credit when isExpense", async () => {
    const user = userEvent.setup()

    render(<PayeeAutocomplete {...defaultProps} isExpense />)

    const input = screen.getByRole("combobox")
    await user.click(input)

    expect(
      screen.getByRole("option", { name: /Payment to Rogers MasterCard/i }),
    ).toBeTruthy()
    expect(screen.queryByRole("option", { name: /RBC Chequing/i })).toBeNull()
  })

  it("shows transfer accounts with Payment from prefix for cash-to-credit when not isExpense", async () => {
    const user = userEvent.setup()

    render(<PayeeAutocomplete {...defaultProps} isExpense={false} />)

    const input = screen.getByRole("combobox")
    await user.click(input)

    expect(
      screen.getByRole("option", { name: /Payment from Rogers MasterCard/i }),
    ).toBeTruthy()
  })

  describe("transfer direction labels by account type", () => {
    const accountsWithCredit = [
      { id: "chequing", name: "RBC Chequing", type: "CASH" },
      { id: "credit", name: "Rogers MasterCard", type: "CREDIT" },
      { id: "savings", name: "WS Cash", type: "CASH" },
    ]

    it("shows 'Payment from' on a credit account when isExpense is false (inflow)", async () => {
      const user = userEvent.setup()

      render(
        <PayeeAutocomplete
          payees={payees}
          accounts={accountsWithCredit}
          currentAccountId="credit"
          value={null}
          onChange={vi.fn()}
          isExpense={false}
        />,
      )

      const input = screen.getByRole("combobox")
      await user.click(input)

      expect(
        screen.getByRole("option", { name: /Payment from RBC Chequing/i }),
      ).toBeTruthy()
      expect(
        screen.getByRole("option", { name: /Payment from WS Cash/i }),
      ).toBeTruthy()
    })

    it("shows 'Payment to' on a credit account when isExpense is true (outflow)", async () => {
      const user = userEvent.setup()

      render(
        <PayeeAutocomplete
          payees={payees}
          accounts={accountsWithCredit}
          currentAccountId="credit"
          value={null}
          onChange={vi.fn()}
          isExpense
        />,
      )

      const input = screen.getByRole("combobox")
      await user.click(input)

      expect(
        screen.getByRole("option", { name: /Payment to RBC Chequing/i }),
      ).toBeTruthy()
      expect(
        screen.getByRole("option", { name: /Payment to WS Cash/i }),
      ).toBeTruthy()
    })

    it("shows 'Payment to' for credit and 'Transfer to' for cash on a cash account when isExpense is true (outflow)", async () => {
      const user = userEvent.setup()

      render(
        <PayeeAutocomplete
          payees={payees}
          accounts={accountsWithCredit}
          currentAccountId="chequing"
          value={null}
          onChange={vi.fn()}
          isExpense
        />,
      )

      const input = screen.getByRole("combobox")
      await user.click(input)

      expect(
        screen.getByRole("option", { name: /Payment to Rogers MasterCard/i }),
      ).toBeTruthy()
      expect(
        screen.getByRole("option", { name: /Transfer to WS Cash/i }),
      ).toBeTruthy()
    })

    it("shows 'Payment from' for credit and 'Transfer from' for cash on a cash account when isExpense is false (inflow)", async () => {
      const user = userEvent.setup()

      render(
        <PayeeAutocomplete
          payees={payees}
          accounts={accountsWithCredit}
          currentAccountId="chequing"
          value={null}
          onChange={vi.fn()}
          isExpense={false}
        />,
      )

      const input = screen.getByRole("combobox")
      await user.click(input)

      expect(
        screen.getByRole("option", { name: /Payment from Rogers MasterCard/i }),
      ).toBeTruthy()
      expect(
        screen.getByRole("option", { name: /Transfer from WS Cash/i }),
      ).toBeTruthy()
    })

    it("updates transfer labels when isExpense changes", async () => {
      const user = userEvent.setup()

      const { rerender } = render(
        <PayeeAutocomplete
          payees={payees}
          accounts={accountsWithCredit}
          currentAccountId="credit"
          value={null}
          onChange={vi.fn()}
          isExpense
        />,
      )

      const input = screen.getByRole("combobox")
      await user.click(input)

      // Initially expense → "Payment to" (credit-to-cash)
      expect(
        screen.getByRole("option", { name: /Payment to RBC Chequing/i }),
      ).toBeTruthy()

      // Toggle to income
      rerender(
        <PayeeAutocomplete
          payees={payees}
          accounts={accountsWithCredit}
          currentAccountId="credit"
          value={null}
          onChange={vi.fn()}
          isExpense={false}
        />,
      )

      // Should now show "Payment from"
      expect(
        screen.getByRole("option", { name: /Payment from RBC Chequing/i }),
      ).toBeTruthy()
      expect(
        screen.queryByRole("option", { name: /Payment to/i }),
      ).toBeNull()
    })
  })

  it("calls onChange with transfer option including Payment to name for cash-to-credit", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<PayeeAutocomplete {...defaultProps} onChange={onChange} isExpense />)

    const input = screen.getByRole("combobox")
    await user.click(input)
    await user.click(screen.getByRole("option", { name: /Payment to Rogers MasterCard/i }))

    expect(onChange).toHaveBeenLastCalledWith({
      kind: "transfer",
      id: "transfer:credit",
      name: "Payment to Rogers MasterCard",
      accountId: "credit",
      isLoanPayment: false,
    })
  })
})
