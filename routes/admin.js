// ============================================================
// routes/admin.js — لوحة تحكم الأدمن (الأرقام المسموحة + المستخدمين)
// ============================================================
const express = require('express')
const db = require('../db')
const A = require('../auth')

const router = express.Router()
router.use(A.requireAdmin)

// ---------- نظرة عامة ----------
router.get('/overview', (_req, res) => {
  const one = (sql) => db.get(sql).n
  res.json({
    users: one("SELECT COUNT(*) AS n FROM users WHERE role = 'student'"),
    admins: one("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'"),
    whitelisted: one('SELECT COUNT(*) AS n FROM whitelist WHERE is_active = 1'),
    pending: db.get(
      `SELECT COUNT(*) AS n FROM whitelist w
       WHERE w.is_active = 1 AND NOT EXISTS (SELECT 1 FROM users u WHERE u.phone = w.phone)`
    ).n,
    completions: one('SELECT COUNT(*) AS n FROM progress'),
    attempts: one('SELECT COUNT(*) AS n FROM attempts'),
    top: db.all(
      `SELECT username, phone, score FROM users WHERE role = 'student'
       ORDER BY score DESC, id ASC LIMIT 5`
    ),
    recent: db.all(
      `SELECT u.username, p.lesson_id, p.completed_at FROM progress p
       JOIN users u ON u.id = p.user_id ORDER BY p.completed_at DESC LIMIT 8`
    ),
  })
})

// ---------- الأرقام المسموح لها ----------
router.get('/whitelist', (_req, res) => {
  const rows = db.all(
    `SELECT w.phone, w.label, w.added_by, w.is_active, w.created_at,
            u.id AS user_id, u.username, u.score
     FROM whitelist w LEFT JOIN users u ON u.phone = w.phone
     ORDER BY w.created_at DESC`
  )
  res.json({ count: rows.length, items: rows })
})

// إضافة رقم أو مجموعة أرقام (مفصولة بفاصلة أو سطر جديد)
router.post('/whitelist', (req, res) => {
  const raw = req.body?.phones ?? req.body?.phone ?? ''
  const list = (Array.isArray(raw) ? raw.join(',') : String(raw))
    .split(/[\n,،;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!list.length) return res.status(400).json({ error: 'اكتب رقم واحد على الأقل' })

  const added = []
  const invalid = []
  const now = new Date().toISOString()
  for (const item of list) {
    const phone = A.normalizePhone(item)
    if (!phone) {
      invalid.push(item)
      continue
    }
    const exists = db.get('SELECT phone FROM whitelist WHERE phone = ?', [phone])
    if (exists) {
      db.run('UPDATE whitelist SET is_active = 1 WHERE phone = ?', [phone])
    } else {
      db.run(
        'INSERT INTO whitelist (phone, label, added_by, created_at) VALUES (?,?,?,?)',
        [phone, req.body?.label || null, req.userRow.username, now]
      )
    }
    added.push(phone)
  }
  res.status(201).json({ ok: true, added, invalid, count: added.length })
})

// تفعيل / تعطيل رقم
router.patch('/whitelist/:phone', (req, res) => {
  const phone = A.normalizePhone(req.params.phone)
  if (!phone) return res.status(400).json({ error: 'رقم غير صحيح' })
  const isActive = req.body?.is_active ? 1 : 0
  db.run('UPDATE whitelist SET is_active = ? WHERE phone = ?', [isActive, phone])
  res.json({ ok: true, phone, is_active: isActive })
})

router.delete('/whitelist/:phone', (req, res) => {
  const phone = A.normalizePhone(req.params.phone)
  if (!phone) return res.status(400).json({ error: 'رقم غير صحيح' })
  db.run('DELETE FROM whitelist WHERE phone = ?', [phone])
  res.json({ ok: true, phone })
})

module.exports = router
