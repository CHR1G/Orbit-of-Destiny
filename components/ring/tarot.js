// Self-contained Tarot divination, no network, no API keys.
// Deterministic by (date + card) seed so the same day + same card reads
// stable — that is what makes it feel "reliable" next to a random-number
// horoscope. Reshuffle uses a random seed for a fresh draw.
// (Extension is explicit so the file also imports under plain Node ESM,
// which is how the deck-integrity check script loads it.)
import { MINOR_ARCANA, SUITS, SUIT_BY_ID } from "./deck78.js";

// 22 Major Arcana with upright / reversed readings.
export const MAJOR_ARCANA = [
  { num: "0",    zh: "愚者",     en: "The Fool",           kw: "开端 · 自由",   up: "崭新的开始，纯真无畏，前方是无限可能。",                       down: "鲁莽冲动、逃避责任，或计划尚未成熟便贸然行动。" },
  { num: "I",    zh: "魔术师",   en: "The Magician",       kw: "创造 · 行动",   up: "资源已然齐备，能把想法化为行动，充满掌控力。",                 down: "技巧未熟、操弄欺骗，或潜力未能真正发挥。" },
  { num: "II",   zh: "女祭司",   en: "The High Priestess", kw: "直觉 · 神秘",   up: "内在智慧浮现，静默中听见直觉与潜意识的低语。",                 down: "忽视直觉、隐瞒秘密，或在迷惘中看不清真相。" },
  { num: "III",  zh: "皇后",     en: "The Empress",        kw: "丰饶 · 母性",   up: "滋养与丰盛，创造力涌动，温柔中藏着力量。",                     down: "停滞与依赖，过度保护，或创造力受阻。" },
  { num: "IV",   zh: "皇帝",     en: "The Emperor",        kw: "秩序 · 权威",   up: "结构分明、纪律与领导，带来稳定与掌控。",                       down: "专断僵化、秩序失控，或滥用权力。" },
  { num: "V",    zh: "教皇",     en: "The Hierophant",     kw: "传统 · 信仰",   up: "传承与规则，导师指引，找到归属感。",                           down: "墨守成规、质疑权威，或需要另寻自己的路径。" },
  { num: "VI",   zh: "恋人",     en: "The Lovers",         kw: "爱 · 抉择",     up: "关系和谐、价值契合，迎来重要的选择。",                         down: "失衡与冲突、错误的抉择，或价值彼此背离。" },
  { num: "VII",  zh: "战车",     en: "The Chariot",        kw: "意志 · 胜利",   up: "以定力前行，克服阻碍，终获凯旋。",                             down: "方向失焦、内耗失控，或半途而废。" },
  { num: "VIII", zh: "力量",     en: "Strength",           kw: "勇气 · 柔韧",   up: "内在勇气，以柔克刚，从容驾驭自我。",                           down: "自我怀疑、情绪失控，或怯懦退缩。" },
  { num: "IX",   zh: "隐者",     en: "The Hermit",         kw: "内省 · 指引",   up: "独处沉淀，于静默中寻得那盏明灯与智慧。",                       down: "孤立逃避、迷失方向，或拒绝他人的援手。" },
  { num: "X",    zh: "命运之轮", en: "Wheel of Fortune",   kw: "循环 · 转机",   up: "时来运转，周期更迭，机遇悄然降临。",                           down: "波折低谷、抗拒变化，或一时的厄运。" },
  { num: "XI",   zh: "正义",     en: "Justice",            kw: "公正 · 因果",   up: "公平裁决，因果分明，事情得到厘清。",                           down: "不公偏颇、自欺欺人，或必须面对后果。" },
  { num: "XII",  zh: "倒吊人",   en: "The Hanged Man",     kw: "臣服 · 视角",   up: "换一个角度看世界，自愿的牺牲换来顿悟。",                       down: "无谓的牺牲、停滞抗拒，或拖延不决。" },
  { num: "XIII", zh: "死神",     en: "Death",              kw: "终结 · 重生",   up: "结束即是开始，彻底蜕变，学会放下。",                           down: "抗拒改变、陷入停滞，或被恐惧束缚。" },
  { num: "XIV",  zh: "节制",     en: "Temperance",         kw: "平衡 · 调和",   up: "中庸而和谐，耐心调和，身心得到疗愈。",                         down: "失衡与极端、操之过急，或过度放纵。" },
  { num: "XV",   zh: "恶魔",     en: "The Devil",          kw: "束缚 · 欲望",   up: "执念成缚，欲望沉溺，或受困于某种枷锁。",                       down: "挣脱枷锁、幡然觉醒，终于放下执念。" },
  { num: "XVI",  zh: "高塔",     en: "The Tower",          kw: "崩塌 · 觉醒",   up: "突变与崩解，真相揭露，破而后立。",                             down: "灾厄暂缓、恐惧未消，或只是苟延残喘。" },
  { num: "XVII", zh: "星星",     en: "The Star",           kw: "希望 · 疗愈",   up: "希望重生，宁静指引，重新找回信心。",                           down: "失望迷惘、失去信心，或疗愈被延迟。" },
  { num: "XVIII",zh: "月亮",     en: "The Moon",           kw: "幻象 · 潜意识", up: "直觉与幻梦，穿越未知的迷雾与情绪。",                           down: "真相浮现、恐惧消退，或终于释怀。" },
  { num: "XIX",  zh: "太阳",     en: "The Sun",            kw: "喜悦 · 成功",   up: "光明喜悦，活力与成功，一切清晰明朗。",                         down: "短暂的阴霾、过度乐观，或喜悦被延迟。" },
  { num: "XX",   zh: "审判",     en: "Judgement",          kw: "觉醒 · 召唤",   up: "自我审判，重生的召唤，内心释然。",                             down: "自我苛责、错失召唤，或陷入懊悔。" },
  { num: "XXI",  zh: "世界",     en: "The World",          kw: "圆满 · 完成",   up: "圆满达成，周期完成，万物融合一体。",                           down: "未竟之憾、收尾拖延，或仍留缺口。" },
];

// Card artwork: Rider–Waite–Smith style, the real deck in /public/tarot.
//   major_NN.webp              00 Fool .. 21 World, matching this array 1:1
//   minor_<suit>_NN.webp       01 Ace .. 14 King per suit (see deck78.js)
//   back.webp
MAJOR_ARCANA.forEach((c, i) => {
  c.img = `/tarot/major_${String(i).padStart(2, "0")}.webp`;
  c.arcana = "major";
});
// The complete 78-card deck: 22 majors (above) + 56 minors. Majors first
// so the classic 0..XXI ordering still reads left to right.
export const FULL_DECK = [...MAJOR_ARCANA, ...MINOR_ARCANA];
export { MINOR_ARCANA, SUITS, SUIT_BY_ID };

// Deal `count` cards with no repeats. Separate from drawOracle because a
// spread is a different contract: it wants N distinct cards in fixed
// positions, not a hand of four to choose between.
export function dealSpread(count, seedStr, deck = FULL_DECK) {
  const rng = makeRng(seedStr);
  const idx = [...Array(deck.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // ~30% reversed, matching the rest of the deck logic.
  return idx
    .slice(0, Math.min(count, deck.length))
    .map((i) => ({ card: deck[i], reversed: rng() > 0.7 }));
}

// A spread's seed is day + card + spread + question, so the same question
// on the same day deals the same cards (closing and reopening cannot
// re-roll), while a different question — or a reshuffle — deals fresh ones.
export function buildSpreadSeed(card, spreadId, topicId, question, baseSeed, shuffle = 0) {
  const q = topicId === CUSTOM_TOPIC_ID ? (question || "").trim() : "";
  return [
    baseSeed || todayStr(),
    card?.en || card?.zh || "",
    spreadId,
    topicId || "",
    q,
    shuffle,
  ].join("|");
}

export const TAROT_BACK = "/tarot/back.webp";

export function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Deterministic PRNG (xmur3 seed -> mulberry32 stream).
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr) {
  const s = xmur3(seedStr);
  return mulberry32(s());
}

// One concrete thing to do today, keyed off the card's TONE rather than an
// element: the zodiac that used to drive this is gone, and light / shadow /
// neutral is the axis the deck itself is written on. Three per tone so the
// same reading does not hand out the same sentence twice running.
const TONE_HINTS = {
  light: [
    "主动开口，把憋着的那句话说出去",
    "把最想做的那件事提前 30 分钟",
    "今天允许自己先开心一次，再谈别的",
  ],
  shadow: [
    "先把最乱的那一个角落收拾干净",
    "把担心的那件事写下具体日期和代价",
    "给自己留 30 分钟，什么都不决定",
  ],
  neutral: [
    "列出三件今天必须完成的小事",
    "关掉 3 个通知源 1 小时",
    "出去走 15 分钟，回来再看这件事",
  ],
};

function pickAction(tone, rng) {
  const actions = TONE_HINTS[tone] || TONE_HINTS.neutral;
  return actions[Math.floor(rng() * actions.length)];
}

// Kick off the 1.8MB of tarot art the moment a reading is requested, so the
// card art is on disk by the time the overlay paints its first frame. Pure
// browser cache after the first visit; the request budget is the first cost.
let _preloaded = false;
export function preloadTarotImages() {
  if (_preloaded || typeof window === "undefined") return;
  _preloaded = true;
  const warm = (src) => { const i = new Image(); i.decoding = "async"; i.src = src; };
  MAJOR_ARCANA.forEach((c) => warm(c.img));
  warm(TAROT_BACK);
}

/* ------------------------------------------------------------------ *
 * 大众占卜 (group reading) — the format that actually travels.
 *
 * The older flow handed the visitor a card the moment they tapped a plate.
 * That reads as a horoscope widget, and it skips the two things that make
 * a reading land:
 *
 *   1. a QUESTION.  "What am I asking about?" has to come first, or the
 *      text is generic enough to be ignored.
 *   2. a CHOICE.  Picking your own card (Jung's synchronicity, plus
 *      plain self-attribution) makes the same sentence feel aimed at you.
 *      Handing someone a card never does.
 *
 * So the flow is: pick a topic -> breathe and hold the question -> pick
 * one of four face-down cards by first instinct -> reveal, with a card
 * you can screenshot.
 * ------------------------------------------------------------------ */

// The topics that carry the category. Ordered by what people actually tap,
// not by any mystical logic: the hook line is the whole click-through, so
// each one is a question a visitor is already asking themselves.
//
// `group` drives the sub-headings on the topic screen. Nine flat tiles is
// past the point where people scan them — they read as a wall. Three short
// labelled rows turn the same nine into "which of these am I", which is the
// decision they were making anyway.
//
// `person` marks a topic whose answer points at a specific somebody. Those
// get a 他/她 toggle: the reading says "他/她" until the visitor picks one,
// and every mention resolves to that choice.
export const TOPICS = [
  {
    id: "love",
    emoji: "💔",
    label: "感情",
    group: "relation",
    person: true,
    hook: "他/她到底怎么想的",
    prompt: "在心里默念那个人的名字",
    hint: "暧昧 · 复合 · 他/她有没有在想你",
  },
  {
    id: "career",
    emoji: "💼",
    label: "事业",
    group: "path",
    hook: "这次能成吗",
    prompt: "在心里默念那件悬着的事",
    hint: "offer · 晋升 · 该不该走",
  },
  {
    id: "money",
    emoji: "💰",
    label: "财运",
    group: "path",
    hook: "钱什么时候进来",
    prompt: "在心里默念这个月的账单",
    hint: "进账 · 破财 · 该不该花",
  },
  {
    id: "study",
    emoji: "📚",
    label: "学业",
    group: "path",
    hook: "这次考试能过吗",
    prompt: "在心里默念那场考试或那门课",
    hint: "考试 · 升学 · 该不该换方向",
  },
  {
    id: "health",
    emoji: "🌿",
    label: "健康",
    group: "self",
    hook: "身体在提醒我什么",
    prompt: "在心里默念最近身体的小信号",
    hint: "作息 · 情绪 · 该不该去检查",
  },
  {
    id: "friendship",
    emoji: "🤝",
    label: "人际",
    group: "relation",
    person: true,
    hook: "这段关系该怎么处",
    prompt: "在心里默念那个人的名字",
    hint: "朋友 · 同事 · 误会该不该说开",
  },
  {
    id: "move",
    emoji: "🧭",
    label: "去留",
    group: "path",
    hook: "我该留下还是离开",
    prompt: "在心里默念那个城市或那份选择",
    hint: "搬家 · 换城市 · 该不该走",
  },
  {
    id: "family",
    emoji: "🏠",
    label: "家庭",
    group: "relation",
    hook: "家里这件事会怎么发展",
    prompt: "在心里默念家里那件搁着的事",
    hint: "家人 · 矛盾 · 该不该先开口",
  },
  {
    id: "today",
    emoji: "✨",
    label: "今日指引",
    group: "self",
    hook: "今天有什么在等我",
    prompt: "在心里默念今天",
    hint: "一句话提醒 · 今日行动",
  },
];

// The custom entry is kept out of TOPICS so no generic code path ever has
// to special-case it: it has no copy tables of its own and borrows the
// "今日指引" ones at reveal time (see LINE_TOPIC).
export const CUSTOM_TOPIC_ID = "custom";

export const TOPIC_GROUPS = [
  {
    id: "relation",
    label: "关系",
    desc: "跟某个人的事",
    ids: ["love", "friendship", "family"],
  },
  {
    id: "path",
    label: "前路",
    desc: "方向、钱和去留",
    ids: ["career", "study", "money", "move"],
  },
  {
    id: "self",
    label: "自身",
    desc: "关于你自己",
    ids: ["health", "today"],
  },
];

export const TOPIC_BY_ID = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

// Resolve the "他/她" placeholder. The copy is authored once with the
// slash form and resolved late — after the visitor has picked — so there
// is no second copy of every love reading to keep in sync. Unresolved it
// falls back to 对方, which reads fine but is vaguer; picking is better.
export function applyGender(text, gender) {
  if (!text) return text;
  if (gender === "m") return text.replaceAll("他/她", "他");
  if (gender === "f") return text.replaceAll("他/她", "她");
  return text.replaceAll("他/她", "对方");
}

// Every major arcana leans light, shadow, or somewhere between. The tone
// picks which topic paragraph the card gets, so 22 cards x 4 topics stay
// writable (and stay distinct) instead of needing 88 hand-written readings.
const TONE_BY_ZH = {
  愚者: "light", 魔术师: "light", 女祭司: "neutral", 皇后: "light",
  皇帝: "neutral", 教皇: "neutral", 恋人: "light", 战车: "light",
  力量: "light", 隐者: "neutral", 命运之轮: "light", 正义: "neutral",
  倒吊人: "shadow", 死神: "shadow", 节制: "neutral", 恶魔: "shadow",
  高塔: "shadow", 星星: "light", 月亮: "shadow", 太阳: "light",
  审判: "neutral", 世界: "light",
};
MAJOR_ARCANA.forEach((c) => { c.tone = TONE_BY_ZH[c.zh] || "neutral"; });

// Headline hooks. The "your card + a time limit + a number" formula is the
// whole reason these posts get opened, so the reveal opens on one too.
const HEADLINES = {
  love: {
    light: ["未来 7 天，这段关系会先给你一个信号", "有 1 句话，他/她一直没说出口", "3 天内，你们的距离会缩短一点"],
    neutral: ["这件事，答案不在他/她身上", "你要的答案，其实你已经知道了", "72 小时里，别急着先开口"],
    shadow: ["先停下来：你现在看到的不是全部", "有 1 件事，你一直在骗自己", "这段关系里，卡住的不是他/她"],
  },
  career: {
    light: ["这次，成面比你想的大", "14 天内会有一个明确回应", "你手上其实已经握着筹码"],
    neutral: ["先别动，再等 5 天", "答案藏在一个你没考虑的选项里", "现在差的不是能力，是时机"],
    shadow: ["有件事该结束了，越拖越贵", "你在为一个不成立的前提努力", "30 天内，会有一次被迫的调整"],
  },
  money: {
    light: ["这个月，钱会从一个意外的方向进来", "有一笔你忘了的账，会回来", "进账在 10 天内"],
    neutral: ["不是没钱，是钱卡住了", "这个月该守，不该攻", "有一笔支出，你现在还看不见"],
    shadow: ["先堵住这个漏口，再谈进账", "有 1 笔钱，不该由你出", "这个月别做大额决定"],
  },
  study: {
    light: ["这次，你已经准备得比想象中足", "成绩会比你担心的好一点", "有一门你低估的科目，会给你惊喜"],
    neutral: ["现在缺的不是时间，是节奏", "答案藏在你还没做的那些题里", "先别换方向，再撑两周"],
    shadow: ["你在用一个错误的方法硬扛", "有件事该重新评估了", "别让焦虑替你做决定"],
  },
  health: {
    light: ["身体其实在往好的方向走", "这个信号，是提醒而不是警报", "休息，就是你当下最该做的事"],
    neutral: ["别自己吓自己，先看清楚", "身体的信号，要听但别过度解读", "节奏该调了，趁现在"],
    shadow: ["有一件事，你拖得有点久了", "别硬撑，身体已经在抗议", "这个信号值得你去确认一次"],
  },
  friendship: {
    light: ["这段关系，底色还是暖的", "误会会在这几天自己松一点", "一次坦诚，比十次猜测有用"],
    neutral: ["答案不在对方，在你自己的边界", "这段关系，需要你重新量一下距离", "先别急着定性，再看看"],
    shadow: ["有个人，一直在消耗你", "这段关系已经不对等了", "该说的，这次别吞回去"],
  },
  move: {
    light: ["离开，会打开一个更大的口子", "留下，也有你还没看见的好", "这个选择，比你想的更有余地"],
    neutral: ["先别急着定，信息还没齐", "你纠结的不是走不走，是怕选错", "两条路都有代价，先看哪条你能扛"],
    shadow: ["你其实已经知道答案了", "拖着不走，才是最大的成本", "这个决定，越拖越难"],
  },
  family: {
    light: ["这件事，会有一个软着陆", "先开口的那个人，反而更轻松", "家里的事，正在慢慢转好"],
    neutral: ["问题不在对错，在谁先放下面子", "这个结，需要换一种解", "先别急着站队，先听"],
    shadow: ["有句话，一直没人敢说", "你在替一家人扛一件不该你扛的事", "这件事的根源，比表面深"],
  },
  today: {
    light: ["今天有 1 件好事，藏在小事里", "今天适合先迈出那一步", "今天的运气，要靠你自己去接"],
    neutral: ["今天，慢一点反而更快", "今天别急着给答案", "今天有一件事，需要你先放下"],
    shadow: ["今天先避开这件事", "今天你的判断会被情绪带偏", "今天有一句不该说的话"],
  },
};

// The topic paragraph — the part the visitor actually reads themselves into.
// Written second-person and specific on purpose: vague comfort reads as
// filler, while "you've been pretending you're fine with this" gets screenshotted.
const TOPIC_LINES = {
  love: {
    light: {
      up: "你在意的这段关系，能量是通的。{kw}落在这里，说明他/她并不是无动于衷——只是他/她表达的方式跟你期待的对不上。别再用「没做就是不在乎」去推断，去看他/她做了什么，而不是没做什么。",
      down: "这段关系其实没你想的那么糟，但你一直在用最坏的剧本预演它。{kw}逆位在这里，是在说你的不安全感跑到了事情前面。先把脑补停下来，问一句实际的，答案会比你想的简单。",
    },
    neutral: {
      up: "这段关系现在卡在「谁先开口」上，而不是卡在感情本身。{kw}这张牌要你先看清楚：你到底在等他/她给一个答案，还是在等自己下决心。答案不在他/她身上。",
      down: "你现在问错了问题。你在问「他/她爱不爱我」，但这张牌想让你问「我为什么需要他/她来证明」。{kw}逆位指向的是你自己的那个缺口，跟他/她是谁关系不大。",
    },
    shadow: {
      up: "有件事你一直知道，但一直在绕开它。{kw}落在这里，不客气地说：这段关系里有不对等，而你已经在替他/她找借口了。看清它，不是要你现在就走，是要你别再自我说服。",
      down: "你以为放不下的是他/她，其实放不下的是你已经投进去的时间。{kw}逆位在提醒你：沉没成本不是继续的理由。这段时间最难的部分，是承认自己看走了眼。",
    },
  },
  career: {
    light: {
      up: "这件事的成面比你现在感觉到的要大。{kw}说明你的准备已经够了，缺的只是把东西递出去那一下。别再改第 12 版了，先交。",
      down: "不是能力问题，是你把自己藏起来了。{kw}逆位说明你手里有牌，但一直在等一个「准备好」的感觉——那个感觉不会来。先做，再补。",
    },
    neutral: {
      up: "现在不是发力的时候，是等的时候。{kw}落在这里，意思是局面还没定，你提前动作只会把自己暴露在没必要的位置上。再等几天，让该发生的事先发生。",
      down: "你在两条路之间反复横跳，代价是每一条都走了一半。{kw}逆位指向的是你的犹豫，不是选项本身。挑一个，剩下的靠执行补。",
    },
    shadow: {
      up: "有件事其实已经结束了，你还在给它续命。{kw}的意思很直接：继续投入的每一分都是净亏损。越早认，越便宜。",
      down: "你在忍，但没有在换。{kw}逆位说的是：你以为的「再熬一下」其实是在原地。要么谈条件，要么开始看外面，光忍着不算策略。",
    },
  },
  money: {
    light: {
      up: "这个月的钱不是没有，是还没走到你手上。{kw}说明进账在路上，而且大概率不是你盯着的那一条——留意一下意外的方向。",
      down: "你低估了自己手上的东西。{kw}逆位在说：能变现的资源你已经有了，只是你一直没把它当回事。这周把它拿出来用一次。",
    },
    neutral: {
      up: "这个月的主旋律是「守」。{kw}落在这里，不建议做大额动作：不是会亏，是现在信息不够，动就是赌。先把账看清楚。",
      down: "有一笔支出你现在还没算进去。{kw}逆位在提醒：不是大事，是那种「反正也不多」的连续小钱。这个月先把漏口堵上。",
    },
    shadow: {
      up: "有一笔钱，不该由你出。{kw}说得很清楚：你在为别人的问题买单，而且已经习惯了。这次可以拒绝。",
      down: "你在用花钱解决一个不是钱的问题。{kw}逆位指向的是情绪消费——买完那一下很爽，然后更空。这个月先别在晚上做消费决定。",
    },
  },
  study: {
    light: {
      up: "你的底子比你以为的扎实。{kw}说明最难的已经过去了，剩下的就是稳住节奏、把会的都拿到分。别临时换方法，就用你顺手的。",
      down: "你不是不会，是最近太乱了。{kw}逆位在说：方法没问题，是状态和作息在拖你。先把睡眠和作息拉回来，成绩会跟着回来。",
    },
    neutral: {
      up: "现在拼的不是时长，是节奏。{kw}落在这里，提醒你把大目标拆小：一天只攻一个点，反而走得动。别跟别人比进度。",
      down: "你在几个方向之间来回换，结果哪一个都没沉淀。{kw}逆位指向的是你的摇摆。认准一个，先跑完一段再说换不换。",
    },
    shadow: {
      up: "有一个错误的方法，你已经在上面耗太久了。{kw}说得很直接：继续这么学，效率会越来越低。停下来，换一种思路。",
      down: "你被「来不及了」这个念头压住了。{kw}逆位提醒：焦虑本身在吃掉你本来能做好的部分。先做一张卷子找回手感，别想结果。",
    },
  },
  health: {
    light: {
      up: "你的身体在给你回馈，只是你还没注意到。{kw}说明往好的方向走，但需要你配合——尤其是睡觉和吃饭这两件最朴素的事。",
      down: "你不是真的病了，是把自己用得太狠。{kw}逆位在提醒：这段时间的疲惫，是身体在喊停。把休息当成正经事来做。",
    },
    neutral: {
      up: "身体的这个信号，是提醒不是警报。{kw}落在这里，建议你观察而不是恐慌：先规律作息一周，再看它还在不在。",
      down: "别自己上网查病。{kw}逆位在说：你的焦虑会把一个普通的信号放大。该确认就去确认一次，别在心里反复猜。",
    },
    shadow: {
      up: "有一件事，你拖得有点久了。{kw}说得很清楚：这个信号值得你去认真确认一次，别用「应该没事」把它盖过去。",
      down: "你在透支，而且自己知道。{kw}逆位提醒：继续硬撑，身体会用更硬的方式喊停。现在停，比以后被迫停划算。",
    },
  },
  friendship: {
    light: {
      up: "这段关系的底色还是暖的。{kw}说明他/她并没有走远，只是这段时间各忙各的。主动约一次，或者发一句问候，温度就回来了。",
      down: "你在用一次不愉快，定义整段关系。{kw}逆位在说：别让一个误会盖掉之前所有的好。说开，比冷战便宜。",
    },
    neutral: {
      up: "这段关系需要你重新量一下距离。{kw}落在这里，不是让你疏远，是让你找到舒服的边界——近了累，远了冷。",
      down: "你在纠结「该不该说」，结果憋成了内耗。{kw}逆位指向的是：有些话不说，关系才会真的坏。挑一句最该说的，先讲出来。",
    },
    shadow: {
      up: "有一个人，一直在消耗你。{kw}说得很直接：这段关系已经不对等了，你的付出没有回流。是时候收一收，不是绝交，是止损。",
      down: "你怕失去这段关系，所以一直在忍。{kw}逆位提醒：靠忍维持的关系，早晚会断。先把自己从「讨好」里摘出来。",
    },
  },
  move: {
    light: {
      up: "无论留下还是离开，结果都会比你想的舒展。{kw}说明这个选择不是单选题，两条路都有光。跟着你真正想要的走，而不是跟着怕。",
      down: "你不是没得选，是没敢选。{kw}逆位在说：你心里其实已经偏向一边了，只是怕错了要负责。先承认那个偏好吧。",
    },
    neutral: {
      up: "现在信息还没齐，别急着定。{kw}落在这里，建议你再观察几天，把关键的那几个条件落实了再下决心。",
      down: "你纠结的不是走不走，是怕选错。{kw}逆位指向的是：你缺的不是答案，是承担后果的底气。先想清楚最坏能坏到哪。",
    },
    shadow: {
      up: "你其实早就知道答案了。{kw}说得很清楚：拖着不决定，本身就是一种决定，而且是最贵的那种。",
      down: "离开的代价你算了一遍又一遍，留下的好处却从没细想过。{kw}逆位提醒：换一个视角，这个决定会轻很多。",
    },
  },
  family: {
    light: {
      up: "这件事会有一个软着陆。{kw}说明家里的氛围正在回暖，只是需要有人先递一个台阶。别管谁对谁错，先接住那个信号。",
      down: "你太想把家里的事一次理顺，反而把自己压垮了。{kw}逆位在说：很多事急不得，先顾好自己，再谈别的。",
    },
    neutral: {
      up: "问题不在对错，在谁先放下面子。{kw}落在这里，提醒你：一家人，赢了对错往往输了关系。先把情绪摘出来，再谈事。",
      down: "你在替一家人扛一件不该你一个人扛的事。{kw}逆位指向的是：这个担子可以分出去，你不必什么都说好。",
    },
    shadow: {
      up: "有一句话，一直没人敢说。{kw}说得很直接：这件事的根源比表面深，回避只会让它继续发酵。挑一个合适的时机，把话放出来。",
      down: "你在用沉默维持表面的和平，代价是自己一直在消耗。{kw}逆位提醒：真正的和解，从来不靠咽下去。",
    },
  },
  today: {
    light: {
      up: "今天的能量是顺的，但好事不会自己敲门。{kw}在说：今天适合主动一点，那个你一直想联系的人、想提的事，就在今天。",
      down: "今天你容易把自己缩起来，但外面的条件是好的。{kw}逆位提醒你：机会在，只是你今天不太想伸手。逼自己迈一小步就行。",
    },
    neutral: {
      up: "今天适合收，不适合攻。{kw}的意思是先把该收的尾收掉——一件你拖了很久的小事，今天就它了。",
      down: "今天你的注意力会被打散。{kw}逆位在说：别接第一个插进来的需求，先把手上那件做完。慢一点，反而更快。",
    },
    shadow: {
      up: "今天有一件事你不该碰。{kw}落在这里，指向一个你现在很想做、但做了会后悔的动作。拖一天，明天再看。",
      down: "今天你的判断会被情绪带偏，尤其是晚上。{kw}逆位提醒：今天不做重大决定，不做消费决定，不回那条让你上头的消息。",
    },
  },
};

// 多做 / 少做 — two lines max. A reading people act on beats a reading
// people nod at, so every reveal ends with something concrete.
const DO_LINES = {
  love: { light: "主动给一个具体的信号，别等他/她猜", neutral: "先把你的需求说清楚，再说感受", shadow: "先对自己诚实一次" },
  career: { light: "把东西交出去，别再改了", neutral: "列出你的底线，再谈下一步", shadow: "算一次真实成本（时间也算）" },
  money: { light: "记一笔进账，哪怕很小", neutral: "这个月只做计划内的支出", shadow: "列出三笔可以立刻停掉的花销" },
  study: { light: "把会的题再稳一遍，别贪新", neutral: "定一个小目标，今天只攻它", shadow: "换一个方法，别再硬扛旧的" },
  health: { light: "今晚早睡一小时", neutral: "规律作息一周，先观察", shadow: "预约一次检查，别拖" },
  friendship: { light: "主动约一次，或发句问候", neutral: "把边界说清楚，别模糊", shadow: "把这份关系降一级，先顾自己" },
  move: { light: "列出你最想要的三个条件", neutral: "再观察几天，补全信息", shadow: "给决定设一个最后期限" },
  family: { light: "先递一个台阶，别管对错", neutral: "把情绪摘出来，再谈事", shadow: "挑一句最该说的话，放出来" },
  today: { light: "今天主动迈一步", neutral: "先做完手上那件", shadow: "今天拖一天，明天再决定" },
};
const AVOID_LINES = {
  love: { light: "别用沉默测试他/她", neutral: "别在深夜发长消息", shadow: "别再替他/她找借口" },
  career: { light: "别等「准备好」", neutral: "别同时押两条路", shadow: "别再用时间换希望" },
  money: { light: "别把钱放着不动", neutral: "别做大额决定", shadow: "别在晚上消费" },
  study: { light: "别临时换方法", neutral: "别跟别人比进度", shadow: "别让焦虑替你决定" },
  health: { light: "别熬夜赶进度", neutral: "别自己上网查病", shadow: "别用「应该没事」盖过去" },
  friendship: { light: "别让一个误会盖掉全部", neutral: "别憋着不说", shadow: "别再用讨好换关系" },
  move: { light: "别跟着怕走", neutral: "别急着下决心", shadow: "别一直拖着不选" },
  family: { light: "别争对错", neutral: "别急着站队", shadow: "别再用沉默维持和平" },
  today: { light: "别把好事让出去", neutral: "别接第一个插进来的需求", shadow: "别回那条让你上头的消息" },
};

function fill(tpl, card) {
  return tpl.replaceAll("{kw}", card.kw).replaceAll("{card}", card.zh);
}

const FALLBACK_TOPIC =
  TOPICS.find((t) => t.id === "today") || TOPICS[TOPICS.length - 1];

// A custom question has no copy tables of its own — writing a full
// light/neutral/shadow × upright/reversed set for free text is impossible.
// It borrows the 今日指引 ones, which are deliberately the most general.
function buildTopic(topicId, question) {
  if (topicId !== CUSTOM_TOPIC_ID) return TOPIC_BY_ID[topicId] || FALLBACK_TOPIC;
  const q = (question || "").trim().slice(0, 40);
  return {
    id: CUSTOM_TOPIC_ID,
    emoji: "✍️",
    label: "自定义",
    group: null,
    // A question someone bothered to type is often about somebody. Offer
    // the toggle; the copy usually has no 他/她 in it and the call is a no-op.
    person: true,
    custom: true,
    hook: q || "我自己的问题",
    prompt: "在心里默念你刚刚写下的那句话",
    hint: q ? `你问的是：${q}` : "写下你真正想问的那句话",
  };
}

function copyTable(table, topicId) {
  // Unknown id (a stale localStorage value, say) falls back to 今日指引
  // rather than crashing on `undefined[tone]`.
  return table[topicId] || table[CUSTOM_TOPIC_ID] || table.today;
}

// The four face-down cards the visitor chooses between. Drawn from the same
// deterministic stream as everything else, so the same day + same card +
// same topic always deals the same four — no re-rolling by closing and
// reopening the overlay to fish for a better card.
export function drawOracle(card, topicId, seed, question) {
  const topic = buildTopic(topicId, question);
  // A custom question mixes its own text into the seed: two different
  // questions should not deal the same four cards just because it is the
  // same day.
  const seedStr =
    seed ||
    `${todayStr()}_${card.en || card.zh}_${topic.id}${
      topic.custom ? `_${topic.hook}` : ""
    }`;
  const rng = makeRng(seedStr);

  const idx = [...Array(MAJOR_ARCANA.length).keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  // Four cards of mixed tone, so a pick never feels like a foregone
  // conclusion: force at least one light and one shadow into the hand.
  const hand = idx.slice(0, 4).map((i) => MAJOR_ARCANA[i]);
  if (!hand.some((c) => c.tone === "light")) {
    hand[Math.floor(rng() * 4)] = MAJOR_ARCANA.find((c) => c.tone === "light");
  }
  if (!hand.some((c) => c.tone === "shadow")) {
    hand[Math.floor(rng() * 4)] = MAJOR_ARCANA.find((c) => c.tone === "shadow");
  }

  return {
    card,
    topic,
    hand: hand.map((c, k) => ({
      key: "ABCD"[k],
      card: c,
      reversed: rng() > 0.7,
    })),
    seed: seedStr,
  };
}

// Turn the picked card + topic into the reveal. Everything here is derived,
// deterministic, and offline — no API, no model.
//
// `gender` ("m" | "f" | null) resolves the 他/她 placeholder written into
// the person topics. It is applied here rather than at authoring time so
// the copy lives once and the same reading reads correctly either way.
//
// No sign argument any more: the card the ring stopped on only ever fed the
// seed and the element, and the element is gone with the zodiac. The one
// concrete action now comes off the PICKED card's own tone, which is closer
// to the answer anyway — "do this" should follow the card you turned, not
// the one that happened to be facing front.
export function revealCard(oracle, pickKey, gender) {
  const pick = oracle.hand.find((h) => h.key === pickKey) || oracle.hand[0];
  const { card, reversed } = pick;
  const topicId = oracle.topic.id;
  const tone = card.tone;
  const g = (s) => applyGender(s, gender);

  // Seed the "flavour" numbers off the exact pick so re-opening the same
  // reading reproduces them (a screenshot taken tomorrow still matches).
  const rng = makeRng(`${oracle.seed}_${pickKey}`);
  const hookPool = copyTable(HEADLINES, topicId)[tone];
  const headline = g(hookPool[Math.floor(rng() * hookPool.length)]);

  const lines = copyTable(TOPIC_LINES, topicId)[tone];
  const onTopic = g(fill(reversed ? lines.down : lines.up, card));

  const luckyNum = 1 + Math.floor(rng() * 9);
  const luckyHour = [9, 11, 14, 16, 19, 21][Math.floor(rng() * 6)];
  // Social proof without a backend: a stable base derived from the card,
  // so the number is plausible and never resets to zero on a fresh load.
  const samePick = 120 + Math.floor(rng() * 880);
  const doTable = copyTable(DO_LINES, topicId);
  const avoidTable = copyTable(AVOID_LINES, topicId);

  return {
    key: pickKey,
    card,
    reversed,
    topic: oracle.topic,
    // The question as asked — gender-resolved for presets, verbatim for
    // custom. The reveal and the share card both read from here, so what
    // was asked is never paraphrased back at the visitor.
    question: g(oracle.topic.hook),
    headline,
    core: reversed ? card.down : card.up,
    onTopic,
    doLine: g(doTable[tone]),
    avoidLine: g(avoidTable[tone]),
    action: pickAction(tone, rng),
    luckyNum,
    luckyHour,
    samePick,
    gender: gender || null,
  };
}
