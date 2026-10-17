/**
 * ============================================================================
 *  شبكة وعلوم — Backend كامل على Google Apps Script + Google Sheets
 *  تصميم المهندس طه سلطان / タハ A3
 * ============================================================================
 *
 *  إزاي تحطّه:
 *   1) افتح الشيت بتاعك على Google Sheets
 *   2) من القائمة: Extensions → Apps Script
 *   3) امسح أي كود موجود والصق الملف ده كله
 *   4) اضغط Save (القرص)
 *   5) Deploy → New deployment → Type: "Web app"
 *        - Execute as:  Me
 *        - Who has access:  Anyone
 *   6) خد الـ Web app URL (اللي بيكمل بـ /exec) وحطه في الموقع
 *
 *  بعد أي تعديل على الكود:
 *   Deploy → Manage deployments → ✏️ → Version: New version → Deploy
 *   (لو عملت Save بس مش هيتحدّث الرابط)
 * ============================================================================
 */

// ============================================================================
//  الإعدادات — غيّرها لو احتجت
// ============================================================================

/** مفتاح سري بسيط — بيتبعت مع كل طلب من الموقع (طبقة حماية إضافية) */
var API_KEY = 'A3-SHABAKA-WA-3OLOOM-2026'

/** أسماء الأوراق (Sheets tabs) */
var SHEET_USERS = 'users'
var SHEET_WHITELIST = 'whitelist'
var SHEET_PROGRESS = 'progress'
var SHEET_COMMENTS = 'comments'

/** أسماء الأعمدة لكل ورقة — الترتيب مهم جدًا */
var HEADERS = {
  users: [
    'phone', // A  رقم الموبايل (المفتاح الأساسي)
    'username', // B  اسم المستخدم
    'passHash', // C  الباسورد مشفّر (SHA-256)
    'score', // D  مجموع النقاط
    'role', // E  student | admin
    'createdAt', // F  تاريخ التسجيل (ISO)
    'lastLogin', // G  آخر دخول (ISO)
  ],
  whitelist: [
    'phone', // A  رقم الموبايل
    'label', // B  وصف (اختياري)
    'isActive', // C  1 = مفعّل / 0 = موقوف
    'addedBy', // D  مين اللي ضافه
    'createdAt', // E  تاريخ الإضافة
  ],
  progress: [
    'phone', // A  رقم الطالب
    'lessonId', // B  معرّف الدرس
    'completedAt', // C  تاريخ الإكمال
    'quizCorrect', // D  عدد الإجابات الصح
    'quizTotal', // E  إجمالي الأسئلة
    'points', // F  النقاط المكتسبة
  ],
  comments: [
    'timestamp', // A  وقت التعليق (ISO)
    'phone', // B  رقم صاحب التعليق
    'username', // C  اسم صاحب التعليق
    'lessonId', // D  معرّف الدرس
    'rating', // E  التقييم بالنجوم (1-5)
    'comment', // F  نص التعليق
  ],
}

/** قواعد النقاط */
var POINTS = {
  LESSON_DONE: 10,
  PER_CORRECT: 5,
  PERFECT_BONUS: 10,
  FIRST_BLOOD: 15,
}

// ============================================================================
//  نقطة الدخول (GET) — للتجربة السريعة من المتصفح
// ============================================================================

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping'

  if (action === 'ping') {
    return json({
      ok: true,
      service: 'شبكة وعلوم API',
      version: '2.0',
      sheets: Object.keys(HEADERS),
      time: new Date().toISOString(),
    })
  }

  // قراءة التعليقات عبر GET كمان (أسهل للكاش)
  if (action === 'getComments') {
    return json(getComments_(e.parameter.lessonId))
  }

  return json({ ok: false, error: 'الإجراء ده مش موجود' })
}

// ============================================================================
//  نقطة الدخول (POST) — كل عمليات الموقع
// ============================================================================

function doPost(e) {
  try {
    var body
    try {
      body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
    } catch (err) {
      return json({ ok: false, error: 'البيانات المرسلة مش صحيحة' })
    }

    var action = body.action

    // ping مفتوح — كل حاجة تانية محتاجة الـ key
    if (action !== 'ping' && body.apiKey !== API_KEY) {
      return json({ ok: false, error: 'مفتاح غير صحيح' })
    }

    switch (action) {
      case 'ping':
        return json({ ok: true, service: 'شبكة وعلوم API', version: '2.0' })

      // ---------------- التسجيل والدخول ----------------
      case 'checkPhone':
        return json(checkPhone_(body.phone))
      case 'register':
        return json(register_(body))
      case 'login':
        return json(login_(body))
      case 'me':
        return json(me_(body))

      // ---------------- النقاط والتقدم ----------------
      case 'updateScore':
        return json(updateScore_(body))
      case 'completeLesson':
        return json(completeLesson_(body))
      case 'quiz':
        return json(quiz_(body))
      case 'getProgress':
        return json(getProgress_(body))

      // ---------------- التعليقات والتقييمات ----------------
      case 'addComment':
        return json(addComment_(body))
      case 'getComments':
        return json(getComments_(body.lessonId))

      // ---------------- الأدمن ----------------
      case 'adminOverview':
        return json(adminOverview_(body))
      case 'getWhitelist':
        return json(getWhitelist_(body))
      case 'addToWhitelist':
        return json(addToWhitelist_(body))
      case 'toggleWhitelist':
        return json(toggleWhitelist_(body))
      case 'deleteWhitelist':
        return json(deleteWhitelist_(body))
      case 'getUsers':
        return json(getUsers_(body))
      case 'updateUser':
        return json(updateUser_(body))
      case 'deleteUser':
        return json(deleteUser_(body))

      default:
        return json({ ok: false, error: 'الإجراء ده مش معروف: ' + action })
    }
  } catch (err) {
    return json({ ok: false, error: 'خطأ في السيرفر: ' + (err && err.message) })
  }
}

// ============================================================================
//  أدوات مساعدة
// ============================================================================

/** يرجّع JSON مع هيدرز CORS كاملة */
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  )
}

/** بيجيب ورقة بالاسم، وبيعملها الهيدرز لو لسه جديدة */
function sheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sh = ss.getSheetByName(name)
  if (!sh) {
    sh = ss.insertSheet(name)
  }
  // لو الورقة فاضية، اكتب الهيدرز
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS[name])
    sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold')
    sh.setFrozenRows(1)
  }
  return sh
}

/** بيقرا كل صفوف ورقة كمصفوفة أوبجكتس */
function rows_(name) {
  var sh = sheet_(name)
  var values = sh.getDataRange().getValues()
  if (values.length <= 1) return []

  var headers = values[0]
  var out = []
  for (var i = 1; i < values.length; i++) {
    var row = values[i]
    // تجاهل الصفوف الفاضية
    if (row.join('').trim() === '') continue
    var obj = { _row: i + 1 } // رقم الصف الحقي في الشيت
    for (var c = 0; c < headers.length; c++) {
      obj[String(headers[c])] = row[c]
    }
    out.push(obj)
  }
  return out
}

/** بيدوّر على صف بمفتاح معيّن، وبيرجّع الأوبجكت أو null */
function findRow_(name, keyName, keyValue) {
  var all = rows_(name)
  for (var i = 0; i < all.length; i++) {
    if (String(all[i][keyName]) === String(keyValue)) return all[i]
  }
  return null
}

/** تشفير الباسورد — SHA-256 مع ملح بسيط */
function hash_(password) {
  var salted = 'swn::' + password + '::a3'
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salted)
  var hex = ''
  for (var i = 0; i < raw.length; i++) {
    var b = (raw[i] + 256) % 256
    if (b < 16) hex += '0'
    hex += b.toString(16)
  }
  return hex
}

/** توكن جلسة بسيط */
function makeToken_(phone) {
  return Utilities.base64EncodeWebSafe(
    phone + '::' + new Date().getTime() + '::' + Math.random()
  )
}

/** تنضيف وتوحيد رقم الموبايل — نفس قواعد الموقع */
function normalizePhone_(input) {
  if (!input) return ''
  var p = String(input).replace(/[\s\-()_.]/g, '')
  if (p.indexOf('00') === 0) p = '+' + p.substring(2)
  // موبايل مصري: 01 (0/1/2/5) + 8 أرقام
  if (/^01[0125][0-9]{8}$/.test(p)) return p
  // رقم دولي
  if (/^\+[1-9][0-9]{7,14}$/.test(p)) return p
  return ''
}

/** تنسيق الرقم للعرض */
function prettyPhone_(phone) {
  if (/^01[0125][0-9]{8}$/.test(phone)) {
    return phone.substring(0, 4) + ' + phone.substring(4, 7) + ' + phone.substring(7)
  }
  return phone
}

/** الرُتب حسب النقاط */
var RANKS = [
  { min: 0, name: 'مبتدئ خالص', badge: '🌱' },
  { min: 60, name: 'بيتعلم بجد', badge: '📘' },
  { min: 150, name: 'شغّال على نفسه', badge: '⚙️' },
  { min: 300, name: 'فاهم البيزنس', badge: '🎯' },
  { min: 600, name: 'محترف', badge: '🏆' },
]

function rankFor_(score) {
  var out = RANKS[0]
  for (var i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].min) out = RANKS[i]
  }
  var next = null
  for (var j = 0; j < RANKS.length; j++) {
    if (RANKS[j].min > score) {
      next = { name: RANKS[j].name, need: RANKS[j].min - score, at: RANKS[j].min }
      break
    }
  }
  return {
    name: out.name,
    badge: out.badge,
    next: next,
  }
}

/** الشكل العام للمستخدم (بدون باسورد) */
function publicUser_(u) {
  if (!u) return null
  var score = Number(u.score) || 0
  return {
    phone: String(u.phone),
    phonePretty: prettyPhone_(String(u.phone)),
    username: String(u.username),
    role: String(u.role || 'student'),
    score: score,
    rank: rankFor_(score),
    createdAt: String(u.createdAt || ''),
    lastLogin: String(u.lastLogin || ''),
  }
}

/** بيجيب المستخدم من التوكن (توكن فيه الرقم) */
function userFromToken_(token) {
  if (!token) return null
  var decoded
  try {
    decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(token)).getDataAsString()
  } catch (e) {
    return null
  }
  var phone = decoded.split('::')[0]
  return findRow_(SHEET_USERS, 'phone', phone)
}

// ============================================================================
//  1) التحقق من الرقم (Whitelist)
// ============================================================================

function checkPhone_(rawPhone) {
  var phone = normalizePhone_(rawPhone)
  if (!phone) {
    return { valid: false, allowed: false, reason: 'رقم غير صحيح' }
  }

  var wl = findRow_(SHEET_WHITELIST, 'phone', phone)
  var used = findRow_(SHEET_USERS, 'phone', phone)

  return {
    valid: true,
    phone: phone,
    allowed: !!(wl && String(wl.isActive) === '1'),
    taken: !!used,
    username: used ? String(used.username) : null,
  }
}

// ============================================================================
//  2) التسجيل
// ============================================================================

function register_(body) {
  var phone = normalizePhone_(body.phone)
  if (!phone) {
    return { ok: false, error: 'اكتب رقم موبايل صحيح — مثال: 01012345678', code: 'BAD_PHONE' }
  }

  // لازم الرقم يكون في القائمة المسموح لها
  var wl = findRow_(SHEET_WHITELIST, 'phone', phone)
  if (!wl || String(wl.isActive) !== '1') {
    return {
      ok: false,
      error: 'الرقم ده مش مسموح له بالدخول. كلّم الأدمن يضيفه في قائمة الأرقام المسموحة.',
      code: 'NOT_WHITELISTED',
    }
  }

  // لازم الرقم مايكونش متسجّل قبل كده
  if (findRow_(SHEET_USERS, 'phone', phone)) {
    return { ok: false, error: 'الرقم ده متسجّل بالفعل — جرّب تسجيل الدخول.', code: 'PHONE_TAKEN' }
  }

  // التحقق من اسم المستخدم
  var username = String(body.username || '').trim()
  if (username.length < 3) {
    return { ok: false, error: 'اسم المستخدم لازم ٣ حروف على الأقل', code: 'BAD_USERNAME' }
  }
  if (username.length > 24) {
    return { ok: false, error: 'اسم المستخدم أطول من ٢٤ حرف', code: 'BAD_USERNAME' }
  }
  if (!/^[\u0600-\u06FFa-zA-Z0-9_.\- ]+$/.test(username)) {
    return { ok: false, error: 'اسم المستخدم يقبل حروف وأرقام و _ و . و - بس', code: 'BAD_USERNAME' }
  }
  if (findRow_(SHEET_USERS, 'username', username)) {
    return { ok: false, error: 'اسم المستخدم ده محجوز، اختار غيره.', code: 'USERNAME_TAKEN' }
  }

  // التحقق من الباسورد
  var password = String(body.password || '')
  if (password.length < 6) {
    return { ok: false, error: 'الباسورد لازم ٦ حروف/أرقام على الأقل', code: 'BAD_PASSWORD' }
  }
  if (password.length > 72) {
    return { ok: false, error: 'الباسورد طويل أوي', code: 'BAD_PASSWORD' }
  }

  var now = new Date().toISOString()
  sheet_(SHEET_USERS).appendRow([
    phone,
    username,
    hash_(password),
    0, // score
    'student', // role
    now, // createdAt
    now, // lastLogin
  ])

  var user = findRow_(SHEET_USERS, 'phone', phone)
  return {
    ok: true,
    token: makeToken_(phone),
    user: publicUser_(user),
    message: 'أهلاً بيك! حسابك اتفعّل.',
  }
}

// ============================================================================
//  الدخول
// ============================================================================

function login_(body) {
  var phone = normalizePhone_(body.phone)
  var password = String(body.password || '')

  if (!phone || !password) {
    return { ok: false, error: 'اكتب الرقم والباسورد', code: 'MISSING' }
  }

  var user = findRow_(SHEET_USERS, 'phone', phone)
  if (!user || String(user.passHash) !== hash_(password)) {
    return { ok: false, error: 'الرقم أو الباسورد غلط', code: 'BAD_CREDENTIALS' }
  }

  // حدّث آخر دخول
  var now = new Date().toISOString()
  sheet_(SHEET_USERS).getRange(user._row, HEADERS.users.indexOf('lastLogin') + 1).setValue(now)
  user.lastLogin = now

  return { ok: true, token: makeToken_(phone), user: publicUser_(user) }
}

// ============================================================================
//  بياناتي أنا
// ============================================================================

function me_(body) {
  var user = userFromToken_(body.token)
  if (!user) return { ok: false, error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }

  var prog = rows_(SHEET_PROGRESS).filter(function (r) {
    return String(r.phone) === String(user.phone)
  })

  var lessons = prog.filter(function (r) {
    return String(r.lessonId)
  })

  var completed = []
  var seen = {}
  for (var i = 0; i < lessons.length; i++) {
    var lid = String(lessons[i].lessonId)
    if (seen[lid]) continue
    seen[lid] = true
    completed.push({ lesson_id: lid, completed_at: String(lessons[i].completedAt) })
  }

  return {
    ok: true,
    user: publicUser_(user),
    progress: completed.map(function (c) {
      return c.lesson_id
    }),
    completed: completed,
    stats: {
      lessonsDone: completed.length,
      totalPoints: Number(user.score) || 0,
    },
  }
}

// ============================================================================
//  3) تحديث النقاط
// ============================================================================

function updateScore_(body) {
  var user = userFromToken_(body.token)
  if (!user) return { ok: false, error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }

  var newScore = Math.max(0, parseInt(body.score, 10) || 0)
  sheet_(SHEET_USERS)
    .getRange(user._row, HEADERS.users.indexOf('score') + 1)
    .setValue(newScore)

  return { ok: true, user: publicUser_({ phone: user.phone, username: user.username, role: user.role, score: newScore, createdAt: user.createdAt, lastLogin: user.lastLogin }) }
}

/** زوّد نقاط على المستخدم (داخلي) */
function addPoints_(phone, points) {
  var user = findRow_(SHEET_USERS, 'phone', phone)
  if (!user) return 0
  var score = Math.max(0, (Number(user.score) || 0) + points)
  sheet_(SHEET_USERS).getRange(user._row, HEADERS.users.indexOf('score') + 1).setValue(score)
  return score
}

// ============================================================================
//  إكمال درس
// ============================================================================

function completeLesson_(body) {
  var user = userFromToken_(body.token)
  if (!user) return { ok: false, error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }

  var lessonId = String(body.lessonId || '').trim()
  if (!lessonId) return { ok: false, error: 'معرف الدرس مطلوب' }

  // لو خلّصه قبل كده، مانعملش حاجة
  var already = rows_(SHEET_PROGRESS).filter(function (r) {
    return String(r.phone) === String(user.phone) && String(r.lessonId) === lessonId
  })
  if (already.length) {
    return { ok: true, already: true, added: 0, score: Number(user.score) || 0 }
  }

  // أول درس؟ خد بونص
  var doneCount = rows_(SHEET_PROGRESS).filter(function (r) {
    return String(r.phone) === String(user.phone)
  }).length

  var added = POINTS.LESSON_DONE
  if (doneCount === 0) added += POINTS.FIRST_BLOOD

  sheet_(SHEET_PROGRESS).appendRow([
    String(user.phone),
    lessonId,
    new Date().toISOString(),
    '', // quizCorrect
    '', // quizTotal
    added,
  ])

  var score = addPoints_(user.phone, added)
  return { ok: true, added: added, score: score, rank: rankFor_(score) }
}

// ============================================================================
//  نتيجة الاختبار
// ============================================================================

function quiz_(body) {
  var user = userFromToken_(body.token)
  if (!user) return { ok: false, error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }

  var lessonId = String(body.lessonId || '').trim()
  var correct = parseInt(body.correct, 10)
  var total = parseInt(body.total, 10)

  if (!lessonId || isNaN(correct) || isNaN(total) || total < 1) {
    return { ok: false, error: 'بيانات الاختبار ناقصة' }
  }
  if (correct < 0) correct = 0
  if (correct > total) correct = total

  var points = correct * POINTS.PER_CORRECT
  var perfect = correct === total
  if (perfect) points += POINTS.PERFECT_BONUS

  sheet_(SHEET_PROGRESS).appendRow([
    String(user.phone),
    lessonId,
    new Date().toISOString(),
    correct,
    total,
    points,
  ])

  var score = addPoints_(user.phone, points)
  return { ok: true, added: points, perfect: perfect, score: score, rank: rankFor_(score) }
}

function getProgress_(body) {
  var user = userFromToken_(body.token)
  if (!user) return { ok: false, error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }

  var rows = rows_(SHEET_PROGRESS).filter(function (r) {
    return String(r.phone) === String(user.phone)
  })

  return {
    ok: true,
    progress: rows.map(function (r) {
      return String(r.lessonId)
    }),
    score: Number(user.score) || 0,
  }
}

// ============================================================================
//  3) التعليقات والتقييمات بالنجوم  ⭐ الجديد
// ============================================================================

/**
 * إضافة تعليق + تقييم لدرس معيّن
 * body: { token, lessonId, rating (1-5), comment }
 */
function addComment_(body) {
  var lessonId = String(body.lessonId || '').trim()
  if (!lessonId) return { ok: false, error: 'معرّف الدرس مطلوب' }

  var rating = parseInt(body.rating, 10)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'التقييم لازم يكون من ١ لـ ٥ نجوم' }
  }

  var comment = String(body.comment || '').trim()
  if (comment.length > 1000) {
    return { ok: false, error: 'التعليق طويل أوي (الحد ١٠ حرف)' }
  }

  // صاحب التعليق: إما مستخدم مسجّل دخول، أو زائر (اسم اختياري)
  var user = userFromToken_(body.token)
  var phone = user ? String(user.phone) : 'guest'
  var username = user ? String(user.username) : String(body.guestName || 'زائر').substring(0, 24)

  sheet_(SHEET_COMMENTS).appendRow([
    new Date().toISOString(),
    phone,
    username,
    lessonId,
    rating,
    comment,
  ])

  var summary = ratingSummary_(lessonId)
  return { ok: true, message: 'تم إضافة تعليقك، شكرًا ليك!', summary: summary }
}

/**
 * قراءة تعليقات درس + ملخص التقييم
 * لو lessonId فاضي، بيرجّع كل التعليقات
 */
function getComments_(lessonId) {
  var all = rows_(SHEET_COMMENTS)

  var filtered = all
  if (lessonId) {
    filtered = all.filter(function (r) {
      return String(r.lessonId) === String(lessonId)
    })
  }

  // الأحدث الأول
  filtered.sort(function (a, b) {
    return String(b.timestamp).localeCompare(String(a.timestamp))
  })

  var items = filtered.map(function (r) {
    return {
      timestamp: String(r.timestamp),
      username: String(r.username),
      lessonId: String(r.lessonId),
      rating: Number(r.rating) || 0,
      comment: String(r.comment),
    }
  })

  return { ok: true, count: items.length, items: items, summary: ratingSummary_(lessonId) }
}

/** ملخص التقييم: المتوسط + عدد التقييمات */
function ratingSummary_(lessonId) {
  var all = rows_(SHEET_COMMENTS)
  var filtered = all
  if (lessonId) {
    filtered = all.filter(function (r) {
      return String(r.lessonId) === String(lessonId)
    })
  }

  var sum = 0
  var n = 0
  for (var i = 0; i < filtered.length; i++) {
    var r = Number(filtered[i].rating) || 0
    if (r >= 1 && r <= 5) {
      sum += r
      n++
    }
  }

  return {
    count: n,
    average: n ? Math.round((sum / n) * 10) / 10 : 0,
    averagePercent: n ? Math.round((sum / n / 5) * 100) : 0,
  }
}

// ============================================================================
//  لوحة الأدمن
// ============================================================================

function adminOnly_(body) {
  var user = userFromToken_(body.token)
  if (!user) return { error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }
  if (String(user.role) !== 'admin') return { error: 'الصفحة دي للأدمن بس', code: 'FORBIDDEN' }
  return { user: user }
}

function adminOverview_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var users = rows_(SHEET_USERS)
  var wl = rows_(SHEET_WHITELIST)
  var prog = rows_(SHEET_PROGRESS)

  var students = users.filter(function (u) {
    return String(u.role) === 'student'
  })

  var activeWl = wl.filter(function (w) {
    return String(w.isActive) === '1'
  })

  var pending = activeWl.filter(function (w) {
    return !users.some(function (u) {
      return String(u.phone) === String(w.phone)
    })
  })

  // أعلى ٥ طلاب
  var top = students
    .slice()
    .sort(function (a, b) {
      return (Number(b.score) || 0) - (Number(a.score) || 0)
    })
    .slice(0, 5)
    .map(function (u) {
      return { username: String(u.username), phone: String(u.phone), score: Number(u.score) || 0 }
    })

  // آخر ٨ إنجازات
  var recent = prog
    .slice()
    .sort(function (a, b) {
      return String(b.completedAt).localeCompare(String(a.completedAt))
    })
    .slice(0, 8)
    .map(function (r) {
      var u = users.filter(function (x) {
        return String(x.phone) === String(r.phone)
      })[0]
      return {
        username: u ? String(u.username) : String(r.phone),
        lesson_id: String(r.lessonId),
        completed_at: String(r.completedAt),
      }
    })

  return {
    ok: true,
    users: students.length,
    admins: users.length - students.length,
    whitelisted: activeWl.length,
    pending: pending.length,
    completions: prog.length,
    attempts: prog.filter(function (r) {
      return String(r.quizTotal) !== ''
    }).length,
    comments: rows_(SHEET_COMMENTS).length,
    top: top,
    recent: recent,
  }
}

function getWhitelist_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var users = rows_(SHEET_USERS)
  var items = rows_(SHEET_WHITELIST).map(function (w) {
    var u = users.filter(function (x) {
      return String(x.phone) === String(w.phone)
    })[0]
    return {
      phone: String(w.phone),
      label: String(w.label || ''),
      is_active: String(w.isActive) === '1' ? 1 : 0,
      added_by: String(w.addedBy || ''),
      created_at: String(w.createdAt || ''),
      username: u ? String(u.username) : null,
      score: u ? Number(u.score) || 0 : null,
    }
  })

  return { ok: true, count: items.length, items: items }
}

function addToWhitelist_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var raw = String(body.phones || body.phone || '')
  var list = raw
    .split(/[\n,،;]+/)
    .map(function (p) {
      return p.trim()
    })
    .filter(function (p) {
      return p
    })

  if (!list.length) return { ok: false, error: 'اكتب رقم واحد على الأقل' }

  var sh = sheet_(SHEET_WHITELIST)
  var added = []
  var invalid = []
  var now = new Date().toISOString()

  for (var i = 0; i < list.length; i++) {
    var phone = normalizePhone_(list[i])
    if (!phone) {
      invalid.push(list[i])
      continue
    }

    var existing = findRow_(SHEET_WHITELIST, 'phone', phone)
    if (existing) {
      sh.getRange(existing._row, HEADERS.whitelist.indexOf('isActive') + 1).setValue(1)
    } else {
      sh.appendRow([phone, String(body.label || ''), 1, String(auth.user.username), now])
    }
    added.push(phone)
  }

  return { ok: true, added: added, invalid: invalid, count: added.length }
}

function toggleWhitelist_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var phone = normalizePhone_(body.phone)
  if (!phone) return { ok: false, error: 'رقم غير صحيح' }

  var row = findRow_(SHEET_WHITELIST, 'phone', phone)
  if (!row) return { ok: false, error: 'الرقم ده مش موجود في القائمة' }

  var newVal = body.is_active ? 1 : 0
  sheet_(SHEET_WHITELIST)
    .getRange(row._row, HEADERS.whitelist.indexOf('isActive') + 1)
    .setValue(newVal)

  return { ok: true, phone: phone, is_active: newVal }
}

function deleteWhitelist_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var phone = normalizePhone_(body.phone)
  if (!phone) return { ok: false, error: 'رقم غير صحيح' }

  var row = findRow_(SHEET_WHITELIST, 'phone', phone)
  if (!row) return { ok: true, phone: phone }

  sheet_(SHEET_WHITELIST).deleteRow(row._row)
  return { ok: true, phone: phone }
}

function getUsers_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var prog = rows_(SHEET_PROGRESS)
  var items = rows_(SHEET_USERS).map(function (u) {
    var mine = prog.filter(function (p) {
      return String(p.phone) === String(u.phone)
    })
    var score = Number(u.score) || 0
    return {
      id: u._row,
      username: String(u.username),
      phone: prettyPhone_(String(u.phone)),
      role: String(u.role || 'student'),
      score: score,
      rank: rankFor_(score).name,
      lessonsDone: mine.filter(function (p) {
        return String(p.quizTotal) === ''
      }).length,
      attempts: mine.filter(function (p) {
        return String(p.quizTotal) !== ''
      }).length,
      createdAt: String(u.createdAt || ''),
      lastLogin: String(u.lastLogin || ''),
    }
  })

  items.sort(function (a, b) {
    return b.score - a.score
  })

  return { ok: true, count: items.length, items: items }
}

function updateUser_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var rowNum = parseInt(body.id, 10)
  if (!rowNum || rowNum < 2) return { ok: false, error: 'مستخدم غير صحيح' }

  var sh = sheet_(SHEET_USERS)
  var user = rows_(SHEET_USERS).filter(function (u) {
    return u._row === rowNum
  })[0]
  if (!user) return { ok: false, error: 'المستخدم مش موجود' }

  // النقاط
  if (body.score !== undefined && body.score !== null && body.score !== '') {
    sh.getRange(rowNum, HEADERS.users.indexOf('score') + 1).setValue(
      Math.max(0, parseInt(body.score, 10) || 0)
    )
  }

  // الدور
  if (body.role === 'admin' || body.role === 'student') {
    sh.getRange(rowNum, HEADERS.users.indexOf('role') + 1).setValue(body.role)
  }

  // الباسورد الجديد
  if (body.newPassword) {
    var pw = String(body.newPassword)
    if (pw.length < 6) return { ok: false, error: 'الباسورد لازم ٦ حروف/أرقام على الأقل' }
    sh.getRange(rowNum, HEADERS.users.indexOf('passHash') + 1).setValue(hash_(pw))
  }

  var updated = rows_(SHEET_USERS).filter(function (u) {
    return u._row === rowNum
  })[0]

  return { ok: true, user: publicUser_(updated) }
}

function deleteUser_(body) {
  var auth = adminOnly_(body)
  if (auth.error) return { ok: false, error: auth.error, code: auth.code }

  var rowNum = parseInt(body.id, 10)
  if (!rowNum || rowNum < 2) return { ok: false, error: 'مستخدم غير صحيح' }
  if (rowNum === auth.user._row) return { ok: false, error: 'مش هتحذف حسابك انت!' }

  var user = rows_(SHEET_USERS).filter(function (u) {
    return u._row === rowNum
  })[0]
  if (!user) return { ok: false, error: 'المستخدم مش موجود' }

  // شيل تقدمه الأول
  var progSh = sheet_(SHEET_PROGRESS)
  var mine = rows_(SHEET_PROGRESS).filter(function (p) {
    return String(p.phone) === String(user.phone)
  })
  // امسح من الآخر للأول عشان الأرقام ما تتلخبطش
  mine
    .sort(function (a, b) {
      return b._row - a._row
    })
    .forEach(function (p) {
      progSh.deleteRow(p._row)
    })

  sheet_(SHEET_USERS).deleteRow(rowNum)
  return { ok: true, id: rowNum }
}

// ============================================================================
//  دالة مساعدة — شغّلها مرة واحدة من المحر عشان تجهّز كل الأوراق
//  (من قائمة الدوال فوق اختار setupSheets واضغط Run)
// ============================================================================

function setupSheets() {
  Object.keys(HEADERS).forEach(function (name) {
    sheet_(name)
  })

  // أضف حساب الأدمن لو مش موجود
  var adminPhone = '01140971703'
  if (!findRow_(SHEET_USERS, 'phone', adminPhone)) {
    var now = new Date().toISOString()
    sheet_(SHEET_USERS).appendRow([
      adminPhone,
      'タハ A3',
      hash_('Malak0897@@Taha'),
      9999,
      'admin',
      now,
      now,
    ])
    // وضيفه للقائمة المسموح لها
    if (!findRow_(SHEET_WHITELIST, 'phone', adminPhone)) {
      sheet_(SHEET_WHITELIST).appendRow([adminPhone, 'حساب الأدمن', 1, 'setup', now])
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('تم تجهيز كل الأوراق ✅', 'شبكة وعلوم', 5)
}
