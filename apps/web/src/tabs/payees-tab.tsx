import { useEffect, useMemo, useRef, useState } from "react"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { usePayeeMutations } from "../hooks/use-payee-mutations.js"
import { CategoryAutocomplete } from "../components/category-autocomplete.js"
import type { Payee, CategoryGroup } from "../types.js"
import type { UseQueryResult } from "@tanstack/react-query"

type PayeesTabProps = {
  payeesQuery: UseQueryResult<Payee[]>
  categoryGroups: CategoryGroup[]
  refetchCoreData: () => void
}

export const PayeesTab = ({ payeesQuery, categoryGroups, refetchCoreData }: PayeesTabProps) => {
  const [payeeSearch, setPayeeSearch] = useState("")
  const [selectedPayeeIds, setSelectedPayeeIds] = useState<Set<string>>(
    new Set(),
  )
  const [combineName, setCombineName] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const focusPayeeIdRef = useRef<string | null>(null)
  const focusExpectedCategoryRef = useRef<string | null>(null)

  useEffect(() => {
    if (!focusPayeeIdRef.current) return
    const payee = (payeesQuery.data ?? []).find((p) => p.id === focusPayeeIdRef.current)
    if (!payee) return
    // Wait until the data reflects the saved category
    const currentId = payee.defaultCategory?.id ?? null
    if (currentId !== focusExpectedCategoryRef.current) return
    const el = document.querySelector<HTMLInputElement>(
      `[data-payee-category="${focusPayeeIdRef.current}"] input`,
    )
    if (el) {
      el.focus()
    }
    focusPayeeIdRef.current = null
    focusExpectedCategoryRef.current = null
  }, [payeesQuery.data])

  const { combinePayeeMutation, deletePayeeMutation, updatePayeeMutation } = usePayeeMutations({
    refetchCoreData,
    onPayeesCombined: () => {
      setSelectedPayeeIds(new Set())
      setCombineName("")
    },
    onPayeesDeleted: () => {
      setSelectedPayeeIds(new Set())
      setShowDeleteConfirm(false)
    },
  })

  const visiblePayees = useMemo(() => {
    const normalizedSearch = payeeSearch.trim().toLowerCase()
    const filtered = (payeesQuery.data ?? []).filter((payee) =>
      payee.name.toLowerCase().includes(normalizedSearch),
    )

    filtered.sort((left, right) => left.name.localeCompare(right.name))

    return filtered
  }, [payeesQuery.data, payeeSearch])

  const togglePayee = (id: string) => {
    setSelectedPayeeIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allVisibleSelected =
    visiblePayees.length > 0 &&
    visiblePayees.every((p) => selectedPayeeIds.has(p.id))

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedPayeeIds((prev) => {
        const next = new Set(prev)
        for (const p of visiblePayees) {
          next.delete(p.id)
        }
        return next
      })
    } else {
      setSelectedPayeeIds((prev) => {
        const next = new Set(prev)
        for (const p of visiblePayees) {
          next.add(p.id)
        }
        return next
      })
    }
  }

  const handleCombine = () => {
    if (selectedPayeeIds.size < 2 || !combineName.trim()) return
    combinePayeeMutation.mutate({
      payeeIds: [...selectedPayeeIds],
      newName: combineName.trim(),
    })
  }

  const firstSelectedPayee = useMemo(() => {
    if (selectedPayeeIds.size === 0) return null
    const firstId = [...selectedPayeeIds][0]
    return (payeesQuery.data ?? []).find((p) => p.id === firstId) ?? null
  }, [selectedPayeeIds, payeesQuery.data])

  const showCombineForm = selectedPayeeIds.size >= 2

  const handleDelete = () => {
    if (selectedPayeeIds.size === 0) return
    if (selectedPayeeIds.size >= 2) {
      setShowDeleteConfirm(true)
      return
    }
    deletePayeeMutation.mutate([...selectedPayeeIds])
  }

  const confirmDelete = () => {
    deletePayeeMutation.mutate([...selectedPayeeIds])
  }

  return (
    <>
      <section className="card">
        <div className="payee-header">
          <div className="payee-header-left">
            <h2>Payees</h2>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                value={payeeSearch}
                onChange={(event) => setPayeeSearch(event.target.value)}
                placeholder="Search..."
              />
              {selectedPayeeIds.size >= 1 ? (
                <button
                  className="button-danger"
                  onClick={handleDelete}
                  disabled={deletePayeeMutation.isPending}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {deletePayeeMutation.isPending
                    ? "Deleting..."
                    : `Delete${selectedPayeeIds.size > 1 ? ` (${selectedPayeeIds.size})` : ""}`}
                </button>
              ) : null}
            </div>
          </div>
          <div className="payee-header-right">
            {showCombineForm ? (
              <div className="combine-form">
                <strong style={{ fontSize: "0.85rem" }}>
                  Combine {selectedPayeeIds.size} payees into:
                </strong>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.4rem" }}>
                  <input
                    value={combineName}
                    onChange={(e) => setCombineName(e.target.value)}
                    placeholder="New payee name"
                    style={{ flex: 1 }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCombine()
                    }}
                    onFocus={() => {
                      if (!combineName && firstSelectedPayee) {
                        setCombineName(firstSelectedPayee.name)
                      }
                    }}
                  />
                  <button
                    onClick={handleCombine}
                    disabled={
                      !combineName.trim() || combinePayeeMutation.isPending
                    }
                  >
                    {combinePayeeMutation.isPending ? "Combining..." : "Combine"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPayeeIds(new Set())
                      setCombineName("")
                    }}
                    style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </div>
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
            <>
              <div className="list-item" style={{ padding: "0.35rem 0.75rem" }}>
                <label className="payee-checkbox-label">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    aria-label="Select all visible payees"
                  />
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    Select all
                  </span>
                </label>
              </div>
              {visiblePayees.map((payee) => (
                <div className="list-item" key={payee.id}>
                  <label className="payee-checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPayeeIds.has(payee.id)}
                      onChange={() => togglePayee(payee.id)}
                      aria-label={`Select ${payee.name}`}
                    />
                    <strong>{payee.name}</strong>
                    {(payee._count?.transactions ?? 0) > 0 ? (
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        {payee._count?.transactions} txn{payee._count?.transactions === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </label>
                  <div
                    key={`${payee.id}-${payee.defaultCategory?.id ?? "none"}`}
                    style={{ minWidth: 170, marginLeft: "auto" }}
                    data-payee-category={payee.id}
                  >
                    <CategoryAutocomplete
                      categoryGroups={categoryGroups}
                      value={payee.defaultCategory?.id ?? ""}
                      onChange={(categoryId) => {
                        if (!categoryId) return
                        if (categoryId !== (payee.defaultCategory?.id ?? null)) {
                          focusPayeeIdRef.current = payee.id
                          focusExpectedCategoryRef.current = categoryId
                          updatePayeeMutation.mutate({
                            payeeId: payee.id,
                            defaultCategoryId: categoryId,
                          })
                        }
                      }}
                      placeholder="Default category"
                      initialInputValue={payee.defaultCategory?.name ?? ""}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {showDeleteConfirm ? (
        <div className="dialog-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0 }}>Delete {selectedPayeeIds.size} payees?</h3>
            <p style={{ margin: 0, fontSize: "0.88rem" }}>
              This will remove the selected payees. Transactions linked to these
              payees will have their payee cleared. This cannot be undone.
            </p>
            <div className="dialog-actions">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}
              >
                Cancel
              </button>
              <button
                className="button-danger"
                onClick={confirmDelete}
                disabled={deletePayeeMutation.isPending}
              >
                {deletePayeeMutation.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

