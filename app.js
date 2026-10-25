// المنصة مفتوحة بدون تسجيل دخول

const BLOCKED = /#\/(login|register)/i

const stripBlocked = () => {
  if (window.location.hash && BLOCKED.test(window.location.hash)) {
    window.location.replace("#/")
  }
}

stripBlocked()
window.addEventListener("hashchange", stripBlocked)

const isBlockedUrl = (url) => typeof url === "string" && BLOCKED.test(url)

const _push = window.history.pushState.bind(window.history)
window.history.pushState = function (...args) {
  if (isBlockedUrl(args[2])) args[2] = "#/"
  return _push(...args)
}

const _replace = window.history.replaceState.bind(window.history)
window.history.replaceState = function (...args) {
  if (isBlockedUrl(args[2])) args[2] = "#/"
  return _replace(...args)
}

// بعتبر الجميع مسجلين — كل الحصص مفتوحة
const FAKE = { token: "open-access-v1", user: { username: "طالب", score: 0, isAdmin: true, role: "admin" } }
try {
  localStorage.setItem("swn-token-v1", FAKE.token)
} catch (e) {}

// استبدال fetch لطلبات API الداخلية — بيرجع استجابات محلية بدل السيرفر
const _fetch = window.fetch.bind(window)
window.fetch = function (input, init) {
  try {
    const url = typeof input === "string" ? input : input && input.url ? input.url : ""
    const api = new URL(url, window.location.href)
    if (
      api.origin === window.location.origin &&
      /\/(auth|progress|users|whitelist|admin|stats|rank)\b/.test(api.pathname)
    ) {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    }
  } catch (e) {}
  return _fetch(input, init)
}

const loadPlatform = () => {
  const bundle = document.createElement("script")
  bundle.type = "module"
  bundle.src = "./assets/index-ChB4Ky_W.js"
  document.body.appendChild(bundle)
}

loadPlatform()
