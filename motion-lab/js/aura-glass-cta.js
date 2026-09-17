const button = document.querySelector('[data-aura-cta]');

if (button) {
  const settings = window.MotionLabSettings;
  const controls = [...document.querySelectorAll('[data-aura-cta-control]')];
  const values = {
    beamSpeed: 4,
    spread: 90,
    cut: 1,
    glassOpacity: .8,
    blur: 8,
    hoverScale: 1.05,
    glow: 40,
    magnet: 8,
    orbSpeed: 3.2,
    orbGlow: .65,
  };
  const properties = {
    beamSpeed: ['--beam-speed', 's'],
    spread: ['--beam-spread', 'deg'],
    cut: ['--cut', 'px'],
    glassOpacity: ['--glass-opacity', ''],
    blur: ['--glass-blur', 'px'],
    hoverScale: ['--hover-scale', ''],
    glow: ['--glow-size', 'px'],
    orbSpeed: ['--orb-speed', 's'],
    orbGlow: ['--orb-glow', ''],
  };

  const apply = (property, value) => {
    values[property] = value;
    const mapping = properties[property];
    if (mapping) button.style.setProperty(mapping[0], `${value}${mapping[1]}`);
  };

  controls.forEach((input) => {
    const property = input.dataset.auraCtaControl;
    const stored = settings?.get('component-motion', 'aura-glass-cta', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    apply(property, Number(input.value));
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
    input.addEventListener('input', () => {
      const value = Number(input.value);
      apply(property, value);
      settings?.set('component-motion', 'aura-glass-cta', property, value);
      if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
    });
  });

  button.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const rect = button.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * values.magnet;
    const y = ((event.clientY - rect.top) / rect.height - .5) * values.magnet;
    button.style.setProperty('--magnet-x', `${x}px`);
    button.style.setProperty('--magnet-y', `${y}px`);
  });
  button.addEventListener('pointerleave', () => {
    button.style.setProperty('--magnet-x', '0px');
    button.style.setProperty('--magnet-y', '0px');
  });
  button.addEventListener('click', () => {
    button.classList.remove('is-pressed');
    void button.offsetWidth;
    button.classList.add('is-pressed');
    setTimeout(() => button.classList.remove('is-pressed'), 520);
  });
}
