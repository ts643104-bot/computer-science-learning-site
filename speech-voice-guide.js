export const addSpeechVoiceGuide = (root) => {
  const controls = root.querySelector(".lesson-audio-controls")
  if (!controls) return
  if (controls.nextElementSibling?.classList.contains("speech-voice-guide")) return

  const guide = document.createElement("section")
  guide.className =
    "speech-voice-guide my-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.05] p-4 text-sm text-slate-300"

  const heading = document.createElement("h3")
  heading.className = "font-semibold text-slate-100"
  heading.textContent = "طريقة تنزيل وتشغيل الصوت المصري"

  const settingsLink = document.createElement("a")
  settingsLink.href = "ms-settings:regionlanguage"
  settingsLink.className =
    "mt-3 inline-flex rounded-lg bg-brand-500 px-3 py-2 font-semibold text-slate-950 transition hover:brightness-110"
  settingsLink.textContent = "افتح إعدادات اللغة لتنزيل العربية (مصر)"

  const details = document.createElement("details")
  details.className = "mt-2"
  const summary = document.createElement("summary")
  summary.className = "cursor-pointer text-brand-300 hover:text-brand-200"
  summary.textContent = "اعرض خطوات التفعيل"

  const instructions = document.createElement("div")
  instructions.className = "mt-3 space-y-3 leading-7"

  const intro = document.createElement("p")
  intro.textContent =
    "الصوت بيتثبت على الجهاز من إعدادات النظام، مش كملف صوت منفصل من الموقع. على Windows: افتح إعدادات الكلام، ثم أضف العربية (مصر) وثبّت ميزة الكلام/تحويل النص لصوت لو ظهرت."

  const steps = document.createElement("ol")
  steps.className = "list-decimal space-y-1 pr-5"
  const stepText = [
    "اضغط «افتح إعدادات اللغة» واختر إضافة لغة.",
    "اختَر العربية (مصر) وثبّت حزمة الكلام المتاحة.",
    "ارجع للموقع وحدّث الصفحة، ثم اضغط «استمع للدرس».",
  ]
  stepText.forEach((text) => {
    const item = document.createElement("li")
    item.textContent = text
    steps.appendChild(item)
  })

  const note = document.createElement("p")
  note.className = "text-xs text-slate-400"
  note.textContent =
    "على الموبايل، دور في إعدادات إمكانية الوصول عن تحويل النص إلى كلام وثبّت صوت العربية (مصر) لو متاح. اختيار الصوت بيتوقف على الجهاز والمتصفح؛ لو مش موجود صوت ar-EG بعد التثبيت، جرّب إعادة تشغيل المتصفح أو الجهاز."

  instructions.append(intro, steps, note)
  details.append(summary, instructions)
  guide.append(heading, settingsLink, details)
  controls.insertAdjacentElement("afterend", guide)
}
