﻿import './api-client.js'

const $ = (id) => document.getElementById(id)

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const formatDate = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
  } catch (err) {
    return '—'
  }
}

const notify = (el, text, kind = 'ok') => {
  el.textContent = text
  el.className = `ad-msg on ${kind === 'err' ? 'err' : 'ok'}`
  if (text) setTimeout(() => (el.className = 'ad-msg'), 40)
}

const showLogin = () => {
  $('loginView').classList.remove('ad-hidden')
  $('panelView').classList.add('ad-hidden')
  $('permLockView').classList.add('ad-hidden')
}

const showPanel = () => {
  $('loginView').classList.add('ad-hidden')
  $('panelView').classList.remove('ad-hidden')
  $('permLockView').classList.add('ad-hidden')
}

const showPermLock = () => {
  $('loginView').classList.add('ad-hidden')
  $('panelView').classList.add('ad-hidden')
  $('permLockView').classList.remove('ad-hidden')
}

const showIdentity = (user) => {
  const phone = user.phonePretty || user.phone || ''
  $('whoAmI').textContent = `${user.username || 'أدمن'} — ${phone}`
}

const LOCK_KEY = 'admin-lock-v2'
const PERM_LOCK_SENTINEL = 'admin-permlock-v1'
const MAX_ATTEMPTS = 2
const LOCK_MS = 24 * 60 * 60 * 1000

const emptyLock = () => ({ attempts: 0, until: 0 })

const readLock = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCK_KEY) || 'null')
    if (!saved || typeof saved !== 'object') return emptyLock()
    if (saved.until && saved.until > Date.now()) return saved
    if (saved.until && saved.until <= Date.now()) return emptyLock()
    return { attempts: Number(saved.attempts) || 0, until: 0 }
  } catch (err) {
    return emptyLock()
  }
}

const writeLock = (state) => {
  try {
    localStorage.setItem(LOCK_KEY, JSON.stringify(state))
  } catch (err) {}
}

const clearLock = () => {
  try {
    localStorage.removeItem(LOCK_KEY)
  } catch (err) {}
}

const isPermLocked = () => {
  try {
    return localStorage.getItem(PERM_LOCK_SENTINEL) === '1'
  } catch (err) {
    return false
  }
}

const setPermLock = () => {
  try {
    localStorage.setItem(PERM_LOCK_SENTINEL, '1')
  } catch (err) {}
}

const isLocked = (state) => state.until > Date.now()

const timeLeftText = (until) => {
  const ms = until - Date.now()
  if (ms <= 0) return 'منتهي'
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.ceil((ms % 3600000) / 60000)
  if (hours <= 0) return `${minutes} دقيقة`
  return `${hours} ساعة و${minutes} دقيقة`
}

const lockMessage = (state) => {
  if (isLocked(state)) {
    return `تم قفل الدخول لمدة ٢٤ ساعة. الباقي: ${timeLeftText(state.until)}.`
  }
  const left = MAX_ATTEMPTS - (state.attempts || 0)
  if (left > 0 && left < MAX_ATTEMPTS) {
    return `الباسورد غلط. فاضل لك ${left} محاولة قبل القفل ٢٤ ساعة.`
  }
  return ''
}

const applyLockState = () => {
  if (isPermLocked()) {
    $('phone').disabled = true
    $('password').disabled = true
    $('loginBtn').disabled = true
    $('loginMsg').textContent = 'القفل الدائم للوحة التحكم. جرّب جهازًا آخر.'
    showPermLock()
    return true
  }

  const state = readLock()
  const locked = isLocked(state)

  $('phone').disabled = locked
  $('password').disabled = locked
  $('loginBtn').disabled = locked
  $('loginBtn').textContent = locked ? 'مقفول ٢٤ ساعة' : 'دخول للوحة التحكم'

  if (locked) notify($('loginMsg'), lockMessage(state), 'err')

  return locked
}

const loadDashboard = async () => {
  try {
    const [overview, whitelist, users] = await Promise.all([
      Api.adminOverview(),
      Api.getWhitelist(),
      Api.getUsers(),
    ])

    renderOverview(overview)
    renderWhitelist(whitelist.items || [])
    renderUsers(users.items || [])
  } catch (err) {
    if (err.code === 'UNAUTHORIZED' || err.code === 'FORBIDDEN') {
      Api.logout()
      showLogin()
      notify($('loginMsg'), 'انتهت الجلسة، سجّل دخول تاني', 'err')
      return
    }
    notify($('panelMsg'), err.message, 'err')
  }
}

const renderOverview = (data) => {
  $('stStudents').textContent = data.users ?? 0
  $('stAdmins').textContent = data.admins ?? 0
  $('stWhitelist').textContent = data.whitelisted ?? 0
  $('stPending').textContent = data.pending ?? 0
  $('stCompletions').textContent = data.completions ?? 0
  $('stAttempts').textContent = data.attempts ?? 0

  const leaders = data.top || []
  $('topBody').innerHTML = leaders.length
    ? leaders
        .map(
          (row, index) =>
            `<tr><td class="ad-mono">${index + 1}</td><td>${escapeHtml(row.username)}</td>` +
            `<td class="ad-mono" style="color:#86efac">${row.score}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="3" class="ad-empty">لا يوجد طلاب لسه</td></tr>'

  const recent = data.recent || []
  $('recentBody').innerHTML = recent.length
    ? recent
        .map(
          (row) =>
            `<tr><td>${escapeHtml(row.username)}</td>` +
            `<td class="ad-mono" style="direction:ltr">${escapeHtml(row.lesson_id)}</td>` +
            `<td style="white-space:nowrap">${formatDate(row.completed_at)}</td></tr>`
        )
        .join('')
    : '<tr><td colspan="3" class="ad-empty">لا يوجد نشاط لسه</td></tr>'
}

const renderWhitelist = (items) => {
  $('wlCount').textContent = items.length

  $('wlBody').innerHTML = items.length
    ? items
        .map((item) => {
          const stateClass = item.is_active ? 'g' : 'r'
          const stateText = item.is_active ? 'مفعّل' : 'موقوف'
          const owner = item.username
            ? `<span class="ad-pill s">${escapeHtml(item.username)}</span>`
            : '<span class="ad-pill a">لم يسجّل</span>'

          return (
            `<tr><td class="ad-mono">${escapeHtml(item.phone)}</td>` +
            `<td><span class="ad-pill ${stateClass}">${stateText}</span></td>` +
            `<td>${owner}</td>` +
            '<td><div class="ad-actions">' +
            `<button class="ad-mini" data-whitelist-toggle="${escapeHtml(item.phone)}" ` +
            `data-whitelist-active="${item.is_active ? '1' : '0'}">` +
            `${item.is_active ? 'إيقاف' : 'تفعيل'}</button>` +
            `<button class="ad-mini d" data-whitelist-delete="${escapeHtml(item.phone)}">حذف</button>` +
            '</div></td></tr>'
          )
        })
        .join('')
    : '<tr><td colspan="4" class="ad-empty">لا يوجد أرقام مسموحة لسه</td></tr>'
}

const renderUsers = (items) => {
  $('usCount').textContent = items.length

  $('usBody').innerHTML = items.length
    ? items
        .map(
          (user) =>
            `<tr><td class="ad-mono">${user.id}</td>` +
            `<td>${escapeHtml(user.username)}</td>` +
            `<td class="ad-mono">${escapeHtml(user.phone)}</td>` +
            `<td><span class="ad-pill">${escapeHtml(user.rank)}</span></td>` +
            `<td class="ad-mono" style="color:#86efac">${user.score}</td>` +
            `<td class="ad-mono">${user.lessonsDone}</td>` +
            `<td class="ad-mono">${user.attempts}</td>` +
            `<td><span class="ad-pill ${user.role === 'admin' ? 'g' : 's'}">${escapeHtml(user.role)}</span></td>` +
            '<td><div class="ad-actions">' +
            `<button class="ad-mini" data-user-edit="${user.id}">تعديل</button>` +
            `<button class="ad-mini d" data-user-delete="${user.id}">حذف</button>` +
            '</div></td></tr>'
        )
        .join('')
    : '<tr><td colspan="9" class="ad-empty">لا يوجد مستخدمين لسه</td></tr>'
}

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault()

  if (isPermLocked()) {
    showPermLock()
    return
  }

  if (applyLockState()) return

  const button = $('loginBtn')
  button.disabled = true
  button.textContent = 'جاري الدخول…'

  try {
    const data = await Api.adminLogin($('phone').value.trim(), $('password').value)

    if (!data.user || data.user.role !== 'admin') {
      throw new Error('الحساب ده مش حساب أدمن')
    }

    clearLock()
    $('password').value = ''
    showPanel()
    showIdentity(data.user)
    loadDashboard()
  } catch (err) {
    const state = readLock()
    const attempts = (state.attempts || 0) + 1

    if (attempts >= MAX_ATTEMPTS) {
      setPermLock()
      showPermLock()
      return
    }

    if (attempts === 1) {
      const locked = { attempts, until: Date.now() + LOCK_MS }
      writeLock(locked)
      notify($('loginMsg'), lockMessage(locked), 'err')
    } else {
      const next = { attempts, until: 0 }
      writeLock(next)
      notify($('loginMsg'), lockMessage(next), 'err')
    }
  } finally {
    applyLockState()
  }
})

$('logoutBtn').addEventListener('click', () => {
  Api.logout()
  showLogin()
  notify($('loginMsg'), 'تم تسجيل الخروج', 'ok')
})

document.querySelectorAll('.ad-tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.ad-tab').forEach((item) => item.classList.remove('on'))
    document.querySelectorAll('.ad-panel').forEach((panel) => panel.classList.remove('on'))
    tab.classList.add('on')
    $(`tab-${tab.dataset.tab}`).classList.add('on')
  })
})

$('wlAddBtn').addEventListener('click', async () => {
  const phones = $('wlPhones').value.trim()
  if (!phones) {
    notify($('panelMsg'), 'اكتب رقم واحد على الأقل', 'err')
    return
  }

  try {
    const result = await Api.addToWhitelist(phones, $('wlLabel').value.trim())

    let summary = `تم إضافة ${result.count} رقم`
    if (result.invalid && result.invalid.length) {
      summary += ` — أرقام غير صحيحة: ${result.invalid.join('، ')}`
    }

    notify($('panelMsg'), summary, 'ok')
    $('wlPhones').value = ''
    $('wlLabel').value = ''
    loadDashboard()
  } catch (err) {
    notify($('panelMsg'), err.message, 'err')
  }
})

document.addEventListener('click', async (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  const togglePhone = target.dataset.whitelistToggle
  if (togglePhone) {
    const nextState = target.dataset.whitelistActive === '1' ? 0 : 1
    try {
      await Api.toggleWhitelist(togglePhone, nextState)
      loadDashboard()
    } catch (err) {
      notify($('panelMsg'), err.message, 'err')
    }
  }

  const removePhone = target.dataset.whitelistDelete
  if (removePhone) {
    if (!confirm(`متأكد إنك عايز تحذف الرقم ${removePhone}؟`)) return

    try {
      await Api.deleteWhitelist(removePhone)
      notify($('panelMsg'), 'تم حذف الرقم', 'ok')
      loadDashboard()
    } catch (err) {
      notify($('panelMsg'), err.message, 'err')
    }
  }
})

document.addEventListener('click', async (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  const editId = target.dataset.userEdit
  if (editId) {
    const score = prompt('النقاط الجديدة (سيبه فاضي لو مش عايز تغيّر):')
    const role = prompt('الدور (اكتب admin أو student — سيبه فاضي لو مش عايز تغيّر):')

    const changes = {}
    if (score && !isNaN(Number(score))) changes.score = Number(score)
    if (role === 'admin' || role === 'student') changes.role = role

    if (!Object.keys(changes).length) return

    try {
      await Api.updateUser(editId, changes)
      notify($('panelMsg'), 'تم تعديل بيانات المستخدم', 'ok')
      loadDashboard()
    } catch (err) {
      notify($('panelMsg'), err.message, 'err')
    }
  }

  const removeId = target.dataset.userDelete
  if (removeId) {
    if (!confirm(`متأكد إنك عايز تحذف المستخدم رقم ${removeId}؟ ده مش هيرجع!`)) return

    try {
      await Api.deleteUser(removeId)
      notify($('panelMsg'), 'تم حذف المستخدم', 'ok')
      loadDashboard()
    } catch (err) {
      notify($('panelMsg'), err.message, 'err')
    }
  }
})

const start = async () => {
  if (isPermLocked()) {
    showPermLock()
    return
  }

  if (applyLockState()) return

  try {
    const data = await Api.me()
    if (!data.user || data.user.role !== 'admin') {
      showLogin()
      return
    }

    clearLock()
    showPanel()
    showIdentity(data.user)
    loadDashboard()
  } catch (err) {
    showLogin()
  }
}

showLogin()
applyLockState()
start()
