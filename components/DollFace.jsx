"use client";

import { useEffect, useRef } from "react";

/* The doll's face, drawn as flat SVG so it can sit *behind* the WebGL ring
 * as a background layer. The renderer is created with `alpha: true`, so the
 * canvas is genuinely transparent and the ring floats over this rather than
 * hiding it — no compositing trick needed.
 *
 * Art direction comes off the deck itself: every plate in public/tarot is
 * the same pale-blue-haired doll, so the face here borrows its palette
 * (powder-blue hair, pink skin, matte vinyl — soft shading, no outlines)
 * instead of inventing a second mascot that would fight the cards.
 *
 * Everything animated is transform-only, written from a single rAF loop:
 * two pupil groups and two lid groups. Nothing re-renders React. */

/* Eye centres as a fraction of the viewBox — each eye derives its own
 * direction vector, since two eyes looking at one point are not parallel
 * and sharing a single offset reads immediately as wrong. */
const EYES = [
  { nx: 0.34, ny: 0.5833 },
  { nx: 0.66, ny: 0.5833 },
];

const VB_W = 1000;

/* How far a pupil may slide inside its socket, in viewBox units. The iris
 * r=46 sits in a socket of rx=80 / ry=64, so the real headroom is 34 across
 * and 18 down; 24 leaves a ring of sclera at the limit instead of letting
 * the iris press against the rim. */
const MAX_TRAVEL = 24;

/* Blink envelope, ms. The close is the fast part — an eyelid that descends
 * at the same speed it rises reads as a slow mechanical shutter. */
const BLINK_CLOSE = 90;
const BLINK_HOLD = 40;
const BLINK_OPEN = 130;
const BLINK_TOTAL = BLINK_CLOSE + BLINK_HOLD + BLINK_OPEN;

/* Where the lid parks when open, as a % of its own height. Slightly more
 * than 100 so no sliver of skin is left hanging over the eye. */
const LID_OPEN = -108;

/* Idle: after this long without a pointer, the face looks around on its
 * own. Without it a touch device shows a frozen doll, which is exactly the
 * uncanny look this is meant to avoid. */
const IDLE_AFTER = 4000;

export default function DollFace() {
  const svgRef = useRef(null);
  const pupilsRef = useRef([]);
  const lidsRef = useRef([]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    // Respect the OS setting: hold the face still, eyes centred.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let targetX = window.innerWidth * 0.3;
    let targetY = window.innerHeight * 0.45;
    let curX = targetX;
    let curY = targetY;
    let lastPointer = -1e9;
    let nextWander = 0;
    let blinkStart = 0;
    let nextBlink = performance.now() + 2200 + Math.random() * 3600;

    const onMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      lastPointer = performance.now();
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const rect = svg.getBoundingClientRect();
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

      // Screen px -> viewBox units, so the limit is the same on any screen.
      const k = rect.width / VB_W;
      for (let i = 0; i < EYES.length; i += 1) {
        const node = pupilsRef.current[i];
        if (!node) continue;
        const ex = rect.left + rect.width * EYES[i].nx;
        const ey = rect.top + rect.height * EYES[i].ny;
        const dx = curX - ex;
        const dy = curY - ey;
        const d = Math.hypot(dx, dy) || 1;
        // Clamp first, then normalise — the other order lets a distant
        // cursor fling the pupil straight out of the socket.
        const mag = Math.min(d / k, MAX_TRAVEL);
        node.style.transform = `translate(${(dx / d) * mag}px, ${(dy / d) * mag}px)`;
      }

      let lid = LID_OPEN;
      if (!blinkStart && now > nextBlink) blinkStart = now;
      if (blinkStart) {
        const t = now - blinkStart;
        if (t < BLINK_CLOSE) lid = LID_OPEN * (1 - t / BLINK_CLOSE);
        else if (t < BLINK_CLOSE + BLINK_HOLD) lid = 0;
        else if (t < BLINK_TOTAL) lid = LID_OPEN * ((t - BLINK_CLOSE - BLINK_HOLD) / BLINK_OPEN);
        else {
          blinkStart = 0;
          nextBlink = now + 2400 + Math.random() * 4200;
        }
      }
      for (const node of lidsRef.current) {
        if (node) node.style.transform = `translateY(${lid}%)`;
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
      <svg
        ref={svgRef}
        className="doll-svg"
        viewBox="0 0 1000 1200"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Matte vinyl: light falls from the upper left and falls off
              towards the jaw. Flat fills were what made the first pass read
              as an emoji rather than a figurine. */}
          <radialGradient id="doll-skin" cx="36%" cy="26%" r="82%">
            <stop offset="0%" stopColor="#fdeae4" />
            <stop offset="55%" stopColor="#f9dcd5" />
            <stop offset="100%" stopColor="#eec0b8" />
          </radialGradient>
          <linearGradient id="doll-hair" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cbe0f1" />
            <stop offset="52%" stopColor="#b3cce5" />
            <stop offset="100%" stopColor="#9cb8d5" />
          </linearGradient>
          <linearGradient id="doll-hair-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#aac6e0" />
            <stop offset="100%" stopColor="#8caac9" />
          </linearGradient>

          <clipPath id="doll-eye-l">
            <ellipse cx="340" cy="700" rx="80" ry="64" />
          </clipPath>
          <clipPath id="doll-eye-r">
            <ellipse cx="660" cy="700" rx="80" ry="64" />
          </clipPath>
          {/* The lid is a full-height block that slides down over the eye.
              Clipping it to the socket box is what keeps it invisible while
              parked — unclipped it would ride up onto the fringe. */}
          <clipPath id="doll-lid-l">
            <rect x="240" y="610" width="200" height="180" />
          </clipPath>
          <clipPath id="doll-lid-r">
            <rect x="560" y="610" width="200" height="180" />
          </clipPath>
        </defs>

        {/* Hair behind the head — the outer silhouette the fringe sits on */}
        <ellipse cx="500" cy="620" rx="420" ry="470" fill="url(#doll-hair-back)" />
        <path
          d="M104 620 C86 790 94 930 70 1090 L206 1090 C192 930 198 790 212 646 C184 668 142 664 104 620 Z"
          fill="url(#doll-hair-back)"
        />
        <path
          d="M896 620 C914 790 906 930 930 1090 L794 1090 C808 930 802 790 788 646 C816 668 858 664 896 620 Z"
          fill="url(#doll-hair-back)"
        />

        <ellipse cx="500" cy="650" rx="390" ry="440" fill="url(#doll-skin)" />

        {/* Cheek sheen + blush */}
        <ellipse cx="286" cy="700" rx="120" ry="96" fill="#ffffff" opacity="0.16" />
        <ellipse cx="714" cy="700" rx="120" ry="96" fill="#ffffff" opacity="0.16" />
        <ellipse cx="252" cy="818" rx="94" ry="50" fill="#f3aea6" opacity="0.42" />
        <ellipse cx="748" cy="818" rx="94" ry="50" fill="#f3aea6" opacity="0.42" />

        <ellipse cx="500" cy="840" rx="19" ry="12" fill="#e9b0a8" opacity="0.8" />
        <path
          d="M466 926 Q500 950 534 926"
          fill="none"
          stroke="#d68f89"
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        {/* Left eye */}
        <ellipse cx="340" cy="700" rx="80" ry="64" fill="#f4f6f9" />
        <g clipPath="url(#doll-eye-l)">
          <g
            ref={(el) => {
              pupilsRef.current[0] = el;
            }}
            className="doll-pupil"
          >
            <circle cx="340" cy="700" r="46" fill="#93a3b5" />
            <circle cx="340" cy="700" r="25" fill="#485465" />
            <circle cx="328" cy="686" r="14" fill="#ffffff" opacity="0.95" />
          </g>
        </g>
        <path d="M256 626 L424 626 L424 660 Q340 700 256 660 Z" fill="#f9dcd5" />
        <path
          d="M256 660 Q340 700 424 660"
          fill="none"
          stroke="#6c7a8b"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path d="M258 658 L234 638" stroke="#6c7a8b" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M262 670 L238 663" stroke="#6c7a8b" strokeWidth="3" strokeLinecap="round" />

        {/* Right eye — same construction, mirrored */}
        <ellipse cx="660" cy="700" rx="80" ry="64" fill="#f4f6f9" />
        <g clipPath="url(#doll-eye-r)">
          <g
            ref={(el) => {
              pupilsRef.current[1] = el;
            }}
            className="doll-pupil"
          >
            <circle cx="660" cy="700" r="46" fill="#93a3b5" />
            <circle cx="660" cy="700" r="25" fill="#485465" />
            <circle cx="648" cy="686" r="14" fill="#ffffff" opacity="0.95" />
          </g>
        </g>
        <path d="M576 626 L744 626 L744 660 Q660 700 576 660 Z" fill="#f9dcd5" />
        <path
          d="M576 660 Q660 700 744 660"
          fill="none"
          stroke="#6c7a8b"
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        <path d="M742 658 L766 638" stroke="#6c7a8b" strokeWidth="3.6" strokeLinecap="round" />
        <path d="M738 670 L762 663" stroke="#6c7a8b" strokeWidth="3" strokeLinecap="round" />

        {/* Blink layers, clipped to the socket boxes */}
        <g clipPath="url(#doll-lid-l)">
          <rect
            ref={(el) => {
              lidsRef.current[0] = el;
            }}
            className="doll-lid"
            x="240"
            y="610"
            width="200"
            height="180"
            rx="62"
            fill="#f9dcd5"
          />
        </g>
        <g clipPath="url(#doll-lid-r)">
          <rect
            ref={(el) => {
              lidsRef.current[1] = el;
            }}
            className="doll-lid"
            x="560"
            y="610"
            width="200"
            height="180"
            rx="62"
            fill="#f9dcd5"
          />
        </g>

        {/* Fringe last, so it overlaps the brow. The strand lines give the
            mass a few partings — without them it reads as a swim cap. */}
        <path
          d="M96 620 C96 300 280 150 500 150 C720 150 904 300 904 620 C872 560 842 512 806 546 C770 580 742 516 704 540 C666 564 642 500 604 526 C566 552 544 488 506 516 C468 544 448 484 410 510 C372 536 348 490 310 518 C272 546 240 556 200 586 C160 616 130 586 96 620 Z"
          fill="url(#doll-hair)"
        />
        <path d="M270 200 C232 296 214 420 226 528" fill="none" stroke="#d7e7f5" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
        <path d="M430 176 C400 290 392 424 408 520" fill="none" stroke="#d7e7f5" strokeWidth="9" strokeLinecap="round" opacity="0.42" />
        <path d="M596 178 C628 292 636 426 620 522" fill="none" stroke="#d7e7f5" strokeWidth="9" strokeLinecap="round" opacity="0.42" />
        <path d="M756 214 C792 306 806 428 792 534" fill="none" stroke="#d7e7f5" strokeWidth="10" strokeLinecap="round" opacity="0.5" />
        <path d="M96 620 C150 566 196 592 232 566" fill="none" stroke="#9cb8d5" strokeWidth="3" opacity="0.35" />
        <path d="M904 620 C850 566 804 592 768 566" fill="none" stroke="#9cb8d5" strokeWidth="3" opacity="0.35" />
      </svg>
    </div>
  );
}
