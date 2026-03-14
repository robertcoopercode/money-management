import { beforeEach, describe, expect, it, vi } from "vitest"
import { Effect } from "effect"

vi.mock("@ledgr/db", () => ({
  prisma: {
    payee: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    transaction: {
      updateMany: vi.fn(),
    },
    transactionSplit: {
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@ledgr/db"
import { combinePayees, deletePayees } from "./payee-service.js"

const mockPrisma = prisma as unknown as {
  payee: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  transaction: {
    updateMany: ReturnType<typeof vi.fn>
  }
  transactionSplit: {
    updateMany: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("combinePayees", () => {
  it("creates new payee, reassigns transactions and splits, deletes old payees", async () => {
    const newPayee = { id: "new-1", name: "Combined", normalizedName: "combined" }

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return fn(mockPrisma)
    })
    mockPrisma.payee.findMany.mockResolvedValue([
      { defaultCategoryId: null },
      { defaultCategoryId: "cat-1" },
    ])
    mockPrisma.payee.create.mockResolvedValue(newPayee)
    mockPrisma.transaction.updateMany.mockResolvedValue({ count: 3 })
    mockPrisma.transactionSplit.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.payee.deleteMany.mockResolvedValue({ count: 2 })

    const result = await Effect.runPromise(
      combinePayees({ payeeIds: ["p1", "p2"], newName: "Combined" }),
    )

    expect(result).toEqual(newPayee)

    expect(mockPrisma.payee.create).toHaveBeenCalledWith({
      data: { name: "Combined", normalizedName: "combined", defaultCategoryId: "cat-1" },
    })

    expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { payeeId: { in: ["p1", "p2"] } },
      data: { payeeId: "new-1" },
    })

    expect(mockPrisma.transactionSplit.updateMany).toHaveBeenCalledWith({
      where: { payeeId: { in: ["p1", "p2"] } },
      data: { payeeId: "new-1" },
    })

    expect(mockPrisma.payee.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1", "p2"] } },
    })
  })

  it("trims and normalizes the new name", async () => {
    const newPayee = { id: "new-1", name: "My  Payee", normalizedName: "my payee" }

    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return fn(mockPrisma)
    })
    mockPrisma.payee.findMany.mockResolvedValue([
      { defaultCategoryId: null },
      { defaultCategoryId: null },
    ])
    mockPrisma.payee.create.mockResolvedValue(newPayee)
    mockPrisma.transaction.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.transactionSplit.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.payee.deleteMany.mockResolvedValue({ count: 2 })

    await Effect.runPromise(
      combinePayees({ payeeIds: ["p1", "p2"], newName: "  My  Payee  " }),
    )

    expect(mockPrisma.payee.create).toHaveBeenCalledWith({
      data: { name: "My  Payee", normalizedName: "my payee", defaultCategoryId: null },
    })
  })

  it("rejects when fewer than 2 payeeIds", async () => {
    await expect(
      Effect.runPromise(
        combinePayees({ payeeIds: ["p1"], newName: "Combined" }),
      ),
    ).rejects.toThrow("At least 2 payees are required to combine.")
  })
})

describe("deletePayees", () => {
  it("nullifies payeeId on transactions and splits, then deletes the payees", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
      return fn(mockPrisma)
    })
    mockPrisma.transaction.updateMany.mockResolvedValue({ count: 2 })
    mockPrisma.transactionSplit.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.payee.deleteMany.mockResolvedValue({ count: 2 })

    const result = await Effect.runPromise(deletePayees(["p1", "p2"]))

    expect(result).toEqual({ count: 2 })

    expect(mockPrisma.transaction.updateMany).toHaveBeenCalledWith({
      where: { payeeId: { in: ["p1", "p2"] } },
      data: { payeeId: null },
    })

    expect(mockPrisma.transactionSplit.updateMany).toHaveBeenCalledWith({
      where: { payeeId: { in: ["p1", "p2"] } },
      data: { payeeId: null },
    })

    expect(mockPrisma.payee.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["p1", "p2"] } },
    })
  })

  it("rejects when payeeIds is empty", async () => {
    await expect(
      Effect.runPromise(deletePayees([])),
    ).rejects.toThrow("At least one payee ID is required.")
  })
})
