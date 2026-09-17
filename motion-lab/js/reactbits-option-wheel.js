// Vanilla adaptation of https://www.reactbits.dev/components/option-wheel
(() => {
  const wheel = document.querySelector('[data-option-wheel]');
  if (!wheel) return;

  const settings = window.MotionLabSettings;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const items = [...wheel.querySelectorAll('[data-option-wheel-item]')];
  const labels = items.map((item) => item.textContent.trim());
  const selectedLabel = wheel.querySelector('[data-option-wheel-selected]');
  const controls = [...document.querySelectorAll('[data-option-wheel-control]')];
  const defaultSelected = 3;
  const values = {
    fontSize: 3,
    spacing: 1.4,
    curve: 1,
    tilt: 6,
    blur: 2,
    fade: .25,
    minOpacity: .05,
    smoothing: 200,
    inset: 80,
    side: 0,
    loop: 0,
    draggable: 1,
  };
  let position = defaultSelected;
  let target = defaultSelected;
  let selectedIndex = defaultSelected;
  let frameId = 0;
  let last = performance.now();
  let wheelTimer = 0;
  let drag = null;
  let dragMoved = false;

  const formatValue = (input) => {
    const property = input.dataset.optionWheelControl;
    if (property === 'side') return Number(input.value) ? 'Right' : 'Left';
    if (property === 'loop' || property === 'draggable') return Number(input.value) ? 'On' : 'Off';
    return `${input.value}${input.dataset.suffix || ''}`;
  };

  controls.forEach((input) => {
    const property = input.dataset.optionWheelControl;
    const stored = settings?.get('component-motion', 'reactbits-option-wheel', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    values[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = formatValue(input);
  });

  const config = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return {
      count: items.length,
      rowHeight: Math.max(values.fontSize * values.spacing * rem, 1),
      mirror: values.side ? -1 : 1,
    };
  };

  const applyAppearance = () => {
    wheel.style.setProperty('--ow-font-size', `${values.fontSize}rem`);
    wheel.style.setProperty('--ow-inset', `${values.inset}px`);
    wheel.dataset.side = values.side ? 'right' : 'left';
    wheel.setAttribute('aria-orientation', 'vertical');
  };

  const updateSelection = (index) => {
    selectedIndex = index;
    items.forEach((item, itemIndex) => item.setAttribute('aria-selected', String(itemIndex === index)));
    wheel.setAttribute('aria-activedescendant', items[index]?.id || '');
    if (selectedLabel) selectedLabel.textContent = labels[index] || '';
  };

  const layout = (now) => {
    const cfg = config();
    const dt = Math.min(Math.max((now - last) / 1000, 0), .05);
    last = now;
    const tau = Math.max(values.smoothing, 1) / 1000;
    const easing = reducedMotion.matches ? 1 : 1 - Math.exp(-dt / tau);
    let next = position + (target - position) * easing;
    const settled = Math.abs(target - next) < .001;
    if (settled) next = target;
    position = next;

    const tiltRadians = values.tilt * Math.PI / 180;
    const radius = tiltRadians > .0005 ? cfg.rowHeight / tiltRadians : 0;
    items.forEach((item, index) => {
      let distanceFromPosition = index - next;
      if (values.loop && cfg.count > 1) {
        distanceFromPosition = ((distanceFromPosition % cfg.count) + cfg.count) % cfg.count;
        if (distanceFromPosition > cfg.count / 2) distanceFromPosition -= cfg.count;
      }
      const distance = Math.abs(distanceFromPosition);
      let x = 0;
      let y = distanceFromPosition * cfg.rowHeight;
      let rotation = 0;
      if (radius > 0) {
        const angle = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, distanceFromPosition * tiltRadians));
        y = radius * Math.sin(angle);
        x = -cfg.mirror * radius * (1 - Math.cos(angle)) * values.curve;
        rotation = cfg.mirror * angle * 180 / Math.PI;
      }
      item.style.left = values.side ? 'auto' : `${values.inset}px`;
      item.style.right = values.side ? `${values.inset}px` : 'auto';
      item.style.transform = `translate(${x.toFixed(2)}px, calc(${y.toFixed(2)}px - 50%)) rotate(${rotation.toFixed(3)}deg)`;
      item.style.opacity = Math.max(values.minOpacity, 1 - distance * values.fade).toFixed(4);
      item.style.filter = values.blur > 0 ? `blur(${(distance * values.blur).toFixed(2)}px)` : 'none';
      item.style.setProperty('--ow-p', Math.max(0, 1 - Math.min(distance, 1)).toFixed(4));
    });

    frameId = settled ? 0 : requestAnimationFrame(layout);
  };

  const startLoop = () => {
    cancelAnimationFrame(frameId);
    last = performance.now();
    frameId = requestAnimationFrame(layout);
  };

  const applyTarget = (value, snap) => {
    const count = items.length;
    let next = value;
    if (!values.loop) next = Math.min(Math.max(next, 0), Math.max(count - 1, 0));
    if (snap) next = Math.round(next);
    target = next;
    const index = ((Math.round(next) % count) + count) % count;
    if (index !== selectedIndex) updateSelection(index);
    startLoop();
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const rowHeight = config().rowHeight;
    const delta = event.deltaMode === 1 ? event.deltaY * 24 : event.deltaY;
    const step = Math.max(-1, Math.min(1, delta / rowHeight));
    applyTarget(target + step, false);
    clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => applyTarget(target, true), 140);
  };

  const handlePointerDown = (event) => {
    if (!values.draggable) return;
    drag = { y: event.clientY, start: target, id: event.pointerId };
    dragMoved = false;
    wheel.classList.add('is-dragging');
  };

  const handlePointerMove = (event) => {
    if (!drag) return;
    const deltaY = event.clientY - drag.y;
    if (!dragMoved && Math.abs(deltaY) > 4) {
      dragMoved = true;
      wheel.setPointerCapture?.(drag.id);
    }
    if (dragMoved) applyTarget(drag.start - deltaY / config().rowHeight, false);
  };

  const handlePointerEnd = () => {
    if (!drag) return;
    drag = null;
    wheel.classList.remove('is-dragging');
    if (dragMoved) applyTarget(target, true);
  };

  const handleKeyDown = (event) => {
    let delta = null;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') delta = -1;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') delta = 1;
    if (event.key === 'Home') {
      event.preventDefault();
      applyTarget(0, true);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      applyTarget(items.length - 1, true);
      return;
    }
    if (delta === null) return;
    event.preventDefault();
    applyTarget(Math.round(target) + delta, true);
  };

  items.forEach((item, index) => {
    item.addEventListener('click', () => {
      if (dragMoved) return;
      const count = items.length;
      const normalized = ((target % count) + count) % count;
      let distance = index - normalized;
      if (values.loop && count > 1) {
        if (distance > count / 2) distance -= count;
        else if (distance < -count / 2) distance += count;
      }
      applyTarget(target + distance, true);
    });
  });

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.optionWheelControl;
      values[property] = Number(input.value);
      settings?.set('component-motion', 'reactbits-option-wheel', property, values[property]);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = formatValue(input);
      applyAppearance();
      applyTarget(target, false);
    });
  });

  wheel.addEventListener('wheel', handleWheel, { passive: false });
  wheel.addEventListener('pointerdown', handlePointerDown);
  wheel.addEventListener('pointermove', handlePointerMove);
  wheel.addEventListener('pointerup', handlePointerEnd);
  wheel.addEventListener('pointercancel', handlePointerEnd);
  wheel.addEventListener('keydown', handleKeyDown);
  document.querySelector('[data-option-wheel-reset]')?.addEventListener('click', () => applyTarget(defaultSelected, true));

  const handleReducedMotion = () => applyTarget(target, true);
  reducedMotion.addEventListener?.('change', handleReducedMotion);
  applyAppearance();
  updateSelection(defaultSelected);
  startLoop();

  const cleanup = () => {
    cancelAnimationFrame(frameId);
    clearTimeout(wheelTimer);
    reducedMotion.removeEventListener?.('change', handleReducedMotion);
  };
  window.addEventListener('pagehide', cleanup, { once: true });
})();
