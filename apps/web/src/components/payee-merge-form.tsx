import { isPayeeMergeSelectionValid } from "../lib/payee-merge.js"

export type PayeeMergeSelection = {
  sourcePayeeId: string
  targetPayeeId: string
}

type PayeeOption = {
  id: string
  name: string
}

type PayeeMergeFormProps = {
  payees: PayeeOption[]
  selection: PayeeMergeSelection
  isPending: boolean
  onSelectionChange: (selection: PayeeMergeSelection) => void
  onValidSubmit: () => void
  onInvalidSubmit: () => void
}

export const PayeeMergeForm = ({
  payees,
  selection,
  isPending,
  onSelectionChange,
  onValidSubmit,
  onInvalidSubmit,
}: PayeeMergeFormProps) => {
  const canMergePayees = isPayeeMergeSelectionValid(
    selection.sourcePayeeId,
    selection.targetPayeeId,
  )

  const payeeMergeValidationMessage =
    !selection.sourcePayeeId || !selection.targetPayeeId
      ? "Select both a source and target payee."
      : !canMergePayees
        ? "Source and target payees must be different."
        : null

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault()

        if (!canMergePayees) {
          onInvalidSubmit()
          return
        }

        onValidSubmit()
      }}
    >
      <label>
        Source (duplicate)
        <select
          value={selection.sourcePayeeId}
          onChange={(event) =>
            onSelectionChange({
              ...selection,
              sourcePayeeId: event.target.value,
            })
          }
          required
        >
          <option value="">Select payee</option>
          {payees.map((payee) => (
            <option key={payee.id} value={payee.id}>
              {payee.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Target (keep)
        <select
          value={selection.targetPayeeId}
          onChange={(event) =>
            onSelectionChange({
              ...selection,
              targetPayeeId: event.target.value,
            })
          }
          required
        >
          <option value="">Select payee</option>
          {payees.map((payee) => (
            <option key={payee.id} value={payee.id}>
              {payee.name}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={!canMergePayees || isPending}>
        {isPending ? "Merging..." : "Merge Payees"}
      </button>
      {payeeMergeValidationMessage ? (
        <p className="muted">{payeeMergeValidationMessage}</p>
      ) : null}
    </form>
  )
}
