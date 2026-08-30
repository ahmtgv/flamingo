# -*- coding: utf-8 -*-
"""Сборка экранов урока из настоящих токенов приложения."""
from _parts import head, TAIL, BIRD, INK

W, H = 1440, 900
HEAD_H, SHELF_H, PULT_H = 47, 53, 67

NAMES = ['Артём В.','Даша К.','Лев М.','Соня П.','Ника Р.','Тимур А.','Мия Л.','Егор Ш.',
         'Алиса Д.','Марк Т.','Вера С.','Кира Н.','Гоша Б.','Юля Ф.','Рома З.','Ася Г.',
         'Илья О.','Поля Е.','Слава Ч.','Ева Х.','Женя И.','Лада У.','Тася Я.','Ким Ц.',
         'Ося Ж.','Рита Щ.','Фёдор Ю.','Инга Э.','Влад Кос.','Нина Лай.']

def ini(name):
    p = name.split()
    return (p[0][0] + (p[1][0] if len(p) > 1 else '')).upper()

# ── мелкие детали ────────────────────────────────────────────────────────
def header(code='k4np-7tqm-bz3d', label='идёт 12 минут'):
    codepart = ('' if code is None else
      f'<span style="width:1px;height:20px;background:var(--color-border)"></span>'
      f'<span style="font:500 .8125rem var(--font-mono);color:var(--color-text-detail);letter-spacing:.06em">{code}</span>')
    return f'''<header style="display:flex;align-items:center;gap:12px;padding:12px 20px;
      border-bottom:1px solid var(--color-border);height:{HEAD_H}px;background:var(--color-bg)">
      <span style="display:inline-flex;align-items:center;gap:8px;font-family:var(--font-heading);
        font-size:1.0625rem;font-weight:600;letter-spacing:-.01em;color:var(--color-text)">{BIRD}Flamingo</span>
      {codepart}
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px;
        font:500 .8125rem var(--font-mono);color:var(--color-text-detail)">
        <span style="width:6px;height:6px;border-radius:999px;background:var(--color-go)"></span>{label}</span>
    </header>'''

SOURCES = [('Доска', 'live'), ('Картинка', 'live'), ('Видео', 'live'),
           ('Презентация', 'dim'), ('Учебник', 'dim')]

def shelf(active=None, second=None):
    """Полка источников. active — что показывают, second — что ушло на второй экран."""
    out = []
    for name, st in SOURCES:
        on = (name == active)
        dim = (st == 'dim')
        style = ('display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 14px;'
                 'border-radius:999px;font-size:.875rem;font-weight:500;')
        if on:
            style += 'background:var(--color-go-solid);border:1px solid var(--color-go-solid);color:var(--color-on-go)'
        elif dim:
            style += 'background:none;border:1px dashed var(--color-border);color:var(--color-text-disabled)'
        else:
            style += 'background:none;border:1px solid var(--color-border);color:var(--color-text)'
        # Точка «ушло на второй экран» — белая на залитой пилюле: зелёная по зелёному не видна.
        mark = ('<span style="width:6px;height:6px;border-radius:999px;background:'
                + ('var(--color-on-go)' if on else 'var(--color-go)') + '"></span>') if name == second else ''
        # Отправить на второй экран можно только то, что сейчас показывают.
        arrow = ('<span style="margin-left:2px;display:grid;place-items:center;width:20px;height:20px;'
                 'border-radius:999px;background:rgba(255,255,255,.18);font-size:.75rem">↗</span>') if on else ''
        out.append(f'<span style="{style}">{name}{mark}{arrow}</span>')
    hint = ('<span style="margin-left:auto;font:400 .8125rem var(--font-mono);color:var(--color-text-hint)">'
            'пунктиром — появятся вместе с курсом</span>')
    return f'''<div style="display:flex;align-items:center;gap:8px;padding:10px 20px;height:{SHELF_H}px;
      border-bottom:1px solid var(--color-border);background:var(--color-bg)">{''.join(out)}{hint}</div>'''

def pult(role='teacher', extra=''):
    q = ('min-height:42px;padding:0 20px;border-radius:999px;border:1px solid var(--color-border);'
         'background:none;color:var(--color-text);font-size:.875rem;font-weight:500;display:grid;place-items:center')
    leave = ('min-height:42px;padding:0 20px;border-radius:999px;border:1px solid var(--color-go-text);'
             'background:none;color:var(--color-go-text);font-size:.875rem;font-weight:500;display:grid;place-items:center')
    div = '<span style="width:1px;height:20px;background:var(--color-border);margin:0 8px"></span>'
    if role == 'teacher':
        body = (f'<span style="{q}">Микрофон</span><span style="{q}">Камера</span>{div}{extra}'
                f'<span style="{q}">Участники</span>'
                f'<span style="{q}">Ссылка на комнату</span><span style="{leave}">Завершить урок</span>')
    else:
        body = (f'<span style="{q}">Микрофон</span><span style="{q}">Камера</span>{div}'
                f'<span style="{q}">Поднять руку</span><span style="{leave}">Выйти</span>')
    return f'''<footer style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;
      padding:12px 20px;border-top:1px solid var(--color-border);height:{PULT_H}px;background:var(--color-bg)">{body}</footer>'''

# ── плитки ───────────────────────────────────────────────────────────────
def tile(name, w, h, lead=False, badge='', speaking=False, hand=False, arrow=False):
    border = 'var(--color-go-on-video)' if speaking else 'var(--color-border-on-video)'
    fs = '1.5rem' if lead else ('1.1875rem' if h > 150 else ('.875rem' if h > 100 else '.75rem'))
    nm = ('' if h < 70 else
          f'''<span style="position:absolute;left:8px;bottom:6px;font:400 .75rem var(--font-mono);
            color:var(--color-text-on-video-quiet);max-width:calc(100% - 16px);overflow:hidden;
            text-overflow:ellipsis;white-space:nowrap">{name}</span>''')
    bd = (f'''<span style="position:absolute;left:8px;top:8px;font:500 .8125rem var(--font-mono);
          color:var(--color-go-on-video);background:var(--color-surface-on-video);border-radius:4px;
          padding:2px 8px">{badge}</span>''' if badge else '')
    # Поднятая рука — единственная коралловая заливка в комнате (ПРАВИЛА 11а).
    hd = ('''<span style="position:absolute;right:6px;top:6px;font:500 .75rem var(--font-mono);
          color:var(--color-on-accent);background:var(--color-accent-solid);border-radius:4px;
          padding:2px 6px">рука</span>''' if hand else '')
    ar = ('''<span style="position:absolute;right:6px;top:6px;display:grid;place-items:center;width:22px;
          height:22px;border-radius:999px;background:var(--color-surface-on-video);
          border:1px solid var(--color-border-on-video);color:var(--color-text-on-video);
          font-size:.75rem">↗</span>''' if arrow else '')
    return f'''<div style="position:relative;flex:0 0 auto;width:{w:.0f}px;height:{h:.0f}px;border-radius:12px;
      overflow:hidden;background:var(--color-surface-on-video);border:1px solid {border};display:grid;place-items:center">
      <span style="font:500 {fs} var(--font-mono);color:var(--color-text-on-video-quiet);letter-spacing:.04em">{ini(name)}</span>
      {bd}{hd}{ar}{nm}</div>'''

def best_grid(n, bw, bh, gap=8, ratio=4/3):
    """Подобрать сетку, при которой плитка 4:3 максимальна."""
    best = None
    for cols in range(1, n + 1):
        rows = -(-n // cols)
        w = (bw - gap * (cols - 1)) / cols
        h = (bh - gap * (rows - 1)) / rows
        side = min(w, h * ratio)
        if side <= 0:
            continue
        if best is None or side > best[0]:
            best = (float(int(side)), cols, rows)
    return best[1], best[2], best[0]

def pupil_grid(n, bw, bh, first_is_you=False):
    cols, rows, side = best_grid(n, bw, bh)
    tw, th = side, side / (4 / 3)
    cells = ''.join(tile(NAMES[i] + (' · вы' if first_is_you and i == 0 else ''), tw, th,
                         speaking=(i == 2 and n > 3)) for i in range(n))
    return f'''<div style="display:grid;grid-template-columns:repeat({cols},{tw:.0f}px);
      gap:8px;justify-content:center;align-content:center;width:{bw}px;height:{bh}px">{cells}</div>''', tw, th

# ── экран 1: начало урока ────────────────────────────────────────────────
def nachalo(n_pupils, role='teacher', lead='Наталья Ким'):
    stage_h = H - HEAD_H - SHELF_H - PULT_H if role == 'teacher' else H - HEAD_H - PULT_H
    pad = 16
    half = (W - pad * 3) / 2
    inner_h = stage_h - pad * 2
    # «Учитель на половину экрана» читается буквально: его кадр занимает свою половину
    # целиком, ученики — вторую. Иначе кадр 16:9 висит в пустоте и каждый ученик
    # оказывается крупнее учителя — ровно наоборот тому, что просили.
    lw, lh = half, inner_h
    grid, tw, th = pupil_grid(n_pupils, half, inner_h, first_is_you=(role == 'pupil'))
    return f'''<div style="width:{W}px;height:{H}px;display:flex;flex-direction:column;background:var(--color-bg)">
  {header(code=None if role == 'pupil' else 'k4np-7tqm-bz3d')}
  {shelf() if role == 'teacher' else ''}
  <div style="flex:1 1 auto;display:flex;gap:{pad}px;padding:{pad}px;background:var(--color-surface-video)">
    {tile(lead + (' · вы' if role == 'teacher' else ''), lw, lh, lead=True, badge='ведёт урок')}
    {grid}
  </div>
  {pult(role)}
</div>'''

# ── экран 2: показ источника ─────────────────────────────────────────────
RAIL_W = 317

def istochnik_board(w, h):
    return f'''<div style="position:relative;width:{w:.0f}px;height:{h:.0f}px;overflow:hidden;
      background-color:var(--color-surface);
      background-image:radial-gradient(circle,var(--color-border) 1px,transparent 1px);
      background-size:24px 24px">
      <div style="position:absolute;left:-60px;top:-40px">{INK}</div>
      <div style="position:absolute;right:16px;bottom:16px;display:flex;align-items:center;gap:8px;padding:6px;
        border-radius:999px;background:var(--color-surface);border:1px solid var(--color-border);
        box-shadow:var(--shadow-md)">
        <span style="display:grid;place-items:center;width:28px;height:28px;border-radius:999px;
          border:1px solid var(--color-border);font:500 .875rem var(--font-mono)">−</span>
        <span style="min-width:64px;height:28px;display:grid;place-items:center;border-radius:999px;
          border:1px solid var(--color-border);font:500 .8125rem var(--font-mono)">100 %</span>
        <span style="display:grid;place-items:center;width:28px;height:28px;border-radius:999px;
          border:1px solid var(--color-border);font:500 .875rem var(--font-mono)">+</span>
      </div>
    </div>'''

def tools_col():
    b = ('display:grid;place-items:center;width:34px;height:34px;border-radius:8px;'
         'color:var(--color-text-secondary);font:500 .875rem var(--font-mono)')
    dot = 'width:16px;height:16px;border-radius:999px;border:1px solid var(--color-border-strong)'
    pens = ''.join(
        f'<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:8px;'
        f'{"background:var(--color-surface-subtle)" if i==0 else ""}"><span style="{dot};background:{c}"></span></span>'
        for i, c in enumerate(('#1d1d1f', '#e14e1f', '#2f8a56', '#2f6fa8')))
    return f'''<div style="display:flex;flex-direction:column;gap:4px;align-items:center;padding:12px 8px;
      border-right:1px solid var(--color-border);background:var(--color-bg);width:51px">
      <span style="{b};background:var(--color-surface-subtle);color:var(--color-text)">✎</span>
      <span style="{b}">⌫</span>
      <span style="width:60%;height:1px;background:var(--color-border);margin:4px 0"></span>
      {pens}
      <span style="width:60%;height:1px;background:var(--color-border);margin:4px 0"></span>
      <span style="writing-mode:vertical-rl;transform:rotate(180deg);padding:12px 0;border:1px solid var(--color-border);
        border-radius:8px;color:var(--color-text-secondary);font-size:.8125rem">Стереть всё</span>
    </div>'''

def rail(n_pupils, cap=11, lead='Наталья Ким', role='teacher', note=''):
    inner_w = RAIL_W - 24
    lh = int(inner_w / (16 / 10))
    shown = min(n_pupils, cap)
    cw = int((inner_w - 8) / 2)
    ch = int(cw / (4 / 3))
    cells = ''.join(tile(NAMES[i] + (' · вы' if role == 'pupil' and i == 0 else ''), cw, ch,
                         speaking=(i == 2), hand=(i == 1 and role == 'teacher'),
                         arrow=(i == 4 and role == 'teacher'))
                    for i in range(shown))
    more = ('' if n_pupils <= cap else
            f'''<p style="margin:0;padding:0 12px 12px;font:400 .8125rem var(--font-mono);
              color:var(--color-text-on-video-quiet)">ещё {n_pupils - cap} · всего {n_pupils + 1} в комнате</p>''')
    return f'''<aside style="width:{RAIL_W}px;display:flex;flex-direction:column;overflow:hidden;
      background:var(--color-surface-video);border-left:1px solid var(--color-border)">
      <div style="flex:1 1 auto;display:flex;flex-direction:column;gap:8px;padding:12px;min-height:0;overflow:hidden">
        {tile(lead + (' · вы' if role == 'teacher' else ''), inner_w - 2, lh, lead=True, badge='ведёт урок')}
        <div style="display:grid;grid-template-columns:repeat(2,{cw:.0f}px);gap:8px;align-content:start;
          min-height:0;overflow-y:auto">{cells}</div>
      </div>{more}{note}</aside>'''

def pokaz(n_pupils, role='teacher', second=None, extra_pult=''):
    stage_h = H - HEAD_H - SHELF_H - PULT_H if role == 'teacher' else H - HEAD_H - PULT_H
    src_w = W - RAIL_W - (51 if role == 'teacher' else 0)
    return f'''<div style="width:{W}px;height:{H}px;display:flex;flex-direction:column;background:var(--color-bg)">
  {header(code=None if role == 'pupil' else 'k4np-7tqm-bz3d')}
  {shelf(active='Доска', second=second) if role == 'teacher' else ''}
  <div style="flex:1 1 auto;display:flex;min-height:0">
    {tools_col() if role == 'teacher' else ''}
    {istochnik_board(src_w, stage_h)}
    {rail(n_pupils, role=role)}
  </div>
  {pult(role, extra_pult)}
</div>'''

def write(name, body):
    import io
    io.open(name, 'w', encoding='utf-8').write(head(name) + body + TAIL)
    print('wrote', name)


# ── второй экран ─────────────────────────────────────────────────────────
def vtoroy_screen(kind='Доска', pupil=None):
    """Второй экран показывает то, что учитель туда отправил: источник или одного ученика."""
    label = f'{pupil} · крупно' if pupil else kind
    body = (istochnik_board(W, H - 40) if pupil is None else
            f'''<div style="width:{W}px;height:{H-40}px;background:var(--color-surface-video);
              display:grid;place-items:center">{tile(pupil, 1146, 860, lead=True)}</div>''')
    return f'''<div style="width:{W}px;height:{H}px;display:flex;flex-direction:column;background:var(--color-bg)">
      <div style="display:flex;align-items:center;gap:12px;padding:0 20px;height:40px;
        border-bottom:1px solid var(--color-border)">
        <span style="font:500 .8125rem var(--font-mono);color:var(--color-text-detail)">{label} · второй экран</span>
        <span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px;
          font:500 .8125rem var(--font-mono);color:var(--color-text-detail)">
          <span style="width:6px;height:6px;border-radius:999px;background:var(--color-go)"></span>идёт</span>
      </div>{body}</div>'''

def mini(inner, scale, w=W, h=H, caption=''):
    cap = (f'''<span style="font:500 .8125rem var(--font-mono);color:var(--color-text-detail)">{caption}</span>'''
           if caption else '')
    return f'''<div style="display:flex;flex-direction:column;gap:8px">{cap}
      <div style="position:relative;width:{w*scale:.0f}px;height:{h*scale:.0f}px;overflow:hidden;
        border-radius:12px;border:1px solid var(--color-border);box-shadow:var(--shadow-md);background:#000">
        <div style="position:absolute;left:0;top:0;transform:scale({scale});transform-origin:0 0">{inner}</div>
      </div></div>'''
