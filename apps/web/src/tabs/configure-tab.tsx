import { AccountsTab } from "./accounts-tab.js"
import { PayeesTab } from "./payees-tab.js"
import { TagsTab } from "./tags-tab.js"
import type { Account, Payee, Tag, CategoryGroup } from "../types.js"
import type { UseQueryResult } from "@tanstack/react-query"

type ConfigureTabProps = {
  accountsQuery: UseQueryResult<Account[]>
  payeesQuery: UseQueryResult<Payee[]>
  tagsQuery: UseQueryResult<Tag[]>
  categoryGroups: CategoryGroup[]
  refetchCoreData: () => void
  onAccountCreated: (accountId: string) => void
}

export const ConfigureTab = ({
  accountsQuery,
  payeesQuery,
  tagsQuery,
  categoryGroups,
  refetchCoreData,
  onAccountCreated,
}: ConfigureTabProps) => (
  <div className="configure-layout">
    <div className="configure-left">
      <AccountsTab
        accountsQuery={accountsQuery}
        categoryGroups={categoryGroups}
        refetchCoreData={refetchCoreData}
        onAccountCreated={onAccountCreated}
      />
      <TagsTab tagsQuery={tagsQuery} refetchCoreData={refetchCoreData} />
    </div>
    <div className="configure-right">
      <PayeesTab
        payeesQuery={payeesQuery}
        categoryGroups={categoryGroups}
        refetchCoreData={refetchCoreData}
      />
    </div>
  </div>
)
