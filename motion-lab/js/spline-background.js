(() => {
  const stage = document.querySelector('[data-spline-stage]');
  const frame = stage?.querySelector('[data-spline-frame]');

  if (!stage || !frame) return;

  const card = stage.closest('.demo-card');
  const settings = window.MotionLabSettings;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = [...card.querySelectorAll('[data-spline-control]')];
  const effect = stage.dataset.splineEffect;
  const source = stage.dataset.splineSrc;
  const options = {};
  let manuallyPaused = false;
  let systemPaused = document.hidden || reducedMotion.matches;
  let inViewport = false;

  controls.forEach((input) => {
    const property = input.dataset.splineControl;
    const stored = settings?.get('live-backgrounds', effect, property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    options[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
  });

  const applyAppearance = () => {
    stage.style.setProperty('--spline-opacity', options.opacity ?? 1);
    stage.style.setProperty('--spline-zoom', options.zoom ?? 1.04);
    stage.style.setProperty('--spline-vertical', `${options.vertical ?? 0}%`);
    stage.style.setProperty('--spline-brightness', options.brightness ?? 1);
    stage.style.setProperty('--spline-saturation', options.saturation ?? 1);
    stage.style.setProperty('--spline-hue', `${options.hue ?? 0}deg`);
  };

  const destroy = () => {
    frame.replaceChildren();
    stage.classList.remove('is-spline-active');
  };

  const mount = () => {
    if (manuallyPaused || systemPaused || !inViewport || frame.firstElementChild) return;
    const iframe = document.createElement('iframe');
    iframe.src = source;
    iframe.title = 'Interactive Glass wave background by Spline';
    iframe.loading = 'lazy';
    iframe.allow = 'autoplay; fullscreen';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.addEventListener('load', () => stage.classList.add('is-spline-active'), { once: true });
    frame.appendChild(iframe);
  };

  applyAppearance();
  if (systemPaused) stage.classList.add('is-spline-paused');

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.splineControl;
      const value = Number(input.value);
      options[property] = value;
      settings?.set('live-backgrounds', effect, property, value);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
      applyAppearance();
    });
  });

  card.querySelector('[data-spline-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    stage.classList.toggle('is-spline-paused', manuallyPaused || systemPaused);
    if (manuallyPaused) destroy();
    else mount();
  });

  card.querySelector('[data-spline-reset]')?.addEventListener('click', () => {
    destroy();
    mount();
  });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    if (inViewport) mount();
    else destroy();
  }, { rootMargin: '240px 0px', threshold: 0 });
  visibilityObserver.observe(stage);

  const handlePause = () => {
    systemPaused = true;
    stage.classList.add('is-spline-paused');
    destroy();
  };
  const handleResume = () => {
    systemPaused = reducedMotion.matches;
    stage.classList.toggle('is-spline-paused', systemPaused || manuallyPaused);
    mount();
  };
  const handleReducedMotion = (event) => {
    systemPaused = event.matches || document.hidden;
    stage.classList.toggle('is-spline-paused', systemPaused || manuallyPaused);
    if (systemPaused) destroy();
    else mount();
  };
  const handlePageHide = () => {
    visibilityObserver.disconnect();
    document.removeEventListener('motion:pause', handlePause);
    document.removeEventListener('motion:resume', handleResume);
    reducedMotion.removeEventListener?.('change', handleReducedMotion);
    destroy();
  };

  document.addEventListener('motion:pause', handlePause);
  document.addEventListener('motion:resume', handleResume);
  reducedMotion.addEventListener?.('change', handleReducedMotion);
  window.addEventListener('pagehide', handlePageHide, { once: true });
})();
