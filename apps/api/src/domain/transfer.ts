export const toMirrorTransferAmountMinor = (amountMinor: number) => -amountMinor

export const buildMirrorTransferNote = (note?: string) =>
  note ? `Transfer mirror: ${note}` : "Transfer mirror entry"
