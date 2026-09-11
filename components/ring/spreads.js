// Spreads (牌阵) for the advanced reading.
//
// A spread is a fixed set of POSITIONS. The card is only half the reading —
// the other half is which slot it landed in, which is why every slot here
// carries its own framing sentence rather than just a label. "The Sun" in
// the outcome slot and "The Sun" in the obstacle slot are not the same
// sentence, and a reading that prints the card meaning N times under
// different headings reads like a lookup table, not an answer.
//
// Deck choice: every spread here draws from the full 78. The classical
// 圣三角 / 二择一 are often taught on the 22 majors only, but the point of
// the advanced mode is that the minors can show up and say something
// specific — that is the whole reason to carry 56 more cards.

export const SPREADS = [
  {
    id: "triangle",
    name: "圣三角",
    en: "Past · Present · Future",
    emoji: "🔺",
    sigil: "triad",
    desc: "过去 · 现在 · 未来",
    best: "短时间内的是非题、一件事的走向",
    slots: [
      { label: "过去", hint: "这件事是怎么走到这里的", frame: "起因是{zh}{rev}——{body}" },
      { label: "现在", hint: "此刻真正的状况", frame: "现在的状况是{zh}{rev}——{body}" },
      { label: "未来", hint: "照这个走法会到哪", frame: "照现在的走法，会走到{zh}{rev}——{body}" },
    ],
  },
  {
    id: "elements",
    name: "四元素",
    en: "Four Elements",
    emoji: "🌐",
    sigil: "quartet",
    desc: "行动 · 情感 · 想法 · 现实",
    best: "想把一件事的四个面一次看全",
    slots: [
      { label: "火 · 行动", hint: "你有没有在动，劲往哪使", frame: "行动力这边：{zh}{rev}——{body}" },
      { label: "水 · 情感", hint: "感受和关系的状态", frame: "情感和关系这边：{zh}{rev}——{body}" },
      { label: "风 · 想法", hint: "你的判断和沟通清不清楚", frame: "想法和沟通这边：{zh}{rev}——{body}" },
      { label: "土 · 现实", hint: "钱、资源、身体的底盘", frame: "现实和资源这边：{zh}{rev}——{body}" },
    ],
  },
  {
    id: "choice",
    name: "二择一",
    en: "Two Paths",
    emoji: "🛤️",
    sigil: "crossroads",
    desc: "现状 + 两条路各自的发展与结果",
    best: "两个选项之间拿不定主意",
    slots: [
      { label: "现状", hint: "你现在的处境", frame: "现在的处境是{zh}{rev}——{body}" },
      { label: "A 的发展", hint: "选 A 之后过程会怎样", frame: "选 A 之后，过程会是{zh}{rev}——{body}" },
      { label: "A 的结果", hint: "选 A 最后走到哪", frame: "选 A 最后会走到{zh}{rev}——{body}" },
      { label: "B 的发展", hint: "选 B 之后过程会怎样", frame: "选 B 之后，过程会是{zh}{rev}——{body}" },
      { label: "B 的结果", hint: "选 B 最后走到哪", frame: "选 B 最后会走到{zh}{rev}——{body}" },
    ],
  },
  {
    id: "celtic",
    name: "凯尔特十字",
    en: "Celtic Cross",
    emoji: "✝️",
    sigil: "cross",
    desc: "10 个位置，把一件事里外看透",
    best: "复杂的大事，想一次问清楚",
    slots: [
      { label: "现况", hint: "事情现在的样子", frame: "现在的状况是{zh}{rev}——{body}" },
      { label: "阻碍", hint: "卡住你的是什么", frame: "卡住你的是{zh}{rev}——{body}" },
      { label: "目标", hint: "你真正想要的方向", frame: "你真正想要的方向是{zh}{rev}——{body}" },
      { label: "根源", hint: "更早的原因", frame: "再往前追，根源是{zh}{rev}——{body}" },
      { label: "近期", hint: "最近发生的关键", frame: "最近发生的关键是{zh}{rev}——{body}" },
      { label: "将至", hint: "接下来会先遇到什么", frame: "接下来会先遇到{zh}{rev}——{body}" },
      { label: "你自己", hint: "你的位置和真实想法", frame: "你自己这边：{zh}{rev}——{body}" },
      { label: "周遭", hint: "别人和环境的态度", frame: "周围的人和环境的态度是{zh}{rev}——{body}" },
      { label: "希望与恐惧", hint: "你最想要的，也最怕的", frame: "你最希望、也最怕的是{zh}{rev}——{body}" },
      { label: "结果", hint: "最后会走到哪", frame: "最后会走到{zh}{rev}——{body}" },
    ],
  },
];

export const SPREAD_BY_ID = Object.fromEntries(SPREADS.map((s) => [s.id, s]));

// The five ways in, in the order the ring's menu lists them: one basic tap
// and the four spreads above. `daily` is the only entry that is not a
// spread, so it carries its own copy here; the rest are projected from
// SPREADS — add a spread to this file and it appears on the menu for free.
export const BASIC_PLAY_ID = "daily";

export const PLAYS = [
  {
    id: BASIC_PLAY_ID,
    name: "每日一牌",
    en: "Daily Draw",
    emoji: "☀️",
    sigil: "orb",
    desc: "一个问题 · 凭直觉翻一张",
    level: "basic",
  },
  ...SPREADS.map((s) => ({
    id: s.id,
    name: s.name,
    en: s.en,
    emoji: s.emoji,
    sigil: s.sigil,
    desc: s.desc,
    level: "advanced",
  })),
];

export const PLAY_BY_ID = Object.fromEntries(PLAYS.map((p) => [p.id, p]));

// Render one position: the slot's framing sentence with the card dropped in.
// The reversed marker rides on the card name, not the body — the body is
// already the reversed meaning.
export function readSlot(slot, card, reversed) {
  const body = reversed ? card.down : card.up;
  return slot.frame
    .replaceAll("{zh}", card.zh)
    .replaceAll("{rev}", reversed ? "（逆位）" : "")
    .replaceAll("{body}", body);
}

const SUIT_ELEMENT = {
  wands: "火",
  cups: "水",
  swords: "风",
  pents: "土",
};
const ELEMENT_ZH = { 火: "行动", 水: "情感", 风: "想法", 土: "现实" };

/* ------------------------------------------------------------------ *
 * The summary. This is the part that makes a multi-card spread worth
 * reading: N card meanings in a row is a table, but "six of ten came up
 * reversed and every one of them is a sword" is an actual observation the
 * visitor can act on.
 * ------------------------------------------------------------------ */
export function summarize(spread, dealt) {
  const total = dealt.length;
  const reversed = dealt.filter((d) => d.reversed).length;
  const majors = dealt.filter((d) => d.card.arcana === "major").length;
  const lines = [];

  // 1. Upright / reversed balance.
  const ratio = reversed / total;
  if (ratio === 0) {
    lines.push("全部正位：这件事的阻力不在外面，路是通的，差别只在你走不走。");
  } else if (ratio >= 0.7) {
    lines.push(
      `${total} 张里有 ${reversed} 张逆位 —— 阻力主要在里面：犹豫、没说出口的话、或者你一直在绕开的那个判断。`,
    );
  } else if (ratio >= 0.4) {
    lines.push(
      `正逆各半（${total - reversed} 正 ${reversed} 逆）：事情在推进，但有几个点被你自己卡住了。`,
    );
  } else {
    lines.push(
      `${total} 张里只有 ${reversed} 张逆位 —— 大方向是顺的，留意那张逆位指的地方就行。`,
    );
  }

  // 2. Major Arcana weight — majors are the big themes, minors are the
  //    day-to-day texture. A spread of all majors means the question is
  //    really about a life-level thing, not the thing asked.
  if (majors / total >= 0.6) {
    lines.push(
      `${majors} 张大阿卡纳：这件事比你问的要大，它牵动的不只是这一件，别只盯着眼下的结果。`,
    );
  } else if (majors === 0) {
    lines.push(
      "一张大阿卡纳都没有 —— 事情还停在具体层面上，靠调整和行动能改，不用上升到「命」。",
    );
  }

  // 3. Element / suit spread. Missing suit says as much as a strong one.
  const counts = { 火: 0, 水: 0, 风: 0, 土: 0 };
  dealt.forEach(({ card }) => {
    const el = card.arcana === "minor" ? SUIT_ELEMENT[card.suit] : null;
    if (el) counts[el] += 1;
  });
  const present = Object.entries(counts).filter(([, n]) => n > 0);
  const missing = Object.entries(counts).filter(([, n]) => n === 0);
  if (present.length) {
    present.sort((a, b) => b[1] - a[1]);
    const [topEl, topN] = present[0];
    if (topN >= 2) {
      lines.push(
        `${topEl}元素最重（${topN} 张）：重点压在「${ELEMENT_ZH[topEl]}」这一面，从这儿下手最快。`,
      );
    }
  }
  // Only call out a missing element in a spread big enough for the absence
  // to mean something — in a 3-card draw most elements are missing by
  // default and flagging it is noise.
  if (missing.length && total >= 4) {
    const names = missing.map(([el]) => `${el}（${ELEMENT_ZH[el]}）`).join("、");
    lines.push(`缺${names}：这一面你没在看，也可能你根本没把它算进考虑范围。`);
  }

  // 4. Per-spread closing line.
  if (spread.id === "celtic") {
    const outcome = dealt[9];
    if (outcome) {
      lines.push(
        `结果位是「${outcome.card.zh}」${outcome.reversed ? "逆位" : "正位"} —— 前面九张都是在往这个位置收。`,
      );
    }
  } else if (spread.id === "choice") {
    const [, , aEnd, , bEnd] = dealt;
    if (aEnd && bEnd) {
      const aUp = aEnd.reversed ? 0 : 1;
      const bUp = bEnd.reversed ? 0 : 1;
      const verdict =
        aUp === bUp
          ? "两条路的结果牌轻重接近 —— 区别在过程，选你更能扛的那条。"
          : aUp > bUp
            ? "单看结果牌，A 更顺一些。"
            : "单看结果牌，B 更顺一些。";
      lines.push(verdict);
    }
  } else if (spread.id === "triangle") {
    const last = dealt[2];
    if (last) {
      lines.push(
        `未来位是「${last.card.zh}」${last.reversed ? "逆位" : "正位"} —— 过去和现在都只是它的铺垫。`,
      );
    }
  }

  return { total, reversed, majors, counts, lines };
}
