import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import AdminLayout from '../components/AdminLayout'
import { daysUntil } from '../utils/loanMath'
import { calculateGroupInterestDistribution } from '../utils/interestDistribution'

export default function AdminDashboard() {
  const members = useLiveQuery(() => db.members.toArray(), []) ?? []
  const shareContributions = useLiveQuery(() => db.shareContributions.toArray(), []) ?? []
  const penalties = useLiveQuery(() => db.penalties.where('status').equals('flagged').toArray(), []) ?? []
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? []
  const regFees = useLiveQuery(() => db.registrationFees.toArray(), []) ?? []
  const repayments = useLiveQuery(() => db.loanRepayments.toArray(), []) ?? []

  const activeMembers = members.filter((m) => m.status === 'active' && !m.isAdmin).length
  const pendingApproval = members.filter((m) => m.status === 'pending_approval').length
  const totalShares = shareContributions.reduce((sum, c) => sum + c.amount, 0)
  const pendingLoanRequests = loans.filter((l) => l.status === 'requested').length
  const activeLoans = loans.filter((l) => l.status === 'in_progress' || l.status === 'disbursed')
  const dueSoonCount = activeLoans.filter((l) => l.dueDate && daysUntil(l.dueDate) <= 7).length
  const registrationFundTotal = regFees.reduce((sum, f) => sum + f.amount, 0)
  const dist = calculateGroupInterestDistribution(members, shareContributions, repayments, loans)

  const stats = [
    { label: 'Active Members', value: activeMembers },
    { label: 'Pending Approval', value: pendingApproval },
    { label: 'Total Shares Collected (MK)', value: totalShares.toLocaleString() },
    { label: 'Registration Fund (MK)', value: registrationFundTotal.toLocaleString() },
    { label: 'Flagged Penalties', value: penalties.length },
    { label: 'Pending Loan Requests', value: pendingLoanRequests },
    { label: 'Active Loans', value: activeLoans.length },
    { label: 'Due/Overdue Within 7 Days', value: dueSoonCount }
  ]

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-2xl font-bold text-glg-700">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Group Interest Pool */}
      <div className={`rounded-xl p-4 mb-4 ${dist.distributable ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
        <p className="font-medium text-gray-800">Group Interest Pool</p>
        <p className="text-2xl font-bold text-glg-700 mt-1">MK {dist.totalGroupInterest.toLocaleString()}</p>
        <p className="text-xs text-gray-500 mt-1">
          {dist.distributable
            ? '✅ All loans repaid — pool is distributable proportionally to members.'
            : `⏳ ${activeLoans.length} active loan(s) must be fully repaid before this pool can be distributed.`}
        </p>
        {dist.distributable && dist.memberShares.filter(ms => ms.totalContributed > 0).length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3 space-y-1">
            {dist.memberShares.filter(ms => ms.totalContributed > 0).map((ms) => {
              const m = members.find((mm) => mm.id === ms.memberId)
              if (!m) return null
              return (
                <div key={ms.memberId} className="flex justify-between text-sm text-gray-700">
                  <span>{m.firstName} {m.surname}</span>
                  <span className="font-medium">MK {ms.interestShare.toLocaleString()} <span className="text-gray-400">({(ms.ratio * 100).toFixed(1)}%)</span></span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {pendingApproval > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-3">
          {pendingApproval} member{pendingApproval > 1 ? 's' : ''} awaiting approval — go to Members page.
        </div>
      )}
      {pendingLoanRequests > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          {pendingLoanRequests} loan request{pendingLoanRequests > 1 ? 's' : ''} awaiting review — go to Loans page.
        </div>
      )}
    </AdminLayout>
  )
}
