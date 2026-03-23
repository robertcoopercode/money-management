import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import type { PlanningGroup } from "../types.js"

type GroupOrdering = { groupId: string; categoryIds: string[] }

/**
 * Client-authoritative ordering for planning groups/categories.
 *
 * Seeds from server data on first load or month change, then never
 * overwritten by subsequent refetches. Server financial data is merged
 * on each render so assignments/activity/available stay live.
 */
export const useClientOrdering = (
  month: string,
  serverGroups: PlanningGroup[] | undefined,
) => {
  const [ordering, setOrdering] = useState<GroupOrdering[] | null>(null)
  const snapshotRef = useRef<GroupOrdering[] | null>(null)
  const seededMonthRef = useRef<string | null>(null)

  // Seed ordering from server data on first load or month change
  useEffect(() => {
    if (!serverGroups || serverGroups.length === 0) return
    if (seededMonthRef.current === month) return

    seededMonthRef.current = month
    setOrdering(extractOrdering(serverGroups))
  }, [month, serverGroups])

  // Merge client ordering with server financial data
  const groups = useMemo((): PlanningGroup[] => {
    if (!serverGroups) return []
    if (!ordering) return serverGroups

    // Build lookup maps from server data
    const serverGroupMap = new Map<string, PlanningGroup>()
    const serverCatMap = new Map<string, { cat: PlanningGroup["categories"][number]; groupId: string }>()
    for (const g of serverGroups) {
      serverGroupMap.set(g.groupId, g)
      for (const c of g.categories) {
        serverCatMap.set(c.categoryId, { cat: c, groupId: g.groupId })
      }
    }

    // Track which server IDs we've placed
    const placedGroupIds = new Set<string>()
    const placedCatIds = new Set<string>()

    const result: PlanningGroup[] = []

    for (const o of ordering) {
      const serverGroup = serverGroupMap.get(o.groupId)
      if (!serverGroup) continue // group deleted on server
      placedGroupIds.add(o.groupId)

      const cats: PlanningGroup["categories"] = []
      for (const catId of o.categoryIds) {
        const entry = serverCatMap.get(catId)
        if (!entry) continue // category deleted on server
        placedCatIds.add(catId)
        cats.push(entry.cat)
      }

      // Append any new categories in this group that aren't in client ordering
      for (const c of serverGroup.categories) {
        if (!placedCatIds.has(c.categoryId)) {
          placedCatIds.add(c.categoryId)
          cats.push(c)
        }
      }

      result.push({
        ...serverGroup,
        categories: cats,
      })
    }

    // Append any new groups from server that aren't in client ordering
    for (const g of serverGroups) {
      if (placedGroupIds.has(g.groupId)) continue
      placedGroupIds.add(g.groupId)

      const cats: PlanningGroup["categories"] = []
      for (const c of g.categories) {
        if (!placedCatIds.has(c.categoryId)) {
          placedCatIds.add(c.categoryId)
          cats.push(c)
        }
      }
      result.push({ ...g, categories: cats })
    }

    return result
  }, [ordering, serverGroups])

  const applyGroupReorder = useCallback((groupIds: string[]) => {
    setOrdering((prev) => {
      if (!prev) return prev
      const map = new Map(prev.map((o) => [o.groupId, o]))
      return groupIds
        .map((id) => map.get(id))
        .filter((o): o is GroupOrdering => o != null)
    })
  }, [])

  const applyCategoryReorder = useCallback(
    (categoryId: string, targetGroupId: string, newIndex: number) => {
      setOrdering((prev) => {
        if (!prev) return prev

        // Remove category from its current group
        let found = false
        const without = prev.map((o) => {
          const idx = o.categoryIds.indexOf(categoryId)
          if (idx !== -1) {
            found = true
            return { ...o, categoryIds: o.categoryIds.filter((id) => id !== categoryId) }
          }
          return o
        })
        if (!found) return prev

        // Insert into target group at newIndex
        return without.map((o) => {
          if (o.groupId === targetGroupId) {
            const ids = [...o.categoryIds]
            ids.splice(newIndex, 0, categoryId)
            return { ...o, categoryIds: ids }
          }
          return o
        })
      })
    },
    [],
  )

  const snapshotOrdering = useCallback(() => {
    setOrdering((current) => {
      snapshotRef.current = current
      return current
    })
  }, [])

  const restoreSnapshot = useCallback(() => {
    if (snapshotRef.current) {
      setOrdering(snapshotRef.current)
      snapshotRef.current = null
    }
  }, [])

  return {
    groups,
    applyGroupReorder,
    applyCategoryReorder,
    snapshotOrdering,
    restoreSnapshot,
  }
}

function extractOrdering(groups: PlanningGroup[]): GroupOrdering[] {
  return groups.map((g) => ({
    groupId: g.groupId,
    categoryIds: g.categories.map((c) => c.categoryId),
  }))
}
