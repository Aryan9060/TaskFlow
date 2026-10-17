import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Wraps public-only routes (login/register): already-authenticated
// users are sent straight to the dashboard
export default function GuestRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page-loading">Loading...</div>
  }

  return user ? <Navigate to="/" replace /> : <Outlet />
}
