import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(password)
      navigate('/admin')
    } catch {
      setError('كلمة المرور غير صحيحة')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <div className={styles.icon}>🏺</div>
        <h1 className={styles.title}>اوجد الكنز</h1>
        <p className={styles.sub}>لوحة التحكم</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            className="input"
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <span className={styles.error}>{error}</span>}
          <button className="btn btn-primary" type="submit" disabled={loading} style={{width:'100%', justifyContent:'center'}}>
            {loading ? 'جارٍ الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  )
}
