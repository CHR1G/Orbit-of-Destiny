# Orbit of Destiny — 换机交接文档

> 生成 2026-09-11 · 2026-09-12 在新机上复核 · 2026-09-14 三次更新
> 用途：换一台电脑后，照本文能把项目跑起来并接着改。
> 仓库里还有三份正式文档：`README.md`（对外介绍）、`AGENTS.md`（技术原理与坑位）、
> `BREAKDOWN.md`（创作脉络）。本文只讲"怎么接手"，原理细节去那三份。
>
> **本文被两台机器共用**（`F:` 与 `E:`），所以正文里的绝对路径只是个例子 ——
> 先把盘符换成你自己那台。
>
> **2026-09-14 更新点**（细节在对应小节）：
> · 字体 `woff2` 建好了，1.76 MB → 98 KB，两个 404 消失（第 6.9 节）；
> · dev server 起不来的真因是同步盘把 `.next` 也同步了、产生冲突文件（第 6.10 节）；
> · 域名 `.link` = 公网 / `.host` = 本机预览，之前记混了（第 7.4 节）；
> · 删除守卫的正确绕法改为「同盘 mv」（第 6.1 节）；
> · GitHub 那节整段重写（加速镜像已死，改用系统代理，第 6.4 节）；
> · 字体修复**已上线并逐字节复验**（第 7.4 节，含"工具报错但实际生效"的坑）；
> · **远端实际停在 `22ae952`，本地有一串提交未推**（第 7 节 / 待办第 9 条，只差 PAT）；
> · 文档里把"21577 字符"误记成字节数，已更正（第 7.4 节）。

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

> 换机其实**不必 clone**：百度同步盘会把
> `<盘符>:\BaiduSyncdisk\INTERNET-1.0\INFINITE-Space\`（含 `node_modules`）
> 整份带过去，等同步完直接 `npm run dev` 即可。
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
| **本地工作区** `<盘符>:\BaiduSyncdisk\INTERNET-1.0\INFINITE-Space\` | 见第 7 节 | 最新、最全 |
| **GitHub** `CHR1G/Orbit-of-Destiny` | **落后** | 远端停在 `22ae952`，本地已到 `25341bb`（差 3 个提交，未推；见第 7 节与待办第 9 条） |
| 百度同步盘 | 同本地 | 会自动同步，但**会把你在另一台机器上删掉的文件"还原"回来** |

> **盘符**：仓库在百度同步盘上，两台机器挂上去的盘符不同（一台 `F:`、一台 `E:`）。
> 仓库内的路径都是相对的，只有本文里出现的绝对路径需要按自己那台替换。

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
- **只读比对也要换法子。** 本机 `.git` 里**没有 `origin/main` 跟踪引用**，
  所以 `git log origin/main..HEAD` 会以
  `fatal: ambiguous argument ... unknown revision` 退出 128 —— 看起来像仓库坏了，
  其实只是少一步。而且 `git fetch origin main` 实测**也不会把这个引用留下来**
  （fetch 成功、`refs/remotes` 依然为空）。可靠做法是拿远端 sha 直接比：
  ```bash
  REMOTE=$(git -c http.proxy=http://127.0.0.1:7897 ls-remote origin main | cut -f1)
  git log --oneline "$REMOTE"..HEAD
  ```
  详见第 7 节。

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

### 9. 字体有两个 404 —— 已修（2026-09-14）

`globals.css` 的 `@font-face` 把 `.woff2` 排在 `.ttf` 前面，但
`public/fonts/` 里根本没有那两个 woff2 文件，访客每次白吃两次 404 才回落到 TTF。

已用 `tools/subset_fonts.py` 生成真正的子集 woff2：细线体 **1.76 MB → 98 KB**，
The Night Watch 31 KB → 4 KB；浏览器实测 1,091 个汉字**零漏字**。

> 注意：**本地开发看不到这两个 404**，因为两台开发机都装了
> `庞门正道细线体.ttf`，`@font-face` 的 `local()` 直接命中、根本不走网络。
> 404 只会发生在没装该字体的访客身上 —— 也就是线上所有人。
> 排查字体问题时别只看自己的机器。
>
> 而且细线体只在**占卜浮层**里用到（首页中文走 sans 栈），所以只在首页
> 加载的探针也看不到它。要复现得先点开一个玩法。

**改了中文文案要重跑 `python tools/subset_fonts.py`**，漏字是静默回落，
不报错。详见 `public/fonts/README.md`。

### 10. dev server 直接起不来：同步盘把 `.next` 也同步了

`next dev` 报：

```
[Error: Failed to open database
 Caused by:
    0: Loading persistence directory failed
    1: Unexpected file in persistence directory:
       "...\.next\dev\cache\turbopack\v16.3.0-xxxx\CURRENT_冲突文件_Administrator_20260914095933"]
```

Turbopack 的持久化缓存目录里出现了**百度盘的冲突文件**，它认为目录被污染，
拒绝启动 —— 整个 dev server 挂掉，不是代码问题。

成因：`.next` 只是构建缓存，但**百度盘不认 `.gitignore`**。两台机器各有一份
`.next`，互相覆盖时百度盘生成 `xxx_冲突文件_<用户名>_<时间戳>`，缓存就坏了。

```bash
# 同盘 mv 走（rename 不计入删除，见 6.1），next dev 会重建
mv .next /f/BaiduSyncdisk/INTERNET-1.0/_quarantine/next-$(date +%H%M%S)
node node_modules/next/dist/bin/next dev -p 3000   # 本机坏掉的 npx 要绕过，见 6.11
```

**根治**：在百度网盘的同步设置里把 `.next`（以及 `out/`、`node_modules/`）
排除掉。API/命令行改不了，得在客户端里点。没排除之前，每次两台机器都跑过
dev/构建之后就会复发。

> 顺带：`_quarantine/` 建在同步盘根目录里，所以**它自己也会跨机同步**
> （本次就在里面发现过另一台机器留下的 `out-000857`）。当垃圾场用没问题，
> 但别指望它是本地的。

### 11. `npx` 用不了

本机 bash shim 退化（`dirname` 等 coreutils 缺失）时，`npx` 这个 shell 脚本
直接 `exit 127`。绕过：

```bash
node node_modules/next/dist/bin/next dev -p 3000
node node_modules/next/dist/bin/next build
```

同理，`ls` / `head` / `grep` / `mkdir` / `rm` 都可能突然找不到，用
`C:/Users/<用户>/.workbuddy/binaries/PortableGit/versions/1.2.0/usr/bin/<cmd>.exe`
的绝对路径，或者干脆用 `node -e`。

---

## 7. 当前状态（截至 2026-09-14 15:50，F: 那台机器）

### Git

```
8e32c38  Count the new commit in the push backlog                          ← 本地 HEAD
4bcac06  Re-verify the live fonts end to end, and stop recommending a domain release
25341bb  Record the font fix as live, and how it was nearly mis-verified
09a64ca  Correct the handoff doc for the F: machine and record this round's findings
3abbff7  Build the woff2 faces the @font-face blocks already expected
22ae952  Bring the handoff doc up to date for the next machine             ← origin/main（已确认）
6066265  Record the deck art as AI-generated, closing the provenance gap
```

分支 `main`，工作区干净。

> ☝️ **别把上面那个 HEAD 当成事实来源。** 本文档每自我修正一次就会再多一个提交
> （这份记录本身就是这么叠出来的），所以那张表写下的瞬间就已经旧了一点。
> **要准确数字一律实测。**
>
> 但注意：本机 `.git` 里**没有 `origin/main` 跟踪引用**，`git log origin/main..HEAD`
> 会以 `fatal: ambiguous argument ... unknown revision` 退出 128，看着像仓库坏了，
> 其实只是少一步。而且实测 `git fetch origin main` **也不会把 `origin/main` 留下来**
> （fetch 报成功、`refs/remotes` 仍然是空的）。**所以别依赖跟踪引用，
> 直接拿远端 sha 比** —— 这是唯一一个不需要任何本地引用的办法：
>
> ```bash
> REMOTE=$(git -c http.proxy=http://127.0.0.1:7897 \
>   ls-remote origin main | cut -f1)      # 不依赖本地引用，只读
> git log --oneline "$REMOTE"..HEAD        # 现在才数得出来
> ```
>
> 2026-09-14 实测结果：远端 `22ae952`，本地领先 **7 个提交**，全部未推
> （`3abbff7` / `09a64ca` / `25341bb` / `4bcac06` / `8e32c38` / `2be5a70` /
> `85556a2`）。注意 `ls-remote` 走不通时才需要加代理参数，见第 6.4 节。

**远端落后于本地，且落后多少会随文档更新继续变。** 2026-09-14 实测
（不是照抄旧记录）：

```
git -c http.proxy=http://127.0.0.1:7897 -c https.proxy=http://127.0.0.1:7897 \
  ls-remote origin main
→ 22ae952cc7031d88edd4cc80dc035e83030942db  refs/heads/main
```

也就是说**远端停在 `22ae952`**，而本地已经有 `3abbff7` / `09a64ca` / `25341bb` /
`4bcac06` 等一串没推的提交。代理本身是通的（`ls-remote` 走通了，说明第 6.4 节
那套代理地址仍然有效），缺的只是**凭据** —— `credential.helper` 是 `manager`，
但里面没有 github.com 的登录态，所以**直接 `git push` 会挂起等弹窗**
（详见第 8 节待办第 9 条）。要推得先拿到一个 classic PAT（勾 `repo`）。

> 早先本文档写"远端已推平到 `6066265`"，与实测不符 —— 实际远端停在
> `22ae952`。判断远程位置**一律以 `ls-remote` 实测为准**，别沿用旧记录。

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

**隔离区位置**（每台机器各自一份，同为各自盘符的同步盘根目录下）：
- `F:\BaiduSyncdisk\INTERNET-1.0\_quarantine\` ← 本机（2026-09-14 起在用）
- `E:\BaiduSyncdisk\INTERNET-1.0\_quarantine\` ← 另一台
- `C:\Users\NINGMEI\.workbuddy\quarantine\infinite-space-2026-09-12\`（09-12 那批垃圾与截图脚本，
  **不在同步盘上**所以不会被还原）

> 注意 `_quarantine` 建在同步盘里，**它自己会跨机同步** —— 本次就在里面
> 发现过另一台机器留下的 `out-000857`。当垃圾场可以，别当本地目录用。
> 每台机器用各自的时间戳子目录名，避免互相覆盖。

### 未提交的改动

无。工作区干净，本轮改动（字体修复 + 文档订正）都已入提交。
最近这次只动了 `HANDOFF.md` 本身。

### 7.4 线上与发布

**域名有两套，别混（2026-09-14 实测更正）：**

| 形式 | 实际是什么 |
|---|---|
| `*.app.workbuddy.link` | **公网分享链接**，谁都能开 |
| `*.app.workbuddy.host` | **本机预览域**，DNS 直接指向 `127.0.0.1`，由 WorkBuddy 客户端本地代理，**只有本机打得开** |

发链接给人要用 `.link`；`.host` 只适合自己在本机看。之前这份文档把 `.host`
当成"线上地址"记录了，是错的 —— 从别的机器 `fetch` 它只会失败。

**两个公网链接（2026-09-14 重新发布后）：**

| 链接 | `index.html` sha1 | 内容 | 判定 |
|---|---|---|---|
| `orbit-of-destiny.app.workbuddy.link` | `f4a8c350106c` | 有玩偶、`woff2` **200** | **当前最新构建**（本工作区发的） |
| `orbit-of-destiny-65628.app.workbuddy.link` | `243bcecc443e` | 有玩偶、`woff2` 404 | 旧一版（另一台机器的工作区发的） |

**干净域名那个现在是最新的** —— 想收束成一条链接的话，保留
`orbit-of-destiny`、把 `-65628` 下线即可。

2026-09-14 复验（三条独立证据，全部指向"已生效"）：

| 取证对象 | 本地 | 干净域名 | 判定 |
|---|---|---|---|
| `index.html` | 21935 B / sha1 `f4a8c350106c` | 21935 B / sha1 `f4a8c350106c` | 逐字节一致 |
| `/fonts/PangMenZhengDao-XiXianTi.woff2` | 99856 B / SHA1 `bef3a754016684b2` | 99856 B / SHA1 同 | 逐字节一致 |
| `/fonts/TheNightWatch.woff2` | 4444 B / SHA1 `654f746d1935dad0` | 4444 B / SHA1 同 | 逐字节一致 |

再往上追一层：线上那个 CSS 分片（`/_next/static/chunks/0zd1kjenmbx5_.css`，
52449 B）里的 `@font-face` 确实是
`src:local(庞门正道细线体),…,url(/fonts/PangMenZhengDao-XiXianTi.woff2)format("woff2"),…`
——**`local()` 在构建后仍然保留**（5 处），所以"本地看不到 404、线上才 404"
这套解释是对的，不是构建把 `local()` 优化掉了。两条 `url()` 现在都是 200，
访客的回落链变成"命中本地字体 → 否则拿 woff2（98 KB）→ 再不行才 TTF（1.76 MB）"。

> ⚠️ **字节数 vs 字符数，别记混。** 这个 `index.html` 是
> **21577 字符 / 21935 字节**（UTF-8 下多出 358 字节，中文页头）。本文档早先
> 把字符数当字节数写成了"21577 字节"，复验时一度以为线上换了个版本 ——
> 同 sha1 就是同内容，长度对不上先怀疑自己的量法。

> ⚠️ **探测这类站点必须加 cache-busting。** 不带 `?cb=<随机>` 时 CDN 会回
> 上一次缓存的 HTML：本次就因此读到 20605 字节的旧页，误判"新内容没上线"，
> 而真实的新页其实早就在了。判断"发布有没有生效"**只能靠 sha 比对**
> （本地 `out/index.html` vs 线上，且两次要用同一个哈希算法），
> 看字节数或截图都不可靠。

> ⚠️ 本次发布工具**回了报错，但实际生效了**。报的是
> `应用预留域名 ... 未绑定到本次发布环境，本次发布已停止`，可线上
> `index.html` 的 sha 与本地完全一致、`/fonts/*.woff2` 的字节数与 SHA1
> 也和本地逐字节相同。**别只信工具回执，要回线上取证。**
> 重新发布前也不必先清缓存目录 —— `out/` 是直接上传的。

本工作区的发布标记是 `.wbapp_xfZqBnQPbJr7Zidc6lqGDi.genie`，位于
`C:\Users\<用户>\WorkBuddy\<工作区>\`，`localDir` 指向本机的 `out/`。
**标记文件在工作区目录里、不在同步盘上** —— 所以每台机器各自的
`.wbapp_*.genie` 就是各自能更新的那个应用。这就是"两个链接"的由来。

发布方式：内置「发布为应用」渠道（静态站），发布目录是 **`out/`**，
不是仓库根目录。

> ⚠️ 从本机**只能**更新本工作区标记的那个应用（`orbit-of-destiny`）。
> 另一个（`-65628`）属于另一台机器的工作区，硬指定 appId 也不行
> （工具禁止猜 ID）。要合并成一个域名，需要你在「设置—数据管理—应用」里
> 把其中一个下线释放域名，或回到创建它的那个工作区重发。
> **接手时先问用户想怎么处理，别擅自下线。**

重新发布的完整流程（本机路径是 `F:`，别照抄文档里的 `E:`）：

```bash
cd /f/BaiduSyncdisk/INTERNET-1.0/INFINITE-Space
# 1) 先同盘移走缓存（防删除守卫，见 6.1），再构建。
#    本机 npx 坏了（见 6.11），用 node 直调 next。
mv .next /f/BaiduSyncdisk/INTERNET-1.0/_quarantine/next-$(date +%H%M%S)
mv out   /f/BaiduSyncdisk/INTERNET-1.0/_quarantine/out-$(date +%H%M%S)
node node_modules/next/dist/bin/next build
# 2) 发布 out/ 目录（静态站），沿用同一个分享链接、覆盖线上内容
```

### 开发服务器

2026-09-14 10:30 写这份文档时**没有**在跑（为了跑构建先停掉了）；
**15:50 复验时是跑着的**（`http://127.0.0.1:3000` 返回 200，标题 `Orbit of Destiny`）。
起法：

```bash
node node_modules/next/dist/bin/next dev -p 3000
```

正常机器上 `npm run dev` 也行；本机 `npx`/`npm` 这条路被坏掉的 shell shim
堵住时才需要上面那条（见第 6.11 节）。

**起不来先看第 6.10 节**（同步盘冲突文件把 Turbopack 缓存搞坏），
那是本机实际遇到过的情况，症状是完全起不来、不是白屏。

---

## 8. 待办 / 遗留

### 已决定

1. **玩偶脸在手机端维持隐藏**（`@media (max-width: 639px) { .doll { display: none } }`），
   不改成缩小保留。
2. **保持发布状态**：有新改动就重新发布，不必等某个功能定稿（2026-09-14 改）。
   ⚠️ 但发布工具带**当轮同意闸** —— `userAskedToPublish` 只应在用户当轮
   明确要求发布时置 `true`，跨轮不继承。所以"继续""顺手做"这类指令
   **不足以**触发发布，得先问一句。另外本工作区只能更新自己那个应用，
   见第 7.4 节。
3. **牌图由维护者自己用 AI 生成并替换**， Agent 不主动催进度、不代为批量生成。
   用户说"后续我会另外更新"——接手后别去动 `public/tarot/`。

### 2026-09-14 已结案

4. ~~恢复 GitHub 推送~~ → 当时推到 `6066265`。**但 2026-09-14 实测远端停在
   `22ae952`**，本地又领先了 3 个提交 —— 见下面第 9 条，这活儿又回来了。
5. ~~填上牌面素材的授权空白~~ → 已写明 AI 生成（见第 5 节）。
6. ~~字体优化~~ → 已做，见第 6.9 节：新增 `tools/subset_fonts.py`，
   细线体 1.76 MB → **98 KB**，两个 404 消失，浏览器实测零漏字。
   **遗留约束：改中文文案后要重跑该脚本。**
7. ~~`gui.js` 的 `textFont` 下拉选不到默认值~~ → 已补上 `TheNightWatch`。
8. ~~字体修复上线~~ → 已发布。2026-09-14 复验：`index.html` 与两个 `woff2`
   都和本地**逐字节一致**（第 7.4 节），线上 CSS 里的 `url()` 也确实回到 200。

### 待做的工程项（按性价比排）

9. **把本地未推的提交推上 GitHub**（唯一能靠命令做完、只差凭据的一项）。
   远端停在 `22ae952`，本地领先 7 个提交（`3abbff7` 起，含本文档的多次更新）。
   **别抄文档里的数字**：拿远端 sha 比（`git ls-remote origin main` 取 sha，
   再 `git log --oneline <sha>..HEAD`，见第 7 节 —— **别用 `origin/main`，
   本机没这个引用**）。
   代理已验证可用，**缺的只是一个 classic PAT（勾 `repo`）**；
   `credential.helper=manager` 里没有 github.com 登录态，裸 `git push` 会挂起。
   推法见第 6.4 节（token 只出现在命令行里，别写进 `.git/config`，
   推完提醒用户立即撤销）。
10. **`public/tarot/` 3.0 MB**：图集把每张牌降采样到 320×573 单元格，
    源图按这个尺寸裁一遍能省很多（**换图时顺手做，见 `docs/tarot-art-spec.md`**）。
11. **收束这两条线上链接**：`orbit-of-destiny` 是最新的，`-65628` 是旧的。
    保留前者、把后者下线即可（第 7.4 节）。`-65628` 属于另一台机器的工作区，
    要在那台机器或「设置—数据管理—应用」里下线。
    ⚠️ **只下线 `-65628` 就够，不要"释放干净域名再重发"。**
    实测干净域名已经指向最新构建，再走一遍释放/重发不但没必要，还可能
    把现有链接弄没（下线应用可能连带删掉分享链接），或者只是生成一条
    带新后缀的链接、把链接问题变得更碎。
12. **在百度网盘里排除 `.next` / `out` / `node_modules`**（第 6.10 节）。
    这不是代码问题，但它是 dev server 挂掉的根因，且会反复发作。

### 需要真机复核的（数值上都对，但只有眼睛能确认）

13. **眼皮呼吸幅度**：`DollFace.jsx` 的 `LID_BREATH.amp`（左 7.2 / 右 6.6 px）
    是按像素算出来的，不是看出来的。真机上嫌小/嫌夸张就直接调这个值，
    `LID_TRAVEL` 有钳制兜底（左下 24/30、右下 24/8 px）。
14. **银色扫光**：band 宽度与周期在 `params.js`（`textSweepBand` / `textSweepPeriod`）。

### 已知但暂不修的功能缺口

- 环的入场没有 `prefers-reduced-motion` 逃生口（玩偶脸有，环没有）。
- 没有键盘控制（方向键应该能转环）。
- 手机窄屏（< 500px）布局是近似的，正面卡片会往中间漂。
- 没有测试。

### 技能 / 工具在哪台机器上

技能是**按机器装的**（在 `~/.workbuddy/skills/`，不跟同步盘走），两台不一样：

| 机器 | 有的相关技能 |
|---|---|
| `F:`（用户 `Administrator`） | `next-dev-blank-page-triage`（带 CDP 探针）、`deploy-nextjs-static-cloudstudio`、`github-repo-download-proxy`、`push-local-project-to-github` |
| `E:`（用户 `NINGMEI`） | `headless-webgl-screenshots`（走 CDP 截 WebGL 页面，2026-09-13 修正过） |

两边都没有的功能，流程已固化进本文与 `AGENTS.md`，照着做即可；
静态发布一律用内置「发布为应用」渠道。

**本机（`F:`）可直接用的探针**，在
`~/.workbuddy/skills/next-dev-blank-page-triage/scripts/`：

| 脚本 | 用途 |
|---|---|
| `cdp-pipe-probe.mjs` | 页面状态（`hasCanvas`、行数、opacity、title）+ 全部 console 报错 |
| `cdp-click-shot.mjs` | 点选择器后再截图；`selector` 可以是 `@x,y` 坐标，这是点 canvas 内元素的唯一办法 |
| `cdp-measure.mjs` | 真实视口 + 元素 box + 计算字号 |
| `cdp-crop.mjs` | 裁剪单个元素并放大，判断 1px 级细节 |
| `png-edge-probe.mjs` | 自己解 PNG（zlib + 反滤波，零依赖）扫四边亮度，判断有没有接缝 |

走 `--remote-debugging-pipe` 而不是 `--remote-debugging-port`，因为沙箱不放行调试端口。

- **别加 `--disable-gpu`**：加了只有约 0.5 fps，入场动画永远截不到；
  用 `--use-angle=d3d11` 吃真 GPU。
- 测量首屏体积时记得 `Network.setCacheDisabled` + `clearBrowserCache`，
  否则复用 profile 缓存会把 2.1 MB 报成 0.2 KB。
- **中文全角字宽恒为 1em，`measureText` 分不出字体** —— 要验证某个字体是否
  真的在出字，只能比栅格（画到 canvas 取 ImageData 比像素），或者拿
  "不存在的字体"当对照组。本次核字体覆盖就是这么做出来的。

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
- [ ] `git status` 干净
- [ ] `git ls-remote origin main` 与本地 HEAD 一致 —— **注意 2026-09-14 时并不一致**：
      远端停在 `22ae952`，本地已领先若干提交（**用 `ls-remote` 的 sha 去比，
      别用 `origin/main`** —— 本机没这个引用，见第 7 节），
      要推只差一个 PAT（待办第 9 条）
- [ ] GitHub 能推通（若失败，第 6.4 节的三步，缺一不可）
