"""Generate docs/tarot-art-spec.md: the 79 artwork slots the app expects.

Reads the real deck data (components/ring/tarot.js, components/ring/deck78.js)
so the spec can never drift from what the code actually loads.
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STYLE = (
    "Rider-Waite-Smith tarot card art, vertical card composition, "
    "vintage woodcut engraving, muted gold and ink palette, centered figure, "
    "ornate thin border, no text, no watermark"
)


def majors():
    src = (ROOT / "components/ring/tarot.js").read_text(encoding="utf-8")
    block = src.split("export const MAJOR_ARCANA = [")[1].split("\n];")[0]
    rows = []
    for i, line in enumerate(block.strip().splitlines()):
        m = re.search(r'zh:\s*"([^"]+)".*?en:\s*"([^"]+)"', line)
        if not m:
            continue
        zh, en = m.group(1), m.group(2)
        rows.append((f"major_{i:02d}.webp", zh, en))
    return rows


def minors():
    src = (ROOT / "components/ring/deck78.js").read_text(encoding="utf-8")
    suits = re.findall(
        r'id:\s*"(\w+)",\s*\n(?:\s*//[^\n]*\n)*\s*file:\s*"(\w+)",\s*\n\s*zh:\s*"([^"]+)"',
        src,
    )
    ranks = re.findall(r'id:\s*"(\w+)",\s*mark:\s*"[^"]*",\s*zh:\s*"([^"]+)",\s*en:\s*"([^"]+)"', src)
    out = []
    for _sid, sfile, szh in suits:
        for ri, (_rid, rzh, ren) in enumerate(ranks, start=1):
            out.append((f"minor_{sfile}_{ri:02d}.webp", f"{szh}{rzh}", f"{ren} of {sfile.title()}"))
    return out


def main():
    rows = majors() + minors() + [("back.webp", "牌背", "Card Back")]
    lines = [
        "# 塔罗牌图 · 生成规格",
        "",
        "由 `tools/gen_tarot_spec.py` 从牌组数据自动生成，改牌组后重跑即可同步。",
        "",
        "## 硬规格",
        "",
        "| 项 | 值 |",
        "| --- | --- |",
        "| 尺寸 | 400 × 716 px（比例 1 : 1.79） |",
        "| 格式 | WebP（其余格式需自行转换） |",
        "| 位置 | `public/tarot/`，文件名严格按下表 |",
        "| 数量 | 79（22 大阿尔卡纳 + 56 小阿尔卡纳 + 1 牌背） |",
        "| 方向 | 全部正立；倒位由代码旋转，不要生成倒置图 |",
        "",
        "## 风格提示词（每张都带上这段后缀）",
        "",
        f"`{STYLE}`",
        "",
        "## 清单",
        "",
        "| # | 文件名 | 中文名 | English | 主体提示词 |",
        "| --- | --- | --- | --- | --- |",
    ]
    for i, (fn, zh, en) in enumerate(rows, start=1):
        subject = f"{en} tarot card"
        lines.append(f"| {i} | `{fn}` | {zh} | {en} | {subject} |")

    out = ROOT / "docs/tarot-art-spec.md"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {out} ({len(rows)} slots)")


if __name__ == "__main__":
    main()
