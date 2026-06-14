import React, { useState } from 'react';
import {
  LayoutDashboard, BookOpen, ClipboardCheck, BarChart3, Settings, Search, Bell, Sun, Moon,
  Video, Clock, FileText, Eye, Users, Plus, ChevronRight, ArrowLeft, GripVertical, Pencil,
  Play, Upload, Paperclip, Monitor, MessageSquare, X, Check, CheckCircle2, AlertTriangle,
  Info, TrendingUp, Calculator, MoreVertical, AlertCircle, ChevronDown
} from 'lucide-react';

const css = `
.fl-root{
  --fl-white:#fff;
  --fl-warm-50:#fbf8f2;--fl-warm-100:#f4efe6;--fl-warm-150:#ede7db;--fl-warm-200:#e0d8ca;--fl-warm-300:#cfc3b0;
  --fl-warm-400:#a99d87;--fl-warm-500:#8b7f69;--fl-warm-600:#6e6456;--fl-warm-700:#4e473e;--fl-warm-800:#34302a;--fl-warm-900:#2a2520;
  --fl-coral-50:#fbede6;--fl-coral-100:#f6d8c8;--fl-coral-400:#e8794f;--fl-coral-500:#d2562e;--fl-coral-600:#be4622;--fl-coral-700:#a23a1c;--fl-coral-800:#8a3017;
  --fl-success-500:#3f8f5f;--fl-success-700:#2e6b45;--fl-success-50:#e6f0e8;
  --fl-warning-500:#c8881c;--fl-warning-700:#8a5e0e;--fl-warning-50:#f7edd7;
  --fl-error-500:#c8392b;--fl-error-700:#a52a20;--fl-error-50:#f8e3df;
  --fl-info-500:#2f74a8;--fl-info-700:#1f5780;--fl-info-50:#e1ecf4;
  --fl-dark-bg:#232019;--fl-dark-surface:#2c2820;--fl-dark-surface-2:#353027;--fl-dark-border:#3a352c;--fl-dark-text:#f1ebdf;--fl-dark-text-2:#cabfa9;
  --fl-shadow-rgb:42,37,32;
  --color-bg:var(--fl-warm-100);--color-surface:var(--fl-warm-50);--color-surface-subtle:var(--fl-warm-150);--color-surface-hover:var(--fl-warm-150);
  --color-border:var(--fl-warm-200);--color-border-strong:var(--fl-warm-300);
  --color-text:var(--fl-warm-900);--color-text-secondary:var(--fl-warm-600);--color-text-tertiary:var(--fl-warm-500);--color-text-disabled:var(--fl-warm-400);--color-text-on-accent:var(--fl-white);
  --color-accent:var(--fl-coral-500);--color-accent-strong:var(--fl-coral-600);--color-accent-hover:var(--fl-coral-700);--color-accent-pressed:var(--fl-coral-800);
  --color-accent-text:var(--fl-coral-700);--color-accent-subtle:var(--fl-coral-50);--color-accent-subtle-border:var(--fl-coral-100);
  --color-success:var(--fl-success-500);--color-success-text:var(--fl-success-700);--color-success-bg:var(--fl-success-50);
  --color-warning:var(--fl-warning-500);--color-warning-text:var(--fl-warning-700);--color-warning-bg:var(--fl-warning-50);
  --color-error:var(--fl-error-500);--color-error-text:var(--fl-error-700);--color-error-bg:var(--fl-error-50);
  --color-info:var(--fl-info-500);--color-info-text:var(--fl-info-700);--color-info-bg:var(--fl-info-50);
  --color-overlay:rgba(var(--fl-shadow-rgb),0.45);
  --font-heading:'IBM Plex Sans',system-ui,sans-serif;--font-body:'Golos Text','IBM Plex Sans',system-ui,sans-serif;--font-mono:'IBM Plex Mono',ui-monospace,monospace;
  --weight-regular:400;--weight-medium:500;--weight-semibold:600;
  --text-h1:2rem;--text-h2:1.625rem;--text-h3:1.25rem;--text-lead:1.125rem;--text-body:1rem;--text-small:0.875rem;--text-caption:0.8125rem;--text-overline:0.75rem;
  --leading-tight:1.1;--leading-snug:1.4;--leading-body:1.6;--tracking-wide:0.06em;--tracking-snug:-0.01em;
  --space-1:4px;--space-2:8px;--space-3:12px;--space-4:16px;--space-5:20px;--space-6:24px;--space-7:32px;--space-8:40px;--space-9:48px;
  --radius-xs:4px;--radius-sm:8px;--radius-md:12px;--radius-lg:16px;--radius-pill:999px;--radius-control:10px;--radius-card:16px;
  --shadow-sm:0 1px 2px rgba(var(--fl-shadow-rgb),0.05),0 2px 6px rgba(var(--fl-shadow-rgb),0.06);
  --shadow-md:0 2px 4px rgba(var(--fl-shadow-rgb),0.05),0 6px 16px rgba(var(--fl-shadow-rgb),0.09);
  --shadow-lg:0 4px 8px rgba(var(--fl-shadow-rgb),0.06),0 16px 32px rgba(var(--fl-shadow-rgb),0.12);
  --duration-fast:120ms;--duration-base:200ms;--ease-standard:cubic-bezier(0.2,0,0,1);--ease-out:cubic-bezier(0,0,0,1);
  --control-height-sm:32px;--control-height-md:40px;--control-height-lg:48px;--tap-min:44px;
  --focus-ring:0 0 0 3px rgba(210,86,46,0.45);--z-modal:1300;--z-toast:1400;
}
.fl-root[data-theme="dark"]{
  --color-bg:var(--fl-dark-bg);--color-surface:var(--fl-dark-surface);--color-surface-subtle:var(--fl-dark-surface-2);--color-surface-hover:var(--fl-dark-surface-2);
  --color-border:var(--fl-dark-border);--color-border-strong:#4a4438;
  --color-text:var(--fl-dark-text);--color-text-secondary:var(--fl-dark-text-2);--color-text-tertiary:#9a8f79;--color-text-disabled:#6e6452;
  --color-accent-text:var(--fl-coral-400);--color-accent-subtle:#3a241b;--color-accent-subtle-border:#5a3018;
  --color-success-bg:#1e3328;--color-warning-bg:#322a14;--color-error-bg:#3a201c;--color-info-bg:#1c2f3f;
  --color-overlay:rgba(0,0,0,0.6);
  --shadow-sm:0 2px 6px rgba(0,0,0,0.45);--shadow-md:0 6px 16px rgba(0,0,0,0.5);--shadow-lg:0 16px 32px rgba(0,0,0,0.55);
  --focus-ring:0 0 0 3px rgba(232,121,79,0.5);
}
*{box-sizing:border-box;margin:0;padding:0}
.fl-root{background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);-webkit-font-smoothing:antialiased;min-height:100vh;transition:background var(--duration-base) var(--ease-standard),color var(--duration-base) var(--ease-standard)}

/* shell */
.shell{display:flex;min-height:100vh}
.sidebar{width:240px;flex-shrink:0;border-right:1px solid var(--color-border);background:var(--color-surface);padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-1)}
.side-logo{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-h3);letter-spacing:var(--tracking-snug);display:inline-flex;align-items:flex-end;padding:var(--space-3);margin-bottom:var(--space-3)}
.side-logo .d{width:8px;height:8px;border-radius:50%;background:var(--color-accent);margin-left:5px;margin-bottom:3px}
.nav-item{display:flex;align-items:center;gap:var(--space-3);width:100%;text-align:left;font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;padding:var(--space-3);border-radius:var(--radius-sm);cursor:pointer;min-height:var(--tap-min);transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard)}
.nav-item svg{width:20px;height:20px;flex-shrink:0}
.nav-item:hover{background:var(--color-surface-hover);color:var(--color-text)}
.nav-item.is-active{background:var(--color-accent-subtle);color:var(--color-accent-text)}
.nav-item:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.nav-sep{flex:1}
.main{flex:1;min-width:0;display:flex;flex-direction:column}
.topbar{height:64px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:var(--space-4);padding:0 var(--space-6);background:var(--color-surface)}
.searchbox{flex:1;max-width:360px;position:relative;display:flex;align-items:center}
.searchbox svg{position:absolute;left:var(--space-3);width:18px;height:18px;color:var(--color-text-tertiary)}
.searchbox input{width:100%;height:var(--control-height-md);padding:0 var(--space-4) 0 var(--space-8);border:1px solid var(--color-border-strong);border-radius:var(--radius-pill);background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);font-size:var(--text-small)}
.searchbox input::placeholder{color:var(--color-text-tertiary)}
.searchbox input:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--focus-ring)}
.top-actions{margin-left:auto;display:flex;align-items:center;gap:var(--space-2)}
.content{padding:var(--space-7) var(--space-6);max-width:1080px;width:100%;margin:0 auto;flex:1}
@media(max-width:860px){.sidebar{display:none}}

/* shared bits */
.btn{font-family:var(--font-heading);font-weight:var(--weight-semibold);display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);border:1px solid transparent;border-radius:var(--radius-control);cursor:pointer;white-space:nowrap;line-height:1;transition:background var(--duration-fast) var(--ease-standard),transform var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard)}
.btn-sm{height:var(--control-height-sm);padding:0 var(--space-3);font-size:var(--text-small)}
.btn-md{height:var(--control-height-md);padding:0 var(--space-5);font-size:var(--text-body)}
.btn svg{width:1.15em;height:1.15em}
.btn-primary{background:var(--color-accent-strong);color:var(--color-text-on-accent)}
.btn-primary:hover{background:var(--color-accent-hover)}
.btn-primary:active{background:var(--color-accent-pressed);transform:translateY(1px)}
.btn-secondary{background:var(--color-surface);color:var(--color-text);border-color:var(--color-border-strong)}
.btn-secondary:hover{background:var(--color-surface-hover)}
.btn-ghost{background:transparent;color:var(--color-accent-text)}
.btn-ghost:hover{background:var(--color-accent-subtle)}
.btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.iconbtn{width:var(--tap-min);height:var(--tap-min);min-width:var(--tap-min);display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);border:0;background:transparent;color:var(--color-text-secondary);cursor:pointer;transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard)}
.iconbtn:hover{background:var(--color-surface-hover);color:var(--color-text)}
.iconbtn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.iconbtn svg{width:18px;height:18px}
.badge{display:inline-flex;align-items:center;gap:var(--space-1);font-family:var(--font-heading);font-size:var(--text-caption);font-weight:var(--weight-semibold);padding:3px 10px;border-radius:var(--radius-pill);line-height:1.45}
.badge .bdot{width:6px;height:6px;border-radius:50%;background:currentColor}
.badge-success{background:var(--color-success-bg);color:var(--color-success-text)}
.badge-warning{background:var(--color-warning-bg);color:var(--color-warning-text)}
.badge-error{background:var(--color-error-bg);color:var(--color-error-text)}
.badge-info{background:var(--color-info-bg);color:var(--color-info-text)}
.badge-accent{background:var(--color-accent-subtle);color:var(--color-accent-text)}
.badge-neutral{background:var(--color-surface-subtle);color:var(--color-text-secondary)}
.avatar{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--weight-semibold);background:var(--color-accent-subtle);color:var(--color-accent-text);flex-shrink:0}
.avatar-sm{width:32px;height:32px;font-size:var(--text-caption)}
.avatar-md{width:40px;height:40px;font-size:var(--text-small)}

/* page header */
.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-6);flex-wrap:wrap}
.page-title{font-family:var(--font-heading);font-size:var(--text-h1);font-weight:var(--weight-semibold);letter-spacing:var(--tracking-snug);line-height:var(--leading-tight)}
.page-sub{font-size:var(--text-body);color:var(--color-text-secondary);margin-top:var(--space-2)}
.back{display:inline-flex;align-items:center;gap:var(--space-2);background:transparent;border:0;color:var(--color-text-secondary);font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);cursor:pointer;margin-bottom:var(--space-4)}
.back:hover{color:var(--color-text)}
.back svg{width:16px;height:16px}

/* grids / cards */
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4)}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}
@media(max-width:720px){.grid-3,.grid-2{grid-template-columns:1fr}}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-5);box-shadow:var(--shadow-sm)}
.card-h{font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-text-secondary);margin-bottom:var(--space-4)}
.stat .label{font-size:var(--text-small);color:var(--color-text-secondary);display:flex;align-items:center;gap:var(--space-2)}
.stat .label svg{width:16px;height:16px}
.stat .value{font-family:var(--font-mono);font-size:var(--text-h1);font-weight:var(--weight-semibold);color:var(--color-text);margin-top:var(--space-3);font-variant-numeric:tabular-nums;line-height:1}
.stat .sub{font-size:var(--text-caption);color:var(--color-text-tertiary);margin-top:var(--space-2)}
.litem{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)}
.litem:last-child{border-bottom:0}
.litem .grow{flex:1;min-width:0}
.litem .t{font-size:var(--text-body);font-weight:var(--weight-medium);color:var(--color-text)}
.litem .m{font-size:var(--text-caption);color:var(--color-text-secondary);margin-top:1px}
.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.icon-chip{width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent-subtle);color:var(--color-accent-text);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.icon-chip svg{width:20px;height:20px}
.course-card{display:flex;flex-direction:column;gap:var(--space-3);cursor:pointer;transition:transform var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)}
.course-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-md)}
.course-title{font-family:var(--font-heading);font-size:var(--text-h3);font-weight:var(--weight-semibold);color:var(--color-text)}
.tagrow{display:flex;gap:var(--space-2);flex-wrap:wrap}

/* form */
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-5)}
@media(max-width:640px){.form-grid{grid-template-columns:1fr}}
.span-2{grid-column:1 / -1}
.field{display:flex;flex-direction:column}
.field-label{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);margin-bottom:var(--space-2)}
.input,.select,.textarea{font-family:var(--font-body);font-size:var(--text-body);color:var(--color-text);background:var(--color-surface);border:1px solid var(--color-border-strong);border-radius:var(--radius-control);height:var(--control-height-md);padding:0 var(--space-4);width:100%;transition:box-shadow var(--duration-fast) var(--ease-standard),border-color var(--duration-fast) var(--ease-standard)}
.textarea{height:auto;padding:var(--space-3) var(--space-4);min-height:96px;line-height:var(--leading-body);resize:vertical}
.input::placeholder,.textarea::placeholder{color:var(--color-text-tertiary)}
.input:focus,.select:focus,.textarea:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--focus-ring)}
.select-wrap{position:relative;display:flex}
.select{appearance:none;-webkit-appearance:none;padding-right:var(--space-8)}
.select-wrap svg{position:absolute;right:var(--space-3);top:50%;transform:translateY(-50%);color:var(--color-text-secondary);pointer-events:none;width:18px;height:18px}
.form-actions{display:flex;gap:var(--space-3);justify-content:flex-end;margin-top:var(--space-6);flex-wrap:wrap}

/* switch */
.switch{position:relative;display:inline-flex;align-items:center;gap:var(--space-3);cursor:pointer;font-size:var(--text-body);color:var(--color-text)}
.switch input{position:absolute;opacity:0;width:1px;height:1px}
.switch .track{width:44px;height:26px;border-radius:var(--radius-pill);background:var(--color-border-strong);transition:background var(--duration-fast) var(--ease-standard);flex-shrink:0;position:relative}
.switch .thumb{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:var(--fl-white);box-shadow:var(--shadow-sm);transition:transform var(--duration-fast) var(--ease-standard)}
.switch input:checked + .track{background:var(--color-accent-strong)}
.switch input:checked + .track .thumb{transform:translateX(18px)}
.switch input:focus-visible + .track{box-shadow:var(--focus-ring)}

/* course builder tree */
.section-block{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);box-shadow:var(--shadow-sm);margin-bottom:var(--space-4);overflow:hidden}
.section-head{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-4) var(--space-5);background:var(--color-surface-subtle);border-bottom:1px solid var(--color-border)}
.section-title{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-lead);flex:1}
.lesson-row{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) var(--space-5);border-bottom:1px solid var(--color-border);background:var(--color-surface);transition:background var(--duration-fast) var(--ease-standard)}
.lesson-row:last-child{border-bottom:0}
.lesson-row:hover{background:var(--color-surface-hover)}
.lesson-row.dragging{opacity:.4}
.lesson-row.over{box-shadow:inset 0 2px 0 var(--color-accent)}
.grip{color:var(--color-text-tertiary);cursor:grab;display:flex}
.grip svg{width:18px;height:18px}
.lesson-name{flex:1;font-size:var(--text-body);color:var(--color-text)}
.lesson-actions{display:flex;gap:2px}
.add-row{padding:var(--space-3) var(--space-5)}

/* schedule chips */
.chips{display:flex;gap:var(--space-2);flex-wrap:wrap}
.chip-day{width:44px;height:44px;border-radius:var(--radius-sm);border:1px solid var(--color-border-strong);background:var(--color-surface);font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);cursor:pointer;transition:all var(--duration-fast) var(--ease-standard)}
.chip-day.is-on{background:var(--color-accent-subtle);border-color:var(--color-accent-subtle-border);color:var(--color-accent-text)}
.chip-day:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.seg2{display:inline-flex;background:var(--color-surface-subtle);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:3px}
.seg2 button{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;padding:7px 16px;border-radius:var(--radius-pill);cursor:pointer}
.seg2 button.on{background:var(--color-surface);color:var(--color-text);box-shadow:var(--shadow-sm)}

/* dropzone */
.dropzone{border:1.5px dashed var(--color-border-strong);border-radius:var(--radius-md);padding:var(--space-7);text-align:center;color:var(--color-text-secondary);background:var(--color-surface-subtle);font-size:var(--text-small)}
.dropzone svg{width:26px;height:26px;color:var(--color-text-tertiary);margin-bottom:var(--space-2)}
.file-row{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);margin-top:var(--space-2);font-size:var(--text-small);color:var(--color-text)}
.file-row svg{width:18px;height:18px;color:var(--color-text-secondary)}
.file-row .grow{flex:1}
.option-row{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)}
.option-row:last-child{border-bottom:0}
.option-row .oi{display:flex;align-items:center;gap:var(--space-3);color:var(--color-text)}
.option-row .oi svg{width:20px;height:20px;color:var(--color-text-secondary)}

/* table */
.table-wrap{overflow-x:auto;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface)}
.table{width:100%;border-collapse:collapse;font-size:var(--text-small)}
.table th{text-align:left;font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-text-secondary);padding:var(--space-3) var(--space-4);background:var(--color-surface-subtle);border-bottom:1px solid var(--color-border)}
.table td{padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-border);color:var(--color-text)}
.table tr:last-child td{border-bottom:0}
.table tbody tr{transition:background var(--duration-fast) var(--ease-standard);cursor:pointer}
.table tbody tr:hover{background:var(--color-surface-hover)}
.t-name{display:flex;align-items:center;gap:var(--space-3)}

/* grading split */
.split{display:grid;grid-template-columns:1.4fr 1fr;gap:var(--space-5);align-items:start}
@media(max-width:820px){.split{grid-template-columns:1fr}}
.answer{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-6);box-shadow:var(--shadow-sm)}
.answer .doc{font-size:var(--text-body);line-height:var(--leading-body);color:var(--color-text)}
.answer .doc p{margin-bottom:var(--space-3)}
.answer .eq{font-family:var(--font-mono);background:var(--color-surface-subtle);padding:var(--space-3) var(--space-4);border-radius:var(--radius-sm);margin-bottom:var(--space-2);font-size:var(--text-small)}
.grade-panel{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-6);box-shadow:var(--shadow-sm)}
.score-row{display:flex;gap:var(--space-2)}
.score-btn{width:48px;height:48px;border-radius:var(--radius-sm);border:1px solid var(--color-border-strong);background:var(--color-surface);font-family:var(--font-mono);font-weight:var(--weight-semibold);font-size:var(--text-lead);color:var(--color-text);cursor:pointer;transition:all var(--duration-fast) var(--ease-standard)}
.score-btn.is-selected{background:var(--color-accent-strong);border-color:var(--color-accent-strong);color:var(--color-text-on-accent)}
.score-btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}

/* modal + toast */
.overlay{position:fixed;inset:0;background:var(--color-overlay);display:flex;align-items:center;justify-content:center;padding:var(--space-5);z-index:var(--z-modal);animation:fl-fade var(--duration-base) var(--ease-standard)}
.dialog{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);max-width:440px;width:100%;padding:var(--space-6);animation:fl-pop var(--duration-base) var(--ease-standard)}
.dialog h3{font-family:var(--font-heading);font-size:var(--text-h3);font-weight:var(--weight-semibold);margin-bottom:var(--space-3)}
.dialog p{font-size:var(--text-body);color:var(--color-text-secondary);line-height:var(--leading-body);margin-bottom:var(--space-6)}
.dialog .actions{display:flex;justify-content:flex-end;gap:var(--space-3)}
@keyframes fl-fade{from{opacity:0}to{opacity:1}}
@keyframes fl-pop{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
.toast-stack{position:fixed;right:var(--space-6);bottom:var(--space-6);display:flex;flex-direction:column;gap:var(--space-3);z-index:var(--z-toast);max-width:340px}
.toast{display:flex;align-items:flex-start;gap:var(--space-3);background:var(--color-surface);border:1px solid var(--color-border);border-left:4px solid var(--color-info);border-radius:var(--radius-md);box-shadow:var(--shadow-md);padding:var(--space-3) var(--space-4);font-size:var(--text-small);color:var(--color-text);animation:fl-slide var(--duration-base) var(--ease-out)}
.toast.success{border-left-color:var(--color-success)}.toast.success svg{color:var(--color-success)}
.toast.info{border-left-color:var(--color-info)}.toast.info svg{color:var(--color-info)}
.toast svg{width:20px;height:20px;flex-shrink:0;margin-top:1px}
@keyframes fl-slide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
.stack-6 > * + *{margin-top:var(--space-6)}
`;

function Badge({ tone, dot, children }) { return <span className={'badge badge-' + tone}>{dot && <span className="bdot" />}{children}</span>; }
function Field({ label, span, children }) { return <div className={'field' + (span ? ' span-2' : '')}><label className="field-label">{label}</label>{children}</div>; }
function Select({ children, ...p }) { return <div className="select-wrap"><select className="select" {...p}>{children}</select><ChevronDown /></div>; }
function Switch({ checked, onChange }) { return <label className="switch"><input type="checkbox" checked={checked} onChange={onChange} /><span className="track"><span className="thumb" /></span></label>; }

const STATUS = {
  submitted: { tone: 'info', label: 'сдал' },
  late: { tone: 'warning', label: 'опоздал' },
  missing: { tone: 'neutral', label: 'не сдал' },
  graded: { tone: 'success', label: 'оценено' },
};

function Sidebar({ active, go }) {
  const items = [
    ['dashboard', LayoutDashboard, 'Дашборд'],
    ['course', BookOpen, 'Мои курсы'],
    ['grading', ClipboardCheck, 'Оценивание'],
    ['analytics', BarChart3, 'Аналитика'],
  ];
  return (
    <aside className="sidebar">
      <span className="side-logo">flamingo<span className="d" /></span>
      {items.map(([key, Icon, label]) => (
        <button key={key} className={'nav-item' + (active === key ? ' is-active' : '')} onClick={() => go(key)}>
          <Icon />{label}
        </button>
      ))}
      <div className="nav-sep" />
      <button className="nav-item"><Settings />Настройки</button>
    </aside>
  );
}

function Topbar({ theme, setTheme }) {
  return (
    <div className="topbar">
      <div className="searchbox"><Search /><input placeholder="Поиск курсов, учеников…" aria-label="Поиск" /></div>
      <div className="top-actions">
        <button className="iconbtn" aria-label="Тема" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
        <button className="iconbtn" aria-label="Уведомления"><Bell /></button>
        <span className="avatar avatar-md">ИП</span>
      </div>
    </div>
  );
}

function Dashboard({ go, students }) {
  const upcoming = [
    { subj: 'Алгебра · 7Б', time: '10:00', when: 'через 25 мин', tone: 'warning' },
    { subj: 'Геометрия · 8А', time: '12:30', when: 'сегодня', tone: 'neutral' },
    { subj: 'Алгебра · 7В', time: '15:00', when: 'сегодня', tone: 'neutral' },
  ];
  const toCheck = students.filter((s) => (s.status === 'submitted' || s.status === 'late')).length;
  return (
    <div className="content stack-6">
      <div className="page-head">
        <div>
          <div className="page-title">Добрый день, Иван</div>
          <div className="page-sub">Сегодня 3 занятия и {toCheck} работ ждут проверки.</div>
        </div>
        <button className="btn btn-md btn-primary" onClick={() => go('createCourse')}><Plus />Создать курс</button>
      </div>

      <div className="grid-3">
        <div className="card stat"><div className="label"><Eye />Среднее внимание класса</div><div className="value">76%</div><div className="sub">+4% к прошлой неделе</div></div>
        <div className="card stat"><div className="label"><Video />Занятий сегодня</div><div className="value">3</div><div className="sub">ближайшее в 10:00</div></div>
        <div className="card stat"><div className="label"><FileText />На проверке</div><div className="value">{toCheck}</div><div className="sub">ДЗ «Решить 3 уравнения»</div></div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-h">Ближайшие занятия</div>
          {upcoming.map((u, i) => (
            <div className="litem" key={i}>
              <span className="icon-chip"><Calculator /></span>
              <div className="grow"><div className="t">{u.subj}</div><div className="m num">{u.time}</div></div>
              <Badge tone={u.tone} dot={u.tone === 'warning'}>{u.when}</Badge>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Недавние сдачи</span>
            <button className="btn btn-sm btn-ghost" onClick={() => go('grading')}>Все<ChevronRight /></button>
          </div>
          {students.slice(0, 4).map((s) => (
            <div className="litem" key={s.id} style={{ cursor: 'pointer' }} onClick={() => go('gradeOne', { student: s })}>
              <span className="avatar avatar-sm">{s.initials}</span>
              <div className="grow"><div className="t">{s.name}</div><div className="m">{s.date}</div></div>
              {s.grade ? <Badge tone="success" dot>{s.grade} баллов</Badge> : <Badge tone={STATUS[s.status].tone} dot={s.status !== 'missing'}>{STATUS[s.status].label}</Badge>}
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-h">Мои курсы</div>
        <div className="grid-2">
          <div className="card course-card" onClick={() => go('course')}>
            <span className="icon-chip"><Calculator /></span>
            <div className="course-title">Алгебра · 7 класс</div>
            <div className="tagrow"><Badge tone="neutral">Математика</Badge><Badge tone="accent">21 ученик</Badge><Badge tone="success" dot>опубликован</Badge></div>
          </div>
          <div className="card course-card" onClick={() => go('course')}>
            <span className="icon-chip"><BookOpen /></span>
            <div className="course-title">Геометрия · 7 класс</div>
            <div className="tagrow"><Badge tone="neutral">Математика</Badge><Badge tone="neutral">черновик</Badge></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateCourse({ go, addToast }) {
  return (
    <div className="content">
      <button className="back" onClick={() => go('dashboard')}><ArrowLeft />Назад к дашборду</button>
      <div className="page-head"><div className="page-title">Новый курс</div></div>
      <div className="card">
        <div className="form-grid">
          <Field label="Название курса" span><input className="input" placeholder="Например, Алгебра 7 класс" defaultValue="" /></Field>
          <Field label="Описание" span><textarea className="textarea" placeholder="Коротко о курсе: чему научатся ученики" /></Field>
          <Field label="Уровень"><Select defaultValue="7"><option value="7">7 класс</option><option value="8">8 класс</option><option value="9">9 класс</option><option value="ad">Взрослые</option></Select></Field>
          <Field label="Предмет"><Select defaultValue="math"><option value="math">Математика</option><option value="lang">Английский</option><option value="lit">Литература</option></Select></Field>
          <Field label="Язык"><Select defaultValue="ru"><option value="ru">Русский</option></Select></Field>
          <Field label="Обложка"><div className="select-wrap"><input className="input" placeholder="Загрузить изображение" disabled /></div></Field>
        </div>
        <div className="form-actions">
          <button className="btn btn-md btn-secondary" onClick={() => { addToast('info', 'Черновик сохранён'); go('course'); }}>Сохранить черновик</button>
          <button className="btn btn-md btn-primary" onClick={() => { addToast('success', 'Курс создан'); go('course'); }}>Создать и открыть</button>
        </div>
      </div>
    </div>
  );
}

function CourseView({ go, sections, setSections, addToast }) {
  const [drag, setDrag] = useState(null); // {sid, idx}
  const [over, setOver] = useState(null);

  const onDrop = (sid, idx) => {
    if (!drag || drag.sid !== sid) { setDrag(null); setOver(null); return; }
    setSections((prev) => prev.map((s) => {
      if (s.id !== sid) return s;
      const arr = [...s.lessons];
      const [moved] = arr.splice(drag.idx, 1);
      arr.splice(idx, 0, moved);
      return { ...s, lessons: arr };
    }));
    setDrag(null); setOver(null);
  };

  const addSection = () => setSections((prev) => [...prev, { id: 's' + Date.now(), title: 'Новый раздел', lessons: [] }]);

  return (
    <div className="content">
      <button className="back" onClick={() => go('dashboard')}><ArrowLeft />Все курсы</button>
      <div className="page-head">
        <div>
          <div className="page-title">Алгебра · 7 класс</div>
          <div className="tagrow" style={{ marginTop: 'var(--space-3)' }}><Badge tone="neutral">Математика</Badge><Badge tone="neutral">7 класс</Badge><Badge tone="accent">21 ученик</Badge><Badge tone="success" dot>опубликован</Badge></div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <button className="btn btn-md btn-secondary" onClick={addSection}><Plus />Раздел</button>
          <button className="btn btn-md btn-primary" onClick={() => go('createLesson')}><Plus />Занятие</button>
        </div>
      </div>

      <p className="page-sub" style={{ marginTop: 0, marginBottom: 'var(--space-5)' }}>Перетаскивайте занятия за ручку, чтобы изменить порядок.</p>

      {sections.map((s) => (
        <div className="section-block" key={s.id}>
          <div className="section-head"><span className="section-title">{s.title}</span><Badge tone="neutral">{s.lessons.length} занятий</Badge></div>
          {s.lessons.map((l, idx) => (
            <div
              key={l.id}
              className={'lesson-row' + (drag && drag.sid === s.id && drag.idx === idx ? ' dragging' : '') + (over && over.sid === s.id && over.idx === idx ? ' over' : '')}
              draggable
              onDragStart={() => setDrag({ sid: s.id, idx })}
              onDragOver={(e) => { e.preventDefault(); setOver({ sid: s.id, idx }); }}
              onDrop={() => onDrop(s.id, idx)}
              onDragEnd={() => { setDrag(null); setOver(null); }}
            >
              <span className="grip"><GripVertical /></span>
              <span className="lesson-name">{l.title}</span>
              {l.status === 'Опубликовано' ? <Badge tone="success" dot>опубликовано</Badge> : <Badge tone="neutral">черновик</Badge>}
              <span className="lesson-actions">
                <button className="iconbtn" aria-label="Редактировать" onClick={() => go('createLesson', { lessonTitle: l.title })}><Pencil /></button>
                <button className="iconbtn" aria-label="Проводить"><Play /></button>
                <button className="iconbtn" aria-label="Аналитика"><BarChart3 /></button>
                <button className="iconbtn" aria-label="Ещё"><MoreVertical /></button>
              </span>
            </div>
          ))}
          <div className="add-row"><button className="btn btn-sm btn-ghost" onClick={() => go('createLesson')}><Plus />Добавить занятие</button></div>
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
        <button className="btn btn-md btn-primary" onClick={() => addToast('success', 'Изменения курса сохранены')}><Check />Сохранить и опубликовать</button>
      </div>
    </div>
  );
}

function LessonEdit({ go, addToast, onPublish, lessonTitle }) {
  const [repeat, setRepeat] = useState(true);
  const [days, setDays] = useState({ Вт: true });
  const [opts, setOpts] = useState({ cam: true, screen: true, chat: true, hw: true });
  const week = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const optList = [
    ['cam', Video, 'Камера учеников'],
    ['screen', Monitor, 'Демонстрация экрана'],
    ['chat', MessageSquare, 'Чат'],
    ['hw', FileText, 'Домашнее задание'],
  ];
  return (
    <div className="content">
      <button className="back" onClick={() => go('course')}><ArrowLeft />К курсу</button>
      <div className="page-head"><div className="page-title">{lessonTitle ? 'Редактирование занятия' : 'Новое занятие'}</div></div>
      <div className="stack-6">
        <div className="card">
          <div className="form-grid">
            <Field label="Название" span><input className="input" defaultValue={lessonTitle || ''} placeholder="Например, Введение в линейные уравнения" /></Field>
            <Field label="Описание" span><textarea className="textarea" placeholder="Что разберём на занятии" /></Field>
            <Field label="Продолжительность"><div className="select-wrap"><input className="input" type="number" defaultValue="40" /><span style={{ position: 'absolute', right: 'var(--space-4)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-small)' }}>мин</span></div></Field>
            <Field label="Время начала"><input className="input" type="time" defaultValue="10:00" /></Field>
          </div>
        </div>

        <div className="card">
          <div className="card-h">Расписание</div>
          <div className="seg2" style={{ marginBottom: 'var(--space-4)' }}>
            <button className={!repeat ? 'on' : ''} onClick={() => setRepeat(false)}>Разовое</button>
            <button className={repeat ? 'on' : ''} onClick={() => setRepeat(true)}>По расписанию</button>
          </div>
          {repeat && (
            <div className="chips">
              {week.map((d) => (
                <button key={d} className={'chip-day' + (days[d] ? ' is-on' : '')} onClick={() => setDays((p) => ({ ...p, [d]: !p[d] }))}>{d}</button>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-h">Материалы</div>
          <div className="dropzone"><div><Upload /></div>Перетащите файлы сюда или нажмите, чтобы выбрать<br />PDF, PPT, изображения</div>
          <div className="file-row"><Paperclip /><span className="grow">Слайды · линейные уравнения.pdf</span><button className="iconbtn" aria-label="Удалить"><X /></button></div>
          <div className="file-row"><Paperclip /><span className="grow">Задачник · стр. 45.pdf</span><button className="iconbtn" aria-label="Удалить"><X /></button></div>
        </div>

        <div className="card">
          <div className="card-h">Возможности занятия</div>
          {optList.map(([key, Icon, label]) => (
            <div className="option-row" key={key}>
              <span className="oi"><Icon />{label}</span>
              <Switch checked={opts[key]} onChange={() => setOpts((p) => ({ ...p, [key]: !p[key] }))} />
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn btn-md btn-secondary" onClick={() => { addToast('info', 'Черновик занятия сохранён'); go('course'); }}>Сохранить черновик</button>
          <button className="btn btn-md btn-primary" onClick={() => { onPublish('Новое занятие'); addToast('success', 'Занятие опубликовано, ученики уведомлены'); go('course'); }}>Опубликовать</button>
        </div>
      </div>
    </div>
  );
}

function GradingList({ go, students }) {
  const counts = students.reduce((a, s) => { const k = s.grade ? 'graded' : s.status; a[k] = (a[k] || 0) + 1; return a; }, {});
  return (
    <div className="content">
      <div className="page-head">
        <div>
          <div className="page-title">Оценивание</div>
          <div className="page-sub">ДЗ «Решить 3 уравнения» · Алгебра 7Б · срок чт, 23:59</div>
        </div>
      </div>
      <div className="tagrow" style={{ marginBottom: 'var(--space-5)' }}>
        <Badge tone="info" dot>{(counts.submitted || 0)} сдали</Badge>
        <Badge tone="warning" dot>{(counts.late || 0)} опоздали</Badge>
        <Badge tone="success" dot>{(counts.graded || 0)} оценено</Badge>
        <Badge tone="neutral">{(counts.missing || 0)} не сдали</Badge>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Студент</th><th>Сдано</th><th>Статус</th><th style={{ textAlign: 'right' }}>Действие</th></tr></thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} onClick={() => s.status !== 'missing' && go('gradeOne', { student: s })}>
                <td><span className="t-name"><span className="avatar avatar-sm">{s.initials}</span>{s.name}</span></td>
                <td className="num">{s.date}</td>
                <td>{s.grade ? <Badge tone="success" dot>{s.grade} баллов</Badge> : <Badge tone={STATUS[s.status].tone} dot={s.status !== 'missing'}>{STATUS[s.status].label}</Badge>}</td>
                <td style={{ textAlign: 'right' }}>
                  {s.status === 'missing'
                    ? <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-small)' }}>—</span>
                    : <button className="btn btn-sm btn-ghost">{s.grade ? 'Изменить' : 'Проверить'}<ChevronRight /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GradeOne({ student, go, onGrade, addToast }) {
  const [score, setScore] = useState(student.grade || null);
  const [allowRedo, setAllowRedo] = useState(false);
  return (
    <div className="content">
      <button className="back" onClick={() => go('grading')}><ArrowLeft />К списку работ</button>
      <div className="page-head">
        <div>
          <div className="page-title">{student.name}</div>
          <div className="page-sub">ДЗ «Решить 3 уравнения» · сдано {student.date}</div>
        </div>
        {student.status === 'late' && <Badge tone="warning" dot>опоздал</Badge>}
      </div>

      <div className="split">
        <div className="answer">
          <div className="card-h">Ответ ученика</div>
          <div className="doc">
            <p>Решение трёх уравнений со страницы 45:</p>
            <div className="eq">№1.  3x + 5 = 20  →  3x = 15  →  x = 5</div>
            <div className="eq">№2.  2(x − 4) = 10  →  x − 4 = 5  →  x = 9</div>
            <div className="eq">№3.  x/2 + 3 = 7  →  x/2 = 4  →  x = 8</div>
            <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>Приложен файл: <span style={{ color: 'var(--color-accent-text)' }}>решение_тетрадь.jpg</span></p>
          </div>
        </div>

        <div className="grade-panel">
          <div className="card-h">Оценка</div>
          <div className="score-row">
            {[2, 3, 4, 5].map((n) => (
              <button key={n} className={'score-btn' + (score === n ? ' is-selected' : '')} onClick={() => setScore(n)}>{n}</button>
            ))}
          </div>
          <div style={{ marginTop: 'var(--space-5)' }}>
            <label className="field-label">Комментарий</label>
            <textarea className="textarea" placeholder="Что получилось, на что обратить внимание" defaultValue="Молодец! Уравнения решены верно, но обрати внимание на оформление." />
          </div>
          <label className="switch" style={{ marginTop: 'var(--space-5)' }}>
            <input type="checkbox" checked={allowRedo} onChange={() => setAllowRedo(!allowRedo)} />
            <span className="track"><span className="thumb" /></span>
            Разрешить переделать
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
            <button className="btn btn-md btn-secondary" style={{ flex: 1 }} onClick={() => go('grading')}>Отмена</button>
            <button className="btn btn-md btn-primary" style={{ flex: 1 }} disabled={!score}
              onClick={() => { onGrade(student.id, score); addToast('success', 'Оценка сохранена: ' + score); go('grading'); }}>
              <Check />Готово
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherPrototype() {
  const [theme, setTheme] = useState('light');
  const [screen, setScreen] = useState('dashboard');
  const [selStudent, setSelStudent] = useState(null);
  const [selLesson, setSelLesson] = useState(null);
  const [toasts, setToasts] = useState([]);

  const [sections, setSections] = useState([
    { id: 's1', title: 'Раздел 1 · Линейные уравнения', lessons: [
      { id: 'l1', title: 'Введение в линейные уравнения', status: 'Опубликовано' },
      { id: 'l2', title: 'Решение уравнений с одной переменной', status: 'Опубликовано' },
      { id: 'l3', title: 'Уравнения с дробями', status: 'Черновик' },
    ] },
    { id: 's2', title: 'Раздел 2 · Линейные функции', lessons: [
      { id: 'l4', title: 'Понятие функции', status: 'Черновик' },
      { id: 'l5', title: 'График линейной функции', status: 'Черновик' },
    ] },
  ]);

  const [students, setStudents] = useState([
    { id: 1, name: 'Пётр Сидоров', initials: 'ПС', status: 'submitted', date: 'ср, 19:04', grade: null },
    { id: 2, name: 'Анна Котова', initials: 'АК', status: 'submitted', date: 'ср, 21:30', grade: null },
    { id: 3, name: 'Коля Иванов', initials: 'НИ', status: 'late', date: 'чт, 08:12', grade: null },
    { id: 4, name: 'Мария Лебедева', initials: 'МЛ', status: 'submitted', date: 'ср, 18:00', grade: 5 },
    { id: 5, name: 'Дмитрий Орлов', initials: 'ДО', status: 'missing', date: '—', grade: null },
  ]);

  const addToast = (kind, text) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  };
  const go = (s, payload = {}) => {
    if (payload.student) setSelStudent(payload.student);
    setSelLesson(payload.lessonTitle || null);
    setScreen(s);
  };
  const onGrade = (id, score) => setStudents((prev) => prev.map((s) => s.id === id ? { ...s, grade: score, status: 'graded' } : s));
  const onPublishLesson = (title) => setSections((prev) => prev.map((s, i) => i === 0 ? { ...s, lessons: [...s.lessons, { id: 'l' + Date.now(), title, status: 'Опубликовано' }] } : s));

  const navActive = (screen === 'createCourse' || screen === 'course' || screen === 'createLesson') ? 'course'
    : (screen === 'grading' || screen === 'gradeOne') ? 'grading' : screen;

  return (
    <div className="fl-root" data-theme={theme === 'dark' ? 'dark' : undefined}>
      <style>{css}</style>
      <div className="shell">
        <Sidebar active={navActive} go={go} />
        <div className="main">
          <Topbar theme={theme} setTheme={setTheme} />
          {screen === 'dashboard' && <Dashboard go={go} students={students} />}
          {screen === 'createCourse' && <CreateCourse go={go} addToast={addToast} />}
          {screen === 'course' && <CourseView go={go} sections={sections} setSections={setSections} addToast={addToast} />}
          {screen === 'createLesson' && <LessonEdit go={go} addToast={addToast} onPublish={onPublishLesson} lessonTitle={selLesson} />}
          {screen === 'grading' && <GradingList go={go} students={students} />}
          {screen === 'gradeOne' && selStudent && <GradeOne student={selStudent} go={go} onGrade={onGrade} addToast={addToast} />}
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className={'toast ' + t.kind}>
              {t.kind === 'success' && <CheckCircle2 />}
              {t.kind === 'info' && <Info />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
