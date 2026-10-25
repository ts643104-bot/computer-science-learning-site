// المنصة مفتوحة بدون تسجيل دخول — أي محاولة فتح صفحات login/register بتترجع للرئيسية

const BLOCKED = /^#?\/?#?\/(login|register)/i

const stripBlocked = () => {
  if (window.location.hash && /#\/(login|register)/i.test(window.location.hash)) {
    window.location.replace("#/")
    return true
  }
  return false
}

// اشيل الهاش الممنوع قبل تحميل التطبيق
stripBlocked()

// واعترض أي تنقّل جوه التطبيق لصفحات الدخول
window.addEventListener("hashchange", stripBlocked)

const isBlockedUrl = (url) => typeof url === "string" && /#\/(login|register)/i.test(url)

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

const loadPlatform = () => {
  const bundle = document.createElement("script")
  bundle.type = "module"
  bundle.src = "./assets/index-ChB4Ky_W.js"
  document.body.appendChild(bundle)
}

loadPlatform()
