import type { FlowPalette } from '@/logic/helmets';

import { fluid, fluidNames } from './registry';
import { drawMask, layoutSignature, MAX_PALETTES } from './textMask';

// One "stable fluids" simulation for the whole window (WebGL2), used to make the helmet-colour
// names liquid: the dye swirls the helmet colours through the letters and the velocity bends the
// letters themselves. The technique follows Pavel Dobryakov's WebGL Fluid Simulation (MIT,
// github.com/PavelDoGreat/WebGL-Fluid-Simulation); this is a smaller rewrite for this site.
//
// Loaded lazily by FluidField. Throws if the browser can't run it, and the names then keep their
// CSS gradient.

const SIM_RES = 128; // velocity grid, short side
const DYE_RES = 512; // colour grid, short side
const PRESSURE_ITERATIONS = 18;
const CURL = 22; // swirliness
const VELOCITY_DISSIPATION = 0.25;
const DYE_DISSIPATION = 0.22;
const WARP = 0.028; // how far the letters bend with the flow
const AMBIENT_EVERY_MS = 450;

const VERTEX = `#version 300 es
in vec2 aPos;
uniform vec2 texel;
out vec2 vUv, vL, vR, vT, vB;
void main() {
  vUv = aPos * 0.5 + 0.5;
  vL = vUv - vec2(texel.x, 0.0); vR = vUv + vec2(texel.x, 0.0);
  vT = vUv + vec2(0.0, texel.y); vB = vUv - vec2(0.0, texel.y);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const HEAD = `#version 300 es
precision highp float;
in vec2 vUv, vL, vR, vT, vB;
out vec4 o;
`;

const SPLAT = `${HEAD}
uniform sampler2D uTarget; uniform float aspect, radius, keepPositive; uniform vec3 color; uniform vec2 point;
void main() {
  vec2 p = vUv - point; p.x *= aspect;
  vec3 v = texture(uTarget, vUv).xyz + exp(-dot(p, p) / radius) * color;
  o = vec4(keepPositive > 0.5 ? max(v, 0.0) : v, 1.0);
}`;

const ADVECT = `${HEAD}
uniform sampler2D uVelocity, uSource; uniform vec2 simTexel; uniform float dt, dissipation;
void main() {
  vec2 coord = vUv - dt * texture(uVelocity, vUv).xy * simTexel;
  o = vec4(texture(uSource, coord).xyz / (1.0 + dissipation * dt), 1.0);
}`;

const DIVERGENCE = `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).x, R = texture(uVelocity, vR).x;
  float T = texture(uVelocity, vT).y, B = texture(uVelocity, vB).y;
  vec2 C = texture(uVelocity, vUv).xy;
  if (vL.x < 0.0) L = -C.x; if (vR.x > 1.0) R = -C.x;
  if (vT.y > 1.0) T = -C.y; if (vB.y < 0.0) B = -C.y;
  o = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
}`;

const CURL_SHADER = `${HEAD}
uniform sampler2D uVelocity;
void main() {
  float L = texture(uVelocity, vL).y, R = texture(uVelocity, vR).y;
  float T = texture(uVelocity, vT).x, B = texture(uVelocity, vB).x;
  o = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
}`;

const VORTICITY = `${HEAD}
uniform sampler2D uVelocity, uCurl; uniform float curl, dt;
void main() {
  float L = texture(uCurl, vL).x, R = texture(uCurl, vR).x;
  float T = texture(uCurl, vT).x, B = texture(uCurl, vB).x, C = texture(uCurl, vUv).x;
  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force = force / (length(force) + 0.0001) * curl * C;
  force.y *= -1.0;
  vec2 v = texture(uVelocity, vUv).xy + force * dt;
  o = vec4(clamp(v, -1000.0, 1000.0), 0.0, 1.0);
}`;

const PRESSURE = `${HEAD}
uniform sampler2D uPressure, uDivergence;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4((L + R + B + T - texture(uDivergence, vUv).x) * 0.25, 0.0, 0.0, 1.0);
}`;

const GRADIENT = `${HEAD}
uniform sampler2D uPressure, uVelocity;
void main() {
  float L = texture(uPressure, vL).x, R = texture(uPressure, vR).x;
  float T = texture(uPressure, vT).x, B = texture(uPressure, vB).x;
  o = vec4(texture(uVelocity, vUv).xy - vec2(R - L, T - B), 0.0, 1.0);
}`;

const FADE = `${HEAD}
uniform sampler2D uTexture; uniform float value;
void main() { o = value * texture(uTexture, vUv); }`;

// The look: letters sampled through the flow (so they bend), coloured by the name's palette mixed by
// the dye, with a soft glow of the same colours hugging the edges.
const DISPLAY = `${HEAD}
uniform sampler2D uMask, uDye, uVelocity; uniform vec2 simTexel, maskTexel; uniform float warp;
uniform vec3 uBase[${MAX_PALETTES}], uA[${MAX_PALETTES}], uB[${MAX_PALETTES}], uC[${MAX_PALETTES}];
vec3 paint(int id, vec3 w) {
  // Sharpen the weights so the strongest helmet colour wins: clean liquid bands of pure helmet
  // colour, rather than two accents averaging into grey.
  vec3 s = w * w * w;
  float total = s.r + s.g + s.b;
  vec3 share = total > 0.0001 ? s / total : vec3(0.0);
  float strength = smoothstep(0.08, 0.6, max(w.r, max(w.g, w.b)));
  vec3 accent = uA[id] * share.r + uB[id] * share.g + uC[id] * share.b;
  return mix(uBase[id], accent, strength);
}
int paletteId(vec2 m) { return clamp(int(floor(m.y / max(m.x, 0.004) * 255.0 / 20.0 + 0.5)), 0, ${MAX_PALETTES - 1}); }
void main() {
  vec2 offset = texture(uVelocity, vUv).xy * simTexel * warp;
  float len = length(offset);
  if (len > 0.012) offset *= 0.012 / len;
  vec2 uv = vUv - offset;
  vec2 m = texture(uMask, uv).rg;
  vec3 w = clamp(texture(uDye, uv).rgb, 0.0, 2.0);

  // A small ring of samples gives the glow and tells us whose palette a glow pixel belongs to.
  vec2 g = vec2(0.0); float r = 6.0;
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    g += texture(uMask, uv + vec2(cos(a), sin(a)) * maskTexel * r).rg;
  }
  g /= 8.0;
  float halo = clamp(g.x * 1.4 - m.x, 0.0, 1.0) * clamp(w.r + w.g + w.b, 0.0, 1.0) * 0.55;

  vec3 letter = paint(paletteId(m), w);
  vec3 glow = paint(paletteId(g), w * 1.4);
  float alpha = m.x + halo * (1.0 - m.x);
  o = vec4(letter * m.x + glow * halo * (1.0 - m.x), alpha);
}`;

interface Target {
  tex: WebGLTexture;
  fbo: WebGLFramebuffer;
  w: number;
  h: number;
}
interface Double {
  read: Target;
  write: Target;
  swap(): void;
}

const hexRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Starts the field on `canvas`. Returns a stop function; throws if WebGL2 isn't usable. */
export function startFluid(canvas: HTMLCanvasElement, onReady: () => void): () => void {
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) throw new Error('WebGL2 float render targets unavailable');

  // ---- programs
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader');
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const program = (src: string) => {
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link');
    const uniforms: Record<string, WebGLUniformLocation | null> = {};
    const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(p, i)!.name.replace(/\[0\]$/, '');
      uniforms[name] = gl.getUniformLocation(p, name);
    }
    return { p, u: uniforms };
  };
  const P = {
    splat: program(SPLAT),
    advect: program(ADVECT),
    divergence: program(DIVERGENCE),
    curl: program(CURL_SHADER),
    vorticity: program(VORTICITY),
    pressure: program(PRESSURE),
    gradient: program(GRADIENT),
    fade: program(FADE),
    display: program(DISPLAY),
  };

  // ---- full-screen quad
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // ---- render targets
  const target = (w: number, h: number): Target => {
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fbo = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fbo, w, h };
  };
  const double = (w: number, h: number): Double => {
    const d = { read: target(w, h), write: target(w, h), swap: () => ([d.read, d.write] = [d.write, d.read]) };
    return d;
  };
  const sizeFor = (res: number) => {
    const aspect = canvas.width / canvas.height;
    return aspect > 1 ? [Math.round(res * aspect), res] : [res, Math.round(res / aspect)];
  };

  // ---- the text mask (2D canvas uploaded as a texture)
  const maskCanvas = document.createElement('canvas');
  const maskCtx = maskCanvas.getContext('2d')!;
  const maskTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, maskTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let velocity!: Double, dye!: Double, pressure!: Double, divergence!: Target, curl!: Target;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    maskCanvas.width = window.innerWidth;
    maskCanvas.height = window.innerHeight;
    const [sw, sh] = sizeFor(SIM_RES);
    const [dw, dh] = sizeFor(DYE_RES);
    velocity = double(sw, sh);
    pressure = double(sw, sh);
    divergence = target(sw, sh);
    curl = target(sw, sh);
    dye = double(dw, dh);
    signature = '';
  };

  const draw = (dest: Target | null) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, dest ? dest.fbo : null);
    gl.viewport(0, 0, dest ? dest.w : canvas.width, dest ? dest.h : canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const activate = (prog: { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> }, texelOf: Target) => {
    gl.useProgram(prog.p);
    gl.uniform2f(prog.u.texel, 1 / texelOf.w, 1 / texelOf.h);
  };
  let unit = 0;
  const bind = (loc: WebGLUniformLocation | null | undefined, tex: WebGLTexture) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc ?? null, unit++);
  };

  const splat = (x: number, y: number, dx: number, dy: number, channel: number, amount: number, radius: number) => {
    const aspect = canvas.width / canvas.height;
    unit = 0;
    activate(P.splat, velocity.read);
    bind(P.splat.u.uTarget, velocity.read.tex);
    gl.uniform1f(P.splat.u.aspect, aspect);
    gl.uniform2f(P.splat.u.point, x, y);
    gl.uniform3f(P.splat.u.color, dx, dy, 0);
    gl.uniform1f(P.splat.u.radius, radius);
    gl.uniform1f(P.splat.u.keepPositive, 0);
    draw(velocity.write);
    velocity.swap();
    unit = 0;
    bind(P.splat.u.uTarget, dye.read.tex);
    // Fresh colour pushes the other two out of the way, like new paint over old, so the helmet
    // colours stay pure instead of averaging into grey or purple.
    const c = [-amount * 0.8, -amount * 0.8, -amount * 0.8];
    c[channel] = amount;
    gl.uniform3f(P.splat.u.color, c[0], c[1], c[2]);
    gl.uniform1f(P.splat.u.keepPositive, 1);
    draw(dye.write);
    dye.swap();
  };

  const step = (dt: number) => {
    unit = 0;
    activate(P.curl, velocity.read);
    bind(P.curl.u.uVelocity, velocity.read.tex);
    draw(curl);

    unit = 0;
    activate(P.vorticity, velocity.read);
    bind(P.vorticity.u.uVelocity, velocity.read.tex);
    bind(P.vorticity.u.uCurl, curl.tex);
    gl.uniform1f(P.vorticity.u.curl, CURL);
    gl.uniform1f(P.vorticity.u.dt, dt);
    draw(velocity.write);
    velocity.swap();

    unit = 0;
    activate(P.divergence, velocity.read);
    bind(P.divergence.u.uVelocity, velocity.read.tex);
    draw(divergence);

    unit = 0;
    activate(P.fade, pressure.read);
    bind(P.fade.u.uTexture, pressure.read.tex);
    gl.uniform1f(P.fade.u.value, 0.8);
    draw(pressure.write);
    pressure.swap();

    activate(P.pressure, velocity.read);
    for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
      unit = 0;
      bind(P.pressure.u.uDivergence, divergence.tex);
      bind(P.pressure.u.uPressure, pressure.read.tex);
      draw(pressure.write);
      pressure.swap();
    }

    unit = 0;
    activate(P.gradient, velocity.read);
    bind(P.gradient.u.uPressure, pressure.read.tex);
    bind(P.gradient.u.uVelocity, velocity.read.tex);
    draw(velocity.write);
    velocity.swap();

    unit = 0;
    activate(P.advect, velocity.read);
    gl.uniform2f(P.advect.u.simTexel, 1 / velocity.read.w, 1 / velocity.read.h);
    gl.uniform1f(P.advect.u.dt, dt);
    bind(P.advect.u.uVelocity, velocity.read.tex);
    bind(P.advect.u.uSource, velocity.read.tex);
    gl.uniform1f(P.advect.u.dissipation, VELOCITY_DISSIPATION);
    draw(velocity.write);
    velocity.swap();

    unit = 0;
    bind(P.advect.u.uVelocity, velocity.read.tex);
    bind(P.advect.u.uSource, dye.read.tex);
    gl.uniform1f(P.advect.u.dissipation, DYE_DISSIPATION);
    draw(dye.write);
    dye.swap();
  };

  let palettes: FlowPalette[] = [];
  let boxes: DOMRect[] = [];
  const render = () => {
    unit = 0;
    activate(P.display, velocity.read);
    bind(P.display.u.uMask, maskTex);
    bind(P.display.u.uDye, dye.read.tex);
    bind(P.display.u.uVelocity, velocity.read.tex);
    gl.uniform2f(P.display.u.simTexel, 1 / velocity.read.w, 1 / velocity.read.h);
    gl.uniform2f(P.display.u.maskTexel, 1 / maskCanvas.width, 1 / maskCanvas.height);
    gl.uniform1f(P.display.u.warp, WARP);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT);
    draw(null);
    gl.disable(gl.BLEND);
  };

  const uploadPalettes = () => {
    const flat = (pick: (p: FlowPalette) => string) => {
      const out = new Float32Array(MAX_PALETTES * 3);
      palettes.forEach((p, i) => out.set(hexRgb(pick(p)), i * 3));
      return out;
    };
    gl.useProgram(P.display.p);
    gl.uniform3fv(P.display.u.uBase, flat((p) => p.base));
    gl.uniform3fv(P.display.u.uA, flat((p) => p.accents[0]));
    gl.uniform3fv(P.display.u.uB, flat((p) => p.accents[1]));
    gl.uniform3fv(P.display.u.uC, flat((p) => p.accents[2]));
  };

  // ---- the text mask, redrawn only when a name moved, appeared or left
  let signature = '';
  let seenVersion = -1;
  const refreshMask = () => {
    const sig = layoutSignature(fluidNames);
    if (sig === signature && seenVersion === fluid.version) return;
    signature = sig;
    seenVersion = fluid.version;
    const phone = window.innerWidth < 768;
    const result = drawMask(maskCtx, fluidNames, { top: phone ? 56 : 64, bottom: window.innerHeight - (phone ? 64 : 0) });
    palettes = result.palettes;
    boxes = result.boxes;
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    // Flipped to WebGL's bottom-up rows, and premultiplied so red = letter coverage and green =
    // coverage × palette id at the antialiased edges too.
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    uploadPalettes();
  };

  // ---- input: the pointer stirs the fluid; names breathe on their own every so often
  let pointer: { x: number; y: number } | null = null;
  let channel = 0;
  const onMove = (e: PointerEvent) => {
    const x = e.clientX / window.innerWidth;
    const y = 1 - e.clientY / window.innerHeight;
    if (pointer) {
      const dx = (x - pointer.x) * 6000;
      const dy = (y - pointer.y) * 6000;
      if (Math.abs(dx) + Math.abs(dy) > 1) {
        channel = channel === 0 ? 1 : 0; // the two main helmet colours, alternating
        splat(x, y, dx, dy, channel, 2.6, 0.0035);
      }
    }
    pointer = { x, y };
  };
  const onLeave = () => (pointer = null);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerleave', onLeave);

  let lastAmbient = 0;
  const ambient = (now: number) => {
    if (now - lastAmbient < AMBIENT_EVERY_MS) return;
    lastAmbient = now;
    for (const b of boxes) {
      const x = (b.left + Math.random() * b.width) / window.innerWidth;
      const y = 1 - (b.top + Math.random() * b.height) / window.innerHeight;
      const angle = Math.random() * Math.PI * 2;
      const r = (b.height / window.innerHeight) * 0.55;
      // Mostly the two main helmet colours; the third (a hint) comes up less often.
      const accent = Math.random() < 0.85 ? Math.floor(Math.random() * 2) : 2;
      splat(x, y, Math.cos(angle) * 520, Math.sin(angle) * 520, accent, 2.4, r * r * 0.6);
    }
  };

  // ---- loop: runs only while a name is on screen and the tab is visible
  resize();
  window.addEventListener('resize', resize);
  let frame = 0;
  let last = performance.now();
  let ready = false;
  const loop = (now: number) => {
    frame = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    if (document.hidden) return;
    refreshMask();
    if (!boxes.length) {
      if (ready) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      return;
    }
    ambient(now);
    step(dt);
    render();
    if (!ready) {
      ready = true;
      onReady();
    }
  };
  frame = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('resize', resize);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
