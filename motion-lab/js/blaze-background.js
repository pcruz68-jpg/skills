import { createBlaze } from './canvasui-blaze.js';

const stage = document.querySelector('[data-blaze-stage]');
const source = document.querySelector('[data-blaze-source]');
const content = document.querySelector('[data-blaze-content]');
const output = document.querySelector('[data-blaze-output]');

if (stage && source && content && output) {
  const settings = window.MotionLabSettings;
  const controls = [...document.querySelectorAll('[data-blaze-control]')];
  const options = {
    height: .97,
    distortion: .6,
    distortionScale: .5,
    speed: 1,
    sparks: .5,
    sparkDensity: 1.5,
    sparkSize: 1,
    layers: 4,
    smoke: .5,
    glow: 1.5,
    sparkColor: [1, .4, .05],
    smokeColor: [1, .43, .1],
  };
  let blaze = null;
  let manuallyPaused = false;
  let systemPaused = false;

  controls.forEach((input) => {
    const property = input.dataset.blazeControl;
    const stored = settings?.get('live-backgrounds', 'blaze', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    options[property] = Number(input.value);
    const value = input.closest('label')?.querySelector('output');
    if (value) value.value = input.value;
  });

  const effectiveSpeed = () => manuallyPaused || systemPaused ? 0 : options.speed;
  const mount = () => {
    blaze?.destroy();
    blaze = createBlaze({ source, content, output }, { ...options, speed: effectiveSpeed() });
    stage.classList.toggle('is-blaze-active', Boolean(blaze));
  };
  const updatePlayback = () => blaze?.setOptions({ speed: effectiveSpeed() });

  mount();

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.blazeControl;
      const value = Number(input.value);
      options[property] = value;
      settings?.set('live-backgrounds', 'blaze', property, value);
      const display = input.closest('label')?.querySelector('output');
      if (display) display.value = input.value;
      blaze?.setOptions({ [property]: property === 'speed' ? effectiveSpeed() : value });
    });
  });

  document.querySelector('[data-blaze-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    updatePlayback();
  });
  document.querySelector('[data-blaze-reset]')?.addEventListener('click', mount);
  document.addEventListener('motion:pause', () => { systemPaused = true; updatePlayback(); });
  document.addEventListener('motion:resume', () => { systemPaused = false; updatePlayback(); });
  window.addEventListener('pagehide', () => blaze?.destroy(), { once: true });
}
