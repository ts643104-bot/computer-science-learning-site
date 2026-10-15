// ============================================================
// routes/users.js — إدارة المستخدمين (ملف شخصي + نقاط + أدوار)
// ============================================================
const express = require('express')
const db = require('../db')
const A = require('../auth')

const router = express.Router()
router.use(A.requireAdmin)

router.get('/', (_req, res) => {
  const rows = db.all(
    `SELECT u.id, u.username, u.phone, u.role, u.score, u.created_at, u.last_login,
            (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id) AS lessons_done,
            (SELECT COUNT(*) FROM attempts a WHERE a.user_id = u.id) AS attempts
     FROM users u ORDER BY u.score DESC, u.id ASC`
  )
  res.json({
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      username: r.username,
      phone: A.prettyPhone(r.phone),
      role: r.role,
      score: r.score,
      rank: A.rankFor(r.score).name,
      lessonsDone: r.lessons_done,
      attempts: r.attempts,
      createdAt: r.created_at,
      lastLogin: r.last_login,
    })),
  })
})

// تعديل النقاط يدويًا (مثلاً مكافأة)
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const row = db.get('SELECT * FROM users WHERE id = ?', [id])
  if (!row) return res.status(404).json({ error: 'المستخدم مش موجود' })

  if (typeof req.body?.score === 'number') {
    db.run('UPDATE users SET score = ? WHERE id = ?', [Math.max(0, req.body.score | 0), id])
  }
  if (req.body?.role === 'admin' || req.body?.role === 'student') {
    db.run('UPDATE users SET role = ? WHERE id = ?', [req.body.role, id])
  }
  if (req.body?.newPassword) {
    const p = A.validatePassword(req.body.newPassword)
    if (!p.ok) return res.status(400).json({ error: p.error })
    db.run('UPDATE users SET pass_hash = ? WHERE id = ?', [A.hashPassword(p.value), id])
  }
  res.json({ ok: true, user: A.publicUser(db.get('SELECT * FROM users WHERE id = ?', [id])) })
})

// حذف مستخدم — الرقم بيرجع متاح تاني في القائمة
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  if (id === req.userRow.id) return res.status(400).json({ error: 'مش هتحذف حسابك انت!' })
  // شيل كل حاجة متعلقة بيه (الجلسات، التقدم، المحاولات) وبعدين الحساب
  db.run('DELETE FROM sessions WHERE user_id = ?', [id])
  db.run('DELETE FROM progress WHERE user_id = ?', [id])
  db.run('DELETE FROM attempts WHERE user_id = ?', [id])
  db.run('DELETE FROM users WHERE id = ?', [id])
  res.json({ ok: true, id })
})

module.exports = router
