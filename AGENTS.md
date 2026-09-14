# AGENTS.md

Working notes for this repo. Read this before changing anything under
`components/` — most of the code is one WebGL machine plus one offline reading
engine, and a lot of it is non-obvious in ways that look like bugs.

## What this is

A tarot reading. 22 Major Arcana sit on a ring that is mostly off-screen to the
left; you see an arc of it. Scroll, drag or swipe turns the ring, and it snaps so
a card faces front. The cards are not DOM elements or textured quads — the whole
ring is **one full-screen fragment shader** drawing signed distance fields, which
is what lets neighbouring cards melt into each other ("goo") and string honey-like
threads as they separate.

Everything visible is either that one shader pass, a handful of absolutely
positioned DOM labels over it, or two HTML layers: the doll's face *behind* the
canvas and the reading overlays *in front* of it.

The front card is not decoration — it seeds the reading. Click it, read the plate,
then start one of five plays (a daily draw plus four spreads).

## Commands

```bash
npm run dev      # localhost:3000
npm run build    # static export to out/, also the fastest correctness check
npm run lint     # eslint
```

There are **no tests**. `npm run build` plus `npm run lint` is the whole safety
net. GLSL is compiled at runtime, not at build time, so a shader typo builds fine
and fails in the browser console — always load the page after a shader edit.

> On a machine with a bulk-delete guard, `next build` can die while clearing
> `.next` with an error that looks like a build failure but isn't. Prefix an empty
> `NODE_OPTIONS` to get past it: `NODE_OPTIONS=" " npx next build`. The same guard
> blocks a bare `rm -rf out/` (it counts deletions, and there are ~140 in there).

## Layout

```
app/
  page.js              renders <Carousel />, nothing else
  layout.js            root layout, metadata, the two SVG glass-refraction filters
  globals.css          Tailwind v4 import, @font-face, page background,
                       every custom class (.holo-*, .cardd-*, .doll-*,
                       .play-*, .oracle-*, all media queries)

components/
  Carousel.jsx        the component. renderer, resize/fit, input, spin physics,
                      the per-frame layout loop, the entry timeline
  TarotVortex.jsx     the entry: concentric rings of text
  OracleFlow.jsx      the daily draw (topic -> 4 cards -> pick -> reveal)
  SpreadFlow.jsx      the four spreads
  HoloCard.jsx        one plate: tilt, foil, reversed flip, bleed crop
  CardDetail.jsx      the panel between the ring and the reading
  DollFace.jsx        the background face, flat SVG, zero dependencies

  ring/
    tarot.js          22 majors with readings, topics, and the draw logic
    deck78.js         78-card structure: suits, ranks, 56 minors
    spreads.js        the five plays, their slots and the summary maths
    projects.js       ring order, derived from MAJOR_ARCANA
    params.js         every tunable, as a factory
    meta.js           the lockups either side of the ring, and their morph
    atlas.js          packs all art into one texture, incrementally
    splitText.js      the "Major Arcana" heading, one glyph per quad
    tag.js            the "View" tag that rides the cursor
    sigil.jsx         the spread sigils
    utils.js          TAU/DEG, easings, signedOffset, chase
    gui.js            lil-gui dev panel, dynamically imported
  shaders/
    planeShaders.js    the ring: SDFs, goo, glass lip, tag. ~450 lines of GLSL
    textShaders.js     the per-glyph reveal for the intro heading
```

`Carousel.jsx` is ~1950 lines and deliberately so. The fit logic, pointer
handling, layout loop and timeline share about twenty closure variables. They have
been left together because threading a context object through them reads as tidier
in a file tree and is harder to follow in an editor.

`ring/tarot.js` and `ring/spreads.js` are the opposite: **plain ES modules with no
JSX and no browser APIs.** They import cleanly under plain Node ESM, which is how
a deck-integrity check can load them. Keep it that way — every reading decision
must stay a pure function of `(card, topic, seed)` or the offline determinism
claim stops being true.

## The three coordinate ideas

Get these wrong and nothing else makes sense.

**World px.** Origin at screen centre, **Y up**. This is the space the shader
evaluates in, so pointer coordinates are converted into it once, on the way in, and
never again. Page Y is down, hence sign flips whenever the two meet.

**Ring slot vs plane index.** Planes are numbered in _fan order_ — the seed first,
then alternating either side of it, so index 0,1,2,3,4 sits at slot 0,+1,−1,+2,−2.
`signedOffset(i)` converts. **Consecutive indices are on opposite sides of the
ring.** Anything derived from index rather than slot will be subtly wrong; art used
to be dealt by index and made the meta column step two names per slot.

**`g`, the stage scale.** Every plane-pixel measurement is multiplied by `g`, so the
ring resizes as one piece and the goo keeps its proportions. `g` folds in both the
entry's `endScale` and the window fit. If you add a measurement in px, decide
whether it goes through `g` — most do.

## Responsive model

Params are authored against a **reference window** (`refWidth: 1512`, a 14" MacBook
Pro at default scaling, `refHeight: 870`) and scaled by `fit = viewW / refWidth`,
clamped to `[minScale, maxScale]` — 0.5 and 1.75. Width alone drives it by default
(`fitHeight: 0` switches to whichever axis is tighter).

On top of that are two **bands**, computed in `refit()` and applied as multipliers,
not replacements. **They stack:**

| | `narrowAt` ≤ 1024 | `tightAt` ≤ 480 |
| --- | --- | --- |
| plane | ×1.25 | — |
| radius | ×1.3 | ×1.15 (multiplies `narrowRadius`) |
| text | ×1.5 | name ×1.5 again |
| endScale | 4.22 | — |
| layout | all four labels | name only, bottom-right |

Two rules when touching this:

- **`refit()` runs on resize only.** The layout loop reads `fit`/`planeK`/`radiusK`/
  `textK` thousands of times a second and must not be recomputing them.
- **Band _flags_ are stored, not resolved values,** so anything picked off them
  still responds to the dev panel between resizes.

`tightAt` is **480, not 640**, and `tightRadius` is **1.15, not the 0.82** it once
was. Both were re-derived when the ring went to 22 cards: each slot is now half the
angle it used to be, so the radius that kept twelve plates apart leaves the
neighbours ~7px of daylight and the goo welds them into one band. The comments in
`params.js` carry the arithmetic — read them before "simplifying" a number back.

**The stage offset is in ring radii, not window widths.** `stageX: 1.0` means
exactly one radius to the left, which puts the front card dead centre at every
size. A window-relative offset reads the same at the reference width and then walks
the front card off the right edge on anything smaller, because below `minScale` the
fit stops shrinking while the offset does not.

> **The doll's hide-breakpoint does not match the ring's.** `.doll` is hidden by
> `@media (max-width: 639px)` in `globals.css`, while the ring's `tight` band starts
> at 480. Between 480 and 640 the doll is gone but the ring is still on its `narrow`
> proportions. That window is deliberate-ish but unverified — if you change one
> breakpoint, look at the other.

If you tune on a machine that isn't 1512 wide, set `refWidth` to your window first —
the **fit** folder has a button that reads it off the live one. Otherwise you are
tuning against a scale factor that isn't 1 and everything will be wrong everywhere
else.

## The reading engine

Everything here is **derived, deterministic and offline**. There is no API, no
model, and no network call anywhere in the reading path.

**The seed is `date + card + topic`.** Same day, same card, same topic gives the
same reading, and it survives a reload. Reshuffle swaps in a random seed. This is
the whole trick — it is what makes it feel like a reading rather than a random
number generator. If you add a source of variety, add it *to the seed*, and the
determinism survives.

**A custom question goes into the seed.** Two different questions must not deal the
same four cards just because it is the same day, so `topic.custom` mixes
`topic.hook` into the seed string.

**The daily draw is forced off the fence.** Four cards out of the 22 majors, but if
the hand has no 光 (light) card one is swapped in, and same for 影 (shadow). A pick
has to be able to go either way or the reading is a foregone conclusion.

**The spreads deal from all 78.** `FULL_DECK = [...MAJOR_ARCANA, ...MINOR_ARCANA]`,
N distinct cards at ~30% reversed. `summarize()` reads the reversed ratio, the major
count and the 火/水/风/土 balance — the minor suits map to the four elements, and
majors count as none of them.

**Readings are rendered through `frame` templates.** Each spread slot carries a
`frame` string like `"起因是{zh}{rev}——{body}"` and the reveal fills it. Don't
hand-concatenate reading copy in JSX; add it to the slot.

## Non-obvious things that will bite you

**`uScale` is a packed vec4.** `xy` is the birth scale, `z` is brightness (for the
side-card dim), `w` is which atlas cell the plane wears. They ride together because
GLSL ES allocates a full vec4 row per uniform-array element whatever you declare, so
`.zw` were already being paid for. Adding a separate `float[32]` would cost 32 more
rows against a guaranteed budget of 224.

**The atlas cell is 320 × 573, and the ratio is load-bearing.** That is a tarot card
at 100 : 179, matching `planeAspect` and `.holo-img`. The fork's 3 : 2 landscape cell
was cropping two thirds off every card. Change `CELL_W`/`CELL_H` and you must change
`planeAspect` with it or the art gets squashed.

**Art is resolved by convention, not by a list.** Majors are
`/tarot/major_NN.webp` (00–21, index-matched to `MAJOR_ARCANA`), minors are
`/tarot/minor_<suit>_NN.webp`, back is `/tarot/back.webp`. The paths are generated
in `tarot.js` and `deck78.js`, so **a missing file is a silent hole in the atlas** —
nothing validates that 79 files exist. If you renumber the majors, every path after
the edit moves.

**The load counter is the gate.** The entry launches on the frame the number reads
100, and nothing else opens that gate. The counter reads `min(load progress, birth
progress)` so it cannot finish early and leave a number sitting on 100 waiting for a
condition nobody told the viewer about.

**`holdAfter` wants to stay near zero.** It is a beat held *after* the counter hits
100. Raise it and the number visibly parks on 100 while the page looks frozen.

**The meta morph needs three rows per side, not two.** Two stacked copies melt into
each other through an alpha threshold. The threshold must span both layers for them
to fuse, so anything inside it gets thresholded whether it is moving or not — a word
carried over unchanged (the same keyword twice running) would visibly thicken for
the length of the morph. Hence a third row outside the filtered subtree. All three
rows always carry all the words, painted or not, because the row is what positions
the others.

**`max-width: none` on `.holo-img` is load-bearing.** Tailwind v4's preflight caps
`img` at `max-width: 100%`, which silently eats the horizontal half of the
`calc(100% + 1px)` bleed the reversed-plate crop depends on. Remove it and inverted
cards get a clipped edge.

**The doll is *behind* the canvas, and that ordering is the point.** `<DollFace />`
is mounted before the canvas at the bottom of the render tree; it is `position:
fixed`, `z-index: 0`, `pointer-events: none`, and the renderer is created with
`alpha: true`. So the canvas is genuinely transparent and the ring floats over her —
no compositing trick. Move the doll above the canvas and it covers the ring; give it
pointer events and it eats every drag.

**The side-card focus is one frame stale, deliberately.** The hit test that decides
which card is hovered runs *inside* the layout loop, but every plane needs an answer
before the loop reaches that card. `focusPos` is latched at the end of a frame for
the next one. It is eased over ~10 frames, so the lag is not perceptible.

**The snap can only decelerate.** It is a run-in for a throw that is nearly spent.
Click-to-centre (`pick`) therefore cannot reuse it — a pick starts from a standstill
and has to accelerate, so it tweens `state.spin` directly with the momentum suspended
(`picking`).

**Touch is not a mouse with one finger.** `pointer.inside` (is the position worth
reading — what the hit test needs) is separate from `engaged()` (should the softening
be on). On touch the latter requires a deliberate press-and-hold, because a finger
has no hover state. Also: **Safari reports `movementX` as 0 for touch**, so drag
distance is measured from `clientX`/`clientY`; using `movementX` makes every swipe
look stationary and end in a tap.

**`touch-action: none`** on the canvas is load-bearing. Without it the browser claims
the gesture and the `pointermove` stream dies mid-drag.

**The WebGL context must be released explicitly.** `renderer.dispose()` frees GL
resources but leaves the context alive until the canvas is collected, which is not
deterministic. The effect re-runs on every StrictMode double mount and every hot
update, so contexts pile up; past the browser's limit (~16 in Chrome)
`new THREE.WebGLRenderer()` throws before the canvas is ever appended and the page is
blank with no canvas in the DOM at all. Cleanup calls `forceContextLoss()` for this
reason — **do not remove it.** Symptom if it regresses: blank after a long dev
session, fine after a hard reload.

**The glass rim is an SVG filter, not CSS.** `backdrop-filter` can blur and tint, but
it cannot *displace* pixels — it has no way to move the backdrop. The rim of a real
glass slab pulls and stretches what is behind it, and the only way to move backdrop
pixels is `feDisplacementMap` referenced from `backdrop-filter`, where
`SourceGraphic` *is* the backdrop. Both filters live in `layout.js`; browsers that
ignore a `url()` filter there fall back to the plain blur declared in `globals.css`.

**The accent palette comes off the card, not the page.** `Carousel.jsx` sets
`document.body[data-tone]` to the front card's `tone` (light / shadow / neutral) and
`globals.css` keys the reading surface off it. There is exactly one source for that
value — the card in front.

## Conventions

- **All tuning lives in `params.js`.** If you are about to hardcode a number in the
  layout loop, it probably wants to be a param with a dev-panel control.
- **Add a control when you add a param.** `ring/gui.js`, in the matching folder.
  Wire the right `onChange`: `refit` for anything the bands depend on, `styleMeta`
  for anything the DOM labels are sized from, `replay` for anything baked into the
  entry timeline at build time.
- **Comments explain why, not what.** The code says what it does. Keep them short;
  the long doc blocks are on `meta.js` and `params.js` because those techniques
  genuinely do not read off the code.
- Prettier defaults, no config file.
- The dev panel is `process.env.NODE_ENV === "development"` only and both it and
  lil-gui are dynamically imported, so neither reaches production.
- Reading copy changes belong in `tarot.js` / `deck78.js` / `spreads.js`, never in
  a component. The card detail panel and the reveal both read off the same record;
  that is the only reason they cannot disagree.

## Known gaps

Listed roughly by how much they matter, so an agent picking up work knows what is
missing versus what is deliberate.

1. **The `.woff2` faces are subsets, and they go stale when the copy changes.**
   `public/fonts/*.woff2` are generated by `tools/subset_fonts.py` from the
   characters that `app/` and `components/` can actually render — the CJK face
   keeps 1,209 of its 7,834 glyphs (98 KB, down from 1.76 MB). Introduce a
   character outside that set and it is drawn by the next family down the stack
   with **no error anywhere**: one word in the wrong typeface, which reads as a
   font bug rather than a stale subset. Re-run `python tools/subset_fonts.py`
   after touching Chinese copy. See `public/fonts/README.md`.
2. **The deck art's provenance and licence are unrecorded.** Code comments call it
   "Rider–Waite–Smith style", which describes the layout convention, not a licence.
   Nothing in the repo states where the 79 files came from or whether they can be
   redistributed. `LICENSE` still carries the fork-era Behance notice, which no
   longer describes anything on disk.
3. **No `prefers-reduced-motion` path for the ring.** `DollFace.jsx` honours it —
   it parks the eyes and returns before starting the rAF loop. The entry (six
   seconds of animated blur) does not.
4. **No keyboard control.** Arrow keys should step the ring; the play column is
   `pointer-events-none` and cannot be clicked to jump.
5. **Phone widths are approximate.** The `tight` band was tuned at the 480 end of
   its range; below ~500px `minScale` pins the ring's size while the stage offset
   keeps scaling, so the front card drifts.
6. **The `textFont` dropdown in `gui.js` does not list the font it defaults to.**
   The control offers `["Satoshi", "Geist"]` while `params.textFont` is
   `TheNightWatch`. Picking either option is a live downgrade, not a preference.
7. **The art is 3.0 MB across 79 files** and the atlas downsamples all of it to
   320px cells, so resizing the sources to match would cut it by a large margin.
   Not done.

## This is a public repo

Two things to respect when adding files.

**Do not add assets you cannot redistribute.** The original Viscose bundled PP Neue
Montreal, a commercial Pangram Pangram face, for local development only. It has been
removed from this fork — do not put it back. Satoshi (ITF Free Font Licence) and
Geist (OFL) are free, and 庞门正道细线体 is free for commercial use. The deck art in
`public/tarot/` is the open question — see gap 2 above.

**Keep third-party attribution intact.** The simplex noise in `planeShaders.js`
carries an MIT notice that has to travel with the code. If you pull in more shader
snippets, credit them the same way and add a line to the LICENSE and the README's
Credits section.

Source is MIT. The contents of `public/` are explicitly _not_ covered — see
`LICENSE`.

Font families are looked up **by name**: the strings in `params.js`
(`nameFont`, `idxFont`, `textFont`) have to match a `@font-face` family in
`app/globals.css`. A name with no matching block falls back to system sans silently,
which looks like a rendering bug rather than a missing file. Note the stack's trick —
The Night Watch has **zero CJK glyphs**, so it sits first and Chinese falls through
to 细线体. Reordering that stack breaks Chinese text everywhere.

## Sync-drive hygiene

This working copy lives on a Baidu Syncdisk folder, which **restores files deleted on
another PC**. Two consequences:

- `public/*.webp`, `public/tarot-old/`, `public/_unused/`, `public/_originals/`,
  `_oracle-export/` and `deck-preview.html` are in `.gitignore` so a restore cannot
  sneak them back into a commit.
- **`.gitignore` does not stop `next build` from copying `public/` into `out/`.**
  Superseded art under `public/` used to ship to production — `public/tarot-old/`
  (1.8 MB) and `public/_unused/` (1.3 MB) were in `out/` until they were moved out.
  If they reappear on disk, they have to be moved out again, not just ignored.

Superpowered one-off experiments belong outside `public/`, or they will end up in
the deployed bundle.
