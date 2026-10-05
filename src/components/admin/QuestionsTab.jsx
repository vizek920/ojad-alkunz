import { useState, useEffect } from 'react'
import { questionsAPI, categoriesAPI } from '../../lib/api'
import s from './QuestionsTab.module.css'

const DIFF = ['easy','medium','hard']
const DIFF_AR = { easy:'سهل', medium:'متوسط', hard:'صعب' }
const DIFF_PTS = { easy:1, medium:2, hard:3 }
const TYPES = ['mcq','true_false','open']
const TYPES_AR = { mcq:'اختيار متعدد', true_false:'صح/خطأ', open:'مفتوح' }

const blank = { text:'', type:'mcq', difficulty:'medium', category_id:'', options:['','','',''], answer:'' }

export default function QuestionsTab() {
  const [questions, setQuestions] = useState([])
  const [cats,      setCats]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [form,      setForm]      = useState(blank)
  const [saving,    setSaving]    = useState(false)
  const [search,    setSearch]    = useState('')
  const [filterDiff,setFilterDiff]= useState('')

  async function load() {
    setLoading(true)
    const [q, c] = await Promise.all([questionsAPI.list(), categoriesAPI.list()])
    setQuestions(q || [])
    setCats(c || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function setOpt(i, val) {
    const opts = [...form.options]; opts[i] = val
    setForm({...form, options: opts})
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    const payload = {
      text:        form.text,
      type:        form.type,
      difficulty:  form.difficulty,
      points:      DIFF_PTS[form.difficulty],
      category_id: form.category_id || null,
      options:     form.type === 'mcq'        ? form.options.filter(Boolean) : [],
      answer:      form.answer,
    }
    await questionsAPI.create(payload)
    setForm(blank)
    await load()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('حذف هذا السؤال؟')) return
    await questionsAPI.delete(id)
    await load()
  }

  const displayed = questions.filter(q => {
    const matchText = q.text?.includes(search) || !search
    const matchDiff = !filterDiff || q.difficulty === filterDiff
    return matchText && matchDiff
  })

  return (
    <div>
      <h2 className={s.heading}>❓ الأسئلة <span className={s.count}>({questions.length})</span></h2>

      {/* Add form */}
      <div className={`card card-gold ${s.formCard}`}>
        <h3 style={{color:'var(--gold)',marginBottom:16}}>➕ سؤال جديد</h3>
        <form onSubmit={handleSave} className={s.form}>

          <div className={s.twoCol}>
            <div className={s.field}>
              <label>النوع</label>
              <select className="select" value={form.type} onChange={e=>setForm({...form,type:e.target.value,answer:''})}>
                {TYPES.map(t=><option key={t} value={t}>{TYPES_AR[t]}</option>)}
              </select>
            </div>
            <div className={s.field}>
              <label>الصعوبة</label>
              <select className="select" value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}>
                {DIFF.map(d=><option key={d} value={d}>{DIFF_AR[d]} ({DIFF_PTS[d]} نقطة)</option>)}
              </select>
            </div>
          </div>

          <div className={s.field}>
            <label>الفئة (اختياري)</label>
            <select className="select" value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})}>
              <option value="">بدون فئة</option>
              {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className={s.field}>
            <label>نص السؤال</label>
            <textarea className="textarea" rows={3} required value={form.text}
              onChange={e=>setForm({...form,text:e.target.value})} placeholder="اكتب السؤال هنا…" />
          </div>

          {form.type === 'mcq' && (
            <div className={s.optsGrid}>
              {form.options.map((o,i)=>(
                <div key={i} className={s.field}>
                  <label>{['أ','ب','ج','د'][i]}</label>
                  <input className="input" value={o} onChange={e=>setOpt(i,e.target.value)} placeholder={`الخيار ${i+1}`} />
                </div>
              ))}
            </div>
          )}

          {form.type === 'true_false' && (
            <div className={s.field}>
              <label>الإجابة الصحيحة</label>
              <select className="select" value={form.answer} onChange={e=>setForm({...form,answer:e.target.value})} required>
                <option value="">اختر…</option>
                <option value="true">صح ✓</option>
                <option value="false">خطأ ✗</option>
              </select>
            </div>
          )}

          <div className={s.field}>
            <label>{form.type==='mcq' ? 'الإجابة الصحيحة (أ/ب/ج/د أو النص)' : form.type==='true_false' ? '' : 'الإجابة النموذجية'}</label>
            {form.type !== 'true_false' && (
              <input className="input" required value={form.answer}
                onChange={e=>setForm({...form,answer:e.target.value})} placeholder="الإجابة…" />
            )}
          </div>

          <button className="btn btn-primary" disabled={saving}>
            {saving ? '⏳ جاري الحفظ…' : '💾 حفظ السؤال'}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className={s.filters}>
        <input className="input" style={{flex:1}} placeholder="🔍 بحث…" value={search}
          onChange={e=>setSearch(e.target.value)} />
        <select className="select" style={{width:160}} value={filterDiff}
          onChange={e=>setFilterDiff(e.target.value)}>
          <option value="">كل الصعوبات</option>
          {DIFF.map(d=><option key={d} value={d}>{DIFF_AR[d]}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p style={{color:'var(--muted)',textAlign:'center',padding:24}}>⏳ تحميل…</p>
      ) : (
        <div className={s.list}>
          {displayed.map(q => (
            <div key={q.id} className={`card ${s.qCard}`}>
              <div className={s.qTop}>
                <span className={`badge badge-${q.difficulty}`}>{DIFF_AR[q.difficulty]}</span>
                <span className={s.qType}>{TYPES_AR[q.type]}</span>
                {q.categories?.name && <span className={s.qCat}>📂 {q.categories.name}</span>}
                <span className={s.qPts}>⭐ {q.points} نقطة</span>
              </div>
              <p className={s.qText}>{q.text}</p>
              {q.answer && <p className={s.qAnswer}>✅ {q.answer}</p>}
              <button className="btn btn-danger" style={{alignSelf:'flex-end',padding:'5px 12px',fontSize:'0.8rem'}}
                onClick={()=>handleDelete(q.id)}>🗑️</button>
            </div>
          ))}
          {displayed.length === 0 && <p style={{color:'var(--muted)',textAlign:'center',padding:24}}>لا توجد نتائج</p>}
        </div>
      )}
    </div>
  )
}
