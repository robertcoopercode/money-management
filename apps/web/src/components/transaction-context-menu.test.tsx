import { cleanup, render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TransactionContextMenu } from "./transaction-context-menu.js"
import type { Transaction } from "../types.js"

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    date: "2026-02-01",
    amountMinor: -5000,
    note: null,
    cleared: false,
    isTransfer: false,
    transferPairId: null,
    transferAccountId: null,
    transferAccount: null,
    account: {
      id: "acc-cash",
      name: "Checking",
      type: "CASH",
      startingBalanceMinor: 0,
      balanceMinor: 10000,
      loanProfile: null,
    },
    payee: null,
    category: null,
    splits: [],
    tags: [],
    origins: [{ originType: "MANUAL" }],
    ...overrides,
  }
}

const defaultCallbacks = {
  onToggleCleared: vi.fn(),
  onDuplicate: vi.fn(),
  onDelete: vi.fn(),
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("TransactionContextMenu", () => {
  it("renders children", () => {
    render(
      <TransactionContextMenu
        transaction={makeTransaction()}
        {...defaultCallbacks}
      >
        <div data-testid="child">Hello</div>
      </TransactionContextMenu>,
    )

    expect(screen.getByTestId("child")).toBeTruthy()
  })

  it('shows "Mark as cleared" for uncleared transaction', async () => {
    render(
      <TransactionContextMenu
        transaction={makeTransaction({ cleared: false })}
        {...defaultCallbacks}
      >
        <div data-testid="trigger">Row</div>
      </TransactionContextMenu>,
    )

    fireEvent.contextMenu(screen.getByTestId("trigger"))
    expect(
      await screen.findByRole("menuitem", { name: /mark as cleared/i }),
    ).toBeTruthy()
  })

  it('shows "Mark as uncleared" for cleared transaction', async () => {
    render(
      <TransactionContextMenu
        transaction={makeTransaction({ cleared: true })}
        {...defaultCallbacks}
      >
        <div data-testid="trigger">Row</div>
      </TransactionContextMenu>,
    )

    fireEvent.contextMenu(screen.getByTestId("trigger"))
    expect(
      await screen.findByRole("menuitem", { name: /mark as uncleared/i }),
    ).toBeTruthy()
  })

  it("calls onToggleCleared with id and toggled value", async () => {
    const user = userEvent.setup()
    const onToggleCleared = vi.fn()

    render(
      <TransactionContextMenu
        transaction={makeTransaction({ id: "txn-42", cleared: false })}
        onToggleCleared={onToggleCleared}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
      >
        <div data-testid="trigger">Row</div>
      </TransactionContextMenu>,
    )

    fireEvent.contextMenu(screen.getByTestId("trigger"))
    const item = await screen.findByRole("menuitem", {
      name: /mark as cleared/i,
    })
    await user.click(item)
    expect(onToggleCleared).toHaveBeenCalledWith("txn-42", true)
  })

  it("calls onDuplicate with the transaction", async () => {
    const user = userEvent.setup()
    const onDuplicate = vi.fn()
    const transaction = makeTransaction()

    render(
      <TransactionContextMenu
        transaction={transaction}
        onToggleCleared={vi.fn()}
        onDuplicate={onDuplicate}
        onDelete={vi.fn()}
      >
        <div data-testid="trigger">Row</div>
      </TransactionContextMenu>,
    )

    fireEvent.contextMenu(screen.getByTestId("trigger"))
    const item = await screen.findByRole("menuitem", { name: /duplicate/i })
    await user.click(item)
    expect(onDuplicate).toHaveBeenCalledWith(transaction)
  })

  it("calls onDelete with the transaction id", async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <TransactionContextMenu
        transaction={makeTransaction({ id: "txn-99" })}
        onToggleCleared={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={onDelete}
      >
        <div data-testid="trigger">Row</div>
      </TransactionContextMenu>,
    )

    fireEvent.contextMenu(screen.getByTestId("trigger"))
    const item = await screen.findByRole("menuitem", { name: /delete/i })
    await user.click(item)
    expect(onDelete).toHaveBeenCalledWith("txn-99")
  })
})
