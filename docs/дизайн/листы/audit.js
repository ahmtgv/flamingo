/**
 * FLAMINGO — самопроверка макетов. Открыть лист в браузере и выполнить в консоли:
 *
 *   flAudit()                     // текущий вид
 *   flAudit({label: 'кабинет'})   // с подписью в отчёте
 *
 * Возвращает объект с числами и список дефектов. Приборы:
 *   1. pageScroll   — прокрутка страницы (норма 0)
 *   2. overlaps     — пересечения видимых прямоугольников одного уровня
 *   3. clipped      — обрезанный текст (scrollWidth > clientWidth без ellipsis)
 *   4. rowTops      — верхние кромки карточек одного ряда совпадают
 *   5. gaps         — гистограмма отступов: сколько разных значений встречается
 *   6. rawValues    — голые px и hex в инлайновых стилях мимо токенов
 *   7. tapTargets   — интерактивные элементы ниже --tap-min
 *   8. contrast     — текст с контрастом ниже AA (4.5 для мелкого, 3.0 для крупного)
 *
 * Каждый прибор проверен на подложенном дефекте: см. flAuditSelfTest().
 */
(function () {
  const TOKENS = new Set(['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8', '--space-9', '--space-10', '--space-11', '--space-12', '--space-13']);

  // Кэш на один прогон: vis() зовётся из квадратичных приборов, а внутри — getComputedStyle
  // по всем предкам. Без кэша один снимок плотного листа считался минуты.
  let visCache = null;

  const visRaw = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const b = el.getBoundingClientRect();
    if (!(b.width > 1 && b.height > 1)) return false;
    // выехавшее из прокручиваемого контейнера человек не видит, а рамка у него есть:
    // без этого приборы ругались на последнюю строку списка в закрытой части панели
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (pcs.overflow === 'visible' && pcs.overflowX === 'visible' && pcs.overflowY === 'visible') continue;
      const pb = p.getBoundingClientRect();
      const x = Math.min(b.right, pb.right) - Math.max(b.left, pb.left);
      const y = Math.min(b.bottom, pb.bottom) - Math.max(b.top, pb.top);
      if (x < 1 || y < 1) return false;
    }
    return true;
  };

  const vis = (el) => {
    if (!visCache) return visRaw(el);
    if (visCache.has(el)) return visCache.get(el);
    const v = visRaw(el);
    visCache.set(el, v);
    return v;
  };

  const scope = () => document.querySelector('[data-audit-scope]') || document.body;
  // кадр масштабируется transform: scale() — без этого прибор мерил бы экранные, а не макетные пиксели
  const scaleOf = (root) => {
    const w = root.offsetWidth || 1;
    const k = root.getBoundingClientRect().width / w;
    return k > 0.05 ? k : 1;
  };

  function rectsOverlap(a, b) {
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return x > 1.5 && y > 1.5 ? Math.round(x * y) : 0;
  }

  // 2. пересечения: только СИБЛИНГИ, у которых нет position:absolute (наложение слоёв законно)
  function overlaps(root) {
    const bad = [];
    const k = scaleOf(root);
    const parents = [root, ...root.querySelectorAll('*')];
    for (const p of parents) {
      const kids = Array.from(p.children).filter((k2) => {
        const cs = getComputedStyle(k2);
        return vis(k2) && cs.position !== 'absolute' && cs.position !== 'fixed';
      });
      for (let i = 0; i < kids.length; i++) {
        for (let j = i + 1; j < kids.length; j++) {
          const area = rectsOverlap(kids[i].getBoundingClientRect(), kids[j].getBoundingClientRect()) / (k * k);
          if (area > 24) bad.push({ a: sig(kids[i]), b: sig(kids[j]), area: Math.round(area), textA: (kids[i].textContent || '').trim().slice(0, 24), textB: (kids[j].textContent || '').trim().slice(0, 24) });
        }
      }
    }
    return bad;
  }

  // 3. обрезанный текст
  function clipped(root) {
    const bad = [];
    root.querySelectorAll('*').forEach((el) => {
      if (!vis(el) || el.children.length) return;
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis') return;
      if (el.scrollWidth - el.clientWidth > 2 && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll') {
        bad.push({ el: sig(el), over: el.scrollWidth - el.clientWidth, text: (el.textContent || '').trim().slice(0, 40) });
      }
      if (el.scrollHeight - el.clientHeight > 2 && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll' && cs.overflow === 'hidden') {
        bad.push({ el: sig(el), overY: el.scrollHeight - el.clientHeight, text: (el.textContent || '').trim().slice(0, 40) });
      }
    });
    return bad;
  }

  // 4. верхние кромки карточек одного ряда — только у карточек (есть рамка или заливка)
  const cardLike = (el) => {
    const cs = getComputedStyle(el);
    const bw = parseFloat(cs.borderTopWidth) || 0;
    const bg = cs.backgroundColor;
    const b = el.getBoundingClientRect();
    // Карточка — это блок с рамкой или заливкой И собственной высотой от 40 px.
    // Без порога прибор считал карточкой подпись рядом с плиткой и требовал равных кромок
    // от вещей разного рода — правило 4.2 говорит про однородные.
    return b.height >= 40 && (bw > 0 || (bg && !bg.includes('rgba(0, 0, 0, 0)')));
  };
  function rowTops(root) {
    const bad = [];
    root.querySelectorAll('*').forEach((p) => {
      if (getComputedStyle(p).display !== 'grid') return;
      const kids = Array.from(p.children).filter((k) => vis(k) && cardLike(k)).map((k) => ({ k, b: k.getBoundingClientRect() }));
      if (kids.length < 2) return;
      // «Один ряд» = боксы перекрываются по вертикали больше чем на 60 % меньшего из них.
      // Без этого прибор считал рядом две карточки одна под другой и давал ложный дефект.
      const sameRow = (a, b) => {
        const ov = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return ov > 0.6 * Math.min(a.height, b.height);
      };
      const used = new Set();
      kids.forEach((x, i) => {
        if (used.has(i)) return;
        const row = [x];
        used.add(i);
        kids.forEach((y, j) => {
          if (j <= i || used.has(j)) return;
          if (sameRow(x.b, y.b)) { row.push(y); used.add(j); }
        });
        if (row.length < 2) return;
        const tops = row.map((r) => Math.round(r.b.top));
        const spread = Math.max(...tops) - Math.min(...tops);
        if (spread > 2) bad.push({ parent: sig(p), spread, cards: row.length });
      });
    });
    return bad;
  }

  // 5. гистограмма отступов (gap у flex/grid контейнеров)
  function gaps(root) {
    const hist = {}, hair = {};
    [root, ...root.querySelectorAll('*')].forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display !== 'flex' && cs.display !== 'grid') return;
      [cs.rowGap, cs.columnGap].forEach((g) => {
        const px = parseFloat(g);
        if (!px || Number.isNaN(px)) return;
        // 1–3 px — не отступ, а волосок: зазор между штрихами спарклайна, точками,
        // линиями в 1 px. Считается отдельно и в бюджет разных значений не входит.
        if (px < 4) { hair[px] = (hair[px] || 0) + 1; return; }
        hist[px] = (hist[px] || 0) + 1;
      });
    });
    const offGrid = Object.keys(hist).map(Number).filter((px) => px % 4 !== 0);
    return { hist, hairlines: hair, distinct: Object.keys(hist).length, offGrid };
  }

  // 6. голые значения в инлайновых стилях
  function rawValues(root) {
    const bad = [];
    [root, ...root.querySelectorAll('[style]')].forEach((el) => {
      const s = el.getAttribute && el.getAttribute('style');
      if (!s) return;
      const hex = s.match(/#[0-9a-f]{3,8}/gi) || [];
      const pad = (s.match(/(?:padding|margin|gap)[^:]*:\s*([^;]+)/gi) || []).join(' ');
      const rawPx = (pad.match(/\b\d+px\b/g) || []).filter((v) => v !== '0px' && v !== '1px' && v !== '2px' && v !== '3px');
      if (hex.length || rawPx.length) bad.push({ el: sig(el), hex, rawPx });
    });
    return bad;
  }

  // 7. цели нажатия
  function tapTargets(root) {
    const min = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tap-min')) || 44;
    const k = scaleOf(root);
    const bad = [];
    root.querySelectorAll('button, a, input, [role="button"]').forEach((el) => {
      if (!vis(el)) return;
      const h = el.getBoundingClientRect().height / k;
      // ПРАВИЛА 7.1–7.2: нижняя граница — --control-height-sm (34) для вторичных контролов
      // в плотных списках; допуск 0,6 px — масштаб кадра даёт дробные высоты.
      if (h < min - 10 - 0.6) bad.push({ el: sig(el), h: Math.round(h), min, text: (el.textContent || '').trim().slice(0, 30) });
    });
    return bad;
  }

  // 8. контраст
  const lum = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  // Цвет приходит в любой записи: rgb(), rgba(), color(srgb …), oklab(… / .84) — браузер выдаёт
  // oklab для color-mix (стекло пульта). Разбирать числа руками нельзя: в oklab первое число —
  // светлота 0–1, и пульт читался как почти чёрный (13 ложных дефектов контраста).
  // Разбор отдан браузеру: один пиксель на canvas и чтение его RGBA.
  const _cx = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c.getContext('2d', { willReadFrequently: true }); })();
  const _cache = new Map();
  function rgba(str) {
    if (!str) return null;
    if (_cache.has(str)) return _cache.get(str);
    let out = null;
    try {
      _cx.globalCompositeOperation = 'copy';
      _cx.fillStyle = '#000';
      _cx.fillStyle = str;
      _cx.fillRect(0, 0, 1, 1);
      const d = _cx.getImageData(0, 0, 1, 1).data;
      out = { rgb: [d[0], d[1], d[2]], a: d[3] / 255 };
    } catch (e) { out = null; }
    _cache.set(str, out);
    return out;
  }
  const parse = (s) => { const c = rgba(s); return c ? c.rgb : []; };
  const alphaOf = (s) => { const c = rgba(s); return c ? c.a : 1; };
  const over = (fg, a, bg) => fg.map((v, i) => Math.round(v * a + bg[i] * (1 - a)));
  /**
   * Фон под текстом. Три случая, и третий важнее всего:
   *  1. непрозрачная заливка — берём её;
   *  2. полупрозрачная (color-mix, rgba, стекло HUD) — смешиваем с тем, что ниже;
   *  3. картинка или градиент — цвета под текстом НЕТ как одного числа; мерить нечего.
   * Раньше третий случай молча считался белым фоном — и белые подписи на плитках видео
   * давали 40 ложных дефектов с отношением 1,0. Теперь такое честно помечается «не измерено».
   */
  function bgOf(el) {
    const layers = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = cs.backgroundColor || '';
      const p = parse(c);
      if (p.length === 3) {
        const a = alphaOf(c);
        if (a >= 0.999) return layers.reduceRight((acc, l) => over(l.c, l.a, acc), p);
        if (a > 0.001) layers.push({ c: p, a });
      }
      n = n.parentElement;
    }
    return layers.reduceRight((acc, l) => over(l.c, l.a, acc), [255, 255, 255]);
  }
  /* ── ПЕРГАМЕНТ ────────────────────────────────────────────────────────────
     🔴 ЗАКОН ЭКРАНОВ СМЕНИЛСЯ, И ПРИБОР ОБЯЗАН СМЕНИТЬСЯ ВМЕСТЕ С НИМ — НО НЕ
     ОСЛЕПНУТЬ. Владелец 03.09 взял палитру Cursor один в один и снял ПРАВИЛО 4.8
     (порог 4,5). Снять порог совсем — значит выключить прибор: тогда любой цвет,
     который я придумаю по дороге, пройдёт молча, и разговор «а это тоже осознанно?»
     станет невозможен.
     Поэтому правило переписано, а не отменено, и звучит в одну строку:
        ПОД ПЕРГАМЕНТОМ ОБА ЦВЕТА — И ТЕКСТ, И ФОН — ОБЯЗАНЫ БЫТЬ ТОКЕНАМИ НАБОРА.
     Такая пара считается ПРИНЯТОЙ: она попадает в отчёт числом, но не дефектом.
     Всё остальное меряется прежним порогом 4,5 / 3,0.
     Что при этом продолжает ловиться (то есть чем прибор ещё полезен):
       · цвет мимо набора — придуманный по дороге серый;
       · токен набора на фоне, под который его никто не мерил;
       · ПРОЗРАЧНОСТЬ (ПРАВИЛА 4.7): при opacity < 1 подмешанный цвет уже не равен
         токену, пара перестаёт быть принятой и краснеет — как и должна;
       · акцент на акценте.
     Значения берутся с ЖИВОГО узла, а не переписаны сюда числами: набор ещё будет
     двигаться, а прибор с устаревшей копией палитры — прибор, который врёт. */
  const ПЕРГ_ТЕКСТ = ['--п-текст', '--п-пепел', '--п-плавник', '--п-туман', '--п-уголёк', '--п-янтарь', '--п-изумруд', '--п-багрянец'];
  const ПЕРГ_ФОН = ['--п-холст', '--п-карточка', '--п-выше', '--п-линия', '--п-текст', '--п-янтарь', '--п-лес'];
  const _перг = new WeakMap();
  function пергамент(el) {
    const узел = el.closest ? el.closest('[data-\u044f\u0437\u044b\u043a="\u043f\u0435\u0440\u0433\u0430\u043c\u0435\u043d\u0442"]') : null;
    if (!узел) return null;
    if (_перг.has(узел)) return _перг.get(узел);
    const cs = getComputedStyle(узел);
    const собрать = (имена) => имена.map((н) => ({ н, c: parse(cs.getPropertyValue(н).trim()) })).filter((x) => x.c.length === 3);
    const набор = { текст: собрать(ПЕРГ_ТЕКСТ), фон: собрать(ПЕРГ_ФОН) };
    // холст и карточка бывают и цветом текста (надпись на тёмной заливке) — и наоборот
    набор.текст = набор.текст.concat(собрать(['--п-холст', '--п-карточка']));
    _перг.set(узел, набор);
    return набор;
  }
  const близко = (a, b) => a.length === 3 && b.length === 3 && a.every((v, i) => Math.abs(v - b[i]) <= 2);
  const изНабора = (список, c) => { const н = список.find((x) => близко(x.c, c)); return н ? н.н : null; };

  function contrast(root) {
    const bad = [];
    const принято = [];
    let skipped = 0;
    root.querySelectorAll('*').forEach((el) => {
      if (!vis(el) || el.children.length) return;
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      const cs = getComputedStyle(el);
      const fg = parse(cs.color), bg = bgOf(el);
      if (fg.length !== 3) return;
      // Прозрачность СЪЕДАЕТ контраст, а в `color` её не видно. Без этого прибор считал зелёным
      // подписи обложек при opacity .62 — 33 настоящих провала в детской версии (найдено ревьюером).
      // Накопленная прозрачность берётся по всей цепочке предков и вмешивает цвет в фон.
      let op = parseFloat(cs.opacity);
      if (Number.isNaN(op)) op = 1;
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const v = parseFloat(getComputedStyle(p).opacity);
        if (!Number.isNaN(v) && v < 1) op *= v;
      }
      // WCAG 1.4.3 не распространяется на неактивные элементы: цвет --color-text-disabled
      // означает «этого сейчас нет» (пустая клетка журнала, выключенная кнопка) и не мерится.
      const dis = parse(getComputedStyle(document.documentElement).getPropertyValue('--color-text-disabled'));
      if (dis.length === 3 && fg.every((v, i) => Math.abs(v - dis[i]) < 3)) { skipped += 1; return; }
      if (bg === null) { skipped += 1; return; }
      const fgMix = op < 0.999 ? over(fg, op, bg) : fg;
      const L1 = lum(fgMix), L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 600);
      const need = large ? 3 : 4.5;
      const r2 = Math.round(ratio * 100) / 100;
      const набор = пергамент(el);
      if (набор) {
        const тн = изНабора(набор.текст, fgMix), фн = изНабора(набор.фон, bg);
        if (тн && фн) { принято.push({ пара: тн + ' на ' + фн, ratio: r2, text: txt.slice(0, 28) }); return; }
      }
      if (ratio < need - 0.01) bad.push({ el: sig(el), ratio: r2, need, size, text: txt.slice(0, 36) });
    });
    bad.skipped = skipped;
    bad.принято = принято;
    return bad;
  }

  // 9. акцент: сколько на экране коралловых заливок и кораллового текста
  const CORAL = /^rgb\((2[0-9]{2}|1[5-9][0-9]), *([0-9]{1,3}), *([0-9]{1,3})\)$/;
  const isCoral = (c) => {
    const p = parse(c);
    if (p.length !== 3) return false;
    const [r, g, b] = p;
    return r > 150 && r - g > 40 && r - b > 60;
  };
  // Зелёный «дальше» считается отдельно и с тем же ограничением: второй цвет со смыслом
  // легко превращает экран в ёлку. Одна заливка, до трёх надписей — как у кораллового.
  const isGo = (c) => {
    const p = parse(c);
    if (p.length !== 3) return false;
    const [r, g, b] = p;
    return g > 60 && g - r > 24 && g - b > 20;
  };
  /* 🔴 ПОД ПЕРГАМЕНТОМ АКЦЕНТ ОПОЗНАЁТСЯ ТОКЕНОМ, А НЕ ОТТЕНКОМ. Догадка по числам
     («красноватое — значит коралл») на новой палитре врёт сразу дважды: под неё
     подходят и янтарь #c08532, и багрянец #cf2d56 — то есть кнопка «Продолжить»
     и слово об ошибке считались бы акцентными заливками, и экран краснел бы на
     ровном месте. Значения токенов известны точно — сравниваем с ними.

     🔴 И САМО ПРАВИЛО ЗДЕСЬ ДРУГОЕ, ПРИЧЁМ СТРОЖЕ. У старого закона акцентная
     заливка разрешена (одна на экран). У пергамента уголёк — ЭТО ТЕКСТ: «ни
     заливки, ни фона, ни иконки». Значит порог не «не больше двух», а НОЛЬ.
     Заливки берут чернила; янтарь и лес — только внутри продуктовых окон. */
  function accents(root) {
    const fills = [], texts = [], goFills = [], goTexts = [], goLines = [];
    const угольковыеЗаливки = [], угольковыеСлова = [], пергЗелёныеСлова = [];
    let подПергаментом = 0;
    root.querySelectorAll('*').forEach((el) => {
      if (!vis(el)) return;
      const cs = getComputedStyle(el);
      const box = el.getBoundingClientRect();
      const k = scaleOf(root);
      const big = box.width * box.height > 40;
      // ПОЛОСА — не заливка. Всё, что тоньше 6 px по одной из сторон, — графика (ПРАВИЛА 5.4):
      // линия прогресса, точка, штрих. Иначе четыре полоски курсов читаются как четыре заливки
      const line = box.height / k <= 6 || box.width / k <= 6;
      const t = (el.textContent || '').trim();
      const набор = пергамент(el);
      if (набор) {
        подПергаментом += 1;
        const уголёк = набор.текст.find((x) => x.н === '--п-уголёк');
        const зелёные = набор.текст.filter((x) => x.н === '--п-изумруд' || x.н === '--п-лес');
        const это = (списокИли, c) => списокИли.some((x) => близко(x.c, c));
        if (уголёк && big && !line && близко(уголёк.c, parse(cs.backgroundColor))) {
          угольковыеЗаливки.push({ el: sig(el), text: t.slice(0, 24) });
        }
        if (t && !el.children.length && уголёк && близко(уголёк.c, parse(cs.color))) угольковыеСлова.push(t.slice(0, 24));
        if (t && !el.children.length && это(зелёные, parse(cs.color))) пергЗелёныеСлова.push(t.slice(0, 24));
        return;
      }
      if (isCoral(cs.backgroundColor) && big && !line) fills.push({ el: sig(el), text: t.slice(0, 24) });
      if (isGo(cs.backgroundColor) && big) {
        if (line) goLines.push(sig(el));
        else goFills.push({ el: sig(el), text: t.slice(0, 24) });
      }
      if (t && !el.children.length && isCoral(cs.color)) texts.push(t.slice(0, 24));
      if (t && !el.children.length && isGo(cs.color)) goTexts.push(t.slice(0, 24));
    });
    return {
      fills, texts, fillCount: fills.length, textCount: texts.length,
      goFills, goTexts, goLines,
      goFillCount: goFills.length, goTextCount: goTexts.length, goLineCount: goLines.length,
      угольковыеЗаливки, угольковыеСлова, пергЗелёныеСлова, подПергаментом,
    };
  }

  // 10. перенос в контроле: подпись кнопки разбилась на две строки и выломала ритм ряда.
  // Найдено не мной, а ревьюером на пульте урока («Показать / экран», 52 px вместо 34):
  // min-height держит низ, но не держит верх, и flex сжимает кнопку, пока текст не завернётся.
  function wrappedControls(root) {
    const k = scaleOf(root);
    const bad = [];
    const rng = document.createRange();
    root.querySelectorAll('button, a[role="button"]').forEach((el) => {
      if (!vis(el)) return;
      // Составные контролы (имя + подпись внутри) многострочны по замыслу.
      if (el.children.length) return;
      const txt = (el.textContent || '').trim();
      if (!txt) return;
      // Строки считаются по САМОМУ ТЕКСТУ, а не по высоте кнопки: min-height раздувает
      // бокс и однострочная кнопка читалась как двухстрочная — 20 ложных дефектов на одном листе.
      rng.selectNodeContents(el);
      const lines = Array.from(rng.getClientRects()).filter((r) => r.height > 1 && r.width > 1).length;
      if (lines > 1) bad.push({ el: sig(el), h: Math.round(el.getBoundingClientRect().height / k), lines, text: txt.slice(0, 30) });
    });
    return bad;
  }

  // 2б. пересечения в АБСОЛЮТНОМ слое — то, что проверка выше пропускала по построению.
  // Найдено ревьюером на доске: узел «Is it far from here?» ушёл под непрозрачную панель
  // инструментов, 17 px текста скрыто. Абсолютные слои НАКЛАДЫВАЮТСЯ по замыслу — поэтому
  // дефектом считается только случай, когда оба непрозрачны, несут текст и ни у одного не задан z-index:
  // то есть порядок перекрытия случаен, а не назначен.
  function absOverlaps(root) {
    const k = scaleOf(root);
    const opaque = (el) => {
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      if (!bg || bg.includes('rgba(0, 0, 0, 0)')) return false;
      const m = bg.match(/[\d.]+/g);
      return !(m && m.length === 4 && parseFloat(m[3]) < 0.9);
    };
    const items = [];
    root.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== 'absolute' && cs.position !== 'fixed') return;
      if (cs.zIndex !== 'auto') return;
      if (!vis(el) || !opaque(el)) return;
      if (!(el.textContent || '').trim()) return;
      items.push({ el, b: el.getBoundingClientRect() });
    });
    const bad = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], c = items[j];
        if (a.el.contains(c.el) || c.el.contains(a.el)) continue;
        const w = Math.min(a.b.right, c.b.right) - Math.max(a.b.left, c.b.left);
        const h = Math.min(a.b.bottom, c.b.bottom) - Math.max(a.b.top, c.b.top);
        if (w > 1 && h > 1 && (w * h) / (k * k) > 24) {
          bad.push({
            a: sig(a.el), b: sig(c.el),
            area: Math.round((w * h) / (k * k)),
            textA: (a.el.textContent || '').trim().slice(0, 24),
            textB: (c.el.textContent || '').trim().slice(0, 24),
          });
        }
      }
    }
    return bad;
  }

  // 10б. перенос самого РЯДА: flex-контейнер с wrap развалился на две строки.
  // Найдено ревьюером на пульте урока: `wrapped` смотрит текст ВНУТРИ кнопки и не видит,
  // что в два ряда ушли сами кнопки.
  // Строки считаются по рамкам детей: перенос — это ребёнок, начинающийся ниже низа
  // предыдущего. Высоту контейнера мерить нельзя: при `align-items: baseline` она законно
  // больше самого высокого ребёнка (ложное срабатывание на шапке «Задания и конспект»).
  // Осознанное облако тегов помечается data-wrap-ok — там перенос и есть раскладка.
  function rowWrap(root) {
    const bad = [];
    root.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display !== 'flex' || cs.flexDirection !== 'row' || cs.flexWrap === 'nowrap') return;
      if (!vis(el) || el.hasAttribute('data-wrap-ok')) return;
      const kids = Array.from(el.children).filter(vis);
      if (kids.length < 3) return;
      const boxes = kids.map((c) => c.getBoundingClientRect());
      let lines = 1;
      for (let i = 1; i < boxes.length; i++) if (boxes[i].top >= boxes[i - 1].bottom - 1) lines++;
      if (lines > 1) bad.push({ el: sig(el), lines: lines, kids: kids.length, text: (el.textContent || '').trim().slice(0, 30) });
    });
    return bad;
  }

  function textUnderLayer(root) {
    const k = scaleOf(root);
    const layers = [];
    root.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== 'absolute' && cs.position !== 'fixed' && cs.position !== 'sticky') return;
      if (cs.zIndex === 'auto' || Number(cs.zIndex) < 1) return;
      if (!vis(el) || Number(cs.opacity) < 0.5) return;
      const bg = parse(cs.backgroundColor);
      const alpha = bg.length === 4 ? bg[3] : bg.length ? 1 : 0;
      if (alpha < 0.5) return;
      layers.push({ el, box: el.getBoundingClientRect() });
    });
    const bad = [];
    layers.forEach((L) => {
      // осознанный оверлей (панель урока) накрывает доску по замыслу — но не лица (ПРАВИЛА 06)
      const okLayer = L.el.hasAttribute('data-overlay-ok');
      const faces = okLayer ? root.querySelector('[data-class-pane]') : null;
      root.querySelectorAll('*').forEach((t) => {
        if (t === L.el || L.el.contains(t) || t.contains(L.el)) return;
        if (okLayer && !(faces && faces.contains(t))) return;
        if (t.children.length || !(t.textContent || '').trim()) return;
        if (!vis(t)) return;
        const ov = rectsOverlap(L.box, t.getBoundingClientRect());
        if (ov < 24 * k * k) return;
        bad.push({ layer: sig(L.el), text: (t.textContent || '').trim().slice(0, 34), area: Math.round(ov / (k * k)) });
      });
    });
    return bad;
  }

  // 14. вылет за кадр. Дефект нижнего пульта (translateX(-50%) от старой центровки) жил в
  // ПЕРЕХОДЕ: в покое слой стоял на месте, а в скрытом состоянии уезжал за левый край.
  // Поэтому прозрачность ЗДЕСЬ не фильтруется: слой с opacity: 0 всё равно был виден по
  // пути туда. Прогон прогоняется несколько раз: покой, скрытые пульты, открытая панель.
  function frameBleed(root) {
    const k = scaleOf(root);
    const box = root.getBoundingClientRect();
    const bad = [];
    root.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== 'absolute' && cs.position !== 'fixed') return;
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const b = el.getBoundingClientRect();
      if (b.width < 2 || b.height < 2) return;
      const out = Math.max(box.left - b.left, b.right - box.right, box.top - b.top, b.bottom - box.bottom) / k;
      if (out > 1) bad.push({ el: sig(el), out: Math.round(out), text: (el.textContent || '').trim().slice(0, 30) });
    });
    return bad;
  }

  function sig(el) {
    const t = el.tagName.toLowerCase();
    const d = Object.keys(el.dataset || {})[0];
    return t + (d ? '[data-' + d.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()) + ']' : '');
  }

  // 15. Макет не должен прыгать между «загружается» и «наполнено»: заглушка обязана
  // занимать ровно то же место, что и содержимое. Статичный снимок этого не видит
  // вовсе, поэтому мерятся два состояния и сравнивается геометрия.
  //
  // Сравниваются ИМЕНОВАННЫЕ места (`data-geo="имя"`), а не пути по номерам детей:
  // одна исчезающая шапка сдвигает все индексы, и прибор начинает сравнивать разные
  // элементы и врать. Имя вешается на то, что ОБЯЗАНО стоять на месте во всех состояниях.
  window.flAuditGeometry = function () {
    const root = scope();
    const k = scaleOf(root);
    const box = root.getBoundingClientRect();
    const out = {};
    // Одно имя может стоять на двух элементах: на содержимом и на его заглушке. Это и есть
    // способ сказать «эти два обязаны занимать одно место». Берётся видимый из пары.
    root.querySelectorAll('[data-geo]').forEach((el) => {
      const cs = getComputedStyle(el);
      const name = el.getAttribute('data-geo');
      if (cs.display === 'none' || cs.visibility === 'hidden') {
        if (!(name in out)) out[name] = 'нет в кадре';
        return;
      }
      const b = el.getBoundingClientRect();
      out[name] = [
        Math.round((b.left - box.left) / k), Math.round((b.top - box.top) / k),
        Math.round(b.width / k), Math.round(b.height / k),
      ];
    });
    return out;
  };

  /** Сравнить два слепка flAuditGeometry. Допуск 2 px — округление масштаба. */
  window.flAuditJump = function (a, b, tol) {
    const t = tol == null ? 2 : tol;
    const bad = [];
    Object.keys(a).forEach((name) => {
      if (!(name in b)) return;
      // место, которого в одном из состояний вообще нет, — тоже прыжок: заглушка обязана быть
      if (typeof a[name] === 'string' || typeof b[name] === 'string') {
        if (a[name] !== b[name]) bad.push({ place: name, was: a[name], now: b[name], delta: 999 });
        return;
      }
      const d = a[name].map((v, i) => Math.abs(v - b[name][i]));
      const m = Math.max.apply(null, d);
      if (m > t) bad.push({ place: name, was: a[name], now: b[name], delta: m });
    });
    bad.sort((x, y) => y.delta - x.delta);
    return bad;
  };

  /* Мобильное исключение (ПРАВИЛА 8.6а). На телефоне запрет прокрутки страницы бессмысленен:
     расписание на неделю и список заданий физически не влезают в 844 px, а «не больше двух
     прокручиваемых областей» на 390 px превращается в две вложенные прокрутки — то есть
     ровно в то, что запрет должен был предотвратить. Правило меняет форму, а не исчезает:
     лист телефона прокручивается ВЕСЬ и только вертикально, вложенных прокруток нет,
     горизонтальной — нет никогда. Прибор это и мерит: mobileScroll вместо pageScroll.
     Кадр помечается data-mobile на том же узле, что data-audit-scope. */
  function mobileScroll(root) {
    const bad = [];
    const hx = Math.max(0, root.scrollWidth - root.clientWidth);
    if (hx > 1) bad.push({ what: 'горизонтальная прокрутка листа', px: Math.round(hx), sig: sig(root) });
    let nested = 0, sheets = 0;
    root.querySelectorAll('*').forEach((el) => {
      const cs = getComputedStyle(el);
      const oy = cs.overflowY, ox = cs.overflowX;
      if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight - el.clientHeight > 2) {
        // Одна прокрутка листа разрешена и помечена data-sheet-scroll: шапка и полка вкладок
        // на телефоне стоят на месте, ездит только содержимое. Вторая такая — уже дефект.
        if (el.hasAttribute('data-sheet-scroll')) {
          sheets++;
          if (sheets > 1) bad.push({ what: 'вторая прокрутка листа', sig: sig(el) });
          return;
        }
        nested++;
        bad.push({ what: 'вложенная вертикальная прокрутка внутри прокручиваемого листа', sig: sig(el) });
      }
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth - el.clientWidth > 2 && !el.hasAttribute('data-strip-ok')) {
        bad.push({ what: 'горизонтальная прокрутка области (полоса разрешается только с data-strip-ok)', sig: sig(el) });
      }
    });
    return { defects: bad, nested, sheets };
  }

  window.flAudit = function (opts) {
    const o = opts || {};
    const root = scope();
    const isMobile = o.mobile != null ? !!o.mobile : root.hasAttribute('data-mobile');
    visCache = new WeakMap();
    const report = {
      label: o.label || document.title || location.pathname,
      mobile: isMobile,
      pageScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      mobileScroll: isMobile ? mobileScroll(root) : null,
      overlaps: overlaps(root),
      absOverlaps: absOverlaps(root),
      textUnderLayer: textUnderLayer(root),
      clipped: clipped(root),
      rowTops: rowTops(root),
      gaps: gaps(root),
      rawValues: rawValues(root),
      tapTargets: tapTargets(root),
      contrast: contrast(root),
      wrapped: wrappedControls(root),
      rowWrap: rowWrap(root),
      frameBleed: frameBleed(root),
      accents: accents(root),
    };
    report.verdict = {
      pageScroll: isMobile
        ? 'ok · телефон: прокрутка листа разрешена (ПРАВИЛА 8.6а)'
        : (report.pageScroll === 0 ? 'ok' : 'ДЕФЕКТ'),
      overlaps: report.overlaps.length ? 'ДЕФЕКТ ' + report.overlaps.length : 'ok',
      absOverlaps: report.absOverlaps.length ? 'ДЕФЕКТ · в абсолютном слое ' + report.absOverlaps.length : 'ok',
      textUnderLayer: report.textUnderLayer.length ? 'ДЕФЕКТ · текст под слоем ' + report.textUnderLayer.length : 'ok',
      clipped: report.clipped.length ? 'ДЕФЕКТ ' + report.clipped.length : 'ok',
      rowTops: report.rowTops.length ? 'ДЕФЕКТ ' + report.rowTops.length : 'ok',
      gaps: report.gaps.offGrid.length ? 'вне сетки 4px: ' + report.gaps.offGrid.join(', ') : 'ok · разных значений ' + report.gaps.distinct,      rawValues: report.rawValues.length ? 'ДЕФЕКТ ' + report.rawValues.length : 'ok',
      tapTargets: report.tapTargets.length ? 'ДЕФЕКТ ' + report.tapTargets.length : 'ok',
      /* Принятые владельцем пары считаются и показываются, но дефектом не зовутся:
         решение 03.09 — палитра Cursor один в один, ПРАВИЛО 4.8 снято. Число здесь
         стоит нарочно: пока оно видно, разговор «а это тоже осознанно?» возможен. */
      contrast: (report.contrast.length ? 'ДЕФЕКТ ' + report.contrast.length : 'ok')
        + (report.contrast.принято && report.contrast.принято.length
            ? ' · принято владельцем ' + report.contrast.принято.length
              + ' (худшая пара ' + report.contrast.принято.reduce((a, b) => (b.ratio < a.ratio ? b : a)).пара
              + ' = ' + report.contrast.принято.reduce((a, b) => (b.ratio < a.ratio ? b : a)).ratio + ')'
            : ''),
      wrapped: report.wrapped.length ? 'ДЕФЕКТ · подпись рвётся в ' + report.wrapped.length : 'ok',
      rowWrap: report.rowWrap.length ? 'ДЕФЕКТ · ряд развалился в ' + report.rowWrap.length : 'ok',
      frameBleed: report.frameBleed.length ? 'ДЕФЕКТ · вышло за кадр ' + report.frameBleed.length : 'ok',
      mobileScroll: !isMobile ? 'не применимо · настольный кадр'
        : (report.mobileScroll.defects.length
            ? 'ДЕФЕКТ · ' + report.mobileScroll.defects.length + ' (вложенных прокруток ' + report.mobileScroll.nested + ')'
            : 'ok · одна вертикальная прокрутка листа, горизонтальной нет'),
      // ПРАВИЛА 5.1: одна акцентная заливка на экран (точка состояния + главное действие = 2 допустимо),
      // акцентного текста — не больше трёх надписей
      accents: report.accents.fillCount > 2 || report.accents.textCount > 3
        ? 'ДЕФЕКТ · заливок ' + report.accents.fillCount + ', текста ' + report.accents.textCount
        : 'ok · заливок ' + report.accents.fillCount + ', текста ' + report.accents.textCount,
      // ПРАВИЛА 5.9: зелёного — одна заливка и до трёх надписей; метки списка (оценки,
      // «пройдено») — однородный столбец, а не акценты, и считаются отдельно от надписей
      /* Пергамент: уголёк — текст, а не поверхность. Порог не «не больше двух», а ноль. */
      уголёкНеПоверхность: !report.accents.подПергаментом
        ? 'не применимо · на экране нет пергамента'
        : (report.accents.угольковыеЗаливки.length
            ? 'ДЕФЕКТ · уголёк взят заливкой ' + report.accents.угольковыеЗаливки.length + ' раз (заливки берут чернила)'
            : 'ok · заливок углём 0, слов углём ' + report.accents.угольковыеСлова.length),
      accentsGo: report.accents.goFillCount > 1
        ? 'ДЕФЕКТ · зелёных заливок ' + report.accents.goFillCount
        : 'ok · заливок ' + report.accents.goFillCount + ', текста ' + report.accents.goTextCount + ', линий ' + report.accents.goLineCount,
    };
    visCache = null;
    return report;
  };

  /** Проверка приборов: подкладываем заведомо сломанный элемент и смотрим, поймает ли. */
  window.flAuditSelfTest = function () {
    const host = document.createElement('div');
    host.style.cssText = 'position:relative;display:grid;grid-template-columns:120px 120px;gap:7px;width:240px';
    const a = document.createElement('div');
    a.style.cssText = 'height:40px;background:#ff0000;margin-left:60px;white-space:nowrap;overflow:hidden;width:40px';
    a.textContent = 'заведомо слишком длинная строка для сорока пикселей';
    const b = document.createElement('button');
    b.style.cssText = 'height:18px;color:#bbbbbb;background:#ffffff';
    b.textContent = 'мелкая кнопка';
    // подложенный перенос: узкая кнопка с длинной подписью — текст обязан завернуться
    const c = document.createElement('button');
    c.style.cssText = 'width:70px;min-height:34px;padding:0 8px;white-space:normal;background:#ffffff;color:#1d1d1f';
    c.textContent = 'подпись, которая обязана завернуться';
    host.append(a, b, c);
    // подложенное пересечение в абсолютном слое: две непрозрачные плашки без z-index
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;left:10px;top:10px;width:80px;height:40px;background:#ffffff;color:#1d1d1f';
    d.textContent = 'нижняя плашка';
    const e = document.createElement('div');
    e.style.cssText = 'position:absolute;left:40px;top:20px;width:80px;height:40px;background:#ffffff;color:#1d1d1f';
    e.textContent = 'верхняя плашка';
    host.append(d, e);
    // подложенный развал ряда: три широкие кнопки в узком wrap-контейнере
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;width:120px;gap:4px;background:#ffffff';
    for (let i = 0; i < 3; i++) {
      const btn = document.createElement('span');
      btn.style.cssText = 'display:block;width:80px;height:30px;background:#eeeeee';
      btn.textContent = 'ряд ' + i;
      row.append(btn);
    }
    host.append(row);
    const bare = document.createElement('span');    bare.textContent = 'подпись под слоем';
    bare.style.cssText = 'position:absolute;left:0;top:0;width:150px;height:20px;color:#333333';
    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;left:0;top:0;width:150px;height:20px;z-index:5;background:#ffffff';
    host.style.position = 'relative';
    host.append(bare, layer);
    // подложенный вылет за кадр: слой, уехавший влево от границы
    const flew = document.createElement('div');
    flew.style.cssText = 'position:absolute;left:-160px;top:0;width:120px;height:30px;background:#ffffff;color:#1d1d1f';
    flew.textContent = 'уехал за кадр';
    host.append(flew);
    /* ── ПЕРГАМЕНТ: три подкладных образца ───────────────────────────────────
       Токены ставятся ПРЯМО НА УЗЛЕ образца: лист может быть открыт и без
       `пергамент.css`, а проверять прибор надо здесь и сейчас. Прибор читает
       их вычисленным стилем и разницы не заметит.
       Образцы подобраны так, чтобы поймать обе стороны нового правила:
         · принятая пара (туман на холсте = 2,41 — ровно та, о которой спорили)
           обязана НЕ считаться дефектом;
         · тот же по светлоте, но ЧУЖОЙ серый обязан считаться — иначе прибор
           слеп и «сняли порог» означало бы «выключили прибор»;
         · уголёк заливкой обязан краснеть: у пергамента он только текст. */
    const перг = document.createElement('div');
    перг.setAttribute('data-\u044f\u0437\u044b\u043a', '\u043f\u0435\u0440\u0433\u0430\u043c\u0435\u043d\u0442');
    [['--\u043f-\u0445\u043e\u043b\u0441\u0442', '#f7f7f4'], ['--\u043f-\u0442\u0435\u043a\u0441\u0442', '#26251e'],
     ['--\u043f-\u0442\u0443\u043c\u0430\u043d', '#a1a19f'], ['--\u043f-\u0443\u0433\u043e\u043b\u0451\u043a', '#f54e00'],
     ['--\u043f-\u043a\u0430\u0440\u0442\u043e\u0447\u043a\u0430', '#f2f1ed'], ['--\u043f-\u0432\u044b\u0448\u0435', '#e6e5e0'],
     ['--\u043f-\u043b\u0438\u043d\u0438\u044f', '#cdcdc9'], ['--\u043f-\u044f\u043d\u0442\u0430\u0440\u044c', '#c08532'],
     ['--\u043f-\u043b\u0435\u0441', '#34785c'], ['--\u043f-\u0438\u0437\u0443\u043c\u0440\u0443\u0434', '#1f8a65'],
     ['--\u043f-\u043f\u0435\u043f\u0435\u043b', '#7a7974'], ['--\u043f-\u043f\u043b\u0430\u0432\u043d\u0438\u043a', '#84847e'],
     ['--\u043f-\u0431\u0430\u0433\u0440\u044f\u043d\u0435\u0446', '#cf2d56']].forEach(([н, v]) => перг.style.setProperty(н, v));
    перг.style.cssText += ';position:absolute;left:0;top:200px;width:240px;background:#f7f7f4';
    const принятая = document.createElement('div');
    принятая.style.cssText = 'color:#a1a19f;font-size:13px';   // туман на холсте = 2,41
    принятая.textContent = 'подпись туманом';
    const чужая = document.createElement('div');
    чужая.style.cssText = 'color:#9e9e9e;font-size:13px';       // мимо набора, та же светлота
    чужая.textContent = 'придуманный по дороге серый';
    const заливкаУглём = document.createElement('div');
    заливкаУглём.style.cssText = 'width:120px;height:40px;background:#f54e00;color:#f7f7f4';
    заливкаУглём.textContent = 'уголёк заливкой';
    перг.append(принятая, чужая, заливкаУглём);
    host.append(перг);

    document.body.append(host);
    scope().append(host);
    const r = window.flAudit({ label: 'selftest' });
    const принятыеПары = (r.contrast.принято || []).map((x) => x.пара);
    host.remove();
    return {
      'ловит обрезку': r.clipped.length > 0,
      'ловит голый hex/px': r.rawValues.length > 0,
      'ловит мелкую цель': r.tapTargets.length > 0,
      'ловит низкий контраст': r.contrast.length > 0,
      'ловит gap вне сетки': r.gaps.offGrid.includes(7),
      'ловит лишний акцент': r.accents.fillCount > 0,
      'ловит перенос в кнопке': r.wrapped.length > 0,
      'ловит наложение в абсолютном слое': r.absOverlaps.length > 0,
      'ловит развал ряда': r.rowWrap.length > 0,
      'ловит текст под слоем': r.textUnderLayer.length > 0,
      'ловит вылет за кадр': r.frameBleed.length > 0,
      'пергамент: принятую пару НЕ считает дефектом': принятыеПары.some((п) => п.indexOf('\u0442\u0443\u043c\u0430\u043d') !== -1)
        && !r.contrast.some((d) => d.text.indexOf('\u043f\u043e\u0434\u043f\u0438\u0441\u044c \u0442\u0443\u043c\u0430\u043d\u043e\u043c') === 0),
      'пергамент: чужой цвет мимо набора всё ещё ловит': r.contrast.some((d) => d.text.indexOf('\u043f\u0440\u0438\u0434\u0443\u043c\u0430\u043d\u043d\u044b\u0439') === 0),
      'пергамент: уголёк заливкой ловит': r.accents.угольковыеЗаливки.length > 0,
    };
  };
})();
