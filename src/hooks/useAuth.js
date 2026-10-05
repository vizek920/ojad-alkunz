import { useState, useEffect } from 'react'
import { authAPI } from '../lib/api'

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem('kanz_token'))

  async function login(password) {
    const data = await authAPI.login(password)
    localStorage.setItem('kanz_token', data.token)
    setIsAdmin(true)
    return data
  }

  function logout() {
    localStorage.removeItem('kanz_token')
    setIsAdmin(false)
  }

  // Verify token on mount
  useEffect(() => {
    if (isAdmin) {
      authAPI.verify().catch(() => {
        localStorage.removeItem('kanz_token')
        setIsAdmin(false)
      })
    }
  }, [])

  return { isAdmin, login, logout }
}
