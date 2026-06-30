import { useAuth } from '../context/AuthContext'

export default function PendingApproval() {
  const { logout } = useAuth()
  return (
    <div className="min-h-screen bg-glg-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-6 text-center">
        <div className="text-4xl mb-3">⏳</div>
        <h2 className="font-semibold text-gray-800">Profile Submitted</h2>
        <p className="text-sm text-gray-500 mt-2">
          Your profile is awaiting review by an admin (Chair, Secretary, or Treasurer). You'll be able to access
          your dashboard once approved.
        </p>
        <button onClick={logout} className="mt-5 text-sm text-glg-600 hover:underline">
          Log out
        </button>
      </div>
    </div>
  )
}
