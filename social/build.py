"""Обложки для Instagram: панорама из 3 постов + отдельная обложка.

    python social/build.py

Готовое — в social/out/:
- cover-1/2/3_1080x1920.jpg — обложки Reels, грузить по порядку 3 → 2 → 1
  (Instagram ставит новое слева, так что первым выкладывается правый пост);
- cover-N_grid_1080x1440.jpg — то же, но кадр 3:4, если нужен обычный пост;
- preview-grid.jpg — как три поста выглядят в профиле;
- single-albums_1080x1920.jpg — отдельная обложка «Альбомы под ключ».
"""

import subprocess
import sys
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
sys.path.insert(0, str(HERE.parent / "print"))
from build import find_browser  # noqa: E402  тот же поиск Chrome, что у печати


def shoot(html: str, w: int, h: int) -> Image.Image:
    png = OUT / f"_{Path(html).stem}.png"
    subprocess.run(
        [find_browser(), "--headless=new", "--disable-gpu", "--hide-scrollbars",
         "--force-device-scale-factor=1", f"--window-size={w},{h}",
         "--virtual-time-budget=15000", f"--screenshot={png}", (HERE / html).as_uri()],
        check=True, capture_output=True,
    )
    img = Image.open(png).convert("RGB")
    png.unlink()
    return img


def save(img: Image.Image, name: str) -> None:
    img.save(OUT / name, "JPEG", quality=95, subsampling=0)
    print("готово:", name)


def main() -> None:
    OUT.mkdir(exist_ok=True)

    pano = shoot("panorama.html", 3240, 1920)
    for i in range(3):
        tile = pano.crop((i * 1080, 0, (i + 1) * 1080, 1920))
        save(tile, f"cover-{i + 1}_1080x1920.jpg")
        save(tile.crop((0, 240, 1080, 1680)), f"cover-{i + 1}_grid_1080x1440.jpg")

    # Превью профиля: три поста 3:4 с тонкими белыми промежутками, как в Instagram.
    gap, w, h = 6, 1080, 1440
    grid = Image.new("RGB", (3 * w + 2 * gap, h), "white")
    for i in range(3):
        grid.paste(pano.crop((i * w, 240, (i + 1) * w, 1680)), (i * (w + gap), 0))
    grid.thumbnail((1620, 1620))
    save(grid, "preview-grid.jpg")

    save(shoot("single.html", 1080, 1920), "single-albums_1080x1920.jpg")


if __name__ == "__main__":
    main()
