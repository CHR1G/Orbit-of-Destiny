"use client";

// HoloCard — 3D 全息闪卡。
//
// Port of the "3D全息流光闪卡" grammar in card.txt into a React component:
// the card tilts toward the pointer, a white glare tracks the cursor, and a
// rainbow foil sweeps under it. The whole effect is driven by four CSS
// custom properties the pointer handler writes (--rx/--ry/--px/--py) plus
// one strength var (--holofx), so the rAF-free update costs one style write
// per move and the compositor does the rest.
//
// Two deliberate departures from the reference:
//
//   1. Blend strength is dialled back. The reference was authored against a
//      near-black backdrop where `hard-light` + `color-dodge` read as
//      gleam; the tarot plates are bright artwork, where the same values
//      blow the highlights out to white. --glare-max / --foil-max expose
//      the two knobs so they can be tuned per surface.
//
//   2. Each plate is a FLAT, overflow-hidden box rather than a preserve-3d
//      one. Clipping the plate is what actually guarantees the rounded
//      corners hold on the glare and foil layers — in the reference every
//      layer repeats border-radius because nothing is clipped. It also
//      makes `backface-visibility` reliable, which preserve-3d + nested
//      transforms does not.
//
// Reduced-motion: no tilt, no glare sweep. The card simply sits flat.

import { useCallback, useEffect, useRef } from "react";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export default function HoloCard({
  src,
  alt = "",
  backSrc,
  radius = 20,
  maxTilt = 18,
  // Peak opacity for the two blend layers, reached when the pointer is
  // over the card. Lower both if the artwork starts washing out.
  glareMax = 0.5,
  foilMax = 0.38,
  // Rotates the front art 180° in-plane — an inverted (逆位) draw.
  reversed = false,
  className = "",
  style,
  children,
}) {
  const tiltRef = useRef(null);
  // Cached geometry. Two separate problems force this:
  //
  //   1. getBoundingClientRect() on every pointermove forces a synchronous
  //      layout — with a full-screen plate that reflow is felt as a shudder.
  //   2. Worse, the rect is the *transformed* box. Tilting the card changes
  //      it, so feeding it back into the next tilt is a feedback loop: the
  //      card chases its own projection and oscillates under a still cursor.
  //
  // So the box is measured once from offsetWidth/offsetHeight (layout size,
  // untouched by any transform) plus the rect's centre point (rotation is
  // about the centre, so the centre stays put). Measured on enter, dropped
  // on leave.
  const boxRef = useRef(null);
  // Latest pointer position. The pointermove handler just stamps this and
  // asks for one rAF; the rAF does the actual style write. That caps the
  // style writes to one per frame regardless of how often the OS fires
  // pointermove (which can be 200+ Hz on a gaming mouse).
  const posRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const tiltRefForRaf = useRef(null);

  const measure = () => {
    const el = tiltRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return null;
    // Centre from the rect (stable under rotation), size from layout.
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w, h };
  };

  const setVar = (name, value) =>
    tiltRef.current?.style.setProperty(name, value);

  const tick = useCallback(() => {
    rafRef.current = 0;
    const el = tiltRef.current ?? tiltRefForRaf.current;
    const box = boxRef.current;
    if (!el || !box) return;
    const { x, y } = posRef.current;
    const localX = x - (box.cx - box.w / 2);
    const localY = y - (box.cy - box.h / 2);
    // Percentages drive the gradient / foil focal point.
    const px = clamp((localX / box.w) * 100, 0, 100);
    const py = clamp((localY / box.h) * 100, 0, 100);
    // -1..1 offsets from centre drive the tilt.
    const dx = (localX - box.w / 2) / (box.w / 2);
    const dy = (localY - box.h / 2) / (box.h / 2);
    setVar("--ry", `${dx * maxTilt}deg`);
    setVar("--rx", `${-dy * maxTilt}deg`);
    setVar("--px", `${px}%`);
    setVar("--py", `${py}%`);
    setVar("--holofx", "1");
  }, [maxTilt]);

  const schedule = useCallback(
    (clientX, clientY) => {
      posRef.current.x = clientX;
      posRef.current.y = clientY;
      if (rafRef.current) return;
      tiltRefForRaf.current = tiltRef.current;
      rafRef.current = requestAnimationFrame(tick);
    },
    [tick],
  );

  // Warm the cache on enter so the very first move is not the one that pays
  // for a forced layout — by then the browser has already laid the card out
  // and the card is still at rest, so the geometry is the honest one.
  const onPointerEnter = useCallback(
    (e) => {
      boxRef.current = measure();
      schedule(e.clientX, e.clientY);
    },
    [schedule],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      schedule(e.clientX, e.clientY);
    },
    [schedule],
  );

  const onPointerLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    boxRef.current = null;
    setVar("--rx", "0deg");
    setVar("--ry", "0deg");
    setVar("--holofx", "0");
  }, []);

  // Drop any in-flight rAF if the component unmounts mid-frame so the
  // style write never lands on a torn-down node.
  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // A single plate: clipped image + the three blend layers on top.
  const plate = (imgSrc, imgAlt, back) => (
    <div
      className={`holo-plate${back ? " holo-plate--back" : ""}`}
      aria-hidden={back ? "true" : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={imgAlt}
        draggable={false}
        decoding="async"
        className="holo-img"
        style={reversed && !back ? { transform: "scale(1.06) rotate(180deg)" } : undefined}
      />
      <span className="holo-glare" aria-hidden="true" />
      <span className="holo-foil" aria-hidden="true" />
      <span className="holo-border" aria-hidden="true" />
    </div>
  );

  return (
    <div
      ref={tiltRef}
      className={`holo-tilt ${className}`}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        "--holo-radius": `${radius}px`,
        "--glare-max": glareMax,
        "--foil-max": foilMax,
        ...style,
      }}
    >
      {plate(src, alt, false)}
      {backSrc ? plate(backSrc, "", true) : null}
      {children}
    </div>
  );
}