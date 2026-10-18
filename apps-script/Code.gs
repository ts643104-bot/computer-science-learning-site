var API_KEY = 'A3-SHABAKA-WA-3OLOOM-2026'
var TELEGRAM_URL = 'https://t.me/a3Taha'

var SHEETS = {
  users: ['phone', 'username', 'passHash', 'score', 'role', 'createdAt', 'lastLogin'],
  whitelist: ['phone', 'label', 'isActive', 'addedBy', 'createdAt'],
  progress: ['phone', 'lessonId', 'completedAt', 'quizCorrect', 'quizTotal', 'points'],
  comments: ['timestamp', 'phone', 'username', 'lessonId', 'rating', 'comment'],
}

var POINTS = {
  lessonDone: 10,
  perCorrect: 5,
  perfectBonus: 10,
  firstLesson: 15,
}

var RANKS = [
  { min: 0, name: 'مبتدئ خالص', badge: '🌱' },
  { min: 60, name: 'بيتعلم بجد', badge: '📘' },
  { min: 150, name: 'شغّال على نفسه', badge: '⚙️' },
  { min: 300, name: 'فاهم البيزنس', badge: '🎯' },
  { min: 600, name: 'محترف', badge: '🏆' },
]

function doGet(e) {
  var params = (e && e.parameter) || {}
  var action = params.action || 'ping'

  if (action === 'ping') return reply(pingInfo())
  if (action === 'getComments') return reply(listComments(params.lessonId))

  return reply({ ok: false, error: 'الإجراء ده مش موجود' })
}

function doPost(e) {
  var body
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}')
  } catch (err) {
    return reply({ ok: false, error: 'البيانات المرسلة مش صحيحة' })
  }

  if (body.action !== 'ping' && body.apiKey !== API_KEY) {
    return reply({ ok: false, error: 'مفتاح غير صحيح' })
  }

  var handlers = {
    ping: pingInfo,
    checkPhone: function (b) {
      return checkPhone(b.phone)
    },
    register: register,
    login: login,
    me: me,
    updateScore: updateScore,
    completeLesson: completeLesson,
    quiz: submitQuiz,
    getProgress: getProgress,
    addComment: addComment,
    getComments: function (b) {
      return listComments(b.lessonId)
    },
    adminOverview: adminOverview,
    getWhitelist: getWhitelist,
    addToWhitelist: addToWhitelist,
    toggleWhitelist: toggleWhitelist,
    deleteWhitelist: deleteWhitelist,
    getUsers: getUsers,
    updateUser: updateUser,
    deleteUser: deleteUser,
  }

  var handler = handlers[body.action]
  if (!handler) return reply({ ok: false, error: 'الإجراء ده مش معروف: ' + body.action })

  try {
    return reply(handler(body))
  } catch (err) {
    return reply({ ok: false, error: 'خطأ في السيرفر: ' + (err && err.message) })
  }
}

function reply(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  )
}

function pingInfo() {
  return {
    ok: true,
    service: 'شبكة وعلوم API',
    version: '2.0',
    sheets: Object.keys(SHEETS),
    telegram: TELEGRAM_URL,
    time: new Date().toISOString(),
  }
}

function openSheet(name) {
  var book = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = book.getSheetByName(name)

  if (!sheet) sheet = book.insertSheet(name)

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEETS[name])
    sheet.getRange(1, 1, 1, SHEETS[name].length).setFontWeight('bold')
    sheet.setFrozenRows(1)
  }

  return sheet
}

function readSheet(name) {
  var values = openSheet(name).getDataRange().getValues()
  if (values.length <= 1) return []

  var headers = values[0]
  var records = []

  for (var r = 1; r < values.length; r++) {
    var line = values[r]
    if (line.join('').trim() === '') continue

    var record = { rowNumber: r + 1 }
    for (var c = 0; c < headers.length; c++) {
      record[String(headers[c])] = line[c]
    }
    records.push(record)
  }

  return records
}

function findRecord(sheetName, field, value) {
  var records = readSheet(sheetName)
  for (var i = 0; i < records.length; i++) {
    if (String(records[i][field]) === String(value)) return records[i]
  }
  return null
}

function columnOf(sheetName, field) {
  return SHEETS[sheetName].indexOf(field) + 1
}

function hashPassword(plain) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    'swn::' + plain + '::a3'
  )

  var out = ''
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256
    out += (b < 16 ? '0' : '') + b.toString(16)
  }
  return out
}

function issueToken(phone) {
  return Utilities.base64EncodeWebSafe(phone + '::' + Date.now() + '::' + Math.random())
}

function cleanPhone(input) {
  if (!input) return ''

  var value = String(input).replace(/[\s\-()_.]/g, '')
  if (value.indexOf('00') === 0) value = '+' + value.substring(2)

  if (/^01[0125][0-9]{8}$/.test(value)) return value
  if (/^\+[1-9][0-9]{7,14}$/.test(value)) return value

  return ''
}

function displayPhone(phone) {
  if (!/^01[0125][0-9]{8}$/.test(phone)) return phone
  return phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')
}

function rankOf(score) {
  var current = RANKS[0]
  var next = null

  for (var i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].min) current = RANKS[i]
    else if (!next) next = { name: RANKS[i].name, need: RANKS[i].min - score, at: RANKS[i].min }
  }

  return { name: current.name, badge: current.badge, next: next }
}

function toPublicUser(record) {
  if (!record) return null

  var score = Number(record.score) || 0
  var phone = String(record.phone)

  return {
    phone: phone,
    phonePretty: displayPhone(phone),
    username: String(record.username),
    role: String(record.role || 'student'),
    score: score,
    rank: rankOf(score),
    createdAt: String(record.createdAt || ''),
    lastLogin: String(record.lastLogin || ''),
  }
}

function currentUser(body) {
  if (!body.token) return null

  var decoded
  try {
    decoded = Utilities.newBlob(Utilities.base64DecodeWebSafe(body.token)).getDataAsString()
  } catch (err) {
    return null
  }

  return findRecord('users', 'phone', decoded.split('::')[0])
}

function requireUser(body) {
  var user = currentUser(body)
  if (!user) return { error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }
  return { user: user }
}

function requireAdmin(body) {
  var user = currentUser(body)
  if (!user) return { error: 'لازم تسجّل دخول الأول', code: 'UNAUTHORIZED' }
  if (String(user.role) !== 'admin') return { error: 'الصفحة دي للأدمن بس', code: 'FORBIDDEN' }
  return { user: user }
}

function denied(check) {
  return { ok: false, error: check.error, code: check.code }
}

function checkPhone(rawPhone) {
  var phone = cleanPhone(rawPhone)
  if (!phone) return { valid: false, allowed: false, reason: 'رقم غير صحيح' }

  var entry = findRecord('whitelist', 'phone', phone)
  var existing = findRecord('users', 'phone', phone)

  return {
    valid: true,
    phone: phone,
    allowed: !!(entry && String(entry.isActive) === '1'),
    taken: !!existing,
    username: existing ? String(existing.username) : null,
    telegram: TELEGRAM_URL,
  }
}

function register(body) {
  var phone = cleanPhone(body.phone)
  if (!phone) {
    return { ok: false, error: 'اكتب رقم موبايل صحيح — مثال: 01012345678', code: 'BAD_PHONE' }
  }

  var entry = findRecord('whitelist', 'phone', phone)
  if (!entry || String(entry.isActive) !== '1') {
    return {
      ok: false,
      error: 'الرقم ده مش مسموح له بالدخول. ابعت للأدمن على تليجرام يضيفه الأول.',
      code: 'NOT_WHITELISTED',
      telegram: TELEGRAM_URL,
    }
  }

  if (findRecord('users', 'phone', phone)) {
    return { ok: false, error: 'الرقم ده متسجّل بالفعل — جرّب تسجيل الدخول.', code: 'PHONE_TAKEN' }
  }

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
  if (findRecord('users', 'username', username)) {
    return { ok: false, error: 'اسم المستخدم ده محجوز، اختار غيره.', code: 'USERNAME_TAKEN' }
  }

  var password = String(body.password || '')
  if (password.length < 6) {
    return { ok: false, error: 'الباسورد لازم ٦ حروف/أرقام على الأقل', code: 'BAD_PASSWORD' }
  }
  if (password.length > 72) {
    return { ok: false, error: 'الباسورد طويل أوي', code: 'BAD_PASSWORD' }
  }

  var now = new Date().toISOString()
  openSheet('users').appendRow([phone, username, hashPassword(password), 0, 'student', now, now])

  return {
    ok: true,
    token: issueToken(phone),
    user: toPublicUser(findRecord('users', 'phone', phone)),
    message: 'أهلاً بيك! حسابك اتفعّل.',
  }
}

function login(body) {
  var phone = cleanPhone(body.phone)
  var password = String(body.password || '')

  if (!phone || !password) {
    return { ok: false, error: 'اكتب الرقم والباسورد', code: 'MISSING' }
  }

  var user = findRecord('users', 'phone', phone)
  if (!user || String(user.passHash) !== hashPassword(password)) {
    return { ok: false, error: 'الرقم أو الباسورد غلط', code: 'BAD_CREDENTIALS' }
  }

  var now = new Date().toISOString()
  openSheet('users').getRange(user.rowNumber, columnOf('users', 'lastLogin')).setValue(now)
  user.lastLogin = now

  return { ok: true, token: issueToken(phone), user: toPublicUser(user) }
}

function me(body) {
  var check = requireUser(body)
  if (check.error) return denied(check)

  var user = check.user
  var seen = {}
  var completed = []

  var own = readSheet('progress').filter(function (entry) {
    return String(entry.phone) === String(user.phone) && String(entry.lessonId)
  })

  for (var i = 0; i < own.length; i++) {
    var lessonId = String(own[i].lessonId)
    if (seen[lessonId]) continue

    seen[lessonId] = true
    completed.push({ lesson_id: lessonId, completed_at: String(own[i].completedAt) })
  }

  return {
    ok: true,
    user: toPublicUser(user),
    progress: completed.map(function (item) {
      return item.lesson_id
    }),
    completed: completed,
    stats: { lessonsDone: completed.length, totalPoints: Number(user.score) || 0 },
  }
}

function writeScore(user, score) {
  openSheet('users').getRange(user.rowNumber, columnOf('users', 'score')).setValue(score)
}

function addPoints(phone, points) {
  var user = findRecord('users', 'phone', phone)
  if (!user) return 0

  var score = Math.max(0, (Number(user.score) || 0) + points)
  writeScore(user, score)
  return score
}

function updateScore(body) {
  var check = requireUser(body)
  if (check.error) return denied(check)

  var score = Math.max(0, parseInt(body.score, 10) || 0)
  writeScore(check.user, score)

  return { ok: true, user: toPublicUser(Object.assign({}, check.user, { score: score })) }
}

function completeLesson(body) {
  var check = requireUser(body)
  if (check.error) return denied(check)

  var user = check.user
  var lessonId = String(body.lessonId || '').trim()
  if (!lessonId) return { ok: false, error: 'معرف الدرس مطلوب' }

  var own = readSheet('progress').filter(function (entry) {
    return String(entry.phone) === String(user.phone)
  })

  var done = own.some(function (entry) {
    return String(entry.lessonId) === lessonId
  })

  if (done) {
    return { ok: true, already: true, added: 0, score: Number(user.score) || 0 }
  }

  var earned = POINTS.lessonDone
  if (own.length === 0) earned += POINTS.firstLesson

  openSheet('progress').appendRow([
    String(user.phone),
    lessonId,
    new Date().toISOString(),
    '',
    '',
    earned,
  ])

  var score = addPoints(user.phone, earned)
  return { ok: true, added: earned, score: score, rank: rankOf(score) }
}

function submitQuiz(body) {
  var check = requireUser(body)
  if (check.error) return denied(check)

  var user = check.user
  var lessonId = String(body.lessonId || '').trim()
  var correct = parseInt(body.correct, 10)
  var total = parseInt(body.total, 10)

  if (!lessonId || isNaN(correct) || isNaN(total) || total < 1) {
    return { ok: false, error: 'بيانات الاختبار ناقصة' }
  }

  correct = Math.min(Math.max(correct, 0), total)

  var perfect = correct === total
  var earned = correct * POINTS.perCorrect + (perfect ? POINTS.perfectBonus : 0)

  openSheet('progress').appendRow([
    String(user.phone),
    lessonId,
    new Date().toISOString(),
    correct,
    total,
    earned,
  ])

  var score = addPoints(user.phone, earned)
  return { ok: true, added: earned, perfect: perfect, score: score, rank: rankOf(score) }
}

function getProgress(body) {
  var check = requireUser(body)
  if (check.error) return denied(check)

  var user = check.user
  var lessons = readSheet('progress')
    .filter(function (entry) {
      return String(entry.phone) === String(user.phone)
    })
    .map(function (entry) {
      return String(entry.lessonId)
    })

  return { ok: true, progress: lessons, score: Number(user.score) || 0 }
}

function addComment(body) {
  var lessonId = String(body.lessonId || '').trim()
  if (!lessonId) return { ok: false, error: 'معرّف الدرس مطلوب' }

  var rating = parseInt(body.rating, 10)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'التقييم لازم يكون من ١ لـ ٥ نجوم' }
  }

  var comment = String(body.comment || '').trim()
  if (comment.length > 1000) {
    return { ok: false, error: 'التعليق طويل أوي (الحد ١٠٠٠ حرف)' }
  }

  var user = currentUser(body)
  var phone = user ? String(user.phone) : 'guest'
  var username = user ? String(user.username) : String(body.guestName || 'زائر').substring(0, 24)

  openSheet('comments').appendRow([
    new Date().toISOString(),
    phone,
    username,
    lessonId,
    rating,
    comment,
  ])

  return {
    ok: true,
    message: 'تم إضافة تعليقك، شكرًا ليك!',
    summary: ratingSummary(lessonId),
  }
}

function listComments(lessonId) {
  var all = readSheet('comments')

  var selected = lessonId
    ? all.filter(function (entry) {
        return String(entry.lessonId) === String(lessonId)
      })
    : all

  selected.sort(function (a, b) {
    return String(b.timestamp).localeCompare(String(a.timestamp))
  })

  var items = selected.map(function (entry) {
    return {
      timestamp: String(entry.timestamp),
      username: String(entry.username),
      lessonId: String(entry.lessonId),
      rating: Number(entry.rating) || 0,
      comment: String(entry.comment),
    }
  })

  return { ok: true, count: items.length, items: items, summary: ratingSummary(lessonId) }
}

function ratingSummary(lessonId) {
  var all = readSheet('comments')

  var selected = lessonId
    ? all.filter(function (entry) {
        return String(entry.lessonId) === String(lessonId)
      })
    : all

  var total = 0
  var count = 0

  for (var i = 0; i < selected.length; i++) {
    var rating = Number(selected[i].rating) || 0
    if (rating >= 1 && rating <= 5) {
      total += rating
      count++
    }
  }

  return {
    count: count,
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    averagePercent: count ? Math.round((total / count / 5) * 100) : 0,
  }
}

function adminOverview(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var users = readSheet('users')
  var progress = readSheet('progress')

  var students = users.filter(function (user) {
    return String(user.role) === 'student'
  })

  var active = readSheet('whitelist').filter(function (entry) {
    return String(entry.isActive) === '1'
  })

  var pending = active.filter(function (entry) {
    return !users.some(function (user) {
      return String(user.phone) === String(entry.phone)
    })
  })

  var top = students
    .slice()
    .sort(function (a, b) {
      return (Number(b.score) || 0) - (Number(a.score) || 0)
    })
    .slice(0, 5)
    .map(function (user) {
      return {
        username: String(user.username),
        phone: String(user.phone),
        score: Number(user.score) || 0,
      }
    })

  var recent = progress
    .slice()
    .sort(function (a, b) {
      return String(b.completedAt).localeCompare(String(a.completedAt))
    })
    .slice(0, 8)
    .map(function (entry) {
      var owner = users.filter(function (user) {
        return String(user.phone) === String(entry.phone)
      })[0]

      return {
        username: owner ? String(owner.username) : String(entry.phone),
        lesson_id: String(entry.lessonId),
        completed_at: String(entry.completedAt),
      }
    })

  return {
    ok: true,
    users: students.length,
    admins: users.length - students.length,
    whitelisted: active.length,
    pending: pending.length,
    completions: progress.length,
    attempts: progress.filter(function (entry) {
      return String(entry.quizTotal) !== ''
    }).length,
    comments: readSheet('comments').length,
    top: top,
    recent: recent,
  }
}

function getWhitelist(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var users = readSheet('users')

  var items = readSheet('whitelist').map(function (entry) {
    var owner = users.filter(function (user) {
      return String(user.phone) === String(entry.phone)
    })[0]

    return {
      phone: String(entry.phone),
      label: String(entry.label || ''),
      is_active: String(entry.isActive) === '1' ? 1 : 0,
      added_by: String(entry.addedBy || ''),
      created_at: String(entry.createdAt || ''),
      username: owner ? String(owner.username) : null,
      score: owner ? Number(owner.score) || 0 : null,
    }
  })

  return { ok: true, count: items.length, items: items }
}

function addToWhitelist(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var list = String(body.phones || body.phone || '')
    .split(/[\n,،;]+/)
    .map(function (entry) {
      return entry.trim()
    })
    .filter(function (entry) {
      return entry
    })

  if (!list.length) return { ok: false, error: 'اكتب رقم واحد على الأقل' }

  var sheet = openSheet('whitelist')
  var added = []
  var invalid = []
  var now = new Date().toISOString()

  for (var i = 0; i < list.length; i++) {
    var phone = cleanPhone(list[i])
    if (!phone) {
      invalid.push(list[i])
      continue
    }

    var existing = findRecord('whitelist', 'phone', phone)
    if (existing) {
      sheet.getRange(existing.rowNumber, columnOf('whitelist', 'isActive')).setValue(1)
    } else {
      sheet.appendRow([phone, String(body.label || ''), 1, String(check.user.username), now])
    }
    added.push(phone)
  }

  return { ok: true, added: added, invalid: invalid, count: added.length }
}

function toggleWhitelist(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var phone = cleanPhone(body.phone)
  if (!phone) return { ok: false, error: 'رقم غير صحيح' }

  var entry = findRecord('whitelist', 'phone', phone)
  if (!entry) return { ok: false, error: 'الرقم ده مش موجود في القائمة' }

  var isActive = body.is_active ? 1 : 0
  openSheet('whitelist')
    .getRange(entry.rowNumber, columnOf('whitelist', 'isActive'))
    .setValue(isActive)

  return { ok: true, phone: phone, is_active: isActive }
}

function deleteWhitelist(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var phone = cleanPhone(body.phone)
  if (!phone) return { ok: false, error: 'رقم غير صحيح' }

  var entry = findRecord('whitelist', 'phone', phone)
  if (!entry) return { ok: true, phone: phone }

  openSheet('whitelist').deleteRow(entry.rowNumber)
  return { ok: true, phone: phone }
}

function getUsers(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var progress = readSheet('progress')

  var items = readSheet('users').map(function (user) {
    var own = progress.filter(function (entry) {
      return String(entry.phone) === String(user.phone)
    })

    var score = Number(user.score) || 0

    return {
      id: user.rowNumber,
      username: String(user.username),
      phone: displayPhone(String(user.phone)),
      role: String(user.role || 'student'),
      score: score,
      rank: rankOf(score).name,
      lessonsDone: own.filter(function (entry) {
        return String(entry.quizTotal) === ''
      }).length,
      attempts: own.filter(function (entry) {
        return String(entry.quizTotal) !== ''
      }).length,
      createdAt: String(user.createdAt || ''),
      lastLogin: String(user.lastLogin || ''),
    }
  })

  items.sort(function (a, b) {
    return b.score - a.score
  })

  return { ok: true, count: items.length, items: items }
}

function updateUser(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var rowNumber = parseInt(body.id, 10)
  if (!rowNumber || rowNumber < 2) return { ok: false, error: 'مستخدم غير صحيح' }

  var target = readSheet('users').filter(function (user) {
    return user.rowNumber === rowNumber
  })[0]

  if (!target) return { ok: false, error: 'المستخدم مش موجود' }

  var sheet = openSheet('users')

  if (body.score !== undefined && body.score !== null && body.score !== '') {
    sheet
      .getRange(rowNumber, columnOf('users', 'score'))
      .setValue(Math.max(0, parseInt(body.score, 10) || 0))
  }

  if (body.role === 'admin' || body.role === 'student') {
    sheet.getRange(rowNumber, columnOf('users', 'role')).setValue(body.role)
  }

  if (body.newPassword) {
    var password = String(body.newPassword)
    if (password.length < 6) {
      return { ok: false, error: 'الباسورد لازم ٦ حروف/أرقام على الأقل' }
    }
    sheet.getRange(rowNumber, columnOf('users', 'passHash')).setValue(hashPassword(password))
  }

  var updated = readSheet('users').filter(function (user) {
    return user.rowNumber === rowNumber
  })[0]

  return { ok: true, user: toPublicUser(updated) }
}

function deleteUser(body) {
  var check = requireAdmin(body)
  if (check.error) return denied(check)

  var rowNumber = parseInt(body.id, 10)
  if (!rowNumber || rowNumber < 2) return { ok: false, error: 'مستخدم غير صحيح' }
  if (rowNumber === check.user.rowNumber) return { ok: false, error: 'مش هتحذف حسابك انت!' }

  var target = readSheet('users').filter(function (user) {
    return user.rowNumber === rowNumber
  })[0]

  if (!target) return { ok: false, error: 'المستخدم مش موجود' }

  var progressSheet = openSheet('progress')

  readSheet('progress')
    .filter(function (entry) {
      return String(entry.phone) === String(target.phone)
    })
    .sort(function (a, b) {
      return b.rowNumber - a.rowNumber
    })
    .forEach(function (entry) {
      progressSheet.deleteRow(entry.rowNumber)
    })

  openSheet('users').deleteRow(rowNumber)

  return { ok: true, id: rowNumber }
}

function setupSheets() {
  Object.keys(SHEETS).forEach(function (name) {
    openSheet(name)
  })

  var adminPhone = '01140971703'
  if (!findRecord('users', 'phone', adminPhone)) {
    var now = new Date().toISOString()

    openSheet('users').appendRow([
      adminPhone,
      'タハ A3',
      hashPassword('Malak0897@@Taha'),
      9999,
      'admin',
      now,
      now,
    ])

    if (!findRecord('whitelist', 'phone', adminPhone)) {
      openSheet('whitelist').appendRow([adminPhone, 'حساب الأدمن', 1, 'setup', now])
    }
  }

  SpreadsheetApp.getActiveSpreadsheet().toast('تم تجهيز كل الأوراق ✅', 'شبكة وعلوم', 5)
}
