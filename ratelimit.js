// ============================================================
// ratelimit.js — حد بسيط لمحاولات الدخول (من غير مكتبات خارجية)
// ============================================================
// بنخزّن محاولات الدخول الفاشلة في الميموري حسب مفتاح (الـ IP + الرقم).
// الهدف: نقفل أي حد بيجرّب باسوردات كتير بسرعة (brute-force).
// ملاحظة: دا محلول لميموري واحد — لو شغّلت أكتر من نسخة من السيرفر
// لازم تتحوّل لتخزين مشترك (Redis مثلاً).

const WINDOW_MS = 15 * 60 * 1000 // نافذة ١٥ دقيقة
const MAX_ATTEMPTS = 5 // بعد ٥ محاولات فاشلة نقفل

const buckets = new Map()

function keyOf(req, suffix = '') {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown'
  return `${ip}|${suffix}`
}

// بنشيل البكتشات القديمة كل شوية عشان الميموري ما يتخنقش
function sweep(now) {
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k)
  }
}

/**
 * نسجّل محاولة فاشلة. لو عدّينا الحد، بيرجّع الوقت المتبقي بالثواني، وإلا null.
 */
function registerFailure(req, suffix) {
  const now = Date.now()
  sweep(now)
  const key = keyOf(req, suffix)
  let b = buckets.get(key)
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + WINDOW_MS }
    buckets.set(key, b)
  }
  b.count += 1
  if (b.count >= MAX_ATTEMPTS) {
    return Math.ceil((b.resetAt - now) / 1000)
  }
  return null
}

/**
 * هل المفتاح مقفول دلوقتي؟ لو أيوه بيرجّع الوقت المتبقي بالثواني، وإلا null.
 */
function isLocked(req, suffix) {
  const now = Date.now()
  const b = buckets.get(keyOf(req, suffix))
  if (b && b.count >= MAX_ATTEMPTS && b.resetAt > now) {
    return Math.ceil((b.resetAt - now) / 1000)
  }
  return null
}

/**
 * لو الدخول نجح، بنصفّر العدّاد.
 */
function reset(req, suffix) {
  buckets.delete(keyOf(req, suffix))
}

/**
 * Express middleware جاهز — يمنع المحاولة قبل ما توصل للـ route.
 */
function guard(suffix, message) {
  return function (req, res, next) {
    const retry = isLocked(req, suffix)
    if (retry) {
      res.set('Retry-After', String(retry))
      return res.status(429).json({
        error: message || `جرّبت كتير أوي. استنى ${Math.ceil(retry / 60)} دقيقة وجرّب تاني.`,
        code: 'TOO_MANY_ATTEMPTS',
        retryAfter: retry,
      })
    }
    next()
  }
}

module.exports = { registerFailure, isLocked, reset, guard, MAX_ATTEMPTS, WINDOW_MS }
