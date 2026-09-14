"""Regenerate public/doll/* from the artist's source plates.

The doll is seven full-canvas 1293x1080 plates that are co-registered by
construction: every layer is the same canvas, so alignment is the export, not a
number in the component. That property is fragile in exactly one way — any step
that resizes, crops, or re-frames a plate destroys it silently, and the failure
looks like a rendering bug rather than like a bad export. So this script only
ever changes the *encoding*. It never touches geometry.

Usage:
    python tools/reencode_doll.py --src "F:/BaiduSyncdisk/STB/Landing/g"

Encoding is chosen per plate by what the artwork is, not by habit:

  body                       lossy WebP q95, alpha_quality=100
                             Photographic vinyl gradients; PNG was 2.1 MB.
                             alpha_quality=100 keeps the socket rims from
                             drifting, which is the one thing here that must not
                             move.

  eye-white, highlight       lossless WebP, exact=True
                             Smooth low-frequency gradients. Nothing to gain
                             from lossy and banding to lose. `exact=True` is not
                             optional: without it libwebp re-quantises RGB under
                             transparent pixels (1.3M pixels changed on
                             eye-white alone) and the file is no longer a
                             faithful copy.

  eyeballs, lids             copied as PNG
                             Flat line art with hard edges — PNG's good case,
                             and lossy re-encoding risks ringing on the lash
                             edge.

Verification is done in composite space, over a real background. Raw-RGBA PSNR
is reported too but should be read with suspicion: PNG export leaves arbitrary
colour under alpha=0, and for the body that is 31.6% of the canvas. Counting it
drags the number from 46.7 dB to 34 dB and describes nothing anyone can see.
"""

from __future__ import annotations

import argparse
import io
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image

# Source filename -> shipped filename and how it is encoded.
SPEC = {
    "身体.png":  ("body.webp",      "lossy"),
    "左眼球.png": ("eye-left.png",   "copy"),
    "右眼球.png": ("eye-right.png",  "copy"),
    "左眼皮.png": ("lid-left.png",   "copy"),
    "右眼皮.png": ("lid-right.png",  "copy"),
    "眼白.png":  ("eye-white.webp", "lossless"),
    "高光.png":  ("highlight.webp", "lossless"),
}

CANVAS = (1293, 1080)
BG_LIGHT = (247, 248, 250)
BG_DARK = (20, 20, 24)


def composite(a: np.ndarray, bg) -> np.ndarray:
    al = a[..., 3:4].astype(np.float64) / 255.0
    return a[..., :3].astype(np.float64) * al + np.asarray(bg, dtype=np.float64) * (1 - al)


def psnr(a: np.ndarray, b: np.ndarray) -> float:
    mse = ((a.astype(np.float64) - b.astype(np.float64)) ** 2).mean()
    return float("inf") if mse == 0 else round(10 * np.log10(255.0 ** 2 / mse), 2)


def encode(im: Image.Image, mode: str) -> bytes:
    buf = io.BytesIO()
    if mode == "lossy":
        im.save(buf, "WEBP", quality=95, method=6, alpha_quality=100)
    elif mode == "lossless":
        im.save(buf, "WEBP", lossless=True, method=6, exact=True)
    else:
        raise ValueError(mode)
    return buf.getvalue()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", required=True, type=Path, help="directory holding the artist's PNG plates")
    ap.add_argument("--dst", type=Path, default=Path("public/doll"), help="output directory (default: public/doll)")
    args = ap.parse_args()

    if not args.src.is_dir():
        print(f"source directory not found: {args.src}", file=sys.stderr)
        return 1
    args.dst.mkdir(parents=True, exist_ok=True)

    failures = []
    for source_name, (shipped, mode) in SPEC.items():
        src = args.src / source_name
        if not src.exists():
            print(f"  MISSING  {source_name}")
            failures.append(source_name)
            continue

        im = Image.open(src).convert("RGBA")
        if im.size != CANVAS:
            # Refuse rather than resize: a resized plate is silently misaligned.
            print(f"  WRONG CANVAS  {source_name} is {im.size}, expected {CANVAS}")
            failures.append(source_name)
            continue

        original = np.asarray(im, dtype=np.uint8)
        out = args.dst / shipped

        if mode == "copy":
            shutil.copyfile(src, out)
            decoded = np.asarray(Image.open(out).convert("RGBA"), dtype=np.uint8)
            extra = f"identical: {bool((original == decoded).all())}"
        else:
            data = encode(im, mode)
            out.write_bytes(data)
            decoded = np.asarray(Image.open(io.BytesIO(data)).convert("RGBA"), dtype=np.uint8)
            light = psnr(composite(original, BG_LIGHT), composite(decoded, BG_LIGHT))
            dark = psnr(composite(original, BG_DARK), composite(decoded, BG_DARK))
            alpha_ok = bool((original[..., 3] == decoded[..., 3]).all())
            extra = (f"composite PSNR light {light} / dark {dark} dB   "
                     f"alpha bit-exact: {alpha_ok}")
            if mode == "lossless":
                extra += f"   byte-identical: {bool((original == decoded).all())}"

        print(f"  {shipped:18s} {out.stat().st_size / 1024:7.1f} KB  ({mode})  {extra}")

    total = sum(f.stat().st_size for f in args.dst.iterdir() if f.is_file())
    print(f"\n  total {total / 1024:.1f} KB across {len(list(args.dst.iterdir()))} entries")
    if failures:
        print(f"\n  {len(failures)} plate(s) not regenerated: {', '.join(failures)}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
