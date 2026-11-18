/* Удобства статичных страниц: кто вошёл, закрытие меню телефона по нажатию
   мимо и по Escape, и подгонка страницы ровно в экран. Без этого файла
   строка работает целиком, а страница просто прокручивается. */
(function () {
  try {
    if (window.localStorage.getItem('fl-in') === '1') document.documentElement.setAttribute('data-fl-in', '')
  } catch (e) { /* хранилище закрыто — показываем как гостю */ }

  /* ── язык (владелец, 18.11.2026): тот же выбор, что в приложении
     (`src/lib/язык.ts`) — сначала выбор человека, потом язык браузера.
     Английский текст берётся из словаря `site/en.js` (window.FL_EN) по
     русскому тексту: переводится каждый текст страницы, в том числе тот, что
     скрипты страницы допишут позже. Нет перевода — остаётся русский. */
  var lang = (function () {
    try {
      var q = new URLSearchParams(location.search).get('язык')
      if (q === 'ru' || q === 'en') return q
      var s = localStorage.getItem('fl-lang')
      if (s === 'ru' || s === 'en') return s
    } catch (e) { /* хранилище закрыто */ }
    var c = /(?:^|;\s*)fl_lang=(ru|en)/.exec(document.cookie)
    if (c) return c[1]
    var list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
    for (var i = 0; i < list.length; i += 1) {
      var b = String(list[i]).toLowerCase().split('-')[0]
      if (b === 'ru' || b === 'en') return b
    }
    return 'en'
  })()
  var domain = /(^|\.)flamingo\.plus$/.test(location.hostname) ? '; domain=.flamingo.plus' : ''
  var secure = location.protocol === 'https:' ? '; Secure' : ''
  if (!/(?:^|;\s*)fl_lang=/.test(document.cookie)) document.cookie = 'fl_lang=' + lang + '; path=/; max-age=31536000; SameSite=Lax' + domain + secure
  document.documentElement.lang = lang
  document.documentElement.setAttribute('data-fl-lang', lang)
  function setLang(l) {
    try { localStorage.setItem('fl-lang', l) } catch (e) { /* остаётся кука */ }
    document.cookie = 'fl_lang=' + l + '; path=/; max-age=31536000; SameSite=Lax' + domain + secure
    var u = new URL(location.href); u.searchParams.delete('язык'); location.replace(u.toString())
  }
  document.addEventListener('click', function (e) {
    var b = e.target instanceof Element && e.target.closest('[data-set-lang]')
    if (!b) return
    e.preventDefault()
    var l = b.getAttribute('data-set-lang')
    if (l !== lang) setLang(l)
  })
  function markLang() {
    var all = document.querySelectorAll('[data-set-lang]')
    for (var i = 0; i < all.length; i += 1) all[i].setAttribute('aria-pressed', String(all[i].getAttribute('data-set-lang') === lang))
  }
  if (lang === 'en' && window.FL_EN) {
    var D = window.FL_EN
    var ATTR = ['title', 'aria-label', 'alt', 'placeholder', 'content']
    var tr = function (s) {
      var core = s.replace(/\s+/g, ' ').trim()
      if (!core || !D[core]) return null
      var lead = /^\s*/.exec(s)[0]; var trail = /\s*$/.exec(s)[0]
      return lead + D[core] + trail
    }
    var walk = function (root) {
      if (root.nodeType === 3) { var v = tr(root.nodeValue); if (v !== null) root.nodeValue = v; return }
      if (root.nodeType !== 1 || root.nodeName === 'SCRIPT' || root.nodeName === 'STYLE') return
      for (var a = 0; a < ATTR.length; a += 1) {
        var x = root.getAttribute(ATTR[a])
        if (x) { var y = tr(x); if (y !== null) root.setAttribute(ATTR[a], y) }
      }
      for (var n = root.firstChild; n; n = n.nextSibling) walk(n)
    }
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
  document.addEventListener('DOMContentLoaded', function () {
    markLang()
    if (lang === 'en' && window.FL_EN) { var t1 = (function (s) { var c = s.replace(/\s+/g, ' ').trim(); return window.FL_EN[c] })(document.title); if (t1) document.title = t1 }
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
