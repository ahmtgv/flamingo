/* Deferred after illustrations.js. No input handlers: native keyboard/button
 * semantics belong to app.js. This module only observes the pause contract. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Map();
  let frame = null;
  let previous = null;
  const blocked = () => document.hidden || root.classList.contains('motion-off') || reduced.matches;
  const active = r => r.visible && r.element.isConnected && r.elapsed < r.duration;

  function paint(r) {
    if (r.kind === 'panel') {
      const p = Math.max(0, Math.min(1, (r.elapsed - r.delay) / 650));
      const ease = 1 - Math.pow(1 - p, 3);
      r.element.style.setProperty('--sedum-motion-y', `${(1 - ease) * 9}px`);
      r.element.style.setProperty('--sedum-motion-opacity', String(.9 + ease * .1));
      return;
    }
    // One finite reveal, then rest: an illustration, not a simulated live feed.
    const progress = Math.max(0, Math.min(1, r.elapsed / r.duration));
    const phase = .12 + .55 * (1 - Math.pow(1 - progress, 3));
    try {
      const point = r.path.getPointAtLength(phase * r.length);
      const from = r.path.getCTM();
      const to = r.traveler.getCTM();
      if (!from || !to) return;
      const local = new DOMPoint(point.x, point.y).matrixTransform(from).matrixTransform(to.inverse());
      r.traveler.setAttribute('cx', local.x.toFixed(3));
      r.traveler.setAttribute('cy', local.y.toFixed(3));
      r.nodes.forEach((node, i) => {
        const target = r.nodes.length === 1 ? .5 : i / (r.nodes.length - 1);
        const strength = Math.max(0, 1 - Math.abs(phase - target) / .18);
        node.style.setProperty('--sedum-motion-node-opacity', String(.72 + .28 * strength * strength));
      });
    } catch (_) { r.visible = false; } // Invalid/removed geometry stays static.
  }

  function reconcile() {
    if (blocked() || !Array.from(records.values()).some(active)) {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      previous = null;
    } else if (frame === null) {
      previous = null;
      frame = requestAnimationFrame(tick);
    }
  }

  function tick(now) {
    frame = null;
    if (blocked()) { previous = null; return; }
    if (previous === null) previous = now;
    const elapsed = now - previous;
    if (elapsed >= 1000 / 30) {
      previous = now;
      for (const r of records.values()) {
        if (!active(r)) continue;
        // First visible frame never incorporates time spent offscreen.
        const delta = r.fresh ? 0 : Math.min(elapsed, 67);
        r.fresh = false;
        r.elapsed += delta;
        paint(r);
      }
    }
    if (Array.from(records.values()).some(active)) frame = requestAnimationFrame(tick);
    else previous = null;
  }

  // Without visibility observation, prefer the fully rendered static design.
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const r = records.get(entry.target);
      if (!r) return;
      r.visible = entry.isIntersecting && entry.intersectionRatio > 0;
      r.fresh = true;
    });
    reconcile();
  }, { threshold: 0 });

  document.querySelectorAll('svg[data-motion-scene]').forEach(element => {
    const path = element.querySelector('path[data-motion-path]');
    const traveler = element.querySelector('circle[data-motion-traveler]');
    if (!path || !traveler) return;
    let length;
    try { length = path.getTotalLength(); } catch (_) { return; }
    if (!Number.isFinite(length) || length <= 0) return;
    const nodes = Array.from(element.querySelectorAll('[data-motion-node]'));
    nodes.forEach(node => node.classList.add('sedum-motion-node'));
    const r = { element, path, traveler, nodes, length, kind: 'signal', duration: 1600,
      elapsed: blocked() ? 1600 : 0, visible: false, fresh: true };
    records.set(element, r);
    // Complete resting composition when reduced motion is set on load.
    paint(r);
    observer.observe(element);
  });

  document.querySelectorAll('.system-window, .satellite').forEach((element, i) => {
    const delay = element.matches('.system-window') ? 0 : 40 + i * 40;
    const r = { element, kind: 'panel', delay, duration: delay + 650,
      elapsed: blocked() ? delay + 650 : 0, visible: false, fresh: true };
    element.classList.add('sedum-motion-panel');
    records.set(element, r);
    paint(r);
    observer.observe(element);
  });

  // No CSS animations or transitions: stopping cancels the only RAF and freezes
  // its exact snapshot. No focus changes, tab stops, shortcuts or live regions.
  new MutationObserver(reconcile).observe(root, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', reconcile);
  reduced.addEventListener('change', reconcile);
  window.addEventListener('pagehide', () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previous = null;
  });
  window.addEventListener('pageshow', reconcile);
})();
