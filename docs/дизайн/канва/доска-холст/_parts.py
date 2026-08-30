import io
TOK = io.open('_tokens.txt',encoding='utf-8').read()

BIRD = '''<svg viewBox="0 0 120 110" width="20" height="20" aria-hidden="true">
        <g fill="none" stroke="#e14e1f" stroke-linecap="round">
          <path d="M28 55 L7 44" stroke-width="5.4"></path>
          <path d="M26 61 L3 59" stroke-width="7"></path>
          <path d="M28 66 L10 74" stroke-width="5.8"></path>
          <path d="M44 80 L39 92 L36 103" stroke-width="5.6"></path>
          <path d="M57 78 L59 90 L56 102" stroke-width="5"></path>
        </g>
        <path d="M58 52 C70 44 60 28 74 16" fill="none" stroke="#e14e1f" stroke-width="10" stroke-linecap="round"></path>
        <ellipse cx="48" cy="63" rx="26" ry="21" fill="#e14e1f" transform="rotate(-6 48 63)"></ellipse>
        <circle cx="78" cy="13" r="8.5" fill="#e14e1f"></circle>
        <path d="M85 7 L108 14 L86 19 Z" fill="#1d1d1f"></path>
        <circle cx="77" cy="8" r="2.2" fill="#fff"></circle>
      </svg>'''

# Содержимое доски. Мировые координаты 0..1600 x 0..1100.
INK = '''<svg class="ink" viewBox="0 0 1600 1100" width="1600" height="1100">
      <g fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M120 150 L470 150" stroke="#1d1d1f" stroke-width="5"></path>
        <path d="M120 150 L120 400 L470 150" stroke="#1d1d1f" stroke-width="5"></path>
        <path d="M120 360 L160 360 L160 400" stroke="#2f6fa8" stroke-width="3"></path>
        <path d="M60 265 C40 255 44 300 62 292" stroke="#2f8a56" stroke-width="3"></path>
        <path d="M300 470 C330 452 372 470 396 452 C420 434 452 470 486 452" stroke="#e14e1f" stroke-width="5"></path>
        <path d="M560 300 L700 300 M560 340 L672 340 M560 380 L716 380" stroke="#1d1d1f" stroke-width="3"></path>
        <path d="M820 210 C880 190 940 250 1010 218 C1070 190 1120 246 1180 224" stroke="#2f6fa8" stroke-width="4"></path>
        <path d="M840 620 L1180 620 M840 620 L840 880 M840 880 L1180 880 M1180 620 L1180 880" stroke="#1d1d1f" stroke-width="3"></path>
        <path d="M900 700 C960 660 1010 760 1080 706" stroke="#2f8a56" stroke-width="4"></path>
        <path d="M900 800 L1120 800" stroke="#e14e1f" stroke-width="4"></path>
        <path d="M240 720 C300 700 300 800 240 790 C190 782 196 706 246 700" stroke="#1d1d1f" stroke-width="4"></path>
        <path d="M360 700 L360 800 M360 750 L440 750 M440 700 L440 800" stroke="#1d1d1f" stroke-width="4"></path>
        <path d="M1290 400 L1420 400 L1420 520 L1290 520 Z" stroke="#c4c4c1" stroke-width="3"></path>
        <path d="M1310 440 L1400 440 M1310 470 L1370 470" stroke="#1d1d1f" stroke-width="3"></path>
      </g>
      <text x="130" y="435" font-family="'JetBrains Mono','SF Mono',ui-monospace,monospace" font-size="26" fill="#1d1d1f">S = a·h / 2</text>
      <text x="560" y="250" font-family="'JetBrains Mono','SF Mono',ui-monospace,monospace" font-size="24" fill="#646469">дано:</text>
      <text x="840" y="580" font-family="'JetBrains Mono','SF Mono',ui-monospace,monospace" font-size="24" fill="#646469">проверка</text>
    </svg>'''

def head(title):
    return '''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <style>
''' + TOK + '''
    *{box-sizing:border-box}
    body{margin:0;font-family:var(--font-body);color:var(--color-text);background:var(--color-bg)}
    a{color:var(--color-accent-text)} a:hover{color:var(--color-accent)}
  </style>
</helmet>
'''

TAIL = '''</x-dc>
</body>
</html>
'''
