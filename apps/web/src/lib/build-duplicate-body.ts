import type { Transaction } from "../types.js"

export function buildDuplicateBody(t: Transaction): Record<string, unknown> {
  const body: Record<string, unknown> = {
    accountId: t.account.id,
    date: t.date.slice(0, 10),
    amountMinor: t.amountMinor,
    cleared: false,
  }

  if (t.payee?.id) body.payeeId = t.payee.id
  if (t.note) body.note = t.note

  if (t.category?.id) body.categoryId = t.category.id

  if (t.splits.length > 0) {
    delete body.categoryId
    body.splits = t.splits.map((s) => {
      const split: Record<string, unknown> = {
        categoryId: s.categoryId,
        amountMinor: s.amountMinor,
      }
      if (s.payeeId) split.payeeId = s.payeeId
      if (s.note) split.note = s.note
      if (s.tags && s.tags.length > 0) split.tagIds = s.tags.map((st) => st.tag.id)
      return split
    })
  } else if (t.isTransfer) {
    body.transferAccountId = t.transferAccountId
  }

  return body
}
