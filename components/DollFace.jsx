"use client";

import { useEffect, useRef } from "react";

/* The doll, as photographic layers rather than as drawn SVG.
 *
 * The first pass built this face out of gradients and paths, and it read as an
 * emoji: flat fills cannot carry matte-vinyl subsurface scattering, the
 * blurred mass of the hair, or the specular lobe on an eyeball. So the figure
 * is now the real render, supplied as five exactly-aligned 1293x1080 RGBA
 * plates — body, two lids, two eyeballs — and this component's only job is to
 * stack them and let the pupils follow the cursor.
 *
 * ---------------------------------------------------------------------------
 * THE LAYER ORDER, which is the least obvious thing in this file.
 *
 * Bottom to top:  眼球  ->  身体  ->  眼皮
 *
 * The eyeballs are *under* the body, not over it. That is not a mistake and
 * not a stylistic choice: the body plate has a real transparent hole punched
 * through it where each eye sits (sampled alpha 0 at both eye centres), so the
 * ball shows through that hole and is framed by the socket rim the artist
 * painted. Stacking the ball on top instead would paint over that rim and lose
 * the recessed look entirely — the eye would read as a sticker on a face
 * rather than as a ball set into one.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO BLINK. This was tried, tuned twice, and removed on purpose.
 *
 * The construction was: the lid plate slides down to cover the ball while the
 * ball withdraws upward, so the two part along one line. It cannot work with
 * these plates, and the reason is structural rather than a matter of tuning.
 *
 * Measured, in plate pixels:
 *
 *   左眼皮  y[630..778]  h=149    左眼球 y[688..796]
 *   右眼皮  y[406..603]  h=198    右眼球 y[449..558]
 *
 * To close the right eye its lid must travel from rest down until its bottom
 * edge passes the ball's bottom edge — covering y[361..558] on the way, i.e.
 * 198px of lid sliding down the face. But the right lid plate *carries the
 * eyebrow*, so the travel drags the brow down the forehead. The left lid is
 * the same failure in miniature: its lash edge is painted on the plate, so
 * sliding it detaches the lash from the lid crease.
 *
 * A flat plate cannot both sit correctly open and travel to correctly closed
 * when it has fixed facial features baked in — an anatomical lid would pivot
 * about the crease and foreshorten, which a translate-only plate cannot do.
 * Closing properly needs either plates cut so the moving part carries no
 * landmark, or a shape-morph between two authored states. Until one of those
 * exists, no blink is better than a blink that dislocates the brow.
 *
 * ---------------------------------------------------------------------------
 * Why each plate is a full canvas
 *
 * Every plate is a 1293x1080 cutout, not a tight crop of its own subject —
 * the subject simply lives in one small region of the canvas. They were
 * exported that way on purpose: co-registration *is* the alignment data. So
 * each <image> is drawn at x=0 y=0 width=1293 height=1080 and the artwork
 * lands exactly where it belongs, with no per-layer geometry at all.
 *
 * Getting this wrong is silent and looks like a rendering bug: placing a plate
 * into a hand-measured sub-rect (say a 113x110 box around an eyeball) rescales
 * all 1293x1080 px of artwork into that box, so the iris smears across the
 * whole eye and the composite reads as a white blob. If the eyes ever look
 * wrong again, check this first.
 *
 * ---------------------------------------------------------------------------
 * The only thing that animates is the pupil, and only by a few pixels. The
 * loop writes the SVG `transform` *attribute* (not a CSS property) once per
 * frame per ball; React never re-renders. */

const PLATES = {
  body: "/doll/body.png",
  lidLeft: "/doll/lid-left.png",
  lidRight: "/doll/lid-right.png",
  eyeLeft: "/doll/eye-left.png",
  eyeRight: "/doll/eye-right.png",
};

/* Native size of the plates, and the canvas every layer is registered to. */
const ART_W = 1293;
const ART_H = 1080;

/* Eye centres in plate pixels, taken off the eyeball bounding boxes rather
 * than eyeballed: the figure is reclining at three-quarters, so the two eyes
 * are 239px apart vertically and 274px horizontally. A symmetric guess reads
 * as wrong immediately. */
const EYES = [
  { x: 573.5, y: 742 }, // 左, the lower eye
  { x: 847, y: 503.5 }, // 右, the upper eye
];

/* How far a pupil may slide, in plate pixels. The ball is ~113x110 and the
 * iris nearly fills it, so this is deliberately small: enough to read as a
 * glance, not so much that the ball leaves the socket painted for it. */
const MAX_TRAVEL = 10;

/* Idle: after this long without a pointer the face looks around on its own.
 * Without it a touch device shows a frozen doll, which is the exact uncanny
 * look this is meant to avoid. */
const IDLE_AFTER = 4000;

export default function DollFace() {
  const stageRef = useRef(null);
  const ballsRef = useRef([]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Respect the OS setting: hold the face still, eyes centred.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    /* Start looking at the camera rather than at an arbitrary screen point.
     * `innerWidth * 0.3` was the first guess and it biases both pupils to the
     * far left of their sockets on load, which reads as a squint until the
     * visitor happens to move the mouse. Aiming at the screen centre puts the
     * gaze near neutral. */
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.45;
    let curX = targetX;
    let curY = targetY;
    let lastPointer = -1e9;
    let nextWander = 0;

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      lastPointer = performance.now();
    };

    /* Writes the SVG transform *attribute* rather than a CSS property: it
     * needs no `transform-box` gymnastics to land in plate units. */
    const place = (node, x, y) => {
      if (node) node.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const rect = stage.getBoundingClientRect();
      if (!rect.width) return;

      if (now - lastPointer > IDLE_AFTER && now > nextWander) {
        nextWander = now + 2800 + Math.random() * 2600;
        targetX = window.innerWidth * (0.12 + Math.random() * 0.5);
        targetY = window.innerHeight * (0.15 + Math.random() * 0.7);
      }

      // Critically-damped-ish follow. The lag is the whole point: an eye
      // pinned exactly to the cursor reads as a UI widget, not a face.
      curX += (targetX - curX) * 0.14;
      curY += (targetY - curY) * 0.14;

      /* Screen px -> plate px, so the limit is the same on any screen. The
       * transform attribute is in viewBox units, hence the divide. */
      const k = rect.width / ART_W;

      for (let i = 0; i < EYES.length; i += 1) {
        const ex = rect.left + (EYES[i].x / ART_W) * rect.width;
        const ey = rect.top + (EYES[i].y / ART_H) * rect.height;
        const dx = curX - ex;
        const dy = curY - ey;
        const d = Math.hypot(dx, dy) || 1;
        // Clamp first, then normalise — the other order lets a distant cursor
        // fling the pupil straight out of the socket.
        const mag = Math.min(d / k, MAX_TRAVEL);
        place(ballsRef.current[i], (dx / d) * mag, (dy / d) * mag);
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="doll" aria-hidden="true">
      <div ref={stageRef} className="doll-stage">
        <svg className="doll-svg" viewBox={`0 0 ${ART_W} ${ART_H}`}>
          {/* 眼球 — BOTTOM of the stack, deliberately. The body plate has a
              transparent hole at each eye, so the ball is seen *through* the
              figure and framed by the painted socket rim. Drawing it above the
              body would cover that rim and flatten the eye into a sticker.
              These two are the only moving layers. */}
          {[PLATES.eyeLeft, PLATES.eyeRight].map((href, i) => (
            <image
              key={href}
              ref={(el) => {
                ballsRef.current[i] = el;
              }}
              href={href}
              x="0"
              y="0"
              width={ART_W}
              height={ART_H}
              preserveAspectRatio="none"
            />
          ))}

          {/* 身体 — the figure, with the eyes open as painted and the sockets
              punched through. It already carries the lower lashes. */}
          <image
            href={PLATES.body}
            x="0"
            y="0"
            width={ART_W}
            height={ART_H}
            preserveAspectRatio="none"
          />

          {/* 眼皮 — TOP of the stack, and static. See the note on the removed
              blink at the head of this file: these plates have the brow and
              the lash line baked in, so sliding them dislocates the face. They
              sit at the register the artist drew, which is the correct open
              eye, and nothing moves them. */}
          {[PLATES.lidLeft, PLATES.lidRight].map((href) => (
            <image
              key={href}
              href={href}
              x="0"
              y="0"
              width={ART_W}
              height={ART_H}
              preserveAspectRatio="none"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
