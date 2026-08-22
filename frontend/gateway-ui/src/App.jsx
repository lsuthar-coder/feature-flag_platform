import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import Layout from './components/Layout'

export function ProtectedLayout() {
  const token = useSelector((s) => s.auth.token)
  if (!token) return <Navigate to="/login" replace />
  return <Layout><Outlet /></Layout>
}
