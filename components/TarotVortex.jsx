"use client";

// TarotVortex — the full-screen ambience behind the divination overlay.
//
// A faithful port of the @designcodeio/threeui "Typography Vortex" grammar
// (see c.txt): every Major Arcana name in one long deck phrase, wrapped
// around concentric rings that turn at different rates, plus a small flock
// of stray letters drifting through the field. The text is pre-rendered
// once per ring onto an offscreen bitmap, so the rAF loop only pays for
// compositing — the same "render once, spin the bitmap" trick the
// reference uses to stay smooth on a full-screen canvas.
//
// Three adaptations for this use as a *backdrop* (not a standalone demo):
//   1. No opaque paper fill — the main canvas stays transparent so the
//      plate the visitor came in from shows through. The .oracle-stage
//      CSS gradient provides the ivory.
//   2. Overall opacity is dialled down (~0.62) and a soft centre mask
//      clears the rings under the step copy, so the reading is always
//      legible. Out in the margin the field stays dense and alive.
//   3. The pointer dissolve is bridged through a shared object the
//      scroll layer above writes into, because the overlay's pointer
//      events never reach this canvas.

import { useEffect, useRef } from "react";

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const DECK = [
  "THE FOOL",
  "THE MAGICIAN",
  "THE HIGH PRIESTESS",
  "THE EMPRESS",
  "THE EMPEROR",
  "THE HIEROPHANT",
  "THE LOVERS",
  "THE CHARIOT",
  "STRENGTH",
  "THE HERMIT",
  "WHEEL OF FORTUNE",
  "JUSTICE",
  "THE HANGED MAN",
  "DEATH",
  "TEMPERANCE",
  "THE DEVIL",
  "THE TOWER",
  "THE STAR",
  "THE MOON",
  "THE SUN",
  "JUDGEMENT",
  "THE WORLD",
];

// The Night Watch for the ring letters — the same Latin face the rest of
// the page uses, so the vortex reads as part of the design rather than a
// bolted-on demo. Zero CJK coverage, which is fine: the phrase is pure
// Latin. It is a decorative cut though, so the ring sizes run a step
// larger than a neutral face would need (see `fontSize` in buildRings) —
// below ~10px blackletter turns to mush.
const FONT_STACK =
  '"TheNightWatch", "Geist Mono", ui-monospace, "SFMono-Regular", "Menlo", "Consolas", "Courier New", monospace';

// Render one ring's phrase around a circle, every glyph rotated to stand
// on its own tangent. Returns an offscreen bitmap; the rAF loop draws it.
function makeRingBitmap(phrase, radius, fontSize, spacing, alpha, ink) {
  const scale = 2;
  const size = Math.ceil((radius + fontSize * 2.2) * 2);
  const bmp = document.createElement("canvas");
  bmp.width = bmp.height = size * scale;
  const ctx = bmp.getContext("2d");
  ctx.scale(scale, scale);
  ctx.translate(size / 2, size / 2);
  ctx.font = `${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = `rgba(${ink},${alpha})`;
  const step = (fontSize * 0.62 * spacing) / radius;
  const count = Math.max(8, Math.floor((Math.PI * 2) / step));
  const actualStep = (Math.PI * 2) / count;
  for (let i = 0; i < count; i += 1) {
    const a = i * actualStep;
    const ch = phrase[i % phrase.length];
    if (ch === " ") continue;
    ctx.save();
    ctx.translate(Math.cos(a) * radius, Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
  }
  return { bmp, size };
}

// Shared pointer bridge: the divination scroll layer covers the stage so
// the canvas below never sees pointer events directly. The host layer
// writes client coordinates here on pointermove and clears them on leave.
export const vortexPointer = { x: -9999, y: -9999, inside: false };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (a, b, t) => a + (b - a) * t;

export default function TarotVortex({
  opacity = 0.62,
  speed = 1,
  ringGrowth = 1.2,
  dissolveRadius = 1,
  particleAmount = 0.55,
}) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    // Offscreen layer where rings + strays are composed; dust is sampled
    // back from this layer so particles inherit the field's colour.
    const layer = document.createElement("canvas");
    const layerCtx = layer.getContext("2d", { willReadFrequently: true });
    if (!layerCtx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const random = mulberry32(20260907);

    // White ring text on the now-pale plate. A single 0.9 master factor
    // multiplies every per-ring alpha so the field reads as a uniform
    // wash rather than a stack of distinct layers. strayInk / guideInk
    // follow the same palette so particles and dotted guides don't fight
    // the letters.
    const ink = "255,255,255";
    const strayInk = "255,255,255";
    const guideInk = "255,255,255";
    const ringAlpha = 0.9;

    // Repeat the deck twice so long rings cycle without a visible seam,
    // then cap with a sigil to mirror the reference's trailing mark.
    const phrase = [
      ...DECK,
      ...DECK,
      "✦",
    ].join(" · ");

    let W = 0;
    let H = 0;
    let rings = [];
    let strays = [];
    let particles = [];
    let dissolve = 0;
    let lastSpawn = 0;
    let lastAmbient = 0;
    let lastT = 0;
    let renderSig = "";
    let raf = 0;
    let ambientW = 0;

    const buildRings = () => {
      const maxR =
        Math.hypot(Math.max(W * 0.55, W * 0.48), Math.max(H * 0.52, H * 0.5)) +
        40;
      rings = [];
      let r = Math.max(30, Math.min(W, H) * 0.075);
      let i = 0;
      let guard = 0;
      while (r < maxR && guard++ < 22) {
        const sparse = i % 3 === 2;
        // Sized up ~30% from the neutral-face figures: The Night Watch is a
        // decorative blackletter and loses all its counters below ~10px.
        const fontSize = clamp(9 + r * 0.018, 9, 22);
        const alpha =
          clamp(0.34 + r / maxR, 0.36, 0.92) *
          (sparse ? 0.72 : 1) *
          opacity *
          ringAlpha;
        const { bmp, size } = makeRingBitmap(
          phrase,
          r,
          fontSize,
          sparse ? 2.3 + random() * 0.8 : 1.02 + random() * 0.14,
          alpha,
          ink,
        );
        rings.push({
          bmp,
          size,
          radius: r,
          offset: random() * Math.PI * 2,
          speed: (0.05 + 40 / (r + 60)) * 0.35,
          wobble: random() * Math.PI * 2,
        });
        r *= Math.max(1.08, ringGrowth);
        i += 1;
      }
      strays = [];
      for (let s = 0; s < 34; s += 1) {
        strays.push({
          angle: random() * Math.PI * 2,
          radius: 30 + random() * (maxR - 60),
          speed: (random() - 0.5) * 0.06,
          ch: phrase[(random() * phrase.length) | 0],
          alpha: (0.18 + random() * 0.3) * opacity,
          size: 8 + random() * 6,
        });
      }
    };

    const resize = () => {
      const rect = host.getBoundingClientRect();
      W = Math.max(1, rect.width);
      H = Math.max(1, rect.height);
      const pxW = Math.round(W * dpr);
      const pxH = Math.round(H * dpr);
      canvas.width = pxW;
      canvas.height = pxH;
      layer.width = pxW;
      layer.height = pxH;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ambientW = clamp(W * 0.22, 108, 180);
      renderSig = "";
    };

    // Sample one pixel from the layer at canvas-space coordinates. Used
    // by both the ambient and pointer dust spawners so particles inherit
    // the colour of whatever letter they're being torn away from.
    const sampleLayer = (x, y) => {
      const px = Math.max(0, Math.min(layer.width - 1, Math.floor(x * dpr)));
      const py = Math.max(0, Math.min(layer.height - 1, Math.floor(y * dpr)));
      try {
        const data = layerCtx.getImageData(px, py, 1, 1).data;
        return [data[0], data[1], data[2], data[3]];
      } catch {
        return null;
      }
    };

    // Ambient dust: sample a vertical strip along the left edge so motes
    // drift in from the page margin. Mirrors the reference's column.
    const spawnAmbient = (time) => {
      if (reduced || time - lastAmbient < 140) return;
      lastAmbient = time;
      const sampleW = Math.min(W, ambientW * 1.12);
      const limit = Math.max(1, Math.round(14 * particleAmount));
      let spawned = 0;
      for (let attempt = 0; attempt < 360 && spawned < limit; attempt += 1) {
        const x = Math.random() * sampleW;
        const y = Math.random() * H;
        const px = sampleLayer(x, y);
        if (!px || px[3] < 32) continue;
        const edge = clamp(x / sampleW, 0, 1);
        particles.push({
          x,
          y,
          vx: 0.18 + Math.random() * 0.7 + edge * 0.35,
          vy: (Math.random() - 0.5) * 0.7,
          size: 0.55 + Math.random() * 1.25,
          life: 600 + Math.random() * 520,
          max: 1100,
          color: `${px[0]},${px[1]},${px[2]}`,
          spin: Math.random() > 0.5 ? 1 : -1,
          phase: Math.random() * Math.PI * 2,
        });
        spawned += 1;
      }
      const cap = Math.max(1, Math.round(520 * particleAmount));
      if (particles.length > cap) particles.splice(0, particles.length - cap);
    };

    // Pointer dust: the cursor punches a hole in the field, and motes of
    // that broken-off text drift away in the direction the pointer pushed.
    const spawnPointer = (time, radius) => {
      if (reduced || !vortexPointer.inside || dissolve < 0.08) return;
      if (time - lastSpawn < 56) return;
      lastSpawn = time;
      const x0 = clamp(vortexPointer.x - radius, 0, W);
      const y0 = clamp(vortexPointer.y - radius, 0, H);
      const x1 = clamp(vortexPointer.x + radius, 0, W);
      const y1 = clamp(vortexPointer.y + radius, 0, H);
      const limit = Math.max(1, Math.round(34 * particleAmount));
      let spawned = 0;
      for (let attempt = 0; attempt < 240 && spawned < limit; attempt += 1) {
        const x = x0 + Math.random() * (x1 - x0);
        const y = y0 + Math.random() * (y1 - y0);
        const dx = x - vortexPointer.x;
        const dy = y - vortexPointer.y;
        const d = Math.hypot(dx, dy);
        if (d > radius || d < radius * 0.18) continue;
        const px = sampleLayer(x, y);
        if (!px || px[3] < 28) continue;
        const nx = dx / Math.max(1, d);
        const ny = dy / Math.max(1, d);
        const burst = 0.32 + Math.random() * 1.1;
        const tangent = (Math.random() - 0.5) * 1.2;
        particles.push({
          x,
          y,
          vx: nx * burst - ny * tangent,
          vy: ny * burst + nx * tangent - 0.12 + Math.random() * 0.4,
          size: 0.65 + Math.random() * 1.45,
          life: 520 + Math.random() * 600,
          max: 1120,
          color: `${px[0]},${px[1]},${px[2]}`,
          spin: Math.random() > 0.5 ? 1 : -1,
          phase: Math.random() * Math.PI * 2,
        });
        spawned += 1;
      }
      const cap = Math.max(1, Math.round(520 * particleAmount));
      if (particles.length > cap) particles.splice(0, particles.length - cap);
    };

    const updateParticles = (time, dt) => {
      const step = clamp(dt / 16.67, 0.25, 3);
      const alive = [];
      for (const p of particles) {
        p.life -= dt;
        if (p.life <= 0) continue;
        const swirl = Math.sin(time * 0.0024 + p.phase) * 0.018 * p.spin;
        p.vx += Math.cos(p.phase + time * 0.0017) * 0.011 * step - swirl * p.vy;
        p.vy += 0.014 * step + swirl * p.vx;
        p.vx *= Math.pow(0.987, step);
        p.vy *= Math.pow(0.991, step);
        p.x += p.vx * step;
        p.y += p.vy * step;
        const a = clamp(p.life / Math.min(p.max, 820), 0, 1) * opacity;
        ctx.fillStyle = `rgba(${p.color},${a * 0.85 * ringAlpha})`;
        const s = p.size * (0.5 + a * 0.5);
        ctx.fillRect(p.x - s * 0.5, p.y - s * 0.5, s, s);
        alive.push(p);
      }
      particles = alive;
    };

    const draw = (time) => {
      const sig = `${opacity}|${ringGrowth}|${W}|${H}|${speed}`;
      if (sig !== renderSig) {
        renderSig = sig;
        buildRings();
      }
      const dt = Math.min(time - (lastT || time), 100);
      lastT = time;
      const sec = (time / 1000) * speed;

      const pointerOn = !reduced && vortexPointer.inside;
      dissolve = lerp(
        dissolve,
        pointerOn ? 1 : 0,
        1 - Math.pow(0.78, dt / 16.6),
      );
      if (dissolve < 0.002) dissolve = 0;

      ctx.clearRect(0, 0, W, H);
      layerCtx.clearRect(0, 0, W, H);

      const cx = W * 0.5;
      const cy = H * 0.485;

      // Guide rings: dashed concentric guides that hint at the structure
      // without competing with the letter field.
      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = `rgba(${guideInk},${0.07 * opacity * ringAlpha})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 5]);
      for (const rg of rings) {
        ctx.beginPath();
        ctx.arc(0, 0, rg.radius * 1.12, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      // Letter rings + strays onto the offscreen layer.
      layerCtx.save();
      layerCtx.translate(cx, cy);
      for (const rg of rings) {
        const base =
          rg.offset + sec * rg.speed + Math.sin(sec * 0.11 + rg.wobble) * 0.02;
        layerCtx.save();
        layerCtx.rotate(base);
        layerCtx.drawImage(rg.bmp, -rg.size / 2, -rg.size / 2, rg.size, rg.size);
        layerCtx.restore();
      }
      layerCtx.textAlign = "center";
      layerCtx.textBaseline = "middle";
      for (const s of strays) {
        const a = s.angle + sec * s.speed;
        layerCtx.font = `${s.size}px ${FONT_STACK}`;
        layerCtx.fillStyle = `rgba(${strayInk},${s.alpha * ringAlpha})`;
        layerCtx.save();
        layerCtx.translate(Math.cos(a) * s.radius, Math.sin(a) * s.radius);
        layerCtx.rotate(a + Math.PI / 2);
        layerCtx.fillText(s.ch, 0, 0);
        layerCtx.restore();
      }
      layerCtx.restore();

      // Left-edge ambient mask: makes the field feel like it drifts in
      // from the page margin, matching the reference's column treatment.
      if (!reduced) {
        layerCtx.save();
        layerCtx.globalCompositeOperation = "destination-out";
        const g = layerCtx.createLinearGradient(0, 0, ambientW, 0);
        g.addColorStop(0, "rgba(0,0,0,.95)");
        g.addColorStop(0.4, "rgba(0,0,0,.78)");
        g.addColorStop(0.75, "rgba(0,0,0,.32)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        layerCtx.fillStyle = g;
        layerCtx.fillRect(0, 0, ambientW, H);
        layerCtx.restore();
      }

      // Centre veil: dissolve the field under the step copy so the reading
      // stays legible, while the margin keeps its full density.
      {
        const veilR = Math.min(W, H) * 0.42;
        const g = layerCtx.createRadialGradient(
          cx,
          cy,
          veilR * 0.05,
          cx,
          cy,
          veilR,
        );
        g.addColorStop(0, "rgba(0,0,0,.92)");
        g.addColorStop(0.55, "rgba(0,0,0,.72)");
        g.addColorStop(0.85, "rgba(0,0,0,.22)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        layerCtx.save();
        layerCtx.globalCompositeOperation = "destination-out";
        layerCtx.fillStyle = g;
        layerCtx.fillRect(0, 0, W, H);
        layerCtx.restore();
      }

      // Pointer dissolve: punch a hole where the cursor is, in addition
      // to the centre veil, so the field feels responsive to the visitor.
      const pointerR = clamp(Math.min(W, H) * 0.22, 120, 196) * dissolveRadius;
      if (dissolve > 0.002) {
        const r = pointerR * (0.42 + dissolve * 0.58);
        const g = layerCtx.createRadialGradient(
          vortexPointer.x,
          vortexPointer.y,
          r * 0.06,
          vortexPointer.x,
          vortexPointer.y,
          r,
        );
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(0.6, "rgba(0,0,0,.95)");
        g.addColorStop(0.86, "rgba(0,0,0,.4)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        layerCtx.save();
        layerCtx.globalCompositeOperation = "destination-out";
        layerCtx.fillStyle = g;
        layerCtx.beginPath();
        layerCtx.arc(vortexPointer.x, vortexPointer.y, r, 0, Math.PI * 2);
        layerCtx.fill();
        layerCtx.restore();
      }

      // Stamp the composed layer onto the main canvas.
      ctx.drawImage(layer, 0, 0, layer.width, layer.height, 0, 0, W, H);

      // Dust particles sampled from the field.
      spawnAmbient(time);
      spawnPointer(time, pointerR);
      updateParticles(time, dt);

      // Dissolve ring: a faint dashed circle drawn directly on the main
      // canvas so the visitor sees where the pointer is dissolving.
      if (dissolve > 0.02) {
        ctx.save();
        ctx.strokeStyle = `rgba(${guideInk},${(0.06 + dissolve * 0.12) * opacity * ringAlpha})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.arc(
          vortexPointer.x,
          vortexPointer.y,
          pointerR * (0.42 + dissolve * 0.58),
          0,
          Math.PI * 2,
        );
        ctx.stroke();
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [opacity, speed, ringGrowth, dissolveRadius, particleAmount]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className="oracle-vortex absolute inset-0 z-0 overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
