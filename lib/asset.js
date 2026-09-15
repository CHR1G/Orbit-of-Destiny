/* Prefix a path that points into public/ with the deploy's base path.
 *
 * Why this has to exist: GitHub Pages serves a *project* repo from a
 * sub-path — this one answers at chr1g.github.io/Orbit-of-Destiny/, not at
 * the domain root — and Next's `basePath` only rewrites the URLs Next
 * generates itself (everything under /_next/). The paths we hand to <img>,
 * <HoloCard> and `new Image()` are ours, written as "/tarot/back.webp", and
 * basePath never touches them. Measured on the first GH_PAGES build: 22 of
 * 22 /_next URLs came out prefixed, 0 of 26 public/ URLs did.
 *
 * The value is inlined at build time by next.config.mjs, which sets it only
 * when GH_PAGES=1. Locally and on the CloudStudio deploy it is the empty
 * string, so `asset("/tarot/back.webp")` is byte-for-byte the literal it
 * replaces and neither of those two targets changes at all.
 *
 * Note globals.css cannot use this — a CSS url() cannot interpolate a JS
 * constant — so the @font-face rules take the other road and reference the
 * files by relative path, which lets the bundler emit them under /_next/ and
 * inherit the prefix for free.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const asset = (path) => `${BASE_PATH}${path}`;
