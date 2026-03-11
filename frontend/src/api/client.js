const BASE = '/api'

async function request(method, path, body, extraHeaders = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  }
  if (body !== undefined && body !== null) {
    opts.body = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, opts)

  if (res.status === 204) return null

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // For 401 on non-auth endpoints, dispatch unauthorized event (session expired)
    if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
    const msg = data?.detail || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

function withPin(method, path, body, pin) {
  const headers = pin ? { 'X-Parent-PIN': pin } : {}
  return request(method, path, body, headers)
}

export const api = {
  auth: {
    register: (data) => request('POST', '/auth/register', data),
    login: (data) => request('POST', '/auth/login', data),
    logout: () => request('POST', '/auth/logout'),
    me: () => request('GET', '/auth/me'),
  },
  children: {
    list: () => request('GET', '/children'),
    create: (data, pin) => withPin('POST', '/children', data, pin),
    get: (id) => request('GET', `/children/${id}`),
    update: (id, data, pin) => withPin('PUT', `/children/${id}`, data, pin),
    delete: (id, pin) => withPin('DELETE', `/children/${id}`, null, pin),
    reorder: (childIds, pin) => withPin('PUT', '/children/reorder', { child_ids: childIds }, pin),
  },
  chores: {
    list: (params) => request('GET', '/chores' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data, pin) => withPin('POST', '/chores', data, pin),
    get: (id) => request('GET', `/chores/${id}`),
    update: (id, data, pin) => withPin('PUT', `/chores/${id}`, data, pin),
    delete: (id, pin) => withPin('DELETE', `/chores/${id}`, null, pin),
    templates: () => request('GET', '/chore-templates'),
    childDaily: (childId) => request('GET', `/chores/child/${childId}/daily`),
    childWeekly: (childId) => request('GET', `/chores/child/${childId}/weekly`),
  },
  completions: {
    complete: (data) => request('POST', '/completions', data),
    undo: (id, pin) => withPin('DELETE', `/completions/${id}`, null, pin),
    list: (childId, params) => request('GET', `/completions/child/${childId}` + (params ? '?' + new URLSearchParams(params) : '')),
  },
  piggyBank: {
    balance: (childId) => request('GET', `/piggy-bank/${childId}/balance`),
    transactions: (childId, params) => request('GET', `/piggy-bank/${childId}/transactions` + (params ? '?' + new URLSearchParams(params) : '')),
    cashOut: (data, pin) => withPin('POST', '/piggy-bank/cash-out', data, pin),
    adjust: (data, pin) => withPin('POST', '/piggy-bank/adjust', data, pin),
  },
  targets: {
    get: (childId) => request('GET', `/targets/child/${childId}`),
    create: (data, pin) => withPin('POST', '/targets', data, pin),
    update: (id, data, pin) => withPin('PUT', `/targets/${id}`, data, pin),
    achieve: (id, pin) => withPin('POST', `/targets/${id}/achieve`, null, pin),
    delete: (id, pin) => withPin('DELETE', `/targets/${id}`, null, pin),
  },
  dashboard: {
    child: (childId) => request('GET', `/dashboard/child/${childId}`),
    parent: (pin) => withPin('GET', '/dashboard/parent', null, pin),
    stats: (params, pin) => withPin('GET', '/dashboard/stats' + (params ? '?' + new URLSearchParams(params) : ''), null, pin),
    calendar: (childId, month) => request('GET', `/dashboard/child/${childId}/calendar?month=${month}`),
  },
  settings: {
    setPin: (data) => request('POST', '/settings/pin/set', data),
    verifyPin: (data) => request('POST', '/settings/pin/verify', data),
    updateAccount: (data, pin) => withPin('PUT', '/settings/account', data, pin),
    changePassword: (data, pin) => withPin('POST', '/settings/change-password', data, pin),
    getReminders: () => request('GET', '/settings/reminders'),
    updateReminders: (data, pin) => withPin('PUT', '/settings/reminders', data, pin),
  },
}
