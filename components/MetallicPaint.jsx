'use client';

// MetallicPaint — React Bits, "JavaScript + CSS" variant.
//
// Effect inspired by Paper's Liquid Metal effect.
//
// ------------------------------------------------------------------ *
// Adaptations for this project
//
// The component is used here as the *body of a button*, not as a logo,
// and the difference matters in three places where the published
// defaults assume a single large instance with a shape of its own:
//
// 1. `processImage` runs a 200-iteration Gauss-Seidel solve over every
//    pixel of the mask. The homepage menu renders FIVE instances off the
//    same mask, so without a cache the first paint pays for five
//    identical solves and blocks the main thread for something like a
//    second. Results are now memoised by src + the two size bounds,
//    because both of those feed the resize step that runs before the
//    solve. Each instance still uploads its own texture: the GL context
//    and the texture object belong to the instance, only the arithmetic
//    is shared.
//
// 2. The drawing buffer was pinned at `1000 * devicePixelRatio`. On a
//    full-width hero that is right; on a 30px-tall capsule it means
//    ~60x the fill rate needed for a shape the size of a thumbnail, five
//    times over, every frame, on a page that is already running a
//    three.js scene. `resolution` (CSS px for the canvas side) makes it
//    a decision instead of a constant, defaulting to the published 1000
//    so an unmodified call site behaves exactly as before.
//
// 3. `MIN_SIZE` upscaled any mask whose short side was under 500px. A
//    capsule silhouette is roughly 5.7:1, so a 160x28 mask would be
//    blown up to 2850x500 — 1.4M pixels — and the solve above would take
//    seconds. `maskMinSize` / `maskMaxSize` expose the bounds, again
//    defaulting to the published 500 / 1000.
//
// 4. `imageData` lets the caller hand the mask over already built, which
//    skips the fetch *and* the solve. That is not only a shortcut: the
//    flood fill turns the mask's shape into a depth field, and the depth
//    field's level sets become visible in the metal — a closed ring at
//    dp = 0.5, drawn straight onto the surface. For a logo, whose depth
//    field is its own distance transform, that ring is part of the shape.
//    For a button, whose silhouette is a capsule and whose mask is
//    therefore a flat field, the ring is an artefact in the middle of
//    every button. A supplied constant field removes it.
//
// Two things were added rather than adjusted, both about cost: an
// IntersectionObserver plus a `visibilitychange` listener stop the rAF
// loop when the canvas is not on screen or the tab is in the
// background, and `prefers-reduced-motion` draws one frame and stops.
// Nothing about the look changes in either case — a stopped loop leaves
// the last frame on the canvas, which is the point.
// ------------------------------------------------------------------ *

import { useEffect, useRef, useCallback } from 'react';
import './MetallicPaint.css';

const vertexShader = `#version 300 es
precision highp float;
in vec2 a_position;
out vec2 vP;
void main(){vP=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;

const fragmentShader = `#version 300 es
precision highp float;
in vec2 vP;
out vec4 oC;
uniform sampler2D u_tex;
uniform float u_time,u_ratio,u_imgRatio,u_seed,u_scale,u_refract,u_blur,u_liquid;
uniform float u_bright,u_contrast,u_angle,u_fresnel,u_sharp,u_wave,u_noise,u_chroma;
uniform float u_distort,u_contour;
uniform vec3 u_lightColor,u_darkColor,u_tint;

vec3 sC,sM;

vec3 pW(vec3 v){
  vec3 i=floor(v),f=fract(v),s=sign(fract(v*.5)-.5),h=fract(sM*i+i.yzx),c=f*(f-1.);
  return s*c*((h*16.-4.)*c-1.);
}

vec3 aF(vec3 b,vec3 c){return pW(b+c.zxy-pW(b.zxy+c.yzx)+pW(b.yzx+c.xyz));}
vec3 lM(vec3 s,vec3 p){return(p+aF(s,p))*.5;}

vec2 fA(){
  vec2 c=vP-.5;
  c.x*=u_ratio>u_imgRatio?u_ratio/u_imgRatio:1.;
  c.y*=u_ratio>u_imgRatio?1.:u_imgRatio/u_ratio;
  return vec2(c.x+.5,.5-c.y);
}

vec2 rot(vec2 p,float r){float c=cos(r),s=sin(r);return vec2(p.x*c+p.y*s,p.y*c-p.x*s);}

float bM(vec2 c,float t){
  vec2 l=smoothstep(vec2(0.),vec2(t),c),u=smoothstep(vec2(0.),vec2(t),1.-c);
  return l.x*l.y*u.x*u.y;
}

float mG(float hi,float lo,float t,float sh,float cv){
  sh*=(2.-u_sharp);
  float ci=smoothstep(.15,.85,cv),r=lo;
  float e1=.08/u_scale;
  r=mix(r,hi,smoothstep(0.,sh*1.5,t));
  r=mix(r,lo,smoothstep(e1-sh,e1+sh,t));
  float e2=e1+.05/u_scale*(1.-ci*.35);
  r=mix(r,hi,smoothstep(e2-sh,e2+sh,t));
  float e3=e2+.025/u_scale*(1.-ci*.45);
  r=mix(r,lo,smoothstep(e3-sh,e3+sh,t));
  float e4=e1+.1/u_scale;
  r=mix(r,hi,smoothstep(e4-sh,e4+sh,t));
  float rm=1.-e4,gT=clamp((t-e4)/rm,0.,1.);
  r=mix(r,mix(hi,lo,smoothstep(0.,1.,gT)),smoothstep(e4-sh*.5,e4+sh*.5,t));
  return r;
}

void main(){
  sC=fract(vec3(.7548,.5698,.4154)*(u_seed+17.31))+.5;
  sM=fract(sC.zxy-sC.yzx*1.618);
  vec2 sc=vec2(vP.x*u_ratio,1.-vP.y);
  float angleRad=u_angle*3.14159/180.;
  sc=rot(sc-.5,angleRad)+.5;
  sc=clamp(sc,0.,1.);
  float sl=sc.x-sc.y,an=u_time*.001;
  vec2 iC=fA();
  vec4 texSample=texture(u_tex,iC);
  float dp=texSample.r;
  float shapeMask=texSample.a;
  vec3 hi=u_lightColor*u_bright;
  vec3 lo=u_darkColor*(2.-u_bright);
  lo.b+=smoothstep(.6,1.4,sc.x+sc.y)*.08;
  vec2 fC=sc-.5;
  float rd=length(fC+vec2(0.,sl*.15));
  vec2 ag=rot(fC,(.22-sl*.18)*3.14159);
  float cv=1.-pow(rd*1.65,1.15);
  cv*=pow(sc.y,.35);
  float vs=shapeMask;
  vs*=bM(iC,.01);
  float fr=pow(1.-cv,u_fresnel)*.3;
  vs=min(vs+fr*vs,1.);
  float mT=an*.0625;
  vec3 wO=vec3(-1.05,1.35,1.55);
  vec3 wA=aF(vec3(31.,73.,56.),mT+wO)*.22*u_wave;
  vec3 wB=aF(vec3(24.,64.,42.),mT-wO.yzx)*.22*u_wave;
  vec2 nC=sc*45.*u_noise;
  nC+=aF(sC.zxy,an*.17*sC.yzx-sc.yxy*.35).xy*18.*u_wave;
  vec3 tC=vec3(.00041,.00053,.00076)*mT+wB*nC.x+wA*nC.y;
  tC=lM(sC,tC);
  tC=lM(sC+1.618,tC);
  float tb=sin(tC.x*3.14159)*.5+.5;
  tb=tb*2.-1.;
  float noiseVal=pW(vec3(sc*8.+an,an*.5)).x;
  float edgeFactor=smoothstep(0.,.5,dp)*smoothstep(1.,.5,dp);
  float lD=dp+(1.-dp)*u_liquid*tb;
  lD+=noiseVal*u_distort*.15*edgeFactor;
  float rB=clamp(1.-cv,0.,1.);
  float fl=ag.x+sl;
  fl+=noiseVal*sl*u_distort*edgeFactor;
  fl*=mix(1.,1.-dp*.5,u_contour);
  fl-=dp*u_contour*.8;
  float eI=smoothstep(0.,1.,lD)*smoothstep(1.,0.,lD);
  fl-=tb*sl*1.8*eI;
  float cA=cv*clamp(pow(sc.y,.12),.25,1.);
  fl*=.12+(1.05-lD)*cA;
  fl*=smoothstep(1.,.65,lD);
  float vA1=smoothstep(.08,.18,sc.y)*smoothstep(.38,.18,sc.y);
  float vA2=smoothstep(.08,.18,1.-sc.y)*smoothstep(.38,.18,1.-sc.y);
  fl+=vA1*.16+vA2*.025;
  fl*=.45+pow(sc.y,2.)*.55;
  fl*=u_scale;
  fl-=an;
  float rO=rB+cv*tb*.025;
  float vM1=smoothstep(-.12,.18,sc.y)*smoothstep(.48,.08,sc.y);
  float cM1=smoothstep(.35,.55,cv)*smoothstep(.95,.35,cv);
  rO+=vM1*cM1*4.5;
  rO-=sl;
  float bO=rB*1.25;
  float vM2=smoothstep(-.02,.35,sc.y)*smoothstep(.75,.08,sc.y);
  float cM2=smoothstep(.35,.55,cv)*smoothstep(.75,.35,cv);
  bO+=vM2*cM2*.9;
  bO-=lD*.18;
  rO*=u_refract*u_chroma;
  bO*=u_refract*u_chroma;
  float sf=u_blur;
  float rP=fract(fl+rO);
  float rC=mG(hi.r,lo.r,rP,sf+.018+u_refract*cv*.025,cv);
  float gP=fract(fl);
  float gC=mG(hi.g,lo.g,gP,sf+.008/max(.01,1.-sl),cv);
  float bP=fract(fl-bO);
  float bC=mG(hi.b,lo.b,bP,sf+.008,cv);
  vec3 col=vec3(rC,gC,bC);
  col=(col-.5)*u_contrast+.5;
  col=clamp(col,0.,1.);
  col=mix(col,1.-min(vec3(1.),(1.-col)/max(u_tint,vec3(.001))),length(u_tint-1.)*.5);
  col=clamp(col,0.,1.);
  oC=vec4(col*vs,vs);
}`;

// The solve below is the expensive part of this file and its result depends
// only on the mask and the two bounds — never on the seed, the colours or the
// animation. Five menu rows share one mask, so they share one solve.
const processedCache = new Map();

function processImage(img, minSize, maxSize) {
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxSize || height > maxSize || width < minSize || height < minSize) {
    const scale =
      width > height
        ? width > maxSize
          ? maxSize / width
          : width < minSize
            ? minSize / width
            : 1
        : height > maxSize
          ? maxSize / height
          : height < minSize
            ? minSize / height
            : 1;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const size = width * height;
  const alphaValues = new Float32Array(size);
  const shapeMask = new Uint8Array(size);
  const boundaryMask = new Uint8Array(size);

  for (let i = 0; i < size; i++) {
    const idx = i * 4;
    const r = data[idx],
      g = data[idx + 1],
      b = data[idx + 2],
      a = data[idx + 3];
    const isBackground = (r > 250 && g > 250 && b > 250 && a === 255) || a < 5;
    alphaValues[i] = isBackground ? 0 : a / 255;
    shapeMask[i] = alphaValues[i] > 0.1 ? 1 : 0;
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!shapeMask[idx]) continue;
      if (
        x === 0 ||
        x === width - 1 ||
        y === 0 ||
        y === height - 1 ||
        !shapeMask[idx - 1] ||
        !shapeMask[idx + 1] ||
        !shapeMask[idx - width] ||
        !shapeMask[idx + width]
      ) {
        boundaryMask[idx] = 1;
      }
    }
  }

  const u = new Float32Array(size);
  const ITERATIONS = 200;
  const C = 0.01;
  const omega = 1.85;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (!shapeMask[idx] || boundaryMask[idx]) continue;
        const sum =
          (shapeMask[idx + 1] ? u[idx + 1] : 0) +
          (shapeMask[idx - 1] ? u[idx - 1] : 0) +
          (shapeMask[idx + width] ? u[idx + width] : 0) +
          (shapeMask[idx - width] ? u[idx - width] : 0);
        const newVal = (C + sum) / 4;
        u[idx] = omega * newVal + (1 - omega) * u[idx];
      }
    }
  }

  let maxVal = 0;
  for (let i = 0; i < size; i++) if (u[i] > maxVal) maxVal = u[i];
  if (maxVal === 0) maxVal = 1;

  const outData = ctx.createImageData(width, height);
  for (let i = 0; i < size; i++) {
    const px = i * 4;
    const depth = u[i] / maxVal;
    const gray = Math.round(255 * (1 - depth * depth));
    outData.data[px] = outData.data[px + 1] = outData.data[px + 2] = gray;
    outData.data[px + 3] = Math.round(alphaValues[i] * 255);
  }

  return outData;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [1, 1, 1];
}

export default function MetallicPaint({
  imageSrc,
  seed = 42,
  scale = 4,
  refraction = 0.01,
  blur = 0.015,
  liquid = 0.75,
  speed = 0.3,
  brightness = 2,
  contrast = 0.5,
  angle = 0,
  fresnel = 1,
  lightColor = '#ffffff',
  darkColor = '#000000',
  patternSharpness = 1,
  waveAmplitude = 1,
  noiseScale = 0.5,
  chromaticSpread = 2,
  mouseAnimation = false,
  distortion = 1,
  contour = 0.2,
  tintColor = '#feb3ff',
  // --- additions; the defaults reproduce the published behaviour ---
  resolution = 1000,
  maskMinSize = 500,
  maskMaxSize = 1000,
  autoPause = true,
  // A mask supplied ready-made, in exactly the shape `processImage` returns:
  // { width, height, data } with the red channel holding the depth field and
  // alpha holding the shape. When this is given, `imageSrc` is never fetched and
  // the 200-iteration solve never runs — which is the point of the prop. Five
  // menu rows share one field, and a field that is a constant has nothing to
  // solve; see the note in Carousel.jsx for what the solve does to a surface
  // that is not a glyph.
  imageData = null,
}) {
  const canvasRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const uniformsRef = useRef({});
  const textureRef = useRef(null);
  const animTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(null);
  const imgDataRef = useRef(null);
  const speedRef = useRef(speed);
  const mouseRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });
  const mouseAnimRef = useRef(mouseAnimation);
  // Stop conditions, all read through refs so toggling them never rebuilds the
  // render loop (and never re-uploads the texture, which is the expensive part).
  const visibleRef = useRef(true);
  const hiddenRef = useRef(false);
  const reducedRef = useRef(false);

  // Deliberately no `ready` / `textureReady` state. The published component uses
  // a pair of booleans to sequence its three effects, which means every mount
  // re-renders React twice before it can draw anything — and nothing about a
  // canvas needs React to know it is ready, because the GL context, the program
  // and the texture all live in refs and only this component reads them.
  // `react-hooks/set-state-in-effect` flags the pattern for the cascading render
  // it causes; the fix is to stop routing the sequencing through state, not to
  // hide the calls behind a frame boundary. Every effect below opens with
  // `initGL()` and bails if there is no context, so any of them can be the one
  // that builds the GL state and none of them has to wait to find out.
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    mouseAnimRef.current = mouseAnimation;
  }, [mouseAnimation]);

  // Idempotent, and it has to be: three effects call it and the order they run
  // in is the order they are declared, not the order their dependencies change.
  // The context lives as long as the component does, so the second and third
  // callers must not compile a second program.
  const initGL = useCallback(() => {
    if (glRef.current) return true;

    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) return false;

    const compile = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vs = compile(vertexShader, gl.VERTEX_SHADER);
    const fs = compile(fragmentShader, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return false;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return false;
    }

    const uniforms = {};
    const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(prog, i);
      if (info) uniforms[info.name] = gl.getUniformLocation(prog, info.name);
    }

    const verts = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    gl.useProgram(prog);
    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    glRef.current = gl;
    programRef.current = prog;
    uniformsRef.current = uniforms;

    return true;
  }, []);

  const uploadTexture = useCallback(imgData => {
    const gl = glRef.current;
    const uniforms = uniformsRef.current;
    if (!gl || !imgData) return;

    if (textureRef.current) gl.deleteTexture(textureRef.current);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, imgData.width, imgData.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, imgData.data);
    gl.uniform1i(uniforms.u_tex, 0);

    const ratio = imgData.width / imgData.height;
    gl.uniform1f(uniforms.u_imgRatio, ratio);
    gl.uniform1f(uniforms.u_ratio, 1);

    textureRef.current = tex;
    imgDataRef.current = imgData;
  }, []);

  useEffect(() => {
    if (!initGL()) return;

    const canvas = canvasRef.current;
    const gl = glRef.current;
    // `resolution` is in CSS pixels and is meant to be picked from the size the
    // canvas actually occupies on screen — this is a per-instance cost, and the
    // published 1000 predates anyone using it five times on one page.
    const dpr = Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2);
    const side = Math.max(32, Math.round(resolution * dpr));
    if (canvas.width !== side || canvas.height !== side) {
      canvas.width = side;
      canvas.height = side;
      gl.viewport(0, 0, side, side);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (textureRef.current && glRef.current) {
        glRef.current.deleteTexture(textureRef.current);
      }
    };
  }, [initGL, resolution]);

  // Release the context on unmount, deliberately and explicitly.
  //
  // A WebGL context is a real resource with a real per-page ceiling — browsers
  // allow on the order of sixteen and then start losing the oldest. The menu that
  // uses this renders five instances on the desktop column and five more inside
  // the phone sheet, and the sheet's five are unmounted and remounted every time
  // it is opened. Dropping the reference is not enough: the context survives until
  // the canvas is collected, so a handful of open/close cycles on a phone would
  // walk a page into the ceiling.
  //
  // Deferred by a task rather than run inline, because React's development
  // double-mount cleans up and immediately re-runs every effect on the *same*
  // canvas — and a canvas whose context has been lost returns that same lost
  // context to the next getContext call, which would leave the second mount
  // drawing into nothing at all. A remount has re-registered by the time this
  // fires, and cancels it.
  const releaseRef = useRef(null);
  useEffect(() => {
    if (releaseRef.current) {
      clearTimeout(releaseRef.current);
      releaseRef.current = null;
    }
    return () => {
      releaseRef.current = setTimeout(() => {
        releaseRef.current = null;
        const gl = glRef.current;
        if (!gl) return;
        const lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        glRef.current = null;
        programRef.current = null;
        uniformsRef.current = {};
        textureRef.current = null;
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (!initGL()) return;
    const gl = glRef.current;
    const u = uniformsRef.current;

    gl.uniform1f(u.u_seed, seed);
    gl.uniform1f(u.u_scale, scale);
    gl.uniform1f(u.u_refract, refraction);
    gl.uniform1f(u.u_blur, blur);
    gl.uniform1f(u.u_liquid, liquid);
    gl.uniform1f(u.u_bright, brightness);
    gl.uniform1f(u.u_contrast, contrast);
    gl.uniform1f(u.u_angle, angle);
    gl.uniform1f(u.u_fresnel, fresnel);

    const light = hexToRgb(lightColor);
    const dark = hexToRgb(darkColor);
    const tint = hexToRgb(tintColor);
    gl.uniform3f(u.u_lightColor, light[0], light[1], light[2]);
    gl.uniform3f(u.u_darkColor, dark[0], dark[1], dark[2]);
    gl.uniform1f(u.u_sharp, patternSharpness);
    gl.uniform1f(u.u_wave, waveAmplitude);
    gl.uniform1f(u.u_noise, noiseScale);
    gl.uniform1f(u.u_chroma, chromaticSpread);
    gl.uniform1f(u.u_distort, distortion);
    gl.uniform1f(u.u_contour, contour);
    gl.uniform3f(u.u_tint, tint[0], tint[1], tint[2]);
  }, [
    initGL,
    seed,
    scale,
    refraction,
    blur,
    liquid,
    brightness,
    contrast,
    angle,
    fresnel,
    lightColor,
    darkColor,
    patternSharpness,
    waveAmplitude,
    noiseScale,
    chromaticSpread,
    distortion,
    contour,
    tintColor
  ]);

  // The texture and the loop, in one effect instead of two chained through a
  // state flag.
  //
  // They belong together: the loop cannot draw until the texture is uploaded, and
  // the published component said so with `textureReady`, which cost a re-render
  // between the two halves. The thing that becomes true is a GL texture sitting in
  // a ref — React never reads it — so the load happens here and the loop starts
  // from its own callback.
  useEffect(() => {
    if (!initGL() || (!imageSrc && !imageData)) return;

    const gl = glRef.current;
    const u = uniformsRef.current;
    const canvas = canvasRef.current;
    const mouse = mouseRef.current;

    const handleMouseMove = e => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = (e.clientX - rect.left) / rect.width;
      mouse.targetY = (e.clientY - rect.top) / rect.height;
    };

    canvas.addEventListener('mousemove', handleMouseMove);

    const draw = () => {
      gl.uniform1f(u.u_time, animTimeRef.current);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    // The loop is stoppable and restartable. `draw` is called once on the way
    // out so a canvas that is paused before its first frame — the phone sheet
    // below 640px, a background tab, a visitor who asked for reduced motion —
    // still shows metal rather than an empty box.
    const frame = time => {
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      if (mouseAnimRef.current) {
        mouse.x += (mouse.targetX - mouse.x) * 0.08;
        mouse.y += (mouse.targetY - mouse.y) * 0.08;
        animTimeRef.current = mouse.x * 3000 + mouse.y * 1500;
      } else {
        animTimeRef.current += delta * speedRef.current;
      }

      draw();
      rafRef.current = requestAnimationFrame(frame);
    };

    const start = () => {
      if (rafRef.current != null) return;
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (rafRef.current == null) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };

    const shouldRun = () =>
      visibleRef.current && !hiddenRef.current && !reducedRef.current;

    const sync = () => {
      if (shouldRun()) start();
      else {
        stop();
        draw();
      }
    };

    // prefers-reduced-motion is read live rather than once: a visitor who turns
    // it on mid-session expects the page to quieten without a reload, and this
    // is the only endless motion on the surface.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => {
      reducedRef.current = motionQuery.matches;
      sync();
    };
    reducedRef.current = motionQuery.matches;
    motionQuery.addEventListener('change', onMotion);

    const onVisibility = () => {
      hiddenRef.current = document.hidden;
      sync();
    };
    hiddenRef.current = document.hidden;
    document.addEventListener('visibilitychange', onVisibility);

    let io = null;
    if (autoPause && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        entries => {
          visibleRef.current = entries.some(e => e.isIntersecting);
          sync();
        },
        { threshold: 0 }
      );
      io.observe(canvas);
    }

    // Whether the mask has to be solved, or was already solved by a sibling.
    // Five menu rows share one mask: whichever mounts first pays for the
    // 200-iteration solve and the other four read it straight out of the module
    // cache. The texture is not shared — that one belongs to this instance's
    // context and has to be uploaded here whatever the arithmetic cost.
    let cancelled = false;
    const key = `${imageSrc}|${maskMinSize}|${maskMaxSize}`;
    const adopt = imgData => {
      uploadTexture(imgData);
      // Painted before anything can stop it, so the capsule has metal under it
      // even when the loop is not allowed to run: a paused state here is a
      // stopped loop over a painted frame, never an empty box.
      draw();
      sync();
    };

    if (imageData) {
      adopt(imageData);
    } else {
      const cached = processedCache.get(key);
      if (cached) adopt(cached);
      else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (cancelled) return;
          const solved = processImage(img, maskMinSize, maskMaxSize);
          processedCache.set(key, solved);
          adopt(solved);
        };
        img.src = imageSrc;
      }
    }

    return () => {
      cancelled = true;
      stop();
      canvas.removeEventListener('mousemove', handleMouseMove);
      motionQuery.removeEventListener('change', onMotion);
      document.removeEventListener('visibilitychange', onVisibility);
      if (io) io.disconnect();
    };
  }, [
    initGL,
    imageSrc,
    imageData,
    maskMinSize,
    maskMaxSize,
    uploadTexture,
    autoPause,
  ]);

  return <canvas ref={canvasRef} className="paint-container" />;
}
