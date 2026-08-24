/**
 * FLAMINGO — ПРИБОР 19: «НАЖМИ ВСЁ И СРАВНИ СНИМКИ».
 *
 * Зачем он, если приборов уже восемнадцать. Все восемнадцать меряют КАРТИНКУ: перекрытия,
 * контраст, отступы, прокрутку, прыжки. Мёртвая кнопка с верной разметкой, верным контрастом
 * и верной целью нажатия проходит их все. Пустая рамка под именем «перетаскивание»
 * геометрически безупречна. Оба дефекта нашёл владелец глазами, и оба стоили того, что
 * разработчик собрал по листу неработающий экран.
 *
 * Здесь два прибора, и они меряют разное:
 *
 *   flClicks()   — нажимает КАЖДЫЙ интерактивный элемент внутри кадра и валится, если после
 *                  нажатия в кадре не изменилось ничего. Обратная сторона: если элемент
 *                  объявлен приглушённой дверью (aria-disabled), то дефект — наоборот,
 *                  ИЗМЕНЕНИЕ (ПРАВИЛА 12.5: мёртвая кнопка, которая выглядит живой, хуже
 *                  отсутствующей — но и живая дверь под видом приглушённой врёт).
 *
 *   flCases()    — щёлкает по случаям в служебной полосе и сверяет снимок с ИМЕНЕМ случая.
 *                  Два имени, давшие один и тот же снимок, — дефект: имя обещает состояние,
 *                  которого в разметке нет.
 *
 * Про листы и «немые» кнопки. Лист — не продукт: часть кнопок на нём стоит показом
 * («Микрофон», «Показать экран»), и требовать от них ответа бессмысленно. Поэтому правило
 * не «каждая кнопка отвечает», а: **кнопка либо отвечает, либо объявлена немой словами** —
 * `data-still="почему"`. Необъявленное молчание — дефект. Так список немых кнопок становится
 * явным: разработчик читает из листа, что здесь обязан появиться отклик, а прибор следит,
 * чтобы объявление не подкладывали живым кнопкам.
 *
 * Прибор не восстанавливает состояние листа: после прогона лист «грязный». Это осознанно —
 * восстановление угадыванием врёт хуже, чем грязный лист. Стенд `clicks-run.html` даёт
 * каждому проходу свежий кадр.
 *
 * Самопроверка: flClicksSelfTest() подкладывает четыре кнопки с известным поведением.
 * Прибор, который никогда не видел дефекта, неотличим от прибора, который его не ловит.
 */
(function () {
  const SETTLE = 130;

  // Пауза. ТОЛЬКО через MessageChannel, без rAF и без setTimeout, и это не перестраховка:
  // лист меряется в кадре, вынесенном за пределы окна (left: -4000px), а такому кадру браузер
  // душит и отрисовку, и таймеры — паузы по кадрам растягивались с 130 мс до секунды, и прогон
  // выглядел вставшим. Сообщения в канал не душатся ничем.
  const sleep = (ms) => new Promise((res) => {
    const t0 = performance.now();
    const ch = new MessageChannel();
    const tick = () => (performance.now() - t0 >= ms ? res() : ch.port2.postMessage(0));
    ch.port1.onmessage = tick;
    tick();
  });

  const scope = () => document.querySelector('[data-audit-scope]') || document.body;
  const scaleOf = (root) => {
    const w = root.offsetWidth || 1;
    const k = root.getBoundingClientRect().width / w;
    return k > 0.05 ? k : 1;
  };

  const vis = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    const b = el.getBoundingClientRect();
    return b.width > 0.5 && b.height > 0.5;
  };

  const ownText = (el) => {
    let t = '';
    el.childNodes.forEach((n) => { if (n.nodeType === 3) t += n.nodeValue; });
    return t.replace(/\s+/g, ' ').trim().slice(0, 48);
  };

  const name = (el) => {
    const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
    const l = el.getAttribute('aria-label') || '';
    const d = el.dataset && Object.keys(el.dataset).length
      ? '[' + Object.keys(el.dataset).map((k) => 'data-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + '=' + el.dataset[k]).join(' ') + ']'
      : '';
    return (el.tagName.toLowerCase() + ' ' + (t || l || '(без надписи)').slice(0, 40) + ' ' + d).trim();
  };

  /**
   * СНИМОК КАДРА. Не пиксели, а то, что можно сравнить построчно и потом назвать словами:
   * тег, имя данных, рамка в макетных пикселях, собственный текст, цвет текста и заливка.
   * Округление до 2 px — тот же допуск, что у прибора прыжков: масштаб кадра даёт дробь.
   */
  function digest(root) {
    const k = scaleOf(root);
    const box = root.getBoundingClientRect();
    const lines = [];
    [root, ...root.querySelectorAll('*')].forEach((el) => {
      if (!vis(el)) return;
      const b = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const r = [
        Math.round((b.left - box.left) / k / 2) * 2,
        Math.round((b.top - box.top) / k / 2) * 2,
        Math.round(b.width / k / 2) * 2,
        Math.round(b.height / k / 2) * 2,
      ].join(',');
      const d = el.dataset && Object.keys(el.dataset)[0] ? '@' + Object.keys(el.dataset)[0] : '';
      lines.push(el.tagName.toLowerCase() + d + '|' + r + '|' + ownText(el) + '|' + cs.color + '|' + cs.backgroundColor);
    });
    return lines;
  }

  const diff = (a, b) => {
    if (a.length !== b.length) return Math.abs(a.length - b.length) + a.filter((l, i) => b[i] !== undefined && b[i] !== l).length;
    let n = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
    return n;
  };

  const CLICKABLE = 'button, [role="button"], a[href], input, select, textarea, [tabindex="0"], [onclick]';
  const FIELDS = { input: 1, select: 1, textarea: 1 };
  /**
   * ПРИБОР 19а. Нажать всё внутри кадра и сравнить снимки до и после.
   *
   * Служебная полоса листа не берётся: она стенд, а не продукт. Заодно это ловит ПРАВИЛА 6.7д —
   * служебное имя `data-sw` внутри кадра означает, что стенд и продукт спорят за один
   * `querySelector`, и восемь дней прогон мерил не тот экран.
   */
  window.flClicks = async function (opts) {
    const o = opts || {};
    const root = scope();
    const settle = o.settle == null ? SETTLE : o.settle;
    const dead = [], zombie = [], noisy = [], still = [], live = [], skipped = [], gone = [];

    const swInside = Array.from(root.querySelectorAll('[data-sw]')).map(name);
    const links = [];

    const list = Array.from(root.querySelectorAll(CLICKABLE)).filter(vis);
    const total = list.length;
    // Бюджет времени и переиспользование снимка. Первый заход считал снимок дважды на каждое
    // нажатие и не имел предела — на листе со сотней элементов прогон встал насмерть.
    // Снимок «после» одного нажатия и есть снимок «до» следующего: кроме прибора лист никто
    // не трогает. Исчерпанный бюджет не «ok», а честное «не проверено».
    const budget = o.budget == null ? 70000 : o.budget;
    const t0 = performance.now();
    let cur = digest(root);
    for (const el of list) {
      if (performance.now() - t0 > budget) { gone.push({ el: name(el), why: 'исчерпан бюджет времени прохода — не проверен' }); continue; }
      if (!root.contains(el)) { gone.push({ el: name(el), why: 'элемент исчез из кадра до своей очереди' }); continue; }
      if (!vis(el)) { gone.push({ el: name(el), why: 'элемент стал невидим после предыдущего нажатия — не проверен' }); continue; }
      const tag = el.tagName.toLowerCase();
      // 🔴 ССЫЛКУ ПРИБОР НЕ НАЖИМАЕТ. Три листа подряд «зависали» на проходе, и причина
      // оказалась не в мере, а в мере: `el.click()` по `<a href>` уводил кадр на другой лист,
      // контекст листа умирал вместе с обещанием, и проход не заканчивался никогда. К тому же
      // «после нажатия ничего не изменилось» для ссылки — норма, а не дефект: она меняет не
      // кадр, а адрес. Ссылки проверяются адресом и попадают в отчёт своим списком.
      if (tag === 'a') {
        const href = el.getAttribute('href') || '';
        const пустая = !href || href === '#' || href.startsWith('javascript:');
        links.push({ el: name(el), href: href, ведёт: !пустая });
        if (пустая) dead.push({ el: name(el), строк: 0, why: 'ссылка без адреса — нажимается и не ведёт никуда' });
        continue;
      }
      if (FIELDS[tag] && !(tag === 'input' && /^(button|submit|checkbox|radio)$/.test(el.type))) {
        skipped.push({ el: name(el), why: 'поле ввода — нажатием не мерится' });
        continue;
      }
      const muted = el.getAttribute('aria-disabled') === 'true' || el.disabled;
      const declared = el.getAttribute('data-still');
      const before = cur;
      try { el.click(); } catch (e) { /* мёртвая разметка — увидит прибор ошибок страницы */ }
      await sleep(settle);
      const after = digest(root);
      cur = after;
      const d = diff(before, after);
      const rec = { el: name(el), строк: d };
      if (muted) {
        // Приглушённая дверь ОБЯЗАНА молчать (ПРАВИЛА 12.5). И не обязана объявлять молчание
        // словами: `aria-disabled` уже объявление, и оно доходит до читалки экрана.
        if (d > 0) zombie.push(rec); else still.push(Object.assign({ вид: 'приглушённая дверь' }, rec));
        if (el.getAttribute('tabindex') !== '-1') noisy.push({ el: name(el), why: 'aria-disabled без tabindex="-1" — дверь берёт фокус (ПРАВИЛА 12.5)' });
        continue;
      }
      if (d > 0) { live.push(rec); continue; }
      // 🔴 УЖЕ ВЫБРАННЫЙ СЛУЧАЙ МОЛЧИТ ЗАКОННО. Первый прогон назвал мёртвой вкладку «Доска»,
      // которая открыта: нажатие на включённое ничего не меняет и менять не должно.
      // Проверяется соседом: если другой случай той же группы кадр меняет — группа живая,
      // а молчание было ответом «я и так открыт».
      const gk = el.dataset.pick || el.dataset.sw;
      if (gk && el.dataset.val) {
        const sib = Array.from(root.querySelectorAll('[data-pick="' + gk + '"], [data-sw="' + gk + '"]'))
          .find((x) => x !== el && vis(x) && x.dataset.val !== el.dataset.val);
        if (sib) {
          sib.click();
          await sleep(settle);
          const dSib = diff(before, digest(root));
          el.click();
          await sleep(settle);
          cur = digest(root);
          if (dSib > 0) { live.push(Object.assign({ вид: 'случай был выбран — молчание законно', сосед: dSib }, rec)); continue; }
        }
      }
      if (declared) { still.push(Object.assign({ вид: 'объявлено: ' + declared }, rec)); continue; }
      dead.push(rec);
    }

    const нажато = live.length + still.length + dead.length + zombie.length;
    const rep = {
      label: o.label || document.title || location.pathname,
      // 🔴 «ОЖИЛ» СЧИТАЕТСЯ ПО НАЖАТЫМ, А НЕ ПО НАЙДЕННЫМ. Первая версия считала `total`,
      // в который входят ссылки, а ссылки прибор не нажимает вовсе. На «Первой странице»
      // все семь элементов кадра — ссылки, и таблица получала зелёную клетку над листом,
      // где не нажали ничего — то самое «зелёное значит не мерили» (ПРАВИЛА 6.7е).
      ожил: нажато > 0,
      всего: total, нажато: нажато, ссылок: links.length,
      отвечают: live.length, объявлено_немых: still.length, не_проверено: gone.length + skipped.length,
      dead, zombie, noisy, swInside, gone, skipped, links,
      живых_примеров: live.slice(0, 4),
    };
    rep.verdict = {
      clicks: !нажато ? 'НЕ ИЗМЕРЕНО · нажимаемых элементов нет' + (links.length ? ', только ссылки (' + links.length + ')' : '')
        : dead.length ? 'ДЕФЕКТ · молчат и не объявлены: ' + dead.length : 'ok · нажато ' + нажато + ', отвечают ' + live.length + ', объявлено немых ' + still.length,
      zombie: zombie.length ? 'ДЕФЕКТ · приглушённая дверь отвечает: ' + zombie.length : 'ok',
      swInside: swInside.length ? 'ДЕФЕКТ · служебное имя внутри кадра: ' + swInside.length + ' (ПРАВИЛА 6.7д)' : 'ok',
      links: links.length ? 'ссылок ' + links.length + ', ведут ' + links.filter((l) => l.ведёт).length : 'ссылок нет',
      focus: noisy.length ? 'ДЕФЕКТ · дверь берёт фокус: ' + noisy.length : 'ok',
    };
    if (!o.quiet) console.log('[flClicks] ' + rep.label, rep.verdict, rep);
    return rep;
  };

  /**
   * ПРИБОР 19б. Снимок против собственного ИМЕНИ.
   *
   * Пятая слепота приборов, названная 23 августа: снимок ни с чем не сверяется. Прибор
   * щёлкает по случаям служебной полосы и требует двух вещей:
   *   1. два разных имени дают два разных снимка кадра (иначе одно из имён — обещание пустоты);
   *   2. в кадре есть хоть один корень слова из имени случая (мягкая проверка, предупреждение).
   *
   * Второе намеренно мягкое: «перо» на снимке видно росчерком, а не словом. Но когда ни один
   * корень имени не встречается в кадре, это стоит прочитать глазами.
   */
  window.flCases = async function (opts) {
    const o = opts || {};
    const root = scope();
    const settle = o.settle == null ? 420 : o.settle;
    // Служебные переключатели живут ВНЕ кадра (ПРАВИЛА 6.7д, 8.14) — берём только их.
    const all = Array.from(document.querySelectorAll('[data-sw]')).filter((b) => !root.contains(b) && vis(b));
    const groups = {};
    all.forEach((b) => {
      const k = b.dataset.sw;
      if (o.skip && o.skip.indexOf(k) >= 0) return;
      if (['theme', 'kids', 'w'].indexOf(k) >= 0) return; // тема, детский вид и кадр меняют всё по замыслу
      (groups[k] = groups[k] || []).push(b);
    });

    const twins = [], unnamed = [], seen = [], missed = [], per = {};
    const budget = o.budget == null ? 50000 : o.budget;
    const t0 = performance.now();
    for (const k of Object.keys(groups)) {
      const btns = groups[k];
      if (btns.length < 2) continue;
      per[k] = [];
      for (const b of btns) {
        if (performance.now() - t0 > budget) { missed.push({ группа: k, случай: (b.textContent || b.dataset.val || '').trim(), why: 'исчерпан бюджет времени прохода — не снят' }); continue; }
        // 🔴 Случай, недоступный в текущем состоянии, НЕ снимается. Первый прогон этого прибора
        // сам попался в дефект, который ищет: щёлкнув по скрытой кнопке, он получал снимок
        // предыдущего случая и называл два имени близнецами. Кнопка, спрятанная листом
        // (состояния, которых у этой фазы нет), — не близнец, а «не снято».
        if (!vis(b)) { missed.push({ группа: k, случай: (b.textContent || b.dataset.val || '').trim(), why: 'случай недоступен в этом состоянии — не снят' }); continue; }
        b.click();
        await sleep(settle);
        const lines = digest(root);
        const label = (b.textContent || b.dataset.val || '').replace(/\s+/g, ' ').trim();
        const текст = lines.join(' ').toLowerCase();
        const stems = label.toLowerCase().split(/[^а-яёa-z0-9]+/).filter((w) => w.length >= 4).map((w) => w.slice(0, 5));
        const echo = !stems.length || stems.some((st) => текст.indexOf(st) >= 0);
        if (!echo) unnamed.push({ группа: k, случай: label, why: 'ни один корень имени не встречается в кадре' });
        const same = seen.find((s) => s.группа === k && s.lines.length === lines.length && diff(s.lines, lines) === 0);
        if (same) twins.push({ группа: k, случай: label, совпал_с: same.случай, why: 'два имени — один снимок кадра' });
        seen.push({ группа: k, случай: label, lines });
        per[k].push({ случай: label, строк: lines.length });
      }
      // 🔴 Группа возвращается к своему первому случаю. Без этого следующая группа мерится
      // под чужим видом: первый прогон закончил группу «вид» на «правилах» и объявил
      // близнецами преподавателя с учеником — на экране правил роли не существует вовсе.
      if (vis(btns[0])) { btns[0].click(); await sleep(settle); }
    }

    const rep = { label: o.label || document.title, группы: Object.keys(per), снимков: seen.length, twins, unnamed, missed, depends: [], per };

    // 🔴 СОВПАДЕНИЕ СНИМКОВ МОЖЕТ ОТНОСИТЬСЯ К ОДНОМУ ВИДУ, А НЕ К РАЗМЕТКЕ.
    // На листе входа возрастные ветки «7–11 · 12–17 · 18+ · преподаватель» дали один снимок —
    // но потому, что базовый вид «вход», а возраст есть только в регистрации. Прибор
    // переспрашивает группу под вторым случаем соседней группы и, если там ветки расходятся,
    // называет это зависимостью, а не дефектом. Вердикт без состояния — не вердикт.
    const gkeys = Object.keys(groups).filter((k) => groups[k].length >= 2);
    for (const k of Array.from(new Set(twins.map((t) => t.группа)))) {
      const other = gkeys.find((x) => x !== k);
      if (!other) continue;
      // Пробуем ВСЕ случаи соседней группы, а не только второй. Первый заход брал второй —
      // на листе входа это оказалось «восстановление пароля», где возрастной ветки нет так же,
      // как на «входе», и прибор во второй раз ошибся тем же способом, что в первый.
      let разошлись = false, подВидом = '';
      for (let oi = 1; oi < groups[other].length && !разошлись; oi++) {
        const alt = groups[other][oi];
        if (!vis(alt)) continue;
        alt.click();
        await sleep(settle);
        const shots = [];
        for (const b of groups[k]) {
          if (!vis(b)) continue;
          b.click();
          await sleep(settle);
          shots.push(digest(root));
        }
        if (shots.some((s, i) => i > 0 && diff(shots[0], s) > 0)) {
          разошлись = true;
          подВидом = (alt.textContent || alt.dataset.val || '').trim();
        }
      }
      if (разошлись) {
        rep.depends.push({ группа: k, зависит_от: other, вид: подВидом, why: 'под видом «' + подВидом + '» ветки расходятся — совпадение снимков относится только к остальным видам' });
        for (let i = twins.length - 1; i >= 0; i--) if (twins[i].группа === k) twins.splice(i, 1);
      }
      if (vis(groups[other][0])) { groups[other][0].click(); await sleep(settle); }
    }
    rep.verdict = {
      cases: twins.length ? 'ДЕФЕКТ · имя без своего снимка: ' + twins.length : 'ok · снимков ' + seen.length,
      depends: rep.depends.length ? 'групп с зависимостью от вида: ' + rep.depends.length : 'ok',
      named: unnamed.length ? 'смотреть глазами · имя не подтверждено кадром: ' + unnamed.length : 'ok',
    };
    if (!o.quiet) console.log('[flCases] ' + rep.label, rep.verdict, rep);
    return rep;
  };

  /** Самопроверка: четыре кнопки с заранее известным поведением. */
  window.flClicksSelfTest = async function () {
    const root = scope();
    const host = document.createElement('div');
    host.style.cssText = 'position:relative;display:grid;gap:8px;width:240px';
    const mk = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; };

    const bDead = mk('<button style="height:44px">немая, не объявлена</button>');
    const bStill = mk('<button data-still="кнопка продукта, на листе показом" style="height:44px">немая, объявлена</button>');
    const bLive = mk('<button style="height:44px">живая</button>');
    const bZombie = mk('<button aria-disabled="true" tabindex="-1" style="height:44px">дверь</button>');
    // Два флажка, а не один: в первом заходе самопроверки живая кнопка и дверь делили один,
    // и к очереди двери он уже был поднят — «изменение» не отличалось от нуля. Прибор
    // провалил собственную проверку тем самым дефектом, который ищет, и это его лучшая
    // рекомендация: проверка была написана до того, как её результат стал известен.
    const flag = mk('<span style="display:none;height:20px">появился от живой</span>');
    const flagZ = mk('<span style="display:none;height:20px">появился от двери</span>');
    bLive.addEventListener('click', () => { flag.style.display = 'block'; });
    bZombie.addEventListener('click', () => { flagZ.style.display = 'block'; });

    host.append(bDead, bStill, bLive, bZombie, flag, flagZ);
    root.append(host);
    const r1 = await window.flClicks({ label: 'selftest', quiet: true });
    host.remove();

    const has = (arr, txt) => arr.some((x) => x.el.indexOf(txt) >= 0);
    const out = {
      ловит_немую: has(r1.dead, 'немая, не объявлена'),
      не_ругает_объявленную: !has(r1.dead, 'немая, объявлена'),
      не_ругает_живую: !has(r1.dead, 'живая'),
      ловит_живую_дверь: has(r1.zombie, 'дверь'),
    };
    out.ok = Object.values(out).every(Boolean);
    console.log('[flClicksSelfTest]', out);
    return out;
  };
})();
