import React, { useState } from 'react';
import {
  LayoutDashboard, BarChart3, Bell, Settings, Sun, Moon, Calendar, Star, Eye, CheckCircle2,
  TrendingUp, ChevronRight, ArrowLeft, ShieldCheck, AlertTriangle, Lightbulb, ChevronDown,
  Calculator, Info, Search
} from 'lucide-react';

const css = `
.fl-root{
  --fl-white:#fff;
  --fl-warm-50:#fbf8f2;--fl-warm-100:#f4efe6;--fl-warm-150:#ede7db;--fl-warm-200:#e0d8ca;--fl-warm-300:#cfc3b0;
  --fl-warm-400:#a99d87;--fl-warm-500:#8b7f69;--fl-warm-600:#6e6456;--fl-warm-700:#4e473e;--fl-warm-800:#34302a;--fl-warm-900:#2a2520;
  --fl-coral-50:#fbede6;--fl-coral-100:#f6d8c8;--fl-coral-500:#d2562e;--fl-coral-600:#be4622;--fl-coral-700:#a23a1c;--fl-coral-800:#8a3017;
  --fl-success-500:#3f8f5f;--fl-success-700:#2e6b45;--fl-success-50:#e6f0e8;
  --fl-warning-500:#c8881c;--fl-warning-700:#8a5e0e;--fl-warning-50:#f7edd7;
  --fl-error-500:#c8392b;--fl-error-700:#a52a20;--fl-error-50:#f8e3df;
  --fl-info-500:#2f74a8;--fl-info-700:#1f5780;--fl-info-50:#e1ecf4;
  --fl-dark-bg:#232019;--fl-dark-surface:#2c2820;--fl-dark-surface-2:#353027;--fl-dark-border:#3a352c;--fl-dark-text:#f1ebdf;--fl-dark-text-2:#cabfa9;
  --fl-shadow-rgb:42,37,32;
  --color-bg:var(--fl-warm-100);--color-surface:var(--fl-warm-50);--color-surface-subtle:var(--fl-warm-150);--color-surface-hover:var(--fl-warm-150);
  --color-border:var(--fl-warm-200);--color-border-strong:var(--fl-warm-300);
  --color-text:var(--fl-warm-900);--color-text-secondary:var(--fl-warm-600);--color-text-tertiary:var(--fl-warm-500);--color-text-on-accent:var(--fl-white);
  --color-accent:var(--fl-coral-500);--color-accent-strong:var(--fl-coral-600);--color-accent-hover:var(--fl-coral-700);--color-accent-pressed:var(--fl-coral-800);
  --color-accent-text:var(--fl-coral-700);--color-accent-subtle:var(--fl-coral-50);--color-accent-subtle-border:var(--fl-coral-100);
  --color-success:var(--fl-success-500);--color-success-text:var(--fl-success-700);--color-success-bg:var(--fl-success-50);
  --color-warning:var(--fl-warning-500);--color-warning-text:var(--fl-warning-700);--color-warning-bg:var(--fl-warning-50);
  --color-error:var(--fl-error-500);--color-error-text:var(--fl-error-700);--color-error-bg:var(--fl-error-50);
  --color-info:var(--fl-info-500);--color-info-text:var(--fl-info-700);--color-info-bg:var(--fl-info-50);
  --font-heading:'IBM Plex Sans',system-ui,sans-serif;--font-body:'Golos Text','IBM Plex Sans',system-ui,sans-serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --weight-medium:500;--weight-semibold:600;
  --text-h1:2rem;--text-h2:1.625rem;--text-h3:1.25rem;--text-lead:1.125rem;--text-body:1rem;--text-small:0.875rem;--text-caption:0.8125rem;--text-overline:0.75rem;
  --leading-tight:1.1;--leading-snug:1.4;--leading-body:1.6;--tracking-wide:0.06em;--tracking-snug:-0.01em;
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-7:32px;--space-8:40px;--space-9:48px;
  --radius-sm:8px;--radius-md:12px;--radius-lg:16px;--radius-pill:999px;--radius-control:10px;--radius-card:16px;
  --shadow-sm:0 1px 2px rgba(var(--fl-shadow-rgb),0.05),0 2px 6px rgba(var(--fl-shadow-rgb),0.06);
  --shadow-md:0 2px 4px rgba(var(--fl-shadow-rgb),0.05),0 6px 16px rgba(var(--fl-shadow-rgb),0.09);
  --duration-fast:120ms;--ease-standard:cubic-bezier(0.2,0,0,1);
  --control-height-sm:32px;--control-height-md:40px;--control-height-lg:48px;--tap-min:44px;
  --focus-ring:0 0 0 3px rgba(210,86,46,0.45);
}
.fl-root[data-theme="dark"]{
  --color-bg:var(--fl-dark-bg);--color-surface:var(--fl-dark-surface);--color-surface-subtle:var(--fl-dark-surface-2);--color-surface-hover:var(--fl-dark-surface-2);
  --color-border:var(--fl-dark-border);--color-border-strong:#4a4438;
  --color-text:var(--fl-dark-text);--color-text-secondary:var(--fl-dark-text-2);--color-text-tertiary:#9a8f79;
  --color-accent-text:var(--fl-coral-400);--color-accent-subtle:#3a241b;--color-accent-subtle-border:#5a3018;
  --color-success-bg:#1e3328;--color-warning-bg:#322a14;--color-error-bg:#3a201c;--color-info-bg:#1c2f3f;
  --shadow-sm:0 2px 6px rgba(0,0,0,0.45);--shadow-md:0 6px 16px rgba(0,0,0,0.5);
  --focus-ring:0 0 0 3px rgba(232,121,79,0.5);
}
*{box-sizing:border-box;margin:0;padding:0}
.fl-root{background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);-webkit-font-smoothing:antialiased;min-height:100vh}

.shell{display:flex;min-height:100vh}
.sidebar{width:240px;flex-shrink:0;border-right:1px solid var(--color-border);background:var(--color-surface);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-1)}
.side-logo{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-h3);letter-spacing:var(--tracking-snug);display:inline-flex;align-items:flex-end;padding:var(--space-3);margin-bottom:var(--space-3)}
.side-logo .d{width:8px;height:8px;border-radius:50%;background:var(--color-accent);margin-left:5px;margin-bottom:3px}
.nav-item{display:flex;align-items:center;gap:var(--space-3);width:100%;text-align:left;font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;padding:var(--space-3);border-radius:var(--radius-sm);cursor:pointer;min-height:var(--tap-min);transition:background var(--duration-fast),color var(--duration-fast)}
.nav-item svg{width:20px;height:20px;flex-shrink:0}
.nav-item:hover{background:var(--color-surface-hover);color:var(--color-text)}
.nav-item.is-active{background:var(--color-accent-subtle);color:var(--color-accent-text)}
.nav-item:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.nav-sep{flex:1}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.topbar{height:64px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:var(--space-3);padding:0 var(--space-6);background:var(--color-surface)}
.top-actions{margin-left:auto;display:flex;align-items:center;gap:var(--space-2)}
.content{padding:var(--space-7) var(--space-6);max-width:1000px;width:100%;margin:0 auto;flex:1}
@media(max-width:860px){.sidebar{display:none}}

.iconbtn{width:var(--tap-min);height:var(--tap-min);min-width:var(--tap-min);display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);border:0;background:transparent;color:var(--color-text-secondary);cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast)}
.iconbtn:hover{background:var(--color-surface-hover);color:var(--color-text)}
.iconbtn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.iconbtn svg{width:18px;height:18px}
.btn{font-family:var(--font-heading);font-weight:var(--weight-semibold);display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);border:1px solid transparent;border-radius:var(--radius-control);cursor:pointer;white-space:nowrap;line-height:1;transition:background var(--duration-fast),transform var(--duration-fast)}
.btn-sm{height:var(--control-height-sm);padding:0 var(--space-3);font-size:var(--text-small)}
.btn-md{height:var(--control-height-md);padding:0 var(--space-5);font-size:var(--text-body)}
.btn-primary{background:var(--color-accent-strong);color:var(--color-text-on-accent)}.btn-primary:hover{background:var(--color-accent-hover)}
.btn-secondary{background:var(--color-surface);color:var(--color-text);border-color:var(--color-border-strong)}.btn-secondary:hover{background:var(--color-surface-hover)}
.btn-ghost{background:transparent;color:var(--color-accent-text)}.btn-ghost:hover{background:var(--color-accent-subtle)}
.btn svg{width:1.15em;height:1.15em}.btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.avatar{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--weight-semibold);background:var(--color-accent-subtle);color:var(--color-accent-text);flex-shrink:0}
.avatar-sm{width:32px;height:32px;font-size:var(--text-caption)}.avatar-md{width:40px;height:40px;font-size:var(--text-small)}
.badge{display:inline-flex;align-items:center;gap:var(--space-1);font-family:var(--font-heading);font-size:var(--text-caption);font-weight:var(--weight-semibold);padding:3px 10px;border-radius:var(--radius-pill);line-height:1.45}
.badge .bdot{width:6px;height:6px;border-radius:50%;background:currentColor}
.badge-success{background:var(--color-success-bg);color:var(--color-success-text)}.badge-warning{background:var(--color-warning-bg);color:var(--color-warning-text)}
.badge-info{background:var(--color-info-bg);color:var(--color-info-text)}.badge-neutral{background:var(--color-surface-subtle);color:var(--color-text-secondary)}
.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}

.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-6);flex-wrap:wrap}
.page-title{font-family:var(--font-heading);font-size:var(--text-h1);font-weight:var(--weight-semibold);letter-spacing:var(--tracking-snug);line-height:var(--leading-tight)}
.page-sub{font-size:var(--text-body);color:var(--color-text-secondary);margin-top:var(--space-2)}
.back{display:inline-flex;align-items:center;gap:var(--space-2);background:transparent;border:0;color:var(--color-text-secondary);font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);cursor:pointer;margin-bottom:var(--space-4)}
.back:hover{color:var(--color-text)}.back svg{width:16px;height:16px}

/* child selector */
.childsel{position:relative}
.childsel-btn{display:flex;align-items:center;gap:var(--space-3);background:var(--color-surface);border:1px solid var(--color-border-strong);border-radius:var(--radius-pill);padding:5px 14px 5px 6px;cursor:pointer}
.childsel-btn .nm{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-small);color:var(--color-text)}
.childsel-btn .gr{font-size:var(--text-caption);color:var(--color-text-secondary)}
.childsel-btn svg{width:16px;height:16px;color:var(--color-text-secondary)}
.childsel-btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.childsel-menu{position:absolute;top:calc(100% + 6px);left:0;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);box-shadow:var(--shadow-md);padding:var(--space-2);min-width:220px;z-index:50}
.childsel-item{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-radius:var(--radius-sm);cursor:pointer;width:100%;border:0;background:transparent;text-align:left;font-family:var(--font-body)}
.childsel-item:hover{background:var(--color-surface-hover)}
.childsel-item .nm{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-small);color:var(--color-text)}
.childsel-item .gr{font-size:var(--text-caption);color:var(--color-text-secondary)}

/* cards */
.sgrid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}
@media(max-width:720px){.sgrid{grid-template-columns:1fr}}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-5);box-shadow:var(--shadow-sm)}
.scard-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-4)}
.scard-h .l{display:flex;align-items:center;gap:var(--space-3)}
.scard-h .l .ic{width:36px;height:36px;border-radius:var(--radius-sm);background:var(--color-accent-subtle);color:var(--color-accent-text);display:flex;align-items:center;justify-content:center}
.scard-h .l .ic svg{width:18px;height:18px}
.scard-h .l .tt{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-body)}
.link{display:inline-flex;align-items:center;gap:var(--space-1);background:transparent;border:0;color:var(--color-accent-text);font-family:var(--font-heading);font-weight:var(--weight-medium);font-size:var(--text-small);cursor:pointer}
.link svg{width:16px;height:16px}
.row{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)}
.row:last-child{border-bottom:0}
.row .nm{font-size:var(--text-body)}
.row .meta{font-size:var(--text-caption);color:var(--color-text-tertiary)}
.big-pct{font-family:var(--font-mono);font-size:2.25rem;font-weight:var(--weight-semibold);line-height:1}
.dots{display:flex;gap:var(--space-2);margin-top:var(--space-4)}
.dot{width:34px;height:34px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-size:var(--text-caption);font-weight:var(--weight-semibold)}
.dot.present{background:var(--color-success-bg);color:var(--color-success-text)}
.dot.absent{background:var(--color-error-bg);color:var(--color-error-text)}
.stars{display:inline-flex;gap:2px}.stars svg{width:16px;height:16px;color:var(--color-warning)}

/* charts */
.bar-row{display:grid;grid-template-columns:128px 1fr 46px;gap:var(--space-3);align-items:center;margin-bottom:var(--space-3)}
@media(max-width:520px){.bar-row{grid-template-columns:96px 1fr 42px}}
.bar-label{font-size:var(--text-small);color:var(--color-text)}
.bar-track{height:12px;background:var(--color-surface-subtle);border-radius:var(--radius-pill);overflow:hidden}
.bar-track>i{display:block;height:100%;background:var(--color-accent-strong);border-radius:var(--radius-pill)}
.bar-track>i.low{background:var(--color-warning)}
.bar-val{font-family:var(--font-mono);font-size:var(--text-small);color:var(--color-text-secondary);text-align:right}

/* insights / recs / notif */
.insight{display:flex;gap:var(--space-3);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);font-size:var(--text-body);line-height:var(--leading-body);color:var(--color-text)}
.insight svg{width:20px;height:20px;flex-shrink:0;margin-top:2px}
.insight.good{background:var(--color-success-bg)}.insight.good svg{color:var(--color-success)}
.insight.watch{background:var(--color-warning-bg)}.insight.watch svg{color:var(--color-warning)}
.insight + .insight{margin-top:var(--space-3)}
.rec{display:flex;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)}
.rec:last-child{border-bottom:0}.rec svg{width:20px;height:20px;color:var(--color-accent);flex-shrink:0;margin-top:2px}.rec .rt{font-size:var(--text-body);line-height:var(--leading-snug)}
.notif{display:flex;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)}
.notif:last-child{border-bottom:0}
.notif .ni{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.notif .ni svg{width:17px;height:17px}
.notif.success .ni{background:var(--color-success-bg);color:var(--color-success-text)}
.notif.info .ni{background:var(--color-info-bg);color:var(--color-info-text)}
.notif.warning .ni{background:var(--color-warning-bg);color:var(--color-warning-text)}
.notif .grow{flex:1}.notif .nt{font-size:var(--text-small);color:var(--color-text)}.notif .nw{font-size:var(--text-caption);color:var(--color-text-tertiary);margin-top:1px}
.privacy-card{display:flex;align-items:center;gap:var(--space-3);font-size:var(--text-small);color:var(--color-text-secondary)}
.privacy-card svg{width:20px;height:20px;color:var(--color-success);flex-shrink:0}
.card-h{font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-text-secondary);margin-bottom:var(--space-4)}
.stack-5 > * + *{margin-top:var(--space-5)}
.hero-attn{display:flex;align-items:center;gap:var(--space-6);flex-wrap:wrap}
`;

const CH = [
  {
    id: 'petya', name: 'Пётр', short: 'Петя', grade: '7Б', initials: 'ПС', avgCmf: 74, attendance: 96,
    grades: [{ s: 'Алгебра', g: 5, d: 'пт' }, { s: 'Английский', g: 5, d: 'вт' }, { s: 'Русский', g: 4, d: 'чт' }, { s: 'История', g: 4, d: 'ср' }],
    today: [{ s: 'Алгебра', t: '10:00' }, { s: 'Английский', t: '12:30' }, { s: 'История', t: '15:00' }],
    week: [78, 82, 80, 68, 74], att: [1, 1, 1, 0, 1],
    subjects: [{ n: 'Математика', v: 88 }, { n: 'Английский', v: 79 }, { n: 'Русский', v: 75 }, { n: 'Биология', v: 70 }, { n: 'История', v: 61 }],
    insights: [
      { k: 'good', t: 'Лучше всего Петя сосредоточен на математике — 88% против 74% в среднем.' },
      { k: 'watch', t: 'На истории внимание ниже (61%). Возможно, тема даётся тяжелее или занятие в неудачное время.' },
    ],
    recs: ['Сложные предметы лучше ставить на утро — внимание выше в первой половине дня.', 'По истории стоит поддержать: разобрать тему вместе или попросить преподавателя делать короткие перерывы.'],
    notif: [{ k: 'success', t: 'Петя получил 5 за ДЗ по алгебре', w: 'сегодня, 10:05' }, { k: 'info', t: 'Новое занятие: Английский, завтра 12:30', w: 'вчера' }, { k: 'warning', t: 'Пропущено занятие по истории', w: '2 дня назад' }],
  },
  {
    id: 'sonya', name: 'Софья', short: 'Соня', grade: '3А', initials: 'СС', avgCmf: 83, attendance: 100,
    grades: [{ s: 'Чтение', g: 5, d: 'пт' }, { s: 'Математика', g: 5, d: 'чт' }, { s: 'Рисование', g: 5, d: 'ср' }],
    today: [{ s: 'Математика', t: '09:00' }, { s: 'Чтение', t: '10:30' }],
    week: [85, 84, 86, 82, 80], att: [1, 1, 1, 1, 1],
    subjects: [{ n: 'Рисование', v: 90 }, { n: 'Чтение', v: 88 }, { n: 'Математика', v: 86 }, { n: 'Русский', v: 84 }],
    insights: [{ k: 'good', t: 'Соня отлично концентрируется на рисовании и чтении — выше 88%.' }, { k: 'good', t: 'Внимание стабильно высокое всю неделю, спадов почти нет.' }],
    recs: ['Поддерживайте интерес к творческим предметам — они даются особенно легко.', 'Есть запас внимания: можно мягко добавить задач по русскому.'],
    notif: [{ k: 'success', t: 'Соня получила 5 за чтение', w: 'сегодня' }, { k: 'success', t: '100% посещаемости за неделю', w: 'вчера' }],
  },
];
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
const NICON = { success: CheckCircle2, info: Info, warning: AlertTriangle };

function Spark({ data }) {
  const W = 200, H = 48, P = 3, n = data.length;
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => (H - P) - (v / 100) * (H - 2 * P);
  const line = data.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const area = line + ' L ' + x(n - 1).toFixed(1) + ' ' + H + ' L ' + x(0).toFixed(1) + ' ' + H + ' Z';
  return <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height="48" preserveAspectRatio="none"><path d={area} fill="var(--color-accent-subtle)" /><path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

function DayArea({ data }) {
  const W = 520, H = 150, P = 26, n = data.length;
  const avg = Math.round(data.reduce((a, b) => a + b, 0) / n);
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => (H - P) - (v / 100) * (H - 2 * P);
  const line = data.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const area = line + ' L ' + x(n - 1).toFixed(1) + ' ' + (H - P) + ' L ' + x(0).toFixed(1) + ' ' + (H - P) + ' Z';
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height="auto">
      <line x1={P} y1={y(avg)} x2={W - P} y2={y(avg)} stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - P} y={y(avg) - 6} textAnchor="end" fontSize="11" fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">среднее {avg}%</text>
      <path d={area} fill="var(--color-accent-subtle)" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="var(--color-accent)" />)}
      {DAYS.map((d, i) => <text key={d} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">{d}</text>)}
    </svg>
  );
}

function Stars({ n }) { return <span className="stars">{[1, 2, 3, 4, 5].map((i) => <Star key={i} fill={i <= n ? 'var(--color-warning)' : 'none'} />)}</span>; }

function ChildSelect({ child, setChild }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="childsel">
      <button className="childsel-btn" onClick={() => setOpen(!open)}>
        <span className="avatar avatar-sm">{child.initials}</span>
        <span><span className="nm">{child.short}</span> <span className="gr">{child.grade}</span></span>
        <ChevronDown />
      </button>
      {open && (
        <div className="childsel-menu">
          {CH.map((c) => (
            <button key={c.id} className="childsel-item" onClick={() => { setChild(c); setOpen(false); }}>
              <span className="avatar avatar-sm">{c.initials}</span>
              <span><span className="nm">{c.name}</span> · <span className="gr">{c.grade}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Overview({ c, go }) {
  const avgGrade = (c.grades.reduce((a, g) => a + g.g, 0) / c.grades.length).toFixed(1);
  return (
    <div className="content">
      <div className="page-head">
        <div><div className="page-title">Обзор · {c.short}</div><div className="page-sub">{c.grade} · как дела у ребёнка на этой неделе</div></div>
      </div>

      <div className="sgrid stack-5">
        <div className="card">
          <div className="scard-h"><div className="l"><span className="ic"><Calendar /></span><span className="tt">Расписание сегодня</span></div></div>
          {c.today.map((l, i) => <div className="row" key={i}><span className="nm">{l.s}</span><span className="num meta">{l.t}</span></div>)}
        </div>

        <div className="card">
          <div className="scard-h"><div className="l"><span className="ic"><Star /></span><span className="tt">Последние оценки</span></div><span className="badge badge-neutral">средняя <span className="num" style={{ marginLeft: 4 }}>{avgGrade}</span></span></div>
          {c.grades.map((g, i) => <div className="row" key={i}><span className="nm">{g.s}</span><span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}><Stars n={g.g} /><span className="meta">{g.d}</span></span></div>)}
        </div>

        <div className="card">
          <div className="scard-h"><div className="l"><span className="ic"><CheckCircle2 /></span><span className="tt">Посещаемость</span></div></div>
          <div className="big-pct" style={{ color: 'var(--color-success-text)' }}><span className="num">{c.attendance}%</span></div>
          <div className="dots">{DAYS.map((d, i) => <span key={d} className={'dot ' + (c.att[i] ? 'present' : 'absent')}>{d}</span>)}</div>
        </div>

        <div className="card">
          <div className="scard-h"><div className="l"><span className="ic"><Eye /></span><span className="tt">Внимание (CMF)</span></div><button className="link" onClick={() => go('analysis')}>Подробнее<ChevronRight /></button></div>
          <div className="hero-attn">
            <div className="big-pct" style={{ color: 'var(--color-accent-text)' }}><span className="num">{c.avgCmf}%</span></div>
            <div style={{ flex: 1, minWidth: 140 }}><Spark data={c.week} /></div>
          </div>
          <div className="meta" style={{ marginTop: 'var(--space-3)' }}>среднее за неделю · {c.insights[0].k === 'good' ? 'сильная сторона — ' + c.subjects[0].n.toLowerCase() : ''}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <div className="scard-h"><div className="l"><span className="ic"><Bell /></span><span className="tt">Уведомления</span></div><button className="link" onClick={() => go('notifications')}>Все<ChevronRight /></button></div>
        {c.notif.map((nf, i) => { const NI = NICON[nf.k]; return (
          <div className={'notif ' + nf.k} key={i}><span className="ni"><NI /></span><div className="grow"><div className="nt">{nf.t}</div><div className="nw">{nf.w}</div></div></div>
        ); })}
      </div>
    </div>
  );
}

function Analysis({ c, go }) {
  const avgWeek = Math.round(c.week.reduce((a, b) => a + b, 0) / c.week.length);
  return (
    <div className="content stack-5">
      <button className="back" onClick={() => go('overview')}><ArrowLeft />К обзору</button>
      <div className="page-head"><div><div className="page-title">Анализ внимания · {c.short}</div><div className="page-sub">{c.grade} · по предметам и дням недели</div></div></div>

      <div className="card">
        <div className="hero-attn">
          <div><div className="card-h" style={{ marginBottom: 'var(--space-2)' }}>Среднее за неделю</div><div className="big-pct" style={{ color: 'var(--color-accent-text)', fontSize: '3rem' }}><span className="num">{c.avgCmf}%</span></div></div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <span className="badge badge-success" ><span className="bdot" />посещаемость {c.attendance}%</span>
              <span className="badge badge-neutral">сильнее всего · {c.subjects[0].n.toLowerCase()}</span>
            </div>
            <div className="dots" style={{ marginTop: 0 }}>{DAYS.map((d, i) => <span key={d} className={'dot ' + (c.att[i] ? 'present' : 'absent')}>{d}</span>)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Внимание по предметам</div>
        {c.subjects.map((s, i) => (
          <div className="bar-row" key={i}>
            <span className="bar-label">{s.n}</span>
            <div className="bar-track"><i className={s.v < 65 ? 'low' : ''} style={{ width: s.v + '%' }} /></div>
            <span className="bar-val">{s.v}%</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-h">Внимание по дням недели</div>
        <DayArea data={c.week} />
      </div>

      <div>
        <div className="card-h">Что мы заметили</div>
        {c.insights.map((ins, i) => { const I = ins.k === 'good' ? TrendingUp : AlertTriangle; return (
          <div className={'insight ' + ins.k} key={i}><I />{ins.t}</div>
        ); })}
      </div>

      <div className="card">
        <div className="card-h">Как помочь</div>
        {c.recs.map((r, i) => <div className="rec" key={i}><Lightbulb /><span className="rt">{r}</span></div>)}
      </div>

      <div className="card privacy-card">
        <ShieldCheck />Анализ построен на обезличенных метриках внимания. Видео с камеры ребёнка остаётся на его устройстве и никуда не передаётся.
      </div>
    </div>
  );
}

function Notifications({ c, go }) {
  return (
    <div className="content">
      <button className="back" onClick={() => go('overview')}><ArrowLeft />К обзору</button>
      <div className="page-head"><div><div className="page-title">Уведомления</div><div className="page-sub">События по ребёнку · {c.short}</div></div></div>
      <div className="card">
        {c.notif.map((nf, i) => { const NI = NICON[nf.k]; return (
          <div className={'notif ' + nf.k} key={i}><span className="ni"><NI /></span><div className="grow"><div className="nt">{nf.t}</div><div className="nw">{nf.w}</div></div></div>
        ); })}
      </div>
      <p className="page-sub" style={{ fontSize: 'var(--text-caption)' }}>Настроить каналы (push, email) и типы событий можно в разделе настроек уведомлений.</p>
    </div>
  );
}

export default function ParentPrototype() {
  const [theme, setTheme] = useState('light');
  const [screen, setScreen] = useState('overview');
  const [child, setChild] = useState(CH[0]);
  const items = [['overview', LayoutDashboard, 'Обзор ребёнка'], ['analysis', BarChart3, 'Анализ'], ['notifications', Bell, 'Уведомления']];
  return (
    <div className="fl-root" data-theme={theme === 'dark' ? 'dark' : undefined}>
      <style>{css}</style>
      <div className="shell">
        <aside className="sidebar">
          <span className="side-logo">flamingo<span className="d" /></span>
          {items.map(([k, Icon, l]) => <button key={k} className={'nav-item' + (screen === k ? ' is-active' : '')} onClick={() => setScreen(k)}><Icon />{l}</button>)}
          <div className="nav-sep" />
          <button className="nav-item"><Settings />Настройки</button>
        </aside>
        <div className="main">
          <div className="topbar">
            <ChildSelect child={child} setChild={setChild} />
            <div className="top-actions">
              <button className="iconbtn" aria-label="Тема" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
              <button className="iconbtn" aria-label="Уведомления" onClick={() => setScreen('notifications')}><Bell /></button>
              <span className="avatar avatar-md">РО</span>
            </div>
          </div>
          {screen === 'overview' && <Overview c={child} go={setScreen} />}
          {screen === 'analysis' && <Analysis c={child} go={setScreen} />}
          {screen === 'notifications' && <Notifications c={child} go={setScreen} />}
        </div>
      </div>
    </div>
  );
}
