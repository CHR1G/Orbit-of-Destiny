# Breakdown

Where this came from and how it got built.

## The idea

I wanted to make something that didn't look like every other site. Not a better
grid. Something you couldn't place straight away.

I started with the word morphing. One thing turning into another. Most morphing on
the web is really just a crossfade in disguise though, and I didn't want a
transition. I wanted a material.

Morphing got me thinking about honey, and honey got me onto viscosity. That's where
it clicked, because viscosity does something you can actually picture.

Pull two blobs of honey apart and they don't just separate. They cling. A bridge
forms, narrows in the middle, sags under its own weight, stretches thinner and
thinner, then snaps. Right before it goes, the two blobs are still technically one
object.

That's the whole thing. Everything else here exists to make that happen as often as
possible.

The goo arrived attached to a portfolio carousel — a ring of project cards. The ring
outlived the portfolio. What is on it now is a tarot deck.

## Why a ring

If the effect is about things coming apart, they have to start together.

So nothing fades in. One card is born in the middle of the screen and every other
card is already inside it. They peel off one at a time, alternating left and right,
each one dragging a thread behind it until the ring closes.

![The ring mid-entry: cards on the right and bottom have separated while those on
the upper left are still fused, and the Major Arcana heading is still
on screen](docs/entry.png)

This frame is basically the whole pitch. Some of the ring has finished separating,
some is mid-pull, one pair is joined by a thick neck, another by a thin one, and two
are still fused into a single blob. Same moment, every stage of the separation
happening at once.

After that the ring slides off to the left and scales up, so what you're left with
is an arc of a much bigger wheel. You never see all of it. That was on purpose. A
whole circle looks like a diagram. A piece of one looks like something big going
past.

## Making it real

You can't do this with elements. Two `<img>` tags will never merge, and no amount of
`filter: blur()` makes them behave like a fluid once you look closely.

So there are no cards. There's one full-screen rectangle running one fragment
shader, and every pixel asks the same question: how far am I from the nearest card?

That's a signed distance field. Once every shape is a distance function instead of
an object, merging turns into arithmetic. Take the minimum of two distances and you
get their union with a hard edge. Take a _smooth_ minimum and the join swells into a
fillet, and two shapes near each other fuse into one continuous surface.

```glsl
float smin(float a, float b, float k) { ... }
```

One number, `k`, sets how gooey the whole world is. That's the honey.

## Modelling the thread

Smooth minimum gets you merging. It doesn't get you the snap. Two cards drifting
apart under `smin` alone just quietly stop touching.

So the thread is its own shape, a swept box between each pair of neighbours, with
four properties tracking how far apart they've got. Call that distance `v`, where 0
means the faces are touching and 1 means fully separated:

| | as `v` goes 0 to 1 |
| --- | --- |
| width | falls off on a curve, so it thins fast then lingers |
| pinch | the middle narrows faster than the ends, which is the neck |
| sag | droop grows with distance, so a long thread hangs |
| dissolve | pushes the radius past zero near the end |

That last one matters more than it sounds. Without it a thread thins down to a
half-covered pixel and then just stops existing, which reads as a hairline
flickering off. Driving the radius negative carries it out of antialiasing range so
it fades out of the field properly. The thread doesn't vanish. It breaks.

## The cursor is a force, not a pointer

Nothing is ever drawn at the cursor. It's a disturbance in the field.

![Hovering the front card: the neighbours above and below have backed away and
dimmed, threads stretch between them, and the View tag has appeared on the
cursor](docs/hover.png)

Move over a card and it raises `k` locally, so the surface goes soft right there and
stays stiff further out. The nearest cards lean toward it and swell a bit. Their
neighbours back off and dim, which is what makes the hovered one read as picked up
rather than just highlighted. Threads string themselves between the cards you're
_between_, not the one you're on. Move fast and you leave a capillary ripple that
outlives the movement.

The rates are lopsided on purpose. Cards take up a lean quickly and let go of it
slowly. Equal rates read as a mechanism following your cursor. The gap between them
reads as something thick being dragged through.

## The same trick, twice

![The carousel at rest: the front card centred, its number and name to the left,
keyword and English title to the right, and the five plays stacked top
right](docs/carousel.png)

The type either side of the ring changes as the carousel turns, and it doesn't
crossfade. It melts, same as the cards do.

It can't use the shader though, because it's DOM text. So it does the same thing in
a completely different medium. Two copies of the words are stacked, one blurred out
as the other blurs in, and the pair get run through an alpha threshold that forces
everything above a cut fully opaque and drops the rest.

Two soft edges drifting past each other cross that cut as one shape.

Which is the same idea as the smooth minimum wearing different clothes. Soften, then
re-harden. Blur is the softening, the threshold is the re-hardening. In the shader
it's `smin` and an antialiased edge. Same principle in two unrelated technologies,
and I only noticed they were the same thing after I'd built both.

## Turning it into a deck

The viscosity was the interesting part and the portfolio was the costume. So the
costume changed.

The ring is now the 22 Major Arcana in classical order — 0 Fool through XXI World.
That ordering is not cosmetic: the reading you get is seeded by the card the ring
stopped on, so the ring has to be the deck or the two disagree about what you're
looking at. `MAJOR_ARCANA` is the single source of truth and the ring is derived
from it, which makes that impossible to get wrong by accident.

But a card you can only look at is a poster, not a reading. So the front card became
a door: tap it, get the plate and both readings, then choose one of five plays.

### The decision that made it feel like a reading

The daily draw is not random.

The seed is `date + card + topic`. Same day, same card, same question, same answer —
and it survives a reload. Reshuffle takes a fresh random seed instead. That one
choice is the difference between a tarot reading and a number generator, and it is
the reason the whole reading path is pure functions in a plain module with no JSX
and no browser APIs in it. If randomness leaks in anywhere else, the illusion dies.

Two smaller versions of the same instinct:

- **A custom question goes into the seed.** If it didn't, two entirely different
  questions would deal the same four cards just because it happened to be the same
  day. That would be immediately obvious and immediately fatal.
- **The hand is forced off the fence.** Four cards out of the majors, but if the hand
  has no light card one gets swapped in, and same for shadow. You should never look
  at four cards and know the answer before you pick.

### Offline, because that's the honest version

No model, no API, no key. Every reading is derived from the card's own record — the
keyword, the upright reading, the reversed one, and the card's tone. The copy is
written to be *about* the card rather than generated on the fly, which means it reads
the same every time, and means the whole thing runs from a static folder with no
server behind it.

The four spreads widen the same idea: 圣三角 (3), 四元素 (4), 二择一 (5) and 凯尔特
十字 (10) deal from the full 78-card deck instead of just the majors, at about 30%
reversed, and derive a summary — how many reversed, how many majors, how the four
elements balance — alongside the per-slot readings. It's still arithmetic. It's just
more of it.

### The doll

![The mobile layout at 390px: the doll layer drops out entirely and the plays
collapse into a bottom sheet](docs/mobile.png)

Every plate in the deck is the same pale-blue-haired doll, so the page has a mascot
whether I asked for one or not. Rather than invent a second one that would fight the
cards, she became the background: flat SVG, the deck's own palette, sitting *behind*
the transparent canvas.

She isn't scenery though. Two eyes that track the cursor with a deliberate lag, plus
a blink, is most of the distance between "decoration" and "someone is in the room".
A pupil pinned exactly to the pointer reads as a widget; the lag is what makes it a
face. She also looks around on her own after four seconds of no input, because a
frozen doll on a touch device is exactly the uncanny thing this was meant to avoid.

On phones she's hidden — there's no hover to make her work, and the ring wants the
width.

## Stuff that only showed up once it moved

Five things I didn't see coming. All of them needed rethinking rather than tweaking.

**Hover fed back into the goo.** Threads are measured from how far apart two cards
are, but hovering _moves_ cards. Leaning one toward the cursor made the gap look
smaller, which fattened the thread, which changed the shape. The unfurl reacts
brutally steeply to separation. A couple of percent of the gap is already a slab. The
fix was to measure threads from where each card would be with no cursor near it.
Hover moves what you see, never what the goo is computed from.

**Cards are numbered in fan order, not ring order.** They're born alternating either
side of the seed, so card 0, 1, 2, 3 sits at ring position 0, +1, -1, +2. I was
dealing the artwork by card number, which quietly put every other card side by side.
Turning the wheel one slot stepped the list two names. Fix was to deal by ring
position instead.

**The loading counter had to become the gate.** At first it just reported bytes. On a
warm cache it hit 100 instantly and then sat there while the entry animation played,
which reads as a hang. Now it counts `min(assets loaded, animation progress)`, and the
ring launches on the exact frame it reads 100. The number landing and the ring moving
are the same event.

**A word that isn't changing shouldn't melt.** Two cards from the same keyword pair
shouldn't have the same word dissolve into itself. Holding it still isn't enough
though. The alpha threshold has to span both layers to fuse them, so anything inside
it gets thresholded whether it's moving or not, and a held word visibly thickens for
the length of the morph. It needed a third copy living outside the filter entirely.

**Twenty-two is not twelve.** The ring was sized for a portfolio's worth of cards.
Going to 22 halved the angle per slot, which left the neighbours about 7px of daylight
— close enough that the goo welded the whole arc into one continuous band. The fix
wasn't "more radius": at that spacing the previous radius was simply the wrong shape
of answer. The phone band had the same problem in reverse and had to stop being 640
and become 480. Both the numbers and the reasoning are in `params.js`, next to the
values, because they look arbitrary otherwise and someone will "simplify" them back.

## Where it stops

The idea works but it isn't finished.

- **The entry has no reduced-motion path.** Six seconds of animated blur, and no way
  out of it. The doll respects the OS setting; the ring doesn't.
- **No keyboard control.** Arrow keys should step the ring.
- **The two font `.woff2` files are listed in `@font-face` and don't exist**, so every
  visit eats two 404s before the TTF loads. The CJK face is 1.76 MB and could be
  100–300 KB subset.
- **The deck art's provenance isn't recorded anywhere.** That needs an answer before
  this is something anyone else can safely reuse.
- **The art is 3.0 MB** and gets downsampled to 320px cells anyway, so the sources are
  carrying a lot of weight for no reason.

How the code is arranged — including the traps — is in [AGENTS.md](AGENTS.md). Setup
and the file map are in [README.md](README.md).
