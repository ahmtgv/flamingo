import sys; sys.path.insert(0,'.')
import io
from _scene import (nachalo, pokaz, vtoroy_screen, mini, write, W, H, tile)
from _parts import head, TAIL

write('Main.dc.html',        nachalo(6))
write('Nachalo12.dc.html',   nachalo(12))
write('Nachalo30.dc.html',   nachalo(30))
write('NachaloUchenik.dc.html', nachalo(12, role='pupil'))
write('Pokaz.dc.html',       pokaz(8))
write('Pokaz30.dc.html',     pokaz(29))
write('PokazUchenik.dc.html',pokaz(8, role='pupil'))

CARD=('background:var(--color-surface);border:1px solid var(--color-border);border-radius:14px;padding:20px')
H1=('font-family:var(--font-heading);font-size:1.5rem;font-weight:500;letter-spacing:-.01em;'
    'color:var(--color-text);margin:0')
SUB='font-size:.875rem;line-height:1.4;color:var(--color-text-detail);margin:0'

sc=.46
def para(title, sub, left, right, foot):
    return f'''<div style="width:1560px;padding:32px;background:var(--color-bg);display:flex;
    flex-direction:column;gap:20px">
  <div><h1 style="{H1}">{title}</h1><p style="{SUB};margin-top:6px;max-width:80ch">{sub}</p></div>
  <div style="display:flex;gap:24px;align-items:flex-start">{left}{right}</div>
  <div style="{CARD}">{foot}</div>
</div>'''

# учитель: основной + второй экран
left  = mini(pokaz(8, second='Доска'), sc, caption='основной экран учителя')
right = mini(vtoroy_screen('Доска'), sc, caption='второй экран')
foot = '''<b style="display:block;font-size:.875rem;font-weight:500;color:var(--color-text);margin-bottom:8px">
  Как отправляют на второй экран</b>
<p style="font-size:.875rem;line-height:1.4;color:var(--color-text-detail);margin:0;max-width:100ch">
  У каждого источника в полке — «На второй экран&nbsp;↗». Ушедшее помечено зелёной точкой прямо в полке,
  так что видно без переключения. На основном экране источник остаётся: второй экран его повторяет, а не забирает.
  Отдельного ученика отправляют так же — «На второй экран&nbsp;↗» на его плитке в полосе.</p>'''
io.open('Vtoroy.dc.html','w',encoding='utf-8').write(head('Vtoroy')+para(
  'Второй экран у учителя',
  'Учитель может вывести на второй экран доску, презентацию, видео или отдельного ученика. '
  'Основной экран при этом не меняется.', left, right, foot)+TAIL)
print('wrote Vtoroy.dc.html')

# ученик со вторым экраном
left2  = mini(pokaz(8, role='pupil'), sc, caption='основной экран ученика')
right2 = mini(vtoroy_screen(who='Наталья Ким'), sc, caption='второй экран ученика')
foot2 = '''<b style="display:block;font-size:.875rem;font-weight:500;color:var(--color-text);margin-bottom:8px">
  Что попадает ученику</b>
<p style="font-size:.875rem;line-height:1.4;color:var(--color-text-detail);margin:0;max-width:100ch">
  Ученику со вторым экраном приходит то же, что учитель туда отправил. Выбирать он не может —
  второй экран ведёт учитель, как и первый. Если второго экрана нет, ученик ничего не теряет:
  всё, что там показано, есть и на основном.</p>'''
io.open('VtoroyUchenik.dc.html','w',encoding='utf-8').write(head('VtoroyUchenik')+para(
  'Второй экран у ученика',
  'Ученик со вторым экраном видит дополнительный экран помимо основного.', left2, right2, foot2)+TAIL)
print('wrote VtoroyUchenik.dc.html')
