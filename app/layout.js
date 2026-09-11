import "./globals.css";

/* Edge-refraction for the liquid-glass surfaces.
 *
 * `backdrop-filter` can blur and tint what sits behind an element, but it
 * cannot *displace* pixels — so the lens effect at the rim of a real glass
 * slab (where the background gets pulled and stretched) is out of reach for
 * plain CSS. The only way to move backdrop pixels is an SVG filter referenced
 * from backdrop-filter: `feDisplacementMap` shifts SourceGraphic, and in a
 * backdrop-filter context SourceGraphic *is* the backdrop image.
 *
 * The displacement map is a two-channel gradient: R encodes horizontal shift,
 * G encodes vertical shift, and screen-blending them keeps the channels
 * independent. Both channels hold flat 0.5 (no shift) across the middle 60%
 * and ramp hard only in the outer 20% — that is what makes the distortion
 * happen at the rim while the middle of the glass stays optically clean,
 * which is the whole signature of the effect.
 *
 * Browsers that ignore a url() filter in backdrop-filter simply fall back to
 * the plain blur declared in globals.css. */
const DISP_MAP =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cdefs%3E%3ClinearGradient id='h' x1='0' y1='0' x2='1' y2='0'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='.2' stop-color='%23800000'/%3E%3Cstop offset='.8' stop-color='%23800000'/%3E%3Cstop offset='1' stop-color='%23ff0000'/%3E%3C/linearGradient%3E%3ClinearGradient id='v' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='.2' stop-color='%23008000'/%3E%3Cstop offset='.8' stop-color='%23008000'/%3E%3Cstop offset='1' stop-color='%2300ff00'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='256' height='256' fill='url(%23h)'/%3E%3Crect width='256' height='256' fill='url(%23v)' style='mix-blend-mode:screen'/%3E%3C/svg%3E";

export const metadata = {
  title: "Orbit of Destiny",
  description:
    "22 张大阿卡纳沿环旋行，五种占卜玩法；一张牌，看清眼下的路。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Both display faces (The Night Watch for Latin, 庞门正道细线体 for
          CJK) are self-hosted in public/fonts and declared in globals.css —
          no external font request, so nothing is needed here. */}
      <body className="min-h-full flex flex-col">
        <svg
          aria-hidden="true"
          focusable="false"
          width="0"
          height="0"
          style={{ position: "absolute", pointerEvents: "none" }}
        >
          <defs>
            {/* Buttons: small surface, so the rim distortion has to stay
                subtle or the label starts to swim. */}
            <filter
              id="glass-refract"
              x="-8%"
              y="-8%"
              width="116%"
              height="116%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={DISP_MAP}
                result="map"
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="9"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
            {/* Panels: much larger, so the same proportional rim needs a
                bigger absolute displacement to read at all. */}
            <filter
              id="glass-refract-panel"
              x="-6%"
              y="-6%"
              width="112%"
              height="112%"
              colorInterpolationFilters="sRGB"
            >
              <feImage
                href={DISP_MAP}
                result="map"
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="map"
                scale="26"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
        {children}
      </body>
    </html>
  );
}
