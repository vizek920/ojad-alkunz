import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

import HomePage    from './pages/HomePage';
import AdminPage   from './pages/AdminPage';
import GameControlWrapper from './components/admin/GameControlWrapper';
import BigScreenPage from './pages/BigScreenPage';

// ── Admin Auth Gate ──────────────────────────────────────────────────────────
// Only the /admin route requires the "solar" password.
// All other routes are public.
const ADMIN_PASSWORD = 'solar';

function AdminGuard({ children }) {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem('admin_authed') === '1'; } catch { return false; }
  });
  const [input, setInput] = useState('');
  const [error, setError]   = useState('');

  if (authed) return children;

  function handleSubmit(e) {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      try { sessionStorage.setItem('admin_authed', '1'); } catch {}
      setAuthed(true);
    } else {
      setError('كلمة المرور غير صحيحة');
      setInput('');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#07050F', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', sans-serif"
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#110E1E', border: '1px solid rgba(201,162,39,0.2)',
        borderRadius: '20px', padding: '2.5rem', width: '360px', maxWidth: '90vw',
        display: 'flex', flexDirection: 'column', gap: '1rem'
      }} dir="rtl">
        <h1 style={{ color: '#C9A227', margin: 0, fontSize: '1.4rem', textAlign: 'center' }}>
          ⚙ لوحة الإدارة
        </h1>
        <p style={{ color: '#7A6E8A', margin: 0, textAlign: 'center', fontSize: '0.875rem' }}>
          أدخل كلمة مرور المسؤول
        </p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="••••••"
          autoFocus
          style={{
            background: 'rgba(7,5,15,0.6)', border: '1px solid rgba(42,32,69,0.8)',
            borderRadius: '10px', color: '#E8E2D9', padding: '0.75rem 1rem',
            fontFamily: 'inherit', fontSize: '1rem', outline: 'none',
            textAlign: 'center', letterSpacing: '4px'
          }}
        />
        {error && (
          <p style={{ color: '#FF6B7A', margin: 0, textAlign: 'center', fontSize: '0.875rem' }}>
            {error}
          </p>
        )}
        <button type="submit" style={{
          background: 'linear-gradient(135deg, #C9A227, #E8C547)',
          color: '#07050F', border: 'none', padding: '0.85rem',
          borderRadius: '12px', fontFamily: 'inherit', fontSize: '1rem',
          fontWeight: '700', cursor: 'pointer'
        }}>
          دخول
        </button>
      </form>
    </div>
  );
}

// ── App Routes ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public: home lobby */}
        <Route path="/"              element={<HomePage />} />

        {/* Public: watch a session (BigScreen view) */}
        <Route path="/screen/:id"    element={<BigScreenPage />} />

        {/* Host: game control panel (comes from HomePage after creating/entering session) */}
        {/* Protected by session password inside GameControl itself */}
        <Route path="/session/:id"   element={<GameControlWrapper />} />

        {/* Admin panel: questions + categories management */}
        <Route path="/admin"         element={<AdminGuard><AdminPage /></AdminGuard>} />
        <Route path="/admin/*"       element={<AdminGuard><AdminPage /></AdminGuard>} />

        {/* Redirect old /login to home */}
        <Route path="/login"         element={<Navigate to="/" replace />} />

        {/* 404 → home */}
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
