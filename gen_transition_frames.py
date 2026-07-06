"""
gen_transition_frames.py
────────────────────────────────────────────────────────
アタック / スティールぞろ目 → ミニゲーム画面への全画面トランジション連番を生成。
各フレーム = 単色ティント層（下） + 拡大するチロマキー済みエフェクト（上）。
ティントαは中盤でピーク(~0.96)になり、画面を完全に覆って裏の画面切替を隠す。
使い方: python3 gen_transition_frames.py
"""
import math
from PIL import Image

OUT = "assets/images"
W, H = 720, 1440
N = 12

# name: (tint RGB, mode)  mode: "attack" = 少し回転, "steal" = 下から上へ上昇
CONFIG = {
    "Trans_Attack": ((196, 32, 24), "attack"),
    "Trans_Steal":  ((22, 20, 30),  "steal"),
}


def build(name, tint_rgb, mode):
    im = Image.open(f"{OUT}/{name}.png").convert("RGBA")
    bbox = im.split()[3].getbbox()
    sp = im.crop(bbox) if bbox else im
    # base: エフェクトが画面幅をおおよそ覆うサイズ
    base_r = W / sp.width
    base = sp.resize((max(1, int(sp.width * base_r)), max(1, int(sp.height * base_r))), Image.LANCZOS)

    for i in range(N):
        t = i / (N - 1)                                   # 0..1
        tint_a = (math.sin(math.pi * i / (N - 1)) ** 0.8) * 0.96
        sprite_a = min(1.0, tint_a * 1.6 + 0.3)

        # --- tint 層 ---
        cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        tint = Image.new("RGBA", (W, H), tint_rgb + (int(round(tint_a * 255)),))
        cv.alpha_composite(tint)

        # --- エフェクトスプライト（0.7→1.35 に拡大）---
        scale = 0.7 + (1.35 - 0.7) * t
        w = max(1, int(base.width * scale)); h = max(1, int(base.height * scale))
        fr = base.resize((w, h), Image.LANCZOS)
        if mode == "attack":
            fr = fr.rotate(-8 + 16 * t, resample=Image.BICUBIC, expand=True)
            w, h = fr.width, fr.height
        # sprite alpha
        if sprite_a < 1.0:
            fr.putalpha(fr.split()[3].point(lambda p: int(p * sprite_a)))

        x = (W - w) // 2
        if mode == "steal":
            # 下から上へ上昇: 開始は画面下寄り、終盤で中央〜上へ
            y = int((H - h) * (0.85 - 0.7 * t))
        else:
            y = (H - h) // 2
        cv.alpha_composite(fr, (x, y))

        cv.save(f"{OUT}/{name}_{i+1}.png")
    return N


if __name__ == "__main__":
    import os
    for name, (tint_rgb, mode) in CONFIG.items():
        n = build(name, tint_rgb, mode)
        print(f"  ✅ {name}: {n} フレーム（{W}x{H}, tint={tint_rgb}, mode={mode}）")
        # ベース画像は削除（連番のみ残す）
        base_path = f"{OUT}/{name}.png"
        if os.path.exists(base_path):
            os.remove(base_path)
            print(f"     🗑  removed base {base_path}")
