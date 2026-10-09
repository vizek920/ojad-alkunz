// src/components/admin/GameControlWrapper.jsx
// ─── Host authentication gate + heartbeat for GameControl ────────────────────
// Sits between App.jsx route and the actual GameControl.
// Usage in App.jsx:   <Route path="/session/:id" element={<GameControlWrapper />} />

import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import GameControl from './GameControl';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

// ─── Inline styles (no CSS module needed — minimal gate UI) ──────────────────
const gateStyle = {
  page: {
    minHeight: '100vh', background: '#07050F', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
  },
  box: {
    background: '#110E1E', border: '1px solid rgba(201,162,39,0.25)',
    borderRadius: '20px', padding: '2.5rem', width: '380px', maxWidth: '90vw',
    display: 'flex', flexDirection: 'column', gap: '1rem',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  title: { color: '#C9A227', fontSize: '1.3rem', fontWeight: '800', textAlign: 'center', margin: 0 },
  sub:   { color: '#7A6E8A', fontSize: '0.875rem', textAlign: 'center', margin: 0 },
  input: {
    background: 'rgba(7,5,15,0.6)', border: '1px solid rgba(42,32,69,0.8)',
    borderRadius: '10px', color: '#E8E2D9', padding: '0.75rem 1rem',
    fontFamily: 'inherit', fontSize: '1rem', outline: 'none',
    textAlign: 'center', letterSpacing: '3px', width: '100%', boxSizing: 'border-box',
  },
  btn: {
    background: 'linear-gradient(135deg,#C9A227,#E8C547)', color: '#07050F',
    border: 'none', padding: '0.85rem', borderRadius: '12px',
    fontFamily: 'inherit', fontSize: '1rem', fontWeight: '700',
    cursor: 'pointer', width: '100%',
  },
  errBox: {
    background: 'rgba(220,53,69,0.1)', border: '1px solid rgba(220,53,69,0.3)',
    color: '#FF6B7A', borderRadius: '8px', padding: '0.6rem 0.9rem',
    fontSize: '0.875rem', textAlign: 'center',
  },
  loading: { color: '#7A6E8A', textAlign: 'center', padding: '3rem 1rem' },
  backLink: {
    color: '#5A4E7A', fontSize: '0.8rem', textAlign: 'center',
    textDecoration: 'none', cursor: 'pointer',
  },
};

export default function GameControlWrapper() {
  const { id }      = useParams();
  const location    = useLocation();
  const navigate    = useNavigate();

  // If navigated from HomePage with isHost=true + session data, skip auth gate
  const navState    = location.state || {};
  const autoSession = navState.isHost ? navState.session : null;

  const [step, setStep] = useState(autoSession ? 'ready' : 'login'); // login | loading | ready | error
  const [password, setPassword] = useState('');
  const [session, setSession]   = useState(autoSession);
  const [error, setError]       = useState('');

  // Heartbeat ref
  const heartbeatRef = useRef(null);
  const pwRef        = useRef(password); // keep latest password in ref for heartbeat
  useEffect(() => { pwRef.current = password; }, [password]);

  // Start heartbeat once authenticated
  useEffect(() => {
    if (step !== 'ready' || !session) return;

    // Immediate first ping
    const ping = () => {
      apiFetch(`/api/sessions/${session.id}/heartbeat`, {
        method: 'POST',
        body: JSON.stringify({ password: pwRef.current }),
      }).catch(() => {}); // silent fail — no UI disruption
    };

    ping();
    heartbeatRef.current = setInterval(ping, 30_000);

    return () => clearInterval(heartbeatRef.current);
  }, [step, session]);

  // On unmount / host exits → close session
  useEffect(() => {
    return () => clearInterval(heartbeatRef.current);
  }, []);

  // ── Login form submit ──
  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setStep('loading');
    try {
      const result = await apiFetch(`/api/sessions/${id}/validate`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setSession(result.session);
      setStep('ready');
    } catch (err) {
      setError(err.message || 'كلمة المرور غير صحيحة');
      setStep('login');
    }
  }

  // ── Close session handler (passed to GameControl) ──
  async function handleCloseSession() {
    clearInterval(heartbeatRef.current);
    try {
      await apiFetch(`/api/sessions/${id}`, {
        method: 'DELETE',
        body: JSON.stringify({ password: pwRef.current }),
      });
    } catch {}
    navigate('/');
  }

  // ── Render ──
  if (step === 'loading') {
    return (
      <div style={gateStyle.page}>
        <p style={gateStyle.loading}>⏳ جارٍ التحقق...</p>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div style={gateStyle.page} dir="rtl">
        <form style={gateStyle.box} onSubmit={handleLogin}>
          <h1 style={gateStyle.title}>🎮 دخول المضيف</h1>
          <p style={gateStyle.sub}>أدخل كلمة مرور الجلسة للتحكم فيها</p>

          <input
            style={gateStyle.input}
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />

          {error && <p style={gateStyle.errBox}>{error}</p>}

          <button style={gateStyle.btn} type="submit">دخول</button>

          <a style={gateStyle.backLink} onClick={() => navigate('/')}>← العودة للرئيسية</a>
        </form>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div style={gateStyle.page} dir="rtl">
        <div style={gateStyle.box}>
          <p style={{ color: '#FF6B7A', textAlign: 'center' }}>حدث خطأ. الجلسة غير موجودة.</p>
          <button style={gateStyle.btn} onClick={() => navigate('/')}>العودة</button>
        </div>
      </div>
    );
  }

  // step === 'ready' — render the actual game control
  return (
    <GameControl
      sessionId={id}
      sessionPassword={password || navState.session?.password}
      initialSession={session}
      onClose={handleCloseSession}
    />
  );
}
