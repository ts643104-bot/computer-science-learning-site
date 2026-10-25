import { db } from "./firebase-config.js"
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

const notify = (el, text, kind = "ok") => {
  if (!text) {
    el.className = "ad-msg"
    el.textContent = ""
    return
  }
  el.textContent = text
  el.className = `ad-msg on ${kind === "err" ? "err" : "ok"}`
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

const userRef = (uid) => doc(db, "users", uid)
const whitelistDoc = (email) => doc(db, "whitelist", email)
const pendingDoc = (email) => doc(db, "pending_requests", email)

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
              `<td>${escapeHtml(user.username || "—")}</td>` +
              `<td class="ad-mono">${escapeHtml(user.email || "—")}</td>` +
              `<td><span class="ad-pill">${escapeHtml(user.role)}</span></td>` +
              `<td class="ad-mono" style="color:#86efac">${user.score}</td>` +
              `<td><span class="ad-pill ${user.role === "admin" ? "g" : "s"}">${escapeHtml(user.role)}</span></td>` +
              '<td><div class="ad-actions">' +
              `<button class="ad-mini d" data-user-delete="${escapeHtml(user.id)}">حذف</button>` +
              "</div></td></tr>"
          )
          .join("")
      : '<tr><td colspan="7" class="ad-empty">لا يوجد مستخدمين لسه</td></tr>'
  } catch (err) {
    notify($("panelMsg"), err.message, "err")
  }
}

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

loadDashboard()
