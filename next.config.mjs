/** @type {import('next').NextConfig} */
const nextConfig = {
  /* Next 16 blocks dev-only resources (the HMR socket, every /_next/static
   * chunk) whenever the page is opened from a host it does not consider its
   * own origin. This project is previewed from http://127.0.0.1:3000, which
   * Next treats as cross-origin against its "localhost" identity — so all the
   * JavaScript is answered with 403, the page hydrates nothing and renders
   * blank. Listing the loopback hosts here is the documented opt-in and only
   * affects `next dev`; production builds are untouched. */
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.196"],

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
