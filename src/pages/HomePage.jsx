import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import styles from './HomePage.module.css';

// ─── API (temporary inline, will be replaced by src/lib/api.js calls) ───────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchPublicSessions() {
  try {
    const res = await fetch(`${API_BASE}/api/sessions?status=active&is_private=false`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.sessions || data || [];
  } catch { return []; }
}

async function createSession(payload) {
  const res = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('فشل إنشاء الجلسة');
  return res.json();
}

async function fetchSessionByCode(code) {
  const res = await fetch(`${API_BASE}/api/sessions/code/${code}`);
  if (!res.ok) throw new Error('الرمز غير صحيح');
  return res.json();
}

// ─── Three.js StarField Background ──────────────────────────────────────────
function StarField({ canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 5;

    // Stars
    const starsGeo = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 200;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, sizeAttenuation: true });
    scene.add(new THREE.Points(starsGeo, starsMat));

    // Nebula particles (gold/purple)
    const nebulaGeo = new THREE.BufferGeometry();
    const nCount = 400;
    const nPos = new Float32Array(nCount * 3);
    const nColors = new Float32Array(nCount * 3);
    const colors = [[0.79, 0.64, 0.15], [0.49, 0.31, 0.79], [0.18, 0.60, 0.80]];
    for (let i = 0; i < nCount; i++) {
      nPos[i * 3]     = (Math.random() - 0.5) * 60;
      nPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
      nPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
      const c = colors[Math.floor(Math.random() * colors.length)];
      nColors[i * 3] = c[0]; nColors[i * 3 + 1] = c[1]; nColors[i * 3 + 2] = c[2];
    }
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nColors, 3));
    const nebulaMat = new THREE.PointsMaterial({ size: 0.4, vertexColors: true, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(nebulaGeo, nebulaMat));

    let animId;
    let w = 0, h = 0;

    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    let t = 0;
    function animate() {
      animId = requestAnimationFrame(animate);
      t += 0.0003;
      scene.rotation.y = t * 0.3;
      scene.rotation.x = Math.sin(t) * 0.05;
      renderer.render(scene, camera);
    }
    animate();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
    };
  }, [canvasRef]);

  return null;
}

// ─── Session Card ─────────────────────────────────────────────────────────────
function SessionCard({ session, onClick }) {
  const teamCount = session.team_count || session.teams?.length || 0;
  const viewers = session.viewer_count || 0;
  const stage = session.current_stage || 1;

  return (
    <button className={styles.sessionCard} onClick={onClick} dir="rtl">
      <div className={styles.cardGlow} />
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{session.title || 'جلسة بدون اسم'}</span>
        <span className={styles.cardBadge}>نشطة</span>
      </div>
      <div className={styles.cardStats}>
        <span>👥 {teamCount} فريق</span>
        <span>🎯 المرحلة {stage}</span>
        <span>👁 {viewers} يشاهد</span>
      </div>
      <div className={styles.cardCode}>#{session.code || '------'}</div>
      <div className={styles.cardJoin}>مشاهدة ←</div>
    </button>
  );
}

// ─── Create Session Modal ────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    password: '',
    is_private: false,
    max_viewers: 50,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return setError('أدخل اسم الجلسة');
    if (!form.password.trim()) return setError('أدخل كلمة مرور الجلسة');
    setLoading(true);
    setError('');
    try {
      const result = await createSession(form);
      onCreated(result);
    } catch (err) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <form className={styles.modal} onSubmit={handleSubmit} dir="rtl">
        <div className={styles.modalHeader}>
          <h2>🚀 إنشاء جلسة جديدة</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <label className={styles.label}>اسم الجلسة</label>
        <input
          className={styles.input}
          placeholder="مثال: مسابقة الصف الثالث"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        />

        <label className={styles.label}>كلمة المرور (للمضيف)</label>
        <input
          className={styles.input}
          type="password"
          placeholder="ستُستخدم للتحكم في الجلسة"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        />

        <label className={styles.label}>الحد الأقصى للمشاهدين</label>
        <input
          className={styles.input}
          type="number"
          min="5" max="500"
          value={form.max_viewers}
          onChange={e => setForm(f => ({ ...f, max_viewers: +e.target.value }))}
        />

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.is_private}
            onChange={e => setForm(f => ({ ...f, is_private: e.target.checked }))}
          />
          <span>🔒 جلسة خاصة (يتطلب الرمز للدخول)</span>
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitBtn} disabled={loading}>
          {loading ? '⏳ جارٍ الإنشاء...' : '🎮 ابدأ الجلسة'}
        </button>
      </form>
    </div>
  );
}

// ─── Join by Code Modal ───────────────────────────────────────────────────────
function JoinModal({ onClose, onJoined }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const clean = code.replace(/\D/g, '').slice(0, 6);
    if (clean.length < 4) return setError('أدخل الرمز بشكل صحيح');
    setLoading(true);
    setError('');
    try {
      const session = await fetchSessionByCode(clean);
      onJoined(session);
    } catch (err) {
      setError('الرمز غير صحيح أو الجلسة منتهية');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <form className={styles.modal} onSubmit={handleSubmit} dir="rtl">
        <div className={styles.modalHeader}>
          <h2>🔑 الدخول برمز الجلسة</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <label className={styles.label}>رمز الجلسة (6 أرقام)</label>
        <input
          className={`${styles.input} ${styles.codeInput}`}
          placeholder="000000"
          value={code}
          maxLength={6}
          inputMode="numeric"
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          dir="ltr"
        />

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.submitBtn} disabled={loading}>
          {loading ? '⏳ جارٍ البحث...' : '🚀 دخول'}
        </button>
      </form>
    </div>
  );
}

// ─── Created Session Info Modal ───────────────────────────────────────────────
function CreatedModal({ session, onGo, onClose }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(session.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} dir="rtl">
        <div className={styles.modalHeader}>
          <h2>✅ تم إنشاء الجلسة!</h2>
        </div>

        <p className={styles.modalDesc}>احتفظ بهذه المعلومات — لن تظهر مجدداً</p>

        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>رمز الجلسة</span>
          <div className={styles.codeDisplay}>
            <span className={styles.bigCode}>{session.code}</span>
            <button className={styles.copyBtn} onClick={copy}>{copied ? '✓ تم' : 'نسخ'}</button>
          </div>
        </div>

        <div className={styles.infoBox}>
          <span className={styles.infoLabel}>كلمة المرور (احتفظ بها!)</span>
          <span className={styles.bigCode} style={{letterSpacing:'2px'}}>{session.password_hint || '••••••'}</span>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.submitBtn} onClick={onGo}>🎮 الدخول للوحة التحكم</button>
          <button className={styles.secondaryBtn} onClick={onClose}>لاحقاً</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main HomePage ────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createdSession, setCreatedSession] = useState(null);

  // Load public sessions
  useEffect(() => {
    setLoading(true);
    fetchPublicSessions().then(data => {
      setSessions(data);
      setLoading(false);
    });
    const interval = setInterval(() => {
      fetchPublicSessions().then(setSessions);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  function handleCreated(session) {
    setShowCreate(false);
    setCreatedSession(session);
  }

  function handleGoToSession(session) {
    // Go to GameControl (admin view) with the session
    navigate(`/session/${session.id}`, { state: { session, isHost: true } });
  }

  function handleJoined(session) {
    setShowJoin(false);
    navigate(`/screen/${session.id}`);
  }

  function handleWatch(session) {
    navigate(`/screen/${session.id}`);
  }

  return (
    <div className={styles.page}>
      {/* Three.js Background */}
      <canvas ref={canvasRef} className={styles.starCanvas} />
      <StarField canvasRef={canvasRef} />

      {/* Header */}
      <header className={styles.header} dir="rtl">
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🏆</span>
          <span className={styles.logoText}>اوجد الكنز</span>
        </div>
        <nav className={styles.nav}>
          <button className={styles.navBtn} onClick={() => navigate('/admin')}>⚙ الإدارة</button>
        </nav>
      </header>

      {/* Hero */}
      <section className={styles.hero} dir="rtl">
        <h1 className={styles.heroTitle}>
          <span className={styles.heroGold}>اكتشف</span> الكنز المخفي
        </h1>
        <p className={styles.heroSub}>منصة مسابقات تفاعلية — شارك أو شاهد في الوقت الحقيقي</p>
        <div className={styles.heroBtns}>
          <button className={styles.primaryBtn} onClick={() => setShowCreate(true)}>
            🚀 إنشاء جلسة جديدة
          </button>
          <button className={styles.outlineBtn} onClick={() => setShowJoin(true)}>
            🔑 الدخول برمز
          </button>
        </div>
      </section>

      {/* Sessions Grid */}
      <section className={styles.sessionsSection} dir="rtl">
        <h2 className={styles.sectionTitle}>
          🌍 الجلسات النشطة
          <span className={styles.sessionCount}>{sessions.length}</span>
        </h2>

        {loading ? (
          <div className={styles.loadingRow}>
            {[1,2,3].map(i => <div key={i} className={styles.skeletonCard} />)}
          </div>
        ) : sessions.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🌌</span>
            <p>لا توجد جلسات نشطة الآن</p>
            <p className={styles.emptyHint}>كن أول من يبدأ مسابقة!</p>
          </div>
        ) : (
          <div className={styles.sessionsGrid}>
            {sessions.map(s => (
              <SessionCard key={s.id} session={s} onClick={() => handleWatch(s)} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className={styles.footer} dir="rtl">
        <p>اوجد الكنز — منصة مسابقات تفاعلية</p>
      </footer>

      {/* Modals */}
      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}
      {showJoin && (
        <JoinModal onClose={() => setShowJoin(false)} onJoined={handleJoined} />
      )}
      {createdSession && (
        <CreatedModal
          session={createdSession}
          onGo={() => handleGoToSession(createdSession)}
          onClose={() => setCreatedSession(null)}
        />
      )}
    </div>
  );
}
