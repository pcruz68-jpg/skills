import { createDroplets } from './canvasui-droplets.js';

const stage = document.querySelector('[data-droplets-stage]');
const source = document.querySelector('[data-droplets-source]');
const content = document.querySelector('[data-droplets-content]');
const output = document.querySelector('[data-droplets-output]');

if (stage && source && content && output) {
  const settings = window.MotionLabSettings;
  const controls = [...document.querySelectorAll('[data-droplets-control]')];
  const options = {
    intensity: .78,
    speed: .72,
    scale: .62,
    dropWidth: .95,
    dropLength: 1.25,
    refraction: .35,
    blur: 1.2,
    vignette: .3,
    fallSpeed: .8,
    wiggle: .55,
    staticDrops: .45,
    interactive: true,
    interactionRadius: .16,
    interactionStrength: .86,
    interactionDistortion: 3.5,
    tint: [.78, .94, 1],
    tintStrength: .08,
  };
  let droplets = null;
  let resizeFrame = 0;
  let manuallyPaused = false;
  let systemPaused = false;

  controls.forEach((input) => {
    const property = input.dataset.dropletsControl;
    const stored = settings?.get('live-backgrounds', 'droplets', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    options[property] = Number(input.value);
    const value = input.closest('label')?.querySelector('output');
    if (value) value.value = input.value;
  });

  const paintSource = () => {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    source.width = width;
    source.height = height;
    const ctx = source.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = width / dpr;
    const h = height / dpr;

    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#071821');
    base.addColorStop(.5, '#17102c');
    base.addColorStop(1, '#07110f');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const cyan = ctx.createRadialGradient(w * .2, h * .2, 0, w * .2, h * .2, w * .42);
    cyan.addColorStop(0, 'rgba(88,228,255,.55)');
    cyan.addColorStop(1, 'rgba(88,228,255,0)');
    ctx.fillStyle = cyan;
    ctx.fillRect(0, 0, w, h);

    const violet = ctx.createRadialGradient(w * .82, h * .72, 0, w * .82, h * .72, w * .46);
    violet.addColorStop(0, 'rgba(157,124,255,.5)');
    violet.addColorStop(1, 'rgba(157,124,255,0)');
    ctx.fillStyle = violet;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = .13;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let x = -h; x < w + h; x += 54) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + h * .58, h);
      ctx.stroke();
    }
    ctx.restore();

    const panelW = Math.min(310, w * .42);
    const panelH = Math.min(112, h * .25);
    const panelX = w - panelW - Math.max(34, w * .08);
    const panelY = h - panelH - Math.max(34, h * .1);
    ctx.fillStyle = 'rgba(4,10,16,.34)';
    ctx.strokeStyle = 'rgba(255,255,255,.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.74)';
    ctx.font = '600 11px Manrope, sans-serif';
    ctx.fillText('PRECIPITATION', panelX + 22, panelY + 31);
    ctx.fillStyle = '#c7ff4a';
    ctx.font = '600 28px Manrope, sans-serif';
    ctx.fillText('72%', panelX + 22, panelY + 72);
    ctx.fillStyle = 'rgba(255,255,255,.48)';
    ctx.font = '11px DM Mono, monospace';
    ctx.fillText('GLASS SURFACE', panelX + 104, panelY + 70);
  };

  const effectiveSpeed = () => manuallyPaused || systemPaused ? 0 : options.speed;
  const mount = () => {
    droplets?.destroy();
    paintSource();
    droplets = createDroplets({ source, content, output }, { ...options, speed: effectiveSpeed() });
    stage.classList.toggle('is-droplets-active', Boolean(droplets));
  };
  const updatePlayback = () => droplets?.setOptions({ speed: effectiveSpeed() });

  mount();

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.dropletsControl;
      const value = Number(input.value);
      options[property] = value;
      settings?.set('live-backgrounds', 'droplets', property, value);
      const display = input.closest('label')?.querySelector('output');
      if (display) display.value = input.value;
      droplets?.setOptions({ [property]: property === 'speed' ? effectiveSpeed() : value });
    });
  });

  document.querySelector('[data-droplets-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    updatePlayback();
  });
  document.querySelector('[data-droplets-reset]')?.addEventListener('click', mount);
  document.addEventListener('motion:pause', () => { systemPaused = true; updatePlayback(); });
  document.addEventListener('motion:resume', () => { systemPaused = false; updatePlayback(); });

  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(mount);
  });
  resizeObserver.observe(stage);

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(resizeFrame);
    resizeObserver.disconnect();
    droplets?.destroy();
  }, { once: true });
}
