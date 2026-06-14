import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Calendar, BookOpen, FileText, BarChart3, Settings, Search, Bell, Sun, Moon,
  Video, VideoOff, Mic, MicOff, Hand, MessageSquare, PhoneOff, ShieldCheck, Clock, Play,
  Star, Trophy, Flame, ChevronRight, ArrowLeft, Send, Paperclip, Bold, Italic, List as ListIcon,
  Check, CheckCircle2, Info, Sparkles, Calculator, TrendingUp, Eye, Upload, X
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
  --fl-shadow-rgb:42,37,32;--fl-video-bg:#1b1812;--fl-video-text:#f1ebdf;
  --color-bg:var(--fl-warm-100);--color-surface:var(--fl-warm-50);--color-surface-subtle:var(--fl-warm-150);--color-surface-hover:var(--fl-warm-150);
  --color-border:var(--fl-warm-200);--color-border-strong:var(--fl-warm-300);
  --color-text:var(--fl-warm-900);--color-text-secondary:var(--fl-warm-600);--color-text-tertiary:var(--fl-warm-500);--color-text-disabled:var(--fl-warm-400);--color-text-on-accent:var(--fl-white);
  --color-accent:var(--fl-coral-500);--color-accent-strong:var(--fl-coral-600);--color-accent-hover:var(--fl-coral-700);--color-accent-pressed:var(--fl-coral-800);
  --color-accent-text:var(--fl-coral-700);--color-accent-subtle:var(--fl-coral-50);--color-accent-subtle-border:var(--fl-coral-100);
  --color-success:var(--fl-success-500);--color-success-text:var(--fl-success-700);--color-success-bg:var(--fl-success-50);
  --color-warning:var(--fl-warning-500);--color-warning-text:var(--fl-warning-700);--color-warning-bg:var(--fl-warning-50);
  --color-error:var(--fl-error-500);--color-error-text:var(--fl-error-700);--color-error-bg:var(--fl-error-50);
  --color-info:var(--fl-info-500);--color-info-text:var(--fl-info-700);--color-info-bg:var(--fl-info-50);
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
  --focus-ring:0 0 0 3px rgba(210,86,46,0.45);--z-toast:1400;
}
.fl-root[data-theme="dark"]{
  --color-bg:var(--fl-dark-bg);--color-surface:var(--fl-dark-surface);--color-surface-subtle:var(--fl-dark-surface-2);--color-surface-hover:var(--fl-dark-surface-2);
  --color-border:var(--fl-dark-border);--color-border-strong:#4a4438;
  --color-text:var(--fl-dark-text);--color-text-secondary:var(--fl-dark-text-2);--color-text-tertiary:#9a8f79;--color-text-disabled:#6e6452;
  --color-accent-text:var(--fl-coral-400);--color-accent-subtle:#3a241b;--color-accent-subtle-border:#5a3018;
  --color-success-bg:#1e3328;--color-warning-bg:#322a14;--color-error-bg:#3a201c;--color-info-bg:#1c2f3f;
  --shadow-sm:0 2px 6px rgba(0,0,0,0.45);--shadow-md:0 6px 16px rgba(0,0,0,0.5);--shadow-lg:0 16px 32px rgba(0,0,0,0.55);
  --focus-ring:0 0 0 3px rgba(232,121,79,0.5);
}
*{box-sizing:border-box;margin:0;padding:0}
.fl-root{background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);-webkit-font-smoothing:antialiased;min-height:100vh;transition:background var(--duration-base) var(--ease-standard),color var(--duration-base) var(--ease-standard)}

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
.topbar{height:64px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:var(--space-3);padding:0 var(--space-6);background:var(--color-surface)}
.searchbox{flex:1;max-width:340px;position:relative;display:flex;align-items:center}
.searchbox svg{position:absolute;left:var(--space-3);width:18px;height:18px;color:var(--color-text-tertiary)}
.searchbox input{width:100%;height:var(--control-height-md);padding:0 var(--space-4) 0 var(--space-8);border:1px solid var(--color-border-strong);border-radius:var(--radius-pill);background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);font-size:var(--text-small)}
.searchbox input:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--focus-ring)}
.top-actions{margin-left:auto;display:flex;align-items:center;gap:var(--space-2)}
.chip-stat{display:inline-flex;align-items:center;gap:var(--space-2);background:var(--color-surface-subtle);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:6px 12px;font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text)}
.chip-stat svg{width:16px;height:16px}
.content{padding:var(--space-7) var(--space-6);max-width:1080px;width:100%;margin:0 auto;flex:1}
@media(max-width:860px){.sidebar{display:none}.chip-stat.hideable{display:none}}

.btn{font-family:var(--font-heading);font-weight:var(--weight-semibold);display:inline-flex;align-items:center;justify-content:center;gap:var(--space-2);border:1px solid transparent;border-radius:var(--radius-control);cursor:pointer;white-space:nowrap;line-height:1;transition:background var(--duration-fast) var(--ease-standard),transform var(--duration-fast) var(--ease-standard),box-shadow var(--duration-fast),border-color var(--duration-fast)}
.btn-sm{height:var(--control-height-sm);padding:0 var(--space-3);font-size:var(--text-small)}
.btn-md{height:var(--control-height-md);padding:0 var(--space-5);font-size:var(--text-body)}
.btn-lg{height:var(--control-height-lg);padding:0 var(--space-6);font-size:var(--text-lead)}
.btn svg{width:1.15em;height:1.15em}
.btn-primary{background:var(--color-accent-strong);color:var(--color-text-on-accent)}
.btn-primary:hover{background:var(--color-accent-hover)}
.btn-primary:active{background:var(--color-accent-pressed);transform:translateY(1px)}
.btn-secondary{background:var(--color-surface);color:var(--color-text);border-color:var(--color-border-strong)}
.btn-secondary:hover{background:var(--color-surface-hover)}
.btn-ghost{background:transparent;color:var(--color-accent-text)}
.btn-ghost:hover{background:var(--color-accent-subtle)}
.btn:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.btn:disabled{background:var(--color-surface-subtle);color:var(--color-text-disabled);border-color:var(--color-border);cursor:not-allowed;transform:none}
.iconbtn{width:var(--tap-min);height:var(--tap-min);min-width:var(--tap-min);display:inline-flex;align-items:center;justify-content:center;border-radius:var(--radius-sm);border:0;background:transparent;color:var(--color-text-secondary);cursor:pointer;transition:background var(--duration-fast),color var(--duration-fast)}
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

.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);margin-bottom:var(--space-6);flex-wrap:wrap}
.page-title{font-family:var(--font-heading);font-size:var(--text-h1);font-weight:var(--weight-semibold);letter-spacing:var(--tracking-snug);line-height:var(--leading-tight)}
.page-sub{font-size:var(--text-body);color:var(--color-text-secondary);margin-top:var(--space-2)}
.back{display:inline-flex;align-items:center;gap:var(--space-2);background:transparent;border:0;color:var(--color-text-secondary);font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);cursor:pointer;margin-bottom:var(--space-4)}
.back:hover{color:var(--color-text)}.back svg{width:16px;height:16px}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4)}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)}
@media(max-width:720px){.grid-3,.grid-2{grid-template-columns:1fr}}
.card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-5);box-shadow:var(--shadow-sm)}
.card-h{font-family:var(--font-heading);font-size:var(--text-overline);text-transform:uppercase;letter-spacing:var(--tracking-wide);font-weight:var(--weight-semibold);color:var(--color-text-secondary);margin-bottom:var(--space-4)}
.icon-chip{width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-accent-subtle);color:var(--color-accent-text);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.icon-chip svg{width:20px;height:20px}
.litem{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3) 0;border-bottom:1px solid var(--color-border)}
.litem:last-child{border-bottom:0}.litem .grow{flex:1;min-width:0}
.litem .t{font-size:var(--text-body);font-weight:var(--weight-medium)}.litem .m{font-size:var(--text-caption);color:var(--color-text-secondary);margin-top:1px}
.num{font-family:var(--font-mono);font-variant-numeric:tabular-nums}
.hscroll{display:flex;gap:var(--space-4);overflow-x:auto;padding-bottom:var(--space-2)}
.reco{min-width:268px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-5);box-shadow:var(--shadow-sm);display:flex;flex-direction:column;gap:var(--space-2)}
.reco .ico{color:var(--color-accent)}.reco .ico svg{width:22px;height:22px}
.reco .rt{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-body)}
.reco .rm{font-size:var(--text-small);color:var(--color-text-secondary);line-height:var(--leading-snug)}
.progress{height:8px;background:var(--color-surface-subtle);border-radius:var(--radius-pill);overflow:hidden}
.progress>i{display:block;height:100%;background:var(--color-accent-strong);border-radius:var(--radius-pill)}
.hero-today{display:flex;align-items:center;gap:var(--space-4);flex-wrap:wrap}
.hero-today .grow{flex:1;min-width:200px}

/* schedule */
.weekstrip{display:flex;gap:var(--space-2);margin-bottom:var(--space-5);flex-wrap:wrap}
.wday{flex:1;min-width:78px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);cursor:pointer;transition:all var(--duration-fast)}
.wday .dn{font-family:var(--font-heading);font-size:var(--text-caption);color:var(--color-text-secondary)}
.wday .dd{font-family:var(--font-mono);font-size:var(--text-lead);font-weight:var(--weight-semibold)}
.wday.is-on{background:var(--color-accent-subtle);border-color:var(--color-accent-subtle-border);color:var(--color-accent-text)}
.wday.is-on .dn{color:var(--color-accent-text)}
.wday:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.lcard{display:flex;align-items:center;gap:var(--space-4);background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-4) var(--space-5);box-shadow:var(--shadow-sm);margin-bottom:var(--space-3)}
.lcard .time{font-family:var(--font-mono);font-weight:var(--weight-semibold);font-size:var(--text-lead);min-width:56px}
.lcard .grow{flex:1;min-width:0}
.lcard .lt{font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-body)}
.lcard .lm{font-size:var(--text-caption);color:var(--color-text-secondary)}
.empty{padding:var(--space-9);text-align:center;color:var(--color-text-tertiary);font-size:var(--text-small)}

/* live class */
.stage{display:grid;grid-template-columns:1.7fr 1fr;gap:var(--space-4)}
@media(max-width:900px){.stage{grid-template-columns:1fr}}
.live-head{display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);margin-bottom:var(--space-4);flex-wrap:wrap}
.live-title{font-family:var(--font-heading);font-size:var(--text-h3);font-weight:var(--weight-semibold)}
.privacy{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--text-caption);color:var(--color-text-secondary)}
.privacy svg{width:15px;height:15px;color:var(--color-success)}
.board{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-6);min-height:340px;box-shadow:var(--shadow-sm);display:flex;flex-direction:column}
.board .blabel{font-size:var(--text-caption);color:var(--color-text-tertiary);margin-bottom:var(--space-4);display:flex;align-items:center;gap:var(--space-2)}
.board h4{font-family:var(--font-heading);font-size:var(--text-h3);margin-bottom:var(--space-4)}
.eq{font-family:var(--font-mono);background:var(--color-surface-subtle);padding:var(--space-3) var(--space-4);border-radius:var(--radius-sm);margin-bottom:var(--space-2);font-size:var(--text-body)}
.eq .step{color:var(--color-accent-text)}
.vpanel{background:var(--fl-video-bg);color:var(--fl-video-text);border-radius:var(--radius-card);padding:var(--space-4);position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:132px}
.vpanel .vname{position:absolute;left:var(--space-3);bottom:var(--space-3);font-size:var(--text-caption);background:rgba(0,0,0,.4);padding:2px 8px;border-radius:var(--radius-sm)}
.vpanel .va{width:56px;height:56px;border-radius:50%;background:#3a342a;color:#f1ebdf;display:flex;align-items:center;justify-content:center;font-family:var(--font-heading);font-weight:var(--weight-semibold);font-size:var(--text-lead)}
.live-badge{position:absolute;top:var(--space-3);left:var(--space-3);display:inline-flex;align-items:center;gap:6px;background:var(--color-error);color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:var(--radius-pill);font-family:var(--font-heading)}
.live-badge .pd{width:6px;height:6px;border-radius:50%;background:#fff;animation:fl-pulse 1.4s ease-in-out infinite}
@keyframes fl-pulse{0%,100%{opacity:1}50%{opacity:.3}}
.right-col{display:flex;flex-direction:column;gap:var(--space-4)}
.you .privacy{color:var(--fl-video-text);position:absolute;bottom:var(--space-3);right:var(--space-3);font-size:11px}
.you .privacy svg{color:#7bd1a0}
.attn{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);padding:var(--space-4);box-shadow:var(--shadow-sm)}
.attn .top{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:var(--space-2)}
.attn .lbl{font-size:var(--text-caption);color:var(--color-text-secondary);display:flex;align-items:center;gap:var(--space-1)}
.attn .lbl svg{width:14px;height:14px}
.attn .val{font-family:var(--font-mono);font-size:var(--text-h2);font-weight:var(--weight-semibold);color:var(--color-accent-text)}
.chat{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-card);box-shadow:var(--shadow-sm);display:flex;flex-direction:column;overflow:hidden}
.chat .msgs{padding:var(--space-4);display:flex;flex-direction:column;gap:var(--space-3);max-height:180px;overflow-y:auto}
.msg{font-size:var(--text-small);line-height:var(--leading-snug)}
.msg .who{font-family:var(--font-heading);font-weight:var(--weight-semibold);color:var(--color-accent-text);margin-right:var(--space-2)}
.chat .crow{display:flex;border-top:1px solid var(--color-border)}
.chat .crow input{flex:1;border:0;background:transparent;padding:var(--space-3) var(--space-4);color:var(--color-text);font-family:var(--font-body);font-size:var(--text-small)}
.chat .crow input:focus{outline:none}
.controlbar{display:flex;gap:var(--space-3);justify-content:center;align-items:center;margin-top:var(--space-5);flex-wrap:wrap}
.ctrl{width:52px;height:52px;border-radius:50%;border:1px solid var(--color-border-strong);background:var(--color-surface);color:var(--color-text);display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all var(--duration-fast)}
.ctrl:hover{background:var(--color-surface-hover)}
.ctrl.off{background:var(--color-error-bg);color:var(--color-error-text);border-color:var(--color-error-bg)}
.ctrl:focus-visible{outline:none;box-shadow:var(--focus-ring)}
.ctrl svg{width:20px;height:20px}
.leave{width:auto;border-radius:var(--radius-pill);padding:0 var(--space-5);height:52px;background:var(--color-error);color:#fff;border:0;font-family:var(--font-heading);font-weight:var(--weight-semibold);gap:var(--space-2)}

/* report */
.report-hero{display:grid;grid-template-columns:auto 1fr;gap:var(--space-6);align-items:center}
@media(max-width:640px){.report-hero{grid-template-columns:1fr}}
.bignum{font-family:var(--font-mono);font-size:3.5rem;font-weight:var(--weight-semibold);color:var(--color-accent-text);line-height:1}
.insight{background:var(--color-accent-subtle);border-left:4px solid var(--color-accent);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);font-size:var(--text-body);color:var(--color-text);line-height:var(--leading-body)}
.insight + .insight{margin-top:var(--space-3)}
.insight b{color:var(--color-accent-text)}

/* homework desk */
.toolbar{display:flex;gap:var(--space-1);padding:var(--space-2);border:1px solid var(--color-border-strong);border-bottom:0;border-radius:var(--radius-control) var(--radius-control) 0 0;background:var(--color-surface-subtle)}
.toolbar .iconbtn{width:36px;height:36px;min-width:36px}
.editor{font-family:var(--font-body);font-size:var(--text-body);color:var(--color-text);background:var(--color-surface);border:1px solid var(--color-border-strong);border-radius:0 0 var(--radius-control) var(--radius-control);padding:var(--space-4);min-height:160px;line-height:var(--leading-body);width:100%;resize:vertical}
.editor:focus{outline:none;border-color:var(--color-accent);box-shadow:var(--focus-ring)}
.dropzone{border:1.5px dashed var(--color-border-strong);border-radius:var(--radius-md);padding:var(--space-6);text-align:center;color:var(--color-text-secondary);background:var(--color-surface-subtle);font-size:var(--text-small)}
.dropzone svg{width:26px;height:26px;color:var(--color-text-tertiary);margin-bottom:var(--space-2)}
.file-row{display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-sm);margin-top:var(--space-2);font-size:var(--text-small)}
.file-row svg{width:18px;height:18px;color:var(--color-text-secondary)}.file-row .grow{flex:1}
.seg2{display:inline-flex;background:var(--color-surface-subtle);border:1px solid var(--color-border);border-radius:var(--radius-pill);padding:3px;margin-bottom:var(--space-4)}
.seg2 button{font-family:var(--font-heading);font-size:var(--text-small);font-weight:var(--weight-medium);color:var(--color-text-secondary);background:transparent;border:0;padding:7px 16px;border-radius:var(--radius-pill);cursor:pointer}
.seg2 button.on{background:var(--color-surface);color:var(--color-text);box-shadow:var(--shadow-sm)}

/* grade view */
.stars{display:flex;gap:var(--space-1)}
.stars svg{width:30px;height:30px;color:var(--color-warning)}
.comment-box{background:var(--color-surface-subtle);border-radius:var(--radius-md);padding:var(--space-4) var(--space-5);font-size:var(--text-body);line-height:var(--leading-body);color:var(--color-text);margin-top:var(--space-4)}
.comment-box .from{font-size:var(--text-caption);color:var(--color-text-secondary);margin-bottom:var(--space-2);display:flex;align-items:center;gap:var(--space-2)}

.toast-stack{position:fixed;right:var(--space-6);bottom:var(--space-6);display:flex;flex-direction:column;gap:var(--space-3);z-index:var(--z-toast);max-width:340px}
.toast{display:flex;align-items:flex-start;gap:var(--space-3);background:var(--color-surface);border:1px solid var(--color-border);border-left:4px solid var(--color-info);border-radius:var(--radius-md);box-shadow:var(--shadow-md);padding:var(--space-3) var(--space-4);font-size:var(--text-small);color:var(--color-text);animation:fl-slide var(--duration-base) var(--ease-out)}
.toast.success{border-left-color:var(--color-success)}.toast.success svg{color:var(--color-success)}
.toast.info{border-left-color:var(--color-info)}.toast.info svg{color:var(--color-info)}
.toast svg{width:20px;height:20px;flex-shrink:0;margin-top:1px}
@keyframes fl-slide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}
.stack-6 > * + *{margin-top:var(--space-6)}
`;

function Badge({ tone, dot, children }) { return <span className={'badge badge-' + tone}>{dot && <span className="bdot" />}{children}</span>; }

const HW_STATUS = {
  new: { tone: 'accent', label: 'Новое' },
  progress: { tone: 'warning', label: 'В процессе' },
  submitted: { tone: 'info', label: 'На проверке' },
  graded: { tone: 'success', label: 'Оценено' },
};

function LiveChart({ data }) {
  const W = 280, H = 92, P = 4, n = data.length;
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => (H - P) - (v / 100) * (H - 2 * P);
  const line = data.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const area = line + ' L ' + x(n - 1).toFixed(1) + ' ' + H + ' L ' + x(0).toFixed(1) + ' ' + H + ' Z';
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height="auto" preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d={area} fill="var(--color-accent-subtle)" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(data[n - 1])} r="3.5" fill="var(--color-accent)" />
    </svg>
  );
}

function ReportChart() {
  const d = [82, 84, 86, 88, 87, 85, 83, 80, 76, 72, 67, 63, 61, 79, 82, 81, 80, 78, 79, 78];
  const W = 600, H = 180, P = 28, n = d.length, avg = 77, breakIdx = 12.5;
  const x = (i) => P + (i / (n - 1)) * (W - 2 * P);
  const y = (v) => (H - P) - (v / 100) * (H - 2 * P);
  const line = d.map((v, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
  const area = line + ' L ' + x(n - 1).toFixed(1) + ' ' + (H - P) + ' L ' + x(0).toFixed(1) + ' ' + (H - P) + ' Z';
  const labels = [['0', 0], ['10 мин', 5], ['20 мин', 10], ['30 мин', 15], ['40 мин', 19]];
  return (
    <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" height="auto">
      <line x1={P} y1={y(avg)} x2={W - P} y2={y(avg)} stroke="var(--color-border-strong)" strokeWidth="1" strokeDasharray="4 4" />
      <text x={W - P} y={y(avg) - 6} textAnchor="end" fontSize="11" fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">среднее 77%</text>
      <line x1={x(breakIdx)} y1={P - 8} x2={x(breakIdx)} y2={H - P} stroke="var(--color-warning)" strokeWidth="1" strokeDasharray="3 3" />
      <text x={x(breakIdx) + 4} y={P} fontSize="11" fill="var(--color-warning-text)" fontFamily="var(--font-heading)">перерыв</text>
      <path d={area} fill="var(--color-accent-subtle)" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {labels.map(([t, i]) => <text key={t} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-text-tertiary)" fontFamily="var(--font-mono)">{t}</text>)}
    </svg>
  );
}

function Sidebar({ active, go }) {
  const items = [['dashboard', LayoutDashboard, 'Дашборд'], ['schedule', Calendar, 'Расписание'], ['courses', BookOpen, 'Мои курсы'], ['homeworkList', FileText, 'Мои ДЗ'], ['analysis', BarChart3, 'Анализ']];
  return (
    <aside className="sidebar">
      <span className="side-logo">flamingo<span className="d" /></span>
      {items.map(([k, Icon, l]) => <button key={k} className={'nav-item' + (active === k ? ' is-active' : '')} onClick={() => go(k)}><Icon />{l}</button>)}
      <div className="nav-sep" />
      <button className="nav-item"><Settings />Настройки</button>
    </aside>
  );
}
function Topbar({ theme, setTheme }) {
  return (
    <div className="topbar">
      <div className="searchbox"><Search /><input placeholder="Поиск курсов…" aria-label="Поиск" /></div>
      <div className="top-actions">
        <span className="chip-stat hideable"><Flame style={{ color: 'var(--color-accent)' }} />7 дней</span>
        <span className="chip-stat hideable"><Trophy style={{ color: 'var(--color-warning)' }} /><span className="num">1240</span></span>
        <button className="iconbtn" aria-label="Тема" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
        <button className="iconbtn" aria-label="Уведомления"><Bell /></button>
        <span className="avatar avatar-md">ПС</span>
      </div>
    </div>
  );
}

function Dashboard({ go }) {
  return (
    <div className="content stack-6">
      <div className="page-head">
        <div><div className="page-title">Привет, Пётр</div><div className="page-sub">Сегодня одно занятие и два задания. Так держать!</div></div>
      </div>

      <div className="card" style={{ background: 'var(--color-accent-subtle)', borderColor: 'var(--color-accent-subtle-border)' }}>
        <div className="hero-today">
          <span className="icon-chip" style={{ background: 'var(--color-surface)' }}><Calculator /></span>
          <div className="grow">
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lead)' }}>Алгебра · через 25 минут</div>
            <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>10:00 · Иван Петров · Введение в линейные уравнения</div>
          </div>
          <button className="btn btn-md btn-primary" onClick={() => go('live')}><Video />Присоединиться</button>
        </div>
      </div>

      <div className="grid-3">
        <div className="card"><div className="card-h">Внимание вчера</div><div className="num" style={{ fontSize: 'var(--text-h1)', fontWeight: 600, color: 'var(--color-accent-text)' }}>81%</div><div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>лучше всего на математике</div></div>
        <div className="card"><div className="card-h">Рейтинг в 7Б</div><div className="num" style={{ fontSize: 'var(--text-h1)', fontWeight: 600 }}>#4</div><div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>+2 за неделю</div></div>
        <div className="card"><div className="card-h">Задания</div><div className="num" style={{ fontSize: 'var(--text-h1)', fontWeight: 600 }}>2</div><div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>ближайший срок — чт</div></div>
      </div>

      <div>
        <div className="card-h">Рекомендации для тебя</div>
        <div className="hscroll">
          <div className="reco"><span className="ico"><Sparkles /></span><div className="rt">Занимайся утром</div><div className="rm">Ты сосредоточен в 8–10 часов — ставь сложные предметы на это время.</div></div>
          <div className="reco"><span className="ico"><Video /></span><div className="rt">Больше видео</div><div className="rm">На видео твоё внимание 92% против 64% на тексте. Вот курс с разборами.</div></div>
          <div className="reco"><span className="ico"><TrendingUp /></span><div className="rt">Английский рядом</div><div className="rm">До значка «Отличник» по английскому осталось одно задание.</div></div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">Мои курсы</div>
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}><span style={{ fontWeight: 500 }}>Алгебра · 7 класс</span><span className="num" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>72%</span></div>
          <div className="progress"><i style={{ width: '72%' }} /></div>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}><span style={{ fontWeight: 500 }}>Разговорный английский</span><span className="num" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>60%</span></div>
          <div className="progress"><i style={{ width: '60%' }} /></div>
        </div>
      </div>
    </div>
  );
}

function Schedule({ go }) {
  const [day, setDay] = useState(1);
  const week = [['Пн', 9], ['Вт', 10], ['Ср', 11], ['Чт', 12], ['Пт', 13], ['Сб', 14], ['Вс', 15]];
  const byDay = {
    1: [
      { time: '10:00', t: 'Алгебра', m: 'Иван Петров · линейные уравнения', live: true },
      { time: '12:30', t: 'Английский', m: 'Елена Смирнова · Present Simple', live: false },
      { time: '15:00', t: 'История', m: 'Ольга Белова · §12', live: false },
    ],
    2: [{ time: '11:00', t: 'Геометрия', m: 'Иван Петров · треугольники', live: false }],
  };
  const lessons = byDay[day] || [];
  return (
    <div className="content">
      <div className="page-head"><div className="page-title">Расписание</div></div>
      <div className="weekstrip">
        {week.map(([dn, dd], i) => <button key={i} className={'wday' + (day === i ? ' is-on' : '')} onClick={() => setDay(i)}><span className="dn">{dn}</span><span className="dd">{dd}</span></button>)}
      </div>
      {lessons.length === 0 ? <div className="card empty">На этот день занятий нет</div> : lessons.map((l, i) => (
        <div className="lcard" key={i}>
          <span className="time num">{l.time}</span>
          <span className="icon-chip"><Calculator /></span>
          <div className="grow"><div className="lt">{l.t}</div><div className="lm">{l.m}</div></div>
          {l.live ? <button className="btn btn-md btn-primary" onClick={() => go('live')}><Video />Присоединиться</button> : <Badge tone="neutral">{l.time}</Badge>}
        </div>
      ))}
    </div>
  );
}

function LiveClass({ go }) {
  const [data, setData] = useState(Array(24).fill(82));
  const [sec, setSec] = useState(0);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const last = data[data.length - 1];

  useEffect(() => {
    const t1 = setInterval(() => setData((prev) => {
      const p = prev[prev.length - 1];
      let next = p + (Math.random() * 16 - 8);
      if (Math.random() < 0.12) next -= 12;
      next = Math.max(58, Math.min(94, next));
      return [...prev.slice(1), Math.round(next)];
    }), 1500);
    const t2 = setInterval(() => setSec((s) => s + 1), 1000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  return (
    <div className="content">
      <div className="live-head">
        <div>
          <div className="live-title">Алгебра · Введение в линейные уравнения</div>
          <div className="page-sub" style={{ marginTop: 'var(--space-1)' }}>Иван Петров · <span className="num">{mm}:{ss}</span></div>
        </div>
        <span className="privacy"><ShieldCheck />Анализ на устройстве · видео не передаётся</span>
      </div>

      <div className="stage">
        <div className="board">
          <div className="blabel"><Play style={{ width: 14, height: 14 }} />Демонстрация экрана · Иван</div>
          <h4>Решаем линейное уравнение</h4>
          <div className="eq">3x + 5 = 20</div>
          <div className="eq"><span className="step">−5:</span>  3x = 15</div>
          <div className="eq"><span className="step">÷3:</span>  x = 5</div>
          <div style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-small)' }}>Проверка: 3·5 + 5 = 20 ✓</div>
        </div>

        <div className="right-col">
          <div className="vpanel">
            <span className="live-badge"><span className="pd" />LIVE</span>
            <div className="va">ИП</div>
            <span className="vname">Иван Петров</span>
          </div>
          <div className="vpanel you" style={{ minHeight: 108 }}>
            <div className="va">{cam ? 'ВЫ' : ''}{!cam && <VideoOff />}</div>
            <span className="vname">Вы</span>
            <span className="privacy"><ShieldCheck />on-device</span>
          </div>
          <div className="attn">
            <div className="top"><span className="lbl"><Eye />Внимание сейчас</span><span className="val num">{last}%</span></div>
            <LiveChart data={data} />
          </div>
          <div className="chat">
            <div className="msgs">
              <div className="msg"><span className="who">Иван</span>Кто скажет, что делаем первым шагом?</div>
              <div className="msg"><span className="who">Аня</span>Переносим пятёрку вправо</div>
              <div className="msg"><span className="who">Иван</span>Верно! Вычитаем 5 из обеих частей.</div>
            </div>
            <div className="crow"><input placeholder="Написать в чат…" aria-label="Чат" /><button className="iconbtn" aria-label="Отправить"><Send /></button></div>
          </div>
        </div>
      </div>

      <div className="controlbar">
        <button className={'ctrl' + (mic ? '' : ' off')} aria-label="Микрофон" onClick={() => setMic(!mic)}>{mic ? <Mic /> : <MicOff />}</button>
        <button className={'ctrl' + (cam ? '' : ' off')} aria-label="Камера" onClick={() => setCam(!cam)}>{cam ? <Video /> : <VideoOff />}</button>
        <button className="ctrl" aria-label="Поднять руку"><Hand /></button>
        <button className="ctrl" aria-label="Чат"><MessageSquare /></button>
        <button className="leave btn" onClick={() => go('report')}><PhoneOff />Завершить</button>
      </div>
    </div>
  );
}

function Report({ go }) {
  return (
    <div className="content stack-6">
      <div className="page-head">
        <div><div className="page-title">Занятие завершено</div><div className="page-sub">Запись доступна · Алгебра, 40 минут</div></div>
        <button className="btn btn-md btn-secondary"><Play />Смотреть запись</button>
      </div>

      <div className="card">
        <div className="report-hero">
          <div>
            <div style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>Среднее внимание</div>
            <div className="bignum">77%</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}><Badge tone="success" dot>пик 88%</Badge><Badge tone="warning" dot>спад 61%</Badge></div>
          </div>
          <div><ReportChart /></div>
        </div>
      </div>

      <div>
        <div className="insight"><b>Внимание упало после 30 минут.</b> В следующий раз попробуй короткий перерыв в середине занятия — после паузы фокус восстановился до 80%.</div>
        <div className="insight"><b>Тебе заходят видео-разборы.</b> На объяснении у доски ты держал 85%+. Ищи курсы с разборами на видео.</div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)' }}>
        <ShieldCheck style={{ width: 18, height: 18, color: 'var(--color-success)', flexShrink: 0 }} />
        На сервер ушли только обезличенные метрики внимания. Видео с камеры осталось на твоём устройстве.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-lg btn-primary" onClick={() => go('homeworkList')}>К домашним заданиям<ChevronRight /></button>
      </div>
    </div>
  );
}

function HomeworkList({ go, hw }) {
  return (
    <div className="content">
      <div className="page-head"><div className="page-title">Мои домашние задания</div></div>
      {hw.map((h) => (
        <div className="lcard" key={h.id}>
          <span className="icon-chip"><FileText /></span>
          <div className="grow"><div className="lt">{h.title}</div><div className="lm">{h.subject} · срок {h.due}</div></div>
          {h.grade ? <Badge tone="success" dot>{h.grade} баллов</Badge> : <Badge tone={HW_STATUS[h.status].tone} dot={h.status !== 'new'}>{HW_STATUS[h.status].label}</Badge>}
          {h.status === 'graded'
            ? <button className="btn btn-md btn-secondary" onClick={() => go('grade', { hw: h })}>Открыть</button>
            : <button className="btn btn-md btn-primary" onClick={() => go('submit', { hw: h })}>{h.status === 'submitted' ? 'Изменить' : 'Выполнить'}</button>}
        </div>
      ))}
    </div>
  );
}

function Submit({ go, hw, onSubmit, addToast }) {
  const [tab, setTab] = useState('text');
  return (
    <div className="content">
      <button className="back" onClick={() => go('homeworkList')}><ArrowLeft />К заданиям</button>
      <div className="page-head"><div><div className="page-title">{hw.title}</div><div className="page-sub">{hw.subject} · срок {hw.due}</div></div></div>
      <div className="card stack-6">
        <div>
          <div className="card-h">Условие</div>
          <p style={{ fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)', color: 'var(--color-text)' }}>Реши три уравнения со страницы 45: №1, №2, №3. Запиши ход решения или приложи фото из тетради.</p>
        </div>
        <div>
          <div className="seg2"><button className={tab === 'text' ? 'on' : ''} onClick={() => setTab('text')}>Написать</button><button className={tab === 'file' ? 'on' : ''} onClick={() => setTab('file')}>Загрузить файл</button></div>
          {tab === 'text' ? (
            <div>
              <div className="toolbar"><button className="iconbtn"><Bold /></button><button className="iconbtn"><Italic /></button><button className="iconbtn"><ListIcon /></button></div>
              <textarea className="editor" placeholder="Запиши решение…" defaultValue={'№1. 3x + 5 = 20 → x = 5\n№2. 2(x − 4) = 10 → x = 9\n№3. x/2 + 3 = 7 → x = 8'} />
            </div>
          ) : (
            <div>
              <div className="dropzone"><div><Upload /></div>Перетащи фото тетради или нажми, чтобы выбрать</div>
              <div className="file-row"><Paperclip /><span className="grow">решение_тетрадь.jpg</span><button className="iconbtn" aria-label="Удалить"><X /></button></div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
          <button className="btn btn-md btn-secondary" onClick={() => go('homeworkList')}>Сохранить черновик</button>
          <button className="btn btn-md btn-primary" onClick={() => { onSubmit(hw.id); addToast('success', 'Отправлено преподавателю'); go('homeworkList'); }}><Send />Отправить</button>
        </div>
      </div>
    </div>
  );
}

function Grade({ go, hw }) {
  return (
    <div className="content">
      <button className="back" onClick={() => go('homeworkList')}><ArrowLeft />К заданиям</button>
      <div className="page-head"><div><div className="page-title">{hw.title}</div><div className="page-sub">{hw.subject} · оценено</div></div></div>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div className="card-h">Оценка</div>
            <div className="stars">{[1, 2, 3, 4, 5].map((i) => <Star key={i} fill={i <= (hw.grade || 0) ? 'var(--color-warning)' : 'none'} />)}</div>
          </div>
          <div className="num" style={{ fontSize: '3rem', fontWeight: 600, color: 'var(--color-accent-text)' }}>{hw.grade}</div>
        </div>
        <div className="comment-box">
          <div className="from"><span className="avatar avatar-sm">ЕС</span>Елена Смирнова</div>
          {hw.comment}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-5)' }}>
          <button className="btn btn-md btn-secondary">Переделать работу</button>
        </div>
      </div>
    </div>
  );
}

export default function TeenPrototype() {
  const [theme, setTheme] = useState('light');
  const [screen, setScreen] = useState('dashboard');
  const [selHw, setSelHw] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [hw, setHw] = useState([
    { id: 1, title: 'Решить 3 уравнения', subject: 'Алгебра', due: 'чт, 23:59', status: 'new' },
    { id: 3, title: 'Конспект §12', subject: 'История', due: 'вчера', status: 'progress' },
    { id: 2, title: 'Эссе «Мой город»', subject: 'Английский', due: 'пн', status: 'graded', grade: 5, comment: 'Отличная работа! Богатый словарь. Поработай над временами глаголов — местами путаешь Past и Present.' },
  ]);

  const addToast = (kind, text) => { const id = Date.now() + Math.random(); setToasts((t) => [...t, { id, kind, text }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200); };
  const go = (s, p = {}) => { if (p.hw) setSelHw(p.hw); setScreen(s); };
  const onSubmit = (id) => setHw((prev) => prev.map((h) => h.id === id ? { ...h, status: 'submitted' } : h));

  const navActive = ['live', 'report'].includes(screen) ? 'schedule' : (['submit', 'grade'].includes(screen) ? 'homeworkList' : screen);

  return (
    <div className="fl-root" data-theme={theme === 'dark' ? 'dark' : undefined}>
      <style>{css}</style>
      <div className="shell">
        <Sidebar active={navActive} go={go} />
        <div className="main">
          <Topbar theme={theme} setTheme={setTheme} />
          {screen === 'dashboard' && <Dashboard go={go} />}
          {screen === 'schedule' && <Schedule go={go} />}
          {screen === 'live' && <LiveClass go={go} />}
          {screen === 'report' && <Report go={go} />}
          {screen === 'homeworkList' && <HomeworkList go={go} hw={hw} />}
          {screen === 'submit' && selHw && <Submit go={go} hw={selHw} onSubmit={onSubmit} addToast={addToast} />}
          {screen === 'grade' && selHw && <Grade go={go} hw={selHw} />}
          {(screen === 'courses' || screen === 'analysis') && <div className="content"><div className="card empty">Этот раздел вне рамок текущего прототипа (3.2)</div></div>}
        </div>
      </div>
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.kind === 'success' ? <CheckCircle2 /> : <Info />}<span>{t.text}</span></div>)}
        </div>
      )}
    </div>
  );
}
