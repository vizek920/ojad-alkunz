const BASE = import.meta.env.VITE_API_URL || 'https://ojad-alkunz-api.onrender.com'

function getToken() {
  return localStorage.getItem('kanz_token') || ''
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || data.error || 'خطأ في الخادم')
  return data
}

// Auth
export const authAPI = {
  login: (password) => request('POST', '/api/auth/login', { password }),
  verify: () => request('GET', '/api/auth/verify')
}

// Categories
export const categoriesAPI = {
  list: () => request('GET', '/api/categories'),
  create: (data) => request('POST', '/api/categories', data),
  update: (id, data) => request('PUT', `/api/categories/${id}`, data),
  delete: (id) => request('DELETE', `/api/categories/${id}`)
}

// Questions
export const questionsAPI = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/api/questions${q ? '?' + q : ''}`)
  },
  forStage: (stage) => request('GET', `/api/questions/for-stage/${stage}`),
  get: (id) => request('GET', `/api/questions/${id}`),
  create: (data) => request('POST', '/api/questions', data),
  bulk: (questions) => request('POST', '/api/questions/bulk', { questions }),
  update: (id, data) => request('PUT', `/api/questions/${id}`, data),
  delete: (id) => request('DELETE', `/api/questions/${id}`)
}

// Sessions
export const sessionsAPI = {
  list: () => request('GET', '/api/sessions'),
  get: (id) => request('GET', `/api/sessions/${id}`),
  create: (data) => request('POST', '/api/sessions', data),
  updateState: (id, data) => request('PATCH', `/api/sessions/${id}/state`, data),
  updateStage: (id, stage, data) => request('PATCH', `/api/sessions/${id}/stage/${stage}`, data),
  updateTeam: (id, teamKey, data) => request('PATCH', `/api/sessions/${id}/team/${teamKey}`, data),
  delete: (id) => request('DELETE', `/api/sessions/${id}`)
}
