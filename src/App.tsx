import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminMembers from './pages/AdminMembers'
import AdminShares from './pages/AdminShares'
import AdminLoans from './pages/AdminLoans'
import AdminSettings from './pages/AdminSettings'
import MemberFirstLogin from './pages/MemberFirstLogin'
import MemberDashboard from './pages/MemberDashboard'
import PendingApproval from './pages/PendingApproval'

function Loading() {
  return (
    <div className="min-h-screen bg-glg-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-glg-700 mx-auto mb-3 flex items-center justify-center text-glg-400 font-bold animate-pulse">
          GLG
        </div>
        <p className="text-sm text-glg-700">Loading Golden Ladder Group…</p>
      </div>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <Loading />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={session?.type === 'admin' ? <AdminDashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/members"
          element={session?.type === 'admin' ? <AdminMembers /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/shares"
          element={session?.type === 'admin' ? <AdminShares /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/loans"
          element={session?.type === 'admin' ? <AdminLoans /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin/settings"
          element={session?.type === 'admin' ? <AdminSettings /> : <Navigate to="/login" replace />}
        />

        {/* Member routes */}
        <Route path="/member/setup" element={<MemberFirstLoginGuard />} />
        <Route path="/member/pending" element={<PendingGuard />} />
        <Route
          path="/member"
          element={session?.type === 'member' && session.account.status === 'active'
            ? <MemberDashboard />
            : <Navigate to="/login" replace />}
        />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.type === 'admin') return <Navigate to="/admin" replace />

  const status = session.account.status
  if (status === 'invited' || status === 'pending_setup') return <Navigate to="/member/setup" replace />
  if (status === 'pending_approval') return <Navigate to="/member/pending" replace />
  if (status === 'suspended') return <Navigate to="/login" replace />
  return <Navigate to="/member" replace />
}

function MemberFirstLoginGuard() {
  const { session } = useAuth()
  if (session?.type !== 'member') return <Navigate to="/login" replace />
  if (session.account.status === 'pending_approval' || session.account.status === 'active') {
    return <Navigate to="/" replace />
  }
  return <MemberFirstLogin />
}

function PendingGuard() {
  const { session } = useAuth()
  if (session?.type !== 'member') return <Navigate to="/login" replace />
  if (session.account.status !== 'pending_approval') return <Navigate to="/" replace />
  return <PendingApproval />
}
