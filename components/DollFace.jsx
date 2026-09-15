"use client";

import { useEffect, useRef } from "react";

import { asset } from "../lib/asset.js";

/* The doll, as photographic layers rather than as drawn SVG.
 *
 * The first pass built this face out of gradients and paths, and it read as an
 * emoji: flat fills cannot carry matte-vinyl subsurface scattering, the
 * blurred mass of the hair, or the specular lobe on an eyeball. So the figure
 * is now the real render, supplied as seven exactly-aligned 1293x1080 RGBA
 * plates — body, two eyeballs, two lids, an eye-white backing and a highlight
 * pass — and this component's only job is to stack them and let the pupils
 * follow the cursor.
 *
 * ---------------------------------------------------------------------------
 * THE LAYER ORDER, which is the least obvious thing in this file.
 *
 * Bottom to top:  眼白  ->  眼球  ->  高光  ->  身体  ->  眼皮
 *
 * Three of those placements are deliberate and each is a statement about the
 * artwork rather than a preference.
 *
 * 1. The eyeballs are *under* the body, not over it. This is not a mistake.
 *    The body plate has a real transparent hole punched through it where each
 *    eye sits — measured, alpha 0 through the middle: left socket y[712..811],
 *    right y[471..586] — so the ball shows through that hole and is framed by
 *    the socket rim the artist painted. Stacking the ball on top instead would
 *    cover that rim and lose the recessed look entirely: the eye would read as
 *    a sticker on a face rather than as a ball set into one.
 *
 * 2. 眼白 (the eye white) is *below* the ball. The ball slides — see MAX_TRAVEL
 *    — and when it does it uncovers the part of the socket it just vacated.
 *    With no backing layer, what shows through that gap is whatever is behind
 *    the figure, which is not a colour this face owns. The white plate is sized
 *    to back the entire socket with room to spare, measured per eye:
 *
 *      left   white x[461..642] y[666..848]   socket x[489..635] y[712..811]
 *      right  white x[730..910] y[425..606]   socket x[789..902] y[471..586]
 *
 *    so the tightest clearance in any direction is 8px against a travel of 10.
 *    It is also what makes a dropped lid read correctly: the sclera is behind
 *    everything that moves, so the white is what the lash edge closes onto.
 *
 * 3. 高光 (the highlight pass) is *above* the ball and *below* the body. It is
 *    the specular lobe on the eye surface — a property of where the eye is, not
 *    of which way the ball happens to be pointing — so it must not ride along
 *    with the ball, and it must be occluded by the lid and by the opaque cheek
 *    exactly as the ball is. Both of those fall out of sitting between the two
 *    layers rather than out of any per-frame logic.
 *
 * 眼白 and 高光 are static: full-canvas plates with no transform, same as the
 * body. Only the two balls and the two lids are ever written to.
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
 * wrong again, check this first. It applies to the two new layers identically —
 * 眼白 and 高光 are not crops of the eyes, they are two more full canvases.
 *
 * ---------------------------------------------------------------------------
 * The lid micro-motion, and why it is a drift rather than a blink.
 *
 * A real blink was removed (see above): these plates carry the brow and the
 * lash line, so any travel big enough to close an eye drags those landmarks
 * with it. But a perfectly still lid reads as a decal, so some motion is kept.
 *
 * How much is available is a measurement, and the honest form of it is per
 * column. The lash edge is diagonal and so is the socket floor, so a single
 * column's clearance and the plate's global lowest row disagree by 90px, and
 * neither one alone is the constraint. Read column by column, the gap between
 * lash edge and socket floor runs −9px to +82px on the left (median +65) and
 * −38px to +89px on the right (median +55).
 *
 * The negative end of that range is real and is not a defect: at rest the lash
 * edge already crosses the socket floor at the inner corner of each eye. It
 * does not show, and the reason is that both edges are soft where they meet —
 * the socket floor fades in over roughly five pixels (alpha 3 → 47 → 164 → 239
 * → 255 down a column) and the lash edge is antialiased — so a few pixels of
 * overlap composite two partial alphas instead of cutting a hard line.
 *
 * What would show is travel large enough to drag the hard part of the lash edge
 * well past the floor. Compositing the plates at a range of offsets puts that
 * boundary in view: at 20px the eye narrows and still reads as a face; at 35px
 * it is a slit, which reads as a squint. The amplitudes below are about a fifth
 * of the median clearance, and roughly doubled from the previous pass — the
 * previous values were set while the lid was the only thing that could move,
 * and they were deliberately conservative.
 *
 * The two eyes are deliberately out of phase: in phase they read as one
 * mechanism, and the figure is asymmetric to begin with.
 *
 * Everything animated is one attribute write per frame from a single rAF loop:
 * nothing here re-renders React. */

/* The seven plates, all 1293x1080 RGBA.
 *
 * Three different encodings, each for a reason rather than by drift.
 *
 * The body is photographic — soft vinyl gradients with no repeating structure,
 * which is exactly what PNG is worst at — so it is lossy WebP. It was 2,127 KB
 * as PNG and compresses 2.6x; at 24% of first load it was the largest thing on
 * the page by a factor of four. At q95 with the alpha plane kept bit-exact
 * (`alpha_quality=100`) so the socket rims cannot drift, it is 86 KB, with
 * composite-space PSNR 46.7 dB and a worst single pixel of 11/255.
 *
 * A note for anyone re-checking that number: measured over raw RGBA it comes
 * out at 34 dB with a 193/255 worst pixel, which looks catastrophic and is not.
 * PNG export leaves whatever colour the artist's layer held under alpha=0 —
 * 31.6% of this plate — and WebP re-quantises it. That colour is invisible in
 * the composite and fully counted by a naive PSNR. Always composite over a
 * known background before believing a number like this.
 *
 * 眼白 and 高光 are the opposite case: smooth, low-frequency gradients with no
 * detail to lose and every reason not to band, so they are **lossless** WebP
 * (`lossless=True, exact=True` — the `exact` flag matters, it is what keeps the
 * transparent RGB untouched; without it 1.3M pixels come back changed). That
 * takes them from 46 KB and 81 KB as PNG down to 20 KB and 38 KB, bit-identical
 * on decode, and the whole seven-plate set to ~322 KB.
 *
 * The eyeballs and the lids stay PNG. They are flat line art with hard edges —
 * the class of image PNG already handles well, at 20-76 KB — so re-encoding
 * them buys nothing and risks ringing on the lash edge.
 *
 * Regenerate any of these with tools/reencode_doll.py. */
const PLATES = {
  body: asset("/doll/body.webp"),
  lidLeft: asset("/doll/lid-left.png"),
  lidRight: asset("/doll/lid-right.png"),
  eyeLeft: asset("/doll/eye-left.png"),
  eyeRight: asset("/doll/eye-right.png"),
  eyeWhite: asset("/doll/eye-white.webp"),
  highlight: asset("/doll/highlight.webp"),
};

/* Native size of the plates, and the canvas every layer is registered to. */
const ART_W = 1293;
const ART_H = 1080;

/* Eye centres in plate pixels, taken off the eyeball bounding boxes rather
 * than eyeballed: the figure is reclining at three-quarters, so the two eyes
 * are 239px apart vertically and 274px horizontally. A symmetric guess reads
 * as wrong immediately.
 *
 * Re-measured against the current plates: left box x[519..629] y[689..796] →
 * centre (574, 742.5); right box x[792..902] y[450..557] → centre (847, 503.5).
 * Both moved less than a pixel from the previous set, which is the useful part:
 * the new art is registered to the old canvas. */
const EYES = [
  { x: 574, y: 742.5 }, // 左, the lower eye
  { x: 847, y: 503.5 }, // 右, the upper eye
];

/* How far a pupil may slide, in plate pixels. The ball is ~111x108 and the
 * iris nearly fills it, so this is deliberately small: enough to read as a
 * glance, not so much that the ball leaves the socket painted for it.
 *
 * The eye-white now bounds this from underneath as well, and by a number worth
 * knowing: measured clearance from the ball to the edge of its white is 58/13
 * up/down 23/52 on the left and 62/8 up/down 25/49 on the right, against a
 * travel of 10. So the ball can only ever leave its backing by 2px, at the
 * right eye, moving straight right — and that strip is still covered by the
 * highlight pass, which overhangs the white on that side (x[740..916] against
 * the white's x[730..910]). */
const MAX_TRAVEL = 10;

/* Breathing lid, in SCREEN px — see the note below on why the unit matters.
 *
 * An earlier pass wrote this as 1.5 plate px and the motion was invisible:
 * the transform is in viewBox units, and at a 1440x900 window the plate is
 * drawn 1078 CSS px wide against a 1293-unit viewBox, so a plate px is only
 * 0.83 screen px. 3.2/2.6 screen px then measured a genuine 4.73/3.84 px of
 * travel and STILL read as motionless, so the unit was only half the problem.
 * Two more things were wrong underneath it.
 *
 * (1) The swing was too slight to read. Compositing the plates at both
 * extremes and diffing the socket regions says how much of the motion can be
 * seen: at 3.2px it changes only 2.1% of the left socket's pixels by 20/255 or
 * more. Real, but *thin*, and spread over 5.2s — below the threshold where a
 * viewer reads "moving" rather than "a still image". Not a loop bug: the loop
 * was always writing correct values.
 *
 * (2) A sine spends most of its time near the ends. Its per-frame step is
 * largest at the crossing, so the eye gets a slow dwell then a quick transit,
 * which reads as jitter rather than breathing. The tick sharpens the wave
 * toward a triangle so the speed is closer to constant.
 *
 * Both were fixed, and then the amplitudes were raised again on request — the
 * whole point of this pass. They are now ~2.2x the previous values, which the
 * per-column clearance above says is well inside what the plates will take, and
 * which the offset composites say still reads as breathing rather than as a
 * squint. See the micro-motion note in the header for where the ceiling is. */
/* `bias` sets where the wave sits: 1.0 puts its top at 0, so the lid touches
 * its authored rest pose and closes from there — the eye still reaches the
 * open state the artist drew. Above 1.0 the whole swing moves down and the
 * eye is left permanently part-closed, which at 2.6 had it never opening past
 * 80% of its own travel. Below 1.0 buys some upward room, which only the
 * right lid has. */
/* Amplitudes are also kept clear of LID_TRAVEL on purpose. A wave that hits
 * its clamp flat-tops, and a flat top is a dwell at the extreme — the very
 * thing the sharpened wave exists to remove. At 16px on the left the peak
 * travel is 16/k plate px, which stays under the clamp at every viewport width
 * down to roughly 460 CSS px of stage, and the clamp catches it below that. */
const LID_BREATH = [
  { amp: 16, period: 5200, phase: 0, bias: 1.0 },    // left: down-only
  { amp: 15, period: 6100, phase: 0.5, bias: 0.5 },  // right: both ways
];

/* Hard travel limits, in PLATE px. The tick clamps to these so the lid's cut
 * line can never travel far enough to show, whatever the wave asks for.
 *
 * Down is the tight direction. The worst column measured −9px (left) and −38px
 * (right) of clearance at rest — see the header note on why that is survivable
 * — so these are set against the *median* clearance instead, which is +65 and
 * +55, and then held to about 70% of it. That is deliberately generous
 * compared with the amplitude, because the clamp is insurance against a
 * retuned amplitude or a re-exported plate, not the thing that sets the look.
 *
 * Up is cheaper: it only opens the eye further, and since the eye-white backs
 * the whole socket there is now something to open onto rather than a gap. */
const LID_TRAVEL = [
  { up: 24, down: 46 }, // left
  { up: 24, down: 40 }, // right
];

/* Idle: after this long without a pointer the face looks around on its own.
 * Without it a touch device shows a frozen doll, which is the exact uncanny
 * look this is meant to avoid. */
const IDLE_AFTER = 4000;

export default function DollFace() {
  const stageRef = useRef(null);
  const ballsRef = useRef([]);
  const lidsRef = useRef([]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Respect the OS setting: hold the face still, eyes centred.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // The lids must still be placed, because their element carries the
      // breathing transform in the animated path and would otherwise inherit
      // the SVG's own default. A zero translate is the rest pose — the
      // animated wave is biased downward from here, so this is its baseline.
      for (const node of lidsRef.current) {
        if (node) node.setAttribute("transform", "translate(0 0)");
      }
      return;
    }

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

        /* Breathing lid. A sine rather than a tween, because the point is an
         * unending slow drift with no visible start or stop — anything with an
         * envelope would draw attention to the moment it begins. The right eye
         * is phase-shifted half a cycle so the two never move together.
         *
         * The amplitude is authored in screen px, so it has to be divided by
         * the same scale `k` the pupil travel uses to become viewBox units.
         * `bias` pushes the wave downward (positive viewBox y); see
         * LID_BREATH for the per-eye budgets that set it.
         *
         * `sharpen` bends the sine toward a triangle so the lid spends less
         * time parked at the ends and its speed is closer to constant. A plain
         * sine has near-zero velocity at the extremes, which is why a small
         * amplitude read as "stuck" rather than "breathing": a long dwell, then
         * a quick transit. asin(sin x)/pi*2 keeps the range and the period and
         * only redistributes the speed.
         *
         * The result is clamped to the per-eye travel budget rather than
         * trusted. The wave is smooth and the budgets were measured with a
         * margin, but a hard clamp is what makes it impossible for a retuned
         * amplitude — or a re-exported plate — to push the lid past the ball
         * and expose it. Cheap insurance on a constraint that shows as a tear
         * in the socket when violated. */
        const br = LID_BREATH[i];
        const t = (now / br.period + br.phase) % 1;
        const raw = Math.sin(t * Math.PI * 2);
        const sharpen = 0.45;
        const shaped =
          (Math.asin(raw) / Math.PI) * 2 * sharpen + raw * (1 - sharpen);
        const wave = (shaped + br.bias) / (1 + br.bias);
        /* Screen px -> viewBox units, then clamped. UP is negative y. */
        let lidPlate = (wave * br.amp) / k;
        lidPlate = Math.min(LID_TRAVEL[i].down, Math.max(-LID_TRAVEL[i].up, lidPlate));
        place(lidsRef.current[i], 0, lidPlate);
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
          {/* 眼白 — BOTTOM of the stack. The backing the ball slides across,
              and the surface the lash edge closes onto. It is larger than the
              socket in both axes on purpose: the socket is what crops it, and
              the overlap is what guarantees no edge of this plate is ever
              visible. Static; no transform is ever written to it. */}
          <image
            href={PLATES.eyeWhite}
            x="0"
            y="0"
            width={ART_W}
            height={ART_H}
            preserveAspectRatio="none"
          />

          {/* 眼球 — under the body, deliberately. The body plate has a
              transparent hole at each eye, so the ball is seen *through* the
              figure and framed by the painted socket rim. Drawing it above the
              body would cover that rim and flatten the eye into a sticker.
              These two are two of the four moving layers. */}
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

          {/* 高光 — over the ball, under the body. The specular pass belongs to
              the eye's position rather than to the ball's orientation, so it
              stays put while the ball slides beneath it, and it is cropped by
              the same socket rim. Static. */}
          <image
            href={PLATES.highlight}
            x="0"
            y="0"
            width={ART_W}
            height={ART_H}
            preserveAspectRatio="none"
          />

          {/* 身体 — the figure, with the eyes open as painted and the sockets
              punched through. It already carries the lower lashes. Static. */}
          <image
            href={PLATES.body}
            x="0"
            y="0"
            width={ART_W}
            height={ART_H}
            preserveAspectRatio="none"
          />

          {/* 眼皮 — TOP of the stack. No blink: these plates carry the brow and
              the lash line, so any travel big enough to close an eye would drag
              those landmarks down the face. They get a slow breathing drift
              instead — see LID_BREATH for the measured budget it lives inside. */}
          {[PLATES.lidLeft, PLATES.lidRight].map((href, i) => (
            <image
              key={href}
              ref={(el) => {
                lidsRef.current[i] = el;
              }}
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
