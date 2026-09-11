// Sigils — the marks the spread menu wears instead of emoji.
//
// Emoji were the wrong tool here. They arrive in whatever colours the OS
// font decides, they sit on a different baseline from the type, and five
// of them in a column read as a row of stickers rather than as a set. A
// set is what this menu is: one basic way in and four readings, and they
// need to look like they were cut from the same sheet of metal.
//
// So: single-weight line drawings, no fills, every mark drawn twice —
// once in a dark grey and once in a bright silver on top. That pairing is
// the whole trick. A lone silver gradient on a pale silver button loses
// whichever part of the sweep happens to match the plate, which is what
// the first two passes did; the dark under-stroke guarantees the outline
// survives everywhere, and the silver core riding on it is read as a
// polished bevel rather than as grey ink. Same reason the marks are
// strokes only: a filled shape would cover its own bevel.
//
// Small circles (centre dots, road ends) are drawn with the same stroke
// width as everything else — at 1.4em on screen they fill in solid on
// their own, which is exactly the dot we want, and it keeps one geometry
// for the whole set.
//
// Each symbol carries its own <defs>. One id per mark (`sig-orb`, …) means
// no two gradients collide and no cross-<svg> url(#…) reference has to
// survive the browser's quirks.

// Bright silver, with two light bands and two dark ones across the sweep.
// Alternating light/dark is what makes a flat stroke read as polished —
// a single white-to-grey fade only reads as grey.
const METAL = (
  <>
    <stop offset="0" stopColor="#ffffff" />
    <stop offset="0.2" stopColor="#c6cedb" />
    <stop offset="0.38" stopColor="#8d97a9" />
    <stop offset="0.55" stopColor="#f4f7fb" />
    <stop offset="0.72" stopColor="#a8b2c3" />
    <stop offset="0.88" stopColor="#e6ebf3" />
    <stop offset="1" stopColor="#b6bfcd" />
  </>
);

const UNDER = "#4f596b";

const SIGILS = {
  // 每日一牌 — one card drawn out of the light. Ring, core, four rays.
  orb: (
    <>
      <circle cx="12" cy="12" r="6.4" />
      <path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2" />
      <circle cx="12" cy="12" r="1.7" />
    </>
  ),

  // 圣三角 — three positions, one triangle, apex up, the card inside it.
  triad: (
    <>
      <path d="M12 4.4 19.9 18.6H4.1Z" />
      <circle cx="12" cy="13.6" r="1.7" />
    </>
  ),

  // 四元素 — the four suits. A diamond cut across both ways into four
  // quarters, which is the shape of the reading: one question seen from
  // action, feeling, thought and matter.
  quartet: (
    <>
      <path d="M12 3.6 20.4 12 12 20.4 3.6 12Z" />
      <path d="M12 3.6v16.8M3.6 12h16.8" />
    </>
  ),

  // 二择一 — one situation, two roads out. Fork with a stop at each end.
  crossroads: (
    <>
      <path d="M12 20.4v-7.4" />
      <path d="M12 13 6.2 7.2M12 13l5.8-5.8" />
      <circle cx="5.6" cy="6.6" r="1.9" />
      <circle cx="18.4" cy="6.6" r="1.9" />
    </>
  ),

  // 凯尔特十字 — the cross on its ring, ten positions.
  cross: (
    <>
      <path d="M12 3.4v17.2M5.4 10.3h13.2" />
      <circle cx="12" cy="10.3" r="4.4" />
    </>
  ),
};

export const SIGIL_NAMES = Object.keys(SIGILS);

export function Sigil({ name, className }) {
  const key = SIGILS[name] ? name : "orb";
  const draw = SIGILS[key];
  const gid = `sig-${key}`;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* userSpaceOnUse, not the default objectBoundingBox. Under the
            default a paint server is mapped to the bbox of each element it
            paints — so a 2px ray would stretch the whole ramp across 2px
            and land entirely in one stop. The first pass drew the rays in
            white and they vanished. One gradient over the 24-unit box
            covers every part of a mark with the same sweep. */}
        <linearGradient
          id={gid}
          gradientUnits="userSpaceOnUse"
          x1="2"
          y1="1"
          x2="22"
          y2="23"
        >
          {METAL}
        </linearGradient>
      </defs>
      <g
        fill="none"
        stroke={UNDER}
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {draw}
      </g>
      <g
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {draw}
      </g>
    </svg>
  );
}
