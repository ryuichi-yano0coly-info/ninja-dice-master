"""
gen_fx_frames.py
────────────────────────────────────────────────────────
透過済みエフェクト1枚絵から、ワンショット演出の連番フレームを生成する。
- StealSwipe : コインを掻っ攫う演出（弾け→上へ→フェード）
- AttackBurst: 派手な爆発インパクト（素早く拡大→ピークで明滅→フェード）
使い方: python3 gen_fx_frames.py
"""
from PIL import Image

OUT = "assets/images"

EFFECTS = {
    # name: (frames, canvas, fit, scale_start, scale_end, scale_speed, rise_px, fade_start)
    "StealSwipe":  (7, 256, 0.92, 0.55, 1.12, 1.5, -44, 0.5),
    # fit×scale_end を 0.9 以下に抑え、最大拡大でもキャンバス内に収める（四角クリップ防止）。
    "AttackBurst": (8, 300, 0.70, 0.28, 1.25, 2.0,   0, 0.5),
    "Effect_Shine": (8, 300, 0.70, 0.35, 1.22, 1.8, 0, 0.55),
}


def lerp(a, b, t): return a + (b - a) * t


def build(name, cfg):
    frames, canvas, fit, s0, s1, sspd, rise, fade = cfg
    im = Image.open(f"{OUT}/{name}.png").convert("RGBA")
    bbox = im.split()[3].getbbox()
    sp = im.crop(bbox) if bbox else im
    room = int(canvas * fit)
    r = min(room / sp.width, room / sp.height)
    base = sp.resize((max(1, int(sp.width * r)), max(1, int(sp.height * r))), Image.LANCZOS)
    for i in range(frames):
        t = i / (frames - 1)
        scale = lerp(s0, s1, min(1.0, t * sspd))
        alpha = 1.0 if t < fade else max(0.0, 1.0 - (t - fade) / (1.0 - fade))
        w = max(1, int(base.width * scale)); h = max(1, int(base.height * scale))
        fr = base.resize((w, h), Image.LANCZOS)
        if alpha < 1.0:
            fr.putalpha(fr.split()[3].point(lambda p: int(p * alpha)))
        cv = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
        x = (canvas - w) // 2
        y = (canvas - h) // 2 + int(rise * t)
        cv.alpha_composite(fr, (x, y))
        cv.save(f"{OUT}/{name}_{i+1}.png")
    return frames


if __name__ == "__main__":
    import os
    for name, cfg in EFFECTS.items():
        if not os.path.exists(f"{OUT}/{name}.png"):
            print(f"  ⏭  {name}: base missing, skip (frames already generated)")
            continue
        n = build(name, cfg)
        print(f"  ✅ {name}: {n} フレーム（{cfg[1]}px）")
