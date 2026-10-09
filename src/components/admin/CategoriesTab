import { useState, useEffect } from 'react'
import { categoriesAPI } from '../../lib/api'
import s from './CategoriesTab.module.css'

export default function CategoriesTab() {
  const [cats,    setCats]    = useState([])
  const [loading, setLoading] = useState(true)
  const [name,    setName]    = useState('')
  const [saving,  setSaving]  = useState(false)
  const [editId,  setEditId]  = useState(null)
  const [editName,setEditName]= useState('')

  async function load() {
    setLoading(true)
    const data = await categoriesAPI.list()
    setCats(data || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await categoriesAPI.create({ name: name.trim() })
    setName('')
    await load()
    setSaving(false)
  }

  async function handleEdit(id) {
    setSaving(true)
    await categoriesAPI.update(id, { name: editName })
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

      <div className={`card card-gold ${s.addCard}`}>
        <h3 style={{color:'var(--gold)',marginBottom:14}}>➕ فئة جديدة</h3>
        <form onSubmit={handleAdd} className={s.addForm}>
          <input className="input" placeholder="اسم الفئة…" value={name}
            onChange={e=>setName(e.target.value)} required />
          <button className="btn btn-primary" disabled={saving}>حفظ</button>
        </form>
      </div>

      {loading ? (
        <p style={{color:'var(--muted)',textAlign:'center',padding:24}}>⏳ تحميل…</p>
      ) : (
        <div className={s.grid}>
          {cats.map(c => (
            <div key={c.id} className={`card ${s.catCard}`}>
              {editId === c.id ? (
                <div className={s.editRow}>
                  <input className="input" value={editName}
                    onChange={e=>setEditName(e.target.value)} autoFocus />
                  <button className="btn btn-success" onClick={()=>handleEdit(c.id)} disabled={saving}>✓</button>
                  <button className="btn btn-ghost" onClick={()=>setEditId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <span className={s.catName}>📁 {c.name}</span>
                  <div className={s.catActions}>
                    <button className="btn btn-ghost" style={{padding:'6px 10px'}}
                      onClick={()=>{ setEditId(c.id); setEditName(c.name) }}>✏️</button>
                    <button className="btn btn-danger" style={{padding:'6px 10px'}}
                      onClick={()=>handleDelete(c.id)}>🗑️</button>
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
