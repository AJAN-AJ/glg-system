import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [tab, setTab] = useState<'member' | 'admin'>('member')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { loginAdmin, loginMember } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const result = tab === 'admin'
      ? await loginAdmin(username.trim(), password)
      : await loginMember(username.trim(), password)
    setSubmitting(false)
    if (!result.ok) {
      setError(result.error ?? 'Login failed')
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-glg-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-6">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-glg-700">Golden Ladder Group</h1>
          <p className="text-sm text-gray-500 mt-1">Member Shares & Loans System</p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => { setTab('member'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              tab === 'member' ? 'bg-white shadow text-glg-700' : 'text-gray-500'
            }`}
          >
            Member
          </button>
          <button
            type="button"
            onClick={() => { setTab('admin'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
              tab === 'admin' ? 'bg-white shadow text-glg-700' : 'text-gray-500'
            }`}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tab === 'admin' ? 'Admin Username' : 'Username / Phone Number'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glg-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tab === 'member' ? 'Password (use temporary password if first time)' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-glg-600"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-glg-600 hover:bg-glg-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg transition"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {tab === 'admin' && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            Default chair login: username <code>chair</code>, password <code>GLG-Admin-2026</code> — change this immediately.
          </p>
        )}
      </div>
    </div>
  )
}
