// ============================================================
// routes/progress.js — تقدم المستخدم + النقاط
// ============================================================
const express = require('express')
const db = require('../db')
const A = require('../auth')
const { POINTS, quizPoints } = require('../scoring')

const router = express.Router()

router.get('/', A.requireAuth, (req, res) => {
  const rows = db.all(
    'SELECT lesson_id, completed_at FROM progress WHERE user_id = ? ORDER BY completed_at',
    [req.user.id]
  )
  res.json({ progress: rows.map((r) => r.lesson_id), completed: rows, score: req.user.score })
})

// خلّصت الدرس → +10 نقطة (مرة واحدة بس مهما كررت)
router.post('/complete', A.requireAuth, (req, res) => {
  const lessonId = String(req.body?.lessonId || '').trim()
  if (!lessonId) return res.status(400).json({ error: 'معرف الدرس مطلوب' })

  const already = db.get('SELECT lesson_id FROM progress WHERE user_id = ? AND lesson_id = ?', [
    req.user.id,
    lessonId,
  ])
  if (already) {
    return res.json({ ok: true, already: true, added: 0, score: req.user.score })
  }

  const doneCount = db.get('SELECT COUNT(*) AS n FROM progress WHERE user_id = ?', [req.user.id]).n
  let added = POINTS.LESSON_DONE
  if (doneCount === 0) added += POINTS.FIRST_BLOOD

  const now = new Date().toISOString()
  db.run('INSERT INTO progress (user_id, lesson_id, completed_at) VALUES (?,?,?)', [
    req.user.id,
    lessonId,
    now,
  ])
  db.run('UPDATE users SET score = score + ? WHERE id = ?', [added, req.user.id])
  const score = db.get('SELECT score FROM users WHERE id = ?', [req.user.id]).score
  res.json({ ok: true, added, score, rank: A.rankFor(score) })
})

// نتيجة الاختبار القصير → نقاط حسب عدد الصح
router.post('/quiz', A.requireAuth, (req, res) => {
  const lessonId = String(req.body?.lessonId || '').trim()
  const correct = Number(req.body?.correct)
  const total = Number(req.body?.total)
  if (!lessonId || !Number.isFinite(correct) || !Number.isFinite(total) || total < 1) {
    return res.status(400).json({ error: 'بيانات الاختبار ناقصة' })
  }

  const { points, perfect } = quizPoints(correct, total)
  const now = new Date().toISOString()
  db.run(
    'INSERT INTO attempts (user_id, lesson_id, correct, total, points, created_at) VALUES (?,?,?,?,?,?)',
    [req.user.id, lessonId, correct, total, points, now]
  )
  db.run('UPDATE users SET score = score + ? WHERE id = ?', [points, req.user.id])
  const score = db.get('SELECT score FROM users WHERE id = ?', [req.user.id]).score
  res.json({ ok: true, added: points, perfect, score, rank: A.rankFor(score) })
})

// إلغاء إكمال درس (مع خصم النقاط بتاعته)
router.delete('/complete/:lessonId', A.requireAuth, (req, res) => {
  const row = db.get('SELECT lesson_id FROM progress WHERE user_id = ? AND lesson_id = ?', [
    req.user.id,
    req.params.lessonId,
  ])
  if (!row) return res.json({ ok: true, added: 0, score: req.user.score })
  db.run('DELETE FROM progress WHERE user_id = ? AND lesson_id = ?', [
    req.user.id,
    req.params.lessonId,
  ])
  db.run('UPDATE users SET score = MAX(0, score - ?) WHERE id = ?', [POINTS.LESSON_DONE, req.user.id])
  const score = db.get('SELECT score FROM users WHERE id = ?', [req.user.id]).score
  res.json({ ok: true, added: -POINTS.LESSON_DONE, score })
})

module.exports = router
