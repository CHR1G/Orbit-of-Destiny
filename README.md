# Orbit of Destiny

A tarot reading rendered as a single WebGL shader.

The 22 Major Arcana ride a ring that sits mostly off-screen, so what you see is
a tall arc of cards sweeping past. Scroll, drag or swipe to turn it; it settles
with a card facing front. That card is not decoration — it seeds the reading you
are about to ask for. Five plays open on it: a daily draw plus four spreads.

_A fork of [Viscose](https://github.com/Yousuf-developer/viscose), the portfolio
carousel whose cards melt into one another as they pull apart. Same shader, same
viscosity — the work is now a deck._

[![License: MIT](https://img.shields.io/badge/License-MIT-black.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Three.js](https://img.shields.io/badge/Three.js-r185-black)

![The carousel at rest — the front card centred with its number and name to the
left, keyword and English title to the right, the five plays stacked top-right,
and the doll's face in the background layer behind it](docs/carousel.png)

The cards are not images in a grid. The whole ring is one full-screen fragment
shader drawing signed distance fields, which is what lets neighbouring cards melt
into one another as they close up and string thin threads as they pull apart. The
cursor doesn't draw anything — it softens the surface under itself, leans nearby
cards toward it and webs honey back between them.

**[Read the breakdown →](BREAKDOWN.md)** — where the idea came from, how viscosity
became a distance field, and the things that only showed up once it moved.

## Quick start

Requires **Node 20 or newer**.

```bash
git clone https://github.com/CHR1G/Orbit-of-Destiny.git
cd Orbit-of-Destiny
npm install          # ~480 MB, 1–3 minutes
npm run dev
```

Then open <http://localhost:3000>. You should see the ring turn, the doll blink,
and a load counter at the bottom of the screen.

|                 |                  |
| --------------- | ---------------- |
| `npm run dev`   | dev server       |
| `npm run build` | production build (static export to `out/`) |
| `npm start`     | serve the build  |
| `npm run lint`  | eslint           |

Built with Next.js 16 (App Router), React 19.2, Three.js r185, GSAP 3.15 and
Tailwind v4. **There is no backend** — no API routes, no database, no environment
variables, and nothing leaves the browser. `output: "export"` means `out/` can be
dropped onto any static host with no Node runtime to babysit.

> [!IMPORTANT]
> **A green `npm run build` proves nothing about the shader.** GLSL compiles at
> runtime, in the browser. A typo in `components/shaders/` builds fine and gives
> you a black page. Load the page after every shader edit.

## What you can interact with

- **Scroll or drag** to turn the ring. It has momentum and snaps to the nearest
  card.
- **Hover a card** to soften the field around it, push its neighbours aside and
  string threads between them.
- **Click the front card** to open the card detail panel — the plate on the left,
  the reading on the right, with a 正位/逆位 toggle. `开始占卜` is a deliberate
  second move, not a side effect of touching the wheel.
- **On touch**, swipe to turn and press-and-hold for the hover effects — a finger
  has no hover state, so it sits behind a deliberate gesture.
- **The doll's eyes follow your cursor** and blink on their own. She is a flat SVG
  layer behind the canvas, not part of the shader — the renderer is created with
  `alpha: true`, so the ring genuinely floats over her.

![Hovering the front card: the neighbours have backed away and dimmed, threads
stretch between them, and the View tag has appeared on the
cursor](docs/hover.png)

The threads are not drawn between the cards — they are part of the same distance
field, so they thin, sag and dissolve on their own as the gap opens. The glass lip
along the top and bottom edges is refracting the two neighbours into those swept
shapes, and that too is the same shader pass.

## The five plays

Stop on a card, tap it, and the detail panel offers one of five readings. All of
them are **derived, deterministic and offline** — there is no API and no model
behind any of it.

The curveball is that a daily draw is not random. The seed is
`date + card + topic`, so the same day plus the same card gives you the same
reading, and it stays stable if you reload. Reshuffle takes a fresh random seed.
That is what lets it feel like a reading rather than a number generator.

| Play | Cards | For |
| ---- | ----- | --- |
| 每日一牌 · Daily Draw | pick 1 of 4 | 一个问题、凭直觉翻一张 |
| 圣三角 · Past · Present · Future | 3 | 短时间内的是非题、一件事的走向 |
| 四元素 · Four Elements | 4 | 想把一件事的四个面一次看全 |
| 二择一 · Two Paths | 5 | 两个选项之间拿不定主意 |
| 凯尔特十字 · Celtic Cross | 10 | 复杂的大事，想一次问清楚 |

Before a draw you pick a topic — nine of them, in three groups: **关系** (感情 /
友情 / 家庭), **前路** (事业 / 学业 / 金钱 / 去留), **自身** (健康 / 今天) — or
write your own question. A custom question is mixed into the seed, so two
different questions don't deal the same four cards just because it is the same day.

The daily draw deals four cards out of the 22 majors and forces at least one 光
(light) and one 影 (shadow) into the hand, so a pick never feels like a foregone
conclusion. The four spreads deal from the **full 78-card deck** — 22 majors plus
56 minors — at roughly 30% reversed, and `summarize()` reports the reversed ratio,
the major count and the four-element balance alongside the per-slot readings.

![The ring mid-entry: cards have separated on the right and bottom while those on
the upper left are still fused, with the Major Arcana heading still
on screen](docs/entry.png)

The entry is the clearest look at what the smooth minimum is doing. Every card
starts merged inside the one before it and peels away in sequence, so at any moment
during the unfurl some pairs have fully separated, some are joined by a thinning
neck, and some are still one blob.

**Loading is part of the animation.** The atlas binds on the first frame and fills
in as images arrive, with the first card's art requested at high priority so it can
be shown while the rest are still downloading. The counter at the bottom of the
screen isn't a readout beside the entry — it _is_ the gate. It reads
`min(load progress, birth progress)`, and the ring launches on the frame the number
reaches 100.

![The mobile layout at 390px: the doll layer is hidden, the ring stands alone, and
the plays collapse into a bottom sheet](docs/mobile.png)

## The dev panel

In development a [lil-gui](https://lil-gui.georgealways.com/) panel appears
top-right with every tunable in the project, grouped by what they affect. Drag a
slider and the change is live.

It never ships: the panel and lil-gui itself are both behind a dynamic import
guarded by `NODE_ENV === "development"`.

**Before you tune anything**, open the **fit** folder and check that `scale` reads
`1.000`. Every pixel measurement in the project is quoted against a reference
window (a 14" MacBook Pro, 1512 points wide). On a different screen you'd be
tuning against a scale factor that isn't 1, and the result will look right for you
and wrong for everyone else. There's a **`use this window as ref`** button that
fixes this in one click.

| Folder | What's in it |
| --- | --- |
| `fit` | reference window, scale clamps, the two responsive breakpoints |
| `shape` | card size, count, ring radius, corner, art crossfade |
| `timing` / `stage` | the entry animation |
| `meta` | the number / name / keyword lockups either side of the ring |
| `pointer` / `side cards` | how the ring reacts to a cursor |
| `honey` | the threads between cards |
| `glass` | the refracting lip along the top and bottom edges |

## Making it yours

### The deck

One array, `MAJOR_ARCANA` in `components/ring/tarot.js`, is the single source of
truth for all of it — number, 中文名, English name, keyword, upright reading,
reversed reading, and the artwork path (assigned in a loop right after the array,
not restated per row). `components/ring/projects.js` derives the ring from it, so
**the ring order is the classical 0 Fool → XXI World order** and cannot drift from
the readings. Correct a meaning in one place and the ring, the card detail panel
and the reading all follow.

The 56 minors live in `components/ring/deck78.js`; spreads deal from
`FULL_DECK = [...MAJOR_ARCANA, ...MINOR_ARCANA]`.

> **Add a card and you must add the art.** The paths are generated, not listed:
> majors are `/tarot/major_NN.webp` (00–21, matching the array 1:1) and minors are
> `/tarot/minor_<suit>_NN.webp` (01 Ace → 14 King). A missing file is a silent
> hole in the atlas.

### Artwork

`public/tarot/` holds 79 webp files — 22 majors, 56 minors, 1 card back — at
3.0 MB. The atlas packs them into **320 × 573 cells**, which is a tarot card at
100 : 179, so nothing is squashed or cropped. (The fork's 3 : 2 landscape cell was
cutting two thirds off every card.)

The atlas downsamples every source to that cell, so **resizing the sources to
match would cut the directory by a large margin.** This has not been done.

> [!NOTE]
> The provenance and licence of the deck art is **not recorded anywhere in this
> repo**. The code calls it "Rider–Waite–Smith style", but that is a description of
> the layout convention, not a licence. Whoever maintains this needs to state where
> the images came from and under what terms they can be redistributed — and if they
> cannot, swap them for something that can be. See [LICENSE](LICENSE).

### Fonts

Two display faces plus two Latin ones, declared in `app/globals.css` and looked up
**by name** from `components/ring/params.js` — so if you swap one, change it in both
places. `public/fonts/README.md` has the full character-coverage tables.

| Family | Used for | Licence |
| --- | --- | --- |
| The Night Watch | Latin display, ring labels, the vortex | ships with the font pack |
| 庞门正道细线体 | CJK — 7834 glyphs, 6763 of them CJK | free for commercial use |
| Satoshi | some ring labels | ITF Free Font Licence via Fontshare |
| Geist | numbers, counters | SIL OFL 1.1 |

The stack is built on an asymmetry: The Night Watch has **zero CJK coverage**, so
putting it first means every Latin letter resolves to it while every Chinese glyph
falls straight through to 细线体. One stack, two faces, no `unicode-range`
splitting.

> The original Viscose bundled **PP Neue Montreal**, a commercial Pangram Pangram
> typeface, for local development only. It has been removed from this fork — do not
> put it back. See [AGENTS.md](AGENTS.md).

> Fonts are served as `.ttf`/`.otf` (~2.0 MB, of which 1.76 MB is the CJK face).
> `@font-face` already lists a `.woff2` before each `.ttf`, but **those woff2 files
> do not exist** — so every page load currently eats two 404s before falling back
> to the TTF. Dropping real woff2 files into `public/fonts/` is a pure win and needs
> no code change. Subsetting the CJK face would take it to 100–300 KB.

## How it's put together

```
app/
  page.js             5 lines, renders <Carousel />
  layout.js           metadata + the two SVG glass-refraction filters
  globals.css         1900 lines. Tailwind, @font-face, and every custom class
                      (.holo-img, .cardd-*, .doll-*, .play-*, .oracle-*, and all
                      the media queries)

components/
  Carousel.jsx        1956 lines, deliberately unsplit. renderer, resize/fit,
                      input, spin physics, the per-frame layout loop, the entry
                      timeline
  TarotVortex.jsx     the entry: concentric rings of text, turning at
                      different rates
  OracleFlow.jsx      the daily draw
  SpreadFlow.jsx      the four spreads
  HoloCard.jsx        a single plate — tilt, foil, reversed flip, bleed crop
  CardDetail.jsx      the panel between the ring and the reading
  DollFace.jsx        the background face (flat SVG, zero dependencies)

  ring/
    tarot.js          22 majors with both readings + topics + the draw logic
    deck78.js         78-card deck structure, suits and ranks
    spreads.js        the five plays and their slots
    projects.js       ring order, derived from the majors
    params.js         every tunable, as a factory
    atlas.js          packs the art into one 320x573-cell texture
    meta.js           the lockups either side of the ring, and their morph
    splitText.js      the "Major Arcana" heading, one glyph per quad
    tag.js            the "View" tag that rides the cursor
    sigil.jsx         the spread sigils
    gui.js            the lil-gui dev panel
  shaders/
    planeShaders.js   451 lines of GLSL — ring, goo, glass lip, tag
    textShaders.js    the heading's per-glyph reveal
```

Two ideas explain most of the rest.

**One shader, one draw call.** The ring, the threads between cards, the glass lip
along the screen edges and the cursor tag are all evaluated per pixel in
`planeShaders.js`. Card positions arrive as uniform arrays, and the fragment shader
blends their distance fields with a smooth minimum — that soft blend is the goo.
Because the tag is drawn in the same pass, its label can invert against whatever
pixels it happens to be sitting on.

**Reading logic lives in one file, and it is not a React file.** `ring/tarot.js`
and `ring/spreads.js` are plain ES modules with no JSX and no browser APIs. Every
"what does this card mean here" decision is a pure function of
`(card, topic, seed)`, which is the only reason the offline determinism claim holds.

For the deeper technical notes — coordinate conventions, the responsive model, the
shadow the doll layer casts over hit-testing, and the handful of things here that
look like bugs but aren't — see [AGENTS.md](AGENTS.md).

## Status

A finished-looking thing that is not finished. Known gaps:

- **No `prefers-reduced-motion` escape hatch for the ring.** The doll honours it
  (`DollFace.jsx` parks the eyes and skips the loop), but the six seconds of
  animated blur on entry has no way out.
- **No keyboard control.** Arrow keys should step the ring; the play column is
  `pointer-events-none` and cannot be clicked to jump.
- **Phone widths are approximate.** The tight breakpoint was tuned at the 640 end
  of its range and drifts below ~500px, where `minScale` pins the ring's size while
  `posX` keeps scaling.
- **The woff2 files are missing** (see Fonts above) — two 404s per load.
- **The deck art's licence is unrecorded** (see Artwork above).
- **`README.md` / `AGENTS.md` / `BREAKDOWN.md` were rewritten on 2026-09-12** to
  match the tarot fork; anything older than that describes the Viscose portfolio.
- **No tests.** `npm run build` and `npm run lint` are the whole safety net, and
  GLSL only compiles at runtime — a shader typo builds green.

## Contributing

Issues and pull requests are welcome.

- Run `npm run lint` before opening a PR.
- Load the page after touching anything in `components/shaders/` — GLSL is compiled
  in the browser, so a build passing proves nothing about it.
- New tunables belong in `params.js` with a matching control in `ring/gui.js`, not
  hardcoded in the layout loop.
- Please don't commit font binaries or client artwork.

## Credits

- The gooey text morph — two blurred copies fused through an SVG alpha threshold —
  is a widely circulated CodePen technique, adapted here to run one-shot per card
  change instead of on a loop.
- Simplex noise in the ring shader is
  [webgl-noise](https://github.com/ashima/webgl-noise) by Ian McEwan (Ashima Arts)
  and Stefan Gustavson, MIT.
- Arrow icon from [SVG Repo](https://www.svgrepo.com/).

## License

[MIT](LICENSE) for the source code. **Not** for anything in `public/` — the
typefaces and the deck art carry their own terms, and the deck art's terms are
currently unrecorded. Read the tail of [LICENSE](LICENSE) before reusing anything
there.
