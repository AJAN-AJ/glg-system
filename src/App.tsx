import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import AdminMembers from './pages/AdminMembers'
import AdminShares from './pages/AdminShares'
import AdminLoans from './pages/AdminLoans'
import AdminSettings from './pages/AdminSettings'
import AdminPenalties from './pages/AdminPenalties'
import AdminPenalties from './pages/AdminPenalties'
import AdminGroupInterest from './pages/AdminGroupInterest'
import MemberFirstLogin from './pages/MemberFirstLogin'
import MemberDashboard from './pages/MemberDashboard'
import PendingApproval from './pages/PendingApproval'

function Loading() {
  return (
    <div className="min-h-screen bg-glg-50 flex items-center justify-center">
      <div className="text-center">
        <img src="/brand/logo.png" alt="Golden Ladder Group" className="w-16 h-16 mx-auto mb-3 object-contain animate-pulse" />
        <p className="text-sm text-glg-700">Loading Golden Ladder Group…</p>
      </div>
    </div>
  )
}

export default function App() {
  const { session, loading, isAdmin } = useAuth()

  if (loading) return <Loading />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />

        {/* Admin routes */}
        <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/admin/members" element={isAdmin ? <AdminMembers /> : <Navigate to="/login" replace />} />
        <Route path="/admin/shares" element={isAdmin ? <AdminShares /> : <Navigate to="/login" replace />} />
        <Route path="/admin/loans" element={isAdmin ? <AdminLoans /> : <Navigate to="/login" replace />} />
        <Route path="/admin/penalties" element={isAdmin ? <AdminPenalties /> : <Navigate to="/login" replace />} />
        <Route path="/admin/interest" element={isAdmin ? <AdminGroupInterest /> : <Navigate to="/login" replace />} />
        <Route path="/admin/settings" element={isAdmin ? <AdminSettings /> : <Navigate to="/login" replace />} />

        {/* Member routes */}
        <Route path="/member/setup" element={<MemberSetupGuard />} />
        <Route path="/member/pending" element={<PendingGuard />} />
        <Route path="/member" element={<MemberDashboardGuard />} />

        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RootRedirect() {
  const { session, isAdmin } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  const status = session.account.status
  if (status === 'invited' || status === 'pending_setup') return <Navigate to="/member/setup" replace />
  if (status === 'pending_approval') return <Navigate to="/member/pending" replace />
  if (status === 'suspended') return <Navigate to="/login" replace />
  return <Navigate to="/member" replace />
}

function MemberSetupGuard() {
  const { session, isAdmin } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  const status = session.account.status
  if (status === 'active') return <Navigate to="/member" replace />
  if (status === 'pending_approval') return <Navigate to="/member/pending" replace />
  return <MemberFirstLogin />
}

function PendingGuard() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (session.account.status !== 'pending_approval') return <Navigate to="/" replace />
  return <PendingApproval />
}

function MemberDashboardGuard() {
  const { session, isAdmin } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  if (session.account.status !== 'active') return <Navigate to="/" replace />
  return <MemberDashboard />
}
