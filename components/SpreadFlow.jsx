"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TOPICS,
  TOPIC_GROUPS,
  CUSTOM_TOPIC_ID,
  applyGender,
  buildSpreadSeed,
  dealSpread,
  TAROT_BACK,
  todayStr,
} from "./ring/tarot";
import { SPREADS, SPREAD_BY_ID, readSlot, summarize } from "./ring/spreads";
import HoloCard from "./HoloCard";

/* ------------------------------------------------------------------ *
 * 进阶玩法 — the 78-card spread mode.
 *
 * The simple flow asks one question, deals four face-down cards, and reads
 * one. That is the right shape for a daily tap. The advanced mode is for
 * when someone actually wants to think something through: pick a spread,
 * hold the question, then turn the cards one at a time and read each
 * against its position.
 *
 * Steps: spread -> question -> shuffle -> deal (face down, flip one by one)
 *        -> reading
 *
 * Cards are dealt face-down and opened by the visitor rather than shown
 * all at once. Two reasons: turning your own cards in order is the part
 * that makes it feel like a reading, and reading position 7 before
 * position 1 is how people anchor on the first card they see.
 * ------------------------------------------------------------------ */

// Ink per card tone — the deck's own light / shadow / neutral axis, now
// that the zodiac's four elements are gone.
const TONE_INK = {
  light: "#9a6a2c",
  shadow: "#3f4f7a",
  neutral: "#4a6b5c",
};

export default function SpreadFlow({
  card,
  seed,
  // The spread the play menu was pointing at. Given, the flow opens on the
  // question and skips its own pick-a-spread step; null means the visitor
  // came from the in-overlay 进阶 button and wants to choose.
  initialSpreadId = null,
  onClose,
  onExitToSimple,
  specMove,
  specLeave,
  onRevealCard,
  onResetBackdrop,
}) {
  const [step, setStep] = useState(initialSpreadId ? "question" : "spread");
  const [spreadId, setSpreadId] = useState(initialSpreadId);
  const [topicId, setTopicId] = useState(null);
  const [gender, setGender] = useState(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [shuffle, setShuffle] = useState(0);
  // How many cards have been turned. Dealt cards stay face-down until
  // their turn; `dealt.length` is the total, this is the cursor.
  const [opened, setOpened] = useState(0);

  const baseSeed = seed || "";
  const spread = spreadId ? SPREAD_BY_ID[spreadId] : null;

  const dealt = useMemo(() => {
    if (!spread) return null;
    const s = buildSpreadSeed(card, spread.id, topicId, customQuestion, baseSeed, shuffle);
    return dealSpread(spread.slots.length, s);
  }, [spread, card, topicId, customQuestion, baseSeed, shuffle]);

  const question = useMemo(() => {
    if (topicId === CUSTOM_TOPIC_ID) return customQuestion.trim() || "我自己的问题";
    const t = TOPICS.find((x) => x.id === topicId);
    return t ? applyGender(t.hook, gender) : "";
  }, [topicId, customQuestion, gender]);

  const summary = useMemo(
    () => (spread && dealt ? summarize(spread, dealt) : null),
    [spread, dealt],
  );

  const resetAll = useCallback(() => {
    setStep("spread");
    setSpreadId(null);
    setTopicId(null);
    setOpened(0);
    onResetBackdrop?.();
  }, [onResetBackdrop]);

  // The play menu can retarget an already-open spread. This component is
  // NOT remounted across that — only the parent's `mode` decides whether it
  // renders at all — so the new id has to land here rather than in the
  // useState initialiser, which would read it exactly once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- external mode changed; the deal must restart
    setSpreadId(initialSpreadId);
    setStep(initialSpreadId ? "question" : "spread");
    setTopicId(null);
    setOpened(0);
  }, [initialSpreadId]);

  useEffect(() => {
    if (!spread) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a new deal always starts closed
    setOpened(0);
  }, [spread, shuffle]);

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

  /* ---------------- Step 1: pick a spread ---------------- */
  if (step === "spread") {
    return (
      <div
        className="oracle-step pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-[760px] flex-col">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="cn-serif element-accent text-4xl leading-none">
                  ✦
                </span>
                <h2 className="cn-serif text-2xl font-semibold tracking-[-0.01em]">
                  进阶玩法
                </h2>
              </div>
              <p className="cn-sans mt-2 text-sm text-black/55">
                78 张全牌 · 固定牌位 · 逐张翻开 —— 先选一个牌阵
              </p>
            </div>
            {closeBtn}
          </header>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SPREADS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSpreadId(s.id);
                  setStep("question");
                }}
                onPointerMove={specMove}
                onPointerLeave={specLeave}
                className="spec-btn plate group flex flex-col items-start gap-1.5 rounded-xl px-4 py-3.5 text-left transition-transform hover:-translate-y-0.5"
                style={{ "--spec-bright": "0.22" }}
              >
                <div className="flex w-full items-center gap-2.5">
                  <span className="text-2xl leading-none" aria-hidden="true">
                    {s.emoji}
                  </span>
                  <span className="cn-serif text-lg font-semibold text-[#14180f]">
                    {s.name}
                  </span>
                  <span className="cn-sans ml-auto shrink-0 text-[11px] text-black/35">
                    {s.slots.length} 张
                  </span>
                </div>
                <span className="cn-sans text-xs text-black/50">{s.desc}</span>
                <span className="cn-sans text-[11px] text-black/32">
                  适合：{s.best}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={onExitToSimple}
              className="cn-sans text-xs text-black/40 underline underline-offset-4 hover:text-black/70"
            >
              ← 回到简单版（单张指引）
            </button>
            <span className="cn-sans text-[11px] text-black/28">
              78 张全牌库 · 大阿卡纳 22 + 小阿卡纳 56
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Step 2: what are you asking? ---------------- */
  if (step === "question") {
    const startReading = (id) => {
      setTopicId(id);
      setOpened(0);
      setStep("shuffle");
    };
    return (
      <div
        className="oracle-step pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-[760px] flex-col">
          <header className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                {spread.emoji} {spread.name} · {spread.slots.length} 张
              </div>
              <h2 className="cn-serif mt-1.5 text-2xl font-semibold tracking-[-0.01em]">
                你想问什么
              </h2>
              <p className="cn-sans mt-1.5 text-sm text-black/55">
                同一个问题，牌阵会把它的每个面分开讲
              </p>
            </div>
            {closeBtn}
          </header>

          <div className="oracle-topics">
            {TOPIC_GROUPS.map((grp) => (
              <section key={grp.id} className="oracle-topic-group">
                <div className="oracle-topic-group-head">
                  <span className="cn-serif">{grp.label}</span>
                  <span className="cn-sans">{grp.desc}</span>
                </div>
                <div
                  className={`grid grid-cols-1 gap-2.5 sm:grid-cols-2 ${
                    grp.ids.length === 3 ? "md:grid-cols-3" : ""
                  }`}
                >
                  {grp.ids.map((id) => {
                    const t = TOPICS.find((x) => x.id === id);
                    if (!t) return null;
                    return (
                      <button
                        key={t.id}
                        onClick={() => startReading(t.id)}
                        onPointerMove={specMove}
                        onPointerLeave={specLeave}
                        className="spec-btn plate group flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left transition-transform hover:-translate-y-0.5"
                        style={{ "--spec-bright": "0.22" }}
                      >
                        <div className="flex w-full items-center gap-2.5">
                          <span
                            className="text-2xl leading-none"
                            aria-hidden="true"
                          >
                            {t.emoji}
                          </span>
                          <span className="cn-serif text-lg font-semibold text-[#14180f]">
                            {t.hook}
                          </span>
                        </div>
                        <span className="cn-sans text-xs text-black/45">
                          {t.hint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <form
            className="oracle-custom"
            onSubmit={(e) => {
              e.preventDefault();
              if (customQuestion.trim()) startReading(CUSTOM_TOPIC_ID);
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

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setStep("spread")}
              className="cn-sans text-xs text-black/40 underline underline-offset-4 hover:text-black/70"
            >
              ← 换个牌阵
            </button>
            <span className="cn-sans text-[11px] text-black/28">
              大众占卜 · 仅供娱乐
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Step 3: hold it, then deal ---------------- */
  if (step === "shuffle") {
    const topic = TOPICS.find((t) => t.id === topicId) || null;
    return (
      <div
        className="oracle-step pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-[620px] flex-col items-center gap-6 px-6 py-10 text-center sm:px-10">
          <div className="text-xs uppercase tracking-[0.2em] text-black/40">
            {spread.emoji} {spread.name} · 大众占卜
          </div>

          <div className="relative flex h-40 w-40 items-center justify-center">
            <span className="breathe-ring absolute inset-0 rounded-full border border-black/15" />
            <span className="breathe-ring breathe-ring-delay absolute inset-0 rounded-full border border-black/10" />
            <span className="cn-serif element-accent breathe-core text-5xl leading-none">
              {spread.emoji}
            </span>
          </div>

          <div>
            <p className="cn-serif text-xl text-[#14180f]">{question}</p>
            <p className="cn-sans mt-2 text-sm text-black/50">
              在心里把这个问题过一遍，再开始洗牌
            </p>
          </div>

          {topic?.person && (
            <div className="oracle-gender">
              <span className="oracle-gender-label">你问的是</span>
              <div
                className="oracle-gender-switch"
                role="group"
                aria-label="选择对方性别"
              >
                {[
                  { k: "m", l: "他" },
                  { k: "f", l: "她" },
                ].map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    aria-pressed={gender === o.k}
                    onClick={() => setGender(gender === o.k ? null : o.k)}
                    className={`oracle-gender-opt${
                      gender === o.k ? " is-on" : ""
                    }`}
                  >
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setStep("deal")}
            onPointerMove={specMove}
            onPointerLeave={specLeave}
            className="spec-btn liquid-btn flex items-center gap-2.5 px-6 py-3 text-sm"
            style={{ "--spec-bright": "0.28" }}
          >
            <span className="cn-serif">洗牌，发 {spread.slots.length} 张</span>
          </button>

          <button
            onClick={() => setStep("question")}
            className="cn-sans text-xs text-black/40 underline underline-offset-4 hover:text-black/70"
          >
            ← 换个问题
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Step 4: turn the cards ---------------- */
  if (step === "deal") {
    const allOpen = opened >= dealt.length;
    return (
      <div
        className="oracle-step pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex w-full max-w-[980px] flex-col">
          <header className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
                {spread.emoji} {spread.name} · {card.name}
              </div>
              <p className="cn-serif mt-1.5 text-xl font-semibold text-[#14180f]">
                问：{question}
              </p>
              <p className="cn-sans mt-1 text-xs text-black/40">
                已翻开 {opened} / {dealt.length} 张 —— 按顺序点开
              </p>
            </div>
            {closeBtn}
          </header>

          <div className="spread-grid" data-count={dealt.length}>
            {dealt.map((entry, i) => {
              const slot = spread.slots[i];
              const isOpen = i < opened;
              const isNext = i === opened;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (!isOpen) {
                      setOpened((n) => Math.max(n, i + 1));
                      // The first card opened takes over the full-screen
                      // wash behind the reading (Carousel owns it).
                      if (i === 0) onRevealCard?.(entry.card.img);
                    }
                  }}
                  onPointerMove={specMove}
                  onPointerLeave={specLeave}
                  disabled={isOpen}
                  aria-label={
                    isOpen
                      ? `第 ${i + 1} 张 ${slot.label}：${entry.card.zh}`
                      : `翻开第 ${i + 1} 张（${slot.label}）`
                  }
                  className={`spread-card${isOpen ? " is-open" : ""}${
                    isNext ? " is-next" : ""
                  }`}
                >
                  <div className="spread-card-inner">
                    {isOpen ? (
                      <HoloCard
                        src={entry.card.img}
                        alt={entry.card.en}
                        radius={14}
                        maxTilt={10}
                        reversed={entry.reversed}
                      />
                    ) : (
                      <HoloCard
                        src={TAROT_BACK}
                        radius={14}
                        maxTilt={12}
                        glareMax={0.4}
                        foilMax={0.3}
                      />
                    )}
                  </div>
                  <div className="spread-card-foot">
                    <span className="spread-slot">
                      {i + 1}. {slot.label}
                    </span>
                    {isOpen && (
                      <span
                        className={`spread-name${entry.reversed ? " is-rev" : ""}`}
                      >
                        {entry.card.zh}
                        {entry.reversed ? " 逆" : ""}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {!allOpen && (
              <button
                onClick={() => {
                  setOpened(dealt.length);
                  onRevealCard?.(dealt[0].card.img);
                }}
                onPointerMove={specMove}
                onPointerLeave={specLeave}
                className="spec-btn liquid-btn flex items-center gap-2.5 px-4 py-2.5 text-sm"
                style={{ "--spec-bright": "0.25" }}
              >
                <span>全部翻开</span>
              </button>
            )}
            {allOpen && (
              <button
                onClick={() => setStep("reading")}
                onPointerMove={specMove}
                onPointerLeave={specLeave}
                className="spec-btn liquid-btn flex items-center gap-2.5 px-5 py-2.5 text-sm"
                style={{ "--spec-bright": "0.3" }}
              >
                <span className="cn-serif">看解读</span>
              </button>
            )}
            <button
              onClick={() => {
                setShuffle((n) => n + 1);
                onResetBackdrop?.();
              }}
              className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
            >
              重新洗牌
            </button>
            <button
              onClick={() => setStep("question")}
              className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
            >
              换个问题
            </button>
            <button
              onClick={() => setStep("spread")}
              className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
            >
              换个牌阵
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Step 5: the reading ---------------- */
  const ink = TONE_INK[card.tone] || "#14180f";
  return (
    <div
      className="oracle-step pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mx-auto flex w-full max-w-[980px] flex-col">
        <header className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-black/40">
              {spread.emoji} {spread.name} · {card.name} · 78 张全牌
            </div>
            <p className="cn-serif mt-1.5 text-xl font-semibold text-[#14180f]">
              问：{question}
            </p>
          </div>
          {closeBtn}
        </header>

        <div className="spread-reading">
          {dealt.map((entry, i) => {
            const slot = spread.slots[i];
            return (
              <div key={i} className="spread-reading-row">
                <div className="spread-reading-card">
                  <HoloCard
                    src={entry.card.img}
                    alt={entry.card.en}
                    radius={10}
                    maxTilt={8}
                    reversed={entry.reversed}
                  />
                </div>
                <div className="spread-reading-copy">
                  <div className="spread-reading-head">
                    <span className="spread-reading-slot">
                      {i + 1}. {slot.label}
                    </span>
                    <span className="spread-reading-name" style={{ color: ink }}>
                      {entry.card.zh}
                    </span>
                    <span
                      className={`spread-reading-tag${
                        entry.reversed ? " is-rev" : ""
                      }`}
                    >
                      {entry.reversed ? "逆位" : "正位"}
                    </span>
                    <span className="spread-reading-kw">{entry.card.kw}</span>
                  </div>
                  <p className="cn-sans mt-1.5 text-[15px] leading-[1.85] text-[#14180f]">
                    {readSlot(slot, entry.card, entry.reversed)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {summary && (
          <div className="spread-summary">
            <div className="oracle-label">
              <span>整体来看</span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              {summary.lines.map((line, i) => (
                <p key={i} className="cn-sans text-sm leading-relaxed text-black/70">
                  {line}
                </p>
              ))}
            </div>
            <div className="spread-stats">
              <span>
                共 {summary.total} 张 · 逆位 {summary.reversed} 张
              </span>
              <span>大阿卡纳 {summary.majors} 张</span>
              <span>
                {Object.entries(summary.counts)
                  .filter(([, n]) => n > 0)
                  .map(([el, n]) => `${el} ${n}`)
                  .join(" · ") || "全为大阿卡纳"}
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setStep("deal")}
            onPointerMove={specMove}
            onPointerLeave={specLeave}
            className="spec-btn liquid-btn flex items-center gap-2.5 px-4 py-2.5 text-sm"
            style={{ "--spec-bright": "0.25" }}
          >
            <span>看牌面</span>
          </button>
          <button
            onClick={() => {
              setShuffle((n) => n + 1);
              setStep("deal");
              onResetBackdrop?.();
            }}
            className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
          >
            重新洗牌
          </button>
          <button
            onClick={resetAll}
            className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
          >
            换个牌阵
          </button>
          <button
            onClick={onExitToSimple}
            className="cn-sans rounded-lg px-3 py-2.5 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-[#14180f]"
          >
            回到简单版
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-black/30">
          大众占卜 · 仅供娱乐 · 别让一副牌替你做决定
        </p>
      </div>
    </div>
  );
}
