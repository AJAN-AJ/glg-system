import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import AdminLayout from '../components/AdminLayout'
import { daysUntil } from '../utils/loanMath'

export default function AdminDashboard() {
  const members = useLiveQuery(() => db.members.toArray(), []) ?? []
  const shareContributions = useLiveQuery(() => db.shareContributions.toArray(), []) ?? []
  const penalties = useLiveQuery(() => db.penalties.where('status').equals('flagged').toArray(), []) ?? []
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? []

  const activeMembers = members.filter((m) => m.status === 'active').length
  const pendingApproval = members.filter((m) => m.status === 'pending_approval').length
  const totalShares = shareContributions.reduce((sum, c) => sum + c.amount, 0)
  const pendingLoanRequests = loans.filter((l) => l.status === 'requested').length
  const activeLoans = loans.filter((l) => l.status === 'in_progress' || l.status === 'disbursed')
  const dueSoonCount = activeLoans.filter((l) => l.dueDate && daysUntil(l.dueDate) <= 7).length

  const stats = [
    { label: 'Active Members', value: activeMembers },
    { label: 'Pending Approval', value: pendingApproval },
    { label: 'Total Shares Collected (MK)', value: totalShares.toLocaleString() },
    { label: 'Flagged Penalties Awaiting Confirmation', value: penalties.length },
    { label: 'Pending Loan Requests', value: pendingLoanRequests },
    { label: 'Active Loans', value: activeLoans.length },
    { label: 'Loans Due/Overdue Within 7 Days', value: dueSoonCount }
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

      {pendingApproval > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-3">
          {pendingApproval} member{pendingApproval > 1 ? 's' : ''} {pendingApproval > 1 ? 'have' : 'has'} submitted their
          profile and {pendingApproval > 1 ? 'are' : 'is'} waiting for approval. Go to the Members page to review.
        </div>
      )}

      {pendingLoanRequests > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          {pendingLoanRequests} loan request{pendingLoanRequests > 1 ? 's' : ''} awaiting review. Go to the Loans page.
        </div>
      )}

      <p className="text-xs text-gray-400 mt-6">
        Phase 2 build — penalty auto-flagging, registration fee fund, and the full bank/interest dashboard arrive next.
      </p>
    </AdminLayout>
  )
}
