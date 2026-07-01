import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import AdminLayout from '../components/AdminLayout'

export default function AdminGroupInterest() {
  const members = useLiveQuery(() => db.members.where('status').equals('active').toArray(), []) ?? []
  const contributions = useLiveQuery(() => db.shareContributions.toArray(), []) ?? []
  const loans = useLiveQuery(() => db.loans.toArray(), []) ?? []
  const repayments = useLiveQuery(() => db.loanRepayments.toArray(), []) ?? []

  // Group interest = sum of all groupInterestShare across all repayments
  const totalGroupInterest = repayments.reduce((sum, r) => sum + r.groupInterestShare, 0)

  // Member interest = sum of memberInterestShare for each member's own loans
  const memberLoanIds = new Map(loans.map((l) => [l.id, l.memberId]))
  const memberInterestMap = new Map<string, number>()
  for (const r of repayments) {
    const mId = memberLoanIds.get(r.loanId)
    if (mId) {
      memberInterestMap.set(mId, (memberInterestMap.get(mId) ?? 0) + r.memberInterestShare)
    }
  }

  // Check if all loans are fully repaid — interest is only distributable when true
  const activeLoans = loans.filter((l) => l.status === 'in_progress' || l.status === 'disbursed' || l.status === 'approved' || l.status === 'requested')
  const allLoansRepaid = activeLoans.length === 0

  // Member share totals
  const memberShareTotals = members.map((m) => {
    const total = contributions
      .filter((c) => c.memberId === m.id)
      .reduce((sum, c) => sum + c.amount, 0)
    return { member: m, total }
  }).filter((x) => x.total > 0)

  const minShare = memberShareTotals.length > 0
    ? Math.min(...memberShareTotals.map((x) => x.total))
    : 1

  const rows = memberShareTotals.map(({ member, total }) => {
    const ratio = minShare > 0 ? total / minShare : 0
    const totalRatios = memberShareTotals.reduce((sum, x) => sum + (x.total / minShare), 0)
    const groupInterestShare = totalRatios > 0
      ? Math.round((ratio / totalRatios) * totalGroupInterest)
      : 0
    const personalInterest = memberInterestMap.get(member.id) ?? 0
    const takeHome = total + groupInterestShare + personalInterest

    return { member, sharesTotal: total, ratio: ratio.toFixed(2), groupInterestShare, personalInterest, takeHome }
  })

  return (
    <AdminLayout title="Group Interest Distribution">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold text-glg-700">MK {totalGroupInterest.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">Total Group Interest Pool</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-2xl font-bold text-glg-700">{activeLoans.length}</p>
          <p className="text-xs text-gray-500 mt-1">Outstanding Loans</p>
        </div>
        <div className={`rounded-xl shadow-sm p-4 col-span-2 sm:col-span-1 ${allLoansRepaid ? 'bg-green-50' : 'bg-amber-50'}`}>
          <p className={`text-sm font-semibold ${allLoansRepaid ? 'text-green-700' : 'text-amber-700'}`}>
            {allLoansRepaid ? '✅ Interest is distributable' : '⏳ Interest locked'}
          </p>
          <p className={`text-xs mt-1 ${allLoansRepaid ? 'text-green-600' : 'text-amber-600'}`}>
            {allLoansRepaid
              ? 'All loans are repaid. Group interest can be distributed.'
              : `${activeLoans.length} loan(s) still outstanding. Interest is only distributable once all loans are fully repaid.`}
          </p>
        </div>
      </div>

      {/* Distribution table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2">Member</th>
                <th className="px-4 py-2 text-right">Total Shares (MK)</th>
                <th className="px-4 py-2 text-right">Ratio</th>
                <th className="px-4 py-2 text-right">Group Interest Share (MK)</th>
                <th className="px-4 py-2 text-right">Personal Interest (MK)</th>
                <th className="px-4 py-2 text-right">Take Home (MK)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ member, sharesTotal, ratio, groupInterestShare, personalInterest, takeHome }) => (
                <tr key={member.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <p className="font-medium">{member.firstName} {member.surname}</p>
                    <p className="text-xs text-gray-400 font-mono">{member.memberId}</p>
                  </td>
                  <td className="px-4 py-2 text-right">{sharesTotal.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{ratio}×</td>
                  <td className={`px-4 py-2 text-right font-medium ${allLoansRepaid ? 'text-green-700' : 'text-gray-400'}`}>
                    {groupInterestShare.toLocaleString()}
                    {!allLoansRepaid && <span className="text-xs ml-1">(locked)</span>}
                  </td>
                  <td className={`px-4 py-2 text-right ${allLoansRepaid ? 'text-blue-700' : 'text-gray-400'}`}>
                    {personalInterest.toLocaleString()}
                    {!allLoansRepaid && <span className="text-xs ml-1">(locked)</span>}
                  </td>
                  <td className={`px-4 py-2 text-right font-bold ${allLoansRepaid ? 'text-glg-700' : 'text-gray-400'}`}>
                    {allLoansRepaid ? takeHome.toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No active members with share contributions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {rows.map(({ member, sharesTotal, ratio, groupInterestShare, personalInterest, takeHome }) => (
            <div key={member.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800">{member.firstName} {member.surname}</p>
                  <p className="text-xs text-gray-400 font-mono">{member.memberId}</p>
                </div>
                <span className="text-xs text-gray-400">{ratio}×</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600">
                <span>Shares: <strong>MK {sharesTotal.toLocaleString()}</strong></span>
                <span className={allLoansRepaid ? 'text-green-700' : 'text-gray-400'}>
                  Group interest: MK {allLoansRepaid ? groupInterestShare.toLocaleString() : '(locked)'}
                </span>
                <span className={allLoansRepaid ? 'text-blue-700' : 'text-gray-400'}>
                  Personal interest: MK {allLoansRepaid ? personalInterest.toLocaleString() : '(locked)'}
                </span>
                <span className={`font-bold ${allLoansRepaid ? 'text-glg-700' : 'text-gray-400'}`}>
                  Take home: {allLoansRepaid ? `MK ${takeHome.toLocaleString()}` : '—'}
                </span>
              </div>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm px-4">No active members with share contributions yet.</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Group interest is distributed proportional to each member's total shares relative to the member with
        the lowest contribution. Personal interest and group interest are only valid and distributable once
        all outstanding loans are fully repaid — per the group's constitution.
      </p>
    </AdminLayout>
  )
}
