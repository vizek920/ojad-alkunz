import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import SessionsTab   from '../components/admin/SessionsTab'
import QuestionsTab  from '../components/admin/QuestionsTab'
import CategoriesTab from '../components/admin/CategoriesTab'
import GameControl   from '../components/admin/GameControl'
import s from './AdminPage.module.css'

const NAV = [
  { to: '/admin-kanz/sessions',   label: 'الجلسات',   icon: '🎮' },
  { to: '/admin-kanz/questions',  label: 'الأسئلة',   icon: '❓' },
  { to: '/admin-kanz/categories', label: 'الفئات',    icon: '📂' },
]

export default function AdminPage() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  function handleLogout() { logout(); navigate('/admin-kanz/login') }

  return (
    <div className={s.layout}>
      {/* Sidebar */}
      <aside className={s.sidebar}>
        <div className={s.logo}>
          <span className={s.logoIcon}>💎</span>
          <span className={s.logoText}>اوجد الكنز</span>
        </div>

        <nav className={s.nav}>
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `${s.navItem} ${isActive ? s.navActive : ''}`}
            >
              <span className={s.navIcon}>{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className={s.sidebarBottom}>
          <button className={s.logoutBtn} onClick={handleLogout}>
            <span>🚪</span> خروج
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={s.main}>
        <Routes>
          <Route path="sessions"          element={<SessionsTab />} />
          <Route path="sessions/:id/play" element={<GameControl />} />
          <Route path="questions"         element={<QuestionsTab />} />
          <Route path="categories"        element={<CategoriesTab />} />
          <Route path="*"                 element={<Navigate to="sessions" replace />} />
        </Routes>
      </main>
    </div>
  )
}
