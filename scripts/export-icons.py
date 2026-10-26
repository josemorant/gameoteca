# Copyright (c) 2026 Jose Morant. SPDX-License-Identifier: MIT
"""Export the generated artwork while preserving its design and transparency."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
icons = root / 'public' / 'icons'
image = Image.open(icons / 'gameoteca-master.png').convert('RGBA')
for size in (16, 32, 48, 180, 192, 256, 512):
    image.resize((size, size), Image.Resampling.LANCZOS).save(icons / f'gameoteca-{size}.png')
image.save(icons / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
image.save(root / 'build' / 'gameoteca.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('Exported PNGs, favicon ICO and multi-resolution Windows icon.')
