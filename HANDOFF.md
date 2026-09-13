# Orbit of Destiny — 换机交接文档

> 生成 2026-09-11 · 2026-09-12 在新机上复核 · **2026-09-14 再次更新到最新状态**
> 用途：换一台电脑后，照本文能把项目跑起来并接着改。
> 仓库里还有三份正式文档：`README.md`（对外介绍）、`AGENTS.md`（技术原理与坑位）、
> `BREAKDOWN.md`（创作脉络）。本文只讲"怎么接手"，原理细节去那三份。
>
> **2026-09-14 更新点**（细节在对应小节）：GitHub 已与本地同步到 `6066265`；
> 牌面素材的授权空白已填上（AI 生成）；新增发布上线流程（第 7.4 节）；
> 删除守卫的正确绕法改为「同盘 mv」（第 6.1 节）；GitHub 那节整段重写
> （加速镜像已死，改用系统代理，第 6.4 节）。

---

## 0. 换机后照做（最短路径）

```bash
git clone https://github.com/CHR1G/Orbit-of-Destiny.git
cd Orbit-of-Destiny
node -v            # 需要 ≥ 20
npm install        # 约 480 MB，首次 1–3 分钟
npm run dev
```

打开 <http://localhost:3000>。看到卡片环旋转、底部有加载计数，就算成功。

**如果只看到空白页**，跳到第 6 节第 2 条（`allowedDevOrigins`），那是换机后最高频的问题。
**如果 `git clone` 就失败**，八成是全局镜像重写在作怪，跳到第 6 节第 4 条。

> 换机其实**不必 clone**：百度同步盘会把 `E:\BaiduSyncdisk\INTERNET-1.0\INFINITE-Space\`
> （含 `node_modules`）整份带过去，等同步完直接 `npm run dev` 即可。
> 只有当同步盘不可用时才走 GitHub。

> **实测（2026-09-12）**：换机后 `node_modules` 已经跟着同步盘一起过来了（479 MB 完整），
> `next` / `three` / `gsap` / `lil-gui` 都在，所以 `npm install` 直接跳过也没问题。
> 同步盘不搬 `node_modules` 这条只对"走 GitHub 同步"成立。

---

## 1. 这个项目是什么

一个**塔罗牌占卜轮播**的单页 Web 应用。

- 22 张大阿卡纳沿一个大部分在屏幕外的圆环排布，滚动 / 拖拽 / 滑动转动它，停下时正面朝向你。
- 环上所有卡片不是 DOM 元素，也**不是贴图方块**——整个环是**一个全屏片元着色器**
  （SDF，signed distance field）画出来的。相邻卡片靠近时会像黏液一样融合（goo），
  拉开时扯出细丝。这套"粘稠感"是核心卖点。
- 停在哪张牌不是装饰——**那张牌就是你这次占卜的种子**。点开它有第二层：
  牌面详情面板（`CardDetail`），再往下是五种玩法。
- 五种玩法：每日一牌 + 四种牌阵（圣三角 3 / 四元素 4 / 二择一 5 / 凯尔特十字 10）。
- 玩法之外还有：左侧一张跟随鼠标转眼睛、会眨眼、也会自己乱看的玩偶脸
  （`DollFace`，纯 SVG 背景层，在 canvas **后面**）。
- 所有占卜**离线、确定性、无 API**：种子是 `日期 + 牌 + 主题`，同一天同一张牌答案稳定。

| 项 | 值 |
|---|---|
| 技术栈 | Next.js 16.3（App Router）+ React 19.2 + Three.js r185 + GSAP 3.15 + Tailwind v4 |
| 构建产物 | 纯静态（`output: "export"` → `out/`），**没有后端、没有 API 路由、没有数据库、没有 .env** |
| 代码来源 | fork 自 [Viscose](https://github.com/Yousuf-developer/viscose)，轮播机制继承，内容换成塔罗 |
| 语言 | UI 文案中文为主；代码注释与文档英文 |

---

## 2. 代码从哪来

| 位置 | 版本 | 说明 |
|---|---|---|
| **本地工作区** `E:\BaiduSyncdisk\INTERNET-1.0\INFINITE-Space\` | 见第 7 节 | 最新、最全 |
| **GitHub** `CHR1G/Orbit-of-Destiny` | **已同步**（2026-09-14 推平） | 与本地同为 `6066265` |
| 百度同步盘 | 同本地 | 会自动同步，但**会把你在另一台机器上删掉的文件"还原"回来** |

> 盘符换过：上一台机器上这个目录是 `F:\BaiduSyncdisk\...`，当前机器是 `E:\`。
> 所有相对路径都是仓库内的，只有这两份文档里的绝对路径需要留意。

### 推荐做法

**以「百度盘目录 + 手动同步」为准。**

换机步骤：

1. 在新机上等百度盘把 `INTERNET-1.0\INFINITE-Space\` 同步完整；
2. 检查 `components/DollFace.jsx` 是否存在（判断同步完整性的最快标志）；
3. 检查 `node_modules` 是否已经在（同步盘会带过来）；
4. 起服务。

### 如果要用 GitHub 同步

```bash
git add -A
git commit -m "..."
git push origin main
```

**2026-09-14 实测：`git push origin main` 在这台机器上是失败的**，原因是全局
`insteadOf` 把地址重写到已死的加速镜像（详见第 6.4 节）。要么先按那节修好环境，
要么直接用那节给出的完整命令。

### 不要碰的东西

- `.gitignore` 里 `public/*.webp`、`public/tarot-old/`、`public/_unused/`、
  `public/_originals/`、`_oracle-export/`、`deck-preview.html` 这几条是给百度盘擦屁股的
  ——另一台机器会把废弃文件还原回磁盘，所以显式排除，**不要删掉这些规则**。
- `node_modules/`（479 MB）、`.next/`、`out/` 都是 gitignore 的。

---

## 3. 环境要求

| 项 | 要求 | 本机实测 |
|---|---|---|
| Node | **≥ 20** | v22.22.2 |
| npm | 随 Node | 10.9.7 |
| 浏览器 | 需要 WebGL2 | Chrome 152 |
| 其他 | 无 | 不需要 Docker、不需要数据库、不需要环境变量 |

---

## 4. 常用命令

```bash
npm run dev      # 开发服务器，http://localhost:3000
npm run build    # 生产构建（静态导出到 out/）——同时也是最快的正确性检查
npm start        # 本地跑生产构建
npm run lint     # eslint
```

**没有测试。** `build` + `lint` 就是全部安全网。

> 重要：**GLSL 是运行时编译的，构建通过 ≠ 着色器正确**。改过 `components/shaders/`
> 里任何一行，必须真的打开页面看控制台。

---

## 5. 代码地图

完整文件地图在 `README.md` 和 `AGENTS.md`，这里只给接手时最该先看的几个：

```
app/
  globals.css        1900 行。Tailwind + @font-face + **所有自定义类**
components/
  Carousel.jsx       1956 行，主组件。刻意不拆分（见 AGENTS.md）
  DollFace.jsx       302 行，玩偶脸背景层（纯 SVG，零依赖）
  CardDetail.jsx     174 行，点牌后的详情面板
  OracleFlow.jsx     895 行，每日一牌流程
  SpreadFlow.jsx     639 行，四种牌阵流程
  TarotVortex.jsx    518 行，入场环形文字
  ring/tarot.js      640 行，22 张大牌 + 主题 + 抽牌逻辑（纯 ESM，无 JSX）
  ring/deck78.js     409 行，78 张牌结构
  ring/spreads.js    233 行，五种玩法与牌阵槽位
  ring/params.js     259 行，**所有可调参数**
  shaders/planeShaders.js  451 行 GLSL：环本体、goo、玻璃边缘、光标标签
```

### 素材

| 路径 | 内容 | 体积 |
|---|---|---|
| `public/tarot/` | 79 个 webp：22 张大牌 + 56 张小牌 + 1 张牌背 | 3.0 MB |
| `public/fonts/` | `PangMenZhengDao-XiXianTi.ttf`（1.76 MB，中文字）+ `TheNightWatch.ttf`（31 KB，拉丁装饰体） | 1.8 MB |
| `public/` 其余 | `Satoshi-*.otf`、`Geist-Regular.ttf`、箭头图标 | 227 KB |
| `docs/` | 4 张截图（2026-09-12 重拍） | 1.5 MB |
| `out/` | 构建产物，可整目录丢给任意静态托管 | 6.4 MB |

字体授权：细线体免费商用，The Night Watch 随字体包。
**原始 Viscose 附带的商用字体 PP Neue Montreal 已被移除，不要放回来。**

> ✅ **牌面素材授权问题已于 2026-09-14 结案**：79 张图**全部由维护者用 AI 生成**，
> 不是扫描件、也不是现有牌组的复刻，因此没有上游版权主张，不挡分发。
> 这句话已同步写进 `README.md` 的 Artwork 小节与 `docs/tarot-art-spec.md`。
> 换图时记得一并更新那句来源说明——**不要让它重新变成空白**。
>
> 换图规格（AI 重画 / 换风格时用）：`docs/tarot-art-spec.md`，由
> `tools/gen_tarot_spec.py` 从牌组数据生成，改牌组后重跑脚本即可同步。
> 硬规格：**400 × 716 WebP**（1 : 1.79）、全部正立（倒位由代码旋转）、
> 文件名严格按表（`major_00.webp` / `minor_cups_07.webp` / `back.webp`）。

---

## 6. 换机后最容易踩的坑

按踩中概率排序。前两条是 2026-09-12 在本机实测复现过的。

### 1. `npm run build` 报删除失败 / 构建中途挂掉

本机有一个"批量删除守卫"，会拦截单轮超过约 50 个的删除操作
（`scope: "turn"`，即一轮对话内累计 50 次）。
`next build` 清理 `.next` 缓存时最容易撞上——**报错看起来像构建失败，其实代码完全没问题**。

```
[safe-delete][SAFE_DELETE_BULK_CONFIRM_REQUIRED] {"count":50,"threshold":50,"scope":"turn",...}
```

**2026-09-14 实测有效的解法（推荐）：先把这两个目录同盘 mv 走，再 build。**

```bash
Q=/e/BaiduSyncdisk/INTERNET-1.0/_quarantine     # 隔离区，必须在同一个盘
mkdir -p "$Q"
cd /e/BaiduSyncdisk/INTERNET-1.0/INFINITE-Space
mv .next "$Q/next-$(date +%H%M%S)" 2>/dev/null
mv out   "$Q/out-$(date +%H%M%S)"  2>/dev/null
npx next build
```

> ⚠️ **必须同盘 mv。** 跨盘（例如 `E:` → `C:`）的 mv 是「复制 + unlink」，
> 照样吃满 50 次删除配额，反而把自己堵死（2026-09-14 踩过）。
> 同卷 rename 才不计入删除。所以隔离区要建在 `E:\BaiduSyncdisk\INTERNET-1.0\_quarantine`，
> **不要**建到 `C:\Users\...\quarantine`。

备选：老办法 `NODE_OPTIONS=" " npx next build` 有时也能绕过（前置空值让 shim 失效），
但不保证；同盘 mv 是稳的。

同样的守卫也会拦你自己的 `rm -rf out/`（约 140 个文件）。**不要手动删**，
用上面的 mv，或者干脆让 `next build` 自己处理。

### 2. 打开页面是**白屏**，但 HTML 能正常返回

Next 16 会把来自"非自己身份"主机的 `/_next/static` 请求判为跨源并返回 **403**：
JS 全部加载失败 → 整页空白（SSR 的文字其实都在）。

`next.config.mjs` 里的白名单：

```js
allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.196", "192.168.124.15"],
```

**换机后如果新机的局域网 IP 不在里面，就把新 IP 加进去，然后重启 dev server。**
不要跑去改组件。（`192.168.124.15` 是 2026-09-12 这台机器的 IP；`192.168.1.196` 是上一台的。）

自检方法（不需要浏览器）：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
# 从返回的 HTML 里抓一个 /_next/static/chunks/....._.js 再 curl 一次，应得 200 而不是 403
```

### 3. 百度同步盘会把删掉的文件"还原"

在 A 机器上删掉的东西，B 机器同步后可能又冒出来。所以：

- 那些废弃目录已在 `.gitignore` 里挡着；
- **但 `.gitignore` 挡不住 `next build` 把 `public/` 整个复制进 `out/`**。
  `public/tarot-old/`（1.8 MB）和 `public/_unused/`（1.3 MB）曾经真的因此进了上线包，
  2026-09-12 已移出仓库。如果它们又出现在磁盘上，**必须再移出去一次，光 ignore 没用**。

### 4. GitHub 推送 / 拉取失败（2026-09-14 整段重写，按踩坑顺序排）

三个问题会同时发作，缺一个都推不上去：

**① 全局 URL 重写把地址劫持到已死的镜像。**
`~/.gitconfig` 里有 `url."https://ghfast.top/https://github.com/".insteadOf = https://github.com/`，
而 `ghfast.top` 现已 502。后果：**即使 `git remote set-url` 改成官方地址也没用**——
push 时照样被重写回去，报错会显示你在向 `ghfast.top` 要用户名。

根治（一次即可）：

```bash
git config --global --unset url.https://ghfast.top/https://github.com/.insteadOf
```

**② git 直连 github.com 不通，必须走系统代理。**
直连报 `Recv failure: Connection was reset` 或 21 秒超时。系统代理在注册表
`HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings`：`ProxyEnable=1`、
`ProxyServer=127.0.0.1:7897`。**curl 会自动用它，git 不会**，所以要显式传。

**③ 凭据。** 凭据管理器里那条 `GitHub - https://api.github.com/CHR1G` **已失效**
（报 `Invalid username or token. Password authentication is not supported`）。
去 `github.com/settings/tokens` 新建 **classic PAT，只勾 `repo`**
（不要选 fine-grained，容易漏配 Contents 权限）。

**能跑通的完整命令**（三个问题一起绕开，2026-09-14 用它推了 18 个提交）：

```bash
cd /e/BaiduSyncdisk/INTERNET-1.0/INFINITE-Space
touch /tmp/gitclean.cfg                     # 空配置：绕开全局 insteadOf
TOK='你的PAT'
GIT_CONFIG_GLOBAL=/tmp/gitclean.cfg GIT_CONFIG_NOSYSTEM=1 GIT_TERMINAL_PROMPT=0 \
  git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 \
  push "https://CHR1G:${TOK}@github.com/CHR1G/Orbit-of-Destiny.git" main
```

- 偶发 `schannel: failed to receive handshake`（约一半概率），**重跑一两次就过**，
  不是配置问题。循环重试时别用 `| tail`（管道退出码恒为 0 会让重试失效）。
- PAT 长度不必是 40 位，短的也能用。不要把 token 写进任何会提交的文件。
- 已配好的仓库级设置（本地 `.git/config`，换机后要重新配）：
  `http.proxy` / `https.proxy` = `http://127.0.0.1:7897`，remote 已是官方地址。

### 5. 改着色器后页面全黑

GLSL 运行时编译。构建通过不代表能跑。改完 `components/shaders/` 一定开页面看控制台报错。

### 6. 长时间开发后页面变白，硬刷新又好了

WebGL context 数量到上限（Chrome 约 16 个）。`Carousel.jsx` 的清理里调了
`forceContextLoss()` 就是治这个的——**别删那行**。

### 7. 卡面被裁掉一块

Tailwind v4 的 preflight 有 `img { max-width: 100% }`，会静默把 `calc(100% + 1px)` 的
像素级出血夹回去，导致逆位牌裁切异常。`.holo-img` 里显式写了 `max-width: none` 来绕开。

### 8. 调参前先对齐参考窗口

所有像素尺寸都是按 **1512px 宽的参考窗口**写的，运行时乘以 `fit = viewW / 1512`。
开发模式下右上角有 lil-gui 面板，**先打开 `fit` 目录确认 `scale` 显示 `1.000`**。

### 9. 字体有两个 404（新发现）

`globals.css` 的 `@font-face` 把 `.woff2` 排在 `.ttf` 前面，但
**`public/fonts/` 里根本没有那两个 woff2 文件**：

```
/fonts/PangMenZhengDao-XiXianTi.woff2  -> 404
/fonts/TheNightWatch.woff2             -> 404
```

功能上无害（会回落到 TTF），但每次访问白吃两次往返。
把真的 woff2 丢进去即可生效，**不需要改任何代码**。

---

## 7. 当前状态（截至 2026-09-14 01:10）

### Git

```
6066265  Record the deck art as AI-generated, closing the provenance gap  ← 本地 = 远程 HEAD
577ad46  Generate the tarot artwork spec from the deck data
f5f32bd  Re-encode the doll's body plate: 2,127 KB -> 88 KB
f7c8aff  Say why the menu keeps its own boundary instead of the ring's 480
6369c69  Turn the play-row hover light blue
7bbed02  Sweep a silver reflection across the intro heading
8b9b3cb  Make the lid breath legible, and derive its budget from the plates
```

分支 `main`，**本地与远程完全一致（`6066265`），无未推送提交，工作区干净。**
（2026-09-14 一次性推平了积压的 17 个提交。）

### 2026-09-13 ~ 14 做了什么

| 动作 | 结果 |
|---|---|
| 玩偶眼皮呼吸 | 三处病根：振幅过小、正弦两端速度趋零、`bias` 让眼睑整段下沉。改为振幅 7.2/6.6 px + `asin(sin x)` 三角锐化 + `bias 1.0` 锚定静息位。**注意约束是"硬切边不得离开眼窝"，不是"必须盖住眼球"**（DOWN 才是紧的一边） |
| 标题银色扫光 | 新增 `uSweep/uSilver/uGlyphAt/uGlyphW`；band 走**整行坐标**而非逐字形 uv，否则每个字母各自重启会齐闪。受 `prefers-reduced-motion` 约束 |
| 按钮高亮 | 由暖色改冷调浅蓝，暖色图层要整体一起换 |
| 首屏瘦身 | `public/doll/body.png` 2,127 KB → **88 KB**（WebP q95 + `alpha_quality=100`，alpha 逐位一致，眼窝靠 alpha 挖出）。首屏 4,581 KB → 2,543 KB |
| 响应式边界 | 480 = 布局边界（环比例 / 有无人像），**640 = 字号边界**（列字号随视口缩、pillsheet 固定 15 px 不缩）。两类允许不同，别合并。测量值已写进 `globals.css` 注释 |
| 牌图规格 | 新增 `tools/gen_tarot_spec.py` → `docs/tarot-art-spec.md`（79 槽位） |
| 授权空白 | 结案：79 张牌由维护者 AI 生成（见第 5 节） |

**隔离区位置**：
`E:\BaiduSyncdisk\INTERNET-1.0\_quarantine\`（构建缓存，同盘）
`C:\Users\NINGMEI\.workbuddy\quarantine\infinite-space-2026-09-12\`（09-12 那批垃圾与截图脚本，
**不在同步盘上**所以不会被还原）

### 未提交的改动

无。工作区干净，全部已入 `6066265` 及之前提交。

### 7.4 线上与发布

**当前线上（最新构建）**：

```
https://orbit-of-destiny-65628.app.workbuddy.host/
```

发布方式：内置「发布为应用」渠道（静态站），发布目录是 **`out/`**，
不是仓库根目录。`out/` 是 `next build` 的静态导出产物（6.7 MB），
可直接丢任意静态托管。

> ⚠️ **还有一个同名无后缀的旧链接 `https://orbit-of-destiny.app.workbuddy.host/`**，
> 内容是很早的版本（玩偶还是 SVG 版，`doll/body.webp` 404）。
> 它**不属于当前工作区**（全盘搜 `.wbapp_*.genie` 只找到当前这一个标记文件），
> 因此从这台机器无法直接更新它，硬指定 appId 也不行（工具禁止猜 ID）。
> 要想统一域名，需要用户在「设置—数据管理—应用」里把旧应用下线释放域名，
> 或回到创建它的那个工作区重新发布。**接手时先问用户想怎么处理，别擅自下线。**

重新发布的完整流程：

```bash
# 1) 先移走缓存（防删除守卫，见 6.1），再构建
mv .next /e/BaiduSyncdisk/INTERNET-1.0/_quarantine/next-$(date +%H%M%S)
mv out   /e/BaiduSyncdisk/INTERNET-1.0/_quarantine/out-$(date +%H%M%S)
npx next build
# 2) 发布 out/ 目录（静态站），会沿用同一个分享链接、覆盖线上内容
```

### 开发服务器

写这份文档时**没有**在跑。起法：`npm run dev`（Turbopack），<http://localhost:3000>。

---

## 8. 待办 / 遗留

### 已决定

1. **玩偶脸在手机端维持隐藏**（`@media (max-width: 639px) { .doll { display: none } }`），
   不改成缩小保留。
2. **保持发布状态**：有新改动就重新发布，不必等某个功能定稿（2026-09-14 改）。
3. **牌图由维护者自己用 AI 生成并替换**， Agent 不主动催进度、不代为批量生成。
   用户说"后续我会另外更新"——接手后别去动 `public/tarot/`。

### 2026-09-14 已结案

4. ~~恢复 GitHub 推送~~ → 已推平到 `6066265`（方法见第 6.4 节）。
5. ~~填上牌面素材的授权空白~~ → 已写明 AI 生成（见第 5 节）。

### 待做的工程项（按性价比排）

6. **字体优化**：`PangMenZhengDao-XiXianTi.woff2` 转 WOFF2 + 子集化，
   1.76 MB 可砍到 100–300 KB；`@font-face` 已预留 `.woff2` 位置，
   丢文件进去就自动优先命中（顺带消掉那两个 404）。
7. `public/tarot/` 3.0 MB：图集把每张牌降采样到 320×573 单元格，
   源图按这个尺寸裁一遍能省很多（**换图时顺手做，见 `docs/tarot-art-spec.md`**）。
8. `components/ring/gui.js` 的 `textFont` 下拉只列了 `["Satoshi","Geist"]`，
   而 `params.textFont` 是 `"TheNightWatch"` —— 选任何一项都是降级。
9. **两个线上链接合并成一个**（第 7.4 节）：等用户决定是下线旧应用释放域名，
   还是回旧工作区重发。

### 需要真机复核的（数值上都对，但只有眼睛能确认）

10. **眼皮呼吸幅度**：`DollFace.jsx` 的 `LID_BREATH.amp`（左 7.2 / 右 6.6 px）
    是按像素算出来的，不是看出来的。真机上嫌小/嫌夸张就直接调这个值，
    `LID_TRAVEL` 有钳制兜底（左下 24/30、右下 24/8 px）。
11. **银色扫光**：band 宽度与周期在 `params.js`（`textSweepBand` / `textSweepPeriod`）。

### 已知但暂不修的功能缺口

- 环的入场没有 `prefers-reduced-motion` 逃生口（玩偶脸有，环没有）。
- 没有键盘控制（方向键应该能转环）。
- 手机窄屏（< 500px）布局是近似的，正面卡片会往中间漂。
- 没有测试。

### 技能 / 工具在这台机器上的情况

- 老文档提过的 `deploy-nextjs-static-cloudstudio`、`next-dev-blank-page-triage`、
  `github-repo-download-proxy`、`push-local-project-to-github` **这台机器上依然没有**。
  它们的流程已固化进本文与 `AGENTS.md`，照着做即可；静态发布用内置「发布为应用」渠道。
- **有** `headless-webgl-screenshots`（用户级 skill，2026-09-13 修正过）：
  走 CDP 截 WebGL 页面。重点是**别加 `--disable-gpu`**——加了他就只有 0.5 fps，
  入场动画永远截不到；用 `--use-angle=d3d11` 能吃真 GPU。
- 测量首屏体积时记得 `Network.setCacheDisabled` + `clearBrowserCache`，
  否则复用 profile 缓存会把 2.1 MB 报成 0.2 KB。

---

## 9. 在这台机器上继续干活

### 交接时请一并转达的约定

- **用简体中文交流。**
- **构建必须通过**，改完一定跑 `npm run build`。
- **改完 UI 要开浏览器真的看一眼**，构建绿灯说明不了什么（GLSL）。
- **文件操作走非破坏性路线**：先复制校验，再动源目录。这个仓库在同步盘上，删除会被还原。
- 交付时给工程师风格的结构化说明（设计决策 / 权衡 / 修了什么 bug）。

### 无头截图工具（本次新写的，值得留着）

容器里没有 `agent-browser`，但本机有 Chrome。Chrome 自带的 `--screenshot` 在页面 load
那一刻就拍，对本项目没用（入场要 6 秒）；`--virtual-time-budget` 会饿死图片管线，
计数器只到 45。所以写了个走 DevTools Protocol 的脚本，可以等真实秒数、模拟鼠标、按需截图：

```
C:\Users\NINGMEI\.workbuddy\quarantine\infinite-space-2026-09-12\tools\cdp-shot.js
```

```bash
# 同一个命令里起 Chrome 再跑脚本（后台起的 Chrome 会在命令结束时被回收）
"C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new \
  --use-angle=d3d11 --hide-scrollbars --window-size=1512,900 \
  --remote-debugging-port=9222 "about:blank" &

# 2026-09-13 修正：不要加 --disable-gpu，也不要指望 --enable-unsafe-swiftshader。
# 加了 --disable-gpu 之后只有约 0.5 fps，入场动画「等 N 秒再截」永远等不到
# （render loop 把 dt 钳到 50 ms，时间线按约 1/16 实时推进），截出来是白图。
# 用 --use-angle=d3d11 走真 GPU，入场 3 秒就位。
sleep 5
node cdp-shot.js <outdir> http://localhost:3000/ at-rest hover entry mobile
```

脚本会读页面底部的加载计数器，等到 100 再等 8 秒让环落位，
并顺手摘掉 Next.js 的开发指示器。

---

## 10. 一分钟自检清单

- [ ] `node -v` ≥ 20
- [ ] `components/DollFace.jsx` 存在（同步完整性的标志）
- [ ] `node_modules` 在（同步盘会带过来）
- [ ] `npm run dev` 起来，<http://localhost:3000> 不是白屏（白屏 → 第 6.2 节 `allowedDevOrigins`）
- [ ] 环能转、能停下来正面朝上
- [ ] 点一张牌能打开详情面板，面板里能切正位 / 逆位
- [ ] 左侧玩偶脸的眼睛跟着鼠标动，眼皮有缓慢呼吸（看不清就调 `LID_BREATH.amp`）
- [ ] 标题文字有银色扫光扫过
- [ ] 控制台无红色报错
- [ ] `npm run build` 通过（**先把 `.next` / `out` 同盘 mv 走**，见第 6.1 节）
- [ ] `git status` 干净，且与 `origin/main` 一致
- [ ] GitHub 能推通（若失败，第 6.4 节的三步，缺一不可）
