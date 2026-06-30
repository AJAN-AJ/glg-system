import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { generateId } from '../utils/auth'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminShares() {
  const { session } = useAuth()
  const [year, setYear] = useState(new Date().getFullYear())
  const members = useLiveQuery(
    () => db.members.where('status').equals('active').toArray(),
    []
  ) ?? []
  const contributions = useLiveQuery(
    () => db.shareContributions.where('year').equals(year).toArray(),
    [year]
  ) ?? []
  const [editing, setEditing] = useState<{ memberId: string; month: number } | null>(null)
  const [amountInput, setAmountInput] = useState('')

  function findContribution(memberId: string, month: number) {
    return contributions.find((c) => c.memberId === memberId && c.month === month)
  }

  function openEditor(memberId: string, month: number) {
    const existing = findContribution(memberId, month)
    setAmountInput(existing ? existing.amount.toString() : '')
    setEditing({ memberId, month })
  }

  async function saveAmount() {
    if (!editing || session?.type !== 'admin') return
    const amount = Number(amountInput) || 0
    const existing = findContribution(editing.memberId, editing.month)
    if (existing) {
      await db.shareContributions.update(existing.id, { amount, recordedAt: new Date().toISOString() })
    } else if (amount > 0) {
      await db.shareContributions.add({
        id: generateId(),
        memberId: editing.memberId,
        year,
        month: editing.month,
        amount,
        recordedByAdminId: session.account.id,
        recordedAt: new Date().toISOString()
      })
    }
    setEditing(null)
  }

  const monthTotals = MONTH_NAMES.map((_, idx) => {
    const month = idx + 1
    return contributions.filter((c) => c.month === month).reduce((sum, c) => sum + c.amount, 0)
  })
  const grandTotal = monthTotals.reduce((sum, v) => sum + v, 0)

  return (
    <AdminLayout title="Share Contributions">
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-600">Year:</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
        >
          {[year - 1, year, year + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <p className="text-xs text-gray-400 ml-auto">Click a cell to record/update a member's share for that month.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="text-sm min-w-full">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">Member</th>
              {MONTH_NAMES.map((m) => <th key={m} className="px-2 py-2 text-center">{m}</th>)}
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const memberContribs = contributions.filter((c) => c.memberId === member.id)
              const total = memberContribs.reduce((sum, c) => sum + c.amount, 0)
              return (
                <tr key={member.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white">
                    {member.firstName} {member.surname}
                  </td>
                  {MONTH_NAMES.map((_, idx) => {
                    const month = idx + 1
                    const record = findContribution(member.id, month)
                    return (
                      <td key={month} className="px-1 py-1 text-center">
                        <button
                          onClick={() => openEditor(member.id, month)}
                          className={`w-16 py-1 rounded text-xs ${
                            record ? 'bg-glg-50 text-glg-700' : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                          }`}
                        >
                          {record ? record.amount.toLocaleString() : '—'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-medium text-glg-700">MK {total.toLocaleString()}</td>
                </tr>
              )
            })}
            {members.length === 0 && (
              <tr><td colSpan={14} className="px-4 py-6 text-center text-gray-400">No active members yet.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-medium">
              <td className="px-3 py-2 sticky left-0 bg-white">Monthly Total</td>
              {monthTotals.map((t, idx) => (
                <td key={idx} className="px-2 py-2 text-center text-xs text-gray-600">{t.toLocaleString()}</td>
              ))}
              <td className="px-3 py-2 text-right text-glg-700">MK {grandTotal.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-800 mb-1">
              Record Share — {MONTH_NAMES[editing.month - 1]} {year}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {members.find((m) => m.id === editing.memberId)?.firstName}{' '}
              {members.find((m) => m.id === editing.memberId)?.surname}
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (MK)</label>
            <input
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-glg-600"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="text-sm px-4 py-2 rounded-lg text-gray-500">
                Cancel
              </button>
              <button onClick={saveAmount} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
