"""
remove_greenback.py
────────────────────────────────────────────────────────
グリーンバック（#00B140）を透過PNGに変換するスクリプト

使い方:
  1. pip install Pillow numpy
  2. INPUT_DIR に元の素材を入れる
  3. python remove_greenback.py
  4. OUTPUT_DIR に透過PNG が出力される

対象グリーン: #00B140 (R=0, G=177, B=64)
────────────────────────────────────────────────────────
"""

from PIL import Image
import numpy as np
import os
import sys

# ── 設定 ─────────────────────────────────────────────
INPUT_DIR  = "./assets/raw"     # 元素材フォルダ
OUTPUT_DIR = "./assets/images"  # 出力フォルダ

TARGET_COLOR = (0, 177, 64)     # #00B140
TOLERANCE    = 60               # 色の許容誤差（0〜255）大きいほど広く抜ける
EDGE_SMOOTH  = 1.5              # エッジのなめらかさ倍率
# ─────────────────────────────────────────────────────


def remove_green_background(input_path: str, output_path: str,
                             target: tuple = TARGET_COLOR,
                             tolerance: int = TOLERANCE,
                             edge_smooth: float = EDGE_SMOOTH) -> None:
    """
    グリーンバックを透過に変換する。

    Args:
        input_path:   入力画像パス
        output_path:  出力画像パス（PNG）
        target:       除去するRGBカラー
        tolerance:    許容誤差（この距離以内を透過にする）
        edge_smooth:  エッジのなめらかさ（1.0 = なし、2.0 = 広め）
    """
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img, dtype=np.float32)

    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    tr, tg, tb = target

    # ターゲット色との距離
    dist = np.sqrt((r - tr) ** 2 + (g - tg) ** 2 + (b - tb) ** 2)

    # アルファマスク生成
    alpha = np.where(
        dist < tolerance,
        0.0,  # 完全透過
        np.where(
            dist < tolerance * edge_smooth,
            # エッジ部分：線形補間で半透明に
            ((dist - tolerance) / (tolerance * (edge_smooth - 1.0)) * 255.0).clip(0, 255),
            255.0,  # 不透明
        )
    )

    data[:, :, 3] = alpha
    result = Image.fromarray(data.astype(np.uint8), "RGBA")
    result.save(output_path, "PNG")


def process_directory(input_dir: str, output_dir: str) -> None:
    """フォルダ内の全画像（サブフォルダ含む）を一括処理する。
    assets/raw/<genre>/Xxx.png → assets/images/<genre>/Xxx.png のように
    サブフォルダの相対パスを保ったまま出力する。
    """
    supported = {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"}
    files = []
    for root, _dirs, filenames in os.walk(input_dir):
        for f in filenames:
            if os.path.splitext(f)[1].lower() in supported:
                files.append(os.path.relpath(os.path.join(root, f), input_dir))

    if not files:
        print(f"⚠️  {input_dir} に対象ファイルが見つかりません")
        return

    print(f"📂 入力フォルダ: {input_dir}")
    print(f"📂 出力フォルダ: {output_dir}")
    print(f"🎯 対象ファイル数: {len(files)}\n")

    success = 0
    for rel_path in sorted(files):
        input_path  = os.path.join(input_dir, rel_path)
        rel_dir, filename = os.path.split(rel_path)
        output_name = os.path.splitext(filename)[0] + ".png"
        output_dir_full = os.path.join(output_dir, rel_dir)
        os.makedirs(output_dir_full, exist_ok=True)
        output_path = os.path.join(output_dir_full, output_name)

        try:
            remove_green_background(input_path, output_path)
            print(f"  ✅ {rel_path}  →  {os.path.join(rel_dir, output_name) if rel_dir else output_name}")
            success += 1
        except Exception as e:
            print(f"  ❌ {rel_path}  エラー: {e}")

    print(f"\n🎉 完了: {success}/{len(files)} ファイルを変換しました")


def process_single(input_path: str, output_path: str = None) -> None:
    """単一ファイルを処理する。"""
    if output_path is None:
        base = os.path.splitext(input_path)[0]
        output_path = base + "_transparent.png"

    remove_green_background(input_path, output_path)
    print(f"✅ 変換完了: {input_path}  →  {output_path}")


# ── エントリポイント ──────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) == 2:
        # 引数1つ: 単一ファイルを処理
        process_single(sys.argv[1])
    elif len(sys.argv) == 3:
        # 引数2つ: 単一ファイルを出力先指定で処理
        process_single(sys.argv[1], sys.argv[2])
    else:
        # 引数なし: フォルダ一括処理
        process_directory(INPUT_DIR, OUTPUT_DIR)
