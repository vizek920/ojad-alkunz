import { useState, useEffect, useCallback } from 'react';
import styles from './AdminPage.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const api = {
  categories: {
    list: ()       => apiFetch('/api/categories'),
    create: (data) => apiFetch('/api/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d)=> apiFetch(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/api/categories/${id}`, { method: 'DELETE' }),
  },
  questions: {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return apiFetch(`/api/questions${q ? '?' + q : ''}`);
    },
    create: (data) => apiFetch('/api/questions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, d)=> apiFetch(`/api/questions/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id)   => apiFetch(`/api/questions/${id}`, { method: 'DELETE' }),
    bulkImport: (arr) => apiFetch('/api/questions/bulk', { method: 'POST', body: JSON.stringify({ questions: arr }) }),
  },
};

// ─── Difficulty Badge ─────────────────────────────────────────────────────────
function DiffBadge({ diff }) {
  const map = { easy: ['سهل', '#27AE60'], medium: ['متوسط', '#F39C12'], hard: ['صعب', '#E74C3C'] };
  const [label, color] = map[diff] || ['—', '#5A4E7A'];
  return (
    <span className={styles.badge} style={{ color, borderColor: color + '44', background: color + '15' }}>
      {label}
    </span>
  );
}

// ─── Question Form Modal ──────────────────────────────────────────────────────
const EMPTY_Q = { question: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'A', difficulty: 'medium', category_id: '', points: 10 };

function QuestionModal({ initial, categories, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_Q);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.question.trim()) return setError('أدخل نص السؤال');
    if (!form.option_a || !form.option_b || !form.option_c || !form.option_d) return setError('أدخل جميع الخيارات');
    setLoading(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isEdit = !!initial?.id;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <form className={styles.modal} onSubmit={handleSubmit} dir="rtl">
        <div className={styles.modalHeader}>
          <h2>{isEdit ? '✏ تعديل سؤال' : '➕ سؤال جديد'}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <label className={styles.label}>نص السؤال *</label>
        <textarea
          className={styles.textarea}
          rows={3}
          placeholder="اكتب السؤال هنا..."
          value={form.question}
          onChange={e => set('question', e.target.value)}
        />

        <div className={styles.optionsGrid}>
          {['a','b','c','d'].map(l => (
            <label key={l} className={styles.optionWrap}>
              <span className={styles.optionLetter}>{l.toUpperCase()}</span>
              <input
                className={styles.input}
                placeholder={`الخيار ${l.toUpperCase()}`}
                value={form[`option_${l}`]}
                onChange={e => set(`option_${l}`, e.target.value)}
              />
            </label>
          ))}
        </div>

        <div className={styles.row3}>
          <div className={styles.col}>
            <label className={styles.label}>الإجابة الصحيحة</label>
            <select className={styles.select} value={form.correct_answer} onChange={e => set('correct_answer', e.target.value)}>
              {['A','B','C','D'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className={styles.col}>
            <label className={styles.label}>الصعوبة</label>
            <select className={styles.select} value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </div>
          <div className={styles.col}>
            <label className={styles.label}>النقاط</label>
            <input className={styles.input} type="number" min="5" max="100" value={form.points} onChange={e => set('points', +e.target.value)} />
          </div>
        </div>

        <div className={styles.col}>
          <label className={styles.label}>الفئة</label>
          <select className={styles.select} value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">بدون فئة</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>
            ))}
          </select>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitBtn} disabled={loading}>
          {loading ? '⏳...' : isEdit ? '💾 حفظ التعديلات' : '➕ إضافة السؤال'}
        </button>
      </form>
    </div>
  );
}

// ─── Bulk Import Modal ────────────────────────────────────────────────────────
function BulkModal({ categories, onDone, onClose }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [defaultCat, setDefaultCat] = useState('');
  const [defaultDiff, setDefaultDiff] = useState('medium');

  // Expected JSON format: array of question objects
  const placeholder = `[
  {
    "question": "ما عاصمة المملكة العربية السعودية؟",
    "option_a": "الرياض",
    "option_b": "جدة",
    "option_c": "مكة",
    "option_d": "الدمام",
    "correct_answer": "A",
    "difficulty": "easy",
    "points": 10
  }
]`;

  async function handleImport() {
    setError('');
    let parsed;
    try {
      parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('يجب أن يكون المحتوى مصفوفة JSON');
    } catch (e) {
      return setError('صيغة JSON غير صحيحة: ' + e.message);
    }
    // Apply defaults
    const enriched = parsed.map(q => ({
      difficulty: defaultDiff,
      points: 10,
      category_id: defaultCat || undefined,
      ...q,
    }));
    setLoading(true);
    try {
      await api.questions.bulkImport(enriched);
      onDone();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ maxWidth: '600px' }} dir="rtl">
        <div className={styles.modalHeader}>
          <h2>📦 استيراد أسئلة (JSON)</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.row3}>
          <div className={styles.col}>
            <label className={styles.label}>الفئة الافتراضية</label>
            <select className={styles.select} value={defaultCat} onChange={e => setDefaultCat(e.target.value)}>
              <option value="">بدون فئة</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>)}
            </select>
          </div>
          <div className={styles.col}>
            <label className={styles.label}>الصعوبة الافتراضية</label>
            <select className={styles.select} value={defaultDiff} onChange={e => setDefaultDiff(e.target.value)}>
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
          </div>
        </div>

        <label className={styles.label}>محتوى JSON</label>
        <textarea
          className={styles.textarea}
          rows={12}
          placeholder={placeholder}
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ fontFamily: 'monospace', fontSize: '0.8rem', direction: 'ltr' }}
        />

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitBtn} disabled={loading} onClick={handleImport}>
          {loading ? '⏳ جارٍ الاستيراد...' : '📥 استيراد'}
        </button>
      </div>
    </div>
  );
}

// ─── Main AdminPage ───────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState('questions'); // 'questions' | 'categories'

  // Categories state
  const [categories, setCategories] = useState([]);

  // Questions state
  const [questions, setQuestions] = useState([]);
  const [qLoading, setQLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  // Modals
  const [editQ, setEditQ] = useState(null);         // question being edited (or true = new)
  const [showBulk, setShowBulk] = useState(false);
  const [editCat, setEditCat] = useState(null);     // category being edited (or true = new)
  const [newCatName, setNewCatName] = useState('');
  const [catError, setCatError] = useState('');

  // Load categories
  const loadCats = useCallback(async () => {
    try {
      const data = await api.categories.list();
      setCategories(data.categories || data || []);
    } catch {}
  }, []);

  // Load questions
  const loadQs = useCallback(async () => {
    setQLoading(true);
    try {
      const params = {};
      if (filterCat)  params.category_id = filterCat;
      if (filterDiff) params.difficulty   = filterDiff;
      if (search)     params.search       = search;
      const data = await api.questions.list(params);
      setQuestions(data.questions || data || []);
      setPage(1);
    } catch {
      setQuestions([]);
    } finally {
      setQLoading(false);
    }
  }, [filterCat, filterDiff, search]);

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { loadQs(); }, [loadQs]);

  // Pagination
  const totalPages = Math.ceil(questions.length / PER_PAGE);
  const paginated  = questions.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Question CRUD
  async function saveQuestion(form) {
    if (form.id) {
      await api.questions.update(form.id, form);
    } else {
      await api.questions.create(form);
    }
    await loadQs();
  }

  async function deleteQuestion(id) {
    if (!window.confirm('حذف هذا السؤال؟')) return;
    await api.questions.delete(id);
    await loadQs();
  }

  // ── Category CRUD
  async function saveCategory(e) {
    e.preventDefault();
    setCatError('');
    if (!newCatName.trim()) return setCatError('أدخل اسم الفئة');
    try {
      if (editCat && editCat.id) {
        await api.categories.update(editCat.id, { name_ar: newCatName, name: newCatName });
      } else {
        await api.categories.create({ name_ar: newCatName, name: newCatName });
      }
      setNewCatName('');
      setEditCat(null);
      await loadCats();
    } catch (err) {
      setCatError(err.message);
    }
  }

  async function deleteCategory(id) {
    if (!window.confirm('حذف هذه الفئة؟ سيتم إلغاء ارتباط أسئلتها.')) return;
    await api.categories.delete(id);
    await loadCats();
  }

  // ── Questions Tab ──────────────────────────────────────────────────────────
  const QuestionsTab = (
    <div className={styles.tabContent}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="🔍 بحث في الأسئلة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          dir="rtl"
        />
        <select className={styles.filterSelect} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">كل الفئات</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar || c.name}</option>)}
        </select>
        <select className={styles.filterSelect} value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
          <option value="">كل الصعوبات</option>
          <option value="easy">سهل</option>
          <option value="medium">متوسط</option>
          <option value="hard">صعب</option>
        </select>
        <button className={styles.addBtn} onClick={() => setEditQ({})}>➕ سؤال جديد</button>
        <button className={styles.importBtn} onClick={() => setShowBulk(true)}>📦 استيراد JSON</button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <span>{questions.length} سؤال إجمالاً</span>
        {filterCat && <span>• فئة محددة</span>}
        {filterDiff && <span>• {filterDiff === 'easy' ? 'سهل' : filterDiff === 'medium' ? 'متوسط' : 'صعب'}</span>}
      </div>

      {/* Table */}
      {qLoading ? (
        <div className={styles.loadingMsg}>⏳ جارٍ التحميل...</div>
      ) : paginated.length === 0 ? (
        <div className={styles.emptyMsg}>لا توجد أسئلة بهذه المعايير</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>السؤال</th>
                <th>الصعوبة</th>
                <th>الفئة</th>
                <th>النقاط</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((q, i) => {
                const cat = categories.find(c => c.id === q.category_id);
                return (
                  <tr key={q.id}>
                    <td className={styles.numCell}>{(page-1)*PER_PAGE + i + 1}</td>
                    <td className={styles.qCell}>{q.question}</td>
                    <td><DiffBadge diff={q.difficulty} /></td>
                    <td className={styles.catCell}>{cat?.name_ar || cat?.name || '—'}</td>
                    <td className={styles.numCell}>{q.points || 10}</td>
                    <td className={styles.actionsCell}>
                      <button className={styles.editBtn} onClick={() => setEditQ(q)}>✏</button>
                      <button className={styles.deleteBtn} onClick={() => deleteQuestion(q.id)}>🗑</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}
    </div>
  );

  // ── Categories Tab ─────────────────────────────────────────────────────────
  const CategoriesTab = (
    <div className={styles.tabContent}>
      <form className={styles.catForm} onSubmit={saveCategory} dir="rtl">
        <input
          className={styles.input}
          placeholder="اسم الفئة الجديدة..."
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
        />
        {catError && <p className={styles.error}>{catError}</p>}
        <button className={styles.addBtn} type="submit">
          {editCat?.id ? '💾 حفظ' : '➕ إضافة فئة'}
        </button>
        {editCat?.id && (
          <button type="button" className={styles.cancelBtn} onClick={() => { setEditCat(null); setNewCatName(''); }}>
            إلغاء
          </button>
        )}
      </form>

      <div className={styles.catList}>
        {categories.length === 0 ? (
          <div className={styles.emptyMsg}>لا توجد فئات</div>
        ) : categories.map(c => {
          const count = questions.filter(q => q.category_id === c.id).length;
          return (
            <div key={c.id} className={styles.catItem}>
              <div className={styles.catInfo}>
                <span className={styles.catName}>{c.name_ar || c.name}</span>
                <span className={styles.catCount}>{count} سؤال</span>
              </div>
              <div className={styles.catActions}>
                <button className={styles.editBtn} onClick={() => { setEditCat(c); setNewCatName(c.name_ar || c.name); }}>✏</button>
                <button className={styles.deleteBtn} onClick={() => deleteCategory(c.id)}>🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={styles.page} dir="rtl">
      <header className={styles.header}>
        <h1 className={styles.title}>⚙ لوحة الإدارة</h1>
        <a href="/" className={styles.backLink}>← العودة للرئيسية</a>
      </header>

      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${tab === 'questions' ? styles.tabActive : ''}`}
          onClick={() => setTab('questions')}
        >
          📝 الأسئلة ({questions.length})
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'categories' ? styles.tabActive : ''}`}
          onClick={() => setTab('categories')}
        >
          📂 الفئات ({categories.length})
        </button>
      </div>

      {tab === 'questions' ? QuestionsTab : CategoriesTab}

      {/* Question Modal */}
      {editQ !== null && (
        <QuestionModal
          initial={editQ?.id ? editQ : null}
          categories={categories}
          onSave={saveQuestion}
          onClose={() => setEditQ(null)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulk && (
        <BulkModal
          categories={categories}
          onDone={loadQs}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
}
