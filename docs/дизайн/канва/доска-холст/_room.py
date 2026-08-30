from _parts import head, TAIL, BIRD, INK

RAIL_W = 317
PANE_W = 1440 - RAIL_W          # 1123
HEAD_H, PULT_H = 47, 67
STAGE_H = 900 - HEAD_H - PULT_H  # 786
TOOLS_W = 51
WRAP_W = PANE_W - TOOLS_W        # 1072

def tools(dim=False):
    op = ';opacity:.35' if dim else ''
    b = ('display:grid;place-items:center;width:34px;height:34px;border:none;border-radius:8px;'
         'background:none;color:var(--color-text-secondary);font:500 .875rem var(--font-mono)')
    on = 'background:var(--color-surface-subtle);color:var(--color-text)'
    dot = 'width:16px;height:16px;border-radius:999px;border:1px solid var(--color-border-strong)'
    pens = ''.join(
        f'<span style="display:grid;place-items:center;width:34px;height:34px;border-radius:8px;'
        f'{"background:var(--color-surface-subtle)" if i==0 else ""}">'
        f'<span style="{dot};background:{c}{";box-shadow:0 0 0 2px #fff,0 0 0 3px var(--color-border-strong)" if i==0 else ""}"></span></span>'
        for i, c in enumerate(('#1d1d1f', '#e14e1f', '#2f8a56', '#2f6fa8')))
    return f'''<div style="display:flex;flex-direction:column;gap:4px;align-items:center;padding:12px 8px;
        border-right:1px solid var(--color-border);background:var(--color-bg);width:{TOOLS_W}px{op}">
      <span style="{b};{on}">✎</span>
      <span style="{b}">⌫</span>
      <span style="width:60%;height:1px;background:var(--color-border);margin:4px 0"></span>
      {pens}
      <span style="{b}">▯</span>
      <span style="width:60%;height:1px;background:var(--color-border);margin:4px 0"></span>
      <span style="writing-mode:vertical-rl;transform:rotate(180deg);padding:12px 0;border:1px solid var(--color-border);
        border-radius:8px;color:var(--color-text-secondary);font-size:.8125rem">Стереть всё</span>
    </div>'''

def canvas(scale, tx, ty, overlay=''):
    grid = 24 * scale
    return f'''<div style="position:relative;width:{WRAP_W}px;height:{STAGE_H}px;overflow:hidden;
        background-color:var(--color-surface);
        background-image:radial-gradient(circle, var(--color-border) 1px, transparent 1px);
        background-size:{grid:.2f}px {grid:.2f}px;background-position:{tx}px {ty}px">
      <div style="position:absolute;left:0;top:0;transform:translate({tx}px,{ty}px) scale({scale});transform-origin:0 0">
        {INK}
      </div>
      {overlay}
    </div>'''

def zoompult(pct, state, hint=''):
    """state: 'sleep' | 'awake'"""
    if state == 'sleep':
        return ''
    btn = ('display:grid;place-items:center;width:28px;height:28px;border-radius:999px;'
           'border:1px solid var(--color-border);background:var(--color-surface);'
           'color:var(--color-text);font:500 .875rem var(--font-mono);line-height:1')
    return f'''<div style="position:absolute;right:16px;bottom:16px;display:flex;align-items:center;gap:8px;
        padding:6px;border-radius:999px;background:var(--color-surface);border:1px solid var(--color-border);
        box-shadow:var(--shadow-md)">
      <span style="{btn}">−</span>
      <span style="min-width:52px;text-align:center;font:500 .8125rem var(--font-mono);color:var(--color-text)">{pct}%</span>
      <span style="{btn}">+</span>
      <span style="width:1px;height:20px;background:var(--color-border);margin:0 2px"></span>
      <span style="padding:0 12px;height:28px;display:grid;place-items:center;border-radius:999px;
        border:1px solid var(--color-border);font-size:.8125rem;color:var(--color-text)">{hint}</span>
    </div>'''

def rail(lead_name='Наталья Ким', n=6, quiet=False):
    tiles = ''
    for i in range(n):
        tiles += f'''<div style="position:relative;aspect-ratio:4/3;min-height:112px;border-radius:12px;
          background:var(--color-surface-on-video);border:1px solid var(--color-border-on-video);
          display:grid;place-items:center;overflow:hidden">
          <span style="font:500 1.1875rem var(--font-mono);color:var(--color-text-on-video-quiet);letter-spacing:.04em">У{i+1}</span>
          <span style="position:absolute;left:8px;bottom:8px;font:400 .8125rem var(--font-mono);
            color:var(--color-text-on-video-quiet)">ученик {i+1}</span>
        </div>'''
    return f'''<aside style="width:{RAIL_W}px;height:900px;display:flex;flex-direction:column;overflow:hidden;
        background:var(--color-surface-video);color:var(--color-text-on-video);border-left:1px solid var(--color-border)">
      <div style="flex:1 1 auto;display:flex;flex-direction:column;gap:8px;padding:12px;min-height:0;overflow:hidden">
        <div style="position:relative;flex:0 0 auto;aspect-ratio:16/10;min-height:112px;border-radius:12px;
          background:var(--color-surface-on-video);border:1px solid var(--color-border-on-video);
          display:grid;place-items:center;overflow:hidden">
          <span style="font:500 1.1875rem var(--font-mono);color:var(--color-text-on-video-quiet);letter-spacing:.04em">НК</span>
          <span style="position:absolute;left:8px;top:8px;font:500 .8125rem var(--font-mono);color:var(--color-go-on-video);
            background:var(--color-surface-on-video);border-radius:4px;padding:2px 8px">ведёт занятие</span>
          <span style="position:absolute;left:8px;bottom:8px;font:400 .8125rem var(--font-mono);
            color:var(--color-text-on-video-quiet)">{lead_name}{' · вы' if not quiet else ''}</span>
        </div>
        <div style="flex:1 1 auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
          grid-auto-rows:min-content;align-content:start;gap:8px;min-height:0;overflow:hidden">{tiles}</div>
      </div>
    </aside>'''

def pult(role='teacher'):
    q = ('min-height:42px;padding:0 20px;border-radius:999px;border:1px solid var(--color-border);'
         'background:none;color:var(--color-text);font-size:.875rem;font-weight:500;display:grid;place-items:center')
    leave = q.replace('var(--color-border);', 'var(--color-go-text);').replace('color:var(--color-text)', 'color:var(--color-go-text)')
    items = ['Микрофон', 'Камера']
    extra = '<span style="width:1px;height:20px;background:var(--color-border);margin:0 8px"></span>'
    if role == 'teacher':
        rest = '<span style="' + q + '">Ссылка на комнату</span><span style="' + leave + '">Завершить урок</span>'
    else:
        rest = '<span style="' + q + '">Поднять руку</span><span style="' + leave + '">Выйти</span>'
    body = ''.join(f'<span style="{q}">{t}</span>' for t in items) + extra + rest
    return f'''<footer style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;
        padding:12px 20px;border-top:1px solid var(--color-border);height:{PULT_H}px">{body}</footer>'''

def header(code='k4np-7tqm-bz3d', label='идёт 12 минут'):
    return f'''<header style="display:flex;align-items:center;gap:12px;padding:12px 20px;
        border-bottom:1px solid var(--color-border);height:{HEAD_H}px">
      <span style="display:inline-flex;align-items:center;gap:8px;font-family:var(--font-heading);
        font-size:1.0625rem;font-weight:600;letter-spacing:-.01em;color:var(--color-text)">{BIRD}Flamingo</span>
      <span style="width:1px;height:20px;background:var(--color-border)"></span>
      <span style="font:500 .8125rem var(--font-mono);color:var(--color-text-detail);letter-spacing:.06em">{code}</span>
      <span style="margin-left:auto;display:inline-flex;align-items:center;gap:8px;
        font:500 .8125rem var(--font-mono);color:var(--color-text-detail)">
        <span style="width:6px;height:6px;border-radius:999px;background:var(--color-go)"></span>{label}</span>
    </header>'''

def room(scale, tx, ty, zoom_pct, zoom_state, hint='', role='teacher', overlay='', n=6):
    return f'''<div style="width:1440px;height:900px;display:flex;background:var(--color-bg)">
  <div style="width:{PANE_W}px;display:flex;flex-direction:column">
    {header()}
    <div style="display:flex;height:{STAGE_H}px;min-height:0">
      {tools()}
      {canvas(scale, tx, ty, overlay + zoompult(zoom_pct, zoom_state, hint))}
    </div>
    {pult(role)}
  </div>
  {rail(n=n)}
</div>'''

def write(name, body):
    import io
    io.open(name, 'w', encoding='utf-8').write(head(name) + body + TAIL)
    print('wrote', name)
