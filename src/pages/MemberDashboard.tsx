import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useAuth } from '../context/AuthContext'
import { calculateTotalPayable, daysUntil } from '../utils/loanMath'
import { generateId, generateLoanCode } from '../utils/auth'
import { calculateGroupInterestDistribution } from '../utils/interestDistribution'
import type { LoanType } from '../types'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function MemberDashboard() {
  const { session } = useAuth()
  const memberId = session?.account.id ?? ''
  const contributions = useLiveQuery(
    () => db.shareContributions.where('memberId').equals(memberId).toArray(),
    [memberId]
  ) ?? []
  const loans = useLiveQuery(
    () => db.loans.where('memberId').equals(memberId).toArray(),
    [memberId]
  ) ?? []
  const repayments = useLiveQuery(() => db.loanRepayments.toArray(), []) ?? []
  const allMembers = useLiveQuery(() => db.members.toArray(), []) ?? []
  const allContributions = useLiveQuery(() => db.shareContributions.toArray(), []) ?? []
  const allLoans = useLiveQuery(() => db.loans.toArray(), []) ?? []
  const [showRequest, setShowRequest] = useState(false)

  if (!session?.account) return null
  const member = session.account
  const totalShares = contributions.reduce((sum, c) => sum + c.amount, 0)
  const currentYear = new Date().getFullYear()
  const thisYearContributions = contributions.filter((c) => c.year === currentYear)
  const activeLoan = loans.find((l) => l.status === 'in_progress' || l.status === 'disbursed' || l.status === 'approved' || l.status === 'requested')

  const dist = calculateGroupInterestDistribution(allMembers, allContributions, repayments, allLoans)
  const myInterestShare = dist.memberShares.find((ms) => ms.memberId === memberId)

  return (
    <div className="space-y-5">
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

        {/* Interest share card */}
        <div className={`rounded-xl p-4 ${dist.distributable ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'}`}>
          <p className="text-sm font-medium text-gray-700">Your Share of Group Interest</p>
          <p className="text-2xl font-bold text-glg-700 mt-1">
            MK {(myInterestShare?.interestShare ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {dist.distributable
              ? '✅ All group loans are repaid — your interest share is ready for distribution.'
              : '⏳ Interest shares will be distributable once all group loans are fully repaid.'}
          </p>
          {myInterestShare && (
            <p className="text-xs text-gray-400 mt-0.5">
              Based on your {(myInterestShare.ratio * 100).toFixed(1)}% share of total group contributions
            </p>
          )}
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
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-xs text-gray-400">{loan.loanCode}</span>
                        <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full capitalize">{loan.loanType}</span>
                      </div>
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
                    {loan.status === 'rejected' && loan.rejectionReason && (
                      <div className="mt-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-red-600">Rejection Reason:</p>
                        <p className="text-xs text-red-500 mt-0.5">{loan.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

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
  const [loanType, setLoanType] = useState<'normal' | 'soft' | 'investment' | 'emergency'>('normal')
  const [principal, setPrincipal] = useState('')
  const [remarks, setRemarks] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const loanDescriptions = {
    normal: 'Standard loan with regular interest rate.',
    soft: 'Low or zero interest loan for members in need.',
    investment: 'Loan intended for a business or income-generating activity.',
    emergency: 'Urgent loan for unexpected personal hardship.'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const year = new Date().getFullYear()
    const sequence = (await db.loans.count()) + 1
    await db.loans.add({
      id: generateId(),
      loanCode: generateLoanCode(sequence, year),
      memberId,
      loanType,
      principal: Number(principal),
      interestRate: 0,      // admin will set this when approving
      durationMonths: 0,    // admin will set this when approving
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
            <p className="font-medium text-gray-800">Request Submitted</p>
            <p className="text-sm text-gray-500">Your loan request has been submitted. An admin will review it and set the interest rate and duration before approval.</p>
            <button onClick={onClose} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-semibold text-gray-800">Request a Loan</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type</label>
              <div className="space-y-2">
                {(['normal', 'soft', 'investment', 'emergency'] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      loanType === type ? 'border-glg-600 bg-glg-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="loanType"
                      value={type}
                      checked={loanType === type}
                      onChange={() => setLoanType(type)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800 capitalize">{type}</p>
                      <p className="text-xs text-gray-500">{loanDescriptions[type]}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Additional Details (optional)</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={2}
              />
            </div>
            <p className="text-xs text-gray-400">The admin will set the interest rate and repayment duration when reviewing your request.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">Cancel</button>
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
