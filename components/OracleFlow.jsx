"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TOPICS, TOPIC_GROUPS, CUSTOM_TOPIC_ID, drawOracle, revealCard, TAROT_BACK } from "./ring/tarot";
import { BASIC_PLAY_ID } from "./ring/spreads";
import SpreadFlow from "./SpreadFlow";
import HoloCard from "./HoloCard";

/* ------------------------------------------------------------------ *
 * The reading flow, in four steps.
 *
 * topic -> breathe -> pick -> reveal
 *
 * Why four steps and not one: the reveal only lands if the visitor asked
 * something first and picked the card themselves. Skip either and the same
 * sentence reads as a horoscope widget. So the question and the choice are
 * load-bearing, not decoration — the reveal is the cheap part.
 * ------------------------------------------------------------------ */

// Ink per card tone. The zodiac's four elements used to drive this; with
// them gone the accent follows the deck's own light / shadow / neutral axis,
// which is what the copy is already keyed on.
const TONE_INK = {
  light: "#9a6a2c",
  shadow: "#3f4f7a",
  neutral: "#4a6b5c",
};

// Load a tarot webp into a canvas-drawable image. Same-origin, so the
// canvas stays untainted and toBlob() still works.
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Canvas has no text wrapping, and the share card is mostly text. Measure
// and break per character — CJK has no spaces to break on.
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// The shareable card. Sized 750x1180 — a phone screenshot shape, so it
// drops straight into a feed without cropping.
async function buildShareCanvas(reveal, card) {
  const W = 750;
  const H = 1180;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const ink = TONE_INK[card.tone] || "#14180f";

  // Paper, not glass: the card art is a woodcut and reads better on stock.
  ctx.fillStyle = "#f4efe4";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(20,24,15,0.14)";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  const pad = 72;
  let y = 118;

  ctx.fillStyle = "rgba(20,24,15,0.5)";
  ctx.font = "26px system-ui, sans-serif";
  ctx.fillText("INFINITE SPACE · 大阿卡纳 " + card.name, pad, y);
  y += 52;

  ctx.fillStyle = ink;
  ctx.font = "600 42px 'Songti SC', 'SimSun', serif";
  for (const line of wrapText(ctx, "问：" + reveal.question, W - pad * 2)) {
    ctx.fillText(line, pad, y);
    y += 52;
  }
  y += 22;

  // Card art, centred, at the source 100:179 ratio (the new deck dropped
  // in _originals is 1536x2752, which is exactly this). 360 wide keeps the
  // share image dense enough to read on a phone without crowding the hook.
  const cardW = 360;
  const cardH = Math.round(cardW * 179 / 100);
  const cardX = (W - cardW) / 2;
  try {
    const img = await loadImage(reveal.card.img);
    ctx.save();
    if (reveal.reversed) {
      // A reversed card is drawn upside down — same thing a reader does
      // with the physical deck.
      ctx.translate(cardX + cardW / 2, y + cardH / 2);
      ctx.rotate(Math.PI);
      ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);
      ctx.restore();
    } else {
      ctx.drawImage(img, cardX, y, cardW, cardH);
      ctx.restore();
    }
  } catch {
    ctx.strokeStyle = "rgba(20,24,15,0.2)";
    ctx.strokeRect(cardX, y, cardW, cardH);
  }
  ctx.strokeStyle = "rgba(20,24,15,0.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cardX, y, cardW, cardH);
  y += cardH + 46;

  ctx.textAlign = "center";
  ctx.fillStyle = "#14180f";
  ctx.font = "600 40px 'Songti SC', 'SimSun', serif";
  ctx.fillText(
    reveal.card.zh + (reveal.reversed ? "（逆位）" : "（正位）"),
    W / 2,
    y,
  );
  y += 40;
  ctx.fillStyle = "rgba(20,24,15,0.45)";
  ctx.font = "24px system-ui, sans-serif";
  ctx.fillText(reveal.card.en + " · " + reveal.card.kw, W / 2, y);
  y += 62;
  ctx.textAlign = "left";

  ctx.fillStyle = "#14180f";
  ctx.font = "30px system-ui, sans-serif";
  for (const line of wrapText(ctx, reveal.onTopic, W - pad * 2)) {
    ctx.fillText(line, pad, y);
    y += 44;
  }

  y += 26;
  ctx.fillStyle = ink;
  ctx.font = "600 30px system-ui, sans-serif";
  ctx.fillText("多做：" + reveal.doLine, pad, y);
  y += 44;
  ctx.fillStyle = "rgba(20,24,15,0.6)";
  ctx.font = "30px system-ui, sans-serif";
  ctx.fillText("少做：" + reveal.avoidLine, pad, y);
  y += 58;

  ctx.strokeStyle = "rgba(20,24,15,0.14)";
  ctx.beginPath();
  ctx.moveTo(pad, y);
  ctx.lineTo(W - pad, y);
  ctx.stroke();
  y += 46;

  ctx.fillStyle = "rgba(20,24,15,0.55)";
  ctx.font = "26px system-ui, sans-serif";
  ctx.fillText(
    "幸运数字 " + reveal.luckyNum + " · 幸运时段 " + reveal.luckyHour + ":00",
    pad,
    y,
  );
  y += 40;
  ctx.fillText("INFINITE SPACE · 每日一测", pad, y);

  return canvas;
}

export default function OracleFlow({
  card,
  seed,
  play,
  onClose,
  specMove,
  specLeave,
  onRevealCard,
  onResetBackdrop,
}) {
  // `step` is the whole flow's state machine; everything else derives from
  // it. Backing out of a reveal resets to the topic list, not to a stale
  // hand, so no card can be re-fished.
  const [step, setStep] = useState("topic");
  // Two readings live in this one overlay: the four-card daily draw and
  // the 78-card spread mode. They share the card/seed and the backdrop
  // callbacks, but nothing else, so the hand-off is a swap at the top.
  //
  // Which one opens is decided by the ring's play menu, not from in here:
  // arriving via 凯尔特十字 should land on that spread, not on the daily
  // tap with an 进阶 button to find.
  const [mode, setMode] = useState(
    play && play !== BASIC_PLAY_ID ? "advanced" : "simple",
  );
  const [topicId, setTopicId] = useState(null);
  const [pickKey, setPickKey] = useState(null);
  const [extraSeed, setExtraSeed] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);
  // Free-text question. Trimmed on use; the 40-char cap lives in tarot.js.
  const [customQuestion, setCustomQuestion] = useState("");
  // The breathing ring is the only gate now. It used to wait on a gender
  // choice as well, but the copy says TA and the answer changed nothing.
  const [breatheReady, setBreatheReady] = useState(false);
  const revealRef = useRef(null);
  // Screen rect of the face-down card that was just clicked. When the reveal
  // mounts, the card FLIPs from here down into its slot — see the effect
  // below. Stored as a plain object because a live DOMRect crossing state
  // boundaries loses its meaning after layout.
  const [flipRect, setFlipRect] = useState(null);
  const card3dRef = useRef(null);

  const baseSeed = seed || "";
  const oracle = useMemo(() => {
    if (!topicId) return null;
    // The marker card is IN the seed, not just in the default one: the
    // overlay hands `seed` down explicitly, which would otherwise take the
    // card out of the deal and hand every visitor the same four cards
    // whichever card they stopped the ring on. Same-day stability is still
    // intact — it is the day plus the card, not the card alone.
    //
    // A custom question folds its own text in on top, so two different
    // questions the same day don't deal an identical hand.
    const s =
      topicId === CUSTOM_TOPIC_ID
        ? `${baseSeed}#${card.en}#${extraSeed}#${customQuestion.trim()}`
        : `${baseSeed}#${card.en}#${extraSeed}`;
    return drawOracle(card, topicId, s, customQuestion);
  }, [card, topicId, baseSeed, extraSeed, customQuestion]);

  const reveal = useMemo(
    () => (oracle && pickKey ? revealCard(oracle, pickKey) : null),
    [oracle, pickKey],
  );

  // Advance out of the breathing screen once the ring has finished — the
  // three seconds of quiet are the whole point of the screen, so the ring
  // ending is the trigger. "跳过" bypasses the wait by setting the step
  // directly.
  useEffect(() => {
    if (step !== "breathe" || !breatheReady) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- gated transition, not an init
    setStep("pick");
  }, [step, breatheReady, oracle]);

  // Reset the flow whenever the underlying card/day changes underneath us.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external seed changed; the flow must restart
    setStep("topic");
    setTopicId(null);
    setPickKey(null);
    setBreatheReady(false);
  }, [card?.en, baseSeed]);

  // The play menu owns the mode, and a change there has to restart the flow
  // rather than swap the panel underneath it: a half-finished 凯尔特十字
  // holding its own question would otherwise surface inside the daily draw.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external mode changed; the flow must restart
    setMode(play && play !== BASIC_PLAY_ID ? "advanced" : "simple");
    setStep("topic");
    setTopicId(null);
    setPickKey(null);
    setBreatheReady(false);
  }, [play]);

  // FLIP the reveal card in. The card the visitor clicked is face-down and
  // sits in the fanned hand; this card mounts in its grid slot on the left,
  // so the first frame is inverted back to the click's rect (translate +
  // scale + rotateY 180deg — which also shows the back plate) and the
  // animation runs it home: half a turn to face-up while shrinking into
  // place. A real DOMRect is read after mount, never captured early.
  //
  // useLayoutEffect, not useEffect: the animation's first frame must be in
  // place before the browser paints the reveal, or the card flashes in its
  // slot for a frame before the flip starts. Safe on the server — this
  // component only ever mounts in response to a click.
  useLayoutEffect(() => {
    if (step !== "reveal" || !flipRect || !card3dRef.current) return;
    const el = card3dRef.current;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const sx = flipRect.width / r.width;
    const sy = flipRect.height / r.height;
    const dx = flipRect.left - r.left;
    const dy = flipRect.top - r.top;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      // Clearing the marker must not wait a frame or the reveal would
      // replay the flip on the next paint. Pure cleanup, no UI read.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlipRect(null);
      return;
    }
    // Overshoot the hold at the top of the arc, then land. Keyframed in
    // thirds so the face/back plates swap mid-flight at 90°.
    const anim = el.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotateY(180deg)`,
          easing: "cubic-bezier(0.22, 0.9, 0.32, 1)",
        },
        {
          transform: `translate(${dx * 0.06}px, ${dy * 0.06}px) scale(${
            sx + (1 - sx) * 0.14
          }, ${sy + (1 - sy) * 0.14}) rotateY(0deg)`,
          offset: 0.72,
          easing: "cubic-bezier(0.22, 0.9, 0.32, 1)",
        },
        { transform: "translate(0, 0) scale(1, 1) rotateY(0deg)" },
      ],
      { duration: 700, fill: "backwards" },
    );
    anim.onfinish = () => setFlipRect(null);
    return () => anim.cancel();
  }, [step, flipRect]);

  const share = useCallback(async () => {
    if (!reveal || sharing) return;
    setSharing(true);
    try {
      const canvas = await buildShareCanvas(reveal, card);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tarot-${card.en}-${reveal.card.en.replace(/\s+/g, "-")}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setSaved(true);
    } finally {
      setSharing(false);
    }
  }, [reveal, card, sharing]);

  const closeBtn = (
    <button
      onClick={onClose}
      aria-label="关闭占卜"
      onPointerMove={specMove}
      onPointerLeave={specLeave}
      className="spec-btn liquid-btn flex shrink-0 items-center gap-2.5 px-4 py-2 text-sm"
      style={{ "--spec-bright": "0.25" }}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
      <span>关闭</span>
    </button>
  );

  /* ---------------- Advanced: 78-card spreads ---------------- *
   * Hand the whole overlay over to SpreadFlow. It owns its own step
   * machine; from here it only needs the shared card/seed, the backdrop
   * callbacks, and a way back to the simple draw.
   *
   * initialSpreadId is the spread the play menu was pointing at. Passing
   * it lets SpreadFlow open on the question instead of making the visitor
   * pick the same spread twice; null (the in-overlay 进阶 button) means
   * "let them choose".
   * ------------------------------------------------------------ */
  if (mode === "advanced") {
    return (
      <SpreadFlow
        card={card}
        seed={seed}
        initialSpreadId={play && play !== BASIC_PLAY_ID ? play : null}
        onClose={onClose}
        onExitToSimple={() => {
          setMode("simple");
          onResetBackdrop?.();
        }}
        specMove={specMove}
        specLeave={specLeave}
        onRevealCard={onRevealCard}
        onResetBackdrop={onResetBackdrop}
      />
    );
  }

  /* ---------------- Step 1: what are you asking? ---------------- */
  if (step === "topic") {
    const startTopic = (id) => {
      setTopicId(id);
      setPickKey(null);
      setBreatheReady(false);
      setStep("breathe");
    };
    // Tiles are rendered through a plain function rather than a nested
    // component: a component defined inside the render pass gets a new
    // identity every time and remounts all nine on each keystroke in the
    // custom-question field below.
    // The class list is base / sm: split because the phone tile is a
    // different object, not a smaller one. Nine two-line 74px plates are
    // what used to run this step 232px past the fold. Under 640px the tile
    // keeps emoji + hook on one 44px row and drops the hint — the hint is
    // the second thing the eye needs, and the hook already names the
    // question on its own. From 640px up it is the original plate again.
    const renderTile = (t) => (
      <button
        key={t.id}
        onClick={() => startTopic(t.id)}
        onPointerMove={specMove}
        onPointerLeave={specLeave}
        className="spec-btn plate oracle-topic-tile group flex min-h-[44px] flex-col items-start justify-center gap-0.5 rounded-lg px-3 py-2.5 text-left transition-transform hover:-translate-y-0.5 sm:min-h-0 sm:justify-start sm:gap-1 sm:rounded-xl sm:px-4 sm:py-3"
        style={{ "--spec-bright": "0.22" }}
      >
        <div className="flex w-full items-center gap-2 sm:gap-2.5">
          <span className="text-lg leading-none sm:text-2xl" aria-hidden="true">
            {t.emoji}
          </span>
          <span className="cn-serif text-[15px] font-semibold text-[#14180f] sm:text-lg">
            {t.hook}
          </span>
        </div>
        <span className="cn-sans hidden text-xs text-black/45 sm:block">
          {t.hint}
        </span>
      </button>
    );
    return (
      <div
        className="oracle-step oracle-step--topic pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="oracle-topic-frame mx-auto flex w-full max-w-[760px] flex-col">
          <header className="oracle-topic-head mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="cn-serif element-accent text-2xl leading-none sm:text-3xl">
                  {card.num}
                </span>
                <h2 className="cn-serif text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
                  {card.name}
                </h2>
              </div>
              <p className="cn-sans mt-1.5 text-xs text-black/55 sm:mt-2 sm:text-sm">
                以{card.name}为主牌，先选一个问题 —— 越具体，牌答得越准
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/* The advanced entry sits next to 关闭 rather than below the
                  tiles: it should be findable without being the thing you
                  hit by accident on the way to a daily draw.

                  On a phone the header is a pinned band, so the label
                  collapses to the mark alone — every pixel it keeps is a
                  pixel the tiles lose. `sr-only` rather than `hidden` so
                  the button keeps its accessible name at that size. */}
              <button
                onClick={() => setMode("advanced")}
                onPointerMove={specMove}
                onPointerLeave={specLeave}
                className="spec-btn liquid-btn flex items-center gap-2 px-3 py-2 text-sm sm:px-3.5"
                style={{ "--spec-bright": "0.25" }}
              >
                <span className="cn-serif text-base leading-none" aria-hidden="true">
                  ✦
                </span>
                <span className="sr-only sm:not-sr-only">进阶玩法</span>
              </button>
              {closeBtn}
            </div>
          </header>

          {/* Grouped, not flat: nine unlabelled tiles read as a wall and
              people bounce. Three rows turn the same nine into a question
              about which part of life, which is the faster decision.

              On a phone this block is the only region between the two
              pinned bands, so it is the one thing that may ever scroll —
              and only when the viewport is shorter than the content. The
              header (and its 关闭) above and the question form below stay
              put, which is the whole point: nobody should have to scroll
              to find a button. */}
          <div className="oracle-topic-body">
            <div className="oracle-topics">
              {TOPIC_GROUPS.map((grp) => (
                <section key={grp.id} className="oracle-topic-group">
                  <div className="oracle-topic-group-head">
                    <span className="cn-serif">{grp.label}</span>
                    <span className="cn-sans">{grp.desc}</span>
                  </div>
                  {/* A 3-tile row goes to 3 columns rather than 2+1 with a
                      hole: nine tiles already cost a full screen of height,
                      and the orphan reads as a mistake. Only from md up —
                      below that the columns get too narrow for the hook and
                      it wraps, which costs more height than it saves. */}
                  <div
                    className={`grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2.5 ${
                      grp.ids.length === 3 ? "md:grid-cols-3" : ""
                    }`}
                  >
                    {grp.ids.map((id) => {
                      const t = TOPICS.find((x) => x.id === id);
                      return t ? renderTile(t) : null;
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>

          {/* Pinned band. The free-text entry rides here rather than inside
              the scrollable block above: it is a way into the flow, and a
              way in that has to be scrolled to is a way people miss. */}
          <div className="oracle-topic-foot">
            <form
              className="oracle-custom"
              onSubmit={(e) => {
                e.preventDefault();
                if (customQuestion.trim()) startTopic(CUSTOM_TOPIC_ID);
              }}
            >
              <input
                className="oracle-custom-input"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="都不是？写下你自己的问题"
                maxLength={40}
                aria-label="自定义问题"
              />
              <button
                type="submit"
                disabled={!customQuestion.trim()}
                className="oracle-custom-go"
              >
                就问这个
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-black/35">
              {oracle?.topic?.label || "今日"}之问 · 由你开口，也由你收尾
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Step 2: hold the question ---------------- */
  if (step === "breathe") {
    // Read the topic off the oracle rather than looking it up by id: a
    // custom question has no entry in TOPICS, and falling back here would
    // silently show "今天有什么在等我" instead of what was typed.
    const topic = oracle?.topic || TOPICS.find((t) => t.id === "today");
    return (
      <div
        className="oracle-step pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-[620px] flex-col items-center gap-6 px-6 py-10 text-center sm:px-10">
        <div className="text-xs uppercase tracking-[0.2em] text-black/40">
          {topic.label}之问 · 单张指引
        </div>

        {/* The breathing ring is the point of this screen: it buys three
            seconds of quiet, and the pick afterwards feels considered
            instead of clicked. Driven purely by CSS so it costs nothing on
            the main thread — animationend marks the ring done, and the
            effect above decides when that is allowed to advance the flow. */}
        <div
          className="relative flex h-40 w-40 items-center justify-center"
          onAnimationEnd={() => setBreatheReady(true)}
        >
          <span className="breathe-ring absolute inset-0 rounded-full border border-black/15" />
          <span className="breathe-ring breathe-ring-delay absolute inset-0 rounded-full border border-black/10" />
          <span className="cn-serif element-accent breathe-core text-5xl leading-none">
            {topic.emoji}
          </span>
        </div>

        <div>
          <p className="cn-serif text-xl text-[#14180f]">{topic.hook}</p>
          <p className="cn-sans mt-2 text-sm text-black/50">{topic.prompt}</p>
          <p className="cn-sans mt-1 text-xs text-black/35">
            深呼吸三次，不要刻意去想，也不要反复改
          </p>
        </div>

        <button
          onClick={() => setStep("pick")}
          className="cn-sans text-xs text-black/40 underline underline-offset-4 hover:text-black/70"
        >
          跳过
        </button>
        </div>
      </div>
    );
  }

  /* ---------------- Step 3: pick by first instinct ---------------- */
  if (step === "pick") {
    const topic = oracle?.topic || TOPICS.find((t) => t.id === "today");
    const ink = TONE_INK[card.tone] || "#14180f";
    const fan = [-14, -5, 5, 14];
    return (
      <div
        className="oracle-step pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-[760px] flex-col">
          <header className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="cn-serif text-2xl font-semibold leading-tight text-[#14180f] sm:text-3xl">
              {topic.emoji} {topic.hook}
            </div>
            <p className="cn-sans mt-2 text-base text-black/55">
              {topic.prompt}，然后凭第一直觉选一张
            </p>
          </div>
          {closeBtn}
        </header>

        <p className="cn-sans mb-5 text-sm text-black/35">
          不要刻意选择，也不要反复挑选 —— 第一眼看到的那张就是你的
        </p>

        <div
          className="relative mx-auto h-[300px] w-full max-w-[560px] [perspective:1000px] sm:h-[340px]"
          role="group"
          aria-label="凭直觉选一张牌"
        >
          {oracle.hand.map((entry, i) => (
            <button
              key={entry.key}
              onClick={(e) => {
                // Remember where the face-down card sits so the reveal card
                // can FLIP from here into the slot on the left.
                const r = e.currentTarget.getBoundingClientRect();
                setFlipRect({
                  left: r.left,
                  top: r.top,
                  width: r.width,
                  height: r.height,
                });
                setPickKey(entry.key);
                setStep("reveal");
                // The picked card's art takes over the full-screen wash
                // behind the reading (Carousel owns the backdrop).
                onRevealCard?.(entry.card.img);
              }}
              onPointerMove={specMove}
              onPointerLeave={specLeave}
              aria-label={`选择第 ${entry.key} 张牌`}
              className={`pick-card group absolute left-1/2 top-1/2 aspect-[100/179] w-[132px] cursor-pointer rounded-[16px] focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 sm:w-[156px] [perspective:760px]`}
              style={{
                // --lift is a custom prop, not a Tailwind translate: the
                // inline transform has to win for the fan layout, and a
                // Tailwind hover utility would be overridden by it. .pick-
                // card:hover only sets the variable, so both compose.
                transform: `translate(-50%, -50%) rotate(${fan[i]}deg) translateX(${(i - 1.5) * 138}px) translateY(var(--lift, 0px))`,
              }}
            >
              {/* 3D 全息闪卡：牌背也有流光，让"还没翻开"这件事本身
                  就有质感。radius 14 跟着小卡尺寸走。 */}
              <HoloCard
                src={TAROT_BACK}
                radius={16}
                maxTilt={16}
                glareMax={0.45}
                foilMax={0.34}
              />
              {/* halo-spin removed: the rim light fought the card-flip
                  motion, so the hover effect on the deck is now carried by
                  HoloCard's tilt + glare + foil alone. */}
              <span className="glass-chip absolute bottom-1.5 left-1/2 z-[5] -translate-x-1/2 rounded px-2 py-0.5 text-[11px] font-semibold tracking-[0.1em] text-[#14180f]">
                {entry.key}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => {
              setStep("topic");
              setBreatheReady(false);
              onResetBackdrop?.();
            }}
            className="cn-sans text-xs text-black/40 underline underline-offset-4 hover:text-black/70"
          >
            ← 换个问题
          </button>
          <span className="cn-sans text-xs text-black/30">
            {card.name} · 今日牌面已定
          </span>
        </div>
        </div>
      </div>
    );
  }

  /* ---------------- Step 4: the reveal ---------------- */
  if (!reveal) return null;
  const ink = TONE_INK[card.tone] || "#14180f";
  return (
    <div
      className="oracle-step oracle-step--reveal pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* On a phone this wrapper becomes `display: contents` so the header,
          the scrollable reading band, the action row and the footer land as
          the four direct rows of .oracle-step--reveal's grid. On desktop it
          stays a plain flex column and the no-scroll guarantee comes from
          the --reveal-h arithmetic instead. */}
      <div className="oracle-reveal-frame mx-auto flex w-full max-w-[1180px] flex-col">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
              {reveal.topic.label}之问 · 第 {reveal.key} 张 · 由你选定
            </div>
            {/* The question as asked, above the headline. A reading that
                opens with the visitor's own wording lands differently from
                one that opens with a generated hook — and for a custom
                question this is the only place it appears at all. */}
            <p className="cn-sans mt-1.5 text-sm text-black/45">
              问：{reveal.question}
            </p>
            <h2
              className="cn-serif mt-1.5 text-3xl font-semibold leading-tight tracking-[-0.01em] sm:text-[34px]"
              style={{ color: ink }}
            >
              {reveal.headline}
            </h2>
          </div>
          {closeBtn}
        </header>

        <div ref={revealRef} className="oracle-reveal">
          {/* Full-height plate. The figure owns the height (88dvh on
              desktop, 64dvh on mobile) and the 100:179 aspect derives the
              width, so the art can never letterbox or crop. The FLIP from
              the picked card lands on .oracle-reveal-flip, which sits
              OUTSIDE HoloCard so the flip's rotateY and the holo tilt's
              rotateX/Y never fight over one transform property. */}
          <figure className="oracle-reveal-figure group">
            <div ref={card3dRef} className="oracle-reveal-flip">
              {/* maxTilt is 9, not the pick cards' 16: this plate is
                  full-screen, and at that size the same angle throws the far
                  edge a long way — it reads as sway rather than tilt. The
                  glare and foil still carry the effect. */}
              <HoloCard
                src={reveal.card.img}
                alt={reveal.card.en}
                backSrc={TAROT_BACK}
                radius={24}
                maxTilt={9}
                reversed={reveal.reversed}
              />
            </div>
          </figure>

          <div className="oracle-reveal-copy">
            {/* Card name + 正/逆位 moved into the right column. The previous
                bottom-of-figure caption sat over a black-to-transparent
                gradient scrim, which read as a drop shadow on the card.
                Putting the meta here keeps the plate clean of any text and
                gives the name a stable anchor beside the plate. The reversed
                tag carries a warm tint so it does not read as a generic
                chip. */}
            <div className="oracle-reveal-meta">
              <span className="cn-serif text-[#14180f]">{reveal.card.zh}</span>
              <span
                className={`cn-sans${reveal.reversed ? " is-reversed" : ""}`}
              >
                {reveal.reversed ? "逆位" : "正位"}
              </span>
            </div>

            <div>
              <div className="oracle-label">
                <span>牌面密语</span>
              </div>
              <p className="cn-sans mt-1.5 text-sm leading-relaxed text-black/60">
                {reveal.core}
              </p>
            </div>

            <div>
              <div className="oracle-label">
                <span>给你的回答</span>
              </div>
              <p className="cn-sans mt-1.5 text-[15px] leading-[1.85] text-[#14180f]">
                {reveal.onTopic}
              </p>
            </div>

            <div>
              <div className="oracle-label">
                <span>今日节奏</span>
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5 text-sm">
                <p style={{ color: ink }}>
                  <span className="font-semibold">多做：</span>
                  {reveal.doLine}
                </p>
                <p className="text-black/55">
                  <span className="font-semibold">少做：</span>
                  {reveal.avoidLine}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-black/45">
              <span>
                幸运数字 <b style={{ color: ink }}>{reveal.luckyNum}</b>
              </span>
              <span>
                幸运时段 <b style={{ color: ink }}>{reveal.luckyHour}:00</b>
              </span>
              <span>今天有 {reveal.samePick} 人选了同一张牌</span>
            </div>
          </div>
        </div>

        <div className="oracle-actions mt-7 flex flex-wrap items-center gap-2.5">
          <button
            onClick={share}
            disabled={sharing}
            onPointerMove={specMove}
            onPointerLeave={specLeave}
            className="spec-btn liquid-btn flex items-center gap-2.5 px-4 py-2.5 text-sm disabled:opacity-60"
            style={{ "--spec-bright": "0.25" }}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 16V4" />
              <path d="M8 8l4-4 4 4" />
              <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            <span>{saved ? "已保存 ✓" : sharing ? "生成中…" : "保存结果图"}</span>
          </button>

          <button
            onClick={() => {
              setPickKey(null);
              setStep("pick");
              onResetBackdrop?.();
            }}
            onPointerMove={specMove}
            onPointerLeave={specLeave}
            className="spec-btn liquid-btn flex items-center gap-2.5 px-4 py-2.5 text-sm"
            style={{ "--spec-bright": "0.25" }}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
            <span>换一张</span>
          </button>

          <button
            onClick={() => {
              setPickKey(null);
              setTopicId(null);
              setBreatheReady(false);
              setStep("topic");
              onResetBackdrop?.();
            }}
            className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
          >
            换个问题
          </button>

          <button
            onClick={() => {
              setExtraSeed((n) => n + 1);
              setPickKey(null);
              setStep("pick");
              onResetBackdrop?.();
            }}
            className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
          >
            重新洗牌
          </button>
        </div>

        {/* Pinned bottom band. Dropped under 640px: the reveal is the one
            step with a scrollable middle, so every pixel this line keeps
            is a pixel of the reading it costs — and it is pure cadence,
            restating the 第 N 张 · 由你选定 already in the header. */}
        <p className="oracle-step-foot mt-5 hidden text-center text-xs text-black/30 sm:block">
          {reveal.topic.label}之问 · 大阿卡纳 {reveal.card.zh} · 牌面已收
        </p>
      </div>
    </div>
  );
}
