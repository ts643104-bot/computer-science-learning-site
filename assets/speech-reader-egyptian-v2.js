const chunkText = (text, maxLength = 180) => {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks = []
  let chunk = ""

  for (const word of words) {
    if (chunk && `${chunk} ${word}`.length > maxLength) {
      chunks.push(chunk)
      chunk = word
    } else {
      chunk = chunk ? `${chunk} ${word}` : word
    }
  }

  if (chunk) chunks.push(chunk)
  return chunks
}

export const speechReaderLabels = {
  pause: "إيقاف مؤقت",
  resume: "استكمال القراءة",
  listen: "استمع للدرس",
  stop: "إيقاف",
  speaking: "جاري قراءة محتوى الدرس",
  paused: "القراءة متوقفة مؤقتًا",
  failed: "تعذرت القراءة",
  egyptianVoiceUnavailable:
    "الصوت المصري مش متوفر على جهازك. فعّل أو نزّل صوت عربي (مصر) من إعدادات الأصوات ثم جرّب تاني.",
}

export function getReadableLessonText(element) {
  if (!element) return ""

  const content = element.cloneNode(true)
  content
    .querySelectorAll("nav, script, style, svg, [aria-hidden='true'], .lesson-audio-controls")
    .forEach((item) => item.remove())
  const quiz = [...content.querySelectorAll("h2")]
    .find((heading) => heading.textContent.includes("اختبر نفسك"))
    ?.closest("section")
  content.querySelectorAll("button").forEach((button) => {
    if (!quiz?.contains(button)) button.remove()
  })

  const separatedHtml = content.innerHTML
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(?:article|blockquote|div|h[1-6]|li|ol|p|pre|section|span|tr|ul)>/gi, " ")
  const textContent = content.ownerDocument.createElement("div")
  textContent.innerHTML = separatedHtml

  return (textContent.textContent || "").replace(/\s+/g, " ").trim()
}

export function createSpeechReader({ onState, onError }) {
  const speech = window.speechSynthesis
  let runId = 0

  const setState = (state) => onState?.(state)
  const stop = () => {
    runId += 1
    speech?.cancel()
    setState("idle")
  }

  return {
    start(text) {
      if (!speech || typeof window.SpeechSynthesisUtterance !== "function") {
        onError?.("المتصفح لا يدعم القراءة الصوتية. جرّب متصفحًا أحدث.")
        return
      }

      const chunks = chunkText(String(text || ""))
      if (!chunks.length) {
        onError?.("مفيش نص مقروء في الدرس الحالي.")
        return
      }

      speech.cancel()
      const activeRun = ++runId
      const voices = speech.getVoices()
      const voice =
        voices.find((item) => item.lang.toLowerCase().startsWith("ar-eg")) ||
        voices.find((item) => item.lang.toLowerCase().startsWith("ar"))

      const speakChunk = (index) => {
        if (activeRun !== runId) return
        if (index >= chunks.length) {
          setState("idle")
          return
        }

        const utterance = new window.SpeechSynthesisUtterance(chunks[index])
        utterance.lang = voice?.lang || "ar-EG"
        utterance.rate = 0.9
        if (voice) utterance.voice = voice
        utterance.onend = () => speakChunk(index + 1)
        utterance.onerror = (event) => {
          if (activeRun !== runId || event.error === "canceled" || event.error === "interrupted") return
          runId += 1
          setState("idle")
          onError?.("حصلت مشكلة أثناء تشغيل الصوت. جرّب بدء القراءة مرة تانية.")
        }
        try {
          speech.speak(utterance)
        } catch {
          if (activeRun !== runId) return
          runId += 1
          setState("idle")
          onError?.("تعذر تشغيل الصوت من المتصفح. تأكد من إتاحة الصوت ثم أعد المحاولة.")
          return
        }
        setState("speaking")
      }

      setState("speaking")
      speakChunk(0)
    },

    pause() {
      if (!speech?.speaking || speech.paused) return
      speech.pause()
      setState("paused")
    },

    resume() {
      if (!speech?.paused) return
      speech.resume()
      setState("speaking")
    },

    stop,
    dispose: stop,
  }
}
