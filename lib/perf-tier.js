/* Runtime quality tier.
 *
 * The page is GPU-shaped: a WebGL ring, backdrop-filter glass with an SVG
 * displacement in it, a masked seven-plate figure, five conic sweeps. On a
 * machine with a working GPU all of that is cheap. On a machine without one —
 * hardware acceleration switched off, a blocklisted driver, a remote desktop
 * session, an old integrated chip — the same work is handed to the CPU and the
 * fan comes on.
 *
 * That is why the complaint is machine-shaped rather than page-shaped, and it
 * is not something a stylesheet can fix on its own: the stylesheet cannot know
 * which machine it landed on. So the page measures, and drops a class.
 *
 * Three signals, cheapest first:
 *
 *   1. An explicit `?lite=1` / `?lite=0` in the URL. Always wins. This exists
 *      so the tier can be tested without pretending to be a slow machine, and
 *      so a visitor who is being burned can force the fix.
 *   2. A static capability guess — core count, device memory, whether WebGL
 *      exists at all. Free, available before the first frame, and enough to
 *      catch the genuinely small machines.
 *   3. What the renderer itself reports. `WEBGL_debug_renderer_info` names the
 *      rasteriser, and a software one is the single most reliable predictor of
 *      this exact complaint. Read off the ring's own context, so no second
 *      context is ever created — Chrome caps those at ~16 and the ring already
 *      documents what happens when it runs out.
 *
 * Plus a frame-time watchdog as the backstop, because a machine can be slow
 * without matching any of the above: if the first ~90 frames after the entry
 * animation cannot hold a 45fps median, the tier drops regardless of what the
 * hardware claims to be.
 *
 * Downgrade only, never up. A tier that flips back and forth would be worse
 * than either state — the layout would visibly change under the visitor — and
 * a machine that tripped the watchdog once is not going to be fast later.
 */

const LITE_CLASS = "perf-lite";

/* Software rasterisers, by the names they actually report. SwiftShader is what
 * Chrome falls back to when hardware acceleration is off; llvmpipe is Mesa's
 * equivalent; the Basic Render Driver is the Windows one. */
const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|microsoft basic/i;

let tier = null;
const listeners = new Set();

function override() {
  if (typeof window === "undefined") return null;
  try {
    const v = new URLSearchParams(window.location.search).get("lite");
    if (v === "1") return "lite";
    if (v === "0") return "full";
  } catch {
    /* A malformed query string is not a reason to fail to render. */
  }
  return null;
}

function staticGuess() {
  if (typeof navigator === "undefined") return { tier: "full", reason: "no navigator" };

  // No WebGL at all: the ring cannot draw, and everything it would have done
  // on the GPU is not going to happen anywhere cheap.
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return { tier: "lite", reason: "no WebGL" };
  } catch {
    return { tier: "lite", reason: "WebGL threw" };
  }

  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= 4) {
    return { tier: "lite", reason: cores + " logical cores" };
  }
  const mem = navigator.deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem <= 4) {
    return { tier: "lite", reason: mem + "GB device memory" };
  }
  return { tier: "full", reason: "no static signal" };
}

function apply(next, reason) {
  tier = next;
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle(LITE_CLASS, next === "lite");
  }
  if (typeof window !== "undefined") {
    // Readable from a probe, and from the console when someone is debugging a
    // machine that will not be handed over.
    window.__perfTier = { tier: next, reason };
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(`[perf] tier=${next} (${reason})`);
  }
  for (const fn of listeners) fn(next, reason);
}

export function currentTier() {
  if (tier) return tier;
  const forced = override();
  if (forced) {
    apply(forced, "url override");
    return tier;
  }
  const guess = staticGuess();
  apply(guess.tier, guess.reason);
  return tier;
}

export function onTierChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/* Called by the ring once its context exists, so the renderer's own identity
 * can be used without a second context. */
export function reportRenderer(gl) {
  if (tier === "lite") return;
  let name = "";
  try {
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    name = String(
      ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "",
    );
  } catch {
    return;
  }
  if (name && SOFTWARE.test(name)) apply("lite", "software rasteriser: " + name);
  else if (name) window.__perfTier = { tier: "full", reason: "GPU: " + name };
}

/* The backstop. Sampled once, shortly after the entry animation, and only ever
 * to downgrade.
 *
 * The budget is 22ms rather than 16.7ms: the median frame has to be worse than
 * 45fps before this fires, which leaves normal jitter, a garbage collection, or
 * a background tab's first frame alone. Being wrong in the "stayed full"
 * direction costs a visitor nothing they were not already experiencing; being
 * wrong in the other direction silently degrades the design for everyone. */
export function watchFrameTime({ budgetMs = 22, frames = 90, delayMs = 1400 } = {}) {
  if (typeof window === "undefined") return;
  if (tier === "lite") return;

  const start = () => {
    const samples = [];
    let prev = 0;
    let warmup = 20; // textures, fonts and first-paint compositing are not frame cost

    const step = (now) => {
      if (prev) {
        if (warmup > 0) warmup -= 1;
        else samples.push(now - prev);
      }
      prev = now;
      if (samples.length < frames) {
        requestAnimationFrame(step);
        return;
      }
      const sorted = samples.slice().sort((a, b) => a - b);
      const median = sorted[sorted.length >> 1];
      if (median > budgetMs) {
        apply("lite", `median frame ${median.toFixed(1)}ms over ${frames} frames`);
      } else {
        window.__perfTier = {
          tier: "full",
          reason: `median frame ${median.toFixed(1)}ms`,
        };
      }
    };
    requestAnimationFrame(step);
  };

  window.setTimeout(start, delayMs);
}
