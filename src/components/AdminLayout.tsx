import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/members', label: 'Members', icon: '👥' },
  { to: '/admin/shares', label: 'Shares', icon: '💰' },
  { to: '/admin/projected', label: 'Projected', icon: '📈' },
  { to: '/admin/loans', label: 'Loans', icon: '📋' },
  { to: '/admin/penalties', label: 'Penalties', icon: '⚠️' },
  { to: '/admin/bank', label: 'Bank', icon: '🏦' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' }
]

export default function AdminLayout({ children, title }: { children: ReactNode; title: string }) {
  const { session, logout } = useAuth()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [location.pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-glg-700 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger — larger hit area on mobile */}
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="sm:hidden flex flex-col justify-center items-center w-11 h-11 rounded-lg bg-glg-600 hover:bg-glg-800 transition gap-1.5"
            >
              <span className="block w-6 h-0.5 bg-white rounded-full" />
              <span className="block w-6 h-0.5 bg-white rounded-full" />
              <span className="block w-6 h-0.5 bg-white rounded-full" />
            </button>
            <img src="/brand/logo.png" alt="GLG" className="w-9 h-9 rounded-md object-contain bg-white hidden sm:block" />
            <div>
              <h1 className="font-semibold text-sm sm:text-base">Golden Ladder Group — Admin</h1>
              {session?.account && (
                <p className="text-xs text-white/70">
                  {session.account.firstName} {session.account.surname} · {session.account.adminRole}
                </p>
              )}
            </div>
          </div>
          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`text-sm px-3 py-1.5 rounded-md transition ${
                  location.pathname === item.to
                    ? 'bg-white text-glg-700 font-medium'
                    : 'text-white/80 hover:bg-glg-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="ml-2 text-sm bg-glg-800 hover:bg-glg-600 px-3 py-1.5 rounded-md transition"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile side drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile side drawer panel */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-glg-700 text-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out sm:hidden flex flex-col ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-glg-600">
          <div className="flex items-center gap-3">
            <img src="/brand/logo.png" alt="GLG" className="w-10 h-10 rounded-md object-contain bg-white" />
            <div>
              <p className="font-semibold text-sm">Golden Ladder Group</p>
              <p className="text-xs text-white/60">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-glg-600 text-white/80 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Member info */}
        {session?.account && (
          <div className="px-5 py-3 border-b border-glg-600 bg-glg-800/30">
            <p className="font-medium text-sm">{session.account.firstName} {session.account.surname}</p>
            <p className="text-xs text-white/60 capitalize">{session.account.adminRole} · {session.account.adminPermission === 'read_write' ? 'Read & Write' : 'Read Only'}</p>
            <p className="text-xs text-white/40 font-mono mt-0.5">{session.account.memberId}</p>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
                location.pathname === item.to
                  ? 'bg-white text-glg-700 font-semibold shadow-sm'
                  : 'text-white/80 hover:bg-glg-600'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Logout at bottom */}
        <div className="px-3 py-4 border-t border-glg-600">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm text-white/80 hover:bg-glg-600 transition"
          >
            <span className="text-base">🚪</span>
            Log out
          </button>
        </div>
      </aside>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        {children}
      </main>
    </div>
  )
}
