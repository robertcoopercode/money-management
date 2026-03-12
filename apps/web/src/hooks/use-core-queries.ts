import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "../lib/api.js"
import type {
  Account,
  Payee,
  CategoryGroup,
  PlanningResponse,
} from "../types.js"

export const useCoreQueries = (month: string) => {
  const queryClient = useQueryClient()

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<Account[]>("/api/accounts"),
  })

  const payeesQuery = useQuery({
    queryKey: ["payees"],
    queryFn: () => apiFetch<Payee[]>("/api/payees"),
  })

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<CategoryGroup[]>("/api/categories"),
  })

  const planningQuery = useQuery({
    queryKey: ["planning", month],
    queryFn: () => apiFetch<PlanningResponse>(`/api/planning/${month}`),
  })

  const refetchCoreData = () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] })
    void queryClient.invalidateQueries({ queryKey: ["transactions"] })
    void queryClient.invalidateQueries({ queryKey: ["payees"] })
    void queryClient.invalidateQueries({ queryKey: ["planning"] })
    void queryClient.invalidateQueries({ queryKey: ["reports"] })
  }

  return {
    accountsQuery,
    payeesQuery,
    categoriesQuery,
    planningQuery,
    refetchCoreData,
  }
}
