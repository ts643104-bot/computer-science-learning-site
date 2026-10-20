import './api-client.js'

const $ = (id) => document.getElementById(id)

const WHATSAPP_PART_A = '20'
const WHATSAPP_PART_B = '1'
const WHATSAPP_PART_C = '140971703'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_PART_A}${WHATSAPP_PART_B}${WHATSAPP_PART_C}`

const notify = (el, text, kind = 'ok') => {
  el.textContent = text
  el.className = `lg-msg on ${kind === 'err' ? 'err' : 'ok'}`
  if (text) setTimeout(() => (el.className = 'lg-msg'), 50)
}

const showMsg = (text, kind = 'ok') => notify($('formMsg'), text, kind)

const toggleField = (show) => {
  $('userField').classList.toggle('lg-hidden', !show)
  $('submitBtn').textContent = show ? 'إنشاء حساب' : 'تسجيل الدخول'
}

const renderContactPrompt = (reason) => {
  const wrap = $('contactPrompt')
  if (!wrap) return
  const existing = wrap.querySelector('.lg-whatsapp-row')
  if (existing) existing.remove()

  const row = document.createElement('div')
  row.className = 'lg-whatsapp-row'
  row.innerHTML = `
    <div class="lg-msg err" style="margin-bottom:0.5rem">${reason || 'الرقم ده مش مسموح له بالدخول بعد.'}</div>
    <a class="lg-contact-link" href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer">💬 طلب تفعيل الحساب عبر واتساب</a>
  `
  wrap.prepend(row)
}

const hideContactPrompt = () => {
  const existing = document.querySelector('.lg-whatsapp-row')
  if (existing) existing.remove()
}

const checkPhoneOnInput = async (phone) => {
  hideContactPrompt()
  if (!phone || phone.trim().length < 10) return

  try {
    const result = await window.Api.checkPhone(phone)
    if (!result.valid) {
      showMsg('رقم غير صحيح', 'err')
      return
    }
    if (!result.allowed) {
      renderContactPrompt('الرقم ده مش مسموح له. اطلب تفعيله عبر الواتساب.')
    }
  } catch (err) {
    renderContactPrompt('حصلت مشكلة أثناء فحص الرقم. جرب تاني أو تواصل على واتساب.')
  }
}

const submitLogin = async (phone, password) => {
  hideContactPrompt()
  try {
    const data = await window.Api.login(phone, password)
    if (data.user && data.user.role === 'admin') {
      await window.Api.logout()
      showMsg('هذا حساب أدمن، استخدم لوحة الأدمن.', 'err')
      return
    }
    window.location.href = './index.html'
  } catch (err) {
    showMsg(err.message || 'الرقم أو الباسورد غلط', 'err')
    if (err.code === 'NOT_WHITELISTED' || err.code === 'BAD_CREDENTIALS') {
      renderContactPrompt('الرجاء تفعيل الحساب أولاً عبر واتساب.')
    }
  }
}

const submitRegister = async (phone, username, password) => {
  hideContactPrompt()
  try {
    const data = await window.Api.register(phone, username, password)
    if (data && data.user && data.user.role === 'admin') {
      await window.Api.logout()
      showMsg('هذا الحساب أدمن، لا يمكن إنشاؤه كطالب.', 'err')
      return
    }
    window.location.href = './index.html'
  } catch (err) {
    showMsg(err.message || 'فشل التسجيل', 'err')
    if (err.code === 'NOT_WHITELISTED') {
      renderContactPrompt(err.message)
    } else if (err.code === 'PHONE_TAKEN' || err.code === 'BAD_CREDENTIALS') {
      renderContactPrompt('لديك حساب؟ سجّل الدخول بدلاً من إنشاء حساب جديد.')
    } else {
      renderContactPrompt('تواصل مع الأدمن على واتساب لتفعيل الحساب.')
    }
  }
}

$('tabLogin').addEventListener('click', () => {
  $('tabLogin').classList.add('on')
  $('tabRegister').classList.remove('on')
  toggleField(false)
})

$('tabRegister').addEventListener('click', () => {
  $('tabRegister').classList.add('on')
  $('tabLogin').classList.remove('on')
  toggleField(true)
})

$('phone').addEventListener('input', () => {
  clearTimeout($('phone')._checkTimer)
  $('phone')._checkTimer = setTimeout(() => {
    checkPhoneOnInput($('phone').value.trim())
  }, 50)
})

$('authForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const phone = $('phone').value.trim()
  const username = $('username').value.trim()
  const password = $('password').value

  if (!phone) {
    showMsg('اكتب رقم الموبايل', 'err')
    return
  }

  hideContactPrompt()

  const isRegister = $('tabRegister').classList.contains('on')

  try {
    if (isRegister) {
      await submitRegister(phone, username, password)
    } else {
      await submitLogin(phone, password)
    }
  } catch (err) {
    showMsg(err.message || 'حصل خطأ، جرّب تاني.', 'err')
  }
})

const init = async () => {
  toggleField(false)
  const user = await window.Api.me().then((d) => d.user).catch(() => null)
  if (user) {
    window.location.href = './index.html'
  }
}

init()
