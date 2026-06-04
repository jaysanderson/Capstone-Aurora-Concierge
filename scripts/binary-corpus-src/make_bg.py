#!/usr/bin/env python3
"""Generate a 1920x1080 Aurora brand background PNG with name overlay."""
import sys
from PIL import Image, ImageDraw, ImageFont


def gradient(w, h, top_color, bottom_color):
    img = Image.new('RGB', (w, h), top_color)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / h
        r = int(top_color[0] * (1 - t) + bottom_color[0] * t)
        g = int(top_color[1] * (1 - t) + bottom_color[1] * t)
        b = int(top_color[2] * (1 - t) + bottom_color[2] * t)
        draw.line([(0, y), (w, y)], fill=(r, g, b))
    return img


def find_font(size):
    candidates = [
        '/System/Library/Fonts/Supplemental/Avenir Next.ttc',
        '/System/Library/Fonts/Avenir Next.ttc',
        '/System/Library/Fonts/Helvetica.ttc',
        '/Library/Fonts/Arial.ttf',
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except Exception:
            continue
    return ImageFont.load_default()


def render(name, subtitle, out_path):
    W, H = 1920, 1080
    NAVY = (26, 74, 107)
    DEEP_NAVY = (10, 30, 50)
    SAND = (201, 168, 122)
    WHITE = (255, 255, 255)

    img = gradient(W, H, NAVY, DEEP_NAVY)
    draw = ImageDraw.Draw(img)

    # Sand-coloured rule across the upper third
    rule_y = int(H * 0.36)
    draw.line([(int(W * 0.1), rule_y), (int(W * 0.9), rule_y)], fill=SAND, width=2)

    wordmark = "AURORA OUTFITTERS"
    wm_font = find_font(82)
    wm_w = draw.textlength(wordmark, font=wm_font)
    draw.text(((W - wm_w) / 2, int(H * 0.25)), wordmark, font=wm_font, fill=WHITE)

    sub_font = find_font(34)
    sub_w = draw.textlength(subtitle, font=sub_font)
    draw.text(((W - sub_w) / 2, int(H * 0.41)), subtitle, font=sub_font, fill=SAND)

    name_font = find_font(64)
    name_w = draw.textlength(name, font=name_font)
    draw.text(((W - name_w) / 2, int(H * 0.55)), name, font=name_font, fill=WHITE)

    foot_font = find_font(24)
    foot = "Trail-Tested by Experts · Built for the Worst Weather"
    foot_w = draw.textlength(foot, font=foot_font)
    draw.text(((W - foot_w) / 2, int(H * 0.88)), foot, font=foot_font, fill=SAND)

    img.save(out_path, 'PNG', optimize=True)
    print(f"Generated {out_path}")


if __name__ == '__main__':
    render(sys.argv[1], sys.argv[2], sys.argv[3])
