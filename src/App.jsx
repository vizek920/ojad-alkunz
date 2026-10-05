import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import BigScreenPage from './pages/BigScreenPage'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }) {
  const { isAdmin } = useAuth()
  return isAdmin ? children : <Navigate to="/admin-kanz/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin-kanz/login" element={<LoginPage />} />
        <Route path="/screen/:sessionId" element={<BigScreenPage />} />
        <Route path="/admin-kanz/*" element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/admin-kanz/login" replace />} />
        <Route path="/admin-kanz" element={<Navigate to="/admin-kanz/sessions" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
