"""
gen_coin_frames.py
────────────────────────────────────────────────────────
透過済みの CoinSpray.png から、コインが弾けて上に舞い上がり消える
連番フレーム CoinSpray_1..N.png を生成する（1秒未満のワンショット演出用）。
使い方: python3 gen_coin_frames.py
"""
from PIL import Image

SRC = "assets/images/CoinSpray.png"
OUT = "assets/images"
CANVAS = 256
FRAMES = 8


def lerp(a, b, t): return a + (b - a) * t


def main():
    im = Image.open(SRC).convert("RGBA")
    bbox = im.split()[3].getbbox()
    sp = im.crop(bbox) if bbox else im
    # ベースをキャンバス幅の約88%に収める
    base_w = int(CANVAS * 0.88)
    r = base_w / sp.width
    base = sp.resize((base_w, max(1, int(sp.height * r))), Image.LANCZOS)

    for i in range(FRAMES):
        t = i / (FRAMES - 1)
        scale = lerp(0.45, 1.18, min(1.0, t * 1.6))     # 素早く拡大→保持
        rise = int(lerp(0, -50, t))                     # 上へ舞い上がる
        alpha = 1.0 if t < 0.58 else max(0.0, 1.0 - (t - 0.58) / 0.42)  # 後半フェード
        w = max(1, int(base.width * scale)); h = max(1, int(base.height * scale))
        fr = base.resize((w, h), Image.LANCZOS)
        if alpha < 1.0:
            a = fr.split()[3].point(lambda p: int(p * alpha))
            fr.putalpha(a)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        x = (CANVAS - w) // 2
        y = (CANVAS - h) + rise          # 下端アンカー（建物中心付近から上へ）
        canvas.alpha_composite(fr, (x, y))
        canvas.save(f"{OUT}/CoinSpray_{i+1}.png")
    print(f"🎉 CoinSpray: {FRAMES} フレーム生成（{CANVAS}px）")


if __name__ == "__main__":
    main()
