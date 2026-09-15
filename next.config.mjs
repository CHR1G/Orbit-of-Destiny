/* GitHub Pages answers this repo at a sub-path; the dev server and the
 * CloudStudio deploy answer at the domain root. One switch decides which, and
 * the resulting prefix is shared by two consumers: the `basePath` below (which
 * rewrites Next's own /_next URLs) and the NEXT_PUBLIC env var that
 * lib/asset.js reads (which prefixes the public/ paths we hard-code, since
 * basePath does not reach those). */
const ON_PAGES = process.env.GH_PAGES === "1";
const BASE_PATH = ON_PAGES ? "/Orbit-of-Destiny" : "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Next 16 blocks dev-only resources (the HMR socket, every /_next/static
   * chunk) whenever the page is opened from a host it does not consider its
   * own origin. This project is previewed from http://127.0.0.1:3000, which
   * Next treats as cross-origin against its "localhost" identity — so all the
   * JavaScript is answered with 403, the page hydrates nothing and renders
   * blank. Listing the loopback hosts here is the documented opt-in and only
   * affects `next dev`; production builds are untouched. */
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.196", "192.168.124.15"],

  /* GitHub Pages serves a *project* repo from a sub-path — this one answers at
   * chr1g.github.io/Orbit-of-Destiny/, not at the domain root — so every URL
   * Next emits for /_next/... only resolves if the repo name is baked in as a
   * prefix. Without it the HTML loads and then every chunk 404s, which looks
   * exactly like a blank page.
   *
   * Opt-in via GH_PAGES because the other two places this app runs (the local
   * dev server, the CloudStudio deploy) both sit at the domain root, where a
   * bare basePath would 404 every chunk instead. Only the Pages workflow sets
   * GH_PAGES=1, so nothing else is affected.
   *
   * Note this does NOT rewrite the absolute /tarot, /doll and /fonts URLs that
   * the components and globals.css hard-code — basePath never touches public/
   * references. Those go through lib/asset.js instead. */
  ...(ON_PAGES ? { basePath: BASE_PATH } : {}),

  /* The other half of that story: hand the prefix to the client bundle so
   * lib/asset.js can apply it to the public/ paths we wrote by hand. */
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH },

  /* The whole experience is client-side: one page, one WebGL canvas, no API
   * routes and no server rendering. Exporting to plain HTML therefore loses
   * nothing, and it is what lets `out/` be dropped onto any static host
   * (Pages, COS+CDN, a bare nginx) with no Node runtime to babysit. */
  output: "export",

  /* next/image's optimizer needs a server; there is none behind a static
   * export, so images are served exactly as they sit in public/. */
  images: { unoptimized: true },
};

export default nextConfig;
