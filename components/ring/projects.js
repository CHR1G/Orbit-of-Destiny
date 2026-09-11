// Ring order, not filename order. Art is dealt straight down this list, so
// entry n sits one slot along from n-1 and the column can count 0..XXI as
// the carousel turns. Reordering these rows moves the ring, the column and
// the numbering together; nothing else needs touching.
//
// The ring IS the deck now: the 22 Major Arcana in their classical order
// (0 Fool .. XXI World). The twelve zodiac plates this file used to carry
// are gone — what the visitor stops on is a card, and that card is what
// seeds the reading, so the whole page is tarot rather than a horoscope
// with a deck bolted on top.
//
// Derived from MAJOR_ARCANA rather than restated here: one list of cards,
// one place to correct a meaning or a filename. The `type` / `year` names
// are inherited from the meta lockups (see ring/meta.js) and now read
// [keyword . english name] on the right-hand side.
import { MAJOR_ARCANA } from "./tarot.js";

export const PROJECTS = MAJOR_ARCANA.map((c) => ({
  // No leading slash: IMAGE_FILES is fetched as `/${file}` and the oracle
  // backdrop rebuilds the same path.
  file: c.img.replace(/^\//, ""),
  name: c.zh,
  en: c.en,
  num: c.num,
  type: c.kw,
  year: c.en,
  // Drives the accent palette (body[data-tone] in globals.css) the way the
  // old four elements did, but off the card's own light/shadow/neutral.
  tone: c.tone,
  // The live reading object, so the oracle and the ring cannot disagree
  // about which card is in front.
  arcana: c,
}));

export const IMAGE_FILES = PROJECTS.map((p) => p.file);
