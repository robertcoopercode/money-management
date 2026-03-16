import { useEffect, useState } from "react"
import { Tabs } from "@base-ui/react/tabs"
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { LoginPage } from "./pages/login.js"
import { apiFetch } from "./lib/api.js"
import { formatMonth } from "./lib/date-helpers.js"
import { defaultTransactionDate } from "./lib/date-helpers.js"
import { useCoreQueries } from "./hooks/use-core-queries.js"
import { AccountsTab } from "./tabs/accounts-tab.js"
import { TransactionsTab } from "./tabs/transactions-tab.js"
import { PayeesTab } from "./tabs/payees-tab.js"
import { PlanningTab } from "./tabs/planning-tab.js"
import { ReportsTab } from "./tabs/reports-tab.js"
import { TagsTab } from "./tabs/tags-tab.js"
import { CategoriesTab } from "./tabs/categories-tab.js"
import { isAppTab, getInitialAppTab } from "./types.js"
import type { AppTab } from "./types.js"
import type { TransactionDraft } from "./lib/transaction-entry.js"

import { ScrollArea } from "./components/scroll-area.js"
import "./App.css"

const App = () => {
  const queryClient = useQueryClient()

  const authQuery = useQuery({
    queryKey: ["auth"],
    queryFn: () => apiFetch<{ authenticated: boolean }>("/api/auth/me"),
    retry: false,
  })

  if (authQuery.isLoading) {
    return null
  }

  if (authQuery.isError || !authQuery.data?.authenticated) {
    return (
      <LoginPage
        onSuccess={() =>
          void queryClient.invalidateQueries({ queryKey: ["auth"] })
        }
      />
    )
  }

  return <AuthenticatedApp />
}

const AuthenticatedApp = () => {
  const queryClient = useQueryClient()

  const logoutMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth"] })
    },
  })

  const [activeTab, setActiveTab] = useState<AppTab>(getInitialAppTab)
  const [month, setMonth] = useState(formatMonth(new Date()))
  const [newTransaction, setNewTransaction] = useState<TransactionDraft>({
    accountId: "",
    transferAccountId: "",
    date: defaultTransactionDate,
    amount: "",
    payeeId: "",
    categoryId: "",
    note: "",
    clearingStatus: "UNCLEARED",
    isExpense: true,
    splits: [],
    tagIds: [],
  })

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get("tab") === activeTab) {
      return
    }

    searchParams.set("tab", activeTab)
    const nextQuery = searchParams.toString()
    const nextUrl = `${window.location.pathname}${
      nextQuery ? `?${nextQuery}` : ""
    }${window.location.hash}`
    window.history.replaceState(null, "", nextUrl)
  }, [activeTab])

  const {
    accountsQuery,
    payeesQuery,
    categoriesQuery,
    tagsQuery,
    planningQuery,
    refetchCoreData,
  } = useCoreQueries(month)

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <img
            className="brand-mark"
            src="/ledgr-favicon.svg"
            alt="Ledgr logo"
          />
          <div>
            <h1>Ledgr</h1>
          </div>
        </div>
        <div className="header-right">
          <BaseTooltip.Provider>
            <BaseTooltip.Root>
              <BaseTooltip.Trigger
                className="logout-icon-button"
                onClick={() => logoutMutation.mutate()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </BaseTooltip.Trigger>
              <BaseTooltip.Portal>
                <BaseTooltip.Positioner sideOffset={8}>
                  <BaseTooltip.Popup className="logout-tooltip">
                    Log out
                  </BaseTooltip.Popup>
                </BaseTooltip.Positioner>
              </BaseTooltip.Portal>
            </BaseTooltip.Root>
          </BaseTooltip.Provider>
        </div>
      </header>

      <Tabs.Root
        className="tabs-root"
        value={activeTab}
        onValueChange={(value) => {
          if (isAppTab(value)) {
            setActiveTab(value)
          }
        }}
      >
        <Tabs.List className="tabs-list">
          <Tabs.Tab className="tabs-tab" value="transactions">
            Transactions
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="accounts">
            Accounts
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="payees">
            Payees
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="categories">
            Categories
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="tags">
            Tags
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="planning">
            Planning
          </Tabs.Tab>
          <Tabs.Tab className="tabs-tab" value="reports">
            Reporting
          </Tabs.Tab>
          <Tabs.Indicator className="tabs-indicator" />
        </Tabs.List>

        <Tabs.Panel className="panel" value="accounts">
          <ScrollArea>
            <AccountsTab
              accountsQuery={accountsQuery}
              refetchCoreData={refetchCoreData}
              onAccountCreated={(accountId) =>
                setNewTransaction((current) => ({
                  ...current,
                  accountId: current.accountId || accountId,
                }))
              }
            />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="transactions">
          <ScrollArea>
            <TransactionsTab
              newTransaction={newTransaction}
              setNewTransaction={setNewTransaction}
              accounts={accountsQuery.data ?? []}
              payees={payeesQuery.data ?? []}
              tags={tagsQuery.data ?? []}
              categoryGroups={categoriesQuery.data ?? []}
              refetchCoreData={refetchCoreData}
              onNavigateToPayees={() => setActiveTab("payees")}
            />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="payees">
          <ScrollArea>
            <PayeesTab payeesQuery={payeesQuery} categoryGroups={categoriesQuery.data ?? []} refetchCoreData={refetchCoreData} />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="categories">
          <ScrollArea>
            <CategoriesTab
              categoriesQuery={categoriesQuery}
              refetchCoreData={refetchCoreData}
            />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="tags">
          <ScrollArea>
            <TagsTab
              tagsQuery={tagsQuery}
              refetchCoreData={refetchCoreData}
            />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="planning">
          <ScrollArea>
            <PlanningTab
              month={month}
              onMonthChange={setMonth}
              planningData={planningQuery.data}
              planningIsLoading={planningQuery.isLoading}
              planningIsError={planningQuery.isError}
              planningError={planningQuery.error}
              refetchCoreData={refetchCoreData}
            />
          </ScrollArea>
        </Tabs.Panel>

        <Tabs.Panel className="panel" value="reports">
          <ScrollArea>
            <ReportsTab
              accounts={accountsQuery.data ?? []}
              payees={payeesQuery.data ?? []}
              categoryGroups={categoriesQuery.data ?? []}
            />
          </ScrollArea>
        </Tabs.Panel>
      </Tabs.Root>

      <Toaster richColors theme="dark" />
    </div>
  )
}

export default App
