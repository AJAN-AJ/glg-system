import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { hashPassword, verifyPassword } from '../utils/auth'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'
import type { Member, AdminRole, AdminPermission } from '../types'

export default function AdminSettings() {
  const { session, isChair } = useAuth()
  if (!session) return null

  return (
    <AdminLayout title="Settings">
      <div className="space-y-6 max-w-xl">
        <ChangePasswordSection member={session.account} />
        {isChair && <AdminManagementSection currentAdminId={session.account.id} />}
        <RegistrationFundSection />
      </div>
    </AdminLayout>
  )
}

// ── Change Password ────────────────────────────────────────────────────────────
function ChangePasswordSection({ member }: { member: Member }) {
  const { changePassword } = useAuth()
  const [current, setCurrent] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(false)
    const valid = await verifyPassword(current, member.passwordHash)
    if (!valid) { setError('Current password is incorrect.'); return }
    if (newPw.length < 6) { setError('New password must be at least 6 characters.'); return }
    if (newPw !== confirm) { setError('Passwords do not match.'); return }
    await changePassword(newPw)
    setCurrent(''); setNewPw(''); setConfirm('')
    setSuccess(true)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Change Password</h3>
      <p className="text-sm text-gray-500 mb-4">
        Signed in as <strong>{member.firstName} {member.surname}</strong> ({member.adminRole})
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <PwField label="Current Password" value={current} onChange={setCurrent} />
        <PwField label="New Password" value={newPw} onChange={setNewPw} />
        <PwField label="Confirm New Password" value={confirm} onChange={setConfirm} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Password updated successfully.</p>}
        <button type="submit" className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          Update Password
        </button>
      </form>
    </div>
  )
}

function PwField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} required
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glg-600" />
    </div>
  )
}

// ── Admin Management (Chair only) ─────────────────────────────────────────────
function AdminManagementSection({ currentAdminId }: { currentAdminId: string }) {
  const admins = useLiveQuery(() => db.members.where('isAdmin').equals(1).toArray(), []) ?? []
  const activeMembers = useLiveQuery(() =>
    db.members.where('status').equals('active').toArray(), []
  ) ?? []
  const [showPromote, setShowPromote] = useState(false)

  const nonAdminMembers = activeMembers.filter((m) => !m.isAdmin)

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-800">Admin Accounts</h3>
          <p className="text-xs text-gray-500">Only the Chair can manage admin roles and permissions.</p>
        </div>
        <button
          onClick={() => setShowPromote(true)}
          className="bg-glg-600 hover:bg-glg-700 text-white text-xs font-medium px-3 py-2 rounded-lg"
        >
          + Add Admin
        </button>
      </div>

      <div className="space-y-2">
        {admins.map((admin) => (
          <div key={admin.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-800">{admin.firstName} {admin.surname}</p>
              <p className="text-xs text-gray-500">{admin.adminRole} · {admin.adminPermission === 'read_write' ? 'Read & Write' : 'Read Only'}</p>
            </div>
            <div className="flex items-center gap-2">
              {admin.id !== currentAdminId && (
                <>
                  <select
                    value={admin.adminPermission}
                    onChange={async (e) => {
                      await db.members.update(admin.id, { adminPermission: e.target.value as AdminPermission })
                    }}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    <option value="read_write">Read & Write</option>
                    <option value="read">Read Only</option>
                  </select>
                  <button
                    onClick={async () => {
                      if (!confirm(`Remove admin rights from ${admin.firstName}?`)) return
                      await db.members.update(admin.id, { isAdmin: false, adminRole: undefined, adminPermission: undefined })
                    }}
                    className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
                  >
                    Revoke
                  </button>
                </>
              )}
              {admin.id === currentAdminId && (
                <span className="text-xs text-gray-400 italic">You</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showPromote && (
        <PromoteModal
          members={nonAdminMembers}
          onClose={() => setShowPromote(false)}
        />
      )}
    </div>
  )
}

function PromoteModal({ members, onClose }: { members: Member[]; onClose: () => void }) {
  const [memberId, setMemberId] = useState('')
  const [role, setRole] = useState<AdminRole>('secretary')
  const [permission, setPermission] = useState<AdminPermission>('read_write')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await db.members.update(memberId, {
      isAdmin: true,
      adminRole: role,
      adminPermission: permission
    })
    setDone(true)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        {done ? (
          <div className="text-center space-y-3">
            <p className="text-2xl">✅</p>
            <p className="text-sm text-gray-600">Admin rights granted. They will see the admin dashboard on their next login.</p>
            <button onClick={onClose} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-semibold text-gray-800">Add Admin</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member</label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="">Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.firstName} {m.surname} ({m.memberId})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as AdminRole)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="secretary">Secretary</option>
                <option value="treasurer">Treasurer</option>
                <option value="chair">Chair</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Permission</label>
              <select value={permission} onChange={(e) => setPermission(e.target.value as AdminPermission)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2">
                <option value="read_write">Read & Write (full access)</option>
                <option value="read">Read Only (can view, cannot change)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">Cancel</button>
              <button type="submit" className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                Grant Admin Rights
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Registration Fee Fund ─────────────────────────────────────────────────────
function RegistrationFundSection() {
  const { session, canWrite } = useAuth()
  const fees = useLiveQuery(() => db.registrationFees.toArray(), []) ?? []
  const members = useLiveQuery(() => db.members.toArray(), []) ?? []

  const total = fees.reduce((sum, f) => sum + f.amount, 0)
  const paidIds = new Set(fees.map((f) => f.memberId))
  const unpaidMembers = members.filter((m) => m.status === 'active' && !paidIds.has(m.id))

  async function markPaid(member: Member) {
    if (!session || !canWrite) return
    const { generateId } = await import('../utils/auth')
    await db.registrationFees.add({
      id: generateId(),
      memberId: member.id,
      amount: 3000,
      paidAt: new Date().toISOString(),
      recordedByAdminId: session.account.id
    })
    await db.members.update(member.id, { registrationFeeStatus: 'paid' })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-800 mb-1">Registration Fee Fund</h3>
      <p className="text-xs text-gray-500 mb-3">MK 3,000 per member — kept separate from Shares & Loans.</p>
      <p className="text-2xl font-bold text-glg-700 mb-4">MK {total.toLocaleString()}</p>

      {unpaidMembers.length > 0 && canWrite && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Unpaid Members</p>
          <div className="space-y-1">
            {unpaidMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm border border-gray-100 rounded-lg px-3 py-2">
                <span>{m.firstName} {m.surname} <span className="text-gray-400 text-xs">({m.memberId})</span></span>
                <button
                  onClick={() => markPaid(m)}
                  className="text-xs bg-glg-600 hover:bg-glg-700 text-white px-3 py-1 rounded-md"
                >
                  Mark Paid
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {unpaidMembers.length === 0 && (
        <p className="text-sm text-green-600">All active members have paid their registration fee ✅</p>
      )}
    </div>
  )
}
