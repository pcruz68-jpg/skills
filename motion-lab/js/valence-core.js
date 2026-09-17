(() => {
  const stage = document.querySelector('[data-valence-stage]');
  const button = stage?.querySelector('[data-valence-button]');
  const canvas = stage?.querySelector('[data-valence-canvas]');

  if (!stage || !button || !canvas) return;

  const settings = window.MotionLabSettings;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = [...document.querySelectorAll('[data-valence-control]')];
  const values = {
    idleArcs: 2.4,
    hoverArcs: 5.8,
    speed: 1,
    distortion: .11,
    glow: 1,
    flash: 1,
    radius: .14,
    intro: 1.15,
    hue: 0,
    shadow: 15,
  };
  let manuallyPaused = false;
  let systemPaused = document.hidden || reducedMotion.matches;
  let inViewport = false;
  let hovering = false;
  let frameId = 0;
  let introAnimation = null;
  let arcs = values.idleArcs;
  let flash = 0;
  let crawl = 0;
  let last = performance.now();

  controls.forEach((input) => {
    const property = input.dataset.valenceControl;
    const stored = settings?.get('component-motion', 'valence-core', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    values[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
  });

  const applyAppearance = () => {
    button.style.setProperty('--valence-hue', `${values.hue}deg`);
    button.style.setProperty('--valence-shadow', `${values.shadow}px`);
  };
  applyAppearance();

  const gl = canvas.getContext('webgl', { alpha: false, antialias: true });
  if (!gl) {
    button.style.opacity = '1';
    stage.classList.add('is-valence-fallback');
    return;
  }

  const vertexSource = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragmentSource = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time;
    uniform float u_arcs;
    uniform float u_flash;
    uniform float u_distortion;
    uniform float u_glow;
    uniform float u_radius;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);
      vec2 u=f*f*(3.0-2.0*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);
    }
    float fbm(vec2 p){
      float v=0.0;float a=0.5;
      for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.05+vec2(9.7,3.1);a*=0.5;}
      return v;
    }
    float sdRBox(vec2 p,vec2 b,float r){
      vec2 q=abs(p)-b+r;
      return length(max(q,0.0))+min(max(q.x,q.y),0.0)-r;
    }
    void main(){
      vec2 p=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
      float ar=u_res.x/u_res.y;
      vec2 hs=vec2(ar*0.5-0.2,0.5-0.2);
      float d=sdRBox(p,hs,u_radius);
      float hover=clamp(u_arcs/6.0,0.0,1.0);
      vec3 col=vec3(0.039);
      float plate=1.0-smoothstep(-0.004,0.004,d);
      vec3 plateCol=vec3(0.04,0.05,0.055)+vec3(0.014,0.022,0.035)*fbm(p*9.0);
      plateCol+=vec3(0.0,0.25,0.3)*exp(d*9.0)*(0.25+hover*0.6);
      col=mix(col,plateCol,plate);
      col*=1.0+0.5*exp(-max(d,0.0)*16.0)*(1.0-plate);
      float a=atan(p.y,p.x);
      vec3 arcCol=vec3(0.0);
      for(int i=0;i<6;i++){
        float fi=float(i);
        float w=clamp(u_arcs-fi,0.0,1.0);
        float n1=fbm(vec2(a*2.4+fi*11.3,u_time*(1.6+fi*0.27)+fi*53.1));
        float off=(n1-0.5)*(u_distortion+u_flash*0.1);
        float seg=0.3+0.7*smoothstep(0.35,0.75,noise(vec2(a*1.8+fi*7.7,u_time*(0.9+fi*0.13)+fi*19.0)));
        float g=0.0042/(abs(d+off)+0.006);
        arcCol+=(vec3(0.0,0.75,0.9)*g+vec3(0.6,1.0,0.95)*g*g*0.55)*w*seg;
      }
      float outerMask=1.0-smoothstep(0.04,0.15,d);
      col+=arcCol*(0.6+0.4*hover)*outerMask*u_glow;
      float ring=0.006/(abs(d)+0.006);
      col+=vec3(0.8,0.98,1.0)*ring*u_flash*1.5*outerMask;
      col+=vec3(0.7,0.95,1.0)*u_flash*0.16*outerMask;
      gl_FragColor=vec4(col,1.0);
    }
  `;

  const createShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Valence shader compilation failed.');
    }
    return shader;
  };

  let vertexShader;
  let fragmentShader;
  let program;
  try {
    vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);
    fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Valence shader link failed.');
  } catch (error) {
    console.warn('Valence Core is using its CSS fallback.', error);
    button.style.opacity = '1';
    stage.classList.add('is-valence-fallback');
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    resolution: gl.getUniformLocation(program, 'u_res'),
    time: gl.getUniformLocation(program, 'u_time'),
    arcs: gl.getUniformLocation(program, 'u_arcs'),
    flash: gl.getUniformLocation(program, 'u_flash'),
    distortion: gl.getUniformLocation(program, 'u_distortion'),
    glow: gl.getUniformLocation(program, 'u_glow'),
    radius: gl.getUniformLocation(program, 'u_radius'),
  };

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(button.clientWidth * dpr));
    const height = Math.max(1, Math.round(button.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const draw = (now, advance = true) => {
    resize();
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    const target = hovering ? values.hoverArcs : values.idleArcs;
    if (advance) {
      arcs += (target - arcs) * Math.min(1, dt * 5);
      flash *= Math.exp(-3.6 * dt);
      crawl += dt * values.speed * (.6 + (arcs / 6) * 1.1 + flash * 2);
    }
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, crawl || 3);
    gl.uniform1f(uniforms.arcs, arcs);
    gl.uniform1f(uniforms.flash, flash);
    gl.uniform1f(uniforms.distortion, values.distortion);
    gl.uniform1f(uniforms.glow, values.glow);
    gl.uniform1f(uniforms.radius, values.radius);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stage.classList.add('is-valence-webgl');
  };

  const render = (now) => {
    draw(now);
    frameId = requestAnimationFrame(render);
  };
  const stop = () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
  };
  const start = () => {
    if (frameId || manuallyPaused || systemPaused || !inViewport) return;
    last = performance.now();
    frameId = requestAnimationFrame(render);
  };
  const playIntro = () => {
    introAnimation?.cancel();
    button.style.opacity = '0';
    if (reducedMotion.matches || values.intro === 0) {
      button.style.opacity = '1';
      return;
    }
    introAnimation = button.animate([
      { opacity: 0, transform: 'scale(.92)', offset: 0 },
      { opacity: .85, offset: .09 },
      { opacity: .12, offset: .15 },
      { opacity: .92, offset: .24 },
      { opacity: .35, offset: .31 },
      { opacity: 1, transform: 'scale(1.015)', offset: .44 },
      { opacity: 1, transform: 'scale(1)', offset: 1 },
    ], { duration: values.intro * 1000, easing: 'linear' });
    introAnimation.addEventListener('finish', () => {
      button.style.opacity = '1';
      introAnimation?.cancel();
      introAnimation = null;
    }, { once: true });
  };

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.valenceControl;
      const value = Number(input.value);
      values[property] = value;
      settings?.set('component-motion', 'valence-core', property, value);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = `${input.value}${input.dataset.suffix || ''}`;
      applyAppearance();
      if (!frameId) draw(performance.now(), false);
    });
  });

  button.addEventListener('mouseenter', () => { hovering = true; });
  button.addEventListener('mouseleave', () => { hovering = false; });
  button.addEventListener('click', () => {
    flash = values.flash;
    button.classList.remove('is-flashing');
    void button.offsetWidth;
    button.classList.add('is-flashing');
    window.setTimeout(() => button.classList.remove('is-flashing'), 220);
    if (!frameId) draw(performance.now(), false);
  });

  document.querySelector('[data-valence-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    stage.classList.toggle('is-valence-paused', manuallyPaused || systemPaused);
    if (manuallyPaused) stop();
    else start();
  });
  document.querySelector('[data-valence-reset]')?.addEventListener('click', () => {
    arcs = values.idleArcs;
    flash = values.flash;
    crawl = 0;
    playIntro();
    if (!frameId) draw(performance.now(), false);
  });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    if (inViewport) {
      playIntro();
      start();
    } else {
      stop();
      introAnimation?.pause();
    }
  }, { rootMargin: '180px 0px', threshold: 0 });
  visibilityObserver.observe(stage);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!frameId) draw(performance.now(), false);
  });
  resizeObserver.observe(button);

  const handlePause = () => {
    systemPaused = true;
    stage.classList.add('is-valence-paused');
    stop();
  };
  const handleResume = () => {
    systemPaused = reducedMotion.matches;
    stage.classList.toggle('is-valence-paused', systemPaused || manuallyPaused);
    start();
  };
  const handleReducedMotion = (event) => {
    systemPaused = event.matches || document.hidden;
    stage.classList.toggle('is-valence-paused', systemPaused || manuallyPaused);
    if (systemPaused) {
      stop();
      draw(performance.now(), false);
    } else start();
  };
  const cleanup = () => {
    stop();
    introAnimation?.cancel();
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener('motion:pause', handlePause);
    document.removeEventListener('motion:resume', handleResume);
    reducedMotion.removeEventListener?.('change', handleReducedMotion);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  };

  document.addEventListener('motion:pause', handlePause);
  document.addEventListener('motion:resume', handleResume);
  reducedMotion.addEventListener?.('change', handleReducedMotion);
  window.addEventListener('pagehide', cleanup, { once: true });
})();
