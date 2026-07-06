"""
gen_transition_frames.py
────────────────────────────────────────────────────────
アタック / スティールぞろ目 → ミニゲーム画面への全画面トランジション連番を生成。
Coin Master / Monopoly GO 風: 全画面の単色カバー層（下） +
マスコット（ちびニンジャ）が画面を横切ってダッシュ（上）。
カバーαは中盤(0.25<=t<=0.75)で 100% 不透明になり、裏の画面切替を隠す。
使い方: python3 gen_transition_frames.py
"""
import math
from PIL import Image, ImageDraw

OUT = "assets/images"
W, H = 720, 1440
N = 12

# name: (mascot sprite file, cover color RGB, mode)
CONFIG = {
    "Trans_Attack": ("Mascot_Attack.png", (214, 40, 22), "attack"),
    "Trans_Steal":  ("Mascot_Steal.png",  (30, 24, 48),  "steal"),
}


def build(name, sprite_file, cover_color, mode):
    src = Image.open(f"{OUT}/{sprite_file}").convert("RGBA")
    bbox = src.split()[3].getbbox()
    sp = src.crop(bbox) if bbox else src

    # base scale: height ≈ 0.62 * H, preserve aspect
    base_h = 0.62 * H
    base_r = base_h / sp.height
    base_w = max(1, int(sp.width * base_r))
    base_hh = max(1, int(sp.height * base_r))
    base = sp.resize((base_w, base_hh), Image.LANCZOS)

    for i in range(N):
        t = i / (N - 1)                                   # 0..1

        # --- 1) COLOR COVER (plateau alpha) ---
        if 0.25 <= t <= 0.75:
            cover_a = 1.0
        elif t < 0.25:
            cover_a = t / 0.25
        else:
            cover_a = max(0.0, (1.0 - t) / 0.25)

        cv = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        cover = Image.new("RGBA", (W, H), cover_color + (int(round(cover_a * 255)),))
        cv.alpha_composite(cover)

        # --- 2) MASCOT dashing across ---
        scale_mult = 1.0 + 0.12 * math.sin(math.pi * t)
        w = max(1, int(base.width * scale_mult))
        h = max(1, int(base.height * scale_mult))
        fr = base.resize((w, h), Image.LANCZOS)

        # sprite alpha: fade in first frame / out last frame, else fully visible
        if i == 0:
            sprite_a = 0.35
        elif i == N - 1:
            sprite_a = 0.35
        else:
            sprite_a = 1.0

        # dash right→left; centered (~W/2) around t≈0.54 (frame 6)
        cx = W * 1.35 + ((-0.35 * W) - W * 1.35) * t
        cy = H * 0.5 - int(0.03 * H * math.sin(math.pi * t))
        x = int(cx - w / 2)
        y = int(cy - h / 2)

        # --- optional flair behind the mascot ---
        # NOTE: draw onto a separate transparent layer then alpha_composite,
        # otherwise ImageDraw would OVERWRITE the opaque cover's alpha and
        # punch holes in it (breaking the 100% opaque middle frames).
        if mode == "attack":
            # 3 diagonal white speed-line streaks trailing to the right of the mascot
            fx = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw = ImageDraw.Draw(fx)
            streak_a = int(round(sprite_a * 90))
            if streak_a > 0:
                for k in range(3):
                    off = (k - 1) * int(0.12 * H)
                    sx = int(cx + w * 0.30)
                    sy = int(cy + off)
                    ex = sx + int(0.55 * W)
                    ey = sy - int(0.10 * H)
                    draw.line([(sx, sy), (ex, ey)], fill=(255, 255, 255, streak_a), width=6)
                cv.alpha_composite(fx)
        elif mode == "steal":
            # a couple of soft gray smoke ellipses at the mascot's feet
            fx = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw = ImageDraw.Draw(fx)
            smoke_a = int(round(sprite_a * 70))
            if smoke_a > 0:
                feet_y = int(cy + h * 0.42)
                for k, (dx, r) in enumerate([(-0.10, 0.16), (0.14, 0.12)]):
                    ex = int(cx + dx * W)
                    rx = int(r * W)
                    ry = int(rx * 0.55)
                    draw.ellipse([ex - rx, feet_y - ry, ex + rx, feet_y + ry],
                                 fill=(160, 155, 175, smoke_a))
                cv.alpha_composite(fx)

        if sprite_a < 1.0:
            fr.putalpha(fr.split()[3].point(lambda p: int(p * sprite_a)))
        cv.alpha_composite(fr, (x, y))

        cv.save(f"{OUT}/{name}_{i+1}.png")
    return N


if __name__ == "__main__":
    for name, (sprite_file, cover_color, mode) in CONFIG.items():
        n = build(name, sprite_file, cover_color, mode)
        print(f"  ✅ {name}: {n} フレーム（{W}x{H}, cover={cover_color}, sprite={sprite_file}, mode={mode}）")
