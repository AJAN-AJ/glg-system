import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import AdminLayout from '../components/AdminLayout'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function AdminProjected() {
  const [year, setYear] = useState(new Date().getFullYear())
  const members = useLiveQuery(() => db.members.where('status').equals('active').toArray(), []) ?? []
  const contributions = useLiveQuery(() => db.shareContributions.where('year').equals(year).toArray(), [year]) ?? []
  const config = useLiveQuery(() => db.groupConfig.get('main'), [])

  const activeMembers = members.filter(m => (m.monthlyShareTarget ?? 0) > 0)

  function actualForMonth(memberId: string, month: number) {
    return contributions.find(c => c.memberId === memberId && c.month === month)?.amount ?? 0
  }

  function projectedAnnual(memberId: string) {
    const m = members.find(mm => mm.id === memberId)
    return (m?.monthlyShareTarget ?? 0) * 12
  }

  function actualAnnual(memberId: string) {
    return contributions.filter(c => c.memberId === memberId).reduce((sum, c) => sum + c.amount, 0)
  }

  const grandProjected = activeMembers.reduce((sum, m) => sum + projectedAnnual(m.id), 0)
  const grandActual = activeMembers.reduce((sum, m) => sum + actualAnnual(m.id), 0)
  const projectedInterest = grandProjected * (config?.loanDefaults?.normal?.interestRate ?? 0.2)

  const monthProjectedTotals = MONTH_NAMES.map((_, idx) => {
    const month = idx + 1
    return activeMembers.reduce((sum, m) => sum + (m.monthlyShareTarget ?? 0), 0)
  })
  const monthActualTotals = MONTH_NAMES.map((_, idx) => {
    const month = idx + 1
    return contributions.filter(c => c.month === month).reduce((sum, c) => sum + c.amount, 0)
  })

  return (
    <AdminLayout title="Projected Shares">
      <div className="flex items-center gap-2 mb-4">
        <label className="text-sm text-gray-600">Year:</label>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm">
          {[year - 1, year, year + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xl font-bold text-glg-700">MK {grandProjected.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Projected Annual Total</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xl font-bold text-glg-700">MK {grandActual.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Actual Collected So Far</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xl font-bold text-gray-400">MK {(grandProjected - grandActual).toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Remaining to Collect</p>
        </div>
        <div className="bg-glg-50 rounded-xl shadow-sm p-4">
          <p className="text-xl font-bold text-glg-700">MK {projectedInterest.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Projected Interest ({((config?.loanDefaults?.normal?.interestRate ?? 0.2) * 100).toFixed(0)}%)</p>
        </div>
      </div>

      {/* Projected vs Actual grid */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="text-xs min-w-full">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">#</th>
              <th className="px-3 py-2 text-left sticky left-0 bg-gray-50">Member</th>
              <th className="px-3 py-2 text-center">Monthly Pledge</th>
              {MONTH_NAMES.map(m => (
                <th key={m} className="px-2 py-2 text-center" colSpan={1}>{m}</th>
              ))}
              <th className="px-3 py-2 text-right">Projected</th>
              <th className="px-3 py-2 text-right">Actual</th>
              <th className="px-3 py-2 text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.map((member, idx) => {
              const pledge = member.monthlyShareTarget ?? 0
              const projected = projectedAnnual(member.id)
              const actual = actualAnnual(member.id)
              const variance = actual - projected
              return (
                <tr key={member.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-400 sticky left-0 bg-white">{idx + 1}</td>
                  <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-white">
                    {member.firstName} {member.surname}
                  </td>
                  <td className="px-3 py-2 text-center text-glg-700 font-medium">{pledge.toLocaleString()}</td>
                  {MONTH_NAMES.map((_, midx) => {
                    const month = midx + 1
                    const paid = actualForMonth(member.id, month)
                    const expected = pledge
                    const diff = paid - expected
                    return (
                      <td key={month} className="px-1 py-1 text-center">
                        <div className={`rounded py-1 px-1 ${paid > 0 ? diff >= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-300'}`}>
                          {paid > 0 ? paid.toLocaleString() : '—'}
                        </div>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right text-gray-600">{projected.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-medium text-glg-700">{actual.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {variance >= 0 ? '+' : ''}{variance.toLocaleString()}
                  </td>
                </tr>
              )
            })}
            {activeMembers.length === 0 && (
              <tr><td colSpan={17} className="px-4 py-6 text-center text-gray-400">No active members with a monthly pledge set.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 font-medium bg-gray-50">
              <td colSpan={3} className="px-3 py-2 text-gray-600">Monthly Totals</td>
              {monthProjectedTotals.map((proj, idx) => {
                const actual = monthActualTotals[idx]
                return (
                  <td key={idx} className="px-1 py-2 text-center text-xs">
                    <div className="text-gray-400">{proj.toLocaleString()}</div>
                    <div className={`font-medium ${actual >= proj ? 'text-green-600' : actual > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                      {actual > 0 ? actual.toLocaleString() : '—'}
                    </div>
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right text-gray-600">{grandProjected.toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-glg-700">{grandActual.toLocaleString()}</td>
              <td className={`px-3 py-2 text-right ${grandActual >= grandProjected ? 'text-green-600' : 'text-red-600'}`}>
                {(grandActual - grandProjected) >= 0 ? '+' : ''}{(grandActual - grandProjected).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-3">Green = paid as expected · Amber = paid less than pledged · Footer shows projected (top) vs actual (bottom) per month.</p>
    </AdminLayout>
  )
}
