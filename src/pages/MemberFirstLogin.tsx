import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../db/database'

export default function MemberFirstLogin() {
  const { session, changeMemberPassword, refreshSession } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'password' | 'profile'>(
    session?.type === 'member' && !session.account.mustChangePassword ? 'profile' : 'password'
  )

  if (session?.type !== 'member') return null

  return (
    <div className="min-h-screen bg-glg-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6">
        {step === 'password' ? (
          <PasswordStep
            onDone={async (newPassword) => {
              await changeMemberPassword(newPassword)
              setStep('profile')
            }}
          />
        ) : (
          <ProfileStep
            memberId={session.account.id}
            onDone={async () => {
              await db.members.update(session.account.id, { status: 'pending_approval' })
              await refreshSession()
              navigate('/member/pending')
            }}
          />
        )}
      </div>
    </div>
  )
}

function PasswordStep({ onDone }: { onDone: (newPassword: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password should be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    await onDone(password)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">Welcome to Golden Ladder Group</h2>
        <p className="text-sm text-gray-500 mt-1">
          This is your first time logging in. Please set your own password before continuing.
        </p>
      </div>
      <Field label="New Password" type="password" value={password} onChange={setPassword} />
      <Field label="Confirm New Password" type="password" value={confirm} onChange={setConfirm} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-glg-600 hover:bg-glg-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg"
      >
        Set Password & Continue
      </button>
    </form>
  )
}

function ProfileStep({ memberId, onDone }: { memberId: string; onDone: () => Promise<void> }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [nextOfKinName, setNextOfKinName] = useState('')
  const [nextOfKinPhone, setNextOfKinPhone] = useState('')
  const [monthlyShareTarget, setMonthlyShareTarget] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await db.members.update(memberId, {
      phoneNumber,
      email,
      nextOfKinName,
      nextOfKinPhone,
      monthlyShareTarget: Number(monthlyShareTarget) || 0
    })
    await onDone()
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-800">Complete Your Profile</h2>
        <p className="text-sm text-gray-500 mt-1">
          An admin will review and approve your account before you can access your dashboard.
        </p>
      </div>
      <Field label="Phone Number" value={phoneNumber} onChange={setPhoneNumber} />
      <Field label="Email (optional)" value={email} onChange={setEmail} required={false} />
      <Field label="Next of Kin Name" value={nextOfKinName} onChange={setNextOfKinName} />
      <Field label="Next of Kin Phone" value={nextOfKinPhone} onChange={setNextOfKinPhone} />
      <Field
        label="Monthly Share Pledge (MK)"
        value={monthlyShareTarget}
        onChange={setMonthlyShareTarget}
        type="number"
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-glg-600 hover:bg-glg-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg"
      >
        Submit for Approval
      </button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  required = true
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glg-600"
      />
    </div>
  )
}
