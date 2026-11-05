const addLink = (href, text, className = "") => {
  const link = document.createElement("a")
  link.href = href
  link.target = "_blank"
  link.rel = "noopener noreferrer"
  link.className =
    `inline-flex rounded-lg bg-brand-500 px-3 py-2 font-semibold text-slate-950 transition hover:brightness-110 ${className}`.trim()
  link.textContent = text
  return link
}

const removeFreeLessonClaim = (root) => {
  root.querySelectorAll("h1, h2, h3").forEach((heading) => {
    heading.textContent = heading.textContent.replace(/\s*[—–-]\s*ومجاني بالكامل\s*$/, "")
  })
}

const addSpeechVoiceGuide = (root) => {
  const controls = root.querySelector(".lesson-audio-controls")
  if (!controls) return
  if (controls.nextElementSibling?.classList.contains("speech-voice-guide")) return

  const guide = document.createElement("section")
  guide.className =
    "speech-voice-guide my-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.05] p-4 text-sm text-slate-300"

  const heading = document.createElement("h3")
  heading.className = "font-semibold text-slate-100"
  heading.textContent = "طريقة تنزيل وتشغيل الصوت المصري"

  const details = document.createElement("details")
  details.className = "mt-2"
  const summary = document.createElement("summary")
  summary.className = "cursor-pointer text-brand-300 hover:text-brand-200"
  summary.textContent = "اعرض خطوات التفعيل"

  const instructions = document.createElement("div")
  instructions.className = "mt-3 space-y-3 leading-7"

  const intro = document.createElement("p")
  intro.textContent = "الصوت بيتثبت على الجهاز من إعدادات النظام. اختار القسم المناسب لجهازك:"

  const windowsSection = document.createElement("div")
  windowsSection.className = "space-y-2"
  const windowsHeading = document.createElement("h4")
  windowsHeading.className = "font-semibold text-slate-100"
  windowsHeading.textContent = "Windows"
  const windowsSteps = document.createElement("p")
  windowsSteps.textContent =
    "افتح إعدادات اللغة، أضف العربية (مصر) وثبّت ميزة الكلام أو تحويل النص لصوت لو ظهرت. بعد التثبيت حدّث الصفحة واضغط «استمع للدرس»."
  windowsSection.append(
    windowsHeading,
    addLink("ms-settings:regionlanguage", "افتح إعدادات اللغة", "w-fit"),
    windowsSteps,
  )

  const androidSection = document.createElement("div")
  androidSection.className = "space-y-2"
  const androidHeading = document.createElement("h4")
  androidHeading.className = "font-semibold text-slate-100"
  androidHeading.textContent = "موبايل Android"
  const androidSteps = document.createElement("ol")
  androidSteps.className = "list-decimal space-y-1 pr-5"
  ;[
    "نزّل أو حدّث «Speech Recognition & Synthesis» من Google Play.",
    "افتح إعدادات الموبايل ← تسهيل الاستخدام ← تحويل النص إلى كلام، واختَر محرك Google.",
    "من إعدادات المحرك اختَر «تثبيت البيانات الصوتية» ثم العربية؛ لو ظهر اختيار مصر اختاره.",
    "ارجع للموقع وحدّث الصفحة واضغط «استمع للدرس».",
  ].forEach((text) => {
    const item = document.createElement("li")
    item.textContent = text
    androidSteps.appendChild(item)
  })
  const androidLinks = document.createElement("div")
  androidLinks.className = "flex flex-wrap gap-2"
  androidLinks.append(
    addLink(
      "https://play.google.com/store/apps/details?id=com.google.android.tts",
      "تنزيل محرك Google من Play",
    ),
    addLink(
      "https://support.google.com/accessibility/android/answer/6006983?hl=ar",
      "شرح إعداد الصوت من Google",
      "border border-line bg-transparent text-slate-200",
    ),
  )
  androidSection.append(androidHeading, androidLinks, androidSteps)

  const note = document.createElement("p")
  note.className = "text-xs text-slate-400"
  note.textContent =
    "توفر صوت عربي (مصر) يعتمد على الجهاز والمحرك. لو مش موجود صوت ar-EG بعد التثبيت، جرّب إعادة تشغيل المتصفح أو الجهاز."

  instructions.append(intro, windowsSection, androidSection, note)
  details.append(summary, instructions)
  guide.append(heading, details)
  controls.insertAdjacentElement("afterend", guide)
}

export const updateLessonUi = (root) => {
  removeFreeLessonClaim(root)
  addSpeechVoiceGuide(root)
}
