export const isPayeeMergeSelectionValid = (
  sourcePayeeId: string,
  targetPayeeId: string,
) => {
  if (!sourcePayeeId || !targetPayeeId) {
    return false
  }

  return sourcePayeeId !== targetPayeeId
}
