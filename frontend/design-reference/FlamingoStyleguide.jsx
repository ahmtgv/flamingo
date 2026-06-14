import React, { useState, useEffect } from 'react';
import {
  Calendar, Video, BookOpen, FileText, Users, BarChart3, Bell, Settings,
  Check, X, ChevronDown, Star, Clock, GraduationCap, Search, LayoutDashboard,
  Upload, AlertTriangle, CheckCircle2, Info, Calculator
} from 'lucide-react';

/* Flamingo — Living Styleguide
   In production: import './tokens.css' (tokens live on :root).
   Here tokens are embedded and scoped to .fl-root so the artifact is self-contained.
   Components reference SEMANTIC tokens only — no hardcoded colors or sizes. */

const css = `
.fl-root{
  --fl-white:#fff;
  --fl-warm-50:#fbf8f2;--fl-warm-100:#f4efe6;--fl-warm-150:#ede7db;--fl-warm-200:#e0d8ca;
  --fl-warm-300:#cfc3b0;--fl-warm-400:#a99d87;--fl-warm-500:#8b7f69;--fl-warm-600:#6e6456;
  --fl-warm-700:#4e473e;--fl-warm-800:#34302a;--fl-warm-900:#2a2520;
  --fl-coral-50:#fbede6;--fl-coral-100:#f6d8c8;--fl-coral-200:#efc0a8;--fl-coral-300:#e59e78;
  --fl-coral-400:#e8794f;--fl-coral-500:#d2562e;--fl-coral-600:#be4622;--fl-coral-700:#a23a1c;--fl-coral-800:#8a3017;
  --fl-success-500:#3f8f5f;--fl-success-700:#2e6b45;--fl-success-50:#e6f0e8;
  --fl-warning-500:#c8881c;--fl-warning-700:#8a5e0e;--fl-warning-50:#f7edd7;
  --fl-error-500:#c8392b;--fl-error-700:#a52a20;--fl-error-50:#f8e3df;
  --fl-info-500:#2f74a8;--fl-info-700:#1f5780;--fl-info-50:#e1ecf4;
  --fl-dark-bg:#232019;--fl-dark-surface:#2c2820;--fl-dark-surface-2:#353027;--fl-dark-border:#3a352c;--fl-dark-text:#f1ebdf;--fl-dark-text-2:#cabfa9;
  --fl-shadow-rgb:42,37,32;

  --color-bg:var(--fl-warm-100);--color-surface:var(--fl-warm-50);--color-surface-subtle:var(--fl-warm-150);--color-surface-hover:var(--fl-warm-150);
  --color-border:var(--fl-warm-200);--color-border-strong:var(--fl-warm-300);
  --color-text:var(--fl-warm-900);--color-text-secondary:var(--fl-warm-600);--color-text-tertiary:var(--fl-warm-500);--color-text-disabled:var(--fl-warm-400);
  --color-text-inverse:var(--fl-dark-text);--color-text-on-accent:var(--fl-white);
  --color-accent:var(--fl-coral-500);--color-accent-strong:var(--fl-coral-600);--color-accent-hover:var(--fl-coral-700);--color-accent-pressed:var(--fl-coral-800);
  --color-accent-text:var(--fl-coral-700);--color-accent-subtle:var(--fl-coral-50);--color-accent-subtle-border:var(--fl-coral-100);--color-link:var(--fl-coral-700);
  --color-success:var(--fl-success-500);--color-success-text:var(--fl-success-700);--color-success-bg:var(--fl-success-50);
  --color-warning:var(--fl-warning-500);--color-warning-text:var(--fl-warning-700);--color-warning-bg:var(--fl-warning-50);
  --color-error:var(--fl-error-500);--color-error-text:var(--fl-error-700);--color-error-bg:var(--fl-error-50);
  --color-info:var(--fl-info-500);--color-info-text:var(--fl-info-700);--color-info-bg:var(--fl-info-50);
  --color-overlay:rgba(var(--fl-shadow-rgb),0.45);

  --font-heading:'IBM Plex Sans',system-ui,sans-serif;
  --font-body:'Golos Text','IBM Plex Sans',system-ui,sans-serif;
  --font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --weight-regular:400;--weight-medium:500;--weight-semibold:600;--weight-bold:700;
  --text-display:2.75rem;--text-h1:2rem;--text-h2:1.625rem;--text-h3:1.25rem;--text-lead:1.125rem;
  --text-body:1rem;--text-small:0.875rem;--text-caption:0.8125rem;--text-overline:0.75rem;
  --leading-tight:1.1;--leading-heading:1.25;--leading-snug:1.4;--leading-body:1.6;--leading-relaxed:1.75;
  --tracking-tight:-0.02em;--tracking-snug:-0.01em;--tracking-normal:0;--tracking-wide:0.06em;

  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;
  --space-7:32px;--space-8:40px;--space-9:48px;--space-10:64px;--space-11:80px;--space-12:96px;

  --radius-xs:4px;--radius-sm:8px;--radius-md:12px;--radius-lg:16px;--radius-xl:20px;--radius-pill:999px;--radius-control:10px;--radius-card:16px;

  --shadow-xs:0 1px 2px rgba(var(--fl-shadow-rgb),0.06);
  --shadow-sm:0 1px 2px rgba(var(--fl-shadow-rgb),0.05),0 2px 6px rgba(var(--fl-shadow-rgb),0.06);
  --shadow-md:0 2px 4px rgba(var(--fl-shadow-rgb),0.05),0 6px 16px rgba(var(--fl-shadow-rgb),0.09);
  --shadow-lg:0 4px 8px rgba(var(--fl-shadow-rgb),0.06),0 16px 32px rgba(var(--fl-shadow-rgb),0.12);

  --duration-fast:120ms;--duration-base:200ms;--duration-slow:320ms;
  --ease-standard:cubic-bezier(0.2,0,0,1);--ease-out:cubic-bezier(0,0,0,1);--ease-in:cubic-bezier(0.4,0,1,1);

  --control-height-sm:32px;--control-height-md:40px;--control-height-lg:48px;--tap-min:44px;

  --focus-ring-width:3px;--focus-ring-color:rgba(210,86,46,0.45);
  --focus-ring:0 0 0 var(--focus-ring-width) var(--focus-ring-color);
  --z-modal:1300;--z-toast:1400;
}
.fl-root[data-theme="dark"]{
  --color-bg:var(--fl-dark-bg);--color-surface:var(--fl-dark-surface);--color-surface-subtle:var(--fl-dark-surface-2);--color-surface-hover:var(--fl-dark-surface-2);
  --color-border:var(--fl-dark-border);--color-border-strong:#4a4438;
  --color-text:var(--fl-dark-text);--color-text-secondary:var(--fl-dark-text-2);--color-text-tertiary:#9a8f79;--color-text-disabled:#6e6452;--color-text-inverse:var(--fl-warm-900);
  --color-accent:var(--fl-coral-500);--color-accent-strong:var(--fl-coral-600);--color-accent-hover:var(--fl-coral-500);--color-accent-pressed:var(--fl-coral-400);
  --color-accent-text:var(--fl-coral-400);--color-accent-subtle:#3a241b;--color-accent-subtle-border:#5a3018;--color-link:var(--fl-coral-400);
  --color-success-bg:#1e3328;--color-warning-bg:#322a14;--color-error-bg:#3a201c;--color-info-bg:#1c2f3f;
  --color-overlay:rgba(0,0,0,0.6);
  --shadow-xs:0 1px 2px rgba(0,0,0,0.4);--shadow-sm:0 2px 6px rgba(0,0,0,0.45);--shadow-md:0 6px 16px rgba(0,0,0,0.5);--shadow-lg:0 16px 32px rgba(0,0,0,0.55);
  --focus-ring-color:rgba(232,121,79,0.5);
}
.fl-root[data-mode="kids"]{
  --text-body:1.1875rem;--text-small:1rem;--text-caption:0.9375rem;--text-h3:1.375rem;--text-h2:1.75rem;
  --leading-body:1.75;
  --control-height-sm:40px;--control-height-md:48px;--control-height-lg:56px;--tap-min:48px;
  --radius-control:14px;--radius-card:20px;
}

.fl-root *{box-sizing:border-box;margin:0;padding:0}
.fl-root{background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);line-height:var(--leading-body);
  -webkit-font-smoothing:antialiased;transition:background var(--duration-base) var(--ease-standard),color var(--duration-base) var(--ease-standard);
  min-height:100vh;padding:var(--space-7) var(--space-6) var(--space-12)}
.page{max-width:1000px;margin:0 auto}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-9)}
.logo{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-h3);letter-spacing:var(--tracking-snug);display:inline-flex;align-items:flex-end}
.logo .dot{width:8px;height:8px;border-radius:50%;background:var(--color-accent);margin-left:5px;margin-bottom:3px}
.toggles{display:flex;gap:var(--space-3);flex-wrap:wrap}
.seg{display:inline-flex;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:3px}
.seg button{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;padding:6px 14px;border-radius:var(--radius-pill);cursor:pointer;transition:all var(--duration-fast) var(--ease-standard)}
.seg button[aria-pressed="true"]{background:var(--color-accent-strong);color:var(--color-text-on-accent)}
.seg button:focus-visible{outline:none;box-shadow:var(--focus-ring)}

.section{margin-bottom:var(--space-10)}
.eyebrow{font-family:var(--font-heading);font-size:var(--text-overline);font-weight:var(--weight-semibold);text-transform:uppercase;letter-spacing:var(--tracking-wide);color:var(--color-text-secondary);margin-bottom:var(--space-4)}
.panel{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-6);box-shadow:var(--shadow-sm)}
.cluster{display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:center}
.cluster + .cluster{margin-top:var(--space-4)}
.col-label{font-size:var(--text-caption);color:var(--color-text-tertiary);font-family:var(--font-mono);margin-bottom:var(--space-2)}
.grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4)}

/* BUTTON */
.btn{font-family:var(--font-heading);font-weight:var(--weight-semibold);display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);
  border:1px solid transparent;border-radius:var(--radius-control);cursor:pointer;white-space:nowrap;user-select:none;line-height:1;
  transition:transform var(--duration-fast) var(--ease-standard),background var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard)}
.btn-sm{height:var(--control-height-sm);padding:0 var(--space-3);font-size:var(--text-small)}
.btn-md{height:var(--control-height-md);padding:0 var(--space-5);font-size:var(--text-body)}
.btn-lg{height:var(--control-height-lg);padding:0 var(--space-6);font-size:var(--text-lead)}
.btn svg{width:1.15em;height:1.15em}
.btn-primary{background:var(--color-accent-strong);color:var(--color-text-on-accent)}
.btn-primary:hover,.btn-primary.is-hover{background:var(--color-accent-hover)}
.btn-primary:active,.btn-primary.is-active{background:var(--color-accent-pressed);transform:translateY(1px)}
.btn-secondary{background:var(--color-surface);color:var(--color-text);border-color:var(--color-border-strong)}
.btn-secondary:hover,.btn-secondary.is-hover{background:var(--color-surface-hover)}
.btn-secondary:active,.btn-secondary.is-active{transform:translateY(1px)}
.btn-ghost{background:transparent;color:var(--color-accent-text)}
.btn-ghost:hover,.btn-ghost.is-hover{background:var(--color-accent-subtle)}
.btn-danger{background:var(--color-error);color:var(--color-text-on-accent)}
.btn-danger:hover,.btn-danger.is-hover{background:var(--color-error-text)}
.btn-danger:active,.btn-danger.is-active{transform:translateY(1px)}
.btn:focus-visible,.btn.is-focus{outline:none;box-shadow:var(--focus-ring)}
.btn:disabled,.btn.is-disabled{background:var(--color-surface-subtle);color:var(--color-text-disabled);border-color:var(--color-border);cursor:not-allowed;transform:none;box-shadow:none}
.spinner{width:1.05em;height:1.05em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:fl-spin var(--duration-slow) linear infinite}
@keyframes fl-spin{to{transform:rotate(360deg)}}

/* FIELDS */
.field{display:flex;flex-direction:column}
.field-label{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);margin-bottom:var(--space-2)}
.input,.select,.textarea{font-family:var(--font-body);font-size:var(--text-body);color:var(--color-text);background:var(--color-surface);border:1px solid var(--color-border-strong);border-radius:var(--radius-control);
  height:var(--control-height-md);padding:0 var(--space-4);width:100%;transition:box-shadow var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard)}
.textarea{height:auto;padding:var(--space-3) var(--space-4);min-height:84px;line-height:var(--leading-body);resize:vertical}
.input::placeholder,.textarea::placeholder{color:var(--color-text-tertiary)}
.input:focus,.select:focus,.textarea:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--focus-ring)}
.input:disabled,.select:disabled{background:var(--color-surface-subtle);color:var(--color-text-disabled);cursor:not-allowed}
.input.is-error{border-color:var(--color-error)}
.input.is-error:focus{box-shadow:0 0 0 var(--focus-ring-width) var(--color-error-bg)}
.field-help{font-size:var(--text-caption);color:var(--color-text-tertiary);margin-top:var(--space-2)}
.field-help.is-error{color:var(--color-error-text)}
.select-wrap{position:relative;display:flex}
.select{appearance:none;-webkit-appearance:none;padding-right:var(--space-8)}
.select-wrap svg{position:absolute;right:var(--space-3);top:50%;transform:translateY(-50%);color:var(--color-text-secondary);pointer-events:none;width:18px;height:18px}

/* CHECK / RADIO */
.check{display:inline-flex;align-items:center;gap:var(--space-3);cursor:pointer;font-size:var(--text-body);color:var(--color-text);user-select:none}
.check input{position:absolute;opacity:0;width:1px;height:1px}
.check .box{width:20px;height:20px;border:1.5px solid var(--color-border-strong);border-radius:var(--radius-xs);background:var(--color-surface);display:flex;align-items:center;justify-content:center;transition:all var(--duration-fast) var(--ease-standard);flex-shrink:0}
.check .box.radio{border-radius:50%}
.check .tick{color:var(--color-text-on-accent);opacity:0;width:14px;height:14px}
.check .ring{width:8px;height:8px;border-radius:50%;background:var(--color-text-on-accent);opacity:0;transform:scale(0.5);transition:all var(--duration-fast) var(--ease-standard)}
.check input:checked + .box{background:var(--color-accent-strong);border-color:var(--color-accent-strong)}
.check input:checked + .box .tick{opacity:1}
.check input:checked + .box .ring{opacity:1;transform:scale(1)}
.check input:focus-visible + .box{box-shadow:var(--focus-ring)}
.check input:disabled + .box{background:var(--color-surface-subtle);border-color:var(--color-border)}
.check.is-disabled{color:var(--color-text-disabled);cursor:not-allowed}

/* DOMAIN CARDS */
.dcard{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-5);box-shadow:var(--shadow-sm);
  transition:transform var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard);display:flex;flex-direction:column;gap:var(--space-3)}
.dcard:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
.dcard-head{display:flex;align-items:flex-start;gap:var(--space-3)}
.icon-chip{width:44px;height:44px;border-radius:var(--radius-md);background:var(--color-accent-subtle);color:var(--color-accent-text);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.icon-chip svg{width:22px;height:22px}
.dcard-title{font-family:var(--font-heading);font-size:var(--text-h3);font-weight:var(--weight-semibold);line-height:var(--leading-snug);color:var(--color-text)}
.dcard-meta{font-size:var(--text-small);color:var(--color-text-secondary);margin-top:2px}
.dcard-foot{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-top:var(--space-2)}
.progress{height:8px;background:var(--color-surface-subtle);border-radius:var(--radius-pill);overflow:hidden}
.progress > i{display:block;height:100%;background:var(--color-accent-strong);border-radius:var(--radius-pill)}
.progress-label{font-family:var(--font-mono);font-size:var(--text-caption);color:var(--color-text-secondary);margin-top:var(--space-2)}

/* BADGES */
.badge{display:inline-flex;align-items:center;gap:var(--space-1);font-family:var(--font-heading);font-size:var(--text-caption);font-weight:var(--weight-semibold);
  padding:3px 10px;border-radius:var(--radius-pill);line-height:1.45}
.badge .bdot{width:6px;height:6px;border-radius:50%;background:currentColor}
.badge-success{background:var(--color-success-bg);color:var(--color-success-text)}
.badge-warning{background:var(--color-warning-bg);color:var(--color-warning-text)}
.badge-error{background:var(--color-error-bg);color:var(--color-error-text)}
.badge-info{background:var(--color-info-bg);color:var(--color-info-text)}
.badge-accent{background:var(--color-accent-subtle);color:var(--color-accent-text)}
.badge-neutral{background:var(--color-surface-subtle);color:var(--color-text-secondary)}

/* TABLE */
.table-wrap{overflow-x:auto;border:1px solid var(--color-border);border-radius:var(--radius-md)}
.table{width:100%;border-collapse:collapse;font-size:var(--text-small)}
.table th{text-align:left;font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-text-secondary);padding:var(--space-3) var(--space-4);background:var(--color-surface-subtle);border-bottom:1px solid var(--color-border)}
.table td{padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border);color:var(--color-text)}
.table tr:last-child td{border-bottom:0}
.table tbody tr{transition:background var(--duration-fast) var(--ease-standard)}
.table tbody tr:hover{background:var(--color-surface-hover)}
.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.t-name{display:flex;align-items:center;gap:var(--space-3)}

/* TABS */
.tabs{display:flex;gap:var(--space-1);border-bottom:1px solid var(--color-border);margin-bottom:var(--space-5)}
.tab{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;
  padding:var(--space-3) var(--space-4);border-bottom:2px solid transparent;margin-bottom:-1px;cursor:pointer;transition:color var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard)}
.tab:hover{color:var(--color-text)}
.tab.is-active{color:var(--color-accent-text);border-bottom-color:var(--color-accent-strong)}
.tab:focus-visible{outline:none;box-shadow:var(--focus-ring);border-radius:var(--radius-xs)}
.tab-body{font-size:var(--text-body);color:var(--color-text-secondary)}

/* AVATAR */
.avatar{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--weight-semibold);
  background:var(--color-accent-subtle);color:var(--color-accent-text);position:relative;flex-shrink:0}
.avatar-sm{width:32px;height:32px;font-size:var(--text-caption)}
.avatar-md{width:40px;height:40px;font-size:var(--text-small)}
.avatar-lg{width:56px;height:56px;font-size:var(--text-h3)}
.avatar .status{position:absolute;right:-1px;bottom:-1px;width:12px;height:12px;border-radius:50%;background:var(--color-success);border:2px solid var(--color-surface)}

/* NAV */
.nav{width:240px;max-width:100%;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-3);box-shadow:var(--shadow-sm)}
.nav-item{display:flex;align-items:center;gap:var(--space-3);width:100%;text-align:left;font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);
  color:var(--color-text-secondary);background:transparent;border:0;padding:var(--space-3);border-radius:var(--radius-sm);cursor:pointer;min-height:var(--tap-min);transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard)}
.nav-item svg{width:20px;height:20px}
.nav-item:hover{background:var(--color-surface-hover);color:var(--color-text)}
.nav-item.is-active{background:var(--color-accent-subtle);color:var(--color-accent-text)}
.nav-item:focus-visible{outline:none;box-shadow:var(--focus-ring)}

/* MODAL */
.overlay{position:fixed;inset:0;background:var(--color-overlay);display:flex;align-items:center;justify-content:center;padding:var(--space-5);z-index:var(--z-modal);animation:fl-fade var(--duration-base) var(--ease-standard)}
.dialog{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);max-width:440px;width:100%;padding:var(--space-6);animation:fl-pop var(--duration-base) var(--ease-standard)}
.dialog h3{font-family:var(--font-heading);font-size:var(--text-h3);font-weight:var(--weight-semibold);margin-bottom:var(--space-3)}
.dialog p{font-size:var(--text-body);color:var(--color-text-secondary);line-height:var(--leading-body);margin-bottom:var(--space-6)}
.dialog .actions{display:flex;justify-content:flex-end;gap:var(--space-3)}
@keyframes fl-fade{from{opacity:0}to{opacity:1}}
@keyframes fl-pop{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:none}}

/* TOAST */
.toast-stack{position:fixed;right:var(--space-6);bottom:var(--space-6);display:flex;flex-direction:column;gap:var(--space-3);z-index:var(--z-toast);max-width:340px}
.toast{display:flex;align-items:flex-start;gap:var(--space-3);background:var(--color-surface);border:1px solid var(--color-border);border-left:4px solid var(--color-info);
  border-radius:var(--radius-md);box-shadow:var(--shadow-md);padding:var(--space-3) var(--space-4);font-size:var(--text-small);color:var(--color-text);animation:fl-slide var(--duration-base) var(--ease-out)}
.toast.success{border-left-color:var(--color-success)}.toast.success svg{color:var(--color-success)}
.toast.error{border-left-color:var(--color-error)}.toast.error svg{color:var(--color-error)}
.toast.info{border-left-color:var(--color-info)}.toast.info svg{color:var(--color-info)}
.toast svg{width:20px;height:20px;flex-shrink:0;margin-top:1px}
@keyframes fl-slide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
`;

function Btn({ variant = 'primary', size = 'md', state, loading, disabled, children, icon, onClick }) {
  const Icon = icon;
  const cls = ['btn', 'btn-' + size, 'btn-' + variant, state ? 'is-' + state : '', loading ? 'is-loading' : ''].join(' ').trim();
  return (
    <button className={cls} disabled={disabled || loading} onClick={onClick}>
      {loading && <span className="spinner" />}
      {!loading && Icon && <Icon />}
      {children}
    </button>
  );
}

function Badge({ tone = 'neutral', dot, children }) {
  return <span className={'badge badge-' + tone}>{dot && <span className="bdot" />}{children}</span>;
}

function Avatar({ size = 'md', initials, status }) {
  return <span className={'avatar avatar-' + size}>{initials}{status && <span className="status" />}</span>;
}

function Section({ title, children }) {
  return (
    <section className="section">
      <div className="eyebrow">{title}</div>
      {children}
    </section>
  );
}

export default function FlamingoStyleguide() {
  const [theme, setTheme] = useState('light');
  const [mode, setMode] = useState('adult');
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = (kind, text) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModal(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tabContent = ['Все 21 студент группы 7Б.', 'Сильные стороны: алгебра, геометрия.', 'Внимание падает после 30 минут — рекомендуем паузу.'];

  return (
    <div className="fl-root" data-theme={theme === 'dark' ? 'dark' : undefined} data-mode={mode === 'kids' ? 'kids' : undefined}>
      <style>{css}</style>
      <div className="page">

        <div className="topbar">
          <span className="logo">flamingo<span className="dot" /></span>
          <div className="toggles">
            <div className="seg">
              <button aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>Светлая</button>
              <button aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>Тёмная</button>
            </div>
            <div className="seg">
              <button aria-pressed={mode === 'adult'} onClick={() => setMode('adult')}>Взрослый</button>
              <button aria-pressed={mode === 'kids'} onClick={() => setMode('kids')}>Детский</button>
            </div>
          </div>
        </div>

        <Section title="Кнопки — варианты × размеры">
          <div className="panel">
            <div className="cluster">
              <Btn variant="primary" size="sm">Primary SM</Btn>
              <Btn variant="primary" size="md">Primary MD</Btn>
              <Btn variant="primary" size="lg">Primary LG</Btn>
            </div>
            <div className="cluster">
              <Btn variant="secondary" size="md">Secondary</Btn>
              <Btn variant="ghost" size="md">Ghost</Btn>
              <Btn variant="danger" size="md">Danger</Btn>
              <Btn variant="primary" size="md" icon={Upload}>С иконкой</Btn>
            </div>
          </div>
        </Section>

        <Section title="Кнопки — все состояния (primary)">
          <div className="panel">
            <div className="cluster">
              <Btn variant="primary">Default</Btn>
              <Btn variant="primary" state="hover">Hover</Btn>
              <Btn variant="primary" state="active">Active</Btn>
              <Btn variant="primary" state="focus">Focus</Btn>
              <Btn variant="primary" disabled>Disabled</Btn>
              <Btn variant="primary" loading>Loading</Btn>
            </div>
          </div>
        </Section>

        <Section title="Поля ввода — состояния">
          <div className="panel">
            <div className="grid-cards">
              <div className="field">
                <label className="field-label">Эл. почта</label>
                <input className="input" placeholder="ivan@example.ru" />
                <span className="field-help">Используется для входа</span>
              </div>
              <div className="field">
                <label className="field-label">Пароль (фокус — кликните)</label>
                <input className="input" type="password" placeholder="••••••••" defaultValue="secret" />
                <span className="field-help">Минимум 8 символов</span>
              </div>
              <div className="field">
                <label className="field-label">Эл. почта</label>
                <input className="input is-error" defaultValue="неверный-адрес" />
                <span className="field-help is-error">Введите корректный адрес</span>
              </div>
              <div className="field">
                <label className="field-label">Отключено</label>
                <input className="input" disabled defaultValue="Недоступно" />
                <span className="field-help">Поле заблокировано</span>
              </div>
              <div className="field">
                <label className="field-label">Предмет</label>
                <div className="select-wrap">
                  <select className="select" defaultValue="math">
                    <option value="math">Математика</option>
                    <option value="lang">Английский</option>
                    <option value="lit">Литература</option>
                  </select>
                  <ChevronDown />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Комментарий</label>
                <textarea className="textarea" placeholder="Ваш ответ…" />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Чекбоксы и радио">
          <div className="panel">
            <div className="cluster" style={{ gap: 'var(--space-6)' }}>
              <label className="check"><input type="checkbox" defaultChecked /><span className="box"><Check className="tick" /></span>Согласие с условиями</label>
              <label className="check"><input type="checkbox" /><span className="box"><Check className="tick" /></span>Получать уведомления</label>
              <label className="check is-disabled"><input type="checkbox" disabled /><span className="box"><Check className="tick" /></span>Отключено</label>
            </div>
            <div className="cluster" style={{ gap: 'var(--space-6)' }}>
              <label className="check"><input type="radio" name="age" defaultChecked /><span className="box radio"><span className="ring" /></span>Младшие классы</label>
              <label className="check"><input type="radio" name="age" /><span className="box radio"><span className="ring" /></span>Подросток</label>
              <label className="check"><input type="radio" name="age" /><span className="box radio"><span className="ring" /></span>Взрослый</label>
            </div>
          </div>
        </Section>

        <Section title="Карточки — занятие · курс · ДЗ">
          <div className="grid-cards">
            <div className="dcard">
              <div className="dcard-head">
                <span className="icon-chip"><Calculator /></span>
                <div>
                  <div className="dcard-title">Введение в линейные уравнения</div>
                  <div className="dcard-meta">Иван Петров · 10:00</div>
                </div>
              </div>
              <div className="dcard-foot">
                <Badge tone="warning" dot>через 5 мин</Badge>
                <Btn variant="primary" size="sm" icon={Video}>Присоединиться</Btn>
              </div>
            </div>

            <div className="dcard">
              <div className="dcard-head">
                <span className="icon-chip"><BookOpen /></span>
                <div>
                  <div className="dcard-title">Разговорный английский</div>
                  <div className="dcard-meta">Елена Смирнова · 15 уроков</div>
                </div>
              </div>
              <div>
                <div className="progress"><i style={{ width: '60%' }} /></div>
                <div className="progress-label">60% пройдено</div>
              </div>
              <div className="dcard-foot">
                <Badge tone="accent">активен</Badge>
                <Btn variant="secondary" size="sm">Продолжить</Btn>
              </div>
            </div>

            <div className="dcard">
              <div className="dcard-head">
                <span className="icon-chip"><FileText /></span>
                <div>
                  <div className="dcard-title">Решить 3 уравнения</div>
                  <div className="dcard-meta">Срок: чт, 23:59</div>
                </div>
              </div>
              <div className="dcard-foot">
                <Badge tone="info" dot>на проверке</Badge>
                <Btn variant="ghost" size="sm">Открыть</Btn>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Таблица — аналитика группы">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Студент</th><th>Внимание</th><th>Средний балл</th><th>Посещаемость</th><th>Статус</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="t-name"><Avatar size="sm" initials="ПС" />Пётр Сидоров</span></td>
                  <td className="num">87%</td><td className="num">4.6</td><td className="num">96%</td>
                  <td><Badge tone="success" dot>отлично</Badge></td>
                </tr>
                <tr>
                  <td><span className="t-name"><Avatar size="sm" initials="АК" />Анна Котова</span></td>
                  <td className="num">72%</td><td className="num">4.1</td><td className="num">88%</td>
                  <td><Badge tone="neutral">в норме</Badge></td>
                </tr>
                <tr>
                  <td><span className="t-name"><Avatar size="sm" initials="НИ" />Коля Иванов</span></td>
                  <td className="num">48%</td><td className="num">3.4</td><td className="num">61%</td>
                  <td><Badge tone="warning" dot>внимание</Badge></td>
                </tr>
                <tr>
                  <td><span className="t-name"><Avatar size="sm" initials="МЛ" />Мария Лебедева</span></td>
                  <td className="num">91%</td><td className="num">4.9</td><td className="num">100%</td>
                  <td><Badge tone="success" dot>отлично</Badge></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Бейджи статусов">
          <div className="panel">
            <div className="cluster">
              <Badge tone="success" dot>успех</Badge>
              <Badge tone="warning" dot>warning</Badge>
              <Badge tone="error" dot>ошибка</Badge>
              <Badge tone="info" dot>инфо</Badge>
              <Badge tone="accent">акцент</Badge>
              <Badge tone="neutral">нейтральный</Badge>
            </div>
          </div>
        </Section>

        <Section title="Табы">
          <div className="panel">
            <div className="tabs">
              {['Студенты', 'Сильные стороны', 'Рекомендации'].map((t, i) => (
                <button key={i} className={'tab' + (tab === i ? ' is-active' : '')} onClick={() => setTab(i)}>{t}</button>
              ))}
            </div>
            <div className="tab-body">{tabContent[tab]}</div>
          </div>
        </Section>

        <Section title="Аватары">
          <div className="panel">
            <div className="cluster" style={{ gap: 'var(--space-5)' }}>
              <Avatar size="sm" initials="ИП" />
              <Avatar size="md" initials="ЕС" />
              <Avatar size="lg" initials="АК" />
              <Avatar size="md" initials="ПС" status />
            </div>
          </div>
        </Section>

        <Section title="Навигация">
          <nav className="nav">
            <button className="nav-item is-active"><LayoutDashboard />Дашборд</button>
            <button className="nav-item"><Calendar />Расписание</button>
            <button className="nav-item"><BookOpen />Курсы</button>
            <button className="nav-item"><FileText />Домашние задания</button>
            <button className="nav-item"><BarChart3 />Аналитика</button>
            <button className="nav-item"><Settings />Настройки</button>
          </nav>
        </Section>

        <Section title="Модалка и тосты — интерактивно">
          <div className="panel">
            <div className="cluster">
              <Btn variant="primary" onClick={() => setModal(true)}>Открыть модалку</Btn>
              <Btn variant="secondary" onClick={() => addToast('success', 'Оценка сохранена: 5')}>Тост: успех</Btn>
              <Btn variant="secondary" onClick={() => addToast('error', 'Не удалось отправить ДЗ')}>Тост: ошибка</Btn>
              <Btn variant="secondary" onClick={() => addToast('info', 'Занятие начнётся через 5 минут')}>Тост: инфо</Btn>
            </div>
          </div>
        </Section>

      </div>

      {modal && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="dialog" role="dialog" aria-modal="true">
            <h3>Завершить занятие?</h3>
            <p>Трансляция остановится, запись сохранится и станет доступна ученикам. Это действие нельзя отменить.</p>
            <div className="actions">
              <Btn variant="ghost" onClick={() => setModal(false)}>Отмена</Btn>
              <Btn variant="danger" onClick={() => { setModal(false); addToast('success', 'Занятие завершено'); }}>Завершить</Btn>
            </div>
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={'toast ' + t.kind}>
              {t.kind === 'success' && <CheckCircle2 />}
              {t.kind === 'error' && <AlertTriangle />}
              {t.kind === 'info' && <Info />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
