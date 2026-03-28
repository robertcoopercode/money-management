import { beforeEach, describe, expect, it, vi } from "vitest"
import { Effect } from "effect"

vi.mock("@ledgr/db", () => {
  const mock: Record<string, unknown> = {
    account: {
      findUnique: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    transactionSplit: {
      create: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    splitTag: {
      createMany: vi.fn(),
    },
    transactionTag: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    transactionOrigin: {
      create: vi.fn(),
    },
    payee: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  // $transaction passes itself as the transactionDb argument
  ;(mock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (cb: (tx: unknown) => Promise<unknown>) => cb(mock),
  )
  return {
    prisma: mock,
    OriginType: { MANUAL: "MANUAL", CSV_IMPORT: "CSV_IMPORT" },
    Prisma: {},
  }
})

import { prisma } from "@ledgr/db"
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "./transaction-service.js"

// Cast to access mock methods
const mockPrisma = prisma as unknown as {
  account: { findUnique: ReturnType<typeof vi.fn> }
  transaction: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    findUniqueOrThrow: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  transactionSplit: {
    create: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  splitTag: { createMany: ReturnType<typeof vi.fn> }
  transactionTag: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> }
  transactionOrigin: { create: ReturnType<typeof vi.fn> }
  payee: { updateMany: ReturnType<typeof vi.fn> }
  $transaction: ReturnType<typeof vi.fn>
}

// --- Constants & Factories ---

const ACCOUNT_CHECKING = { id: "acc-checking", type: "CASH" }
const ACCOUNT_SAVINGS = { id: "acc-savings", type: "CASH" }
const ACCOUNT_LOAN = { id: "acc-loan", type: "LOAN" }

type ClearingStatus = "UNCLEARED" | "CLEARED" | "RECONCILED"

const makeCreateInput = (overrides: Record<string, unknown> = {}) => ({
  accountId: ACCOUNT_CHECKING.id,
  date: "2026-01-15",
  amountMinor: -5000,
  payeeId: "payee-1",
  categoryId: "cat-1",
  note: "Test transaction",
  ...overrides,
  clearingStatus: ((overrides.clearingStatus as ClearingStatus) ?? "UNCLEARED") as ClearingStatus,
})

const makeTransferInput = (overrides: Record<string, unknown> = {}) => ({
  ...makeCreateInput(),
  transferAccountId: ACCOUNT_SAVINGS.id,
  note: "Transfer to savings",
  ...overrides,
  clearingStatus: ((overrides.clearingStatus as ClearingStatus) ?? "UNCLEARED") as ClearingStatus,
})

const makeFullTransaction = (overrides: Record<string, unknown> = {}) => ({
  id: "txn-1",
  accountId: ACCOUNT_CHECKING.id,
  date: new Date("2026-01-15T00:00:00.000Z"),
  amountMinor: -5000,
  payeeId: "payee-1",
  categoryId: "cat-1",
  note: "Test transaction",
  clearingStatus: "UNCLEARED",
  manualCreated: true,
  isTransfer: false,
  transferAccountId: null,
  transferPairId: null,
  account: ACCOUNT_CHECKING,
  payee: { id: "payee-1", name: "Store" },
  category: { id: "cat-1", name: "Groceries", group: { id: "g1", name: "Needs" } },
  transferAccount: null,
  origins: [],
  splits: [],
  ...overrides,
})

const makeExistingForUpdate = (overrides: Record<string, unknown> = {}) => ({
  id: "txn-1",
  accountId: ACCOUNT_CHECKING.id,
  transferAccountId: null,
  categoryId: "cat-1",
  transferPairId: null,
  isTransfer: false,
  amountMinor: -5000,
  date: new Date("2026-01-15T00:00:00.000Z"),
  note: "Test transaction",
  clearingStatus: "UNCLEARED",
  account: { type: "CASH" },
  transferAccount: null,
  ...overrides,
})

// --- Helpers ---

/**
 * Get the first positional arg of the Nth call to a mock fn.
 * Returns the typical Prisma `{ data, where }` object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function callArg(fn: ReturnType<typeof vi.fn>, callIndex = 0): any {
  const args = fn.mock.calls[callIndex]
  if (!args) throw new Error(`Expected call at index ${callIndex} but found none`)
  return args[0]
}

function setupAccountLookups(
  source: { id: string; type: string },
  target: { id: string; type: string },
) {
  mockPrisma.account.findUnique
    .mockResolvedValueOnce({ type: source.type })
    .mockResolvedValueOnce({ type: target.type })
}

function setupCreateDefaults() {
  mockPrisma.transaction.create.mockResolvedValue({ id: "txn-source" })
  mockPrisma.transactionOrigin.create.mockResolvedValue({})
  mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())
}

// --- Tests ---

describe("transaction-service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Restore $transaction behavior after clearAllMocks
    mockPrisma.$transaction.mockImplementation(
      async (cb: (tx: unknown) => Promise<unknown>) => cb(mockPrisma),
    )
  })

  // ─── createTransaction ───────────────────────────────────────────

  describe("createTransaction", () => {
    describe("regular transaction", () => {
      it("creates a transaction with category and MANUAL origin", async () => {
        setupCreateDefaults()
        const input = makeCreateInput()

        const result = await Effect.runPromise(createTransaction(input))

        expect(mockPrisma.transaction.create).toHaveBeenCalledOnce()
        const createData = callArg(mockPrisma.transaction.create).data
        expect(createData.accountId).toBe(ACCOUNT_CHECKING.id)
        expect(createData.categoryId).toBe("cat-1")
        expect(createData.amountMinor).toBe(-5000)
        expect(createData.isTransfer).toBe(false)
        expect(createData.transferPairId).toBeNull()

        expect(mockPrisma.transactionOrigin.create).toHaveBeenCalledOnce()
        expect(callArg(mockPrisma.transactionOrigin.create).data.originType).toBe("MANUAL")

        expect(result).toBeDefined()
      })

      it("creates splits and strips categoryId when splits provided", async () => {
        setupCreateDefaults()
        mockPrisma.transactionSplit.create
          .mockResolvedValueOnce({ id: "split-1" })
          .mockResolvedValueOnce({ id: "split-2" })

        const input = makeCreateInput({
          splits: [
            { categoryId: "cat-a", amountMinor: -3000, note: "A" },
            { categoryId: "cat-b", amountMinor: -2000, note: "B" },
          ],
        })

        await Effect.runPromise(createTransaction(input))

        const createData = callArg(mockPrisma.transaction.create).data
        expect(createData.categoryId).toBeUndefined()

        expect(mockPrisma.transactionSplit.create).toHaveBeenCalledTimes(2)
        const split0 = callArg(mockPrisma.transactionSplit.create, 0).data
        const split1 = callArg(mockPrisma.transactionSplit.create, 1).data
        expect(split0.sortOrder).toBe(0)
        expect(split1.sortOrder).toBe(1)
      })
    })

    describe("transfer validation", () => {
      it("throws when transferAccountId equals accountId", async () => {
        const input = makeTransferInput({
          accountId: ACCOUNT_CHECKING.id,
          transferAccountId: ACCOUNT_CHECKING.id,
        })

        await expect(Effect.runPromise(createTransaction(input))).rejects.toThrow(
          "same as source account",
        )
      })
    })

    describe("transfer pair creation", () => {
      beforeEach(() => {
        setupAccountLookups(ACCOUNT_CHECKING, ACCOUNT_SAVINGS)
        mockPrisma.transaction.create
          .mockResolvedValueOnce({ id: "txn-source" })
          .mockResolvedValueOnce({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true, transferAccountId: ACCOUNT_SAVINGS.id }),
        )
      })

      it("creates two linked transactions with shared transferPairId", async () => {
        const input = makeTransferInput()

        await Effect.runPromise(createTransaction(input))

        expect(mockPrisma.transaction.create).toHaveBeenCalledTimes(2)

        const sourceData = callArg(mockPrisma.transaction.create, 0).data
        const mirrorData = callArg(mockPrisma.transaction.create, 1).data

        expect(sourceData.transferPairId).toBeTruthy()
        expect(sourceData.transferPairId).toBe(mirrorData.transferPairId)

        expect(sourceData.accountId).toBe(ACCOUNT_CHECKING.id)
        expect(sourceData.transferAccountId).toBe(ACCOUNT_SAVINGS.id)
        expect(mirrorData.accountId).toBe(ACCOUNT_SAVINGS.id)
        expect(mirrorData.transferAccountId).toBe(ACCOUNT_CHECKING.id)
      })

      it("inverts amount on mirror transaction", async () => {
        const input = makeTransferInput({ amountMinor: -5000 })

        await Effect.runPromise(createTransaction(input))

        const mirrorData = callArg(mockPrisma.transaction.create, 1).data
        expect(mirrorData.amountMinor).toBe(5000)
      })

      it("mirrors note exactly to mirror transaction", async () => {
        const input = makeTransferInput({ note: "Payment" })

        await Effect.runPromise(createTransaction(input))

        const mirrorData = callArg(mockPrisma.transaction.create, 1).data
        expect(mirrorData.note).toBe("Payment")
      })

      it("mirrors undefined note as undefined", async () => {
        const input = makeTransferInput({ note: undefined })

        await Effect.runPromise(createTransaction(input))

        const mirrorData = callArg(mockPrisma.transaction.create, 1).data
        expect(mirrorData.note).toBeUndefined()
      })

      it("sets isTransfer=true on both source and mirror", async () => {
        await Effect.runPromise(createTransaction(makeTransferInput()))

        const sourceData = callArg(mockPrisma.transaction.create, 0).data
        const mirrorData = callArg(mockPrisma.transaction.create, 1).data
        expect(sourceData.isTransfer).toBe(true)
        expect(mirrorData.isTransfer).toBe(true)
      })

      it("creates MANUAL origin for both transactions", async () => {
        await Effect.runPromise(createTransaction(makeTransferInput()))

        expect(mockPrisma.transactionOrigin.create).toHaveBeenCalledTimes(2)

        const firstOrigin = callArg(mockPrisma.transactionOrigin.create, 0).data
        const secondOrigin = callArg(mockPrisma.transactionOrigin.create, 1).data
        expect(firstOrigin.originType).toBe("MANUAL")
        expect(firstOrigin.transactionId).toBe("txn-source")
        expect(secondOrigin.originType).toBe("MANUAL")
        expect(secondOrigin.transactionId).toBe("txn-mirror")
      })

      it("strips categoryId on both sides for non-loan transfers", async () => {
        const input = makeTransferInput({ categoryId: "cat-1" })

        await Effect.runPromise(createTransaction(input))

        const sourceData = callArg(mockPrisma.transaction.create, 0).data
        const mirrorData = callArg(mockPrisma.transaction.create, 1).data
        expect(sourceData.categoryId).toBeUndefined()
        expect(mirrorData.categoryId).toBeUndefined()
      })
    })

    describe("loan transfer", () => {
      it("strips categoryId from source when source is LOAN, assigns to mirror", async () => {
        setupAccountLookups(ACCOUNT_LOAN, ACCOUNT_SAVINGS)
        mockPrisma.transaction.create
          .mockResolvedValueOnce({ id: "txn-source" })
          .mockResolvedValueOnce({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        const input = makeTransferInput({
          accountId: ACCOUNT_LOAN.id,
          transferAccountId: ACCOUNT_SAVINGS.id,
          categoryId: "cat-loan",
        })

        await Effect.runPromise(createTransaction(input))

        const sourceData = callArg(mockPrisma.transaction.create, 0).data
        const mirrorData = callArg(mockPrisma.transaction.create, 1).data
        expect(sourceData.categoryId).toBeUndefined()
        expect(mirrorData.categoryId).toBe("cat-loan")
      })

      it("keeps categoryId on source when target is LOAN, strips from mirror", async () => {
        setupAccountLookups(ACCOUNT_CHECKING, ACCOUNT_LOAN)
        mockPrisma.transaction.create
          .mockResolvedValueOnce({ id: "txn-source" })
          .mockResolvedValueOnce({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        const input = makeTransferInput({
          accountId: ACCOUNT_CHECKING.id,
          transferAccountId: ACCOUNT_LOAN.id,
          categoryId: "cat-loan",
        })

        await Effect.runPromise(createTransaction(input))

        const sourceData = callArg(mockPrisma.transaction.create, 0).data
        const mirrorData = callArg(mockPrisma.transaction.create, 1).data
        expect(sourceData.categoryId).toBe("cat-loan")
        expect(mirrorData.categoryId).toBeUndefined()
      })
    })
  })

  // ─── updateTransaction ──────────────────────────────────────────

  describe("updateTransaction", () => {
    describe("non-transfer", () => {
      it("updates all fields on a non-transfer transaction", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(
          updateTransaction("txn-1", {
            date: "2026-02-01",
            amountMinor: -9999,
            payeeId: "payee-2",
            categoryId: "cat-2",
            note: "Updated",
            clearingStatus: "CLEARED",
          }),
        )

        expect(mockPrisma.transaction.update).toHaveBeenCalledOnce()
        const data = callArg(mockPrisma.transaction.update).data
        expect(data.amountMinor).toBe(-9999)
        expect(data.categoryId).toBe("cat-2")
        expect(data.note).toBe("Updated")
        expect(data.clearingStatus).toBe("CLEARED")
      })

      it("replaces splits on update", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transactionSplit.deleteMany.mockResolvedValue({ count: 1 })
        mockPrisma.transactionSplit.create
          .mockResolvedValueOnce({ id: "split-1" })
          .mockResolvedValueOnce({ id: "split-2" })
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(
          updateTransaction("txn-1", {
            splits: [
              { categoryId: "cat-a", amountMinor: -3000, note: "A" },
              { categoryId: "cat-b", amountMinor: -2000, note: "B" },
            ],
          }),
        )

        expect(mockPrisma.transactionSplit.deleteMany).toHaveBeenCalledWith({
          where: { transactionId: "txn-1" },
        })
        expect(mockPrisma.transactionSplit.create).toHaveBeenCalledTimes(2)
      })

      it("clears splits when empty array provided", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transactionSplit.deleteMany.mockResolvedValue({ count: 1 })
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(updateTransaction("txn-1", { splits: [] }))

        expect(mockPrisma.transactionSplit.deleteMany).toHaveBeenCalledOnce()
        expect(mockPrisma.transactionSplit.createMany).not.toHaveBeenCalled()
      })

      it("deletes all tags when tagIds is empty array", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transactionTag.deleteMany.mockResolvedValue({ count: 2 })
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(updateTransaction("txn-1", { tagIds: [] }))

        expect(mockPrisma.transactionTag.deleteMany).toHaveBeenCalledWith({
          where: { transactionId: "txn-1" },
        })
        expect(mockPrisma.transactionTag.createMany).not.toHaveBeenCalled()
      })

      it("does not touch tags when tagIds is undefined", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(updateTransaction("txn-1", { note: "updated" }))

        expect(mockPrisma.transactionTag.deleteMany).not.toHaveBeenCalled()
        expect(mockPrisma.transactionTag.createMany).not.toHaveBeenCalled()
      })
    })

    describe("convert to transfer", () => {
      it("creates a mirror transaction when setting transferAccountId on a non-transfer", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.account.findUnique
          .mockResolvedValueOnce({ type: "CASH" })
          .mockResolvedValueOnce({ type: "CASH" })
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.create.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true, transferAccountId: ACCOUNT_SAVINGS.id }),
        )

        await Effect.runPromise(
          updateTransaction("txn-1", {
            transferAccountId: ACCOUNT_SAVINGS.id,
            amountMinor: -5000,
          }),
        )

        // Source should be updated
        expect(mockPrisma.transaction.update).toHaveBeenCalledOnce()
        const sourceData = callArg(mockPrisma.transaction.update).data
        expect(sourceData.isTransfer).toBe(true)
        expect(sourceData.transferAccountId).toBe(ACCOUNT_SAVINGS.id)
        expect(sourceData.transferPairId).toBeTruthy()

        // Mirror should be created
        expect(mockPrisma.transaction.create).toHaveBeenCalledOnce()
        const mirrorData = callArg(mockPrisma.transaction.create).data
        expect(mirrorData.accountId).toBe(ACCOUNT_SAVINGS.id)
        expect(mirrorData.transferAccountId).toBe(ACCOUNT_CHECKING.id)
        expect(mirrorData.amountMinor).toBe(5000)
        expect(mirrorData.isTransfer).toBe(true)
        expect(mirrorData.transferPairId).toBe(sourceData.transferPairId)
      })

      it("creates MANUAL origin for the mirror transaction", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.account.findUnique
          .mockResolvedValueOnce({ type: "CASH" })
          .mockResolvedValueOnce({ type: "CASH" })
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.create.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true }),
        )

        await Effect.runPromise(
          updateTransaction("txn-1", { transferAccountId: ACCOUNT_SAVINGS.id }),
        )

        expect(mockPrisma.transactionOrigin.create).toHaveBeenCalledOnce()
        const originData = callArg(mockPrisma.transactionOrigin.create).data
        expect(originData.transactionId).toBe("txn-mirror")
        expect(originData.originType).toBe("MANUAL")
      })

      it("clears categoryId on source for non-loan transfer conversion", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({ categoryId: "cat-1" }),
        )
        mockPrisma.account.findUnique
          .mockResolvedValueOnce({ type: "CASH" })
          .mockResolvedValueOnce({ type: "CASH" })
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.create.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true }),
        )

        await Effect.runPromise(
          updateTransaction("txn-1", {
            transferAccountId: ACCOUNT_SAVINGS.id,
            categoryId: "cat-1",
          }),
        )

        const sourceData = callArg(mockPrisma.transaction.update).data
        expect(sourceData.categoryId).toBeNull()

        const mirrorData = callArg(mockPrisma.transaction.create).data
        expect(mirrorData.categoryId).toBeUndefined()
      })

      it("assigns categoryId only to source when converting CASH to LOAN transfer", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.account.findUnique
          .mockResolvedValueOnce({ type: "CASH" })
          .mockResolvedValueOnce({ type: "LOAN" })
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.create.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true }),
        )

        await Effect.runPromise(
          updateTransaction("txn-1", {
            transferAccountId: ACCOUNT_LOAN.id,
            categoryId: "cat-interest",
          }),
        )

        const sourceData = callArg(mockPrisma.transaction.update).data
        expect(sourceData.categoryId).toBe("cat-interest")

        const mirrorData = callArg(mockPrisma.transaction.create).data
        expect(mirrorData.categoryId).toBeUndefined()
      })

      it("removes existing splits when converting to transfer", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(makeExistingForUpdate())
        mockPrisma.account.findUnique
          .mockResolvedValueOnce({ type: "CASH" })
          .mockResolvedValueOnce({ type: "CASH" })
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transactionSplit.deleteMany.mockResolvedValue({ count: 2 })
        mockPrisma.transaction.create.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true }),
        )

        await Effect.runPromise(
          updateTransaction("txn-1", { transferAccountId: ACCOUNT_SAVINGS.id }),
        )

        expect(mockPrisma.transactionSplit.deleteMany).toHaveBeenCalledWith({
          where: { transactionId: "txn-1" },
        })
      })

      it("uses existing transaction values for mirror when not provided in input", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            amountMinor: -7500,
            date: new Date("2026-02-20T00:00:00.000Z"),
            note: "Original note",
            clearingStatus: "CLEARED",
          }),
        )
        mockPrisma.account.findUnique
          .mockResolvedValueOnce({ type: "CASH" })
          .mockResolvedValueOnce({ type: "CASH" })
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.create.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transactionOrigin.create.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true }),
        )

        await Effect.runPromise(
          updateTransaction("txn-1", { transferAccountId: ACCOUNT_SAVINGS.id }),
        )

        const mirrorData = callArg(mockPrisma.transaction.create).data
        expect(mirrorData.amountMinor).toBe(7500)
        expect(mirrorData.date).toEqual(new Date("2026-02-20T00:00:00.000Z"))
        expect(mirrorData.note).toBe("Original note")
        expect(mirrorData.clearingStatus).toBe("CLEARED")
      })
    })

    describe("convert transfer back to regular", () => {
      it("deletes mirror and clears transfer fields when transferAccountId is set to null", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            transferPairId: "pair-1",
            isTransfer: true,
            transferAccountId: ACCOUNT_SAVINGS.id,
          }),
        )
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.findFirst.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transaction.delete.mockResolvedValue({})
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction(),
        )

        await Effect.runPromise(
          updateTransaction("txn-1", {
            transferAccountId: null as unknown as string,
            payeeId: "payee-new",
          }),
        )

        // Mirror should be deleted
        expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
          where: { id: "txn-mirror" },
        })

        // Source should be updated to non-transfer
        const sourceData = callArg(mockPrisma.transaction.update).data
        expect(sourceData.isTransfer).toBe(false)
        expect(sourceData.transferAccountId).toBeNull()
        expect(sourceData.transferPairId).toBeNull()
        expect(sourceData.payeeId).toBe("payee-new")
      })
    })

    describe("transfer guards", () => {
      it("throws when transaction not found", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(null)

        await expect(
          Effect.runPromise(updateTransaction("txn-missing", { note: "x" })),
        ).rejects.toThrow("Transaction not found")
      })

      it("throws when adding splits to a transfer", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({ isTransfer: true }),
        )

        await expect(
          Effect.runPromise(
            updateTransaction("txn-1", {
              splits: [{ categoryId: "cat-a", amountMinor: -1000, note: "A" }],
            }),
          ),
        ).rejects.toThrow("Split transactions cannot be transfers")
      })

      it("throws when changing accountId on a transfer", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            transferPairId: "pair-1",
            isTransfer: true,
            transferAccountId: ACCOUNT_SAVINGS.id,
          }),
        )

        await expect(
          Effect.runPromise(updateTransaction("txn-1", { accountId: "acc-other" })),
        ).rejects.toThrow("requires recreating the transfer")
      })

      it("throws when changing transferAccountId on a transfer", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            transferPairId: "pair-1",
            isTransfer: true,
            transferAccountId: ACCOUNT_SAVINGS.id,
          }),
        )

        await expect(
          Effect.runPromise(
            updateTransaction("txn-1", { transferAccountId: "acc-other" }),
          ),
        ).rejects.toThrow("requires recreating the transfer")
      })

      it("throws when changing categoryId on a non-loan transfer", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            transferPairId: "pair-1",
            isTransfer: true,
            categoryId: "cat-1",
            account: { type: "CASH" },
            transferAccount: { type: "CASH" },
          }),
        )

        await expect(
          Effect.runPromise(updateTransaction("txn-1", { categoryId: "cat-new" })),
        ).rejects.toThrow("requires recreating the transfer")
      })

      it("allows update when accountId and transferAccountId are unchanged", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            transferPairId: "pair-1",
            isTransfer: true,
            accountId: ACCOUNT_CHECKING.id,
            transferAccountId: ACCOUNT_SAVINGS.id,
            categoryId: "cat-1",
            account: { type: "CASH" },
            transferAccount: { type: "CASH" },
          }),
        )
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.findFirst.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(
          updateTransaction("txn-1", {
            accountId: ACCOUNT_CHECKING.id,
            transferAccountId: ACCOUNT_SAVINGS.id,
            categoryId: "cat-1",
            date: "2026-06-01",
          }),
        )

        expect(mockPrisma.transaction.update).toHaveBeenCalled()
      })
    })

    describe("transfer mirror sync", () => {
      const transferExisting = makeExistingForUpdate({
        transferPairId: "pair-1",
        isTransfer: true,
        account: { type: "CASH" },
        transferAccount: { type: "CASH" },
      })

      beforeEach(() => {
        mockPrisma.transaction.findUnique.mockResolvedValue(transferExisting)
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.findFirst.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(
          makeFullTransaction({ isTransfer: true, transferPairId: "pair-1" }),
        )
      })

      it("syncs date to mirror", async () => {
        await Effect.runPromise(updateTransaction("txn-1", { date: "2026-03-01" }))

        expect(mockPrisma.transaction.update).toHaveBeenCalledTimes(2)
        const mirrorData = callArg(mockPrisma.transaction.update, 1).data
        expect(mirrorData.date).toEqual(new Date("2026-03-01T00:00:00.000Z"))
      })

      it("syncs inverted amount to mirror", async () => {
        await Effect.runPromise(updateTransaction("txn-1", { amountMinor: -3000 }))

        const sourceData = callArg(mockPrisma.transaction.update, 0).data
        const mirrorData = callArg(mockPrisma.transaction.update, 1).data
        expect(sourceData.amountMinor).toBe(-3000)
        expect(mirrorData.amountMinor).toBe(3000)
      })

      it("syncs note exactly to mirror", async () => {
        await Effect.runPromise(updateTransaction("txn-1", { note: "Updated" }))

        const mirrorData = callArg(mockPrisma.transaction.update, 1).data
        expect(mirrorData.note).toBe("Updated")
      })

      it("syncs cleared status to mirror", async () => {
        await Effect.runPromise(updateTransaction("txn-1", { clearingStatus: "CLEARED" }))

        const mirrorData = callArg(mockPrisma.transaction.update, 1).data
        expect(mirrorData.clearingStatus).toBe("CLEARED")
      })

      it("syncs payeeId to mirror", async () => {
        await Effect.runPromise(updateTransaction("txn-1", { payeeId: "payee-new" }))

        const mirrorData = callArg(mockPrisma.transaction.update, 1).data
        expect(mirrorData.payeeId).toBe("payee-new")
      })

      it("handles missing mirror gracefully", async () => {
        mockPrisma.transaction.findFirst.mockResolvedValue(null)

        const result = await Effect.runPromise(
          updateTransaction("txn-1", { note: "Updated" }),
        )

        expect(mockPrisma.transaction.update).toHaveBeenCalledOnce()
        expect(result).toBeDefined()
      })
    })

    describe("loan transfer update", () => {
      it("assigns categoryId only to mirror when source is LOAN", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            transferPairId: "pair-1",
            isTransfer: true,
            account: { type: "LOAN" },
            transferAccount: { type: "CASH" },
          }),
        )
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.findFirst.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(
          updateTransaction("txn-1", { categoryId: "cat-loan-payment" }),
        )

        expect(mockPrisma.transaction.update).toHaveBeenCalledTimes(2)
        const sourceData = callArg(mockPrisma.transaction.update, 0).data
        const mirrorData = callArg(mockPrisma.transaction.update, 1).data
        expect(sourceData.categoryId).toBeUndefined()
        expect(mirrorData.categoryId).toBe("cat-loan-payment")
      })

      it("assigns categoryId only to source when target is LOAN", async () => {
        mockPrisma.transaction.findUnique.mockResolvedValue(
          makeExistingForUpdate({
            transferPairId: "pair-1",
            isTransfer: true,
            account: { type: "CASH" },
            transferAccount: { type: "LOAN" },
          }),
        )
        mockPrisma.transaction.update.mockResolvedValue({})
        mockPrisma.transaction.findFirst.mockResolvedValue({ id: "txn-mirror" })
        mockPrisma.transaction.findUniqueOrThrow.mockResolvedValue(makeFullTransaction())

        await Effect.runPromise(
          updateTransaction("txn-1", { categoryId: "cat-loan-payment" }),
        )

        expect(mockPrisma.transaction.update).toHaveBeenCalledTimes(2)
        const sourceData = callArg(mockPrisma.transaction.update, 0).data
        const mirrorData = callArg(mockPrisma.transaction.update, 1).data
        expect(sourceData.categoryId).toBe("cat-loan-payment")
        expect(mirrorData.categoryId).toBeUndefined()
      })
    })
  })

  // ─── deleteTransaction ──────────────────────────────────────────

  describe("deleteTransaction", () => {
    it("deletes both transactions when transferPairId exists", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        transferPairId: "pair-1",
      })
      mockPrisma.transaction.deleteMany.mockResolvedValue({ count: 2 })

      await Effect.runPromise(deleteTransaction("txn-1"))

      expect(mockPrisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { transferPairId: "pair-1" },
      })
      expect(mockPrisma.transaction.delete).not.toHaveBeenCalled()
    })

    it("deletes single transaction when no transferPairId", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue({
        transferPairId: null,
      })
      mockPrisma.transaction.delete.mockResolvedValue({})

      await Effect.runPromise(deleteTransaction("txn-1"))

      expect(mockPrisma.transaction.delete).toHaveBeenCalledWith({
        where: { id: "txn-1" },
      })
      expect(mockPrisma.transaction.deleteMany).not.toHaveBeenCalled()
    })

    it("returns null when transaction does not exist", async () => {
      mockPrisma.transaction.findUnique.mockResolvedValue(null)

      const result = await Effect.runPromise(deleteTransaction("txn-missing"))

      expect(result).toBeNull()
      expect(mockPrisma.transaction.delete).not.toHaveBeenCalled()
      expect(mockPrisma.transaction.deleteMany).not.toHaveBeenCalled()
    })
  })
})
