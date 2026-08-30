import sys; sys.path.insert(0,'.')
import io
from _scene import nachalo, pokaz, vtoroy_screen, mini, write
from _parts import head, TAIL

write('Main.dc.html',           nachalo(6))
write('Nachalo12.dc.html',      nachalo(12))
write('Nachalo30.dc.html',      nachalo(30))
write('NachaloUchenik.dc.html', nachalo(12, role='pupil'))
write('Pokaz.dc.html',          pokaz(8))
write('Pokaz30.dc.html',        pokaz(30))
write('PokazUchenik.dc.html',   pokaz(8, role='pupil'))

CARD = 'background:var(--color-surface);border:1px solid var(--color-border);border-radius:14px;padding:20px'
H1 = ('font-family:var(--font-heading);font-size:1.5rem;font-weight:500;letter-spacing:-.01em;'
      'color:var(--color-text);margin:0')
SUB = 'font-size:.875rem;line-height:1.4;color:var(--color-text-detail);margin:0'
P = 'font-size:.875rem;line-height:1.4;color:var(--color-text-detail);margin:0;max-width:100ch'
B = 'display:block;font-size:.875rem;font-weight:500;color:var(--color-text);margin-bottom:8px'
sc = .46

def para(title, sub, panes, foot, h=700):
    return f'''<div style="width:1560px;height:{h}px;padding:32px;background:var(--color-bg);
    display:flex;flex-direction:column;gap:20px">
  <div><h1 style="{H1}">{title}</h1><p style="{SUB};margin-top:6px;max-width:84ch">{sub}</p></div>
  <div style="display:flex;gap:24px;align-items:flex-start">{panes}</div>
  <div style="{CARD};margin-top:auto">{foot}</div>
</div>'''

panes = (mini(pokaz(8, second='Доска'), sc, caption='основной экран учителя')
         + mini(vtoroy_screen('Доска'), sc, caption='его второй экран'))
foot = f'''<b style="{B}">Как отправляют на второй экран</b>
<p style="{P}">У того источника, который сейчас показывают, в полке появляется стрелка «↗».
  Пока источник живёт на втором экране, рядом с его именем горит точка — видно, не переключаясь.
  Основной экран не меняется: второй повторяет источник, а не забирает его.
  Отдельного ученика отправляют так же — стрелкой на его плитке в полосе.</p>'''
io.open('Vtoroy.dc.html','w',encoding='utf-8').write(head('Vtoroy') + para(
  'Второй экран у учителя',
  'На второй экран уходит доска, презентация, видео или отдельный ученик. Основной экран остаётся прежним.',
  panes, foot) + TAIL)
print('wrote Vtoroy.dc.html')

panes2 = (mini(pokaz(8, role='pupil'), sc, caption='основной экран ученика')
          + mini(vtoroy_screen('Доска'), sc, caption='его второй экран'))
foot2 = f'''<b style="{B}">Что приходит ученику</b>
<p style="{P}">Ровно то, что учитель отправил, — здесь доска. Выбирать ученик не может:
  вторым экраном распоряжается учитель, как и первым. Без второго экрана ученик ничего не теряет:
  всё, что на нём показано, есть и на основном.</p>'''
io.open('VtoroyUchenik.dc.html','w',encoding='utf-8').write(head('VtoroyUchenik') + para(
  'Второй экран у ученика',
  'У кого есть второй экран — видит на нём то же, что учитель туда вывел.',
  panes2, foot2) + TAIL)
print('wrote VtoroyUchenik.dc.html')

panes3 = (mini(pokaz(8, second='Доска'), sc, caption='основной экран учителя')
          + mini(vtoroy_screen(pupil='Соня П.'), sc, caption='второй экран: один ученик'))
foot3 = f'''<b style="{B}">Отдельный ученик на втором экране</b>
<p style="{P}">Ученик, которого вывели, занимает второй экран целиком — так его видно всему классу,
  пока он отвечает. В полосе он остаётся на своём месте, и его плитка помечена стрелкой.
  Урок на основном экране идёт своим чередом.</p>'''
io.open('VtoroyUchenikNaEkrane.dc.html','w',encoding='utf-8').write(head('VtoroyUchenikNaEkrane') + para(
  'На второй экран — отдельный ученик',
  'Четвёртое, что можно вывести: не источник, а человек.',
  panes3, foot3) + TAIL)
print('wrote VtoroyUchenikNaEkrane.dc.html')
