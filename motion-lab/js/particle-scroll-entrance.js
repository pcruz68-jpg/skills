import { createParticleScroll } from './canvasui-particle-scroll.js';

const stage = document.querySelector('[data-particle-scroll-stage]');
const source = document.querySelector('[data-particle-scroll-source]');
const content = document.querySelector('[data-particle-scroll-content]');
const output = document.querySelector('[data-particle-scroll-output]');

if (stage && source && content && output) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = window.MotionLabSettings;
  const controls = [...document.querySelectorAll('[data-particle-scroll-control]')];
  const options = {
    point: .6,
    band: 150,
    density: 2.4,
    size: 1.4,
    spread: 110,
    gravity: .35,
    drift: .55,
    swirl: 44,
    stagger: .68,
    fade: .86,
    settle: .8,
    smoothing: .3,
  };
  let particleScroll = null;
  let replayFrame = 0;
  let resizeFrame = 0;
  let systemPaused = false;

  controls.forEach((input) => {
    const property = input.dataset.particleScrollControl;
    const stored = settings?.get('entrances', 'particle-scroll', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    options[property] = Number(input.value);
    const value = input.closest('label')?.querySelector('output');
    if (value) value.value = `${input.value}${input.dataset.suffix || ''}`;
    input.disabled = reduced;
  });
  stage.style.setProperty('--particle-point', `${options.point * 100}%`);

  const sections = [
    { number: '01', title: 'Fragments find their place.', color: '#58e4ff', glow: 'rgba(88,228,255,.2)' },
    { number: '02', title: 'Signal becomes structure.', color: '#9d7cff', glow: 'rgba(157,124,255,.22)' },
    { number: '03', title: 'Motion resolves into form.', color: '#c7ff4a', glow: 'rgba(199,255,74,.16)' },
  ];

  const paintSource = () => {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    source.width = Math.max(1, Math.round(rect.width * dpr));
    source.height = Math.max(1, Math.round(rect.height * dpr));
    const ctx = source.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = source.width / dpr;
    const h = source.height / dpr;
    const scroll = content.scrollTop;
    ctx.fillStyle = '#080b0b';
    ctx.fillRect(0, 0, w, h);

    sections.forEach((section, index) => {
      const top = index * 270 - scroll;
      if (top > h || top + 270 < 0) return;
      const glow = ctx.createRadialGradient(index % 2 ? w * .18 : w * .8, top + 70, 0, index % 2 ? w * .18 : w * .8, top + 70, w * .42);
      glow.addColorStop(0, section.glow);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, top, w, 270);
      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.moveTo(0, top + 269.5);
      ctx.lineTo(w, top + 269.5);
      ctx.stroke();
      ctx.fillStyle = section.color;
      ctx.font = '500 9px DM Mono, monospace';
      ctx.fillText(section.number, 34, top + 48);
      ctx.fillStyle = '#f4f6ee';
      ctx.font = `600 ${Math.max(27, Math.min(42, w * .065))}px Manrope, sans-serif`;
      const words = section.title.split(' ');
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const next = line ? `${line} ${word}` : word;
        if (ctx.measureText(next).width > w - 68 && line) { lines.push(line); line = word; }
        else line = next;
      });
      lines.push(line);
      lines.slice(0, 2).forEach((text, lineIndex) => ctx.fillText(text, 34, top + 86 + lineIndex * 38));
      const bar = ctx.createLinearGradient(34, 0, w - 34, 0);
      bar.addColorStop(0, section.color);
      bar.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = .42;
      ctx.fillStyle = bar;
      ctx.beginPath();
      ctx.roundRect(34, top + 194, w - 68, 34, 17);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  };

  const mount = () => {
    particleScroll?.destroy();
    paintSource();
    particleScroll = createParticleScroll({ source, content, output }, options);
    stage.classList.toggle('is-particle-scroll-active', Boolean(particleScroll));
  };
  const stop = () => {
    particleScroll?.destroy();
    particleScroll = null;
  };

  content.addEventListener('scroll', paintSource, { passive: true });
  mount();

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.particleScrollControl;
      const value = Number(input.value);
      options[property] = value;
      if (property === 'point') stage.style.setProperty('--particle-point', `${value * 100}%`);
      settings?.set('entrances', 'particle-scroll', property, value);
      const display = input.closest('label')?.querySelector('output');
      if (display) display.value = `${input.value}${input.dataset.suffix || ''}`;
      particleScroll?.setOptions({ [property]: value });
    });
  });

  const replay = () => {
    cancelAnimationFrame(replayFrame);
    const start = content.scrollHeight - content.clientHeight;
    content.scrollTop = start;
    const started = performance.now();
    const duration = 1500;
    const frame = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      content.scrollTop = start * (1 - eased);
      if (progress < 1) replayFrame = requestAnimationFrame(frame);
    };
    replayFrame = requestAnimationFrame(frame);
  };

  const replayButton = document.querySelector('[data-particle-scroll-replay]');
  if (replayButton) {
    replayButton.disabled = reduced;
    replayButton.addEventListener('click', replay);
  }
  document.addEventListener('motion:pause', () => { systemPaused = true; stop(); });
  document.addEventListener('motion:resume', () => { systemPaused = false; mount(); });

  const resizeObserver = new ResizeObserver(() => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      paintSource();
      if (!systemPaused) content.dispatchEvent(new Event('scroll'));
    });
  });
  resizeObserver.observe(stage);

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(replayFrame);
    cancelAnimationFrame(resizeFrame);
    resizeObserver.disconnect();
    content.removeEventListener('scroll', paintSource);
    stop();
  }, { once: true });
}
