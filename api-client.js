const API_URL =
  'https://script.google.com/macros/s/AKfycbzKGAvn_26J6Rz1UpsgkhnFLzhatT_uQ4i4siUQyPgjjdA8wEDvK5ir5LT6L5Qm0nlipA/exec'

const API_KEY = 'A3-SHABAKA-WA-3OLOOM-2026'
const TELEGRAM_URL = 'https://t.me/a3Taha'
const TOKEN_KEY = 'swn-token-v1'

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch (err) {
    return ''
  }
}

const saveToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch (err) {
    /* التخزين مقفول في المتصفح */
  }
}

const request = (action, payload = {}) => {
  const body = { ...payload, action, apiKey: API_KEY, token: payload.token || readToken() }

  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  })
    .then((res) => res.text())
    .then((text) => {
      let data
      try {
        data = JSON.parse(text)
      } catch (err) {
        throw new Error('السيرفر مش بيرد صح. اتأكد إن الـ Web App منشور للعامة.')
      }

      if (data && data.ok === false) {
        const error = new Error(data.error || 'حصل خطأ غير معروف')
        error.code = data.code
        error.telegram = data.telegram
        throw error
      }

      return data
    })
    .catch((err) => {
      if (err instanceof TypeError) {
        throw new Error('مش قادر أوصل للسيرفر. اتأكد من الإنترنت وجرّب تاني.')
      }
      throw err
    })
}

const requestViaGet = (action, params) => {
  const query = new URLSearchParams({ action, apiKey: API_KEY, ...(params || {}) })
  return fetch(`${API_URL}?${query}`, { redirect: 'follow' })
    .then((res) => res.text())
    .then((text) => JSON.parse(text))
}

const withToken = (promise) =>
  promise.then((data) => {
    if (data.token) saveToken(data.token)
    return data
  })

const Api = {
  ping: () => request('ping'),

  checkPhone: (phone) => request('checkPhone', { phone }),

  register: (phone, username, password) =>
    withToken(request('register', { phone, username, password })),

  login: (phone, password) => withToken(request('login', { phone, password })),

  logout: () => {
    saveToken('')
    return Promise.resolve({ ok: true })
  },

  me: () => {
    if (!readToken()) return Promise.reject(new Error('لازم تسجّل دخول الأول'))
    return request('me')
  },

  isAdmin: () =>
    Api.me()
      .then((data) => !!(data.user && data.user.role === 'admin'))
      .catch(() => false),

  updateScore: (score) => request('updateScore', { score }),

  completeLesson: (lessonId) => request('completeLesson', { lessonId }),

  submitQuiz: (lessonId, correct, total) => request('quiz', { lessonId, correct, total }),

  getProgress: () => request('getProgress'),

  addComment: (lessonId, rating, comment) =>
    request('addComment', { lessonId, rating, comment: comment || '' }),

  getComments: (lessonId) => requestViaGet('getComments', lessonId ? { lessonId } : null),

  adminOverview: () => request('adminOverview'),

  getWhitelist: () => request('getWhitelist'),

  addToWhitelist: (phones, label) => request('addToWhitelist', { phones, label: label || '' }),

  toggleWhitelist: (phone, isActive) =>
    request('toggleWhitelist', { phone, is_active: isActive ? 1 : 0 }),

  deleteWhitelist: (phone) => request('deleteWhitelist', { phone }),

  getUsers: () => request('getUsers'),

  updateUser: (id, changes) => request('updateUser', { id, ...changes }),

  deleteUser: (id) => request('deleteUser', { id }),
}

window.Api = Api
window.TELEGRAM_URL = TELEGRAM_URL
