"use client";

/* LiquidMetalCircle - ThreeUI's LiquidMetalButton, circle variant, built here.
 *
 * Source of record
 *   https://threeui.com/source-code/liquid-metal-button.json  (id liquid-metal-button)
 *   canonical-source  components/threeui/liquid-metal-button.html
 *                     sha256 76624e881a3aecbd79b473d9c51f53c7157d47052abd0f9dc28fefd223b0a819
 *   component         src/shaders/liquid-metal-button/LiquidMetalButton.tsx
 *                     sha256 89b940bab445f17fafb444a7833b3c785d24c86a28156d8ad231e18de9503e11
 *   shared-style      src/shaders/threeui.css
 *                     sha256 efe4447139f1358dd8e9be68edf6fa46cbefbd1de423a4d6c439ca61d2c8eccf
 *
 * All three hashes were recomputed from the fetched bundle before this file was
 * written, and scripts/build-threeui-source.mjs re-checks the html every time it
 * regenerates the module beside it. The renderer - five shader programs, the
 * three-slot ripple ring, the trailing cursor well, the soften and bloom post
 * chain - is the published code, untouched; so are the circle variant's own
 * transforms and the interaction graph.
 *
 * Six deliberate departures from the standalone reference are documented on
 * ./liquid-metal-circle.source.js, which is where the string surgery lives so
 * that it can be run and probed outside the bundler. In one line each: the
 * ground the reference paints for itself is cleared, its near-black plate
 * becomes a light rest tone that sinks back to the deep ground while the metal
 * is up, its travelling rim is gated on hover,
 * its frame loop is allowed to idle when nothing has changed, its remote
 * webfont is dropped (the circle shows no text, and five iframes waiting on
 * fonts.googleapis.com is five ways for `load` - and the reveal with it - to
 * hang), and its pointer is replayed from a disc-sized element in the host
 * rather than hit-tested inside the frame.
 *
 * This file is the host: an iframe of the right size, the config it needs to
 * know its own diameter, the disc-sized element that holds the pointer, and one
 * click forwarded back to the row.
 *
 * Why a local file rather than an import of the published component: it imports
 * its markup through the ?raw resource query, which this project's bundler
 * cannot resolve (Turbopack: "Unknown module type"; Next's webpack config has
 * no such rule either - measured, see .probe/dev3000.log). The module next to
 * this one is that same text projected through JSON escaping, and nothing else.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { currentTier, onTierChange } from "../../lib/perf-tier";
import {
  HOST_RATIO,
  buildCircleSource,
  shade,
} from "./liquid-metal-circle.source.js";

/* Built once per module, not once per row: the same five orbs each hand their
 * iframe the same document, and the transformation is pure. */
let sourceCache = null;
function circleSource() {
  if (sourceCache === null) sourceCache = buildCircleSource();
  return sourceCache;
}

/* The disc's three tones.
 *
 * They are no longer one ladder multiplied down from `tone`, and that is the
 * point rather than a convenience. Rest is the light body the visitor asked
 * for; the two stepped states go to the reference's own deep ground, because
 * that is what the metal is lit against - and the metal only exists while one
 * of them is showing. Deriving them from `tone` by a multiplier would have
 * kept the relationship and lost the reason: the rest tone is free to be light
 * precisely because it is no longer the ground. PRESS is still the authored
 * step down from the deep end, unchanged. */
const DISC_DEEP = "#1a1d23";
const DISC_PRESS = shade(DISC_DEEP, 0.6);

export default function LiquidMetalCircle({
  label = "占卜玩法",
  tone = "#d9dde5",
  onActivate,
  className = "",
}) {
  const hostRef = useRef(null);
  const frameRef = useRef(null);
  const hitRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [liquid, setLiquid] = useState(false);

  const source = useMemo(() => circleSource(), []);
  const plates = useMemo(
    () => ({ plate: tone, hot: DISC_DEEP, press: DISC_PRESS }),
    [tone],
  );

  /* The disc's diameter is read back off the layout, because the menu's type is
   * in vw and the only number that agrees with a vw is the one the layout has
   * already resolved. HOST_RATIO matches the box in globals.css. */
  const sync = useCallback(() => {
    const host = hostRef.current;
    const win = frameRef.current?.contentWindow;
    if (!host || !win) return;
    const diameter = host.getBoundingClientRect().width / HOST_RATIO;
    if (!(diameter > 0)) return;
    win.postMessage(
      { liquidMetalCircle: { diameter, label: String(label).slice(0, 24), ...plates } },
      "*",
    );
  }, [label, plates]);

  /* Five of these are five WebGL contexts of five shader programs each. On the
   * tier that exists for machines with no GPU that is the wrong trade, and the
   * disc underneath is already the same size, the same tone and the same ring -
   * so a lite visitor keeps the design and loses only the metal. Decided here
   * rather than during render for two reasons: the tier is a property of the
   * machine and cannot be known while prerendering, and the exported HTML
   * should not carry 190KB of iframe markup five times over. */
  useEffect(() => {
    // The tier is a property of the machine and cannot be known while
    // prerendering, so this cannot be decided during render: the exported HTML
    // renders the disc, and the metal arrives only once we know it is wanted.
    if (currentTier() === "lite") return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    setLiquid(true);
    return onTierChange((next) => {
      if (next === "lite") setLiquid(false);
    });
  }, []);

  useEffect(() => {
    if (!liquid) return undefined;
    const host = hostRef.current;
    if (!host) return undefined;
    const observer = new ResizeObserver(() => sync());
    observer.observe(host);
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, [liquid, sync]);

  useEffect(() => {
    if (ready) sync();
  }, [ready, sync]);

  /* The row is the control; the orb's own button reports the click through the
   * published bridge, and that is what this forwards. */
  useEffect(() => {
    if (!onActivate) return undefined;
    const receive = (event) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.liquidMetalButton?.type !== "activate") return;
      onActivate();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onActivate]);

  /* The pointer never reaches the document inside. The frame is 3.6x the disc
   * so the bloom has room, and these boxes overlap their neighbours by ~71px on
   * a 46px row pitch while an <iframe> stays an opaque target in the parent's
   * hit test even where nothing inside it accepts a pointer — five of them
   * stacked left only the last orb hoverable. So the box is pointer-transparent
   * and the disc-sized element carries the pointer instead; what it hears is
   * replayed into the frame so the published listeners are what react.
   *
   * The click is forwarded rather than handled here, and propagation is stopped
   * so the row does not also act on it: the published bridge is what reports
   * the activation, and one click should open one reading. */
  useEffect(() => {
    if (!liquid) return undefined;
    const hit = hitRef.current;
    const frame = frameRef.current;
    if (!hit || !frame) return undefined;
    const post = (type, event) => {
      const win = frame.contentWindow;
      if (!win) return;
      const r = hit.getBoundingClientRect();
      win.postMessage(
        {
          liquidMetalPointer: {
            type,
            dx: (event?.clientX ?? 0) - (r.left + r.width / 2),
            dy: (event?.clientY ?? 0) - (r.top + r.height / 2),
            button: event?.button ?? 0,
            buttons: event?.buttons ?? 0,
          },
        },
        "*",
      );
    };
    const forward = (type) => (event) => post(type, event);
    const onClick = (event) => {
      post("click");
      event.stopPropagation();
    };
    const listeners = {
      pointerenter: forward("enter"),
      pointerleave: forward("leave"),
      pointermove: forward("move"),
      pointerdown: forward("down"),
      pointerup: forward("up"),
      pointercancel: forward("cancel"),
      click: onClick,
    };
    for (const [type, fn] of Object.entries(listeners)) {
      hit.addEventListener(type, fn);
    }
    return () => {
      for (const [type, fn] of Object.entries(listeners)) {
        hit.removeEventListener(type, fn);
      }
    };
  }, [liquid]);

  if (!liquid) return null;

  return (
    <div
      ref={hostRef}
      className={`liquid-metal-button${className ? ` ${className}` : ""}`}
      data-variant="circle"
      data-state={ready ? "ready" : "loading"}
    >
      <iframe
        ref={frameRef}
        className={`liquid-metal-button__frame${ready ? " is-ready" : ""}`}
        title="液态金属圆钮"
        srcDoc={source}
        sandbox="allow-scripts"
        loading="eager"
        // The row is the control; the orb answers the pointer and nothing else,
        // so it stays out of the tab order instead of adding five stops to it.
        tabIndex={-1}
        onLoad={() => setReady(true)}
      />
      {/* After the frame, so it is the topmost target in the box. Exactly the
          disc: this is the only part of the 3.6x host that answers a pointer. */}
      <span ref={hitRef} className="liquid-metal-button__hit" aria-hidden="true" />
    </div>
  );
}
