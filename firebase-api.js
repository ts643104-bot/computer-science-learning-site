import { auth, db } from "./firebase-config.js"
import { signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  where,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js"

const TOKEN_KEY = "swn-token-v1"
let installed = false

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

const makeError = (message, code, status) => {
  const error = new Error(message)
  error.code = code
  error.status = status
  return error
}

const getAuthenticatedUser = async () => {
  const user = auth.currentUser
  if (!user) throw makeError("سجّل الدخول بالبريد الإلكتروني أولًا.", "UNAUTHENTICATED", 401)

  localStorage.setItem(TOKEN_KEY, await user.getIdToken())
  return user
}

const getUserProfile = async (user) => {
  const snapshot = await getDoc(doc(db, "users", user.uid))
  if (!snapshot.exists()) {
    throw makeError("ملف الطالب غير موجود. سجّل الدخول من صفحة الطلاب مرة أخرى.", "PROFILE_NOT_FOUND", 404)
  }

  const data = snapshot.data()
  return {
    id: user.uid,
    email: user.email,
    username: data.username || user.email?.split("@")[0] || "طالب",
    role: data.role || "student",
    score: Number(data.score) || 0,
  }
}

const readBody = (init) => {
  if (!init?.body) return {}
  let body
  try {
    body = JSON.parse(init.body)
  } catch {
    throw makeError("بيانات الطلب غير صالحة.", "INVALID_JSON", 400)
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw makeError("بيانات الطلب غير صالحة.", "INVALID_JSON", 400)
  }
  return body
}

const isValidLessonId = (lessonId) =>
  typeof lessonId === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(lessonId)

const progressRef = (uid, lessonId) => doc(db, "progress", `${uid}_${lessonId}`)

const getProgress = async (user) => {
  const [snapshot, profile] = await Promise.all([
    getDocs(query(collection(db, "progress"), where("uid", "==", user.uid))),
    getUserProfile(user),
  ])
  const progress = snapshot.docs
    .map((entry) => entry.data())
    .filter((entry) => entry.completed === true && isValidLessonId(entry.lessonId))
    .map((entry) => entry.lessonId)

  return { progress, score: profile.score, rank: null }
}

const completeLesson = async (user, body) => {
  if (!isValidLessonId(body.lessonId)) {
    throw makeError("معرّف الدرس غير صالح.", "INVALID_LESSON_ID", 400)
  }

  const reference = progressRef(user.uid, body.lessonId)
  const result = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(reference)
    if (snapshot.exists() && snapshot.data().completed === true) return { already: true }

    transaction.set(reference, {
      uid: user.uid,
      lessonId: body.lessonId,
      completed: true,
      completedAt: new Date().toISOString(),
    }, { merge: true })
    return { already: false }
  })
  const profile = await getUserProfile(user)

  return { ...result, added: 0, score: profile.score, rank: null }
}

const removeLesson = async (user, lessonId) => {
  if (!isValidLessonId(lessonId)) {
    throw makeError("معرّف الدرس غير صالح.", "INVALID_LESSON_ID", 400)
  }

  await deleteDoc(progressRef(user.uid, lessonId))
  const profile = await getUserProfile(user)
  return { score: profile.score, rank: null }
}

const saveQuiz = async (user, body) => {
  if (!isValidLessonId(body.lessonId)
    || !Number.isInteger(body.correct)
    || !Number.isInteger(body.total)
    || body.total < 1
    || body.correct < 0
    || body.correct > body.total) {
    throw makeError("بيانات نتيجة الاختبار غير صالحة.", "INVALID_QUIZ_RESULT", 400)
  }

  await setDoc(progressRef(user.uid, body.lessonId), {
    uid: user.uid,
    lessonId: body.lessonId,
    quizCorrect: body.correct,
    quizTotal: body.total,
    quizSubmittedAt: new Date().toISOString(),
  }, { merge: true })

  const profile = await getUserProfile(user)
  return {
    added: 0,
    perfect: body.correct === body.total,
    score: profile.score,
    rank: null,
  }
}

const handleApiRequest = async (url, method, init) => {
  const path = url.pathname.replace(/\/+$/, "") || "/"

  try {
    if (path === "/auth/logout" && method === "POST") {
      await signOut(auth)
      localStorage.removeItem(TOKEN_KEY)
      return jsonResponse({ ok: true })
    }

    if (path === "/auth/login" || path === "/auth/register" || path === "/auth/check-phone") {
      return jsonResponse({
        error: "استخدم نموذج تسجيل الطلاب بالبريد الإلكتروني وكلمة المرور.",
        code: "EMAIL_AUTH_REQUIRED",
      }, 405)
    }

    const user = await getAuthenticatedUser()

    if (path === "/auth/me" && method === "GET") {
      return jsonResponse({ user: await getUserProfile(user) })
    }

    if (path === "/progress" && method === "GET") {
      return jsonResponse(await getProgress(user))
    }

    if (path === "/progress/complete" && method === "POST") {
      return jsonResponse(await completeLesson(user, readBody(init)))
    }

    if (path.startsWith("/progress/complete/") && method === "DELETE") {
      const lessonId = decodeURIComponent(path.slice("/progress/complete/".length))
      return jsonResponse(await removeLesson(user, lessonId))
    }

    if (path === "/progress/quiz" && method === "POST") {
      return jsonResponse(await saveQuiz(user, readBody(init)))
    }

    return jsonResponse({ error: "المسار غير مدعوم.", code: "NOT_FOUND" }, 404)
  } catch (error) {
    const status = error.status || (error.code === "permission-denied" ? 403 : 500)
    const message = error.code === "permission-denied"
      ? "Firebase رفض العملية. انشر قواعد Firestore المحدّثة."
      : error.message || "تعذر إكمال طلب Firebase."
    return jsonResponse({ error: message, code: error.code || "FIREBASE_ERROR" }, status)
  }
}

export const setLegacyAuthToken = async (user) => {
  localStorage.setItem(TOKEN_KEY, await user.getIdToken())
}

export const clearLegacyAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

export const installFirebaseApiBridge = () => {
  if (installed) return
  installed = true

  const originalFetch = window.fetch.bind(window)
  window.fetch = (input, init = {}) => {
    const requestUrl = typeof input === "string" || input instanceof URL ? input : input.url
    const url = new URL(requestUrl, window.location.href)
    if (url.origin !== window.location.origin) return originalFetch(input, init)

    const path = url.pathname.replace(/\/+$/, "") || "/"
    const isLegacyApi =
      path.startsWith("/progress")
      || path === "/auth/me"
      || path === "/auth/logout"
      || path === "/auth/login"
      || path === "/auth/register"
      || path === "/auth/check-phone"
    if (!isLegacyApi) return originalFetch(input, init)

    const request = input instanceof Request ? input : null
    const method = String(init.method || request?.method || "GET").toUpperCase()
    return handleApiRequest(url, method, init)
  }
}
