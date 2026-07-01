import type { Member, ShareContribution, LoanRepayment, Loan } from '../types'

export interface InterestDistribution {
  totalGroupInterest: number
  totalShares: number
  distributable: boolean // false if any loans are still active
  memberShares: { memberId: string; totalContributed: number; ratio: number; interestShare: number }[]
}

export function calculateGroupInterestDistribution(
  members: Member[],
  contributions: ShareContribution[],
  repayments: LoanRepayment[],
  loans: Loan[]
): InterestDistribution {
  const activeLoans = loans.filter(
    (l) => l.status === 'in_progress' || l.status === 'disbursed' || l.status === 'approved'
  )
  const distributable = activeLoans.length === 0

  const totalGroupInterest = repayments.reduce((sum, r) => sum + r.groupInterestShare, 0)

  // Total contributions per member
  const memberContribMap: Record<string, number> = {}
  for (const c of contributions) {
    memberContribMap[c.memberId] = (memberContribMap[c.memberId] ?? 0) + c.amount
  }

  const totalShares = Object.values(memberContribMap).reduce((sum, v) => sum + v, 0)

  const activeMembers = members.filter((m) => m.status === 'active')
  const memberShares = activeMembers.map((m) => {
    const totalContributed = memberContribMap[m.id] ?? 0
    const ratio = totalShares > 0 ? totalContributed / totalShares : 0
    const interestShare = Math.round(totalGroupInterest * ratio * 100) / 100
    return { memberId: m.id, totalContributed, ratio, interestShare }
  })

  return { totalGroupInterest, totalShares, distributable, memberShares }
}
