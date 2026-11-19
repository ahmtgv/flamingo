/* Удобства статичных страниц: кто вошёл, закрытие меню телефона по нажатию
   мимо и по Escape, и подгонка страницы ровно в экран. Без этого файла
   строка работает целиком, а страница просто прокручивается. */
(function () {
  try {
    if (window.localStorage.getItem('fl-in') === '1') document.documentElement.setAttribute('data-fl-in', '')
  } catch (e) { /* хранилище закрыто — показываем как гостю */ }

  /* ── язык (владелец: 18.11.2026 — английский, 19.11.2026 — выпадашка и
     ещё шесть языков): тот же выбор, что в приложении (`src/lib/язык.ts`) —
     сначала выбор человека, потом язык браузера. Перевод берётся из словаря
     `site/<код>.js` по русскому тексту: переводится каждый текст страницы, в
     том числе тот, что скрипты страницы допишут позже. Нет перевода — остаётся
     русский.

     🔴 СПИСОК ЯЗЫКОВ — ТОТ ЖЕ, ЧТО В `src/lib/язык.ts`. `ready` — язык
     предлагается людям; остальные открываются только адресом `?язык=ka`.

     🔴 СЛОВАРЬ ГРУЗИТСЯ ДО ТЕКСТА СТРАНИЦЫ. Этот файл стоит в разметке
     обычным (синхронным) скриптом, поэтому `document.write` вставляет словарь
     сразу за ним — страница не мигает русским. Словарь, загрузившись, сам
     зовёт `FL_START(словарь)`. */
  var LANGS = [
    { code: 'ru', name: 'Русский', ready: true },
    { code: 'en', name: 'English', ready: true },
    { code: 'ka', name: 'ქართული', ready: false },
    { code: 'fr', name: 'Français', ready: true },
    { code: 'es', name: 'Español', ready: true },
    { code: 'de', name: 'Deutsch', ready: true },
    { code: 'tr', name: 'Türkçe', ready: true },
    { code: 'ar', name: 'العربية', ready: false, rtl: true }
  ]
  var DICT_VERSION = 2
  function known(c) { for (var i = 0; i < LANGS.length; i += 1) if (LANGS[i].code === c) return LANGS[i]; return null }
  function ready(c) { var l = known(c); return !!(l && l.ready) }
  var lang = (function () {
    try {
      var q = new URLSearchParams(location.search).get('язык')
      if (q && known(q)) return q
      var s = localStorage.getItem('fl-lang')
      if (ready(s)) return s
    } catch (e) { /* хранилище закрыто */ }
    var c = /(?:^|;\s*)fl_lang=([a-z]{2})/.exec(document.cookie)
    if (c && ready(c[1])) return c[1]
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
    for (var i = 0; i < list.length; i += 1) {
      var b = String(list[i]).toLowerCase().split('-')[0]
      if (ready(b)) return b
    }
    return 'en'
  })()
  var domain = /(^|\.)flamingo\.plus$/.test(location.hostname) ? '; domain=.flamingo.plus' : ''
  var secure = location.protocol === 'https:' ? '; Secure' : ''
  if (!/(?:^|;\s*)fl_lang=/.test(document.cookie)) document.cookie = 'fl_lang=' + lang + '; path=/; max-age=31536000; SameSite=Lax' + domain + secure
  document.documentElement.lang = lang
  document.documentElement.dir = known(lang).rtl ? 'rtl' : 'ltr'
  document.documentElement.setAttribute('data-fl-lang', lang)
  function setLang(l) {
    try { localStorage.setItem('fl-lang', l) } catch (e) { /* остаётся кука */ }
    document.cookie = 'fl_lang=' + l + '; path=/; max-age=31536000; SameSite=Lax' + domain + secure
    var u = new URL(location.href); u.searchParams.delete('язык'); location.replace(u.toString())
  }

  /* выпадашка «RU ▾» — рисуется в каждом месте `.flnav__lang` разметки */
  function drawLangMenu() {
    var spots = document.querySelectorAll('.flnav__lang')
    for (var k = 0; k < spots.length; k += 1) {
      var spot = spots[k]
      if (spot.getAttribute('data-drawn')) continue
      spot.setAttribute('data-drawn', '1')
      spot.removeAttribute('role')
      var html = '<button type="button" class="flnav__lang-now" aria-haspopup="menu" aria-expanded="false" aria-label="Язык · Language">' +
        lang.toUpperCase() + '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="m2 3.5 3 3 3-3"/></svg></button><ul class="flnav__lang-list" role="menu" hidden>'
      for (var i = 0; i < LANGS.length; i += 1) {
        var L = LANGS[i]
        if (!L.ready && L.code !== lang) continue
        html += '<li role="none"><button type="button" role="menuitemradio" data-set-lang="' + L.code + '" lang="' + L.code + '" dir="' + (L.rtl ? 'rtl' : 'ltr') +
          '" aria-checked="' + (L.code === lang) + '">' + L.name + '<span>' + L.code.toUpperCase() + '</span></button></li>'
      }
      spot.innerHTML = html + '</ul>'
    }
  }
  function closeLang(except) {
    var all = document.querySelectorAll('.flnav__lang-now[aria-expanded="true"]')
    for (var i = 0; i < all.length; i += 1) {
      if (all[i] === except) continue
      all[i].setAttribute('aria-expanded', 'false')
      all[i].nextElementSibling.hidden = true
    }
  }
  document.addEventListener('click', function (e) {
    var t = e.target instanceof Element ? e.target : null
    var now = t && t.closest('.flnav__lang-now')
    if (now) {
      var open = now.getAttribute('aria-expanded') !== 'true'
      closeLang(now)
      now.setAttribute('aria-expanded', String(open))
      now.nextElementSibling.hidden = !open
      return
    }
    var b = t && t.closest('[data-set-lang]')
    if (b) {
      e.preventDefault()
      closeLang()
      var l = b.getAttribute('data-set-lang')
      if (l !== lang) setLang(l)
      return
    }
    if (!t || !t.closest('.flnav__lang')) closeLang()
  })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLang() })

  var D = null
  var ATTR = ['title', 'aria-label', 'alt', 'placeholder', 'content']
  function tr(s) {
    var core = s.replace(/\s+/g, ' ').trim()
    if (!core || !D[core]) return null
    var lead = /^\s*/.exec(s)[0]; var trail = /\s*$/.exec(s)[0]
    return lead + D[core] + trail
  }
  function walk(root) {
    if (root.nodeType === 3) { var v = tr(root.nodeValue); if (v !== null) root.nodeValue = v; return }
    if (root.nodeType !== 1 || root.nodeName === 'SCRIPT' || root.nodeName === 'STYLE') return
    for (var a = 0; a < ATTR.length; a += 1) {
      var x = root.getAttribute(ATTR[a])
      if (x) { var y = tr(x); if (y !== null) root.setAttribute(ATTR[a], y) }
    }
    for (var n = root.firstChild; n; n = n.nextSibling) walk(n)
  }
  /* Словарь пришёл — переводим всё, что уже есть, и всё, что появится. */
  window.FL_START = function (dict) {
    if (D || lang === 'ru' || !dict) return
    D = dict
    var t0 = tr(document.title); if (t0 !== null) document.title = t0
    walk(document.documentElement)
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i += 1) {
        var m = list[i]
        if (m.type === 'characterData') { var v = tr(m.target.nodeValue); if (v !== null && v !== m.target.nodeValue) m.target.nodeValue = v }
        else if (m.type === 'attributes') { var z = tr(m.target.getAttribute(m.attributeName) || ''); if (z !== null) m.target.setAttribute(m.attributeName, z) }
        else for (var j = 0; j < m.addedNodes.length; j += 1) walk(m.addedNodes[j])
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR })
  }
  if (lang !== 'ru') {
    var src = '/site/' + lang + '.js?v=' + DICT_VERSION
    if (document.readyState === 'loading') document.write('<script src="' + src + '"><\/script>')
    else { var sc = document.createElement('script'); sc.src = src; document.head.appendChild(sc) }
  }
  document.addEventListener('DOMContentLoaded', function () {
    drawLangMenu()
    if (D) { var t1 = tr(document.title); if (t1 !== null) document.title = t1 }
  })
  function close() {
    var all = document.querySelectorAll('.flnav__more[open]')
    for (var i = 0; i < all.length; i += 1) all[i].removeAttribute('open')
  }
  document.addEventListener('click', function (e) {
    var t = e.target
    if (!(t instanceof Element)) return
    if (t.closest('.flnav__panel a') || !t.closest('.flnav__more')) close()
  })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close() })

  /* Страница ровно в экран (кроме телефона): если содержимому не хватает
     высоты, оно уменьшается целиком — раскладка и пропорции те же, меняется
     только масштаб. Работает там, где в разметке есть [data-fl-stage]. */
  var stage = document.querySelector('[data-fl-stage]')
  var inner = stage && stage.firstElementChild
  if (!inner) return
  /* телефон (узко или низко) прокручивается; планшет и всё крупнее — нет */
  var wide = window.matchMedia('(min-width: 701px) and (min-height: 501px)')
  function fit() {
    if (!wide.matches) {
      document.documentElement.removeAttribute('data-fl-fit')
      inner.style.width = ''; inner.style.height = ''; inner.style.transform = ''
      return
    }
    document.documentElement.setAttribute('data-fl-fit', '')
    var w = stage.clientWidth
    var h = stage.clientHeight
    if (!w || !h) return
    function natural(z) { inner.style.width = w / z + 'px'; inner.style.height = 'auto'; return inner.offsetHeight }
    var z = 1
    for (var i = 0; i < 3; i += 1) z = Math.min(1, h / natural(z))
    if (z < 1) z = Math.min(1, h / (natural(z) + 1))
    inner.style.height = h / z + 'px'
    inner.style.transform = z === 1 ? '' : 'scale(' + z + ')'
  }
  fit()
  window.addEventListener('resize', fit)
  window.addEventListener('load', fit)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit)
})()
