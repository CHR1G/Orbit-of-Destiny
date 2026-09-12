import * as THREE from "three";
import { textVertexShader, textFragmentShader } from "../shaders/textShaders";

/**
 * The intro heading, one glyph per quad. In the scene rather than the DOM so
 * the planes sweep over it as the ring spins — text draws first, planes draw
 * on top. Each quad is a mask its glyph wipes up through.
 *
 * `chars` are the reveal uniforms and `fades` the opacity ones; the entry
 * timeline tweens both as arrays.
 */
export function createSplitText(group, params) {
  let chars = [];
  let fades = [];
  // The silver sweep's own uniform list, exposed like chars/fades so the
  // render loop can advance it without holding a reference to each material.
  let sweeps = [];

  const dispose = () => {
    for (const child of [...group.children]) {
      group.remove(child);
      child.geometry.dispose();
      child.material.uniforms.uTex.value?.dispose();
      child.material.dispose();
    }
    chars = [];
    fades = [];
    sweeps = [];
  };

  const build = () => {
    dispose();

    const size = params.textSize;
    // Above display resolution — type is the first thing to show softness and
    // these canvases are tiny.
    const dpr = Math.min(window.devicePixelRatio, 2) * 2;
    const font = `${params.textWeight} ${size}px "${params.textFont}", ui-sans-serif, system-ui, sans-serif`;

    const measure = document.createElement("canvas").getContext("2d");
    measure.font = font;

    const glyphs = [...params.text];
    const advances = glyphs.map((ch) => measure.measureText(ch).width);
    const tracking = params.textTracking * size;
    const totalW =
      advances.reduce((a, b) => a + b, 0) + tracking * (glyphs.length - 1);

    // Padding gives overhanging glyphs room and lengthens the wipe a little.
    const pad = size * 0.25;
    const cellH = size * 1.3 + pad * 2;

    // Run width in the same units the sweep travels in. Every glyph is placed
    // on this one timeline so the band crosses the whole heading as a single
    // reflection instead of restarting per letter.
    const runW = totalW || 1;

    let x = -totalW / 2;

    glyphs.forEach((ch, i) => {
      const adv = advances[i];
      if (ch.trim()) {
        const cellW = adv + pad * 2;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(cellW * dpr));
        canvas.height = Math.max(1, Math.ceil(cellH * dpr));
        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        ctx.font = font;
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#000";
        ctx.fillText(ch, pad, pad + size); // puts cap-height centre on y = 0

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.NoColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;

        /* The glyph's own span on the run timeline. The quad is wider than the
         * advance by `pad` on each side, so the map from quad-uv to run position
         * has to account for that padding — otherwise each letter's slice of the
         * sweep is offset by a fraction of a pad and the band visibly steps at
         * every glyph boundary. */
        const cellLeft = x - pad;              // where this quad starts (scene)
        const runStart = (cellLeft + totalW / 2) / runW; // as 0..1 of the run
        const runSpan = cellW / runW;

        const mat = new THREE.ShaderMaterial({
          vertexShader: textVertexShader,
          fragmentShader: textFragmentShader,
          uniforms: {
            uTex: { value: tex },
            uReveal: { value: 0 },
            uColor: { value: new THREE.Color(params.textColor) },
            uOpacity: { value: 1 },
            uSweep: { value: -0.35 },
            uGlyphAt: { value: runStart },
            uGlyphW: { value: runSpan },
            uBand: { value: params.textSweepBand ?? 0.075 },
            uSilver: { value: 0 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        mesh.scale.set(cellW, cellH, 1);
        // Cell is the advance box plus symmetric padding, so centring on the
        // advance keeps the run correctly spaced.
        mesh.position.set(x + adv / 2, 0, 0);
        mesh.renderOrder = 0;
        group.add(mesh);
        chars.push(mat.uniforms.uReveal);
        fades.push(mat.uniforms.uOpacity);
        sweeps.push(mat.uniforms.uSweep, mat.uniforms.uSilver);
      }
      x += adv + tracking;
    });
  };

  return {
    build,
    dispose,
    get chars() {
      return chars;
    },
    get fades() {
      return fades;
    },
    /** flat list of this text's uSweep / uSilver uniform objects, pairs */
    get sweeps() {
      return sweeps;
    },
  };
}
