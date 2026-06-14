import React, { useState } from 'react';
import {
  Calculator, BookOpen, Palette, Languages, Star, Sparkles, Video, Clock, ChevronRight,
  Calendar, LayoutDashboard, TrendingUp, Eye
} from 'lucide-react';

const css = `
.fl-root{
  --fl-white:#fff;
  --fl-warm-50:#fbf8f2;--fl-warm-100:#f4efe6;--fl-warm-150:#ede7db;--fl-warm-200:#e0d8ca;--fl-warm-300:#cfc3b0;
  --fl-warm-400:#a99d87;--fl-warm-500:#8b7f69;--fl-warm-600:#6e6456;--fl-warm-700:#4e473e;--fl-warm-800:#34302a;--fl-warm-900:#2a2520;
  --fl-coral-50:#fbede6;--fl-coral-100:#f6d8c8;--fl-coral-500:#d2562e;--fl-coral-600:#be4622;--fl-coral-700:#a23a1c;--fl-coral-800:#8a3017;
  --fl-success-700:#2e6b45;--fl-warning-700:#8a5e0e;--fl-info-700:#1f5780;
  --fl-shadow-rgb:42,37,32;
  --color-bg:var(--fl-warm-100);--color-surface:var(--fl-warm-50);--color-surface-subtle:var(--fl-warm-150);--color-surface-hover:var(--fl-warm-150);
  --color-border:var(--fl-warm-200);--color-border-strong:var(--fl-warm-300);
  --color-text:var(--fl-warm-900);--color-text-secondary:var(--fl-warm-600);--color-text-tertiary:var(--fl-warm-500);--color-text-on-accent:var(--fl-white);
  --color-accent:var(--fl-coral-500);--color-accent-strong:var(--fl-coral-600);--color-accent-hover:var(--fl-coral-700);--color-accent-pressed:var(--fl-coral-800);
  --color-accent-text:var(--fl-coral-700);--color-accent-subtle:var(--fl-coral-50);--color-accent-subtle-border:var(--fl-coral-100);
  --font-heading:'IBM Plex Sans',system-ui,sans-serif;--font-body:'Golos Text','IBM Plex Sans',system-ui,sans-serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --weight-medium:500;--weight-semibold:600;
  --text-h1:2rem;--text-h2:1.625rem;--text-h3:1.25rem;--text-lead:1.125rem;--text-body:1rem;--text-small:0.875rem;--text-caption:0.8125rem;--text-overline:0.75rem;
  --leading-tight:1.1;--leading-snug:1.4;--leading-body:1.6;--tracking-wide:0.06em;--tracking-snug:-0.01em;
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-7:32px;--space-8:40px;--space-9:48px;
  --radius-sm:8px;--radius-md:12px;--radius-lg:16px;--radius-xl:20px;--radius-pill:999px;--radius-control:10px;--radius-card:16px;
  --shadow-sm:0 1px 2px rgba(var(--fl-shadow-rgb),0.05),0 2px 6px rgba(var(--fl-shadow-rgb),0.06);
  --shadow-md:0 2px 4px rgba(var(--fl-shadow-rgb),0.05),0 6px 16px rgba(var(--fl-shadow-rgb),0.09);
  --duration-fast:120ms;--ease-standard:cubic-bezier(0.2,0,0,1);
  --control-height-sm:32px;--control-height-md:40px;--control-height-lg:48px;--tap-min:44px;
  --focus-ring:0 0 0 3px rgba(210,86,46,0.45);
  /* subject colors (kids) — to fold into tokens.css */
  --subj-math-bg:#f7edd7;--subj-math-fg:#8a5e0e;
  --subj-read-bg:#ece6f2;--subj-read-fg:#5b3f86;
  --subj-art-bg:#fbede6;--subj-art-fg:#a23a1c;
  --subj-eng-bg:#e6f0e8;--subj-eng-fg:#2e6b45;
  --subj-rus-bg:#e1ecf4;--subj-rus-fg:#1f5780;
}
.fl-root[data-mode="kids"]{
  --text-body:1.1875rem;--text-small:1rem;--text-caption:0.9375rem;--text-h3:1.375rem;--text-h2:1.75rem;--text-h1:2.25rem;
  --leading-body:1.75;
  --control-height-sm:40px;--control-height-md:48px;--control-height-lg:56px;--tap-min:48px;
  --radius-control:14px;--radius-card:20px;
}
*{box-sizing:border-box;margin:0;padding:0}
.fl-root{background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);-webkit-font-smoothing:antialiased;min-height:100vh}
.kidshell{max-width:900px;margin:0 auto;padding:var(--space-7) var(--space-6) var(--space-12)}

.topwrap{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-5)}
.logo{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-h3);letter-spacing:var(--tracking-snug);display:inline-flex;align-items:flex-end}
.logo .d{width:8px;height:8px;border-radius:50%;background:var(--color-accent);margin-left:5px;margin-bottom:3px}
.controls{display:flex;gap:var(--space-3);flex-wrap:wrap}
.seg{display:inline-flex;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:3px}
.seg button{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;padding:7px 15px;border-radius:var(--radius-pill);cursor:pointer;transition:all var(--duration-fast) var(--ease-standard)}
.seg button[aria-pressed="true"]{background:var(--color-accent-strong);color:var(--color-text-on-accent)}
.seg button:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.hint{font-size:var(--text-caption);color:var(--color-text-tertiary);margin-bottom:var(--space-6);max-width:640px}

.btn{font-family:var(--font-heading);font-weight:var(--weight-semibold);display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);border:1px solid transparent;border-radius:var(--radius-control);cursor:pointer;white-space:nowrap;line-height:1;transition:background var(--duration-fast) var(--ease-standard),transform var(--duration-fast) var(--ease-standard)}
.btn-md{height:var(--control-height-md);padding:0 var(--space-5);font-size:var(--text-body)}
.btn-lg{height:var(--control-height-lg);padding:0 var(--space-6);font-size:var(--text-lead)}
.btn svg{width:1.15em;height:1.15em}
.btn-primary{background:var(--color-accent-strong);color:var(--color-text-on-accent)}
.btn-primary:hover{background:var(--color-accent-hover)}
.btn-primary:active{background:var(--color-accent-pressed);transform:translateY(1px)}
.btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.badge{display:inline-flex;align-items:center;gap:var(--space-1);font-family:var(--font-heading);font-size:var(--text-caption);font-weight:var(--weight-semibold);padding:3px 10px;border-radius:var(--radius-pill);line-height:1.45;background:var(--color-surface-subtle);color:var(--color-text-secondary)}
.badge .bdot{width:6px;height:6px;border-radius:50%;background:currentColor}
.avatar{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--weight-semibold);background:var(--color-accent-subtle);color:var(--color-accent-text);flex-shrink:0}
.avatar-sm{width:32px;height:32px;font-size:var(--text-caption)}
.avatar-lg{width:52px;height:52px;font-size:var(--text-lead)}

.page-title{font-family:var(--font-heading);font-size:var(--text-h1);font-weight:var(--weight-semibold);letter-spacing:var(--tracking-snug);line-height:var(--leading-tight)}
.page-sub{font-size:var(--text-body);color:var(--color-text-secondary);margin-top:var(--space-2)}
.section-title{font-family:var(--font-heading);font-size:var(--text-h3);font-weight:var(--weight-semibold);margin:var(--space-7) 0 var(--space-4)}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-5);box-shadow:var(--shadow-sm)}

/* ===== KIDS ===== */
.subj-math{--sc-bg:var(--subj-math-bg);--sc-fg:var(--subj-math-fg)}
.subj-read{--sc-bg:var(--subj-read-bg);--sc-fg:var(--subj-read-fg)}
.subj-art{--sc-bg:var(--subj-art-bg);--sc-fg:var(--subj-art-fg)}
.subj-eng{--sc-bg:var(--subj-eng-bg);--sc-fg:var(--subj-eng-fg)}
.subj-rus{--sc-bg:var(--subj-rus-bg);--sc-fg:var(--subj-rus-fg)}

.kcard{display:flex;align-items:center;gap:var(--space-5);background:var(--sc-bg);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--space-5);margin-bottom:var(--space-4);box-shadow:var(--shadow-sm)}
.kchip{width:64px;height:64px;border-radius:var(--radius-lg);background:var(--color-surface);color:var(--sc-fg);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.kchip svg{width:34px;height:34px}
.kgrow{flex:1;min-width:0}
.kname{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-h3);color:var(--color-text)}
.kteacher{display:flex;align-items:center;gap:var(--space-2);color:var(--color-text-secondary);font-size:var(--text-small);margin-top:var(--space-2)}
.ktime{font-family:var(--font-mono);font-weight:var(--weight-semibold);color:var(--sc-fg);font-size:var(--text-lead)}
.kright{display:flex;flex-direction:column;align-items:flex-end;gap:var(--space-2)}
@media(max-width:560px){.kcard{flex-wrap:wrap}.kright{flex-direction:row;align-items:center;width:100%;justify-content:space-between}}

.khero{display:flex;align-items:center;gap:var(--space-5);background:var(--sc-bg);border:1px solid var(--color-border);border-radius:var(--radius-xl);padding:var(--space-6);box-shadow:var(--shadow-md)}
.khero .kchip{width:76px;height:76px}
.khero .kchip svg{width:42px;height:42px}
.khero .kname{font-size:var(--text-h2)}
@media(max-width:560px){.khero{flex-wrap:wrap}}

.kmotiv{display:flex;align-items:center;gap:var(--space-4);background:var(--color-accent-subtle);border:1px solid var(--color-accent-subtle-border);border-radius:var(--radius-xl);padding:var(--space-5)}
.kmotiv .mstar{width:56px;height:56px;border-radius:50%;background:var(--color-surface);color:var(--color-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.kmotiv .mstar svg{width:30px;height:30px}
.kmotiv .mt{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-lead);color:var(--color-text)}
.kmotiv .mm{font-size:var(--text-small);color:var(--color-text-secondary);margin-top:2px}

.kweek{display:flex;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-6)}
.kday{flex:1;min-width:92px;display:flex;flex-direction:column;align-items:center;gap:var(--space-1);padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-surface);cursor:pointer;transition:all var(--duration-fast) var(--ease-standard)}
.kday .dn{font-family:var(--font-heading);font-size:var(--text-small);color:var(--color-text-secondary);font-weight:var(--weight-medium)}
.kday .dd{font-family:var(--font-mono);font-size:var(--text-h3);font-weight:var(--weight-semibold)}
.kday.on{background:var(--color-accent-subtle);border-color:var(--color-accent-subtle-border);color:var(--color-accent-text)}
.kday.on .dn{color:var(--color-accent-text)}
.kday:focus-visible{outline:none;box-shadow:var(--focus-ring)}

/* ===== TEEN (compact, for contrast) ===== */
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-6)}
@media(max-width:640px){.grid-3{grid-template-columns:1fr}}
.stat .label{font-size:var(--text-small);color:var(--color-text-secondary);display:flex;align-items:center;gap:var(--space-2)}
.stat .label svg{width:16px;height:16px}
.stat .value{font-family:var(--font-mono);font-size:var(--text-h2);font-weight:var(--weight-semibold);color:var(--color-text);margin-top:var(--space-2);line-height:1}
.stat .sub{font-size:var(--text-caption);color:var(--color-text-tertiary);margin-top:var(--space-1)}
.tcard{display:flex;align-items:center;gap:var(--space-3);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-4);box-shadow:var(--shadow-sm);margin-bottom:var(--space-2)}
.tchip{width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-surface-subtle);color:var(--color-text-secondary);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.tchip svg{width:20px;height:20px}
.tgrow{flex:1;min-width:0}
.tt{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-body)}
.tm{font-size:var(--text-caption);color:var(--color-text-secondary);margin-top:1px}
.ttime{font-family:var(--font-mono);font-size:var(--text-small);color:var(--color-text-secondary);min-width:48px}
.tweek{display:flex;gap:var(--space-2);margin-bottom:var(--space-5);flex-wrap:wrap}
.twd{flex:1;min-width:64px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);cursor:pointer}
.twd .dn{font-size:var(--text-caption);color:var(--color-text-secondary)}
.twd .dd{font-family:var(--font-mono);font-size:var(--text-lead);font-weight:var(--weight-semibold)}
.twd.on{background:var(--color-accent-subtle);border-color:var(--color-accent-subtle-border);color:var(--color-accent-text)}
.reco{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-4);box-shadow:var(--shadow-sm);display:flex;gap:var(--space-3);align-items:flex-start}
.reco svg{width:20px;height:20px;color:var(--color-accent);flex-shrink:0;margin-top:2px}
.reco .rm{font-size:var(--text-small);color:var(--color-text-secondary);line-height:var(--leading-snug)}
`;

const SUBJ = {
  math: { name: 'Математика', icon: Calculator, cls: 'subj-math' },
  read: { name: 'Чтение', icon: BookOpen, cls: 'subj-read' },
  art: { name: 'Рисование', icon: Palette, cls: 'subj-art' },
  eng: { name: 'Английский', icon: Languages, cls: 'subj-eng' },
  rus: { name: 'Русский язык', icon: BookOpen, cls: 'subj-rus' },
};

const TODAY = [
  { subj: 'math', teacher: 'Иван Петрович', ti: 'ИП', time: '10:00', live: true },
  { subj: 'read', teacher: 'Мария Ивановна', ti: 'МИ', time: '11:30', live: false },
  { subj: 'art', teacher: 'Ольга Петровна', ti: 'ОП', time: '13:00', live: false },
];

function KidsDashboard() {
  const next = TODAY[0]; const S = SUBJ[next.subj]; const Icon = S.icon;
  return (
    <div>
      <div className="page-title">Привет, Петя!</div>
      <div className="page-sub">Сегодня 3 урока. Давай учиться!</div>

      <div className="section-title">Сейчас</div>
      <div className={'khero ' + S.cls}>
        <span className="kchip"><Icon /></span>
        <div className="kgrow">
          <div className="kname">{S.name}</div>
          <div className="kteacher"><span className="avatar avatar-sm">{next.ti}</span>{next.teacher}</div>
        </div>
        <div className="kright"><span className="ktime">{next.time}</span><button className="btn btn-lg btn-primary"><Video />Зайти на урок</button></div>
      </div>

      <div className="section-title">Мои уроки сегодня</div>
      {TODAY.map((l, i) => {
        const s = SUBJ[l.subj]; const I = s.icon;
        return (
          <div className={'kcard ' + s.cls} key={i}>
            <span className="kchip"><I /></span>
            <div className="kgrow"><div className="kname">{s.name}</div><div className="kteacher"><span className="avatar avatar-sm">{l.ti}</span>{l.teacher}</div></div>
            <div className="kright"><span className="ktime">{l.time}</span>{l.live ? <button className="btn btn-md btn-primary"><Video />Зайти</button> : <span className="badge">скоро</span>}</div>
          </div>
        );
      })}

      <div className="section-title">Молодец!</div>
      <div className="kmotiv">
        <span className="mstar"><Star fill="var(--color-accent)" /></span>
        <div><div className="mt">5 дней подряд ходишь на уроки!</div><div className="mm">Ещё 2 дня — и получишь значок «Спешу учиться»</div></div>
      </div>
    </div>
  );
}

function KidsSchedule() {
  const [day, setDay] = useState(0);
  const week = [['Пн', 9], ['Вт', 10], ['Ср', 11], ['Чт', 12], ['Пт', 13]];
  const byDay = {
    0: TODAY,
    1: [{ subj: 'rus', teacher: 'Мария Ивановна', ti: 'МИ', time: '10:00', live: false }, { subj: 'eng', teacher: 'Елена Сергеевна', ti: 'ЕС', time: '12:00', live: false }],
  };
  const lessons = byDay[day] || [];
  return (
    <div>
      <div className="page-title">Моё расписание</div>
      <div className="page-sub" style={{ marginBottom: 'var(--space-6)' }}>Выбери день</div>
      <div className="kweek">
        {week.map(([dn, dd], i) => <button key={i} className={'kday' + (day === i ? ' on' : '')} onClick={() => setDay(i)}><span className="dn">{dn}</span><span className="dd">{dd}</span></button>)}
      </div>
      {lessons.length === 0 ? <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 'var(--space-9)' }}>В этот день уроков нет — отдыхай!</div> : lessons.map((l, i) => {
        const s = SUBJ[l.subj]; const I = s.icon;
        return (
          <div className={'kcard ' + s.cls} key={i}>
            <span className="kchip"><I /></span>
            <div className="kgrow"><div className="kname">{s.name}</div><div className="kteacher"><span className="avatar avatar-sm">{l.ti}</span>{l.teacher}</div></div>
            <div className="kright"><span className="ktime">{l.time}</span>{l.live ? <button className="btn btn-md btn-primary"><Video />Зайти</button> : <span className="badge">{l.time}</span>}</div>
          </div>
        );
      })}
    </div>
  );
}

function TeenDashboard() {
  return (
    <div>
      <div className="page-title">Привет, Пётр</div>
      <div className="page-sub" style={{ marginBottom: 'var(--space-6)' }}>Сегодня 3 занятия и 2 задания.</div>
      <div className="grid-3">
        <div className="card stat"><div className="label"><Eye />Внимание вчера</div><div className="value">81%</div><div className="sub">лучше всего на математике</div></div>
        <div className="card stat"><div className="label"><TrendingUp />Рейтинг в 7Б</div><div className="value">#4</div><div className="sub">+2 за неделю</div></div>
        <div className="card stat"><div className="label"><BookOpen />Задания</div><div className="value">2</div><div className="sub">срок — чт</div></div>
      </div>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-overline)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-wide)', fontWeight: 600, color: 'var(--color-text-secondary)', margin: '0 0 var(--space-3)' }}>Сегодня</div>
      {TODAY.map((l, i) => { const s = SUBJ[l.subj]; const I = s.icon; return (
        <div className="tcard" key={i}>
          <span className="tchip"><I /></span>
          <span className="ttime">{l.time}</span>
          <div className="tgrow"><div className="tt">{s.name}</div><div className="tm">{l.teacher} · кабинет 7Б</div></div>
          {l.live ? <button className="btn btn-md btn-primary"><Video />Присоединиться</button> : <span className="badge">{l.time}</span>}
        </div>
      ); })}
      <div className="reco" style={{ marginTop: 'var(--space-5)' }}><Sparkles /><div className="rm">Ты сосредоточен в 8–10 утра — ставь сложные предметы на это время. На видео твоё внимание 92% против 64% на тексте.</div></div>
    </div>
  );
}

function TeenSchedule() {
  const [day, setDay] = useState(0);
  const week = [['Пн', 9], ['Вт', 10], ['Ср', 11], ['Чт', 12], ['Пт', 13], ['Сб', 14], ['Вс', 15]];
  const byDay = { 0: TODAY, 1: [{ subj: 'rus', teacher: 'Мария Ивановна', time: '10:00', live: false }, { subj: 'eng', teacher: 'Елена Сергеевна', time: '12:00', live: false }] };
  const lessons = byDay[day] || [];
  return (
    <div>
      <div className="page-title">Расписание</div>
      <div className="page-sub" style={{ marginBottom: 'var(--space-5)' }}>Неделя</div>
      <div className="tweek">{week.map(([dn, dd], i) => <button key={i} className={'twd' + (day === i ? ' on' : '')} onClick={() => setDay(i)}><span className="dn">{dn}</span><span className="dd">{dd}</span></button>)}</div>
      {lessons.length === 0 ? <div className="card" style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: 'var(--space-8)' }}>Занятий нет</div> : lessons.map((l, i) => { const s = SUBJ[l.subj]; const I = s.icon; return (
        <div className="tcard" key={i}>
          <span className="ttime">{l.time}</span>
          <span className="tchip"><I /></span>
          <div className="tgrow"><div className="tt">{s.name}</div><div className="tm">{l.teacher} · кабинет 7Б</div></div>
          {l.live ? <button className="btn btn-md btn-primary"><Video />Присоединиться</button> : <span className="badge">{l.time}</span>}
        </div>
      ); })}
    </div>
  );
}

export default function JuniorPrototype() {
  const [mode, setMode] = useState('kids');
  const [screen, setScreen] = useState('dashboard');
  const kids = mode === 'kids';
  return (
    <div className="fl-root" data-mode={kids ? 'kids' : undefined}>
      <style>{css}</style>
      <div className="kidshell">
        <div className="topwrap">
          <span className="logo">flamingo<span className="d" /></span>
          <div className="controls">
            <div className="seg">
              <button aria-pressed={kids} onClick={() => setMode('kids')}>Младшие классы</button>
              <button aria-pressed={!kids} onClick={() => setMode('teen')}>Подросток</button>
            </div>
            <div className="seg">
              <button aria-pressed={screen === 'dashboard'} onClick={() => setScreen('dashboard')}>Дашборд</button>
              <button aria-pressed={screen === 'schedule'} onClick={() => setScreen('schedule')}>Расписание</button>
            </div>
          </div>
        </div>
        <p className="hint">Тот же экран в двух режимах. Младшим: крупнее и просторнее (токены), цветовая кодировка предметов, аватар учителя, дружелюбные короткие подписи, меньше элементов. Подростку: компактнее, нейтральные иконки, статистика и рекомендации, больше данных.</p>

        {screen === 'dashboard' ? (kids ? <KidsDashboard /> : <TeenDashboard />) : (kids ? <KidsSchedule /> : <TeenSchedule />)}
      </div>
    </div>
  );
}
