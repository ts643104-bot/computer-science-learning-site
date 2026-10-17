/**
 * ============================================================================
 *  comments-widget.js — خانة التقييم بالنجوم والتعليقات أسفل كل درس
 *  تصميم المهندس طه سلطان / タハ A3
 * ============================================================================
 *
 *  الاستخدام:
 *    CommentsWidget.mount({
 *      container: document.getElementById('comments'),
 *      lessonId: 'cs-01',
 *      lessonTitle: 'مقدمة في علوم الحاسب'
 *    })
 *
 *  بيعتمد على api-client.js (لازم يتحمّل قبله)
 * ============================================================================
 */

;(function (global) {
  'use strict'

  // --------------------------------------------------------------------------
  //  الستايل (بيتحقن مرة واحدة بس)
  // --------------------------------------------------------------------------
  var STYLE_ID = 'sw-comments-style'

  var CSS = [
    '.swc{--swc-gold:#fcd34d;--swc-muted:#94a3b8;--swc-card:#0f1729;--swc-line:rgba(148,163,184,.14);',
    '  --swc-line-strong:rgba(148,163,184,.3);--swc-accent:#22c55e;--swc-text:#f1f5f9;',
    '  font-family:"IBM Plex Sans Arabic",system-ui,sans-serif;direction:rtl;margin-block:2.5rem;',
    '  background:var(--swc-card);border:1px solid var(--swc-line);border-radius:18px;padding:1.5rem}',
    '.swc *{box-sizing:border-box}',
    '.swc-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem}',
    '.swc-title{font-size:1.1rem;font-weight:700;color:var(--swc-text);margin:0}',
    '.swc-summary{display:flex;align-items:center;gap:.6rem}',
    '.swc-avg{font-size:1.9rem;font-weight:700;color:var(--swc-gold);font-family:"JetBrains Mono",monospace;line-height:1}',
    '.swc-avg-meta{font-size:.76rem;color:var(--swc-muted);line-height:1.5}',
    '.swc-stars{display:inline-flex;gap:.15rem;direction:ltr}',
    '.swc-star{background:none;border:0;padding:0;cursor:pointer;line-height:1;font-size:1.35rem;color:#475569;transition:color .15s ease,transform .15s ease}',
    '.swc-star.read{cursor:default}',
    '.swc-star.on{color:var(--swc-gold)}',
    '.swc-star:not(.read):hover{transform:scale(1.18)}',
    '.swc-form{border-top:1px solid var(--swc-line);padding-top:1.25rem;margin-bottom:1.5rem}',
    '.swc-label{display:block;font-size:.82rem;font-weight:600;color:var(--swc-muted);margin-bottom:.45rem}',
    '.swc-textarea{width:100%;min-height:96px;resize:vertical;background:#070c17;border:1px solid var(--swc-line-strong);border-radius:12px;padding:.75rem .9rem;color:var(--swc-text);font-family:inherit;font-size:.92rem;line-height:1.8;outline:none;transition:border-color .18s ease,box-shadow .18s ease}',
    '.swc-textarea:focus{border-color:#22c55e99;box-shadow:0 0 0 3px #22c55e26}',
    '.swc-row{display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin-top:.9rem}',
    '.swc-btn{display:inline-flex;align-items:center;gap:.45rem;padding:.62rem 1.4rem;border-radius:999px;border:1px solid transparent;font-size:.9rem;font-weight:600;font-family:inherit;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,background .18s ease}',
    '.swc-btn-p{background:linear-gradient(135deg,#22c55e,#4ade80);color:#04160b;box-shadow:0 8px 24px #22c55e47}',
    '.swc-btn-p:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px #22c55e6b}',
    '.swc-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}',
    '.swc-msg{padding:.6rem .95rem;border-radius:11px;font-size:.87rem;margin-bottom:1rem;display:none}',
    '.swc-msg.on{display:block}',
    '.swc-msg.ok{background:#22c55e1a;border:1px solid #22c55e4d;color:#86efac}',
    '.swc-msg.err{background:#ef44441a;border:1px solid #ef44444d;color:#fca5a5}',
    '.swc-list{display:flex;flex-direction:column;gap:.85rem}',
    '.swc-item{background:#070c1780;border:1px solid var(--swc-line);border-radius:14px;padding:.9rem 1.05rem}',
    '.swc-item-top{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;margin-bottom:.4rem}',
    '.swc-who{display:flex;align-items:center;gap:.55rem}',
    '.swc-avatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:.78rem;font-weight:700;background:linear-gradient(135deg,#22c55e,#38bdf8);color:#04160b;flex:0 0 auto}',
    '.swc-name{font-size:.87rem;font-weight:600;color:var(--swc-text)}',
    '.swc-when{font-size:.72rem;color:#64748b}',
    '.swc-body{font-size:.92rem;line-height:1.9;color:#dbe3ee;white-space:pre-wrap;word-break:break-word}',
    '.swc-empty{text-align:center;color:var(--swc-muted);padding:1.75rem 1rem;font-size:.9rem;border:1px dashed var(--swc-line-strong);border-radius:14px}',
    '.swc-skeleton{height:64px;border-radius:14px;background:linear-gradient(90deg,#0f1729,#16213a,#0f1729);background-size:200% 100%;animation:swcShimmer 1.3s infinite}',
    '@keyframes swcShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}',
    '@media (prefers-reduced-motion:reduce){.swc-skeleton{animation:none}}',
    '.swc-foot{margin-top:1.75rem;text-align:center;font-size:.78rem;color:#64748b;border-top:1px solid var(--swc-line);padding-top:1rem}',
  ].join('\n')

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return
    var s = document.createElement('style')
    s.id = STYLE_ID
    s.textContent = CSS
    document.head.appendChild(s)
  }

  // --------------------------------------------------------------------------
  //  أدوات
  // --------------------------------------------------------------------------
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function fmtDate(iso) {
    if (!iso) return ''
    try {
      var d = new Date(iso)
      var diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60) return 'الآن'
      if (diff < 3600) return 'من ' + Math.floor(diff / 60) + ' دقيقة'
      if (diff < 86400) return 'من ' + Math.floor(diff / 3600) + ' ساعة'
      if (diff < 604800) return 'من ' + Math.floor(diff / 86400) + ' يوم'
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch (e) {
      return ''
    }
  }

  function initial(name) {
    var n = String(name || '؟').trim()
    return n ? n.charAt(0) : '؟'
  }

  /** يرسم نجوم للقراءة فقط */
  function starsHtml(rating) {
    var out = '<span class="swc-stars">'
    for (var i = 1; i <= 5; i++) {
      out += '<span class="swc-star read' + (i <= rating ? ' on' : '') + '">★</span>'
    }
    return out + '</span>'
  }

  // --------------------------------------------------------------------------
  //  الودجت
  // --------------------------------------------------------------------------
  function Widget(opts) {
    this.container = opts.container
    this.lessonId = opts.lessonId
    this.lessonTitle = opts.lessonTitle || ''
    this.rating = 0
    this.items = []
    this.summary = { count: 0, average: 0 }
    this.busy = false
  }

  Widget.prototype.render = function () {
    var self = this

    this.container.innerHTML =
      '<div class="swc">' +
      '<div class="swc-head">' +
      '<h3 class="swc-title">💬 التقييم والتعليقات</h3>' +
      '<div class="swc-summary" id="swcSummary"></div>' +
      '</div>' +
      '<div id="swcMsg" class="swc-msg"></div>' +
      '<div class="swc-form">' +
      '<label class="swc-label">قيّم الدرس (١ لـ ٥ نجوم)</label>' +
      '<div class="swc-stars" id="swcPick">' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
          return '<button type="button" class="swc-star" data-star="' + n + '" aria-label="' + n + ' نجوم">★</button>'
        })
        .join('') +
      '</div>' +
      '<label class="swc-label" style="margin-top:1rem">اكتب تعليقك</label>' +
      '<textarea class="swc-textarea" id="swcText" maxlength="1000" ' +
      'placeholder="إيه رأيك في الدرس؟ إيه اللي فهمته وإيه اللي محتاج توضيح؟"></textarea>' +
      '<div class="swc-row">' +
      '<span class="swc-when" id="swcCount">0 / 1000</span>' +
      '<button type="button" class="swc-btn swc-btn-p" id="swcSend">إرسال التقييم</button>' +
      '</div>' +
      '</div>' +
      '<div class="swc-list" id="swcList"></div>' +
      '<div class="swc-foot">تصميم المهندس طه سلطان / タハ A3</div>' +
      '</div>'

    // -------- تفاعل النجوم --------
    var pickBtns = this.container.querySelectorAll('#swcPick .swc-star')
    pickBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.rating = parseInt(btn.getAttribute('data-star'), 10) || 0
        self.paintStars()
      })
      btn.addEventListener('mouseenter', function () {
        var hover = parseInt(btn.getAttribute('data-star'), 10) || 0
        paintStars(pickBtns, hover)
      })
    })
    var pickWrap = this.container.querySelector('#swcPick')
    pickWrap.addEventListener('mouseleave', function () {
      paintStars(pickBtns, self.rating)
    })

    // -------- عدّاد الحروف --------
    var ta = this.container.querySelector('#swcText')
    var counter = this.container.querySelector('#swcCount')
    ta.addEventListener('input', function () {
      counter.textContent = ta.value.length + ' / 1000'
    })

    // -------- الإرسال --------
    this.container.querySelector('#swcSend').addEventListener('click', function () {
      self.submit()
    })

    this.paintStars()
    this.load()
  }

  Widget.prototype.paintStars = function () {
    var btns = this.container.querySelectorAll('#swcPick .swc-star')
    paintStars(btns, this.rating)
  }

  function paintStars(btns, upto) {
    btns.forEach(function (b) {
      var n = parseInt(b.getAttribute('data-star'), 10) || 0
      if (n <= upto) b.classList.add('on')
      else b.classList.remove('on')
    })
  }

  Widget.prototype.msg = function (text, kind) {
    var el = this.container.querySelector('#swcMsg')
    if (!el) return
    if (!text) {
      el.className = 'swc-msg'
      return
    }
    el.textContent = text
    el.className = 'swc-msg on ' + (kind === 'err' ? 'err' : 'ok')
    if (kind !== 'err') {
      var self = this
      setTimeout(function () {
        if (el.textContent === text) el.className = 'swc-msg'
      }, 5000)
    }
  }

  // -------- تحميل التعليقات --------
  Widget.prototype.load = function () {
    var self = this
    var list = this.container.querySelector('#swcList')
    list.innerHTML = '<div class="swc-skeleton"></div><div class="swc-skeleton"></div>'

    if (!global.Api || !global.Api.getComments) {
      list.innerHTML = '<div class="swc-empty">⚠️ مكتبة الاتصال مش محمّلة</div>'
      return
    }

    global.Api.getComments(this.lessonId)
      .then(function (data) {
        self.items = (data && data.items) || []
        self.summary = (data && data.summary) || { count: 0, average: 0 }
        self.renderSummary()
        self.renderList()
      })
      .catch(function (err) {
        list.innerHTML =
          '<div class="swc-empty">مش قادر أحمّل التعليقات دلوقتي: ' + esc(err.message) + '</div>'
      })
  }

  Widget.prototype.renderSummary = function () {
    var el = this.container.querySelector('#swcSummary')
    if (!el) return
    var s = this.summary
    if (!s || !s.count) {
      el.innerHTML = '<span class="swc-avg-meta">مفيش تقييمات لسه — كن أول واحد!</span>'
      return
    }
    el.innerHTML =
      '<span class="swc-avg">' +
      s.average +
      '</span>' +
      '<span class="swc-avg-meta">' +
      starsHtml(Math.round(s.average)) +
      '<br>' +
      s.count +
      ' تقييم</span>'
  }

  Widget.prototype.renderList = function () {
    var list = this.container.querySelector('#swcList')

    if (!this.items.length) {
      list.innerHTML = '<div class="swc-empty">مفيش تعليقات على الدرس ده لسه. اكتب أول واحد! ✍️</div>'
      return
    }

    list.innerHTML = this.items
      .map(function (c) {
        return (
          '<div class="swc-item">' +
          '<div class="swc-item-top">' +
          '<div class="swc-who">' +
          '<span class="swc-avatar">' +
          esc(initial(c.username)) +
          '</span>' +
          '<span class="swc-name">' +
          esc(c.username || 'زائر') +
          '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:.6rem">' +
          starsHtml(c.rating) +
          '<span class="swc-when">' +
          fmtDate(c.timestamp) +
          '</span>' +
          '</div>' +
          '</div>' +
          (c.comment ? '<div class="swc-body">' + esc(c.comment) + '</div>' : '') +
          '</div>'
        )
      })
      .join('')
  }

  // -------- إرسال تقييم + تعليق --------
  Widget.prototype.submit = function () {
    var self = this
    var btn = this.container.querySelector('#swcSend')
    var ta = this.container.querySelector('#swcText')

    if (!this.rating) {
      this.msg('اختار تقييم بالنجوم الأول ⭐', 'err')
      return
    }
    if (this.busy) return

    if (!global.Api || !global.Api.addComment) {
      this.msg('مكتبة الاتصال مش محمّلة', 'err')
      return
    }

    this.busy = true
    btn.disabled = true
    btn.textContent = 'جاري الإرسال…'
    this.msg('')

    global.Api.addComment(this.lessonId, this.rating, ta.value.trim())
      .then(function () {
        self.msg('تم إضافة تعليقك، شكرًا ليك! 🎉', 'ok')
        self.rating = 0
        self.paintStars()
        ta.value = ''
        var counter = self.container.querySelector('#swcCount')
        if (counter) counter.textContent = '0 / 1000'
        self.load()
      })
      .catch(function (err) {
        self.msg(err.message, 'err')
      })
      .then(function () {
        self.busy = false
        btn.disabled = false
        btn.textContent = 'إرسال التقييم'
      })
  }

  // --------------------------------------------------------------------------
  //  الواجهة العامة
  // --------------------------------------------------------------------------
  var CommentsWidget = {
    mount: function (opts) {
      if (!opts || !opts.container || !opts.lessonId) {
        console.error('[CommentsWidget] محتاج container و lessonId')
        return null
      }
      injectStyle()
      var w = new Widget(opts)
      w.render()
      return w
    },

    /** يركّب تلقائي على أي عنصر فيه data-lesson-id */
    autoMount: function () {
      var nodes = document.querySelectorAll('[data-comments-for]')
      var out = []
      nodes.forEach(function (n) {
        out.push(
          CommentsWidget.mount({
            container: n,
            lessonId: n.getAttribute('data-comments-for'),
            lessonTitle: n.getAttribute('data-lesson-title') || '',
          })
        )
      })
      return out
    },
  }

  global.CommentsWidget = CommentsWidget
})(typeof window !== 'undefined' ? window : this)
