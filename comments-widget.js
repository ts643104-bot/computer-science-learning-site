const SIGNATURE = 'تصميم المهندس طه سلطان / タハ A3'

const STYLES = `
.swc{--gold:#fcd34d;--muted:#94a3b8;--card:#0f1729;--line:rgba(148,163,184,.14);--line-strong:rgba(148,163,184,.3);--text:#f1f5f9;font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;direction:rtl;margin-block:2.5rem;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:1.5rem}
.swc *{box-sizing:border-box}
.swc-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem}
.swc-heading{font-size:1.1rem;font-weight:700;color:var(--text);margin:0}
.swc-score{display:flex;align-items:center;gap:.6rem}
.swc-average{font-size:1.9rem;font-weight:700;color:var(--gold);font-family:"JetBrains Mono",monospace;line-height:1}
.swc-score-meta{font-size:.76rem;color:var(--muted);line-height:1.5}
.swc-stars{display:inline-flex;gap:.15rem;direction:ltr}
.swc-star{background:none;border:0;padding:0;cursor:pointer;line-height:1;font-size:1.35rem;color:#475569;transition:color .15s ease,transform .15s ease}
.swc-star-static{cursor:default}
.swc-star-lit{color:var(--gold)}
.swc-star:not(.swc-star-static):hover{transform:scale(1.18)}
.swc-form{border-top:1px solid var(--line);padding-top:1.25rem;margin-bottom:1.5rem}
.swc-label{display:block;font-size:.82rem;font-weight:600;color:var(--muted);margin-bottom:.45rem}
.swc-input{width:100%;min-height:96px;resize:vertical;background:#070c17;border:1px solid var(--line-strong);border-radius:12px;padding:.75rem .9rem;color:var(--text);font-family:inherit;font-size:.92rem;line-height:1.8;outline:none;transition:border-color .18s ease,box-shadow .18s ease}
.swc-input:focus{border-color:#22c55e99;box-shadow:0 0 0 3px #22c55e26}
.swc-actions{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:.9rem}
.swc-button{display:inline-flex;align-items:center;gap:.45rem;padding:.62rem 1.4rem;border-radius:999px;border:1px solid transparent;font-size:.9rem;font-weight:600;font-family:inherit;cursor:pointer;background:linear-gradient(135deg,#22c55e,#4ade80);color:#04160b;box-shadow:0 8px 24px #22c55e47;transition:transform .18s ease,box-shadow .18s ease}
.swc-button:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px #22c55e6b}
.swc-button:disabled{opacity:.5;cursor:not-allowed;transform:none}
.swc-note{padding:.6rem .95rem;border-radius:11px;font-size:.87rem;margin-bottom:1rem;display:none}
.swc-note-visible{display:block}
.swc-note-good{background:#22c55e1a;border:1px solid #22c55e4d;color:#86efac}
.swc-note-bad{background:#ef44441a;border:1px solid #ef44444d;color:#fca5a5}
.swc-list{display:flex;flex-direction:column;gap:.85rem}
.swc-entry{background:#070c1780;border:1px solid var(--line);border-radius:14px;padding:.9rem 1.05rem}
.swc-entry-top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:.4rem}
.swc-author{display:flex;align-items:center;gap:.55rem}
.swc-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:.78rem;font-weight:700;background:linear-gradient(135deg,#22c55e,#38bdf8);color:#04160b;flex:0 0 auto}
.swc-name{font-size:.87rem;font-weight:600;color:var(--text)}
.swc-time{font-size:.72rem;color:#64748b}
.swc-text{font-size:.92rem;line-height:1.9;color:#dbe3ee;white-space:pre-wrap;word-break:break-word}
.swc-blank{text-align:center;color:var(--muted);padding:1.75rem 1rem;font-size:.9rem;border:1px dashed var(--line-strong);border-radius:14px}
.swc-loading{height:64px;border-radius:14px;background:linear-gradient(90deg,#0f1729,#16213a,#0f1729);background-size:200% 100%;animation:swcPulse 1.3s infinite}
@keyframes swcPulse{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.swc-loading{animation:none}}
.swc-signature{margin-top:1.75rem;text-align:center;font-size:.78rem;color:#64748b;border-top:1px solid var(--line);padding-top:1rem}
`

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const timeAgo = (iso) => {
  if (!iso) return ''

  const seconds = (Date.now() - new Date(iso).getTime()) / 1000
  if (seconds < 60) return 'الآن'
  if (seconds < 3600) return `من ${Math.floor(seconds / 60)} دقيقة`
  if (seconds < 86400) return `من ${Math.floor(seconds / 3600)} ساعة`
  if (seconds < 604800) return `من ${Math.floor(seconds / 86400)} يوم`

  return new Date(iso).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const firstLetter = (name) => {
  const clean = String(name || '؟').trim()
  return clean ? clean.charAt(0) : '؟'
}

const starsMarkup = (rating) => {
  let html = '<span class="swc-stars">'
  for (let i = 1; i <= 5; i++) {
    html += `<span class="swc-star swc-star-static${i <= rating ? ' swc-star-lit' : ''}">★</span>`
  }
  return `${html}</span>`
}

const injectStyles = () => {
  if (document.getElementById('swc-styles')) return

  const tag = document.createElement('style')
  tag.id = 'swc-styles'
  tag.textContent = STYLES
  document.head.appendChild(tag)
}

const CommentsWidget = {
  mount({ container, lessonId }) {
    if (!container || !lessonId) {
      console.error('[CommentsWidget] محتاج container و lessonId')
      return null
    }

    injectStyles()

    let rating = 0
    let busy = false

    container.innerHTML = `
      <div class="swc">
        <div class="swc-head">
          <h3 class="swc-heading">💬 التقييم والتعليقات</h3>
          <div class="swc-score" data-score></div>
        </div>
        <div class="swc-note" data-note></div>
        <div class="swc-form">
          <label class="swc-label">قيّم الدرس (١ لـ ٥ نجوم)</label>
          <div class="swc-stars" data-picker>
            ${[1, 2, 3, 4, 5]
              .map(
                (value) =>
                  `<button type="button" class="swc-star" data-value="${value}" aria-label="${value} نجوم">★</button>`
              )
              .join('')}
          </div>
          <label class="swc-label" style="margin-top:1rem">اكتب تعليقك</label>
          <textarea class="swc-input" data-message maxlength="1000"
            placeholder="إيه رأيك في الدرس؟ إيه اللي فهمته وإيه اللي محتاج توضيح؟"></textarea>
          <div class="swc-actions">
            <span class="swc-time" data-counter>0 / 1000</span>
            <button type="button" class="swc-button" data-send>إرسال التقييم</button>
          </div>
        </div>
        <div class="swc-list" data-list></div>
        <div class="swc-signature">${SIGNATURE}</div>
      </div>
    `

    const note = container.querySelector('[data-note]')
    const picker = container.querySelector('[data-picker]')
    const buttons = [...picker.querySelectorAll('.swc-star')]
    const message = container.querySelector('[data-message]')
    const counter = container.querySelector('[data-counter]')
    const send = container.querySelector('[data-send]')
    const list = container.querySelector('[data-list]')
    const score = container.querySelector('[data-score]')

    const paint = (upTo) => {
      buttons.forEach((button) => {
        button.classList.toggle('swc-star-lit', Number(button.dataset.value) <= upTo)
      })
    }

    const showNote = (text, bad) => {
      if (!text) {
        note.className = 'swc-note'
        return
      }

      note.textContent = text
      note.className = `swc-note swc-note-visible ${bad ? 'swc-note-bad' : 'swc-note-good'}`

      if (!bad) {
        setTimeout(() => {
          if (note.textContent === text) note.className = 'swc-note'
        }, 5000)
      }
    }

    const renderScore = (summary) => {
      if (!summary || !summary.count) {
        score.innerHTML = '<span class="swc-score-meta">مفيش تقييمات لسه — كن أول واحد!</span>'
        return
      }

      score.innerHTML = `
        <span class="swc-average">${summary.average}</span>
        <span class="swc-score-meta">
          ${starsMarkup(Math.round(summary.average))}<br>${summary.count} تقييم
        </span>
      `
    }

    const renderList = (items) => {
      if (!items.length) {
        list.innerHTML = '<div class="swc-blank">مفيش تعليقات على الدرس ده لسه. اكتب أول واحد! ✍️</div>'
        return
      }

      list.innerHTML = items
        .map(
          (entry) => `
          <div class="swc-entry">
            <div class="swc-entry-top">
              <div class="swc-author">
                <span class="swc-avatar">${escapeHtml(firstLetter(entry.username))}</span>
                <span class="swc-name">${escapeHtml(entry.username || 'زائر')}</span>
              </div>
              <div style="display:flex;align-items:center;gap:.6rem">
                ${starsMarkup(entry.rating)}
                <span class="swc-time">${timeAgo(entry.timestamp)}</span>
              </div>
            </div>
            ${entry.comment ? `<div class="swc-text">${escapeHtml(entry.comment)}</div>` : ''}
          </div>
        `
        )
        .join('')
    }

    const load = () => {
      list.innerHTML = '<div class="swc-loading"></div><div class="swc-loading"></div>'

      window.Api.getComments(lessonId)
        .then((data) => {
          renderScore(data.summary)
          renderList(data.items || [])
        })
        .catch((err) => {
          list.innerHTML = `<div class="swc-blank">مش قادر أحمّل التعليقات: ${escapeHtml(err.message)}</div>`
        })
    }

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        rating = Number(button.dataset.value)
        paint(rating)
      })

      button.addEventListener('mouseenter', () => paint(Number(button.dataset.value)))
    })

    picker.addEventListener('mouseleave', () => paint(rating))

    message.addEventListener('input', () => {
      counter.textContent = `${message.value.length} / 1000`
    })

    send.addEventListener('click', () => {
      if (!rating) {
        showNote('اختار تقييم بالنجوم الأول ⭐', true)
        return
      }

      if (busy) return

      busy = true
      send.disabled = true
      send.textContent = 'جاري الإرسال…'
      showNote('')

      window.Api.addComment(lessonId, rating, message.value.trim())
        .then(() => {
          showNote('تم إضافة تعليقك، شكرًا ليك! 🎉', false)
          rating = 0
          paint(0)
          message.value = ''
          counter.textContent = '0 / 1000'
          load()
        })
        .catch((err) => showNote(err.message, true))
        .finally(() => {
          busy = false
          send.disabled = false
          send.textContent = 'إرسال التقييم'
        })
    })

    paint(0)
    load()

    return { reload: load }
  },

  autoMount() {
    return [...document.querySelectorAll('[data-comments-for]')].map((node) =>
      CommentsWidget.mount({
        container: node,
        lessonId: node.getAttribute('data-comments-for'),
      })
    )
  },
}

window.CommentsWidget = CommentsWidget
