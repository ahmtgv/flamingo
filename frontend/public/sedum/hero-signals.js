/* Give the hero's existing illustrative charts the same motion contract as
   the module scenes. No model inference, measurements or external data. */
document.querySelectorAll('.stage .chart svg').forEach(svg => {
  const path = svg.querySelector('.trace');
  const point = svg.querySelector('.chart-point');
  if (!path || !point) return;
  svg.setAttribute('data-motion-scene', '');
  path.setAttribute('data-motion-path', '');
  point.setAttribute('data-motion-traveler', '');
  const halo = svg.querySelector('.halo');
  if (halo) halo.remove();
});
