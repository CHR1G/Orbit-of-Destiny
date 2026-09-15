"use client";

/* ------------------------------------------------------------------ *
 * 卡面详情 — click a card on the ring and you land here first.
 *
 * The ring used to hand a click straight to the divination overlay, which
 * meant the visitor was asked a question before they had ever looked at
 * the card they were asking about. This panel inserts the missing step:
 * the plate, blown up, on the left; what the card actually means on the
 * right. 开始占卜 is then a deliberate second move, not a side effect of
 * touching the wheel.
 *
 * Everything shown is read off the card record — num / zh / en / kw /
 * up / down / tone. Nothing is invented here, so there is exactly one
 * place to correct a meaning (ring/tarot.js) and this panel follows.
 *
 * The 正位 / 逆位 toggle rotates the plate itself: HoloCard already draws
 * an inverted plate, and both readings stay on screen so the visitor
 * never has to tap to read the other half.
 * ------------------------------------------------------------------ */

import { useState } from "react";
import HoloCard from "./HoloCard";
import { asset } from "../lib/asset.js";

// The deck's own light / shadow / neutral axis, spelled out. Same three
// values the reading copy is keyed on, so the label cannot drift from it.
const TONE_LABEL = {
  light: "光 · 顺势",
  shadow: "影 · 阻力",
  neutral: "中 · 转折",
};

export default function CardDetail({
  card,
  index,
  onStart,
  onClose,
  playName,
  specMove,
  specLeave,
}) {
  const a = card.arcana;
  const [reversed, setReversed] = useState(false);
  // `card.file` has no leading slash (the atlas fetches it as `/${file}`);
  // `a.img` is the same path already absolute. Prefer the absolute one so
  // this panel and the reveal cannot disagree about the artwork.
  const src = a.img || `/${card.file}`;

  return (
    <section
      className="cardd"
      aria-label={`${a.zh} 牌面释义`}
      onClick={(e) => e.stopPropagation()}
    >
      <header className="cardd-head">
        <div className="min-w-0">
          <div className="cardd-kicker">
            大阿卡纳 · {a.num}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="关闭牌面"
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
      </header>

      <div className="cardd-body">
        <figure className="cardd-figure">
          <HoloCard
            src={src}
            alt={a.en}
            backSrc={asset("/tarot/back.webp")}
            radius={16}
            maxTilt={11}
            reversed={reversed}
          />
        </figure>

        <div className="cardd-copy">
          <div className="cardd-name">
            <h2 className="cn-serif cardd-zh">{a.zh}</h2>
            <p className="cn-en cardd-en">{a.en}</p>
          </div>

          <p className="cardd-kw">{a.kw}</p>

          <div className="cardd-tags">
            <span className="glass-chip cardd-tag">
              {TONE_LABEL[a.tone] || TONE_LABEL.neutral}
            </span>
            <span className="glass-chip cardd-tag">
              第 {index + 1} / 22 张
            </span>
          </div>

          <div className="cardd-mean" data-side={reversed ? "down" : "up"}>
            <div className="cardd-mean-row" data-on={!reversed || undefined}>
              <span className="cardd-mean-tag">正位</span>
              <p className="cn-sans cardd-mean-body">{a.up}</p>
            </div>
            <div className="cardd-mean-row" data-on={reversed || undefined}>
              <span className="cardd-mean-tag is-rev">逆位</span>
              <p className="cn-sans cardd-mean-body">{a.down}</p>
            </div>
          </div>

          <div className="cardd-actions">
            <div
              className="cardd-flip"
              role="group"
              aria-label="切换正位与逆位"
            >
              <button
                type="button"
                aria-pressed={!reversed}
                onClick={() => setReversed(false)}
                className={`cardd-flip-opt${reversed ? "" : " is-on"}`}
              >
                正位
              </button>
              <button
                type="button"
                aria-pressed={reversed}
                onClick={() => setReversed(true)}
                className={`cardd-flip-opt${reversed ? " is-on" : ""}`}
              >
                逆位
              </button>
            </div>

            <button
              onClick={onStart}
              onPointerMove={specMove}
              onPointerLeave={specLeave}
              className="spec-btn liquid-btn cardd-go"
              style={{ "--spec-bright": "0.25" }}
            >
              <span>{playName ? `以这张牌开始 · ${playName}` : "以这张牌开始占卜"}</span>
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
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
