// ============================================================
// server.js — شبكة وعلوم | السيرفر الكامل (API + ملفات الموقع)
// تشغيل:  node server.js
// ============================================================
const path = require('path')
const fs = require('fs')
const express = require('express')

const db = require('./db')
const A = require('./auth')
const { seed } = require('./seed')

const PORT = process.env.PORT || 5178
// لو الملفات جوه نفس الفولدر (وضع النشر) اخدم منها، وإلا خدها من client/dist (وضع التطوير)
const DIST = fs.existsSync(path.join(__dirname, 'index.html'))
  ? __dirname
  : path.join(__dirname, '..', 'client', 'dist')

async function main() {
  await db.init()
  seed()

  const app = express()
  app.use(express.json({ limit: '64kb' }))
  app.use(A.attachUser)

  // ---------- الصحة ----------
  app.get('/api/health', (_req, res) =>
    res.json({ ok: true, service: 'شبكة وعلوم API', time: new Date().toISOString() })
  )

  // ---------- المسارات ----------
  app.use('/api/auth', require('./routes/auth'))
  app.use('/api/progress', require('./routes/progress'))
  app.use('/api/admin/users', require('./routes/users'))
  app.use('/api/admin', require('./routes/admin'))

  app.use('/api', (_req, res) => res.status(404).json({ error: 'المسار ده مش موجود' }))

  // ---------- الموقع (React build) ----------
  if (fs.existsSync(DIST)) {
    app.use(express.static(DIST, { index: 'index.html', maxAge: '1h' }))
    // أي مسار تاني بيرجّع صفحة الموقع (بيستخدم HashRouter)
    app.use((_req, res) => res.sendFile(path.join(DIST, 'index.html')))
  } else {
    app.use((_req, res) =>
      res.status(503).send('فرونت إند لسه ما اتبناش — شغّل npm run build جوّه client/')
    )
  }

  // ---------- الأخطاء ----------
  app.use((err, _req, res, _next) => {
    console.error('[error]', err.message)
    res.status(500).json({ error: 'حصل خطأ في السيرفر، جرّب تاني' })
  })

  app.listen(PORT, () => {
    console.log(`✅ شبكة وعلوم — السيرفر شغال على المنفذ ${PORT}`)
    console.log(`📚 قاعدة البيانات: ${db.DB_FILE}`)
  })

  const tidy = () => {
    db.save()
    process.exit(0)
  }
  process.on('SIGINT', tidy)
  process.on('SIGTERM', tidy)
}

main().catch((e) => {
  console.error('فشل تشغيل السيرفر:', e)
  process.exit(1)
})
