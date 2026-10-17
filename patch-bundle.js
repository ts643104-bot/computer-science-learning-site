// patch-bundle.js — بيعمل التعديلات على ملف الـ build المضغوط
// الاستخدام: node patch-bundle.js
// بيعمل نسخة احتياطية، يعدّل، وبعدين يتأكد إن الملف سليم syntax.
// لو حصل أي خطأ، بيرجع الملف الأصلي أوتوماتيك.
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const FILE = path.join(__dirname, 'assets', 'index-ChB4Ky_W.js')
const BACKUP = FILE + '.bak'

const SITE_URL = 'https://ts643104-bot.github.io/computer-science-learning-site/index.html#/'
const WHATSAPP = 'https://whatsapp.com/channel/0029Vb7vDQeFSAt3D2GnJH0T'
const GITHUB = 'https://github.com/ts643104-bot/computer-science-learning-site/'
const EMAIL = 'ts643104@gmail.com'

const original = fs.readFileSync(FILE, 'utf8')
fs.writeFileSync(BACKUP, original, 'utf8')

let src = original
const report = []

// ============================================================
// 1) أيقونات الفوتر: <span> بدون رابط  -> <a> بروابط حقيقية
// ============================================================
// مهم: نستبدل المصفوفة كاملة (التلات عناصر) لحد قفل الـ map.
// لو استبدلنا جزء بس، العناصر الأصلية تفضل موجودة والأقواس تتكسر.
const footerRe =
  /\{icon:\w+,label:"البريد"\},\{icon:\w+,label:"GitHub"\},\{icon:\w+,label:"LinkedIn"\}\]\.map\(e=>s\.jsx\("span",\{title:e\.label,className:"([^"]*)",children:s\.jsx\(e\.icon,\{size:16,strokeWidth:1\.75\}\)\},e\.label\)\)/

const fm = src.match(footerRe)
if (fm) {
  const cls = fm[1]
  const items =
    '{icon:gh,label:"البريد",href:"mailto:' +
    EMAIL +
    '"},{icon:oh,label:"GitHub",href:"' +
    GITHUB +
    '"},{icon:mh,label:"LinkedIn",href:"' +
    WHATSAPP +
    '"}'
  const repl =
    items +
    '].map(e=>s.jsx("a",{href:e.href,target:"_blank",rel:"noopener noreferrer",title:e.label,className:"' +
    cls +
    '",children:s.jsx(e.icon,{size:16,strokeWidth:1.75})},e.label))'
  src = src.replace(footerRe, repl)
  report.push('OK   footer: 3 icons -> real links (email / github / whatsapp)')
} else {
  report.push('SKIP footer: pattern not found (already patched?)')
}

// ============================================================
// 2) رابط المشاركة: عنوان الدرس فقط  ->  العنوان + رابط الموقع
// ============================================================
const shareRe = /,j=encodeURIComponent\(t\.title\)/
if (shareRe.test(src)) {
  src = src.replace(shareRe, ',j=encodeURIComponent(t.title+"\\n"+' + JSON.stringify(SITE_URL) + ')')
  report.push('OK   share: lesson title + site URL')
} else {
  report.push('SKIP share: pattern not found (already patched?)')
}

// ============================================================
// اكتب الملف ثم اتأكد إنه سليم — لو فيه خطأ ارجع للأصل
// ============================================================
fs.writeFileSync(FILE, src, 'utf8')

let syntaxOk = true
let errText = ''
try {
  execFileSync(process.execPath, ['--check', FILE], { stdio: 'pipe' })
} catch (e) {
  syntaxOk = false
  errText = (e.stderr || e.stdout || '').toString().split('\n').slice(0, 6).join('\n')
}

if (!syntaxOk) {
  fs.writeFileSync(FILE, original, 'utf8')
  console.log(report.join('\n'))
  console.log('\n*** SYNTAX ERROR — تم الرجوع للملف الأصلي ***')
  console.log(errText)
  process.exit(1)
}

console.log(report.join('\n'))
console.log('\nsyntax: OK')
console.log('size: ' + original.length + ' -> ' + src.length)
console.log('backup: ' + path.basename(BACKUP))
