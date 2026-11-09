/* The visible teaser button opens the existing self-check. No inference changes. */
document.querySelector('[data-top-self]')?.addEventListener('click', () => {
  document.getElementById('cmf-try-self')?.click();
});
