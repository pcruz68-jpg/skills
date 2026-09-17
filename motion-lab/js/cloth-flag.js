import { createCloth, supportsHtmlInCanvas } from './canvasui-cloth.js';

const wrapper = document.querySelector('[data-cloth-wrapper]');
const source = document.querySelector('[data-cloth-source]');
const content = document.querySelector('[data-cloth-content]');
const output = document.querySelector('[data-cloth-output]');

if (wrapper && source && content && output) {
  let cloth = null;
  const settings = window.MotionLabSettings;
  const options = {
    pin: 'top',
    wind: 1.4,
    speed: 0.42,
    amplitude: 18,
    drape: 16,
    brush: 1.1,
    brushSize: 95,
    damping: 1.65,
    light: 0.58,
    sheen: 0.12,
    shadow: 0.28,
    cornerRadius: 8,
    backing: [0.76, 1, 0.24],
    perspective: 900,
  };
  const controls = [...document.querySelectorAll('[data-cloth-control]')];

  controls.forEach((input) => {
    const property = input.dataset.clothControl;
    const stored = settings?.get('component-motion', 'cloth-flag', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    options[property] = Number(input.value);
    const outputValue = input.closest('label')?.querySelector('output');
    if (outputValue) outputValue.value = `${input.value}${input.dataset.suffix || ''}`;
  });

  const nativeHtmlTexture = supportsHtmlInCanvas();
  if (!nativeHtmlTexture) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(wrapper.clientWidth));
    const height = Math.max(1, Math.round(wrapper.clientHeight));
    source.width = Math.round(width * dpr);
    source.height = Math.round(height * dpr);
    const context = source.getContext('2d');
    context.scale(dpr, dpr);

    const field = context.createLinearGradient(0, 0, width, height);
    field.addColorStop(0, '#c7ff4a');
    field.addColorStop(0.5, '#b7f83c');
    field.addColorStop(0.68, '#8a6dff');
    field.addColorStop(1, '#9d7cff');
    context.fillStyle = field;
    context.fillRect(0, 0, width, height);

    context.fillStyle = 'rgba(16, 20, 13, .12)';
    for (let y = 3; y < height; y += 4) context.fillRect(0, y, width, 1);

    context.fillStyle = '#10140d';
    context.font = `700 ${Math.max(11, width * 0.03)}px Manrope, sans-serif`;
    context.fillText('ML', 26, 38);
    context.font = `700 ${Math.max(28, width * 0.085)}px Manrope, sans-serif`;
    context.fillText('MOTION', width * 0.21, height * 0.58);
    context.fillText('LABORATORY', width * 0.21, height * 0.76);
    context.font = `500 ${Math.max(8, width * 0.018)}px monospace`;
    context.fillText('CANVAS UI / CLOTH', width * 0.21, height * 0.88);
  }

  cloth = createCloth({ source, content, output }, options);
  wrapper.classList.toggle('is-canvasui-native', Boolean(cloth));

  const updateFallback = () => {
    const wind = Math.max(options.wind, 0.1);
    wrapper.style.setProperty('--flag-duration', `${Math.min(6.5, Math.max(2.4, 7.2 / wind))}s`);
    const tilt = Math.max(0.5, options.amplitude * 0.1);
    wrapper.style.setProperty('--flag-tilt', `${tilt}deg`);
    wrapper.style.setProperty('--flag-tilt-negative', `${tilt * -0.55}deg`);
    wrapper.style.setProperty('--flag-tilt-soft', `${tilt * 0.7}deg`);
  };

  controls.forEach((input) => {
    const outputValue = input.closest('label')?.querySelector('output');
    const renderValue = () => {
      const value = Number(input.value);
      const property = input.dataset.clothControl;
      options[property] = value;
      if (outputValue) outputValue.value = `${input.value}${input.dataset.suffix || ''}`;
      settings?.set('component-motion', 'cloth-flag', property, value);
      cloth?.setOptions({ [property]: value });
      updateFallback();
    };
    input.addEventListener('input', renderValue);
  });

  updateFallback();
  window.addEventListener('pagehide', () => cloth?.destroy(), { once: true });
}
