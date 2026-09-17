(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = window.MotionLabSettings;
  const active = new Map();
  const scheduled = new Set();

  const valueFor = (name, control, fallback) => Number(
    document.querySelector(`#${name} [data-motion-control="${control}"]`)?.value ?? fallback,
  );

  const clear = (name) => {
    active.get(name)?.forEach((animation) => animation.cancel());
    active.delete(name);
  };

  const animateMany = (name, elements, keyframes, options) => {
    clear(name);
    if (reduced) {
      elements.forEach((element) => {
        element.style.opacity = '1';
        element.style.transform = 'none';
        element.style.filter = 'none';
        element.style.clipPath = 'none';
      });
      return;
    }
    const animations = elements.map((element, index) => element.animate(
      typeof keyframes === 'function' ? keyframes(element, index) : keyframes,
      { fill: 'both', ...options, delay: (options.delay || 0) + index * (options.stagger || 0) },
    ));
    active.set(name, animations);
  };

  const players = {
    'fade-rise': () => {
      const root = document.querySelector('[data-entrance="fade-rise"]');
      const duration = valueFor('fade-rise', 'duration', 720);
      const distance = valueFor('fade-rise', 'distance', 28);
      animateMany('fade-rise', [...root.children], [
        { opacity: 0, transform: `translateY(${distance}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ], { duration, easing: 'cubic-bezier(.2,.85,.2,1)', stagger: 95 });
    },
    'clip-reveal': () => {
      const lines = [...document.querySelectorAll('[data-entrance="clip-reveal"] span')];
      const duration = valueFor('clip-reveal', 'duration', 840);
      const stagger = valueFor('clip-reveal', 'stagger', 90);
      animateMany('clip-reveal', lines, [
        { opacity: 0, transform: 'translateY(110%) rotate(2deg)', clipPath: 'inset(0 0 100% 0)' },
        { opacity: 1, transform: 'translateY(0) rotate(0)', clipPath: 'inset(0 0 0 0)' },
      ], { duration, easing: 'cubic-bezier(.16,1,.3,1)', stagger });
    },
    'blur-scale': () => {
      const cards = [...document.querySelectorAll('[data-entrance="blur-scale"] article')];
      const duration = valueFor('blur-scale', 'duration', 640);
      const blur = valueFor('blur-scale', 'blur', 14);
      animateMany('blur-scale', cards, [
        { opacity: 0, transform: 'scale(.9) translateY(18px)', filter: `blur(${blur}px)` },
        { opacity: 1, transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
      ], { duration, easing: 'cubic-bezier(.2,.8,.2,1)', stagger: 110 });
    },
  };

  const scheduleReplay = (name) => {
    if (scheduled.has(name)) return;
    scheduled.add(name);
    requestAnimationFrame(() => {
      scheduled.delete(name);
      players[name]?.();
    });
  };

  document.querySelectorAll('[data-motion-control]').forEach((input) => {
    const name = input.closest('.demo-section')?.id;
    const property = input.dataset.motionControl;
    const output = input.closest('label')?.querySelector('output');
    const stored = settings?.get('entrances', name, property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    const renderValue = () => {
      if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
    };
    renderValue();
    input.disabled = reduced;
    input.addEventListener('input', () => {
      renderValue();
      if (name) {
        settings?.set('entrances', name, property, Number(input.value));
        scheduleReplay(name);
      }
    });
  });

  document.querySelectorAll('[data-replay]').forEach((button) => {
    button.addEventListener('click', () => players[button.dataset.replay]?.());
  });

  const seen = new Set();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const name = entry.target.id;
      if (entry.isIntersecting && !seen.has(name)) {
        seen.add(name);
        players[name]?.();
      }
    });
  }, { threshold: .35 });

  document.querySelectorAll('.demo-section').forEach((section) => observer.observe(section));
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    active.forEach((animations) => animations.forEach((animation) => animation.cancel()));
  }, { once: true });
})();
