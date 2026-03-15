export type ImportCandidate = {
  id: string
  amountMinor: number
  date: Date
  clearingStatus: "UNCLEARED" | "CLEARED" | "RECONCILED"
}

export type MatchResult = {
  candidateId: string
  score: number
} | null

export const MAX_MATCH_DAY_WINDOW = 10

export const dayDiff = (left: Date, right: Date) =>
  Math.abs(
    Math.floor((left.getTime() - right.getTime()) / (24 * 60 * 60 * 1000)),
  )

export const findBestImportCandidate = ({
  candidates,
  amountMinor,
  transactionDate,
  alreadyMatchedTransactionIds,
}: {
  candidates: ImportCandidate[]
  amountMinor: number
  transactionDate: Date
  alreadyMatchedTransactionIds: Set<string>
}): MatchResult => {
  const filteredCandidates = candidates.filter(
    (candidate) =>
      candidate.amountMinor === amountMinor &&
      dayDiff(candidate.date, transactionDate) <= MAX_MATCH_DAY_WINDOW &&
      !alreadyMatchedTransactionIds.has(candidate.id),
  )

  if (!filteredCandidates.length) {
    return null
  }

  filteredCandidates.sort((left, right) => {
    const leftDateDiff = dayDiff(left.date, transactionDate)
    const rightDateDiff = dayDiff(right.date, transactionDate)

    if (leftDateDiff !== rightDateDiff) {
      return leftDateDiff - rightDateDiff
    }

    const statusOrder = { UNCLEARED: 0, CLEARED: 1, RECONCILED: 2 }
    if (left.clearingStatus !== right.clearingStatus) {
      return statusOrder[left.clearingStatus] - statusOrder[right.clearingStatus]
    }

    return left.id.localeCompare(right.id)
  })

  const winner = filteredCandidates[0]

  if (!winner) {
    return null
  }
  const score = Math.max(
    0,
    1 - dayDiff(winner.date, transactionDate) / MAX_MATCH_DAY_WINDOW,
  )
  return {
    candidateId: winner.id,
    score,
  }
}
