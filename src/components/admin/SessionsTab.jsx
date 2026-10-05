import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { sessionsAPI } from '../../lib/api'
import styles from './SessionsTab.module.css'

export default function SessionsTab() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ event_name: '', team1_name: 'الفريق الأول', team2_name: 'الفريق الثاني' })
  const navigate = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const data = await sessionsAPI.list()
      setSessions(data)
    } finally {
      setLoading(false)
    }
  }

  async function createSession(e) {
    e.preventDefault()
    setCreating(true)
    try {
      const { session_id } = await sessionsAPI.create(form)
      await load()
      navigate(`/admin/control/${session_id}`)
    } catch(err) {
      alert(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function deleteSession(id) {
    if (!confirm('حذف هذه الجلسة نهائياً؟')) return
    await sessionsAPI.delete(id)
    setSessions(s => s.filter(x => x.id !== id))
  }

  const statusLabel = { waiting: 'انتظار', active: 'جارية', finished: 'منتهية' }
  const statusColor = { waiting: 'var(--muted)', active: 'var(--success)', finished: 'var(--gold)' }

  return (
    <div>
      <h2 style={{marginBottom:24}}>الجلسات</h2>

      {/* Create form */}
      <div className="card" style={{marginBottom:32}}>
        <h3 style={{marginBottom:18}}>جلسة جديدة</h3>
        <form onSubmit={createSession} className={styles.form}>
          <div className={styles.field}>
            <label>اسم الفعالية</label>
            <input className="input" placeholder="مثال: ليلة الكنوز" value={form.event_name}
              onChange={e => setForm(f => ({...f, event_name: e.target.value}))} required />
          </div>
          <div className={styles.twoCol}>
            <div className={styles.field}>
              <label>اسم الفريق الأول</label>
              <input className="input" value={form.team1_name}
                onChange={e => setForm(f => ({...f, team1_name: e.target.value}))} required />
            </div>
            <div className={styles.field}>
              <label>اسم الفريق الثاني</label>
              <input className="input" value={form.team2_name}
                onChange={e => setForm(f => ({...f, team2_name: e.target.value}))} required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? 'جارٍ الإنشاء...' : '+ إنشاء جلسة'}
          </button>
        </form>
      </div>

      {/* Sessions list */}
      {loading ? (
        <p className="muted">جارٍ التحميل...</p>
      ) : sessions.length === 0 ? (
        <p className="muted">لا توجد جلسات بعد</p>
      ) : (
        <div className={styles.list}>
          {sessions.map(s => {
            const bigScreenUrl = `${window.location.origin}/screen/${s.id}`
            return (
              <div key={s.id} className={styles.row}>
                <div className={styles.rowInfo}>
                  <span className={styles.rowName}>{s.event_name}</span>
                  <span className={styles.rowMeta}>
                    مرحلة {s.current_stage} / {s.total_stages}
                    &nbsp;·&nbsp;
                    <span style={{color: statusColor[s.status]}}>{statusLabel[s.status]}</span>
                  </span>
                  <a href={bigScreenUrl} target="_blank" rel="noreferrer" className={styles.screenLink}>
                    🖥 الشاشة الكبيرة
                  </a>
                </div>
                <div className={styles.rowActions}>
                  <button className="btn btn-ghost" onClick={() => navigate(`/admin/control/${s.id}`)}>
                    تحكم
                  </button>
                  <button className="btn btn-danger" onClick={() => deleteSession(s.id)}>حذف</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
