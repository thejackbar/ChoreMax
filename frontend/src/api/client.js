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
    childDaily: (childId, forDate) => request('GET', `/chores/child/${childId}/daily` + (forDate ? `?for_date=${forDate}` : '')),
    childWeekly: (childId, forDate) => request('GET', `/chores/child/${childId}/weekly` + (forDate ? `?for_date=${forDate}` : '')),
  },
  completions: {
    complete: (data) => request('POST', '/completions', data),
    undo: (id, pin) => withPin('DELETE', `/completions/${id}`, null, pin),
    list: (childId, params) => request('GET', `/completions/child/${childId}` + (params ? '?' + new URLSearchParams(params) : '')),
  },
  tokens: {
    balance: (childId) => request('GET', `/tokens/${childId}/balance`),
    transactions: (childId, params) => request('GET', `/tokens/${childId}/transactions` + (params ? '?' + new URLSearchParams(params) : '')),
    adjust: (data, pin) => withPin('POST', '/tokens/adjust', data, pin),
  },
  goals: {
    list: () => request('GET', '/goals'),
    listAll: (pin) => withPin('GET', '/goals/all', null, pin),
    create: (data, pin) => withPin('POST', '/goals', data, pin),
    update: (id, data, pin) => withPin('PUT', `/goals/${id}`, data, pin),
    delete: (id, pin) => withPin('DELETE', `/goals/${id}`, null, pin),
    redeem: (id, data, pin) => withPin('POST', `/goals/${id}/redeem`, data, pin),
    redemptions: (childId) => request('GET', `/goals/redemptions/${childId}`),
  },
  dashboard: {
    child: (childId, forDate) => request('GET', `/dashboard/child/${childId}` + (forDate ? `?for_date=${forDate}` : '')),
    familyDaily: (forDate) => request('GET', `/dashboard/family-daily` + (forDate ? `?for_date=${forDate}` : '')),
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
  meals: {
    list: (params) => request('GET', '/meals' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data, pin) => withPin('POST', '/meals', data, pin),
    get: (id) => request('GET', `/meals/${id}`),
    update: (id, data, pin) => withPin('PUT', `/meals/${id}`, data, pin),
    delete: (id, pin) => withPin('DELETE', `/meals/${id}`, null, pin),
    uploadImage: (id, file, pin) => {
      const fd = new FormData()
      fd.append('file', file)
      return fetch(`${BASE}/meals/${id}/image`, {
        method: 'POST',
        credentials: 'include',
        headers: pin ? { 'X-Parent-PIN': pin } : {},
        body: fd,
      }).then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) throw new Error(data?.detail || `Upload failed (${res.status})`)
        return data
      })
    },
  },
  mealPlans: {
    getWeek: (weekStart) => request('GET', `/meal-plans?week_start=${weekStart}`),
    addEntry: (data, pin) => withPin('POST', '/meal-plans', data, pin),
    removeEntry: (id, pin) => withPin('DELETE', `/meal-plans/${id}`, null, pin),
  },
  todos: {
    list: (params) => request('GET', '/todos' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data, pin) => withPin('POST', '/todos', data, pin),
    update: (id, data, pin) => withPin('PUT', `/todos/${id}`, data, pin),
    toggle: (id) => request('POST', `/todos/${id}/toggle`),
    delete: (id, pin) => withPin('DELETE', `/todos/${id}`, null, pin),
  },
  wishlists: {
    list: (childId) => request('GET', `/wishlists/${childId}`),
    create: (data) => request('POST', '/wishlists', data),
    update: (id, data) => request('PUT', `/wishlists/${id}`, data),
    toggle: (id, pin) => withPin('POST', `/wishlists/${id}/toggle`, null, pin),
    delete: (id, pin) => withPin('DELETE', `/wishlists/${id}`, null, pin),
  },
  shoppingList: {
    get: (weekStart) => request('GET', `/shopping-list?week_start=${weekStart}`),
    check: (data) => request('POST', '/shopping-list/check', data),
    clearChecks: (weekStart, pin) => withPin('DELETE', `/shopping-list/checks?week_start=${weekStart}`, null, pin),
  },
}
