// Core loan math, kept separate from UI so the rules are easy to verify and reuse.

export function calculateTotalPayable(principal: number, interestRate: number): number {
  return principal + principal * interestRate
}

export function calculateInterestAmount(principal: number, interestRate: number): number {
  return principal * interestRate
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export function daysUntil(dateIso: string): number {
  const due = new Date(dateIso)
  const now = new Date()
  due.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Splits a repayment amount into principal and interest, following the group's
 * rule: any repayment first pays down outstanding interest-bearing balance
 * proportionally. For simplicity in Phase 2 we apply the repayment against
 * principal and interest in the same ratio as the loan's total composition,
 * then split the interest portion 50/50 between member and group accounts.
 */
export function splitRepayment(
  amount: number,
  principal: number,
  totalPayable: number
): { principalPortion: number; interestPortion: number; memberInterestShare: number; groupInterestShare: number } {
  const principalRatio = totalPayable > 0 ? principal / totalPayable : 1
  const principalPortion = round2(amount * principalRatio)
  const interestPortion = round2(amount - principalPortion)
  const memberInterestShare = round2(interestPortion * 0.5)
  const groupInterestShare = round2(interestPortion - memberInterestShare)
  return { principalPortion, interestPortion, memberInterestShare, groupInterestShare }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
