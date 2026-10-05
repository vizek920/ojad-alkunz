import { useState, useEffect } from 'react'
import { categoriesAPI } from '../../lib/api'
import styles from './CategoriesTab.module.css'

const BLANK = { name_ar: '', name_en: '', icon: '📚' }

export default function CategoriesTab() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState(BLANK)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const data = await categoriesAPI.list()
    setCategories(data)
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await categoriesAPI.update(editing, form)
      } else {
        await categoriesAPI.create(form)
      }
      setForm(BLANK)
      setEditing(null)
      await load()
    } catch(err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function del(id) {
    if (!confirm('حذف هذا التصنيف؟')) return
    await categoriesAPI.delete(id)
    setCategories(c => c.filter(x => x.id !== id))
  }

  return (
    <div>
      <h2 style={{marginBottom:24}}>التصنيفات</h2>

      <div className="card" style={{marginBottom:28}}>
        <h3 style={{marginBottom:16}}>{editing ? 'تعديل تصنيف' : 'تصنيف جديد'}</h3>
        <form onSubmit={save} className={styles.form}>
          <input className="input" style={{width:64}} placeholder="🏷" value={form.icon}
            onChange={e => setForm(f => ({...f, icon: e.target.value}))} maxLength={4} />
          <input className="input" placeholder="الاسم بالعربية" value={form.name_ar}
            onChange={e => setForm(f => ({...f, name_ar: e.target.value}))} required />
          <input className="input" placeholder="الاسم بالإنجليزية (اختياري)" value={form.name_en}
            onChange={e => setForm(f => ({...f, name_en: e.target.value}))} />
          <div style={{display:'flex', gap:10}}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? '...' : editing ? 'حفظ' : 'إضافة'}
            </button>
            {editing && (
              <button className="btn btn-ghost" type="button" onClick={() => { setEditing(null); setForm(BLANK) }}>
                إلغاء
              </button>
            )}
          </div>
        </form>
      </div>

      <div className={styles.grid}>
        {categories.map(c => (
          <div key={c.id} className={styles.catCard}>
            <span className={styles.catIcon}>{c.icon}</span>
            <span className={styles.catName}>{c.name_ar}</span>
            {c.name_en && <span className={styles.catEn}>{c.name_en}</span>}
            <div className={styles.catActions}>
              <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:'0.8rem'}}
                onClick={() => { setForm({name_ar:c.name_ar,name_en:c.name_en||'',icon:c.icon||''}); setEditing(c.id) }}>
                تعديل
              </button>
              <button className="btn btn-danger" style={{padding:'4px 10px',fontSize:'0.8rem'}}
                onClick={() => del(c.id)}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
