(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const settings = window.MotionLabSettings;
  const demos = new Map();
  const configs = {
    'liquid-shader': { speed: .22, scale: 2, wave: .14, glow: .13, pointer: .12 },
  };
  const controls = [...document.querySelectorAll('[data-live-control]')];

  controls.forEach((input) => {
    const effect = input.closest('.demo-section')?.id;
    const property = input.dataset.liveControl;
    const stored = settings?.get('live-backgrounds', effect, property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    if (configs[effect]) configs[effect][property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
  });

  const createShaderDemo = (canvas, config) => {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return { setVisible() {}, toggle: () => false, reset() {}, refresh() {}, pause() {}, resume() {}, destroy() {} };
    const vertexSource = `
      attribute vec2 a_position;
      void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
    `;
    const fragmentSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_pointer;
      uniform float u_speed;
      uniform float u_scale;
      uniform float u_wave;
      uniform float u_glow;
      uniform float u_pointer_strength;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1.,0.)), f.x), mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), f.x), f.y);
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        vec2 mouse = (u_pointer * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
        float t = u_time * u_speed;
        float n = noise(uv * u_scale + vec2(t, -t * .6));
        float wave = sin(uv.x * 3.2 + t * 2.0 + n * 3.0) * u_wave;
        float field = .12 / max(.035, abs(uv.y + wave - mouse.y * u_pointer_strength));
        vec3 a = vec3(.05,.08,.18);
        vec3 b = vec3(.36,.12,.75);
        vec3 c = vec3(.15,.88,.95);
        vec3 color = mix(a, b, smoothstep(-.8,.8, uv.x + n * .4));
        color += c * field * u_glow;
        color += vec3(.5,.9,.2) * pow(max(0., 1. - length(uv - mouse) * 1.8), 3.) * u_pointer_strength;
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    } catch (error) {
      console.error('Shader demo failed:', error);
      return { setVisible() {}, toggle: () => false, reset() {}, refresh() {}, pause() {}, resume() {}, destroy() {} };
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const pointerLocation = gl.getUniformLocation(program, 'u_pointer');
    const speedLocation = gl.getUniformLocation(program, 'u_speed');
    const scaleLocation = gl.getUniformLocation(program, 'u_scale');
    const waveLocation = gl.getUniformLocation(program, 'u_wave');
    const glowLocation = gl.getUniformLocation(program, 'u_glow');
    const pointerStrengthLocation = gl.getUniformLocation(program, 'u_pointer_strength');
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const stage = canvas.parentElement;
    const pointer = { x: .5, y: .5 };
    let raf = 0;
    let manualPaused = reduced;
    let systemPaused = false;
    let visible = false;
    let offset = 0;
    let pauseStarted = 0;
    const resize = () => {
      const rect = stage.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      render(performance.now());
    };
    const render = (time) => {
      gl.uniform1f(timeLocation, (time - offset) * .001);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform2f(pointerLocation, pointer.x * canvas.width, (1 - pointer.y) * canvas.height);
      gl.uniform1f(speedLocation, config.speed);
      gl.uniform1f(scaleLocation, config.scale);
      gl.uniform1f(waveLocation, config.wave);
      gl.uniform1f(glowLocation, config.glow);
      gl.uniform1f(pointerStrengthLocation, config.pointer);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const tick = (time) => { raf = 0; render(time); if (visible && !reduced && !manualPaused && !systemPaused) raf = requestAnimationFrame(tick); };
    const ensureLoop = () => { if (!raf && visible && !reduced && !manualPaused && !systemPaused) raf = requestAnimationFrame(tick); };
    const setVisible = (value) => { visible = value; if (!visible && raf) { cancelAnimationFrame(raf); raf = 0; } else ensureLoop(); };
    const toggle = () => {
      if (reduced) return false;
      manualPaused = !manualPaused;
      if (manualPaused) pauseStarted = performance.now();
      else { offset += performance.now() - pauseStarted; ensureLoop(); }
      if (manualPaused && raf) { cancelAnimationFrame(raf); raf = 0; }
      return !manualPaused;
    };
    const reset = () => { offset = performance.now(); render(performance.now()); };
    const onPointer = (event) => {
      const rect = stage.getBoundingClientRect();
      pointer.x = (event.clientX - rect.left) / rect.width;
      pointer.y = (event.clientY - rect.top) / rect.height;
    };
    if (!reduced) stage.addEventListener('pointermove', onPointer);
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    return {
      setVisible, toggle, reset,
      refresh: () => render(performance.now()),
      pause: () => { systemPaused = true; if (raf) cancelAnimationFrame(raf); raf = 0; },
      resume: () => { systemPaused = false; ensureLoop(); },
      destroy: () => { if (raf) cancelAnimationFrame(raf); ro.disconnect(); stage.removeEventListener('pointermove', onPointer); gl.deleteBuffer(buffer); gl.deleteProgram(program); },
    };
  };

  demos.set('shader-canvas', createShaderDemo(document.querySelector('#shader-canvas'), configs['liquid-shader']));

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const section = input.closest('.demo-section');
      const effect = section?.id;
      const property = input.dataset.liveControl;
      const value = Number(input.value);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
      if (!configs[effect]) return;
      configs[effect][property] = value;
      settings?.set('live-backgrounds', effect, property, value);
      const canvas = section.querySelector('canvas');
      demos.get(canvas?.id)?.refresh(property);
    });
  });

  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    const canvas = entry.target.querySelector('canvas');
    demos.get(canvas?.id)?.setVisible(entry.isIntersecting);
  }), { threshold: .08 });
  document.querySelectorAll('.background-stage canvas').forEach((canvas) => observer.observe(canvas.parentElement));

  document.querySelectorAll('[data-canvas-toggle]').forEach((button) => button.addEventListener('click', () => {
    const running = demos.get(button.dataset.canvasToggle)?.toggle();
    button.textContent = running ? 'Pause' : 'Play';
  }));
  document.querySelectorAll('[data-canvas-reset]').forEach((button) => button.addEventListener('click', () => demos.get(button.dataset.canvasReset)?.reset()));
  document.querySelector('[data-pause-stage]')?.addEventListener('click', (event) => {
    const stage = event.currentTarget.closest('.demo-card').querySelector('.demo-stage');
    const paused = stage.classList.toggle('is-paused');
    event.currentTarget.textContent = paused ? 'Play' : 'Pause';
  });
  document.addEventListener('motion:pause', () => demos.forEach((demo) => demo.pause()));
  document.addEventListener('motion:resume', () => demos.forEach((demo) => demo.resume()));
  window.addEventListener('pagehide', () => { observer.disconnect(); demos.forEach((demo) => demo.destroy()); }, { once: true });
})();
