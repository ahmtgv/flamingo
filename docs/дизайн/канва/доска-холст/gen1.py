from _room import room, write

# 1. Холст 100% — пульт масштаба спит, на холсте не висит ничего (ПРАВИЛА 3.10)
write('Main.dc.html', room(scale=1.0, tx=-60, ty=-40, zoom_pct=100, zoom_state='sleep'))

# 2. Отдалили — видно всё, что написано
write('Otdalen.dc.html', room(scale=0.45, tx=140, ty=110, zoom_pct=45,
      zoom_state='awake', hint='Показать всё'))

# 3. Приблизили
write('Priblizhen.dc.html', room(scale=2.0, tx=-680, ty=-560, zoom_pct=200,
      zoom_state='awake', hint='Вернуть 100%'))
