"""
gen_char_frames.py
────────────────────────────────────────────────────────
キャラの透過ベース画像 assets/images/Char_<id>.png から
アイドルアニメの連番フレーム Char_<id>_1.png … _N.png を生成する。

各フレームは「上下バウンド＋スクワッシュ&ストレッチ＋微回転」を
固定キャンバスにベイクしたもの。フレームを順に再生すると
呼吸するような待機アニメになる（絵柄は完全に一貫）。

使い方: python3 gen_char_frames.py
────────────────────────────────────────────────────────
"""
from PIL import Image
import math, os

SRC = "assets/images"
CHAR_IDS = [
    "maneki","miyadaiku","fukusuzume","ishigame","zenitengu","kosodoro","ashigaru","daruma",
    "kinmaneki","toryo","fukunokami","nezumikozo","akaoni","bakedanuki",
    "kagekunoichi","ashuramusha","daikokuten","takarabune","ryujin","daitengu",
]

CANVAS = 256      # 出力フレームの一辺（px）
FRAMES = 6        # 1ループのフレーム数
AMP_Y  = 0.045    # 上下バウンド量（キャンバス比）
SQUASH = 0.05     # スクワッシュ&ストレッチ量
ROT    = 2.2      # 微回転（度）
FIT    = 0.86     # スプライトをキャンバスの何割に収めるか


def make_frames(cid: str) -> int:
    path = f"{SRC}/Char_{cid}.png"
    if not os.path.exists(path):
        print(f"  ⚠️  {path} なし・スキップ")
        return 0
    im = Image.open(path).convert("RGBA")
    bbox = im.split()[3].getbbox()
    sp = im.crop(bbox) if bbox else im
    # ベースをキャンバスに収まるよう縮小（バウンド/回転の余白を残す）
    room = int(CANVAS * FIT)
    r = min(room / sp.width, room / sp.height)
    base = sp.resize((max(1, int(sp.width * r)), max(1, int(sp.height * r))), Image.LANCZOS)

    for i in range(FRAMES):
        t = (i / FRAMES) * 2 * math.pi
        up = math.sin(t)                       # -1..1
        sy = 1 + SQUASH * up                   # 上昇時に縦伸び
        sx = 1 - SQUASH * up                   # 上昇時に横縮み（体積保存風）
        w = max(1, int(base.width * sx))
        h = max(1, int(base.height * sy))
        fr = base.resize((w, h), Image.LANCZOS)
        # 微回転（バウンドと逆位相の軽い揺れ）
        fr = fr.rotate(ROT * math.sin(t + math.pi / 2), resample=Image.BICUBIC, expand=True)
        canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
        bob = int(-AMP_Y * CANVAS * up)        # 上昇時に持ち上げ
        x = (CANVAS - fr.width) // 2
        y = (CANVAS - fr.height) // 2 + bob
        canvas.alpha_composite(fr, (x, y))
        canvas.save(f"{SRC}/Char_{cid}_{i+1}.png")
    return FRAMES


if __name__ == "__main__":
    total = 0
    for cid in CHAR_IDS:
        n = make_frames(cid)
        if n:
            print(f"  ✅ Char_{cid}  →  {n} フレーム")
            total += n
    print(f"\n🎉 完了: {len(CHAR_IDS)}体 / 計 {total} フレーム（{CANVAS}px）")
