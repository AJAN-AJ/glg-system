import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useAuth } from '../context/AuthContext'
import { calculateTotalPayable, daysUntil } from '../utils/loanMath'
import { generateId, generateLoanCode } from '../utils/auth'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function MemberDashboard() {
  const { session, logout } = useAuth()
  const memberId = session?.type === 'member' ? session.account.id : ''
  const contributions = useLiveQuery(
    () => db.shareContributions.where('memberId').equals(memberId).toArray(),
    [memberId]
  ) ?? []
  const loans = useLiveQuery(
    () => db.loans.where('memberId').equals(memberId).toArray(),
    [memberId]
  ) ?? []
  const repayments = useLiveQuery(() => db.loanRepayments.toArray(), []) ?? []
  const [showRequest, setShowRequest] = useState(false)

  if (session?.type !== 'member') return null
  const member = session.account
  const totalShares = contributions.reduce((sum, c) => sum + c.amount, 0)
  const currentYear = new Date().getFullYear()
  const thisYearContributions = contributions.filter((c) => c.year === currentYear)
  const activeLoan = loans.find((l) => l.status === 'in_progress' || l.status === 'disbursed' || l.status === 'approved' || l.status === 'requested')

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-glg-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/brand/logo.png" alt="GLG" className="w-9 h-9 rounded-md object-contain bg-white" />
          <div>
            <h1 className="font-semibold">Golden Ladder Group</h1>
            <p className="text-xs text-glg-100/80">{member.firstName} {member.surname} · {member.memberId}</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm bg-glg-800 hover:bg-glg-700 px-3 py-1.5 rounded-md">
          Log out
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-2xl font-bold text-glg-700">MK {totalShares.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Total Shares Contributed (all time)</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-2xl font-bold text-glg-700">MK {(member.monthlyShareTarget ?? 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Your Monthly Pledge</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-medium text-gray-700 mb-3">{currentYear} Contributions</h3>
          <div className="grid grid-cols-3 gap-2">
            {MONTH_NAMES.map((name, idx) => {
              const month = idx + 1
              const record = thisYearContributions.find((c) => c.month === month)
              return (
                <div
                  key={month}
                  className={`rounded-lg p-2 text-center text-sm ${
                    record ? 'bg-glg-50 text-glg-700' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <p className="font-medium">{name}</p>
                  <p className="text-xs">{record ? `MK ${record.amount.toLocaleString()}` : '—'}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">Loans</h3>
            {!activeLoan && (
              <button
                onClick={() => setShowRequest(true)}
                className="text-sm bg-glg-600 hover:bg-glg-700 text-white px-3 py-1.5 rounded-lg"
              >
                Request a Loan
              </button>
            )}
          </div>

          {activeLoan && activeLoan.dueDate && (
            <ReminderBanner dueDate={activeLoan.dueDate} />
          )}

          {loans.length === 0 ? (
            <p className="text-sm text-gray-400">No loan history yet.</p>
          ) : (
            <div className="space-y-2">
              {loans.map((loan) => {
                const totalPayable = calculateTotalPayable(loan.principal, loan.interestRate)
                const repaid = repayments.filter((r) => r.loanId === loan.id).reduce((sum, r) => sum + r.amount, 0)
                return (
                  <div key={loan.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-gray-400">{loan.loanCode}</span>
                      <StatusPill status={loan.status} />
                    </div>
                    <p className="mt-1">MK {loan.principal.toLocaleString()} at {(loan.interestRate * 100).toFixed(0)}% for {loan.durationMonths} month(s)</p>
                    {(loan.status === 'in_progress' || loan.status === 'disbursed' || loan.status === 'completed') && (
                      <p className="text-xs text-gray-500 mt-1">
                        Repaid MK {repaid.toLocaleString()} of MK {totalPayable.toLocaleString()}
                      </p>
                    )}
                    {loan.dueDate && (loan.status === 'in_progress' || loan.status === 'disbursed') && (
                      <p className="text-xs text-gray-500">Due: {new Date(loan.dueDate).toLocaleDateString()}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Interest earned and your share of group interest will appear here once all group loans are fully repaid.
        </p>
      </main>

      {showRequest && (
        <RequestLoanModal memberId={member.id} onClose={() => setShowRequest(false)} />
      )}
    </div>
  )
}

function ReminderBanner({ dueDate }: { dueDate: string }) {
  const d = daysUntil(dueDate)
  if (d > 7) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-3">
      {d < 0
        ? `Your loan repayment is ${Math.abs(d)} day(s) overdue. Please pay as soon as possible.`
        : d === 0
        ? 'Your loan repayment is due today.'
        : `Your loan repayment is due in ${d} day(s).`}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    requested: 'bg-gray-100 text-gray-600',
    approved: 'bg-blue-100 text-blue-700',
    disbursed: 'bg-indigo-100 text-indigo-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] ?? ''}`}>{status.replace('_', ' ')}</span>
}

function RequestLoanModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const [principal, setPrincipal] = useState('')
  const [durationMonths, setDurationMonths] = useState('3')
  const [remarks, setRemarks] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const year = new Date().getFullYear()
    const sequence = (await db.loans.count()) + 1
    await db.loans.add({
      id: generateId(),
      loanCode: generateLoanCode(sequence, year),
      memberId,
      principal: Number(principal),
      interestRate: 0.2, // default group rate; admin can adjust upon approval in a later iteration
      durationMonths: Number(durationMonths),
      status: 'requested',
      requestedAt: new Date().toISOString(),
      remarks
    })
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        {submitted ? (
          <div className="text-center space-y-3">
            <p className="text-2xl">✅</p>
            <p className="text-sm text-gray-600">Your loan request has been submitted. An admin will review it.</p>
            <button onClick={onClose} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-semibold text-gray-800">Request a Loan</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Requested (MK)</label>
              <input
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Duration (months)</label>
              <input
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Remarks (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">
                Cancel
              </button>
              <button type="submit" className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                Submit Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
