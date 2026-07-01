import { useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { generateId } from '../utils/auth'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'

export default function AdminPenalties() {
  const { session, canWrite } = useAuth()
  const members = useLiveQuery(() => db.members.where('status').equals('active').toArray(), []) ?? []
  const penalties = useLiveQuery(() => db.penalties.orderBy('flaggedAt').reverse().toArray(), []) ?? []
  const contributions = useLiveQuery(() => db.shareContributions.toArray(), []) ?? []
  const config = useLiveQuery(() => db.groupConfig.get('main'), [])

  useEffect(() => {
    if (!config || members.length === 0) return
    autoFlagLateMembers()
  }, [config?.penaltyDeadlineDay, members.length, contributions.length])

  async function autoFlagLateMembers() {
    if (!config) return
    const now = new Date()
    const currentDay = now.getDate()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()
    if (currentDay <= config.penaltyDeadlineDay) return

    for (const member of members) {
      if (!member.monthlyShareTarget || member.monthlyShareTarget <= 0) continue
      const hasPaid = contributions.some(
        (c) => c.memberId === member.id && c.year === currentYear && c.month === currentMonth
      )
      if (hasPaid) continue
      const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      const alreadyFlagged = penalties.some(
        (p) => p.memberId === member.id && p.monthApplied === monthKey
      )
      if (alreadyFlagged) continue
      await db.penalties.add({
        id: generateId(),
        memberId: member.id,
        description: `Late share payment — ${monthKey}`,
        amount: config.penaltyFlatFee,
        monthApplied: monthKey,
        status: 'flagged',
        flaggedAt: new Date().toISOString()
      })
    }
  }

  async function confirm(penaltyId: string) {
    if (!session || !canWrite) return
    await db.penalties.update(penaltyId, {
      status: 'confirmed',
      confirmedByAdminId: session.account.id,
      confirmedAt: new Date().toISOString()
    })
  }

  async function waive(penaltyId: string) {
    if (!canWrite) return
    await db.penalties.update(penaltyId, { status: 'waived' })
  }

  async function markPaid(penaltyId: string) {
    if (!canWrite) return
    await db.penalties.update(penaltyId, { status: 'paid' })
  }

  function memberName(memberId: string) {
    const m = members.find((mm) => mm.id === memberId)
    return m ? `${m.firstName} ${m.surname} (${m.memberId})` : 'Unknown'
  }

  const flagged = penalties.filter((p) => p.status === 'flagged')
  const confirmed = penalties.filter((p) => p.status === 'confirmed')
  const paid = penalties.filter((p) => p.status === 'paid')
  const waived = penalties.filter((p) => p.status === 'waived')
  const totalOutstanding = confirmed.reduce((sum, p) => sum + p.amount, 0)

  return (
    <AdminLayout title="Penalties">
      {config && (
        <div className="bg-glg-50 border border-glg-100 rounded-xl px-4 py-3 text-sm text-glg-700 mb-4 flex flex-wrap gap-x-4 gap-y-1">
          <span>Deadline: day <strong>{config.penaltyDeadlineDay}</strong> of each month</span>
          <span>·</span>
          <span>Penalty: <strong>MK {config.penaltyFlatFee.toLocaleString()}</strong></span>
          <span>·</span>
          <span className="text-gray-500">Auto-checks for late payments when this page opens</span>
        </div>
      )}

      {flagged.length > 0 && (
        <PenaltySection title={`Flagged — Awaiting Confirmation (${flagged.length})`} accent="amber">
          {flagged.map((p) => (
            <PenaltyRow key={p.id} penalty={p} memberName={memberName(p.memberId)}>
              {canWrite && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => waive(p.id)} className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 border border-gray-200">Waive</button>
                  <button onClick={() => confirm(p.id)} className="text-xs px-3 py-1.5 rounded-lg bg-glg-600 hover:bg-glg-700 text-white font-medium">Confirm</button>
                </div>
              )}
            </PenaltyRow>
          ))}
        </PenaltySection>
      )}

      {confirmed.length > 0 && (
        <PenaltySection title={`Confirmed — Outstanding (${confirmed.length}) · MK ${totalOutstanding.toLocaleString()}`} accent="red">
          {confirmed.map((p) => (
            <PenaltyRow key={p.id} penalty={p} memberName={memberName(p.memberId)}>
              {canWrite && (
                <button onClick={() => markPaid(p.id)} className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium shrink-0">Mark Paid</button>
              )}
            </PenaltyRow>
          ))}
        </PenaltySection>
      )}

      {paid.length > 0 && (
        <PenaltySection title={`Paid (${paid.length})`} accent="green">
          {paid.map((p) => (
            <PenaltyRow key={p.id} penalty={p} memberName={memberName(p.memberId)} />
          ))}
        </PenaltySection>
      )}

      {waived.length > 0 && (
        <PenaltySection title={`Waived (${waived.length})`} accent="gray">
          {waived.map((p) => (
            <PenaltyRow key={p.id} penalty={p} memberName={memberName(p.memberId)} />
          ))}
        </PenaltySection>
      )}

      {penalties.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400 text-sm">
          No penalties recorded yet. Come back after the deadline day passes — the system will automatically flag any members who have not paid their monthly share.
        </div>
      )}
    </AdminLayout>
  )
}

function PenaltySection({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-700 border-amber-200',
    red: 'text-red-700 border-red-200',
    green: 'text-green-700 border-green-200',
    gray: 'text-gray-500 border-gray-200'
  }
  return (
    <div className={`mb-5 border ${colors[accent].split(' ')[1]} rounded-xl overflow-hidden`}>
      <p className={`px-4 py-2 bg-white border-b ${colors[accent].split(' ')[1]} text-sm font-medium ${colors[accent].split(' ')[0]}`}>
        {title}
      </p>
      <div className="divide-y divide-gray-100 bg-white">{children}</div>
    </div>
  )
}

function PenaltyRow({ penalty, memberName, children }: {
  penalty: { amount: number; description: string; flaggedAt: string }
  memberName: string
  children?: React.ReactNode
}) {
  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{memberName}</p>
        <p className="text-xs text-gray-500">{penalty.description} · MK {penalty.amount.toLocaleString()}</p>
        <p className="text-xs text-gray-400">{new Date(penalty.flaggedAt).toLocaleDateString()}</p>
      </div>
      {children}
    </div>
  )
}
