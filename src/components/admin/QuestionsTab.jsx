import { useState, useEffect } from 'react'
import { questionsAPI, categoriesAPI } from '../../lib/api'
import styles from './QuestionsTab.module.css'

const DIFFICULTY = ['easy', 'medium', 'hard']
const DIFFICULTY_AR = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

const BLANK = {
  text: '', type: 'mcq',
  options: ['', '', '', ''], correct_answer: '',
  difficulty: 'medium', points: 2,
  category_id: '', stage: '', hint: ''
}

export default function QuestionsTab() {
  const [questions, setQuestions] = useState([])
  const [categories, setCategories] = useState([])
  const [filter, setFilter] = useState({ difficulty: '', category_id: '', stage: '' })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [q, c] = await Promise.all([questionsAPI.list(), categoriesAPI.list()])
    setQuestions(q.data || [])
    setCategories(c)
    setLoading(false)
  }

  async function loadFiltered() {
    const params = {}
    if (filter.difficulty)  params.difficulty  = filter.difficulty
    if (filter.category_id) params.category_id = filter.category_id
    if (filter.stage)       params.stage       = filter.stage
    const q = await questionsAPI.list(params)
    setQuestions(q.data || [])
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        points: { easy: 1, medium: 2, hard: 3 }[form.difficulty],
        stage: form.stage ? Number(form.stage) : null,
        options: form.type === 'mcq' ? form.options.filter(Boolean) : null
      }
      if (editing) {
        await questionsAPI.update(editing, payload)
      } else {
        await questionsAPI.create(payload)
      }
      setShowForm(false)
      setForm(BLANK)
      setEditing(null)
      await loadFiltered()
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  function startEdit(q) {
    setForm({
      text: q.text, type: q.type,
      options: q.options || ['','','',''],
      correct_answer: q.correct_answer,
      difficulty: q.difficulty, points: q.points,
      category_id: q.category_id || '', stage: q.stage || '', hint: q.hint || ''
    })
    setEditing(q.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function del(id) {
    if (!confirm('حذف هذا السؤال؟')) return
    await questionsAPI.delete(id)
    setQuestions(q => q.filter(x => x.id !== id))
  }

  const filtered = questions.filter(q =>
    (!filter.difficulty  || q.difficulty  === filter.difficulty) &&
    (!filter.category_id || q.category_id === filter.category_id) &&
    (!filter.stage       || String(q.stage) === filter.stage)
  )

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24}}>
        <h2>بنك الأسئلة <span className="muted" style={{fontWeight:400,fontSize:'1rem'}}>({questions.length})</span></h2>
        <button className="btn btn-primary" onClick={() => { setForm(BLANK); setEditing(null); setShowForm(s => !s) }}>
          {showForm ? 'إغلاق' : '+ سؤال جديد'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{marginBottom:28}}>
          <h3 style={{marginBottom:18}}>{editing ? 'تعديل السؤال' : 'سؤال جديد'}</h3>
          <form onSubmit={save} className={styles.form}>
            <textarea className="textarea" placeholder="نص السؤال" value={form.text}
              onChange={e => setForm(f => ({...f, text: e.target.value}))} required />

            <div className={styles.row2}>
              <div className={styles.field}>
                <label>نوع السؤال</label>
                <select className="select" value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}>
                  <option value="mcq">اختيار متعدد</option>
                  <option value="tf">صح / خطأ</option>
                </select>
              </div>
              <div className={styles.field}>
                <label>الصعوبة</label>
                <select className="select" value={form.difficulty} onChange={e => setForm(f => ({...f, difficulty: e.target.value}))}>
                  {DIFFICULTY.map(d => <option key={d} value={d}>{DIFFICULTY_AR[d]}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>التصنيف</label>
                <select className="select" value={form.category_id} onChange={e => setForm(f => ({...f, category_id: e.target.value}))}>
                  <option value="">بلا تصنيف</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>المرحلة (اختياري)</label>
                <input className="input" type="number" min="1" max="15" placeholder="1-15"
                  value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value}))} />
              </div>
            </div>

            {form.type === 'mcq' && (
              <div className={styles.optionsGrid}>
                {[0,1,2,3].map(i => (
                  <input key={i} className="input" placeholder={`الخيار ${i+1}`}
                    value={form.options[i] || ''}
                    onChange={e => setForm(f => { const o=[...f.options]; o[i]=e.target.value; return {...f,options:o} })} />
                ))}
              </div>
            )}

            <div className={styles.field}>
              <label>الإجابة الصحيحة</label>
              {form.type === 'tf' ? (
                <select className="select" value={form.correct_answer} onChange={e => setForm(f => ({...f, correct_answer: e.target.value}))}>
                  <option value="">اختر</option>
                  <option value="صح">صح</option>
                  <option value="خطأ">خطأ</option>
                </select>
              ) : (
                <input className="input" placeholder="أكتب الإجابة الصحيحة" value={form.correct_answer}
                  onChange={e => setForm(f => ({...f, correct_answer: e.target.value}))} required />
              )}
            </div>

            <input className="input" placeholder="تلميح (اختياري)" value={form.hint}
              onChange={e => setForm(f => ({...f, hint: e.target.value}))} />

            <div style={{display:'flex', gap:10}}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'جارٍ الحفظ...' : (editing ? 'حفظ التعديل' : 'إضافة السؤال')}
              </button>
              <button className="btn btn-ghost" type="button" onClick={() => { setShowForm(false); setEditing(null) }}>
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <select className="select" style={{flex:1}} value={filter.difficulty}
          onChange={e => setFilter(f => ({...f, difficulty: e.target.value}))}>
          <option value="">جميع الصعوبات</option>
          {DIFFICULTY.map(d => <option key={d} value={d}>{DIFFICULTY_AR[d]}</option>)}
        </select>
        <select className="select" style={{flex:1}} value={filter.category_id}
          onChange={e => setFilter(f => ({...f, category_id: e.target.value}))}>
          <option value="">جميع التصنيفات</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name_ar}</option>)}
        </select>
        <select className="select" style={{flex:1}} value={filter.stage}
          onChange={e => setFilter(f => ({...f, stage: e.target.value}))}>
          <option value="">جميع المراحل</option>
          {Array.from({length:15},(_,i)=><option key={i+1} value={i+1}>مرحلة {i+1}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? <p className="muted" style={{marginTop:24}}>جارٍ التحميل...</p> : (
        <div className={styles.list}>
          {filtered.map(q => (
            <div key={q.id} className={styles.qRow}>
              <div className={styles.qBody}>
                <p className={styles.qText}>{q.text}</p>
                <div className={styles.qMeta}>
                  <span className={`badge badge-${q.difficulty}`}>{DIFFICULTY_AR[q.difficulty]}</span>
                  {q.categories && <span className="muted" style={{fontSize:'0.8rem'}}>{q.categories.icon} {q.categories.name_ar}</span>}
                  {q.stage && <span className="muted" style={{fontSize:'0.8rem'}}>مرحلة {q.stage}</span>}
                  <span className="muted" style={{fontSize:'0.8rem'}}>{q.type === 'tf' ? 'صح/خطأ' : 'اختيار متعدد'}</span>
                </div>
              </div>
              <div className={styles.qActions}>
                <button className="btn btn-ghost" style={{padding:'6px 14px',fontSize:'0.85rem'}} onClick={() => startEdit(q)}>تعديل</button>
                <button className="btn btn-danger" style={{padding:'6px 14px',fontSize:'0.85rem'}} onClick={() => del(q.id)}>حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
