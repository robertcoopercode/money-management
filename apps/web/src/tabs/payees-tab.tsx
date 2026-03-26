import { useEffect, useMemo, useRef, useState } from "react"
import { Switch } from "@base-ui/react/switch"
import { TextInput } from "../components/text-input.js"
import { AppDialog } from "../components/app-dialog.js"
import { AppCheckbox } from "../components/app-checkbox.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { usePayeeMutations } from "../hooks/use-payee-mutations.js"
import { CategoryAutocomplete } from "../components/category-autocomplete.js"
import { InlineEditName } from "../components/inline-edit-name.js"
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
  const [showUnused, setShowUnused] = useState(false)

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
      setShowCombineDialog(false)
    },
    onPayeesDeleted: () => {
      setSelectedPayeeIds(new Set())
      setShowDeleteConfirm(false)
    },
  })

  const visiblePayees = useMemo(() => {
    const normalizedSearch = payeeSearch.trim().toLowerCase()
    const filtered = (payeesQuery.data ?? []).filter((payee) => {
      if (!payee.name.toLowerCase().includes(normalizedSearch)) return false
      if (showUnused && (payee._count?.transactions ?? 0) > 0) return false
      return true
    })

    filtered.sort((left, right) => left.name.localeCompare(right.name))

    return filtered
  }, [payeesQuery.data, payeeSearch, showUnused])

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

  const [showCombineDialog, setShowCombineDialog] = useState(false)

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
        <div className="section-header" style={{ marginBottom: "0.8rem" }}>
          <h2>Payees</h2>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.8rem" }}>
          <TextInput
            value={payeeSearch}
            onChange={(event) => setPayeeSearch(event.target.value)}
            placeholder="Search..."
            style={{ width: "12rem" }}
          />
          {selectedPayeeIds.size >= 2 ? (
            <button
              onClick={() => {
                if (!combineName && firstSelectedPayee) {
                  setCombineName(firstSelectedPayee.name)
                }
                setShowCombineDialog(true)
              }}
              style={{ whiteSpace: "nowrap" }}
            >
              Combine ({selectedPayeeIds.size})
            </button>
          ) : null}
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
          <label className="app-switch-label" style={{ marginLeft: "auto" }}>
            <Switch.Root
              className="app-switch"
              checked={showUnused}
              onCheckedChange={setShowUnused}
            >
              <Switch.Thumb className="app-switch-thumb" />
            </Switch.Root>
            Unused
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
            <>
              <div style={{ padding: "0.25rem 0.75rem" }}>
                <label className="payee-checkbox-label">
                  <AppCheckbox
                    checked={allVisibleSelected}
                    onCheckedChange={() => toggleAll()}
                    aria-label="Select all visible payees"
                  />
                  <span className="muted" style={{ fontSize: "0.78rem" }}>
                    Select all
                  </span>
                </label>
              </div>
              {visiblePayees.map((payee) => (
                <div
                  className={`list-item${selectedPayeeIds.has(payee.id) ? " selected" : ""}`}
                  key={payee.id}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-payee-category]")) return
                    togglePayee(payee.id)
                  }}
                >
                  <div className="payee-checkbox-label">
                    <AppCheckbox
                      checked={selectedPayeeIds.has(payee.id)}
                      onCheckedChange={() => togglePayee(payee.id)}
                      aria-label={`Select ${payee.name}`}
                    />
                    <span onClick={(e) => e.stopPropagation()}>
                      <InlineEditName
                        value={payee.name}
                        onSave={(name) =>
                          updatePayeeMutation.mutate({
                            payeeId: payee.id,
                            name,
                          })
                        }
                        isSaving={updatePayeeMutation.isPending}
                        ariaLabel={`Rename ${payee.name}`}
                      />
                    </span>
                    {(payee._count?.transactions ?? 0) > 0 ? (
                      <span className="payee-txn-pill" title={`${payee._count?.transactions} transaction${payee._count?.transactions === 1 ? "" : "s"}`}>
                        {payee._count?.transactions}
                      </span>
                    ) : null}
                  </div>
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

      <AppDialog
        open={showCombineDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCombineDialog(false)
            setCombineName("")
          }
        }}
        title={`Combine ${selectedPayeeIds.size} payees`}
      >
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            handleCombine()
          }}
        >
          <label>
            New payee name
            <TextInput
              value={combineName}
              onChange={(e) => setCombineName(e.target.value)}
              placeholder="Enter name"
              autoFocus
            />
          </label>
          <div className="dialog-actions">
            <button
              type="button"
              onClick={() => {
                setShowCombineDialog(false)
                setCombineName("")
              }}
              disabled={combinePayeeMutation.isPending}
              style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!combineName.trim() || combinePayeeMutation.isPending}
            >
              {combinePayeeMutation.isPending ? "Combining..." : "Combine"}
            </button>
          </div>
        </form>
      </AppDialog>

      <AppDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => { if (!open) setShowDeleteConfirm(false) }}
        title={`Delete ${selectedPayeeIds.size} payees?`}
      >
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
      </AppDialog>
    </>
  )
}

