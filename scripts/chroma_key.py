"""
Вырезает однотонный (обычно ярко-зелёный) фон у сгенерированной картинки.

    python scripts/chroma_key.py input.png public/art/flower.webp --max 768

- цвет фона определяется автоматически по краям картинки;
- края мягкие (частичная прозрачность), без «лесенки»;
- зелёный отсвет на краях объекта убирается (despill);
- картинка обрезается по объекту и уменьшается до --max пикселей по большей стороне;
- формат по расширению выхода: .webp (рекомендуется) или .png.
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter


def key_color(rgb: np.ndarray) -> np.ndarray:
    """Медиана пикселей по периметру — это и есть цвет фона."""
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    return np.median(border, axis=0)


def chroma_key(img: Image.Image, tol: float, soft: float) -> Image.Image:
    rgb = np.asarray(img.convert("RGB")).astype(np.float32)
    key = key_color(rgb)
    dom = int(np.argmax(key))  # доминирующий канал фона (1 = зелёный)
    others = [c for c in range(3) if c != dom]

    # «Насколько пиксель похож на фон»: перевес доминирующего канала над остальными
    excess = rgb[..., dom] - np.max(rgb[..., others], axis=-1)
    key_excess = key[dom] - max(key[others[0]], key[others[1]])
    sim = excess / max(key_excess, 1.0)  # 1 — чистый фон, ≤0 — объект

    # Прозрачность края: пиксель — смесь объекта и фона, поэтому
    # excess(C) = a·excess(объект) + (1−a)·excess(фон). excess объекта берём
    # у ближайших пикселей объекта (минимум по окрестности) и решаем относительно a.
    enc = Image.fromarray(((excess + 255) / 2).clip(0, 255).astype(np.uint8))
    near_obj = np.asarray(enc.filter(ImageFilter.MinFilter(9))).astype(np.float32) * 2 - 255
    near_obj = np.minimum(near_obj, key_excess * tol)
    denom = np.maximum(key_excess - near_obj, key_excess * 0.3)
    alpha_mix = np.clip((key_excess - excess) / denom, 0.0, 1.0)
    # Явный объект и явный фон — без полутонов (виньетка генератора по углам — тоже фон)
    alpha = np.where(sim <= tol, 1.0, np.where(sim >= 0.8, 0.0, alpha_mix))

    # Краевой пиксель — смесь объекта и фона: C = a·F + (1−a)·K.
    # Восстанавливаем чистый цвет объекта F, иначе по краю остаётся серо-зелёная обводка.
    a = np.maximum(alpha, 0.04)[..., None]
    out = (rgb - (1.0 - a) * key) / a
    out = np.where(alpha[..., None] > 0.995, rgb, out).clip(0, 255)

    # Despill: убираем остатки зелёного отсвета
    cap = np.max(out[..., others], axis=-1)
    out[..., dom] = np.minimum(out[..., dom], cap + 6)

    rgba = np.dstack([out, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def crop_and_resize(img: Image.Image, max_side: int, pad: float) -> Image.Image:
    a = np.asarray(img)[..., 3]
    ys, xs = np.where(a > 24)
    if len(xs):
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        p = int(max(x1 - x0, y1 - y0) * pad)
        img = img.crop((max(x0 - p, 0), max(y0 - p, 0), min(x1 + p + 1, img.width), min(y1 + p + 1, img.height)))
    if max(img.size) > max_side:
        img.thumbnail((max_side, max_side), Image.LANCZOS)
    return img


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--max", type=int, default=768, help="максимальная сторона, px")
    ap.add_argument("--tol", type=float, default=0.25, help="ниже — объект целиком непрозрачный")
    ap.add_argument("--soft", type=float, default=0.35, help="ширина мягкого края")
    ap.add_argument("--pad", type=float, default=0.03, help="поля вокруг объекта при обрезке")
    a = ap.parse_args()

    img = crop_and_resize(chroma_key(Image.open(a.input), a.tol, a.soft), a.max, a.pad)
    if a.output.lower().endswith(".webp"):
        img.save(a.output, "WEBP", quality=90, method=6)
    else:
        img.save(a.output, optimize=True)
    print(f"{a.output}: {img.width}x{img.height}")


if __name__ == "__main__":
    main()
