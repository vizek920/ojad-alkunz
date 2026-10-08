import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import s from './LoginPage.module.css'

/* ── Particle canvas ─────────────────────────────────────── */
function useParticles(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      a: Math.random(),
    }))

    const draw = () => {
      const { width: W, height: H } = canvas
      ctx.clearRect(0, 0, W, H)
      particles.forEach(p => {
        p.x = (p.x + p.vx + 1) % 1
        p.y = (p.y + p.vy + 1) % 1
        p.a = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 2000 + p.r * 99))
        ctx.beginPath()
        ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,162,39,${p.a * 0.7})`
        ctx.fill()
      })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [canvasRef])
}

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [shake, setShake]       = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()
  const canvasRef = useRef(null)
  useParticles(canvasRef)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const ok = await login(password)
    if (ok) {
      navigate('/admin-kanz/sessions')
    } else {
      setError('كلمة المرور غير صحيحة')
      setLoading(false)
      setShake(true)
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div className={s.page}>
      <canvas ref={canvasRef} className={s.canvas} />

      {/* Ambient orbs */}
      <div className={s.orb1} />
      <div className={s.orb2} />

      <div className={`${s.card} ${shake ? s.shake : ''}`}>
        {/* Top glow bar */}
        <div className={s.topBar} />

        {/* Logo */}
        <div className={s.logoWrap}>
          <div className={s.logoRing}>
            <span className={s.logoIcon}>💎</span>
          </div>
        </div>

        <h1 className={s.title}>اوجد الكنز</h1>
        <p className={s.subtitle}>لوحة تحكم المدير</p>

        <div className={s.divider} />

        <form onSubmit={handleSubmit} className={s.form}>
          <div className={s.fieldWrap}>
            <span className={s.fieldIcon}>🔒</span>
            <input
              type="password"
              className={s.input}
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className={s.errorBox}>
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            type="submit"
            className={s.btn}
            disabled={loading || !password}
          >
            {loading
              ? <><span className={s.spinner} /> جاري التحقق…</>
              : <><span>🔑</span> دخول</>
            }
          </button>
        </form>

        <p className={s.hint}>🎮 هذه الصفحة للمدير فقط</p>
      </div>
    </div>
  )
}
