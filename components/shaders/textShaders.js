export const textVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// One glyph per quad. The quad is the mask; the glyph slides up through it.
//
// At uReveal 0 the sample sits a full cell below the mask and every fragment
// is discarded, so the character is genuinely absent rather than transparent.
// At 1 it lines up exactly with the quad.
//
// The silver sweep rides on top of uColor: a narrow, hard-edged band of light
// travels across the run, and inside the band the fill switches from uColor to
// a four-stop metal ramp. Three details are what make it read as a reflection
// passing over metal rather than as a lighter stripe painted on:
//
//   uSweep is measured in the RUN's own coordinates, not per glyph. Each quad
//   carries its own 0..1 uv, so a sweep driven by vUv.x alone would restart on
//   every letter and the whole run would flash in unison. uGlyphAt (the glyph's
//   left edge as a fraction of the run's width) and uGlyphW (its width in the
//   same units) put every quad into one shared timeline.
//
//   The band is narrow and its edges are steep. A wide, soft band reads as a
//   wash; real metal has one hard leading edge.
//
//   The ramp is light/dark/light/dark across the band, not a single white fade.
//   Alternating is what reads as polished — the same reasoning as the sigils'
//   METAL gradient.
//
// mix() rather than an additive blend, so the metal REPLACES the ink inside the
// band instead of washing it out. A sweep that only brightens would look like
// glare on a screen; this looks like the letter's own material changing.
export const textFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uReveal;
  uniform vec3  uColor;
  uniform float uOpacity;

  uniform float uSweep;    // -0.35 .. 1.35, the band's centre along the run
  uniform float uGlyphAt;  // this glyph's left edge, 0..1 across the run
  uniform float uGlyphW;   // this glyph's width, in run-widths
  uniform float uBand;     // band half-width, in run-widths
  uniform float uSilver;   // 0 = plain ink, 1 = full metal

  void main() {
    float gy = vUv.y + 1.0 - uReveal;
    if (gy > 1.0 || gy < 0.0) discard;

    float a = texture2D(uTex, vec2(vUv.x, gy)).a;
    if (a <= 0.001) discard;

    vec3 col = uColor;

    if (uSilver > 0.0) {
      // Put this fragment on the run's timeline.
      float run = uGlyphAt + vUv.x * uGlyphW;

      // Signed distance from the band's centre, normalised to the band's
      // half-width. 0 = centre of the sweep, +-1 = its edges.
      float d = (run - uSweep) / max(uBand, 1e-4);

      // Steep shoulders: the band is essentially solid inside |d|<0.55 and
      // gone by |d|=1. A smoothstep here would soften the leading edge into
      // the wash this is supposed to avoid.
      float inBand = 1.0 - smoothstep(0.55, 1.0, abs(d));

      if (inBand > 0.001) {
        // Metal ramp across the band: cool grey -> white core -> warm grey,
        // with a second dark step so the highlight has structure. Sampled by
        // d so the pattern travels with the band rather than sitting still.
        float t = clamp(d * 0.5 + 0.5, 0.0, 1.0);
        vec3 metal;
        metal = mix(vec3(0.72, 0.76, 0.83), vec3(1.0),  smoothstep(0.0, 0.45, t));
        metal = mix(metal, vec3(0.83, 0.86, 0.91), smoothstep(0.45, 0.62, t));
        metal = mix(metal, vec3(1.0),               smoothstep(0.62, 0.80, t));
        metal = mix(metal, vec3(0.78, 0.80, 0.86), smoothstep(0.80, 1.0, t));

        // A thin dark line at the very edge of the band, so the reflection
        // has a boundary instead of fading — this is the "hard edge" of metal.
        float rim = 1.0 - smoothstep(0.0, 0.16, abs(abs(d) - 0.86));
        metal = mix(metal, vec3(0.52, 0.55, 0.62), rim * 0.55);

        col = mix(col, metal, inBand * uSilver);
      }
    }

    gl_FragColor = vec4(col, a * uOpacity);
  }
`;
