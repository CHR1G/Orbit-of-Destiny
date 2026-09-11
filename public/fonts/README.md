# 自托管字体

两款字体**已经就位**，无需再下载：

```
public/fonts/PangMenZhengDao-XiXianTi.ttf   1.76 MB   庞门正道细线体
public/fonts/TheNightWatch.ttf                31 KB   The Night Watch
```

来源：`C:\Users\Administrator\AppData\Local\Microsoft\Windows\Fonts\`

## 字体档案

| | 庞门正道细线体 | The Night Watch |
|---|---|---|
| PostScript 名 | `PangMenZhengDao-XiXian` | `TheNightWatch-Regular` |
| 字形数 | 7834 | 81 |
| CJK (4E00–9FFF) | **6763** | **0** |
| A–Z / a–z / 0–9 | 全有 | 全有 |
| 缺字 | — | `"` `/` `·` |
| 授权 | 免费商用 | 随字体包 |

## 为什么这个组合刚好

The Night Watch **零 CJK 覆盖**，所以字体栈把它排在最前面时：

```
"TheNightWatch", "PangMenZhengDaoXiXianTi", …, serif
        │                    │
        ├─ 英文/数字命中 ─────┘
        └─ 中文字形直接穿透到细线体
```

一个栈、两款字体，不需要 `unicode-range` 拆分。
TNW 缺的 `"` `/` `·` 三个字符也会落到细线体（它有）。

## 生效范围

| 变量 | 字体 | 用在哪 |
|---|---|---|
| `--font-cn-display` | 细线体（英文走 TNW） | `.cn-serif` / `.cn-display` —— 标题、卡牌名、大字 |
| `--font-en` | The Night Watch | 拉丁字符、`.oracle-label` 标签、TarotVortex 环形文字 |
| `--font-cn-sans` | 系统黑体（英文走 TNW） | 正文小字 |

## 已知的取舍

- **The Night Watch 是装饰性 blackletter**，10px 以下字母腔全糊。
  TarotVortex 的环形字号已从 `7–17px` 提到 `9–22px` 补偿。
  如果你觉得环形太抢眼，把 `buildRings()` 里的 `fontSize` 调回去。
- **细线体也是 display 字体**，16px 以下发丝会断，所以正文小字仍走
  `--font-cn-sans`（系统黑体），只有标题和大字用细线体。

## 体积优化（可选，未做）

1.76 MB 的 TTF 对网页偏大。生产环境建议：

1. **转 WOFF2** —— 通常压到原大小 40% 左右，且 `@font-face` 已预留
   `.woff2` 位置，丢进去就自动优先命中（TTF 作兜底保留）。
2. **子集化** —— 只保留页面实际用到的汉字，可砍到 100–300 KB。
   工具：`fonttools` 的 `pyftsubset`（需要 pip 装）。
3. 生产构建下 Next.js 会对静态资源做 gzip/brotli，TTF 大约再省一半。

## 验证

DevTools → 选中标题 → Computed → `font-family`，
确认渲染用的是 `TheNightWatch` / `PangMenZhengDaoXiXianTi` 而不是 fallback。
Network 面板筛选 `font`，应看到两个 `.ttf` 请求，无外部域名。
