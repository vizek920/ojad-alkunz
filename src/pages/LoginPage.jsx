import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import s from './LoginPage.module.css'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const ok = await login(password)
    if (ok) navigate('/admin-kanz/sessions')
    else { setError('كلمة المرور غير صحيحة'); setLoading(false) }
  }

  return (
    <div className={s.page}>
      {/* Floating gems */}
      <span className={s.gem1}>💎</span>
      <span className={s.gem2}>✨</span>
      <span className={s.gem3}>🪙</span>
      <span className={s.gem4}>⭐</span>
      <span className={s.gem5}>💫</span>

      <div className={s.box}>
        <div className={s.icon}>🏺</div>
        <h1 className={s.title}>
          <span className="shimmer-text">اوجد الكنز</span>
        </h1>
        <p className={s.subtitle}>لوحة تحكم المدير</p>

        <hr className="gold-line" />

        <form onSubmit={handleSubmit} className={s.form}>
          <label className={s.label}>كلمة المرور</label>
          <input
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className={s.error}>⚠️ {error}</p>}
          <button className="btn btn-primary" style={{width:'100%', marginTop:8}} disabled={loading}>
            {loading ? '⏳ جاري التحقق…' : '🔑 دخول'}
          </button>
        </form>

        <p className={s.hint}>🎮 هذه الصفحة للمدير فقط</p>
      </div>
    </div>
  )
}
