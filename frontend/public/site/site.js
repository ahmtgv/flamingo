/* Мелкие удобства единой строки на статичных страницах: кто вошёл,
   и закрытие меню телефона по нажатию мимо и по Escape. Без этого файла
   строка работает целиком — он ничего не рисует. */
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
})()
