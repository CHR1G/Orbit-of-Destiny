# 自托管字体

两款字体**已经就位**，无需再下载：

```
public/fonts/PangMenZhengDao-XiXianTi.ttf    1.76 MB   庞门正道细线体（全量 6763 个汉字）
public/fonts/PangMenZhengDao-XiXianTi.woff2    98 KB   同上，按站点用字子集化
public/fonts/TheNightWatch.ttf                 31 KB   The Night Watch（全量）
public/fonts/TheNightWatch.woff2                4 KB   同上，子集化
```

`.woff2` 由 `tools/subset_fonts.py` 生成，在 `@font-face` 里排在 `.ttf`
**前面**，所以访客只会下载到子集版本，TTF 留作兜底。

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

## 体积优化（已完成）

原来只有 TTF：细线体 1.76 MB，而线上访客实际上一次只用得到其中约 1,100 个汉字。

现在改为 **子集化 + WOFF2**，由 `tools/subset_fonts.py` 生成：

| 文件 | 之前 | 现在 | 降幅 |
|---|---|---|---|
| 细线体 | 1.76 MB (TTF) | **98 KB** (woff2) | −95% |
| The Night Watch | 31 KB (TTF) | **4 KB** (woff2) | −86% |

字集不是猜的——脚本会扫描 `app/` 与 `components/`，把**站点真正能显示的
每一个字符**收进来（含 `ring/tarot.js`、`ring/deck78.js` 里的全部牌义文案），
再跑 `pyftsubset`。所以它跟"随便挑 3000 个常用字"是两回事：覆盖率是
按源码算出来的，不是估的。

```bash
pip install "fonttools[woff]"        # 一次性，bundled brotli
python tools/subset_fonts.py         # 重新生成 public/fonts/*.woff2
python tools/subset_fonts.py --check # 只看体积，不写文件
```

### ⚠️ 改了中文文案就要重跑

子集里没有的字会**静默**落到字体栈的下一档（`Source Han Serif` /
`SimSun` 之类），没有任何报错，只是某个词换了个字形——看上去像渲染 bug，
实际是子集过期。所以：

- 新增玩法、牌义、UI 文案之后，跑一次 `python tools/subset_fonts.py`；
- 它同时是备份策略：TTF 全量文件始终留在仓库里，`.woff2` 删掉就自动
  退回旧行为，不会丢东西；
- 校验方式（本次用过的）：用 fontTools 比对两个 cmap 的差集，
  或在浏览器里把每个汉字逐个用该字体栅格化、与"不存在的字体"的栅格做比对，
  栅格完全一致即为漏字。本次实测 **1,091 字全部覆盖，零漏字**。

### 还能再小吗

`docs/tarot-art-spec.md` 式的思路同样适用于字体：如果哪天文案大幅精简，
重跑脚本会自动收窄子集。但**不建议**手工裁到刚好覆盖，那样每次改文案
都要重新验证一遍，收益只有几十 KB。

## 验证

DevTools → 选中标题 → Computed → `font-family`，
确认渲染用的是 `TheNightWatch` / `PangMenZhengDaoXiXianTi` 而不是 fallback。
Network 面板筛选 `font`，应看到两个 `.ttf` 请求，无外部域名。
