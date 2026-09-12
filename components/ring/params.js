// Extension is explicit so this file also imports under plain Node ESM,
// which is how the ring-geometry check script loads it.
import { PROJECTS } from "./projects.js";

export const EASES = [
  "power2.out",
  "power3.out",
  "power4.out",
  "expo.out",
  "circ.out",
  "back.out(1.1)",
  "power1.inOut",
  "power2.inOut",
  "power3.inOut",
  "expo.inOut",
  "none",
];

export const WEIGHTS = { Light: 300, Regular: 400, Medium: 500, Semibold: 600 };

/**
 * Every tunable in one place. A fresh object per mount so the dev panel cannot
 * leak edits from one mount into the next.
 *
 * Two conventions worth knowing before reading further:
 *
 *  - Every px figure is quoted at `refWidth` and scaled from there. Change the
 *    machine you tune on and `refWidth` wants changing with it (the fit folder
 *    has a button that reads it off the live window).
 *  - Below `narrowAt` and again below `tightAt` the ring is re-proportioned
 *    rather than just scaled down. Those bands multiply the fit, they do not
 *    replace it, and they stack.
 */
export function defaultParams() {
  return {
    // -- fit ------------------------------------------------------------
    // 14" MacBook Pro at default scaling: 3024x1964 native, 1512x982 points.
    refWidth: 1512,
    refHeight: 870, // viewport, i.e. screen less menu bar and browser chrome
    fitHeight: 0, // 0 = width alone drives scale, 1 = whichever axis is tighter
    minScale: 0.5, // a phone is not a small desktop; bracket the extremes
    maxScale: 1.75,

    narrowAt: 1024, // inclusive
    narrowPlane: 1.25,
    narrowRadius: 1.3, // cards grow faster than the arc, or the gaps close up
    narrowText: 1.5, // type cannot shrink like a picture can and stay readable
    narrowEndScale: 4.22,

    // 480, not 640: this band exists for phones, and at 640 the ring was
    // still being asked for desktop-sized cards on a 640px screen. The stage
    // offset is quoted in ring radii (see stageX), so it stays correct on
    // both sides of the boundary now — the band is purely about how big the
    // cards and the arc are, not about where the arc sits.
    //
    // This is also the value the doll's hide breakpoint mirrors (globals.css,
    // `@media (max-width: 480px) { .doll { display: none } }`). Those two
    // used to disagree — the doll hid at 639 while this band opened at 480 —
    // which left 480..639 in a state neither had designed: phone
    // presentation, no doll, but a ring still sized for desktop. Retune the
    // two together.
    tightAt: 480, // inclusive
    // 1.15, not 0.82. At 22 cards each slot is half the angle it used to
    // be, so the same radius that kept twelve plates apart now leaves the
    // neighbours ~7px of daylight and the goo welds them into one band.
    // Positive again pulls the arc back out to roughly 95px of gap.
    tightRadius: 1.15, // multiplies narrowRadius
    tightSplit: 0.8, // the heading, competing with the ring for centre screen
    tightName: 1.5, // the name is the only label left, so it takes the billing
    tightNameBottom: 16, // px
    tightNameRight: 16, // px
    tightMetaWidth: 70, // vw of box, and so of filter region, around it

    // -- geometry, all at the reference window ---------------------------
    // planeSize is the LONG EDGE. The planes are tarot cards, so that is
    // the height; planeAspect (w/h) derives the width. 22 cards round the
    // ring instead of 12 leaves each slot half the angle, so the card is
    // smaller than the old landscape plate — at the old 90 the neighbours
    // would be touching.
    planeSize: 80, // long edge in px
    planeAspect: 100 / 179, // width / height, a Rider–Waite card
    count: PROJECTS.length, // one plane per project, so the deal comes out even
    ringRadius: 340,
    seed: 0, // where plane 0 sits, degrees (0 = 3 o'clock)
    radial: true, // long edge points outward; off = long edge along the ring
    // 3, not 6. At the resting scale the plane's short edge is ~45 plane-px,
    // so 6 was eating a seventh of it — the card read as a lozenge. The
    // value is in plane-px and rides planeK * g, so it stays visually the
    // same corner whatever the ring is scaled to.
    radius: 3, // corner
    textured: true, // off = flat silhouette, useful for reading the goo
    blend: 14, // px over which neighbouring art crossfades in the goo
    imageOffset: 0, // rotates the whole deal; 0 lands the entry on PROJECTS[0]

    // -- loading ---------------------------------------------------------
    // The counter is the gate: the entry launches on the frame it reads 100.
    // holdAfter is a beat held after that and wants to stay near zero.
    holdAfter: 0,
    loaderChase: 0.18,
    loaderBottom: 1, // vh
    loaderOut: 0.45, // seconds to fade once the hold lets go

    // -- entry timing ----------------------------------------------------
    stagger: 0.34,
    launchTime: 1.95,
    spreadEase: "power2.out",
    spreadTime: 3.6,
    // Where the ring goes once formed. stageAt is a fraction of the spread, so
    // 0.5 starts the move midway through the ring drawing.
    stageAt: 0.7,
    spinTurns: 1,
    spinTime: 2.6,
    spinEase: "power2.inOut",
    spinDelay: 0,
    // How far the ring's centre slides off, once the ring is formed. stageX is
    // counted in RING RADII, not in window widths: exactly one radius puts the
    // card facing front dead on the middle of the screen, at every size. A
    // window-relative offset reads the same at the reference width and then
    // walks the front card off the right edge on anything smaller, because
    // below `minScale` the fit stops shrinking while the offset does not.
    stageX: 1.0, // ring radii to the left
    posY: 0, // half-viewport-heights, downward
    endScale: 4.46,
    moveTime: 2.2,
    moveEase: "power2.inOut",
    moveDelay: 0.2,

    // -- scroll / drag / click, live once the entry finishes --------------
    scrollSpeed: 0.0022, // rad/s of angular velocity per px of wheel delta
    damping: 0.94, // velocity kept per 60fps frame
    maxSpeed: 12, // rad/s, so one flick cannot run away
    dragSpeed: 1,
    snap: true, // settle with a plane facing front
    snapTime: 0.8, // run-in, once the flick itself is spent
    snapFrom: 1, // rad/s under which the ring commits to a slot
    pickTime: 0.55, // click-to-centre: seconds for one slot, root-scaled
    pickEase: "power3.inOut",

    // -- the intro heading, in the scene ---------------------------------
    text: "Major Arcana",
    textSize: 41,
    // English / Latin all render in The Night Watch (self-hosted in
    // public/fonts). It is markedly wider than Satoshi/Geist, so the two
    // meta sizes below come down a notch to keep the lockups from
    // outgrowing their vw boxes — tune these two if you swap the face back.
    textFont: "TheNightWatch",
    textWeight: 400,
    textTracking: 0, // em
    textColor: "#0a0a0a",
    textAt: 0.42, // fraction of the spread
    textTime: 0.95,
    textStagger: 0.015,
    textEase: "power4.out",
    textOut: true,
    textOutAt: -0.5, // seconds relative to the ring landing; negative = early
    textOutTime: 0.7,
    textOutEase: "power2.in",

    // -- the meta either side of the ring --------------------------------
    // [number . name] left, [type . year] right. Insets and gaps in vw so the
    // pairs hold their relationship as the window changes.
    metaLeft: 5.5,
    metaRight: 5.5,
    metaGapL: 4.7,
    metaGapR: 3.6,
    metaWidth: 34, // this box is the filter region
    nameSize: (20 / 1440) * 100, // vw, quoted at 1440 (was 24 — see above)
    nameFont: "TheNightWatch",
    nameWeight: 400,
    idxSize: (14 / 1440) * 100, // a step lighter and smaller than the name (was 16)
    idxFont: "TheNightWatch",
    idxWeight: 400,
    listSize: 0.9, // vw; the column's line height is unitless so rows follow

    // The morph between one card's words and the next.
    nameMorphTime: 1.2,
    nameEase: "circ.out",
    nameBlur: 8.5, // px the outgoing word smears to before it lets go
    nameEdge: 400, // alpha gain — how abruptly the threshold sets
    nameCut: 0.33, // and the alpha it sets at
    nameSoften: 0.35, // px of blur after it, standing in for antialiasing

    // -- glass lip along the top and bottom ------------------------------
    glass: true,
    bandTop: 0.08, // fraction of viewport height
    bandBottom: 0.08,
    refract: 60, // px the image is pulled in at the very edge
    squeeze: 0.05,
    ripple: 5, // px of wave along the lip
    rippleFreq: 0.02,
    fringe: 1.5, // px of chromatic split
    sheen: 0.05,

    // -- pointer ---------------------------------------------------------
    // Nothing is drawn at the cursor. It softens the field around itself,
    // leans the nearest planes toward it and strings honey back between them.
    hover: true,
    touchHold: 0.16, // seconds of near-still press before a finger counts
    touchSlop: 10, // px of travel inside that window that calls it a swipe
    lag: 0.3, // cursor smoothing, per 60fps frame
    melt: 34, // px added to the ring's own blend at the cursor
    meltReach: 260, // px the softening and the wake carry
    reach: 1.7, // lean and swell falloff, in plane long edges
    swell: 0.09,
    pull: 26, // px a plane leans toward the cursor
    grab: 0.14, // how fast a plane takes up a lean, per 60fps frame
    release: 0.06, // and how slowly it lets go — asymmetric on purpose
    web: 0.2, // hovered thread width, as a fraction of the facing edge
    webReach: 1.15,
    wave: 4, // px of capillary wake at full pointer speed
    waveFreq: 0.05,
    waveSpeed: 7,

    // How the cards either side of the hovered one get out of its way. The
    // pointer block above answers to the cursor; these answer to the card.
    sideScale: 0.035,
    sidePush: 17, // px
    sideDim: 0.15,
    sideReach: 2.4, // in plane long edges, measured from the hovered card

    // -- the cursor tag, drawn in the same shader pass --------------------
    tagFrom: 1024, // viewport width it needs; below that there is no cursor
    tagText: "View",
    tagSize: 14,
    tagWeight: 500,
    tagArrow: 14, // px, the svg in /public
    tagGap: 6,
    // Offset off the cursor deliberately: sitting under it, the tag covers
    // the thing being pointed at. World px, so +y is up like posY.
    tagX: 64,
    tagY: -38,
    tagFrost: 0.16,
    tagRim: 0.02,
    tagRefract: 39.5,

    // -- honey between neighbouring planes --------------------------------
    thread: 1.0,
    thin: 0.4,
    pinch: 0.35,
    sag: 6,
    dissolve: 2.9,
    fillet: 14,

    // -- birth of the seed -------------------------------------------------
    wobble: 3,
    goo: 35,

    // -- idle cruise -------------------------------------------------------
    // Once input has been absent this long (seconds) and the ring has come
    // to rest, it drifts on its own — the "idle" phase. Any pointer, drag,
    // wheel, or pick resets the timer (see wake()).
    idleDelay: 3.0,
    idleRate: 0.04, // rad/s of the autonomous drift

    // -- focus zoom --------------------------------------------------------
    // A click grows the facing card in-shader and recedes/dims the rest. The
    // cards are SDFs in one fragment shader, so "zoom" is a uniform, not a
    // camera move. uZoom tweens 0->1; these shape the in-between.
    zoomScale: 2.4, // how much the focused plane grows
    zoomShrink: 0.55, // how much the others shrink
    zoomDim: 0.35, // brightness the others fall to (0 = black)
    zoomGoo: 0.15, // blend strength under focus, so edges read sharp
    zoomTime: 1.1, // seconds in and out
    zoomEase: "power3.inOut",
  };
}
