import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import AdminLayout from '../components/AdminLayout'
import { daysUntil } from '../utils/loanMath'

export default function AdminDashboard() {
  const members = useLiveQuery(() => db.members.toArray(), []) ?? []
  const shareContributions = useLiveQuery(() => db.shareContributions.toArray(), []) ?? []
  const penalties = useLiveQuery(() => db.penalties.where('status').equals('flagged').toArray(), []) ?? []
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? []
  const regFees = useLiveQuery(() => db.registrationFees.toArray(), []) ?? []

  const activeMembers = members.filter((m) => m.status === 'active' && !m.isAdmin).length
  const pendingApproval = members.filter((m) => m.status === 'pending_approval').length
  const totalShares = shareContributions.reduce((sum, c) => sum + c.amount, 0)
  const pendingLoanRequests = loans.filter((l) => l.status === 'requested').length
  const activeLoans = loans.filter((l) => l.status === 'in_progress' || l.status === 'disbursed')
  const dueSoonCount = activeLoans.filter((l) => l.dueDate && daysUntil(l.dueDate) <= 7).length
  const registrationFundTotal = regFees.reduce((sum, f) => sum + f.amount, 0)

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
