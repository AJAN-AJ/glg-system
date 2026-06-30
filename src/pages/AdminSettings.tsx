import { useState } from 'react'
import { db } from '../db/database'
import { hashPassword, verifyPassword } from '../utils/auth'
import { useAuth } from '../context/AuthContext'
import AdminLayout from '../components/AdminLayout'

export default function AdminSettings() {
  const { session, refreshSession } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (session?.type !== 'admin') return null
  const admin = session.account

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const valid = await verifyPassword(currentPassword, admin.passwordHash)
    if (!valid) {
      setError('Current password is incorrect.')
      return
    }
    if (newPassword.length < 6) {
      setError('New password should be at least 6 characters.')
      return
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match.')
      return
    }

    const passwordHash = await hashPassword(newPassword)
    await db.admins.update(admin.id, { passwordHash })
    await refreshSession()
    setCurrentPassword('')
    setNewPassword('')
    setConfirm('')
    setSuccess(true)
  }

  return (
    <AdminLayout title="Settings">
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-md">
        <h3 className="font-medium text-gray-800 mb-1">Change Password</h3>
        <p className="text-sm text-gray-500 mb-4">
          Signed in as <span className="font-medium">{admin.fullName}</span> ({admin.role})
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Current Password" value={currentPassword} onChange={setCurrentPassword} />
          <Field label="New Password" value={newPassword} onChange={setNewPassword} />
          <Field label="Confirm New Password" value={confirm} onChange={setConfirm} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Password updated successfully.</p>}
          <button
            type="submit"
            className="bg-glg-600 hover:bg-glg-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            Update Password
          </button>
        </form>
      </div>
    </AdminLayout>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glg-600"
      />
    </div>
  )
}
