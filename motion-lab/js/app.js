(() => {
  const page = document.body.dataset.page;
  document.querySelector(`[data-nav="${page}"]`)?.setAttribute('aria-current', 'page');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const preference = document.querySelector('[data-motion-preference]');
  const renderPreference = () => {
    if (preference) preference.textContent = reduced.matches ? 'Reduced' : 'Full motion';
    document.documentElement.dataset.reducedMotion = reduced.matches ? 'true' : 'false';
    document.querySelectorAll('[data-pause-stage], [data-canvas-toggle], [data-blaze-toggle], [data-droplets-toggle], [data-frost-toggle], [data-unicorn-toggle], [data-spline-toggle], [data-aurora-toggle], [data-floating-lines-toggle], [data-light-pillar-toggle], [data-valence-toggle], [data-glass-toggle]').forEach((button) => {
      button.disabled = reduced.matches;
      if (reduced.matches) button.textContent = 'Static';
    });
  };
  renderPreference();
  reduced.addEventListener?.('change', renderPreference);

  document.addEventListener('visibilitychange', () => {
    document.documentElement.dataset.pageHidden = String(document.hidden);
    document.body.classList.toggle('page-paused', document.hidden);
    document.dispatchEvent(new CustomEvent(document.hidden ? 'motion:pause' : 'motion:resume'));
  });
})();
