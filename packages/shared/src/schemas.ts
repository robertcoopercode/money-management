import { z } from "zod"

export const accountTypeSchema = z.enum([
  "CASH",
  "CREDIT",
  "INVESTMENT",
  "LOAN",
])

export const loanTypeSchema = z.enum(["MORTGAGE", "AUTO"])

export const clearingStatusSchema = z.enum(["UNCLEARED", "CLEARED", "RECONCILED"])

const accountBaseSchema = z.object({
  name: z.string().min(1).max(120),
  type: accountTypeSchema,
  startingBalanceMinor: z.number().int(),
  openedAt: z.iso.datetime().optional(),
  loanType: loanTypeSchema.optional(),
  interestRateAnnual: z.number().min(0).max(100).optional(),
  minimumPaymentMinor: z.number().int().min(0).optional(),
})

const loanRefinement = (
  data: z.input<typeof accountBaseSchema>,
  ctx: z.RefinementCtx,
) => {
  if (data.type !== "LOAN") return
  if (!data.loanType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Loan type is required for loan accounts",
      path: ["loanType"],
    })
  }
  if (data.interestRateAnnual === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Interest rate is required for loan accounts",
      path: ["interestRateAnnual"],
    })
  }
}

export const createAccountSchema = accountBaseSchema.superRefine(loanRefinement)

export const updateAccountSchema = accountBaseSchema.partial()

export const createPayeeSchema = z.object({
  name: z.string().min(1).max(160),
})

export const createCategorySchema = z.object({
  name: z.string().min(1).max(160),
  groupName: z.string().min(1).max(120).optional(),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(160).optional(),
  groupId: z.string().min(1).optional(),
})

export const updateCategoryGroupSchema = z.object({
  name: z.string().min(1).max(120),
})

export const updatePayeeSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  defaultCategoryId: z.string().min(1).nullable().optional(),
})

export const mergePayeesSchema = z.object({
  sourcePayeeId: z.string().min(1),
  targetPayeeId: z.string().min(1),
})

export const deletePayeesSchema = z.object({
  payeeIds: z.array(z.string().min(1)).min(1),
})

export const combinePayeesSchema = z.object({
  payeeIds: z.array(z.string().min(1)).min(2),
  newName: z.string().min(1).max(160),
})

export const createTagSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#374151"),
  textColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#FFFFFF"),
})

export const updateTagSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  backgroundColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  textColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  isArchived: z.boolean().optional(),
})

export const transactionIdSchema = z.string().min(1)

export const transactionSplitInputSchema = z.object({
  id: z.string().min(1).optional(),
  categoryId: z.string().min(1),
  payeeId: z.string().min(1).optional(),
  note: z.string().max(1_000).optional(),
  amountMinor: z.number().int(),
  tagIds: z.array(z.string().min(1)).optional(),
})

const baseTransactionFields = {
  accountId: z.string().min(1),
  transferAccountId: z.string().min(1).nullable().optional(),
  date: z.iso.date(),
  amountMinor: z.number().int(),
  payeeId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  note: z.string().max(1_000).optional(),
  clearingStatus: clearingStatusSchema.default("UNCLEARED"),
  splits: z.array(transactionSplitInputSchema).optional(),
  tagIds: z.array(z.string().min(1)).optional(),
} as const

const transactionSplitRefinement = (
  data: {
    amountMinor?: number
    splits?: { amountMinor: number }[]
    transferAccountId?: string | null
    categoryId?: string
  },
  ctx: z.RefinementCtx,
) => {
  if (!data.splits || data.splits.length === 0) return
  if (data.transferAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Split transactions cannot be transfers",
    })
  }
  if (data.categoryId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Parent transaction cannot have a category when splits exist",
    })
  }
  if (data.amountMinor !== undefined) {
    const splitSum = data.splits.reduce((s, sp) => s + sp.amountMinor, 0)
    if (splitSum !== data.amountMinor) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Split amounts must sum to the transaction total",
      })
    }
  }
}

export const createTransactionSchema = z
  .object(baseTransactionFields)
  .superRefine(transactionSplitRefinement)

export const updateTransactionSchema = z
  .object(
    Object.fromEntries(
      Object.entries(baseTransactionFields).map(([key, value]) => [
        key,
        value.optional(),
      ]),
    ) as {
      [K in keyof typeof baseTransactionFields]: ReturnType<typeof baseTransactionFields[K]["optional"]>
    },
  )
  .superRefine(transactionSplitRefinement)

export const transactionSortColumnSchema = z.enum([
  "date",
  "account",
  "payee",
  "category",
  "note",
  "amountMinor",
  "clearingStatus",
])

export const transactionSortDirSchema = z.enum(["asc", "desc"])

export const transactionFilterSchema = z.object({
  accountId: z.string().min(1).optional(),
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  categoryId: z.string().min(1).optional(),
  payeeId: z.string().min(1).optional(),
  clearingStatus: clearingStatusSchema.optional(),
  includeReconciled: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: transactionSortColumnSchema.default("date"),
  sortDir: transactionSortDirSchema.default("desc"),
})

export const updateCategoryAssignmentSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  categoryId: z.string().min(1),
  assignedMinor: z.number().int(),
})

export const importColumnMappingSchema = z.object({
  date: z.string().min(1),
  amount: z.string().min(1),
  payee: z.string().min(1),
  note: z.string().min(1).optional(),
})

export const csvImportRequestSchema = z.object({
  accountId: z.string().min(1),
  fileName: z.string().min(1),
  csvText: z.string().min(1),
  mapping: importColumnMappingSchema,
  swapInflowOutflow: z.boolean().default(false),
})

export const bulkTransactionIdsSchema = z.object({
  transactionIds: z.array(z.string().min(1)).min(1).max(500),
})

export const reportFilterSchema = z.object({
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  accountIds: z.string().optional(),
  categoryIds: z.string().optional(),
  payeeIds: z.string().optional(),
  clearingStatus: clearingStatusSchema.optional(),
})

export const loginSchema = z.object({
  password: z.string().min(1).max(256),
})

export type AccountType = z.infer<typeof accountTypeSchema>
export type LoanType = z.infer<typeof loanTypeSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type UpdatePayeeInput = z.infer<typeof updatePayeeSchema>
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
export type UpdateCategoryGroupInput = z.infer<typeof updateCategoryGroupSchema>
export type MergePayeesInput = z.infer<typeof mergePayeesSchema>
export type CombinePayeesInput = z.infer<typeof combinePayeesSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>
export type UpdateCategoryAssignmentInput = z.infer<typeof updateCategoryAssignmentSchema>
export type TransactionSplitInput = z.infer<typeof transactionSplitInputSchema>
export type CreateTagInput = z.infer<typeof createTagSchema>
export type UpdateTagInput = z.infer<typeof updateTagSchema>
export type BulkTransactionIdsInput = z.infer<typeof bulkTransactionIdsSchema>
export type ClearingStatus = z.infer<typeof clearingStatusSchema>
export type TransactionSortColumn = z.infer<typeof transactionSortColumnSchema>
export type TransactionSortDir = z.infer<typeof transactionSortDirSchema>

export const reconcileAccountSchema = z.object({
  statementBalanceMinor: z.number().int(),
})
