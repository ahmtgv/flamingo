import React, { useState, useEffect } from 'react';
import {
  Video, VideoOff, Mic, MicOff, ShieldCheck, Check, ArrowLeft, ChevronRight, PhoneOff,
  Eye, Send, CheckCircle2, Star, Calculator, FileText, Bell, RefreshCw, Sun, Moon, Play,
  Hand, MessageSquare, Info, User, Users
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
  --fl-shadow-rgb:42,37,32;--fl-video-bg:#1b1812;--fl-video-text:#f1ebdf;
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
  --duration-fast:120ms;--duration-base:200ms;--ease-standard:cubic-bezier(0.2,0,0,1);--ease-out:cubic-bezier(0,0,0,1);
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
.wrap{max-width:880px;margin:0 auto;padding:var(--space-7) var(--space-6) var(--space-12)}

.topwrap{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-5)}
.logo{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-h3);letter-spacing:var(--tracking-snug);display:inline-flex;align-items:flex-end}
.logo .d{width:8px;height:8px;border-radius:50%;background:var(--color-accent);margin-left:5px;margin-bottom:3px}
.controls{display:flex;align-items:center;gap:var(--space-3);flex-wrap:wrap}
.seg{display:inline-flex;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:3px}
.seg button{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;padding:7px 15px;border-radius:var(--radius-pill);cursor:pointer;transition:all var(--duration-fast)}
.seg button[aria-pressed="true"]{background:var(--color-accent-strong);color:var(--color-text-on-accent)}
.seg button:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.iconbtn{width:var(--tap-min);height:var(--tap-min);min-width:var(--tap-min);display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);border:0;background:transparent;color:var(--color-text-secondary);cursor:pointer}
.iconbtn:hover{background:var(--color-surface-hover);color:var(--color-text)}.iconbtn:focus-visible{outline:none;box-shadow:var(--focus-ring)}.iconbtn svg{width:18px;height:18px}

.flow-name{font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-accent-text);margin-bottom:var(--space-2)}
.stepper{display:flex;align-items:center;margin-bottom:var(--space-7);flex-wrap:wrap;gap:var(--space-2)}
.step{display:flex;align-items:center;gap:var(--space-2);cursor:pointer;background:transparent;border:0;padding:0}
.step .num{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:600;font-size:var(--text-small);background:var(--color-surface-subtle);color:var(--color-text-secondary);border:1px solid var(--color-border);transition:all var(--duration-fast)}
.step .num svg{width:16px;height:16px}
.step.active .num{background:var(--color-accent-strong);color:var(--color-text-on-accent);border-color:var(--color-accent-strong)}
.step.done .num{background:var(--color-accent-subtle);color:var(--color-accent-text);border-color:var(--color-accent-subtle-border)}
.step .lbl{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary)}
.step.active .lbl{color:var(--color-text)}
.step-line{flex:1;height:2px;background:var(--color-border);margin:0 var(--space-2);min-width:14px;border-radius:2px}
@media(max-width:680px){.step .lbl{display:none}.step-line{min-width:8px}}

.btn{font-family:var(--font-heading);font-weight:var(--weight-semibold);display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);border:1px solid transparent;border-radius:var(--radius-control);cursor:pointer;white-space:nowrap;line-height:1;transition:background var(--duration-fast),transform var(--duration-fast)}
.btn-sm{height:var(--control-height-sm);padding:0 var(--space-3);font-size:var(--text-small)}
.btn-md{height:var(--control-height-md);padding:0 var(--space-5);font-size:var(--text-body)}
.btn-lg{height:var(--control-height-lg);padding:0 var(--space-6);font-size:var(--text-lead)}
.btn svg{width:1.15em;height:1.15em}
.btn-primary{background:var(--color-accent-strong);color:var(--color-text-on-accent)}.btn-primary:hover{background:var(--color-accent-hover)}.btn-primary:active{background:var(--color-accent-pressed);transform:translateY(1px)}
.btn-secondary{background:var(--color-surface);color:var(--color-text);border-color:var(--color-border-strong)}.btn-secondary:hover{background:var(--color-surface-hover)}
.btn-ghost{background:transparent;color:var(--color-accent-text)}.btn-ghost:hover{background:var(--color-accent-subtle)}
.btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.btn:disabled{background:var(--color-surface-subtle);color:var(--color-text-disabled);border-color:var(--color-border);cursor:not-allowed;transform:none}
.badge{display:inline-flex;align-items:center;gap:var(--space-1);font-family:var(--font-heading);font-size:var(--text-caption);font-weight:var(--weight-semibold);padding:3px 10px;border-radius:var(--radius-pill);line-height:1.45}
.badge .bdot{width:6px;height:6px;border-radius:50%;background:currentColor}
.badge-success{background:var(--color-success-bg);color:var(--color-success-text)}.badge-warning{background:var(--color-warning-bg);color:var(--color-warning-text)}
.badge-info{background:var(--color-info-bg);color:var(--color-info-text)}.badge-neutral{background:var(--color-surface-subtle);color:var(--color-text-secondary)}.badge-accent{background:var(--color-accent-subtle);color:var(--color-accent-text)}
.avatar{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--weight-semibold);background:var(--color-accent-subtle);color:var(--color-accent-text);flex-shrink:0}
.avatar-sm{width:32px;height:32px;font-size:var(--text-caption)}
.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}

.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-6);box-shadow:var(--shadow-sm)}
.card-h{font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-text-secondary);margin-bottom:var(--space-4)}
.h2{font-family:var(--font-heading);font-size:var(--text-h2);font-weight:var(--weight-semibold);letter-spacing:var(--tracking-snug)}
.sub{font-size:var(--text-body);color:var(--color-text-secondary);margin-top:var(--space-2)}
.icon-chip{width:44px;height:44px;border-radius:var(--radius-md);background:var(--color-surface);color:var(--color-accent-text);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.icon-chip svg{width:22px;height:22px}
.privacy{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--text-caption);color:var(--color-text-secondary)}
.privacy svg{width:15px;height:15px;color:var(--color-success)}
.actions{display:flex;justify-content:space-between;gap:var(--space-3);margin-top:var(--space-6);flex-wrap:wrap}
.stack-5 > * + *{margin-top:var(--space-5)}

/* hero card */
.hero{display:flex;align-items:center;gap:var(--space-5);background:var(--color-accent-subtle);border:1px solid var(--color-accent-subtle-border);border-radius:var(--radius-lg);padding:var(--space-6)}
.hero .grow{flex:1;min-width:180px}
.hero .ht{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-lead)}
.hero .hm{color:var(--color-text-secondary);font-size:var(--text-small);margin-top:var(--space-1)}
@media(max-width:560px){.hero{flex-wrap:wrap}}

/* prejoin */
.previd{background:var(--fl-video-bg);color:var(--fl-video-text);border-radius:var(--radius-lg);min-height:200px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-3);position:relative}
.previd .ava{width:72px;height:72px;border-radius:50%;background:#3a342a;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600;font-size:var(--text-h3)}
.previd .pp{position:absolute;bottom:var(--space-3);right:var(--space-3);font-size:11px}
.previd .pp svg{color:#7bd1a0}
.calib{margin-top:var(--space-5)}
.calib .ct{display:flex;align-items:center;justify-content:space-between;font-size:var(--text-small);color:var(--color-text-secondary);margin-bottom:var(--space-2)}
.cbar{height:8px;background:var(--color-surface-subtle);border-radius:var(--radius-pill);overflow:hidden}
.cbar>i{display:block;height:100%;background:var(--color-accent-strong);border-radius:var(--radius-pill);transition:width var(--duration-base) var(--ease-out)}

/* live */
.stage{display:grid;grid-template-columns:1.5fr 1fr;gap:var(--space-4)}
@media(max-width:760px){.stage{grid-template-columns:1fr}}
.board{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-5);min-height:260px;box-shadow:var(--shadow-sm)}
.board .bl{font-size:var(--text-caption);color:var(--color-text-tertiary);margin-bottom:var(--space-4);display:flex;align-items:center;gap:var(--space-2)}
.board h4{font-family:var(--font-heading);font-size:var(--text-h3);margin-bottom:var(--space-4)}
.eq{font-family:var(--font-mono);background:var(--color-surface-subtle);padding:var(--space-3) var(--space-4);border-radius:var(--radius-sm);margin-bottom:var(--space-2);font-size:var(--text-body)}
.eq .st{color:var(--color-accent-text)}
.rc{display:flex;flex-direction:column;gap:var(--space-4)}
.vp{background:var(--fl-video-bg);color:var(--fl-video-text);border-radius:var(--radius-card);padding:var(--space-4);position:relative;min-height:96px;display:flex;align-items:center;justify-content:center}
.vp .va{width:48px;height:48px;border-radius:50%;background:#3a342a;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:600}
.vp .vn{position:absolute;left:var(--space-3);bottom:var(--space-3);font-size:11px;background:rgba(0,0,0,.4);padding:2px 8px;border-radius:var(--radius-sm)}
.lb{position:absolute;top:var(--space-3);left:var(--space-3);display:inline-flex;align-items:center;gap:6px;background:var(--color-error);color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:var(--radius-pill);font-family:var(--font-heading)}
.lb .pd{width:6px;height:6px;border-radius:50%;background:#fff;animation:fl-pulse 1.4s ease-in-out infinite}
@keyframes fl-pulse{0%,100%{opacity:1}50%{opacity:.3}}
.attn{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-4);box-shadow:var(--shadow-sm)}
.attn .tp{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:var(--space-2)}
.attn .lbl2{font-size:var(--text-caption);color:var(--color-text-secondary);display:flex;align-items:center;gap:var(--space-1)}.attn .lbl2 svg{width:14px;height:14px}
.attn .val{font-family:var(--font-mono);font-size:var(--text-h2);font-weight:var(--weight-semibold);color:var(--color-accent-text)}
.ctrlbar{display:flex;gap:var(--space-3);justify-content:center;align-items:center;margin-top:var(--space-5);flex-wrap:wrap}
.ctrl{width:48px;height:48px;border-radius:50%;border:1px solid var(--color-border-strong);background:var(--color-surface);color:var(--color-text);display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.ctrl.off{background:var(--color-error-bg);color:var(--color-error-text);border-color:var(--color-error-bg)}
.ctrl svg{width:20px;height:20px}.ctrl:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.leave{width:auto;border-radius:var(--radius-pill);padding:0 var(--space-5);height:48px;background:var(--color-error);color:#fff;border:0;font-family:var(--font-heading);font-weight:600;gap:var(--space-2)}

/* table */
.table-wrap{overflow-x:auto;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface)}
.table{width:100%;border-collapse:collapse;font-size:var(--text-small)}
.table th{text-align:left;font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-text-secondary);padding:var(--space-3) var(--space-4);background:var(--color-surface-subtle);border-bottom:1px solid var(--color-border)}
.table td{padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border)}
.table tr:last-child td{border-bottom:0}
.table tbody tr{cursor:pointer;transition:background var(--duration-fast)}
.table tbody tr:hover{background:var(--color-surface-hover)}
.tn{display:flex;align-items:center;gap:var(--space-3)}

/* grade */
.split{display:grid;grid-template-columns:1.3fr 1fr;gap:var(--space-5);align-items:start}
@media(max-width:760px){.split{grid-template-columns:1fr}}
.score-row{display:flex;gap:var(--space-2)}
.score-btn{width:48px;height:48px;border-radius:var(--radius-sm);border:1px solid var(--color-border-strong);background:var(--color-surface);font-family:var(--font-mono);font-weight:600;font-size:var(--text-lead);color:var(--color-text);cursor:pointer;transition:all var(--duration-fast)}
.score-btn.sel{background:var(--color-accent-strong);border-color:var(--color-accent-strong);color:var(--color-text-on-accent)}
.score-btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.textarea{font-family:var(--font-body);font-size:var(--text-body);color:var(--color-text);background:var(--color-surface);border:1px solid var(--color-border-strong);border-radius:var(--radius-control);padding:var(--space-3) var(--space-4);min-height:96px;line-height:var(--leading-body);width:100%;resize:vertical}
.textarea:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--focus-ring)}
.field-label{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);margin-bottom:var(--space-2);display:block}

/* done */
.done-hero{display:flex;flex-direction:column;align-items:center;text-align:center;gap:var(--space-3);padding:var(--space-6) 0}
.done-ic{width:72px;height:72px;border-radius:50%;background:var(--color-success-bg);color:var(--color-success-text);display:flex;align-items:center;justify-content:center}
.done-ic svg{width:36px;height:36px}
.flow-diag{display:flex;align-items:center;gap:var(--space-2);justify-content:center;flex-wrap:wrap;margin-top:var(--space-4)}
.fd-chip{display:inline-flex;align-items:center;gap:var(--space-2);background:var(--color-surface-subtle);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:var(--space-2) var(--space-4);font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium)}
.fd-chip svg{width:16px;height:16px;color:var(--color-accent)}
.fd-arrow{color:var(--color-text-tertiary)}.fd-arrow svg{width:16px;height:16px}
.insight{display:flex;gap:var(--space-3);background:var(--color-accent-subtle);border-left:4px solid var(--color-accent);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);font-size:var(--text-body);line-height:var(--leading-body)}
.insight svg{width:20px;height:20px;color:var(--color-accent-text);flex-shrink:0;margin-top:2px}
`;

function LiveChart({ data }) {
  const W = 280, H = 84, P = 4, n = data.length;
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => (H - P) - (v / 100) * (H - 2 * P);
  const line = data.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const area = line + ' L ' + x(n - 1).toFixed(1) + ' ' + H + ' L ' + x(0).toFixed(1) + ' ' + H + ' Z';
  return <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height="auto" preserveAspectRatio="none"><path d={area} fill="var(--color-accent-subtle)" /><path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" /><circle cx={x(n - 1)} cy={y(data[n - 1])} r="3.5" fill="var(--color-accent)" /></svg>;
}
function Spark({ data }) {
  const W = 200, H = 56, P = 3, n = data.length;
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P), y = (v) => (H - P) - (v / 100) * (H - 2 * P);
  const line = data.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  return <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height="56" preserveAspectRatio="none"><path d={line + ' L ' + x(n - 1) + ' ' + H + ' L ' + x(0) + ' ' + H + ' Z'} fill="var(--color-accent-subtle)" /><path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" /></svg>;
}

/* ---- STUDENT FLOW ---- */
function StuDash({ next }) {
  return (
    <div className="stack-5">
      <div><div className="h2">Привет, Петя</div><div className="sub">Сейчас начнётся занятие.</div></div>
      <div className="hero">
        <span className="icon-chip"><Calculator /></span>
        <div className="grow"><div className="ht">Алгебра · через 2 минуты</div><div className="hm">10:00 · Иван Петров · Введение в линейные уравнения</div></div>
        <span className="ktime num" />
      </div>
      <div className="actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-lg btn-primary" onClick={next}><Video />Присоединиться</button>
      </div>
    </div>
  );
}

function PreJoin({ next, back }) {
  const [cam, setCam] = useState(true);
  const [p, setP] = useState(0);
  const ready = p >= 100;
  useEffect(() => {
    const t = setInterval(() => setP((v) => Math.min(100, v + 12)), 160);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="card stack-5">
      <div><div className="card-h">Подключение к занятию</div><div className="h2" style={{ fontSize: 'var(--text-h3)' }}>Алгебра · Иван Петров</div></div>
      <div className="previd">
        {cam ? <div className="ava">ВЫ</div> : <VideoOff style={{ width: 40, height: 40, opacity: .7 }} />}
        <span className="privacy pp"><ShieldCheck />on-device</span>
      </div>
      <div className="calib">
        <div className="ct"><span>{ready ? 'Калибровка завершена' : 'Калибровка лица…'}</span><span className="num">{p}%</span></div>
        <div className="cbar"><i style={{ width: p + '%' }} /></div>
      </div>
      <div className="insight"><ShieldCheck />Анализ внимания идёт <b>на твоём устройстве</b>. Камера используется только локально — видео не передаётся на сервер.</div>
      <div className="actions">
        <button className="btn btn-md btn-secondary" onClick={back}><ArrowLeft />Назад</button>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className={'ctrl' + (cam ? '' : ' off')} aria-label="Камера" onClick={() => setCam(!cam)} style={{ width: 48, height: 48 }}>{cam ? <Video /> : <VideoOff />}</button>
          <button className="btn btn-md btn-primary" disabled={!ready} onClick={next}>Войти в занятие<ChevronRight /></button>
        </div>
      </div>
    </div>
  );
}

function LiveStep({ next, back }) {
  const [data, setData] = useState(Array(22).fill(82));
  const [mic, setMic] = useState(true);
  const last = data[data.length - 1];
  useEffect(() => {
    const t = setInterval(() => setData((prev) => {
      let nx = prev[prev.length - 1] + (Math.random() * 16 - 8);
      if (Math.random() < 0.12) nx -= 12;
      nx = Math.max(58, Math.min(94, nx));
      return [...prev.slice(1), Math.round(nx)];
    }), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div className="h2" style={{ fontSize: 'var(--text-h3)' }}>Алгебра · идёт занятие</div>
        <span className="privacy"><ShieldCheck />Анализ на устройстве · видео не передаётся</span>
      </div>
      <div className="stage">
        <div className="board">
          <div className="bl"><Play style={{ width: 14, height: 14 }} />Демонстрация · Иван</div>
          <h4>Решаем уравнение</h4>
          <div className="eq">3x + 5 = 20</div>
          <div className="eq"><span className="st">−5:</span> 3x = 15</div>
          <div className="eq"><span className="st">÷3:</span> x = 5</div>
        </div>
        <div className="rc">
          <div className="vp"><span className="lb"><span className="pd" />LIVE</span><div className="va">ИП</div><span className="vn">Иван Петров</span></div>
          <div className="attn">
            <div className="tp"><span className="lbl2"><Eye />Внимание</span><span className="val num">{last}%</span></div>
            <LiveChart data={data} />
          </div>
        </div>
      </div>
      <div className="ctrlbar">
        <button className={'ctrl' + (mic ? '' : ' off')} aria-label="Микрофон" onClick={() => setMic(!mic)}>{mic ? <Mic /> : <MicOff />}</button>
        <button className="ctrl" aria-label="Рука"><Hand /></button>
        <button className="ctrl" aria-label="Чат"><MessageSquare /></button>
        <button className="leave btn" onClick={next}><PhoneOff />Завершить</button>
      </div>
      <div className="actions" style={{ justifyContent: 'flex-start' }}>
        <button className="btn btn-sm btn-ghost" onClick={back}><ArrowLeft />Назад к подключению</button>
      </div>
    </div>
  );
}

function StuDone({ reset }) {
  return (
    <div className="card">
      <div className="done-hero">
        <div className="done-ic"><CheckCircle2 /></div>
        <div className="h2">Занятие завершено</div>
        <div className="sub">Запись доступна · твоё внимание сегодня</div>
        <div className="num" style={{ fontSize: '3rem', fontWeight: 600, color: 'var(--color-accent-text)' }}>77%</div>
        <div style={{ maxWidth: 240, width: '100%' }}><Spark data={[82, 85, 80, 72, 64, 79, 78]} /></div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}><span className="badge badge-success"><span className="bdot" />пик 88%</span><span className="badge badge-warning"><span className="bdot" />спад после 30 мин</span></div>
      </div>
      <div className="insight"><ShieldCheck />На сервер ушли только обезличенные метрики внимания. Видео осталось на устройстве.</div>
      <div className="actions" style={{ justifyContent: 'center' }}>
        <button className="btn btn-md btn-secondary" onClick={reset}><RefreshCw style={{ width: 16, height: 16 }} />Пройти заново</button>
      </div>
    </div>
  );
}

/* ---- TEACHER FLOW ---- */
function TeaDash({ next }) {
  return (
    <div className="stack-5">
      <div><div className="h2">Добрый день, Иван</div><div className="sub">Есть работы, которые ждут проверки.</div></div>
      <div className="hero">
        <span className="icon-chip"><FileText /></span>
        <div className="grow"><div className="ht">4 работы на проверке</div><div className="hm">ДЗ «Решить 3 уравнения» · Алгебра 7Б</div></div>
        <button className="btn btn-md btn-primary" onClick={next}>Проверить<ChevronRight /></button>
      </div>
    </div>
  );
}

const STU = [
  { id: 1, n: 'Пётр Сидоров', i: 'ПС', st: 'submitted', d: 'ср, 19:04' },
  { id: 2, n: 'Анна Котова', i: 'АК', st: 'submitted', d: 'ср, 21:30' },
  { id: 3, n: 'Коля Иванов', i: 'НИ', st: 'late', d: 'чт, 08:12' },
  { id: 4, n: 'Мария Лебедева', i: 'МЛ', st: 'submitted', d: 'ср, 18:00' },
];
const ST = { submitted: ['info', 'сдал'], late: ['warning', 'опоздал'] };

function GradingStep({ next, back }) {
  return (
    <div className="stack-5">
      <div><div className="h2" style={{ fontSize: 'var(--text-h3)' }}>Оценивание · «Решить 3 уравнения»</div><div className="sub">Алгебра 7Б · выбери работу для проверки</div></div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Студент</th><th>Сдано</th><th>Статус</th><th style={{ textAlign: 'right' }}>Действие</th></tr></thead>
          <tbody>
            {STU.map((s) => (
              <tr key={s.id} onClick={next}>
                <td><span className="tn"><span className="avatar avatar-sm">{s.i}</span>{s.n}</span></td>
                <td className="num">{s.d}</td>
                <td><span className={'badge badge-' + ST[s.st][0]}><span className="bdot" />{ST[s.st][1]}</span></td>
                <td style={{ textAlign: 'right' }}><button className="btn btn-sm btn-ghost">Проверить<ChevronRight /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions" style={{ justifyContent: 'flex-start' }}><button className="btn btn-sm btn-ghost" onClick={back}><ArrowLeft />Назад к дашборду</button></div>
    </div>
  );
}

function GradeStep({ next, back }) {
  const [score, setScore] = useState(null);
  return (
    <div>
      <div style={{ marginBottom: 'var(--space-5)' }}><div className="h2" style={{ fontSize: 'var(--text-h3)' }}>Пётр Сидоров</div><div className="sub">ДЗ «Решить 3 уравнения» · сдано ср, 19:04</div></div>
      <div className="split">
        <div className="card">
          <div className="card-h">Ответ ученика</div>
          <div className="eq">№1. 3x + 5 = 20 → x = 5</div>
          <div className="eq">№2. 2(x − 4) = 10 → x = 9</div>
          <div className="eq">№3. x/2 + 3 = 7 → x = 8</div>
          <div className="sub" style={{ marginTop: 'var(--space-4)' }}>Приложен файл: <span style={{ color: 'var(--color-accent-text)' }}>решение_тетрадь.jpg</span></div>
        </div>
        <div className="card">
          <div className="card-h">Оценка</div>
          <div className="score-row">{[2, 3, 4, 5].map((nn) => <button key={nn} className={'score-btn' + (score === nn ? ' sel' : '')} onClick={() => setScore(nn)}>{nn}</button>)}</div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="field-label">Комментарий</label>
            <textarea className="textarea" defaultValue="Молодец! Уравнения решены верно, обрати внимание на оформление." />
          </div>
          <div className="actions">
            <button className="btn btn-md btn-secondary" onClick={back}><ArrowLeft />Назад</button>
            <button className="btn btn-md btn-primary" disabled={!score} onClick={next}><Check />Готово</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeaDone({ reset }) {
  return (
    <div className="card">
      <div className="done-hero">
        <div className="done-ic"><Check /></div>
        <div className="h2">Оценка сохранена</div>
        <div className="sub">Пётр получил 5 за ДЗ по алгебре</div>
        <div className="flow-diag">
          <span className="fd-chip"><Star />Оценка 5</span>
          <span className="fd-arrow"><ChevronRight /></span>
          <span className="fd-chip"><User />Ученик уведомлён</span>
          <span className="fd-arrow"><ChevronRight /></span>
          <span className="fd-chip"><Users />Родитель видит прогресс</span>
        </div>
      </div>
      <div className="insight"><Bell />Ученику ушло push-уведомление, его страница прогресса обновилась, а родитель увидит новую оценку и рост среднего балла в своём кабинете.</div>
      <div className="actions" style={{ justifyContent: 'center' }}>
        <button className="btn btn-md btn-secondary" onClick={reset}><RefreshCw style={{ width: 16, height: 16 }} />Пройти заново</button>
      </div>
    </div>
  );
}

const FLOWS = {
  student: { name: 'Ученик присоединяется к занятию', steps: ['Дашборд', 'Доступ к камере', 'Видеозанятие', 'Итог'] },
  teacher: { name: 'Преподаватель оценивает ДЗ', steps: ['Дашборд', 'Оценивание', 'Оценка работы', 'Готово'] },
};

export default function FlowsPrototype() {
  const [theme, setTheme] = useState('light');
  const [flow, setFlow] = useState('student');
  const [step, setStep] = useState(0);
  const F = FLOWS[flow];
  const go = (i) => setStep(Math.max(0, Math.min(F.steps.length - 1, i)));
  const next = () => go(step + 1), back = () => go(step - 1), reset = () => go(0);
  const switchFlow = (f) => { setFlow(f); setStep(0); };

  const render = () => {
    if (flow === 'student') return [<StuDash next={next} />, <PreJoin next={next} back={back} />, <LiveStep next={next} back={back} />, <StuDone reset={reset} />][step];
    return [<TeaDash next={next} />, <GradingStep next={next} back={back} />, <GradeStep next={next} back={back} />, <TeaDone reset={reset} />][step];
  };

  return (
    <div className="fl-root" data-theme={theme === 'dark' ? 'dark' : undefined}>
      <style>{css}</style>
      <div className="wrap">
        <div className="topwrap">
          <span className="logo">flamingo<span className="d" /></span>
          <div className="controls">
            <div className="seg">
              <button aria-pressed={flow === 'student'} onClick={() => switchFlow('student')}>Ученик → занятие</button>
              <button aria-pressed={flow === 'teacher'} onClick={() => switchFlow('teacher')}>Преподаватель → ДЗ</button>
            </div>
            <button className="iconbtn" aria-label="Тема" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
          </div>
        </div>

        <div className="flow-name">{F.name}</div>
        <div className="stepper">
          {F.steps.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="step-line" style={{ background: i <= step ? 'var(--color-accent-subtle-border)' : 'var(--color-border)' }} />}
              <button className={'step' + (i === step ? ' active' : i < step ? ' done' : '')} onClick={() => go(i)}>
                <span className="num">{i < step ? <Check /> : i + 1}</span>
                <span className="lbl">{s}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {render()}
      </div>
    </div>
  );
}
