/**
 * ============================================================================
 *  api-client.js — طبقة الاتصال بـ Google Apps Script من الموقع
 *  تصميم المهندس طه سلطان / タハ A3
 * ============================================================================
 *
 *  المشكلة: Apps Script Web App بيرجّع redirect لـ script.googleusercontent.com،
 *  ولو بعتّه بـ Content-Type: application/json بيحصل CORS preflight ويفشل.
 *
 *  الحل: نبعت كـ text/plain عشان نتجنّب الـ preflight تمامًا.
 *  (Apps Script بيتعامل مع الـ body كـ نص عادي، وJSON.parse بيشتغل عادي)
 * ============================================================================
 */

// ⚠️ حط هنا رابط الـ Web App بتاعك (اللي بيكمل بـ /exec)
var APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzKGAvn_26J6Rz1UpsgkhnFLzhatT_uQ4i4siUQyPgjjdA8wEDvK5ir5LT6L5Qm0nlipA/exec'

// المفتاح السري — لازم يطابق API_KEY اللي في كود Apps Script
var API_KEY = 'A3-SHABAKA-WA-3OLOOM-2026'

// مفتاح تخزين التوكن في المتصفح
var TOKEN_KEY = 'swn-token-v1'

// ============================================================================
//  أدوات التوكن
// ============================================================================

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch (e) {
    return ''
  }
}

function setToken(t) {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t)
    else localStorage.removeItem(TOKEN_KEY)
  } catch (e) {}
}

function clearToken() {
  setToken('')
}

// ============================================================================
//  الاتصال الأساسي
// ============================================================================

/**
 * بينادي Apps Script.
 * @param {string} action - اسم العملية (login, register, ...)
 * @param {object} payload - البيانات الإضافية
 * @returns {Promise<object>} - رد السيرفر كـ object
 */
function callApi(action, payload) {
  payload = payload || {}

  var body = Object.assign({}, payload, {
    action: action,
    apiKey: API_KEY,
    token: payload.token || getToken(),
  })

  // مهم: text/plain عشان نتجنّب CORS preflight
  return fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
    redirect: 'follow',
  })
    .then(function (res) {
      if (!res.ok) {
        throw new Error('السيرفر رجّع خطأ (' + res.status + ')')
      }
      return res.text()
    })
    .then(function (text) {
      var data
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error('رد السيرفر مش مفهوم — اتأكد إن الـ Web App منشور للعامة')
      }
      if (data && data.ok === false) {
        throw new Error(data.error || 'حصل خطأ غير معروف')
      }
      return data
    })
    .catch(function (err) {
      if (err && err.message && err.message.indexOf('Failed to fetch') >= 0) {
        throw new Error('مش قادر أوصل للسيرفر — اتأكد إن الـ Web App منشور و Anyone يقدر يوصله')
      }
      throw err
    })
}

/**
 * نسخة GET — مفيدة للقراءة السريعة (بيستفيد من كاش المتصفح)
 */
function callApiGet(action, params) {
  var qs = '?action=' + encodeURIComponent(action) + '&apiKey=' + encodeURIComponent(API_KEY)
  if (params) {
    Object.keys(params).forEach(function (k) {
      qs += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k])
    })
  }

  return fetch(APPS_SCRIPT_URL + qs, { method: 'GET', redirect: 'follow' })
    .then(function (res) {
      return res.text()
    })
    .then(function (text) {
      return JSON.parse(text)
    })
}

// ============================================================================
//  الدوال الجاهزة — التسجيل والدخول
// ============================================================================

var Api = {
  /** اختبار الاتصال */
  ping: function () {
    return callApi('ping')
  },

  /** هل الرقم مسموح ومتاح؟ */
  checkPhone: function (phone) {
    return callApi('checkPhone', { phone: phone })
  },

  /** تسجيل حساب جديد */
  register: function (phone, username, password) {
    return callApi('register', { phone: phone, username: username, password: password }).then(
      function (data) {
        if (data.token) setToken(data.token)
        return data
      }
    )
  },

  /** تسجيل الدخول */
  login: function (phone, password) {
    return callApi('login', { phone: phone, password: password }).then(function (data) {
      if (data.token) setToken(data.token)
      return data
    })
  },

  /** تسجيل الخروج (محلي) */
  logout: function () {
    clearToken()
    return Promise.resolve({ ok: true })
  },

  /** بياناتي أنا */
  me: function () {
    if (!getToken()) return Promise.reject(new Error('لازم تسجّل دخول الأول'))
    return callApi('me')
  },

  /** هل أنا داخل بحساب أدمن؟ */
  isAdmin: function () {
    return Api.me()
      .then(function (d) {
        return !!(d.user && d.user.role === 'admin')
      })
      .catch(function () {
        return false
      })
  },

  // --------------------------------------------------------------------------
  //  النقاط والتقدم
  // --------------------------------------------------------------------------

  /** تحديث النقاط مباشرة */
  updateScore: function (score) {
    return callApi('updateScore', { score: score })
  },

  /** خلّصت درس */
  completeLesson: function (lessonId) {
    return callApi('completeLesson', { lessonId: lessonId })
  },

  /** نتيجة اختبار */
  sendQuiz: function (lessonId, correct, total) {
    return callApi('quiz', { lessonId: lessonId, correct: correct, total: total })
  },

  /** تقدمي */
  getProgress: function () {
    return callApi('getProgress')
  },

  // --------------------------------------------------------------------------
  //  التعليقات والتقييمات  ⭐
  // --------------------------------------------------------------------------

  /**
   * إضافة تعليق + تقييم لدرس
   * @param {string} lessonId
   * @param {number} rating - من 1 لـ 5
   * @param {string} comment
   */
  addComment: function (lessonId, rating, comment) {
    return callApi('addComment', {
      lessonId: lessonId,
      rating: rating,
      comment: comment || '',
    })
  },

  /** قراءة تعليقات درس (+ ملخص التقييم) */
  getComments: function (lessonId) {
    return callApiGet('getComments', lessonId ? { lessonId: lessonId } : null)
  },

  // --------------------------------------------------------------------------
  //  الأدمن
  // --------------------------------------------------------------------------

  adminOverview: function () {
    return callApi('adminOverview')
  },
  getWhitelist: function () {
    return callApi('getWhitelist')
  },
  addToWhitelist: function (phones, label) {
    return callApi('addToWhitelist', { phones: phones, label: label || '' })
  },
  toggleWhitelist: function (phone, isActive) {
    return callApi('toggleWhitelist', { phone: phone, is_active: isActive ? 1 : 0 })
  },
  deleteWhitelist: function (phone) {
    return callApi('deleteWhitelist', { phone: phone })
  },
  getUsers: function () {
    return callApi('getUsers')
  },
  updateUser: function (id, body) {
    return callApi('updateUser', Object.assign({ id: id }, body))
  },
  deleteUser: function (id) {
    return callApi('deleteUser', { id: id })
  },
}

// تصدير للاستخدام في الملفات التانية
if (typeof window !== 'undefined') {
  window.Api = Api
  window.APPS_SCRIPT_URL = APPS_SCRIPT_URL
}
