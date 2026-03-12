import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { formatMoney } from "@ledgr/shared"
import { toast } from "sonner"
import { apiFetch } from "../lib/api.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { usePayeeMutations } from "../hooks/use-payee-mutations.js"
import { PayeeMergeForm } from "../components/payee-merge-form.js"
import type { Payee, Transaction } from "../types.js"
import type { UseQueryResult } from "@tanstack/react-query"

type PayeesTabProps = {
  payeesQuery: UseQueryResult<Payee[]>
  refetchCoreData: () => void
}

export const PayeesTab = ({ payeesQuery, refetchCoreData }: PayeesTabProps) => {
  const [newPayee, setNewPayee] = useState("")
  const [payeeSearch, setPayeeSearch] = useState("")
  const [payeeSort, setPayeeSort] = useState<"name-asc" | "name-desc">(
    "name-asc",
  )
  const [selectedPayeeId, setSelectedPayeeId] = useState("")
  const [payeeMerge, setPayeeMerge] = useState({
    sourcePayeeId: "",
    targetPayeeId: "",
  })

  const payeeTransactionsQuery = useQuery({
    queryKey: ["payee-transactions", selectedPayeeId],
    queryFn: () =>
      apiFetch<Transaction[]>(`/api/payees/${selectedPayeeId}/transactions`),
    enabled: Boolean(selectedPayeeId),
  })

  const { createPayeeMutation, mergePayeeMutation } = usePayeeMutations({
    refetchCoreData,
    onPayeeCreated: () => setNewPayee(""),
    onPayeesMerged: () =>
      setPayeeMerge({ sourcePayeeId: "", targetPayeeId: "" }),
  })

  const visiblePayees = useMemo(() => {
    const normalizedSearch = payeeSearch.trim().toLowerCase()
    const filtered = (payeesQuery.data ?? []).filter((payee) =>
      payee.name.toLowerCase().includes(normalizedSearch),
    )

    filtered.sort((left, right) => {
      if (payeeSort === "name-asc") {
        return left.name.localeCompare(right.name)
      }

      return right.name.localeCompare(left.name)
    })

    return filtered
  }, [payeesQuery.data, payeeSearch, payeeSort])

  return (
    <>
      <section className="grid-two">
        <article className="card">
          <h2>Add payee</h2>
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault()
              createPayeeMutation.mutate(newPayee)
            }}
          >
            <label>
              Name
              <input
                value={newPayee}
                onChange={(event) => setNewPayee(event.target.value)}
                required
              />
            </label>
            <button type="submit">Create Payee</button>
          </form>
        </article>
        <article className="card">
          <h2>Merge duplicate payees</h2>
          <PayeeMergeForm
            payees={payeesQuery.data ?? []}
            selection={payeeMerge}
            isPending={mergePayeeMutation.isPending}
            onSelectionChange={setPayeeMerge}
            onInvalidSubmit={() => {
              toast.error("Pick two different payees to perform a merge.")
            }}
            onValidSubmit={() => {
              mergePayeeMutation.mutate(payeeMerge)
            }}
          />
        </article>
      </section>

      <section className="card">
        <h2>Payees</h2>
        <div className="inline-controls" style={{ marginBottom: "0.8rem" }}>
          <label>
            Search
            <input
              value={payeeSearch}
              onChange={(event) => setPayeeSearch(event.target.value)}
              placeholder="Search payees..."
            />
          </label>
          <label>
            Sort
            <select
              value={payeeSort}
              onChange={(event) =>
                setPayeeSort(
                  event.target.value as "name-asc" | "name-desc",
                )
              }
            >
              <option value="name-asc">Name (A → Z)</option>
              <option value="name-desc">Name (Z → A)</option>
            </select>
          </label>
          <label>
            Inspect transactions
            <select
              value={selectedPayeeId}
              onChange={(event) => setSelectedPayeeId(event.target.value)}
            >
              <option value="">Select payee</option>
              {visiblePayees.map((payee) => (
                <option key={payee.id} value={payee.id}>
                  {payee.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="list">
          {payeesQuery.isError ? (
            <p className="error-text">
              {toDisplayErrorMessage(
                payeesQuery.error,
                "Failed to load payees.",
              )}
            </p>
          ) : null}
          {payeesQuery.isLoading ? (
            <p className="muted">Loading payees...</p>
          ) : (payeesQuery.data?.length ?? 0) === 0 ? (
            <p className="muted">No payees yet.</p>
          ) : visiblePayees.length === 0 ? (
            <p className="muted">No payees match your search.</p>
          ) : (
            visiblePayees.map((payee) => (
              <div className="list-item" key={payee.id}>
                <strong>{payee.name}</strong>
                <span className="muted">ID: {payee.id}</span>
              </div>
            ))
          )}
        </div>

        {selectedPayeeId ? (
          <div className="table-wrap" style={{ marginTop: "0.8rem" }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {payeeTransactionsQuery.isError ? (
                  <tr>
                    <td colSpan={5} className="error-text">
                      {toDisplayErrorMessage(
                        payeeTransactionsQuery.error,
                        "Failed to load payee transactions.",
                      )}
                    </td>
                  </tr>
                ) : null}
                {payeeTransactionsQuery.isLoading ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      Loading payee transactions...
                    </td>
                  </tr>
                ) : (payeeTransactionsQuery.data?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No transactions for selected payee.
                    </td>
                  </tr>
                ) : (
                  (payeeTransactionsQuery.data ?? []).map((transaction) => (
                    <tr key={transaction.id}>
                      <td>
                        {new Date(transaction.date)
                          .toISOString()
                          .slice(0, 10)}
                      </td>
                      <td>{transaction.account.name}</td>
                      <td>
                        {transaction.splits?.length > 0
                          ? "Split transaction"
                          : transaction.isTransfer
                            ? transaction.category?.name
                              ? transaction.category.name
                              : (() => {
                                  const isLoan =
                                    transaction.transferAccount?.type ===
                                      "LOAN" ||
                                    transaction.account.type === "LOAN"
                                  if (isLoan) {
                                    return transaction.transferAccount
                                      ?.type === "LOAN"
                                      ? `Payment to ${transaction.transferAccount?.name ?? "Account"}`
                                      : `Payment from ${transaction.transferAccount?.name ?? "Account"}`
                                  }
                                  return `Transfer \u2192 ${transaction.transferAccount?.name ?? "Account"}`
                                })()
                            : (transaction.category?.name ?? "\u2014")}
                      </td>
                      <td>{transaction.note || ""}</td>
                      <td
                        className={
                          transaction.amountMinor >= 0
                            ? "amount-inflow"
                            : "amount-outflow"
                        }
                      >
                        {formatMoney(transaction.amountMinor)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </>
  )
}
