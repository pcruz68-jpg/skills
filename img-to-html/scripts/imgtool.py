# /// script
# requires-python = ">=3.10"
# dependencies = ["pillow"]
# ///
"""Recorta regioes e amostra cores de uma imagem de referencia.

Uso tipico dentro do fluxo img-to-html:

    uv run ~/.agents/skills/img-to-html/scripts/imgtool.py info reference.png
    uv run ~/.agents/skills/img-to-html/scripts/imgtool.py crop reference.png \
        --box 0.12,0.04,0.08,0.05 --out assets/crops/logo.png --scale 3
    uv run ~/.agents/skills/img-to-html/scripts/imgtool.py sample reference.png \
        --at 0.5,0.2 --at 0.5,0.22 --at 120,340
"""
from __future__ import annotations

import argparse
import sys

from PIL import Image


def parse_nums(raw: str, count: int) -> list[float]:
    parts = [p.strip() for p in raw.split(",")]
    if len(parts) != count:
        sys.exit(f"ERRO: esperava {count} numeros separados por virgula, recebi {raw!r}")
    try:
        return [float(p) for p in parts]
    except ValueError:
        sys.exit(f"ERRO: valores nao numericos em {raw!r}")


def to_px(value: float, extent: int) -> int:
    """Fracoes (0..1) viram pixels; valores >= 1 ja sao pixels."""
    return round(value * extent) if 0 <= value < 1 else round(value)


def cmd_info(args) -> None:
    with Image.open(args.image) as im:
        print(f"{args.image}: {im.width}x{im.height} {im.mode}")


def cmd_crop(args) -> None:
    x, y, w, h = parse_nums(args.box, 4)
    with Image.open(args.image) as im:
        im = im.convert("RGBA")
        left, top = to_px(x, im.width), to_px(y, im.height)
        right, bottom = left + to_px(w, im.width), top + to_px(h, im.height)
        if right <= left or bottom <= top:
            sys.exit("ERRO: box com largura ou altura zero")
        if right > im.width or bottom > im.height:
            print(f"AVISO: box excede a imagem ({im.width}x{im.height}); sera cortado", file=sys.stderr)
        out = im.crop((left, top, min(right, im.width), min(bottom, im.height)))
        if args.scale != 1:
            out = out.resize(
                (round(out.width * args.scale), round(out.height * args.scale)),
                Image.LANCZOS,
            )
        args.out.parent.mkdir(parents=True, exist_ok=True) if hasattr(args.out, "parent") else None
        out.save(args.out)
        print(f"{args.out}: {out.width}x{out.height} (de {left},{top} {right-left}x{bottom-top})")


def cmd_sample(args) -> None:
    with Image.open(args.image) as im:
        im = im.convert("RGBA")
        for raw in args.at:
            cx, cy = parse_nums(raw, 2)
            px, py = to_px(cx, im.width), to_px(cy, im.height)
            px, py = min(px, im.width - 1), min(py, im.height - 1)
            r, g, b, a = im.getpixel((px, py))
            hexo = f"#{r:02x}{g:02x}{b:02x}"
            alpha = "" if a == 255 else f" alpha={a/255:.2f}"
            print(f"({px},{py}) {hexo} rgb({r},{g},{b}){alpha}")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("info", help="dimensoes e modo da imagem")
    p.add_argument("image")
    p.set_defaults(func=cmd_info)

    p = sub.add_parser("crop", help="recorta uma regiao para PNG")
    p.add_argument("image")
    p.add_argument("--box", required=True, metavar="X,Y,W,H",
                   help="fracoes 0..1 da imagem, ou pixels se >= 1")
    p.add_argument("--out", required=True, type=__import__("pathlib").Path)
    p.add_argument("--scale", type=float, default=1,
                   help="fator de ampliacao LANCZOS (ex.: 3 para icone pequeno)")
    p.set_defaults(func=cmd_crop)

    p = sub.add_parser("sample", help="cor de um ou mais pontos")
    p.add_argument("image")
    p.add_argument("--at", action="append", required=True, metavar="X,Y",
                   help="fracoes 0..1 ou pixels; repetivel")
    p.set_defaults(func=cmd_sample)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
