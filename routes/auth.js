// ============================================================
// routes/auth.js — التسجيل، الدخول، الخروج، الملف الشخصي
// ============================================================
const express = require('express')
const db = require('../db')
const A = require('../auth')
const RL = require('../ratelimit')
const { progressLevel, TOTAL_LESSONS } = require('../scoring')

const router = express.Router()

// هل الرقم مسموح له؟ (بنستخدمها في صفحة التسجيل)
router.get('/check-phone', (req, res) => {
  const phone = A.normalizePhone(req.query.phone)
  if (!phone) return res.json({ valid: false, allowed: false, reason: 'رقم غير صحيح' })
  const row = db.get('SELECT phone, is_active FROM whitelist WHERE phone = ?', [phone])
  const used = db.get('SELECT id FROM users WHERE phone = ?', [phone])
  res.json({
    valid: true,
    phone,
    country: A.phoneCountry(phone),
    allowed: Boolean(row && row.is_active),
    taken: Boolean(used),
  })
})

// ---------- التسجيل ----------
router.post('/register', (req, res) => {
  const { phone: rawPhone, username, password } = req.body || {}
  const phone = A.normalizePhone(rawPhone)
  if (!phone) {
    return res.status(400).json({ error: 'اكتب رقم موبايل صحيح — مثال: 01012345678' })
  }

  const wl = db.get('SELECT phone, is_active FROM whitelist WHERE phone = ?', [phone])
  if (!wl || !wl.is_active) {
    return res.status(403).json({
      error: 'الرقم ده مش مسموح له بالدخول. كلّم الأدمن يضيفه في قائمة الأرقام المسموحة.',
      code: 'NOT_WHITELISTED',
    })
  }
  if (db.get('SELECT id FROM users WHERE phone = ?', [phone])) {
    return res.status(409).json({ error: 'الرقم ده متسجّل بالفعل — جرّب تسجيل الدخول.', code: 'PHONE_TAKEN' })
  }

  const u = A.validateUsername(username)
  if (!u.ok) return res.status(400).json({ error: u.error })
  if (db.get('SELECT id FROM users WHERE username = ?', [u.value])) {
    return res.status(409).json({ error: 'اسم المستخدم ده محجوز، اختار غيره.', code: 'USERNAME_TAKEN' })
  }
  const p = A.validatePassword(password)
  if (!p.ok) return res.status(400).json({ error: p.error })

  const now = new Date().toISOString()
  db.run(
    'INSERT INTO users (phone, username, pass_hash, role, score, created_at, last_login) VALUES (?,?,?,?,?,?,?)',
    [phone, u.value, A.hashPassword(p.value), 'student', 0, now, now]
  )
  const row = db.get('SELECT * FROM users WHERE phone = ?', [phone])
  const token = A.createSession(row.id)
  res.status(201).json({ token, user: A.publicUser(row), message: 'أهلاً بيك! حسابك اتفعّل.' })
})

// ---------- الدخول ----------
// بنحمي المسار ده من محاولات التخمين المتكررة (brute-force)
router.post('/login', RL.guard('login'), (req, res) => {
  const phone = A.normalizePhone(req.body?.phone)
  const password = String(req.body?.password || '')
  if (!phone || !password) {
    return res.status(400).json({ error: 'اكتب الرقم والباسورد' })
  }
  const row = db.get('SELECT * FROM users WHERE phone = ?', [phone])
  if (!row || !A.checkPassword(password, row.pass_hash)) {
    // محاولة فاشلة — بنسجّلها ونقول للطالب فاضل له كام محاولة
    const retry = RL.registerFailure(req, 'login')
    if (retry) {
      res.set('Retry-After', String(retry))
      return res.status(429).json({
        error: `جرّبت كتير أوي. استنى ${Math.ceil(retry / 60)} دقيقة وجرّب تاني.`,
        code: 'TOO_MANY_ATTEMPTS',
        retryAfter: retry,
      })
    }
    return res.status(401).json({ error: 'الرقم أو الباسورد غلط' })
  }
  RL.reset(req, 'login')
  const now = new Date().toISOString()
  db.run('UPDATE users SET last_login = ? WHERE id = ?', [now, row.id])
  const token = A.createSession(row.id)
  res.json({ token, user: A.publicUser({ ...row, last_login: now }) })
})

// ---------- الخروج ----------
router.post('/logout', (req, res) => {
  A.destroySession(A.tokenFrom(req))
  res.json({ ok: true })
})

// ---------- بياناتي أنا ----------
router.get('/me', A.requireAuth, (req, res) => {
  const lessons = db.all(
    `SELECT lesson_id, completed_at FROM progress WHERE user_id = ? ORDER BY completed_at`,
    [req.user.id]
  )
  const attempts = db.all(
    `SELECT lesson_id, correct, total, points, created_at FROM attempts
     WHERE user_id = ? ORDER BY id DESC LIMIT 20`,
    [req.user.id]
  )
  const agg = db.get(
    'SELECT COUNT(*) AS n, COALESCE(SUM(points),0) AS pts FROM attempts WHERE user_id = ?',
    [req.user.id]
  )
  const quizRate = db.get(
    'SELECT COALESCE(SUM(correct),0) AS c, COALESCE(SUM(total),0) AS t FROM attempts WHERE user_id = ?',
    [req.user.id]
  )
  res.json({
    user: req.user,
    progress: lessons.map((l) => l.lesson_id),
    completed: lessons,
    attempts,
    stats: {
      lessonsDone: lessons.length,
      quizzesTaken: agg.n,
      quizPoints: agg.pts,
      accuracy: quizRate.t ? Math.round((quizRate.c / quizRate.t) * 100) : 0,
      ...progressLevel(lessons.length, TOTAL_LESSONS),
    },
  })
})

module.exports = router
