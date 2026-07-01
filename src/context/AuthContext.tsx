import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { db } from '../db/database'
import { verifyPassword, hashPassword } from '../utils/auth'
import type { Member } from '../types'

// Unified session: both admins and regular members are Member records.
// Distinguish via account.isAdmin at the point of use.
type Session = { account: Member } | null

interface AuthContextValue {
  session: Session
  loading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  refreshSession: () => Promise<void>
  changePassword: (newPassword: string) => Promise<void>
  isAdmin: boolean
  canWrite: boolean
  isChair: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const SESSION_KEY = 'glg-session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { restoreSession() }, [])

  async function restoreSession() {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) { setLoading(false); return }
    try {
      const parsed = JSON.parse(raw) as { id: string }
      const account = await db.members.get(parsed.id)
      if (account) setSession({ account })
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
    setLoading(false)
  }

  async function refreshSession() {
    if (!session) return
    const account = await db.members.get(session.account.id)
    if (account) setSession({ account })
  }

  async function login(username: string, password: string) {
    const account = await db.members.where('username').equals(username.trim()).first()
    if (!account) return { ok: false, error: 'Account not found.' }
    if (account.status === 'suspended') return { ok: false, error: 'Account suspended. Contact an admin.' }
    const valid = await verifyPassword(password, account.passwordHash)
    if (!valid) return { ok: false, error: 'Incorrect password.' }
    setSession({ account })
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id: account.id }))
    return { ok: true }
  }

  async function changePassword(newPassword: string) {
    if (!session) return
    const passwordHash = await hashPassword(newPassword)
    await db.members.update(session.account.id, { passwordHash, mustChangePassword: false })
    await refreshSession()
  }

  function logout() {
    setSession(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const isAdmin = session?.account.isAdmin === true
  const canWrite = isAdmin && session?.account.adminPermission === 'read_write'
  const isChair = isAdmin && session?.account.adminRole === 'chair'

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, refreshSession, changePassword, isAdmin, canWrite, isChair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
