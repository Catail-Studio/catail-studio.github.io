"""Paints the Catail Studio logo in each cat theme's colors.

    python site/tools/recolor_logo.py

The logo (public/assets/catail-studio.png) is made of three colors: the dark letters, the rose
accent (the STUDIO tag, the inside of the A, the tail's tip) and the white letters of STUDIO.
Every pixel, edges included, is read as a mix of those three and mixed again from the theme's
own three, so the soft edges come out right. Writes public/assets/logo/catail-studio-<cat>.png.
Needs Pillow and NumPy.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2] / "public" / "assets"
SOURCE = ROOT / "catail-studio.png"
OUT = ROOT / "logo"

# The source's three colors, measured from the picture.
INK, ROSE, WHITE = (60, 42, 46), (194, 125, 125), (252, 250, 250)

# Each theme: letters, accent, the letters on the accent. Picked from the palettes in style.css,
# the accent a shade deeper than the page's own, so the tag's letters stay readable on it.
THEMES = {
    "orange": ("#3b1729", "#d9718f", "#ffffff"),
    "gray": ("#20242b", "#7f8a9b", "#ffffff"),
    "white": ("#26231f", "#5f9fd3", "#ffffff"),
    "calico": ("#2e2018", "#e08a3c", "#ffffff"),
    "black": ("#f3f0f6", "#f2c94c", "#1b1a1e"),
}


def hex_rgb(value):
    value = value.lstrip("#")
    return np.array([int(value[i : i + 2], 16) for i in (0, 2, 4)], dtype=float)


def weights(rgb):
    """How much of ink, rose and white each pixel is (each row sums to 1)."""
    ink, rose, white = (np.array(c, dtype=float) for c in (INK, ROSE, WHITE))
    basis = np.stack([ink - white, rose - white], axis=1)  # 3 x 2
    flat = rgb.reshape(-1, 3) - white
    solved, *_ = np.linalg.lstsq(basis, flat.T, rcond=None)  # 2 x N
    w = np.vstack([solved, 1 - solved.sum(axis=0)]).T.clip(0, None)
    w /= w.sum(axis=1, keepdims=True).clip(1e-6, None)
    return w


def main():
    image = np.array(Image.open(SOURCE).convert("RGBA")).astype(float)
    rgb, alpha = image[..., :3], image[..., 3:]
    w = weights(rgb)
    OUT.mkdir(exist_ok=True)
    for cat, colors in THEMES.items():
        target = np.stack([hex_rgb(c) for c in colors])  # 3 x 3
        painted = (w @ target).reshape(rgb.shape).clip(0, 255)
        out = np.concatenate([painted, alpha], axis=-1).round().astype(np.uint8)
        Image.fromarray(out, "RGBA").save(OUT / f"catail-studio-{cat}.png", optimize=True)
        print(f"painted public/assets/logo/catail-studio-{cat}.png")


if __name__ == "__main__":
    main()
