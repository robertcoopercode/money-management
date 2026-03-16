import { isPayeeMergeSelectionValid } from "../lib/payee-merge.js"
import { AppSelect } from "./app-select.js"

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
        <AppSelect
          options={[
            { value: "", label: "Select payee" },
            ...payees.map((payee) => ({ value: payee.id, label: payee.name })),
          ]}
          value={selection.sourcePayeeId}
          onChange={(value) =>
            onSelectionChange({
              ...selection,
              sourcePayeeId: value,
            })
          }
          placeholder="Select payee"
        />
      </label>
      <label>
        Target (keep)
        <AppSelect
          options={[
            { value: "", label: "Select payee" },
            ...payees.map((payee) => ({ value: payee.id, label: payee.name })),
          ]}
          value={selection.targetPayeeId}
          onChange={(value) =>
            onSelectionChange({
              ...selection,
              targetPayeeId: value,
            })
          }
          placeholder="Select payee"
        />
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
