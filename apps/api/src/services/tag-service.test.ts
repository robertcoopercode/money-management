import { beforeEach, describe, expect, it, vi } from "vitest"
import { Effect } from "effect"

vi.mock("@ledgr/db", () => ({
  prisma: {
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from "@ledgr/db"
import { createTag, updateTag, listTags, deleteTag } from "./tag-service.js"

const mockTag = prisma.tag as unknown as {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createTag", () => {
  it("stores name as UPPERCASE and sets normalizedName", async () => {
    mockTag.findUnique.mockResolvedValue(null)
    mockTag.create.mockResolvedValue({
      id: "tag-1",
      name: "GROCERIES",
      normalizedName: "GROCERIES",
    })

    await Effect.runPromise(createTag({ name: "groceries", backgroundColor: "#374151", textColor: "#FFFFFF" }))

    expect(mockTag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "GROCERIES",
        normalizedName: "GROCERIES",
      }),
    })
  })

  it("trims whitespace before normalizing", async () => {
    mockTag.findUnique.mockResolvedValue(null)
    mockTag.create.mockResolvedValue({
      id: "tag-1",
      name: "VACATION",
      normalizedName: "VACATION",
    })

    await Effect.runPromise(createTag({ name: "  vacation  ", backgroundColor: "#374151", textColor: "#FFFFFF" }))

    expect(mockTag.findUnique).toHaveBeenCalledWith({
      where: { normalizedName: "VACATION" },
    })
    expect(mockTag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "VACATION",
        normalizedName: "VACATION",
      }),
    })
  })

  it("rejects duplicate name case-insensitively", async () => {
    mockTag.findUnique.mockResolvedValue({
      id: "existing-tag",
      name: "FOOD",
      normalizedName: "FOOD",
    })

    await expect(
      Effect.runPromise(createTag({ name: "food", backgroundColor: "#374151", textColor: "#FFFFFF" })),
    ).rejects.toThrow('A tag with name "FOOD" already exists.')
  })

  it("rejects duplicate with different casing", async () => {
    mockTag.findUnique.mockResolvedValue({
      id: "existing-tag",
      name: "FOOD",
      normalizedName: "FOOD",
    })

    await expect(
      Effect.runPromise(createTag({ name: "Food", backgroundColor: "#374151", textColor: "#FFFFFF" })),
    ).rejects.toThrow('A tag with name "FOOD" already exists.')
  })

  it("rejects duplicate with mixed casing", async () => {
    mockTag.findUnique.mockResolvedValue({
      id: "existing-tag",
      name: "TAX DEDUCTIBLE",
      normalizedName: "TAX DEDUCTIBLE",
    })

    await expect(
      Effect.runPromise(createTag({ name: "Tax Deductible", backgroundColor: "#374151", textColor: "#FFFFFF" })),
    ).rejects.toThrow('A tag with name "TAX DEDUCTIBLE" already exists.')
  })

  it("stores custom colors when provided", async () => {
    mockTag.findUnique.mockResolvedValue(null)
    mockTag.create.mockResolvedValue({ id: "tag-1" })

    await Effect.runPromise(
      createTag({
        name: "urgent",
        backgroundColor: "#FF0000",
        textColor: "#FFFFFF",
      }),
    )

    expect(mockTag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        backgroundColor: "#FF0000",
        textColor: "#FFFFFF",
      }),
    })
  })
})

describe("updateTag", () => {
  it("rejects rename to existing name case-insensitively", async () => {
    mockTag.findFirst.mockResolvedValue({
      id: "other-tag",
      name: "EXISTING",
      normalizedName: "EXISTING",
    })

    await expect(
      Effect.runPromise(updateTag("tag-1", { name: "existing" })),
    ).rejects.toThrow('A tag with name "EXISTING" already exists.')
  })

  it("allows rename when no conflict exists", async () => {
    mockTag.findFirst.mockResolvedValue(null)
    mockTag.update.mockResolvedValue({ id: "tag-1", name: "NEW NAME" })

    await Effect.runPromise(updateTag("tag-1", { name: "new name" }))

    expect(mockTag.findFirst).toHaveBeenCalledWith({
      where: { normalizedName: "NEW NAME", id: { not: "tag-1" } },
    })
    expect(mockTag.update).toHaveBeenCalledWith({
      where: { id: "tag-1" },
      data: expect.objectContaining({
        name: "NEW NAME",
        normalizedName: "NEW NAME",
      }),
    })
  })

  it("updates isArchived without name check", async () => {
    mockTag.update.mockResolvedValue({ id: "tag-1", isArchived: true })

    await Effect.runPromise(updateTag("tag-1", { isArchived: true }))

    expect(mockTag.findFirst).not.toHaveBeenCalled()
    expect(mockTag.update).toHaveBeenCalledWith({
      where: { id: "tag-1" },
      data: { isArchived: true },
    })
  })
})

describe("listTags", () => {
  it("returns all tags ordered by name", async () => {
    const tags = [
      { id: "1", name: "ALPHA" },
      { id: "2", name: "BETA" },
    ]
    mockTag.findMany.mockResolvedValue(tags)

    const result = await Effect.runPromise(listTags)

    expect(mockTag.findMany).toHaveBeenCalledWith({
      orderBy: { name: "asc" },
    })
    expect(result).toEqual(tags)
  })
})

describe("deleteTag", () => {
  it("deletes the tag by id", async () => {
    mockTag.delete.mockResolvedValue({ id: "tag-1" })

    await Effect.runPromise(deleteTag("tag-1"))

    expect(mockTag.delete).toHaveBeenCalledWith({
      where: { id: "tag-1" },
    })
  })
})
