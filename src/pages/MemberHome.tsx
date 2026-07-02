import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import MemberDashboard from './MemberDashboard'
import MemberAccount from './MemberAccount'

export default function MemberHome() {
  const { session, logout } = useAuth()
  const [tab, setTab] = useState<'dashboard' | 'account'>('dashboard')

  if (!session?.account) return null
  const member = session.account

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-glg-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <img src="/brand/logo.png" alt="GLG" className="w-9 h-9 rounded-md object-contain bg-white" />
          <div>
            <h1 className="font-semibold text-sm">Golden Ladder Group</h1>
            <p className="text-xs text-white/70">{member.firstName} {member.surname} · {member.memberId}</p>
          </div>
        </div>
        <button onClick={logout} className="text-sm bg-glg-800 hover:bg-glg-600 px-3 py-1.5 rounded-md transition">
          Log out
        </button>
      </header>

      {/* Tab bar */}
      <div className="bg-white border-b border-gray-200 sticky top-[60px] z-10">
        <div className="max-w-3xl mx-auto px-4 flex">
          <button
            onClick={() => setTab('dashboard')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition ${
              tab === 'dashboard' ? 'border-glg-600 text-glg-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTab('account')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition ${
              tab === 'account' ? 'border-glg-600 text-glg-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Account
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-5">
        {tab === 'dashboard' ? <MemberDashboard /> : <MemberAccount />}
      </div>
    </div>
  )
}
