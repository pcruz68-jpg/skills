import { createGlassObject } from './canvasui-glass-object.js';

const stage = document.querySelector('[data-glass-stage]');
const canvas = document.querySelector('[data-glass-canvas]');
const errorMessage = document.querySelector('[data-glass-error]');

if (stage && canvas) {
  const settings = window.MotionLabSettings;
  const controls = [...document.querySelectorAll('[data-glass-control]')];
  const options = {
    src: 'assets/glass-mark.svg',
    backgroundImage: 'assets/glass-backdrop.svg',
    background: '',
    ior: 1.75,
    thickness: 2.5,
    roughness: .12,
    dispersion: .8,
    clearcoat: 1,
    tint: '#effcff',
    tintDensity: .6,
    depth: .1,
    bevel: 1,
    highlight: '#c7ff4a',
    environmentIntensity: 2.1,
    scale: 2.7,
    xOffset: 0,
    yOffset: 0,
    floatIntensity: 1,
    rotationIntensity: 1,
    floatSpeed: 2,
    orbit: true,
    zoom: false,
    autoRotate: false,
    autoRotateSpeed: 2,
    fov: 55,
    cameraDistance: 4,
  };
  let glass = null;
  let manuallyPaused = false;
  let systemPaused = false;

  controls.forEach((input) => {
    const property = input.dataset.glassControl;
    const stored = settings?.get('spatial-3d', 'glass-object', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    options[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = input.value;
  });

  const motionOptions = () => manuallyPaused || systemPaused
    ? { floatIntensity: 0, rotationIntensity: 0, floatSpeed: 0 }
    : {
        floatIntensity: options.floatIntensity,
        rotationIntensity: options.rotationIntensity,
        floatSpeed: options.floatSpeed,
      };

  const mount = () => {
    glass?.destroy();
    stage.classList.remove('is-glass-ready');
    if (errorMessage) errorMessage.hidden = true;
    glass = createGlassObject({ canvas }, {
      ...options,
      ...motionOptions(),
      onLoad: () => stage.classList.add('is-glass-ready'),
      onError: (error) => {
        console.error('Glass Object asset failed:', error);
        if (errorMessage) errorMessage.hidden = false;
      },
    });
    if (!glass && errorMessage) errorMessage.hidden = false;
  };
  const updateMotion = () => glass?.setOptions(motionOptions());

  mount();

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.glassControl;
      const value = Number(input.value);
      options[property] = value;
      settings?.set('spatial-3d', 'glass-object', property, value);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = input.value;
      const motionProperty = ['floatIntensity', 'rotationIntensity', 'floatSpeed'].includes(property);
      glass?.setOptions(motionProperty ? motionOptions() : { [property]: value });
    });
  });

  document.querySelector('[data-glass-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    updateMotion();
  });
  document.querySelector('[data-glass-reset]')?.addEventListener('click', mount);
  document.addEventListener('motion:pause', () => { systemPaused = true; updateMotion(); });
  document.addEventListener('motion:resume', () => { systemPaused = false; updateMotion(); });
  window.addEventListener('pagehide', () => glass?.destroy(), { once: true });
}
