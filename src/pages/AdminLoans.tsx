import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { generateId, generateLoanCode } from '../utils/auth'
import { calculateTotalPayable, daysUntil, splitRepayment, addMonths } from '../utils/loanMath'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'
import type { Loan, LoanType } from '../types'

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  normal: 'Normal',
  soft: 'Soft',
  investment: 'Investment',
  emergency: 'Emergency'
}

export default function AdminLoans() {
  const { session, canWrite } = useAuth()
  const loans = useLiveQuery(() => db.loans.orderBy('requestedAt').reverse().toArray(), []) ?? []
  const members = useLiveQuery(() => db.members.toArray(), []) ?? []
  const repayments = useLiveQuery(() => db.loanRepayments.toArray(), []) ?? []
  const [selected, setSelected] = useState<Loan | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | LoanType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | Loan['status']>('all')

  function memberName(memberId: string) {
    const m = members.find((mm) => mm.id === memberId)
    return m ? `${m.firstName} ${m.surname}` : 'Unknown'
  }

  function totalRepaid(loanId: string) {
    return repayments.filter((r) => r.loanId === loanId).reduce((sum, r) => sum + r.amount, 0)
  }

  const dueSoon = loans.filter((l) => {
    if (!l.dueDate || (l.status !== 'in_progress' && l.status !== 'disbursed')) return false
    return daysUntil(l.dueDate) <= 7
  })

  const filtered = loans.filter((l) => {
    if (typeFilter !== 'all' && l.loanType !== typeFilter) return false
    if (statusFilter !== 'all' && l.status !== statusFilter) return false
    return true
  })

  return (
    <AdminLayout title="Loans">
      {dueSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
          <p className="font-medium mb-1">⚠️ Repayment Reminders</p>
          {dueSoon.map((l) => {
            const d = daysUntil(l.dueDate!)
            return (
              <p key={l.id}>
                {memberName(l.memberId)} · {l.loanCode} ({LOAN_TYPE_LABELS[l.loanType]}) —{' '}
                {d < 0 ? `${Math.abs(d)} day(s) overdue` : d === 0 ? 'due today' : `due in ${d} day(s)`}
              </p>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
        >
          <option value="all">All types</option>
          <option value="normal">Normal</option>
          <option value="soft">Soft</option>
          <option value="investment">Investment</option>
          <option value="emergency">Emergency</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="requested">Requested</option>
          <option value="approved">Approved</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Member</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Principal</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono text-xs">{l.loanCode}</td>
                <td className="px-4 py-2">{memberName(l.memberId)}</td>
                <td className="px-4 py-2"><LoanTypeBadge type={l.loanType} /></td>
                <td className="px-4 py-2">MK {l.principal.toLocaleString()}</td>
                <td className="px-4 py-2"><LoanStatusBadge status={l.status} /></td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setSelected(l)} className="text-glg-600 hover:underline text-xs font-medium">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No loan requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map((l) => {
          const repaid = totalRepaid(l.id)
          const totalPayable = calculateTotalPayable(l.principal, l.interestRate)
          return (
            <div key={l.id} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-gray-400">{l.loanCode}</span>
                    <LoanTypeBadge type={l.loanType} />
                    <LoanStatusBadge status={l.status} />
                  </div>
                  <p className="font-medium text-gray-800 mt-1">{memberName(l.memberId)}</p>
                  <p className="text-sm text-gray-500">MK {l.principal.toLocaleString()}</p>
                  {(l.status === 'in_progress' || l.status === 'disbursed') && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Repaid MK {repaid.toLocaleString()} / MK {totalPayable.toLocaleString()}
                    </p>
                  )}
                  {l.dueDate && (l.status === 'in_progress' || l.status === 'disbursed') && (
                    <p className="text-xs text-amber-600 mt-0.5">Due: {new Date(l.dueDate).toLocaleDateString()}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelected(l)}
                  className="ml-3 shrink-0 text-sm font-medium text-glg-600 hover:text-glg-700"
                >
                  Manage
                </button>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">No loan requests yet.</p>
        )}
      </div>

      {selected && session && (
        <LoanDetailModal
          loan={selected}
          memberName={memberName(selected.memberId)}
          repayments={repayments.filter((r) => r.loanId === selected.id)}
          adminId={session.account.id}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
        />
      )}
    </AdminLayout>
  )
}

function LoanTypeBadge({ type }: { type: LoanType }) {
  const styles: Record<LoanType, string> = {
    normal: 'bg-blue-50 text-blue-700',
    soft: 'bg-purple-50 text-purple-700',
    investment: 'bg-green-50 text-green-700',
    emergency: 'bg-red-50 text-red-700'
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[type]}`}>{LOAN_TYPE_LABELS[type]}</span>
}

function LoanStatusBadge({ status }: { status: Loan['status'] }) {
  const styles: Record<Loan['status'], string> = {
    requested: 'bg-gray-100 text-gray-600',
    approved: 'bg-blue-100 text-blue-700',
    disbursed: 'bg-indigo-100 text-indigo-700',
    in_progress: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  }
  const labels: Record<Loan['status'], string> = {
    requested: 'Requested', approved: 'Approved', disbursed: 'Disbursed',
    in_progress: 'In Progress', completed: 'Completed', rejected: 'Rejected'
  }
  return <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status]}`}>{labels[status]}</span>
}

// Admin sets interest + duration only when approving — not the member
function LoanDetailModal({
  loan, memberName, repayments, adminId, canWrite, onClose
}: {
  loan: Loan
  memberName: string
  repayments: { id: string; amount: number; principalPortion: number; interestPortion: number; memberInterestShare: number; groupInterestShare: number; paidAt: string }[]
  adminId: string
  canWrite: boolean
  onClose: () => void
}) {
  const [repayAmount, setRepayAmount] = useState('')
  // Admin sets these when approving
  const [interestRate, setInterestRate] = useState('20')
  const [durationMonths, setDurationMonths] = useState('3')

  const totalPayable = calculateTotalPayable(loan.principal, loan.interestRate)
  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0)
  const outstanding = Math.max(0, totalPayable - totalRepaid)

  async function approve() {
    const rate = Number(interestRate) / 100
    const duration = Number(durationMonths)
    await db.loans.update(loan.id, {
      status: 'approved',
      interestRate: rate,
      durationMonths: duration,
      approvedByAdminId: adminId,
      approvedAt: new Date().toISOString()
    })
    onClose()
  }

  async function reject() {
    await db.loans.update(loan.id, { status: 'rejected' })
    onClose()
  }

  async function disburse() {
    const now = new Date()
    const due = addMonths(now, loan.durationMonths)
    await db.loans.update(loan.id, {
      status: 'in_progress',
      disbursementDate: now.toISOString(),
      dueDate: due.toISOString()
    })
    onClose()
  }

  async function recordRepayment(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(repayAmount)
    if (!amount || amount <= 0) return
    const split = splitRepayment(amount, loan.principal, totalPayable)
    await db.loanRepayments.add({
      id: generateId(),
      loanId: loan.id,
      amount,
      ...split,
      paidAt: new Date().toISOString(),
      recordedByAdminId: adminId
    })
    if (totalRepaid + amount >= totalPayable) {
      await db.loans.update(loan.id, { status: 'completed' })
    }
    setRepayAmount('')
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <h3 className="font-semibold text-gray-800">{loan.loanCode}</h3>
        <LoanTypeBadge type={loan.loanType} />
        <LoanStatusBadge status={loan.status} />
      </div>
      <p className="text-sm text-gray-600 mb-1">{memberName}</p>
      <div className="text-sm text-gray-600 space-y-0.5 mb-4">
        <p>Requested Amount: <strong>MK {loan.principal.toLocaleString()}</strong></p>
        {loan.status !== 'requested' && (
          <>
            <p>Interest Rate: {(loan.interestRate * 100).toFixed(0)}% · Duration: {loan.durationMonths} month(s)</p>
            <p>Total Payable: MK {totalPayable.toLocaleString()}</p>
            <p>Repaid: MK {totalRepaid.toLocaleString()} · Outstanding: MK {outstanding.toLocaleString()}</p>
          </>
        )}
        {loan.dueDate && <p>Due: {new Date(loan.dueDate).toLocaleDateString()}</p>}
        {loan.remarks && <p className="text-gray-400 italic">"{loan.remarks}"</p>}
      </div>

      {/* Approve — admin sets interest + duration here */}
      {loan.status === 'requested' && canWrite && (
        <div className="bg-glg-50 border border-glg-100 rounded-lg p-3 mb-4 space-y-3">
          <p className="text-sm font-medium text-glg-700">Set Loan Terms</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (months)</label>
              <input
                type="number"
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={reject} className="text-sm px-4 py-2 rounded-lg text-red-600 hover:bg-red-50">Reject</button>
            <button onClick={approve} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Approve with These Terms
            </button>
          </div>
        </div>
      )}

      {loan.status === 'approved' && canWrite && (
        <div className="flex justify-end mb-4">
          <button onClick={disburse} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Mark as Disbursed
          </button>
        </div>
      )}

      {(loan.status === 'in_progress' || loan.status === 'disbursed') && canWrite && (
        <form onSubmit={recordRepayment} className="bg-gray-50 rounded-lg p-3 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Record Repayment (MK)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            />
            <button type="submit" className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Record
            </button>
          </div>
        </form>
      )}

      {repayments.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Repayment History</p>
          <div className="space-y-1 text-xs text-gray-500 max-h-36 overflow-y-auto">
            {repayments.map((r) => (
              <div key={r.id} className="flex justify-between border-b border-gray-100 py-1">
                <span>{new Date(r.paidAt).toLocaleDateString()}</span>
                <span>MK {r.amount.toLocaleString()} · principal {r.principalPortion.toLocaleString()} · interest {r.interestPortion.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!canWrite && (
        <p className="text-xs text-gray-400 italic mt-2">Read-only access — contact the Chair to take action.</p>
      )}
    </Modal>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md my-8">
        {children}
      </div>
    </div>
  )
}
