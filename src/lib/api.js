// src/lib/api.js — اوجد الكنز Frontend API Client

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
  return data;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessionsAPI = {
  // List public active sessions (homepage lobby)
  listPublic: () =>
    req('/api/sessions?status=active&is_private=false'),

  // Get a session by ID (for GameControl)
  get: (id) =>
    req(`/api/sessions/${id}`),

  // Get a session by 6-digit code (for join modal)
  getByCode: (code) =>
    req(`/api/sessions/code/${code}`),

  // Create a new session (from homepage)
  create: (data) =>
    req('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title:       data.title,
        password:    data.password,
        is_private:  data.is_private  ?? false,
        max_viewers: data.max_viewers ?? 50,
      }),
    }),

  // Update session (status, current_stage, etc.)
  update: (id, password, data) =>
    req(`/api/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ password, ...data }),
    }),

  // Close (delete) a session — host exits
  close: (id, password) =>
    req(`/api/sessions/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),

  // Host heartbeat — prevents auto-close
  heartbeat: (id, password) =>
    req(`/api/sessions/${id}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // Validate session password (host login)
  validate: (id, password) =>
    req(`/api/sessions/${id}/validate`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
};

// ─── Teams ────────────────────────────────────────────────────────────────────
export const teamsAPI = {
  list: (sessionId) =>
    req(`/api/sessions/${sessionId}/teams`),

  create: (sessionId, data) =>
    req(`/api/sessions/${sessionId}/teams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (sessionId, teamId, data) =>
    req(`/api/sessions/${sessionId}/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (sessionId, teamId) =>
    req(`/api/sessions/${sessionId}/teams/${teamId}`, { method: 'DELETE' }),

  // Award or deduct points
  addPoints: (sessionId, teamId, points) =>
    req(`/api/sessions/${sessionId}/teams/${teamId}/points`, {
      method: 'POST',
      body: JSON.stringify({ points }),
    }),
};

// ─── Questions ───────────────────────────────────────────────────────────────
export const questionsAPI = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return req(`/api/questions${qs ? '?' + qs : ''}`);
  },

  get: (id) => req(`/api/questions/${id}`),

  // Get random questions for a stage
  random: ({ count = 10, category_id, difficulty } = {}) => {
    const p = new URLSearchParams({ count });
    if (category_id) p.set('category_id', category_id);
    if (difficulty)  p.set('difficulty', difficulty);
    return req(`/api/questions/random?${p}`);
  },

  create: (data) =>
    req('/api/questions', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    req(`/api/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) =>
    req(`/api/questions/${id}`, { method: 'DELETE' }),

  bulkImport: (questions) =>
    req('/api/questions/bulk', { method: 'POST', body: JSON.stringify({ questions }) }),
};

// ─── Categories ──────────────────────────────────────────────────────────────
export const categoriesAPI = {
  list: () => req('/api/categories'),

  create: (data) =>
    req('/api/categories', { method: 'POST', body: JSON.stringify(data) }),

  update: (id, data) =>
    req(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id) =>
    req(`/api/categories/${id}`, { method: 'DELETE' }),
};

// ─── Viewers (presence) ───────────────────────────────────────────────────────
export const viewersAPI = {
  // Register a viewer (call on page load)
  join: (sessionId, viewerId) =>
    req(`/api/sessions/${sessionId}/viewers`, {
      method: 'POST',
      body: JSON.stringify({ viewer_id: viewerId }),
    }),

  // Ping to stay alive (call every 30s)
  ping: (sessionId, viewerId) =>
    req(`/api/sessions/${sessionId}/viewers/${viewerId}/ping`, {
      method: 'POST',
    }),

  // Get viewer count
  count: (sessionId) =>
    req(`/api/sessions/${sessionId}/viewers/count`),

  // Leave (call on beforeunload)
  leave: (sessionId, viewerId) =>
    req(`/api/sessions/${sessionId}/viewers/${viewerId}`, {
      method: 'DELETE',
    }),
};

// ─── Utility ──────────────────────────────────────────────────────────────────

// Generate a random viewer ID (stored in sessionStorage)
export function getViewerId() {
  try {
    let id = sessionStorage.getItem('viewer_id');
    if (!id) {
      id = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem('viewer_id', id);
    }
    return id;
  } catch {
    return 'v_' + Math.random().toString(36).slice(2, 10);
  }
}
