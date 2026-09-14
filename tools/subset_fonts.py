#!/usr/bin/env python3
"""Build the .woff2 faces from the .ttf sources in public/fonts/.

Why this exists
---------------
`app/globals.css` lists a `.woff2` before the `.ttf` in each `@font-face`
block, so the browser prefers it — but the woff2 files were never built and
every page view ate two 404s before falling back to the 1.76 MB TTF.

The CJK face is 1.76 MB because it carries 6,763 hanzi. This site never
renders more than about 1,100 of them: every string it can display lives in
`app/` and `components/` (the card meanings in `ring/tarot.js` and
`ring/deck78.js`, the UI copy in the flows). So the character set is derived
**from the source**, not guessed, and the face shrinks by roughly 85%.

    python tools/subset_fonts.py          # rebuild public/fonts/*.woff2
    python tools/subset_fonts.py --check  # report sizes, write nothing

The TTF sources stay in the repo and stay in the `@font-face` src list, so
nothing here is destructive — deleting a .woff2 just restores the old
behaviour.

  ⚠ If you add Chinese copy, re-run this. A character that is not in the
    subset falls back to the next family in the stack *silently* — there is
    no error, just one word in the wrong typeface. `AGENTS.md` warns about
    the same failure mode for a misspelled family name.

Needs `fonttools[woff]` (brings brotli):

    pip install "fonttools[woff]"
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "public" / "fonts"

# Directories whose text can end up on screen. `tools/` is excluded on
# purpose: its output is a markdown spec, never rendered by the site.
SCAN_DIRS = ["app", "components"]
SCAN_EXTS = {".js", ".jsx", ".css", ".mjs"}

# Faces to build. Keys are the file stem in public/fonts/.
FACES = ["PangMenZhengDao-XiXianTi", "TheNightWatch"]

# Always present, whatever the sources happen to contain: the layouts set
# numerals, Latin card titles and the odd apostrophe. Cheap insurance — these
# are 95 glyphs.
ALWAYS = (
    "".join(chr(c) for c in range(0x20, 0x7F))
    + "·—–…“”‘’«»°×÷≈±→←↑↓"
)


def collect_chars() -> tuple[set[str], int]:
    chars: set[str] = set(ALWAYS)
    files = 0
    for name in SCAN_DIRS:
        for path in sorted((ROOT / name).rglob("*")):
            if not path.is_file() or path.suffix not in SCAN_EXTS:
                continue
            if "node_modules" in path.parts:
                continue
            files += 1
            chars.update(path.read_text(encoding="utf-8"))
    return chars, files


def human(n: int) -> str:
    return f"{n / 1024:.0f} KB" if n >= 1024 else f"{n} B"


def build(stem: str, chars: set[str], check: bool) -> bool:
    ttf = FONTS / f"{stem}.ttf"
    woff2 = FONTS / f"{stem}.woff2"
    if not ttf.exists():
        print(f"  ! {ttf.name} missing — skipped")
        return False

    before = ttf.stat().st_size
    if check:
        after = woff2.stat().st_size if woff2.exists() else None
        state = human(after) if after else "not built"
        saved = f" ({100 - after * 100 // before}% off)" if after else ""
        print(f"  {stem:<28} ttf {human(before):>8}  ->  woff2 {state}{saved}")
        return True

    # pyftsubset takes the text via a file; passing ~1,200 characters inline
    # risks hitting the Windows command-line limit. Written to the system temp
    # dir rather than the repo — this tree sits on a sync volume, and a stray
    # file here would be replicated to every other machine.
    text_file = Path(tempfile.gettempdir()) / "orbit-font-subset-chars.txt"
    text_file.write_text("".join(sorted(chars)), encoding="utf-8")
    try:
        subprocess.run(
            [
                sys.executable,
                "-m",
                "fontTools.subset",
                str(ttf),
                f"--text-file={text_file}",
                "--flavor=woff2",
                "--layout-features=*",
                # Keep the name table so the font is still identifiable in
                # DevTools; drop the rest of the metadata for size.
                "--name-IDs=*",
                "--drop-tables+=DSIG",
                "--no-hinting",
                f"--output-file={woff2}",
            ],
            check=True,
        )
    finally:
        text_file.unlink(missing_ok=True)

    after = woff2.stat().st_size
    print(
        f"  {stem:<28} {human(before):>8} -> {human(after):>8}"
        f"  ({100 - after * 100 // before}% smaller)"
    )
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--check",
        action="store_true",
        help="report sizes without writing anything",
    )
    args = ap.parse_args()

    chars, files = collect_chars()
    cjk = sum(1 for c in chars if "\u3400" <= c <= "\u9fff")
    print(f"{files} source files -> {len(chars)} unique characters ({cjk} hanzi)\n")

    ok = all(build(stem, chars, args.check) for stem in FACES)
    if not ok:
        return 1

    if not args.check:
        total = sum(
            (FONTS / f"{s}.woff2").stat().st_size
            for s in FACES
            if (FONTS / f"{s}.woff2").exists()
        )
        print(f"\npublic/fonts/*.woff2 now totals {human(total)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
