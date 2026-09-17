// Vanilla WebGL2 adaptation of https://www.reactbits.dev/backgrounds/aurora
(() => {
  const stage = document.querySelector('[data-aurora-stage]');
  const canvas = stage?.querySelector('[data-aurora-canvas]');

  if (!stage || !canvas) return;

  const settings = window.MotionLabSettings;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = [...document.querySelectorAll('[data-aurora-control]')];
  const values = {
    speed: 1,
    amplitude: 1,
    blend: .5,
    opacity: 1,
    hue: 0,
    saturation: 1,
    brightness: 1,
    quality: 1,
    lightMode: 0,
  };
  let manuallyPaused = false;
  let systemPaused = document.hidden || reducedMotion.matches;
  let inViewport = false;
  let frameId = 0;
  let elapsed = 0;
  let last = performance.now();

  const formatValue = (input) => input.dataset.auroraControl === 'lightMode'
    ? (Number(input.value) ? 'On' : 'Off')
    : `${input.value}${input.dataset.suffix || ''}`;

  controls.forEach((input) => {
    const property = input.dataset.auroraControl;
    const stored = settings?.get('live-backgrounds', 'reactbits-aurora', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    values[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = formatValue(input);
  });

  const applyAppearance = () => {
    stage.style.setProperty('--aurora-opacity', values.opacity);
    stage.style.setProperty('--aurora-hue', `${values.hue}deg`);
    stage.style.setProperty('--aurora-saturation', values.saturation);
    stage.style.setProperty('--aurora-brightness', values.brightness);
    stage.classList.toggle('is-aurora-light', Boolean(values.lightMode));
  };
  applyAppearance();

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
  });
  if (!gl) {
    stage.classList.add('is-aurora-fallback');
    return;
  }

  const vertexSource = `#version 300 es
    in vec2 position;
    void main(){gl_Position=vec4(position,0.0,1.0);}
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform float uTime;
    uniform float uAmplitude;
    uniform vec3 uColorStops[3];
    uniform vec2 uResolution;
    uniform float uBlend;
    uniform float uLightMode;
    out vec4 fragColor;
    vec3 permute(vec3 x){return mod(((x*34.0)+1.0)*x,289.0);}
    float snoise(vec2 v){
      const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
      vec2 i=floor(v+dot(v,C.yy));
      vec2 x0=v-i+dot(i,C.xx);
      vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
      vec4 x12=x0.xyxy+C.xxzz;
      x12.xy-=i1;
      i=mod(i,289.0);
      vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
      vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
      m=m*m;
      m=m*m;
      vec3 x=2.0*fract(p*C.www)-1.0;
      vec3 h=abs(x)-0.5;
      vec3 ox=floor(x+0.5);
      vec3 a0=x-ox;
      m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
      vec3 g;
      g.x=a0.x*x0.x+h.x*x0.y;
      g.yz=a0.yz*x12.xz+h.yz*x12.yw;
      return 130.0*dot(m,g);
    }
    void main(){
      vec2 uv=gl_FragCoord.xy/uResolution;
      vec3 rampColor;
      if(uv.x<=0.5){rampColor=mix(uColorStops[0],uColorStops[1],uv.x*2.0);}
      else{rampColor=mix(uColorStops[1],uColorStops[2],(uv.x-0.5)*2.0);}
      float height=snoise(vec2(uv.x*2.0+uTime*0.1,uTime*0.25))*0.5*uAmplitude;
      height=exp(height);
      height=uv.y*2.0-height+0.2;
      float intensity=0.6*height;
      float midPoint=0.20;
      float auroraAlpha=smoothstep(midPoint-uBlend*0.5,midPoint+uBlend*0.5,intensity);
      vec3 auroraColor=intensity*rampColor;
      if(uLightMode>0.5){
        float energy=clamp(max(intensity,0.0),0.0,1.0);
        float coverage=clamp(auroraAlpha*(0.55+0.45*energy),0.0,0.86);
        vec3 chroma=pow(clamp(rampColor,0.0,1.0),vec3(1.2));
        float chromaPeak=max(chroma.r,max(chroma.g,chroma.b));
        chroma/=max(chromaPeak,0.0001);
        fragColor=vec4(mix(vec3(1.0),chroma,min(coverage*1.08,0.94)),1.0);
      }else{
        fragColor=vec4(auroraColor*auroraAlpha,auroraAlpha);
      }
    }
  `;

  const createShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Aurora shader compilation failed.');
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
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Aurora shader link failed.');
  } catch (error) {
    console.warn('React Bits Aurora is using its CSS fallback.', error);
    stage.classList.add('is-aurora-fallback');
    return;
  }

  gl.useProgram(program);
  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    time: gl.getUniformLocation(program, 'uTime'),
    amplitude: gl.getUniformLocation(program, 'uAmplitude'),
    colors: gl.getUniformLocation(program, 'uColorStops[0]'),
    resolution: gl.getUniformLocation(program, 'uResolution'),
    blend: gl.getUniformLocation(program, 'uBlend'),
    lightMode: gl.getUniformLocation(program, 'uLightMode'),
  };
  const colorStops = new Float32Array([
    0x52/255, 0x27/255, 1,
    0x7c/255, 1, 0x67/255,
    0x52/255, 0x27/255, 1,
  ]);

  const resize = () => {
    const dpr = Math.min((window.devicePixelRatio || 1) * values.quality, 2.5);
    const width = Math.max(1, Math.round(stage.clientWidth * dpr));
    const height = Math.max(1, Math.round(stage.clientHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const draw = () => {
    resize();
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.time, elapsed);
    gl.uniform1f(uniforms.amplitude, values.amplitude);
    gl.uniform3fv(uniforms.colors, colorStops);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.blend, values.blend);
    gl.uniform1f(uniforms.lightMode, values.lightMode);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stage.classList.add('is-aurora-webgl');
  };
  const render = (now) => {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt * values.speed;
    draw();
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

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.auroraControl;
      values[property] = Number(input.value);
      settings?.set('live-backgrounds', 'reactbits-aurora', property, values[property]);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = formatValue(input);
      applyAppearance();
      if (!frameId) draw();
    });
  });

  document.querySelector('[data-aurora-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    stage.classList.toggle('is-aurora-paused', manuallyPaused || systemPaused);
    if (manuallyPaused) stop();
    else start();
  });
  document.querySelector('[data-aurora-reset]')?.addEventListener('click', () => {
    elapsed = 0;
    draw();
  });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    if (inViewport) start();
    else stop();
  }, { rootMargin: '240px 0px', threshold: 0 });
  visibilityObserver.observe(stage);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!frameId) draw();
  });
  resizeObserver.observe(stage);

  const handlePause = () => {
    systemPaused = true;
    stage.classList.add('is-aurora-paused');
    stop();
  };
  const handleResume = () => {
    systemPaused = reducedMotion.matches;
    stage.classList.toggle('is-aurora-paused', systemPaused || manuallyPaused);
    start();
  };
  const handleReducedMotion = (event) => {
    systemPaused = event.matches || document.hidden;
    stage.classList.toggle('is-aurora-paused', systemPaused || manuallyPaused);
    if (systemPaused) {
      stop();
      draw();
    } else start();
  };
  const cleanup = () => {
    stop();
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
