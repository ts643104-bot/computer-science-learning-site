import { auth, db } from "./firebase-config.js"
import { createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const $ = (id) => document.getElementById(id)

const notify = (el, text, kind = "ok") => {
  if (!text) {
    el.className = "rg-msg"
    el.textContent = ""
    return
  }
  el.textContent = text
  el.className = `rg-msg on ${kind === "err" ? "err" : "ok"}`
}

const showMsg = (text, kind = "ok") => notify($("formMsg"), text, kind)

const setLoading = (loading) => {
  const btn = $("submitBtn")
  btn.disabled = loading
  btn.textContent = loading ? "جاري إرسال الطلب…" : "فعّل حسابي وابدأ"
}

const normalizeEmail = (input) => {
  const value = String(input || "").toLowerCase().trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ""
}

const isValidName = (name) => {
  const trimmed = String(name || "").trim()
  if (trimmed.length < 3) return false
  if (trimmed.length > 24) return false
  if (!/^[\u0600-\u06FFa-zA-Z0-9_.\- ]+$/.test(trimmed)) return false
  return true
}

const authError = (err) => {
  const code = err && err.code
  if (code === "auth/invalid-email") return "البريد الإلكتروني غير صحيح"
  if (code === "auth/missing-password") return "اكتب كلمة المرور"
  if (code === "auth/weak-password") return "كلمة المرور لازم ٦ حروف على الأقل"
  if (code === "auth/email-already-in-use") return "البريد ده مسجّل بالفعل — استخدم صفحة الدخول"
  if (code === "auth/too-many-requests") return "كثرت المحاولات، جرّب بعد شوية"
  if (code === "auth/network-request-failed") return "مش قادر أوصل للإنترنت"
  return "حصلت مشكلة. حاول مرة تانية."
}

$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault()

  showMsg("")

  const username = $("username").value.trim()
  const email = $("email").value.toLowerCase().trim()
  const password = $("password").value

  if (!isValidName(username)) {
    showMsg("اكتب اسم صحيح من 3 لـ 24 حرف.", "err")
    return
  }
  if (!email || !password) {
    showMsg("اكتب البريد الإلكتروني وكلمة المرور.", "err")
    return
  }

  const wlSnap = await getDoc(doc(db, "whitelist", email))
  if (wlSnap.exists() && wlSnap.data().isActive !== false) {
    showMsg("البريد ده مفعّل بالفعل — استخدم صفحة الدخول.", "err")
    return
  }

  setLoading(true)

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)

    await setDoc(doc(db, "pending_requests", email), {
      email,
      uid: credential.user.uid,
      username,
      status: "pending",
      requestedAt: new Date().toISOString(),
    })

    showMsg("تم إرسال طلبك بنجاح! حسابك قيد المراجعة والموافقة من قِبل الأدمن.", "ok")
    $("registerForm").reset()
    await signOut(auth)
    setTimeout(() => {
      window.location.href = "./login.html"
    }, 2000)
  } catch (err) {
    showMsg(authError(err), "err")
  } finally {
    setLoading(false)
  }
})

$("username").addEventListener("input", (event) => {
  const value = String(event.target.value || "").replace(/\s{2,}/g, " ")
  event.target.value = value
})
