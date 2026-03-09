import { z } from "zod"

export const accountTypeSchema = z.enum(["CHEQUING", "CREDIT_CARD"])

export const createAccountSchema = z.object({
  name: z.string().min(1).max(120),
  type: accountTypeSchema,
  institution: z.string().max(120).optional(),
  startingBalanceMinor: z.number().int(),
  openedAt: z.iso.datetime().optional(),
})

export const updateAccountSchema = createAccountSchema.partial()

export const createPayeeSchema = z.object({
  name: z.string().min(1).max(160),
})

export const createCategorySchema = z.object({
  name: z.string().min(1).max(160),
  groupName: z.string().min(1).max(120).optional(),
})

export const mergePayeesSchema = z.object({
  sourcePayeeId: z.string().min(1),
  targetPayeeId: z.string().min(1),
})

export const transactionIdSchema = z.string().min(1)

export const createTransactionSchema = z.object({
  accountId: z.string().min(1),
  transferAccountId: z.string().min(1).optional(),
  date: z.iso.date(),
  amountMinor: z.number().int(),
  payeeId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  note: z.string().max(1_000).optional(),
  cleared: z.boolean().default(false),
})

export const updateTransactionSchema = createTransactionSchema.partial()

export const transactionFilterSchema = z.object({
  accountId: z.string().min(1).optional(),
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  categoryId: z.string().min(1).optional(),
  payeeId: z.string().min(1).optional(),
  cleared: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
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
})

export const reportFilterSchema = z.object({
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  accountIds: z.string().optional(),
  categoryIds: z.string().optional(),
  payeeIds: z.string().optional(),
  cleared: z.coerce.boolean().optional(),
})

export const loginSchema = z.object({
  password: z.string().min(1).max(256),
})

export type LoginInput = z.infer<typeof loginSchema>
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type CreatePayeeInput = z.infer<typeof createPayeeSchema>
export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type MergePayeesInput = z.infer<typeof mergePayeesSchema>
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>
export type UpdateCategoryAssignmentInput = z.infer<typeof updateCategoryAssignmentSchema>
