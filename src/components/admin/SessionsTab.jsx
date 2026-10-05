import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sessionsAPI } from '../../lib/api'
import s from './SessionsTab.module.css'

export default function SessionsTab() {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ event_name:'', team1_name:'الفريق الأحمر', team2_name:'الفريق الأزرق' })

  async function load() {
    setLoading(true)
    const data = await sessionsAPI.list()
    setSessions(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    await sessionsAPI.create(form)
    setForm({ event_name:'', team1_name:'الفريق الأحمر', team2_name:'الفريق الأزرق' })
    await load()
    setCreating(false)
  }

  const statusLabel = { waiting:'⏳ انتظار', active:'▶️ نشط', finished:'✅ منتهي' }
  const statusClass = { waiting: s.tagWait, active: s.tagActive, finished: s.tagDone }

  return (
    <div>
      <h2 className={s.heading}>🎮 الجلسات</h2>

      {/* Create form */}
      <div className={`card card-gold ${s.createCard}`}>
        <h3 style={{color:'var(--gold)',marginBottom:16}}>➕ جلسة جديدة</h3>
        <form onSubmit={handleCreate} className={s.form}>
          <div className={s.field}>
            <label>اسم الفعالية</label>
            <input className="input" placeholder="مثال: مسابقة المدرسة" required
              value={form.event_name} onChange={e=>setForm({...form,event_name:e.target.value})} />
          </div>
          <div className={s.twoCol}>
            <div className={s.field}>
              <label>اسم الفريق ١</label>
              <input className="input" value={form.team1_name}
                onChange={e=>setForm({...form,team1_name:e.target.value})} />
            </div>
            <div className={s.field}>
              <label>اسم الفريق ٢</label>
              <input className="input" value={form.team2_name}
                onChange={e=>setForm({...form,team2_name:e.target.value})} />
            </div>
          </div>
          <button className="btn btn-primary" disabled={creating}>
            {creating ? '⏳ جاري الإنشاء…' : '🚀 إنشاء الجلسة'}
          </button>
        </form>
      </div>

      {/* Sessions list */}
      {loading ? (
        <p style={{color:'var(--muted)',textAlign:'center',padding:32}}>⏳ تحميل…</p>
      ) : sessions.length === 0 ? (
        <p style={{color:'var(--muted)',textAlign:'center',padding:32}}>لا توجد جلسات بعد</p>
      ) : (
        <div className={s.list}>
          {sessions.map(sess => (
            <div key={sess.id} className={`card ${s.sessCard}`}>
              <div className={s.sessInfo}>
                <span className={`${s.tag} ${statusClass[sess.status]||s.tagWait}`}>{statusLabel[sess.status]||sess.status}</span>
                <h3 className={s.sessName}>{sess.event_name}</h3>
                <p className={s.sessSub}>المرحلة {sess.current_stage} / 15</p>
              </div>
              <div className={s.sessActions}>
                <Link className="btn btn-primary" to={`/admin-kanz/sessions/${sess.id}/play`}>
                  🕹️ تحكم
                </Link>
                <a className="btn btn-ghost" href={`/screen/${sess.id}`} target="_blank" rel="noreferrer">
                  📺 شاشة
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
