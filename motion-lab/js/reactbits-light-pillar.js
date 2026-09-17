// Vanilla WebGL2 adaptation of https://www.reactbits.dev/backgrounds/light-pillar
(() => {
  const stage = document.querySelector('[data-light-pillar-stage]');
  const canvas = stage?.querySelector('[data-light-pillar-canvas]');
  if (!stage || !canvas) return;

  const settings = window.MotionLabSettings;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const controls = [...document.querySelectorAll('[data-light-pillar-control]')];
  const values = {
    rotationSpeed: .3,
    intensity: 1,
    glow: .005,
    width: 3,
    height: .4,
    noise: .5,
    pillarRotation: 0,
    palette: 0,
    opacity: 1,
    interactive: 1,
    quality: 2,
  };
  const qualities = [
    { name: 'Low', iterations: 24, waves: 1, dpr: .5, step: 1.5 },
    { name: 'Medium', iterations: 40, waves: 2, dpr: .65, step: 1.2 },
    { name: 'High', iterations: 80, waves: 4, dpr: Math.min(window.devicePixelRatio || 1, 2), step: 1 },
  ];
  let manuallyPaused = false;
  let systemPaused = document.hidden || reducedMotion.matches;
  let inViewport = false;
  let frameId = 0;
  let elapsed = 0;
  let last = performance.now();
  const targetMouse = { x: 0, y: 0 };
  const currentMouse = { x: 0, y: 0 };

  const formatValue = (input) => {
    const property = input.dataset.lightPillarControl;
    if (property === 'interactive') return Number(input.value) ? 'On' : 'Off';
    if (property === 'quality') return qualities[Number(input.value)]?.name || 'Medium';
    return `${input.value}${input.dataset.suffix || ''}`;
  };

  controls.forEach((input) => {
    const property = input.dataset.lightPillarControl;
    const stored = settings?.get('live-backgrounds', 'reactbits-light-pillar', property, input.value);
    if (Number.isFinite(Number(stored))) input.value = stored;
    values[property] = Number(input.value);
    const output = input.closest('label')?.querySelector('output');
    if (output) output.value = formatValue(input);
  });

  const applyAppearance = () => {
    stage.style.setProperty('--light-pillar-opacity', values.opacity);
    stage.style.setProperty('--light-pillar-hue', `${values.palette}deg`);
    stage.style.setProperty('--light-pillar-rotation', `${values.pillarRotation}deg`);
  };
  applyAppearance();

  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
  });
  if (!gl) {
    stage.classList.add('is-light-pillar-fallback');
    return;
  }

  const vertexSource = `#version 300 es
    in vec2 position;
    out vec2 vUv;
    void main(){
      vUv=position*0.5+0.5;
      gl_Position=vec4(position,0.0,1.0);
    }
  `;
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform vec2 uMouse;
    uniform vec3 uTopColor;
    uniform vec3 uBottomColor;
    uniform float uIntensity;
    uniform bool uInteractive;
    uniform float uGlowAmount;
    uniform float uPillarWidth;
    uniform float uPillarHeight;
    uniform float uNoiseIntensity;
    uniform float uRotCos;
    uniform float uRotSin;
    uniform float uPillarRotCos;
    uniform float uPillarRotSin;
    uniform float uWaveSin[4];
    uniform float uWaveCos[4];
    uniform int uIterations;
    uniform int uWaveIterations;
    uniform float uStepMultiplier;
    in vec2 vUv;
    out vec4 fragColor;
    const float PI=3.141592653589793;
    const float EPSILON=0.001;
    const float E=2.71828182845904523536;

    float noise(vec2 coord){
      vec2 r=E*sin(E*coord);
      return fract(r.x*r.y*(1.0+coord.x));
    }

    void main(){
      vec2 fragCoord=vUv*uResolution;
      vec2 uv=(fragCoord*2.0-uResolution)/uResolution.y;
      uv=vec2(
        uv.x*uPillarRotCos-uv.y*uPillarRotSin,
        uv.x*uPillarRotSin+uv.y*uPillarRotCos
      );

      vec3 origin=vec3(0.0,0.0,-10.0);
      vec3 direction=normalize(vec3(uv,1.0));
      float depth=0.1;
      float rotCos=uRotCos;
      float rotSin=uRotSin;
      if(uInteractive&&length(uMouse)>0.0){
        float mouseAngle=uMouse.x*PI*2.0;
        rotCos=cos(mouseAngle);
        rotSin=sin(mouseAngle);
      }
      vec3 color=vec3(0.0);

      for(int i=0;i<80;i++){
        if(i>=uIterations) break;
        vec3 pos=origin+direction*depth;
        float newX=pos.x*rotCos-pos.z*rotSin;
        float newZ=pos.x*rotSin+pos.z*rotCos;
        pos.x=newX;
        pos.z=newZ;

        vec3 deformed=pos;
        deformed.y*=uPillarHeight;
        deformed+=vec3(0.0,uTime,0.0);
        float frequency=1.0;
        float amplitude=1.0;
        for(int j=0;j<4;j++){
          if(j>=uWaveIterations) break;
          float wx=deformed.x*uWaveCos[j]-deformed.z*uWaveSin[j];
          float wz=deformed.x*uWaveSin[j]+deformed.z*uWaveCos[j];
          deformed.x=wx;
          deformed.z=wz;
          float phase=uTime*float(j)*2.0;
          deformed+=cos(deformed.zxy*frequency-phase)*amplitude;
          frequency*=2.0;
          amplitude*=0.5;
        }

        float fieldDistance=length(cos(deformed.xz))-0.2;
        float radialBound=length(pos.xz)-uPillarWidth;
        float k=4.0;
        float h=max(k-abs(-radialBound-(-fieldDistance)),0.0);
        fieldDistance=-(min(-radialBound,-fieldDistance)-h*h*0.25/k);
        fieldDistance=abs(fieldDistance)*0.15+0.01;
        vec3 gradient=mix(uBottomColor,uTopColor,smoothstep(15.0,-15.0,pos.y));
        color+=gradient/fieldDistance;
        if(fieldDistance<EPSILON||depth>50.0) break;
        depth+=fieldDistance*uStepMultiplier;
      }

      float widthNormalization=uPillarWidth/3.0;
      color=tanh(color*uGlowAmount/max(widthNormalization,0.001));
      color-=noise(gl_FragCoord.xy)/15.0*uNoiseIntensity;
      fragColor=vec4(max(color*uIntensity,vec3(0.0)),1.0);
    }
  `;

  const createShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(message || 'Light Pillar shader compilation failed.');
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
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Light Pillar shader link failed.');
  } catch (error) {
    console.warn('React Bits Light Pillar is using its CSS fallback.', error);
    stage.classList.add('is-light-pillar-fallback');
    return;
  }

  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);

  const names = [
    'uTime','uResolution','uMouse','uTopColor','uBottomColor','uIntensity','uInteractive',
    'uGlowAmount','uPillarWidth','uPillarHeight','uNoiseIntensity','uRotCos','uRotSin',
    'uPillarRotCos','uPillarRotSin','uWaveSin[0]','uWaveCos[0]','uIterations',
    'uWaveIterations','uStepMultiplier'
  ];
  const uniforms = Object.fromEntries(names.map((name) => [name,gl.getUniformLocation(program,name)]));
  const waveSin = new Float32Array(4).fill(Math.sin(.4));
  const waveCos = new Float32Array(4).fill(Math.cos(.4));
  gl.uniform3f(uniforms.uTopColor,82/255,39/255,1);
  gl.uniform3f(uniforms.uBottomColor,1,159/255,252/255);
  gl.uniform1fv(uniforms['uWaveSin[0]'],waveSin);
  gl.uniform1fv(uniforms['uWaveCos[0]'],waveCos);

  const resize = () => {
    const quality = qualities[values.quality] || qualities[1];
    const width = Math.max(1,Math.round(stage.clientWidth*quality.dpr));
    const height = Math.max(1,Math.round(stage.clientHeight*quality.dpr));
    if(canvas.width!==width||canvas.height!==height){
      canvas.width=width;
      canvas.height=height;
      gl.viewport(0,0,width,height);
    }
  };

  const draw = () => {
    resize();
    const quality = qualities[values.quality] || qualities[1];
    const pillarRot = values.pillarRotation*Math.PI/180;
    const rot = elapsed*.3;
    gl.uniform1f(uniforms.uTime,elapsed);
    gl.uniform2f(uniforms.uResolution,canvas.width,canvas.height);
    gl.uniform2f(uniforms.uMouse,currentMouse.x,currentMouse.y);
    gl.uniform1f(uniforms.uIntensity,values.intensity);
    gl.uniform1i(uniforms.uInteractive,values.interactive ? 1 : 0);
    gl.uniform1f(uniforms.uGlowAmount,values.glow);
    gl.uniform1f(uniforms.uPillarWidth,values.width);
    gl.uniform1f(uniforms.uPillarHeight,values.height);
    gl.uniform1f(uniforms.uNoiseIntensity,values.noise);
    gl.uniform1f(uniforms.uRotCos,Math.cos(rot));
    gl.uniform1f(uniforms.uRotSin,Math.sin(rot));
    gl.uniform1f(uniforms.uPillarRotCos,Math.cos(pillarRot));
    gl.uniform1f(uniforms.uPillarRotSin,Math.sin(pillarRot));
    gl.uniform1i(uniforms.uIterations,quality.iterations);
    gl.uniform1i(uniforms.uWaveIterations,quality.waves);
    gl.uniform1f(uniforms.uStepMultiplier,quality.step);
    gl.drawArrays(gl.TRIANGLES,0,3);
    stage.classList.add('is-light-pillar-webgl');
  };

  const render = (now) => {
    const dt=Math.min(.05,Math.max(0,(now-last)/1000));
    last=now;
    elapsed+=dt*values.rotationSpeed;
    currentMouse.x+=(targetMouse.x-currentMouse.x)*.08;
    currentMouse.y+=(targetMouse.y-currentMouse.y)*.08;
    draw();
    frameId=requestAnimationFrame(render);
  };
  const stop = () => {
    cancelAnimationFrame(frameId);
    frameId=0;
  };
  const start = () => {
    if(frameId||manuallyPaused||systemPaused||!inViewport)return;
    last=performance.now();
    frameId=requestAnimationFrame(render);
  };

  canvas.addEventListener('pointermove',(event) => {
    const rect=canvas.getBoundingClientRect();
    targetMouse.x=((event.clientX-rect.left)/rect.width)*2-1;
    targetMouse.y=-((event.clientY-rect.top)/rect.height)*2+1;
  });
  canvas.addEventListener('pointerleave',() => {
    targetMouse.x=0;
    targetMouse.y=0;
  });

  controls.forEach((input) => {
    input.addEventListener('input',() => {
      const property=input.dataset.lightPillarControl;
      values[property]=Number(input.value);
      settings?.set('live-backgrounds','reactbits-light-pillar',property,values[property]);
      const output=input.closest('label')?.querySelector('output');
      if(output)output.value=formatValue(input);
      applyAppearance();
      if(!frameId)draw();
    });
  });

  document.querySelector('[data-light-pillar-toggle]')?.addEventListener('click',(event) => {
    manuallyPaused=!manuallyPaused;
    event.currentTarget.textContent=manuallyPaused?'Play':'Pause';
    stage.classList.toggle('is-light-pillar-paused',manuallyPaused||systemPaused);
    if(manuallyPaused)stop();
    else start();
  });
  document.querySelector('[data-light-pillar-reset]')?.addEventListener('click',() => {
    elapsed=0;
    targetMouse.x=currentMouse.x=0;
    targetMouse.y=currentMouse.y=0;
    draw();
  });

  const visibilityObserver=new IntersectionObserver(([entry]) => {
    inViewport=entry.isIntersecting;
    if(inViewport)start();
    else stop();
  },{rootMargin:'240px 0px',threshold:0});
  visibilityObserver.observe(stage);
  const resizeObserver=new ResizeObserver(() => {
    resize();
    if(!frameId)draw();
  });
  resizeObserver.observe(stage);

  const handlePause=() => {
    systemPaused=true;
    stage.classList.add('is-light-pillar-paused');
    stop();
  };
  const handleResume=() => {
    systemPaused=reducedMotion.matches;
    stage.classList.toggle('is-light-pillar-paused',systemPaused||manuallyPaused);
    start();
  };
  const handleReducedMotion=(event) => {
    systemPaused=event.matches||document.hidden;
    stage.classList.toggle('is-light-pillar-paused',systemPaused||manuallyPaused);
    if(systemPaused){
      stop();
      draw();
    }else start();
  };
  const cleanup=() => {
    stop();
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener('motion:pause',handlePause);
    document.removeEventListener('motion:resume',handleResume);
    reducedMotion.removeEventListener?.('change',handleReducedMotion);
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
  };
  document.addEventListener('motion:pause',handlePause);
  document.addEventListener('motion:resume',handleResume);
  reducedMotion.addEventListener?.('change',handleReducedMotion);
  window.addEventListener('pagehide',cleanup,{once:true});
})();
