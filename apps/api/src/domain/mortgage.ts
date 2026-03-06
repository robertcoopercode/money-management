export const calculateMonthlyPaymentMinor = (
  principalMinor: number,
  annualRateDecimal: number,
  amortizationMonths: number,
) => {
  const principal = principalMinor / 100
  const monthlyRate = annualRateDecimal / 12

  if (monthlyRate === 0) {
    return Math.round((principal / amortizationMonths) * 100)
  }

  const payment =
    (principal * (monthlyRate * (1 + monthlyRate) ** amortizationMonths)) /
    ((1 + monthlyRate) ** amortizationMonths - 1)
  return Math.round(payment * 100)
}
