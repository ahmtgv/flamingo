/* Удобства статичных страниц: кто вошёл, закрытие меню телефона по нажатию
   мимо и по Escape, и подгонка страницы ровно в экран. Без этого файла
   строка работает целиком, а страница просто прокручивается. */
(function () {
  try {
    if (window.localStorage.getItem('fl-in') === '1') document.documentElement.setAttribute('data-fl-in', '')
  } catch (e) { /* хранилище закрыто — показываем как гостю */ }
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
  var wide = window.matchMedia('(min-width: 901px)')
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
