import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { db } from '../db/database'
import { verifyPassword, hashPassword } from '../utils/auth'
import type { AdminAccount, Member } from '../types'

type Session =
  | { type: 'admin'; account: AdminAccount }
  | { type: 'member'; account: Member }
  | null

interface AuthContextValue {
  session: Session
  loading: boolean
  loginAdmin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  loginMember: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  refreshSession: () => Promise<void>
  changeMemberPassword: (newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const SESSION_KEY = 'glg-session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    restoreSession()
  }, [])

  async function restoreSession() {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) {
      setLoading(false)
      return
    }
    try {
      const parsed = JSON.parse(raw) as { type: 'admin' | 'member'; id: string }
      if (parsed.type === 'admin') {
        const account = await db.admins.get(parsed.id)
        if (account) setSession({ type: 'admin', account })
      } else {
        const account = await db.members.get(parsed.id)
        if (account) setSession({ type: 'member', account })
      }
    } catch {
      localStorage.removeItem(SESSION_KEY)
    }
    setLoading(false)
  }

  async function refreshSession() {
    if (!session) return
    if (session.type === 'admin') {
      const account = await db.admins.get(session.account.id)
      if (account) setSession({ type: 'admin', account })
    } else {
      const account = await db.members.get(session.account.id)
      if (account) setSession({ type: 'member', account })
    }
  }

  async function loginAdmin(username: string, password: string) {
    const account = await db.admins.where('username').equals(username).first()
    if (!account) return { ok: false, error: 'Account not found' }
    const valid = await verifyPassword(password, account.passwordHash)
    if (!valid) return { ok: false, error: 'Incorrect password' }
    setSession({ type: 'admin', account })
    localStorage.setItem(SESSION_KEY, JSON.stringify({ type: 'admin', id: account.id }))
    return { ok: true }
  }

  async function loginMember(username: string, password: string) {
    const account = await db.members.where('username').equals(username).first()
    if (!account) return { ok: false, error: 'Account not found' }
    if (account.status === 'suspended') return { ok: false, error: 'Account suspended. Contact an admin.' }
    const valid = await verifyPassword(password, account.passwordHash)
    if (!valid) return { ok: false, error: 'Incorrect password' }
    setSession({ type: 'member', account })
    localStorage.setItem(SESSION_KEY, JSON.stringify({ type: 'member', id: account.id }))
    return { ok: true }
  }

  async function changeMemberPassword(newPassword: string) {
    if (!session || session.type !== 'member') return
    const passwordHash = await hashPassword(newPassword)
    const nextStatus = session.account.status === 'invited' || session.account.status === 'pending_setup'
      ? 'pending_setup'
      : session.account.status
    await db.members.update(session.account.id, {
      passwordHash,
      mustChangePassword: false,
      status: nextStatus
    })
    await refreshSession()
  }

  function logout() {
    setSession(null)
    localStorage.removeItem(SESSION_KEY)
  }

  return (
    <AuthContext.Provider
      value={{ session, loading, loginAdmin, loginMember, logout, refreshSession, changeMemberPassword }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
