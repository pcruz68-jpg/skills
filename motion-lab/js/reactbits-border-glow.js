// Vanilla adaptation of https://www.reactbits.dev/components/border-glow
(() => {
  const card = document.querySelector('[data-border-glow-card]');
  if (!card) return;

  const settings = window.MotionLabSettings;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = [...document.querySelectorAll('[data-border-glow-control]')];
  const values = {
    edgeSensitivity: 30,
    glowRadius: 40,
    glowIntensity: 1,
    coneSpread: 25,
    borderRadius: 28,
    fillOpacity: .5,
    paletteHue: 0,
    glowHue: 40,
    animated: 1,
    sweepDuration: 4,
  };
  let hovered = false;
  let sweepActive = false;
  let sweepFrame = 0;
  let pointerFrame = 0;
  let pendingPointer = null;
  let hasEnteredViewport = false;

  const formatValue = (input) => input.dataset.borderGlowControl === 'animated'
    ? (Number(input.value) ? 'On' : 'Off')
    : `${input.value}${input.dataset.suffix || ''}`;

  const buildBoxShadow = (hue, intensity) => {
    const layers = [
      [0,0,0,1,100,true],[0,0,1,0,60,true],[0,0,3,0,50,true],[0,0,6,0,40,true],
      [0,0,15,0,30,true],[0,0,25,2,20,true],[0,0,50,2,10,true],
      [0,0,1,0,60,false],[0,0,3,0,50,false],[0,0,6,0,40,false],
      [0,0,15,0,30,false],[0,0,25,2,20,false],[0,0,50,2,10,false],
    ];
    return layers.map(([x,y,blur,spread,alpha,inset]) => {
      const opacity = Math.min(alpha * intensity, 100);
      return `${inset ? 'inset ' : ''}${x}px ${y}px ${blur}px ${spread}px hsl(${hue}deg 80% 80% / ${opacity}%)`;
    }).join(',');
  };

  const applyParameters = () => {
    const cone = values.coneSpread;
    card.style.setProperty('--border-glow-radius', `${values.borderRadius}px`);
    card.style.setProperty('--border-glow-radius-outer', `${values.glowRadius}px`);
    card.style.setProperty('--border-glow-cone-a', `${cone}%`);
    card.style.setProperty('--border-glow-cone-b', `${cone + 15}%`);
    card.style.setProperty('--border-glow-cone-c', `${100 - cone - 15}%`);
    card.style.setProperty('--border-glow-cone-d', `${100 - cone}%`);
    card.style.setProperty('--border-glow-palette-hue', `${values.paletteHue}deg`);
    card.style.setProperty('--border-glow-shadow', buildBoxShadow(values.glowHue, values.glowIntensity));
  };

  controls.forEach((input) => {
    const property = input.dataset.borderGlowControl;
    const stored = settings?.get('component-motion', 'reactbits-border-glow', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    values[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = formatValue(input);
  });
  applyParameters();

  const easeOutCubic = (x) => 1 - ((1 - x) ** 3);
  const easeInCubic = (x) => x ** 3;

  const render = (angle, proximity, visible) => {
    const colorSensitivity = values.edgeSensitivity + 20;
    const borderOpacity = visible
      ? Math.max(0, (proximity * 100 - colorSensitivity) / (100 - colorSensitivity))
      : 0;
    const glowOpacity = visible
      ? Math.max(0, (proximity * 100 - values.edgeSensitivity) / (100 - values.edgeSensitivity))
      : 0;
    card.style.setProperty('--border-glow-angle', `${angle.toFixed(3)}deg`);
    card.style.setProperty('--border-glow-opacity', borderOpacity);
    card.style.setProperty('--border-glow-fill-opacity', borderOpacity * values.fillOpacity);
    card.style.setProperty('--border-glow-aura-opacity', glowOpacity);
    card.classList.toggle('is-active', visible);
  };

  const pointerVisual = (event) => {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
    const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
    const proximity = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    let angle = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    render(angle, proximity, true);
  };

  const cancelSweep = () => {
    cancelAnimationFrame(sweepFrame);
    sweepFrame = 0;
    sweepActive = false;
  };
  const playSweep = () => {
    cancelSweep();
    if (!values.animated || reducedMotion.matches) {
      render(45, 0, false);
      return;
    }
    sweepActive = true;
    const start = performance.now();
    const duration = values.sweepDuration * 1000;
    const angleStart = 110;
    const angleEnd = 465;
    const tick = (now) => {
      const elapsed = Math.min(now - start, duration);
      const progress = elapsed / duration;
      let proximity;
      if (progress < .125) proximity = easeOutCubic(progress / .125);
      else if (progress < .625) proximity = 1;
      else proximity = 1 - easeInCubic((progress - .625) / .375);
      const angleProgress = progress < .375
        ? .5 * easeInCubic(progress / .375)
        : .5 + .5 * easeOutCubic((progress - .375) / .5625);
      render(angleStart + (angleEnd - angleStart) * Math.min(angleProgress, 1), proximity, true);
      if (elapsed < duration) sweepFrame = requestAnimationFrame(tick);
      else {
        sweepActive = false;
        sweepFrame = 0;
        if (!hovered) render(angleEnd, 0, false);
      }
    };
    sweepFrame = requestAnimationFrame(tick);
  };

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.borderGlowControl;
      values[property] = Number(input.value);
      settings?.set('component-motion', 'reactbits-border-glow', property, values[property]);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = formatValue(input);
      applyParameters();
      if (property === 'animated' || property === 'sweepDuration') playSweep();
      else if (!hovered && !sweepActive) render(45, 0, false);
    });
  });

  card.addEventListener('pointerenter', (event) => {
    hovered = true;
    cancelSweep();
    pointerVisual(event);
  });
  card.addEventListener('pointermove', (event) => {
    pendingPointer = event;
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      if (pendingPointer) pointerVisual(pendingPointer);
    });
  });
  card.addEventListener('pointerleave', () => {
    hovered = false;
    pendingPointer = null;
    render(45, 0, false);
  });
  card.addEventListener('focus', () => render(45, 1, true));
  card.addEventListener('blur', () => { if (!hovered) render(45, 0, false); });
  document.querySelector('[data-border-glow-replay]')?.addEventListener('click', playSweep);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !hasEnteredViewport) {
      hasEnteredViewport = true;
      playSweep();
    } else if (!entry.isIntersecting) cancelSweep();
  }, { rootMargin: '120px 0px', threshold: 0 });
  visibilityObserver.observe(card);

  const cleanup = () => {
    cancelSweep();
    cancelAnimationFrame(pointerFrame);
    visibilityObserver.disconnect();
  };
  window.addEventListener('pagehide', cleanup, { once: true });
})();
