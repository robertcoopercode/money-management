import { useMemo, useState } from "react"
import { TextInput } from "../components/text-input.js"
import { AppSelect } from "../components/app-select.js"
import { useCategoryMutations } from "../hooks/use-category-mutations.js"
import { apiFetch } from "../lib/api.js"
import { toDisplayErrorMessage } from "../lib/errors.js"
import { InlineEditName } from "../components/inline-edit-name.js"
import type { CategoryGroup } from "../types.js"
import type { UseQueryResult } from "@tanstack/react-query"
import type {
  CategoryDeleteImpact,
  CategoryGroupDeleteImpact,
} from "../hooks/use-category-mutations.js"

type CategoriesTabProps = {
  categoriesQuery: UseQueryResult<CategoryGroup[]>
  refetchCoreData: () => void
}

type DeleteDialogState =
  | { type: "category"; id: string; name: string; impact: CategoryDeleteImpact }
  | { type: "group"; id: string; name: string; impact: CategoryGroupDeleteImpact }
  | null

export const CategoriesTab = ({
  categoriesQuery,
  refetchCoreData,
}: CategoriesTabProps) => {
  const [search, setSearch] = useState("")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [movingCategoryId, setMovingCategoryId] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)

  const {
    updateCategoryMutation,
    deleteCategoryMutation,
    updateCategoryGroupMutation,
    deleteCategoryGroupMutation,
  } = useCategoryMutations({
    refetchCoreData,
    onCategoryUpdated: () => {
      setMovingCategoryId(null)
    },
    onCategoryDeleted: () => setDeleteDialog(null),
    onGroupUpdated: () => {},
    onGroupDeleted: () => setDeleteDialog(null),
  })

  const groups = categoriesQuery.data ?? []

  const filteredGroups = useMemo(() => {
    const data = categoriesQuery.data ?? []
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return data
    return data
      .map((group) => ({
        ...group,
        categories: group.categories.filter((cat) =>
          cat.name.toLowerCase().includes(normalizedSearch),
        ),
      }))
      .filter(
        (group) =>
          group.categories.length > 0 ||
          group.name.toLowerCase().includes(normalizedSearch),
      )
  }, [categoriesQuery.data, search])

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    setLoadingImpact(true)
    try {
      const impact = await apiFetch<CategoryDeleteImpact>(
        `/api/categories/${categoryId}/impact`,
      )
      setDeleteDialog({ type: "category", id: categoryId, name: categoryName, impact })
    } catch {
      setDeleteDialog({
        type: "category",
        id: categoryId,
        name: categoryName,
        impact: { transactions: 0, splits: 0, assignments: 0, payeeDefaults: 0 },
      })
    } finally {
      setLoadingImpact(false)
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    setLoadingImpact(true)
    try {
      const impact = await apiFetch<CategoryGroupDeleteImpact>(
        `/api/category-groups/${groupId}/impact`,
      )
      setDeleteDialog({ type: "group", id: groupId, name: groupName, impact })
    } catch {
      setDeleteDialog({
        type: "group",
        id: groupId,
        name: groupName,
        impact: { categories: 0, transactions: 0, splits: 0, assignments: 0, payeeDefaults: 0 },
      })
    } finally {
      setLoadingImpact(false)
    }
  }

  const confirmDelete = () => {
    if (!deleteDialog) return
    if (deleteDialog.type === "category") {
      deleteCategoryMutation.mutate(deleteDialog.id)
    } else {
      deleteCategoryGroupMutation.mutate(deleteDialog.id)
    }
  }

  const isPendingDelete =
    deleteCategoryMutation.isPending || deleteCategoryGroupMutation.isPending

  return (
    <>
      <section className="card">
        <div className="payee-header">
          <div className="payee-header-left">
            <h2>Categories</h2>
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
            />
          </div>
        </div>

        <div className="list">
          {categoriesQuery.isError ? (
            <p className="error-text">
              {toDisplayErrorMessage(
                categoriesQuery.error,
                "Failed to load categories.",
              )}
            </p>
          ) : categoriesQuery.isLoading ? (
            <p className="muted">Loading categories...</p>
          ) : filteredGroups.length === 0 ? (
            <p className="muted">No categories found.</p>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.id} className="category-group-section">
                <div className="category-group-header">
                  <button
                    type="button"
                    className="category-collapse-btn"
                    onClick={() => toggleGroup(group.id)}
                    title={collapsedGroups.has(group.id) ? "Expand" : "Collapse"}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: collapsedGroups.has(group.id)
                          ? "rotate(-90deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.15s",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  <InlineEditName
                    value={group.name}
                    onSave={(name) =>
                      updateCategoryGroupMutation.mutate({
                        groupId: group.id,
                        name,
                      })
                    }
                    isSaving={updateCategoryGroupMutation.isPending}
                    className="category-group-name"
                    inputWidth="14rem"
                  />

                  <span className="muted" style={{ fontSize: "0.8rem", marginLeft: "0.5rem" }}>
                    {group.categories.length} categor{group.categories.length === 1 ? "y" : "ies"}
                  </span>

                  <div style={{ marginLeft: "auto", display: "flex", gap: "0.3rem" }}>
                    <button
                      type="button"
                      className="icon-button-danger"
                      title="Delete group"
                      disabled={loadingImpact}
                      onClick={() => void handleDeleteGroup(group.id, group.name)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </div>

                {!collapsedGroups.has(group.id) && (
                  <div className="category-group-items">
                    {group.categories.length === 0 ? (
                      <div className="list-item">
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          No categories in this group
                        </span>
                      </div>
                    ) : (
                      group.categories.map((cat) => (
                        <div className="list-item" key={cat.id}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                            <InlineEditName
                              value={cat.name}
                              onSave={(name) =>
                                updateCategoryMutation.mutate({
                                  categoryId: cat.id,
                                  name,
                                })
                              }
                              isSaving={updateCategoryMutation.isPending}
                              className="category-name-editable"
                            />

                            {movingCategoryId === cat.id ? (
                              <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                                <AppSelect
                                  options={[
                                    { value: "", label: "Move to..." },
                                    ...groups
                                      .filter((g) => g.id !== group.id)
                                      .map((g) => ({ value: g.id, label: g.name })),
                                  ]}
                                  value=""
                                  onChange={(value) => {
                                    if (value) {
                                      updateCategoryMutation.mutate({
                                        categoryId: cat.id,
                                        groupId: value,
                                      })
                                    }
                                  }}
                                  placeholder="Move to..."
                                />
                                <button
                                  type="button"
                                  onClick={() => setMovingCategoryId(null)}
                                  style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)", fontSize: "0.8rem" }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div style={{ display: "flex", gap: "0.3rem", marginLeft: "auto" }}>
                            {groups.length > 1 ? (
                              <button
                                type="button"
                                className="edit-icon-button"
                                title="Move to another group"
                                onClick={() =>
                                  setMovingCategoryId(
                                    movingCategoryId === cat.id ? null : cat.id,
                                  )
                                }
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12h14" />
                                  <path d="m12 5 7 7-7 7" />
                                </svg>
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="icon-button-danger"
                              title="Delete category"
                              disabled={loadingImpact}
                              onClick={() => void handleDeleteCategory(cat.id, cat.name)}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {deleteDialog ? (
        <div className="dialog-backdrop" onClick={() => setDeleteDialog(null)}>
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0 }}>
              Delete {deleteDialog.type === "group" ? "group" : "category"} &ldquo;{deleteDialog.name}&rdquo;?
            </h3>
            <div style={{ margin: 0, fontSize: "0.88rem" }}>
              {deleteDialog.type === "group" && "categories" in deleteDialog.impact ? (
                <p>
                  This will delete {deleteDialog.impact.categories} categor{deleteDialog.impact.categories === 1 ? "y" : "ies"} in this group.
                </p>
              ) : null}
              <p>
                {deleteDialog.impact.transactions > 0
                  ? `${deleteDialog.impact.transactions} transaction${deleteDialog.impact.transactions === 1 ? "" : "s"} will have ${deleteDialog.type === "category" ? "this" : "their"} category cleared. `
                  : ""}
                {deleteDialog.impact.splits > 0
                  ? `${deleteDialog.impact.splits} split line${deleteDialog.impact.splits === 1 ? "" : "s"} will be deleted. `
                  : ""}
                {deleteDialog.impact.assignments > 0
                  ? `${deleteDialog.impact.assignments} budget assignment${deleteDialog.impact.assignments === 1 ? "" : "s"} will be removed. `
                  : ""}
                {deleteDialog.impact.payeeDefaults > 0
                  ? `${deleteDialog.impact.payeeDefaults} payee default${deleteDialog.impact.payeeDefaults === 1 ? "" : "s"} will be cleared. `
                  : ""}
                {deleteDialog.impact.transactions === 0 &&
                deleteDialog.impact.splits === 0 &&
                deleteDialog.impact.assignments === 0 &&
                deleteDialog.impact.payeeDefaults === 0
                  ? "No transactions or assignments are affected."
                  : ""}
              </p>
              <p>This cannot be undone.</p>
            </div>
            <div className="dialog-actions">
              <button
                onClick={() => setDeleteDialog(null)}
                style={{ background: "none", border: "1px solid rgb(95 117 171 / 28%)" }}
              >
                Cancel
              </button>
              <button
                className="button-danger"
                onClick={confirmDelete}
                disabled={isPendingDelete}
              >
                {isPendingDelete ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
