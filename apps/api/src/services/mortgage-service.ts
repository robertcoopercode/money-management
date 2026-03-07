import { PaymentFrequency, prisma } from "@ledgr/db"
import { Effect } from "effect"
import { calculateMonthlyPaymentMinor } from "../domain/mortgage.js"

export const getMortgageProfile = (accountId: string) =>
  Effect.tryPromise({
    try: async () => {
      const profile = await prisma.mortgageProfile.findUnique({
        where: { accountId },
        include: { linkedCategory: true, account: true },
      })

      if (!profile) {
        return null
      }

      const annualRate = Number(profile.interestRateAnnual)
      const monthlyPaymentMinor = calculateMonthlyPaymentMinor(
        profile.principalMinor,
        annualRate,
        profile.amortizationMonths,
      )

      return {
        ...profile,
        monthlyPaymentMinor,
      }
    },
    catch: (error) =>
      new Error(`Unable to load mortgage profile: ${String(error)}`),
  })

export const upsertMortgageProfile = (input: {
  accountId: string
  interestRateAnnual: number
  amortizationMonths: number
  principalMinor: number
  paymentFrequency?: PaymentFrequency
  linkedCategoryId?: string
}) =>
  Effect.tryPromise({
    try: async () => {
      const profile = await prisma.mortgageProfile.upsert({
        where: { accountId: input.accountId },
        update: {
          interestRateAnnual: input.interestRateAnnual,
          amortizationMonths: input.amortizationMonths,
          principalMinor: input.principalMinor,
          paymentFrequency: input.paymentFrequency ?? PaymentFrequency.MONTHLY,
          linkedCategoryId: input.linkedCategoryId,
        },
        create: {
          accountId: input.accountId,
          interestRateAnnual: input.interestRateAnnual,
          amortizationMonths: input.amortizationMonths,
          principalMinor: input.principalMinor,
          paymentFrequency: input.paymentFrequency ?? PaymentFrequency.MONTHLY,
          linkedCategoryId: input.linkedCategoryId,
        },
        include: {
          linkedCategory: true,
          account: true,
        },
      })

      const monthlyPaymentMinor = calculateMonthlyPaymentMinor(
        profile.principalMinor,
        Number(profile.interestRateAnnual),
        profile.amortizationMonths,
      )

      return {
        ...profile,
        monthlyPaymentMinor,
      }
    },
    catch: (error) =>
      new Error(`Unable to save mortgage profile: ${String(error)}`),
  })
