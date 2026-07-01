import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { generateId, generateMemberId, generateTempPassword, hashPassword } from '../utils/auth'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'
import type { Member } from '../types'

export default function AdminMembers() {
  const { session, canWrite } = useAuth()
  const allMembers = useLiveQuery(() => db.members.orderBy('dateJoined').reverse().toArray(), []) ?? []
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<Member | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Member['status']>('all')

  const members = allMembers.filter((m) => {
    if (m.isAdmin && m.status === 'active' && !m.memberId) return false // skip pure admin seed
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter
    const term = search.trim().toLowerCase()
    const matchesSearch = !term ||
      m.firstName.toLowerCase().includes(term) ||
      m.surname.toLowerCase().includes(term) ||
      m.memberId.toLowerCase().includes(term) ||
      m.username.toLowerCase().includes(term)
    return matchesStatus && matchesSearch
  })

  return (
    <AdminLayout title="Members">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Search name, Member ID, username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px] focus:outline-none focus:ring-2 focus:ring-glg-600"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="invited">Invited</option>
          <option value="pending_setup">Setting Up</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg whitespace-nowrap"
          >
            + Create Member
          </button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-4 py-2">Member ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-mono">{m.memberId}</td>
                <td className="px-4 py-2">{m.firstName} {m.surname}</td>
                <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-2 text-xs text-gray-500">{m.isAdmin ? `${m.adminRole}` : 'Member'}</td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => setSelected(m)} className="text-glg-600 hover:underline text-xs font-medium">
                    View
                  </button>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — no horizontal scrolling, no hidden buttons */}
      <div className="sm:hidden space-y-2">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between">
            <div>
              <p className="font-medium text-gray-800">{m.firstName} {m.surname}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{m.memberId}</p>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={m.status} />
                {m.isAdmin && <span className="text-xs text-glg-700 bg-glg-50 px-2 py-0.5 rounded-full">{m.adminRole}</span>}
              </div>
            </div>
            <button
              onClick={() => setSelected(m)}
              className="text-sm text-glg-600 hover:text-glg-700 font-medium ml-3 shrink-0"
            >
              View
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-center text-gray-400 py-6 text-sm">No members found.</p>
        )}
      </div>

      {showCreate && session && canWrite && (
        <CreateMemberModal adminId={session.account.id} onClose={() => setShowCreate(false)} />
      )}
      {selected && session && (
        <MemberDetailModal
          member={selected}
          adminId={session.account.id}
          canWrite={canWrite}
          onClose={() => setSelected(null)}
        />
      )}
    </AdminLayout>
  )
}

function StatusBadge({ status }: { status: Member['status'] }) {
  const styles: Record<Member['status'], string> = {
    invited: 'bg-gray-100 text-gray-600',
    pending_setup: 'bg-blue-100 text-blue-700',
    pending_approval: 'bg-amber-100 text-amber-700',
    active: 'bg-green-100 text-green-700',
    suspended: 'bg-red-100 text-red-700'
  }
  const labels: Record<Member['status'], string> = {
    invited: 'Invited',
    pending_setup: 'Setting Up',
    pending_approval: 'Pending Approval',
    active: 'Active',
    suspended: 'Suspended'
  }
  return <span className={`text-xs px-2 py-1 rounded-full ${styles[status]}`}>{labels[status]}</span>
}

function CreateMemberModal({ adminId, onClose }: { adminId: string; onClose: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [surname, setSurname] = useState('')
  const [username, setUsername] = useState('')
  const [created, setCreated] = useState<{ memberId: string; tempPassword: string } | null>(null)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const existing = await db.members.where('username').equals(username.trim()).first()
    if (existing) {
      setError('That username/phone number is already registered.')
      return
    }
    const year = new Date().getFullYear()
    const sequence = (await db.members.count()) + 1
    const memberId = generateMemberId(sequence, year)
    const tempPassword = generateTempPassword()
    const passwordHash = await hashPassword(tempPassword)

    await db.members.add({
      id: generateId(),
      memberId,
      firstName: firstName.trim(),
      surname: surname.trim(),
      username: username.trim(),
      passwordHash,
      mustChangePassword: true,
      status: 'invited',
      registrationFeeStatus: 'unpaid',
      dateJoined: new Date().toISOString(),
      createdByAdminId: adminId
    })

    setCreated({ memberId, tempPassword })
  }

  return (
    <Modal onClose={onClose}>
      {!created ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <h3 className="font-semibold text-gray-800">Create Member Account</h3>
          <Field label="First Name" value={firstName} onChange={setFirstName} />
          <Field label="Surname" value={surname} onChange={setSurname} />
          <Field
            label="Username / Phone Number (used to log in)"
            value={username}
            onChange={setUsername}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg text-gray-500">
              Cancel
            </button>
            <button type="submit" className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Create Account
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-800">Account Created ✅</h3>
          <p className="text-sm text-gray-600">
            Share these credentials with the member. They'll be asked to set their own password and complete their
            profile on first login, then wait for admin approval.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="text-gray-500">Member ID:</span> <span className="font-mono">{created.memberId}</span></p>
            <p><span className="text-gray-500">Username:</span> <span className="font-mono">{username}</span></p>
            <p><span className="text-gray-500">Temporary Password:</span> <span className="font-mono">{created.tempPassword}</span></p>
          </div>
          <div className="flex justify-end">
            <button onClick={onClose} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function MemberDetailModal({ member, adminId, canWrite, onClose }: { member: Member; adminId: string; canWrite: boolean; onClose: () => void }) {
  const [editing, setEditing] = useState(false)
  const [firstName, setFirstName] = useState(member.firstName)
  const [surname, setSurname] = useState(member.surname)
  const [phoneNumber, setPhoneNumber] = useState(member.phoneNumber ?? '')
  const [email, setEmail] = useState(member.email ?? '')
  const [monthlyShareTarget, setMonthlyShareTarget] = useState(member.monthlyShareTarget?.toString() ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function approve() {
    await db.members.update(member.id, {
      status: 'active',
      approvedByAdminId: adminId,
      dateApproved: new Date().toISOString()
    })
    onClose()
  }

  async function suspend() {
    await db.members.update(member.id, { status: 'suspended' })
    onClose()
  }

  async function reactivate() {
    await db.members.update(member.id, { status: 'active' })
    onClose()
  }

  async function saveEdits() {
    await db.members.update(member.id, {
      firstName: firstName.trim(),
      surname: surname.trim(),
      phoneNumber,
      email,
      monthlyShareTarget: Number(monthlyShareTarget) || 0
    })
    setEditing(false)
    onClose()
  }

  async function deleteMember() {
    await db.shareContributions.where('memberId').equals(member.id).delete()
    await db.members.delete(member.id)
    onClose()
  }

  if (editing) {
    return (
      <Modal onClose={onClose}>
        <h3 className="font-semibold text-gray-800 mb-3">Edit Member</h3>
        <div className="space-y-3">
          <Field label="First Name" value={firstName} onChange={setFirstName} />
          <Field label="Surname" value={surname} onChange={setSurname} />
          <Field label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} />
          <Field label="Email" value={email} onChange={setEmail} />
          <Field label="Monthly Share Pledge (MK)" value={monthlyShareTarget} onChange={setMonthlyShareTarget} />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => setEditing(false)} className="text-sm px-4 py-2 rounded-lg text-gray-500">
            Cancel
          </button>
          <button onClick={saveEdits} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            Save Changes
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="font-semibold text-gray-800 mb-3">{member.firstName} {member.surname}</h3>
      <div className="text-sm space-y-1 text-gray-600 mb-4">
        <p>Member ID: <span className="font-mono">{member.memberId}</span></p>
        <p>Username: <span className="font-mono">{member.username}</span></p>
        <p>Status: <StatusBadge status={member.status} /></p>
        {member.phoneNumber && <p>Phone: {member.phoneNumber}</p>}
        {member.email && <p>Email: {member.email}</p>}
        {member.monthlyShareTarget !== undefined && <p>Monthly Share Pledge: MK {member.monthlyShareTarget.toLocaleString()}</p>}
        {member.nextOfKinName && <p>Next of Kin: {member.nextOfKinName} ({member.nextOfKinPhone})</p>}
        <p>Registration Fee: {member.registrationFeeStatus}</p>
        {member.agreedToConstitution && <p>Constitution Agreement: ✅ Agreed{member.signature ? ` — Signed: ${member.signature}` : ''}</p>}
      </div>

      {!confirmDelete ? (
        <div className="flex justify-end gap-2 flex-wrap">
          {canWrite && <button onClick={() => setConfirmDelete(true)} className="text-sm px-4 py-2 rounded-lg text-red-600 hover:bg-red-50">Delete</button>}
          {canWrite && <button onClick={() => setEditing(true)} className="text-sm px-4 py-2 rounded-lg text-glg-600 hover:bg-glg-50">Edit</button>}
          {canWrite && member.status === 'suspended' && (
            <button onClick={reactivate} className="text-sm px-4 py-2 rounded-lg text-green-700 hover:bg-green-50">Reactivate</button>
          )}
          {canWrite && member.status !== 'suspended' && member.status !== 'pending_approval' && (
            <button onClick={suspend} className="text-sm px-4 py-2 rounded-lg text-amber-700 hover:bg-amber-50">Suspend</button>
          )}
          {canWrite && member.status === 'pending_approval' && (
            <button onClick={approve} className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Approve & Activate
            </button>
          )}
          {!canWrite && <p className="text-xs text-gray-400 italic">Read-only access — contact the Chair to make changes.</p>}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700 mb-3">
            Delete {member.firstName} {member.surname} permanently, including their share contribution history? This
            cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(false)} className="text-sm px-4 py-2 rounded-lg text-gray-500">
              Cancel
            </button>
            <button onClick={deleteMember} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Yes, Delete
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glg-600"
      />
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
