-- Remove categoryId from loan-account-side transfer transactions.
-- Only the non-loan (budget account) side should carry the category
-- so that budget activity is not zero-summed by the transfer pair.
UPDATE "Transaction" t
SET "categoryId" = NULL
FROM "Account" a
WHERE t."accountId" = a."id"
  AND a."type" = 'LOAN'
  AND t."isTransfer" = true
  AND t."transferPairId" IS NOT NULL
  AND t."categoryId" IS NOT NULL;
