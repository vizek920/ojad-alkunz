import { useState, useEffect } from 'react'
import { questionsAPI, categoriesAPI } from '../../lib/api'
import s from './QuestionsTab.module.css'

const DIFF    = ['easy','medium','hard']
const DIFF_AR = { easy:'سهل', medium:'متوسط', hard:'صعب' }
const DIFF_PTS = { easy:10, medium:20, hard:30 }
const TYPES   = ['mcq','true_false','open']
const TYPES_AR = { mcq:'اختيار متعدد', true_false:'صح/خطأ', open:'مفتوح' }

const blank = {
  text:'', type:'mcq', difficulty:'medium',
  category_id:'', options:['','','',''], correct_answer:''
}

export default function QuestionsTab() {
  const [questions,   setQuestions]   = useState([])
  const [cats,        setCats]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [form,        setForm]        = useState(blank)
  const [saving,      setSaving]      = useState(false)
  const [search,      setSearch]      = useState('')
  const [filterDiff,  setFilterDiff]  = useState('')
  const [showForm,    setShowForm]    = useState(false)

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
    setForm({ ...form, options: opts })
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    const payload = {
      text:           form.text,
      type:           form.type,
      difficulty:     form.difficulty,
      points:         DIFF_PTS[form.difficulty],
      category_id:    form.category_id || null,
      options:        form.type === 'mcq' ? form.options.filter(Boolean) : [],
      correct_answer: form.correct_answer,   // ← fixed field name
    }
    await questionsAPI.create(payload)
    setForm(blank)
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('حذف هذا السؤال؟')) return
    await questionsAPI.delete(id)
    await load()
  }

  const displayed = questions.filter(q => {
    const matchText = !search || q.text?.includes(search)
    const matchDiff = !filterDiff || q.difficulty === filterDiff
    return matchText && matchDiff
  })

  return (
    <div>
      <div className={s.topRow}>
        <h2 className={s.heading}>❓ الأسئلة <span className={s.count}>({questions.length})</span></h2>
        <button className={s.addBtn} onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ إغلاق' : '➕ سؤال جديد'}
        </button>
      </div>

      {/* ── Add form (collapsible) ── */}
      {showForm && (
        <div className={s.formCard}>
          <form onSubmit={handleSave} className={s.form}>
            <div className={s.threeCol}>
              <div className={s.field}>
                <label>النوع</label>
                <select className={s.select} value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value, correct_answer:'' })}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPES_AR[t]}</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label>الصعوبة</label>
                <select className={s.select} value={form.difficulty}
                  onChange={e => setForm({ ...form, difficulty: e.target.value })}>
                  {DIFF.map(d => <option key={d} value={d}>{DIFF_AR[d]} — {DIFF_PTS[d]} نقطة</option>)}
                </select>
              </div>
              <div className={s.field}>
                <label>الفئة (اختياري)</label>
                <select className={s.select} value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">بدون فئة</option>
                  {cats.map(c => <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>)}
                </select>
              </div>
            </div>

            <div className={s.field}>
              <label>نص السؤال</label>
              <textarea className={s.textarea} rows={3} required
                value={form.text} onChange={e => setForm({ ...form, text: e.target.value })}
                placeholder="اكتب السؤال هنا…" />
            </div>

            {form.type === 'mcq' && (
              <div className={s.optsGrid}>
                {form.options.map((o, i) => (
                  <div key={i} className={s.field}>
                    <label>{['أ','ب','ج','د'][i]}</label>
                    <input className={s.input} value={o}
                      onChange={e => setOpt(i, e.target.value)}
                      placeholder={`الخيار ${i+1}`} />
                  </div>
                ))}
              </div>
            )}

            {form.type === 'true_false' ? (
              <div className={s.field}>
                <label>الإجابة الصحيحة</label>
                <select className={s.select} value={form.correct_answer}
                  onChange={e => setForm({ ...form, correct_answer: e.target.value })} required>
                  <option value="">اختر…</option>
                  <option value="true">✓ صح</option>
                  <option value="false">✗ خطأ</option>
                </select>
              </div>
            ) : (
              <div className={s.field}>
                <label>{form.type==='mcq' ? 'الإجابة الصحيحة (أ/ب/ج/د أو النص)' : 'الإجابة النموذجية'}</label>
                <input className={s.input} required value={form.correct_answer}
                  onChange={e => setForm({ ...form, correct_answer: e.target.value })}
                  placeholder="الإجابة…" />
              </div>
            )}

            <div className={s.formFooter}>
              <button type="submit" className={s.saveBtn} disabled={saving}>
                {saving ? <><span className={s.spin} /> جاري الحفظ…</> : <><span>💾</span> حفظ السؤال</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div className={s.filters}>
        <div className={s.searchWrap}>
          <span className={s.searchIcon}>🔍</span>
          <input className={s.searchInput} placeholder="بحث في الأسئلة…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={s.filterSelect} value={filterDiff}
          onChange={e => setFilterDiff(e.target.value)}>
          <option value="">كل الصعوبات</option>
          {DIFF.map(d => <option key={d} value={d}>{DIFF_AR[d]}</option>)}
        </select>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className={s.empty}><span className={s.emptyIcon}>⏳</span> تحميل…</div>
      ) : displayed.length === 0 ? (
        <div className={s.empty}><span className={s.emptyIcon}>❓</span> لا توجد نتائج</div>
      ) : (
        <div className={s.list}>
          {displayed.map(q => (
            <div key={q.id} className={s.qCard}>
              <div className={s.qTop}>
                <span className={`${s.badge} ${s['badge_' + q.difficulty]}`}>{DIFF_AR[q.difficulty]}</span>
                <span className={s.qType}>{TYPES_AR[q.type]}</span>
                {q.categories?.name_ar && <span className={s.qCat}>📂 {q.categories.name_ar}</span>}
                <span className={s.qPts}>⭐ {q.points} نقطة</span>
              </div>
              <p className={s.qText}>{q.text}</p>
              {q.correct_answer && (
                <p className={s.qAnswer}>✅ الإجابة: {q.correct_answer}</p>
              )}
              <button className={s.delBtn} onClick={() => handleDelete(q.id)}>🗑️ حذف</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
