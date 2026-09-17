(() => {
  const SDK_URL = 'https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const settings = window.MotionLabSettings;

  const loadSdk = () => {
    if (window.UnicornStudio?.addScene) return Promise.resolve(window.UnicornStudio);
    if (window.MotionLabUnicornSdk) return window.MotionLabUnicornSdk;

    window.MotionLabUnicornSdk = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${SDK_URL}"]`);
      const script = existing || document.createElement('script');
      const onLoad = () => window.UnicornStudio?.addScene
        ? resolve(window.UnicornStudio)
        : reject(new Error('Unicorn Studio SDK loaded without addScene().'));
      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', () => reject(new Error('Could not load Unicorn Studio SDK.')), { once: true });
      if (!existing) {
        script.src = SDK_URL;
        script.async = true;
        (document.head || document.body).appendChild(script);
      }
    });
    return window.MotionLabUnicornSdk;
  };

  document.querySelectorAll('[data-unicorn-stage]').forEach((stage) => {
    const card = stage.closest('.demo-card');
    const host = stage.querySelector('[data-unicorn-scene]');
    const controls = [...card.querySelectorAll('[data-unicorn-control]')];
    const effect = stage.dataset.unicornEffect;
    const projectId = stage.dataset.unicornProject;
    const options = {};
    let scene = null;
    let manuallyPaused = false;
    let systemPaused = document.hidden || reducedMotion.matches;
    let mountId = 0;
    let remountTimer = 0;

    if (!host || !effect || !projectId) return;

    controls.forEach((input) => {
      const property = input.dataset.unicornControl;
      const stored = settings?.get('live-backgrounds', effect, property, input.value);
      if (Number.isFinite(Number(stored))) input.value = stored;
      options[property] = Number(input.value);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
    });

    const applyAppearance = () => {
      stage.style.setProperty('--unicorn-opacity', options.opacity ?? 1);
      stage.style.setProperty('--unicorn-saturation', options.saturation ?? 1);
      stage.style.setProperty('--unicorn-hue', `${options.hue ?? 0}deg`);
      stage.style.setProperty('--unicorn-brightness', options.brightness ?? 1);
      stage.style.setProperty('--unicorn-contrast', options.contrast ?? 1);
      stage.style.setProperty('--unicorn-blur', `${options.blur ?? 0}px`);
      stage.style.setProperty('--unicorn-mask-start', `${options.maskStart ?? 80}%`);
    };

    const destroy = () => {
      mountId += 1;
      clearTimeout(remountTimer);
      scene?.destroy?.();
      scene = null;
      host.replaceChildren();
      stage.classList.remove('is-unicorn-active');
    };

    const mount = async () => {
      if (manuallyPaused || systemPaused) return;
      destroy();
      const requestId = mountId;
      stage.classList.remove('is-unicorn-error', 'is-unicorn-paused');

      try {
        const UnicornStudio = await loadSdk();
        if (requestId !== mountId || manuallyPaused || systemPaused) return;
        const mounted = await UnicornStudio.addScene({
          elementId: host.id,
          projectId,
          fps: options.fps ?? 45,
          scale: options.scale ?? .75,
          dpi: options.dpi ?? 1,
          lazyLoad: true,
          altText: stage.dataset.unicornAlt || 'Interactive animated background',
          ariaLabel: stage.dataset.unicornAlt || 'Interactive animated background',
          interactivity: { mouse: { disableMobile: true } },
        });
        if (requestId !== mountId || manuallyPaused || systemPaused) {
          mounted?.destroy?.();
          return;
        }
        scene = mounted;
        stage.classList.add('is-unicorn-active');
      } catch (error) {
        stage.classList.add('is-unicorn-error');
        console.warn(`${effect} is using its CSS fallback.`, error);
      }
    };

    const scheduleRemount = () => {
      clearTimeout(remountTimer);
      if (manuallyPaused || systemPaused) return;
      remountTimer = window.setTimeout(mount, 220);
    };

    applyAppearance();
    if (!systemPaused) mount();
    else stage.classList.add('is-unicorn-paused');

    controls.forEach((input) => {
      input.addEventListener('input', () => {
        const property = input.dataset.unicornControl;
        const value = Number(input.value);
        options[property] = value;
        settings?.set('live-backgrounds', effect, property, value);
        const output = input.closest('label')?.querySelector('output');
        if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
        if (['fps', 'scale', 'dpi'].includes(property)) scheduleRemount();
        else applyAppearance();
      });
    });

    card.querySelector('[data-unicorn-toggle]')?.addEventListener('click', (event) => {
      manuallyPaused = !manuallyPaused;
      event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
      stage.classList.toggle('is-unicorn-paused', manuallyPaused);
      if (manuallyPaused) destroy();
      else if (!systemPaused) mount();
    });

    card.querySelector('[data-unicorn-reset]')?.addEventListener('click', () => {
      if (!manuallyPaused && !systemPaused) mount();
    });

    const handlePause = () => {
      systemPaused = true;
      destroy();
    };
    const handleResume = () => {
      systemPaused = reducedMotion.matches;
      if (!manuallyPaused && !systemPaused) mount();
    };
    const handleReducedMotion = (event) => {
      systemPaused = event.matches || document.hidden;
      stage.classList.toggle('is-unicorn-paused', systemPaused || manuallyPaused);
      if (systemPaused) destroy();
      else if (!manuallyPaused) mount();
    };
    const handlePageHide = () => {
      document.removeEventListener('motion:pause', handlePause);
      document.removeEventListener('motion:resume', handleResume);
      reducedMotion.removeEventListener?.('change', handleReducedMotion);
      destroy();
    };

    document.addEventListener('motion:pause', handlePause);
    document.addEventListener('motion:resume', handleResume);
    reducedMotion.addEventListener?.('change', handleReducedMotion);
    window.addEventListener('pagehide', handlePageHide, { once: true });
  });
})();
