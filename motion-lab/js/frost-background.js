import { createFrost } from './canvasui-frost.js';

const stage = document.querySelector('[data-frost-stage]');
const source = document.querySelector('[data-frost-source]');
const content = document.querySelector('[data-frost-content]');
const output = document.querySelector('[data-frost-output]');

if (stage && source && content && output) {
  const settings = window.MotionLabSettings;
  const controls = [...document.querySelectorAll('[data-frost-control]')];
  const options = {
    frost: .62,
    strength: 1.35,
    contrast: 4,
    crispness: 2,
    highlight: .58,
    highlightStrength: .8,
    haze: .9,
    tintThin: [.8, .9, 1.05],
    tintThick: [.92, .98, 1.1],
    tintStrength: .75,
    saturation: .65,
    brightness: 1.08,
    refraction: 1,
    ior: 1.31,
    detail: 2.2,
    textureScale: 1.8,
    fresnel: 1.15,
    meltRadius: .22,
    meltNoise: .35,
    meltStrength: .8,
    refreeze: 1.2,
    edgeFade: .1,
    meltEdges: true,
    introDuration: 1.8,
    opacity: 1,
    shimmer: .28,
    quality: .75,
  };
  let frost = null;
  let resizeFrame = 0;
  let manuallyPaused = false;
  let systemPaused = false;

  controls.forEach((input) => {
    const property = input.dataset.frostControl;
    const stored = settings?.get('live-backgrounds', 'frost', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    options[property] = Number(input.value);
    const value = input.closest('label')?.querySelector('output');
    if (value) value.value = input.value;
  });

  const paintSource = () => {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    source.width = Math.max(1, Math.round(rect.width * dpr));
    source.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = source.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = source.width / dpr;
    const h = source.height / dpr;

    const base = ctx.createLinearGradient(0, 0, w, h);
    base.addColorStop(0, '#54234f');
    base.addColorStop(.48, '#174e66');
    base.addColorStop(1, '#0a2430');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const sun = ctx.createRadialGradient(w * .73, h * .2, 0, w * .73, h * .2, w * .32);
    sun.addColorStop(0, 'rgba(255,211,134,.96)');
    sun.addColorStop(.18, 'rgba(255,157,91,.72)');
    sun.addColorStop(1, 'rgba(255,118,87,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    const glow = ctx.createRadialGradient(w * .15, h * .82, 0, w * .15, h * .82, w * .42);
    glow.addColorStop(0, 'rgba(255,90,112,.76)');
    glow.addColorStop(1, 'rgba(255,90,112,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w * .78, h * .72);
    ctx.rotate(-.12);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = `rgba(${255 - i * 24},${122 + i * 34},${78 + i * 52},${.34 - i * .07})`;
      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-w * (.17 + i * .025), -h * (.075 + i * .022), w * (.34 + i * .05), h * (.15 + i * .044), 18 + i * 5);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(.07);
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = .16;
    ctx.strokeStyle = '#ffffff';
    for (let x = -h; x < w + h; x += 62) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + h * .7, 0);
      ctx.stroke();
    }
    ctx.restore();
  };

  const stop = () => {
    frost?.destroy();
    frost = null;
  };
  const mount = () => {
    stop();
    paintSource();
    frost = createFrost({ source, content, output }, options);
    stage.classList.toggle('is-frost-active', Boolean(frost));
  };

  mount();

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.frostControl;
      const value = Number(input.value);
      options[property] = value;
      settings?.set('live-backgrounds', 'frost', property, value);
      const display = input.closest('label')?.querySelector('output');
      if (display) display.value = input.value;
      frost?.setOptions({ [property]: value });
    });
  });

  document.querySelector('[data-frost-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    if (manuallyPaused) stop();
    else if (!systemPaused) mount();
  });
  document.querySelector('[data-frost-reset]')?.addEventListener('click', () => {
    mount();
    if (manuallyPaused || systemPaused) requestAnimationFrame(stop);
  });
  document.addEventListener('motion:pause', () => { systemPaused = true; stop(); });
  document.addEventListener('motion:resume', () => { systemPaused = false; if (!manuallyPaused) mount(); });

  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (!manuallyPaused && !systemPaused) mount();
      else paintSource();
    });
  });
  resizeObserver.observe(stage);

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(resizeFrame);
    resizeObserver.disconnect();
    stop();
  }, { once: true });
}
