import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/shares', label: 'Shares' },
  { to: '/admin/loans', label: 'Loans' },
  { to: '/admin/settings', label: 'Settings' }
]

export default function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const { session, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-glg-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold">Golden Ladder Group — Admin</h1>
            {session?.type === 'admin' && (
              <p className="text-xs text-glg-100/80">{session.account.fullName} ({session.account.role})</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={logout} className="text-sm bg-glg-800 hover:bg-glg-700 px-3 py-1.5 rounded-md hidden sm:inline-block">
              Log out
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="sm:hidden bg-glg-800 hover:bg-glg-700 px-3 py-1.5 rounded-md text-sm"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
        <nav className={`max-w-5xl mx-auto px-4 ${menuOpen ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row gap-1 pb-2`}>
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={`text-sm px-3 py-1.5 rounded-md ${
                location.pathname === item.to ? 'bg-white text-glg-700 font-medium' : 'text-glg-100 hover:bg-glg-600'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button onClick={logout} className="sm:hidden text-left text-sm px-3 py-1.5 rounded-md text-glg-100 hover:bg-glg-600">
            Log out
          </button>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        {children}
      </main>
    </div>
  )
}
