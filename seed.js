// ============================================================
// seed.js — إنشاء حساب الأدمن + الأرقام المبدئية أول مرة
// تقدر تغيّر البيانات دي من متغيرات البيئة (env)
// ============================================================
const db = require('./db')
const {
  normalizePhone,
  hashPassword,
  checkPassword,
  validateUsername,
  validatePassword,
} = require('./auth')

const ADMIN_PHONE = normalizePhone(process.env.ADMIN_PHONE || '01140971703') || '01140971703'
const ADMIN_USER = process.env.ADMIN_USERNAME || 'タハ A3'
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Malak0897@@Taha'

function seed() {
  const now = new Date().toISOString()

  const u = validateUsername(ADMIN_USER)
  const p = validatePassword(ADMIN_PASS)
  const adminUsername = u.ok ? u.value : 'Admin'
  const adminPassHash = hashPassword(p.ok ? p.value : ADMIN_PASS)

  const existing = db.get('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin'])
  if (!existing) {
    db.run(
      'INSERT INTO users (phone, username, pass_hash, role, score, created_at) VALUES (?,?,?,?,?,?)',
      [ADMIN_PHONE, adminUsername, adminPassHash, 'admin', 0, now]
    )
    console.log(`[seed] تم إنشاء حساب الأدمن: ${ADMIN_PHONE} / ${ADMIN_USER}`)
  } else {
    // خلّي حساب الأدمن مطابق للبيانات المظبوطة (رقم/اسم/باسورد)
    const changed =
      existing.phone !== ADMIN_PHONE ||
      existing.username !== adminUsername ||
      !checkPassword(p.ok ? p.value : ADMIN_PASS, existing.pass_hash)
    if (changed) {
      db.run('UPDATE users SET phone = ?, username = ?, pass_hash = ? WHERE id = ?', [
        ADMIN_PHONE,
        adminUsername,
        adminPassHash,
        existing.id,
      ])
      console.log(`[seed] تم تحديث بيانات الأدمن: ${ADMIN_PHONE} / ${ADMIN_USER}`)
    }
  }

  // تأكد إن رقم الأدمن موجود ومفعّل في قائمة الأرقام المسموح لها
  const wl = db.get('SELECT phone FROM whitelist WHERE phone = ?', [ADMIN_PHONE])
  if (wl) {
    db.run('UPDATE whitelist SET is_active = 1, label = ? WHERE phone = ?', [
      'حساب الأدمن',
      ADMIN_PHONE,
    ])
  } else {
    db.run(
      'INSERT INTO whitelist (phone, label, added_by, created_at) VALUES (?,?,?,?)',
      [ADMIN_PHONE, 'حساب الأدمن', 'seed', now]
    )
  }

  // أرقام إضافية من البيئة: WHITELIST_PHONES=01011112222,01033334444
  const extra = (process.env.WHITELIST_PHONES || '')
    .split(',')
    .map((p) => normalizePhone(p))
    .filter(Boolean)
  for (const phone of extra) {
    db.run('INSERT OR IGNORE INTO whitelist (phone, label, added_by, created_at) VALUES (?,?,?,?)', [
      phone,
      'من الإعدادات',
      'seed',
      now,
    ])
  }
  db.save()
}

module.exports = { seed, ADMIN_PHONE, ADMIN_USER }
