import { useState } from 'react'

const ADMIN_PASSWORD = 'solar'

export function useAuth() {
  const [isAdmin] = useState(() => {
    return localStorage.getItem('kanz_admin') === 'true'
  })

  async function login(password) {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('kanz_admin', 'true')
      return true
    }
    return false
  }

  function logout() {
    localStorage.removeItem('kanz_admin')
  }

  return { isAdmin, login, logout }
}
