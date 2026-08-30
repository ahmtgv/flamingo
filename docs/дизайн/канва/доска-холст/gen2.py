import io
from _parts import head, TAIL

CARD = ('background:var(--color-surface);border:1px solid var(--color-border);'
        'border-radius:14px;padding:20px')
H = ('font-family:var(--font-heading);font-size:1.1875rem;font-weight:500;'
     'letter-spacing:-.01em;color:var(--color-text);margin:0')
SUB = 'font-size:.875rem;line-height:1.4;color:var(--color-text-detail);margin:0'
KEY = ('display:inline-grid;place-items:center;min-width:28px;height:28px;padding:0 8px;'
       'border:1px solid var(--color-border-strong);border-radius:8px;background:var(--color-surface);'
       'font:500 .8125rem var(--font-mono);color:var(--color-text)')

def hand():
    return '''<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1d1d1f"
      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11"></path>
      <path d="M12 11V4.5a1.5 1.5 0 0 1 3 0V11"></path>
      <path d="M15 11V6.5a1.5 1.5 0 0 1 3 0V13"></path>
      <path d="M9 11V9.5a1.5 1.5 0 0 0-3 0V14c0 3.3 2.7 6 6 6h1.5c2.5 0 4.5-2 4.5-4.5V13"></path>
    </svg>'''

def mouse():
    return '''<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1d1d1f"
      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="5"></rect>
      <path d="M12 7v3"></path>
    </svg>'''

def pinch():
    return '''<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1d1d1f"
      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M4 12h5M20 12h-5"></path>
      <path d="M7 9l-3 3 3 3M17 9l3 3-3 3"></path>
    </svg>'''

def twofinger():
    return '''<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1d1d1f"
      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="13" rx="2"></rect>
      <circle cx="10" cy="11" r="1.4" fill="#1d1d1f" stroke="none"></circle>
      <circle cx="14.5" cy="11" r="1.4" fill="#1d1d1f" stroke="none"></circle>
      <path d="M8 21h8"></path>
    </svg>'''

def dbl():
    return '''<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1d1d1f"
      stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12 4v2M12 18v2M4 12h2M18 12h2"></path>
    </svg>'''

def row(icon, keys, title, note):
    k = ''.join(f'<span style="{KEY}">{x}</span>' if x != '+' else
                '<span style="color:var(--color-text-hint);font-size:.8125rem">+</span>'
                for x in keys)
    return f'''<div style="display:grid;grid-template-columns:28px 210px minmax(0,1fr);align-items:center;
        gap:16px;padding:14px 0;border-bottom:1px solid var(--color-border)">
      <span style="display:grid;place-items:center">{icon}</span>
      <span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">{k}</span>
      <span><b style="font-size:.875rem;font-weight:500;color:var(--color-text)">{title}</b>
        <span style="display:block;font-size:.8125rem;line-height:1.4;color:var(--color-text-detail);margin-top:2px">{note}</span></span>
    </div>'''

zahvat = f'''<div style="width:900px;height:740px;padding:32px;background:var(--color-bg);display:flex;flex-direction:column;gap:20px">
  <div>
    <h1 style="{H};font-size:1.5rem">Чем берут холст</h1>
    <p style="{SUB};margin-top:6px;max-width:60ch">Перо рисует при перетаскивании, поэтому холст нельзя
      двигать тем же движением. У сдвига должен быть свой захват — и он должен работать и без клавиатуры.</p>
  </div>
  <div style="{CARD};padding:4px 20px">
    {row(hand(), ['Пробел', '+', 'тянуть'], 'Сдвинуть холст',
         'Пока клавиша нажата, перо не рисует, курсор — рука. Отпустил — снова перо.')}
    {row(mouse(), ['средняя кнопка'], 'Сдвинуть холст',
         'Для мыши с колесом. Ничего не нажимать на клавиатуре.')}
    {row(twofinger(), ['два пальца'], 'Сдвинуть холст',
         'Трекпад и сенсорный экран. Одним пальцем по-прежнему рисует перо.')}
    {row(pinch(), ['Cmd', '+', 'колесо'], 'Приблизить и отдалить',
         'И щипок двумя пальцами. Масштаб растёт от точки под курсором, а не от центра экрана.')}
    {row(dbl(), ['двойной щелчок'], 'Вернуться к 100 %',
         'По пустому месту холста. То же делает «Вернуть 100 %» в пульте масштаба.')}
  </div>
  <div style="display:flex;gap:12px;align-items:flex-start;padding:16px 20px;border-radius:14px;
      background:var(--color-go-bg);border:1px solid var(--color-go-border)">
    <span style="display:grid;place-items:center;width:34px;height:34px;border-radius:8px;
      background:var(--color-surface);border:1px solid var(--color-border);flex:0 0 auto">{hand()}</span>
    <span><b style="font-size:.875rem;font-weight:500;color:var(--color-go-text)">Вопрос владельцу: нужна ли «Рука» кнопкой в панели</b>
      <span style="display:block;font-size:.8125rem;line-height:1.4;color:var(--color-text-detail);margin-top:4px;max-width:70ch">
      Клавиатура есть не у всех: планшет, доска в классе, ученик с телефона. Отдельная кнопка — постоянный
      режим «двигать, не рисовать». Это новая кнопка в панели инструментов, поэтому решаете вы.</span></span>
  </div>
</div>'''
io.open('Zahvat.dc.html','w',encoding='utf-8').write(head('Zahvat')+zahvat+TAIL)

# ── три варианта: чей вид ─────────────────────────────────────────────────
def screen(title, teacher_box, pupil_box, badge=''):
    def mini(label, x, y, w, h, dim=False, back=False):
        pill = ('<span style="position:absolute;right:8px;top:8px;font:500 .6875rem var(--font-mono);'
                'color:var(--color-on-go);background:var(--color-go-solid);border-radius:999px;'
                'padding:2px 8px">Вернуться к учителю</span>') if back else ''
        return f'''<div style="position:relative;width:260px;height:150px;border-radius:12px;
          background:var(--color-surface);border:1px solid var(--color-border);overflow:hidden;
          background-image:radial-gradient(circle,var(--color-border) 1px,transparent 1px);background-size:12px 12px">
          <svg viewBox="0 0 1600 1100" width="260" height="179" style="position:absolute;left:0;top:-14px;opacity:{'.35' if dim else '1'}">
            <path d="M120 150 L470 150 M120 150 L120 400 L470 150" fill="none" stroke="#1d1d1f" stroke-width="14"/>
            <path d="M300 470 C330 452 372 470 396 452 C420 434 452 470 486 452" fill="none" stroke="#e14e1f" stroke-width="14"/>
            <path d="M840 620 L1180 620 L1180 880 L840 880 Z" fill="none" stroke="#1d1d1f" stroke-width="10"/>
            <path d="M900 700 C960 660 1010 760 1080 706" fill="none" stroke="#2f8a56" stroke-width="12"/>
          </svg>
          <div style="position:absolute;left:{x}px;top:{y}px;width:{w}px;height:{h}px;
            border:2px solid var(--color-go);border-radius:6px;background:rgba(47,138,86,.06)"></div>
          <span style="position:absolute;left:8px;bottom:6px;font:500 .75rem var(--font-mono);
            color:var(--color-text-detail);background:rgba(255,255,255,.86);padding:1px 6px;border-radius:4px">{label}</span>
          {pill}
        </div>'''
    return mini(*teacher_box), mini(*pupil_box)

def variant(name, sub, t_box, p_box, plus, minus, badge=''):
    t, p = screen(name, t_box, p_box)
    b = (f'<span style="margin-left:auto;font:500 .8125rem var(--font-mono);color:var(--color-go-text);'
         f'background:var(--color-go-bg);border:1px solid var(--color-go-border);border-radius:999px;'
         f'padding:3px 10px">{badge}</span>') if badge else ''
    return f'''<div style="width:680px;height:520px;padding:28px;background:var(--color-bg);
        display:flex;flex-direction:column;gap:18px">
  <div style="display:flex;align-items:center;gap:12px">
    <h1 style="{H}">{name}</h1>{b}
  </div>
  <p style="{SUB};max-width:64ch">{sub}</p>
  <div style="display:flex;gap:20px">
    <div style="display:flex;flex-direction:column;gap:8px">
      <span style="font:500 .8125rem var(--font-mono);color:var(--color-text-detail)">учитель</span>{t}</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <span style="font:500 .8125rem var(--font-mono);color:var(--color-text-detail)">ученик</span>{p}</div>
  </div>
  <div style="{CARD};display:flex;flex-direction:column;gap:10px;margin-top:auto">
    <span style="display:flex;gap:10px;font-size:.875rem;line-height:1.4;color:var(--color-text)">
      <b style="color:var(--color-go-text);font-weight:500;flex:0 0 auto">За</b><span>{plus}</span></span>
    <span style="display:flex;gap:10px;font-size:.875rem;line-height:1.4;color:var(--color-text)">
      <b style="color:var(--color-accent-text);font-weight:500;flex:0 0 auto">Цена</b><span>{minus}</span></span>
  </div>
</div>'''

io.open('VidA.dc.html','w',encoding='utf-8').write(head('VidA') + variant(
  'А · У каждого свой холст',
  'Учитель двигает и приближает у себя, ученик — у себя. Написанное общее, вид — нет.',
  ('видит учитель', 10, 8, 150, 90), ('видит ученик', 96, 46, 150, 90),
  'Ученик может уйти в свой угол и разобрать то, что не успел. Так работают взрослые доски.',
  'Учитель говорит «смотрите сюда», а ученик смотрит в другое место и не знает об этом.') + TAIL)

io.open('VidB.dc.html','w',encoding='utf-8').write(head('VidB') + variant(
  'Б · Вид ведёт учитель',
  'Что видит учитель, то видят все. Ученик не двигает холст вовсе.',
  ('видит учитель', 10, 8, 150, 90), ('то же самое', 10, 8, 150, 90),
  'Класс всегда смотрит в одно место. Объяснять нечего и настраивать нечего.',
  'Ученик не может задержаться на предыдущем куске: у него отняли собственный взгляд.') + TAIL)

io.open('VidC.dc.html','w',encoding='utf-8').write(head('VidC') + variant(
  'В · Ученик идёт за учителем, пока сам не отойдёт',
  'По умолчанию вид ученика повторяет учительский. Тронул холст — отвязался, и на холсте'
  ' появляется одна кнопка «Вернуться к учителю».',
  ('видит учитель', 10, 8, 150, 90), ('отошёл сам', 96, 46, 150, 90, False, True),
  'Никто не теряется по умолчанию, и никого не держат силой. Возврат — один щелчок.',
  'Нужны состояние «отвязан» и кнопка возврата — это единственный вариант, который добавляет'
  ' элемент на экран ученика.', badge='предлагаю') + TAIL)
print('ok')
