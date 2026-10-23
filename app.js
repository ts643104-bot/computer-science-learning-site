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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const $ = (id) => document.getElementById(id)

const notify = (el, text, kind = "ok") => {
  if (!text) {
    el.className = "lg-msg"
    el.textContent = ""
    return
  }
  el.textContent = text
  el.className = `lg-msg on ${kind === "err" ? "err" : "ok"}`
}

const showMsg = (text, kind = "ok") => notify($("formMsg"), text, kind)

const setLoading = (loading, mode) => {
  const btn = $("submitBtn")
  btn.disabled = loading
  btn.textContent = loading
    ? "جاري الإرسال…"
    : mode === "register"
      ? "إرسال طلب الحساب"
      : "دخول"
}

let mode = "login"

const setMode = (next) => {
  mode = next
  $("tabLogin").classList.toggle("on", mode === "login")
  $("tabRegister").classList.toggle("on", mode === "register")
  $("nameField").classList.toggle("lg-hidden", mode === "login")
  $("username").required = mode === "register"
  $("password").autocomplete = mode === "register" ? "new-password" : "current-password"
  $("modeHelp").textContent =
    mode === "register"
      ? "اكتب اسمك وبريدك الإلكتروني وكلمة المرور، وطلبك هيُرسل للأدمن للمراجعة والموافقة."
      : "اكتب بريدك الإلكتروني وكلمة المرور للدخول إلى المنصة."
  $("submitBtn").textContent = mode === "register" ? "إرسال طلب الحساب" : "دخول"
  showMsg("")
}

$("tabLogin").addEventListener("click", () => setMode("login"))
$("tabRegister").addEventListener("click", () => setMode("register"))

const normalizeEmail = (input) => {
  const value = String(input || "").toLowerCase().trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : ""
}

const authError = (err) => {
  const code = err && err.code
  if (code === "auth/invalid-email") return "البريد الإلكتروني غير صحيح"
  if (code === "auth/missing-password") return "اكتب كلمة المرور"
  if (code === "auth/weak-password") return "كلمة المرور لازم ٦ حروف على الأقل"
  if (code === "auth/email-already-in-use") return "البريد ده مسجّل بالفعل — استخدم زر تسجيل الدخول"
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password")
    return "البريد الإلكتروني أو كلمة المرور غلط"
  if (code === "auth/too-many-requests") return "كثرت المحاولات، جرّب بعد شوية"
  if (code === "auth/network-request-failed") return "مش قادر أوصل للإنترنت"
  return "حصلت مشكلة. حاول مرة تانية."
}

const isWhitelisted = async (email) => {
  const snap = await getDoc(doc(db, "whitelist", email))
  if (!snap.exists()) return false
  return snap.data().isActive !== false
}

const enterPlatform = async (user) => {
  const email = normalizeEmail(user.email)
  const userRef = doc(db, "users", user.uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    await setDoc(userRef, {
      email,
      username: $("username").value.trim() || email.split("@")[0],
      role: "student",
      score: 0,
      createdAt: new Date().toISOString(),
    })
  }
  await signOut(auth)
  sessionStorage.setItem("shabaka-student", email)
  $("authShell").classList.add("lg-hidden")
  $("root").classList.remove("lg-hidden")
  $("site-footer").classList.remove("lg-hidden")
  const bundle = document.createElement("script")
  bundle.type = "module"
  bundle.src = "./assets/index-ChB4Ky_W.js"
  document.body.appendChild(bundle)
}

const handleRegister = async (email, password) => {
  const emailLower = normalizeEmail(email)

  let credential
  try {
    credential = await createUserWithEmailAndPassword(auth, emailLower, password)
  } catch (err) {
    showMsg(authError(err), "err")
    return
  }

  try {
    await setDoc(doc(db, "pending_requests", emailLower), {
      email: emailLower,
      uid: credential.user.uid,
      username: $("username").value.trim(),
      status: "pending",
      requestedAt: new Date().toISOString(),
    })
  } catch (err) {
    showMsg(authError(err), "err")
    await signOut(auth)
    return
  }

  await signOut(auth)
  showMsg("تم إرسال طلبك للأدمن، بانتظار الموافقة للدخول", "ok")
  $("authForm").reset()
  setMode("login")
}

const handleLogin = async (email, password) => {
  const emailLower = normalizeEmail(email)

  let credential
  try {
    credential = await signInWithEmailAndPassword(auth, emailLower, password)
  } catch (err) {
    showMsg(authError(err), "err")
    return
  }

  if (!(await isWhitelisted(emailLower))) {
    await signOut(auth)
    showMsg("حسابك لم يتم الموافقة عليه بعد — بانتظار مراجعة الأدمن.", "err")
    return
  }

  await enterPlatform(credential.user)
}

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault()

  const email = $("email").value.trim()
  const password = $("password").value
  const username = $("username").value.trim()

  if (mode === "register" && username.length < 3) {
    showMsg("اكتب اسمك (3 حروف على الأقل)", "err")
    return
  }
  if (!email || !password) {
    showMsg("اكتب البريد الإلكتروني وكلمة المرور", "err")
    return
  }

  setLoading(true, mode)
  const run = mode === "register" ? handleRegister : handleLogin
  await run(email, password)
  setLoading(false, mode)
})
