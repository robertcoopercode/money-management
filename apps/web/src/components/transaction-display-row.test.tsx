import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TransactionDisplayRow } from "./transaction-display-row.js"
import type { Transaction } from "../types.js"

const noop = vi.fn()

const defaultProps = {
  tags: [] as import("../types.js").Tag[],
  expandedSplitIds: new Set<string>(),
  onStartEditing: noop,
  onToggleSplitExpand: noop,
  onClearedChange: noop,
  onClearingStatusChange: noop,
  isUpdatePending: false,
  isSelected: false,
  onToggleSelect: noop,
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "txn-1",
    date: "2026-02-01",
    amountMinor: -5000,
    note: null,
    clearingStatus: "UNCLEARED",
    manualCreated: true,
    pendingApproval: false,
    importedTransactionId: null,
    importedTransaction: null,
    isTransfer: false,
    transferPairId: null,
    transferAccountId: null,
    transferAccount: null,
    account: {
      id: "acc-cash",
      name: "Checking",
      type: "CASH",
      isActive: true,
      startingBalanceMinor: 0,
      clearedBalanceMinor: 0,
      unclearedBalanceMinor: 10000,
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

afterEach(() => {
  cleanup()
})

describe("TransactionDisplayRow", () => {
  describe("regular transactions", () => {
    it("shows payee name and category name", () => {
      const transaction = makeTransaction({
        payee: { id: "p1", name: "Grocery Store" },
        category: { id: "c1", name: "Groceries", groupId: "g1" },
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      // cells: checkbox, account, date, payee, category, note, amount, tags, actions
      expect(cells[3]!.textContent).toBe("Grocery Store")
      expect(cells[4]!.textContent).toBe("Groceries")
    })

    it("shows em-dash for null payee and empty for null category", () => {
      const transaction = makeTransaction()

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[3]!.textContent).toBe("\u2014")
      expect(cells[4]!.textContent).toBe("")
    })
  })

  describe("non-loan transfers (cash/credit)", () => {
    it("shows Payment to in payee for cash-to-credit outgoing transfer", () => {
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: -5000,
        transferAccountId: "acc-visa",
        transferAccount: {
          id: "acc-visa",
          name: "WS Visa",
          type: "CREDIT",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: -20000,
          balanceMinor: -20000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[3]!.textContent).toBe("Payment to WS Visa")
      expect(cells[4]!.textContent).toBe("")
    })

    it("shows Transfer from in payee and empty category for incoming transfer", () => {
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: 5000,
        transferAccountId: "acc-savings",
        transferAccount: {
          id: "acc-savings",
          name: "Savings",
          type: "CASH",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: 20000,
          balanceMinor: 20000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[3]!.textContent).toBe("Transfer from Savings")
      expect(cells[4]!.textContent).toBe("")
    })

    it("shows Transfer to in payee for cash-to-cash outgoing transfer", () => {
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: -5000,
        transferAccountId: "acc-savings",
        transferAccount: {
          id: "acc-savings",
          name: "Savings",
          type: "CASH",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: 20000,
          balanceMinor: 20000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[3]!.textContent).toBe("Transfer to Savings")
      expect(cells[4]!.textContent).toBe("")
    })
  })

  describe("loan transfers", () => {
    it("shows category name when cash-to-loan transfer has a category", () => {
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: -40000,
        transferAccountId: "acc-loan",
        transferAccount: {
          id: "acc-loan",
          name: "2022 RAV4",
          type: "LOAN",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: -2000000,
          balanceMinor: -2000000,
          loanProfile: null,
        },
        category: { id: "c-interest", name: "Interest", groupId: "g1" },
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[3]!.textContent).toBe("Payment to 2022 RAV4")
      expect(cells[4]!.textContent).toBe("Interest")
    })

    it("shows em-dash when cash-to-loan transfer has no category", () => {
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: -40000,
        transferAccountId: "acc-loan",
        transferAccount: {
          id: "acc-loan",
          name: "2022 RAV4",
          type: "LOAN",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: -2000000,
          balanceMinor: -2000000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[3]!.textContent).toBe("Payment to 2022 RAV4")
      expect(cells[4]!.textContent).toBe("")
    })

    it("shows em-dash when loan-to-cash transfer has no category", () => {
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: 40000,
        account: {
          id: "acc-loan",
          name: "2022 RAV4",
          type: "LOAN",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: -2000000,
          balanceMinor: -2000000,
          loanProfile: null,
        },
        transferAccountId: "acc-cash",
        transferAccount: {
          id: "acc-cash",
          name: "WS Cash",
          type: "CASH",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: 10000,
          balanceMinor: 10000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[3]!.textContent).toBe("Payment from WS Cash")
      expect(cells[4]!.textContent).toBe("")
    })
  })

  describe("jump to transfer button", () => {
    it("does not render jump button for non-transfer transactions", () => {
      const onJumpToTransfer = vi.fn()
      const transaction = makeTransaction({
        payee: { id: "p1", name: "Grocery Store" },
      })

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          onJumpToTransfer={onJumpToTransfer}
        />,
      )

      expect(
        screen.queryByLabelText("Jump to linked transfer"),
      ).toBeNull()
    })

    it("does not render jump button when transferPairId is null", () => {
      const onJumpToTransfer = vi.fn()
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: -5000,
        transferPairId: null,
        transferAccountId: "acc-savings",
        transferAccount: {
          id: "acc-savings",
          name: "Savings",
          type: "CASH",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: 20000,
          balanceMinor: 20000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          onJumpToTransfer={onJumpToTransfer}
        />,
      )

      expect(
        screen.queryByLabelText("Jump to linked transfer"),
      ).toBeNull()
    })

    it("renders jump button for transfer with transferPairId", () => {
      const onJumpToTransfer = vi.fn()
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: -5000,
        transferPairId: "pair-1",
        transferAccountId: "acc-savings",
        transferAccount: {
          id: "acc-savings",
          name: "Savings",
          type: "CASH",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: 20000,
          balanceMinor: 20000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          onJumpToTransfer={onJumpToTransfer}
        />,
      )

      expect(
        screen.getByLabelText("Jump to linked transfer"),
      ).toBeTruthy()
    })

    it("calls onJumpToTransfer with transferPairId and transaction id on click", async () => {
      const user = userEvent.setup()
      const onJumpToTransfer = vi.fn()
      const transaction = makeTransaction({
        id: "txn-source",
        isTransfer: true,
        amountMinor: -5000,
        transferPairId: "pair-1",
        transferAccountId: "acc-savings",
        transferAccount: {
          id: "acc-savings",
          name: "Savings",
          type: "CASH",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: 20000,
          balanceMinor: 20000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          onJumpToTransfer={onJumpToTransfer}
        />,
      )

      await user.click(screen.getByLabelText("Jump to linked transfer"))
      expect(onJumpToTransfer).toHaveBeenCalledWith("pair-1", "txn-source")
    })

    it("does not call onStartEditing when jump button is clicked", async () => {
      const user = userEvent.setup()
      const onStartEditing = vi.fn()
      const onJumpToTransfer = vi.fn()
      const transaction = makeTransaction({
        isTransfer: true,
        amountMinor: -5000,
        transferPairId: "pair-1",
        transferAccountId: "acc-savings",
        transferAccount: {
          id: "acc-savings",
          name: "Savings",
          type: "CASH",
          isActive: true,
          startingBalanceMinor: 0,
          clearedBalanceMinor: 0,
          unclearedBalanceMinor: 20000,
          balanceMinor: 20000,
          loanProfile: null,
        },
      })

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          onStartEditing={onStartEditing}
          onJumpToTransfer={onJumpToTransfer}
        />,
      )

      await user.click(screen.getByLabelText("Jump to linked transfer"))
      expect(onStartEditing).not.toHaveBeenCalled()
      expect(onJumpToTransfer).toHaveBeenCalledOnce()
    })
  })

  describe("import approval icons", () => {
    it("renders chain-link icon when pendingApproval && importedTransactionId && manualCreated", () => {
      const transaction = makeTransaction({
        pendingApproval: true,
        importedTransactionId: "imp-1",
        manualCreated: true,
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      expect(
        screen.getByLabelText("Matched import - click to review"),
      ).toBeTruthy()
    })

    it("renders info icon when pendingApproval && !manualCreated", () => {
      const transaction = makeTransaction({
        pendingApproval: true,
        manualCreated: false,
        importedTransactionId: "imp-2",
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      expect(
        screen.getByLabelText("New import - click to review"),
      ).toBeTruthy()
    })

    it("renders no icon when pendingApproval is false", () => {
      const transaction = makeTransaction({
        pendingApproval: false,
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      expect(
        screen.queryByLabelText("Matched import - click to review"),
      ).toBeNull()
      expect(
        screen.queryByLabelText("New import - click to review"),
      ).toBeNull()
    })
  })

  describe("selection behavior", () => {
    it("renders a checkbox", () => {
      const transaction = makeTransaction()
      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )
      expect(screen.getByRole("checkbox")).toBeTruthy()
    })

    it("first click on unselected row calls onToggleSelect, not onStartEditing", async () => {
      const user = userEvent.setup()
      const onStartEditing = vi.fn()
      const onToggleSelect = vi.fn()
      const transaction = makeTransaction({
        payee: { id: "p1", name: "Test Payee" },
      })

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          isSelected={false}
          onStartEditing={onStartEditing}
          onToggleSelect={onToggleSelect}
        />,
      )

      const cells = screen.getAllByRole("cell")
      await user.click(cells[3]!) // payee cell
      expect(onToggleSelect).toHaveBeenCalledWith("txn-1", false)
      expect(onStartEditing).not.toHaveBeenCalled()
    })

    it("click on selected row calls onStartEditing", async () => {
      const user = userEvent.setup()
      const onStartEditing = vi.fn()
      const onToggleSelect = vi.fn()
      const transaction = makeTransaction({
        payee: { id: "p1", name: "Test Payee" },
      })

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          isSelected={true}
          onStartEditing={onStartEditing}
          onToggleSelect={onToggleSelect}
        />,
      )

      const cells = screen.getAllByRole("cell")
      await user.click(cells[3]!) // payee cell
      expect(onStartEditing).toHaveBeenCalledWith(transaction, "payee")
      expect(onToggleSelect).not.toHaveBeenCalled()
    })

    it("checkbox click calls onToggleSelect", async () => {
      const user = userEvent.setup()
      const onToggleSelect = vi.fn()
      const transaction = makeTransaction()

      render(
        <TransactionDisplayRow
          transaction={transaction}
          {...defaultProps}
          onToggleSelect={onToggleSelect}
        />,
      )

      await user.click(screen.getByRole("checkbox"))
      expect(onToggleSelect).toHaveBeenCalledWith("txn-1", false)
    })
  })

  describe("split transactions", () => {
    it("shows Split transaction text in category cell", () => {
      const transaction = makeTransaction({
        splits: [
          {
            id: "s1",
            categoryId: "c1",
            amountMinor: -3000,
            category: {
              id: "c1",
              name: "Groceries",
              groupId: "g1",
              group: { id: "g1", name: "Variable" },
            },
          },
          {
            id: "s2",
            categoryId: "c2",
            amountMinor: -2000,
            category: {
              id: "c2",
              name: "Household",
              groupId: "g1",
              group: { id: "g1", name: "Variable" },
            },
          },
        ],
      })

      render(
        <TransactionDisplayRow transaction={transaction} {...defaultProps} />,
      )

      const cells = screen.getAllByRole("cell")
      expect(cells[4]!.textContent).toContain("Split transaction")
    })
  })
})
