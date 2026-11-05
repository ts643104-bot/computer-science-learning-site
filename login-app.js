import { auth, db, persistAuthSession } from "./firebase-config.js"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"
import {
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"
import {
  clearLegacyAuthToken,
  installFirebaseApiBridge,
  setLegacyAuthToken,
} from "./firebase-api.js"

const $ = (id) => document.getElementById(id)
installFirebaseApiBridge()

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

let mode = "login"

const setMode = (next) => {
  mode = next
  $("tabLogin").classList.toggle("on", mode === "login")
  $("tabRegister").classList.toggle("on", mode === "register")
  $("modeHelp").textContent =
    mode === "register"
      ? "أنشئ حسابك بالبريد الإلكتروني وكلمة المرور. بعد التسجيل، حسابك يحتاج موافقة الأدمن قبل الدخول."
      : "اكتب بريدك الإلكتروني وكلمة المرور للدخول. لو مش مسجّل قبل كده، أنشئ حساب جديد وطلبك هيتم مراجعته من الأدمن."
  $("submitBtn").textContent = mode === "register" ? "إرسال طلب الحساب" : "دخول"
  showMsg("")
}

$("tabLogin").addEventListener("click", () => setMode("login"))
$("tabRegister").addEventListener("click", () => setMode("register"))

const setLoading = (loading, mode) => {
  const btn = $("submitBtn")
  btn.disabled = loading
  btn.textContent = loading ? "جاري الإرسال…" : mode === "register" ? "إرسال طلب الحساب" : "دخول"
}

const checkWhitelist = async (email) => {
  const snap = await getDoc(doc(db, "whitelist", email))
  if (!snap.exists()) return { allowed: false }
  const data = snap.data()
  return { allowed: data.isActive !== false, entry: data }
}

const checkPending = async (email) => {
  const snap = await getDoc(doc(db, "pending_requests", email))
  return snap.exists()
}

const setStudentRole = async (uid, email) => {
  const userRef = doc(db, "users", uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) {
    await setDoc(userRef, {
      email,
      username: email.split("@")[0],
      role: "student",
      score: 0,
      createdAt: new Date().toISOString(),
    })
  }
}

const enterPlatform = async (user) => {
  const email = normalizeEmail(user.email)
  await setStudentRole(user.uid, email)
  await setLegacyAuthToken(user)
  sessionStorage.setItem("shabaka-student", email)
  $("authShell").classList.add("lg-hidden")
  $("root").classList.remove("lg-hidden")
  $("site-footer").classList.remove("lg-hidden")
  const root = $("root")
  root.replaceChildren()
  const loadingMessage = document.createElement("p")
  loadingMessage.className =
    "grid min-h-[50vh] place-items-center px-5 text-center text-slate-300"
  loadingMessage.textContent = "بيتم تحميل الدروس، لحظة واحدة..."
  root.appendChild(loadingMessage)
  const bundle = document.createElement("script")
  bundle.type = "module"
  bundle.src = "./assets/index-lesson-voice-egyptian-v2.js"
  bundle.onerror = () => {
    root.replaceChildren()
    root.classList.add("lg-hidden")
    $("site-footer").classList.add("lg-hidden")
    $("authShell").classList.remove("lg-hidden")
    showMsg("تعذر تحميل الدروس. افحص اتصال الإنترنت ثم أعد تسجيل الدخول.", "err")
  }
  document.body.appendChild(bundle)
}

const authError = (err) => {
  const code = err && err.code
  if (code === "auth/invalid-email") return "البريد الإلكتروني غير صحيح"
  if (code === "auth/missing-password") return "اكتب كلمة المرور"
  if (code === "auth/weak-password") return "كلمة المرور لازم ٦ حروف على الأقل"
  if (code === "auth/email-already-in-use") return "البريد ده مسجّل بالفعل — استخدم زر دخول"
  if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password")
    return "البريد الإلكتروني أو كلمة المرور غلط"
  if (code === "auth/too-many-requests") return "كثرت المحاولات، جرّب بعد شوية"
  if (code === "auth/network-request-failed")
    return "تعذر الاتصال بخدمة تسجيل الدخول. افحص الإنترنت أو VPN/مانع الإعلانات، وتأكد من السماح باتصالات Firebase ثم أعد المحاولة."
  if (code === "auth/unauthorized-domain")
    return "عنوان الموقع غير معتمد في Firebase Authentication → Settings → Authorized domains."
  if (code === "auth/operation-not-allowed")
    return "تسجيل البريد وكلمة المرور غير مفعّل في إعدادات Firebase Authentication."
  if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid")
    return "إعدادات Firebase غير صحيحة. راجع firebase-config.js."
  if (code === "permission-denied" || code === "firestore/permission-denied")
    return "Firebase رفض العملية — تأكد من نشر قواعد Firestore الموجودة في firestore.rules."
  if (code === "unavailable" || code === "firestore/unavailable")
    return "خدمة Firebase غير متاحة حاليًا. حاول مرة أخرى."
  return "حصلت مشكلة. جرب تاني."
}

const handleLogin = async (email, password) => {
  let credential
  try {
    await persistAuthSession()
    credential = await signInWithEmailAndPassword(auth, email, password)
  } catch (err) {
    showMsg(authError(err), "err")
    return
  }

  const emailLower = email.toLowerCase().trim()
  const wl = await checkWhitelist(emailLower)

  if (!wl.allowed) {
    await setDoc(doc(db, "pending_requests", emailLower), {
      email: emailLower,
      uid: credential.user.uid,
      status: "pending",
      requestedAt: new Date().toISOString(),
    }, { merge: true })
    await signOut(auth)
    clearLegacyAuthToken()
    showMsg("طلبك قيد المراجعة والموافقة من الأدمن.", "err")
    return
  }

  await enterPlatform(credential.user)
}

const handleRegister = async (email, password) => {
  const emailLower = email.toLowerCase().trim()

  const wl = await checkWhitelist(emailLower)
  if (wl.allowed) {
    showMsg("البريد ده مفعّل بالفعل — استخدم زر دخول.", "err")
    return
  }

  if (await checkPending(emailLower)) {
    showMsg("طلبك قيد المراجعة بالفعل وموافق عليه من الأدمن.", "err")
    return
  }

  let credential
  try {
    await persistAuthSession()
    credential = await createUserWithEmailAndPassword(auth, emailLower, password)
  } catch (err) {
    showMsg(authError(err), "err")
    return
  }

  await setDoc(doc(db, "pending_requests", emailLower), {
    email: emailLower,
    uid: credential.user.uid,
    status: "pending",
    requestedAt: new Date().toISOString(),
  })

  await signOut(auth)
  clearLegacyAuthToken()
  setMode("login")
  showMsg("تم إرسال طلبك. حسابك يحتاج موافقة الأدمن قبل الدخول.", "ok")
}

$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault()
  const email = $("email").value.trim()
  const password = $("password").value
  if (!email || !password) {
    showMsg("اكتب البريد الإلكتروني وكلمة المرور", "err")
    return
  }
  setLoading(true, mode)
  try {
    const run = mode === "register" ? handleRegister : handleLogin
    await run(email, password)
  } catch (err) {
    try {
      if (auth.currentUser) await signOut(auth)
      clearLegacyAuthToken()
    } catch (signOutError) {
      showMsg(`تعذر إنهاء جلسة الدخول: ${signOutError.message || "حاول مرة أخرى."}`, "err")
      return
    }
    showMsg(authError(err), "err")
  } finally {
    setLoading(false, mode)
  }
})

const checkExistingSession = async () => {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })
}

const init = async () => {
  const user = await checkExistingSession()
  if (user) {
    const email = normalizeEmail(user.email)
    try {
      if (await checkWhitelist(email)) {
        await enterPlatform(user)
      } else {
        await signOut(auth)
        clearLegacyAuthToken()
        showMsg("حسابك لم يتم الموافقة عليه بعد — بانتظار مراجعة الأدمن.", "err")
      }
    } catch (err) {
      try {
        if (auth.currentUser) await signOut(auth)
        clearLegacyAuthToken()
      } catch (signOutError) {
        showMsg(`تعذر إنهاء جلسة الدخول: ${signOutError.message || "حاول مرة أخرى."}`, "err")
        return
      }
      showMsg(authError(err), "err")
    }
  }
}

init()
