// Vanilla WebGL2 adaptation of https://www.reactbits.dev/backgrounds/floating-lines
(() => {
  const stage = document.querySelector('[data-floating-lines-stage]');
  const canvas = stage?.querySelector('[data-floating-lines-canvas]');
  if (!stage || !canvas) return;

  const settings = window.MotionLabSettings;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = [...document.querySelectorAll('[data-floating-lines-control]')];
  const values = {
    speed: 1,
    topLines: 6,
    middleLines: 8,
    bottomLines: 10,
    distance: 5,
    bendRadius: 5,
    bendStrength: -.5,
    damping: .05,
    parallax: .2,
    opacity: 1,
    hue: 0,
    lightMode: 0,
  };
  let manuallyPaused = false;
  let systemPaused = document.hidden || reducedMotion.matches;
  let inViewport = false;
  let frameId = 0;
  let elapsed = 0;
  let last = performance.now();
  const targetMouse = { x: -1000, y: -1000 };
  const currentMouse = { x: -1000, y: -1000 };
  const targetParallax = { x: 0, y: 0 };
  const currentParallax = { x: 0, y: 0 };
  let targetInfluence = 0;
  let currentInfluence = 0;

  const formatValue = (input) => input.dataset.floatingLinesControl === 'lightMode'
    ? (Number(input.value) ? 'On' : 'Off')
    : `${input.value}${input.dataset.suffix || ''}`;

  controls.forEach((input) => {
    const property = input.dataset.floatingLinesControl;
    const stored = settings?.get('live-backgrounds', 'reactbits-floating-lines', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    values[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = formatValue(input);
  });

  const applyAppearance = () => {
    stage.style.setProperty('--floating-lines-opacity', values.opacity);
    stage.style.setProperty('--floating-lines-hue', `${values.hue}deg`);
    stage.classList.toggle('is-floating-lines-light', Boolean(values.lightMode));
  };
  applyAppearance();

  const gl = canvas.getContext('webgl2', { alpha: false, antialias: true });
  if (!gl) {
    stage.classList.add('is-floating-lines-fallback');
    return;
  }

  const vertexSource = `#version 300 es
    in vec2 position;
    void main(){gl_Position=vec4(position,0.0,1.0);}
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform float iTime;
    uniform vec3 iResolution;
    uniform float animationSpeed;
    uniform bool enableTop;
    uniform bool enableMiddle;
    uniform bool enableBottom;
    uniform int topLineCount;
    uniform int middleLineCount;
    uniform int bottomLineCount;
    uniform float topLineDistance;
    uniform float middleLineDistance;
    uniform float bottomLineDistance;
    uniform vec3 topWavePosition;
    uniform vec3 middleWavePosition;
    uniform vec3 bottomWavePosition;
    uniform vec2 iMouse;
    uniform bool interactive;
    uniform float bendRadius;
    uniform float bendStrength;
    uniform float bendInfluence;
    uniform bool parallax;
    uniform vec2 parallaxOffset;
    uniform vec3 lineGradient[8];
    uniform int lineGradientCount;
    uniform bool lightMode;
    out vec4 fragColor;
    const vec3 BLACK=vec3(0.0);
    const vec3 PINK=vec3(233.0,71.0,245.0)/255.0;
    const vec3 BLUE=vec3(47.0,75.0,162.0)/255.0;
    mat2 rotate(float r){return mat2(cos(r),sin(r),-sin(r),cos(r));}
    vec3 background_color(vec2 uv){
      vec3 col=vec3(0.0);
      float y=sin(uv.x-0.2)*0.3-0.1;
      float m=uv.y-y;
      col+=mix(BLUE,BLACK,smoothstep(0.0,1.0,abs(m)));
      col+=mix(PINK,BLACK,smoothstep(0.0,1.0,abs(m-0.8)));
      return col*0.5;
    }
    vec3 getLineColor(float t,vec3 baseColor){
      if(lineGradientCount<=0)return baseColor;
      if(lineGradientCount==1)return lineGradient[0]*0.5;
      float scaled=clamp(t,0.0,0.9999)*float(lineGradientCount-1);
      int idx=int(floor(scaled));
      int idx2=min(idx+1,lineGradientCount-1);
      return mix(lineGradient[idx],lineGradient[idx2],fract(scaled))*0.5;
    }
    float wave(vec2 uv,float offset,vec2 screenUv,vec2 mouseUv,bool shouldBend){
      float time=iTime*animationSpeed;
      float xMovement=time*0.1;
      float amp=sin(offset+time*0.2)*0.3;
      float y=sin(uv.x+offset+xMovement)*amp;
      if(shouldBend){
        vec2 d=screenUv-mouseUv;
        float influence=exp(-dot(d,d)*bendRadius);
        y+=(mouseUv.y-screenUv.y)*influence*bendStrength*bendInfluence;
      }
      float m=uv.y-y;
      return 0.0175/max(abs(m)+0.01,1e-3)+0.01;
    }
    void mainImage(out vec4 color,in vec2 fragCoord){
      vec2 baseUv=(2.0*fragCoord-iResolution.xy)/iResolution.y;
      baseUv.y*=-1.0;
      if(parallax)baseUv+=parallaxOffset;
      vec3 col=vec3(0.0);
      vec3 base=lineGradientCount>0?vec3(0.0):background_color(baseUv);
      vec2 mouseUv=vec2(0.0);
      if(interactive){
        mouseUv=(2.0*iMouse-iResolution.xy)/iResolution.y;
        mouseUv.y*=-1.0;
      }
      if(enableBottom){
        for(int i=0;i<bottomLineCount;++i){
          float fi=float(i);float t=fi/max(float(bottomLineCount-1),1.0);
          vec3 lineCol=getLineColor(t,base);
          float angle=bottomWavePosition.z*log(length(baseUv)+1.0);
          vec2 ruv=baseUv*rotate(angle);
          col+=lineCol*wave(ruv+vec2(bottomLineDistance*fi+bottomWavePosition.x,bottomWavePosition.y),1.5+0.2*fi,baseUv,mouseUv,interactive)*0.2;
        }
      }
      if(enableMiddle){
        for(int i=0;i<middleLineCount;++i){
          float fi=float(i);float t=fi/max(float(middleLineCount-1),1.0);
          vec3 lineCol=getLineColor(t,base);
          float angle=middleWavePosition.z*log(length(baseUv)+1.0);
          vec2 ruv=baseUv*rotate(angle);
          col+=lineCol*wave(ruv+vec2(middleLineDistance*fi+middleWavePosition.x,middleWavePosition.y),2.0+0.15*fi,baseUv,mouseUv,interactive);
        }
      }
      if(enableTop){
        for(int i=0;i<topLineCount;++i){
          float fi=float(i);float t=fi/max(float(topLineCount-1),1.0);
          vec3 lineCol=getLineColor(t,base);
          float angle=topWavePosition.z*log(length(baseUv)+1.0);
          vec2 ruv=baseUv*rotate(angle);ruv.x*=-1.0;
          col+=lineCol*wave(ruv+vec2(topLineDistance*fi+topWavePosition.x,topWavePosition.y),1.0+0.2*fi,baseUv,mouseUv,interactive)*0.1;
        }
      }
      if(lightMode){
        vec3 energy=max(col,vec3(0.0));
        float peak=max(energy.r,max(energy.g,energy.b));
        float coverage=smoothstep(0.018,0.5,peak);
        vec3 chroma=clamp(energy/max(peak,0.0001),0.0,1.0);
        chroma=pow(chroma,vec3(1.35));
        float chromaPeak=max(chroma.r,max(chroma.g,chroma.b));
        chroma/=max(chromaPeak,0.0001);
        vec3 ink=mix(chroma,clamp(chroma*0.82,0.0,1.0),smoothstep(0.5,1.0,coverage));
        color=vec4(mix(vec3(1.0),ink,coverage*0.94),1.0);
      }else color=vec4(col,1.0);
    }
    void main(){mainImage(fragColor,gl_FragCoord.xy);}
  `;

  const createShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Floating Lines shader compilation failed.');
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
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Floating Lines shader link failed.');
  } catch (error) {
    console.warn('React Bits Floating Lines is using its CSS fallback.', error);
    stage.classList.add('is-floating-lines-fallback');
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const names = ['iTime','iResolution','animationSpeed','enableTop','enableMiddle','enableBottom','topLineCount','middleLineCount','bottomLineCount','topLineDistance','middleLineDistance','bottomLineDistance','topWavePosition','middleWavePosition','bottomWavePosition','iMouse','interactive','bendRadius','bendStrength','bendInfluence','parallax','parallaxOffset','lineGradient[0]','lineGradientCount','lightMode'];
  const uniforms = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(program, name)]));
  const gradient = new Float32Array(8 * 3).fill(1);

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    gl.uniform1f(uniforms.iTime, elapsed);
    gl.uniform3f(uniforms.iResolution, canvas.width, canvas.height, 1);
    gl.uniform1f(uniforms.animationSpeed, values.speed);
    gl.uniform1i(uniforms.enableTop, values.topLines > 0);
    gl.uniform1i(uniforms.enableMiddle, values.middleLines > 0);
    gl.uniform1i(uniforms.enableBottom, values.bottomLines > 0);
    gl.uniform1i(uniforms.topLineCount, values.topLines);
    gl.uniform1i(uniforms.middleLineCount, values.middleLines);
    gl.uniform1i(uniforms.bottomLineCount, values.bottomLines);
    gl.uniform1f(uniforms.topLineDistance, values.distance * .01);
    gl.uniform1f(uniforms.middleLineDistance, values.distance * .008);
    gl.uniform1f(uniforms.bottomLineDistance, values.distance * .006);
    gl.uniform3f(uniforms.topWavePosition, 10, .5, -.4);
    gl.uniform3f(uniforms.middleWavePosition, 5, 0, .2);
    gl.uniform3f(uniforms.bottomWavePosition, 2, -.7, -1);
    gl.uniform2f(uniforms.iMouse, currentMouse.x, currentMouse.y);
    gl.uniform1i(uniforms.interactive, 1);
    gl.uniform1f(uniforms.bendRadius, values.bendRadius);
    gl.uniform1f(uniforms.bendStrength, values.bendStrength);
    gl.uniform1f(uniforms.bendInfluence, currentInfluence);
    gl.uniform1i(uniforms.parallax, values.parallax > 0);
    gl.uniform2f(uniforms.parallaxOffset, currentParallax.x, currentParallax.y);
    gl.uniform3fv(uniforms['lineGradient[0]'], gradient);
    gl.uniform1i(uniforms.lineGradientCount, 0);
    gl.uniform1i(uniforms.lightMode, values.lightMode);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    stage.classList.add('is-floating-lines-webgl');
  };

  const render = (now) => {
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt;
    const damping = values.damping;
    currentMouse.x += (targetMouse.x - currentMouse.x) * damping;
    currentMouse.y += (targetMouse.y - currentMouse.y) * damping;
    currentInfluence += (targetInfluence - currentInfluence) * damping;
    currentParallax.x += (targetParallax.x - currentParallax.x) * damping;
    currentParallax.y += (targetParallax.y - currentParallax.y) * damping;
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

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    targetMouse.x = x * scaleX;
    targetMouse.y = (rect.height - y) * scaleY;
    targetInfluence = 1;
    targetParallax.x = ((x - rect.width / 2) / rect.width) * values.parallax;
    targetParallax.y = (-(y - rect.height / 2) / rect.height) * values.parallax;
  });
  canvas.addEventListener('pointerleave', () => { targetInfluence = 0; });

  controls.forEach((input) => {
    input.addEventListener('input', () => {
      const property = input.dataset.floatingLinesControl;
      values[property] = Number(input.value);
      settings?.set('live-backgrounds', 'reactbits-floating-lines', property, values[property]);
      const output = input.closest('label')?.querySelector('output');
      if (output) output.value = formatValue(input);
      applyAppearance();
      if (!frameId) draw();
    });
  });

  document.querySelector('[data-floating-lines-toggle]')?.addEventListener('click', (event) => {
    manuallyPaused = !manuallyPaused;
    event.currentTarget.textContent = manuallyPaused ? 'Play' : 'Pause';
    stage.classList.toggle('is-floating-lines-paused', manuallyPaused || systemPaused);
    if (manuallyPaused) stop();
    else start();
  });
  document.querySelector('[data-floating-lines-reset]')?.addEventListener('click', () => {
    elapsed = 0;
    currentInfluence = 0;
    targetInfluence = 0;
    currentParallax.x = currentParallax.y = targetParallax.x = targetParallax.y = 0;
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
    stage.classList.add('is-floating-lines-paused');
    stop();
  };
  const handleResume = () => {
    systemPaused = reducedMotion.matches;
    stage.classList.toggle('is-floating-lines-paused', systemPaused || manuallyPaused);
    start();
  };
  const handleReducedMotion = (event) => {
    systemPaused = event.matches || document.hidden;
    stage.classList.toggle('is-floating-lines-paused', systemPaused || manuallyPaused);
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
