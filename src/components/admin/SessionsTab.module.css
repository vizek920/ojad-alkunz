import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { sessionsAPI } from '../../lib/api'
import s from './SessionsTab.module.css'

const STATUS_LABEL = { waiting:'⏳ انتظار', active:'▶️ نشط', finished:'✅ منتهي' }
const STATUS_CLASS = { waiting: s.tagWait, active: s.tagActive, finished: s.tagDone }

export default function SessionsTab() {
  const [sessions, setSessions] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    event_name:  '',
    team1_name:  'الفريق الأحمر',
    team2_name:  'الفريق الأزرق',
  })

  async function load() {
    setLoading(true)
    const data = await sessionsAPI.list()
    setSessions(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (!form.event_name.trim()) return
    setCreating(true)
    await sessionsAPI.create(form)
    setForm({ event_name:'', team1_name:'الفريق الأحمر', team2_name:'الفريق الأزرق' })
    await load()
    setCreating(false)
  }

  return (
    <div>
      <h2 className={s.heading}>🎮 الجلسات</h2>

      {/* ── Create form ── */}
      <div className={s.createCard}>
        <p className={s.createTitle}>➕ جلسة جديدة</p>
        <form onSubmit={handleCreate} className={s.form}>
          <div className={s.field}>
            <label>اسم الفعالية</label>
            <input
              className={s.input}
              placeholder="مثال: مسابقة المدرسة ١٤٤٦"
              required
              value={form.event_name}
              onChange={e => setForm({ ...form, event_name: e.target.value })}
            />
          </div>
          <div className={s.twoCol}>
            <div className={s.field}>
              <label>اسم الفريق ١</label>
              <input
                className={s.input}
                value={form.team1_name}
                onChange={e => setForm({ ...form, team1_name: e.target.value })}
              />
            </div>
            <div className={s.field}>
              <label>اسم الفريق ٢</label>
              <input
                className={s.input}
                value={form.team2_name}
                onChange={e => setForm({ ...form, team2_name: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className={s.createBtn} disabled={creating}>
            {creating ? <><span>⏳</span> جاري الإنشاء…</> : <><span>🚀</span> إنشاء الجلسة</>}
          </button>
        </form>
      </div>

      {/* ── Sessions list ── */}
      {loading ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}>⏳</span>
          <span>تحميل الجلسات…</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className={s.empty}>
          <span className={s.emptyIcon}>🎮</span>
          <span>لا توجد جلسات بعد، أنشئ أولى!</span>
        </div>
      ) : (
        <>
          <p className={s.listHeading}>الجلسات الحالية ({sessions.length})</p>
          <div className={s.list}>
            {sessions.map(sess => (
              <div key={sess.id} className={s.sessCard}>
                <div className={s.sessLeft}>
                  <div className={s.sessRow}>
                    <span className={`${s.tag} ${STATUS_CLASS[sess.status] || s.tagWait}`}>
                      {STATUS_LABEL[sess.status] || sess.status}
                    </span>
                    <span className={s.sessName}>{sess.event_name}</span>
                  </div>
                  <div className={s.sessMeta}>
                    <span className={s.sessSub}>المرحلة {sess.current_stage} / 15</span>
                    {sess.team1_name && (
                      <span className={s.sessTeams}>
                        {sess.team1_name} ضد {sess.team2_name}
                      </span>
                    )}
                  </div>
                </div>
                <div className={s.sessActions}>
                  <Link className={s.btnControl} to={`/admin-kanz/sessions/${sess.id}/play`}>
                    🕹️ تحكم
                  </Link>
                  <a className={s.btnScreen} href={`/screen/${sess.id}`} target="_blank" rel="noreferrer">
                    📺 شاشة
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
