import { useState, useEffect } from 'react'
import { categoriesAPI } from '../../lib/api'
import s from './CategoriesTab.module.css'

export default function CategoriesTab() {
  const [cats,     setCats]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [nameAr,   setNameAr]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [editName, setEditName] = useState('')

  async function load() {
    setLoading(true)
    const data = await categoriesAPI.list()
    setCats(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!nameAr.trim()) return
    setSaving(true)
    await categoriesAPI.create({ name_ar: nameAr.trim() })  // ← fixed field name
    setNameAr('')
    await load()
    setSaving(false)
  }

  async function handleEdit(id) {
    setSaving(true)
    await categoriesAPI.update(id, { name_ar: editName })   // ← fixed field name
    setEditId(null)
    await load()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('حذف هذه الفئة؟')) return
    await categoriesAPI.delete(id)
    await load()
  }

  return (
    <div>
      <h2 className={s.heading}>📂 الفئات</h2>

      <div className={s.addCard}>
        <p className={s.addTitle}>➕ فئة جديدة</p>
        <form onSubmit={handleAdd} className={s.addForm}>
          <input
            className={s.input}
            placeholder="اسم الفئة بالعربية…"
            value={nameAr}
            onChange={e => setNameAr(e.target.value)}
            required
          />
          <button type="submit" className={s.addBtn} disabled={saving}>
            {saving ? '⏳' : '💾 حفظ'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className={s.empty}><span className={s.emptyIcon}>⏳</span> تحميل…</div>
      ) : cats.length === 0 ? (
        <div className={s.empty}><span className={s.emptyIcon}>📂</span> لا توجد فئات بعد</div>
      ) : (
        <div className={s.grid}>
          {cats.map(c => (
            <div key={c.id} className={s.catCard}>
              {editId === c.id ? (
                <div className={s.editRow}>
                  <input
                    className={s.input}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                  />
                  <button className={s.confirmBtn} onClick={() => handleEdit(c.id)} disabled={saving}>✓</button>
                  <button className={s.cancelBtn}  onClick={() => setEditId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <span className={s.catIcon}>📁</span>
                  <span className={s.catName}>{c.name_ar || c.name}</span>
                  <div className={s.catActions}>
                    <button className={s.editBtn}
                      onClick={() => { setEditId(c.id); setEditName(c.name_ar || c.name || '') }}>
                      ✏️
                    </button>
                    <button className={s.delBtn} onClick={() => handleDelete(c.id)}>🗑️</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
