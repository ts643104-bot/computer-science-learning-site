// ============================================================
// auth.js — تشفير الباسورد + التوكنات + حماية المسارات
// ============================================================
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const db = require('./db')

const SESSION_DAYS = 30

// ---------- قواعد التحقق من الأرقام ----------
// بنقبل الأرقام المصرية (01xxxxxxxxx) وأي رقم دولي بصيغة +968xxxxxxx
function normalizePhone(input) {
  if (!input) return ''
  let p = String(input).replace(/[\s\-()_.]/g, '')
  if (p.startsWith('00')) p = '+' + p.slice(2)
  if (/^01[0125][0-9]{8}$/.test(p)) return p // موبايل مصري
  if (/^\+[1-9][0-9]{7,14}$/.test(p)) return p // رقم دولي
  return ''
}

function phoneCountry(phone) {
  if (phone.startsWith('+')) return phone.slice(0, 4)
  return '+20'
}

function prettyPhone(phone) {
  if (/^01[0125][0-9]{8}$/.test(phone)) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`
  }
  return phone
}

function validateUsername(name) {
  const u = String(name || '').trim()
  if (u.length < 3) return { ok: false, error: 'اسم المستخدم لازم ٣ حروف على الأقل' }
  if (u.length > 24) return { ok: false, error: 'اسم المستخدم أطول من ٢٤ حرف' }
  if (!/^[\p{L}\p{N}_.\- ]+$/u.test(u)) {
    return { ok: false, error: 'اسم المستخدم يقبل حروف وأرقام و _ و . و - بس' }
  }
  return { ok: true, value: u }
}

function validatePassword(pass) {
  const p = String(pass || '')
  if (p.length < 6) return { ok: false, error: 'الباسورد لازم ٦ حروف/أرقام على الأقل' }
  if (p.length > 72) return { ok: false, error: 'الباسورد طويل أوي' }
  return { ok: true, value: p }
}

// ---------- الباسورد ----------
const hashPassword = (plain) => bcrypt.hashSync(plain, 10)
const checkPassword = (plain, hash) => bcrypt.compareSync(plain, hash)

// ---------- الجلسات ----------
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  const exp = new Date(now.getTime() + SESSION_DAYS * 864e5)
  db.run('INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?,?,?,?)', [
    token,
    userId,
    now.toISOString(),
    exp.toISOString(),
  ])
  return token
}

function destroySession(token) {
  if (token) db.run('DELETE FROM sessions WHERE token = ?', [token])
}

function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    phone: row.phone,
    phonePretty: prettyPhone(row.phone),
    username: row.username,
    role: row.role,
    score: row.score,
    createdAt: row.created_at,
    lastLogin: row.last_login,
    rank: rankFor(row.score),
  }
}

// ---------- الرُتب حسب النقاط ----------
const RANKS = [
  { min: 0, name: 'مبتدئ خالص', badge: '🌱' },
  { min: 60, name: 'بيتعلم بجد', badge: '📘' },
  { min: 150, name: 'شغّال على نفسه', badge: '⚙️' },
  { min: 300, name: 'فاهم البيزنس', badge: '🎯' },
  { min: 600, name: 'محترف', badge: '🏆' },
]

function rankFor(score) {
  let out = RANKS[0]
  for (const r of RANKS) if (score >= r.min) out = r
  const next = RANKS.find((r) => r.min > score) || null
  return { ...out, next: next ? { name: next.name, need: next.min - score, at: next.min } : null }
}

// ---------- الميدل وير ----------
function tokenFrom(req) {
  const h = req.headers.authorization || ''
  if (h.startsWith('Bearer ')) return h.slice(7).trim()
  return null
}

function lookup(token) {
  if (!token) return null
  const row = db.get(
    `SELECT u.*, s.expires_at FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token = ?`,
    [token]
  )
  if (!row) return null
  if (new Date(row.expires_at) < new Date()) {
    destroySession(token)
    return null
  }
  return row
}

function attachUser(req, _res, next) {
  req.token = tokenFrom(req)
  req.userRow = lookup(req.token)
  req.user = publicUser(req.userRow)
  next()
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'لازم تسجّل دخول الأول' })
  next()
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'لازم تسجّل دخول الأول' })
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'الصفحة دي للأدمن بس' })
  next()
}

module.exports = {
  normalizePhone,
  phoneCountry,
  prettyPhone,
  validateUsername,
  validatePassword,
  hashPassword,
  checkPassword,
  createSession,
  destroySession,
  publicUser,
  rankFor,
  attachUser,
  requireAuth,
  requireAdmin,
  lookup,
}
