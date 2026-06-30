import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { generateId, generateLoanCode } from '../utils/auth'
import { calculateTotalPayable, daysUntil, splitRepayment, addMonths } from '../utils/loanMath'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'
import type { Loan } from '../types'

export default function AdminLoans() {
  const { session } = useAuth()
  const loans = useLiveQuery(() => db.loans.orderBy('requestedAt').reverse().toArray(), []) ?? []
  const members = useLiveQuery(() => db.members.toArray(), []) ?? []
  const repayments = useLiveQuery(() => db.loanRepayments.toArray(), []) ?? []
  const [selected, setSelected] = useState<Loan | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  function memberName(memberId: string) {
    const m = members.find((mm) => mm.id === memberId)
    return m ? `${m.firstName} ${m.surname}` : 'Unknown'
  }

  function totalRepaid(loanId: string) {
    return repayments.filter((r) => r.loanId === loanId).reduce((sum, r) => sum + r.amount, 0)
  }

  const dueSoon = loans.filter((l) => {
    if (!l.dueDate || (l.status !== 'in_progress' && l.status !== 'disbursed')) return false
    const d = daysUntil(l.dueDate)
    return d <= 7
  })

  return (
    <AdminLayout title="Loans">
      {dueSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
          <p className="font-medium mb-1">Repayment reminders</p>
          {dueSoon.map((l) => {
            const d = daysUntil(l.dueDate!)
            return (
              <p key={l.id}>
                {memberName(l.memberId)} ({l.loanCode}) — {d < 0 ? `${Math.abs(d)} day(s) overdue` : d === 0 ? 'due today' : `due in ${d} day(s)`}
              </p>
            )
          })}
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Record Loan Request
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Loan Code</th>
              <th className="px-4 py-2">Member</th>
              <th className="px-4 py-2">Principal</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Repaid</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono">{l.loanCode}</td>
                <td className="px-4 py-2">{memberName(l.memberId)}</td>
                <td className="px-4 py-2">MK {l.principal.toLocaleString()}</td>
                <td className="px-4 py-2"><LoanStatusBadge status={l.status} /></td>
                <td className="px-4 py-2">MK {totalRepaid(l.id).toLocaleString()} / {calculateTotalPayable(l.principal, l.interestRate).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setSelected(l)} className="text-glg-600 hover:underline text-xs">
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {loans.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No loans recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && session?.type === 'admin' && (
        <CreateLoanModal members={members} onClose={() => setShowCreate(false)} />
      )}
      {selected && session?.type === 'admin' && (
        <LoanDetailModal
          loan={selected}
          memberName={memberName(selected.memberId)}
          repayments={repayments.filter((r) => r.loanId === selected.id)}
          adminId={session.account.id}
          onClose={() => setSelected(null)}
        />
      )}
    </AdminLayout>
  )
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
    requested: 'Requested',
    approved: 'Approved',
    disbursed: 'Disbursed',
    in_progress: 'In Progress',
    completed: 'Completed',
    rejected: 'Rejected'
  }
  return <span className={`text-xs px-2 py-1 rounded-full ${styles[status]}`}>{labels[status]}</span>
}

function CreateLoanModal({ members, onClose }: { members: { id: string; firstName: string; surname: string; status: string }[]; onClose: () => void }) {
  const activeMembers = members.filter((m) => m.status === 'active')
  const [memberId, setMemberId] = useState('')
  const [principal, setPrincipal] = useState('')
  const [interestRate, setInterestRate] = useState('20')
  const [durationMonths, setDurationMonths] = useState('3')
  const [remarks, setRemarks] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const year = new Date().getFullYear()
    const sequence = (await db.loans.count()) + 1
    await db.loans.add({
      id: generateId(),
      loanCode: generateLoanCode(sequence, year),
      memberId,
      principal: Number(principal),
      interestRate: Number(interestRate) / 100,
      durationMonths: Number(durationMonths),
      status: 'requested',
      requestedAt: new Date().toISOString(),
      remarks
    })
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleCreate} className="space-y-4">
        <h3 className="font-semibold text-gray-800">Record Loan Request</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">Select member…</option>
            {activeMembers.map((m) => (
              <option key={m.id} value={m.id}>{m.firstName} {m.surname}</option>
            ))}
          </select>
        </div>
        <NumField label="Principal Amount (MK)" value={principal} onChange={setPrincipal} />
        <NumField label="Interest Rate (%)" value={interestRate} onChange={setInterestRate} />
        <NumField label="Duration (months)" value={durationMonths} onChange={setDurationMonths} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
          <input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">
            Cancel
          </button>
          <button type="submit" className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Save Request
          </button>
        </div>
      </form>
    </Modal>
  )
}

function LoanDetailModal({
  loan,
  memberName,
  repayments,
  adminId,
  onClose
}: {
  loan: Loan
  memberName: string
  repayments: { id: string; amount: number; principalPortion: number; interestPortion: number; memberInterestShare: number; groupInterestShare: number; paidAt: string }[]
  adminId: string
  onClose: () => void
}) {
  const [repayAmount, setRepayAmount] = useState('')
  const totalPayable = calculateTotalPayable(loan.principal, loan.interestRate)
  const totalRepaid = repayments.reduce((sum, r) => sum + r.amount, 0)
  const outstanding = Math.max(0, totalPayable - totalRepaid)

  async function approve() {
    await db.loans.update(loan.id, { status: 'approved', approvedByAdminId: adminId, approvedAt: new Date().toISOString() })
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
      principalPortion: split.principalPortion,
      interestPortion: split.interestPortion,
      memberInterestShare: split.memberInterestShare,
      groupInterestShare: split.groupInterestShare,
      paidAt: new Date().toISOString(),
      recordedByAdminId: adminId
    })
    const newTotalRepaid = totalRepaid + amount
    if (newTotalRepaid >= totalPayable) {
      await db.loans.update(loan.id, { status: 'completed' })
    }
    setRepayAmount('')
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-semibold text-gray-800 mb-1">{loan.loanCode} — {memberName}</h3>
      <div className="text-sm text-gray-600 space-y-1 mb-4">
        <p>Principal: MK {loan.principal.toLocaleString()} · Interest: {(loan.interestRate * 100).toFixed(0)}% · {loan.durationMonths} month(s)</p>
        <p>Total Payable: MK {totalPayable.toLocaleString()}</p>
        <p>Repaid so far: MK {totalRepaid.toLocaleString()} · Outstanding: MK {outstanding.toLocaleString()}</p>
        {loan.dueDate && <p>Due: {new Date(loan.dueDate).toLocaleDateString()}</p>}
        <p>Status: <LoanStatusBadge status={loan.status} /></p>
      </div>

      {loan.status === 'requested' && (
        <div className="flex justify-end gap-2 mb-4">
          <button onClick={reject} className="text-sm px-4 py-2 rounded-lg text-red-600 hover:bg-red-50">Reject</button>
          <button onClick={approve} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Approve
          </button>
        </div>
      )}

      {loan.status === 'approved' && (
        <div className="flex justify-end mb-4">
          <button onClick={disburse} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Mark as Disbursed
          </button>
        </div>
      )}

      {(loan.status === 'in_progress' || loan.status === 'disbursed') && (
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
          <div className="space-y-1 text-xs text-gray-500 max-h-40 overflow-y-auto">
            {repayments.map((r) => (
              <div key={r.id} className="flex justify-between border-b border-gray-100 py-1">
                <span>{new Date(r.paidAt).toLocaleDateString()}</span>
                <span>MK {r.amount.toLocaleString()} (principal {r.principalPortion.toLocaleString()}, interest {r.interestPortion.toLocaleString()})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}

function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-lg px-3 py-2"
      />
    </div>
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
