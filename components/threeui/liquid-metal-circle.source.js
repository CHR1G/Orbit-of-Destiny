/* The adapter's source surgery, as data rather than as a component.
 *
 * Split out from LiquidMetalCircle.jsx so it can be run outside the bundler:
 * the whole point of this file is to prove, against the vendored html, that
 * every anchor still exists. `node .probe/check-adapted.cjs` does exactly that
 * and writes the result to disk for inspection in a browser.
 *
 * Keep in mind what is *not* here: no shader, no motion, no interaction. Those
 * are the published bundle's, untouched. This file only composes the circle
 * variant's own transforms and then applies the six overrides documented here
 * and on LiquidMetalCircle.jsx, each one asserted so it cannot silently no-op.
 */

import LIQUID_METAL_BUTTON_SOURCE from "./liquid-metal-button.source.js";

/* The published bridge, verbatim from LiquidMetalButton.tsx. */
export const LIQUID_METAL_BUTTON_BRIDGE = `
<script id="liquid-metal-button-bridge">
  window.addEventListener('message', event => {
    if(event.source !== parent) return;
    const config = event.data && event.data.liquidMetalButton;
    if(!config) return;
    const text = typeof config.text === 'string' ? config.text.slice(0, 24) : '';
    const label = btn.querySelector('.lbl');
    if(label) label.textContent = text;
    btn.setAttribute('aria-label', text || 'Button');
    if(Number.isFinite(config.pillWidthUnits)) {
      stage.style.setProperty('--bw', 'calc(' + config.pillWidthUnits + ' * var(--u))');
    }
    document.body.style.background = config.embedded ? '#0e0f12' : '';
    stage.style.position = config.embedded ? 'absolute' : '';
    stage.style.top = config.embedded ? '50%' : '';
    stage.style.left = config.embedded ? '50%' : '';
    stage.style.transform = config.embedded ? 'translate(-50%, -50%)' : '';
  });

  btn.addEventListener('click', () => {
    parent.postMessage({ liquidMetalButton: { type: 'activate' } }, '*');
  });
</script>`;

/* The published circle variant, verbatim from LiquidMetalButton.tsx. */
export const CIRCLE_RUNTIME_STYLE = `
<style id="liquid-metal-circle-variant">
  body[data-shape="circle"] .stage {
    --h: clamp(56px, 10vmin, 72px);
    --bw: var(--h);
  }

  body[data-shape="circle"] .btn {
    gap: 0;
  }

  body[data-shape="circle"] .btn .ico {
    width: 28%;
    height: 28%;
  }

  body[data-shape="circle"] .btn .lbl {
    display: none;
  }
</style>`;

/* Override 1-2: the ground and the plate's tone ladder.
 *
 * The reference paints its own page - a radial pool falling to #000 behind a
 * centred stage - and its plate is #0b0c0e, chosen against that black. Dropped
 * in as-is each orb would be a 180px black square on a #fafafa page. The ground
 * is cleared so the plate is the only thing drawn.
 *
 * The plate used to be lifted to a single dark tone and left there, which is
 * what the visitor has now rejected as too heavy; it walks a ladder instead,
 * and the reason is worth stating because the tone and the metal are coupled.
 * The field's unlit crescent multiplies the metal by an envelope that is zero
 * there, so it contributes no light - and what shows through that crescent is
 * the plate. A dark ground is therefore not styling, it is the thing the metal
 * is *read* against; on a light ground the metal turns into a bright band on a
 * grey ball. So the ground keeps its dark end, and pays for a light rest state
 * by taking the dark on only while the metal is actually up.
 *
 * `--pad` is the bloom's clearance. The reference's 900 units is 1.74x the
 * button, sized for a hero; 620 keeps the same halo (it reaches about half a
 * button height) inside a box that can be laid into a menu row. */
export const DESTINATION_STYLE = `
<style id="liquid-metal-destination">
  /* 1. ground: the page underneath is the ground, not this iframe. */
  html, body { background: transparent !important; }

  /* The bloom pad is only ever transparent light, but the iframe is a real box
     over the menu: it must not eat the row's own hover, and it must not eat
     clicks aimed at the label beside it. Only the disc is a target. */
  html, body, .stage { pointer-events: none; }
  .btn { pointer-events: auto; cursor: pointer; }

  /* The circle variant's plus-mark is an "add" affordance; this orb is the
     row's slot, and the menu's own instruction is that the disc carries no mark
     at rest. */
  .btn .ico { display: none; }

  .stage { --pad: calc(620 * var(--u)); }
  body[data-shape="circle"] .stage { --h: var(--lm-d, 52px); }

  /* 2. the disc's own body, and the ladder it walks when the metal comes up.
   *
   * At rest it is a light grey - the second step down from the page and one
   * below the row's own body - instead of the reference's #0b0c0e. The deep
   * end has not gone away, it has moved to the two stepped states, which walk
   * past the rest tone to the ground the metal is lit against (see the head of
   * this file). body.hot is set by the same pointerenter that starts the
   * field, and this cross-fade is 0.34s against the metal's own ~0.3s rise, so
   * the ground sinks as the metal arrives rather than before it.
   *
   * The shadow follows the same ladder, and has to. The reference's drop is
   * three near-black alphas (.72/.62/.42) that belong under a black plate; on
   * a light one they read as a dark ring bolted to a pale disc. At rest it is
   * the same three offsets at a cool 20/15/10%, and the deep states carry the
   * reference's own numbers back unchanged.
   *
   * The fourth shadow is the rest state's bezel, and it is doing real work: a
   * light disc on a light page has no edge of its own, and at rest the shader
   * draws only its hairline (uE[0], 0.20). It is kept to four entries in all
   * three states on purpose - a box-shadow list only cross-fades between
   * lists of equal length, and a three-entry hot state would snap. */
  .plate {
    background: var(--lm-plate, #d9dde5);
    box-shadow:
      inset 0 0 0 1px rgba(96, 110, 136, 0.35),
      0 calc(var(--h) * 0.10) calc(var(--h) * 0.22) rgba(58, 70, 96, 0.2),
      0 calc(var(--h) * 0.30) calc(var(--h) * 0.66) rgba(58, 70, 96, 0.15),
      0 calc(var(--h) * 0.62) calc(var(--h) * 1.30) rgba(58, 70, 96, 0.1);
    transition:
      background 0.34s ease-out,
      box-shadow 0.34s ease-out;
  }
  body.hot .plate {
    background: var(--lm-plate-hot, #1a1d23);
    box-shadow:
      inset 0 0 0 1px rgba(140, 156, 186, 0.22),
      0 calc(var(--h) * 0.12) calc(var(--h) * 0.26) rgba(0, 0, 0, 0.8),
      0 calc(var(--h) * 0.40) calc(var(--h) * 0.86) rgba(0, 0, 0, 0.72),
      0 calc(var(--h) * 0.86) calc(var(--h) * 1.80) rgba(0, 0, 0, 0.55);
  }
  body.press .plate {
    background: var(--lm-plate-press, #0f1116);
    box-shadow:
      inset 0 0 0 1px rgba(140, 156, 186, 0.22),
      0 calc(var(--h) * 0.05) calc(var(--h) * 0.13) rgba(0, 0, 0, 0.82),
      0 calc(var(--h) * 0.16) calc(var(--h) * 0.40) rgba(0, 0, 0, 0.7),
      0 calc(var(--h) * 0.34) calc(var(--h) * 0.80) rgba(0, 0, 0, 0.5);
    transition-duration: 0.1s;
  }
</style>`;

/* Runs inside the animation's own scope, where `stage`, `btn`, `needResize` and
 * `drawn` exist - the published play variant injects its config handler at the
 * same point, for the same reason. */
export const DESTINATION_RUNTIME = `
  window.addEventListener('message', event => {
    if(event.source !== parent) return;
    const config = event.data && event.data.liquidMetalCircle;
    if(!config) return;
    /* The floor only has to reject a degenerate measurement; it must not
       override a good one. At 36 it did: this page's disc resolves to 35.0px,
       so the metal pill came out 1px wider than the plate it sits on and its
       rim rode the page instead of the disc. The number that arrives here is
       the layout's own, and the whole point of measuring it is to use it. */
    const d = Math.min(160, Math.max(24, Number(config.diameter) || 52));
    stage.style.setProperty('--lm-d', d + 'px');
    if(typeof config.plate === 'string') stage.style.setProperty('--lm-plate', config.plate);
    if(typeof config.plateHot === 'string') stage.style.setProperty('--lm-plate-hot', config.plateHot);
    if(typeof config.platePress === 'string') stage.style.setProperty('--lm-plate-press', config.platePress);
    if(typeof config.label === 'string') btn.setAttribute('aria-label', config.label.slice(0, 24));
    /* The box just changed size: force the next frame to re-measure and redraw
       rather than waiting for a paint that may never be scheduled. */
    needResize = true;
    drawn = null;
  });`;

/* Override 6: the pointer is replayed, not hit-tested.
 *
 * The host box is 3.6x the disc so the bloom has somewhere to fall. On this
 * menu's 46px row pitch those boxes overlap their neighbours by ~71px, and an
 * <iframe> is an opaque target in the *parent's* hit test even where nothing
 * inside it accepts a pointer - a pointer-events: none on html/body/.stage
 * below does not make the frame transparent. So five of them stacked meant
 * every orb but the last swallowed the next one's pointer: measured with a real
 * Input.dispatchMouseEvent, orbs 1-4 reported hot:false and never lit, orb 5
 * (nothing above it) did, and no row ever matched :hover.
 *
 * The fix is on the host: the frame is pointer-transparent and a disc-sized
 * element beside it is the only target (see globals.css). What that element
 * hears is replayed here as the button's own pointer events, so the published
 * interaction graph - the enter/leave pair, the window-level move tracker, the
 * press-and-ripple, the bridge's click - is still exactly what reacts. Only the
 * delivery changes, and it has to: the real pointer cannot reach this document.
 *
 * dx/dy are the offset from the disc's centre, which is what localPt(e) wants;
 * sending them instead of page coordinates avoids needing to know where the
 * frame sits, which a sandboxed srcdoc document cannot ask (frameElement is
 * null across the opaque origin). */
export const DESTINATION_POINTER = `
  window.addEventListener('message', event => {
    if(event.source !== parent) return;
    const p = event.data && event.data.liquidMetalPointer;
    if(!p) return;
    const r = btn.getBoundingClientRect();
    const mk = (type, init) => new PointerEvent(type, Object.assign({
      pointerId: 1, pointerType: 'mouse', isPrimary: true, cancelable: true,
      bubbles: type !== 'pointerenter' && type !== 'pointerleave',
      clientX: r.left + r.width / 2 + (p.dx || 0),
      clientY: r.top  + r.height / 2 + (p.dy || 0),
    }, init));
    if(p.type === 'enter')      btn.dispatchEvent(mk('pointerenter'));
    else if(p.type === 'leave') btn.dispatchEvent(mk('pointerleave'));
    else if(p.type === 'move')  window.dispatchEvent(mk('pointermove'));
    else if(p.type === 'down')  btn.dispatchEvent(mk('pointerdown', { button: p.button || 0, buttons: p.buttons || 1 }));
    else if(p.type === 'up')    window.dispatchEvent(mk('pointerup',   { button: p.button || 0, buttons: p.buttons || 0 }));
    else if(p.type === 'cancel') window.dispatchEvent(mk('pointercancel'));
    /* Not a synthetic pointerdown/up pair: that produces no click, and the
       published bridge is what reports the activation back to the row. */
    else if(p.type === 'click') btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });`;

/* Override 3: the shimmer becomes a hover event.
 *
 * Authored, the rim's travelling lobes run forever - "the rim keeps travelling
 * even at rest". The instruction here is that the silver only moves under the
 * pointer, so the three lobes are scaled by the hover amount the shader already
 * tracks. The base outline (uE[0]) is untouched: the disc still draws its own
 * hairline at rest, which is what says a slot lives there. */
const RIM_HOT = [
  "  float v = uE[0];",
  "  v += 0.62 * pb(s - t*uE[4],             0.075);",
  "  v += 0.44 * pb(s + t*uE[4]*0.63 + 0.41, 0.135);",
  "  v += 0.30 * pb(s - t*uE[4]*0.34 + 0.73, 0.200);",
].join("\n");

const RIM_HOT_HOVER = [
  "  float v = uE[0];",
  "  v += uHover * 0.62 * pb(s - t*uE[4],             0.075);",
  "  v += uHover * 0.44 * pb(s + t*uE[4]*0.63 + 0.41, 0.135);",
  "  v += uHover * 0.30 * pb(s - t*uE[4]*0.34 + 0.73, 0.200);",
].join("\n");

/* Override 4: skip the frames that cannot have changed.
 *
 * With (3) in place a parked orb has nothing left to animate - no metal, no
 * travelling rim, no press, no ripple - so the frame is skipped instead of
 * redrawn. The published code already skips frames in exactly this way under
 * prefers-reduced-motion; this widens the same test rather than adding a second
 * mechanism. No authored frame is lost: the first frame of a hover leaves the
 * resting state and everything after it is drawn as published.
 *
 * `wasResize` is in the signature because a resize can move the pill without
 * changing the canvas' rounded device size, and without it that one frame would
 * be skipped and the disc left where it was. */
const IDLE_TEST = [
  "  if(needResize) resize();",
  "",
  "  // The rim keeps travelling even at rest, so the only truly static case is",
  "  // reduced motion with nothing in flight.",
  "  const sig = (calm.matches && !ripLive && ptrAmt < 0.002)",
  "    ? `${hover}|${press}|${W}|${H}` : null;",
  "  if(sig !== null && sig === drawn){ requestAnimationFrame(frame); return; }",
  "  drawn = sig;",
].join("\n");

const IDLE_TEST_DESTINATION = [
  "  const wasResize = needResize;",
  "  if(needResize) resize();",
  "",
  "  const rest = hover < 0.0015 && press < 0.002;",
  "  const sig = ((calm.matches || rest) && !ripLive && ptrAmt < 0.002 && !wasResize)",
  "    ? `${hover}|${press}|${W}|${H}` : null;",
  "  if(sig !== null && sig === drawn){ requestAnimationFrame(frame); return; }",
  "  drawn = sig;",
].join("\n");

/* Override 5: no third-party font.
 *
 * The reference pulls Inter from fonts.googleapis.com for a label the circle
 * variant hides. Five iframes each waiting on a remote stylesheet is five
 * chances for a blocked request to hold `load` - and `load` is what reveals the
 * button, so a blocked font would leave five blank discs. Removed; the stack
 * below still falls through to the system sans. */
const FONT_LINKS = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,100..900&display=swap" rel="stylesheet">',
  "",
].join("\n");

function must(source, needle, replacement, what) {
  if (!source.includes(needle)) {
    throw new Error(
      `[liquid-metal-circle] the vendored liquid-metal-button.html no longer ` +
        `contains the anchor for ${what}. Re-read the published source and ` +
        `re-apply this override deliberately.`,
    );
  }
  // A function replacement, so `$` in the substitute (the shader edits carry
  // template literals) is never read as a substitution pattern.
  return source.replace(needle, () => replacement);
}

export function buildCircleSource() {
  // The circle variant, assembled exactly as LiquidMetalButton.tsx assembles it.
  let src = LIQUID_METAL_BUTTON_SOURCE;
  src = must(src, "</head>", `${CIRCLE_RUNTIME_STYLE}\n${DESTINATION_STYLE}\n</head>`, "the head");
  src = must(src, "<body>", '<body data-shape="circle">', "the body tag");
  src = must(
    src,
    '<button class="btn" id="btn" type="button">',
    '<button class="btn" id="btn" type="button" aria-label="Add">',
    "the button tag",
  );
  src = must(src, "</body>", `${LIQUID_METAL_BUTTON_BRIDGE}\n</body>`, "the bridge");

  src = must(src, FONT_LINKS, "", "the remote font links");
  src = must(src, RIM_HOT, RIM_HOT_HOVER, "the rim's travelling lobes");
  src = must(
    src,
    "gl.uniform1f(pRim.u.uBw, bw);",
    "gl.uniform1f(pRim.u.uBw, bw);\n  gl.uniform1f(pRim.u.uHover, hover);",
    "the rim program's uniform block",
  );
  src = must(src, IDLE_TEST, IDLE_TEST_DESTINATION, "the frame-skip test");
  src = must(
    src,
    "window.__seek   = v => { clock = v; drawn = null; };",
    `window.__seek   = v => { clock = v; drawn = null; };\n${DESTINATION_RUNTIME}\n${DESTINATION_POINTER}`,
    "the animation scope",
  );

  return src;
}

/* Host box / button box. Must match `.play-orb .liquid-metal-button` in
 * globals.css, which is how the diameter is measured back off the layout: the
 * orb's size is the menu's vw-based type, so the only figure that agrees with a
 * vw is the one the layout has already resolved. */
export const HOST_RATIO = 3.6;

/* The authored plate steps as relative luminance: hot deepens, press settles.
 * Applied to whatever tone the caller hands in, so a different tone keeps the
 * reference's light logic instead of losing it. */
export function shade(hex, k) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v * k))),
  );
  return `#${ch.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
