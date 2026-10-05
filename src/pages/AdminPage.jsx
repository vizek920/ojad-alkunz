import { useState } from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import SessionsTab from '../components/admin/SessionsTab'
import QuestionsTab from '../components/admin/QuestionsTab'
import CategoriesTab from '../components/admin/CategoriesTab'
import GameControl from '../components/admin/GameControl'
import styles from './AdminPage.module.css'

const NAV = [
  { to: '/admin',            label: 'الجلسات',   icon: '🎮', end: true },
  { to: '/admin/questions',  label: 'الأسئلة',   icon: '❓' },
  { to: '/admin/categories', label: 'التصنيفات', icon: '🗂' },
]

export default function AdminPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🏺</span>
          <span className={styles.logoText}>اوجد الكنز</span>
        </div>

        <nav className={styles.nav}>
          {NAV.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.navActive : ''}`
              }
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className={`btn btn-ghost ${styles.logout}`} onClick={handleLogout}>
          خروج
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <Routes>
          <Route index element={<SessionsTab />} />
          <Route path="questions" element={<QuestionsTab />} />
          <Route path="categories" element={<CategoriesTab />} />
          <Route path="control/:sessionId" element={<GameControl />} />
        </Routes>
      </main>
    </div>
  )
}
