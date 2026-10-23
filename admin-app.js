import { auth, db } from "./firebase-config.js"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const $ = (id) => document.getElementById(id)

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)

const notify = (el, text, kind = "ok") => {
  if (!text) {
    el.className = "ad-msg"
    el.textContent = ""
    return
  }
  el.textContent = text
  el.className = `ad-msg on ${kind === "err" ? "err" : "ok"}`
}

const showLogin = () => {
  $("loginView").classList.remove("ad-hidden")
  $("panelView").classList.add("ad-hidden")
  $("bootstrapView").classList.add("ad-hidden")
}

const showPanel = () => {
  $("loginView").classList.add("ad-hidden")
  $("panelView").classList.remove("ad-hidden")
  $("bootstrapView").classList.add("ad-hidden")
}

const showBootstrap = () => {
  $("loginView").classList.add("ad-hidden")
  $("panelView").classList.add("ad-hidden")
  $("bootstrapView").classList.remove("ad-hidden")
}

const showIdentity = (user) => {
  $("whoAmI").textContent = `${user.username || "أدمن"} — ${user.email || ""}`
}

const LOCK_KEY = "admin-lock-v2"
const MAX_ATTEMPTS = 3
const LOCK_MS = 24 * 60 * 60 * 1000

const emptyLock = () => ({ attempts: 0, until: 0 })

const readLock = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCK_KEY) || "null")
    if (!saved || typeof saved !== "object") return emptyLock()
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

const isLocked = (state) => state.until > Date.now()

const timeLeftText = (until) => {
  const ms = until - Date.now()
  if (ms <= 0) return "منتهي"
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours <= 0) return `${minutes} دقيقة`
  return `${hours} ساعة و${minutes} دقيقة`
}

const lockMessage = (state) => {
  if (isLocked(state)) {
    return `تم قفل الدخول لمدة ٢٤ ساعة. الباقي: ${timeLeftText(state.until)}.`
  }
  const left = MAX_ATTEMPTS - (state.attempts || 0)
  if (left > 0) {
    return `الباسورد غلط. فاضل لك ${left} محاولة قبل القفل.`
  }
  return ""
}

const applyLockState = () => {
  const state = readLock()
  const locked = isLocked(state)

  $("email").disabled = locked
  $("password").disabled = locked
  $("loginBtn").disabled = locked

  if (locked) {
    $("loginBtn").textContent = "مقفول 24 ساعة"
    notify($("loginMsg"), lockMessage(state), "err")
  } else if (state.attempts > 0 && !locked) {
    $("loginBtn").textContent = "دخول للوحة التحكم"
    notify($("loginMsg"), lockMessage(state), "err")
  } else {
    $("loginBtn").textContent = "دخول للوحة التحكم"
    notify($("loginMsg"), "")
  }

  return locked
}

const normalizeEmail = (input) => {
  const value = String(input || "").toLowerCase().trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ""
}

const fail = (message, code) => {
  const error = new Error(message)
  if (code) error.code = code
  throw error
}

const authError = (err) => {
  const code = err && err.code
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
    fail("البريد الإلكتروني أو كلمة المرور غلط", "BAD_CREDENTIALS")
  }
  if (code === "auth/email-already-in-use") fail("الحساب ده موجود بالفعل", "EMAIL_TAKEN")
  if (code === "auth/weak-password") fail("كلمة المرور لازم ٦ حروف على الأقل", "BAD_PASSWORD")
  if (code === "auth/network-request-failed") fail("مش قادر أوصل للإنترنت", "NETWORK")
  if (code === "auth/too-many-requests") fail("كثرت المحاولات، جرّب بعد شوية", "RATE")
  if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid") {
    fail("مفاتيح Firebase غير صحيحة", "CONFIG")
  }
  fail((err && err.message) || "حصل خطأ غير متوقع", code)
}

const userRef = (uid) => doc(db, "users", uid)
const whitelistDoc = (email) => doc(db, "whitelist", email)
const pendingDoc = (email) => doc(db, "pending_requests", email)

const readUser = async (uid) => {
  if (!uid) return null
  const snap = await getDoc(userRef(uid))
  return snap.exists() ? { uid, ...snap.data() } : null
}

const publicUser = (data) => {
  if (!data) return null
  return {
    id: data.uid,
    email: data.email,
    username: data.username,
    role: data.role || "student",
    score: Number(data.score) || 0,
  }
}

const countAdmins = async () => {
  const snap = await getDocs(collection(db, "users"))
  return snap.docs.filter((entry) => entry.data().role === "admin").length
}

const adminLogin = async (email, password) => {
  const clean = normalizeEmail(email)
  if (!clean || !password) fail("اكتب البريد الإلكتروني وكلمة المرور", "MISSING")

  let credential = null
  try {
    credential = await signInWithEmailAndPassword(auth, clean, password)
  } catch (err) {
    const code = err && err.code
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      const admins = await countAdmins().catch(() => 0)
      if (!admins) {
        fail("مفيش أي حساب أدمن في النظام — أنشئ واحد من شاشة الإعداد.", "NO_ADMIN")
      }
    }
    authError(err)
  }

  const data = await readUser(credential.user.uid)
  if (!data || data.role !== "admin") {
    await signOut(auth)
    fail("الحساب ده مش حساب أدمن", "FORBIDDEN")
  }

  await setDoc(userRef(credential.user.uid), { lastLogin: new Date().toISOString() }, { merge: true }).catch(() => {})

  return { ok: true, user: publicUser(data) }
}

const bootstrapAdmin = async (email, password) => {
  const clean = normalizeEmail(email)
  if (!clean || !password) fail("اكتب البريد الإلكتروني وكلمة المرور", "MISSING")
  if (password.length < 6) fail("كلمة المرور لازم ٦ حروف على الأقل", "BAD_PASSWORD")

  let credential = null
  try {
    credential = await createUserWithEmailAndPassword(auth, clean, password)
  } catch (err) {
    if (err.code === "auth/email-already-in-use") {
      try {
        credential = await signInWithEmailAndPassword(auth, clean, password)
      } catch (loginErr) {
        authError(loginErr)
      }
    } else {
      authError(err)
    }
  }

  const uid = credential.user.uid
  await setDoc(userRef(uid), {
    email: clean,
    username: "admin",
    role: "admin",
    score: 0,
    createdAt: new Date().toISOString(),
  }, { merge: true })

  return { ok: true, user: publicUser({ uid, email: clean, username: "admin", role: "admin", score: 0 }) }
}

const adminOverview = async () => {
  const [usersSnap, whitelistSnap, progressSnap, pendingSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "whitelist")),
    getDocs(collection(db, "progress")),
    getDocs(collection(db, "pending_requests")),
  ])

  const users = usersSnap.docs.map((entry) => ({ uid: entry.id, ...entry.data() }))
  const whitelist = whitelistSnap.docs.map((entry) => ({ id: entry.id, ...entry.data() }))

  const students = users.filter((user) => user.role === "student")
  const active = whitelist.filter((entry) => entry.isActive !== false)

  return {
    users: students.length,
    admins: users.length - students.length,
    whitelisted: active.length,
    pending: pendingSnap.size,
    completions: progressSnap.size,
  }
}

const getWhitelist = async () => {
  const [whitelistSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, "whitelist")),
    getDocs(collection(db, "users")),
  ])

  const users = usersSnap.docs.map((entry) => entry.data())

  const items = whitelistSnap.docs.map((entry) => {
    const data = entry.data()
    const owner = users.find((user) => user.email === data.email)
    return {
      email: data.email,
      label: data.label || "",
      is_active: data.isActive === false ? 0 : 1,
      username: owner ? owner.username : null,
    }
  })

  return { items }
}

const addToWhitelist = async (emails, label) => {
  const list = String(emails || "")
    .split(/[\n,،;]+/)
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean)

  if (!list.length) fail("اكتب إيميل واحد على الأقل", "BAD_EMAIL")

  const now = new Date().toISOString()
  for (const email of list) {
    await setDoc(
      whitelistDoc(email),
      { email, label: label || "", isActive: true, createdAt: now },
      { merge: true }
    )
  }

  return { count: list.length }
}

const toggleWhitelist = async (email, isActive) => {
  const clean = normalizeEmail(email)
  if (!clean) fail("إيميل غير صحيح", "BAD_EMAIL")
  await setDoc(whitelistDoc(clean), { isActive: Boolean(isActive) }, { merge: true })
  return { ok: true }
}

const deleteWhitelist = async (email) => {
  const clean = normalizeEmail(email)
  if (!clean) fail("إيميل غير صحيح", "BAD_EMAIL")
  await deleteDoc(whitelistDoc(clean))
  return { ok: true }
}

const getUsers = async () => {
  const usersSnap = await getDocs(collection(db, "users"))
  const items = usersSnap.docs.map((entry) => {
    const user = entry.data()
    return {
      id: entry.id,
      username: user.username,
      email: user.email,
      role: user.role || "student",
      score: Number(user.score) || 0,
      rank: "—",
    }
  })
  items.sort((a, b) => b.score - a.score)
  return { items }
}

const deleteUser = async (id) => {
  if (!id) fail("مستخدم غير صحيح", "BAD_USER")
  await deleteDoc(userRef(id))
  return { ok: true }
}

const getPendingRequests = async () => {
  const snap = await getDocs(collection(db, "pending_requests"))
  return {
    items: snap.docs.map((entry) => ({ email: entry.id, ...entry.data() })),
  }
}

const approveRequest = async (email) => {
  const clean = normalizeEmail(email)
  if (!clean) fail("إيميل غير صحيح", "BAD_EMAIL")

  const pendingSnap = await getDoc(pendingDoc(clean))
  const pendingData = pendingSnap.exists() ? pendingSnap.data() : {}

  await setDoc(
    whitelistDoc(clean),
    {
      email: clean,
      isActive: true,
      label: pendingData.username || "",
      approvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    { merge: true }
  )
  await deleteDoc(pendingDoc(clean))
  return { ok: true, email: clean, username: pendingData.username || "" }
}

const rejectRequest = async (email) => {
  const clean = normalizeEmail(email)
  if (!clean) fail("إيميل غير صحيح", "BAD_EMAIL")
  await deleteDoc(pendingDoc(clean))
  return { ok: true }
}

const loadDashboard = async () => {
  try {
    const [overview, whitelist, users, pending] = await Promise.all([
      adminOverview(),
      getWhitelist(),
      getUsers(),
      getPendingRequests(),
    ])

    $("stStudents").textContent = overview.users ?? 0
    $("stAdmins").textContent = overview.admins ?? 0
    $("stWhitelist").textContent = overview.whitelisted ?? 0
    $("stPending").textContent = overview.pending ?? 0
    $("stCompletions").textContent = overview.completions ?? 0

    $("pendingTabCount").textContent = pending.items.length
    $("pendingTabCount").classList.toggle("zero", pending.items.length === 0)

    $("pendingBody").innerHTML = pending.items.length
      ? pending.items
          .map(
            (item) =>
              `<tr><td>${escapeHtml(item.username || "—")}</td>` +
              `<td class="ad-mono">${escapeHtml(item.email)}</td>` +
              `<td>${escapeHtml(item.requestedAt ? new Date(item.requestedAt).toLocaleString("ar-EG") : "—")}</td>` +
              '<td><div class="ad-actions">' +
              `<button class="ad-mini ad-approve" data-pending-approve="${escapeHtml(item.email)}">موافقة</button>` +
              `<button class="ad-mini ad-reject" data-pending-reject="${escapeHtml(item.email)}">رفض</button>` +
              "</div></td></tr>"
          )
          .join("")
      : '<tr><td colspan="4" class="ad-empty">لا يوجد طلبات معلقة</td></tr>'

    $("wlCount").textContent = whitelist.items.length

    $("wlBody").innerHTML = whitelist.items.length
      ? whitelist.items
          .map((item) => {
            const stateClass = item.is_active ? "g" : "r"
            const stateText = item.is_active ? "مفعّل" : "موقوف"
            const owner = item.username
              ? `<span class="ad-pill s">${escapeHtml(item.username)}</span>`
              : '<span class="ad-pill a">لم يسجّل</span>'

            return (
              `<tr><td class="ad-mono">${escapeHtml(item.email)}</td>` +
              `<td><span class="ad-pill ${stateClass}">${stateText}</span></td>` +
              `<td>${owner}</td>` +
              '<td><div class="ad-actions">' +
              `<button class="ad-mini" data-whitelist-toggle="${escapeHtml(item.email)}"` +
              ` data-whitelist-active="${item.is_active ? "1" : "0"}">` +
              `${item.is_active ? "إيقاف" : "تفعيل"}</button>` +
              `<button class="ad-mini d" data-whitelist-delete="${escapeHtml(item.email)}">حذف</button>` +
              "</div></td></tr>"
            )
          })
          .join("")
      : '<tr><td colspan="4" class="ad-empty">لا يوجد إيميلات مسموحة لسه</td></tr>'

    $("usCount").textContent = users.items.length

    $("usBody").innerHTML = users.items.length
      ? users.items
          .map(
            (user, index) =>
              `<tr><td class="ad-mono">${index + 1}</td>` +
              `<td>${escapeHtml(user.username)}</td>` +
              `<td class="ad-mono">${escapeHtml(user.email)}</td>` +
              `<td><span class="ad-pill">${escapeHtml(user.role)}</span></td>` +
              `<td class="ad-mono" style="color:#86efac">${user.score}</td>` +
              `<td><span class="ad-pill ${user.role === "admin" ? "g" : "s"}">${escapeHtml(user.role)}</span></td>` +
              '<td><div class="ad-actions">' +
              `<button class="ad-mini d" data-user-delete="${user.id}">حذف</button>` +
              "</div></td></tr>"
          )
          .join("")
      : '<tr><td colspan="7" class="ad-empty">لا يوجد مستخدمين لسه</td></tr>'
  } catch (err) {
    notify($("panelMsg"), err.message, "err")
  }
}

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault()

  if (applyLockState()) return

  const email = $("email").value.trim()
  const password = $("password").value
  const button = $("loginBtn")
  button.disabled = true
  button.textContent = "جاري الدخول…"

  try {
    const data = await adminLogin(email, password)

    clearLock()
    $("password").value = ""
    notify($("loginMsg"), "")
    showPanel()
    showIdentity(data.user)
    loadDashboard()
  } catch (err) {
    if (err.code === "NO_ADMIN") {
      $("bootstrapEmail").value = email
      notify($("bootstrapMsg"), err.message, "err")
      showBootstrap()
      return
    }
    if (err.code === "NETWORK" || err.code === "RATE" || err.code === "CONFIG") {
      notify($("loginMsg"), err.message, "err")
      return
    }

    const state = readLock()
    const attempts = (state.attempts || 0) + 1

    if (attempts >= MAX_ATTEMPTS) {
      writeLock({ attempts: MAX_ATTEMPTS, until: Date.now() + LOCK_MS })
      notify($("loginMsg"), "تم استنفاد كل المحاولات. اللوحة مقفولة ٢٤ ساعة على هذا الجهاز.", "err")
    } else {
      writeLock({ attempts, until: 0 })
      notify($("loginMsg"), lockMessage({ attempts, until: 0 }), "err")
    }
  } finally {
    const state = readLock()
    const locked = isLocked(state)
    $("email").disabled = locked
    $("password").disabled = locked
    $("loginBtn").disabled = locked
    if (locked) {
      $("loginBtn").textContent = "مقفول 24 ساعة"
      notify($("loginMsg"), lockMessage(state), "err")
    } else {
      $("loginBtn").textContent = "دخول للوحة التحكم"
    }
  }
})

$("bootstrapForm").addEventListener("submit", async (event) => {
  event.preventDefault()

  const email = $("bootstrapEmail").value.trim()
  const password = $("bootstrapPassword").value
  const button = $("bootstrapBtn")

  if (!email || !password || password.length < 6) {
    notify($("bootstrapMsg"), "اكتب بريد إلكتروني وكلمة مرور لا يقل عن 6 حروف", "err")
    return
  }

  button.disabled = true
  const oldText = button.textContent
  button.textContent = "جاري الإنشاء…"

  try {
    const data = await bootstrapAdmin(email, password)

    clearLock()
    $("bootstrapPassword").value = ""
    notify($("bootstrapMsg"), "تم إنشاء حساب الأدمن بنجاح", "ok")
    showPanel()
    showIdentity(data.user)
    loadDashboard()
  } catch (err) {
    notify($("bootstrapMsg"), err.message || "فشل إنشاء الحساب", "err")
  } finally {
    button.disabled = false
    button.textContent = oldText
  }
})

$("bootstrapCancel").addEventListener("click", () => {
  showLogin()
  notify($("loginMsg"), "", "ok")
})

$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth).catch(() => {})
  showLogin()
  notify($("loginMsg"), "تم تسجيل الخروج", "ok")
})

document.querySelectorAll(".ad-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".ad-tab").forEach((item) => item.classList.remove("on"))
    document.querySelectorAll(".ad-panel").forEach((panel) => panel.classList.remove("on"))
    tab.classList.add("on")
    $(`tab-${tab.dataset.tab}`).classList.add("on")
  })
})

$("wlAddBtn").addEventListener("click", async () => {
  const emails = $("wlEmails").value.trim()
  if (!emails) {
    notify($("panelMsg"), "اكتب إيميل واحد على الأقل", "err")
    return
  }

  try {
    const result = await addToWhitelist(emails, $("wlLabel").value.trim())

    let summary = `تم إضافة ${result.count} إيميل`
    notify($("panelMsg"), summary, "ok")
    $("wlEmails").value = ""
    $("wlLabel").value = ""
    loadDashboard()
  } catch (err) {
    notify($("panelMsg"), err.message, "err")
  }
})

document.addEventListener("click", async (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  const approveEmail = target.dataset.pendingApprove
  if (approveEmail) {
    if (!confirm(`موافقة على ${approveEmail} وإضافته للـ whitelist؟`)) return
    try {
      await approveRequest(approveEmail)
      notify($("panelMsg"), `تمت الموافقة على ${approveEmail}`, "ok")
      loadDashboard()
    } catch (err) {
      notify($("panelMsg"), err.message, "err")
    }
    return
  }

  const rejectEmail = target.dataset.pendingReject
  if (rejectEmail) {
    if (!confirm(`رفض طلب ${rejectEmail}؟`)) return
    try {
      await rejectRequest(rejectEmail)
      notify($("panelMsg"), "تم رفض الطلب", "ok")
      loadDashboard()
    } catch (err) {
      notify($("panelMsg"), err.message, "err")
    }
    return
  }

  const toggleEmail = target.dataset.whitelistToggle
  if (toggleEmail) {
    const nextState = target.dataset.whitelistActive === "1" ? 0 : 1
    try {
      await toggleWhitelist(toggleEmail, nextState)
      loadDashboard()
    } catch (err) {
      notify($("panelMsg"), err.message, "err")
    }
    return
  }

  const removeEmail = target.dataset.whitelistDelete
  if (removeEmail) {
    if (!confirm(`متأكد إنك عايز تحذف ${removeEmail}؟`)) return
    try {
      await deleteWhitelist(removeEmail)
      notify($("panelMsg"), "تم حذف الإيميل", "ok")
      loadDashboard()
    } catch (err) {
      notify($("panelMsg"), err.message, "err")
    }
    return
  }

  const removeId = target.dataset.userDelete
  if (removeId) {
    if (!confirm(`متأكد إنك عايز تحذف المستخدم رقم ${removeId}؟`)) return
    try {
      await deleteUser(removeId)
      notify($("panelMsg"), "تم حذف المستخدم", "ok")
      loadDashboard()
    } catch (err) {
      notify($("panelMsg"), err.message, "err")
    }
  }
})

showLogin()
applyLockState()
